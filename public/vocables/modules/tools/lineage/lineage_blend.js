import common from "../../shared/common.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
self.lineageVisjsGraph;
import Lineage_classes from "./lineage_classes.js";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// !!!!!!!!  const util = require("../../../../../bin/util.");
var Lineage_blend = (function () {
    var self = {};
    self.graphModification = {
        showAddNodeGraphDialog: function () {
            self.graphModification.creatingNodeTriples = [];
            self.graphModification.creatingsourceUri = null;
            $("#LineagePopup").dialog("open");
            $("#LineagePopup").dialog("option", "title", "Create node in source " + Lineage_sources.activeSource);

            $("#LineagePopup").load("snippets/lineage/lineageAddNodeDialog.html", function () {
                $("#LineagePopup").load("snippets/lineage/lineageAddNodeDialog.html", function () {
                    $("#editPredicate_mainDiv").remove();
                    $("#LineageBlend_commonPredicateObjectDiv").load("snippets/commonUIwidgets/editPredicateDialog.html", function () {
                        PredicatesSelectorWidget.init(Lineage_sources.activeSource, function () {
                            $("#editPredicate_propertyDiv").css("display", "none");
                        });
                    });
                });

                return;

                async.series(
                    [
                        function (callbackSeries) {
                            Lineage_upperOntologies.getTopOntologyClasses(Config.currentTopLevelOntology, {}, function (err, result) {
                                if (err) {
                                    return callbackSeries(err.responseText);
                                }
                                common.fillSelectOptions("LineageBlend_creatingNodeObjectsUpperSelect", result, true, "label", "id");
                                common.fillSelectOptions("LineageBlend_creatingNodeObjectsUpper2Select", result, true, "label", "id");

                                return callbackSeries();
                            });
                        },
                    ],
                    function (err) {
                        if (err) {
                            return alert(err.responseText);
                        }
                    }
                );
            });
        },
        showAddEdgeFromGraphDialog: function (edgeData, callback) {
            $("#LineagePopup").dialog("open");
            $("#LineagePopup").dialog("option", "title", "Create relation in source " + Lineage_sources.activeSource);
            $("#LineagePopup").load("snippets/lineage/lineageAddEdgeDialog.html", function () {
                self.sourceNode = Lineage_classes.lineageVisjsGraph.data.nodes.get(edgeData.from).data;
                self.targetNode = Lineage_classes.lineageVisjsGraph.data.nodes.get(edgeData.to).data;

                OntologyModels.getAllowedPropertiesBetweenNodes(Lineage_sources.activeSource,self.sourceNode.id, self.targetNode.id, function(err, result){

                })





                let options = {
                    openAll: true,
                    selectTreeNodeFn: Lineage_blend.OnSelectAuthorizedPredicatesTreeDiv,
                };
                var jstreeData = [];
                var distinctProps = {};
                var authorizedProps = {};

                let inSource = Config.currentTopLevelOntology;
                var propStatusCssClassMap = {
                    G: "lineageAddEdgeDialog_topLevelOntologyGenericProp",
                    DR: "lineageAddEdgeDialog_topLevelOntologyProp",
                    D: "lineageAddEdgeDialog_topLevelOntologySemiGenericProp",
                    R: "lineageAddEdgeDialog_topLevelOntologySemiGenericProp",
                    S: "lineageAddEdgeDialog_domainOntologyProp",
                };

                if (!Config.sources[Lineage_sources.activeSource].editable) {
                    $("#lineageAddEdgeDialog_Title").html("source " + Lineage_sources.activeSource + " is not editable");
                    return;
                } else {
                    $("#lineageAddEdgeDialog_Title").html("upper ontology : <b>" + Config.currentTopLevelOntology + "</b><br>" + self.sourceNode.label + " -> " + self.targetNode.label);
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

                var source = Lineage_sources.activeSource;

                async.series(
                    [
                        //matching restrictions
                        function (callbackSeries) {
                            return callbackSeries();
                            for (var prop in Config.ontologiesVocabularyModels[source].restriction) {
                                var restriction = Config.ontologiesVocabularyModels[source].restriction[prop];
                                if (restriction.domain == self.sourceNode.id && restriction.range == self.targetNode.id) {
                                    validProps[prop] = { type: "restriction", domain: restriction.domain, range: restriction.range };
                                }
                            }
                        },
                        //matching constraints
                        function (callbackSeries) {
                            return callbackSeries();
                            for (var prop in Config.ontologiesVocabularyModels[source].constraints) {
                                var constraints = Config.ontologiesVocabularyModels[source].constraints[prop];
                                if (constraints.domain == self.sourceNode.id || constraints.range == self.targetNode.id) {
                                    validProps[prop] = { type: "constraint", domain: restriction.domain, range: restriction.range };
                                }
                            }
                        },

                        //get node constraints
                        function (callbackSeries) {
                            return callbackSeries();
                        },

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
                                        inSource: Lineage_sources.activeSource,
                                    },
                                });
                            }

                            if (Config.sources[Lineage_sources.activeSource].schemaType == "OWL" && self.sourceNode.rdfType != "NamedIndividual") {
                                jstreeData.push({
                                    id: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                                    text: "rdfs:subClassOf",
                                    parent: "#",
                                    data: {
                                        id: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                                        inSource: Lineage_sources.activeSource,
                                    },
                                });
                            }
                            if (Config.sources[Lineage_sources.activeSource].schemaType == "OWL") {
                                jstreeData.push({
                                    id: "http://www.w3.org/2000/01/rdf-schema#member",
                                    text: "rdfs:member",
                                    parent: "#",
                                    data: {
                                        id: "http://www.w3.org/2000/01/rdf-schema#member",
                                        inSource: Lineage_sources.activeSource,
                                    },
                                });
                            }

                            callbackSeries();
                        },

                        function (callbackSeries) {
                            Lineage_upperOntologies.getUpperOntologyObjectPropertiesDescription(Config.currentTopLevelOntology, false, function (err, result) {
                                if (err) {
                                    return callbackSeries(err);
                                }
                                var flatPropertiesMap = Lineage_upperOntologies.setPropertiesMapInverseProps(result);
                                Lineage_upperOntologies.objectPropertiesMap = flatPropertiesMap;
                                callbackSeries();
                            });
                        },

                        //match domain to upperOntology  existing ranges and domains
                        function (callbackSeries) {
                            var allDomains = {};
                            var allRanges = {};

                            for (var propId in Lineage_upperOntologies.objectPropertiesMap) {
                                var prop = Lineage_upperOntologies.objectPropertiesMap[propId];
                                if (prop.domain && !allDomains[prop.domain]) {
                                    allDomains[prop.domain] = prop.domainLabel;
                                }
                                if (prop.range && !allRanges[prop.range]) {
                                    allRanges[prop.range] = prop.rangeLabel;
                                }
                            }
                            Sparql_OWL.getNodesAncestors(Lineage_sources.activeSource, [self.sourceNode.id], {}, function (err, result) {
                                if (err) {
                                    return callbackSeries(err);
                                }
                                result.forEach(function (item) {
                                    if (item.class.value == self.sourceNode.id && allDomains[item.superClass.value]) {
                                        sourceNodeTopLevelOntologyAncestors[item.superClass.value] = allDomains[item.superClass.value];
                                    }
                                });
                                Sparql_OWL.getNodesAncestors(Lineage_sources.activeSource, [self.targetNode.id], {}, function (err, result) {
                                    if (err) {
                                        return callbackSeries(err);
                                    }
                                    result.forEach(function (item) {
                                        if (item.class.value == self.targetNode.id && allDomains[item.superClass.value]) {
                                            targetNodeTopLevelOntologyAncestors[item.superClass.value] = allRanges[item.superClass.value];
                                        }
                                    });

                                    return callbackSeries();
                                });
                            });
                        },

                        //filter upperOntology to range and domain of selected nodes
                        function (callbackSeries) {
                            Lineage_upperOntologies.getAuthorizedProperties(
                                Config.currentTopLevelOntology,
                                sourceNodeTopLevelOntologyAncestors,
                                targetNodeTopLevelOntologyAncestors,
                                function (err, _authorizedProps) {
                                    authorizedProps = _authorizedProps;
                                    return callbackSeries();
                                }
                            );
                        },

                        //get currentTopLevelOntology classesTaxonomy
                        function (callbackSeries) {
                            if (Config.currentTopLevelOntology.taxonomy) {
                                return callbackSeries();
                            }

                            Sparql_generic.getSourceTaxonomy(Config.currentTopLevelOntology, {}, function (err, result) {
                                Config.sources[Config.currentTopLevelOntology].taxonomy = result;
                                return callbackSeries();
                            });
                        },

                        //reduce authorizedProps to lowest one in possible ranges and domains  hierarchy
                        function (callbackSeries) {
                            var taxonomyClassesMap = Config.sources[Config.currentTopLevelOntology].taxonomy.classesMap;

                            var propsToKeep = [];
                            var domainRank = 1;
                            var rangeRank = 1;
                            for (var prop in authorizedProps) {
                                var propObj = authorizedProps[prop];
                                if (propObj.upperDomain) {
                                    var domainRank2 = Math.max(domainRank, taxonomyClassesMap[propObj.upperDomain].parents.length);
                                }
                                if (propObj.upperRange) {
                                    var rangeRank2 = Math.max(rangeRank, taxonomyClassesMap[propObj.upperRange].parents.length);
                                }
                                if (domainRank2 > domainRank && rangeRank2 > rangeRank) {
                                    propsToKeep.push(prop);
                                } else if (domainRank2 > domainRank) {
                                    // && !propObj.upperRange) {
                                    propsToKeep.push(prop);
                                } else if (rangeRank2 > rangeRank) {
                                    // && !propObj.upperDomain) {
                                    propsToKeep.push(prop);
                                } else if (!propObj.upperRange && !propObj.upperDomain) {
                                    propsToKeep.push(prop);
                                }
                            }

                            if (propObj) {
                                $("#lineageAddEdgeDialog_upperOntologyClassesDiv").html((propObj.upperDomainLabel | "any") + "->" + (propObj.upperRangeLabel | "any"));
                            } else {
                                $("#lineageAddEdgeDialog_upperOntologyClassesDiv").html("any" + "->" + "any");
                            }
                            if (propsToKeep.length > 0) {
                                var filteredProps = {};
                                propsToKeep.forEach(function (prop) {
                                    if (!filteredProps[prop]) {
                                        authorizedProps[prop].directHit = true;
                                        filteredProps[prop] = authorizedProps[prop];
                                    }
                                });
                                authorizedProps = filteredProps;
                            }
                            callbackSeries();
                        },

                        //create formal Ontology tree nodes
                        function (callbackSeries) {
                            for (var prop in authorizedProps) {
                                var propObj = authorizedProps[prop];
                                if (propObj.children) {
                                    propObj.children.forEach(function (child) {
                                        if (child.id && !distinctProps[child.id]) {
                                            jstreeData.push({
                                                id: child.id,
                                                text: "<span class='" + cssClass + "'>" + child.label + "</span>",
                                                parent: propObj.prop,
                                                data: {
                                                    id: child.id,
                                                    label: child.label,
                                                    source: Config.currentTopLevelOntology,
                                                },
                                            });
                                        }
                                    });
                                }

                                if (!distinctProps[propObj.prop]) {
                                    if (propObj.prop) {
                                        distinctProps[propObj.prop] = 1;

                                        var cssClass = propStatusCssClassMap[propObj.type];

                                        var label = (propObj.upperDomainLabel || "any") + "<b>-" + propObj.label + "-></b>" + (propObj.upperRangeLabel || "any");
                                        if (false && propObj.directHit) {
                                            label += "***";
                                        }

                                        jstreeData.push({
                                            id: propObj.prop,
                                            text: "<span class='" + cssClass + "'>" + label + "</span>",
                                            parent: "#",
                                            data: {
                                                id: propObj.prop,
                                                label: propObj.label,
                                                source: Config.currentTopLevelOntology,
                                            },
                                        });
                                    }
                                }
                            }

                            callbackSeries();
                        },

                        // get propertiesWithoutDomainsAndRanges[sourceLabel]
                        function (callbackSeries) {
                            if (self.propertiesWithoutDomainsAndRanges && self.propertiesWithoutDomainsAndRanges[Config.currentTopLevelOntology]) {
                                return callbackSeries();
                            }
                            Sparql_OWL.getPropertiesWithoutDomainsAndRanges(Config.currentTopLevelOntology, options, function (err, result) {
                                if (err) {
                                    return callback(err);
                                }
                                if (!self.propertiesWithoutDomainsAndRanges) {
                                    self.propertiesWithoutDomainsAndRanges = {};
                                }
                                self.propertiesWithoutDomainsAndRanges[Config.currentTopLevelOntology] = result;
                                return callbackSeries();
                            });
                        },
                        // add generic properties to tree
                        function (callbackSeries) {
                            if (Object.keys(self.propertiesWithoutDomainsAndRanges[Config.currentTopLevelOntology]).length == 0) {
                                return callbackSeries();
                            }

                            self.propertiesWithoutDomainsAndRanges[Config.currentTopLevelOntology].forEach(function (propObj) {
                                if (propObj.prop.value) {
                                    var cssClass = propStatusCssClassMap["G"];
                                    var label = "any<b>-" + propObj.propLabel.value + "->any</b>";

                                    jstreeData.push({
                                        id: propObj.prop.value,
                                        text: "<span class='" + cssClass + "'->" + label + "</span>",
                                        parent: "#",
                                        data: {
                                            id: propObj.prop.value,
                                            label: propObj.propLabel.value,
                                            source: Config.currentTopLevelOntology,
                                        },
                                    });
                                }
                            });
                            return callbackSeries();
                        },
                        //get specific(mainSource) source properties
                        function (callbackSeries) {
                            /* if (self.currentSpecificObjectPropertiesMap) return callbackSeries();
var specificSourceLabel = Lineage_sources.activeSource;*/

                            Sparql_OWL.listObjectProperties(Lineage_sources.activeSource, null, function (err, result) {
                                if (err) {
                                    return callbackSeries(err);
                                }
                                self.currentSpecificObjectPropertiesMap = {};
                                self.domainOntologyProperties = [];
                                result.forEach(function (item) {
                                    if (item.superProp) {
                                        self.domainOntologyProperties.push({
                                            id: item.prop.value,
                                            label: item.propLabel.value,
                                            superProp: item.superProp ? item.superProp.value : null,
                                            domain: item.domain ? item.domain.value : null,
                                            domainLabel: item.domainLabel ? item.domainLabel.value : null,
                                            range: item.range ? item.range.value : null,
                                            rangeLabel: item.rangeLabel ? item.rangeLabel.value : null,
                                        });
                                        /*   if (!self.currentSpecificObjectPropertiesMap[item.superProp.value]) self.currentSpecificObjectPropertiesMap[item.superProp.value] = [];
self.currentSpecificObjectPropertiesMap[item.superProp.value].push({
id: item.prop.value,
label: item.propLabel.value,

});*/
                                    }
                                });
                                return callbackSeries();
                            });
                        },

                        //add specific(mainSource) source properties to jstree data
                        function (callbackSeries) {
                            //  var specificSourceLabel = Lineage_sources.activeSource;
                            var cssClass = propStatusCssClassMap["S"];

                            var upperOntologyTreeProps = {};
                            jstreeData.forEach(function (node) {
                                upperOntologyTreeProps[node.id] = node;
                            });

                            self.domainOntologyProperties.forEach(function (item) {
                                if (!upperOntologyTreeProps[item.superProp]) {
                                    return;
                                }
                                var label = item.label;
                                if (item.id) {
                                    jstreeData.push({
                                        id: item.id,
                                        text: "<span class='" + cssClass + "' style='font-weight: bold'>" + label + "</span>",
                                        parent: item.superProp,
                                        data: {
                                            id: item.id,
                                            label: item.label,
                                            source: Lineage_sources.activeSource,
                                        },
                                    });
                                }
                            });
                            /* jstreeData.forEach(function(node) {
if (self.currentSpecificObjectPropertiesMap[node.id]) {
self.currentSpecificObjectPropertiesMap[node.id].forEach(function(item) {
jstreeData.push({
id: item.id,
text: "<span class='" + cssClass + "'>" + item.label + "</span>",
parent: node.id,
data: {
id: item.id,
label: item.label,
source: specificSourceLabel
}
})
});
}
});*/
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
                                            self.domainOntologyProperties.push({
                                                id: result.uri,
                                                label: subPropertyLabel,
                                                superProp: self.currentPropertiesTreeNode.data.id,
                                            });

                                            if (!self.currentSpecificObjectPropertiesMap[self.currentPropertiesTreeNode.data.id]) {
                                                self.currentSpecificObjectPropertiesMap[self.currentPropertiesTreeNode.data.id] = [];
                                            }
                                            self.currentSpecificObjectPropertiesMap[self.currentPropertiesTreeNode.data.id].push({
                                                id: result.uri,
                                                label: subPropertyLabel,
                                            });

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
        },

        getPossibleNamedIndividuals: function (callback) {
            var individuals = {};
            //   return callback(null, individuals);
            Sparql_OWL.getNamedIndividuals(Lineage_sources.activeSource, null, null, function (err, result) {
                if (err) {
                    return callback(err);
                }

                result.forEach(function (item) {
                    individuals[item.subjectLabel.value] = item.subject.value;
                });
                return callback(null, individuals);
            });
        },

        showCreatingNodeClassOrNamedIndividualDialog: function (type) {
            $("#LineageBlend_creatingNodeObjectsUpperSelect").val("");
            $("#LineageBlend_creatingNodeObjectsUpper2Select").val("");
            $("#LineageBlend_creatingNodeObjectsSelect").val("");
            $("#LineageBlend_creatingNodeObjectsSelect").val("");
            self.graphModification.currentCreatingNodeType = type;
            var vocabs = [];
            $("#editPredicate_vocabularySelect2 option").each(function () {
                vocabs.push($(this).val());
            });

            if (type == "NamedIndividual") {
                $("#LineageBlend_creatingNodeParentTypeSpan").html("rdf:type");
                PredicatesSelectorWidget.setVocabulariesSelect(Lineage_sources.activeSource, "_curentSourceAndImports");
            } else {
                $("#LineageBlend_creatingNodeParentTypeSpan").html("owl:subClassOf");
                PredicatesSelectorWidget.setVocabulariesSelect(Lineage_sources.activeSource, "_all");
            }

            $("#LineageBlend_creatingNodeClassDiv").css("display", "block");

            $("#LineageBlend_creatingNodeClassParamsDiv").dialog("open");
            $("#LineageBlend_creatingNodeClassParamsDiv").tabs({});
            if (Lineage_classes.currentGraphNode && Lineage_classes.currentGraphNode.data) {
                $("#LineageBlend_creatingNodeObjectsSelect").val(Lineage_classes.currentGraphNode.data.id);
            }
        },

        openCreatNodeDialogOpen: function (type) {
            if (type == "owl:Class") {
                $("#LineageBlend_creatingNodeClassParamsDiv").dialog("open");
            }
        },
        getURI: function (label, source, uriType) {
            var uri = null;
            if (!uriType) {
                uriType = $("#LineageBlend_creatingNodeUriType").val();
            }
            var specificUri = $("#LineageBlend_creatingNodeSubjectUri").val();
            if (specificUri) {
                uriType = "specific";
            }
            if (!source) {
                source = Lineage_sources.activeSource;
            }
            let graphUri = Config.sources[source].graphUri;
            if (!uriType || uriType == "fromLabel") {
                uri = graphUri + common.formatStringForTriple(label, true);
            } else if (uriType == "randomHexaNumber") {
                uri = graphUri + common.getRandomHexaId(10);
            } else if (uriType == "specific") {
                if (specificUri) {
                    uri = specificUri;
                } else {
                }
            }
            return uri;
        },
        addTripleToCreatingNode: function (predicate, object) {
            if (!self.graphModification.creatingsourceUri) {
                var uri = self.graphModification.getURI(object);
                self.graphModification.creatingsourceUri = uri;
            }
            if (!predicate) {
                predicate = $("#KGcreator_predicateInput").val();
            }
            if (!object) {
                object = $("#KGcreator_objectInput").val();
            }

            $("#KGcreator_predicateInput").val("");
            $("#KGcreator_objectInput").val("");
            $("#KGcreator_predicateSelect").val("");
            $("#KGcreator_objectSelect").val("");

            if (!predicate) {
                return alert("no value for predicate");
            }
            if (!object) {
                return alert("no value for object");
            }

            var triple = {
                subject: self.graphModification.creatingsourceUri,
                predicate: predicate,
                object: object,
            };
            var num = self.graphModification.creatingNodeTriples.length;
            self.graphModification.creatingNodeTriples.push(triple);
            $("#LineageBlend_creatingNodeTiplesDiv").append(
                "<div id='triple_" +
                    num +
                    "' class='blendCreateNode_triplesDiv' >" +
                    "new Node" +
                    "&nbsp;&nbsp;<b>" +
                    triple.predicate +
                    "" +
                    " </b>&nbsp;&nbsp;   " +
                    triple.object +
                    "&nbsp;<button  style='font-size: 8px;' onclick='Lineage_blend.graphModification.removeTriple(" +
                    num +
                    ")'>X</button></div>"
            );
        },

        addClassOrIndividualTriples: function () {
            $("#LineageBlend_creatingNodeTiplesDiv").html("");

            var label = $("#LineageBlend_creatingNodeNewClassLabel").val();
            if (!label) {
                return alert("rdfs:label is mandatory");
            }
            self.graphModification.addTripleToCreatingNode("rdfs:label", label);

            var type = $("#LineageBlend_creatingNodePredicatesSelect").val();

            if (self.graphModification.currentCreatingNodeType == "Class") {
                var superClass = $("#editPredicate_objectSelect").val();
                // var superClass =$("#LineageBlend_creatingNodeObjectsUpperSelect").val() || $("#LineageBlend_creatingNodeObjectsSelect").val() ;
                if (!superClass) {
                    return alert("owl:Class is mandatory");
                }
                self.graphModification.addTripleToCreatingNode("rdf:type", "owl:Class");
                self.graphModification.addTripleToCreatingNode("rdfs:subClassOf", superClass);
            } else if (self.graphModification.currentCreatingNodeType == "NamedIndividual") {
                var individualtypeClass = $("#editPredicate_objectSelect").val();
                // var individualtypeClass =$("#LineageBlend_creatingNodeObjectsUpper2Select").val() || $("#LineageBlend_creatingNodeObjects2Select").val() ;
                if (!individualtypeClass) {
                    return alert("owl:Class is mandatory");
                }
                self.graphModification.addTripleToCreatingNode("rdf:type", "owl:NamedIndividual");
                self.graphModification.addTripleToCreatingNode("rdf:type", individualtypeClass);
            }

            $("#LineageBlend_creatingNodeClassParamsDiv").dialog("close");

            var origin = "Lineage_addNode";
            var status = "draft";
            var metaDataTriples = self.getCommonMetaDataTriples(self.graphModification.creatingsourceUri, origin, status, null);
            metaDataTriples.forEach(function (triple) {
                self.graphModification.addTripleToCreatingNode(triple.predicate, triple.object);
            });
        },

        addClassesOrIndividualsTriples: function () {
            var str = $("#LineageBlend_creatingNode_nodeListTA").val();
            if (!str) {
                return alert("no tabular data to process");
            }
            var lines = str.trim().split("\n");

            var possibleClasses = self.currentPossibleClassesAndPredicates.TopLevelOntologyObjects.concat(self.currentPossibleClassesAndPredicates.sourceObjects);
            if (self.graphModification.currentCreatingNodeType == "Class") {
                possibleClasses = self.currentPossibleClassesAndPredicates.TopLevelOntologyObjects.concat(self.currentPossibleClassesAndPredicates.sourceObjects);
            } else if (self.graphModification.currentCreatingNodeType == "NamedIndividual") {
                possibleClasses = self.currentPossibleClassesAndPredicates.sourceObjects;
            }

            var targetUrisMap = {};
            possibleClasses.forEach(function (obj) {
                var classLabel = obj.label;
                /* var array = classLabel.split(/[:\/\#]/);
if (array.length > 0) classLabel = array[array.length - 1];*/
                targetUrisMap[classLabel] = obj.id;
            });

            var wrongClasses = [];
            var triples = [];
            let graphUri = Config.sources[Lineage_sources.activeSource].graphUri;
            let sourceUrisMap = {};
            var sourceUrisArray = [];
            var sep = null;

            lines.forEach(function (line, indexLine) {
                line = line.trim();
                if (indexLine == 0) {
                    var separators = ["\t", ";", ","];
                    separators.forEach(function (_sep) {
                        if (line.split(_sep).length != 2 || sep) {
                            return;
                        }
                        sep = _sep;
                    });
                }

                var cells = line.split(sep);

                if (cells.length != 2) {
                    return;
                }
                var label = cells[0];

                if (targetUrisMap[label]) {
                    sourceUrisMap[label] = targetUrisMap[label];
                } else {
                    var sourceUri = self.graphModification.getURI(label);
                    sourceUrisMap[label] = sourceUri;
                    sourceUrisArray.push(sourceUri);
                }
            });

            if (!sep) {
                return alert("no correct separator found : [\t,;]");
            }

            lines.forEach(function (line, indexLine) {
                line = line.trim();
                var cells = line.split(sep);
                var label = cells[0];
                var classLabel = cells[1];

                var sourceUri = sourceUrisMap[label];
                var targetUri = targetUrisMap[classLabel];
                var predicate = "rdf:type";
                if (self.graphModification.currentCreatingNodeType == "NamedIndividual" && !targetUri) {
                    targetUri = self.possibleNamedIndividuals[classLabel];
                }

                if (!targetUri) {
                    //  alert("xxxx");
                    //targetUri  declared in the list as source node
                    predicate = "part14:partOf";
                    targetUri = sourceUrisMap[classLabel];
                }
                if (!targetUri) {
                    wrongClasses.push({ line: indexLine, classLabel: classLabel });
                } else {
                    triples.push({ subject: sourceUri, predicate: "rdfs:label", object: label });
                    self.possibleNamedIndividuals[label] = sourceUri;
                    if (self.graphModification.currentCreatingNodeType == "Class") {
                        triples.push({ subject: sourceUri, predicate: "rdf:type", object: "owl:Class" });
                        triples.push({ subject: sourceUri, predicate: "rdfs:subClassOf", object: targetUri });
                    } else if (self.graphModification.currentCreatingNodeType == "NamedIndividual") {
                        triples.push({ subject: sourceUri, predicate: "rdf:type", object: "owl:NamedIndividual" });
                        if (targetUri.indexOf(Config.topLevelOntologies[Config.currentTopLevelOntology].uriPattern) > 0) {
                            triples.push({ subject: sourceUri, predicate: predicate, object: targetUri });
                        } else {
                            triples.push({ subject: sourceUri, predicate: predicate, object: targetUri });
                        }
                    }
                }
            });

            if (wrongClasses.length > 0) {
                var html = "<b>wrong lines</b><br><ul>";
                wrongClasses.forEach(function (item) {
                    html += "<li>line " + item.line + " unrecognized classLabel " + item.classLabel + "</li>";
                });
                $("#LineageBlend_creatingNodeListJournalDiv").html(html);
                $("#LineageBlend_creatingNodeClassParamsDiv").tabs("option", "active", 2);
            } else {
                if (confirm("create " + lines.length + " nodes")) {
                    Sparql_generic.insertTriples(Lineage_sources.activeSource, triples, {}, function (err, _result) {
                        if (err) {
                            return alert(err);
                        }
                        self.graphModification.creatingNodeTriples = [];
                        MainController.UI.message(sourceUrisArray.length + " triples created, indexing...");

                        SearchUtil.generateElasticIndex(Lineage_sources.activeSource, { ids: sourceUrisArray }, function (err, result) {
                            if (err) {
                                return alert(err.responseText);
                            }
                            if (self.graphModification.currentCreatingNodeType == "Class") {
                                Lineage_classes.addNodesAndParentsToGraph(Lineage_sources.activeSource, sourceUrisArray, {}, function (err) {
                                    $("#LineageBlend_creatingNodeClassParamsDiv").dialog("close");
                                    $("#LineagePopup").dialog("close");
                                    MainController.UI.message(sourceUrisArray.length + "nodes Created and Indexed");
                                });
                            } else {
                                $("#LineageBlend_creatingNodeClassParamsDiv").dialog("close");
                                $("#LineagePopup").dialog("close");
                                MainController.UI.message(sourceUrisArray.length + "nodes Created and Indexed");
                            }
                        });
                    });
                }
            }
        },

        removeTriple: function (index) {
            self.graphModification.creatingNodeTriples.splice(index, 1);
            $("#triple_" + index).remove();
        },

        createNode: function () {
            if (!self.graphModification.creatingNodeTriples) {
                return alert("no predicates for node");
            }
            var str = JSON.stringify(self.graphModification.creatingNodeTriples);

            if (str.indexOf("rdf:type") < 0) {
                return alert("a type must be declared");
            }
            if (str.indexOf("owl:Class") > -1 && str.indexOf("rdfs:subClassOf") < 0) {
                return alert("a class must be a rdfs:subClassOf anotherClass");
            }
            if (str.indexOf("owl:Class") > -1 && str.indexOf("rdfs:label") < 0) {
                return alert("a class must have a rdfs:label");
            }
            if (true || confirm("create node")) {
                Sparql_generic.insertTriples(Lineage_sources.activeSource, self.graphModification.creatingNodeTriples, {}, function (err, _result) {
                    if (err) {
                        return alert(err);
                    }
                    $("#LineagePopup").dialog("close");
                    var nodeData = {
                        id: self.graphModification.creatingsourceUri,
                        data: {
                            id: self.graphModification.creatingsourceUri,
                            source: Lineage_sources.activeSource,
                        },
                    };
                    MainController.UI.message("node Created");
                    self.graphModification.creatingNodeTriples = [];
                    Lineage_classes.drawNodesAndParents(nodeData);
                    SearchUtil.generateElasticIndex(Lineage_sources.activeSource, { ids: [self.graphModification.creatingsourceUri] }, function (err, result) {
                        if (err) {
                            return alert(err.responseText);
                        }
                        MainController.UI.message("node Created and Indexed");
                    });
                });
            }
        },

        execAddEdgeFromGraph: function () {},
        addGenericPredicatesToPredicatesTree: function () {
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
        },
        createRelationFromGraph: function (inSource, sourceNode, targetNode, propId, options, callback) {
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
                var oldRelations = Lineage_classes.lineageVisjsGraph.getNodeEdges(sourceNode.id, targetNode.id);
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
        },

        onselectNodeUriType: function (uryType) {
            var display = uriType == "specific" ? "block" : "none";
            $("#LineageBlend_creatingNodeSubjectUri").css("display", "display");
        },
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

        Lineage_blend.graphModification.createRelationFromGraph(inSource, self.sourceNode, self.targetNode, obj.node.data.id, options, function (err, result) {
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
                        type: Lineage_classes.defaultEdgeArrowType,
                        scaleFactor: 0.5,
                    },
                });
            newEdge.dashes = true;

            if (result.type == "ObjectProperty") {
                newEdge.color = Lineage_classes.defaultPredicateEdgeColor;
                newEdge.font = { color: Lineage_classes.defaultPredicateEdgeColor };
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
                newEdge.color = Lineage_classes.restrictionColor;
                newEdge.font = { color: Lineage_classes.restrictionColor };
                newEdge.data = {
                    source: inSource,
                    bNodeId: relationId,
                    propertyLabel: propLabel,
                    propertyId: obj.node.data.id,
                };
            }

            Lineage_classes.lineageVisjsGraph.data.edges.add([newEdge]);
        });
    };

    self.getCommonMetaDataTriples = function (subjectUri, source, status, options) {
        var metaDataTriples = [];
        if (!options) {
            options = {};
        }
        var login = authentication.currentUser.login;
        //  var authorUri = Config.defaultNewUriRoot + "users/" + login;
        var dateTime = common.dateToRDFString(new Date()) + "^^xsd:dateTime";

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

    self.createSubProperty = function (source, superPropId, subPropertyLabel, callback) {
        var subPropId = self.graphModification.getURI(subPropertyLabel, source, "fromLabel");
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
            Lineage_classes.registerSource(importedSourceLabel);
            callback();
        });
    };

    self.createRelationTriples = function (relations, createInverseRelation, inSource, options, callback) {
        var allTriples = [];
        if (!Array.isArray(relations)) {
            relations = [relations];
        }
        var normalBlankNode;
        relations.forEach(function (relation) {
            var propId = relation.type;

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

            allTriples = allTriples.concat(restrictionTriples);
            if (options.additionalTriples) {
                allTriplesallTriples.concat(options.additionalTriples);
            }
        });

        Sparql_generic.insertTriples(inSource, allTriples, null, function (err, _result) {
            callback(err, normalBlankNode);
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
                ],
                function (_err) {
                    Lineage_classes.lineageVisjsGraph.data.edges.remove(restrictionNode.id);
                    Lineage_classes.lineageVisjsGraph.data.edges.remove(inverseRestriction);
                    MainController.UI.message("restriction removed", true);
                    if (callback) {
                        return callback(_err);
                    }
                }
            );
        }
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

    self.addRelationToGraph = function (propUri, blankNodeId) {
        var sourceNode = self.currentAssociation[0];
        var targetNode = self.currentAssociation[1];

        var existingNodes = Lineage_classes.lineageVisjsGraph.getExistingIdsMap();
        var visjsData = { nodes: [], edges: [] };

        if (!existingNodes[sourceNode.id]) {
            existingNodes[sourceNode.id] = 1;
            visjsData.nodes.push({
                id: sourceNode.id,
                label: sourceNode.label,
                shape: Lineage_classes.defaultShape,
                size: Lineage_classes.defaultShapeSize,
                color: Lineage_classes.getSourceColor(sourceNode.source),
                level: Lineage_classes.currentExpandLevel,
                data: {
                    id: sourceNode.id,
                    label: sourceNode.label,
                    source: sourceNode.source,
                },
            });
        }

        if (!existingNodes[targetNode.id]) {
            existingNodes[targetNode.id] = 1;
            visjsData.nodes.push({
                id: targetNode.id,
                label: targetNode.label,
                shape: Lineage_classes.defaultShape,
                size: Lineage_classes.defaultShapeSize,
                color: Lineage_classes.getSourceColor(targetNode.source),
                level: Lineage_classes.currentExpandLevel,
                data: {
                    id: targetNode.id,
                    label: targetNode.label,
                    source: targetNode.source,
                },
            });
        }

        var edgeId = sourceNode.id + "_" + propUri + "_" + targetNode.id;
        if (!existingNodes[edgeId]) {
            existingNodes[edgeId] = 1;
            var propLabel = Sparql_common.getLabelFromURI(propUri);
            visjsData.edges.push({
                id: edgeId,
                from: sourceNode.id,
                to: targetNode.id,
                label: "<i>" + propLabel + "</i>",
                data: { propertyId: propUri, source: sourceNode.source, bNodeId: edgeId }, // used by Lineage},
                font: { multi: true, size: 10 },
                arrows: {
                    from: {
                        enabled: true,
                        type: "bar",
                        scaleFactor: 0.5,
                    },
                },
                dashes: true,
                color: Lineage_classes.objectPropertyColor,
            });
        }
        Lineage_classes.lineageVisjsGraph.data.nodes.add(visjsData.nodes);
        Lineage_classes.lineageVisjsGraph.data.edges.add(visjsData.edges);
        Lineage_classes.lineageVisjsGraph.network.fit();
        $("#waitImg").css("display", "none");
    };

    self.getCommonMetaDataTriples = function (subjectUri, source, status, options) {
        var metaDataTriples = [];
        if (!options) {
            options = {};
        }
        var login = authentication.currentUser.login;
        //  var authorUri = Config.defaultNewUriRoot + "users/" + login;
        var dateTime = common.dateToRDFString(new Date()) + "^^xsd:dateTime";

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

    self.getProjectedGraphMetaDataTriples = function (graphUri, imports, options) {
        var triples = [];
        if (!options) {
            options = {};
        }

        imports.forEach(function (importedSource) {
            triples.push({
                subject: graphUri,
                predicate: Config.sousLeSensVocablesGraphUri + "property#import",
                object: importedSource,
            });
        });
        triples.push({
            subject: graphUri,
            predicate: "http://www.w3.org/2002/07/owl#versionIRI",
            object: graphUri,
        });

        triples.push({
            subject: graphUri,
            predicate: "http://www.w3.org/2002/07/owl#versionInfo",
            object: "Revised " + common.dateToRDFString(new Date()),
        });
        if (options.label) {
            triples.push({
                subject: graphUri,
                predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                object: options.label,
            });
        }

        return triples;
    };

    return self;
})();

export default Lineage_blend;

window.Lineage_blend = Lineage_blend;
