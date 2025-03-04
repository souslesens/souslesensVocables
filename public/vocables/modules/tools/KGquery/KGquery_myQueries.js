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
            if(data.sparqlQuery == null){
                return alert("No query to save");
            }
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
        var index = -1;
        async.eachSeries(
            querySets,
            function (set, callbackEach1) {
                index++;
                var filters=set.classFiltersMap;
                var elementIndex=-1;
                async.eachSeries(
                    set.elements,
                    function (element, callbackEach2) {
                        var node = element.fromNode;
                        elementIndex++;
                        KGquery.addNode(node, null, function (err1, result2) {
                            
                            if(filters){
                                Object.values(filters).forEach(function(filter){
                                    if(filter.class.id==node.id){
                                        var classDivId=KGquery.querySets.sets[index].elements[elementIndex].fromNode.data.nodeDivId;
                                        if(classDivId){
                                            KGquery.querySets.sets[index].classFiltersMap[classDivId] = filter;
                                            $("#" + classDivId + "_filter").text( filter?.filter);
                                        }
                                    }
                                });
                                
                            }
                                // cest KGquery.addNode qui rajoure le noeud precedent
                            
                            node = element.toNode;
                            KGquery.addNode(node, null, function (err2, result2) {
                                if(filters){
                                    Object.values(filters).forEach(function(filter){
                                        if(filter.class.id==node.id){
                                            var classDivId=KGquery.querySets.sets[index].elements[elementIndex].toNode.data.nodeDivId;
                                            if(classDivId){
                                                KGquery.querySets.sets[index].classFiltersMap[classDivId] = filter;
                                                $("#" + classDivId + "_filter").text( filter?.filter);
                                            }
                                        }
                                    });
                                    
                                }
                               
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
        
    };

    return self;
})();

export default KGquery_myQueries;
window.KGquery_myQueries = KGquery_myQueries;
