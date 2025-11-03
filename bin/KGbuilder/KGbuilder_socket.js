const SocketManager = require("../socketManager.");

var KGbuilder_socket = {
    message: function (clientSocketId, content, isError) {
        if (clientSocketId) {
            SocketManager.message(clientSocketId, "KGbuilder", content);
        } else {
            console.log(content);
        }
        if (isError) {
            console.log(content);
        }
    },
};

module.exports = KGbuilder_socket;
