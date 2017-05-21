var http = require('http')
var toSay = "done";
    exports.handler = (event, context) => {

        try {

            if (event.session.new) {
                // New Session
                console.log("NEW SESSION")
            }

            switch (event.request.type) {

                case "LaunchRequest":
                    // Launch Request
                    console.log(`LAUNCH REQUEST`)
                    var body = "";
                    var endpoint = 'server/manual/bedroom/on/undefined';
                    toSay = "yes, master"
                    http.get(endpoint, function (result) {
                        console.log('Success, with: ' + result.statusCode);
                        context.succeed(
                            generateResponse(
                                buildSpeechletResponse(toSay, true),
                                {}
                            )
                        )

                    }).on('error', function (err) {
                        console.log('Error, with: ' + err.message);
                        context.done("Failed");
                    });
                    break;

                case "IntentRequest":
                    // Intent Request
                    console.log(`INTENT REQUEST`)

                    switch (event.request.intent.name) {
                        case "TurnOn":
                            toSay = "done";
                            var duration;
                            if(event.request.intent.slots.Duration!=undefined)
                                duration = event.request.intent.slots.Duration.value;
                            var room;
                            if(event.request.intent.slots.Room)
                                room=event.request.intent.slots.Room.value;
                            if (room==undefined)room="bedroom";
                            var endpoint = 'server/manual/' + room + "/on/"+duration;
                            http.get(endpoint, function (result) {
                                console.log('Success, with: ' + result.statusCode);
                                context.succeed(
                                    generateResponse(
                                        buildSpeechletResponse(toSay, true),
                                        {}
                                    )
                                )
                            }).on('error', function (err) {
                                console.log('Error, with: ' + err.message);
                                context.done("Failed");
                            });
                            break;

                        case "TurnOff":
                            var duration;
                            if(event.request.intent.slots.Duration)
                                duration = event.request.intent.slots.Duration.value;
                            var room;
                            if(event.request.intent.slots.Room)
                                room=event.request.intent.slots.Room.value;
                            if (room==undefined)room="bedroom";
                            var endpoint = 'server/manual/' + room + "/off/"+duration;
                            http.get(endpoint, function (result) {
                                console.log('Success, with: ' + result.statusCode);
                                context.succeed(
                                    generateResponse(
                                        buildSpeechletResponse(toSay, true),
                                        {}
                                    )
                                )
                            }).on('error', function (err) {
                                console.log('Error, with: ' + err.message);
                                context.done("Failed");
                            });
                            break;
                        case "Disable":
                            toSay = "disabled";
                            var room;
                            if(event.request.intent.slots.Room)
                                room=event.request.intent.slots.Room.value;
                            if (room==undefined)room="bedroom";
                            var endpoint = 'server/active/'+room+"/disabled"
                            toSay="disabled";
                            http.get(endpoint, function (result) {
                                console.log('Success, with: ' + result.statusCode);
                                context.succeed(
                                    generateResponse(
                                        buildSpeechletResponse(toSay, true),
                                        {}
                                    )
                                )

                            }).on('error', function (err) {
                                console.log('Error, with: ' + err.message);
                                context.done("Failed");
                            });
                            break;
                        case "Enable":
                            toSay = "done";
                            var room;
                            if(event.request.intent.slots.Room)
                                room=event.request.intent.slots.Room.value;
                            if (room==undefined)room="bedroom";
                            var endpoint = 'server/active/'+room+"/sensor"
                            toSay="disabled";
                            http.get(endpoint, function (result) {
                                console.log('Success, with: ' + result.statusCode);
                                context.succeed(
                                    generateResponse(
                                        buildSpeechletResponse(toSay, true),
                                        {}
                                    )
                                )

                            }).on('error', function (err) {
                                console.log('Error, with: ' + err.message);
                                context.done("Failed");
                            });
                            break;
                        case "TurnOffTime":
                            var room;
                            if(event.request.intent.slots.Room)
                                room=event.request.intent.slots.Room.value;
                            if (room==undefined)room="bedroom";
                            var time = event.request.intent.slots.Time.value;
                            var endpoint = 'server/setTime/'+room+"/1/"+time;
                            toSay="morning time set";
                            http.get(endpoint, function (result) {
                                console.log('Success, with: ' + result.statusCode);
                                context.succeed(
                                    generateResponse(
                                        buildSpeechletResponse(toSay, true),
                                        {}
                                    )
                                )

                            }).on('error', function (err) {
                                console.log('Error, with: ' + err.message);
                                context.done("Failed");
                            });
                            break;
                        case "TurnOnTime":
                            var room;
                            if(event.request.intent.slots.Room)
                                room=event.request.intent.slots.Room.value;
                            if (room==undefined)room="bedroom";
                            var time = event.request.intent.slots.Time.value;
                            var endpoint = 'server/setTime/'+room+"/2/"+time;
                            toSay="night time set";
                            http.get(endpoint, function (result) {
                                console.log('Success, with: ' + result.statusCode);
                                context.succeed(
                                    generateResponse(
                                        buildSpeechletResponse(toSay, true),
                                        {}
                                    )
                                )
                            }).on('error', function (err) {
                                console.log('Error, with: ' + err.message);
                                context.done("Failed");
                            });
                            break;
                        case "Sensor":
                            var room;
                            if(event.request.intent.slots.Room)
                                room=event.request.intent.slots.Room.value;
                            if (room==undefined)room="bedroom";
                            var temp = event.request.intent.slots.Temp.value;
                            var endpoint = 'server/setTemp/'+room+"/"+temp;
                            toSay="temperature set";
                            http.get(endpoint, function (result) {
                                console.log('Success, with: ' + result.statusCode);
                                context.succeed(
                                    generateResponse(
                                        buildSpeechletResponse(toSay, true),
                                        {}
                                    )
                                )
                            }).on('error', function (err) {
                                console.log('Error, with: ' + err.message);
                                context.done("Failed");
                            });
                            break;
                        case "SetTolerance":
                            var room;
                            if(event.request.intent.slots.Room)
                                room=event.request.intent.slots.Room.value;
                            if (room==undefined)room="bedroom";
                            var tolerance = event.request.intent.slots.Tolerance.value;
                            var endpoint = 'server/setTolerance/'+room+"/"+tolerance;
                            toSay="tolerance set";
                            http.get(endpoint, function (result) {
                                console.log('Success, with: ' + result.statusCode);
                                context.succeed(
                                    generateResponse(
                                        buildSpeechletResponse(toSay, true),
                                        {}
                                    )
                                )
                            }).on('error', function (err) {
                                console.log('Error, with: ' + err.message);
                                context.done("Failed");
                            });
                            break;
                        default:
                            throw "Invalid intent"
                    }

                    break;

                case "SessionEndedRequest":
                    // Session Ended Request
                    console.log(`SESSION ENDED REQUEST`)
                    break;

                default:
                    context.fail(`INVALID REQUEST TYPE: ${event.request.type}`)

            }

        } catch (error) { context.fail(`Exception: ${error}`) }

    }

// Helpers
buildSpeechletResponse = (outputText, shouldEndSession) => {

    return {
        outputSpeech: {
            type: "PlainText",
            text: outputText
        },
        shouldEndSession: shouldEndSession
    }

}

generateResponse = (speechletResponse, sessionAttributes) => {

    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    }

}