import SocketManager from "../socketManager.js";

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

export default KGbuilder_socket;
