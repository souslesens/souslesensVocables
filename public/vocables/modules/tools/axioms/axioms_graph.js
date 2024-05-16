import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import Axioms_editor from "./axioms_editor.js";

var Axioms_graph = (function () {
    var self = {};

    self.drawAxiomsJowlTriples = function (graphDiv, triples) {
        if (!triples) {
            triples = self.getTestTriples();
        }

        if (!graphDiv) {
            $("#smallDialogDiv").dialog("close");
            graphDiv = "axiomsGraphDiv";
            $("#mainDialogDiv").dialog("open");
            var html = "<div id='" + graphDiv + "' style='width:850px;height:500px'></div>";
            $("#mainDialogDiv").html(html);
        }

        var visjsData = self.getVisjsData(triples);
        //  var visjsData = self.getManchesterVisjsData();
        self.drawGraph(graphDiv, visjsData);
    };

    self.processTriples = function (triples) {
        var triplesMap = {};
        var resourcesMap = [];
        triples.forEach(function (item) {
            if (item.object.indexOf("#nil") == 0) {
                return;
            }

            if (item.subject.startsWith("[OntObject]")) {
            } else {
                resourcesMap[item.subject] = {};
            }
            if (item.object.startsWith("[OntObject]")) {
            } else {
                resourcesMap[item.object] = {};
            }
        });
    };

    self.getEdge = function (id, from, to) {
        var edge = {
            id: id,
            from: from,
            to: to,
            // label: symbol,
            arrows: {
                to: {
                    enabled: true,
                    type: "solid",
                    scaleFactor: 0.5,
                },
            },
            data: {
                id: id,
                from: from,
                to: to,
                // label: item.predicate,
                type: "sss",
            },
        };
        return edge;
    };

    self.getVisjsData = function (triples) {
        var cleanUri = function (uri) {
            return uri.replace("[OntObject]", "");
        };
        var getLabel = function (uri, predicateUri) {
            if (uri.indexOf("http") < 0) {
                if (false && predicateUri) {
                    return Sparql_common.getLabelFromURI(predicateUri);
                } else {
                    return "";
                }
            } else {
                return Sparql_common.getLabelFromURI(uri);
            }
        };

        var triplesMap = {};
        triples.forEach(function (item) {
            triplesMap[item.object] = { label: getLabel(item.object, item.predicate) };
            if (!triplesMap[item.subject]) {
                triplesMap[item.subject] = { label: getLabel(item.subject) };
            }
        });

        var visjsData = { nodes: [], edges: [] };
        var existingNodes = {};
        var existingEdges = {};

        var symbol = "dot";
        var style = {
            label: "dddd",
            shape: "dot",
            color: "green",
        };
        var level = 0;
        triples.forEach(function (item) {
            //   item.subject = cleanUri(item.subject);
            //   item.object = cleanUri(item.object);

            if (item.object.indexOf("nil") > -1) {
                return;
            }

            if (!existingNodes[item.object]) {
                var label = triplesMap[item.object].label;
                existingNodes[item.object] = {
                    id: item.object,
                    label: label,
                    shape: "dot",
                    color: symbol ? "#9db99d" : style.color,
                    size: 8,
                    level: ++level,
                    data: {
                        id: item.object,
                        label: label,
                        type: "ss",
                        source: "dd",
                    },
                };
            }

            if (!existingNodes[item.subject]) {
                var label = triplesMap[item.subject].label;
                existingNodes[item.subject] = {
                    id: item.subject,
                    label: label,
                    shape: "dot",
                    color: symbol ? "#9db99d" : style.color,
                    size: 8,
                    level: level,
                    data: {
                        id: item.subject,
                        label: label,
                        type: "ss",
                        source: "dd",
                    },
                };
            }

            var edgeId = item.subject + "_" + item.object;

            if (!existingEdges[edgeId]) {
                existingEdges[edgeId] = 1;
                visjsData.edges.push({
                    id: edgeId,
                    from: item.subject,
                    to: item.object,
                    label: Sparql_common.getLabelFromURI(item.predicate),
                    arrows: {
                        to: {
                            enabled: true,
                            type: "solid",
                            scaleFactor: 0.5,
                        },
                    },
                    data: {
                        id: edgeId,
                        from: item.subject,
                        to: item.object,
                        label: item.predicate,
                        type: "sss",
                    },
                });
            }
        });

        visjsData.edges.forEach(function (edge, index) {
            if (edge.from.indexOf("http") < 0 && edge.to.indexOf("http") < 0) {
                edge.length = 0;
                edge.arrows = null;

                existingNodes[edge.to].shape = "text";
                existingNodes[edge.to].label = "";
            }
            if (edge.label == "intersectionOf") {
                edge.length = 0;
                edge.label = "";
                edge.arrows = null;

                existingNodes[edge.to].label = "intersectionOf";
            }
        });

        for (var key in existingNodes) {
            visjsData.nodes.push(existingNodes[key]);
        }

        return visjsData;
    };

    self.drawGraph = function (graphDiv, visjsData) {
        var xOffset = 60;
        var yOffset = 130;
        xOffset = parseInt($("#axiomsDraw_xOffset").val());
        yOffset = parseInt($("#axiomsDraw_yOffset").val());
        var options = {
            keepNodePositionOnDrag: true,
            /* physics: {
    enabled:true},*/

            /*   layoutHierarchical: {
                       direction: "LR",
                       sortMethod: "hubsize",
                       levelSeparation: xOffset,
                       parentCentralization: true,
                       shakeTowards: "roots",
                       blockShifting: true,

                       nodeSpacing: yOffset
                   },*/
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
            onclickFn: Lineage_axioms_draw.onNodeClick,
            onRightClickFn: Lineage_axioms_draw.showGraphPopupMenu,
            onHoverNodeFn: Lineage_axioms_draw.selectNodesOnHover,
        };

        /*   var graphDivContainer = "axiomsGraphDivContainer";
               $("#" + graphDivContainer).html(
                   "<span style='font-size: 16px;color: blue; font-weight: bold'> WORK IN PROGRESS</span>" +
                   "  <button onclick=\"AxiomEditor.init()\">Edit Axiom</button>" +
                   "<div id='axiomsGraphDiv' style='width:100%;height:525px;' onclick='  PopupMenuWidget.hidePopup(\"axioms_popupMenuWidgetDiv\")';></div>"
               );*/
        self.axiomsVisjsGraph = new VisjsGraphClass(graphDiv, visjsData, options);
        self.axiomsVisjsGraph.draw(function () {});
    };

    self.onNodeClick = function (node, point, nodeEvent) {
        self.currentGraphNode = node;
        if (nodeEvent.ctrlKey) {
            return self.expandNode(node);
        }
        self.showNodeInfos(node, point, nodeEvent);
        return;
    };

    /* self.getManchesterVisjsData = function() {

             var x = " <https://spec.industrialontologies.org/ontology/core/Core/BusinessProcess>" +
                 " SubClassOf: (" +
                 " <https://spec.industrialontologies.org/ontology/core/Core/prescribedBy> some (<https://spec.industrialontologies.org/ontology/core/Core/PlanSpecification> and ( <http://purl.obolibrary.org/obo/BFO_0000110> some (<https://spec.industrialontologies.org/ontology/core/Core/ObjectiveSpecification> and (<http://purl.obolibrary.org/obo/BFO_0000084> some <https://spec.industrialontologies.org/ontology/core/Core/BusinessOrganization>)))))";

 //var x="<https://spec.industrialontologies.org/ontology/core/Core/BusinessProcess> subClassOf: (<http://purl.obolibrary.org/obo/BFO_0000054> only <https://spec.industrialontologies.org/ontology/core/Core/BusinessProcess>)"


             var regex = /\([^\(\)]*(?:(\([^\(\)]*(?:(\([^\(\)]*(?:(\([^\(\)]*(?:(\([^\(\)]*(?:(\([^\(\)]*(?:(\([^\(\)]*(?:(\([^\(\)]*(?:(\([^\(\)]*(?:(\([^\(\)]*(?:(\([^\(\)]*?\))+?[^\(\)]*)*?\))+?[^\(\)]*)*?\))+?[^\(\)]*)*?\))+?[^\(\)]*)*?\))+?[^\(\)]*)*?\))+?[^\(\)]*)*?\))+?[^\(\)]*)*?\))+?[^\(\)]*)*?\))+?[^\(\)]*)*?\))+?[^\(\)]*)*?\)/gm;


             var groups = regex.exec("(" + x + ")");


             var triples = [];

             var previousItem = "";

             //clean items from redanadant previousItem
             groups.forEach(function(item, index) {
                 if (item) {
                     if (index < groups.length - 1) {
                         item = item.replace(groups[index + 1], "");
                     }
                     item = item.replace("(", "").replace(")", "");
                     var array = item.trim().split(" ");



                     var obj = [];


                     array.forEach(function(item2, index2) {

                         if (index2 == 1) {

                             obj.push({ id: common.getRandomHexaId(7), label: item2 });
                         } else {
                             obj.push({ id: item2, label: Sparql_common.getLabelFromURI(item2) });
                         }


                     });
                     triples.push(obj);

                 }


             });
             var visjsData = { nodes: [], edges: [] };
             var existingIds = {};

             var symbol = "dot";
             var style = {
                 label: "dddd",
                 shape: "dot",
                 color: "green"
             };
             var lastAndOrNode;
             triples.forEach(function(item, index) {

                 item.forEach(function(item2, index2) {


                     if(item2.label=="and") {

                         return;
                     }

                     if (!existingIds[item2.id]) {
                         existingIds[item2.id] = 1;
                         visjsData.nodes.push({
                             id: item2.id,
                             label: item2.label,
                             shape: "dot",
                             color: symbol ? "#9db99d" : style.color,
                             size: 8,
                             data: {
                                 id: item2.id,
                                 label: item2.label,
                                 type: "ss",
                                 source: "dd"
                             }
                         });

                     }

                     var from, to;
                     if (index2 > 0) {
                         from = item[index2 - 1].id;
                         to = item2.id;

                         var edgeId = common.getRandomHexaId(5);
                         visjsData.edges.push( self.getEdge(edgeId,from,to) )


                     }
                 });


                 if (index> 0) {
                     var to = item[0].id;
                     var from = triples[index - 1][1].id;

                     var edgeId = common.getRandomHexaId(5);
                     visjsData.edges.push( self.getEdge(edgeId,from,to) )


                 }


             });

             return visjsData;

         };*/

    self.getTestTriples = function () {
        var triples = [
            {
                subject: "[OntObject]da24fcfc-796f-4dac-91a7-4154abdf7f22",
                predicate: "http://www.w3.org/2002/07/owl#allValuesFrom",
                object: "[OntObject]https://spec.industrialontologies.org/ontology/core/Core/BusinessProcess",
            },
            {
                subject: "[OntObject]da24fcfc-796f-4dac-91a7-4154abdf7f22",
                predicate: "http://www.w3.org/2002/07/owl#onProperty",
                object: "[OntObject]http://purl.obolibrary.org/obo/BFO_0000054",
            },
            {
                subject: "[OntObject]https://spec.industrialontologies.org/ontology/core/Core/BusinessProcess",
                predicate: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                object: "[OntObject]da24fcfc-796f-4dac-91a7-4154abdf7f22",
            },
        ];

        triples = [
            {
                subject: "[OntObject]eb2b3d52-c5ae-4bbf-a52a-8ad9285bbe51",
                predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#first",
                object: "[OntObject]https://spec.industrialontologies.org/ontology/core/Core/PlanSpecification",
            },
            {
                subject: "[OntObject]fe52eb26-6606-4153-9fab-062cc7c59c6c",
                predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#first",
                object: "[OntObject]13501abe-51f3-4efc-ab99-ed7dc09bb338",
            },
            {
                subject: "[OntObject]277998be-4825-4dff-a482-86324537737f",
                predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest",
                object: "[OntObject]fe52eb26-6606-4153-9fab-062cc7c59c6c",
            },
            {
                subject: "[OntObject]13501abe-51f3-4efc-ab99-ed7dc09bb338",
                predicate: "http://www.w3.org/2002/07/owl#someValuesFrom",
                object: "[OntObject]https://spec.industrialontologies.org/ontology/core/Core/BusinessOrganization",
            },
            {
                subject: "[OntObject]13501abe-51f3-4efc-ab99-ed7dc09bb338",
                predicate: "http://www.w3.org/2002/07/owl#onProperty",
                object: "[OntObject]http://purl.obolibrary.org/obo/BFO_0000084",
            },
            {
                subject: "[OntObject]d567db23-43c9-48de-9c63-3929d0ae14d8",
                predicate: "http://www.w3.org/2002/07/owl#someValuesFrom",
                object: "[OntObject]f5d543ef-cddc-42d5-8b85-85f0f0cf624a",
            },
            {
                subject: "[OntObject]a5d6384d-1090-4108-865a-30fdfc2abd78",
                predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#first",
                object: "[OntObject]cdfab58a-7a6e-41fa-b58c-1c9531698af2",
            },
            {
                subject: "[OntObject]d8adc221-3bbb-4577-b38f-007ccbd93671",
                predicate: "http://www.w3.org/2002/07/owl#intersectionOf",
                object: "[OntObject]277998be-4825-4dff-a482-86324537737f",
            },
            {
                subject: "[OntObject]fe52eb26-6606-4153-9fab-062cc7c59c6c",
                predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest",
                object: "[OntObject]http://www.w3.org/1999/02/22-rdf-syntax-ns#nil",
            },
            {
                subject: "[OntObject]cdfab58a-7a6e-41fa-b58c-1c9531698af2",
                predicate: "http://www.w3.org/2002/07/owl#onProperty",
                object: "[OntObject]http://purl.obolibrary.org/obo/BFO_0000110",
            },
            {
                subject: "[OntObject]f5d543ef-cddc-42d5-8b85-85f0f0cf624a",
                predicate: "http://www.w3.org/2002/07/owl#intersectionOf",
                object: "[OntObject]eb2b3d52-c5ae-4bbf-a52a-8ad9285bbe51",
            },
            {
                subject: "[OntObject]a5d6384d-1090-4108-865a-30fdfc2abd78",
                predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest",
                object: "[OntObject]http://www.w3.org/1999/02/22-rdf-syntax-ns#nil",
            },
            {
                subject: "[OntObject]https://spec.industrialontologies.org/ontology/core/Core/BusinessProcess",
                predicate: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                object: "[OntObject]d567db23-43c9-48de-9c63-3929d0ae14d8",
            },
            {
                subject: "[OntObject]eb2b3d52-c5ae-4bbf-a52a-8ad9285bbe51",
                predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest",
                object: "[OntObject]a5d6384d-1090-4108-865a-30fdfc2abd78",
            },
            {
                subject: "[OntObject]277998be-4825-4dff-a482-86324537737f",
                predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#first",
                object: "[OntObject]https://spec.industrialontologies.org/ontology/core/Core/ObjectiveSpecification",
            },
            {
                subject: "[OntObject]cdfab58a-7a6e-41fa-b58c-1c9531698af2",
                predicate: "http://www.w3.org/2002/07/owl#someValuesFrom",
                object: "[OntObject]d8adc221-3bbb-4577-b38f-007ccbd93671",
            },
            {
                subject: "[OntObject]d567db23-43c9-48de-9c63-3929d0ae14d8",
                predicate: "http://www.w3.org/2002/07/owl#onProperty",
                object: "[OntObject]https://spec.industrialontologies.org/ontology/core/Core/prescribedBy",
            },
        ];
        return triples;
    };
    return self;
})();

export default Axioms_graph;
window.Axioms_graph = Axioms_graph;
