import Axiom_activeLegend from "../axioms/axiom_activeLegend.js";
import KGcreator from "./KGcreator.js";
import SourceSelectorWidget from "../../uiWidgets/sourceSelectorWidget.js";
import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import Axioms_graph from "../axioms/axioms_graph.js";
import Axioms_suggestions from "../axioms/axioms_suggestions.js";
import CommonBotFunctions from "../../bots/_commonBotFunctions.js";

var MappingModeler = (function() {
    var self = {};
    self.currentSource = null;
    self.currentDataSource = null;

    self.legendItemsArray = [
        { label: "Column", color: "#cb9801",shape:"ellipse", },
        { label: "RowIndex", color: "#cb9801",shape:"triangle"},
        { label: "VirtualColumn", color: "#cb9801",shape:"square" },
       // { label: "Type", color: "#f5ef39" },
        { label: "Class", color: "#00afef",shape:"box" },
        //  { label: "ObjectProperty", color: "#f5ef39" }
    ];


    self.iriTypes=["fromLabel",
        "blankNode",
        "hashcode"]


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
            function(callbackSeries) {
                self.initResourcesMap(self.currentSource);
                return callbackSeries();
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

        var options = {
            onLegendNodeClick: self.onLegendNodeClick,
            showLegendGraphPopupMenu: self.showLegendGraphPopupMenu,
            xOffset: 300
        };
        Axiom_activeLegend.isLegendActive = true;
        self.legendItems={}
        self.legendItemsArray.forEach(function(item){
            self.legendItems[item.label]=item
        })

        Axiom_activeLegend.drawLegend("nodeInfosAxioms_activeLegendDiv", self.legendItemsArray, options);
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

        if (resourceUri == "createClass") {
               return self.showCreateResourceBot("Class", null);
        }
        else if (resourceUri == "createObjectProperty") {
               return self.showCreateResourceBot("ObjectProperty", null);
        }

       else if (self.currentResourceType == "Column") {
            newResource = {
                id: resourceUri,
                label: resourceUri,
                shape:self.legendItems[self.currentResourceType].shape,
                color:self.legendItems[self.currentResourceType].color,
                level: 0,
                data: {
                    id: resourceUri,
                    label: resourceUri,
                    type: self.currentResourceType
                },

            };
            self.drawResource(newResource);
            setTimeout(function(){ self.onLegendNodeClick({ id: "Class" });
            },500)

        }
       else if (self.currentResourceType == "Class") {
            var resource = self.allResourcesMap[resourceUri];
            newResource = {
                id: resourceUri,
                label: resource.label,
                shape:self.legendItems[self.currentResourceType].shape,
                color:self.legendItems[self.currentResourceType].color,
                data: {
                    id: resourceUri,
                    label: resource.label,
                    type: "Class"
                },

            };

            self.drawResource(newResource);
        }
        else if (self.currentResourceType == "RowIndex") {
            var id=common.getRandomHexaId(5)
            newResource = {
                id: id,
                label: "#",
                shape:self.legendItems[self.currentResourceType].shape,
                color:self.legendItems[self.currentResourceType].color,
                size:12,
                data: {
                    id: id,
                    label: "#",

                    type: self.currentResourceType
                },

            };
            self.drawResource(newResource);
            setTimeout(function(){ self.onLegendNodeClick({ id: "Class" });
            },500)
        }
        else if (self.currentResourceType == "VirtualColumn") {

            newResource = {
                id: resourceUri,
                label: resourceUri,
                shape:self.legendItems[self.currentResourceType].shape,
                color:self.legendItems[self.currentResourceType].color,
                size:12,

                data: {
                    id: resourceUri,
                    label: resourceUri,
                    type: self.currentResourceType
                },

            };
            self.drawResource(newResource);
            setTimeout(function(){ self.onLegendNodeClick({ id: "Class" });
            },500)
        }
        else if (self.currentResourceType == "ObjectProperty") {

            if (self.currentRelation ) {
                self.currentRelation.data = { type: "Objectproperty", propId: resourceUri };
                self.currentRelation.label=self.allResourcesMap[resourceUri].label
                var edge = self.currentRelation;
                edge.arrows = {
                    to: {
                        enabled: true,
                            type: "diamond"
                    }
                };
                edge.color="#1244e8"
                self.visjsGraph.data.edges.add([edge]);
                self.currentRelation = null;
                $("#axioms_legend_suggestionsSelect").empty();
            }
        }

        else if(resourceUri=="IRIType"){

            common.fillSelectOptions("axioms_legend_suggestionsSelect", self.iriTypes, false);

        }


        //add node info to visjsGraphNode
        else if(self.iriTypes.indexOf(resourceUri)>-1){
            self.currentGraphNode.data.iriType=resourceUri

            self.visjsGraph.data.nodes.update({id:self.currentGraphNode.id,data:self.currentGraphNode.data})
        }
    };


    self.drawResource = function(newResource) {
        var arrows = {
            to: {
                enabled: true,
                type: "arrow"
            }
        };
        var edgeColor="#ccc"
        if (!self.currentOffest) {
            self.currentOffest = { x: 0, y: 0 };
        }
        if (self.currentGraphNode && newResource.data.type == "Class") {

            newResource.x = self.currentGraphNode.x;
            newResource.y = self.currentGraphNode.y - 100;
        } else {

            newResource.x = (self.currentOffest.x += 200);
            if (self.currentOffest.x > 450) {
                self.currentOffest.y += 200;
            }
            newResource.y = (self.currentOffest.y);
        }
        newResource.fixed = { x: true, y: true };


        var visjsData = { nodes: [], edges: [] };
        var visjsNode = newResource;//self.getVisjsNode(newResource, level);
        visjsData.nodes.push(visjsNode);

        if (self.visjsGraph) {
            self.visjsGraph.data.nodes.add(visjsData.nodes);
            if (newResource.data.type == "Class" && self.currentGraphNode) {
                //  var edgeId = self.currentGraphNode.id + "_" + newResource.id;
                var edgeId = common.getRandomHexaId(5);
                visjsData.edges.push({
                    id: edgeId,
                    from: self.currentGraphNode.id,
                    label:"a",
                    to: newResource.id,

                    arrows: arrows,
                    color:edgeColor
                });

                //  self.updateCurrentGraphNode(visjsNode);
                self.visjsGraph.data.edges.add(visjsData.edges);
            }

            //
        } else {
            self.hierarchicalLevel = 0;
            var options = {
                onNodeClick: MappingModeler.onVisjsGraphClick
            };
            self.drawGraphCanvas(self.graphDiv, visjsData, options);
        }

        self.hideForbiddenResources(newResource.data.type);
        $("#axioms_legend_suggestionsSelect").empty();

        self.currentGraphNode = newResource;

    };


    self.drawGraphCanvas = function(graphDiv, visjsData, options) {
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

    self.onVisjsGraphClick = function(node, event, options) {
        self.currentGraphNode = node;
        if (options.ctrlKey) {
            if (!self.currentRelation) {
                self.currentRelation = { from: node.id, to: null };
            } else {
                self.currentRelation.to = node.id;
                self.onLegendNodeClick({ id: "ObjectProperty" });
            }
        }else  if (options.shiftKey) {
        var choices=["IRIType" ,
        "rdfs:label","owl:DatatypeProperty","owl:AnnotationProperty"];
            common.fillSelectOptions("axioms_legend_suggestionsSelect", choices, false);
            self.currentResourceType=null;

        }
    };
    self.onLegendNodeClick = function(node, event) {
        if (!node) {
            return;
        }
        self.currentResourceType = node.id;


        if (self.currentResourceType == "Column") {
            common.fillSelectOptions("axioms_legend_suggestionsSelect", self.currentTable.columns, false);

        } else if (self.currentResourceType == "Class") {

            //   self.hideLegendItems();
            var newObject = { id: "createClass", label: "_Create new Class_" };
            self.getAllClasses(self.currentSource, function(err, classes) {
                if (err) {
                    return alert(err);
                }

                self.setSuggestionsSelect(classes, true, newObject);
            });

        } else if (self.currentResourceType == "ObjectProperty") {

            //   self.hideLegendItems();
            var newObject = { id: "createObjectProperty", label: "_Create new ObjectProperty_" };
            Axioms_suggestions.getValidPropertiesForClasses(self.currentSource, self.currentRelation.from, self.currentRelation.to, function (err, properties) {
                self.setSuggestionsSelect(properties, true, newObject);
            });
          /*  self.getAllProperties(self.currentSource, function(err, objectProperties) {
                if (err) {
                    return alert(err);
                }

                self.setSuggestionsSelect(objectProperties, true, newObject);
            });*/

        }
    else if (self.currentResourceType == "RowIndex") {
            self.onSuggestionsSelect({id:"RowIndex"})
        }
        else if (self.currentResourceType == "VirtualColumn") {
            var columnName=prompt("Virtual column name")
            if(columnName)
            self.onSuggestionsSelect(columnName)

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
    self.getAllClasses = function(source, callback) {
        if (!source) {
            source = self.currentSource;
        }
        if (!self.allClasses) {
            CommonBotFunctions.listSourceAllClasses(source, null, false, [], function(err, result) {
                if (err) {
                    return callback(err.responseText);
                }
                self.allClasses = [];
                var uniqueIds = {};
                result.forEach(function(item) {
                    if (!uniqueIds[item.id]) {
                        uniqueIds[item.id] = 1;
                        item.label = item.label; //.replace(/ /g, "_");
                        item.resourceType = "Class";
                        self.allClasses.push(item);
                    }
                });
                common.array.sort(self.allClasses, "label");
                if (callback) {
                    return callback(null, self.allClasses);
                }
                return self.allClasses;
            });
        } else {
            if (callback) {
                return callback(null, self.allClasses);
            }
            return self.allClasses;
        }
    };
    self.getAllProperties = function(source, callback) {
        if (!source) {
            source = self.currentSource;
        }

        if (!self.allProperties) {
            CommonBotFunctions.listSourceAllObjectProperties(source, null, false, function(err, result) {
                if (err) {
                    return callback(err.responseText);
                }
                self.allProperties = [];
                var uniqueIds = {};
                result.forEach(function(item) {
                    if (!uniqueIds[item.id]) {
                        uniqueIds[item.id] = 1;

                        item.label = item.label; //,.replace(/ /g, "_");
                        item.resourceType = "ObjectProperty";
                        self.allProperties.push(item);
                    }
                });
                common.array.sort(self.allProperties, "label");
                if (callback) {
                    return callback(null, self.allProperties);
                }
                return self.allProperties;
            });
        } else {
            if (callback) {
                return callback(null, self.allProperties);
            }
            return self.allProperties;
        }
    };
    self.hideLegendItems = function(hiddenNodes) {
        var legendNodes = Axiom_activeLegend.data.nodes.getIds();
        var newNodes = [];
        legendNodes.forEach(function(nodeId) {
            var hidden = !hiddenNodes || hiddenNodes.indexOf(nodeId) > -1;
            newNodes.push({ id: nodeId, hidden: hidden });
        });
        self.visjsGraph.data.nodes.update(newNodes);
    };

    /*
   if unique, filters exiting nodes in graph before showing list
   *
    */
    self.setSuggestionsSelect = function(items, unique, newOption, drawGraphFn) {
        if (unique) {
            var existingNodeIds = self.visjsGraph.data.nodes.getIds();
            var filteredItems = [];
            items.forEach(function(item) {
                if (existingNodeIds.indexOf(item.id) < 0) {
                    filteredItems.push(item);
                }
            });
        } else {
            filteredItems = items;
        }
        if (newOption) {
            filteredItems.splice(0, 0, newOption);
        }
        common.fillSelectOptions("axioms_legend_suggestionsSelect", filteredItems, false, "label", "id");
    };

    self.initResourcesMap = function(source, callback) {
        self.allResourcesMap = {};
        self.getAllClasses(source, function(err, result) {
            if (err) {
                return callback(err);
            }
            result.forEach(function(item) {
                self.allResourcesMap[item.id] = item;
            });
        });
        self.getAllProperties(source, function(err, result) {
            if (err) {
                return callback(err);
            }
            result.forEach(function(item) {
                self.allResourcesMap[item.id] = item;
            });
            if (callback) {
                return callback(err, result);
            }
        });
    };

    self.clearMappings = function() {
        self.visjsGraph.clearGraph();
        $("#" + self.graphDivId).html("");
        self.visjsGraph = null;

    };
    self.saveMappings = function() {
        $("#" + self.graphDivId).html("");
    };


    self.showCreateResourceBot = function (resourceType, filteredUris) {
        var botWorkFlow;
        if (resourceType == "Class") {
            botWorkFlow = CreateAxiomResource_bot.workflowNewClass;
            // Axiom_manager.allClasses=null;
        } else if (resourceType == "ObjectProperty") {
            botWorkFlow = CreateAxiomResource_bot.workflowNewObjectProperty;
            //  Axiom_manager.allProperties=null;
        } else {
            return alert("no valid resourceType");
        }
        return CreateAxiomResource_bot.start(botWorkFlow, { filteredUris: filteredUris }, function (err, result) {
            if (err) {
                return alert(err);
            }
            // update Axiom_manager
            if (resourceType == "Class") {
                self.allClasses.push(CreateAxiomResource_bot.params.newObject);
            } else if (resourceType == "ObjectProperty") {
                self.allProperties.push(CreateAxiomResource_bot.params.newObject);
            }
            self.allResourcesMap[CreateAxiomResource_bot.params.newObject.id] = CreateAxiomResource_bot.params.newObject;

            $("#axioms_legend_suggestionsSelect option").eq(0).before($("<option></option>").val(CreateAxiomResource_bot.params.newObject.id).text(CreateAxiomResource_bot.params.newObject.label));
            //   self.onLegendNodeClick({data:{id:"Class"}})
        });
    };








    return self;
})();

export default MappingModeler;
window.MappingModeler = MappingModeler;
