import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import Lineage_whiteboard from "./lineage_whiteboard.js";
import OntologyModels from "../../shared/ontologyModels.js";
import common from "../../shared/common.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import Lineage_sources from "./lineage_sources.js";
import CreateRestriction_bot from "../../bots/createRestriction_bot.js";

/**
 * @module Lineage_createRelation
 * @description Module for creating and managing relationships between ontology nodes.
 * Provides functionality for:
 * - Creating new relationships between nodes in the ontology
 * - Managing relationship types and properties
 * - Validating relationship constraints
 * - Supporting different types of ontological relationships
 * - Managing relationship metadata and restrictions
 * - Integrating with the ontology model system
 */

var Lineage_createRelation = (function () {
    var self = {};

    /**
     * Displays a dialog to create a relation between two ontology nodes.
     * The dialog allows the user to select a relation type from a predefined list of properties.
     * @function
     * @name showAddEdgeFromGraphDialog
     * @memberof Lineage_createRelation
     * @param {Object} edgeData - Data of the edge containing source and target nodes.
     * @param {string} edgeData.from - The ID of the source node.
     * @param {string} edgeData.to - The ID of the target node.
     * @param {Function} callback - Callback function executed after the relation is created.
     * @returns {void}
     */
    self.showAddEdgeFromGraphDialog = function (edgeData, callback) {
        self.callbackFn = callback;
        $("#smallDialogDiv").dialog("option", "title", "Create relation in source " + Lineage_sources.activeSource);
        Lineage_sources.showHideEditButtons(Lineage_sources.activeSource);
        $("#smallDialogDiv").load("modules/tools/lineage/html/lineageAddEdgeDialog.html", function () {
            $("#smallDialogDiv").dialog("open");
            self.sourceNode = edgeData.from; // Lineage_whiteboard.lineageVisjsGraph.data.nodes.get(edgeData.from).data;
            self.targetNode = edgeData.to; //Lineage_whiteboard.lineageVisjsGraph.data.nodes.get(edgeData.to).data;

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
                        self.targetNode.label,
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
                                type: "Property",
                                data: {
                                    id: "http://www.w3.org/2002/07/owl#sameAs",
                                    inSource: Config.dictionarySource,
                                },
                            });
                        }
                        /*
                        if (self.sourceNode.rdfType != "NamedIndividual" && self.targetNode.rdfType != "NamedIndividual") {
                            jstreeData.push({
                                id: "http://www.w3.org/2002/07/owl#equivalentClass",
                                text: "owl:equivalentClass",
                                parent: "#",
                                type:'Property',
                                data: {
                                    id: "http://www.w3.org/2002/07/owl#equivalentClass",
                                    inSource: Config.dictionarySource,
                                },
                            });
                        }
                        */
                        if (true) {
                            jstreeData.push({
                                id: "http://www.w3.org/2002/07/owl#equivalentClass",
                                text: "owl:equivalentClass",
                                parent: "#",
                                type: "Property",
                                data: {
                                    id: "http://www.w3.org/2002/07/owl#equivalentClass",
                                    inSource: Config.dictionarySource,
                                },
                            });
                        }
                        /* if (true) {
                            jstreeData.push({
                                id: "_datatypeProperty",
                                text: "datatypeProperty",
                                parent: "#",
                                type: "_datatypeProperty",
                                data: {
                                    id: "_datatypeProperty",
                                },
                            });
                        }*/

                        if (true || self.sourceNode.rdfType == "NamedIndividual") {
                            jstreeData.push({
                                id: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                                type: "Property",
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
                                type: "Property",
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
                                type: "Property",
                                data: {
                                    id: "http://www.w3.org/2000/01/rdf-schema#member",
                                    inSource: source,
                                },
                            });
                        }

                        callbackSeries();
                    },

                    function (callbackSeries) {
                        OntologyModels.getAllowedPropertiesBetweenNodes(source, self.sourceNode.id, self.targetNode.id, { keepSuperClasses: true }, function (err, result) {
                            if (err) {
                                return callbackSeries(err);
                            }
                            authorizedProps = result.constraints;

                            var html = "Ancestors<br>";
                            var str = ""; //"<b>" + self.sourceNode.label + "</b>";
                            result.nodes.startNode.forEach(function (item, index) {
                                if (index == 0) {
                                    str += "<b>";
                                } else {
                                    str += "->";
                                }
                                str += Sparql_common.getLabelFromURI(item);
                                if (index == 0) {
                                    str += "</b>";
                                }
                            });
                            html += str;
                            html += "<br>";

                            var str = ""; //"<b>" + self.targetNode.label + "</b>";
                            result.nodes.endNode.forEach(function (item, index) {
                                if (index == 0) {
                                    str += "<b>";
                                } else {
                                    str += "->";
                                }
                                str += Sparql_common.getLabelFromURI(item);
                                if (index == 0) {
                                    str += "</b>";
                                }
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

                        var allProperties = [];
                        var uniqueProps = {};
                        for (var group in authorizedProps) {
                            for (var propId in authorizedProps[group]) {
                                allProperties.push(propId);
                            }
                        }
                        sources.forEach(function (_source) {
                            jstreeData.push({
                                id: _source,
                                text: _source,
                                parent: "#",
                                type: "Source",
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
                                            if (property.superProp && allProperties.indexOf(property.superProp) > 0) {
                                                parent = property.superProp;
                                            }

                                            array.push({
                                                id: propId,
                                                text: "<span class='" + cssClass + "'>" + label + "</span>",
                                                parent: parent,
                                                type: "Property",
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
                                if (a.data.propLabel > b.data.propLabel) {
                                    return 1;
                                }
                                if (a.data.propLabel < b.data.propLabel) {
                                    return -1;
                                }
                                return 0;
                            });

                            jstreeData = jstreeData.concat(array);
                        });
                        //  })

                        return callbackSeries();
                    },

                    function (callbackSeries) {
                        options.contextMenu = self.getContextMenu(options);
                        options.doNotAdjustDimensions = 1;
                        JstreeWidget.loadJsTree("lineageAddEdgeDialog_authorizedPredicatesTreeDiv", jstreeData, options, function (err) {});
                        callbackSeries();
                    },
                ],

                function (err) {
                    if (err) {
                        return callback(err);
                    }
                    Lineage_sources.showHideEditButtons(Lineage_sources.activeSource);
                    if (edgeData.from === edgeData.to) {
                        return; // callback(null);
                    } else {
                        return; //callback(null);
                    }
                },
            );
        });
    };

    /**
     * Generates the context menu for the property selection tree in the relation creation dialog.
     * This menu allows refining an existing property by creating a sub-property and viewing node information.
     * @function
     * @name getContextMenu
     * @memberof Lineage_createRelation
     * @param {Object} options - Configuration options for the context menu.
     * @returns {Object} Context menu items with their respective actions.
     */
    self.getContextMenu = function (options) {
        var items = {
            refineProperty: {
                label: "Refine Property",
                action: function (_e) {
                    if (false && self.currentPropertiesTreeNode.data.source != Config.currentTopLevelOntology) {
                        return alert("only properties from " + Config.currentTopLevelOntology + " can be refined");
                    }
                    //var subPropertyLabel = true;
                    //
                    var subPropertyLabel = prompt("enter label for subProperty of property " + self.currentPropertiesTreeNode.data.label);
                    if (!subPropertyLabel) {
                        return;
                    }
                    Lineage_createRelation.createSubProperty(Lineage_sources.activeSource, self.currentPropertiesTreeNode.data.id, subPropertyLabel, true, function (err, result) {
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
                        //  var ontology = self.currentPropertiesTreeNode.parents[self.currentPropertiesTreeNode.parents.length - 2];
                        var ontology = self.currentPropertiesTreeNode.data.source;
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
                        //}
                        //);
                    });
                },
            },
            nodeInfos: {
                label: "Node infos",
                action: function (_e) {
                    // pb avec source
                    NodeInfosWidget.showNodeInfos(self.currentPropertiesTreeNode.data.source, self.currentPropertiesTreeNode, "mainDialogDiv", null, function () {
                        //  $("#mainDialogDiv").parent().css("z-index", 1);
                    });
                },
            },
        };
        return items;
    };

    /**
     * Executes the addition of an edge from the graph. Currently not implemented.
     * @function
     * @name execAddEdgeFromGraph
     * @memberof Lineage_createRelation
     */
    self.execAddEdgeFromGraph = function () {};

    /**
     * Adds generic predicates to the predicates tree in the relation creation dialog.
     * This function extracts generic properties from the current top-level ontology and adds them to the tree.
     * @function
     * @name addGenericPredicatesToPredicatesTree
     * @memberof Lineage_createRelation
     */
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

    /**
     * Displays node information based on the given role ('start' or 'end').
     * The function retrieves the corresponding node data and opens the node information widget.
     * @function
     * @name showNodeInfos
     * @memberof Lineage_createRelation
     * @param {string} role - The role of the node ('start' or 'end').
     */
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

    /**
     * Handles the selection of a property from the authorized predicates tree.
     * This function determines where the relation should be stored, whether as a restriction or predicate,
     * and adds it to the visualization graph.
     * @function
     * @name OnSelectAuthorizedPredicatesTreeDiv
     * @memberof Lineage_createRelation
     * @param {Event} event - The event triggered by the selection.
     * @param {Object} obj - The selected node object containing property data.
     */
    self.OnSelectAuthorizedPredicatesTreeDiv = function (event, obj) {
        event.stopPropagation();
        self.currentPropertiesTreeNode = obj.node;
        if (obj.event.which == 3) {
            return;
        }

        //dispatch of sources to write in depending on relation type and editable
        var inSource;
        var options = {};
        var propId = obj.node.data.id;
        if (propId == "http://www.w3.org/2002/07/owl#sameAs" || propId == "http://www.w3.org/2002/07/owl#equivalentClass") {
            // le sameAs sont tous dans le dictionaire
            inSource = Config.dictionarySource;
        } else {
            /*else if (propId == "_datatypeProperty") {
            var propLabel = prompt("DatatypeProperty Label");
            if (!propLabel) return;
            var xsdType = prompt("DatatypeProperty range xsd:type");

            self.createDataTypeProperty(Lineage_sources.activeSource, propLabel, null, xsdType, function (err, result) {
                if (err) return alert(err.responseText);
                $("#smallDialogDiv").dialog("close");
                return UI.message("annotation property created", true);
            });
            return;
        } */
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

        if (false && !confirm("create Relation " + self.sourceNode.label + "-" + Sparql_common.getLabelFromURI(propId) + "->" + self.targetNode.label + " in Graph " + inSource)) {
            return;
        }
        $("#smallDialogDiv").dialog("close");

        var relationType;
        var relationId;
        async.series(
            [
                //get relationType
                function (callbackSeries) {
                    Sparql_OWL.getNodesOwlTypeMap(self.sourceNode.source, self.sourceNode.id, function (err, result) {
                        if (err) {
                            return callback(err.responseText);
                        }
                        if (result[self.sourceNode.id] == "Class") {
                            relationType = "Restriction";
                        } else if (result[self.sourceNode.id] == "NamedIndividual") {
                            relationType = "Predicate";
                        } else {
                            callbackSeries("no compatible type");
                        }
                        if (propId == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" || propId == "http://www.w3.org/2000/01/rdf-schema#subClassOf") {
                            relationType = "Predicate";
                        }
                        callbackSeries();
                    });
                },

                //create restriction
                function (callbackSeries) {
                    if (relationType != "Restriction") {
                        return callbackSeries();
                    }

                    var oldRelations = Lineage_whiteboard.lineageVisjsGraph.getNodeEdges(self.sourceNode.id, self.targetNode.id);
                    self.createRestrictionRelation(inSource, propId, self.sourceNode, self.targetNode, true, true, {}, function (err, blankNodeId) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        UI.message("relation added", true);

                        if (oldRelations.length > 0) {
                            if (confirm("delete previous relation " + oldRelations[0].data.propertyLabel)) {
                                Lineage_createRelation.deleteRestriction(Lineage_sources.activeSource, oldRelations[0], function (err) {
                                    if (err) {
                                        alert(err);
                                    }
                                });
                            }
                        }
                        relationId = blankNodeId;
                        callbackSeries();
                        //  return callback(null, { type: "Restriction", id: blankNodeId });
                    });
                },

                // create predicate
                function (callbackSeries) {
                    if (relationType != "Predicate") {
                        return callbackSeries();
                    }
                    var triples = [];
                    triples.push({
                        subject: self.sourceNode.id,
                        predicate: propId,
                        object: self.targetNode.id,
                    });

                    Sparql_generic.insertTriples(inSource, triples, {}, function (err, _result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        callbackSeries();
                    });
                },

                //draw relation

                function (callbackSeries) {
                    relationId = relationId || "<_:b" + common.getRandomHexaId(10) + ">";
                    let propLabel = obj.node.data.propLabel || Sparql_common.getLabelFromURI(obj.node.data.id);

                    let newEdge = {
                        id: relationId,
                        from: self.sourceNode.id,
                        to: self.targetNode.id,
                    };
                    newEdge.label = "<i>" + propLabel + "</i>";
                    newEdge.font = { multi: true, size: 10 };
                    newEdge.arrows = {
                        to: {
                            enabled: true,
                            type: Lineage_whiteboard.defaultEdgeArrowType,
                            scaleFactor: 0.5,
                        },
                    };
                    newEdge.dashes = true;

                    if (relationType == "Predicate") {
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
                    } else if (relationType == "Restriction") {
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
                    if (Lineage_whiteboard.lineageVisjsGraph.data) {
                        Lineage_whiteboard.lineageVisjsGraph.data.edges.add([newEdge]);
                    }
                    callbackSeries();
                },
            ],
            function (err) {
                if (self.callbackFn) {
                    self.callbackFn();
                }
                $("#smallDialogDiv").dialog("close");
            },
        );
    };

    /**
     * Creates a new sub-property of an existing property in the ontology.
     * The new sub-property is assigned a unique URI and its relationship with the super-property is defined.
     * If required, the function also propagates domain and range constraints from the super-property.
     * @function
     * @name createSubProperty
     * @memberof Lineage_createRelation
     * @param {string} source - The ontology source in which the sub-property should be created.
     * @param {string} superPropId - The identifier (URI) of the super-property.
     * @param {string} subPropertyLabel - The label for the new sub-property.
     * @param {boolean} writeSuperPropRangeAndDomain - Whether to inherit the range and domain from the super-property.
     * @param {Function} callback - A callback function that receives an error or the newly created sub-property URI.
     */
    self.createSubProperty = function (source, superPropId, subPropertyLabel, writeSuperPropRangeAndDomain, callback) {
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
        ];
        if (subPropId) {
            triples.push({
                subject: subPropId,
                predicate: "rdfs:subPropertyOf",
                object: superPropId,
            });
            if (writeSuperPropRangeAndDomain) {
                var sources = [source];
            }
            var imports = Config.sources[source].imports;
            if (imports) {
                sources = sources.concat(imports);
            }
            var domain = "";
            var range = "";
            var domainLabel = "";
            var rangeLabel = "";
            sources.forEach(function (source) {
                var constraints = Config.ontologiesVocabularyModels[source].constraints;
                if (constraints && constraints[superPropId]) {
                    domain = domain || constraints[superPropId].domain;
                    domainLabel = domainLabel || constraints[superPropId].domainLabel;
                    range = range || constraints[superPropId].range;
                    rangeLabel = rangeLabel || constraints[superPropId].rangeLabel;
                }
            });
            if (domain) {
                triples.push({
                    subject: subPropId,
                    predicate: "rdfs:domain",
                    object: domain,
                });
            }
            if (range) {
                triples.push({
                    subject: subPropId,
                    predicate: "rdfs:range",
                    object: range,
                });
            }
        }

        Sparql_generic.insertTriples(source, triples, null, function (err, _result) {
            var modelData = {
                properties: {
                    [subPropId]: {
                        id: subPropId,
                        label: subPropertyLabel,
                        inverseProp: null,
                        superProp: superPropId,
                    },
                },
                constraints: {
                    [subPropId]: {
                        domain: domain,
                        range: range,
                        domainLabel: domainLabel,
                        rangeLabel: rangeLabel,
                        source: source,
                        label: subPropertyLabel,
                        superProp: superPropId,
                    },
                },
            };
            OntologyModels.updateModel(source, modelData, {}, function (err, result) {
                console.log(err || "ontologyModelCache updated");
                callback(err, { uri: subPropId });
            });
        });
    };

    /**
     * Creates a restriction relation between two ontology nodes.
     * Supports adding constraints, metadata, and updating the ontology model cache.
     * @function
     * @name createRestrictionRelation
     * @memberof Lineage_createRelation
     * @param {string} inSource - The source ontology where the restriction should be created.
     * @param {string} type - The type of restriction (e.g., owl:sameAs, owl:equivalentClass).
     * @param {Object} sourceNode - The source node object with at least an `id` and `label`.
     * @param {Object} targetNode - The target node object with at least an `id` and `label`.
     * @param {boolean} addImportToCurrentSource - Whether to add an import statement if the target node is from another source.
     * @param {boolean} createInverseRelation - Whether to create an inverse relation (only for owl:sameAs and owl:equivalentClass).
     * @param {Object} options - Additional options such as origin, status, and additional triples.
     * @param {Function} callback - Callback function that receives an error or the blank node ID of the created restriction.
     */
    self.createRestrictionRelation = function (inSource, type, sourceNode, targetNode, addImportToCurrentSource, createInverseRelation, options, callback) {
        if (type != "http://www.w3.org/2002/07/owl#sameAs" && type != "http://www.w3.org/2002/07/owl#equivalentClass") {
            createInverseRelation = false;
        }
        var blankNodeId;
        var constraintType = null;
        var cardinality = null;
        async.series(
            [
                //shwo constraintType bot
                function (callbackSeries) {
                    var params = {
                        source: inSource,
                        currentNode: self.sourceNode,
                        objectPropertyUri: type,
                    };
                    CreateRestriction_bot.start(CreateRestriction_bot.workflowChooseConstraintTypeFn, params, function (err, result) {
                        constraintType = CreateRestriction_bot.params.constraintType;
                        if (!constraintType) {
                            return callbackSeries("missing constraint type");
                        }
                        if (constraintType.indexOf("ardinality") > -1) {
                            constraintType = CreateRestriction_bot.params.constraintType;

                            if (constraintType) {
                                cardinality = {
                                    type: constraintType,
                                    value: CreateRestriction_bot.params.cardinality,
                                };
                            }
                        }

                        callbackSeries();
                    });
                },
                //manage import if from another source
                function (callbackSeries) {
                    if (!addImportToCurrentSource) {
                        return callbackSeries();
                    }
                    self.setNewImport(Lineage_sources.activeSource, targetNode.source, function (err, _result) {
                        callbackSeries(err);
                    });
                },
                //create restriction
                function (callbackSeries) {
                    var allTriples = [];

                    var restrictionTriples = self.getRestrictionTriples(sourceNode.id, targetNode.id, constraintType, cardinality, type);
                    blankNodeId = restrictionTriples.blankNode;

                    var metadataOptions = {
                        domainSourceLabel: sourceNode.source,
                        rangeSourceLabel: targetNode.source,
                    };
                    if (!options) {
                        options = {};
                    }
                    var origin = options.origin || "manual";
                    var status = options.status || "candidate";

                    var metaDataTriples = self.getCommonMetaDataTriples(blankNodeId, origin, status, metadataOptions);
                    restrictionTriples = restrictionTriples.concat(metaDataTriples);

                    allTriples = allTriples.concat(restrictionTriples);
                    if (options.additionalTriples) {
                        allTriplesallTriples.concat(options.additionalTriples);
                    }

                    Sparql_generic.insertTriples(inSource, allTriples, null, function (err, _result) {
                        return callbackSeries(err);
                    });
                },
                //update cache
                function (callbackSeries) {
                    var modelData = {
                        restrictions: {
                            [type]: [
                                {
                                    domain: sourceNode.id,
                                    range: targetNode.id,
                                    domainLabel: sourceNode.label,
                                    rangeLabel: targetNode.label,
                                    constraintType: constraintType,
                                    constraintTypeLabel: Sparql_common.getLabelFromURI(constraintType),
                                    blankNodeId: blankNodeId,
                                },
                            ],
                        },
                    };
                    if (!Config.ontologiesVocabularyModels[inSource].restrictions[type]) {
                        Config.ontologiesVocabularyModels[inSource].restrictions[type] = [];
                    }
                    OntologyModels.updateModel(inSource, modelData, {}, function (err, result) {
                        console.log(err || "ontologyModelCache updated");
                        return callbackSeries(err);
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
            },
        );
    };

    /**
     * Deletes ontology restrictions based on their blank node IDs.
     * Iterates over a list of restriction nodes and removes them from the ontology.
     *
     * @function
     * @name deleteRestrictionsByUri
     * @memberof Lineage_createRelation
     * @param {string} source - The ontology source where the restrictions are stored.
     * @param {string|string[]} restrictionsNodeIds - A single restriction node ID or an array of IDs to be deleted.
     * @param {Function} callback - Callback function that receives an error (if any) once the deletions are complete.
     */
    self.deleteRestrictionsByUri = function (source, restrictionsNodeIds, callback) {
        if (!source) {
            return;
        }
        if (!restrictionsNodeIds) {
            return;
        }
        if (!Array.isArray(restrictionsNodeIds)) {
            restrictionsNodeIds = [restrictionsNodeIds];
        }

        async.eachSeries(
            restrictionsNodeIds,
            function (item, callbackEach) {
                var edgeNode = {};
                edgeNode.id = item;
                edgeNode.data = {};
                edgeNode.data.bNodeId = item;

                Object.keys(Config.ontologiesVocabularyModels[source].restrictions).forEach(function (property) {
                    var propertyRestrictions = Config.ontologiesVocabularyModels[source].restrictions[property];
                    propertyRestrictions.forEach(function (restriction) {
                        if (restriction.blankNodeId == item) {
                            edgeNode.data.propertyId = property;
                        }
                    });
                });
                self.deleteRestriction(source, edgeNode, function (err) {
                    callbackEach(err);
                });
            },
            function (err) {
                if (err) {
                    return err;
                }
                if (callback) {
                    return callback(err);
                }
            },
        );
    };

    /**
     * Deletes a restriction from the ontology.
     * Removes all triples associated with the restriction and updates the ontology model.
     *
     * @function
     * @name deleteRestriction
     * @memberof Lineage_createRelation
     * @param {string} inSource - The ontology source from which the restriction should be deleted.
     * @param {Object} restrictionNode - The node representing the restriction to be deleted.
     * @param {Function} callback - Callback function to handle completion or errors.
     */
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

                    function (callbackSeries) {
                        // update OntologyModel by removing restriction
                        var dataToRemove = { restrictions: {} };
                        dataToRemove["restrictions"][restrictionNode.data.propertyId] = { blankNodeId: restrictionNode.data.bNodeId };
                        OntologyModels.updateModel(inSource, dataToRemove, { remove: true }, function (err, result) {
                            callbackSeries(err);
                        });
                    },
                ],
                function (_err) {
                    if (Lineage_whiteboard.lineageVisjsGraph.data) {
                        Lineage_whiteboard.lineageVisjsGraph.data.edges.remove(restrictionNode.id);
                        Lineage_whiteboard.lineageVisjsGraph.data.edges.remove(inverseRestriction);
                    }
                    UI.message("restriction removed", true);
                    if (callback) {
                        return callback(_err);
                    }
                },
            );
        }
    };

    /**
     * Adds an import relationship between two ontology sources.
     * Ensures that the main source includes the imported source if it isn't already listed.
     *
     * @function
     * @name setNewImport
     * @memberof Lineage_createRelation
     * @param {string} mainSourceLabel - The label of the main ontology source.
     * @param {string} importedSourceLabel - The label of the ontology source to be imported.
     * @param {Function} callback - Callback function executed upon completion.
     */
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
            OntologyModels.registerSourcesModel(importedSourceLabel, null);
            callback();
        });
    };

    /**
     * Adds an import relationship to the current ontology source.
     * Sends a request to the backend to register the imported source.
     * @function
     * @name addImportToCurrentSource
     * @memberof Lineage_createRelation
     * @param {string} parentSourceLabel - The label of the main ontology source.
     * @param {string} importedSourceLabel - The label of the ontology source to be imported.
     * @param {Function} callback - Callback function executed upon completion.
     */
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

    /**
     * Generates RDF triples for defining a restriction relation in an ontology.
     * Creates a blank node representing the restriction and links it to the source and target nodes.
     *
     * @function
     * @name getRestrictionTriples
     * @memberof Lineage_createRelation
     * @param {string} sourceNodeId - The ID of the source node in the restriction.
     * @param {string} targetNodeId - The ID of the target node in the restriction.
     * @param {string} constraint - The constraint type (e.g., someValuesFrom, allValuesFrom).
     * @param {Object} cardinality - The cardinality restriction, if applicable.
     * @param {string} propId - The property ID for the restriction.
     * @returns {Array<Object>} An array of RDF triples defining the restriction.
     */
    self.getRestrictionTriples = function (sourceNodeId, targetNodeId, constraint, cardinality, propId) {
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

        if (cardinality) {
            restrictionsTriples.push({
                subject: blankNode,
                predicate: cardinality.type,
                object: '"' + cardinality.value + '^^http://www.w3.org/2001/XMLSchema#nonNegativeInteger"',
            });
            restrictionsTriples.push({
                subject: blankNode,
                predicate: "owl:onClass",
                object: targetNodeId,
            });
        } else {
            restrictionsTriples.push({
                subject: blankNode,
                predicate: constraint, // "http://www.w3.org/2002/07/owl#someValuesFrom",
                object: targetNodeId,
            });
        }

        restrictionsTriples.blankNode = blankNode;
        return restrictionsTriples;
    };

    /**
     * Generates metadata RDF triples for ontology elements.
     * Includes creator, creation date, source, and other optional metadata.
     *
     * @function
     * @name getCommonMetaDataTriples
     * @memberof Lineage_createRelation
     * @param {string} subjectUri - The URI of the entity to which metadata is being added.
     * @param {string} source - The source of the data.
     * @param {string} status - The status of the entity.
     * @param {Object} options - Additional metadata properties as key-value pairs.
     * @returns {Array<Object>} An array of RDF triples representing metadata.
     */
    self.getCommonMetaDataTriples = function (subjectUri, source, status, options) {
        var metaDataTriples = [];
        if (!options) {
            options = {};
        }
        var login = Sparql_common.formatString(authentication.currentUser.login);
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
