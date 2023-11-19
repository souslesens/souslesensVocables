import SavedQueriesComponent from "../uiComponents/savedQueriesComponent.js";

var MyDashboard = (function () {
    var self = {};

    self.init = function () {
        async.series(
            [
                function (callbackSeries) {
                    $("#graphDiv").load("myDashboard.html", function () {
                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    callbackSeries();
                },
                function (callbackSeries) {
                    SavedQueriesComponent.list("STORED_KGQUERY_QUERIES", null, null, "myDashboard_KGquery_myQueriesSelect", function (err, result) {
                        if (err) callbackSeries(err);
                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    SavedQueriesComponent.list("STORED_TIMELINE_QUERIES", null, null, "myDashboard_TimeLine_myQueriesSelect", function (err, result) {
                        if (err) callbackSeries(err);
                        callbackSeries();
                    });
                },
            ],
            function (err) {
                if (err) {
                    return alert(err.responseText);
                }
            }
        );
    };

    return self;
})();

export default MyDashboard;
window.MyDashboard = MyDashboard;
