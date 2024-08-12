import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import Axiom_editor from "./axiom_editor.js";
import Axiom_activeLegend from "./axiom_activeLegend.js";

var Axioms_graph = (function () {
    var self = {};

    self.getVisjsNode = function (node, level) {
        var color = "#ddd";
        var shape = "box";
        var label = node.symbol || node.label || "";
        var size = 8;
        var font = null;
        if (node.symbol) {
            shape = "circle";
            color = "#70ac47";
            if (node.symbol == "^") {
                shape = "ellipse";
                font = { bold: true };
                color = "#f5ef39";
            }
        } else if (node.owlType && node.owlType.indexOf("Class") > -1) {
            color = "#00afef";
            shape = "dot";
            font = { bold: true, color: color };
        } else if (node.owlType && node.owlType.indexOf("ObjectProperty") > -1) {
            color = "#f5ef39";
        } else if (node.owlType && node.owlType.indexOf("Restriction") > -1) {
            label = "some";
            color = "#cb9801";
        } else {
            shape = "dot";
            size = 0.2;
            color = "#70ac47";
        }

        var visjsNode = {
            id: node.id,
            label: label,
            shape: shape,
            color: color,
            size: size,
            level: level,
            font: font,
            data: {
                id: node.id,
                label: node.label || "",
                type: node.owlType,
                source: node.source,
            },
        };
        return visjsNode;
    };

    self.drawNodeAxioms2 = function (sourceLabel, nodeId, manchesterTriples, divId, options, callback) {
        if (!options) options = {};
        self.graphDivId = divId;
        var nodesMap = {};
        var visjsData = { nodes: [], edges: [] };
        var edgesToRemove = {};
        var disjointClassesAxiomRoot=null;
        async.series(
            [
                //format mancheseter triples
                function (callbackSeries) {
                    var data = [];
                    manchesterTriples.forEach(function (triple) {
                        var s = triple.subject.replace("[OntObject]", "");
                        var p = triple.predicate.replace("[OntObject]", "");
                        var o = triple.object.replace("[OntObject]", "");

                        function getType(uri) {
                            if (uri.indexOf("http") > -1) {
                                return "uri";
                            }
                            return "bnode";
                        }

                        if (!nodesMap[s]) {
                            nodesMap[s] = { id: s };
                            if (s.indexOf("http") == 0) {
                                var obj = Axiom_editor.allResourcesMap[s];
                                nodesMap[s].label = obj ? obj.label.replace(/_/g, " ") : null;
                            }
                        }
                        if (p == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" && !nodesMap[s].owlType) {
                            nodesMap[s].owlType = o;
                        } else if (p == "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest" && o == "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil") {
                            return;
                        } else {
                            if (!nodesMap[s].predicates) {
                                nodesMap[s].predicates = [];
                            }

                            var obj = Axiom_editor.allResourcesMap[p];
                            nodesMap[s].predicates.push({ p: p, o: o, pLabel: obj ? obj.label.replace(/_/g, " ") : null });
                        }

                        if (p == "http://www.w3.org/2002/07/owl#unionOf") {
                            nodesMap[s].owlType = "unionOf";
                            nodesMap[s].symbol = "⨆";
                        } else if (p == "http://www.w3.org/2002/07/owl#intersectionOf") {
                            nodesMap[s].owlType = "intersectionOf";
                            nodesMap[s].symbol = "⊓";
                        } else if (p == "http://www.w3.org/2002/07/owl#complementOf") {
                            nodesMap[s].owlType = "complementOf";
                            nodesMap[s].symbol = "┓";
                        } else if (p == "http://www.w3.org/2002/07/owl#inverseOf") {
                            nodesMap[s].owlType = "inverseOf";
                            nodesMap[s].symbol = "^";
                        }else if (p == "http://www.w3.org/2002/07/owl#members") {
                            nodesMap[s].owlType = "AllDisjointClasses";
                            nodesMap[s].symbol =  "⊑ ┓";
                        }




                        if(o== "http://www.w3.org/2002/07/owl#AllDisjointClasses"){
                            disjointClassesAxiomRoot= s
                        }


                    });
                    var x = nodesMap;
                    callbackSeries();
                },

                //recurse nodes from nodeId
                function (callbackSeries) {
                    var existingNodes = {};

                    if(options.addToGraph && self.axiomsVisjsGraph ){
                        existingNodes= self.axiomsVisjsGraph.getExistingIdsMap()
                    }
                    var stop = false;

                    function recurse(nodeId, level) {

                        if (stop) {
                            return;
                        }

                        var node = nodesMap[nodeId];
                        if (!node) {
                            return;
                        }

                        if (node.id == "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil") {
                            return;
                        }

                        // children
                        var skipNode = false;

                        if (node.predicates) {
                            node.predicates.forEach(function (predicate) {
                                var childNode = nodesMap[predicate.o];
                                if (!childNode) {
                                    return;
                                }

                                if (predicate.p == "http://www.w3.org/1999/02/22-rdf-syntax-ns#first") {
                                    skipNode = true;
                                }
                                if (predicate.p == "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest") {
                                    skipNode = true;
                                }

                                if (!existingNodes[childNode.id]) {
                                    existingNodes[childNode.id] = 1;

                                    var visjsNode = self.getVisjsNode(childNode, level + 1);
                                    visjsData.nodes.push(visjsNode);
                                }

                                var edgeId = node.id + "_" + childNode.id;

                                var arrows = null;
                                if (!visjsNode) {
                                    visjsNode={}   // return;
                                }
                                if ( visjsNode.shape != "dot" && predicate.p != "http://www.w3.org/2002/07/owl#inverseOf") {
                                    arrows = {
                                        to: {
                                            enabled: true,
                                            type: "solid",
                                            scaleFactor: 0.5,
                                        },
                                    };
                                }
                                if (!existingNodes[edgeId]) {
                                    existingNodes[edgeId] = 1;
                                    visjsData.edges.push({
                                        id: edgeId,
                                        from: node.id,
                                        to: childNode.id,

                                        arrows: arrows,
                                        data: {
                                            id: edgeId,
                                            from: node.id,
                                            to: childNode.id,
                                        },
                                    });

                                    recurse(predicate.o, level + 1);
                                }
                            });

                            if (existingNodes[nodeId]) {
                                visjsData.nodes.forEach(function (node, nodeIndex) {
                                    if (node.id == nodeId && node.level > level) {
                                        visjsData.nodes[nodeIndex].level = level;
                                    }
                                });
                            } else {
                                if (!skipNode) {
                                    existingNodes[node.id] = 1;
                                    var visjsNode = self.getVisjsNode(node, level);

                                    visjsData.nodes.push(visjsNode);
                                }
                            }
                        }
                    }

                    var level = 1;
                    if(options.startLevel){
                        level=options.startLevel
                    }

                  //  when disjointClassesAxiomRoot is not null tree starts from it
                    recurse(disjointClassesAxiomRoot ||nodeId, level);

                    return callbackSeries();
                },
    //optimize nodes levels
                function (callbackSeries) {

              var nodesMap=common.array.toMap(visjsData.nodes,"id")
                    visjsData.edges.forEach(function (edge, nodeIndex) {
                    ;//    if(nodesMap[edge.from].level<nodesMap[edge.to].level)
                      ;//  if(edge)
                    })

                    return callbackSeries();


                },
                //draw graph
                function (callbackSeries) {
                    if (options.addToGraph && self.axiomsVisjsGraph) {

                        self.graphOptions.visjsOptions.layout.hierarchical.enabled = true;
                        self.axiomsVisjsGraph.network.setOptions(self.graphOptions.visjsOptions);


                        self.axiomsVisjsGraph.data.nodes.add(visjsData.nodes);
                        self.axiomsVisjsGraph.data.edges.add(visjsData.edges);
                    } else {
                        self.drawGraph(visjsData, divId, options);
                        self.currentVisjsData = visjsData;
                    }
                    return callbackSeries();
                },
            ],

            function (err) {
                if (callback) {
                    return callback(err);
                }
            }
        );
    };

    self.drawGraph = function (visjsData, graphDiv, options) {
        var xOffset = 80;
        var yOffset = 80;
        //    xOffset = parseInt($("#axiomsDraw_xOffset").val());
        //   yOffset = parseInt($("#axiomsDraw_yOffset").val());

       self.graphOptions = {
            keepNodePositionOnDrag: true,
            /* physics: {
enabled:true},*/

            layoutHierarchical: {
                direction: "LR",
                sortMethod: "hubsize",
                levelSeparation: xOffset,
                // parentCentralization: false,
                shakeTowards: "roots",
                blockShifting: true,
                edgeMinimization: true,
                parentCentralization: true,

                nodeSpacing: yOffset,
            },
            visjsOptions: {
                edges: {
                    smooth: {
                        type: "cubicBezier",
                        // type: "diagonalCross",
                        forceDirection: "horizontal",

                        roundness: 0.4,
                    },
                },
            },
            onclickFn: options.onNodeClick,
            onRightClickFn: Axioms_graph.showGraphPopupMenu,
        };

        /*   $("#" + self.graphDivContainer).html(
               "<span style='font-size: 16px;color: blue; font-weight: bold'> WORK IN PROGRESS</span>" +
               "  <button onclick=\"AxiomEditor.init()\">Edit Axiom</button>" +
               "<div id='axiomsGraphDiv3' style='width:800px;height:525px;' onclick='  PopupMenuWidget.hidePopup(\"axioms_popupMenuWidgetDiv\")';></div>"
           );*/

        self.axiomsVisjsGraph = new VisjsGraphClass(graphDiv, visjsData,  self.graphOptions);
        self.axiomsVisjsGraph.draw(function () {

            self.graphOptions.visjsOptions.layout.hierarchical.enabled = false;
            self.axiomsVisjsGraph.network.setOptions(self.graphOptions.visjsOptions);



        });
    };

    self.showGraphPopupMenu = function () {};

    self.clearGraph = function () {
        $("#" + self.graphDivId).html("");
    };

    self.sampleTriples = [
        {
            subject: "https://spec.industrialontologies.org/ontology/core/Core/BuyingBusinessProcess",
            predicate: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
            object: "_cf23908b-4568-4f73-9c09-fbf688aaa92f",
        },
        {
            subject: "https://spec.industrialontologies.org/ontology/core/Core/CommercialServiceAgreement",
            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            object: "http://www.w3.org/2002/07/owl#Class",
        },
        {
            subject: "_cf23908b-4568-4f73-9c09-fbf688aaa92f",
            predicate: "http://www.w3.org/2002/07/owl#onProperty",
            object: "http://purl.obolibrary.org/obo/BFO_0000167",
        },
        {
            subject: "http://purl.obolibrary.org/obo/BFO_0000167",
            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            object: "http://www.w3.org/2002/07/owl#ObjectProperty",
        },
        {
            subject: "_c44c5bfa-6011-413e-8c2c-c4d08a7c24fa",
            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            object: "http://www.w3.org/2002/07/owl#Ontology",
        },
        {
            subject: "_2cba2cae-ed14-45ca-a705-193ae9d044b2",
            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest",
            object: "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil",
        },
        {
            subject: "_cf23908b-4568-4f73-9c09-fbf688aaa92f",
            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            object: "http://www.w3.org/2002/07/owl#Restriction",
        },
        {
            subject: "_81b2dbe0-c5aa-4dd6-8f30-d98590de9af7",
            predicate: "http://www.w3.org/2002/07/owl#unionOf",
            object: "_db33cc04-5921-48cd-8171-c4d286549abd",
        },
        {
            subject: "_db33cc04-5921-48cd-8171-c4d286549abd",
            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest",
            object: "_2cba2cae-ed14-45ca-a705-193ae9d044b2",
        },
        {
            subject: "_81b2dbe0-c5aa-4dd6-8f30-d98590de9af7",
            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            object: "http://www.w3.org/2002/07/owl#Class",
        },
        {
            subject: "https://spec.industrialontologies.org/ontology/core/Core/BuyingBusinessProcess",
            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            object: "http://www.w3.org/2002/07/owl#Class",
        },
        {
            subject: "https://spec.industrialontologies.org/ontology/core/Core/MaterialProduct",
            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            object: "http://www.w3.org/2002/07/owl#Class",
        },
        {
            subject: "_cf23908b-4568-4f73-9c09-fbf688aaa92f",
            predicate: "http://www.w3.org/2002/07/owl#someValuesFrom",
            object: "_81b2dbe0-c5aa-4dd6-8f30-d98590de9af7",
        },
        {
            subject: "_2cba2cae-ed14-45ca-a705-193ae9d044b2",
            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#first",
            object: "https://spec.industrialontologies.org/ontology/core/Core/MaterialProduct",
        },
        {
            subject: "_db33cc04-5921-48cd-8171-c4d286549abd",
            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#first",
            object: "https://spec.industrialontologies.org/ontology/core/Core/CommercialServiceAgreement",
        },
    ];
    return self;
})();

export default Axioms_graph;
window.Axioms_graph = Axioms_graph;
