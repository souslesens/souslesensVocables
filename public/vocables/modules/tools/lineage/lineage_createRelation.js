import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import Lineage_whiteboard from "./lineage_whiteboard.js";
import OntologyModels from "../../shared/ontologyModels.js";
import common from "../../shared/common.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";

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
                selectTreeNodeFn: Lineage_createRelation.OnSelectAuthorizedPredicatesTreeDiv,
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
                        "</b><br><span onclick='Lineage_createRelation.showNodeInfos(\"start\")'>" +
                        self.sourceNode.label +
                        "</span> -><span onclick='Lineage_createRelation.showNodeInfos(\"end\")'> " +
                        self.targetNode.label
                ) + "</span>";
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
                                    Lineage_createRelation.createSubProperty(Lineage_sources.activeSource, self.currentPropertiesTreeNode.data.id, subPropertyLabel, function (err, result) {
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
                        Lineage_createRelation.deleteRestriction(Lineage_sources.activeSource, oldRelations[0], function (err) {
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

    self.showNodeInfos = function (role) {
        var node = null;

        if (role == "start") {
            var nodeData = self.sourceNode;
        } else if (role == "end") {
            nodeData = self.targetNode;
        }
        if (nodeData) {
            var node = {
                id: nodeData.id,
                data: nodeData,
            };
            NodeInfosWidget.showNodeInfos(nodeData.source, node, "mainDialogDiv");
        }
    };
    self.OnSelectAuthorizedPredicatesTreeDiv = function (event, obj) {
        event.stopPropagation();
        self.currentPropertiesTreeNode = obj.node;
        if (obj.event.which == 3) {
            return;
        }
        //dispatch of sources to write in depending on relation type and editable
        var inSource;
        var options = {};
        if (obj.node.data.id == "http://www.w3.org/2002/07/owl#sameAs" || obj.node.data.id == "http://www.w3.org/2002/07/owl#equivalentClass") {
            // le sameAs sont tous dans le dictionaire
            inSource = Config.dictionarySource;
        } else {
            var mainSource = Config.sources[Lineage_sources.activeSource];
            if (Config.sources[self.sourceNode.source].editable) {
                inSource = self.sourceNode.source;
            } else if (mainSource.editable) {
                inSource = Lineage_sources.activeSource;
            }
            //soit  dans predicateSource
            else {
                inSource = Config.predicatesSource;
            }
        }

        Lineage_createRelation.createRelationFromGraph(inSource, self.sourceNode, self.targetNode, obj.node.data.id, options, function (err, result) {
            if (err) {
                return callback(err);
            }
            var relationId = result.id || "<_:b" + common.getRandomHexaId(10) + ">";
            let propLabel = obj.node.data.label || Sparql_common.getLabelFromURI(obj.node.data.id);

            let newEdge = {
                id: relationId,
                from: self.sourceNode.id,
                to: self.targetNode.id,
            };
            newEdge.label = "<i>" + propLabel + "</i>";
            (newEdge.font = { multi: true, size: 10 }),
                (newEdge.arrows = {
                    to: {
                        enabled: true,
                        type: Lineage_whiteboard.defaultEdgeArrowType,
                        scaleFactor: 0.5,
                    },
                });
            newEdge.dashes = true;

            if (result.type == "ObjectProperty") {
                newEdge.color = Lineage_whiteboard.defaultPredicateEdgeColor;
                newEdge.font = { color: Lineage_whiteboard.defaultPredicateEdgeColor };
                newEdge.data = {
                    id: relationId,
                    type: "ObjectProperty",
                    propLabel: propLabel,
                    from: self.sourceNode.id,
                    to: self.targetNode.id,
                    prop: obj.node.data.id,
                    source: inSource,
                };
            } else if (result.type == "Restriction") {
                newEdge.color = Lineage_whiteboard.restrictionColor;
                newEdge.font = { color: Lineage_whiteboard.restrictionColor };
                newEdge.data = {
                    source: inSource,
                    bNodeId: relationId,
                    propertyLabel: propLabel,
                    propertyId: obj.node.data.id,
                };
                OntologyModels.updateModel;
            }

            Lineage_whiteboard.lineageVisjsGraph.data.edges.add([newEdge]);
        });
    };

    self.createSubProperty = function (source, superPropId, subPropertyLabel, callback) {
        var subPropId = common.getURI(subPropertyLabel, source, "fromLabel");
        //  var subPropId = Config.sources[source].graphUri + common.getRandomHexaId(10);
        var triples = [
            {
                subject: subPropId,
                predicate: "rdf:type",
                object: "owl:ObjectProperty",
            },
            {
                subject: subPropId,
                predicate: "rdfs:label",
                object: subPropertyLabel,
            },
            {
                subject: subPropId,
                predicate: "rdfs:subPropertyOf",
                object: superPropId,
            },
        ];

        Sparql_generic.insertTriples(source, triples, null, function (err, _result) {
            callback(err, { uri: subPropId });
        });
    };

    self.createRelation = function (inSource, type, sourceNode, targetNode, addImportToCurrentSource, createInverseRelation, options, callback) {
        if (type != "http://www.w3.org/2002/07/owl#sameAs" && type != "http://www.w3.org/2002/07/owl#equivalentClass") {
            createInverseRelation = false;
        }
        var blankNodeId;
        async.series(
            [
                function (callbackSeries) {
                    if (!addImportToCurrentSource) {
                        return callbackSeries();
                    }
                    self.setNewImport(Lineage_sources.activeSource, targetNode.source, function (err, _result) {
                        callbackSeries(err);
                    });
                },

                function (callbackSeries) {
                    var relations = { type: type, sourceNode: sourceNode, targetNode: targetNode };
                    var options = {};
                    self.createRelationTriples(relations, createInverseRelation, inSource, options, function (err, _result) {
                        blankNodeId = _result;
                        callbackSeries(err);
                    });
                },
            ],
            function (err) {
                if (err) {
                    if (callback) {
                        return callback(err);
                    }
                    return alert(err);
                }
                if (callback) {
                    return callback(null, blankNodeId);
                }
            }
        );
    };
    self.createRelationTriples = function (relations, createInverseRelation, inSource, options, callback) {
        var allTriples = [];
        if (!Array.isArray(relations)) {
            relations = [relations];
        }
        var normalBlankNode;
        var propId;
        relations.forEach(function (relation) {
            propId = relation.type;

            var restrictionTriples = self.getRestrictionTriples(relation.sourceNode.id, relation.targetNode.id, propId);

            normalBlankNode = restrictionTriples.blankNode;
            var metadataOptions = {
                domainSourceLabel: relation.sourceNode.source,
                rangeSourceLabel: relation.targetNode.source,
            };
            if (!options) {
                options = {};
            }
            var origin = options.origin || "manual";
            var status = options.status || "candidate";

            var metaDataTriples = self.getCommonMetaDataTriples(normalBlankNode, origin, status, metadataOptions);
            restrictionTriples = restrictionTriples.concat(metaDataTriples);

            if (createInverseRelation) {
                var restrictionTriplesInverse = self.getRestrictionTriples(relation.targetNode.id, relation.sourceNode.id, propId);
                var inverseBlankNode = restrictionTriplesInverse.blankNode;
                restrictionTriples = restrictionTriples.concat(restrictionTriplesInverse);
                var inverseMetadataOptions = {
                    domainSourceLabel: relation.targetNode.source,
                    rangeSourceLabel: relation.sourceNode.source,
                };
                var inverseMetaDataTriples = self.getCommonMetaDataTriples(inverseBlankNode, origin, status, inverseMetadataOptions);
                restrictionTriples = restrictionTriples.concat(inverseMetaDataTriples);

                restrictionTriples.push({
                    subject: normalBlankNode,
                    predicate: "http://www.w3.org/2002/07/owl#inverseOf",
                    object: inverseBlankNode,
                });
                restrictionTriples.push({
                    subject: inverseBlankNode,
                    predicate: "http://www.w3.org/2002/07/owl#inverseOf",
                    object: normalBlankNode,
                });
            }

            if (!Config.ontologiesVocabularyModels[inSource].restrictions[propId]) {
                Config.ontologiesVocabularyModels[inSource].restrictions[propId] = [];
            }

            var modelData = {
                restrictions: {
                    [propId]: [
                        {
                            domain: relation.sourceNode.id,
                            range: relation.targetNode.id,
                            domainLabel: relation.sourceNode.label,
                            rangeLabel: relation.targetNode.label,
                        },
                    ],
                },
            };

            OntologyModels.updateModel(inSource, modelData, {}, function (err, result) {
                console.log(err || "ontologyModelCache updated");
            });

            allTriples = allTriples.concat(restrictionTriples);
            if (options.additionalTriples) {
                allTriplesallTriples.concat(options.additionalTriples);
            }
        });

        Sparql_generic.insertTriples(inSource, allTriples, null, function (err, _result) {
            return callback(err, normalBlankNode);
        });
    };
    self.deleteRestriction = function (inSource, restrictionNode, callback) {
        if (callback || confirm("delete selected restriction")) {
            var inverseRestriction = null;

            async.series(
                [
                    // delete restriction
                    function (callbackSeries) {
                        Sparql_generic.deleteTriples(inSource, restrictionNode.data.bNodeId, null, null, function (_err, _result) {
                            callbackSeries();
                        });
                    },
                    function (callbackSeries) {
                        Sparql_generic.deleteTriples(inSource, null, null, restrictionNode.data.bNodeId, function (_err, _result) {
                            callbackSeries();
                        });
                    },
                    // search if inverse exists
                    function (callbackSeries) {
                        Sparql_OWL.getInverseRestriction(inSource, restrictionNode.data.bNodeId, function (err, result) {
                            if (err) {
                                return callbackSeries(err);
                            }
                            if (result.length == 0) {
                                return callbackSeries();
                            }
                            inverseRestriction = result[0].subject.value;
                            callbackSeries();
                        });
                    },
                    // delete inverse restriction
                    function (callbackSeries) {
                        if (!inverseRestriction) {
                            return callbackSeries();
                        }
                        Sparql_generic.deleteTriples(inSource, inverseRestriction, null, null, function (_err, _result) {
                            callbackSeries();
                        });
                    },
                    function (callbackSeries) {
                        if (!inverseRestriction) {
                            return callbackSeries();
                        }
                        Sparql_generic.deleteTriples(inSource, null, null, inverseRestriction, function (_err, _result) {
                            callbackSeries();
                        });
                    },
                    function (callbackSeries) {
                        // update OntologyModel by removing restriction
                        var dataToRemove = { restrictions: [restrictionNode.data.propertyId] };
                        OntologyModels.updateModel(inSource, dataToRemove, { remove: true }, function (err, result) {
                            callback(err);
                        });
                    },
                ],
                function (_err) {
                    Lineage_whiteboard.lineageVisjsGraph.data.edges.remove(restrictionNode.id);
                    Lineage_whiteboard.lineageVisjsGraph.data.edges.remove(inverseRestriction);
                    MainController.UI.message("restriction removed", true);
                    if (callback) {
                        return callback(_err);
                    }
                }
            );
        }
    };

    self.setNewImport = function (mainSourceLabel, importedSourceLabel, callback) {
        if (mainSourceLabel == importedSourceLabel) {
            return callback();
        }
        var mainSource = Config.sources[mainSourceLabel];
        if (!mainSource) {
            return alert("nos source with label " + mainSourceLabel);
        }
        if (!mainSource.imports) {
            mainSource.imports = [];
        }
        var imports = mainSource.imports.concat(mainSource);
        if (imports && imports.indexOf(importedSourceLabel) > -1) {
            return callback();
        }
        if (!confirm("add  source " + importedSourceLabel + " to imports of source " + mainSourceLabel)) {
            return callback("stop");
        }

        self.addImportToCurrentSource(mainSourceLabel, importedSourceLabel, function (_err, _result) {
            Lineage_whiteboard.registerSource(importedSourceLabel);
            callback();
        });
    };
    self.addImportToCurrentSource = function (parentSourceLabel, importedSourceLabel, callback) {
        var payload = {
            importedSource: importedSourceLabel,
        };
        $.ajax({
            type: "POST",
            url: `${Config.apiUrl}/sources/${parentSourceLabel}/imports`,
            data: payload,
            dataType: "json",
            success: function (_data, _textStatus, _jqXHR) {
                if (!Config.sources[parentSourceLabel].imports) {
                    //synchro on client
                    Config.sources[parentSourceLabel].imports = [];
                }
                Config.sources[parentSourceLabel].imports.push(importedSourceLabel);
                return callback();
            },
            error: function (err) {
                return callback(err);
            },
        });
    };

    self.getRestrictionTriples = function (sourceNodeId, targetNodeId, propId) {
        var restrictionsTriples = [];
        var blankNode = "_:b" + common.getRandomHexaId(10);

        restrictionsTriples.push({
            subject: sourceNodeId,
            predicate: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
            object: blankNode,
        });
        restrictionsTriples.push({
            subject: blankNode,
            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            object: "http://www.w3.org/2002/07/owl#Restriction",
        });
        restrictionsTriples.push({
            subject: blankNode,
            predicate: "http://www.w3.org/2002/07/owl#onProperty",
            object: propId,
        });
        restrictionsTriples.push({
            subject: blankNode,
            predicate: "http://www.w3.org/2002/07/owl#someValuesFrom",
            object: targetNodeId,
        });

        restrictionsTriples.blankNode = blankNode;
        return restrictionsTriples;
    };

    self.getCommonMetaDataTriples = function (subjectUri, source, status, options) {
        var metaDataTriples = [];
        if (!options) {
            options = {};
        }
        var login = authentication.currentUser.login;
        //  var authorUri = Config.defaultNewUriRoot + "users/" + login;
        var dateTime = common.dateToRDFString(new Date(), true) + "^^xsd:dateTime";

        metaDataTriples.push({
            subject: subjectUri,
            predicate: "http://purl.org/dc/terms/creator",
            object: login,
        });

        metaDataTriples.push({
            subject: subjectUri,
            predicate: "http://purl.org/dc/terms/created",
            object: dateTime,
        });
        if (status) {
            metaDataTriples.push({
                subject: subjectUri,
                predicate: "https://www.dublincore.org/specifications/bibo/bibo/bibo.rdf.xml#status",
                object: status,
            });
        }
        if (source) {
            metaDataTriples.push({
                subject: subjectUri,
                predicate: "http://purl.org/dc/terms/source",
                object: source,
            });
        }
        if (options) {
            for (var key in options) {
                metaDataTriples.push({
                    subject: subjectUri,
                    predicate: (Config.sousLeSensVocablesGraphUri || "http://data.souslesens.org/") + "property#" + key,
                    object: options[key],
                });
            }
        }

        return metaDataTriples;
    };

    return self;
})();

export default Lineage_createRelation;
window.Lineage_createRelation = Lineage_createRelation;
