import { register } from "node:module";

// Register custom loader to remap vocables paths
register("./remoteCodeRunnerLoader.js", import.meta.url);

// Mock browser globals for frontend modules running in Node.js
if (typeof globalThis.window === "undefined") {
    globalThis.window = globalThis;
    globalThis.self = globalThis;
    globalThis.document = {
        getElementById: () => null,
        createElement: () => ({}),
        querySelector: () => null,
        querySelectorAll: () => [],
    };
    globalThis.$ = () => ({ remove: () => {}, html: () => {}, css: () => {}, on: () => {}, off: () => {} });
    globalThis.UI = { message: (msg) => console.log("[UI]", msg) };
    globalThis.alert = (msg) => console.log("[alert]", msg);
    globalThis.vis = { DataSet: class { add() {} } };
    globalThis.async = { eachSeries: (arr, fn, cb) => cb && cb() };
    globalThis.MainController = { errorAlert: (err) => console.error("[MainController]", err) };
    globalThis.Sparql_common = { getLabelFromURI: (uri) => uri };
}

const RemoteCodeRunner = {
    runUserDataFunction: function (userData, callback) {
        var myModule = null;
        import(userData.data_content.modulePath)
            .then((mod) => {
                myModule = mod;
                try {
                    myModule.run(function (err, result) {
                        return callback(err, result);
                    });
                } catch (e) {
                    return callback(e);
                }
            })
            .catch((e) => {
                return callback(e);
            });

    },
};

export default RemoteCodeRunner;
/*
var userData = {
    data_content: {
        modulePath: "../plugins/Lifex_PAZFLOR/public/js/serverFunctions.mjs",
        fn: "drawGraph",
    },
};

RemoteCodeRunner.runUserDataFunction(userData);*/
