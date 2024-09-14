import Axiom_activeLegend from "../axioms/axiom_activeLegend.js";
import KGcreator from "./KGcreator.js";
import SourceSelectorWidget from "../../uiWidgets/sourceSelectorWidget.js";
import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import Axioms_graph from "../axioms/axioms_graph.js";
import Axioms_suggestions from "../axioms/axioms_suggestions.js";
import CommonBotFunctions from "../../bots/_commonBotFunctions.js";
import common from "../../shared/common.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";

var MappingModeler = (function () {
    var self = {};
    self.currentSource = null;
    self.currentDataSource = null;
    self.graphDiv = "mappingModeler_graphDiv";
    self.legendItemsArray = [
        {label: "Column", color: "#cb9801", shape: "ellipse",},
        {label: "RowIndex", color: "#cb9801", shape: "triangle"},
        {label: "VirtualColumn", color: "#cb9801", shape: "square"},

        {label: "Class", color: "#00afef", shape: "box"},

    ];


    self.init = function (source, resource, divId) {
        async.series([
            //init source
            function (callbackSeries) {
                SourceSelectorWidget.initWidget(["OWL"], "mainDialogDiv", true, function (source) {
                    var source = SourceSelectorWidget.getSelectedSource()[0];
                    $("#mainDialogDiv").dialog("close");

                    self.currentSource = source;

                    return callbackSeries();
                });
            },
            function (callbackSeries) {
                self.initResourcesMap(self.currentSource);
                return callbackSeries();
            },


            function (callbackSeries) {

                KGcreator.currentSlsvSource = self.currentSource;
                KGcreator.getSlsvSourceConfig(self.currentSource, function (err, result) {
                    if (err) {
                        return callbackSeries(err);
                    }

                    KGcreator.currentConfig = result;
                    return callbackSeries();
                });
            },

            function (callbackSeries) {
                $("#mainDialogDiv").load("./modules/tools/KGcreator/html/mappingModeler.html", function (err) {
                    $("#mainDialogDiv").dialog("open");
                    return callbackSeries();
                });
            },

            function (callbackSeries) {
                if (!divId) {
                    divId = "nodeInfosAxioms_activeLegendDiv";
                }

                return callbackSeries();
            },

            // load jstree
            function (callbackSeries) {
                var options = {
                    openAll: true,
                    selectTreeNodeFn: self.onDataSourcesJstreeSelect
                };
                KGcreator.loadDataSourcesJstree("mappingModeler_jstreeDiv", options, function (err, result) {
                    return callbackSeries(err);
                });
            },
            //initDataSource
            function (callbackSeries) {
                return callbackSeries();
            },

            //init visjsGraph
            function (callbackSeries) {
                var visjsData = {nodes: [], edges: []}
                self.drawGraphCanvas(self.graphDiv, visjsData, function () {
                    callbackSeries()
                });
            }
        ]);
    };

    self.onDataSourcesJstreeSelect = function (event, obj) {
        self.currentTreeNode = obj.node;

        //  KGcreator_run.getTableAndShowMappings();

        if (obj.node.data.type == "databaseSource") {
            KGcreator.initDataSource(obj.node.id, "databaseSource", obj.node.data.sqlType, obj.node.data.table);

            KGcreator.loadDataBaseSource(KGcreator.currentSlsvSource, obj.node.id, obj.node.data.sqlType);
        } else if (obj.node.data.type == "csvSource") {
            KGcreator.initDataSource(obj.node.id, "csvSource", obj.node.data.sqlType, obj.node.id);
            KGcreator.loadCsvSource(KGcreator.currentSlsvSource, obj.node.id, false, function (err, jstreeData) {
                if (err) {
                    return alert("file not found");
                }
                var columns = [];
                jstreeData.forEach(function (item) {
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
        self.currentDataSource = KGcreator.currentConfig.currentDataSource.name
        MappingModeler.switchDataSourcePanel("hide");
        var divId = "nodeInfosAxioms_activeLegendDiv";
        self.initActiveLegend(divId);

    };

    self.initActiveLegend = function (divId) {

        var options = {
            onLegendNodeClick: self.onLegendNodeClick,
            showLegendGraphPopupMenu: self.showLegendGraphPopupMenu,
            xOffset: 300
        };
        Axiom_activeLegend.isLegendActive = true;
        self.legendItems = {}
        self.legendItemsArray.forEach(function (item) {
            self.legendItems[item.label] = item
        })

        Axiom_activeLegend.drawLegend("nodeInfosAxioms_activeLegendDiv", self.legendItemsArray, options);

    };

    self.hideForbiddenResources = function (resourceType) {
        var hiddenNodes = [];
        if (resourceType == "Table") {
            hiddenNodes.push("ObjectProperty");
            hiddenNodes.push("Class");
            hiddenNodes.push("Connective");
        }
        Axiom_activeLegend.hideLegendItems(hiddenNodes);
    };


    self.onSuggestionsSelect = function (resourceUri) {
        var newResource = null;
        var id = common.getRandomHexaId(8)
        if (resourceUri == "createClass") {
            return self.showCreateResourceBot("Class", null);
        } else if (resourceUri == "createObjectProperty") {
            return self.showCreateResourceBot("ObjectProperty", null);
        } else if (self.currentResourceType == "Column") {

            newResource = {
                id: id,
                label: resourceUri,
                shape: self.legendItems[self.currentResourceType].shape,
                color: self.legendItems[self.currentResourceType].color,
                level: 0,
                data: {
                    id: resourceUri,
                    label: resourceUri,
                    type: self.currentResourceType
                },

            };
            self.drawResource(newResource);
            setTimeout(function () {
                self.onLegendNodeClick({id: "Class"});
            }, 500)

        } else if (self.currentResourceType == "Class") {
            var resource = self.allResourcesMap[resourceUri];
            newResource = {
                id: id,
                label: resource.label,
                shape: self.legendItems[self.currentResourceType].shape,
                color: self.legendItems[self.currentResourceType].color,
                data: {
                    id: resourceUri,
                    label: resource.label,
                    type: "Class"
                },

            };

            self.drawResource(newResource);
        } else if (self.currentResourceType == "RowIndex") {

            newResource = {
                id: id,
                label: "#",
                shape: self.legendItems[self.currentResourceType].shape,
                color: self.legendItems[self.currentResourceType].color,
                size: 12,
                data: {
                    id: id,
                    label: "#",

                    type: self.currentResourceType
                },

            };
            self.drawResource(newResource);
            setTimeout(function () {
                self.onLegendNodeClick({id: "Class"});
            }, 500)
        } else if (self.currentResourceType == "VirtualColumn") {

            newResource = {
                id: id,
                label: resourceUri,
                shape: self.legendItems[self.currentResourceType].shape,
                color: self.legendItems[self.currentResourceType].color,
                size: 12,

                data: {
                    id: resourceUri,
                    label: resourceUri,
                    type: self.currentResourceType
                },

            };
            self.drawResource(newResource);
            setTimeout(function () {
                self.onLegendNodeClick({id: "Class"});
            }, 500)
        } else if (self.currentResourceType == "ObjectProperty") {

            if (self.currentRelation) {
                self.currentRelation.data = {type: "Objectproperty", propId: resourceUri};
                if (self.allResourcesMap[resourceUri]) {
                    self.currentRelation.label = self.allResourcesMap[resourceUri].label
                } else {
                    self.currentRelation.label = resourceUri
                }
                var edge = self.currentRelation;
                edge.arrows = {
                    to: {
                        enabled: true,
                        type: "diamond"
                    }
                };
                edge.data = {
                    type: resourceUri
                }
                edge.color = "#1244e8"
                self.visjsGraph.data.edges.add([edge]);
                self.currentRelation = null;
                $("#axioms_legend_suggestionsSelect").empty();
            }

        }
    };


    self.drawResource = function (newResource) {
        var arrows = {
            to: {
                enabled: true,
                type: "arrow"
            }
        };
        var edgeColor = "#ccc"
        if (!self.currentOffest) {
            self.currentOffest = {x: 0, y: 0};
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
        newResource.fixed = {x: true, y: true};


        var visjsData = {nodes: [], edges: []};
        var visjsNode = newResource;//self.getVisjsNode(newResource, level);
        visjsData.nodes.push(visjsNode);

        if (self.visjsGraph) {
            self.visjsGraph.data.nodes.add(visjsData.nodes);

            if (newResource.data.type == "Class" && self.currentGraphNode) {

                var label, type;
                if (self.currentGraphNode.data.type == "Class") {
                    label = "";
                    type = "rdfs:subClassOf"
                } else {
                    label = "a";
                    type = "rdf:type"
                }

                var edgeId = common.getRandomHexaId(5);
                visjsData.edges.push({
                    id: edgeId,
                    from: self.currentGraphNode.id,
                    label: label,
                    to: newResource.id,
                    data: {type: type},
                    arrows: arrows,
                    color: edgeColor
                });

                //  self.updateCurrentGraphNode(visjsNode);
                self.visjsGraph.data.edges.add(visjsData.edges);
            }

            //
        } else {

            self.drawGraphCanvas(self.graphDiv, visjsData);
        }

        self.hideForbiddenResources(newResource.data.type);
        $("#axioms_legend_suggestionsSelect").empty();

        self.currentGraphNode = newResource;

    };


    self.drawGraphCanvas = function (graphDiv, visjsData, callback) {
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


            onclickFn: MappingModeler.onVisjsGraphClick,
            onRightClickFn: MappingModeler.showGraphPopupMenu
        };


        self.visjsGraph = new VisjsGraphClass(graphDiv, visjsData, self.graphOptions);
        self.visjsGraph.draw(function () {
            if (callback) {
                return callback();
            }
        });
    };

    self.onVisjsGraphClick = function (node, event, options) {
        self.currentGraphNode = node;
        if (options.ctrlKey) {
            if (!self.currentRelation) {
                self.currentRelation = {from: node.id, to: null};
            } else {
                self.currentRelation.to = node.id;
                self.onLegendNodeClick({id: "ObjectProperty"});
            }
        } else if (options.shiftKey) {
            var choices = ["IRIType",
                "rdfs:label", "owl:DatatypeProperty", "owl:AnnotationProperty"];
            common.fillSelectOptions("axioms_legend_suggestionsSelect", choices, false);
            self.currentResourceType = null;

        }
    };

    self.showGraphPopupMenu = function (node, point, event) {
        if (!node) {
            return;
        }

        self.currentGraphNode = node;
        self.graphActions.outlineNode(node.id);

        if (!node || !node.data) {
            return;
        }
        var html = "";
        html = '    <span class="popupMenuItem" onclick="MappingModeler.graphActions.removeNodeFromGraph();"> Remove Node</span>';
        html += '    <span class="popupMenuItem" onclick="MappingModeler.graphActions.showNodeInfos()">Node Infos</span>';
        if (node.data.type == "Class") {
            html += '    <span class="popupMenuItem" onclick="MappingModeler.graphActions.addSuperClassToGraph()">draw superClass</span>';
        }

        $("#popupMenuWidgetDiv").html(html);
        point.x = event.x;
        point.y = event.y;
        PopupMenuWidget.showPopup(point, "popupMenuWidgetDiv");
    };

    self.graphActions = {
        outlineNode: function (nodeId) {
            self.visjsGraph.decorateNodes(null, {borderWidth: 1});
            self.visjsGraph.decorateNodes(nodeId, {borderWidth: 5});
        },
        removeNodeFromGraph: function () {
            if (confirm("delete node")) {
                var edges = self.visjsGraph.network.getConnectedEdges(self.currentGraphNode.id)
                self.visjsGraph.data.edges.remove(edges)
                self.visjsGraph.data.nodes.remove(self.currentGraphNode.id)
            }


        },
        addSuperClassToGraph: function () {
            var options={
                filter:" ?object rdf:type owl:Class",
                withImports:true}
            Sparql_OWL.getFilteredTriples(self.currentSource, self.currentGraphNode.data.id, "http://www.w3.org/2000/01/rdf-schema#subClassOf", null, options, function (err, result) {
               if(err)
                   return alert(err)
                if(result.length==0)
                    return alert( "no superClass")
             var item=result[0]


                var newResource = {
                    id: item.object.value,
                    label: item.objectLabel.value,
                    shape: self.legendItems[self.currentResourceType].shape,
                    color: self.legendItems[self.currentResourceType].color,
                    data: {
                        id: item.object.value,
                        label: item.objectLabel.value,
                        type: "Class"
                    },

                }

                self.drawResource(newResource)
            })
        },


       showNodeInfos : function () {
            NodeInfosWidget.showNodeInfos(self.currentGraphNode, self.currentGraphNode, "smallDialogDiv",);
        }
    };


    self.onLegendNodeClick = function (node, event) {
        if (!node) {
            return;
        }
        self.currentResourceType = node.id;


        if (self.currentResourceType == "Column") {
            common.fillSelectOptions("axioms_legend_suggestionsSelect", self.currentTable.columns, false);

        } else if (self.currentResourceType == "Class") {

            //   self.hideLegendItems();
            var newObject = {id: "createClass", label: "_Create new Class_"};
            self.getAllClasses(self.currentSource, function (err, classes) {
                if (err) {
                    return alert(err);
                }

                self.setSuggestionsSelect(classes, true, newObject);
            });

        } else if (self.currentResourceType == "ObjectProperty") {

            //   self.hideLegendItems();
            var newObjects =
                [{id: "createObjectProperty", label: "_Create new ObjectProperty_"},
                    {id: "rdfs:member", label: "_rdfs:member_"}];
            Axioms_suggestions.getValidPropertiesForClasses(self.currentSource, self.currentRelation.from, self.currentRelation.to, function (err, properties) {

                self.setSuggestionsSelect(properties, true, newObjects);
            });
            /*  self.getAllProperties(self.currentSource, function(err, objectProperties) {
                  if (err) {
                      return alert(err);
                  }

                  self.setSuggestionsSelect(objectProperties, true, newObject);
              });*/

        } else if (self.currentResourceType == "RowIndex") {
            self.onSuggestionsSelect({id: "RowIndex"})
        } else if (self.currentResourceType == "VirtualColumn") {
            var columnName = prompt("Virtual column name")
            if (columnName) {
                self.onSuggestionsSelect(columnName)
            }

        }

    };

    self.showLegendGraphPopupMenu = function () {
    };


    self.switchDataSourcePanel = function (target) {

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
    self.getAllClasses = function (source, callback) {
        if (!source) {
            source = self.currentSource;
        }
        if (!self.allClasses) {
            CommonBotFunctions.listSourceAllClasses(source, null, false, [], function (err, result) {
                if (err) {
                    return callback(err.responseText);
                }
                self.allClasses = [];
                var uniqueIds = {};
                result.forEach(function (item) {
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
    self.getAllProperties = function (source, callback) {
        if (!source) {
            source = self.currentSource;
        }

        if (!self.allProperties) {
            CommonBotFunctions.listSourceAllObjectProperties(source, null, false, function (err, result) {
                if (err) {
                    return callback(err.responseText);
                }
                self.allProperties = [];
                var uniqueIds = {};
                result.forEach(function (item) {
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
    self.hideLegendItems = function (hiddenNodes) {
        var legendNodes = Axiom_activeLegend.data.nodes.getIds();
        var newNodes = [];
        legendNodes.forEach(function (nodeId) {
            var hidden = !hiddenNodes || hiddenNodes.indexOf(nodeId) > -1;
            newNodes.push({id: nodeId, hidden: hidden});
        });
        self.visjsGraph.data.nodes.update(newNodes);
    };

    /*
   if unique, filters exiting nodes in graph before showing list
   *
    */
    self.setSuggestionsSelect = function (items, unique, newOptions, drawGraphFn) {
        if (unique) {
            var existingNodeIds = self.visjsGraph.data.nodes.getIds();
            var filteredItems = [];
            items.forEach(function (item) {
                if (existingNodeIds.indexOf(item.id) < 0) {
                    filteredItems.push(item);
                }
            });
        } else {
            filteredItems = items;
        }
        if (newOptions) {
            if (!Array.isArray(newOptions)) {
                newOptions = [newOptions]
            }
            newOptions.forEach(function (newOption, index) {
                filteredItems.splice(index, 0, newOption);
            })
        }
        common.fillSelectOptions("axioms_legend_suggestionsSelect", filteredItems, false, "label", "id");
    };

    self.initResourcesMap = function (source, callback) {
        self.allResourcesMap = {};
        self.allClasses = null;
        self.allProperties = null

        self.getAllClasses(source, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.forEach(function (item) {
                self.allResourcesMap[item.id] = item;
            });
        });
        self.getAllProperties(source, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.forEach(function (item) {
                self.allResourcesMap[item.id] = item;
            });
            if (callback) {
                return callback(err, result);
            }
        });
    };

    self.clearMappings = function () {
        self.visjsGraph.clearGraph();
        $("#" + self.graphDivId).html("");
        self.visjsGraph = null;

    };
    self.saveMappings = function () {
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
        return CreateAxiomResource_bot.start(botWorkFlow, {filteredUris: filteredUris}, function (err, result) {
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


    self.generateBasicMappings = function () {

        var edges = self.visjsGraph.data.edges.get();
        var edgesFromMap = {};
        edges.forEach(function (edge) {
            if (!edgesFromMap[edge.from]) {
                edgesFromMap[edge.from] = []
            }
            edgesFromMap[edge.from].push(edge);
        });
        var nodesMap = {};
        var nodes = self.visjsGraph.data.nodes.get();

        nodes.forEach(function (node) {
            nodesMap[node.id] = node
        })

        var columnsMap = {};
        async.eachSeries(nodes, function (node, callbackEach) {
            if (node.data.type == "Class") {
                return callbackEach()
            }
            node.data.predicates = []
            if (edgesFromMap[node.id]) {
                edgesFromMap[node.id].forEach(function (edge) {
                    var predicate = edge.data.type;
                    var object = nodesMap[edge.to].data.id
                    node.data.predicates.push({[predicate]: object})
                })
            }

            var params = {columns: self.currentTable.columns}
            if (node.data.uriType) {
                columnsMap[node.id] = node
                return callbackEach()
            }
            MappingModeler_bot.start(MappingModeler_bot.workflowMappingDetail, params, function (err, result) {
                var params = MappingModeler_bot.params
                node.data.uriType = params.URItype;
                node.data.rdfType = params.rdfType;
                node.data.rdfsLabel = params.rdfsLabel
                columnsMap[node.id] = node
                self.visjsGraph.data.nodes.update({id: node.id, data: node.data})
                return callbackEach()
            })


        }, function (err) {

            var x = columnsMap
            var json = self.mappingsToKGcreatorJson(columnsMap)
            $("#mappingModeler_infosTA").val(JSON.stringify(json, null, 2))
        })

    }
    self.mappingsToKGcreatorJson = function (columnsMap) {


        var tripleModels = []
        for (var key in columnsMap) {
            var data = columnsMap[key].data;
            var subject
            if (data.uriType == "blankNode" || !data.rdfsLabel) {
                subject = data.rdfsLabel + "_$"
            } else if (data.uriType == "randomIdentifier") {
                subject = data.rdfsLabel + "_£"
            } else if (data.uriType == "fromLabel") {
                subject = data.rdfsLabel
            }

            if (data.rdfType) {
                tripleModels.push({
                    s: subject,
                    p: "rdf:type",
                    o: data.rdfType
                })
            }

            if (data.rdfsLabel) {
                tripleModels.push({
                    s: subject,
                    p: "rdfs:label",
                    o: data.rdfsLabel,
                    "isString": true

                })
            }

            data.predicates.forEach(function (predicate) {
                var property = Object.keys(predicate)[0]
                tripleModels.push({
                    s: subject,
                    p: property,
                    o: predicate[property]
                })
            })


        }


        var json = {
            [self.currentTable.name]: {
                tripleModels: tripleModels,
            },
            transform: {}
        }

        return json;
    }


    self.saveVisjsGraph = function () {
        self.visjsGraph.saveGraph("mappings_" + self.currentSource + "_" + self.currentDataSource + "_" + self.currentTable.name, true)
    }

    self.loadVisjsGraph = function () {
        self.visjsGraph.loadGraph("mappings_" + self.currentSource + "_" + self.currentDataSource + "_" + self.currentTable.name + ".json",)
    }
    return self;
})();

export default MappingModeler;
window.MappingModeler = MappingModeler;
