import Axiom_activeLegend from "../axioms/axiom_activeLegend.js";
import KGcreator from "./KGcreator.js";
import SourceSelectorWidget from "../../uiWidgets/sourceSelectorWidget.js";
import VisjsGraphClass from "../../graph/VisjsGraphClass.js";

var MappingModeler = (function() {
    var self = {};
    self.currentSource = null;
    self.currentDataSource = null;
    self.init = function(source, resource, divId) {
        async.series([
            //init source
            function(callbackSeries) {
                SourceSelectorWidget.initWidget(["OWL"], "mainDialogDiv", true, function(source) {
                    var source = SourceSelectorWidget.getSelectedSource()[0];
                    $("#mainDialogDiv").dialog("close");

                    self.currentSource = source;
                    return callbackSeries();
                });
            },
            //bot
            function(callbackSeries) {
                /*  var params = {
                      source: self.currentSource
                  }

                  MappingModeler_bot.start(MappingModeler_bot.workflow, params, function (err, result) {
                      self.currentDataSource = result;
                      return callbackSeries()
                  })*/
                KGcreator.currentSlsvSource = self.currentSource;
                KGcreator.getSlsvSourceConfig(self.currentSource, function(err, result) {
                    if (err) {
                        return callbackSeries(err);
                    }

                    KGcreator.currentConfig = result;
                    return callbackSeries();
                });
            },

            function(callbackSeries) {
                $("#mainDialogDiv").load("./modules/tools/KGcreator/html/mappingModeler.html", function(err) {
                    $("#mainDialogDiv").dialog("open");
                    return callbackSeries();
                });
            },

            function(callbackSeries) {
                if (!divId) {
                    divId = "nodeInfosAxioms_activeLegendDiv";
                }
                //    self.initActiveLegend(divId);

                return callbackSeries();
            },

            // load jstree
            function(callbackSeries) {
                var options = {
                    openAll: true,
                    selectTreeNodeFn: self.onDataSourcesJstreeSelect
                };
                KGcreator.loadDataSourcesJstree("mappingModeler_jstreeDiv", options, function(err, result) {
                    return callbackSeries(err);
                });
            },
            //initDataSource
            function(callbackSeries) {
                return callbackSeries();
            }
        ]);
    };

    self.onDataSourcesJstreeSelect = function(event, obj) {
        self.currentTreeNode = obj.node;

        //  KGcreator_run.getTableAndShowMappings();

        if (obj.node.data.type == "databaseSource") {
            KGcreator.initDataSource(obj.node.id, "databaseSource", obj.node.data.sqlType, obj.node.data.table);

            KGcreator.loadDataBaseSource(KGcreator.currentSlsvSource, obj.node.id, obj.node.data.sqlType);
        } else if (obj.node.data.type == "csvSource") {
            KGcreator.initDataSource(obj.node.id, "csvSource", obj.node.data.sqlType, obj.node.id);
            KGcreator.loadCsvSource(KGcreator.currentSlsvSource, obj.node.id, false, function(err, jstreeData) {
                if (err) {
                    return alert("file not found");
                }
                var columns = [];
                jstreeData.forEach(function(item) {
                    columns.push(item.data.id);
                });
                self.hideForbiddenResources("Table");
                self.currentResourceType = "Column";
                self.currentTable = {
                    name: obj.node.id,
                    columns: columns
                };
                common.fillSelectOptions("axioms_legend_suggestionsSelect", columns, false);
            });
        } else if (obj.node.data.type == "table") {
            self.currentTable = {
                name: obj.node.data.label,
                columns: KGcreator.currentConfig.currentDataSource.tables[obj.node.data.id]
            };
            var table = obj.node.data.id;
            KGcreator.currentConfig.currentDataSource.currentTable = table;


            self.hideForbiddenResources("Table");
            self.currentResourceType = "Column";
            common.fillSelectOptions("axioms_legend_suggestionsSelect", self.currentTable.columns, false);

        }
        MappingModeler.switchDataSourcePanel("hide");
        var divId = "nodeInfosAxioms_activeLegendDiv";
        self.initActiveLegend(divId);
    };

    self.initActiveLegend = function(divId) {
        var legendItems = [
            { label: "Class", color: "#00afef" },
            { label: "ObjectProperty", color: "#f5ef39" },
            { label: "Column", color: "#cb9801" },
            { label: "Connective", color: "#70ac47" }
        ];
        var options = {
            onLegendNodeClick: self.onLegendNodeClick,
            showLegendGraphPopupMenu: self.showLegendGraphPopupMenu,
            xOffset: 300
        };
        Axiom_activeLegend.isLegendActive = true;

        Axiom_activeLegend.drawLegend("nodeInfosAxioms_activeLegendDiv", legendItems, options);
        self.graphDiv = "mappingModeler_graphDiv";
    };

    self.hideForbiddenResources = function(resourceType) {
        var hiddenNodes = [];
        if (resourceType == "Table") {
            hiddenNodes.push("ObjectProperty");
            hiddenNodes.push("Class");
            hiddenNodes.push("Connective");
        }
        Axiom_activeLegend.hideLegendItems(hiddenNodes);
    };
    self.onSuggestionsSelect = function(resourceUri) {
        var newResource = null;

        if (self.currentResourceType == "Column") {
            newResource = {
                id: resourceUri,
                label: resourceUri,
                resourceType: "Column",
                symbol: null,
                level: 0,
                data: {
                    id: resourceUri,
                    label: resourceUri,
                    type: "Column"
                },
                predicates: []
            };
        }
        self.currentGraphNode = newResource;
        self.drawResource(newResource)

    }
    self.onLegendNodeClick = function(node, event) {
        self.currentResourceType = node.id;


        if (node && node.data) {
            self.currentNodeType = node.data.type;
            self.currentLegendNodeType = node.data.type;


            if (node.data.type == "Column") {
                common.fillSelectOptions("axioms_legend_suggestionsSelect", self.currentTable.columns, false);

            } else if (node.data.type == "Class") {

            }
        }


    };

    self.showLegendGraphPopupMenu = function() {
    };


    self.switchDataSourcePanel = function(target) {

        if (target == "show") {
            $("#mappingModeler_jstreeDiv").css("display", "block");
            $("#mappingModeler_mainDiv").css("display", "none");
            $("#mappingModeler_graphPanelDiv").css("display", "none");
        } else {
            $("#mappingModeler_jstreeDiv").css("display", "none");
            $("#mappingModeler_mainDiv").css("display", "block");
            $("#mappingModeler_graphPanelDiv").css("display", "block");
        }


    };


    self.drawResource = function(newResource) {

        var visjsData = { nodes: [], edges: [] };
        var visjsNode = newResource//self.getVisjsNode(newResource, level);
        visjsData.nodes.push(visjsNode);

        if (self.visjsGraph) {
            self.visjsGraph.data.nodes.add(visjsData.nodes);
            if (self.currentGraphNode) {
                //  var edgeId = self.currentGraphNode.id + "_" + newResource.id;
                var edgeId = common.getRandomHexaId(5);
                visjsData.edges.push({
                    id: edgeId,
                    from: self.currentGraphNode.id,
                    to: newResource.id
                });

              //  self.updateCurrentGraphNode(visjsNode);
                self.visjsGraph.data.edges.add(visjsData.edges);
            }

            //
        } else {
            self.hierarchicalLevel = 0;
            var options = {
                onNodeClick: function(node, event) {
                    self.currentGraphNode = node;
                }
            };
            self.drawGraphCanvas(self.graphDiv, visjsData,options);
        }

        self.hideForbiddenResources(self.currentGraphNode.data.type);
        $("#axioms_legend_suggestionsSelect").empty();


    };


    self.drawGraphCanvas = function(graphDiv, visjsData,options) {
        self.graphOptions = {
            keepNodePositionOnDrag: true,
            /* physics: {
enabled:true},*/

            visjsOptions: {
                edges: {
                    smooth: {
                        type: "cubicBezier",
                        // type: "diagonalCross",
                        forceDirection: "horizontal",
                        roundness: 0.4
                    }
                }
            },


            onclickFn: options.onNodeClick,
            onRightClickFn: options.onRightClickFn || self.showGraphPopupMenu
        };


        self.visjsGraph = new VisjsGraphClass(graphDiv, visjsData, self.graphOptions);
        self.visjsGraph.draw(function() {

        });
    };

    self.clearGraph = function () {
        $("#" + self.graphDivId).html("");
    };
    return self;
})();

export default MappingModeler;
window.MappingModeler = MappingModeler;
