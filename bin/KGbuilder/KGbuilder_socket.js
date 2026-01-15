const SocketManager = require("../socketManager.");

var KGbuilder_socket = {
    message: function (clientSocketId, content, isError) {
        try {
            if (clientSocketId) {
                SocketManager.message(clientSocketId, "KGbuilder", content);
            } else {
                console.log(content);
            }
        } catch (e) {
            console.log(content);
        }

        if (isError) {
            console.log(content);
        }
    },
};

module.exports = KGbuilder_socket;
