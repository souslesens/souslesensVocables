import VisjsGraphClass from "../../graph/VisjsGraphClass.js";

var Axioms_graph = (function() {
        var self = {};


        self.drawAxiomsJowlTriples = function(graphDiv, triples) {

            if (!triples) {

                triples = [{
                    "subject": "[OntObject]da24fcfc-796f-4dac-91a7-4154abdf7f22",
                    "predicate": "http://www.w3.org/2002/07/owl#allValuesFrom",
                    "object": "[OntObject]https://spec.industrialontologies.org/ontology/core/Core/BusinessProcess"
                }, {
                    "subject": "[OntObject]da24fcfc-796f-4dac-91a7-4154abdf7f22",
                    "predicate": "http://www.w3.org/2002/07/owl#onProperty",
                    "object": "[OntObject]http://purl.obolibrary.org/obo/BFO_0000054"
                }, {
                    "subject": "[OntObject]https://spec.industrialontologies.org/ontology/core/Core/BusinessProcess",
                    "predicate": "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                    "object": "[OntObject]da24fcfc-796f-4dac-91a7-4154abdf7f22"
                }];
            }

             triples=[{"subject":"[OntObject]eb2b3d52-c5ae-4bbf-a52a-8ad9285bbe51","predicate":"http://www.w3.org/1999/02/22-rdf-syntax-ns#first","object":"[OntObject]https://spec.industrialontologies.org/ontology/core/Core/PlanSpecification"}, {"subject":"[OntObject]fe52eb26-6606-4153-9fab-062cc7c59c6c","predicate":"http://www.w3.org/1999/02/22-rdf-syntax-ns#first","object":"[OntObject]13501abe-51f3-4efc-ab99-ed7dc09bb338"}, {"subject":"[OntObject]277998be-4825-4dff-a482-86324537737f","predicate":"http://www.w3.org/1999/02/22-rdf-syntax-ns#rest","object":"[OntObject]fe52eb26-6606-4153-9fab-062cc7c59c6c"}, {"subject":"[OntObject]13501abe-51f3-4efc-ab99-ed7dc09bb338","predicate":"http://www.w3.org/2002/07/owl#someValuesFrom","object":"[OntObject]https://spec.industrialontologies.org/ontology/core/Core/BusinessOrganization"}, {"subject":"[OntObject]13501abe-51f3-4efc-ab99-ed7dc09bb338","predicate":"http://www.w3.org/2002/07/owl#onProperty","object":"[OntObject]http://purl.obolibrary.org/obo/BFO_0000084"}, {"subject":"[OntObject]d567db23-43c9-48de-9c63-3929d0ae14d8","predicate":"http://www.w3.org/2002/07/owl#someValuesFrom","object":"[OntObject]f5d543ef-cddc-42d5-8b85-85f0f0cf624a"}, {"subject":"[OntObject]a5d6384d-1090-4108-865a-30fdfc2abd78","predicate":"http://www.w3.org/1999/02/22-rdf-syntax-ns#first","object":"[OntObject]cdfab58a-7a6e-41fa-b58c-1c9531698af2"}, {"subject":"[OntObject]d8adc221-3bbb-4577-b38f-007ccbd93671","predicate":"http://www.w3.org/2002/07/owl#intersectionOf","object":"[OntObject]277998be-4825-4dff-a482-86324537737f"}, {"subject":"[OntObject]fe52eb26-6606-4153-9fab-062cc7c59c6c","predicate":"http://www.w3.org/1999/02/22-rdf-syntax-ns#rest","object":"[OntObject]http://www.w3.org/1999/02/22-rdf-syntax-ns#nil"}, {"subject":"[OntObject]cdfab58a-7a6e-41fa-b58c-1c9531698af2","predicate":"http://www.w3.org/2002/07/owl#onProperty","object":"[OntObject]http://purl.obolibrary.org/obo/BFO_0000110"}, {"subject":"[OntObject]f5d543ef-cddc-42d5-8b85-85f0f0cf624a","predicate":"http://www.w3.org/2002/07/owl#intersectionOf","object":"[OntObject]eb2b3d52-c5ae-4bbf-a52a-8ad9285bbe51"}, {"subject":"[OntObject]a5d6384d-1090-4108-865a-30fdfc2abd78","predicate":"http://www.w3.org/1999/02/22-rdf-syntax-ns#rest","object":"[OntObject]http://www.w3.org/1999/02/22-rdf-syntax-ns#nil"}, {"subject":"[OntObject]https://spec.industrialontologies.org/ontology/core/Core/BusinessProcess","predicate":"http://www.w3.org/2000/01/rdf-schema#subClassOf","object":"[OntObject]d567db23-43c9-48de-9c63-3929d0ae14d8"}, {"subject":"[OntObject]eb2b3d52-c5ae-4bbf-a52a-8ad9285bbe51","predicate":"http://www.w3.org/1999/02/22-rdf-syntax-ns#rest","object":"[OntObject]a5d6384d-1090-4108-865a-30fdfc2abd78"}, {"subject":"[OntObject]277998be-4825-4dff-a482-86324537737f","predicate":"http://www.w3.org/1999/02/22-rdf-syntax-ns#first","object":"[OntObject]https://spec.industrialontologies.org/ontology/core/Core/ObjectiveSpecification"}, {"subject":"[OntObject]cdfab58a-7a6e-41fa-b58c-1c9531698af2","predicate":"http://www.w3.org/2002/07/owl#someValuesFrom","object":"[OntObject]d8adc221-3bbb-4577-b38f-007ccbd93671"}, {"subject":"[OntObject]d567db23-43c9-48de-9c63-3929d0ae14d8","predicate":"http://www.w3.org/2002/07/owl#onProperty","object":"[OntObject]https://spec.industrialontologies.org/ontology/core/Core/prescribedBy"}]


            if (!graphDiv) {
                $("#smallDialogDiv").dialog("close");
                graphDiv = "axiomsGraphDiv";
                $("#mainDialogDiv").dialog("open");
                var html = "<div id='" + graphDiv + "' style='width:850px;height:500px'></div>";
                $("#mainDialogDiv").html(html);

            }
            var visjsData = self.getVisjsData(triples);
            self.drawGraph(graphDiv,visjsData);
        };

        self.getVisjsData = function(triples) {
            var cleanUri = function(uri) {
                return uri.replace("[OntObject]", "");
            };
            var visjsData = { nodes: [], edges: [] };
            var existingIds = {};

            var symbol="dot";
            var style={
                label:"dddd",
                shape:"dot",
                color:"green"
            }
           var  level=0
            triples.forEach(function(item) {
                item.subject =cleanUri(item.subject)
                item.object =cleanUri(item.object)

                if(!existingIds[item.subject]){
                    existingIds[item.subject]=1
                    visjsData.nodes.push({
                        id: item.subject,
                        label: symbol || style.label,
                        shape: symbol ? "circle" : style.shape,
                        color: symbol ? "#9db99d" : style.color,
                        size: 8,
                        level: level,
                        data: {
                            id: item.subject,
                            label: item.subject,
                            type: "ss",
                            source: "dd",
                        },
                    });

                }

                if(!existingIds[item.object]){
                    existingIds[item.object]=1
                    visjsData.nodes.push({
                        id: item.object,
                        label: symbol || style.label,
                        shape: symbol ? "circle" : style.shape,
                        color: symbol ? "#9db99d" : style.color,
                        size: 8,
                        level: ++level,
                        data: {
                            id: item.object,
                            label: item.object,
                            type: "ss",
                            source: "dd",
                        },
                    });

                }

                var edgeId = item.subject + "_" + item.object;


                if (!existingIds[edgeId]) {
                    existingIds[edgeId] = 1;
                    visjsData.edges.push({
                        id: edgeId,
                        from: item.subject,
                        to: item.object,
                        // label: symbol,
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
            return visjsData
        };


        self.drawGraph = function(graphDiv, visjsData) {
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

                            roundness: 0.4
                        }
                    }
                },
                onclickFn: Lineage_axioms_draw.onNodeClick,
                onRightClickFn: Lineage_axioms_draw.showGraphPopupMenu,
                onHoverNodeFn: Lineage_axioms_draw.selectNodesOnHover
            };

         /*   var graphDivContainer = "axiomsGraphDivContainer";
            $("#" + graphDivContainer).html(
                "<span style='font-size: 16px;color: blue; font-weight: bold'> WORK IN PROGRESS</span>" +
                "  <button onclick=\"AxiomEditor.init()\">Edit Axiom</button>" +
                "<div id='axiomsGraphDiv' style='width:100%;height:525px;' onclick='  PopupMenuWidget.hidePopup(\"axioms_popupMenuWidgetDiv\")';></div>"
            );*/
            self.axiomsVisjsGraph = new VisjsGraphClass(graphDiv, visjsData, options);
            self.axiomsVisjsGraph.draw(function() {
            });
        };

        self.onNodeClick = function(node, point, nodeEvent) {
            self.currentGraphNode = node;
            if (nodeEvent.ctrlKey) {
                return self.expandNode(node);
            }
            self.showNodeInfos(node, point, nodeEvent);
            return;


        };
        return self;
    }
)();

export default Axioms_graph;
window.Axioms_graph = Axioms_graph;