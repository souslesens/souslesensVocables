//Create an instance of socketIo
//io() is in socket.io/socket.io.js see index.html
var socketIO = io();    
            
socketIO.on('connect', function() { 
    console.log("SocketIO conected to server");
    socketIO.emit("Hello", "My SocketIO has just conected to SLSV server"); 
});

socketIO.on('Hello', function(data) { 
    console.log("Server say hello: "+ data)
});

socketIO.on('KGcreator', function(data) { 
    console.log("KGcreator socketIO message received ")
    KGcreator.serverMessage(data);
});