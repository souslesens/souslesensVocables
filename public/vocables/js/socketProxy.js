var socket = io();
socket.emit('chat message', "hello from Client");

socket.on('ADLbuild', function (data) {
    ADLbuild.serverMessage(data)
})

socket.on('annotate', function (data) {
   Evaluate.serverMessage(data)
})