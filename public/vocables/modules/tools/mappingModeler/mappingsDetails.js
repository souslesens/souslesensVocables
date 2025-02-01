import common from "../../shared/common.js";
import KGcreator from "../KGcreator/KGcreator.js";
import KGcreator_graph from "../KGcreator/KGcreator_graph.js";
import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import MappingModeler from "./mappingModeler.js";
import TripleFactory from "./tripleFactory.js";
import MappingTransform from "./mappingTransform.js";
import UIcontroller from "./uiController.js";

/**
 * MappingsDetails manages technical mappings (non structural mappings)
 *
 *
 * @module MappingsDetails
 * @type {{}}
 */
var MappingsDetails = (function () {
        var self = {};
        var filterMappingIsSample;

        self.showDetailsDialog = function (divId) {
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
        self.showDetailedMappingsTree = function (column, divId, _options) {
            if (!_options) {
                _options = {};
            }

            if (!divId) {
                divId = "detailedMappings_jsTreeDiv";
            }


            var table = MappingModeler.currentTable.name

            if (!table) {
                table = MappingModeler.currentTable.name;
            }

            var nodes = MappingColumnsGraph.visjsGraph.data.nodes.get();

            var columnsMap = {};
            var jstreeData = [];
            var uniqueSubjects = {};
            var buttonStr = "<img src='icons\\KGA\\MoreOptionsIcon-KGA.png' onClick=''>";


            jstreeData.push({
                id: MappingModeler.currentTable.name,
                text: "<b>" + MappingModeler.currentTable.name + "</b>",
                data: {},
                parent: "#",
            });


            nodes.forEach(function (node) {

                    if (node.data.dataTable !== table) {
                        return;
                    }
                    if (node.data.type == "Class") {
                        return;
                    }
                    if (node.data.type == "table") {
                        return;
                    }


                    if (!uniqueSubjects[node.label]) {
                        uniqueSubjects[node.label] = 1;
                        jstreeData.push({
                            id: node.id,
                            text: "<span style='background-color: #cb9801;padding: 3px;border-radius: 7px;'>" + node.label + "</span>&nbsp;" + buttonStr,
                            data: node.data,
                            parent: MappingModeler.currentTable.name,
                        });

                        var predicates = {
                            "rdfType": "rdf:type",
                            rdfsLabel: "rdfs:label",
                            uriType: "uri Type"
                        }
                        for (var key in node.data) {
                            if (predicates[key]) {
                                jstreeData.push({
                                    id: node.id + "|" + key + "|" + node.data[key],
                                    text: "<span style='color: blue'>" + key + "</span>  " + node.data[key],
                                    parent: node.id,
                                });
                            }
                        }

                        if (node.data.otherPredicates) {
                            node.data.otherPredicates.forEach(function (item) {
                                jstreeData.push({
                                    id: node.id + "|" + "otherPredicates" + "|" + item.property + "|" + item.object,
                                    text: "<span style='color: blue'>" + item.property + "</span>  " + item.object,
                                    parent: node.id,
                                });


                            })
                        }
                    }


                }
            )


            var options = {
                searchPlugin: true,
                openAll: true,
                selectTreeNodeFn: self.onSelectTreeNode,
                contextMenu: function (node) {
                    var items = {};
                    if (_options.withoutContextMenu) {
                        return;
                    }
                    if (node.parents.length == 3) {//only for node data
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

            JstreeWidget.loadJsTree(divId, jstreeData, options);
        }

        self.showSpecificMappingsBot = function (column) {
            MappingColumnsGraph.currentGraphNode = MappingColumnsGraph.visjsGraph.data.nodes.get(MappingsDetails.currentTreeNode.id)

            var params = {
                source: MappingModeler.currentSource,
                columns: MappingModeler.currentTable.columns,
                title: "" + MappingModeler.currentTable.name,
                columnClass: MappingModeler.getColumnType(column),
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
                    MappingColumnsGraph.updateNode({id: MappingColumnsGraph.currentGraphNode.id, data: data});
                    MappingColumnsGraph.saveVisjsGraph();
                } else if (params.addingSubClassOf) {
                    data.otherPredicates.push({
                        property: "rdfs:subClassOf",
                        object: params.addingSubClassOf,
                    });
                    MappingColumnsGraph.updateNode({id: MappingColumnsGraph.currentGraphNode.id, data: data});
                    MappingColumnsGraph.saveVisjsGraph();
                } else if (params.nonObjectPropertyId) {
                    var range = params.datatypePropertyRange || Config.ontologiesVocabularyModels[params.nonObjectPropertyVocab].nonObjectProperties[params.nonObjectPropertyId].range;
                    data.otherPredicates.push({
                        property: params.nonObjectPropertyId,
                        object: params.predicateObjectColumn,
                        range: range,
                        dateFormat: params.nonObjectPropertyDateFormat || null, //if any
                    });
                    MappingColumnsGraph.updateNode({id: MappingColumnsGraph.currentGraphNode.id, data: data});
                    MappingColumnsGraph.saveVisjsGraph();
                }
                self.showDetailsDialog();
            });
        };

        self.saveMappingsDetailsToVisjsGraph = function () {
            if (!MappingsDetails.currentTreeNode) {
                return;
            }
            var currentGraphNode = MappingColumnsGraph.visjsGraph.data.nodes.get(MappingsDetails.currentTreeNode.id)
            if (!currentGraphNode) {
                return alert("no current graphNode ");
            }
            currentGraphNode.data.uriType = $("#columnDetails-UriType").val();
            currentGraphNode.data.rdfsLabel = $("#columnDetails-rdfsLabel").val();
            currentGraphNode.data.rdfType = $("#columnDetails-rdfType").val();
            MappingColumnsGraph.updateNode(currentGraphNode);
            self.switchTypeToSubclass(currentGraphNode);
            // });
            MappingColumnsGraph.saveVisjsGraph();
        };


        self.deleteMappingInVisjsNode = function (treeNode) {


            var array = treeNode.id.split("|")

            var graphNode = MappingColumnsGraph.visjsGraph.data.nodes.get(array[0]);

            if (array.length == 3) {
                for (var key in graphNode.data) {
                    if (key == array[1] && graphNode.data[key] === array[2]) {
                        delete graphNode.data[key];
                    }
                }

            } else if (array.length == 4) {//otherPredicates
                graphNode.data.otherPredicates.forEach(function (item, index) {
                    if (item.property == array[2] && item.object == array[3]) {
                        graphNode.data.otherPredicates.splice(index, 1)
                    }

                })

            }

            JstreeWidget.deleteNode("detailedMappings_jsTreeDiv", treeNode);
            self.drawDetailedMappingsGraph();


        };

        self.onSelectTreeNode = function (event, obj) {
            self.currentTreeNode = obj.node;

            if (obj.node.parent == MappingModeler.currentTable.name) {//column node
                self.showTechnicalMappingsDialog(obj.node.id);
                MappingModeler.currentTreeNode = MappingColumnsGraph.visjsGraph.data.nodes.get(obj.node.id);
            } else {
                MappingModeler.currentTreeNode = null;
            }
        };

        self.showTechnicalMappingsDialog = function (column) {

            var currentTreeNode = self.currentTreeNode;
            var html = `<tr><td>Table column</td><td><span id='class-column' ><b> ${currentTreeNode.text} </b></span> </td></tr>`;
            html += `<tr><td>URI syntax*</td><td><select id='columnDetails-UriType' style='padding:6px 6px'> </select>  </td></tr>`;
            html += `<tr><td>rdf:type*</td><td><select id='columnDetails-rdfType' style='padding:6px 6px'> </select> </td></tr> `;

            html += `<tr><td>rdfs:label column</td><td><select id='columnDetails-rdfsLabel' style='padding:6px 6px'> </select> </td></tr>`;
            html += `<td><button class='slsv-button-1' id='class-datatype' style='padding:6px 6px;margin:0px;' onclick='MappingsDetails.showSpecificMappingsBot("${column}")'> More mappings... </button> </td>  `;
            html += `<td><button class='slsv-button-1' id='class-datatype' style='padding:6px 6px;margin:0px;' onclick='MappingsDetails.saveMappingsDetailsToVisjsGraph(); MappingsDetails.showDetailsDialog()'> Save </button> </td>  `;

            $("#detailedMappings_techDetailsDiv").html(html);

            var URITType = ["fromLabel", "blankNode", "randomIdentifier"];

            var rdfObjectsType = ["owl:NamedIndividual", "rdf:Bag", "owl:Class"];

            //  sort by similarity for others than rowIndex

            var columns = JSON.parse(JSON.stringify(MappingModeler.currentTable.columns));
            columns.unshift("");
            common.array.moveItemToFirst(columns, column);
            if (currentTreeNode.data.rdfType) {
                common.array.moveItemToFirst(rdfObjectsType, currentTreeNode.data.rdfType);
            }
            if (currentTreeNode.data.rdfType == "") {
                rdfObjectsType.unshift("");
            } else {
                rdfObjectsType.push("");
            }

            if (currentTreeNode.data.uriType) {
                common.array.moveItemToFirst(URITType, currentTreeNode.data.uriType);
            }
            if (currentTreeNode.data.rdfsLabel) {
                common.array.moveItemToFirst(columns, currentTreeNode.data.rdfsLabel);
            }
            /* if (currentTreeNode.data.rdfsLabel == "") {
                 columns.unshift("");
             } else {
                 columns.push("");
             }*/
            common.fillSelectOptions(`columnDetails-rdfsLabel`, columns, false);
            common.fillSelectOptions(`columnDetails-rdfType`, rdfObjectsType, false);
            common.fillSelectOptions(`columnDetails-UriType`, URITType, false);
        };

        self.drawDetailedMappingsGraph = function (column) {
            //datatypeMappingGraph
            var mappings = MappingTransform.getSLSmappingsFromVisjsGraph()[MappingModeler.currentTable.name].tripleModels;

            if (column) {
                mappings = mappings.filter(function (mapping) {
                    return mapping.s.replaceAll("_$", "").replaceAll("_£", "").replaceAll("@", "") == column || mapping.o.replaceAll("_$", "").replaceAll("_£", "").replaceAll("@", "") == column;
                });
            }

            var divId = "detailedMappingsGraphDiv";

            var visjsData = {nodes: [], edges: []};

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

            mappings.forEach(function (item, index) {
                if (!item.s || !item.p || !item.o) {
                    return alert("tripleModel is malformed " + JSON.stringify(item));
                }

                function getNodeAttrs(str) {
                    if (str.indexOf("http") > -1) {
                        return {type: "Class", color: "#00afef", shape: "box", size: 30};
                    } else if (str.indexOf(":") > -1) {
                        drawRelation = false; //rdf Bag
                        return null;
                        return {type: "OwlType", color: "#aaa", shape: "ellipse"};
                    } else if (str.endsWith("_$")) {
                        return {type: "blankNode", color: "#00afef", shape: "square"};
                    } else if (str.indexOf("_rowIndex") > -1) {
                        return {type: "rowIndex", color: "#f90edd", shape: "star"};
                    } else {
                        drawRelation = false;
                        return {type: "Column", color: "#cb9801", shape: "ellipse"};
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
                            font: attrs.shape == "box" ? {color: "white"} : {color: "black"},
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

        self.onDetailedMappingsGraphClick = function (obj, event, options) {
        };

        self.showTansformDialog = function (column) {
            // return if  virtuals and rowIndex
            if (!column) {
                column = MappingColumnsGraph.currentGraphNode.label;
            }
            $("#smallDialogDiv").load("./modules/tools/mappingModeler/html/transformColumnDialog.html", function (err) {
                $("#smallDialogDiv").dialog("open");
                $("#smallDialogDiv").dialog("option", "title", "Transform for " + column);
                self.transformColumn = column;
            });
        };
        self.createPrefixTransformFn = function () {
            if (!MappingModeler.currentTreeNode) {
                var column_selected = $("#KGcreator_transformColumnSelect").val();
            } else {
                var column_selected = MappingModeler.currentTreeNode.data.id;
            }
            var prefix = prompt("Enter Prefix", column_selected);
            if (!prefix) {
                return;
            }
            var str = "if((mapping.isString||mapping.dataType) && role=='o') return value; else return '" + prefix + "-'+value;";
            $("#MappingModeler_fnBody").val(str);
        };

        self.testTransform = function () {
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
            var mappings = MappingTransform.getSLSmappingsFromVisjsGraph(table)[table].tripleModels;

            var filteredMapping = mappings.filter(function (mapping) {
                return mapping.s.replace("@", "").replace("_$", "").replace("_£", "") == self.transformColumn || mapping.o.replace("@", "").replace("_$", "").replace("_£", "") == self.transformColumn;
            });

            var mappingWithTransform = {};
            mappingWithTransform[MappingModeler.currentTable.name] = {tripleModels: filteredMapping, transform: {}};
            mappingWithTransform[MappingModeler.currentTable.name].transform[self.transformColumn] = transformFn;
            TripleFactory.createTriples(
                true,
                MappingModeler.currentTable.name,
                {
                    filteredMappings: mappingWithTransform,
                    table: MappingModeler.currentTable.name,
                },
                function (err, result) {
                }
            );
        };
        self.saveTransform = function () {
            var transformFnStr = $("#MappingModeler_fnBody").val();

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
            MappingColumnsGraph.saveVisjsGraph();
        };

        self.mappingColumnInfo = {
            editColumnInfos: function () {
                var data = MappingColumnsGraph.currentGraphNode.data;

                if (!data.uriType) {
                    // showBot
                    var params = {
                        title: "" + data.label,
                        columns: MappingModeler.currentTable.columns,
                    };

                    MappingModeler_bot.start(MappingModeler_bot.workflowMappingDetail, params, function (err, result) {
                        var params = MappingModeler_bot.params;
                        data.uriType = params.URItype;
                        data.rdfType = params.rdfType;
                        (data.rdfsLabel = params.rdfsLabel),
                            MappingColumnsGraph.updateNode({
                                id: MappingColumnsGraph.currentGraphNode.id,
                                data: data,
                            });
                        self.mappingColumnInfo.editColumnInfos();
                        MappingsDetails.showDatatypeGraph(MappingColumnsGraph.currentGraphNode.label);
                    });
                }

                // self.mappingColumnEditor = new JsonEditor("#mappingColumnJonEditor", data);
            },
            save: function () {
                var data = self.mappingColumnEditor.get();
                MappingColumnsGraph.currentGraphNode.data = data;
                MappingColumnsGraph.updateNode({id: MappingColumnsGraph.currentGraphNode.id, data: data});
                MappingsDetails.switchTypeToSubclass(MappingColumnsGraph.currentGraphNode);
                $("#smallDialogDiv").dialog("close");
                MappingColumnsGraph.saveVisjsGraph();
                MappingsDetails.showDatatypeGraph(MappingColumnsGraph.currentGraphNode.label);
            },
        };


        self.switchTypeToSubclass = function (node) {
            var nodes = MappingColumnsGraph.visjsGraph.data.nodes.get();
            var edges = MappingColumnsGraph.visjsGraph.data.edges.get();
            if (node.data.rdfType == "owl:Class") {
                var typeEdge = edges.filter(function (edge) {
                    return edge.from == node.id && edge.label == "a";
                });
                if (typeEdge.length > 0) {
                    typeEdge[0].label = "rdfs:subClassOf";
                    typeEdge[0].data.type = "rdfs:subClassOf";
                    typeEdge[0].data.id = "rdfs:subClassOf";
                    MappingColumnsGraph.updateEdge(typeEdge[0]);
                }
            } else {
                var typeEdge = edges.filter(function (edge) {
                    return edge.from == node.id && edge.label == "rdfs:subClassOf";
                });
                if (typeEdge.length > 0) {
                    // care to rdfs:subclassOf between two columns don't switch
                    var edgeFrom = nodes.filter(function (node) {
                        return typeEdge[0].to == node.id;
                    });
                    if (edgeFrom.length > 0) {
                        if (edgeFrom[0].data.type != "Column") {
                            typeEdge[0].label = "a";
                            typeEdge[0].data.type = "rdf:type";
                            typeEdge[0].data.id = "rdf:type";
                            MappingColumnsGraph.updateEdge(typeEdge[0]);
                        }
                    }
                }
            }
        };


        return self;
    }
)
();

export default MappingsDetails;
window.window.MappingsDetails = MappingsDetails;
