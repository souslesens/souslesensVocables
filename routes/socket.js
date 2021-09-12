/**
 * Created by claud on 16/01/2017.
 */
var socket = module.exports = {};
var client={};
socket.stuff = function(_client, io){

    client=_client;
};
socket.message=function (channel,message){
console.log(message)
    if(client && client.emit) {
        client.emit(channel, message);
    }
}