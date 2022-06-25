const broadcastChannel = new BroadcastChannel("SLSV");

broadcastChannel.onmessage = function (ev) {
    if (ev.data.initStandardizerWords) {
        var data = ev.data.initStandardizerWords;

        MainController.UI.initTool("Standardizer", function (_err, _result) {
            //  setTimeout(function () {
            var str = "";
            data.forEach(function (item) {
                str += item + "\n";
            });
            $("#Standardizer_wordsTA").val(str);

            //  }, 500)
        });
    } else if (ev.data.showStandardizerResultsInLineage) {
        var classUrisBySource = ev.data.showStandardizerResultsInLineage;

        MainController.UI.initTool("lineage", function (_err, _result) {
            //  setTimeout(function () {
            var i = 0;
            async.eachSeries(Object.keys(classUrisBySource), function (source, callbackEach) {
                if (i++ == 0) MainController.currentSource = source;
                MainController.UI.onSourceSelect();
                Lineage_classes.addNodesAndParentsToGraph(source, classUrisBySource[source],{}, function (err) {
                    if (err) return alert(err);
                    callbackEach();
                });
            });
            //   }, 500)
        });
    }

    //  alert(ev);
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
var Orchestrator = (function () {
    var self = {};

    return self;
})();
