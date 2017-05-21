#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>

#define ONE_WIRE_BUS D7
const char* ssid = "wifi";
const char* password = "pass";
const char* mqtt_server = "server";
const char* mqtt_un = "tempSensor";
const char* mqtt_pass = "tempSensor";

WiFiClient espClient;
PubSubClient client(espClient);

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature DS18B20(&oneWire);

char temperatureCString[6];
char temperatureFString[6];

long updateFrequency = 300000;
long lastUpdateTime = 0;
void setup() {
  Serial.begin(9600);
  DS18B20.begin();
  setup_wifi();
  client.setServer(mqtt_server, 1811);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();
  if(millis()-lastUpdateTime>updateFrequency){
    getTemperature();
    Serial.println("\nESP8266 - Temperature ");
    Serial.println("Temperature in Fahrenheit: ");
    Serial.println(temperatureFString);
    client.publish("b/temperature",temperatureFString);
    lastUpdateTime=millis();
  
  }

}
void setup_wifi() {

  delay(10);
  // We start by connecting to a WiFi network
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}
void callback(char* topic, byte* payload, unsigned int mlength) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  String topicstr = topic;
  Serial.print("] ");
  String message = "";
  for (int i = 0; i < mlength; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);
  updateFrequency = atol(message.c_str());
  
}
void reconnect() {
  // Loop until we're reconnected
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    // Attempt to connect
    if (client.connect("ESP82sdf323sseer66", mqtt_un, mqtt_pass)) {
      Serial.println("connected");
      client.subscribe("b/freq");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      // Wait 5 seconds before retrying
      delay(5000);
    }
  }
}
void getTemperature() {
  float tempC;
  float tempF;
  do {
    DS18B20.requestTemperatures(); 
    tempC = DS18B20.getTempCByIndex(0);
    dtostrf(tempC, 2, 2, temperatureCString);
    tempF = DS18B20.getTempFByIndex(0);
    dtostrf(tempF, 3, 2, temperatureFString);
    delay(100);
  } while (tempC == 85.0 || tempC == (-127.0));
}