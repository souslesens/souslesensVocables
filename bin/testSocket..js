var io = require('../node_modules/socket.io').listen(5000);
console.log("!!!!!!!!!!socketListen")
io.sockets.on('connection', function (client) {
    console.log("!!!!!!!connection");
    client.on('join', function(data) {
        console.log(data);
    });

    socket.on('msg', function () {
        socket.get('nickname', function (err, name) {
            console.log('Chat message by ', name);
        });
    });
});
