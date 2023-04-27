socket.on("KGbuild", function (data) {
    KGbuild.serverMessage(data);
});

socket.on("annotate", function (data) {
    Evaluate.serverMessage(data);
});
socket.on("hello", function (_data) {
    // eslint-disable-next-line no-console
    console.log("socket channel established");
});

socket.on("connect", function (_data) {
    socket.emit("join", "Hello World from client");
});
//socket.connect();
