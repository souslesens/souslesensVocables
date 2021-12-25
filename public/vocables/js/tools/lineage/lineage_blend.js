var Lineage_blend = (function () {


    var self = {}


    self.addNodeToAssociationNode = function (node, role) {
        if (role == "source") {
            self.currentAssociation = [node.data, []]
            $("#lineage_sourceNodeDiv").html(node.data.source + "." + node.data.label)
            $("#lineage_targetNodeDiv").html("")
        } else if (role == "target") {
            if(!self.currentAssociation)
                return
            self.currentAssociation[1] = node.data;
            $("#lineage_targetNodeDiv").html(node.data.source + "." + node.data.label)
        }
        if (self.currentAssociation && self.currentAssociation.length == 2) {
            $("#lineage_blendButtonsDiv").css('display', 'block')
        } else {
            $("#lineage_blendButtonsDiv").css('display', 'none')
        }


        $("#GenericTools_searchAllSourcesTermInput").val(node.data.label)
        $("#GenericTools_searchInAllSources").prop("checked", true)
    }

    self.createRelations = function (type,relations,addImportToCurrentSource) {

    }




    self.createRelation = function (type,addImportToCurrentSource) {
        var sourceNode = self.currentAssociation[0]
        var targetNode = self.currentAssociation[1]
        if (!sourceNode || !targetNode)
            return "copy a source node and select "
        if (!confirm("paste " + sourceNode.source + "." + sourceNode.label + "  as subClassOf " + targetNode.source + "." + targetNode.label + "?"))
            return;


        async.series([
            function (callbackSeries) {
                var imports = Config.sources[Lineage_classes.mainSource].imports;
                if (imports && imports.indexOf(sourceNode.source) > -1) {
                    return callbackSeries()
                }
                if ( addImportToCurrentSource && !confirm("add  source " + targetNode.source + " to imports of source " + Lineage_common.currentSource))
                    return callbackSeries("stop");

                self.addImportToCurrentSource(Lineage_classes.mainSource, targetNode.source, function (err, result) {

                    Lineage_classes.registerSource(targetNode.source);
                    callbackSeries()

                })

            }

            , function (callbackSeries) {
                if (type == 'sameAs') {
                    var propId = "http://www.w3.org/2002/07/owl#sameAs"
                    //  self.createPropertyRangeAndDomain(Lineage_classes.mainSource, sourceNode.id, targetNode.id, propId, function (err, result) {

                    var restrictionTriples = self.getRestrictionTriples(sourceNode.id, targetNode.id, propId)
                    var metadataOptions = {
                        domainSourceLabel: sourceNode.source,
                        rangeSourceLabel: targetNode.source,
                    }
                    var metaDataTriples = self.getCommonMetaDataTriples(restrictionTriples.blankNode, "manual","candidate", metadataOptions)
                    restrictionTriples = restrictionTriples.concat(metaDataTriples)
                    Sparql_generic.insertTriples(Lineage_classes.mainSource, restrictionTriples, null, function (err, result) {
                        if (err)
                            return alert(err);
                        self.addRelationToGraph(propId)
                        callback(err, "DONE")
                        callbackSeries()
                        MainController.UI.message("relation added", true)
                    })

                }

            }

        ], function (err) {

        })


    }


    self.deleteRestriction = function (restrictionNode) {
        if (confirm("delete selected restriction")) {
            Sparql_generic.deleteTriples(restrictionNode.data.source, restrictionNode.data.bNodeId, null, null, function (err, result) {
                visjsGraph.data.edges.remove(restrictionNode.id)
                MainController.UI.message("restriction removed", true)
            })
        }
    }


    self.createPropertyRangeAndDomain = function (source, souceNodeId, targetNodeId, propId, callback) {
        var triples = []


        triples.push({
            subject: propId,
            predicate: "http://www.w3.org/2000/01/rdf-schema#domain",
            object: souceNodeId
        })
        triples.push({
            subject: propId,
            predicate: "http://www.w3.org/2000/01/rdf-schema#range",
            object: targetNodeId
        })


        Sparql_generic.insertTriples(source, triples, null, function (err, result) {
            self.addRelationToGraph(propId)
            // Lineage_classes.drawObjectProperties(null,   [souceNodeId], Lineage_classes.mainSource)
            callback(err, "DONE")
        })
    }

        ,
        self.getSubClassTriples = function (souceNodeId, targetNodeId) {
            var triples = []
            triples.push({
                subject: souceNodeId,
                predicate: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                object: targetNodeId
            })
            return triples;
        }

    self.getRestrictionTriples = function (sourceNodeId, targetNodeId, propId) {
        var restrictionsTriples = []
        var blankNode = "_:b" + common.getRandomHexaId(10)

        restrictionsTriples.push({
            subject: sourceNodeId,
            predicate: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
            object: blankNode
        })
        restrictionsTriples.push({
            subject: blankNode,
            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            object: "http://www.w3.org/2002/07/owl#Restriction"
        })
        restrictionsTriples.push({
            subject: blankNode,
            predicate: "http://www.w3.org/2002/07/owl#onProperty",
            object: propId
        })
        restrictionsTriples.push({
            subject: blankNode,
            predicate: "http://www.w3.org/2002/07/owl#someValuesFrom",
            object: targetNodeId
        })

        restrictionsTriples.blankNode = blankNode
        return restrictionsTriples;
    }


    self.addImportToCurrentSource = function (parentSource, importedSource, callback) {
        var payload = {
            addImportToSource: 1,
            parentSource: parentSource,
            importedSource: importedSource
        }
        $.ajax({
            type: "POST",
            url: Config.serverUrl,
            data: payload,
            dataType: "json",
            success: function (data, textStatus, jqXHR) {
                if (!Config.sources[parentSource].imports)//synchro on client
                    Config.sources[parentSource].imports = []
                Config.sources[parentSource].imports.push(importedSource)
                return callback()
            },
            error: function (err) {
                return callback(err)
            }
        })


    }

    self.addRelationToGraph = function (propUri) {
        var sourceNode = self.currentAssociation[0]
        var targetNode = self.currentAssociation[1]

        var existingNodes = visjsGraph.getExistingIdsMap();
        var visjsData = {nodes: [], edges: []}

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
                    source: sourceNode.source
                }
            })

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
                    source: targetNode.source
                }
            })

        }

        var edgeId = sourceNode.id + "_" + propUri + "_" + targetNode.id
        if (!existingNodes[edgeId]) {
            existingNodes[edgeId] = 1
            var propLabel = Sparql_common.getLabelFromURI(propUri)
            visjsData.edges.push({
                id: edgeId,
                from: sourceNode.id,
                to: targetNode.id,
                label: "<i>" + propLabel + "</i>",
                data: {propertyId: propUri, source: Lineage_classes.mainSource},
                font: {multi: true, size: 10},
                // font: {align: "middle", ital: {color:Lineage_classes.objectPropertyColor, mod: "italic", size: 10}},
                //   physics:false,
                arrows: {
                    from: {
                        enabled: true,
                        type: "bar",
                        scaleFactor: 0.5
                    },
                },
                dashes: true,
                color: Lineage_classes.objectPropertyColor

            })

        }
        visjsGraph.data.nodes.add(visjsData.nodes)
        visjsGraph.data.edges.add(visjsData.edges)
        visjsGraph.network.fit()
        $("#waitImg").css("display", "none");

    }

    self.getCommonMetaDataTriples = function (subjectUri, provenance,status, options) {
        var metaDataTriples = []
        if(!options)
            options={}
        var login = authentication.currentUser.login;
        var authorUri = Config.sousLeSensVocablesGraphUri + "users/" + login
        var dateTime = common.dateToRDFString(new Date()) + "^^xsd:dateTime"



        metaDataTriples.push({
            subject: subjectUri,
            predicate: "http://purl.org/dc/terms/creator",
            object: authorUri
        })

        metaDataTriples.push({
            subject: subjectUri,
            predicate: "purl.org/dc/terms/created",
            object: dateTime
        })

        metaDataTriples.push({
            subject: subjectUri,
            predicate: "https://www.dublincore.org/specifications/bibo/bibo/bibo.rdf.xml#status",
            object: Config.sousLeSensVocablesGraphUri + "status/" + status
        })
        metaDataTriples.push({
            subject: subjectUri,
            predicate: "http://purl.org/dc/terms/provenance",
            object: Config.sousLeSensVocablesGraphUri + "provenance/" + provenance
        })
        if (options) {
            for (var key in options) {

                metaDataTriples.push({
                    subject: subjectUri,
                    predicate: Config.sousLeSensVocablesGraphUri+"property#" + key,
                    object: options[key]
                })

            }
        }

        return metaDataTriples

    }
    self.getProjectedGraphMetaDataTriples=function(graphUri,imports,options) {
        var triples=[]
        if(!options)
            options={}

        imports.forEach(function (importedSource) {
            triples.push({
                subject: graphUri,
                predicate: Config.sousLeSensVocablesGraphUri + "property#import",
                object: importedSource
            })
        })
            triples.push({
                subject: graphUri,
                predicate: "http://www.w3.org/2002/07/owl#versionIRI",
                object: graphUri
            })

            triples.push({
                    subject: graphUri,
                    predicate: "http://www.w3.org/2002/07/owl#versionInfo",
                    object: "Revised " + common.dateToRDFString(new Date())
                }
            )
            if(options.label) {
                triples.push({
                    subject: graphUri,
                    predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                    object: options.label
                })
            }

        return triples
    }


    return self;

})()