import KGquery from "./KGquery.js";
import SavedQueriesWidget from "../../uiWidgets/savedQueriesWidget.js";

var KGquery_myQueries = (function () {
    var self = {};

    self.save = function (callback) {
        //   KGquery.execPathQuery({ dontExecute: true }, function (err, query) {
        var data = {
            querySets: KGquery.querySets,
            sparqlQuery: KGquery.currentSparqlQuery,
        };
        return callback(null, data);
        //  });
    };

    self.load = function (err, result) {
        // return; // ! not working correctly !!!!!!!!!!!!!!!!!!!!!!!!
        if (err) {
            return alert(err.responseText);
        }
        UI.openTab("lineage-tab", "tabs_Query", KGquery.initQuery, this);
        //  $("#KGquery_leftPanelTabs").tabs("option", "active", 1);
        KGquery.clearAll();
        KGquery.switchRightPanel(true);
        var querySets = result.querySets.sets;

        async.eachSeries(
            querySets,
            function (set, callbackEach1) {
                var index = 0;
                async.eachSeries(
                    set.elements,
                    function (element, callbackEach2) {
                        var node = element.fromNode;

                        KGquery.addNode(node, null, function (err1, result2) {
                            if (index++ > 0)
                                // cest KGquery.addNode qui rajoure le noeud precedent
                                return callbackEach2(err1);
                            node = element.toNode;
                            KGquery.addNode(node, null, function (err2, result2) {
                                return callbackEach2(err2);
                            });
                        });
                    },
                    function (err2) {
                        return callbackEach1(err2);
                    },
                );
            },
            function (err1) {},
        );

        return;
        querySets.forEach(function (set) {
            set.elements.forEach(function (element) {
                var node = element.fromNode;
                KGquery.addNode(node);
                node = element.toNode;
                KGquery.addNode(node);
            });
        });
        var queryElementsObjects = {};
        querySets.forEach(function (value, key) {
            value.elements.forEach(function (value2, key2) {
                queryElementsObjects[value2.divId] = value2;
                if (value2.fromNode != "") {
                    value2.fromNode.data.queryElement = queryElementsObjects[value2.fromNode.data.queryElement];
                }
                if (value2.toNode != "") {
                    value2.fromNode.data.queryElement = queryElementsObjects[value2.toNode.data.queryElement];
                }
            });
        });
    };

    return self;
})();

export default KGquery_myQueries;
window.KGquery_myQueries = KGquery_myQueries;
