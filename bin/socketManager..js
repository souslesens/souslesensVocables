/**
 * Created by claud on 16/01/2017.
 */

var SocketManager = {
    clientSockets: {},
    initClientSocket: function (clientSocket) {
        SocketManager.clientSockets[clientSocket.id] = clientSocket;
    },

    message: function (clientSocketId, channel, message) {
        if (SocketManager.clientSockets[clientSocketId] && SocketManager.clientSockets[clientSocketId].emit) {
            SocketManager.clientSockets[clientSocketId].emit(channel, message);
        }
    },
};
module.exports = SocketManager;
