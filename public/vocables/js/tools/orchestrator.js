const broadcastChannel = new BroadcastChannel('SLSV');


broadcastChannel.onmessage = function (ev) {

    if (ev.data.initStandardizerWords) {
        var data = ev.data.initStandardizerWords

        MainController.UI.initTool("Standardizer");
        setTimeout(function () {
            var str = "";
            data.forEach(function (item) {
                str += item + "\n"
            })
            $("#Standardizer_wordsTA").val(str)

        }, 500)


    }


    else if (ev.data.showStandardizerResultsInLineage) {
        var classUrisBySource = ev.data.showStandardizerResultsInLineage;

        MainController.UI.initTool("lineage");
        setTimeout(function () {
            var i = 0;
            async.eachSeries(Object.keys(classUrisBySource), function (source, callbackEach) {



                if (i++ == 0)
                    MainController.currentSource = source
                MainController.UI.onSourceSelect()
                Lineage_classes.addParentsToGraph(source, classUrisBySource[source], function (err) {
                    if (err)
                        return alert(err)
                    callbackEach()
                })

            })
        }, 500)
    }


    //  alert(ev);
}
var Orchestrator = (function () {

    var self = {}


    return self;


})()