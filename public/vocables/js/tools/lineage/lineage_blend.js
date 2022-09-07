// eslint-disable-next-line @typescript-eslint/no-unused-vars
// !!!!!!!!  const util = require("../../../../../bin/util.");
var Lineage_blend = (function () {
    var self = {};

    self.addNodeToAssociationNode = function (node, role, allowAddToGraphButton) {
        if (role == "source") {
            self.currentAssociation = [node.data, ""];
            $("#lineage_sourceNodeDiv").html("<span style='color:" + Lineage_classes.getSourceColor(node.data.source) + "'>" + node.data.source + "." + node.data.label + "</span>");
            $("#lineage_targetNodeDiv").html("");
        } else if (role == "target") {
            if (!self.currentAssociation) return;
            self.currentAssociation[1] = node.data;
            $("#lineage_targetNodeDiv").html("<span style='color:" + Lineage_classes.getSourceColor(node.data.source) + "'>" + node.data.source + "." + node.data.label + "</span>");
        }
        if (Lineage_classes.realAccessControl === "readwrite" && Config.sources[Lineage_classes.mainSource].editable > -1) {
            if (self.currentAssociation && self.currentAssociation.length == 2 && self.currentAssociation[1] !== "") {
                $("#lineage_createRelationButtonsDiv").css("display", "block");
                self.initAllowedPropertiesForRelation();
            } else if (self.currentAssociation && self.currentAssociation[0] !== "") {
                $("#lineage_blendCreateSubClassButton").css("display", "block");
            } else {
                $("#lineage_createRelationButtonsDiv").css("display", "none");
                $("#lineage_blendCreateSubClassButton").css("display", "none");
            }
        }

        /* $("#GenericTools_searchAllSourcesTermInput").val(node.data.label)
$("#GenericTools_searchInAllSources").prop("checked", true)*/

        if (allowAddToGraphButton) {
            $("#lineage_blendToGraphButton").css("display", "block");
        } else {
            $("#lineage_blendToGraphButton").css("display", "none");
        }
    };

    self.clearAssociationNodes = function () {
        $("#lineage_sourceNodeDiv").html("");
        $("#lineage_targetNodeDiv").html("");
        self.currentAssociation = [];
        $("#lineage_createRelationButtonsDiv").css("display", "none");
    };

    self.setNewImport = function (mainSourceLabel, importedSourceLabel, callback) {
        if (mainSourceLabel == importedSourceLabel) return callback();
        var mainSource = Config.sources[mainSourceLabel];
        if (!mainSource) return alert("nos source with label " + mainSourceLabel);
        if (!mainSource.imports) mainSource.imports = [];
        var imports = mainSource.imports.concat(mainSource);
        if (imports && imports.indexOf(importedSourceLabel) > -1) {
            return callback();
        }
        if (!confirm("add  source " + importedSourceLabel + " to imports of source " + mainSourceLabel)) return callback("stop");

        self.addImportToCurrentSource(mainSourceLabel, importedSourceLabel, function (_err, _result) {
            Lineage_classes.registerSource(importedSourceLabel);
            callback();
        });
    };

    self.createSubClass = function () {
        var sourceNode = self.currentAssociation[0];

        if (confirm("Create  for subclass of " + sourceNode.label)) {
            SourceBrowser.addProperty("http://www.w3.org/2000/01/rdf-schema#subClassOf", sourceNode.id, sourceNode.source, true);
        }
    };

    self.createSubProperty = function (source, superPropId, subPropertyLabel, callback) {
        var subPropId = Config.sources[source].graphUri + common.getRandomHexaId(10);
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

    self.createRelationUI = function (type, addImportToCurrentSource, createInverseRelation) {
        var sourceNode = self.currentAssociation[0];
        var targetNode = self.currentAssociation[1];
        if (!type) type = $("#lineage_createRelationPropertySelect").val();

        if (!sourceNode || !targetNode) return alert("select a source node and a target node ");

        if (sourceNode == targetNode) return "source node and target node must be distinct ";

        createInverseRelation = $("#lineage_blendSameAsInverseCBX").prop("checked");

        if (!confirm("paste " + sourceNode.source + "." + sourceNode.label + "  as " + type + " " + targetNode.source + "." + targetNode.label + "?")) return;
        self.createRelation(Lineage_classes.mainSource, type, sourceNode, targetNode, addImportToCurrentSource, createInverseRelation, {}, function (err, _result) {
            if (err) return alert(err);
            self.addRelationToGraph(propId, blankNodeId);
            MainController.UI.message("relation added", true);
        });
    };

    self.createRelation = function (inSource, type, sourceNode, targetNode, addImportToCurrentSource, createInverseRelation, options, callback) {
        if (type != "http://www.w3.org/2002/07/owl#sameAs") createInverseRelation = false;
        var blankNodeId;
        async.series(
            [
                function (callbackSeries) {
                    if (!addImportToCurrentSource) return callbackSeries();
                    self.setNewImport(Lineage_classes.mainSource, targetNode.source, function (err, _result) {
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
                    if (callback) return callback(err);
                    return alert(err);
                }
                if (callback) return callback(null, blankNodeId);
            }
        );
    };

    self.createRelationTriples = function (relations, createInverseRelation, inSource, options, callback) {
        var allTriples = [];
        if (!Array.isArray(relations)) relations = [relations];
        var normalBlankNode;
        relations.forEach(function (relation) {
            var propId = relation.type;

            var restrictionTriples = self.getRestrictionTriples(relation.sourceNode.id, relation.targetNode.id, propId);

            normalBlankNode = restrictionTriples.blankNode;
            var metadataOptions = {
                domainSourceLabel: relation.sourceNode.source,
                rangeSourceLabel: relation.targetNode.source,
            };
            if (!options) options = {};
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
                            if (err) return callbackSeries(err);
                            if (result.length == 0) return callbackSeries();
                            inverseRestriction = result[0].subject.value;
                            callbackSeries();
                        });
                    },
                    // delete inverse restriction
                    function (callbackSeries) {
                        if (!inverseRestriction) return callbackSeries();
                        Sparql_generic.deleteTriples(inSource, inverseRestriction, null, null, function (_err, _result) {
                            callbackSeries();
                        });
                    },
                    function (callbackSeries) {
                        if (!inverseRestriction) return callbackSeries();
                        Sparql_generic.deleteTriples(inSource, null, null, inverseRestriction, function (_err, _result) {
                            callbackSeries();
                        });
                    },
                ],
                function (_err) {
                    visjsGraph.data.edges.remove(restrictionNode.id);
                    visjsGraph.data.edges.remove(inverseRestriction);
                    MainController.UI.message("restriction removed", true);
                    if (callback) return callback(_err);
                }
            );
        }
    };

    (self.createPropertyRangeAndDomain = function (source, souceNodeId, targetNodeId, propId, callback) {
        var triples = [];

        triples.push({
            subject: propId,
            predicate: "http://www.w3.org/2000/01/rdf-schema#domain",
            object: souceNodeId,
        });
        triples.push({
            subject: propId,
            predicate: "http://www.w3.org/2000/01/rdf-schema#range",
            object: targetNodeId,
        });

        Sparql_generic.insertTriples(source, triples, null, function (err, _result) {
            self.addRelationToGraph(propId);
            // Lineage_classes.drawObjectProperties(null,   [souceNodeId], Lineage_classes.mainSource)
            callback(err, "DONE");
        });
    }),
        (self.getSubClassTriples = function (souceNodeId, targetNodeId) {
            var triples = [];
            triples.push({
                subject: souceNodeId,
                predicate: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                object: targetNodeId,
            });
            return triples;
        });

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
                if (!Config.sources[parentSourceLabel].imports)
                    //synchro on client
                    Config.sources[parentSourceLabel].imports = [];
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

        var existingNodes = visjsGraph.getExistingIdsMap();
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
                data: { propertyId: propUri, source: Lineage_classes.mainSource, bNodeId: edgeId }, // used by Lineage},
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
        visjsGraph.data.nodes.add(visjsData.nodes);
        visjsGraph.data.edges.add(visjsData.edges);
        visjsGraph.network.fit();
        $("#waitImg").css("display", "none");
    };

    self.importNodeInCurrentMainSource = function () {
        var node = self.currentAssociation[0];
        if (!node) return;
        var existingNodes = visjsGraph.getExistingIdsMap();
        if (existingNodes[node.id]) return alert("node " + node.label + " already exists in graph ");
        /* if(!confirm(" Import node "+node.label+" in source "+Lineage_classes.mainSource))
return;*/
        self.setNewImport(Lineage_classes.mainSource, node.source, function (err, _result) {
            if (err) return "";
            var toGraphUri = Config.sources[Lineage_classes.mainSource].graphUri;
            Sparql_generic.copyNodes(node.source, toGraphUri, [node.id], null, function (err, _result) {
                if (err) return alert(err);
                visjsGraph.data.nodes.push({
                    id: node.id,
                    label: node.label,
                    color: Lineage_classes.getSourceColor(node.source),
                    shape: "square",
                    size: Lineage_classes.defaultShapeSize,
                    data: node,
                });
                visjsGraph.focusOnNode(node.id);
            });
        });
    };

    self.getCommonMetaDataTriples = function (subjectUri, source, status, options) {
        var metaDataTriples = [];
        if (!options) options = {};
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
        if (status)
            metaDataTriples.push({
                subject: subjectUri,
                predicate: "https://www.dublincore.org/specifications/bibo/bibo/bibo.rdf.xml#status",
                object: status,
            });
        if (source)
            metaDataTriples.push({
                subject: subjectUri,
                predicate: "http://purl.org/dc/terms/source",
                object: source,
            });
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
        if (!options) options = {};

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

    self.transformSameLabelsEdgesIntoSameAsRelations = function (_callback) {
        var edges = visjsGraph.data.edges.get();
        var relations = [];
        var sameLabelEdgeIds = [];
        edges.forEach(function (edge) {
            if (edge.data && edge.data.type == "sameLabel") {
                sameLabelEdgeIds.push(edge.id);
                relations.push({
                    type: "http://www.w3.org/2002/07/owl#sameAs",
                    sourceNode: { id: edge.data.from, source: edge.data.fromSource },
                    targetNode: { id: edge.data.to, source: edge.data.toSource },
                });
            }
        });
        if (relations.length > 0) {
            var options = {};
            self.createRelationTriples(relations, true, Lineage_classes.mainSource, options, function (err, _result) {
                if (err) return alert(err);
                visjsGraph.data.edges.remove(sameLabelEdgeIds);
                MainController.UI.message(relations.length + "  sameAs relations created", true);
            });
        }
    };

    self.createNode = function () {
        SourceBrowser.showNodeInfos(Lineage_classes.mainSource, null, "mainDialogDiv", null, function (_err, _result) {
            // pass
        });
    };

    self.initAllowedPropertiesForRelation = function () {
        var fromNode = self.currentAssociation[0];
        var toNode = self.currentAssociation[1];
        var distinctProperties = {};
        var properties = [];
        Config.Lineage.basicObjectProperties.forEach(function (item) {
            if (item.type == "ObjectProperty") {
                properties.push(item);
                distinctProperties[item.id] = 1;
            }
        });

        //   properties.splice(0, 0, {id: "http://www.w3.org/2002/07/owl#sameAs", label: "sameAs"})

        self.getAssociationAllowedProperties(fromNode, toNode, function (err, result) {
            if (err) return alert(err);

            result.forEach(function (item) {
                if (!distinctProperties[item.id]) {
                    var prefix = "";
                    if (item.p.value.indexOf("part14") > -1) prefix = "part14:";
                    properties.push({
                        id: item.p.value,
                        label: prefix + (item.pLabel ? item.pLabel.value : Sparql_common.getLabelFromURI(item.p.value)),
                    });
                }
            });

            common.fillSelectOptions("lineage_createRelationPropertySelect", properties, false, "label", "id");
            /*
var words = [sourceNode.label, targetNode.label]
var indexes = [sourceNode.source.toLowerCase(), targetNode.source.toLowerCase()]
SearchUtil.getElasticSearchMatches(words, indexes, "exactMatch", 0, 10, function (err, result) {
if (err)
return alert(err);
var xx = result

})*/
        });
    };

    self.getAssociationAllowedProperties = function (fromNode, toNode, callback) {
        var topOntology = "TSF_TOP_ONTOLOGY";

        var query =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "SELECT distinct " +
            "?fromAncestor  ?toAncestor ?p ?pLabel  " +
            Sparql_common.getFromStr(fromNode.source, null, true) +
            " " +
            Sparql_common.getFromStr(toNode.source, null, true) +
            " " +
            Sparql_common.getFromStr(topOntology, null, false) +
            " " +
            /*   "WHERE {" +
"?fromAncestor rdfs:subClassOf ?b. ?b owl:onProperty ?p.optional{?p rdfs:label ?pLabel}" +
" optional{?b owl:someValuesFrom ?toAncestor.filter   ?to rdfs:subClassOf* ?toAncestor}\n" +
"  {SELECT ?fromAncestor   WHERE { ?from rdfs:subClassOf+ ?fromAncestor." +
" filter (?from=<"+fromNode.id+"\> )     }"+*/

            " WHERE {{?fromAncestor rdfs:subClassOf ?b. ?b owl:onProperty ?p.optional{?p rdfs:label ?pLabel} \n" +
            "   optional{ ?b owl:someValuesFrom ?toAncestor.  ?to rdfs:subClassOf+ ?toAncestor   filter( ?toAncestor!=owl:Thing  && ?to=<" +
            toNode.id +
            ">)}\n" +
            "     optional{ ?b owl:someValuesFrom ?toAncestor.  filter( ?toAncestor=owl:Thing)}\n" +
            " filter(BOUND(?toAncestor))\n" +
            "   \n" +
            "  {SELECT ?fromAncestor   WHERE { ?from rdfs:subClassOf+ ?fromAncestor. filter (?from=<" +
            fromNode.id +
            "> )     }}}\n" +
            "  \n" +
            /*    "WHERE {?fromAncestor rdfs:subClassOf ?b. ?b owl:onProperty ?p.optional{?p rdfs:label ?pLabel} optional{?b owl:someValuesFrom ?toAncestor} " + //filter (regex(str(?p),\"http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/\",\"i\"))" +
" {SELECT ?fromAncestor ?toAncestor ?from ?to" +
"    WHERE { ?from rdfs:subClassOf+ ?fromAncestor. filter (str(?from)=\"" + fromNode.id + "\" )" +
"        optional  { ?to rdfs:subClassOf+ ?toAncestor. filter (str(?to)=\"" + toNode.id + "\" )}" +
"  }" +*/
            "} limit 1000";

        var sparql_url = Config.sources[topOntology].sparql_server.url;
        var url = sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: topOntology }, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["node", "concept"]);

            return callback(null, result.results.bindings);
        });
    };

    self.graphModification = {
        showAddNodeGraphDialog: function () {
            self.graphModification.creatingNodeTriples = [];
            self.graphModification.creatingsourceUri = null;
            $("#LineagePopup").dialog("open");
            $("#LineagePopup").load("snippets/lineage/lineageAddNodeDialog.html", function () {
                self.getSourcePossiblePredicatesAndObject(Lineage_classes.mainSource, function (err, result) {
                    if (err) return alert(err.responseText);
                    if (!Config.sources[Lineage_classes.mainSource].allowIndividuals) {
                        $("#LineageBlend_creatingNamedIndividualButton").css("display", "none");
                    }
                    self.currentPossibleClassesAndPredicates = result;
                    common.fillSelectOptions("KGcreator_predicateSelect", result.predicates, true, "label", "id");
                    common.fillSelectOptions("KGcreator_objectSelect", result.usualObjects.concat(result.part14Objects).concat(result.sourceObjects), true, "label", "id");
                    common.fillSelectOptions("LineageBlend_creatingNodePredicatesSelect", result.predicates, true, "label", "id");
                    common.fillSelectOptions("LineageBlend_creatingNodeObjectsSelect", result.sourceObjects.concat(result.part14Objects), true, "label", "id");
                    common.fillSelectOptions("LineageBlend_creatingNodeObjects2Select", result.sourceObjects, true, "label", "id");
                });
            });
        },
        showCreatingNodeClassOrNamedIndividualDialog: function (type) {
            self.graphModification.currentCreatingNodeType = type;
            var showClassDiv = type == "Class";
            if (showClassDiv) {
                $("#LineageBlend_creatingNodeClassDiv").css("display", "block");
                $("#LineageBlend_creatingNodeNameIndividualDiv").css("display", "none");
            } else {
                $("#LineageBlend_creatingNodeClassDiv").css("display", "none");
                $("#LineageBlend_creatingNodeNameIndividualDiv").css("display", "block");
            }

            $("#LineageBlend_creatingNodeClassParamsDiv").dialog("open");
            $("#LineageBlend_creatingNodeClassParamsDiv").tabs({});
        },

        openCreatNodeDialogOpen: function (type) {
            if (type == "owl:Class") {
                $("#LineageBlend_creatingNodeClassParamsDiv").dialog("open");
            }
        },
        addTripleToCreatingNode: function (predicate, object) {
            var uriType = $("#LineageBlend_creatingNodeUriType").val();
            var specificUri = $("#LineageBlend_creatingNodeSubjectUri").val();
            if (specificUri) uriType = "specific";
            if (!self.graphModification.creatingsourceUri) {
                let graphUri = Config.sources[Lineage_classes.mainSource].graphUri;
                if (uriType == "fromLabel") self.graphModification.creatingsourceUri = graphUri + common.formatStringForTriple(object, true);
                else if (uriType == "randomHexaNumber") self.graphModification.creatingsourceUri = graphUri + common.getRandomHexaId(10);
                else if (uriType == "specific") {
                    if (specificUri) {
                        self.graphModification.creatingsourceUri = specificUri;
                    } else {
                        return alert("enter a specific URI");
                    }
                }
                // self.graphModification.creatingNodeTriples = [];
            }
            if (!predicate) predicate = $("#KGcreator_predicateInput").val();
            if (!object) object = $("#KGcreator_objectInput").val();

            $("#KGcreator_predicateInput").val("");
            $("#KGcreator_objectInput").val("");
            $("#KGcreator_predicateSelect").val("");
            $("#KGcreator_objectSelect").val("");

            if (!predicate) return alert("no value for predicate");
            if (!object) return alert("no value for object");

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
            $("#LineageBlend_creatingNodeClassParamsDiv").dialog("close");

            var label = $("#LineageBlend_creatingNodeNewClassLabel").val();
            if (!label) return alert("rdfs:label is mandatory");
            self.graphModification.addTripleToCreatingNode("rdfs:label", label);

            var type = $("#LineageBlend_creatingNodePredicatesSelect").val();

            if (self.graphModification.currentCreatingNodeType == "Class") {
                var superClass = $("#LineageBlend_creatingNodeObjectsSelect").val();
                if (!superClass) return alert("owl:Class is mandatory");
                self.graphModification.addTripleToCreatingNode("rdf:type", "owl:Class");
                self.graphModification.addTripleToCreatingNode("rdfs:subClassOf", superClass);
            } else if (self.graphModification.currentCreatingNodeType == "NamedIndividual") {
                var individualtypeClass = $("#LineageBlend_creatingNodeObjects2Select").val();
                if (!individualtypeClass) return alert("owl:Class is mandatory");
                self.graphModification.addTripleToCreatingNode("rdf:type", "owl:NamedIndividual");
                self.graphModification.addTripleToCreatingNode("rdf:type", individualtypeClass);
            }
            var origin = "Lineage_addNode";
            var status = "draft";
            var metaDataTriples = self.getCommonMetaDataTriples(self.graphModification.creatingsourceUri, origin, status, null);
            metaDataTriples.forEach(function (triple) {
                self.graphModification.addTripleToCreatingNode(triple.predicate, triple.object);
            });
        },

        addClassesOrIndividualsTriples: function () {
            var str = $("#LineageBlend_creatingNode_nodeListTA").val();
            if (!str) return alert("no tbale data to process");
            var lines = str.trim().split("\n");

            var possibleClasses = self.currentPossibleClassesAndPredicates.part14Objects.concat(self.currentPossibleClassesAndPredicates.sourceObjects);
            if (self.graphModification.currentCreatingNodeType == "Class") {
                possibleClasses = self.currentPossibleClassesAndPredicates.part14Objects.concat(self.currentPossibleClassesAndPredicates.sourceObjects);
            } else if (self.graphModification.currentCreatingNodeType == "NamedIndividual") {
                possibleClasses = self.currentPossibleClassesAndPredicates.sourceObjects;
            }

            var targetUrisMap = {};
            possibleClasses.forEach(function (obj) {
                var classLabel = obj.label;
                var array = classLabel.split(/[:\/\#]/);
                if (array.length > 0) classLabel = array[array.length - 1];
                targetUrisMap[classLabel] = obj.id;
            });

            var wrongClasses = [];
            var triples = [];
            let graphUri = Config.sources[Lineage_classes.mainSource].graphUri;
            let sourceUrisMap = {};
            var sourceUrisArray = [];
            lines.forEach(function (line, indexLine) {
                line = line.trim();
                var cells = line.split(/[,\t]/);
                var label = cells[0];
                var classLabel = cells[1];

                if (targetUrisMap[label]) {
                    sourceUrisMap[label] = targetUrisMap[label];
                } else {
                    var sourceUri = graphUri + common.getRandomHexaId(10);
                    sourceUrisMap[label] = sourceUri;
                    sourceUrisArray.push(sourceUri);
                }
            });

            lines.forEach(function (line, indexLine) {
                line = line.trim();
                var cells = line.split(/[,\t]/);
                var label = cells[0];
                var classLabel = cells[1];
                var sourceUri = sourceUrisMap[label];
                var targetUri = targetUrisMap[classLabel];
                var predicate = "rdf:type";
                if (!targetUri) {
                    //targetUri  declared in the list as source node
                    predicate = "part14:partOf";
                    targetUri = sourceUrisMap[classLabel];
                }
                if (!targetUri) {
                    wrongClasses.push({ line: indexLine, classLabel: classLabel });
                } else {
                    triples.push({ subject: sourceUri, predicate: "rdfs:label", object: label });
                    if (self.graphModification.currentCreatingNodeType == "Class") {
                        triples.push({ subject: sourceUri, predicate: "rdf:type", object: "owl:Class" });
                        triples.push({ subject: sourceUri, predicate: "rdfs:subClassOf", object: targetUri });
                    } else if (self.graphModification.currentCreatingNodeType == "NamedIndividual") {
                        triples.push({ subject: sourceUri, predicate: "rdf:type", object: "owl:NamedIndividual" });
                        if (targetUri.indexOf("lis14") > 0) {
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
                    Sparql_generic.insertTriples(Lineage_classes.mainSource, triples, {}, function (err, _result) {
                        if (err) return alert(err);
                        self.graphModification.creatingNodeTriples = [];
                        MainController.UI.message(sourceUrisArray.length + " triples created, indexing...");

                        SearchUtil.generateElasticIndex(Lineage_classes.mainSource, { ids: sourceUrisArray }, function (err, result) {
                            if (err) return alert(err.responseText);
                            if (self.graphModification.currentCreatingNodeType == "Class") {
                                Lineage_classes.addNodesAndParentsToGraph(Lineage_classes.mainSource, sourceUrisArray, {}, function (err) {
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
            if (!self.graphModification.creatingNodeTriples) return alert("no predicates for node");
            var str = JSON.stringify(self.graphModification.creatingNodeTriples);

            if (str.indexOf("rdf:type") < 0) return alert("a type must be declared");
            if (str.indexOf("owl:Class") > -1 && str.indexOf("rdfs:subClassOf") < 0) return alert("a class must be a rdfs:subClassOf anotherClass");
            if (str.indexOf("owl:Class") > -1 && str.indexOf("rdfs:label") < 0) return alert("a class must have a rdfs:label");
            if (true || confirm("create node")) {
                Sparql_generic.insertTriples(Lineage_classes.mainSource, self.graphModification.creatingNodeTriples, {}, function (err, _result) {
                    if (err) return alert(err);
                    $("#LineagePopup").dialog("close");
                    var nodeData = {
                        id: self.graphModification.creatingsourceUri,
                        source: Lineage_classes.mainSource,
                    };
                    MainController.UI.message("node Created");
                    self.graphModification.creatingNodeTriples = [];
                    Lineage_classes.drawNodeAndParents(nodeData);
                    SearchUtil.generateElasticIndex(Lineage_classes.mainSource, { ids: [self.graphModification.creatingsourceUri] }, function (err, result) {
                        if (err) return alert(err.responseText);
                        MainController.UI.message("node Created and Indexed");
                    });
                });
            }
        },
        showAddEdgeFromGraphDialog: function (edgeData, callback) {
            $("#LineagePopup").dialog("open");
            $("#LineagePopup").load("snippets/lineage/lineageAddEdgeDialog.html", function () {
                self.sourceNode = visjsGraph.data.nodes.get(edgeData.from).data;
                self.targetNode = visjsGraph.data.nodes.get(edgeData.to).data;
                $("#lineageAddEdgeDialog_Title").html(self.sourceNode.label + " -> " + self.targetNode.label);

                let options = {
                    openAll: true,
                    selectTreeNodeFn: function (event, obj) {
                        event.stopPropagation();
                        self.currentPropertiesTreeNode = obj.node;
                        if (obj.event.which == 3) return;
                        //dispatch of sources to write in depending on relation type and editable
                        var inSource;
                        var options = {};
                        if (obj.node.data.id == "http://www.w3.org/2002/07/owl#sameAs")
                            // le sameAs sont tous dans le dictionaire
                            inSource = Config.dictionarySource;
                        else {
                            //Lineage_classes.mainSource
                            var mainSource = Config.sources[Lineage_classes.mainSource];
                            if (mainSource.editable && self.sourceNode.source == Lineage_classes.mainSource) inSource = Lineage_classes.mainSource;
                            //soit  dans predicateSource
                            else inSource = Config.predicatesSource;
                        }

                        Lineage_blend.graphModification.createRelationFromGraph(inSource, self.sourceNode, self.targetNode, obj.node.data.id, options, function (err, blankNodeId) {
                            if (err) return callback(err);
                            let newEdge = edgeData;
                            let propLabel = obj.node.data.label || Sparql_common.getLabelFromURI(obj.node.data.id);
                            var bNodeId = blankNodeId || "<_:b" + common.getRandomHexaId(10) + ">";
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
                            newEdge.color = Lineage_classes.restrictionColor;
                            newEdge.data = {
                                source: inSource,
                                bNodeId: bNodeId,
                                propertyLabel: propLabel,
                                propertyId: obj.node.data.id,
                            };
                            visjsGraph.data.edges.add([newEdge]);
                        });
                    },
                };
                var jstreeData = [];
                var distinctProps = {};
                var authorizedProps = {};
                let inSource = Lineage_classes.mainSource;
                let sourceNodeFirstPart14Ancestor = null;
                let targetNodeFirstPart14Ancestor = null;
                async.series(
                    [
                        function (callbackSeries) {
                            jstreeData.push({
                                id: "http://www.w3.org/2002/07/owl#sameAs",
                                text: "owl:sameAs",
                                parent: "#",
                                data: {
                                    id: "http://www.w3.org/2002/07/owl#sameAs",
                                    inSource: Config.dictionarySource,
                                },
                            });

                            jstreeData.push({
                                id: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                                text: "rdf:type",
                                parent: "#",
                                data: {
                                    id: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                                    inSource: Lineage_classes.mainSource,
                                },
                            });

                            if (Config.sources[Lineage_classes.mainSource].schemaType == "OWL" && self.sourceNode.type != "NamedIndividual") {
                                jstreeData.push({
                                    id: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                                    text: "rdfs:subClassOf",
                                    parent: "#",
                                    data: {
                                        id: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                                        inSource: Lineage_classes.mainSource,
                                    },
                                });
                            }
                            // var data = ["owl:sameAs"]
                            //  common.fillSelectOptions("lineageAddEdgeDialog_generalPropertiesTreeDiv", data)
                            //   common.jstree.loadJsTree("lineageAddEdgeDialog_generalPropertiesTreeDiv", jstreedata2, options);
                            callbackSeries();
                        },

                        //filter formal ontology axioms to selected nodes
                        function (callbackSeries) {
                            if (!Config.sources[Lineage_classes.mainSource].editable) {
                                $("#lineageAddEdgeDialog_part14PropertiesTreeDiv").html("source " + Lineage_classes.mainSource + " is not editable");
                                return callbackSeries();
                            }
                            let inSource = Config.formalOntologySourceLabel;
                            let ancestorsDepth = 5;
                            Sparql_OWL.getNodeParents(Lineage_classes.mainSource, null, [self.sourceNode.id, self.targetNode.id], ancestorsDepth, {}, function (err, result) {
                                if (err) return callbackSeries(err);

                                result.forEach(function (item) {
                                    if (item.concept.value == self.sourceNode.id) {
                                        if (item.concept.value.indexOf("/lis14/") > -1) {
                                            sourceNodeFirstPart14Ancestor = item.concept.value;
                                            return;
                                        }
                                        for (var i = 1; i <= ancestorsDepth; i++) {
                                            if (item["broader" + i]) {
                                                if (item["broader" + i].value.indexOf("/lis14/") > -1) {
                                                    sourceNodeFirstPart14Ancestor = item["broader" + i].value;
                                                    break;
                                                }
                                            }
                                        }
                                    } else if (item.concept.value == self.targetNode.id) {
                                        if (item.concept.value.indexOf("/lis14/") > -1) {
                                            targetNodeFirstPart14Ancestor = item.concept.value;
                                            return;
                                        }
                                        for (var i = 1; i <= ancestorsDepth; i++) {
                                            if (item["broader" + i]) {
                                                if (item["broader" + i].value.indexOf("/lis14/") > -1) {
                                                    targetNodeFirstPart14Ancestor = item["broader" + i].value;
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                });
                                if (!sourceNodeFirstPart14Ancestor || !targetNodeFirstPart14Ancestor) {
                                    alert("no matching Part14 superClass");
                                    return callbackSeries();
                                }

                                self.getAuthorizedProperties(Config.formalOntologySourceLabel, sourceNodeFirstPart14Ancestor, targetNodeFirstPart14Ancestor, function (err, _authorizedProps) {
                                    authorizedProps = _authorizedProps;
                                    return callbackSeries();
                                });
                            });
                        },
                        /*   function(callbackSeries) {
                 var propertyIds = Object.keys(authorizedProps);
                 Sparql_OWL.getObjectSubProperties(Lineage_classes.mainSource, propertyIds, options, function(err, result) {
                   if (err) return callbackSeries(err);
                   result.forEach(function(item) {
                     if (!authorizedProps[item.property.value]) return;
                     if (!authorizedProps[item.property.value].children) authorizedProps[item.property.value].children = [];
                     authorizedProps[item.property.value].children.push({
                       id: item.subProperty.value,
                       label: item.subPropertyLabel.value
                     });
                   });
                   callbackSeries();
                 });
               },*/

                        //create formal Ontology tree nodes
                        function (callbackSeries) {
                            for (var prop in authorizedProps) {
                                var propObj = authorizedProps[prop];
                                if (propObj.children) {
                                    propObj.children.forEach(function (child) {
                                        if (!distinctProps[child.id]) {
                                            jstreeData.push({
                                                id: child.id,
                                                text: "<span class='" + cssClass + "'>" + child.label + "</span>",
                                                parent: propObj.prop,
                                                data: {
                                                    id: child.id,
                                                    label: child.label,
                                                    source: Config.formalOntologySourceLabel,
                                                },
                                            });
                                        }
                                    });
                                }

                                if (!distinctProps[propObj.prop]) {
                                    var label;
                                    var cssClass = "lineageAddEdgeDialog_part14Prop";
                                    if (propObj.type != "") cssClass = "lineageAddEdgeDialog_part14SemiGenericProp";
                                    if (propObj.isGenericProperty) {
                                        cssClass = "lineageAddEdgeDialog_part14GenericProp";
                                        label = "any" + "-" + propObj.label + "->" + "any";
                                    } else
                                        label =
                                            Sparql_common.getLabelFromURI(propObj.type.indexOf("R") ? sourceNodeFirstPart14Ancestor : "any") +
                                            "-" +
                                            propObj.label +
                                            "->" +
                                            Sparql_common.getLabelFromURI(propObj.type.indexOf("D") ? targetNodeFirstPart14Ancestor : "any");

                                    jstreeData.push({
                                        id: propObj.prop,
                                        text: "<span class='" + cssClass + "'>" + label + "</span>",
                                        parent: "#",
                                        data: {
                                            id: propObj.prop,
                                            label: propObj.label,
                                            source: Config.formalOntologySourceLabel,
                                        },
                                    });
                                }
                            }

                            callbackSeries();
                        },
                        /*   function(callbackSeries) {
                 return callbackSeries();
                 if (!Config.sources[Lineage_classes.mainSource].editable) {
                   $("#lineageAddEdgeDialog_currentSourcePropertiesTreeDiv").html("source " + Lineage_classes.mainSource + " is not editable");
                   return callbackSeries();
                 }

                 Lineage_properties.getPropertiesjsTreeData(inSource, null, null, {}, function(err, jstreeData3) {
                   if (err) return callbackSeries(err);
                   let jstreeDataX = [];
                   jstreeDataX.forEach(function(item) {
                     item.data.inSource = inSource;
                   });

                   jstreeDataX.push({
                     id: inSource,
                     text: inSource,
                     parent: "#"
                   });
                   jstreeData = jstreeData.concat(jstreeDataX);
                   //  common.jstree.loadJsTree("lineageAddEdgeDialog_currentSourcePropertiesTreeDiv", jstreeData3, options);

                   callbackSeries();
                 });
               },*/

                        //get specific(mainSource) source properties
                        function (callbackSeries) {
                            if (self.currentSpecificObjectPropertiesMap) return callbackSeries();
                            var specificSourceLabel = Lineage_common.currentSource || Lineage_classes.mainSource;

                            Sparql_OWL.listObjectProperties(specificSourceLabel, null, function (err, result) {
                                if (err) return callbackSeries(err);
                                self.currentSpecificObjectPropertiesMap = {};
                                result.forEach(function (item) {
                                    if (item.superProp) {
                                        if (!self.currentSpecificObjectPropertiesMap[item.superProp.value]) self.currentSpecificObjectPropertiesMap[item.superProp.value] = [];
                                        self.currentSpecificObjectPropertiesMap[item.superProp.value].push({
                                            id: item.prop.value,
                                            label: item.propLabel.value,
                                        });
                                    }
                                });
                                return callbackSeries();
                            });
                        },

                        //add specific(mainSource) source properties to jstree data
                        function (callbackSeries) {
                            var specificSourceLabel = Lineage_common.currentSource || Lineage_classes.mainSource;
                            var cssClass = "lineageAddEdgeDialog_part14SpecificProp";
                            jstreeData.forEach(function (node) {
                                if (self.currentSpecificObjectPropertiesMap[node.id]) {
                                    self.currentSpecificObjectPropertiesMap[node.id].forEach(function (item) {
                                        jstreeData.push({
                                            id: item.id,
                                            text: "<span class='" + cssClass + "'>" + item.label + "</span>",
                                            parent: node.id,
                                            data: {
                                                id: item.id,
                                                label: item.label,
                                                source: specificSourceLabel,
                                            },
                                        });
                                    });
                                }
                            });
                            return callbackSeries();
                        },
                        function (callbackSeries) {
                            options.contextMenu = {
                                refineProperty: {
                                    label: "Refine Property",
                                    action: function (_e) {
                                        if (self.currentPropertiesTreeNode.data.source != Config.formalOntologySourceLabel) return alert("only properties form lis14 can be refined");
                                        var subPropertyLabel = prompt("enter label for subProperty of property " + self.currentPropertiesTreeNode.data.label);
                                        if (!subPropertyLabel) return;
                                        Lineage_blend.createSubProperty(Lineage_classes.mainSource, self.currentPropertiesTreeNode.data.id, subPropertyLabel, function (err, result) {
                                            if (err) return alert(err);

                                            if (!self.currentSpecificObjectPropertiesMap[self.currentPropertiesTreeNode.data.id])
                                                self.currentSpecificObjectPropertiesMap[self.currentPropertiesTreeNode.data.id] = [];
                                            self.currentSpecificObjectPropertiesMap[self.currentPropertiesTreeNode.data.id].push(result.uri);

                                            var jstreeData = [
                                                {
                                                    id: result.uri,
                                                    text: subPropertyLabel,
                                                    parent: self.currentPropertiesTreeNode.data.id,
                                                    data: {
                                                        id: result.uri,
                                                        label: subPropertyLabel,
                                                        source: Lineage_classes.mainSource,
                                                    },
                                                },
                                            ];

                                            common.jstree.addNodesToJstree("lineageAddEdgeDialog_authorizedPredicatesTreeDiv", self.currentPropertiesTreeNode.data.id, jstreeData, options);
                                        });
                                    },
                                },
                                nodeInfos: {
                                    label: "Node infos",
                                    action: function (_e) {
                                        // pb avec source
                                        SourceBrowser.showNodeInfos(self.currentPropertiesTreeNode.data.source, self.currentPropertiesTreeNode, "mainDialogDiv");
                                    },
                                },
                            };

                            common.jstree.loadJsTree("lineageAddEdgeDialog_authorizedPredicatesTreeDiv", jstreeData, options);
                            callbackSeries();
                        },
                    ],

                    function (err) {
                        if (err) return callback(err);

                        if (edgeData.from === edgeData.to) {
                            return callback(null);
                        } else {
                            return callback(null);
                        }
                    }
                );
            });
        },
        execAddEdgeFromGraph: function () {},
        addGenericPredicatesToPredicatesTree: function () {
            var jstreeData = [];
            self.authorizedProperties[Config.formalOntologySourceLabel].forEach(function (item) {
                if (item.isGenericProperty) {
                    var text = "<span class='lineageAddEdgeDialog_part14GenericProp'>" + (item.propLabel ? item.propLabel.value : Sparql_common.getLabelFromURI(item.prop.value)) + "</span>";

                    jstreeData.push({
                        id: item.prop.value,
                        text: text,
                        parent: "#",
                        data: {
                            id: item.prop.value,
                            label: item.propLabel,
                            source: Config.formalOntologySourceLabel,
                        },
                    });
                }
            });

            common.jstree.addNodesToJstree("lineageAddEdgeDialog_authorizedPredicatesTreeDiv", "#", jstreeData, { positionLast: 1 });
        },

        createRelationFromGraph: function (inSource, sourceNode, targetNode, propId, options, callback) {
            if (!confirm("create Relation " + sourceNode.label + "-" + Sparql_common.getLabelFromURI(propId) + "->" + targetNode.label + " in Graph " + inSource)) return;
            $("#LineagePopup").dialog("close");

            var isRestriction = true;
            if (propId == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" || propId == "http://www.w3.org/2000/01/rdf-schema#subClassOf") isRestriction = false;
            if (sourceNode.type == "NamedIndividual") isRestriction = false;
            if (propId == "http://www.w3.org/2002/07/owl#sameAs" && sourceNode.source == Lineage_classes.mainSource && targetNode.source == Lineage_classes.mainSource) isRestriction = false;

            if (!isRestriction) {
                var triples = [];
                triples.push({
                    subject: sourceNode.id,
                    predicate: propId,
                    object: targetNode.id,
                });

                Sparql_generic.insertTriples(inSource, triples, {}, function (err, _result) {
                    if (err) return callback(err);
                    return callback(null, _result);
                });
            } else {
                var oldRelations = visjsGraph.getNodeEdges(sourceNode.id, targetNode.id);
                self.createRelation(inSource, propId, sourceNode, targetNode, true, true, {}, function (err, blankNodeId) {
                    if (err) return callback(err);
                    MainController.UI.message("relation added", true);

                    if (oldRelations.length > 0) {
                        if (confirm("delete previous relation " + oldRelations[0].data.propertyLabel)) {
                            Lineage_blend.deleteRestriction(Lineage_classes.mainSource, oldRelations[0], function (err) {
                                if (err) alert(err);
                            });
                        }
                    }

                    return callback(null, blankNodeId);
                });
            }
        },
    };

    self.getAuthorizedProperties = function (sourceLabel, domain, range, callback) {
        function filterProps() {
            let props = {};
            let allProps = self.authorizedProperties[sourceLabel];
            var subProposMap = {};

            allProps.forEach(function (item) {
                if (item.prop.value.indexOf("concret") > -1) var x = 3;
                let type = "";
                let ok = false;
                if (!item.range && item.domain && (item.domain.value == domain || item.domaintype == "bnode")) {
                    type = "D";
                    ok = true;
                } else if (!item.domain && item.range && (item.range.value == range || item.domaintype == "bnode")) {
                    type = "R";
                    ok = true;
                } else if (item.domain && item.range && item.domain.value == domain && item.range.value == range) ok = true;

                if (ok) {
                    props[item.prop.value] = {
                        prop: item.prop.value,
                        label: item.propLabel ? item.propLabel.value : Sparql_common.getLabelFromURI(item.prop.value),
                        type: type,
                    };
                }
            });
            if (true || Object.keys(props).length == 0) {
                allProps.forEach(function (item) {
                    if (item.isGenericProperty) {
                        props[item.prop.value] = {
                            prop: item.prop.value,
                            label: item.propLabel ? item.propLabel.value : Sparql_common.getLabelFromURI(item.prop.value),
                            isGenericProperty: item.isGenericProperty,
                        };
                    }
                });
            }
            return props;
        }

        if (!self.authorizedProperties) self.authorizedProperties = {};
        if (!self.authorizedProperties[sourceLabel]) {
            var allProps;
            async.series(
                [
                    function (callbackSeries) {
                        Sparql_OWL.getInferredPropertiesDomainsAndRanges(sourceLabel, {}, function (err, _result) {
                            if (err) return callbackSeries(err);

                            allProps = _result;
                            return callbackSeries();
                        });
                    },
                    function (callbackSeries) {
                        Sparql_OWL.getPropertiesWithoutDomainsAndRanges(sourceLabel, {}, function (err, _result2) {
                            if (err) return callbackSeries(err);
                            // allProps = allProps.concat(_result2)
                            _result2.forEach(function (item) {
                                item.isGenericProperty = true;
                                allProps.push(item);
                            });
                            return callbackSeries();
                        });
                    },
                ],
                function (err) {
                    self.authorizedProperties[sourceLabel] = allProps;
                    var props = filterProps();
                    return callback(err, props);
                }
            );
        } else {
            var props = filterProps();
            return callback(null, props);
        }
    };

    self.getSourcePossiblePredicatesAndObject = function (source, callback) {
        var predicates = [];
        KGcreator.usualProperties.forEach(function (item) {
            predicates.push({ label: item, id: item });
        });

        Sparql_OWL.getDictionary(source, { selectGraph: true }, null, function (err, result) {
            if (err) callback(err);

            var sourceObjects = [];
            var part14Objects = [];
            result.forEach(function (item) {
                if (item.id.type == "bnode") return;
                var prefix = "";
                if (item.g.value.indexOf("lis14") > -1) {
                    prefix = " part14:";
                    part14Objects.push({ label: prefix + item.label.value, id: item.id.value, type: "Class" });
                } else {
                    if (item.label) sourceObjects.push({ label: prefix + item.label.value, id: item.id.value, type: "Class" });
                }
            });
            sourceObjects.sort(function (a, b) {
                if (!a.label || !b.label) return 0;
                if (a.label > b.label) return 1;
                if (a.label < b.label) return -1;
                return 0;
            });

            var usualObjects = [];
            KGcreator.usualObjectClasses.forEach(function (item) {
                usualObjects.push({ label: item, id: item });
            });

            var basicTypeClasses = [];
            KGcreator.basicTypeClasses.forEach(function (item) {
                basicTypeClasses.push({ label: item, id: item });
            });

            // var allObjects=usualObjects.concat(sourceObjects);
            return callback(null, {
                predicates: predicates,
                usualObjects: usualObjects,
                sourceObjects: sourceObjects,
                part14Objects: part14Objects,
                basicTypeClasses: basicTypeClasses,
            });
        });
    };

    return self;
})();
