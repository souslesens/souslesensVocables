import Axiom_activeLegend from "../axioms/axiom_activeLegend.js";

import SourceSelectorWidget from "../../uiWidgets/sourceSelectorWidget.js";
import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import Axioms_graph from "../axioms/axioms_graph.js";
import Axioms_suggestions from "../axioms/axioms_suggestions.js";
import CommonBotFunctions from "../../bots/_commonBotFunctions.js";
import common from "../../shared/common.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import Clipboard from "../../shared/clipboard.js";

import SimpleListFilterWidget from "../../uiWidgets/simpleListFilterWidget.js";
import JstreeWidget from "../../uiWidgets/jstreeWidget.js";
import OntologyModels from "../../shared/ontologyModels.js";
import MappingsDetails from "./mappingsDetails.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import DataSourceManager from "./dataSourcesManager.js";
import UIcontroller from "./uiController.js";

var MappingModeler = (function () {
    var self = {};


    self.jstreeDivId = "mappingModeler_dataSourcesJstreeDiv";
    self.legendGraphDivId = "nodeInfosAxioms_activeLegendDiv";
    self.legendItemsArray = [
        //{ label: "Table", color: "#a8da83", shape: "ellipse" },
        {label: "Column", color: "#cb9801", shape: "ellipse", size: 14},
        {label: "RowIndex", color: "#cb9801", shape: "triangle"},
        {label: "VirtualColumn", color: "#cb9801", shape: "square"},
        {label: "URI", color: "#bc7dec", shape: "square"},

        {label: "Class", color: "#00afef", shape: "box"},

    ];
    self.propertyColor="#409304"

    self.onLoaded = function () {
        async.series(
            [
                function (callbackSeries) {
                    //reinitialize config (Change Source and reload after modification)
                    DataSourceManager.currentConfig = {};
                    DataSourceManager.rawConfig = {};
                    return callbackSeries();
                },
                function (callbackSeries) {
                    MappingModeler.currentSLSsource = MainController.currentSource;
                    UI.initMenuBar(function () {
                        self.loadSource(function () {
                            self.initResourcesMap(MappingModeler.currentSLSsource);
                            return callbackSeries();
                        });
                    });
                },

                function (callbackSeries) {
                    $("#graphDiv").load("./modules/tools/mappingModeler/html/mappingModeler_graphDiv.html", function (err) {
                        //$("#mainDialogDiv").dialog("open");
                        return callbackSeries();
                    });
                },
                //init visjsGraph
                function (callbackSeries) {
                    var visjsData = {nodes: [], edges: []};
                    MappingColumnsGraph.drawGraphCanvas(MappingColumnsGraph.graphDiv, visjsData, function () {
                        callbackSeries();
                    });
                },
                //load visjs mapping graph
                function (callbackSeries) {
                    MappingColumnsGraph.loadVisjsGraph(function (err) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        return callbackSeries();
                    });
                },
                function (callbackSeries) {
                    DataSourceManager.currentSlsvSource = MappingModeler.currentSLSsource;
                    DataSourceManager.getSlsvSourceConfig(MappingModeler.currentSLSsource, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }

                        return callbackSeries();
                    });
                },
                function (callbackSeries) {
                    $("#lateralPanelDiv").load("./modules/tools/mappingModeler/html/mappingModelerLeftPanel.html", function (err) {
                        $("#MappingModeler_leftTabs").tabs({
                            activate: function (event, ui) {
                                var tabId = $(ui.newPanel).attr("id")
                                UIcontroller.onActivateLeftPanelTab(tabId)
                                //  UIcontroller.activateRightPanel($(ui.newTab).text());
                            },
                        });
                        $($("#MappingModeler_leftTabs").children()[0]).css("border-radius", "0px");

                        /*
                        $($('#MappingModeler_leftTabs').children()[0]).find("*").removeAttr("class");
                        
                       
                        $($('#MappingModeler_leftTabs').children()[0]).find("li").addClass('lineage-tabDiv');
                        $($('#MappingModeler_leftTabs').children()[0]).find("a").css('text-decoration','none');*/
                        DataSourceManager.loaDataSourcesJstree(self.jstreeDivId, function (err) {
                            return callbackSeries();
                        });
                    });
                },
            ],
            function (err) {
                if (err) {
                    return err;
                }
            }
        );
    };

    self.loadSuggestionSelectJstree = function (objects, parentName) {
        if ($("#suggestionsSelectJstreeDiv").jstree()) {
            try {
                $("#suggestionsSelectJstreeDiv").jstree().empty();
            } catch {
            }
        }
        self.filterSuggestionList = null;

        var options = {
            openAll: true,

            contextMenu: function (node, x) {
                var items = {};
                if (self.currentResourceType == "Column") {
                    items.showSampleData = {
                        label: "showSampleData",
                        action: function (_e) {
                            MappingModeler.showSampleData();
                        },
                    };
                }
                return items;
            },
            selectTreeNodeFn: self.onSuggestionsSelect,
        };
        var jstreeData = [];

        var color = "#333"
        if (parentName == "Columns") {
            color ="#cb9801"
        } else if (parentName == "Classes") {
            color = "#00afef"
        } else if (parentName == "Properties") {
            color = self.propertyColor
        }
        jstreeData.push({
            id: parentName,
            parent: "#",// MappingModeler.currentTable,
            text: "<span style='font-weight:bold;font-size:large;color:"+color+"'>"+parentName+"</span>",
            data: {
                id: parentName,
                label: parentName,
            },
        });

        if (parentName == "Classes" || parentName == "Properties") {
            var uniqueSources = {};
            objects.forEach(function (item) {
                if (item.source) {
                    if (!uniqueSources[item.source]) {
                        uniqueSources[item.source] = 1;

                        jstreeData.push({
                            id: item.source,
                            parent: parentName,
                            text:  "<span style='font-size:larger;color:"+color+"'>"+item.source+"</span>",
                            data: {
                                id: item.source,
                                label: item.source,
                            },
                        });
                    }
                    jstreeData.push({
                        id: item.id,
                        parent: item.source,
                        text:  "<span  style='color:"+color+"'>"+item.label.split(":")[1]+"</span>",
                        data: {
                            id: item.id,
                            text: item.label.split(":")[1],
                            resourceType: item.resourceType,
                        },
                    });
                } else {
                    jstreeData.push({
                        id: item.id,
                        parent: parentName,
                        text:  "<span  style='color:"+color+"'>"+item.label+"</span>",
                        data: {
                            id: item.id,
                            text: item.label,
                        },
                    });
                }
            });
        } else {
            objects.forEach(function (item) {
                if (item != "" && item != "#") {
                    jstreeData.push({
                        id: item,
                        parent: parentName,
                        text:  "<span  style='color:"+color+"'>"+item+"</span>",
                        data: {
                            id: item,
                            label: item,
                        },
                    });
                }
            });
        }
        var sourceIndex = jstreeData.findIndex((obj) => obj.id == MappingModeler.currentSLSsource);
        if (sourceIndex > -1) {
            if (parentName == "Properties") {
                common.array.moveItem(jstreeData, sourceIndex, 5);
            } else {
                common.array.moveItem(jstreeData, sourceIndex, 2);
            }
        }

        JstreeWidget.loadJsTree("suggestionsSelectJstreeDiv", jstreeData, options, function () {





        });
    };

    self.initActiveLegend = function (divId) {
        var options = {
            onLegendNodeClick: self.onLegendNodeClick,
            showLegendGraphPopupMenu: self.showLegendGraphPopupMenu,
            // xOffset: 300,
            horizontal: true,
        };
        Axiom_activeLegend.isLegendActive = true;
        self.legendItems = {};
        self.legendItemsArray.forEach(function (item) {
            self.legendItems[item.label] = item;
        });

        Axiom_activeLegend.drawLegend("nodeInfosAxioms_activeLegendDiv", self.legendItemsArray, options, function () {
            $("#nodeInfosAxioms_activeLegendDiv").find("canvas").addClass("coloredContainerImportant");
        });
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

    self.onSuggestionsSelect = function (event, obj) {
        if(!DataSourceManager.currentConfig.  currentDataSource )
            return alert("Select a data source")
        var resourceUri = obj.node.id;
        var newResource = null;
        var id = common.getRandomHexaId(8);
        if (resourceUri == "createClass") {
            return self.showCreateResourceBot("Class", null);
        } else if (resourceUri == "createObjectProperty") {
            return self.showCreateResourceBot("ObjectProperty", null);
        } else if (resourceUri == "function") {
            return self.predicateFunctionShowDialog();
        } else if (self.currentResourceType == "Column") {
            // Verify that he not already exists
            var nodeInVisjsGraph = MappingColumnsGraph.visjsGraph.data.nodes.get().filter(function (node) {
                return node.data.dataTable == self.currentTable.name && resourceUri == node.label;
            });
            if (nodeInVisjsGraph.length > 0) {
                return alert("Column already exists in the graph");
            }

            newResource = {
                id: id,
                label: resourceUri,
                shape: self.legendItems[self.currentResourceType].shape,
                color: self.legendItems[self.currentResourceType].color,
                level: 0,
                data: {
                    id: resourceUri,
                    label: resourceUri,
                    type: self.currentResourceType,
                    dataTable: self.currentTable.name,
                    datasource: DataSourceManager.currentConfig.currentDataSource.id,
                },
            };
            MappingColumnsGraph.drawResource(newResource);
            setTimeout(function () {
                self.onLegendNodeClick({id: "Class"});
            }, 500);
        } else if (self.currentResourceType == "Class") {
            var resource = self.allResourcesMap[resourceUri];
            newResource = {
                id: resourceUri,
                label: resource.label,
                shape: self.legendItems[self.currentResourceType].shape,
                color: self.legendItems[self.currentResourceType].color,
                data: {
                    id: resourceUri,
                    label: resource.label,
                    type: "Class",
                    source: resource.source,
                },
            };

            MappingColumnsGraph.drawResource(newResource);
             MappingColumnsGraph.graphActions. showColumnDetails(newResource)
            setTimeout(function () {
                self.onLegendNodeClick({id: "Column"});
            }, 500);
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

                    type: self.currentResourceType,
                    dataTable: self.currentTable.name,
                    datasource: self.currentDataSource,
                },
            };
            MappingColumnsGraph.drawResource(newResource);
            setTimeout(function () {
                self.onLegendNodeClick({id: "Class"});
            }, 500);
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
                    type: self.currentResourceType,
                    dataTable: self.currentTable.name,
                    datasource: self.currentDataSource,
                },
            };
            MappingColumnsGraph.drawResource(newResource);
            setTimeout(function () {
                self.onLegendNodeClick({id: "Class"});
            }, 500);
        } else if (self.currentResourceType == "ObjectProperty") {
            var smooth = null;
            var property = self.allResourcesMap[resourceUri];
            if (self.currentRelation) {
                self.currentRelation.data = {type: "Objectproperty", propId: resourceUri};

                var color = self.propertyColor;
                var arrowType=null
                // ObjectProperty
                if (self.allResourcesMap[resourceUri]) {
                    self.currentRelation.label = self.allResourcesMap[resourceUri].label;
                    arrowType="diamond"
                } else {
                    //other
                    smooth = {type: "curvedCW"};
                    self.currentRelation.label = resourceUri;
                    color = "#333";
                }
                var edge = {
                    from: self.currentRelation.from.id,
                    to: self.currentRelation.to.id,
                    label: self.currentRelation.label,
                    arrows: {
                        to: {
                            enabled: true,
                            type: arrowType,
                        },
                    },
                    smooth: smooth,
                    data: {
                        id: resourceUri,
                        type: resourceUri,
                        source: property ? property.source : null,
                    },
                    color: color,
                };
                MappingColumnsGraph.addEdge([edge]);

                self.currentRelation = null;
                //$("#axioms_legend_suggestionsSelect").empty();
                JstreeWidget.empty("suggestionsSelectJstreeDiv");

            }
        }
    };


    self.onLegendNodeClick = function (node, event) {
        if (!node) {
            return;
        }

        self.currentResourceType = node.id;
        if (self.currentResourceType == "URI") {
            var params = {
                title: "Create SpecificURI",
            };

            MappingModeler_bot.start(MappingModeler_bot.workflowCreateSpecificResource, params, function (err, result) {
                var params = MappingModeler_bot.params;

                var graphUri = Config.sources[MappingModeler.currentSLSsource].graphUri;
                var uri = common.getURI(params.rdfsLabel, MappingModeler.currentSLSsource, params.uriType, null);
                if (params.rdfsLabel) {
                    var newResource = {
                        id: uri,
                        label: params.rdfsLabel,
                        shape: self.legendItems[self.currentResourceType].shape,
                        color: self.legendItems[self.currentResourceType].color,
                        level: 0,
                        data: {
                            id: uri,
                            label: params.rdfsLabel,
                            rdfsLabel: params.rdfsLabel,
                            type: "URI",
                            rdfType: params.rdfType,
                            uriType: "fromLabel",
                            dataTable: self.currentTable.name,
                            datasource: self.currentDataSource,
                        },
                    };

                    MappingColumnsGraph.drawResource(newResource);
                }
            });
        } else if (self.currentResourceType == "Column") {
            self.loadSuggestionSelectJstree(self.currentTable.columns, "Columns");
            //common.fillSelectOptions("axioms_legend_suggestionsSelect", self.currentTable.columns, false);
        } else if (self.currentResourceType == "Class") {
            //   self.hideLegendItems();
            var newObject = {id: "createClass", label: "_Create new Class_"};
            self.getAllClasses(MappingModeler.currentSLSsource, function (err, classes) {
                if (err) {
                    return alert(err);
                }

                var classesCopy = JSON.parse(JSON.stringify(classes));
                classesCopy.unshift(newObject);
                self.loadSuggestionSelectJstree(classesCopy, "Classes");
            });
        } else if (self.currentResourceType == "ObjectProperty") {
            //   self.hideLegendItems();
            var newObjects = [
                {id: "createObjectProperty", label: "_Create new ObjectProperty_"},
                {id: "function", label: "function"},
                {id: "rdfs:member", label: "_rdfs:member_"},
                {id: "rdfs:subClassOf", label: "_rdfs:subClassOf_"},
            ];
            var options = {includesnoConstraintsProperties: true};
            //Axioms_suggestions.getValidPropertiesForClasses(MappingModeler.currentSLSsource, self.currentRelation.from.classId, self.currentRelation.to.classId, options, function (err, properties) {

            OntologyModels.getAllowedPropertiesBetweenNodes(MappingModeler.currentSLSsource, self.currentRelation.from.classId, self.currentRelation.to.classId, {keepSuperClasses: true}, function (err, result) {
                if (err) {
                    return alert(err);
                }
                var properties = [];
                for (var group in result.constraints) {
                    for (var propId in result.constraints[group]) {
                        properties.push({
                            id: propId,
                            label: result.constraints[group][propId].label,
                            source: result.constraints[group][propId].source,
                            resourceType: "ObjectProperty",
                        });
                    }
                }
                properties = common.array.distinctValues(properties, "id");
                properties = common.array.sort(properties, "label");
                properties.forEach(function (item) {
                    if (!item.label) {
                        item.label = Sparql_common.getLabelFromURI(item.id);
                    }
                    item.label = item.source.substring(0, 3) + ":" + item.label;
                });
                properties = common.array.sort(properties, "label");
                //To add NewObjects only one time
                var propertiesCopy = JSON.parse(JSON.stringify(properties));
                propertiesCopy.unshift(...newObjects);
                self.loadSuggestionSelectJstree(propertiesCopy, "Properties");
                //self.setSuggestionsSelect(properties, false, newObjects);
            });
        } else if (self.currentResourceType == "RowIndex") {
            self.onSuggestionsSelect(null, {node: {id: "RowIndex"}});
        } else if (self.currentResourceType == "VirtualColumn") {
            var columnName = prompt("Virtual column name");
            if (columnName) {
                self.onSuggestionsSelect(null, {node: {id: columnName}});
            }
        }
    };

    self.showLegendGraphPopupMenu = function () {
    };


    self.getAllClasses = function (source, callback) {
        if (!source) {
            source = MappingModeler.currentSLSsource;
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
                self.allClasses.forEach(function (item) {
                    if (item.source) {
                        item.label = item.source.substring(0, 3) + ":" + item.label;
                    }
                });
                self.allClasses = common.array.sort(self.allClasses, "label");
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
            source = MappingModeler.currentSLSsource;
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
        self.updateNode(newNodes);
    };

    /*
       if unique, filters exiting nodes in graph before showing list
       *
        */
    self.setSuggestionsSelect = function (items, unique, newOptions, drawGraphFn) {
        if (unique) {
            var existingNodeIds = MappingColumnsGraph.visjsGraph.data.nodes.getIds();
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
                newOptions = [newOptions];
            }
            newOptions.forEach(function (newOption, index) {
                filteredItems.splice(index, 0, newOption);
            });
        }
        common.fillSelectOptions("axioms_legend_suggestionsSelect", filteredItems, false, "label", "id");
    };

    self.initResourcesMap = function (source, callback) {
        self.allResourcesMap = {};
        self.allClasses = null;
        self.allProperties = null;

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

        $("#" + MappingColumnsGraph.graphDivId).html("");
        MappingColumnsGraph.clearGraph();
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
        var params = {source: MappingModeler.currentSLSsource, filteredUris: filteredUris};
        return CreateAxiomResource_bot.start(botWorkFlow, params, function (err, result) {
            if (err) {
                return alert(err);
            }
            var previousLabel = CreateAxiomResource_bot.params.newObject.label;
            CreateAxiomResource_bot.params.newObject.label = MappingModeler.currentSLSsource.substring(0, 3) + ":" + CreateAxiomResource_bot.params.newObject.label;
            // update Axiom_manager
            CreateAxiomResource_bot.params.newObject.source = MappingModeler.currentSLSsource;
            if (resourceType == "Class") {
                self.allClasses.push(CreateAxiomResource_bot.params.newObject);
            } else if (resourceType == "ObjectProperty") {
                self.allProperties.push(CreateAxiomResource_bot.params.newObject);
            }
            self.allResourcesMap[CreateAxiomResource_bot.params.newObject.id] = CreateAxiomResource_bot.params.newObject;
            // update suggestion select jsTree
            var jstreeData = Object.values($("#suggestionsSelectJstreeDiv").jstree()._model.data);
            jstreeData.push({
                id: CreateAxiomResource_bot.params.newObject.id,
                text: previousLabel,
                parent: MappingModeler.currentSLSsource,
                data: {
                    id: CreateAxiomResource_bot.params.newObject.id,
                    text: CreateAxiomResource_bot.params.newObject.label,
                    resourceType: "Class",
                },
            });
            if (!$("#suggestionsSelectJstreeDiv").jstree().get_node(MappingModeler.currentSLSsource)) {
                jstreeData.push({
                    id: MappingModeler.currentSLSsource,
                    text: MappingModeler.currentSLSsource,
                    parent: resourceType == "Class" ? "Classes" : "Properties",
                    data: {
                        id: MappingModeler.currentSLSsource,
                        text: MappingModeler.currentSLSsource,
                    },
                });
            }
            JstreeWidget.updateJstree("suggestionsSelectJstreeDiv", jstreeData, {openAll: true});
        });
    };


    self.viewSampleTriples = function (mappings) {
        var options = {};
        if (Config.clientSocketId) {
            options.clientSocketId = Config.clientSocketId;
        }
        options.deleteOldGraph = false;
        options.sampleSize = 500;
        options.mappingsFilter = mappings;
        UI.message("creating triples...");
        var payload = {
            source: MappingModeler.currentSLSsource,
            datasource: MappingModeler.currentDataSource,
            table: MappingModeler.currentTable.name,
            options: JSON.stringify(options),
        };
        $.ajax({
            type: "POST",
            url: `${Config.apiUrl}/kg/triples`,
            data: payload,
            dataType: "json",
            success: function (result, _textStatus, _jqXHR) {
                TripleFactory.showTriplesInDataTable(result);
                $("#mainDialogDiv").parent().css("z-index", 1);
                $("#mainDialogDiv").dialog({
                    close: function (event, ui) {
                        $("#mainDialogDiv").parent().css("z-index", "unset");
                    },
                });
                UI.message("", true);
            },
            error(err) {
                if (callback) {
                    return callback(err.responseText);
                }
                return alert(err.responseText);
            },
        });
    };

    self.filterSuggestionTree = function () {
        var keyword = $("#mappingModeler_suggestionsnput").val();
        var data = $("#suggestionsSelectJstreeDiv").jstree()._model.data;
        /*if(!keyword){
            return;
        }*/
        if (!data) {
            return;
        }
        if (!self.filterSuggestionList) {
            self.filterSuggestionList = JSON.parse(JSON.stringify(data));
        }
        keyword = keyword.toLowerCase();

        var newData = [];
        Object.keys(self.filterSuggestionList).forEach(function (nodeId) {
            var node = self.filterSuggestionList[nodeId];
            // We filter only last leafs of jstree
            if (node.children.length == 0) {
                var node_text = node.text.toLowerCase();
                if (node_text.includes(keyword)) {
                    newData.push(node);
                }
            } else {
                newData.push(node);
            }
        });

        JstreeWidget.updateJstree("suggestionsSelectJstreeDiv", newData);
    };

    self.predicateFunctionShowDialog = function () {
        $("#smallDialogDiv").load("./modules/tools/mappingModeler/html/functionDialog.html", function () {
            $("#smallDialogDiv").dialog("open");
        });
    };
    self.addPredicateFunction = function () {
        var edge = {
            from: self.currentRelation.from.id,
            to: self.currentRelation.to.id,
            label: "_function_",
            arrows: {
                to: {
                    enabled: true,
                    type: "diamond",
                },
            },
            smooth: {type: "curvedCW"},
            data: {
                id: "function{" + $("#MappingModeler_fnBody").val() + "}",
                type: "function",
                source: "function",
            },
            color: "#375521",
        };
        self.addEdge([edge]);
        $("#smallDialogDiv").dialog("close");
    };
    self.loadSource = function (callback) {
        Lineage_sources.loadSources(MainController.currentSource, function (err) {
            if (err) {
                return alert(err.responseText);
            }
            $("#Lineage_graphEditionButtons").hide();
            return callback();
        });
    };
    self.showSampleData = function (node, columns, callback) {
        // alert("coming soon");
        if (!columns) {
            var hasColumn = false;
        } else {
            if (Array.isArray(columns) && columns.length > 0) {
                var hasColumn = true;
            } else {
                if (columns != "") {
                    var hasColumn = true;
                    columns = [columns];
                }
            }
        }

        function showTable(data) {
            var headers = [];
            var tableCols = [];
            data.forEach(function (item) {
                for (var key in item)
                    if (headers.indexOf(key) < 0) {
                        headers.push(key);
                        tableCols.push({title: key, defaultContent: "", width: "15%"});
                    }
            });
            if (hasColumn) {
                tableCols = tableCols.filter(function (col) {
                    return columns.includes(col.title);
                });
            }

            var lines = [];
            data.forEach(function (item) {
                var line = [];
                headers.forEach(function (column) {
                    if (!hasColumn) {
                        line.push(item[column] || "");
                    } else {
                        if (columns.includes(column)) {
                            line.push(item[column] || "");
                        }
                    }
                });
                lines.push(line);
            });

            Export.showDataTable("smallDialogDiv", tableCols, lines);
            return;
        }

        if (DataSourceManager.currentConfig.currentDataSource.sampleData) {
            showTable(DataSourceManager.currentConfig.currentDataSource.sampleData);
        } else if (DataSourceManager.currentConfig.currentDataSource.type == "databaseSource") {
            if (!node || !node.data) {
                node = MappingModeler.currentTreeNode;
                if (!node.data) {
                    return alert("no Table  selected");
                }
            }
            var size = 200;
            var sqlQuery = "select top  " + size + "* from " + node.data.id;
            if (DataSourceManager.currentConfig.currentDataSource.sqlType == "postgres") {
                sqlQuery = "select   " + "* from public." + node.data.id + " LIMIT " + size;
            }
            const params = new URLSearchParams({
                type: DataSourceManager.currentConfig.currentDataSource.sqlType,
                dbName: DataSourceManager.currentConfig.currentDataSource.id,
                sqlQuery: sqlQuery,
            });

            $.ajax({
                type: "GET",
                url: Config.apiUrl + "/kg/data?" + params.toString(),
                dataType: "json",

                success: function (data, _textStatus, _jqXHR) {
                    showTable(data.rows);
                },
                error(err) {
                    return alert(err.responseText);
                },
            });
        } else if (DataSourceManager.currentConfig.currentDataSource.type == "csvSource") {
            alert("Comming Soon...");
        }
    };


    return self;
})();

export default MappingModeler;
window.MappingModeler = MappingModeler;
