import common from "../../shared/common.js";
import KGcreator from "../KGcreator/KGcreator.js";
import KGcreator_graph from "../KGcreator/KGcreator_graph.js";
import VisjsGraphClass from "../../graph/VisjsGraphClass.js";


var MappingsDetails=(function(){
    var self={}

    self.showDetailsDialog = function (divId) {
        if (!divId) {
            divId = "mainDialogDiv";
        }
        $("#mainDialogDiv").load("./modules/tools/mappingModeler/html/detailsDialog.html", function () {
            $("#mainDialogDiv").dialog("open");
            $("#mainDialogDiv").dialog({
                beforeClose: function () {
                    MappingsDetails.saveMappingsDetailsToVisjsGraph();
                    $("#mainDialogDiv").dialog({
                        beforeClose: function () {
                        }
                    });
                }
            });
            //self.addRowClass();
            self.calculateColumnMappingsFromGraph();
            Object.keys(self.detailledDataMap).forEach(function (column) {
                self.addRowClass(column);
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
            var Column = {id: item.id, label: item.data?.label};

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
            return node.data.label == column;
        })[0];
        // columns depend on datasource
        // return if currentDatasource different of this Node
        if (currentGraphNode.data.dataTable != MappingModeler.currentTable.name) {
            return;
        }
        if(currentGraphNode.data.type=="table")
            return;

        if(currentGraphNode.data.type=="URI")
            return;


        var html = `<tr><td><span id='class-column-${column}'> ${column} </span> </td>`
        html += `<td><span id='class-type-${column}' >${self.detailledDataMap[column].type ? MappingModeler.allResourcesMap[self.detailledDataMap[column].type.id]?.label : 'No Type'} </span></td>  `
        html += `<td><select id='class-RDFType-${column}' style='padding:6px 6px'> </select> </td> `

        html += `<td><select id='class-label-${column}' style='padding:6px 6px'> </select> </td>`
        html += `<td><select id='class-URITType-${column}' style='padding:6px 6px'> </select>  </td>`
        html += `<td><button class='slsv-button-1' id='class-datatype-${column}' style='padding:6px 6px;margin:0px;' onclick='MappingsDetails.showSpecificMappingsBot("${column}")'> Datatype </button> </td>  `
        html += `<td><button class='slsv-button-1' id='class-sample-${column}' style='padding:6px 6px;margin:0px;' onclick='MappingModeler.sampleData("${column}")'> Sample</button> </td>`
        html += `<td><button class='slsv-button-1' id='class-transform-${column}' style='padding:6px 6px;margin:0px;' onclick='MappingModeler.transformDialog("${column}")'> Fn</button> </td> `
        html += `<td><span id='class-column-${column}'> ${self.detailledDataMap[column].dataTable} </span> </tr> </td>`

        $('#classesDefineTable').append(html);

        var URITType = ["fromLabel", "blankNode", "randomIdentifier"];
        //var rdfObjectsType = ["owl:NamedIndividual", "rdf:Bag", "owl:Class"];
        var rdfObjectsType = ["owl:NamedIndividual", "rdf:Bag", "owl:Class"];
        //  sort by similarity for others than rowIndex

        var columns = JSON.parse(JSON.stringify(MappingModeler.currentTable.columns));

        common.array.insertFirstArray(columns, column);
        if (currentGraphNode.data.rdfType) {
            common.array.insertFirstArray(rdfObjectsType, currentGraphNode.data.rdfType);
        }
        if (currentGraphNode.data.rdfType == '') {
            rdfObjectsType.unshift('');
        } else {
            rdfObjectsType.push('');
        }

        if (currentGraphNode.data.uriType) {
            common.array.insertFirstArray(URITType, currentGraphNode.data.uriType);
        }
        if (currentGraphNode.data.rdfsLabel) {
            common.array.insertFirstArray(columns, currentGraphNode.data.rdfsLabel);
        }
        if (currentGraphNode.data.rdfsLabel == '') {
            columns.unshift('');
        } else {
            columns.push('');
        }

        common.fillSelectOptions(`class-label-${column}`, columns, false);
        common.fillSelectOptions(`class-RDFType-${column}`, rdfObjectsType, false);
        common.fillSelectOptions(`class-URITType-${column}`, URITType, false);
    };
    self.showSpecificMappingsBot = function (column) {
        var graphNodes = MappingModeler.visjsGraph.data.nodes.get();
        self.currentGraphNode = graphNodes.filter(function (node) {
            return node.data.label == column;
        })[0];

        MappingModeler.mappingColumnInfo.startOtherPredicatesBot(self.currentGraphNode)
       // MappingModeler.graphActions.showNodeInfos( self.currentGraphNode);
    };
    self.sampleData = function (column) {
        if (!column) {
            return;
        }
        var mappings = MappingTransform.getSLSmappingsFromVisjsGraph()[MappingModeler.currentDataSource][MappingModeler.currentTable.name].tripleModels;

        var filteredMapping = mappings.filter(function (mapping) {
            return mapping.s.replaceAll("_$", "").replaceAll("_£").replaceAll("@", "") == column || mapping.o.replaceAll("_$", "").replaceAll("_£").replaceAll("@", "") == column;
        });
        //rajouter toutes les colonnes en lien avec celle la et mettre celle qui nous intéresse en premier

        KGcreator.showSampleData(self.currentTreeNode, column);
    };

    self.saveMappingsDetailsToVisjsGraph = function () {
        var nodes = MappingModeler.visjsGraph.data.nodes.get();
        Object.keys(self.detailledDataMap).forEach(function (rowIndex) {
            var currentNode = nodes.filter(function (node) {
                return node.label == rowIndex;
            })[0];

            currentNode.data.uriType = $("#class-URITType-" + rowIndex).val();
            currentNode.data.rdfsLabel = $("#class-label-" + rowIndex).val();
            currentNode.data.rdfType = $("#class-RDFType-" + rowIndex).val();
            MappingModeler.visjsGraph.data.nodes.update(currentNode);
            self.switchTypeToSubclass(currentNode);

        });
        MappingModeler.saveVisjsGraph();
    };
    self.switchTypeToSubclass = function (node) {
        var nodes = MappingModeler.visjsGraph.data.nodes.get();
        var edges = MappingModeler.visjsGraph.data.edges.get();
        if (node.data.rdfType == 'owl:Class') {
            var typeEdge = edges.filter(function (edge) {
                return edge.from == node.id && edge.label == "a";
            });
            if (typeEdge.length > 0) {
                typeEdge[0].label = 'rdfs:subClassOf';
                typeEdge[0].data.type = 'rdfs:subClassOf';
                typeEdge[0].data.id = 'rdfs:subClassOf';
                MappingModeler.visjsGraph.data.edges.update(typeEdge[0]);
            }

        } else {
            var typeEdge = edges.filter(function (edge) {
                return edge.from == node.id && edge.label == "rdfs:subClassOf";
            });
            if (typeEdge.length > 0) {
                // care to rdfs:subclassOf between two columns don't switch
                var edgeFrom = nodes.filter(function (node) {
                    return typeEdge[0].to == node.id
                });
                if (edgeFrom.length > 0) {
                    if (edgeFrom[0].data.type != 'Column') {
                        typeEdge[0].label = 'a'
                        typeEdge[0].data.type = 'rdf:type';
                        typeEdge[0].data.id = 'rdf:type';
                        MappingModeler.visjsGraph.data.edges.update(typeEdge[0]);
                    }

                }

            }

        }
    }

    self.showDatatypeGraph = function (column) {
        //datatypeMappingGraph
        var mappings = MappingTransform.getSLSmappingsFromVisjsGraph()[self.currentTable.name].tripleModels;


        var filteredMapping = mappings.filter(function (mapping) {
            return mapping.s.replaceAll("_$", "").replaceAll("_£").replaceAll("@", "") == column || mapping.o.replaceAll("_$", "").replaceAll("_£").replaceAll("@", "") == column;
        });

        self.currentMappings = {};
        self.currentMappings[MappingModeler.currentTreeNode.id] = filteredMapping;
        self.drawDatatypeGraphFromMappings(self.currentMappings, "technicalMappingColumnGraphDiv");

    };
    self.drawDatatypeGraphFromMappings = function (mappings, divId) {

        if (!divId) {
            divId = "technicalMappingColumnGraphDiv";
        }
        var sourceMappings = mappings;
        var visjsData = {nodes: [], edges: []};

        var existingNodes = {};
        var json = {};
        var shape = "box";
        for (var table in sourceMappings) {
            if (!existingNodes[table]) {
                existingNodes[table] = 1;
                /*visjsData.nodes.push({
                        id: table,
                        label: table,
                        shape: "ellipse",
                        size: Lineage_whiteboard.defaultShapeSize,
                        color: "#ddd",
                        data: {
                            id: table,
                            label: table,
                            fileName: table,
                            type: "table",
                        },
                    });*/
            }

            //var mappings = sourceMappings[table];
            var columns = MappingModeler.currentTable.columns;
            if (columns == undefined) {
                //There is a mapping for this column but the Table is not on db anymore
                continue;
            }

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

            json[table] = mappings[table];
            mappings[table].forEach(function (item, index) {
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
                            font: attrs.shape == "box" ? {color: "white"} : {color: attrs.color},
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
        }

   

        var options = {
            onclickFn: KGcreator_graph.onDetailedGraphNodeClick,
            visjsOptions: {
                manipulation: {
                    enabled: false,
                },
            },
        };

        self.datatypeVisjsGraph = new VisjsGraphClass(divId, visjsData, options);
        self.datatypeVisjsGraph.draw();
        
        $("#KGcreatorVisjsLegendCanvas").css("top", 0);
        $("#KGcreatorVisjsLegendCanvas").css("right", 200);
    };



    self.showTansformDialog = function (column) {
        // return if  virtuals and rowIndex
        if (!column) {
            column = self.currentGraphNode.label;
        }
        $("#smallDialogDiv").load("./modules/tools/mappingModeler/html/transformColumnDialog.html", function (err) {
            $("#smallDialogDiv").dialog("open");
            $("#smallDialogDiv").dialog("option", "title", "Transform for " + column);
            self.transformColumn = column;
        });
    };
    self.createPrefixTransformFn = function () {
        if (!self.currentTreeNode) {
            var column_selected = $("#KGcreator_transformColumnSelect").val();
        } else {
            var column_selected = self.currentTreeNode.data.id;
        }
        var prefix = prompt("Enter Prefix", column_selected);
        if (!prefix) {
            return;
        }
        var str = "if((mapping.isString||mapping.dataType) && role=='o') return value; else return '" + prefix + "-'+value;";
        $("#KGcreator_fnBody").val(str);
    };

    self.testTransform = function () {
        //  display view sample triples with added transform for column mapping
        var transformFnStr = $("#KGcreator_fnBody").val();

        transformFnStr = transformFnStr.replace(/"/g, "'");

        try {
            new Function("row", "mapping", transformFnStr);
        } catch (err) {
            return alert("error in function code " + err.message);
        }
        var transformFn = "function{" + transformFnStr + "}";
        var mappings = MappingTransform.getSLSmappingsFromVisjsGraph()[self.currentDataSource][self.currentTable.name].tripleModels;

        var filteredMapping = mappings.filter(function (mapping) {
            return mapping.s.replace("@", "").replace("_$", "").replace("_£", "") == self.transformColumn || mapping.o.replace("@", "").replace("_$", "").replace("_£", "") == self.transformColumn;
        });

        var mappingWithTransform = {};
        mappingWithTransform[MappingModeler.currentTable.name] = {tripleModels: filteredMapping, transform: {}};
        mappingWithTransform[MappingModeler.currentTable.name].transform[self.transformColumn] = transformFn;

        // get transform and add to filtered mapping
        // change select view sample triple then use it
        self.viewSampleTriples(mappingWithTransform);
    };
    self.saveTransform = function () {
        var transformFnStr = $("#KGcreator_fnBody").val();

        transformFnStr = transformFnStr.replace(/"/g, "'");

        try {
            new Function("row", "mapping", transformFnStr);
        } catch (err) {
            return alert("error in function code " + err.message);
        }
        var transformFn = "function{" + transformFnStr + "}";
        var nodes = MappingModeler.visjsGraph.data.nodes.get();
        var currentNode = nodes.filter(function (node) {
            return node.label == self.transformColumn;
        })[0];
        currentNode.data.transform = transformFn;
        self.visjsGraph.data.nodes.update(currentNode);
        MappingModeler.saveVisjsGraph();
    };
    
    
    return self;
    
    
    
})()

export default MappingsDetails
window.window.MappingsDetails=MappingsDetails
