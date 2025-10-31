const SocketManager = require("../socketManager.");

/**

* @module KGbuilder_socket
* @description Thin wrapper for emitting progress/error messages to a client socket or console fallback.
* Exposes: `message(clientSocketId, content, isError)`.
* If `clientSocketId` is present, forwards to `SocketManager.message` with channel `"KGbuilder"`.
* Otherwise logs to stdout; when `isError` is true, also logs to stderr-equivalent (console).
* Intended for status updates during long-running KG build operations.
* @requires SocketManager
  */

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
