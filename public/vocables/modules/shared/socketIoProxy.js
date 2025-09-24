import KGcreator_run from "../tools/KGcreator/KGcreator_run.js";
import MappingModeler from "../tools/mappingModeler/mappingModeler.js";

const socket = io();
// client-side
socket.on("connect", () => {
    Config.clientSocketId = socket.id;
    // console.log(socket.id); // x8WIv7-mJelg7on_ALbx
});

socket.on("disconnect", () => {
    //  console.log(socket.id); // undefined
});

socket.on("KGbuilder", function (message) {
    MappingModeler.socketMessage(message);
});

socket.connect("ws://localhost:8080/", "echo-protocol");

/*var WebSocketClient = require('websocket').client;
var client = new WebSocketClient();

client.on('connectFailed', function(error) {
  console.log('Connect Error: ' + error.toString());
});

client.on('connect', function(connection) {
  console.log('WebSocket Client Connected');
  connection.on('error', function(error) {
    console.log("Connection Error: " + error.toString());
  });
  connection.on('close', function() {
    console.log('echo-protocol Connection Closed');
  });
  connection.on('message', function(message) {
    if (message.type === 'utf8') {
      console.log("Received: '" + message.utf8Data + "'");
    }
  });

  function sendNumber() {
    if (connection.connected) {
      var number = Math.round(Math.random() * 0xFFFFFF);
      connection.sendUTF(number.toString());
      setTimeout(sendNumber, 1000);
    }
  }
  sendNumber();
});

client.connect('ws://localhost:8080/', 'echo-protocol');
*/
