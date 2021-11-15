
        socket.on('KGbuild', function (data) {
            KGbuild.serverMessage(data)
        })

        socket.on('annotate', function (data) {
            Evaluate.serverMessage(data)
        })
        socket.on("hello", function (data) {
            var x = console.log('socket channel established')
        })


        socket.on('connect', function(data) {
            socket.emit('join', 'Hello World from client');
        });
        socket.connect()
