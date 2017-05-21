//Lets require/import the HTTP module
var express = require("express");
var bodyParser = require('body-parser');
app = express();
app.use(bodyParser.json());
var router = express.Router();
var mqtt = require("mqtt");
var client = mqtt.connect('mqtt://server:port');
var cors = require('cors');
var logDir = 'log/';
var prefsDir = "prefs/"
var dataLogFile = logdir+"tempdata.csv";
var winston = require('winston');
var moment = require('moment-timezone');
var fs = require("fs");
var watchJS = require("watchjs")
var csvstringify = require('csv-stringify');
var csvparse = require('csv-parse');
var plotly = require('plotly')("username", "token")
var streamToken = "token";
var xAxis = [];
var yAxis = [];
var plotdata = [{x:xAxis, y:yAxis, type: 'scatter',stream:{token:streamToken,maxpoints:50}}];
var layout = {fileopt : "overwrite", filename : "bedroomPlot"};
var plotStream; 

var watch = watchJS.watch;
var unwatch = watchJS.unwatch;
var callWatchers = watchJS.callWatchers;


Date.prototype.dst = function() {
    if((moment(new Date())).tz('America/New_York').isDST()){
        return 240;
    }
    return 300;
}

//Helper methods for converting from AWS time to EST
var genDate = ()=>(new Date(new Date().valueOf() - ((new Date().dst()) * 1000 * 60)).toLocaleString())
var genTime = ()=>(new Date(new Date().valueOf() - ((new Date().dst()) * 1000 * 60)).toLocaleTimeString())

//Plot previous data and begin plot stream
var previousData = fs.readFileSync(dataLogFile).toString();
csvparse(previousData,function(err,out){
    logger.debug("parsed data from tempdata.csv");
    for(data in out){
        xAxis.push(out[data][0]);
        yAxis.push(out[data][1]);
    }
    plotly.plot(plotdata, layout, function () {
	plotStream = plotly.stream(streamToken, function () {
  });

});
})

var logger = new (winston.Logger)({
    transports: [
        // colorize the output to the console
        new (winston.transports.Console)({
            colorize: true,
            timestamp: genDate,
            level: "info"
        }),
        new (winston.transports.File)({
            filename: logDir + "AccessLog.txt",
            colorize: true,
            timestamp: genDate,
            level: "debug"
        })
    ]
});
//keep track of 
var roomstates = {
    "b":{},
    "l":{} 
};

for (room in roomstates){
    //Get prefs from last session or generate generic preferences
    //allows adding new rooms by simply adding another value to roomstates
    if(fs.existsSync(prefsDir+room+".json"))
        roomstates[room]= JSON.parse(fs.readFileSync(prefsDir+room+".json"))
    else{
        roomstates[room] = { 
            state:"sensor",
            stime:0,
            etime:0,
            topic:"sonoff"+room,
            targetTemp:70,
            currentTemp:70,
            tolerance:2,
            status:"off",
            decimal:0
        }
        fs.writeFileSync(prefsDir+room+".json",JSON.stringify(roomstates[room]));
    }

    //watches for variable changes. Writes preferences to prefs file and checks if state needs to be udpated
    watch(roomstates,room,function(prop,action,newval,oldval){
        var room = this.topic;
        room = room.substring(room.length-1);
        logger.info("room '"+room+"' '"+prop+"' changed from '"+
        oldval+"' to '"+newval+"'");
        var temp = {}
        for (val in roomstates[room]){
            if(val!="runningFunction")
                temp[val]=roomstates[room][val];
        }
        fs.writeFileSync(prefsDir+room+".json",JSON.stringify(temp));
        updateFromSensor(room);
    }); 
    roomstates[room].runningFunction=()=>{};
}

function getPowerTopic(room){
    return "cmnd/sonoff"+room+"/power";
}

//Controls AC when in sensor mode
//If the current time is within the set operatng times then checks temperature
//If the temperature is outside of the acceptable range (targetTemp+tolerance) turns on AC
//Goal is to cool until targetTemp is reached and then turn off until above targetTemp+tolerance
function updateFromSensor(room){
    if(roomstates[room].state!="sensor")return;
    var hours = new Date(genDate()).getHours();
    var mins = new Date(genDate()).getMinutes();
    var now = moment.duration(hours+":"+mins);
    var updatedRoom = roomstates[room];
    if(now<moment.duration(roomstates[room].etime)||now>moment.duration(roomstates[room].stime)){
        if(updatedRoom.currentTemp>updatedRoom.targetTemp+updatedRoom.tolerance){
            if (updatedRoom.status!="ON")
                sendMQTT(getPowerTopic(room),"on");
        }
        else if(updatedRoom.currentTemp<=updatedRoom.targetTemp){
            if (updatedRoom.status!="OFF")
                sendMQTT(getPowerTopic(room),"off")
        }
    }
    else{
        if (updatedRoom.status!="OFF")
            sendMQTT(getPowerTopic(room),"off")
    }
}

//updates plots and logs data points to csv file
function updateDataPoints (){
    var currentDate = genTime();
    csvstringify([[currentDate,roomstates['b'].currentTemp]],function(err,out){
        fs.appendFileSync(dataLogFile,out);
    });
    var toPlot = JSON.stringify({x:currentDate,y:roomstates['b'].currentTemp})
    logger.info("plotting data point");
    plotStream.write(toPlot+"\n");
}
setInterval(updateDataPoints,480000);
//streamheartbeat
setInterval(function(){
    plotStream.write("\n");
},45000);

