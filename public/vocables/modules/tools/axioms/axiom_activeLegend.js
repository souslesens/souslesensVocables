import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import Axiom_editor from "./axiom_editor.js";
import Axioms_graph from "./axioms_graph.js";
import Axioms_suggestions from "./axioms_suggestions.js";
import common from "../../shared/common.js";
import Lineage_whiteboard from "../lineage/lineage_whiteboard.js";
import MainController from "../../shared/mainController.js";
import JstreeWidget from "../../uiWidgets/jstreeWidget.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Lineage_createResource from "../lineage/lineage_createResource.js";
import Lineage_createRelation from "../lineage/lineage_createRelation.js";
import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import NodeInfosAxioms from "./nodeInfosAxioms.js";
import Lineage_graphPaths from "../lineage/lineage_graphPaths.js";


var Axiom_activeLegend = (function () {
    var self = {};
    self.axiomsLegendVisjsGraph = null;
    self.isLegendActive = false;
    self.axiomtypes = ["SubClassOf", "EquivalentClass", "DisjointWith", "DisjointUnionOf"];

    self.init = function (graphLegendDiv, axiomGraphDiv, source, resource, axiomType) {
        self.graphLegendDiv = graphLegendDiv;
        self.axiomGraphDiv = axiomGraphDiv;
        self.currentSource = source;
        self.currentResource = resource;
        self.axiomType = axiomType;
        self.currentClass = self.currentResource;
        self.currentClass.resourceType = "Class";
        self.predicate = axiomType;
        Axiom_editor.currentSource = source;
        self.drawNewAxiom(self.currentResource);
        self.hideForbiddenResources("Class");
        self.isLegendActive = true;
        self.bNodeCounter = 0;
        self.maxItemsInJstreePerSource = 250;
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
            self.currentLegendNode = node;

            if (node.data.type == "Class") {
                self.hideLegendItems();
                var newObject = { id: "createClass", label: "_Create new Class_" };
                var siblingObjectPropertyUri = self.getGraphSiblingUri(Axioms_graph.currentGraphNode.id, "ObjectProperty");

                if (Axioms_graph.currentGraphNode.data.type == "Restriction" && siblingObjectPropertyUri) {
                    var domainClassUri = self.getRestrictionAncestorClass(Axioms_graph.currentGraphNode.id);
                    Axioms_suggestions.getClassMatchingPropertiesRangeAndDomain(self.currentSource, siblingObjectPropertyUri, domainClassUri, null, function (err, classes) {
                        if (err) {
                            return MainController.errorAlert(err);
                        }
                        // Axioms_suggestions.getValidClassesForProperty(siblingObjectPropertyUri, function (err, classes) {
                        self.setSuggestionsSelect(classes, true, newObject);
                    });
                } else {
                    var classes = Axiom_manager.getAllClasses(self.currentSource);
                    self.setSuggestionsSelect(classes, true, newObject);
                }
            } else if (node.data.type == "ObjectProperty") {
                var newObject = { id: "createObjectProperty", label: "_Create new ObjectProperty_" };
                self.hideLegendItems();

                if (Axioms_graph.currentGraphNode.data.type != "Restriction") {
                    return alert(" ObjectProperty can only be added to a Restriction");
                }
                var domainClassUri = self.getRestrictionAncestorClass(Axioms_graph.currentGraphNode.id);
                var rangeClassUri = self.getGraphSiblingUri(Axioms_graph.currentGraphNode.id, "Class");
                Axioms_suggestions.getValidPropertiesForClasses(self.currentSource, domainClassUri, rangeClassUri, {}, function (err, properties) {
                    self.setSuggestionsSelect(properties, true, newObject);
                });
            } else if (node.data.type == "Restriction") {
                self.hideLegendItems();
                var suggestions = [
                    { id: "http://www.w3.org/2002/07/owl#someValuesFrom", label: "some" },
                    { id: "http://www.w3.org/2002/07/owl#allValuesFrom", label: "only" },
                    { id: "http://www.w3.org/2002/07/owl#hasValue", label: "value" },
                    { id: "http://www.w3.org/2002/07/owl#maxCardinality", label: "max" },
                    { id: "http://www.w3.org/2002/07/owl#minCardinality", label: "min" },
                    { id: "http://www.w3.org/2002/07/owl#cardinality", label: "cardinality" },
                ];
                self.setSuggestionsSelect(suggestions, false);
            } else if (node.data.type == "Connective") {
                self.hideLegendItems();
                var suggestions = [
                    { label: "UnionOf", id: "http://www.w3.org/2002/07/owl#unionOf" },
                    { label: "IntersectionOf", id: "http://www.w3.org/2002/07/owl#intersectionOf" },
                    { label: "ComplementOf", id: "http://www.w3.org/2002/07/owl#complementOf" },
                    { label: "Enumeration", id: "http://www.w3.org/2002/07/owl#oneOf" },
                ];
                self.setSuggestionsSelect(suggestions, false);
            } else {
                alert("XXXX");
            }
        }
    };

    /**
     *
     * get the first ancestor that is a Class
     * @param restrictionUri
     * @returns classUri
     */
    self.getRestrictionAncestorClass = function (restrictionUri) {
        var edges = Axioms_graph.axiomsVisjsGraph.data.edges.get();
        var edgesToMap = {};
        edges.forEach(function (edge) {
            edgesToMap[edge.to] = edge;
        });
        var nodesMap = {};
        var nodes = Axioms_graph.axiomsVisjsGraph.data.nodes.get();
        nodes.forEach(function (node) {
            nodesMap[node.id] = node;
        });
        var firstClassNodeUri = null;

        function recurse(nodeId) {
            var node = nodesMap[nodeId];
            if (node.data.type == "Class" && node.data.id.indexOf("http") == 0) {
                firstClassNodeUri = node.data.id;
            } else {
                var edge = edgesToMap[node.id];
                if (edge) {
                    recurse(edge.from);
                }
            }
        }

        recurse(restrictionUri);
        return firstClassNodeUri;
    };
    self.getGraphSiblingUri = function (connectiveParent, type) {
        var siblingIds = Axioms_graph.axiomsVisjsGraph.network.getConnectedNodes(connectiveParent, "to");
        if (!siblingIds || siblingIds.length == 0) {
            return null;
        }
        var sibling = Axioms_graph.axiomsVisjsGraph.data.nodes.get(siblingIds)[0];
        if (sibling.data.type == type) {
            return sibling.data.id;
        }
        return null;
    };
    /*
    if unique, filters exiting nodes in graph before showing list
    *
     */
    self.setSuggestionsSelect = function (items, unique, newOption, drawGraphFn) {
        if (unique) {
            var existingNodeIds = Axioms_graph.axiomsVisjsGraph.data.nodes.getIds();
            var filteredItems = [];
            items.forEach(function (item) {
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

        self.loadSuggestionSelectJstree(filteredItems, self.currentLegendNode.data.type);

        //   common.fillSelectOptions("axioms_legend_suggestionsSelect", filteredItems, false, "label", "id");
    };

    self.onSuggestionsSelect = function (resourceUri, legendNode, newResource) {
        // new Axiom
        if (!Axiom_activeLegend.isLegendActive) {
            // create new Axiom
            self.newAxiomNode = NodeInfosAxioms.currentResource;
            Axiom_activeLegend.init("nodeInfosAxioms_activeLegendDiv", "nodeInfosAxioms_graphDiv", NodeInfosAxioms.currentSource, NodeInfosAxioms.currentResource, resourceUri);
            return $("#axioms_legend_suggestionsSelect").children().remove().end();
        }

        if (self.axiomtypes.indexOf(resourceUri) > -1) {
            return $("#axioms_legend_suggestionsSelect").children().remove().end();
            return (self.axiomType = resourceUri);
        }

        // new Class
        if (resourceUri == "createClass") {
            var siblingObjectPropertyUri = self.getGraphSiblingUri(Axioms_graph.currentGraphNode.id, "ObjectProperty");
            if (Axioms_graph.currentGraphNode.data.type == "Restriction" && siblingObjectPropertyUri) {
                var domainClassUri = self.getRestrictionAncestorClass(Axioms_graph.currentGraphNode.id);
                Axioms_suggestions.getClassMatchingPropertiesRangeAndDomain(self.currentSource, siblingObjectPropertyUri, domainClassUri, null, function (err, classes) {
                    if (err) {
                        return MainController.errorAlert(err);
                    }

                    self.showCreateResourceBot("Class", classes);
                });
            } else {
                self.showCreateResourceBot("Class", null);
            }
            return;
        }
        // new ObjectProperty
        if (resourceUri == "createObjectProperty") {
            var rangeClassUri = self.getGraphSiblingUri(Axioms_graph.currentGraphNode.id, "Class");
            var domainClassUri = self.getRestrictionAncestorClass(Axioms_graph.currentGraphNode.id);

            if (Axioms_graph.currentGraphNode.data.type == "Restriction" && domainClassUri) {
                Axioms_suggestions.getValidPropertiesForClasses(self.currentSource, domainClassUri, rangeClassUri, {}, function (err, properties) {
                    if (err) {
                        return MainController.errorAlert(err);
                    }
                    self.showCreateResourceBot("ObjectProperty", properties);
                });
            } else {
                self.showCreateResourceBot("ObjectProperty", null);
                return;
            }
        }

        var nodeType = self.currentLegendNode.data.id;
        if (newResource) {
            //resourcecomming from functioncall
        } else if (legendNode) {
            var id = self.getBlankNodeId();
            newResource = {
                id: id,
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
            newResource = Axiom_manager.allResourcesMap[resourceUri];
            self.currentClass = newResource;
        } else if (nodeType == "ObjectProperty") {
            newResource = Axiom_manager.allResourcesMap[resourceUri];
            self.currentObjectProperty = newResource;
        } else {
            var subType = null;
            var label = "";
            if (nodeType == "Restriction") {
                label = self.currentSuggestedNode.data.label;
                subType = self.currentSuggestedNode.data.id;
            } else {
                label = self.currentSuggestedNode.data.label;
                subType = self.currentSuggestedNode.data.id;
            }

            var cardinality = "";
            if (label == "max" || label == "min" || label == "cardinality") {
                cardinality = prompt("cardinality min ");
            }

            var symbolsMap = {
                IntersectionOf: "⊓",
                UnionOf: "⨆",
                ComplementOf: "┓",
            };
            var id = self.getBlankNodeId();
            newResource = {
                id: id,
                label: label + (cardinality ? "  : " + cardinality : ""),
                resourceType: nodeType,
                symbol: symbolsMap[label],
                data: {
                    id: id,
                    label: label,
                    type: nodeType,
                    subType: subType,
                    cardinality: cardinality,
                },
                predicates: [],
            };
        }
        if (!newResource) {
            return;
        }

        var visjsData = { nodes: [], edges: [] };
        var level = Axioms_graph.currentGraphNode ? Axioms_graph.currentGraphNode.level + 1 : 0;
        newResource.type = newResource.resourceType;
        newResource.level = level;

        var visjsNode = Axioms_graph.getVisjsNode(newResource, level);

        visjsData.nodes.push(visjsNode);

        /* if(drawGraphFn){
             return drawGraphFn(visjsData)
         }*/

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

                self.updateCurrentGraphNode(visjsNode);
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
        var stay = false;
        var type = Axioms_graph.currentGraphNode.data.type;
        if (type == "Restriction" || type == "Connective") {
            if (Axioms_graph.axiomsVisjsGraph.network.getConnectedEdges(Axioms_graph.currentGraphNode.id).length < 2) {
                if (newVisjsNode.data.type != "Restriction") {
                    stay = true;
                }
            }
        }
        if (!stay) {
            Axioms_graph.currentGraphNode = newVisjsNode;
            Axioms_graph.outlineNode(Axioms_graph.currentGraphNode.id);
        }
    };

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

            /// begin with property to respect range and domains
            var hasProperty = self.getGraphSiblingUri(Axioms_graph.currentGraphNode.id, "ObjectProperty");
            if (hasProperty) {
                hiddenNodes.push("ObjectProperty");
            }
            var hasClass = self.getGraphSiblingUri(Axioms_graph.currentGraphNode.id, "Class");

            var isCardinalityRestriction = Axioms_graph.currentGraphNode.data.subType.indexOf("ardinality") > -1;
            if (isCardinalityRestriction || hasClass) {
                hiddenNodes.push("Class");
            }
            if (isCardinalityRestriction) {
                hiddenNodes.push("Connective");
            }
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
                    if (resourceType != "Class" && nodesMap[edge.to]) {
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
        if (!self.axiomsLegendVisjsGraph) {
            return;
        }
        var legendNodes = self.axiomsLegendVisjsGraph.data.nodes.getIds();
        var newNodes = [];
        legendNodes.forEach(function (nodeId) {
            var hidden = !hiddenNodes || hiddenNodes.indexOf(nodeId) > -1;
            newNodes.push({ id: nodeId, hidden: hidden });
        });
        Axiom_activeLegend.axiomsLegendVisjsGraph.data.nodes.update(newNodes);
    };

    self.drawNewAxiom = function (selectedObject) {
        var currentNode = {
            id: selectedObject.data.id,
            label: selectedObject.data.label,
            type: selectedObject.resourceType,
            symbol: null,
        };
        self.currentNodeType = selectedObject.resourceType;

        var visjsData = { nodes: [], edges: [] };
        var visjsNode = Axioms_graph.getVisjsNode(currentNode, 0);
        visjsNode.data.predicate = selectedObject.axiomType;
        visjsNode.data.rootAxiom = true;

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

        Axioms_graph.currentGraphNode = node;
        Axioms_graph.outlineNode(node.id);

        if (!node || !node.data) {
            return;
        }
        var html = "";
        html = '    <span class="popupMenuItem" onclick="Axiom_activeLegend.removeNodeFromGraph();"> Remove Node</span>';
        html += '    <span class="popupMenuItem" onclick="NodeInfosAxioms.nodeInfos()">Node Infos</span>';
        html += '    <span class="popupMenuItem" onclick="Axiom_activeLegend.createAxiomFromGraph();"> create Axiom</span>';

        $("#popupMenuWidgetDiv").html(html);
        point.x = event.x;
        point.y = event.y;
        PopupMenuWidget.showPopup(point, "popupMenuWidgetDiv");
    };

    self.onNodeGraphClick = function (node, point, nodeEvent) {
        if (node && node.data) {
            Axioms_graph.currentGraphNode = node;
            Axioms_graph.currentGraphNode = node;
            Axioms_graph.outlineNode(Axioms_graph.currentGraphNode.id);
            Axiom_activeLegend.hideForbiddenResources("" + node.data.type);
            if (nodeEvent.ctrlKey) {
                if (node.data.type.indexOf("Class") > -1 || node.data.type.indexOf("ObjectProperty") > -1) {
                    NodeInfosWidget.showNodeInfos(NodeInfosAxioms.currentSource, node, "mainDialogDiv");
                }
            }

            if (node.data.axiomId > -1 || node.data.rootAxiom) {
                self.selectGraphNodeJstreeTriples(node)
            }

        } else {
            Axioms_graph.currentGraphNode = null;
            Axioms_graph.currentGraphNode = null;
        }
    };

    self.removeNodeFromGraph = function () {
        var node = Axioms_graph.currentGraphNode;

        if (Axioms_graph.axiomsVisjsGraph.network.getConnectedNodes(node.id, "to").length > 0) {
            alert("cannot remove a parent node ");
        } else {
            var fromNodeId = Axioms_graph.axiomsVisjsGraph.network.getConnectedNodes(node.id, "from")[0];
            var edges = Axioms_graph.axiomsVisjsGraph.network.getConnectedEdges(node.id);
            Axioms_graph.axiomsVisjsGraph.data.nodes.remove([node]);
            Axioms_graph.axiomsVisjsGraph.data.edges.remove(edges);

            var fromNode = Axioms_graph.axiomsVisjsGraph.data.nodes.get(fromNodeId);
            Axioms_graph.currentGraphNode = fromNode;
            Axioms_graph.outlineNode(fromNode.id);
        }

        return;
    };

    self.showTriples = function (callback) {
        var triples = []

        if (Axioms_graph.currentAxiomTriples  && ! NodeInfosAxioms.isNewAxiom ) {//saved axiom or new graph with axiomIds

            triples = Axioms_graph.currentAxiomTriples;

        } else {//new axiom
            triples = self.visjsGraphToTriples();

        }

        var jstreeData = [];

        triples.forEach(function (triple, index) {
            jstreeData.push({
                id: "triple" + index,
                text: triple.subject + " <b>" + triple.predicate + "</b> " + triple.object,
                parent: "#",
                data: {
                    subject: triple.subject,
                    predicate: triple.predicate,
                    object: triple.object,
                     
                }
            })

        });


        var html = "<div style='height:300px;width:100%;overflow:auto;'><div id='axiomsTriplesJstree'></div></div>";

        $("#axiomsEditor_textDiv").html(html);
        JstreeWidget.loadJsTree("axiomsTriplesJstree", jstreeData, {withCheckboxes: true}, function (err, result) {
            var divId = "nodeInfosAxioms_graphDiv";
            var options = {};
            var rootNodeId=triples[0].subject
            Axioms_graph.drawNodeAxioms2(NodeInfosAxioms.currentSource,rootNodeId,triples, divId,options)
            if (callback) {
                return callback(err)
            }
        })
    };

    self.copyTriples = function () {
        var triples = self.getTriples();
        var str = ""
        triples.forEach(function (triple) {
            str += Sparql_generic.triplesObjectToString(triple) + ".\n";
        });

        common.copyTextToClipboard(str)
    };
    self.getTriples = function (options) {
        if(!options){
            options = {};
        }
        var isInitializedJstree = self.isInitializedJstree();
        if(!isInitializedJstree){
            return alert('No triples to get, initialize the triples with "Show Triples" button');
        }
        var triples = []
        var checkedNodes = $("#axiomsTriplesJstree").jstree(true).get_checked();
        //get all nodes by default except type nodes
        if(checkedNodes.length == 0 || options.all){
            if(!Axioms_graph.axiomsVisjsGraph && !Axioms_graph.axiomsVisjsGraph.data.nodes){
                return alert("No axioms graph data available");
            }
            var allNodes = Axioms_graph.axiomsVisjsGraph.data.nodes.get();
            var rootNode = allNodes.find(function(node) { return node.data && node.data.rootAxiom; });
            if(!rootNode){
                return alert("no root node found in jstree");
            }

            self.selectGraphNodeJstreeTriples(rootNode);
             checkedNodes = $("#axiomsTriplesJstree").jstree(true).get_checked();



        }
        checkedNodes.forEach(function (nodeId) {
            var node = $("#axiomsTriplesJstree").jstree(true).get_node(nodeId);
            triples.push(node.data);
        });
        return triples;
        

    }
    self.isInitializedJstree = function () {
        var jstree = $("#axiomsTriplesJstree").jstree(true);
        var response = false;
        if(jstree && jstree._model.data && Object.values(jstree._model.data).length > 0){
            response = true;
        }
        return response;
    }
    self.deleteTriples = function () {

        var checkedNodes = $("#axiomsTriplesJstree").jstree(true).get_checked()




        var triples = Axioms_graph.currentAxiomTriples

        var graphUri = Config.sources[NodeInfosAxioms.currentSource].graphUri
        var query = "with graph <" + graphUri + ">\ndelete {\n"

        triples.forEach(function (triple, index) {
            if (checkedNodes.indexOf("triple" + index) > -1) {
                query += Sparql_generic.triplesObjectToString(triple) + "\n";
            }

        });
        query += "}"

        var url = Config.sparql_server.url;
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {}, function (err, result) {
            if (err) {
                return alert(err);
            }

            AxiomExtractor.deleteBasicAxioms(NodeInfosAxioms.currentSource, triples)
            return alert("triples deleted")
        })

    };

    self.selectGraphNodeJstreeTriples = function (visjsNode) {


        $('#axiomsTriplesJstree').jstree('uncheck_all');

        var nodesToDelete = []
        var edgesToDelete = []

        if (visjsNode.from) {//selectedNode is a edge
            edgesToDelete.push(visjsNode.id)
        }

        var edgesFromMap = {};
        Axioms_graph.axiomsVisjsGraph.data.edges.get().forEach(function (edge) {
            edgesFromMap[edge.from] = edge
            if (edge.to == visjsNode.id) {
                edgesToDelete[edge]
            }
        })
        var nodesMap = {};
        Axioms_graph.axiomsVisjsGraph.data.nodes.get().forEach(function (node) {
            nodesMap[node.id] = node
        })


        if (visjsNode.data.axiomId || visjsNode.data.rootAxiom ) {
            var visjsData = {
                nodes: Axioms_graph.axiomsVisjsGraph.data.nodes.get(),
                edges: Axioms_graph.axiomsVisjsGraph.data.edges.get(),
            }

            var toPaths = Lineage_graphPaths.getAllpathsFromNode(visjsData, visjsNode.id)


            toPaths.forEach(function (path) {
                path.forEach(function (nodeId) {
                    var visjsNode = nodesMap[nodeId]
                    if (visjsNode && visjsNode.color != "#00afef" && visjsNode.color != "#f5ef39") {
                        if (nodesToDelete.indexOf(visjsNode) < 0) {
                            nodesToDelete.push(visjsNode.id);
                        }
                    }
                    if (edgesToDelete.indexOf(edgesFromMap[nodeId]) < 0) {
                        edgesToDelete.push(edgesFromMap[nodeId])
                    }
                })

            })

            //  Axioms_graph.axiomsVisjsGraph.data.nodes.remove(nodesToDelete)
            //  Axioms_graph.axiomsVisjsGraph.data.edges.remove(edgesToDelete)


            Axioms_graph.currentAxiomTriples.forEach(function (triple, index) {

                if (nodesToDelete.indexOf(triple.subject) > -1 || nodesToDelete.indexOf(triple.object) > -1) {//} && (triple2.predicate.indexOf("owl")>-1 )) {
                    //   $("#axiomsTriplesJstree").jstree(true).select_node("triple" + index);
                    $("#axiomsTriplesJstree").jstree(true).check_node("triple" + index);
                }
            })


        }

    }


    /**
     *
     * @param {*} graphLegendDiv
     * @param {*} legendItems
     * @param {{horizontal: string, xOffset: string, onLegendNodeClick: string, showLegendGraphPopupMenu: string}} options:
     * @param {*} callback
     */
    self.drawLegend = function (graphLegendDiv, legendItems, options, callback) {
        if (!options) {
            options = {};
        }
        var visjsData = { nodes: [], edges: [] };

        if (!legendItems) {
            legendItems = [
                { label: "Class", color: "#00afef" },
                { label: "ObjectProperty", color: "#f5ef39" },
                { label: "Restriction", color: "#cb9801" },
                { label: "Connective", color: "#70ac47" },
                /*  {label: "Union", color: "#70ac47", symbol: "⨆"},
                      {label: "Intersection", color: "#70ac47", symbol: "⊓"},
                      {label: "Complement", color: "#70ac47", symbol: "┓"},
                      {label: "DisjointWith", color: "#70ac47", symbol: "⊑ ┓"},*/
            ];
        }

        var yOffset = -450;
        if (options.horizontal) {
            yOffset = 0;
            options.xOffset = -200;
        }
        legendItems.forEach(function (item) {
            visjsData.nodes.push({
                id: item.label,
                label: item.label,
                shape: "box",
                color: item.color,
                size: item.size || 8,
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
                x: options.xOffset || 0,
                y: yOffset,

                fixed: { x: true, y: true },
            });
            if (options.horizontal) {
                options.xOffset += 90;
            } else {
                yOffset += 50;
            }
        });

        var options = {
            physics: {
                enabled: true,
            },

            visjsOptions: {},
            onclickFn: options.onLegendNodeClick || Axiom_activeLegend.onLegendNodeClick,
            onRightClickFn: options.showLegendGraphPopupMenu || Axiom_activeLegend.showGraphPopupMenu,
        };

        self.axiomsLegendVisjsGraph = new VisjsGraphClass(graphLegendDiv || self.graphLegendDiv, visjsData, options);
        self.axiomsLegendVisjsGraph.draw(function () {
            if (callback) {
                return callback();
            }
        });
    };

    self.clearAxiom = function () {
        // self.axiomsLegendVisjsGraph.clearGraph();
        Axioms_graph.axiomsVisjsGraph.clearGraph();
        NodeInfosAxioms.newAxiom(true);
    };

    self.saveAxiom = function () {
        if (confirm("Save Axiom")) {
            var triples = self.getTriples({all:true});
            var newNodesLabelsMap = {}

            async.series([
                //save New nodes (created on the fly)
                function (callbackSeries) {
                    return callbackSeries();
                    /*
                    self.saveNewNodes(triples.newNodesToStore, function (err, labelsMap) {//new nodes created on the fly
                        if (err) {
                            return callbackSeries(err)
                        }
                        newNodesLabelsMap = labelsMap;
                        callbackSeries()


                    })*/
                },
                //update  basicAxiomsCache  triples stored into basicAxiomsCache
                function (callbackSeries) {
                if(!newNodesLabelsMap)
                    return callbackSeries()
                    var basicAxiomsTriples = [] //triples stored into basicAxiomsCache
                    triples.forEach(function (triple) {

                        var item = {
                            s: triple.subject,
                            p: triple.predicate,
                            o: triple.object
                        }
                        if (newNodesLabelsMap[item.s]) {
                            item.sLabel = newNodesLabelsMap[item.s];
                        }
                        if (newNodesLabelsMap[item.p]) {
                            item.pLabel = newNodesLabelsMap[item.p];
                        }
                        if (newNodesLabelsMap[item.o]) {
                            item.oLabel = newNodesLabelsMap[item.o];
                        }
                        basicAxiomsTriples.push(item)

                    })
                    AxiomExtractor.addBasicAxioms(self.currentSource, basicAxiomsTriples)

                    callbackSeries()
                },

                //write axiomtriples
                function (callbackSeries) {
                    Sparql_generic.insertTriples(self.currentSource, triples, {}, function (err, result) {
                        if (err) {
                            return callbackSeries(err)
                            // return MainController.errorAlert(err.responseText);
                        }
                        callbackSeries()
                        /*   UI.message("axiom saved");
                           var divId = "nodeInfosAxioms_graphDiv";
                           var options = {};

                self.saveNewNodes(triples.newNodesToStore, function (err) {//new nodes created on the fly
                    if (err) {
                        return MainController.errorAlert(err.responseText || err);
                    }


                    AxiomExtractor.addTriplesToBasicAxioms(self.currentResource.data.source, triples, function (err, result) {
                        if (err) {
                            return MainController.errorAlert(err.responseText || err);
                        }

                        Axioms_graph.drawNodeAxioms2(self.currentResource.data.source, self.currentResource.data.id, triples, divId, options, function (err, triples) {
                        });
                    });
                })


            //add manchester to Axioms JSTree
            //  self.addAxiomToAxomsJstree(manchesterStr, triples);


            ;
            //  });
        }
    };

    self.addAxiomToAxomsJstree = function (manchesterStr, triples) {
        var id = common.getRandomHexaId(10);
        var jstreeData = [];
    self.addAxiomToAxomsJstree = function (manchesterStr, triples) {
        var id = common.getRandomHexaId(10);
        var jstreeData = [];

        var axiomTypeNode = $("#nodeInfosAxioms_axiomsJstreeDiv").jstree().get_node(self.axiomType);
        if (!axiomTypeNode) {
            jstreeData.push({
                id: self.axiomType,
                text: self.axiomType,
                parent: "rootNode",
            });
        }
        JstreeWidget.addNodesToJstree("nodeInfosAxioms_axiomsJstreeDiv", "rootNode", jstreeData);
        jstreeData = [
            {
                id: id,
                text: manchesterStr,
                parent: self.axiomType,
                data: {
                    id: manchesterStr,
                    label: manchesterStr,
                    triples: triples,
                    manchester: manchesterStr,
                },
            },
        ];
        JstreeWidget.addNodesToJstree("nodeInfosAxioms_axiomsJstreeDiv", self.axiomType, jstreeData);
    };
        var axiomTypeNode = $("#nodeInfosAxioms_axiomsJstreeDiv").jstree().get_node(self.axiomType);
        if (!axiomTypeNode) {
            jstreeData.push({
                id: self.axiomType,
                text: self.axiomType,
                parent: "rootNode",
            });
        }
        JstreeWidget.addNodesToJstree("nodeInfosAxioms_axiomsJstreeDiv", "rootNode", jstreeData);
        jstreeData = [
            {
                id: id,
                text: manchesterStr,
                parent: self.axiomType,
                data: {
                    id: manchesterStr,
                    label: manchesterStr,
                    triples: triples,
                    manchester: manchesterStr,
                },
            },
        ];
        JstreeWidget.addNodesToJstree("nodeInfosAxioms_axiomsJstreeDiv", self.axiomType, jstreeData);
    };

    self.axiomTriplesToManchester = function (triples, callback) {
        Axiom_manager.getManchesterAxiomsFromTriples(self.currentSource, triples, function (err, result) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                return MainController.errorAlert(err);
            }
            if (!result) {
                var message = "Error : cannot generate manchester form";
                if (callback) {
                    return callback(message);
                }
                return alert(message);
            }
    self.axiomTriplesToManchester = function (triples, callback) {
        Axiom_manager.getManchesterAxiomsFromTriples(self.currentSource, triples, function (err, result) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                return MainController.errorAlert(err);
            }
            if (!result) {
                var message = "Error : cannot generate manchester form";
                if (callback) {
                    return callback(message);
                }
                return alert(message);
            }

            var manchesterStr = Axiom_manager.parseManchesterClassAxioms(self.newAxiomNode.id, result);
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
            if (true || node.level >= self.newAxiomNode.level) {
                nodesMap[node.id] = node;

            }
        });

        edges.forEach(function (edge) {
            if (nodesMap[edge.from] && nodesMap[edge.to]) {
                if (!edgesFromMap[edge.from]) {
                    edgesFromMap[edge.from] = [];
                }
                edgesFromMap[edge.from].push(edge);
            }
        });
        edges.forEach(function (edge) {
            if (nodesMap[edge.from] && nodesMap[edge.to]) {
                if (!edgesFromMap[edge.from]) {
                    edgesFromMap[edge.from] = [];
                }
                edgesFromMap[edge.from].push(edge);
            }
        });

        // check Nodes without superClass to write them in the triplestore
        var newNodesToStore = []
        var newOrphanNodes = []
        nodes.forEach(function (node) {
            var x = node
            if (node.data.isNew) {// node created on the fly
                var toNode = edgesFromMap[node.id]
                if (!toNode) {//if not superClassOr property
                    node.data.superEntity = "http://www.w3.org/2002/07/owl#Thing"
                    newOrphanNodes.push(node)
                } else {
                    node.data.superEntity = toNode.id
        // check Nodes without superClass to write them in the triplestore
        var newNodesToStore = []
        var newOrphanNodes = []
        nodes.forEach(function (node) {
            var x = node
            if (node.data.isNew) {// node created on the fly
                var toNode = edgesFromMap[node.id]
                if (!toNode) {//if not superClassOr property
                    node.data.superEntity = "http://www.w3.org/2002/07/owl#Thing"
                    newOrphanNodes.push(node)
                } else {
                    node.data.superEntity = toNode.id

                }
                newNodesToStore.push(node)
            }
                }
                newNodesToStore.push(node)
            }

        })
        })

        if (newOrphanNodes.length > 0) {
            var str = ""
            newOrphanNodes.forEach(function (node) {
                str += node + ","
            })
            if (!confirm("Some nodes have no super class or property, continue aniway ?")) {
                return;
            }
        if (newOrphanNodes.length > 0) {
            var str = ""
            newOrphanNodes.forEach(function (node) {
                str += node + ","
            })
            if (!confirm("Some nodes have no super class or property, continue aniway ?")) {
                return;
            }

        }
        }


        var triples = [];
        var triples = [];

        function recurse(nodeId) {
            var edges = edgesFromMap[nodeId];
            if (!edges) {
                return;
            }
        function recurse(nodeId) {
            var edges = edgesFromMap[nodeId];
            if (!edges) {
                return;
            }

            edges.forEach(function (edge) {
                var triple = {};
                var fromNode = nodesMap[nodeId];
                var toNode = nodesMap[edge.to];
                var cardinalityStr = "";
            edges.forEach(function (edge) {
                var triple = {};
                var fromNode = nodesMap[nodeId];
                var toNode = nodesMap[edge.to];
                var cardinalityStr = "";

                var object = toNode.data.id;
                var predicate = null;
                if (fromNode.data.predicate) {
                    predicate = fromNode.data.predicate;
                }
                if (!fromNode.data.type) {
                    return;
                }
                var object = toNode.data.id;
                var predicate = null;
                if (fromNode.data.predicate) {
                    predicate = fromNode.data.predicate;
                }
                if (!fromNode.data.type) {
                    return;
                }

                if (fromNode.data.type.endsWith("Restriction")) {
                    if (toNode.data.type.endsWith("ObjectProperty")) {
                        predicate = "http://www.w3.org/2002/07/owl#onProperty";
                    } else {
                        predicate = fromNode.data.subType;
                    }
                } else if (fromNode.data.type.endsWith("Class")) {
                    predicate = "http://www.w3.org/2000/01/rdf-schema#subClassOf";
                } else if (fromNode.data.type.endsWith("ObjectProperty")) {
                    predicate = "http://www.w3.org/2000/01/rdf-schema#subPropertyOf";
                } else if (["Connective", "IntersectionOf", "UnionOf", "ComplementOf", "Enumeration"].indexOf(fromNode.data.type) > -1) {
                    if (fromNode.data.nCount == 0) {
                        predicate = "http://www.w3.org/1999/02/22-rdf-syntax-ns#first";
                    } else if (fromNode.data.nCount == 1) {
                        var bNode2 = self.getBlankNodeId();
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
                    toNode.data.bNodeid = self.getBlankNodeId();
                    triples.push({
                        subject: toNode.data.id,
                        predicate: toNode.data.subType,
                        object: toNode.data.bNodeid,
                    });

                }

                if (fromNode.data.cardinality) {
                    triples.push({
                        subject: fromNode.data.bNodeid || fromNode.data.id,
                        predicate: fromNode.data.subType,
                        object: '"' + fromNode.data.cardinality + '"' + "^^<http://www.w3.org/2001/XMLSchema#nonNegativeInteger>",
                    });

                }


                recurse(toNode.id);
            });
        }
                recurse(toNode.id);
            });
        }

        var rootNode = self.newAxiomNode || nodes[0];
        recurse(rootNode.id);
        var rootNode = self.newAxiomNode || nodes[0];
        recurse(rootNode.id);

        var nodeTypes = {
            ObjectProperty: "http://www.w3.org/2002/07/owl#ObjectProperty",
            Class: "http://www.w3.org/2002/07/owl#Class",
            Connective: "http://www.w3.org/2002/07/owl#Class",
            Restriction: "http://www.w3.org/2002/07/owl#Restriction",
        };
        for (var nodeId in nodesMap) {
            var node = nodesMap[nodeId];
            if (node.data.type) {
                triples.push({
                    subject: node.data.id,
                    predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                    object: nodeTypes[node.data.type] || node.data.type,
                });

            } else {

            }
        }
            }
        }


        triples.newNodesToStore = newNodesToStore
        Axioms_graph.currentAxiomTriples = triples

        //update AxiomIds with triples indexes.
        triples.forEach(function(triple,index){
            var node=nodesMap[triple.subject]
            if( node && !node.data.axiomId){
                node.data.axiomId=index
            }

             node=nodesMap[triple.object]
            if( node && !node.data.axiomId){
                node.data.axiomId=index
            }
        })
        NodeInfosAxioms.isNewAxiom=false

        return triples;
    };
        return triples;
    };

    self.saveNewNodes = function (nodes, callback) {// nodes created on the fly
    self.saveNewNodes = function (nodes, callback) {// nodes created on the fly

        if (!nodes || nodes.length == 0) {
            return callback();
        }
        var labelsMap = {}
        async.eachSeries(nodes, function (node, callbackEach) {
            if (node.data.type == "Class") {
                var superClass = node.data.superEntity || "http://www.w3.org/2002/07/owl#Class";
                var triples = Lineage_createResource.getResourceTriples(self.currentSource, "owl:Class", null, node.data.label, superClass);
                triples.forEach(function (triple) {
                    if (triple.predicate.indexOf("label") > -1) {
                        labelsMap[triple.subject] = triple.object
                    }
                })
                Lineage_createResource.writeResource(self.currentSource, triples, function (err, resourceId) {
                    if (err) {
                        return callbackEach(err)
                    }
                    callbackEach()
                })
            } else if (node.data.type == "ObjectProperty") {
                Lineage_createRelation.createSubProperty(self.currentSource, node.data.superEntity, node.data.label, true, function (err, result) {
                    if (err) {
                        return callbackEach(err)
                    }
                    labelsMap[result.uri] = node.data.label
                    callbackEach()
                })
            }
        }, function (err) {
            return callback(err, labelsMap)
        })
    }


    self.getBlankNodeId = function () {
        if (!self.bNodeCounter) {
            self.bNodeCounter = 0;
        }
        return "_:b" + self.bNodeCounter++;
    };
    self.getBlankNodeId = function () {
        if (!self.bNodeCounter) {
            self.bNodeCounter = 0;
        }
        return "_:b" + self.bNodeCounter++;
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
        var params = {source: self.currentSource, filteredUris: filteredUris};
        return CreateAxiomResource_bot.start(botWorkFlow, params, function (err, result) {
            if (err) {
                return MainController.errorAlert(err);
            }
            // update Axiom_manager
            if (resourceType == "Class") {
                Axiom_manager.allClasses.push(CreateAxiomResource_bot.params.newObject);
            } else if (resourceType == "ObjectProperty") {
                Axiom_manager.allProperties.push(CreateAxiomResource_bot.params.newObject);
            }
            Axiom_manager.allResourcesMap[CreateAxiomResource_bot.params.newObject.id] = CreateAxiomResource_bot.params.newObject;

            $("#axioms_legend_suggestionsSelect option").eq(0).before($("<option></option>").val(CreateAxiomResource_bot.params.newObject.id).text(CreateAxiomResource_bot.params.newObject.label));
            //   self.onLegendNodeClick({data:{id:"Class"}})
        });
    };
            $("#axioms_legend_suggestionsSelect option").eq(0).before($("<option></option>").val(CreateAxiomResource_bot.params.newObject.id).text(CreateAxiomResource_bot.params.newObject.label));
            //   self.onLegendNodeClick({data:{id:"Class"}})
        });
    };

    self.createAxiomFromGraph = function () {
        self.newAxiomNode = Axioms_graph.currentGraphNode;
        NodeInfosAxioms.newAxiom();
        var newNodes = [];
        Axioms_graph.axiomsVisjsGraph.data.nodes.forEach(function (node) {
            if (node.id != self.newAxiomNode.id) {
                var color = common.colorToRgba(node.color, 1);
                var fontColor = common.colorToRgba(Lineage_whiteboard.defaultNodeFontColor, 1);
                var opacity = Lineage_whiteboard.defaultLowOpacity;
    self.createAxiomFromGraph = function () {
        self.newAxiomNode = Axioms_graph.currentGraphNode;
        NodeInfosAxioms.newAxiom();
        var newNodes = [];
        Axioms_graph.axiomsVisjsGraph.data.nodes.forEach(function (node) {
            if (node.id != self.newAxiomNode.id) {
                var color = common.colorToRgba(node.color, 1);
                var fontColor = common.colorToRgba(Lineage_whiteboard.defaultNodeFontColor, 1);
                var opacity = Lineage_whiteboard.defaultLowOpacity;

                newNodes.push({
                    id: node.id,
                    color: color,
                    opacity: opacity,
                    font: {color: fontColor, opacity: opacity},
                });
            }
            Axioms_graph.axiomsVisjsGraph.data.nodes.update(newNodes);
        });

        /*     var options = self.axiomTypes
        common.fillSelectOptions("axioms_legend_suggestionsSelect", options, false);*/
    };
        /*     var options = self.axiomTypes
        common.fillSelectOptions("axioms_legend_suggestionsSelect", options, false);*/
    };

    self.loadSuggestionSelectJstree = function (objects, parentName) {
        if ($("#suggestionsSelectJstreeDiv").jstree()) {
            try {
                $("#suggestionsSelectJstreeDiv").jstree().empty();
            } catch {
            }
        }

        self.initSourcesMap(objects);
        self.filterSuggestionList = null;
        self.initSourcesMap(objects);
        self.filterSuggestionList = null;

        var options = {
            openAll: true,
        var options = {
            openAll: true,

            contextMenu: function (node, x) {
                var items = {};
                if (self.currentLegendNode.data.type == "Class" || self.currentLegendNode.data.type == "ObjectProperty") {
                    if (node.data && node.data.resourceType != "searchClass") {
                        items.NodeInfos = {
                            label: "nodeInfos",
                            action: function (_e) {
                                NodeInfosWidget.showNodeInfos(self.currentSource, self.currentResource, "smallDialogDiv");
                            },
                        };
                    }
                }
                return items;
            },
            selectTreeNodeFn: function (event, obj) {
                self.currentSuggestedNode = obj.node;
                var resourceUri = obj.node.data.id;
                self.onSuggestionsSelect(resourceUri);
            },
        };
        var jstreeData = [];
            contextMenu: function (node, x) {
                var items = {};
                if (self.currentLegendNode.data.type == "Class" || self.currentLegendNode.data.type == "ObjectProperty") {
                    if (node.data && node.data.resourceType != "searchClass") {
                        items.NodeInfos = {
                            label: "nodeInfos",
                            action: function (_e) {
                                NodeInfosWidget.showNodeInfos(self.currentSource, self.currentResource, "smallDialogDiv");
                            },
                        };
                    }
                }
                return items;
            },
            selectTreeNodeFn: function (event, obj) {
                self.currentSuggestedNode = obj.node;
                var resourceUri = obj.node.data.id;
                self.onSuggestionsSelect(resourceUri);
            },
        };
        var jstreeData = [];

        var color = "#333";
        if (parentName == "Class") {
            color = "#00afef";
        } else if (parentName == "ObjectProperty") {
            color = "#409304";
        } else {
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
        var color = "#333";
        if (parentName == "Class") {
            color = "#00afef";
        } else if (parentName == "ObjectProperty") {
            color = "#409304";
        } else {
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

        if (parentName == "Class" || parentName == "ObjectProperty") {
            var uniqueSources = {};
            var searchDone = {};
        if (parentName == "Class" || parentName == "ObjectProperty") {
            var uniqueSources = {};
            var searchDone = {};

            objects.forEach(function (item) {
                if (item.source) {
                    if (!uniqueSources[item.source]) {
                        uniqueSources[item.source] = 1;
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
                            text: "<span  style='color:" + color + "'>" + item.label + "</span>",
                            data: {
                                id: item.id,
                                text: item.label,
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
                        id: item.id,
                        parent: parentName,
                        text: "<span  style='color:" + color + "'>" + item.label + "</span>",
                        data: {
                            id: item.id,
                            label: item.label,
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
                            text: "<span  style='color:" + color + "'>" + item.label + "</span>",
                            data: {
                                id: item.id,
                                text: item.label,
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
                        id: item.id,
                        parent: parentName,
                        text: "<span  style='color:" + color + "'>" + item.label + "</span>",
                        data: {
                            id: item.id,
                            label: item.label,
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

        JstreeWidget.loadJsTree("axiomSuggestionsSelectJstreeDiv", jstreeData, options, function () {
            //  $("#suggestionsSelectJstreeDiv").css("overflow", "unset");
        });
    };
        JstreeWidget.loadJsTree("axiomSuggestionsSelectJstreeDiv", jstreeData, options, function () {
            //  $("#suggestionsSelectJstreeDiv").css("overflow", "unset");
        });
    };

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
            if (Axioms_graph.axiomsVisjsGraph) {
                var graphNodes = Axioms_graph.axiomsVisjsGraph.data.nodes.get();
                graphNodes.forEach(function (node) {
                    if (node.data && node.data.type == "Class" && sourcesMap[node.data.source]) {
                        sourcesMap[node.data.source].mappingClasses[node.data.id] = 1;
                    }
                });
            }
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
            if (Axioms_graph.axiomsVisjsGraph) {
                var graphNodes = Axioms_graph.axiomsVisjsGraph.data.nodes.get();
                graphNodes.forEach(function (node) {
                    if (node.data && node.data.type == "Class" && sourcesMap[node.data.source]) {
                        sourcesMap[node.data.source].mappingClasses[node.data.id] = 1;
                    }
                });
            }

            self.sourcesMap = sourcesMap;
        }
    };
            self.sourcesMap = sourcesMap;
        }
    };

    self.clearSuggestionsJstree = function () {
        $("#axiomSuggestionsSelectJstreeDiv").jstree().empty();
    };
    self.clearSuggestionsJstree = function () {
        $("#axiomSuggestionsSelectJstreeDiv").jstree().empty();
    };

    return self;
})
();

//Axiom_activeLegend.testTriplesCreation()

export default Axiom_activeLegend;
window.Axiom_activeLegend = Axiom_activeLegend;
