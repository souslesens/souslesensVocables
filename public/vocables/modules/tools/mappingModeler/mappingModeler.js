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
import PlantUmlTransformer from "../../graph/plantUmlTransformer.js";
import mappingModeler from "./mappingModeler.js";
import mappingColumnsGraph from "./mappingColumnsGraph.js";
import Lineage_sources from "../lineage/lineage_sources.js";
import MainController from "../../shared/mainController.js";
import dataSourcesManager from "./dataSourcesManager.js";

/**
 * MappingModeler module.
 * The MappingModeler tool helps creating new mappings from sources, and visualising and editing these mappings.
 * @module MappingModeler
 * @see [Tutorial: Overview]{@tutorial overview}
 */
var MappingModeler = (function () {
    var self = {};
    self.maxItemsInJstreePerSource = 250; // Maximum number of items to display in the jstree per source
    // self.maxItemsInJstree =400;
    /**
     * ID of the tree container.
     * @type {string}
     * @memberof module:MappingModeler
     */
    self.jstreeDivId = "mappingModeler_dataSourcesJstreeDiv";
    /**
     * ID of the legend container.
     * @type {string}
     * @memberof module:MappingModeler
     */
    self.legendGraphDivId = "nodeInfosAxioms_activeLegendDiv";

    /**
     * Array defining the legend items for the graph.
     * Each item includes label, color, shape, and size properties.
     * @type {Array<{label: string, color: string, shape: string, size: number}>}
     * @memberof module:MappingModeler
     */
    self.legendItemsArray = [
        //{ label: "Table", color: "#a8da83", shape: "ellipse" },
        { label: "Column", color: "#cb9801", shape: "box", size: 14 },
        { label: "RowIndex", color: "#cb9801", shape: "triangle" },
        { label: "VirtualColumn", color: "#cb9801", shape: "square" },
        { label: "URI", color: "#bc7dec", shape: "square" },

        { label: "Class", color: "#00afef", shape: "box" },
    ];

    self.propertyColor = "#409304";

    /**
     * Initializes the MappingModeler module.
     *
     * This method performs the following steps in sequence:
     * 1. Sets up the current source and initializes the UI menu bar.
     * 2. Loads the source configuration using `DataSourceManager`.
     * 3. Loads the HTML structure for the graph container.
     * 4. Initializes an empty VisJS graph canvas.
     * 5. Loads the VisJS mapping graph with data.
     * 6. Loads and sets up the lateral panel with tabs and the data source tree.
     *
     * @function onLoaded
     * @memberof module:MappingModeler
     * @returns {void}
     * @throws {Error} If any step in the initialization sequence fails.
     */
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
                    Lineage_sources.loadedSources = {};
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
                    var visjsData = { nodes: [], edges: [] };
                    MappingColumnsGraph.drawGraphCanvas(MappingColumnsGraph.graphDiv, visjsData, function () {
                        callbackSeries();
                    });
                },
                //load visjs mapping graph
                function (callbackSeries) {
                    MappingColumnsGraph.loadVisjsGraph(function (err) {
                        if (err) {
                            return callbackSeries();
                        }
                        return callbackSeries();
                    });
                },
                //load visjs mapping graph
                function (callbackSeries) {
                    $("#rightControlPanelDiv").load("./modules/tools/mappingModeler/html/mappingsGraphButtons.html", function (err) {
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
                                var tabId = $(ui.newPanel).attr("id");
                                UIcontroller.onActivateLeftPanelTab(tabId);
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
                        /*  $('#rightControlPanelDiv').load("./modules/tools/lineage/html/whiteBoardButtons.html", function () {
                            UI.resetWindowSize();
                        });*/
                    });
                },
            ],
            function (err) {
                if (err) {
                    return err;
                }
            },
        );
    };
    self.activateRightPanel = function (PanelLabel) {
        $(".mappingModeler_rightPanel").css("display", "none");

        if (PanelLabel == "Data Sources") {
            $("#mappingModeler_structuralPanel").css("display", "block");
        } else if (PanelLabel == "Mappings") {
            // $("#mappingModeler_mappingsPanel").css("display","block")
            $("#mappingModeler_structuralPanel").css("display", "block");
        } else if (PanelLabel == "Triples") {
            $("#mappingModeler_genericPanel").css("display", "block");
        } else {
            $("#mappingModeler_genericPanel").css("display", "block");
        }
    };

    /**
     *
     *  //manages number of items that can be shown in the tree or need a filter before added
     * @param resources
     * @return map[countItems,mappingClasses]
     */
    self.initSourcesMap = function (resources) {
        {
            const sourcesMap = {};
            resources.forEach(function (item) {
                if (!sourcesMap[item.source]) {
                    sourcesMap[item.source] = {
                        countItems: 0,
                        mappingClasses: {},
                    };
                }
                sourcesMap[item.source].countItems += 1;
            });

            var graphNodes = MappingColumnsGraph.visjsGraph.data.nodes.get();
            graphNodes.forEach(function (node) {
                if (node.data && node.data.type == "Class" && sourcesMap[node.data.source]) {
                    sourcesMap[node.data.source].mappingClasses[node.data.id] = 1;
                }
            });

            self.sourcesMap = sourcesMap;
        }
    };

    /**
     * Loads and initializes a suggestion tree in the specified container.
     * @function
     * @name loadSuggestionSelectJstree
     * @memberof module:MappingModeler
     * @param {Array<Object>} objects - The objects to populate the tree with.
     * @param {string} parentName - The name of the parent node.
     */
    self.loadSuggestionSelectJstree = function (objects, parentName) {
        if ($("#suggestionsSelectJstreeDiv").jstree()) {
            try {
                $("#suggestionsSelectJstreeDiv").jstree().empty();
            } catch {}
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

                if (self.currentResourceType == "Class") {
                    if (node.data && node.data.resourceType != "searchClass") {
                        items.showSampleData = {
                            label: "deleteClass",
                            action: function (_e) {
                                NodeInfosWidget.currentNode = node;
                                NodeInfosWidget.currentNodeId = node.id;
                                NodeInfosWidget.currentNode.data.source = MainController.currentSource;
                                NodeInfosWidget.currentSource = MainController.currentSource;
                                NodeInfosWidget.deleteNode(function () {
                                    NodeInfosWidget.currentNode = null;
                                    NodeInfosWidget.currentNodeId = null;
                                    NodeInfosWidget.currentSource = null;
                                    $("#suggestionsSelectJstreeDiv").jstree("delete_node", node.id);
                                    if (self.allClasses[node.id]) {
                                        delete self.allClasses[node.id];
                                    }
                                });
                            },
                        };
                    }
                }
                return items;
            },
            selectTreeNodeFn: self.onSuggestionsSelect,
        };
        var jstreeData = [];

        self.sourcesMap = {};
        var color = "#333";
        if (parentName == "Columns") {
            color = "#cb9801";
        } else if (parentName == "Classes") {
            color = "#00afef";
        } else if (parentName == "Properties") {
            color = self.propertyColor;
        }
        jstreeData.push({
            id: parentName,
            parent: "#", // MappingModeler.currentTable,
            text: "<span style='font-weight:bold;font-size:large;color:" + color + "'>" + parentName + "</span>",
            data: {
                id: parentName,
                label: parentName,
            },
        });

        if (parentName == "Classes" || parentName == "Properties") {
            var uniqueSources = {};
            var searchDone = {};

            self.initSourcesMap(objects);

            objects.forEach(function (item) {
                if (item.source) {
                    if (!uniqueSources[item.source]) {
                        uniqueSources[item.source] = 1;

                        jstreeData.push({
                            id: item.source,
                            parent: parentName,
                            text: "<span style='font-size:larger;color:" + color + "'>" + item.source + "</span>",
                            data: {
                                id: item.source,
                                label: item.source,
                            },
                        });
                    }
                    if (self.sourcesMap[item.source].countItems < self.maxItemsInJstreePerSource || self.sourcesMap[item.source].mappingClasses[item.id]) {
                        jstreeData.push({
                            id: item.id,
                            parent: item.source,
                            text: "<span  style='color:" + color + "'>" + item.label.split(":")[1] + "</span>",
                            data: {
                                id: item.id,
                                text: item.label.split(":")[1],
                                resourceType: item.resourceType,
                            },
                        });
                    } else if (!searchDone[item.source]) {
                        searchDone[item.source] = 1;
                        jstreeData.push({
                            id: common.getRandomHexaId(5),
                            parent: item.source,
                            text: "<span  style='font-weight:bold;color:" + color + "'> SEARCH...</span>",
                            data: {
                                resourceType: "search" + item.resourceType,
                                source: item.source,
                            },
                        });
                    }
                } else {
                    jstreeData.push({
                        id: item.id,
                        parent: parentName,
                        text: "<span  style='color:" + color + "'>" + item.label + "</span>",
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
                        text: "<span  style='color:" + color + "'>" + item + "</span>",
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
            $("#suggestionsSelectJstreeDiv").css("overflow", "unset");
        });
    };

    /**
     * Initializes the active legend for a given container.
     * @function
     * @name initActiveLegend
     * @memberof module:MappingModeler
     * @param {string} divId - The ID of the container where the legend will be displayed.
     */
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

    /**
     * Hides specific resources in the legend based on the resource type.
     * @function
     * @name hideForbiddenResources
     * @memberof module:MappingModeler
     * @param {string} resourceType - The type of resource to hide.
     */
    self.hideForbiddenResources = function (resourceType) {
        var hiddenNodes = [];
        if (resourceType == "Table") {
            hiddenNodes.push("ObjectProperty");
            hiddenNodes.push("Class");
            hiddenNodes.push("Connective");
        }
        self.hideLegendItems(hiddenNodes);
    };

    /**
     * Handles the selection of a suggestion from the tree.
     * @function
     * @name onSuggestionsSelect
     * @memberof module:MappingModeler
     * @param {Object} event - The selection event object.
     * @param {Object} obj - The selected tree node object.
     */
    self.onSuggestionsSelect = function (event, obj) {
        if (obj.event && obj.event.type == "contextmenu") {
            return;
        }

        if (!DataSourceManager.currentConfig.currentDataSource) {
            return alert("Select a data source");
        }
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
            MappingColumnsGraph.drawResource(newResource, function () {
                var edge = {
                    to: id,
                    from: self.currentTable.name,
                    color: "#8f8a8c",
                };
                MappingColumnsGraph.visjsGraph.data.edges.add(edge);
            });

            //  MappingColumnsGraph.graphActions. showColumnDetails(newResource)
            setTimeout(function () {
                self.onLegendNodeClick({ id: "Class" });
            }, 500);
        } else if (obj.node.data && obj.node.data.resourceType == "searchClass") {
            var word = prompt("class starts with... ");
            if (!word) {
                return;
            }
            word = word.toLowerCase();
            var jstreeData = [];
            var source = obj.node.data.source;
            var color = "#00afef";
            for (var resourceUri in self.allResourcesMap) {
                var item = self.allResourcesMap[resourceUri];
                var itemLabel = item.label.toLowerCase();
                var startWith = true;
                if (word.startsWith("*") || word.startsWith("%")) {
                    word = word.substring(1);
                    startWith = false;
                }
                if (item.resourceType == "Class" && item.source == source) {
                    var label = item.label;
                    if (label.split(":").length == 2) {
                        label = label.split(":")[1];
                    }
                    //  console.log(label)

                    if ((startWith && label.toLowerCase().indexOf(word) == 0) || (!startWith && label.toLowerCase().indexOf(word) > -1)) {
                        jstreeData.push({
                            id: item.id,
                            parent: item.source,
                            text: "<span  style='color:" + color + "'>" + label + "</span>",
                            data: {
                                id: item.id,
                                text: label,
                                resourceType: item.resourceType,
                            },
                        });
                    }
                }
            }
            if (jstreeData.length == 0) {
                return alert("no Match");
            }
            if (jstreeData.length > self.maxItemsInJstree) {
                return alert("to many matches");
            }

            JstreeWidget.addNodesToJstree("suggestionsSelectJstreeDiv", source, jstreeData, { positionLast: true });
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

            setTimeout(function () {
                self.onLegendNodeClick({ id: "Column" });
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
                self.onLegendNodeClick({ id: "Class" });
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
            MappingColumnsGraph.drawResource(newResource, function (err) {
                var edge = {
                    to: id,
                    from: self.currentTable.name,
                };
                MappingColumnsGraph.visjsGraph.data.edges.add(edge);
            });
            setTimeout(function () {
                self.onLegendNodeClick({ id: "Class" });
            }, 500);
        } else if (self.currentResourceType == "ObjectProperty") {
            var smooth = null;
            var property = self.allResourcesMap[resourceUri];
            if (self.currentRelation) {
                self.currentRelation.data = { type: "Objectproperty", propId: resourceUri };

                var color = self.propertyColor;
                var arrowType = null;
                // ObjectProperty
                if (self.allResourcesMap[resourceUri]) {
                    self.currentRelation.label = self.allResourcesMap[resourceUri].label;
                    arrowType = "diamond";
                } else {
                    //other
                    smooth = { type: "curvedCW" };
                    self.currentRelation.label = resourceUri;
                    color = "#333";
                }
                var edge = MappingColumnsGraph.getVisjsObjectPropertyEdge(
                    self.currentRelation.from.id,
                    self.currentRelation.to.id,
                    self.currentRelation.label,
                    arrowType,
                    property,
                    resourceUri,
                    color,
                );

                MappingColumnsGraph.addEdge([edge]);

                self.currentRelation = null;
                //$("#axioms_legend_suggestionsSelect").empty();
                JstreeWidget.empty("suggestionsSelectJstreeDiv");
            }
        }
    };

    /**
     * Handles a click on a legend node to perform specific actions based on the node type.
     * @function
     * @name onLegendNodeClick
     * @memberof module:MappingModeler
     * @param {Object} node - The legend node clicked, containing its ID and properties.
     * @param {Object} event - The click event triggering the action.
     *
     * @description
     * Performs actions such as:
     * - Creating a specific URI resource.
     * - Loading suggestions for columns, classes, or properties.
     * - Managing virtual columns or row indices.
     */
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
            var newObject = { id: "createClass", label: "_Create new Class_" };
            self.getAllClasses(MappingModeler.currentSLSsource, function (err, classes) {
                if (err) {
                    return alert(err);
                }

                var classesCopy = JSON.parse(JSON.stringify(classes));
                classesCopy.unshift(newObject);
                self.loadSuggestionSelectJstree(classesCopy, "Classes");
            });
        } else if (self.currentResourceType == "ObjectProperty") {
            var newObjects = [
                { id: "createObjectProperty", label: "_Create new ObjectProperty_" },
                { id: "function", label: "function" },
                { id: "rdfs:member", label: "_rdfs:member_" },
                { id: "rdfs:subClassOf", label: "_rdfs:subClassOf_" },
            ];
            var options = { includesnoConstraintsProperties: true };
            //Axioms_suggestions.getValidPropertiesForClasses(MappingModeler.currentSLSsource, self.currentRelation.from.classId, self.currentRelation.to.classId, options, function (err, properties) {

            OntologyModels.getAllowedPropertiesBetweenNodes(
                MappingModeler.currentSLSsource,
                self.currentRelation.from.classId,
                self.currentRelation.to.classId,
                { keepSuperClasses: true },
                function (err, result) {
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
                },
            );
        } else if (self.currentResourceType == "RowIndex") {
            self.onSuggestionsSelect(null, { node: { id: "RowIndex" } });
        } else if (self.currentResourceType == "VirtualColumn") {
            var columnName = prompt("Virtual column name");
            if (columnName) {
                self.onSuggestionsSelect(null, { node: { id: columnName } });
            }
        }
    };

    /**
     * Displays the legend graph popup menu (TO DO).
     * @function
     * @name showLegendGraphPopupMenu
     * @memberof module:MappingModeler
     */
    self.showLegendGraphPopupMenu = function () {};

    /**
     * Retrieves all classes from the specified source or the current source if none is provided.
     * Caches the result to avoid redundant API calls.
     *
     * @function
     * @name get    AllClasses
     * @memberof module:MappingModeler
     * @param {string} source - The source to retrieve classes from. Defaults to `self.currentSource` if not provided.
     * @param {function} callback - Callback function to handle the result. Receives two arguments: error and result.
     *
     * @description
     * - If the classes are already cached in `self.allClasses`, returns the cached list.
     * - Otherwise, fetches all classes using `CommonBotFunctions.listSourceAllClasses`.
     * - Filters out duplicate class IDs and formats labels with source prefixes.
     * - The resulting class list is sorted alphabetically by label.
     * - Calls the callback with the formatted list or an error if the API call fails.
     */
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

    self.clearSourceClasses = function (source, callback) {
        OntologyModels.clearOntologyModelCache(MappingModeler.currentSLSsource);
        var newClasses = [];
        self.allClasses.forEach(function (item) {
            if (item.source != source) {
                newClasses.push(item);
            }
        });
        self.allClasses = newClasses;
    };

    /**
     * Retrieves all object properties from the specified source or the current source if none is provided.
     * Caches the result to avoid redundant API calls.
     *
     * @function
     * @name getAllProperties
     * @memberof module:MappingModeler
     * @param {string} source - The source to retrieve properties from. Defaults to `self.currentSource` if not provided.
     * @param {function} callback - Callback function to handle the result. Receives two arguments: error and result.
     *
     * @description
     * - If the properties are already cached in `self.allProperties`, returns the cached list.
     * - Otherwise, fetches all object properties using `CommonBotFunctions.listSourceAllObjectProperties`.
     * - Filters out duplicate property IDs and prepares labels for each property.
     * - Sorts the resulting property list alphabetically by label.
     * - Calls the callback with the formatted list or an error if the API call fails.
     *
     * @example
     * self.getAllProperties("mySource", function(err, properties) {
     *     if (err) {
     *         console.error(err);
     *     } else {
     *         console.log(properties);
     *     }
     * });
     */
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

    /**
     * Hides or shows legend items based on the provided list of nodes to keep visible.
     *
     * @function
     * @name hideLegendItems
     * @memberof module:MappingModeler
     * @param {Array} hiddenNodes - Array of node IDs to keep visible. If not provided, all legend items are hidden.
     *
     * @description
     * - Retrieves all legend node IDs from `Axiom_activeLegend.data.nodes`.
     * - Iterates through each node ID, marking them as `hidden` if they are not in the `hiddenNodes` list.
     * - Updates the visibility of legend items using `self.updateNode`.
     *
     * @example
     * self.hideLegendItems(["node1", "node2"]);
     */
    self.hideLegendItems = function (hiddenNodes) {
        var legendNodes = Axiom_activeLegend.data.nodes.getIds();
        var newNodes = [];
        legendNodes.forEach(function (nodeId) {
            var hidden = !hiddenNodes || hiddenNodes.indexOf(nodeId) > -1;
            newNodes.push({ id: nodeId, hidden: hidden });
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

    /**
     * Initializes a map containing all classes and properties for a given source.
     *
     * @function
     * @name initResourcesMap
     * @memberof module:MappingModeler
     * @param {string} source - The data source from which resources are fetched.
     * @param {function} callback - Callback function invoked after resources are initialized. Receives two arguments: error and result.
     *
     * @description
     * - Initializes `self.allResourcesMap` as an empty object.
     * - Resets `self.allClasses` and `self.allProperties` to `null`.
     * - Calls `self.getAllClasses` to fetch all classes, adding each to the `self.allResourcesMap` by ID.
     * - Calls `self.getAllProperties` to fetch all properties, adding each to the `self.allResourcesMap` by ID.
     * - If a callback is provided, it is invoked after all resources are processed.
     *
     * @example
     * self.initResourcesMap("mySource", function(err, result) {
     *     if (err) {
     *         console.error(err);
     *     } else {
     *         console.log("Resources initialized:", self.allResourcesMap);
     *     }
     * });
     */
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

    /**
     * Clears the current graph mappings and resets the graph canvas.
     *
     * @function
     * @name clearMappings
     * @memberof module:MappingModeler
     *
     * @description
     * - Clears the `visjsGraph` object, which contains the graph visualization data.
     * - Removes all content from the graph's HTML container using its ID.
     * - Resets `self.visjsGraph` to `null`.
     * - Reinitializes an empty graph canvas using `self.drawGraphCanvas` with empty nodes and edges.
     *
     * @example
     * self.clearMappings();
     */
    self.clearMappings = function () {
        if (mappingColumnsGraph.visjsGraph.isGraphNotEmpty()) {
            if (!confirm("Warning ! if you continue all mappings for this source will be permanently  lost")) {
                return;
            }
        }
        $("#" + MappingColumnsGraph.graphDivId).html("");
        MappingColumnsGraph.clearGraph();
    };

    /**
     * Displays the create resource bot and starts the resource creation workflow based on the provided resource type.
     *
     * @function
     * @name showCreateResourceBot
     * @memberof module:MappingModeler
     *
     * @param {string} resourceType - The type of resource to create ("Class" or "ObjectProperty").
     * @param {Array} filteredUris - The URIs to filter the resource creation process.
     *
     * @description
     * - Initializes the workflow for creating a new resource based on the resource type.
     * - If the resource type is "Class", it uses the `workflowNewClass` workflow, otherwise, if it's "ObjectProperty", it uses the `workflowNewObjectProperty` workflow.
     * - Updates internal data structures (`allClasses`, `allProperties`, `allResourcesMap`) with the newly created resource.
     * - Adds the new resource to a suggestion list displayed in a jsTree widget.
     * - If the resource type is invalid, it alerts the user.
     *
     * @example
     * self.showCreateResourceBot("Class", filteredUris);
     */
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
        var params = { source: MappingModeler.currentSLSsource, filteredUris: filteredUris };
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
            JstreeWidget.updateJstree("suggestionsSelectJstreeDiv", jstreeData, { openAll: true });
        });
    };

    /**
     * Sends a request to generate and display sample triples based on the provided mappings.
     *
     * @function
     * @name viewSampleTriples
     * @memberof module:MappingModeler
     *
     * @param {Object} mappings - The mappings to be applied as a filter when generating the sample triples.
     *
     * @description
     * - Constructs a payload with the current source, data source, table name, and options.
     * - Sends a POST request to the server to generate sample triples based on the provided mappings.
     * - Displays the generated triples in a data table using `TripleFactory.showTriplesInDataTable`.
     * - Shows a dialog with the generated triples and allows the user to close the dialog.
     * - If an error occurs during the request, an alert is shown with the error message.
     *
     * @example
     * self.viewSampleTriples(mappings);
     */
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

    /**
     * Filters the suggestion tree based on the input keyword.
     *
     * @function
     * @name filterSuggestionTree
     * @memberof module:MappingModeler
     *
     * @description
     * - Retrieves the input keyword from the filter field and converts it to lowercase.
     * - Checks if the suggestion tree data exists and creates a copy of it if necessary.
     * - Filters the nodes in the suggestion tree, only including leaf nodes whose text contains the keyword.
     * - Updates the jstree with the filtered nodes using `JstreeWidget.updateJstree`.
     *
     * @example
     * self.filterSuggestionTree();
     */
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

    /**
     * Opens a dialog displaying a function from an external HTML file.
     *
     * @function
     * @name predicateFunctionShowDialog
     * @memberof module:MappingModeler
     *
     * @description
     * - Loads the HTML content from `functionDialog.html` into the `#smallDialogDiv` element.
     * - Opens the dialog to display the loaded content.
     *
     * @example
     * self.predicateFunctionShowDialog();
     */
    self.predicateFunctionShowDialog = function () {
        $("#smallDialogDiv").load("./modules/tools/mappingModeler/html/functionDialog.html", function () {
            $("#smallDialogDiv").dialog("open");
        });
    };

    /**
     * Adds a predicate function edge to the current graph.
     *
     * @function
     * @name addPredicateFunction
     * @memberof module:MappingModeler
     *
     * @description
     * - Creates an edge with a label "_function_" and a diamond-shaped arrow pointing to the target node.
     * - The edge's data contains the function body retrieved from the `#MappingModeler_fnBody` input field.
     * - Adds the edge to the graph and then closes the dialog displaying the function input.
     *
     * @example
     * self.addPredicateFunction();
     */
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

            data: {
                id: "function{" + $("#MappingModeler_fnBody").val() + "}",
                type: "function",
                source: "function",
            },
            color: "#375521",
        };
        MappingColumnsGraph.addEdge([edge]);
        $("#smallDialogDiv").dialog("close");
    };

    /**
     * Loads the current source data and hides the graph edition buttons.
     *
     * @function
     * @name loadSource
     * @memberof module:MappingModeler
     *
     * @param {Function} callback - The function to be executed once the source is loaded successfully.
     *
     * @description
     * - Uses `Lineage_sources.loadSources` to load the current source specified in `MainController.currentSource`.
     * - On success, hides the graph edition buttons and calls the provided callback function.
     * - If an error occurs during the loading process, an alert is displayed with the error message.
     *
     * @example
     * self.loadSource(function() {
     *   console.log("Source loaded successfully");
     * });
     */
    self.loadSource = function (callback) {
        Lineage_sources.loadSources(MainController.currentSource, function (err) {
            if (err) {
                return alert(err.responseText);
            }
            $("#Lineage_graphEditionButtons").hide();
            return callback();
        });
    };

    /**
     * Displays sample data for the selected node with the specified columns.
     *
     * @function
     * @name showSampleData
     * @memberof module:MappingModeler
     *
     * @param {Object} node - The selected node from which to fetch data.
     * @param {Array|string} columns - The specific columns to display, can be an array or a single column name.
     * @param {Function} callback - A callback function to be executed after showing the data (optional).
     *
     * @description
     * - Checks if columns are specified and prepares the table accordingly.
     * - Fetches and displays sample data from either a database or CSV source.
     * - For a database source, it fetches the first 200 rows based on a predefined SQL query.
     * - Displays the data in a table with the specified columns.
     * - Alerts the user if the CSV source is not yet implemented.
     *
     * @example
     * self.showSampleData(node, ['column1', 'column2'], function() {
     *   console.log("Sample data displayed");
     * });
     */

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
                        tableCols.push({ title: key, defaultContent: "", width: "15%" });
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

    self.visjsDataToClassDiagram = function (visjsData) {
        if (!visjsData) {
            visjsData = {
                nodes: MappingColumnsGraph.visjsGraph.data.nodes.get(),
                edges: MappingColumnsGraph.visjsGraph.data.edges.get(),
            };
        }
        PlantUmlTransformer.visjsDataToClassDiagram(visjsData);
    };

    return self;
})();

export default MappingModeler;
window.MappingModeler = MappingModeler;
