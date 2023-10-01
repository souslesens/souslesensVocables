import KGcreator from "../tools/KGcreator.js";
import VisjsGraphClass from "../graph/VisjsGraphClass.js";
import Lineage_whiteboard from "../tools/lineage/lineage_whiteboard.js";
import PopupMenuWidget from "../uiWidgets/popupMenuWidget.js";


var R2Gmappings = (function () {
    var self = {};
    self.currentConfig = {};
    self.currentSource = {};
    self.allTriplesMappings = {};
    self.getAllTriplesMappings = function (source, callback) {
        if (self.allTriplesMappings[source]) {
            return callback(null, self.allTriplesMappings[source]);
        }
        KGcreator.loadMappingsList(function (err, result) {
            if (err) {
                return alert(err.responseText);
            }

            var allTripleMappings = {};

            async.eachSeries(
                result,
                function (mappingFileName, callbackEach) {
                    var payload = {
                        dir: "CSV/" + source,
                        name: mappingFileName,
                    };
                    allTripleMappings[mappingFileName] = {};
                    $.ajax({
                        type: "GET",
                        url: `${Config.apiUrl}/data/file`,
                        data: payload,
                        dataType: "json",
                        success: function (result, _textStatus, _jqXHR) {
                            try {
                                var jsonObject = JSON.parse(result);
                                allTripleMappings[mappingFileName] = jsonObject;
                            } catch (e) {
                                console.log("parsing error " + mappingFileName);
                            }
                            callbackEach();
                        },
                        error(err) {
                            return callbackEach(err);
                        },
                    });
                },
                function (err) {
                    if (err) {
                        return callback(err.responseText);
                    }
                    self.allTriplesMappings[source] = allTripleMappings;
                    return callback(null, allTripleMappings);
                }
            );
        });
    };


    self.loadSourceConfig = function (source, callback) {
        self.currentSource = self.currentCsvDir;
        var payload = {
            dir: "mappings/" + source,
            name: "main.json",
        };
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/data/file",
            data: payload,
            dataType: "json",
            success: function (result, _textStatus, _jqXHR) {
                self.currentConfig = JSON.parse(result);
            },
            error: function (err) {
                callback(err);
            },
        });
    };


    self.getIndividualMapping = function (source, className) {
        self.getAllTriplesMappings(source, function (err, allTripleMappings) {
            if (err) {
                return callback(err);
            }

            var table = null;
            var column = null;
            for (var fileName in allTripleMappings) {
                var tripleModels = allTripleMappings[fileName].tripleModels;
                var databaseSource = allTripleMappings[fileName].databaseSource;

                tripleModels.forEach(function (triple) {
                    if (triple.p == "rdf:type" && triple.o == className) {
                        table = fileName;
                        column = triple.s;
                        return { databaseSource: databaseSource, table: table, column: column };
                    }
                });
            }
        });
    };
    self.getIndividualRecord =  function (source, className, uri, callback) {
            var mapping = self.getIndividualMapping(source, className);

            var sql = "select * from " + mapping.table + "where " + mapping.column + " = '" + uri + "'";
        };



    self.drawOntologyModel=function(source){


       var  options = {
           visjsOptions: {
               keepNodePositionOnDrag: true,
               onclickFn: R2Gmappings.graphActions.onNodeClick,
               onRightClickFn: R2Gmappings.graphActions.showGraphPopupMenu,
               visjsOptions: {
                   physics: {
                       stabilization: {
                           enabled: false,
                           iterations: 180, // maximum number of iteration to stabilize
                           updateInterval: 10,
                           ///  onlyDynamicEdges: false,
                           fit: true
                       },
                       barnesHut: {
                           springLength: 0,
                           damping: 0.15,
                           centralGravity: 0.8
                       },
                       minVelocity: 0.75
                   },
                   nodes: { font: { color: self.defaultNodeFontColor } },
                   edges: {
                       font: {
                           color: self.defaultEdgeColor,
                           multi: true,
                           size: 10,
                           strokeWidth: 0

                           //ital: true,
                       }
                   }
               }
           }
       }
        Lineage_whiteboard.lineageVisjsGraph = new VisjsGraphClass("KGcreator_resourceLinkGraphDiv", { nodes: [], edges: [] }, {});
        Lineage_whiteboard.drawModel(source,"KGcreator_resourceLinkGraphDiv",options)
    }

    self.graphActions= {
        onNodeClick: function(node, point, event) {
            self.currentGraphNode = node
        },


        showGraphPopupMenu: function(node, point, event) {
            if (!node || !node.data) {
                return;
            }
            var html = "";


            html = "    <span class=\"popupMenuItem\" onclick=\"Lineage_whiteboard.graphActions.showNodeNodeInfos();\"> Node Infos</span>";
            html += "    <span class=\"popupMenuItem\" onclick=\"R2Gmappings.graphActions.setFieldClass();\"> Set fieldClass</span>";
            $("#popupMenuWidgetDiv").html(html);
            PopupMenuWidget.showPopup(point, "popupMenuWidgetDiv");
        },

        setFieldClass:function(){
            if(!self.currentGraphNode)
                return alert("select a node")



        }



    }


    return self;
})();

export default R2Gmappings;
window.R2Gmappings = R2Gmappings;
