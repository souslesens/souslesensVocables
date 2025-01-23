import common from "../../shared/common.js";
import KGcreator from "../KGcreator/KGcreator.js";
import KGcreator_graph from "../KGcreator/KGcreator_graph.js";
import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import MappingModeler from "./mappingModeler.js";
import TripleFactory from "./tripleFactory.js";
import MappingTransform from "./mappingTransform.js";

var MappingsDetails = (function () {
    var self = {};
    var filterMappingIsSample;

    self.showDetailsDialog = function (divId) {
        if (!MappingModeler.currentTable) {
            return alert("Select a table")
        }
        if (!divId) {
            divId = "mainDialogDiv";
        }
        $("#mainDialogDiv").load("./modules/tools/mappingModeler/html/detailsDialog.html", function () {
            $("#mainDialogDiv").dialog("option", "title", "Detailed mappings : table " + MappingModeler.currentTable.name);

            //self.addRowClass();
            /*    self.calculateColumnMappingsFromGraph();
                Object.keys(self.detailledDataMap).forEach(function (column) {
                    self.addRowClass(column);
                });*/

            self.drawDetailedMappingsGraph();
            $("#detailedMappings_searchInput").bind("keydown", null, function () {
                if (event.keyCode != 13 && event.keyCode != 9) {
                    return;
                }
                var value = $(this).val();
                $("#detailedMappings_jsTreeDiv")
                    .jstree(true)
                    .search(value);
            });
            $("#mainDialogDiv").dialog("open");
            $("#mainDialogDiv").dialog({
                beforeClose: function () {
                    MappingsDetails.saveMappingsDetailsToVisjsGraph();
                    $("#mainDialogDiv").dialog({
                        beforeClose: function () {
                        },
                    });
                },
            });
        });
    };


    /*   self.addRowClass = function (column) {
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
    /*  html += `<td><span id='class-column-${column}'> ${self.detailledDataMap[column].dataTable} </span> </tr> </td>`;

      $("#classesDefineTable").append(html);

      var URITType = ["fromLabel", "blankNode", "randomIdentifier"];
      //var rdfObjectsType = ["owl:NamedIndividual", "rdf:Bag", "owl:Class"];
      var rdfObjectsType = ["owl:NamedIndividual", "rdf:Bag", "owl:Class"];
      //  sort by similarity for others than rowIndex

      var columns = JSON.parse(JSON.stringify(MappingModeler.currentTable.columns));

      common.array.moveItemToFirst(columns, column);
      if (currentGraphNode.data.rdfType) {
          common.array.moveItemToFirst(rdfObjectsType, currentGraphNode.data.rdfType);
      }
      if (currentGraphNode.data.rdfType == "") {
          rdfObjectsType.unshift("");
      } else {
          rdfObjectsType.push("");
      }

      if (currentGraphNode.data.uriType) {
          common.array.moveItemToFirst(URITType, currentGraphNode.data.uriType);
      }
      if (currentGraphNode.data.rdfsLabel) {
          common.array.moveItemToFirst(columns, currentGraphNode.data.rdfsLabel);
      }
      if (currentGraphNode.data.rdfsLabel == "") {
          columns.unshift("");
      } else {
          columns.push("");
      }

      common.fillSelectOptions(`columnDetails-rdfsLabel${column}`, columns, false);
      common.fillSelectOptions(`columnDetails-rdfType${column}`, rdfObjectsType, false);
      common.fillSelectOptions(`columnDetails-UriType${column}`, URITType, false);
  };*/

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
                MappingModeler.updateNode({id: MappingModeler.currentGraphNode.id, data: data});
                MappingModeler.saveVisjsGraph();
            } else if (params.addingSubClassOf) {
                data.otherPredicates.push({
                    property: "rdfs:subClassOf",
                    object: params.addingSubClassOf,
                });
                MappingModeler.updateNode({id: MappingModeler.currentGraphNode.id, data: data});
                MappingModeler.saveVisjsGraph();
            } else if (params.nonObjectPropertyId) {
                data.otherPredicates.push({
                    property: params.nonObjectPropertyId,
                    object: params.predicateObjectColumn,
                    range: Config.ontologiesVocabularyModels[params.nonObjectPropertyVocab].nonObjectProperties[params.nonObjectPropertyId].range,
                    dateFormat: params.nonObjectPropertyDateFormat || null, //if any
                });
                MappingModeler.updateNode({id: MappingModeler.currentGraphNode.id, data: data});
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
        if (!self.currentTreeNode) {
            return;
        }
        var currentNode = MappingModeler.getVisjsTreeNodeById(self.currentTreeNode.id)
        if (!currentNode) {
            return;
        }
        currentNode.data.uriType = $("#columnDetails-UriType").val();
        currentNode.data.rdfsLabel = $("#columnDetails-rdfsLabel").val();
        currentNode.data.rdfType = $("#columnDetails-rdfType").val();
        MappingModeler.updateNode(currentNode);
        self.switchTypeToSubclass(currentNode);
        // });
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

    self.showDetailedMappingsTree = function (column, divId, _options) {
        if (!_options) {
            _options = {};
        }

        if (!divId) {
            divId = "detailedMappings_jsTreeDiv";
        }
        //datatypeMappingGraph
        var mappings = MappingTransform.getSLSmappingsFromVisjsGraph()[MappingModeler.currentTable.name].tripleModels;


        var jstreeData = [];
        var uniqueSubjects = {}
        mappings.forEach(function (mapping) {
            var parent = "#"
            var buttonStr = "<img src='icons\\KGA\\MoreOptionsIcon-KGA.png' onClick=''>"
            // var buttonStr="<button class='jstreelabelButton' onClick='MappingDetails.showTechnicalMappingsDialog()'>+</button>"
            if (!uniqueSubjects[mapping.s]) {
                uniqueSubjects[mapping.s] = 1
                jstreeData.push({
                    id: mapping.s,
                    text: "<span style='background-color: #cb9801;padding: 3px;border-radius: 7px;'>" + mapping.s + "</span>&nbsp;" + buttonStr,
                    data: mapping,
                    parent: "#"
                })

            }
            var mappingOstr = mapping.o
//mappingOstr="<select id=\"columnDetails-UriTypeFailureConsequence\" style=\"padding:6px 6px\"> <option value=\"fromLabel\">fromLabel</option><option value=\"blankNode\">blankNode</option><option value=\"randomIdentifier\">randomIdentifier</option></select>"
            parent = mapping.s;
            jstreeData.push({
                id: common.getRandomHexaId(5),
                text: "<span style='color: blue'>" + mapping.p + "</span>  " + mappingOstr,
                parent: parent,
                data: mapping
            })
        })
        var options = {
            searchPlugin: true,
            openAll: true,
            selectTreeNodeFn: self.onSelectTreeNode,
            contextMenu: function (node) {

                var items = {};
                if (_options.withoutContextMenu) {
                    return
                }
                if (node.parent == "#") {
                    items["technical mappings"] = {
                        label: "technicalMappings",
                        action: function (_e) {

                            MappingsDetails.showTechnicalMappingsDialog(node.data.s)
                        },
                    };
                    items["moreMappings"] = {
                        label: "moreMappings",
                        action: function (_e) {
                            var vijsNode = MappingsDetails.showSpecificMappingsBot(node.data.s)
                        },
                    };
                } else {
                    items["deletemapping"] = {
                        label: "delete",
                        action: function (_e) {
                            var node = MappingsDetails.deleteMappingInVisjsNode(self.currentTreeNode.data)
                        },
                    };
                    items["isRestriction"] = {
                        label: "isRestriction",
                        action: function (_e) {

                        },
                    }
                }
                ;
                return items;
            }


        }

        options.withCheckboxes = _options.withCheckboxes
        options.openAll = _options.openAll || true

        JstreeWidget.loadJsTree(divId, jstreeData, options)


    }
    self.deleteMappingInVisjsNode = function (mapping) {


        var nodes = MappingModeler.visjsGraph.data.nodes.get()
        var nodeIdToDelete = null;
        nodes.forEach(function (node) {
            if (node.data.type == "Column" && mapping.s == node.data.id) {
                if (mapping.p == "rdf:type" && node.data.rdfType == mapping.o) {
                    nodeIdToDelete = node.id
                    delete node.data.rdfType
                    MappingModeler.updateNode(node)

                }
                if (mapping.p == "rdfs:label" && node.data.rdfsLabel == mapping.o) {
                    nodeIdToDelete = node.id
                    delete node.data.rdfsLabel
                    MappingModeler.updateNode(node)
                } else {
                    //cannot delete node
                }


            }

            if (node.data.otherPredicates) {
                node.data.otherPredicates.forEach(function (item, index) {

                    if (item.property == mapping.p && item.object == mapping.o) {
                        nodeIdToDelete = node.id
                        node.data.otherPredicates.splice(index, 1)
                        MappingModeler.updateNode(node)

                    }
                })
            }
        })

        if (nodeIdToDelete) {
            JstreeWidget.deleteNode("detailedMappings_jsTreeDiv", self.currentTreeNode.id)
        } else {
            /*   var edges = MappingModeler.visjsGraph.data.edges.get()

               edges.forEach(function (edge) {
                   var nodeFrom = MappingModeler.visjsGraph.data.nodes.get(edge.from)
                   var nodeTo = MappingModeler.visjsGraph.data.nodes.get(edge.to)
                   if (!nodeFrom || !nodeTo)
                       return
                   if (nodeFrom.data && nodeFrom.data.id == mapping.s) {
                       if (edge.data.type == mapping.p && nodeTo.data.id == mapping.o) {
                           MappingModeler.removeEdge(edge)
                           nodeIdToDelete = true
                       }
                   }
               })*/

            if (!nodeIdToDelete) {
                alert("cannot delete node here")
            }
        }


    }

    self.onSelectTreeNode = function (event, obj) {

        self.currentTreeNode = obj.node
        if (obj.node.parents == "#") {
            self.showTechnicalMappingsDialog(obj.node.id)
        }
    }

    self.showTechnicalMappingsDialog = function (column) {

        /*  var graphNodes = MappingModeler.visjsGraph.data.nodes.get();
          var currentGraphNode = graphNodes.filter(function (node) {
              return node.data.label == column && node.data.dataTable == MappingModeler.currentTable.name;
          })[0];*/

        var currentGraphNode = self.currentTreeNode
        var html = `<tr><td>Table column</td><td><span id='class-column' ><b> ${column} </b></span> </td></tr>`;
        //  html += `<td><span id='class-type-${column}' >${self.detailledDataMap[column].type ? MappingModeler.allResourcesMap[self.detailledDataMap[column].type.id]?.label : "No Type"} </span></td>  `;
        html += `<tr><td>URI syntax*</td><td><select id='columnDetails-UriType' style='padding:6px 6px'> </select>  </td></tr>`;
        html += `<tr><td>rdf:type*</td><td><select id='columnDetails-rdfType' style='padding:6px 6px'> </select> </td></tr> `;

        html += `<tr><td>columln for rdfs:label</td><td><select id='columnDetails-rdfsLabel' style='padding:6px 6px'> </select> </td></tr>`;
        html += `<td><button class='slsv-button-1' id='class-datatype' style='padding:6px 6px;margin:0px;' onclick='MappingsDetails.showSpecificMappingsBot("${column}")'> More mappings... </button> </td>  `;
        html += `<td><button class='slsv-button-1' id='class-datatype' style='padding:6px 6px;margin:0px;' onclick='MappingsDetails.saveMappingsDetailsToVisjsGraph(); MappingsDetails.showDetailsDialog()'> Save </button> </td>  `;


        /*   $("#smallDialogDiv").dialog("open")
               $("#smallDialogDiv").dialog("option","title","Technical Mappings")
               $("#smallDialogDiv").html(html)*/
        $("#detailedMappings_techDetailsDiv").html(html)

        var URITType = ["fromLabel", "blankNode", "randomIdentifier"];
        //var rdfObjectsType = ["owl:NamedIndividual", "rdf:Bag", "owl:Class"];
        var rdfObjectsType = ["owl:NamedIndividual", "rdf:Bag", "owl:Class"];
        //  sort by similarity for others than rowIndex

        var columns = JSON.parse(JSON.stringify(MappingModeler.currentTable.columns));

        common.array.moveItemToFirst(columns, column);
        if (currentGraphNode.data.rdfType) {
            common.array.moveItemToFirst(rdfObjectsType, currentGraphNode.data.rdfType);
        }
        if (currentGraphNode.data.rdfType == "") {
            rdfObjectsType.unshift("");
        } else {
            rdfObjectsType.push("");
        }

        if (currentGraphNode.data.uriType) {
            common.array.moveItemToFirst(URITType, currentGraphNode.data.uriType);
        }
        if (currentGraphNode.data.rdfsLabel) {
            common.array.moveItemToFirst(columns, currentGraphNode.data.rdfsLabel);
        }
        if (currentGraphNode.data.rdfsLabel == "") {
            columns.unshift("");
        } else {
            columns.push("");
        }
        common.fillSelectOptions(`columnDetails-rdfsLabel`, columns, false);
        common.fillSelectOptions(`columnDetails-rdfType`, rdfObjectsType, false);
        common.fillSelectOptions(`columnDetails-UriType`, URITType, false);

    }


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

        self.showDetailedMappingsTree(column);
    };


    self.onDetailedMappingsGraphClick = function (obj, event, options) {
    };

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
        mappingWithTransform[MappingModeler.currentTable.name] = {tripleModels: filteredMapping, transform: {}};
        mappingWithTransform[MappingModeler.currentTable.name].transform[self.transformColumn] = transformFn;
        TripleFactory.createTriples(true, MappingModeler.currentTable.name, {
            filteredMappings: mappingWithTransform,
            table: MappingModeler.currentTable.name
        }, function (err, result) {
        });
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
            MappingModeler.updateNode({id: MappingModeler.currentGraphNode.id, data: data});
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
            var options={withCheckboxes: true,withoutContextMenu:true,openAll:true }
            self.showDetailedMappingsTree(null, "detailedMappings_filterMappingsTree", options);
        });
    };

    self.validateFilterMapping = function () {
  var checkedNodes=JstreeWidget.getjsTreeCheckedNodes("detailedMappings_filterMappingsTree")
        var filteredMappings=[];
        checkedNodes.forEach(function(node){
            if(node.parent=="#")
                return;

            filteredMappings.push(node.data)
        })


        TripleFactory.createTriples(self.filterMappingIsSample, MappingModeler.currentTable.name, {filteredMappings: filteredMappings}, function (err, result) {
        });
    };

    return self;
})();

export default MappingsDetails;
window.window.MappingsDetails = MappingsDetails;
