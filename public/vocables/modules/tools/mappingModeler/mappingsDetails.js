import common from "../../shared/common.js";
import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import MappingModeler from "./mappingModeler.js";
import TripleFactory from "./tripleFactory.js";
import MappingTransform from "./mappingTransform.js";
import UIcontroller from "./uiController.js";
import DataSourceManager from "./dataSourcesManager.js";

/**
 * MappingsDetails manages technical mappings (non structural mappings)
 *
 *
 * @module MappingsDetails
 * @type {{}}
 * @see [Tutorial: Overview]{@tutorial overview}
 */
var MappingsDetails = (function () {
    var self = {};
    var filterMappingIsSample;
    self.colorsMap = {
        rdfType: "#33caff",
        rdfsLabel: "#33ff36",
        transform: "#ffe333",
        otherPredicates: "#ca33ff",
        lookup: "#eeff33",
    };

    /**
     * Displays the details dialog for mappings.
     * If no table is selected, an alert is shown. Otherwise, it loads the details dialog HTML
     * and activates the right panel in the UI. It also sets up the detailed mappings tree
     * and graph, and binds the search input to search the mappings in the tree.
     * @function
     * @name showDetailsDialog
     * @memberof module:MappingsDetails
     * @param {string} [divId="mainDialogDiv"] - The ID of the dialog div to display the details in. Default is "mainDialogDiv".
     * @param {Function} [callback] - Optional callback function to execute after showing the dialog.
     * @returns {void}
     */
    self.showDetailsDialog = function (divId, callback) {
        if (!MappingModeler.currentTable) {
            return alert("Select a table");
        }
        if (!divId) {
            divId = "mainDialogDiv";
        }
        UIcontroller.activateRightPanel("generic");
        $("#mappingModeler_genericPanel").load("./modules/tools/mappingModeler/html/detailsDialog.html", function () {
            self.showDetailedMappingsTree();
            self.drawDetailedMappingsGraph();
            if (callback) {
                callback();
            }
            $("#detailedMappings_searchInput").bind("keydown", null, function () {
                if (event.keyCode != 13 && event.keyCode != 9) {
                    return;
                }
                var value = $(this).val();
                $("#detailedMappings_jsTreeDiv").jstree(true).search(value);
            });
            // $("#mainDialogDiv").dialog("open");
        });
    };
    self.generateMappingsTreeData = function (columns) {
        var table = MappingModeler.currentTable.name;
        var jstreeData = [];
        var uniqueSubjects = {};
        var nodes = MappingColumnsGraph.visjsGraph.data.nodes.get();
        var buttonStr = "<img src='icons\\KGA\\MoreOptionsIcon-KGA.png' onClick=''>";

        if (!columns) {
            columns = [];
        }
        if (!Array.isArray(columns)) {
            if (columns && typeof columns == "string") {
                columns = [columns];
            } else {
                columns = [];
            }
        }

        jstreeData.push({
            id: MappingModeler.currentTable.name,
            text: "<b>" + MappingModeler.currentTable.name + "</b>",
            data: {},
            parent: "#",
        });

        var allreadyDefinedNodes = []; // nodes that are allready defined that need to be saved together after running isColumnAllreadyMappedInAnotherTable
        var allreadyDefinedNodes = []; // nodes that are allready defined that need to be saved together after running isColumnAllreadyMappedInAnotherTable
        nodes.forEach(function (node) {
            if (node.data.dataTable !== table) {
                return;
            }
            if (node.data.type == "Class") {
                return;
            }
            if (node.data.type == "Table") {
                return;
            }
            if (columns.length > 0 && !columns.includes(node.label)) {
                return;
            }

            if (!uniqueSubjects[node.label]) {
                uniqueSubjects[node.label] = node;
                var definitionTable = self.isColumnAllreadyMappedInAnotherTable(node);
                var color = "#cb9801";
                if (definitionTable) {
                    allreadyDefinedNodes.push(node);
                    definitionTable = "<font color='#eab3b3'><i> def: " + definitionTable + "</i></font>";
                    color = "#eab3b3";
                } else {
                    definitionTable = "";
                }

                jstreeData.push({
                    id: node.id,
                    text: "<span style='background-color: " + color + ";padding: 3px;border-radius: 7px;'>" + node.label + "</span>&nbsp;" + buttonStr + definitionTable,
                    data: node.data,
                    parent: MappingModeler.currentTable.name,
                });

                var predicates = {
                    rdfType: "rdf:type",
                    rdfsLabel: "rdfs:label",
                    uriType: "uri Type",
                };

                var color = "";
                for (var key in node.data) {
                    if (node.data[key]) {
                        if (predicates[key]) {
                            if (self.colorsMap[key]) {
                                color = self.colorsMap[key];
                            } else {
                                color = "#3339ff";
                            }
                            jstreeData.push({
                                id: node.id + "|" + key + "|" + node.data[key],
                                text: "<span style='color: " + color + "'>" + key + "</span>  " + node.data[key],
                                parent: node.id,
                            });
                        }
                    }
                }

                if (node.data.otherPredicates) {
                    node.data.otherPredicates.forEach(function (item) {
                        jstreeData.push({
                            id: node.id + "|" + "otherPredicates" + "|" + item.property + "|" + item.object,
                            text: "<span style='color: " + self.colorsMap["otherPredicates"] + "'>" + item.property + "</span>  " + item.object,
                            parent: node.id,
                        });
                    });
                }
                if (node.data.transform) {
                    jstreeData.push({
                        id: node.id + "|" + "transform" + "|" + node.data.transform,
                        text: "<span style='color: " + self.colorsMap["transform"] + "'>" + "transform" + "</span>  " + node.data.transform,
                        parent: node.id,
                    });
                }
                var currentLookupName = node.data.dataTable + "|" + node.data.label;
                if (DataSourceManager.currentConfig.lookups[currentLookupName]) {
                    var lookup = DataSourceManager.currentConfig.lookups[currentLookupName];
                    if (lookup.name == currentLookupName) {
                        jstreeData.push({
                            id: lookup.fileName + "|" + "lookup",
                            text: "<span style='color: " + self.colorsMap["lookup"] + "'>" + "lookup" + "</span>  " + JSON.stringify(lookup),
                            parent: node.id,
                            data: lookup,
                        });
                    }
                }
            }
        });
        var columnsMap = Object.fromEntries(Object.values(uniqueSubjects).map((obj) => [obj.id, obj]));
        var columnMappings = MappingTransform.mappingsToKGcreatorJson(columnsMap, { getColumnMappingsOnly: true });
        columnMappings.forEach(function (mapping) {
            if (!mapping.s || !mapping.p || !mapping.o) {
                return;
            }
            var mappingS = mapping.s.replaceAll("_$", "").replaceAll("_£", "").replaceAll("@", "");
            var mappingO = mapping.o.replaceAll("_$", "").replaceAll("_£", "").replaceAll("@", "");

            var propertyLabel = mapping.p;
            if (mapping.p.indexOf("http://") === 0) {
                var allPropertiesCorrespondance = MappingModeler.allProperties.filter(function (prop) {
                    return prop.id == mapping.p;
                });
                propertyLabel = allPropertiesCorrespondance.length > 0 ? allPropertiesCorrespondance[0].label : mapping.p;
            }
            var subjectId = uniqueSubjects[mapping.s]?.id;
            var objectId = uniqueSubjects[mapping.o]?.id;
            if (!subjectId) {
                return;
            }
            var objectLabel = mapping.o;
            if (!objectId && mapping.o.indexOf("http://") === 0) {
                var object = MappingModeler.allClasses.find(function (item) {
                    return item.id == mapping.o;
                });
                if (object) {
                    objectId = object.id;
                    var objectLabel = object.label;
                }
            }
            if (!objectId) {
                return;
            }
            // mapping.s is a column no label case
            jstreeData.push({
                id: mapping.s + "-->" + mapping.p + "-->" + mapping.o,
                text: mapping.s + "-->" + propertyLabel + "-->" + objectLabel,
                parent: subjectId,
                data: {
                    fromNodeColumn: mapping.s,
                    fromNodeId: subjectId,
                    toNodeColumn: mapping.o,
                    toNodeId: objectId,
                    toNodeLabel: objectLabel,
                    propertyId: mapping.p,
                    propertyLabel: propertyLabel,
                    type: "ColumnMapping",
                },
            });
        });

        if (allreadyDefinedNodes.length > 0) {
            self.savejsTreeNodesToVisjsGraph(allreadyDefinedNodes);
        }

        return jstreeData;
    };

    /**
     * Displays the detailed mappings tree for the current table.
     * It populates the tree with nodes and mappings related to the selected table and columns.
     * The tree allows search and interaction with mapping nodes.
     * @function
     * @name showDetailedMappingsTree
     * @memberof module:MappingsDetails
     * @param {Object} [column] - Optional column data to filter the tree by.
     * @param {string} [divId="detailedMappings_jsTreeDiv"] - The ID of the div to display the tree in. Default is "detailedMappings_jsTreeDiv".
     * @param {Object} [_options={}] - Optional configuration options for the tree, such as context menu behavior.
     * @param {boolean} [_options.withoutContextMenu=false] - If true, disables the context menu.
     * @param {boolean} [_options.searchPlugin=true] - Enables or disables the search plugin.
     * @param {boolean} [_options.openAll=true] - If true, expands all nodes by default.
     * @param {Function} [_options.selectTreeNodeFn] - Callback function for when a tree node is selected.
     * @returns {void}
     */
    self.showDetailedMappingsTree = function (column, divId, _options) {
        if (!_options) {
            _options = {};
        }

        if (!divId) {
            divId = "detailedMappings_jsTreeDiv";
        }

        var table = MappingModeler.currentTable.name;

        if (!table) {
            table = MappingModeler.currentTable.name;
        }

        var nodes = MappingColumnsGraph.visjsGraph.data.nodes.get();

        var columnsMap = {};
        var jstreeData = self.generateMappingsTreeData();
        var uniqueSubjects = {};
        var buttonStr = "<img src='icons\\KGA\\MoreOptionsIcon-KGA.png' onClick=''>";

        var options = {
            searchPlugin: true,
            openAll: true,
            selectTreeNodeFn: self.onSelectTreeNode,
            contextMenu: function (node) {
                var items = {};
                if (_options.withoutContextMenu) {
                    return;
                }

                if (node.id.split("|")[1] == "transform") {
                    items["edit transform"] = {
                        label: "edit transform",
                        action: function (_e) {
                            var column = MappingColumnsGraph.visjsGraph.data.nodes.get(node.id.split("|")[0]);
                            var columnLabel = column.label;
                            var transformValue = column.data.transform;
                            if (transformValue) {
                                transformValue = transformValue.match(/function{(.*)}/s)[1];
                                MappingsDetails.transform.showTansformDialog(columnLabel, function () {
                                    $("#MappingModeler_fnBody").val(transformValue);
                                });
                            }
                        },
                    };
                }
                if (node.id.split("|")[1] == "lookup") {
                    items["edit lookup"] = {
                        label: "edit lookup",
                        action: function (_e) {
                            MappingColumnsGraph.currentGraphNode = MappingColumnsGraph.visjsGraph.data.nodes.get(node.parent);
                            Lookups_bot.start(Lookups_bot.lookUpWorkflow, {}, function (err, result) {
                                if (err) {
                                    return alert(err);
                                }
                            });
                        },
                    };
                }
                if (node.parents.length == 3) {
                    //only for node data
                    items["deletemapping"] = {
                        label: "delete",
                        action: function (_e) {
                            var node = MappingsDetails.deleteMappingInVisjsNode(self.currentTreeNode);
                        },
                    };
                }

                return items;
            },
        };

        for (var key in _options) {
            options[key] = _options[key];
        }

        JstreeWidget.loadJsTree(divId, jstreeData, options, function () {
            $("#detailedMappings_treeContainer").css("overflow", "unset");
        });
    };

    /**
     * @function
     * @name showColumnTechnicalMappingsDialog
     * @memberof MappingsDetails
     * Displays a dialog for configuring technical mappings for a specific column.
     * This includes URI type, rdf:type, and rdfs:label, with options pre-filled based on the column's data.
     * @param {string} divId - The ID of the HTML element where the dialog content will be rendered.
     * @param {object} column - The column object containing the metadata (e.g., column label, rdfType, uriType).
     * @param {function} callbackFn - A callback function to be executed after saving the mappings.
     * @returns {void}
     */
    self.showColumnTechnicalMappingsDialog = function (divId, column, callbackFn) {
        self.afterSaveColumnTechnicalMappingsDialog = callbackFn;

        console.log(column);
        var isColumnAllreadyMapped = self.isColumnAllreadyMappedInAnotherTable(column);
        var html = `<tr><td>Table column</td><td><span id='class-column' ><b> ${column.text || column.label} </b></span> </td></tr>`;

        if (isColumnAllreadyMapped) {
            html += "<tr><td></td><td> column already defined in table " + isColumnAllreadyMapped + "</td></tr>";
        } else {
            html += `<tr></tr>`;
            html += `<tr><td>URI syntax*</td><td><select id='columnDetails-UriType' onchange='MappingsDetails.onChangeUriType()' style='padding:6px 6px'> </select>  </td></tr>`;
            html += `<tr><td >Base URI</td><td><input id='columnDetails-baseUri' style='width:300px;    background-color: #eee;margin-right:15px;'> </input>  </td>
            <td  id='columnDetails-prefixURI-label' style='margin-left:10px;'>URI prefix</td><td><input id='columnDetails-prefixURI' style='width:300px;    background-color: #eee;margin-left:15px;'> </input>  </td>
            <td  id='columnDetails-prefixURI-label' style='margin-left:10px;'>URI suffix</td> <td><input id='columnDetails-suffixURI' style='width:300px;    background-color: #eee;margin-left:15px;'> </input>  </td></tr>`;
            html += `<tr><td>rdf:type*</td><td><select id='columnDetails-rdfType' style='padding:6px 6px'> </select> </td></tr> `;

            html += `<tr><td>rdfs:label column</td><td><select id='columnDetails-rdfsLabel' style='padding:6px 6px'> </select> </td></tr>`;
        }

        html += `<td><button class='slsv-button-1' id='class-datatype' style='padding:6px 6px;margin:0px;' onclick='MappingsDetails.showSpecificMappingsBot("${column.id}")'> More mappings... </button> </td>  `;
        html += `<td><button class='slsv-button-1' id='class-datatype' style='padding:6px 6px;margin:0px;' onclick='MappingsDetails.saveMappingsDetailsToVisjsGraph("${column.id}");MappingsDetails.afterSaveColumnTechnicalMappingsDialog() '> Save </button> </td>  `;

        $("#" + divId).html(html);

        var URITType = ["fromLabel", "blankNode", "randomIdentifier"];

        var rdfObjectsType = ["owl:NamedIndividual", "owl:Class"];

        //  sort by similarity for others than rowIndex

        var columns = JSON.parse(JSON.stringify(MappingModeler.currentTable.columns));
        columns.unshift("");
        common.array.moveItemToFirst(columns, column);
        if (column.data.rdfType) {
            common.array.moveItemToFirst(rdfObjectsType, column.data.rdfType);
        }
        if (column.data.rdfType == "") {
            rdfObjectsType.unshift("");
        } else {
            rdfObjectsType.push("");
        }

        if (column.data.uriType) {
            common.array.moveItemToFirst(URITType, column.data.uriType);
        }
        if (column.data.rdfsLabel) {
            common.array.moveItemToFirst(columns, column.data.rdfsLabel);
        }

        common.fillSelectOptions(`columnDetails-rdfsLabel`, columns, false);
        common.fillSelectOptions(`columnDetails-rdfType`, rdfObjectsType, false);
        common.fillSelectOptions(`columnDetails-UriType`, URITType, false);

        var sourceObj = Config.sources[MappingModeler.currentSLSsource];

        $("#columnDetails-baseUri").val(column.data.baseURI || "");
        $("#columnDetails-prefixURI").val(column.data.prefixURI || "");
        $("#columnDetails-suffixURI").val(column.data.suffixURI || "");
        self.onChangeUriType();

        self.setMappingDefaultFieds(column);
        console.log(column);
    };

    /**
     * Saves the mapping details to the Vis.js graph for a specific column.
     * It updates the column's URI type, RDF type, and rdfs:label based on the user's selection,
     * then saves the updated data to the graph and triggers any necessary transformations.
     * @function
     * @name saveMappingsDetailsToVisjsGraph
     * @memberof module:MappingsDetails
     * @param {string} columnId - The ID of the column whose mapping details are to be saved.
     * @returns {void}
     */
    self.saveMappingsDetailsToVisjsGraph = function (columnId) {
        var currentGraphNode = MappingColumnsGraph.visjsGraph.data.nodes.get(columnId);
        if (!currentGraphNode) {
            return alert("no current graphNode ");
        }
        currentGraphNode.data.uriType = $("#columnDetails-UriType").val();
        currentGraphNode.data.rdfsLabel = $("#columnDetails-rdfsLabel").val();
        currentGraphNode.data.rdfType = $("#columnDetails-rdfType").val();
        var prefix = $("#columnDetails-prefixURI").val();
        if (prefix && currentGraphNode.data.uriType == "fromLabel") {
            currentGraphNode.data.prefixURI = prefix;
        }
        if (currentGraphNode.data.prefixURI && !prefix) {
            delete currentGraphNode.data.prefixURI;
        }

        var suffix = $("#columnDetails-suffixURI").val();
        if (suffix && currentGraphNode.data.uriType == "fromLabel") {
            currentGraphNode.data.suffixURI = suffix;
        }
        if (currentGraphNode.data.suffixURI && !suffix) {
            delete currentGraphNode.data.suffix;
        }

        var baseUri = $("#columnDetails-baseUri").val();
        var sourceObj = Config.sources[MappingModeler.currentSLSsource];
        var sourceBaseUri = sourceObj.baseUri || sourceObj.graphUri;
        if (baseUri && baseUri != sourceBaseUri) {
            currentGraphNode.data.baseURI = $("#columnDetails-baseUri").val();
        } else {
            if (currentGraphNode.data.baseURI) {
                delete currentGraphNode.data.baseURI;
            }
        }

        MappingColumnsGraph.updateNode(currentGraphNode);
        self.switchTypeToSubclass(currentGraphNode);

        // });
        MappingColumnsGraph.saveVisjsGraph(function () {});
    };

    self.savejsTreeNodesToVisjsGraph = function (nodes) {
        if (nodes.length == 0) {
            return;
        }
        nodes.forEach(function (node) {
            var currentGraphNode = MappingColumnsGraph.visjsGraph.data.nodes.get(node.id);
            currentGraphNode.data.uriType = node.data.uriType;
            currentGraphNode.data.prefixURI = node.data.prefixURI;
            currentGraphNode.data.suffixURI = node.data.suffixURI;
            currentGraphNode.data.baseURI = node.data.baseURI;
            MappingColumnsGraph.updateNode(currentGraphNode);
        });
        MappingColumnsGraph.saveVisjsGraph(function () {});
    };

    /**
     * Deletes a specific mapping from the Vis.js graph node.
     * It identifies the mapping based on the node's ID and removes the corresponding property
     * or predicate from the node's data. After deletion, the tree is updated and the graph is re-rendered.
     * @function
     * @name deleteMappingInVisjsNode
     * @memberof module:MappingsDetails
     * @param {Object} treeNode - The tree node representing the mapping to be deleted.
     * @returns {void}
     */
    self.deleteMappingInVisjsNode = function (treeNode) {
        var array = treeNode.id.split("|");

        var graphNode = MappingColumnsGraph.visjsGraph.data.nodes.get(array[0]);

        if (array.length == 3) {
            for (var key in graphNode.data) {
                if (key == array[1] && graphNode.data[key] === array[2]) {
                    delete graphNode.data[key];
                }
            }
        } else if (array.length == 4) {
            //otherPredicates
            graphNode.data.otherPredicates.forEach(function (item, index) {
                if (item.property == array[2] && item.object == array[3]) {
                    graphNode.data.otherPredicates.splice(index, 1);
                }
            });
        }
        //transform gestion
        if (array.length >= 2 && array[1] == "transform") {
            if (graphNode.data.transform) {
                delete graphNode.data.transform;
                delete graphNode.data.prefixURI; //remove prefix URI
                delete graphNode.data.suffixURI; //remove prefix URI
            }
        }
        // lookup gestion
        if (array.length >= 2 && array[1] == "lookup") {
            if (treeNode?.data?.name) {
                delete DataSourceManager.currentConfig.lookups[treeNode.data.name];
                //delete lookup
            }
        }

        JstreeWidget.deleteNode("detailedMappings_jsTreeDiv", treeNode.id);

        MappingColumnsGraph.saveVisjsGraph(function () {
            self.drawDetailedMappingsGraph();
            self.showDetailedMappingsTree();
            if (graphNode) {
                self.showColumnTechnicalMappingsDialog("detailedMappings_techDetailsDiv", graphNode, function () {});
            }
        });
    };

    /**
     * Displays a button for configuring specific mappings for a column.
     * The button initiates a workflow that allows the user to add various predicates (rdf:type, rdfs:subClassOf, non-object properties) to the column's data in the graph.
     * The changes are applied and saved to the graph upon completion of the workflow.
     * @function
     * @name showSpecificMappingsBot
     * @memberof module:MappingsDetails
     * @param {string} columnId - The ID of the column for which the specific mappings are to be configured.
     * @returns {void}
     */
    self.showSpecificMappingsBot = function (columnId) {
        MappingColumnsGraph.currentGraphNode = MappingColumnsGraph.visjsGraph.data.nodes.get(columnId);

        var params = {
            source: MappingModeler.currentSLSsource,
            columns: MappingModeler.currentTable.columns,
            title: "" + MappingModeler.currentTable.name,
            columnClass: self.getColumnType(columnId),
        };

        MappingModeler_bot.start(MappingModeler_bot.workflowColumnmMappingOther, params, function (err, result) {
            var params = MappingModeler_bot.params;

            var data = MappingColumnsGraph.currentGraphNode.data;
            if (!data.otherPredicates) {
                data.otherPredicates = [];
            }

            if (params.addingTransform) {
                return; // function processing made in save transform
            } else if (params.addingType) {
                data.otherPredicates.push({
                    property: "rdf:type",
                    object: params.rdfType,
                });
                MappingColumnsGraph.updateNode({ id: MappingColumnsGraph.currentGraphNode.id, data: data });
                MappingColumnsGraph.saveVisjsGraph();
            } else if (params.addingSubClassOf) {
                data.otherPredicates.push({
                    property: "rdfs:subClassOf",
                    object: params.addingSubClassOf,
                });
                MappingColumnsGraph.updateNode({ id: MappingColumnsGraph.currentGraphNode.id, data: data });
                MappingColumnsGraph.saveVisjsGraph();
            } else if (params.nonObjectPropertyId) {
                var range = params.datatypePropertyRange || Config.ontologiesVocabularyModels[params.nonObjectPropertyVocab].nonObjectProperties[params.nonObjectPropertyId].range;
                data.otherPredicates.push({
                    property: params.nonObjectPropertyId,
                    object: params.predicateObjectColumn,
                    range: range,
                    dateFormat: params.nonObjectPropertyDateFormat || null, //if any
                });
                MappingColumnsGraph.updateNode({ id: MappingColumnsGraph.currentGraphNode.id, data: data });
                MappingColumnsGraph.saveVisjsGraph();
            }
            if (MappingsDetails.afterSaveColumnTechnicalMappingsDialog) {
                MappingsDetails.afterSaveColumnTechnicalMappingsDialog();
            }
            // self.showDetailsDialog();
        });
    };
    /**
     * Handles the selection of a tree node and displays the corresponding column's technical details.
     * If the selected node is a column node, it opens the column technical mappings dialog.
     * @function
     * @name onSelectTreeNode
     * @memberof module:MappingsDetails
     * @param {Object} event - The event object triggered by the tree node selection.
     * @param {Object} obj - The selected tree node object containing node details.
     * @returns {void}
     */
    self.onSelectTreeNode = function (event, obj) {
        self.currentTreeNode = obj.node;

        if (obj.node.parent == MappingModeler.currentTable.name) {
            //column node
            self.showColumnTechnicalMappingsDialog("detailedMappings_techDetailsDiv", obj.node, function () {
                MappingModeler.currentTreeNode = MappingColumnsGraph.visjsGraph.data.nodes.get(obj.node.id);
                self.showDetailsDialog(null, function () {
                    self.showColumnTechnicalMappingsDialog("detailedMappings_techDetailsDiv", MappingModeler.currentTreeNode, self.afterSaveColumnTechnicalMappingsDialog);
                });
            });
        } else {
            MappingModeler.currentTreeNode = null;
        }
    };

    /**
     * Draws a detailed mappings graph based on the column's mappings.
     * It visualizes the mappings in a graph format, with nodes representing the columns and edges representing the relationships between them.
     * Optionally filters the graph to a specific column if provided.
     * @function
     * @name drawDetailedMappingsGraph
     * @memberof module:MappingsDetails
     * @param {string} [column] - The column to filter the mappings by (optional).
     * @returns {void}
     */
    self.drawDetailedMappingsGraph = function (column) {
        //datatypeMappingGraph
        var mappings = MappingTransform.getSLSmappingsFromVisjsGraph();
        if (column) {
            mappings = mappings.filter(function (mapping) {
                return mapping.s.replaceAll("_$", "").replaceAll("_£", "").replaceAll("@", "") == column || mapping.o.replaceAll("_$", "").replaceAll("_£", "").replaceAll("@", "") == column;
            });
        }

        var divId = "detailedMappingsGraphDiv";

        var visjsData = { nodes: [], edges: [] };

        var existingNodes = {};
        var json = {};
        var shape = "box";
        var table = MappingModeler.currentTable.name;
        if (!existingNodes[table]) {
            existingNodes[table] = 1;
        }

        //var mappings = sourceMappings[table];
        var columns = MappingModeler.currentTable.columns;

        function getTripleLabelRole(id) {
            if (id.endsWith("_$")) {
                return "column";
            }
            if (id.startsWith("@")) {
                return "column";
            }
            var role = null;
            columns.forEach(function (column) {
                if (column == id) {
                    role = "column";
                }
            });
            return role;
        }

        var predicates = {
            "rdf:type": "rdfType",
            "rdfs:label": "rdfsLabel",
        };
        mappings.forEach(function (item, index) {
            if (!item.s || !item.p || !item.o) {
                return alert("tripleModel is malformed " + JSON.stringify(item));
            }
            if (item.p == "transform") {
                item.o = "transform";
            }

            function getNodeAttrs(str) {
                if (str.indexOf("http") > -1) {
                    return { type: "Class", color: "#00afef", shape: "box", size: 30 };
                } else if (str.indexOf(":") > -1) {
                    drawRelation = false; //rdf Bag
                    return null;
                    return { type: "OwlType", color: "#aaa", shape: "ellipse" };
                } else if (str.endsWith("_$")) {
                    return { type: "blankNode", color: "#00afef", shape: "square" };
                } else if (str.indexOf("_rowIndex") > -1) {
                    return { type: "rowIndex", color: "#f90edd", shape: "star" };
                } else {
                    drawRelation = false;
                    return { type: "Column", color: "#cb9801", shape: "ellipse" };
                }
            }

            var sId = table + "_" + item.s;
            var oId = table + "_" + item.o;

            if (!existingNodes[sId]) {
                if (!sId) {
                    return;
                }
                existingNodes[sId] = 1;
                var label = Sparql_common.getLabelFromURI(item.s);

                var attrs = getNodeAttrs(item.s);
                var drawRelation = true;
                if (item.o == "owl:NamedIndividual") {
                    // attrs.shape = "triangle";
                    drawRelation = false;
                }
                if (item.o == "owl:Class") {
                    // attrs.shape = "triangle";
                    drawRelation = false;
                }
                if (item.o == "rdf:Bag") {
                    //   attrs.shape = "box";
                    drawRelation = false;
                } else if (item.s.startsWith("@")) {
                    attrs.shape = "box";
                }
                /*  if (item.isString) {
                attrs.shape = "text";

            }*/

                visjsData.nodes.push({
                    id: sId,
                    label: label,
                    shape: attrs.shape,
                    color: attrs.color,

                    size: Lineage_whiteboard.defaultShapeSize,
                    data: {
                        id: item.s,
                        label: label,
                        fileName: table,
                        type: attrs.type,
                        role: getTripleLabelRole(item.s),
                        table: table,
                    },
                });
            }
            if (item.o != "owl:NamedIndividual" && item.o != "owl:Class") {
                if (!existingNodes[oId]) {
                    existingNodes[oId] = 1;
                    var label = Sparql_common.getLabelFromURI(item.o);

                    var attrs = getNodeAttrs(item.o);
                    if (!attrs) {
                        return;
                    }
                    visjsData.nodes.push({
                        id: oId,
                        label: label,
                        shape: attrs.shape,
                        color: attrs.color,
                        font: attrs.shape == "box" ? { color: "white" } : { color: "black" },
                        size: Lineage_whiteboard.defaultShapeSize,
                        data: {
                            id: item.o,
                            label: label,
                            fileName: table,
                            type: attrs.type,
                            role: getTripleLabelRole(item.o),
                            table: table,
                        },
                    });
                }

                var edgeId = sId + item.p + oId;
                var label = Sparql_common.getLabelFromURI(item.p);
                if (label.endsWith("member")) {
                    var color = "#07b611";
                    var dashes = true;
                }
                if (!existingNodes[edgeId]) {
                    existingNodes[edgeId] = 1;
                    if (self.colorsMap[label]) {
                        color = self.colorsMap[label];
                    } else {
                        if (predicates[label] && self.colorsMap[predicates[label]]) {
                            color = self.colorsMap[predicates[label]];
                        }
                    }
                    visjsData.edges.push({
                        id: edgeId,
                        from: sId,
                        to: oId,
                        label: label,
                        color: color,
                        dashes: dashes,

                        // color: getNodeAttrs(item.o),
                        arrows: {
                            to: {
                                enabled: true,
                                type: Lineage_whiteboard.defaultEdgeArrowType,
                                scaleFactor: 0.5,
                            },
                        },
                    });
                } else {
                }
            }
            if (index == 0) {
                var edgeId = table + "_" + sId;
                var label = Sparql_common.getLabelFromURI(item.p);
                if (!existingNodes[edgeId]) {
                    existingNodes[edgeId] = 1;
                    visjsData.edges.push({
                        id: edgeId,
                        from: table,
                        to: sId,
                        //  label: label
                    });
                }
            }
        });

        var options = {
            onclickFn: self.onDetailedMappingsGraphClick,
            visjsOptions: {
                manipulation: {
                    enabled: false,
                },
            },
        };

        self.datatypeVisjsGraph = new VisjsGraphClass(divId, visjsData, options);
        self.datatypeVisjsGraph.draw();

        // self.showDetailedMappingsTree(column);
    };

    /**
     * Handles the click event on the detailed mappings graph.
     * Currently, it serves as a placeholder function for handling interactions with the graph.
     * @function
     * @name onDetailedMappingsGraphClick
     * @memberof module:MappingsDetails
     * @param {Object} obj - The clicked object details from the graph.
     * @param {Object} event - The event object triggered by the click.
     * @param {Object} options - Additional options for handling the click event.
     * @returns {void}
     */
    self.onDetailedMappingsGraphClick = function (obj, event, options) {};

    /**
     * Retrieves the RDF type of a column based on its connected edges in the graph.
     * Searches through the edges to find the rdf:type and returns the type if it's a valid URI.
     * @function
     * @name getColumnType
     * @memberof module:MappingsDetails
     * @param {string} nodeId - The ID of the node whose type is to be retrieved.
     * @returns {string|null} - The RDF type of the column if found, otherwise null.
     */
    self.getColumnType = function (nodeId) {
        var connections = MappingColumnsGraph.visjsGraph.getFromNodeEdgesAndToNodes(nodeId);
        var type = null;
        connections.forEach(function (connection) {
            if (connection.edge.data.type == "rdf:type" && connection.toNode.data.id.indexOf("http") > -1) {
                type = connection.toNode.data.id;
            }
        });
        return type;
    };

    /**
     * The transform module handles operations related to transforming columns in the mapping model.
     * It includes functions for displaying a dialog, creating prefix transformation functions, testing the transformation, and saving the transformation.
     *
     * @namespace transform
     * @memberof module:MappingsDetails
     */
    self.transform = {
        /**
         * Displays a dialog for transforming the selected column.
         * If no column is provided, it defaults to the currently selected column.
         * @function
         * @name showTansformDialog
         * @memberof module:MappingsDetails.transform
         * @param {string} [column] - The column to transform (optional).
         * @returns {void}
         */
        showTansformDialog: function (column, callback) {
            // return if  virtuals and rowIndex
            if (!column) {
                column = MappingColumnsGraph.currentGraphNode.label;
            }
            $("#smallDialogDiv").load("./modules/tools/mappingModeler/html/transformColumnDialog.html", function (err) {
                $("#smallDialogDiv").dialog("open");
                $("#smallDialogDiv").dialog("option", "title", "Transform for " + column);
                self.transformColumn = column;
                if (callback) {
                    callback();
                }
            });
        },

        /**
         * Creates a prefix transformation function and applies it to the selected column.
         * The user is prompted to enter a prefix, and the function is generated accordingly.
         *
         * @function
         * @name createPrefixTransformFn
         * @memberof module:MappingsDetails.transform
         *
         * @returns {void}
         */
        createPrefixTransformFn: function (prefix, options) {
            /*if (!MappingModeler.currentTreeNode) {
                var column_selected = '';
            } else {
                var column_selected = MappingColumnsGraph.currentGraphNode.label;
            }*/
            if (!options) {
                options = {};
            }

            if (!prefix) {
                prefix = prompt("Enter Prefix");
            }

            if (!prefix) {
                return;
            }
            prefix = prefix.replace(/[-_/]/g, "");

            var str = "if((mapping.isString||mapping.dataType) && role=='o') return value; else return '" + prefix + "-'+value;";

            $("#MappingModeler_fnBody").val(str);
            if (options.notDialog) {
                return str;
            }
        },

        /**
         * Tests the transformation function by applying it to a sample mapping.
         * It checks for any errors in the transformation code and then creates triples using the mapping.
         * @function
         * @name testTransform
         * @memberof module:MappingsDetails.transform
         * @returns {void}
         */
        testTransform: function () {
            //  display view sample triples with added transform for column mapping
            var transformFnStr = $("#MappingModeler_fnBody").val();

            transformFnStr = transformFnStr.replace(/"/g, "'");

            try {
                new Function("row", "mapping", transformFnStr);
            } catch (err) {
                return alert("error in function code " + err.message);
            }
            var transformFn = "function{" + transformFnStr + "}";
            var table = MappingModeler.currentTable.name;
            var mappings = MappingTransform.getSLSmappingsFromVisjsGraph(table);

            var filteredMapping = mappings.filter(function (mapping) {
                return mapping.s.replace("@", "").replace("_$", "").replace("_£", "") == self.transformColumn || mapping.o.replace("@", "").replace("_$", "").replace("_£", "") == self.transformColumn;
            });
            filteredMapping = filteredMapping.filter(function (mapping) {
                return mapping.p != "transform";
            });
            var mappingWithTransform = {};
            mappingWithTransform[MappingModeler.currentTable.name] = { tripleModels: filteredMapping, transform: {} };
            mappingWithTransform[MappingModeler.currentTable.name].transform[self.transformColumn] = transformFn;
            TripleFactory.createTriples(
                true,
                MappingModeler.currentTable.name,
                {
                    filteredMappings: mappingWithTransform,
                    table: MappingModeler.currentTable.name,
                },
                function (err, result) {},
            );
        },
        saveTransform: function (transformFnStr) {
            if (!transformFnStr) {
                transformFnStr = $("#MappingModeler_fnBody").val();
            }
            transformFnStr = transformFnStr.replace(/"/g, "'");

            try {
                new Function("row", "mapping", transformFnStr);
            } catch (err) {
                return alert("error in function code " + err.message);
            }
            var transformFn = "function{" + transformFnStr + "}";
            var nodes = MappingColumnsGraph.visjsGraph.data.nodes.get();
            var currentNode = nodes.filter(function (node) {
                return node.label == self.transformColumn && node.data.dataTable == MappingModeler.currentTable.name;
            })[0];
            currentNode.data.transform = transformFn;
            MappingColumnsGraph.updateNode(currentNode);

            var columnCheckNodeData = MappingsDetails.generateMappingsTreeData(self.transformColumn);

            MappingColumnsGraph.saveVisjsGraph(function () {
                self.showDetailedMappingsTree();
                $("#smallDialogDiv").dialog("close");
            });
        },
    };

    /**
     * modidies the label type of an edge in the visijs graph file
     *
     *
     * @param node
     */
    self.switchTypeToSubclass = function (node) {
        var edges = MappingColumnsGraph.visjsGraph.data.edges.get();

        edges.forEach(function (edge) {
            if (edge.from == node.id) {
                var nodeTo = MappingColumnsGraph.visjsGraph.data.nodes.get(edge.to);
                if (nodeTo && nodeTo.data.type == "Class") {
                    edge.label = node.data.rdfType == "owl:Class" ? "subClassOf" : "a";
                    edge.data.type = node.data.rdfType == "owl:Class" ? "rdfs:subClassOf" : "rdf:type";
                    MappingColumnsGraph.updateEdge(edge);
                }
            }
        });
    };
    self.onChangeUriType = function () {
        var uriType = $("#columnDetails-UriType").val();
        if (uriType == "fromLabel") {
            $("#columnDetails-baseUri").show();
            $("#columnDetails-baseUri-label").show();
            $("#columnDetails-prefixURI").show();
            $("#columnDetails-suffixURI").show();
            $("#columnDetails-prefixURI-label").show();
            $("#columnDetails-suffixURI-label").show();
        } else {
            $("#columnDetails-baseUri").hide();
            $("#columnDetails-baseUri-label").hide();
            $("#columnDetails-prefixURI").hide();
            $("#columnDetails-suffixURI").show();
            $("#columnDetails-prefixURI-label").hide();
            $("#columnDetails-suffixURI-label").hide();
        }
    };

    /**
     *  fill basigraphUri and prefix with same values found for the node class in other mappings
     * @param columnNodeId
     */
    self.setMappingDefaultFieds = function (columnNode) {
        var columnsClassMap = {};
        var columnClass = MappingColumnsGraph.getColumnClass(columnNode);
        if (columnClass) {
            MappingColumnsGraph.visjsGraph.data.nodes.get().forEach(function (node) {
                if (node.data && node.data.type == "Class" && node.data.id == columnClass) {
                    var sameClassColumns = MappingColumnsGraph.getClassColumns(node);
                    if (sameClassColumns) {
                        sameClassColumns.forEach(function (sameColumn) {
                            if (!$("#columnDetails-prefixURI").val() && sameColumn.data.prefixURI) {
                                $("#columnDetails-prefixURI").val(sameColumn.data.prefixURI);
                            }
                            if (!$("#columnDetails-suffixURI").val() && sameColumn.data.suffixURI) {
                                $("#columnDetails-suffixURI").val(sameColumn.data.suffixURI);
                            }
                            if ($(!"#columnDetails-baseURI").val() && sameColumn.data.baseURI) {
                                $("#columnDetails-baseURI").val(sameColumn.data.baseURI);
                            }
                        });
                    }
                }

                if (!$("#columnDetails-rdfsLabel").val()) {
                    $("#columnDetails-rdfsLabel").val(columnNode.data.label);
                }
            });
        }
    };

    self.isColumnAllreadyMappedInAnotherTable = function (columnNode, columnClass) {
        var table = false;

        var columnsClassMap = {};
        if (!columnClass) {
            columnClass = MappingColumnsGraph.getColumnClass(columnNode);
        }
        if (columnClass) {
            MappingColumnsGraph.visjsGraph.data.nodes.get().forEach(function (node) {
                if (node.data && node.data.type == "Class" && node.data.id == columnClass) {
                    var sameClassColumns = MappingColumnsGraph.getClassColumns(node);
                    if (sameClassColumns && sameClassColumns.length > 0) {
                        var stop = false;
                        sameClassColumns.forEach(function (column2) {
                            if (stop) {
                                return;
                            }
                            var table2 = column2.data.dataTable;
                            if (column2.data.isMainColumn && table2 != columnNode.data.dataTable) {
                                columnNode.data.definedInColumn = column2.id;
                                stop = true;
                                /*
                                  delete columnNode.data.uriType
                                  delete columnNode.data.baseURI
                                  delete columnNode.data.prefixURI
                                  delete columnNode.data.rdfType


                              }*/

                                table = table2;
                            } else {
                                if (columnNode.data.uriType) {
                                    columnNode.data.isMainColumn = true;
                                }
                            }
                        });
                    }
                }
            });
        }
        return table;
    };

    self.setIsMainColumnKey = function () {
        MappingColumnsGraph.visjsGraph.data.nodes.forEach(function (node) {
            if (node.data && node.data.type == "Column" && node.data.rdfsLabel) {
                node.data.isMainColumn = true;
            }
        });
    };

    return self;
})();

export default MappingsDetails;
window.window.MappingsDetails = MappingsDetails;
