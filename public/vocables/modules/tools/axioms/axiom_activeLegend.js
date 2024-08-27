import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import Axiom_editor from "./axiom_editor.js";
import Axioms_graph from "./axioms_graph.js";


var Axiom_activeLegend = (function () {
    var self = {};
    self.axiomsLegendVisjsGraph = null;
    self.isLegendActive = false

    self.init = function (graphLegendDiv, axiomGraphDiv, source, resource, axiomType) {
        self.graphLegendDiv = graphLegendDiv;
        self.axiomGraphDiv = axiomGraphDiv;
        self.currentSource = source;
        self.currentResource = resource;
        self.currentClass = self.currentResource;
        self.currentClass.resourceType = "Class";
        self.predicate = axiomType;
        Axiom_editor.currentSource = source
        self.drawNewAxiom(self.currentResource);
        self.hideForbiddenResources("Class")
        self.isLegendActive = true
        self.bNodeCounter=0


    };
    self.filterSuggestion = function (suggestions, resourceType) {
        var selection = [];
        suggestions.forEach(function (item) {
            if (item.resourceType == resourceType) {
                selection.push(item);
            }
        });
        return selection;
    };
    self.onLegendNodeClick = function (node, point, nodeEvent) {
        if (!self.isLegendActive) {
            return;
        }
        self.currentNodeType = null;
        if (node && node.data) {
            self.currentNodeType = node.data.type;
            self.currentLegendNodeType = node.data.type;


            if (node.data.type == "Class") {
                self.hideLegendItems();
                var siblingObjectPropertyUri = self.getGraphSiblingUri(Axioms_graph.currentGraphNode.id, "ObjectProperty")
                if (siblingObjectPropertyUri) {

                    Axioms_suggestions.getValidClassesForProperty(siblingObjectPropertyUri, function (err, classes) {
                        self.setSuggestionsSelect(classes, true);
                    })
                } else {
                    var classes = Axiom_editor.getAllClasses();
                    self.setSuggestionsSelect(classes, true);

                }

            } else if (node.data.type == "ObjectProperty") {
                self.hideLegendItems();
                var siblingObjectClassUri = self.getGraphSiblingUri(Axioms_graph.currentGraphNode.id, "Class")
                if (siblingObjectClassUri) {
                    Axioms_suggestions.getValidPropertiesForClass(siblingObjectClassUri, function (err, properties) {
                        self.setSuggestionsSelect(properties, true);

                    });

                } else {
                    var properties = Axiom_editor.getAllProperties();
                    self.setSuggestionsSelect(properties, true);
                }
            } else if (node.data.type == "Restriction") {
                self.hideLegendItems();
                var suggestions = [
                    {id: "http://www.w3.org/2002/07/owl#someValuesFrom", label: "some"},
                    {id: "http://www.w3.org/2002/07/owl#allValuesFrom", label: "only"},
                    {id: "http://www.w3.org/2002/07/owl#hasValue", label: "value"},
                    {id: "http://www.w3.org/2002/07/owl#maxCardinality", label: "max"},
                    {id: "http://www.w3.org/2002/07/owl#minCardinality", label: "min"},
                    {id: "http://www.w3.org/2002/07/owl#cardinality", label: "cardinality"},
                ];
                self.setSuggestionsSelect(suggestions, false);
            } else if (node.data.type == "Connective") {
                self.hideLegendItems();
                var suggestions = [
                    {label: "Union", id: "http://www.w3.org/2002/07/owl#unionOf"},
                    {label: "Intersection", id: "http://www.w3.org/2002/07/owl#intersectionOf"},
                    {label: "Complement", id: "http://www.w3.org/2002/07/owl#complementOf"},
                    {label: "Enumeration", id: "http://www.w3.org/2002/07/owl#oneOf"},
                ];
                self.setSuggestionsSelect(suggestions, false);

            } else {
                alert("XXXX")
            }
        }
    };

    self.getGraphSiblingUri = function (connectiveParent, type) {
        var siblingIds = Axioms_graph.axiomsVisjsGraph.network.getConnectedNodes(connectiveParent, "to")
        if (!siblingIds || siblingIds.length == 0) {
            return null;
        }
        var sibling = Axioms_graph.axiomsVisjsGraph.data.nodes.get(siblingIds)[0];
        if (sibling.data.type == type) {
            return sibling.data.id
        }
        return null
    }
    /*
    if unique, filters exiting nodes in graph before showing list
    *
     */
    self.setSuggestionsSelect = function (items, unique) {
        if (unique) {
            var existingNodeIds = Axioms_graph.axiomsVisjsGraph.data.nodes.getIds()
            var filteredItems = []
            items.forEach(function (item) {
                if (existingNodeIds.indexOf(item.id) < 0) {
                    filteredItems.push(item);
                }
            })
        } else {
            filteredItems = items;
        }
        common.fillSelectOptions("axioms_legend_suggestionsSelect", filteredItems, false, "label", "id");
    }


    self.onSuggestionsSelect = function (resourceUri, legendNode) {

        if (!Axiom_activeLegend.isLegendActive) {
            Axiom_activeLegend.init("nodeInfosAxioms_activeLegendDiv", "nodeInfosAxioms_graphDiv", NodeInfosAxioms.currentSource, NodeInfosAxioms.currentResource, resourceUri)
            return $('#axioms_legend_suggestionsSelect').children().remove().end()
        }


        var newResource;

        var nodeType = self.currentLegendNodeType;

        if (legendNode) {
            var id= self.getBlankNodeId()
            newResource = {
                id:id,
                label: legendNode.label,
                resourceType: legendNode.label,
                symbol: legendNode.data.symbol,
                data: {
                    id: id,
                    label: legendNode.label,
                    resourceType: legendNode.label,
                },
                predicates: [],
            };
        } else if (nodeType == "Class") {
            newResource = Axiom_editor.allResourcesMap[resourceUri];
            self.currentClass = newResource;
        } else if (nodeType == "ObjectProperty") {
            newResource = Axiom_editor.allResourcesMap[resourceUri];
            self.currentObjectProperty = newResource;
        } else {
            var subType = null;
            var label = "";
            if (nodeType == "Restriction") {
                label = $("#axioms_legend_suggestionsSelect option:selected").text();
                subType = $("#axioms_legend_suggestionsSelect").val();
            } else {
                label = $("#axioms_legend_suggestionsSelect option:selected").text();
                subType = $("#axioms_legend_suggestionsSelect").val();
            }
            var symbolsMap = {
                Intersection: "⊓",
                Union: "⨆",
                Complement: "┓",
            };
            var id =  self.getBlankNodeId()
            newResource = {
                id: id,
                label: label,
                resourceType: nodeType,
                symbol: symbolsMap[label],
                data: {
                    id: id,
                    label: label,
                    type: nodeType,
                    subType: subType,
                },
                predicates: [],
            };
        }
        if (!newResource) {
            return;
        }

        var visjsData = {nodes: [], edges: []};
        var level = Axioms_graph.currentGraphNode.level + 1;
        newResource.type = newResource.resourceType;
        newResource.level = level;

        var visjsNode = Axioms_graph.getVisjsNode(newResource, level);

        visjsData.nodes.push(visjsNode);

        if (Axioms_graph.axiomsVisjsGraph) {
            Axioms_graph.axiomsVisjsGraph.data.nodes.add(visjsData.nodes);
            if (Axioms_graph.currentGraphNode) {
                //  var edgeId = Axioms_graph.currentGraphNode.id + "_" + newResource.id;
                var edgeId = common.getRandomHexaId(5);
                visjsData.edges.push({
                    id: edgeId,
                    from: Axioms_graph.currentGraphNode.id,
                    to: newResource.id,
                });


                self.updateCurrentGraphNode(visjsNode)
                Axioms_graph.axiomsVisjsGraph.data.edges.add(visjsData.edges);
            }

            //
        } else {
            self.hierarchicalLevel = 0;
            var options = {
                onNodeClick: function (node, event) {
                    Axioms_graph.currentGraphNode = node;
                },
            };
            Axioms_graph.drawGraph(visjsData, self.axiomGraphDiv, options);
        }


        self.hideForbiddenResources(Axioms_graph.currentGraphNode.data.type);
        $("#axioms_legend_suggestionsSelect").empty();
    };


    self.updateCurrentGraphNode = function (newVisjsNode) {
        var stay = false
        var type = Axioms_graph.currentGraphNode.data.type
        if (type == "Restriction" || type == "Connective") {
            if (Axioms_graph.axiomsVisjsGraph.network.getConnectedEdges(Axioms_graph.currentGraphNode.id).length < 2) {
                stay = true
            }
        }
        if (!stay) {
            Axioms_graph.currentGraphNode = newVisjsNode;
            Axioms_graph.outlineNode(Axioms_graph.currentGraphNode.id);
        }
    }


    self.hideForbiddenResources = function (resourceType) {
        var hiddenNodes = [];
        if (resourceType == "Class") {
            hiddenNodes.push("ObjectProperty");
        } else if (resourceType == "ObjectProperty") {
            hiddenNodes.push("ObjectProperty");
            hiddenNodes.push("Class");
            hiddenNodes.push("Restriction");
            hiddenNodes.push("Connective");
            /*  hiddenNodes.push("Union");
                  hiddenNodes.push("Intersection");

                  hiddenNodes.push("Complement");*/
            hiddenNodes.push("DisjointWith");
        } else if (resourceType == "Restriction") {
            hiddenNodes.push("Restriction");
        } else if (resourceType == "Connective") {
            hiddenNodes.push("ObjectProperty");
        }

        var edges = Axioms_graph.axiomsVisjsGraph.data.edges.get();
        var nodes = Axioms_graph.axiomsVisjsGraph.data.nodes.get();
        var nodesMap = {};
        nodes.forEach(function (node) {
            nodesMap[node.id] = node;
        });
        var numberOfEdgesFromCurrentGraphNode = 0;

        if (resourceType == "Connective") {
        } else {
            edges.forEach(function (edge) {
                if (edge.from == Axioms_graph.currentGraphNode.id) {
                    if (resourceType != "Class") {
                        var nodeToType = nodesMap[edge.to].data.type;

                        hiddenNodes.push(nodeToType);
                    }
                    numberOfEdgesFromCurrentGraphNode += 1;
                }
            });
        }

        hiddenNodes.push(Axioms_graph.currentGraphNode.type);
        if (numberOfEdgesFromCurrentGraphNode > 1 && resourceType != "DisjointWith") {
            //dont alllow more than two edges from a node
            hiddenNodes = null;
        }

        self.hideLegendItems(hiddenNodes);

        //  });
    };
    self.hideLegendItems = function (hiddenNodes) {
        var legendNodes = self.axiomsLegendVisjsGraph.data.nodes.getIds();
        var newNodes = [];
        legendNodes.forEach(function (nodeId) {
            var hidden = !hiddenNodes || hiddenNodes.indexOf(nodeId) > -1;
            newNodes.push({id: nodeId, hidden: hidden});
        });
        Axiom_activeLegend.axiomsLegendVisjsGraph.data.nodes.update(newNodes);
    };


    self.drawNewAxiom = function (selectedObject) {
        var currentNode = {
            id: selectedObject.id,
            label: selectedObject.label,
            type: selectedObject.resourceType,
            symbol: null,
        };
        self.currentNodeType = selectedObject.resourceType;

        var visjsData = {nodes: [], edges: []};
        var visjsNode = Axioms_graph.getVisjsNode(currentNode, 0);
        visjsNode.data.predicate = selectedObject.axiomType;
        visjsData.nodes.push(visjsNode);
        self.hierarchicalLevel = 0;
        var options = {
            keepHierarchyLayout: true,
            onNodeClick: Axiom_activeLegend.onNodeGraphClick,
            onRightClickFn: Axiom_activeLegend.showGraphPopupMenu,
        };
        Axioms_graph.drawGraph(visjsData, self.axiomGraphDiv, options);
        Axioms_graph.currentGraphNode = visjsNode;
        self.currentResource.visjsId = selectedObject.id;

        //   self.hideForbiddenResources(selectedObject);
    };

    self.showGraphPopupMenu = function (node, point, event) {
        if (!node) {
            return;
        }
        self.currentGraphNode = node;
        if (!node || !node.data) {
            return;
        }
        var html = "";
        html = '    <span class="popupMenuItem" onclick="Axiom_activeLegend.removeNodeFromGraph();"> Remove Node</span>';
        html += '    <span class="popupMenuItem" onclick="NodeInfosAxioms.nodeInfos()">Node Infos</span>';


        $("#popupMenuWidgetDiv").html(html);
        point.x = event.x;
        point.y = event.y;
        PopupMenuWidget.showPopup(point, "popupMenuWidgetDiv");
    };

    self.onNodeGraphClick = function (node, point, nodeEvent) {
        if (node && node.data) {
            self.currentGraphNode = node;
            Axioms_graph.currentGraphNode = node;
            Axioms_graph.outlineNode(Axioms_graph.currentGraphNode.id);
            Axiom_activeLegend.hideForbiddenResources("" + node.data.type);
            if (nodeEvent.ctrlKey) {
                if (node.data.type.indexOf("Class") > -1 || node.data.type.indexOf("ObjectProperty") > -1) {
                    NodeInfosWidget.showNodeInfos(Axiom_editor.currentSource, node, "mainDialogDiv");
                }
            }
        } else {
            self.currentGraphNode = null;
            Axioms_graph.currentGraphNode = null;
        }
    };

    self.removeNodeFromGraph = function () {
        var node = self.currentGraphNode;

        if (Axioms_graph.axiomsVisjsGraph.network.getConnectedNodes(node.id, "to").length > 0) {
            alert("cannot remove a parent node ")
        } else {
            var fromNodeId = Axioms_graph.axiomsVisjsGraph.network.getConnectedNodes(node.id, "from")[0]
            var edges = Axioms_graph.axiomsVisjsGraph.network.getConnectedEdges(node.id)
            Axioms_graph.axiomsVisjsGraph.data.nodes.remove([node]);
            Axioms_graph.axiomsVisjsGraph.data.edges.remove(edges);

            var fromNode = Axioms_graph.axiomsVisjsGraph.data.nodes.get(fromNodeId)
            Axioms_graph.currentGraphNode = fromNode;
            Axioms_graph.outlineNode(fromNode.id)

        }


        return;

    };


    self.showTriples = function () {
        var triples = self.visjsGraphToTriples();
        var str = "<ul>";
        triples.forEach(function (triple) {
            str += "<li>" + triple.subject + " <b>" + triple.predicate + "</b> " + triple.object + "</li>";
        });
        str += "</ul>";

        $("#smallDialogDiv").html(str);
        $("#smallDialogDiv").dialog("open");
    }


    self.drawLegend = function (graphLegendDiv) {
        var visjsData = {nodes: [], edges: []};

        var legendItems = [
            {label: "Class", color: "#00afef"},
            {label: "ObjectProperty", color: "#f5ef39"},
            {label: "Restriction", color: "#cb9801"},
            {label: "Connective", color: "#70ac47"},
            /*  {label: "Union", color: "#70ac47", symbol: "⨆"},
                  {label: "Intersection", color: "#70ac47", symbol: "⊓"},
                  {label: "Complement", color: "#70ac47", symbol: "┓"},
                  {label: "DisjointWith", color: "#70ac47", symbol: "⊑ ┓"},*/
        ];

        var yOffset = -450;
        legendItems.forEach(function (item) {
            visjsData.nodes.push({
                id: item.label,
                label: item.label,
                shape: "box",
                color: item.color,
                size: 8,
                level: -1,
                font: {
                    bold: true,
                },
                data: {
                    id: item.label,
                    label: item.label,
                    type: item.label,
                    symbol: item.symbol,
                },
                x: 0,
                y: yOffset,

                fixed: {x: true, y: true},
            });
            yOffset += 50;
        });

        var options = {
            physics: {
                enabled: true,
            },

            visjsOptions: {},
            onclickFn: Axiom_activeLegend.onLegendNodeClick,
            onRightClickFn: Axiom_activeLegend.showGraphPopupMenu,
        };

        self.axiomsLegendVisjsGraph = new VisjsGraphClass(graphLegendDiv || self.graphLegendDiv, visjsData, options);
        self.axiomsLegendVisjsGraph.draw(function () {
        });
    };

    self.clearAxiom = function () {
        // self.axiomsLegendVisjsGraph.clearGraph();
        Axioms_graph.axiomsVisjsGraph.clearGraph();
        NodeInfosAxioms.newAxiom();
    };

    self.saveAxiom = function () {
        if (confirm("Save Axiom")) {
            var triples = self.visjsGraphToTriples();
            //   triples=self.testAxioms
            Sparql_generic.insertTriples(self.currentSource, triples, {}, function (err, result) {
            });
        }
    };
    self.axiomTriplesToManchester = function (callback) {
        var triples = self.visjsGraphToTriples();
        Axiom_manager.getManchesterAxiomsFromTriples(self.currentSource, triples, function (err, result) {
            if (err) {
                return alert(err);
            }

            var manchesterStr = Axiom_manager.parseManchesterClassAxioms(self.currentResource.data.id, result);
            $("#axiomsEditor_textDiv").html(manchesterStr);
            if (callback) {
                return callback(null, manchesterStr);
            }
        });
    };
    self.visjsGraphToTriples = function (nodes, edges) {
        if (!edges) {
            edges = Axioms_graph.axiomsVisjsGraph.data.edges.get();
        }
        if (!nodes) {
            nodes = Axioms_graph.axiomsVisjsGraph.data.nodes.get();
        }
        var nodesMap = {};
        var edgesFromMap = {};
        nodes.forEach(function (node) {
            nodesMap[node.id] = node;
        });

        edges.forEach(function (edge) {
            if (!edgesFromMap[edge.from]) {
                edgesFromMap[edge.from] = [];
            }
            edgesFromMap[edge.from].push(edge);
        });

        var triples = [];

        function recurse(nodeId) {
            var edges = edgesFromMap[nodeId];
            if (!edges) {
                return;
            }

            edges.forEach(function (edge) {
                var triple = {};
                var fromNode = nodesMap[nodeId];
                var toNode = nodesMap[edge.to];

                var object = toNode.data.id;
                var predicate = null;
                if (fromNode.data.predicate) {
                    predicate = fromNode.data.predicate;
                }

                if (fromNode.data.type == "Restriction") {
                    if (toNode.data.type == "ObjectProperty") {
                        predicate = "http://www.w3.org/2002/07/owl#onProperty";
                    } else {
                        predicate = fromNode.data.subType;
                    }
                } else if (fromNode.data.type == "Class") {
                    predicate = "http://www.w3.org/2000/01/rdf-schema#subClassOf";
                } else if (fromNode.data.type == "ObjectProperty") {
                } else if (fromNode.data.type == "Connective") {
                    if (fromNode.data.nCount == 0) {
                        predicate = "http://www.w3.org/1999/02/22-rdf-syntax-ns#first";
                    } else if (fromNode.data.nCount == 1) {
                        var bNode2 =  self.getBlankNodeId()
                        triples.push({
                            subject: fromNode.data.bNodeid,
                            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest",
                            object: bNode2,
                        });
                        fromNode.data.bNodeid = bNode2;
                        triples.push({
                            subject: bNode2,
                            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest",
                            object: "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil",
                        });
                        predicate = "http://www.w3.org/1999/02/22-rdf-syntax-ns#first";
                    } else {
                    }
                    fromNode.data.nCount += 1;
                } else {
                }

                if (predicate) {
                    triple.subject = fromNode.data.bNodeid || fromNode.data.id;
                    triple.predicate = predicate;
                    triple.object = object;
                    triples.push(triple);
                }

                if (toNode.data.type == "Connective") {
                    toNode.data.nCount = 0;
                    toNode.data.bNodeid =  self.getBlankNodeId()
                    triples.push({
                        subject: toNode.data.id,
                        predicate: toNode.data.subType,
                        object: toNode.data.bNodeid,
                    });
                }

                recurse(toNode.id);
            });
        }

        recurse(nodes[0].id);

        var nodeTypes = {
            ObjectProperty: "http://www.w3.org/2002/07/owl#ObjectProperty",
            Class: "http://www.w3.org/2002/07/owl#Class",
            Connective: "http://www.w3.org/2002/07/owl#Class",
            Restriction: "http://www.w3.org/2002/07/owl#Restriction",
        };

        nodes.forEach(function (node) {
            if (nodeTypes[node.data.type]) {
                triples.push({
                    subject: node.data.id,
                    predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                    object: nodeTypes[node.data.type],
                });
            }
        });

        return triples;
    };


    self.getBlankNodeId=function(){
        if(!self.bNodeCounter)
            self.bNodeCounter=0
        return "_:b"+(self.bNodeCounter++)


    }




    self.testAxioms = [
        {
            "predicate": "http://www.w3.org/2000/01/rdf-schema#subClassOf",
            "subject": "https://spec.industrialontologies.org/ontology/core/Core/BuyingBusinessProcess",
            "object": "_766d7ff1-231a-458b-88f6-06a93394a27d"
        },
        {
            "predicate": "http://www.w3.org/2002/07/owl#onProperty",
            "subject": "_766d7ff1-231a-458b-88f6-06a93394a27d",
            "object": "http://purl.obolibrary.org/obo/BFO_0000057"
        },
        {
            "predicate": "http://www.w3.org/2002/07/owl#someValuesFrom",
            "subject": "_766d7ff1-231a-458b-88f6-06a93394a27d",
            "object": "https://spec.industrialontologies.org/ontology/core/Core/Buyer"
        },
        {
            "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            "subject": "https://spec.industrialontologies.org/ontology/core/Core/BuyingBusinessProcess",
            "object": "http://www.w3.org/2002/07/owl#Class"
        },
        {
            "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            "subject": "http://purl.obolibrary.org/obo/BFO_0000057",
            "object": "http://www.w3.org/2002/07/owl#ObjectProperty"
        },
        {
            "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            "subject": "_766d7ff1-231a-458b-88f6-06a93394a27d",
            "object": "http://www.w3.org/2002/07/owl#Restriction"
        },
        {
            "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            "subject": "_0b680e14-f039-4a68-b600-012652eca77e",
            "object": "http://www.w3.org/2002/07/owl#Ontology"
        },
        {
            "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            "subject": "https://spec.industrialontologies.org/ontology/core/Core/Buyer",
            "object": "http://www.w3.org/2002/07/owl#Class"
        }
    ]


    return self;
})();

//Axiom_activeLegend.testTriplesCreation()

export default Axiom_activeLegend;
window.Axiom_activeLegend = Axiom_activeLegend;
