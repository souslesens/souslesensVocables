const RemoteCodeRunner = {
    runUserDataFunction: function (userData, callback) {
        var myModule = null;

        import(userData.data_content.modulePath).then((mod) => {
            myModule = mod; //

            try {
                myModule.run(function (err, result) {
                    return callback(err, result);
                });
                return;
                const fn = eval(myModule + "." + userData.data_content.fn);

                fn(function (err, result) {
                    return callback(err, result);
                });
            } catch (e) {
                return callback(e);
            }

            // true
        });
    },
};

export default RemoteCodeRunner;
var userData = {
    data_content: {
        modulePath: "../plugins/Lifex_PAZFLOR/public/js/serverFunctions.mjs",
        fn: "drawGraph",
    },
};

RemoteCodeRunner.runUserDataFunction(userData);
