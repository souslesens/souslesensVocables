import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import Lineage_whiteboard from "./lineage_whiteboard.js";
import OntologyModels from "../../shared/ontologyModels.js";
import Lineage_blend from "./lineage_blend.js";

var Lineage_createRelation = (function () {
    var self = {};

    self.showAddEdgeFromGraphDialog = function (edgeData, callback) {
        $("#LineagePopup").dialog("open");
        $("#LineagePopup").dialog("option", "title", "Create relation in source " + Lineage_sources.activeSource);
        $("#LineagePopup").load("snippets/lineage/lineageAddEdgeDialog.html", function () {
            self.sourceNode = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get(edgeData.from).data;
            self.targetNode = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get(edgeData.to).data;

            var source = Lineage_sources.activeSource;

            let options = {
                openAll: true,
                selectTreeNodeFn: Lineage_blend.OnSelectAuthorizedPredicatesTreeDiv,
            };
            var jstreeData = [];
            var distinctProps = {};
            var authorizedProps = {};

            let inSource = Config.currentTopLevelOntology;

            if (!Config.sources[source].editable) {
                $("#lineageAddEdgeDialog_Title").html("source " + source + " is not editable");
                return;
            } else {
                $("#lineageAddEdgeDialog_Title").html(
                    "upper ontology : <b>" +
                        Config.currentTopLevelOntology +
                        "</b><br><span onclick='Lineage_blend.showNodeInfos(\"start\")'>" +
                        self.sourceNode.label +
                        "</span> -><span onclick='Lineage_blend.showNodeInfos(\"end\")'> " +
                        self.targetNode.label
                ) + "</span>";
                //  $("#lineageAddEdgeDialog_Title").append("<button onclick='Lineage_blend.reverseAddEdgesNodes()'>reverse</button>");
            }

            let sourceNodeTopLevelOntologyAncestors = {};
            let targetNodeTopLevelOntologyAncestors = {};

            if (!self.sourceNode.rdfType) {
                self.sourceNode.rdfType = self.sourceNode.type;
            }
            if (!self.targetNode.rdfType) {
                self.targetNode.rdfType = self.targetNode.type;
            }

            var source = source;

            async.series(
                [
                    function (callbackSeries) {
                        if (true || (self.sourceNode.rdfType == "NamedIndividual" && self.targetNode.rdfType == "NamedIndividual")) {
                            jstreeData.push({
                                id: "http://www.w3.org/2002/07/owl#sameAs",
                                text: "owl:sameAs",
                                parent: "#",
                                data: {
                                    id: "http://www.w3.org/2002/07/owl#sameAs",
                                    inSource: Config.dictionarySource,
                                },
                            });
                        }
                        if (self.sourceNode.rdfType != "NamedIndividual" && self.targetNode.rdfType != "NamedIndividual") {
                            jstreeData.push({
                                id: "http://www.w3.org/2002/07/owl#equivalentClass",
                                text: "owl:equivalentClass",
                                parent: "#",
                                data: {
                                    id: "http://www.w3.org/2002/07/owl#equivalentClass",
                                    inSource: Config.dictionarySource,
                                },
                            });
                        }
                        if (true) {
                            jstreeData.push({
                                id: "http://www.w3.org/2002/07/owl#equivalentClass",
                                text: "owl:equivalentClass",
                                parent: "#",
                                data: {
                                    id: "http://www.w3.org/2002/07/owl#equivalentClass",
                                    inSource: Config.dictionarySource,
                                },
                            });
                        }

                        if (true || self.sourceNode.rdfType == "NamedIndividual") {
                            jstreeData.push({
                                id: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",

                                text: "rdf:type",
                                parent: "#",
                                data: {
                                    id: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                                    inSource: source,
                                },
                            });
                        }

                        if (Config.sources[source].schemaType == "OWL" && self.sourceNode.rdfType != "NamedIndividual") {
                            jstreeData.push({
                                id: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                                text: "rdfs:subClassOf",
                                parent: "#",
                                data: {
                                    id: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                                    inSource: source,
                                },
                            });
                        }
                        if (Config.sources[source].schemaType == "OWL") {
                            jstreeData.push({
                                id: "http://www.w3.org/2000/01/rdf-schema#member",
                                text: "rdfs:member",
                                parent: "#",
                                data: {
                                    id: "http://www.w3.org/2000/01/rdf-schema#member",
                                    inSource: source,
                                },
                            });
                        }

                        callbackSeries();
                    },

                    function (callbackSeries) {
                        OntologyModels.getAllowedPropertiesBetweenNodes(source, self.sourceNode.id, self.targetNode.id, function (err, result) {
                            if (err) {
                                return callbackSeries(err);
                            }
                            authorizedProps = result.constraints;

                            var html = "Ancestors<br>";
                            var str = "<b>" + self.sourceNode.label + "</b>";
                            result.nodes.startNode.forEach(function (item, index) {
                                str += "->";
                                str += Sparql_common.getLabelFromURI(item);
                            });
                            html += str;
                            html += "<br>";
                            var str = "<b>" + self.targetNode.label + "</b>";
                            result.nodes.endNode.forEach(function (item, index) {
                                str += "->";
                                str += Sparql_common.getLabelFromURI(item);
                            });
                            html += str;
                            $("#lineageAddEdgeDialog_nodesAncestorsDiv").html(html);

                            return callbackSeries();
                        });
                    },
                    function (callbackSeries) {
                        return callbackSeries();
                    },

                    function (callbackSeries) {
                        var sources = [source];
                        var imports = Config.sources[source].imports;
                        if (imports) {
                            sources = sources.concat(imports);
                        }

                        var propStatusCssClassMap = {
                            noConstraints: "lineageAddEdgeDialog_topLevelOntologyGenericProp",
                            both: "lineageAddEdgeDialog_topLevelOntologyProp",
                            domain: "lineageAddEdgeDialog_topLevelOntologySemiGenericProp",
                            range: "lineageAddEdgeDialog_topLevelOntologySemiGenericProp",
                            //  domain: "lineageAddEdgeDialog_domainOntologyProp"
                        };

                        var uniqueProps = {};
                        sources.forEach(function (_source) {
                            jstreeData.push({
                                id: _source,
                                text: _source,
                                parent: "#",
                                data: {
                                    id: _source,
                                    text: _source,
                                },
                            });
                            var array = [];
                            for (var group in authorizedProps) {
                                for (var propId in authorizedProps[group]) {
                                    var property = authorizedProps[group][propId];

                                    if (property.source == _source) {
                                        if (!uniqueProps[propId]) {
                                            uniqueProps[propId] = 1;
                                            var propertyLabel = property.label || Sparql_common.getLabelFromURI(propId);
                                            var label = (property.domainLabel || "any") + "<b>-" + propertyLabel + "-></b>" + (property.rangeLabel || "any");

                                            var cssClass = propStatusCssClassMap[group];
                                            var parent = property.source;
                                            if (property.parent) {
                                                parent = property.parent;
                                            }
                                            /*
                      if(parent==undefined){
                          parent='http://rds.posccaesar.org/ontology/lis14/rdl/arrangedPartOf';
                          property.source="ISO_15926-part-14_PCA";

                      }
                      */
                                            array.push({
                                                id: propId,
                                                text: "<span class='" + cssClass + "'>" + label + "</span>",
                                                parent: parent,

                                                data: {
                                                    propLabel: property.label,
                                                    id: propId,
                                                    label: label,
                                                    source: property.source,
                                                },
                                            });
                                        }
                                    }
                                }
                            }

                            array.sort(function (a, b) {
                                if (a.data.propLabel > b.data.propLabel) return 1;
                                if (a.data.propLabel < b.data.propLabel) return -1;
                                return 0;
                            });

                            jstreeData = jstreeData.concat(array);
                        });
                        //  })

                        return callbackSeries();
                    },

                    function (callbackSeries) {
                        options.contextMenu = {
                            refineProperty: {
                                label: "Refine Property",
                                action: function (_e) {
                                    if (false && self.currentPropertiesTreeNode.data.source != Config.currentTopLevelOntology) {
                                        return alert("only properties from " + Config.currentTopLevelOntology + " can be refined");
                                    }
                                    var subPropertyLabel = prompt("enter label for subProperty of property " + self.currentPropertiesTreeNode.data.label);
                                    if (!subPropertyLabel) {
                                        return;
                                    }
                                    Lineage_blend.createSubProperty(Lineage_sources.activeSource, self.currentPropertiesTreeNode.data.id, subPropertyLabel, function (err, result) {
                                        if (err) {
                                            return alert(err);
                                        }

                                        if (!self.domainOntologyProperties) {
                                            self.domainOntologyProperties = [];
                                        }
                                        var newProp = {
                                            id: result.uri,
                                            label: subPropertyLabel,
                                            superProp: self.currentPropertiesTreeNode.data.id,
                                        };
                                        self.domainOntologyProperties.push(newProp);
                                        var propId = newProp.id;
                                        /*
                    OntologyModels.registerSourcesModel(Lineage_sources.activeSource, function (err, result2) {
                        if (err) {
                            return alert(err.responsetext);
                        }

                        var jstreeData = [
                            {
                                id: result.uri,
                                text: subPropertyLabel,
                                parent: self.currentPropertiesTreeNode.data.id,
                                data: {
                                    id: result.uri,
                                    label: subPropertyLabel,
                                    source: Lineage_sources.activeSource,
                                },
                            },
                        ];

                        JstreeWidget.addNodesToJstree("lineageAddEdgeDialog_authorizedPredicatesTreeDiv", self.currentPropertiesTreeNode.data.id, jstreeData, options);
                    });
                    */
                                        var superpropConstraints = JSON.parse(
                                            JSON.stringify(Config.ontologiesVocabularyModels[Config.currentTopLevelOntology]["constraints"][self.currentPropertiesTreeNode.data.id])
                                        );
                                        superpropConstraints.source = Lineage_sources.activeSource;
                                        superpropConstraints.label = subPropertyLabel;
                                        superpropConstraints.parent = self.currentPropertiesTreeNode.data.id;
                                        superpropConstraints.superProp = self.currentPropertiesTreeNode.data.id;
                                        var propertiesToAdd = {};
                                        propertiesToAdd[propId] = newProp;
                                        var constraintsToAdd = {};
                                        constraintsToAdd[propId] = superpropConstraints;
                                        OntologyModels.updateModel(Lineage_sources.activeSource, { properties: propertiesToAdd, constraints: constraintsToAdd }, null, function (err, result2) {
                                            if (err) {
                                                return alert(err.responsetext);
                                            }

                                            var jstreeData = [
                                                {
                                                    id: result.uri,
                                                    text: subPropertyLabel,
                                                    parent: self.currentPropertiesTreeNode.data.id,
                                                    data: {
                                                        id: result.uri,
                                                        label: subPropertyLabel,
                                                        source: Lineage_sources.activeSource,
                                                    },
                                                },
                                            ];

                                            JstreeWidget.addNodesToJstree("lineageAddEdgeDialog_authorizedPredicatesTreeDiv", self.currentPropertiesTreeNode.data.id, jstreeData, options);
                                        });
                                    });
                                },
                            },
                            nodeInfos: {
                                label: "Node infos",
                                action: function (_e) {
                                    // pb avec source
                                    NodeInfosWidget.showNodeInfos(self.currentPropertiesTreeNode.data.source, self.currentPropertiesTreeNode, "mainDialogDiv");
                                },
                            },
                        };

                        options.doNotAdjustDimensions = 1;
                        JstreeWidget.loadJsTree("lineageAddEdgeDialog_authorizedPredicatesTreeDiv", jstreeData, options, function (err) {});
                        callbackSeries();
                    },
                ],

                function (err) {
                    if (err) {
                        return callback(err);
                    }

                    if (edgeData.from === edgeData.to) {
                        return callback(null);
                    } else {
                        return callback(null);
                    }
                }
            );
        });
    };

    self.execAddEdgeFromGraph = function () {};
    self.addGenericPredicatesToPredicatesTree = function () {
        var jstreeData = [];
        Lineage_upperOntologies.objectPropertiesMap[Config.currentTopLevelOntology].forEach(function (item) {
            if (item.isGenericProperty) {
                var text = "<span class='lineageAddEdgeDialog_topLevelOntologyGenericProp'>" + (item.propLabel ? item.propLabel.value : Sparql_common.getLabelFromURI(item.prop.value)) + "</span>";

                jstreeData.push({
                    id: item.prop.value,
                    text: text,
                    parent: "#",
                    data: {
                        id: item.prop.value,
                        label: item.propLabel,
                        source: Config.currentTopLevelOntology,
                    },
                });
            }
        });

        JstreeWidget.addNodesToJstree("lineageAddEdgeDialog_authorizedPredicatesTreeDiv", "#", jstreeData, { positionLast: 1 });
    };
    self.createRelationFromGraph = function (inSource, sourceNode, targetNode, propId, options, callback) {
        if (!confirm("create Relation " + sourceNode.label + "-" + Sparql_common.getLabelFromURI(propId) + "->" + targetNode.label + " in Graph " + inSource)) {
            return;
        }
        $("#LineagePopup").dialog("close");

        var isRestriction = true;
        if (propId == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" || propId == "http://www.w3.org/2000/01/rdf-schema#subClassOf") {
            isRestriction = false;
        }
        if (sourceNode.type == "NamedIndividual") {
            isRestriction = false;
        }
        if (
            (propId == "http://www.w3.org/2002/07/owl#sameAs" || propId == "http://www.w3.org/2002/07/owl#equivalentClass") &&
            sourceNode.source == Lineage_sources.activeSource &&
            targetNode.source == Lineage_sources.activeSource
        ) {
            isRestriction = false;
        }

        if (!isRestriction) {
            var triples = [];
            triples.push({
                subject: sourceNode.id,
                predicate: propId,
                object: targetNode.id,
            });

            Sparql_generic.insertTriples(inSource, triples, {}, function (err, _result) {
                if (err) {
                    return callback(err);
                }
                return callback(null, { type: "ObjectProperty", id: sourceNode.id + "_" + propId + "_" + targetNode.id });
            });
        } else {
            var oldRelations = Lineage_whiteboard.lineageVisjsGraph.getNodeEdges(sourceNode.id, targetNode.id);
            self.createRelation(inSource, propId, sourceNode, targetNode, true, true, {}, function (err, blankNodeId) {
                if (err) {
                    return callback(err);
                }
                MainController.UI.message("relation added", true);

                if (oldRelations.length > 0) {
                    if (confirm("delete previous relation " + oldRelations[0].data.propertyLabel)) {
                        Lineage_blend.deleteRestriction(Lineage_sources.activeSource, oldRelations[0], function (err) {
                            if (err) {
                                alert(err);
                            }
                        });
                    }
                }

                return callback(null, { type: "Restriction", id: blankNodeId });
            });
        }
    };

    return self;
})();

export default Lineage_createRelation;
window.Lineage_createRelation = Lineage_createRelation;
