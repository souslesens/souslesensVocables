import common from "../../shared/common.js";
import KGcreator from "../KGcreator/KGcreator.js";
import KGcreator_graph from "../KGcreator/KGcreator_graph.js";
import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import MappingModeler from "./mappingModeler.js";
import TripleFactory from "./tripleFactory.js";

var MappingsDetails = (function () {
    var self = {};
    var filterMappingIsSample;

    self.showDetailsDialog = function (divId) {
        if (!divId) {
            divId = "mainDialogDiv";
        }
        $("#mainDialogDiv").load("./modules/tools/mappingModeler/html/detailsDialog.html", function () {
            $("#mainDialogDiv").dialog("option", "title", "Detailed mappings : table " + MappingModeler.currentTable.name);

            //self.addRowClass();
            self.calculateColumnMappingsFromGraph();
            Object.keys(self.detailledDataMap).forEach(function (column) {
                self.addRowClass(column);
            });

            self.drawDetailedMappingsGraph();
            $("#mainDialogDiv").dialog("open");
            $("#mainDialogDiv").dialog({
                beforeClose: function () {
                    MappingsDetails.saveMappingsDetailsToVisjsGraph();
                    $("#mainDialogDiv").dialog({
                        beforeClose: function () {},
                    });
                },
            });
        });
    };

    self.calculateColumnMappingsFromGraph = function () {
        self.detailledDataMap = {};
        var graphNodes = MappingModeler.visjsGraph.data.nodes.get();
        var edges = MappingModeler.visjsGraph.data.edges.get();
        var notClassNodes = graphNodes.filter(function (item) {
            return item.data.type != "Class" && item.data.dataTable == MappingModeler.currentTable.name;
        });
        notClassNodes.forEach(function (item) {
            var Column = { id: item.id, label: item.data?.label };
            var typeId;

            if (edges.length > 0) {
                var typeEdgesColumn = edges.filter(function (edge) {
                    return edge.from == Column.id && edge.label == "a";
                });
                if (typeEdgesColumn.length > 0) {
                    typeId = typeEdgesColumn[0]?.to;
                }
            }

            if (typeId) {
                var type = graphNodes.filter(function (node) {
                    return node.id == typeId;
                })[0].data;
            }

            var properties;

            if (edges.length > 0) {
                properties = edges.filter(function (edge) {
                    return edge.from == Column.id && edge.label != "a";
                });
            }

            if (item.data.type == "RowIndex") {
                Column.label = "rowIndex";
            }
            if (!self.detailledDataMap[Column.label]) {
                self.detailledDataMap[Column.label] = {};
            }
            self.detailledDataMap[Column.label].type = type;
            self.detailledDataMap[Column.label].properties = properties;
            if (item.data.type == "VirtualColumn") {
                self.detailledDataMap[Column.label].isVirtualColumn = "true";
            }
            if (item.data.dataTable) {
                self.detailledDataMap[Column.label].dataTable = item.data.dataTable;
            }
        });
    };
    self.addRowClass = function (column) {
        var graphNodes = MappingModeler.visjsGraph.data.nodes.get();
        var currentGraphNode = graphNodes.filter(function (node) {
            return node.data.label == column && node.data.dataTable == MappingModeler.currentTable.name;
        })[0];

        if (currentGraphNode.data.type == "table") {
            return;
        }

        if (currentGraphNode.data.type == "URI") {
            return;
        }

        var html = `<tr><td><span id='class-column-${column}'> ${column} </span> </td>`;
        html += `<td><span id='class-type-${column}' >${self.detailledDataMap[column].type ? MappingModeler.allResourcesMap[self.detailledDataMap[column].type.id]?.label : "No Type"} </span></td>  `;
        html += `<td><select id='columnDetails-rdfType${column}' style='padding:6px 6px'> </select> </td> `;

        html += `<td><select id='columnDetails-rdfsLabel${column}' style='padding:6px 6px'> </select> </td>`;
        html += `<td><select id='columnDetails-UriType${column}' style='padding:6px 6px'> </select>  </td>`;
        html += `<td><button class='slsv-button-1' id='class-datatype-${column}' style='padding:6px 6px;margin:0px;' onclick='MappingsDetails.showSpecificMappingsBot("${column}")'> More mappings... </button> </td>  `;
        /*  html += `<td><button class='slsv-button-1' id='class-sample-${column}' style='padding:6px 6px;margin:0px;' onclick='MappingModeler.sampleData("${column}")'> Sample</button> </td>`
          html += `<td><button class='slsv-button-1' id='class-transform-${column}' style='padding:6px 6px;margin:0px;' onclick='MappingModeler.transformDialog("${column}")'> Fn</button> </td> `*/
        html += `<td><span id='class-column-${column}'> ${self.detailledDataMap[column].dataTable} </span> </tr> </td>`;

        $("#classesDefineTable").append(html);

        var URITType = ["fromLabel", "blankNode", "randomIdentifier"];
        //var rdfObjectsType = ["owl:NamedIndividual", "rdf:Bag", "owl:Class"];
        var rdfObjectsType = ["owl:NamedIndividual", "rdf:Bag", "owl:Class"];
        //  sort by similarity for others than rowIndex

        var columns = JSON.parse(JSON.stringify(MappingModeler.currentTable.columns));

        common.array.insertFirstArray(columns, column);
        if (currentGraphNode.data.rdfType) {
            common.array.insertFirstArray(rdfObjectsType, currentGraphNode.data.rdfType);
        }
        if (currentGraphNode.data.rdfType == "") {
            rdfObjectsType.unshift("");
        } else {
            rdfObjectsType.push("");
        }

        if (currentGraphNode.data.uriType) {
            common.array.insertFirstArray(URITType, currentGraphNode.data.uriType);
        }
        if (currentGraphNode.data.rdfsLabel) {
            common.array.insertFirstArray(columns, currentGraphNode.data.rdfsLabel);
        }
        if (currentGraphNode.data.rdfsLabel == "") {
            columns.unshift("");
        } else {
            columns.push("");
        }

        common.fillSelectOptions(`columnDetails-rdfsLabel${column}`, columns, false);
        common.fillSelectOptions(`columnDetails-rdfType${column}`, rdfObjectsType, false);
        common.fillSelectOptions(`columnDetails-UriType${column}`, URITType, false);
    };
    self.showSpecificMappingsBot = function (column) {
        var graphNodes = MappingModeler.visjsGraph.data.nodes.get();
        MappingModeler.currentGraphNode = graphNodes.filter(function (node) {
            return node.data.label == column && node.data.dataTable == MappingModeler.currentTable.name;
        })[0];

        var params = {
            source: MappingModeler.currentSource,
            columns: MappingModeler.currentTable.columns,
            title: "" + MappingModeler.currentTable.name,
            columnClass: MappingModeler.getColumnType(column),
        };

        MappingModeler_bot.start(MappingModeler_bot.workflowColumnmMappingOther, params, function (err, result) {
            var params = MappingModeler_bot.params;

            var data = MappingModeler.currentGraphNode.data;
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
                MappingModeler.updateNode({ id: MappingModeler.currentGraphNode.id, data: data });
                MappingModeler.saveVisjsGraph();
            } else if (params.nonObjectPropertyId) {
                data.otherPredicates.push({
                    property: params.nonObjectPropertyId,
                    object: params.predicateObjectColumn,
                    range: Config.ontologiesVocabularyModels[params.nonObjectPropertyVocab].nonObjectProperties[params.nonObjectPropertyId].range,
                    dateFormat: params.nonObjectPropertyDateFormat || null, //if any
                });
                MappingModeler.updateNode({ id: MappingModeler.currentGraphNode.id, data: data });
                MappingModeler.saveVisjsGraph();
            }
            self.showDetailsDialog();
            //self.drawDetailedMappingsGraph(column);
            /*    var data = self.mappingColumnEditor.get();
                   if (params.nonObjectPropertyId) {
                       if (!data.otherPredicates) {
                           data.otherPredicates = [];
                       }
                       data.otherPredicates.push({
                           property: params.nonObjectPropertyId,
                           object: params.predicateObjectColumn,
                           range: Config.ontologiesVocabularyModels[params.nonObjectPropertyVocab].nonObjectProperties[params.nonObjectPropertyId].range,
                           dateFormat: params.nonObjectPropertyDateFormat || null, //if any
                       });
                       MappingModeler.visjsGraph.data.nodes.update({id: MappingModeler.currentGraphNode.id, data: data});
                       //  self.mappingColumnInfo.editColumnInfos()
                       self.mappingColumnEditor = new JsonEditor("#mappingColumnJonEditor", data);
                       MappingsDetails.showDatatypeGraph(MappingModeler.currentGraphNode.label);
                   }*/
        });
    };
    self.sampleData = function (column) {
        if (!column) {
            return;
        }
        var mappings = MappingTransform.getSLSmappingsFromVisjsGraph()[MappingModeler.currentDataSource][MappingModeler.currentTable.name].tripleModels;

        var filteredMapping = mappings.filter(function (mapping) {
            return mapping.s.replaceAll("_$", "").replaceAll("_£", "").replaceAll("@", "") == column || mapping.o.replaceAll("_$", "").replaceAll("_£", "").replaceAll("@", "") == column;
        });
        //rajouter toutes les colonnes en lien avec celle la et mettre celle qui nous intéresse en premier

        MappingModeler.showSampleData(self.currentTreeNode, column);
    };

    self.saveMappingsDetailsToVisjsGraph = function () {
        var nodes = MappingModeler.visjsGraph.data.nodes.get();
        Object.keys(self.detailledDataMap).forEach(function (rowIndex) {
            var currentNode = nodes.filter(function (node) {
                return node.label == rowIndex && node.data.dataTable == MappingModeler.currentTable.name;
            })[0];

            currentNode.data.uriType = $("#columnDetails-UriType" + rowIndex).val();
            currentNode.data.rdfsLabel = $("#columnDetails-rdfsLabel" + rowIndex).val();
            currentNode.data.rdfType = $("#columnDetails-rdfType" + rowIndex).val();
            MappingModeler.updateNode(currentNode);
            self.switchTypeToSubclass(currentNode);
        });
        MappingModeler.saveVisjsGraph();
    };
    self.switchTypeToSubclass = function (node) {
        var nodes = MappingModeler.visjsGraph.data.nodes.get();
        var edges = MappingModeler.visjsGraph.data.edges.get();
        if (node.data.rdfType == "owl:Class") {
            var typeEdge = edges.filter(function (edge) {
                return edge.from == node.id && edge.label == "a";
            });
            if (typeEdge.length > 0) {
                typeEdge[0].label = "rdfs:subClassOf";
                typeEdge[0].data.type = "rdfs:subClassOf";
                typeEdge[0].data.id = "rdfs:subClassOf";
                MappingModeler.updateEdge(typeEdge[0]);
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
                        MappingModeler.updateEdge(typeEdge[0]);
                    }
                }
            }
        }
    };

    self.showDetailedMappingsList = function (column, divId, options) {
        if (!options) {
            options = {};
        }

        if (!divId) {
            divId = "detailedMappings_mappingsListDiv";
        }
        //datatypeMappingGraph
        var mappings = MappingTransform.getSLSmappingsFromVisjsGraph()[MappingModeler.currentTable.name].tripleModels;

        if (column) {
            mappings = mappings.filter(function (mapping) {
                return mapping.s.replaceAll("_$", "").replaceAll("_£", "").replaceAll("@", "") == column || mapping.o.replaceAll("_$", "").replaceAll("_£", "").replaceAll("@", "") == column;
            });
        }

        if (options.isFilterMapping) {
            var button = '<input type="checkbox" checked />';
        } else {
            var button = '<button class="slsv-invisible-button deleteIcon" style="margin-left: 10px" onclick="MappingsDetails.deleteTripleMapping(event)"></button>';
        }
        var data = mappings.map(function (mapping) {
            if (MappingModeler.allResourcesMap[mapping.o]) {
                mapping.o = MappingModeler.allResourcesMap[mapping.o].label;
            }

            return [button, mapping.s, mapping.p, mapping.o];
        });
        // add Transform to list so they can be showed and deleted
        var transform = MappingTransform.getSLSmappingsFromVisjsGraph()[MappingModeler.currentTable.name].transform;
        if (transform) {
            for (var key in transform) {
                data.push([button, key, "Transform", transform[key]]);
            }
        }

        var columns = [
            { title: options.isFilterMapping ? "Select" : "Delete", defaultContent: "", width: "10%" },
            { title: "Subject", defaultContent: "", width: "30%" },
            { title: "Predicate", defaultContent: "", width: "30%" },
            { title: "Object", defaultContent: "", width: "30%" },
        ];

        Export.showDataTable(divId, columns, data, null, { divId: divId }, function (err, result) {
            self.currentMappingsList = result;
            $("#dataTableDivExport_wrapper").css("overflow", "unset");
        });
        /*
        var html = "<table style='border: 1px'><tr>" + "<td style = 'width:100px' >Subject</td>" + "<td>Predicate</td>" + "<td>Object</td>" + "<td>other</td>" + "</tr>";
        mappings.forEach(function (mapping) {
            var other = "";
            html += "<tr>" + "<td>" + mapping.s + "</td>" + "<td>" + mapping.p + "</td>" + "<td>" + mapping.o + "</td>" + "<td>" + other + "</td>" + "</tr>";
        });
        html += "</table>";
        $("#" + divId).html(html);
        */
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

        mappings.forEach(function (item, index) {
            if (!item.s || !item.p || !item.o) {
                return alert("tripleModel is malformed " + JSON.stringify(item));
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

        self.showDetailedMappingsList(column);
    };
    self.deleteTripleMapping = function (event) {
        var row = $(event.target).closest("tr");
        var rowData = self.currentMappingsList.row(row).data();
        var nodes = MappingModeler.visjsGraph.data.nodes.get();
        var subject = rowData[1].replaceAll("_$", "").replaceAll("_£", "").replaceAll("@", "");
        var object = rowData[3].replaceAll("_$", "").replaceAll("_£", "").replaceAll("@", "");
        var predicate = rowData[2];
        var nodeSelected = nodes.filter(function (node) {
            return node.data.label == subject && node.data.dataTable == MappingModeler.currentTable.name;
        });
        if (nodeSelected.length > 0) {
            nodeSelected = nodeSelected[0];
        } else {
            return;
        }

        var isTripleDeleted = false;
        if (predicate.startsWith("function{")) {
            predicate = "function";
        }
        // rdfs:label and rdf:type (NamedIndividual or class) are details mappings properties included in node.data
        if (predicate == "rdfs:label") {
            if (nodeSelected.data.rdfsLabel) {
                nodeSelected.data.rdfsLabel = "";
                MappingModeler.updateNode(nodeSelected);
                isTripleDeleted = true;
            }
        }
        if (predicate == "Transform") {
            nodeSelected.data.transform = "";
            MappingModeler.updateNode(nodeSelected);
            isTripleDeleted = true;
        }
        /*if(predicate.startsWith('function{')){
            var edges = MappingModeler.visjsGraph.data.edges.get();

        }*/
        if (predicate == "rdf:type" && ["owl:Class", "owl:NamedIndividual"].includes(object)) {
            if (nodeSelected.data.rdfType) {
                nodeSelected.data.rdfType = "";
                MappingModeler.updateNode(nodeSelected);
                isTripleDeleted = true;
            }
        }
        // datatype Properties

        if (nodeSelected.data.otherPredicates && nodeSelected.data.otherPredicates.length > 0) {
            var datatypePropertiesNumber = nodeSelected.data.otherPredicates.length;
            //datatype Properties to keep
            nodeSelected.data.otherPredicates = nodeSelected.data.otherPredicates.filter(function (predicate) {
                return predicate.property != predicate && predicate.object != object;
            });
            if (datatypePropertiesNumber != nodeSelected.data.otherPredicates.length) {
                MappingModeler.updateNode(nodeSelected);
                isTripleDeleted = true;
            }
        }

        // Relations
        if (!isTripleDeleted) {
            var edges = MappingModeler.visjsGraph.data.edges.get();
            edges.forEach(function (edge) {
                if (edge.from == nodeSelected.id) {
                    var edgeToNode = nodes.filter(function (node) {
                        return node.id == edge.to;
                    });
                    if (edgeToNode.length > 0) {
                        edgeToNode = edgeToNode[0];
                        if (object == edgeToNode.label && edge.data.type == predicate) {
                            MappingModeler.removeEdge(edge.id);
                            isTripleDeleted = true;
                        }
                    }
                }
            });
        }
        // reload Details
        if (isTripleDeleted) {
            MappingModeler.saveVisjsGraph();
            MappingsDetails.showDetailsDialog();
        }
        //event.target
        console.log(event);
    };
    self.onDetailedMappingsGraphClick = function (obj, event, options) {};

    self.showTansformDialog = function (column) {
        // return if  virtuals and rowIndex
        if (!column) {
            column = MappingModeler.currentGraphNode.label;
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
        mappingWithTransform[MappingModeler.currentTable.name] = { tripleModels: filteredMapping, transform: {} };
        mappingWithTransform[MappingModeler.currentTable.name].transform[self.transformColumn] = transformFn;
        TripleFactory.createTriples(true, MappingModeler.currentTable.name, { mappingsFilterOption: mappingWithTransform, table: MappingModeler.currentTable.name }, function (err, result) {});
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
        var nodes = MappingModeler.visjsGraph.data.nodes.get();
        var currentNode = nodes.filter(function (node) {
            return node.label == self.transformColumn && node.data.dataTable == MappingModeler.currentTable.name;
        })[0];
        currentNode.data.transform = transformFn;
        MappingModeler.updateNode(currentNode);
        MappingModeler.saveVisjsGraph();
    };

    self.mappingColumnInfo = {
        editColumnInfos: function () {
            var data = MappingModeler.currentGraphNode.data;

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
                        MappingModeler.updateNode({
                            id: MappingModeler.currentGraphNode.id,
                            data: data,
                        });
                    self.mappingColumnInfo.editColumnInfos();
                    MappingsDetails.showDatatypeGraph(MappingModeler.currentGraphNode.label);
                });
            }

            // self.mappingColumnEditor = new JsonEditor("#mappingColumnJonEditor", data);
        },
        save: function () {
            var data = self.mappingColumnEditor.get();
            MappingModeler.currentGraphNode.data = data;
            MappingModeler.updateNode({ id: MappingModeler.currentGraphNode.id, data: data });
            MappingsDetails.switchTypeToSubclass(MappingModeler.currentGraphNode);
            $("#smallDialogDiv").dialog("close");
            MappingModeler.saveVisjsGraph();
            MappingsDetails.showDatatypeGraph(MappingModeler.currentGraphNode.label);
        },
    };

    self.showFilterMappingDialog = function (isSample) {
        self.filterMappingIsSample = isSample;

        $("#mainDialogDiv").load("./modules/tools/mappingModeler/html/filterMappingDialog.html", function () {
            $("#mainDialogDiv").dialog("option", "title", "Filter mappings : table " + MappingModeler.currentTable.name);
            $("#mainDialogDiv").dialog("open");
            self.showDetailedMappingsList(null, null, { isFilterMapping: true });
        });
    };

    self.validateFilterMapping = function () {
        var checkedRows = [];
        $("#detailedMappings_mappingsListDiv tbody tr").each(function () {
            if ($(this).find('input[type="checkbox"]').is(":checked")) {
                checkedRows.push($(this)); // Ajoute la ligne à la liste
            }
        });
        console.log(checkedRows);
        var triples = [];
        checkedRows.forEach((element) => {
            let data = self.currentMappingsList.row(element).data();
            let triple = {
                s: data[1], // Assuming subject is at index 1
                p: data[2], // Assuming predicate is at index 2
                o: data[3], // Assuming object is at index 3
            };
            triples.push(triple);
        });

        var currentMappingsList = {};
        currentMappingsList[MappingModeler.currentTable.name] = {
            tripleModels: triples,
        };

        if (self.filterMappingIsSample == undefined) {
            self.filterMappingIsSample = true;
        }
        TripleFactory.createTriples(self.filterMappingIsSample, MappingModeler.currentTable.name, { mappingsFilterOption: currentMappingsList }, function (err, result) {});
    };

    return self;
})();

export default MappingsDetails;
window.window.MappingsDetails = MappingsDetails;
