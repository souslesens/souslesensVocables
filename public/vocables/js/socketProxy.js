


        var socket = io();
              socket.on('connect', function (data) {
                  socket.emit('join', 'Hello World from client');
              });
              socket.on('messages', function (message) {
