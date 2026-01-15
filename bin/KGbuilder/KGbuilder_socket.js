import SocketManager from '../socketManager.js';

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

export default KGbuilder_socket;