//mqtt
client.on('error', function (error) {
    logger.error(error);
});

client.on('connect', function () {
    client.subscribe("stat/+/RESULT");
    client.subscribe("+/temperature");
})

//MQTT message handling
client.on('message', function (topic, message, packet) {
    if(topic.indexOf("temperature")!=-1){
        var room = roomstates[topic.substring(0,1)];
        room.currentTemp=parseFloat(message);
    }
    else if(topic.indexOf("RESULT")!=-1){
        var residx = topic.indexOf("RESULT");
        var room = topic.substring(residx-2,residx-1);
        roomstates[room].status = JSON.parse(message).POWER;
    }
    logger.info("Message received: \n topic: "+topic.toString()+"\n message: "+message.toString());
})

app.use(cors());
//requests
app.listen(8083, function () {
    logger.info("Fresh Start");
});

function sendMQTT(topic, message) {
    client.publish(topic, message);
    logger.info("MQTT publishing: "+topic+" - "+message);
}

//operation in manual mode
//If on time is undefined turn on for 12 hours by default
//If off time is undefined revert to sensor mode
//Revert to sensor mode after running in manual for set duration
app.get('/manual/:room/:command/:time', function (req, res) {
    var room = req.params.room.toLowerCase();
    var command = req.params.command;
    var time = getSeconds(req.params.time);
    var logroom = room;
    room=""+room.charAt(0);
    doManualCommand(command,time,roomstates[room])
    res.send("done");

    function doManualCommand(command,time,room){
        topic = "cmnd/"+room.topic+"/power";
        sendMQTT(topic,command);
        clearTimeout(room.runningFunction);
        if(command==="on"){
            if(time=="undefined"||time==undefined)time=getSeconds("T12H")
            logger.info(logroom+" set to manual '"+command+"' for "+time+" seconds");
            if(room.state!="disabled"){
                room.state = "manual";
            }
            room.runningFunction = setTimeout(()=>{
                if(room.state!="sensor"){
                    sendMQTT(topic,"off")
                    if(room.state!="disabled"){
                        room.state = "sensor";
                        logger.info("'On' Timer expired switching back to sensor mode")
                    }
                }
            },time*1000);
        } 
        else if(command==="off"){
            if(time=="undefined"||time==undefined){
                room.state="sensor";
            }
            else{
                if(room.state!="disabled"){
                    room.state = "manual";
                }
                room.runningFunction = setTimeout(()=>{
                    if(room.state!="sensor"){
                        if(room.state!="disabled"){
                            room.state = "sensor";
                            logger.info("'Off' Timer expired switching back to sensor mode")
                        }
                    }
                },time*1000);
            }    
        }
    }
});


//sets mode of operation
app.get('/active/:room/:command',function(req,res){
    var room = req.params.room.toLowerCase();
    var command = req.params.command;
    room=""+room.charAt(0);
    if(command=="disabled"){
        topic = getPowerTopic(room);
        sendMQTT(topic,"off");
    }
    roomstates[room].state=command;
    res.send("done");
});

//status endpoint for monitoring
app.get('/status',function(req,res){
    var temp = {}
    for (room in roomstates){
        temp[room]={};
        for(val in roomstates[room]){
            if(val!="runningFunction")
            temp[room][val]=roomstates[room][val];
        }
        
    }
    var respStr = JSON.stringify(temp);
    res.send(respStr);
});

//sets start and end times for sensor mode operation
//saves power by not running during the day 
app.get('/setTime/:room/:timernum/:time',function(req,res){
    var room = req.params.room.toLowerCase();
    var time = req.params.time;
    var timernum = req.params.timernum;
    room=""+room.charAt(0);
    if(timernum=="1"){
        roomstates[room].etime=time;
    }else{
        roomstates[room].stime=time;
    }
    res.send("time set");
});

//sets target temperature
app.get("/setTemp/:room/:temp",function(req,res){
    var room = req.params.room.toLowerCase();
    var temp = req.params.temp;
    room=""+room.charAt(0);
    roomstates[room].targetTemp=parseInt(temp)+roomstates[room].decimal;
    res.send("temp set");
});

//sets tolerance
app.get("/setTolerance/:room/:tolerance",function(req,res){
    var room = req.params.room.toLowerCase();
    var tolerance = req.params.tolerance;
    room=""+room.charAt(0);
    roomstates[room].tolerance=parseInt(tolerance);
    res.send("tolerance set");
});

//parses time string from ISO-8601 time format
function getSeconds(time){
    if (time=="undefined"||time==undefined){
        return time;
    }
    else{
        time=time.split("T")[1];
        var hours = 0;
        var mins = 0;
        var seconds = 0;
        if(time.indexOf("H")!=-1){
            hours = time.split("H")[0];
            time=time.split("H")[1];
        }
        if(time.indexOf("M")!=-1){
            mins = time.split("M")[0];
            time=time.split("M")[1];
        }
        if(time.indexOf("S")!=-1){
            seconds = time.split("S")[0];
            time=time.split("S")[1];
        }
        return hours*3600+mins*60+seconds;
    }
}
