/**
 * Created by claud on 16/01/2017. Updated on 03-2023
 */
// socket IO manager
var SocketManager = {
    currentClient: {},
    initClientSocket: function (clientSocket) {
        SocketManager.currentClient = clientSocket;
        console.log("SocketIO Manager initialized");
    },

    message: function (channel, message) {
        /*if (SocketManager.currentClient && SocketManager.currentClient.emit) {
            SocketManager.currentClient.emit(channel, message);
        }*/
        if (SocketManager.currentClient) {
            SocketManager.currentClient.emit(channel, message);
        } else {
            console.log();
        }
    },
};
module.exports = SocketManager;
