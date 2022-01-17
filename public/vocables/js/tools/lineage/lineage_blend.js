var Lineage_blend = (function () {


    var self = {}


    self.addNodeToAssociationNode = function (node, role, allowAddToGraphButton) {
        if (role == "source") {
            self.currentAssociation = [node.data, ""]
            $("#lineage_sourceNodeDiv").html("<span style='color:" + Lineage_classes.getSourceColor(node.data.source) + "'>" + node.data.source + "." + node.data.label + "</span>")
            $("#lineage_targetNodeDiv").html("")

        } else if (role == "target") {
            if (!self.currentAssociation)
                return
            self.currentAssociation[1] = node.data;
            $("#lineage_targetNodeDiv").html("<span style='color:" + Lineage_classes.getSourceColor(node.data.source) + "'>" + node.data.source + "." + node.data.label + "</span>")
        }
        if (authentication.currentUser.groupes.indexOf("admin") > -1 && Config.sources[Lineage_classes.mainSource].editable > -1) {
            if (self.currentAssociation && self.currentAssociation.length == 2 && self.currentAssociation[1]!=="") {
                $("#lineage_createRelationButtonsDiv").css('display', 'block')
                self.initAllowedPropertiesForRelation()
            } else if(self.currentAssociation &&   self.currentAssociation[0]!==""){
                $("#lineage_blendCreateSubClassButton").css("display","block")
            }else {
                $("#lineage_createRelationButtonsDiv").css('display', 'none')
                $("#lineage_blendCreateSubClassButton").css("display","none")
            }
        }


        /* $("#GenericTools_searchAllSourcesTermInput").val(node.data.label)
         $("#GenericTools_searchInAllSources").prop("checked", true)*/


        if (allowAddToGraphButton) {
            $("#lineage_blendToGraphButton").css("display", "block")

        } else {
            $("#lineage_blendToGraphButton").css("display", "none")
        }

    }


    self.clearAssociationNodes = function () {
        $("#lineage_sourceNodeDiv").html("")
        $("#lineage_targetNodeDiv").html("")
        self.currentAssociation = []
        $("#lineage_createRelationButtonsDiv").css('display', 'none')
    }

    self.manageImports = function (source, callback) {

        var imports = Config.sources[Lineage_classes.mainSource].imports.concat(Lineage_classes.mainSource);
        if (imports && imports.indexOf(source) > -1) {
            return callback()
        }
        if (!confirm("add  source " + source + " to imports of source " + Lineage_common.currentSource))
            return callback("stop");

        self.addImportToCurrentSource(Lineage_classes.mainSource, source, function (err, result) {
            Lineage_classes.registerSource(source);
            callback()
        })

    }

    self.createSubClass=function(){
        var sourceNode = self.currentAssociation[0];

        if(confirm("Create  for subclass of "+sourceNode.label )){

            SourceBrowser.addProperty("http://www.w3.org/2000/01/rdf-schema#subClassOf",sourceNode.id,sourceNode.source,true)



        }

    }

    self.createRelation = function (type, addImportToCurrentSource) {
        var sourceNode = self.currentAssociation[0]
        var targetNode = self.currentAssociation[1]
        if(!type)
            type=$("#lineage_createRelationPropertySelect").val()

        if (!sourceNode || !targetNode)
            return alert("select a source node and a target node ")

        if (sourceNode == targetNode)
            return "source node and target node must be distinct "

        if (!confirm("paste " + sourceNode.source + "." + sourceNode.label + "  as " + type + " " + targetNode.source + "." + targetNode.label + "?"))
            return;


        var createInverseRelation = $("#lineage_blendSameAsInverseCBX").prop("checked")


        if( type!="http://www.w3.org/2002/07/owl#sameAs")
            createInverseRelation=false;
        var propId = type;

        async.series([
            function (callbackSeries) {
                if (!addImportToCurrentSource)
                    return callbackSeries()
                self.manageImports(sourceNode.source, function (err, result) {
                    callbackSeries(err)
                })
            },
            function (callbackSeries) {
                if (!addImportToCurrentSource)
                    return callbackSeries()
                self.manageImports(targetNode.source, function (err, result) {
                    callbackSeries(err)
                })
            }

            , function (callbackSeries) {

                var relations = {type: type, sourceNode: sourceNode, targetNode: targetNode}
                self.createRelationTriples(relations, createInverseRelation, function (err, result) {
                    callbackSeries(err)
                })


            }


        ], function (err) {
            if (err)
                return alert(err);
            self.addRelationToGraph(propId)
            MainController.UI.message("relation added", true)
        })


    }


    self.createRelationTriples = function (relations, createInverseRelation, callback) {
        var allTriples = []
        if (!Array.isArray(relations))
            relations = [relations]
        relations.forEach(function (relation) {


               var  propId=relation.type

                var restrictionTriples = self.getRestrictionTriples(relation.sourceNode.id, relation.targetNode.id, propId)
                var normalBlankNode = restrictionTriples.blankNode
                var metadataOptions = {
                    domainSourceLabel: relation.sourceNode.source,
                    rangeSourceLabel: relation.targetNode.source,
                }
                var metaDataTriples = self.getCommonMetaDataTriples(normalBlankNode, "manual", "candidate", metadataOptions)
                restrictionTriples = restrictionTriples.concat(metaDataTriples)


                if (createInverseRelation) {
                    var restrictionTriplesInverse = self.getRestrictionTriples(relation.targetNode.id, relation.sourceNode.id, propId)
                    var inverseBlankNode = restrictionTriplesInverse.blankNode
                    restrictionTriples = restrictionTriples.concat(restrictionTriplesInverse)
                    var inverseMetadataOptions = {
                        domainSourceLabel: relation.targetNode.source,
                        rangeSourceLabel: relation.sourceNode.source,
                    }
                    var inverseMetaDataTriples = self.getCommonMetaDataTriples(inverseBlankNode, "manual", "candidate", inverseMetadataOptions)
                    restrictionTriples = restrictionTriples.concat(inverseMetaDataTriples)

                    restrictionTriples.push({
                        subject: normalBlankNode,
                        predicate: "http://www.w3.org/2002/07/owl#inverseOf",
                        object: inverseBlankNode
                    })
                    restrictionTriples.push({
                        subject: inverseBlankNode,
                        predicate: "http://www.w3.org/2002/07/owl#inverseOf",
                        object: normalBlankNode
                    })


                }

                allTriples = allTriples.concat(restrictionTriples)

        })


        Sparql_generic.insertTriples(Lineage_classes.mainSource, allTriples, null, function (err, result) {
            callback(err)

        })
    }


    self.deleteRestriction = function (restrictionNode) {
        if (confirm("delete selected restriction")) {
            var inverseRestriction = null;
            async.series([


                // delete restriction
                function (callbackSeries) {
                    Sparql_generic.deleteTriples(Lineage_classes.mainSource, restrictionNode.data.bNodeId, null, null, function (err, result) {
                        visjsGraph.data.edges.remove(restrictionNode.id)
                        callbackSeries()
                    })

                },
                function (callbackSeries) {
                    Sparql_generic.deleteTriples(Lineage_classes.mainSource, null, null, restrictionNode.data.bNodeId, function (err, result) {
                        visjsGraph.data.edges.remove(restrictionNode.id)
                        callbackSeries()
                    })

                },
                // search if inverse exists
                function (callbackSeries) {
                    Sparql_OWL.getInverseRestriction(Lineage_classes.mainSource, restrictionNode.data.id, function (err, result) {
                        if (err)
                            return callbackSeries(err)
                        if (result.length == 0)
                            return callbackSeries()
                        inverseRestriction = result[0].subject.value
                        callbackSeries()

                    })
                },
                // delete inverse restriction
                function (callbackSeries) {
                    if (!inverseRestriction)
                        return callbackSeries()
                    Sparql_generic.deleteTriples(Lineage_classes.mainSource, inverseRestriction, null, null, function (err, result) {
                        visjsGraph.data.edges.remove(inverseRestriction)
                        callbackSeries()
                    })

                },
                function (callbackSeries) {
                    if (!inverseRestriction)
                        return callbackSeries()
                    Sparql_generic.deleteTriples(Lineage_classes.mainSource, null, null, inverseRestriction, function (err, result) {
                        visjsGraph.data.edges.remove(inverseRestriction)
                        callbackSeries()
                    })

                },

            ], function (err) {
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


    self.importNodeInCurrentMainSource = function () {
        var node = self.currentAssociation[0]
        if (!node)
            return
        var existingNodes = visjsGraph.getExistingIdsMap()
        if (existingNodes[node.id])
            return alert("node " + node.label + " already exists in graph ")
        /* if(!confirm(" Import node "+node.label+" in source "+Lineage_classes.mainSource))
             return;*/
        self.manageImports(node.source, function (err, result) {
            if (err)
                return ""
            var toGraphUri = Config.sources[Lineage_classes.mainSource].graphUri
            Sparql_generic.copyNodes(node.source, toGraphUri, [node.id], null, function (err, result) {
                if (err)
                    return alert(err)
                visjsGraph.data.nodes.push({
                    id: node.id,
                    label: node.label,
                    color: Lineage_classes.getSourceColor(node.source),
                    shape: "square",
                    size: Lineage_classes.defaultShapeSize,
                    data: node
                })
                visjsGraph.focusOnNode(node.id)

            })

        })
    }

    self.getCommonMetaDataTriples = function (subjectUri, provenance, status, options) {
        var metaDataTriples = []
        if (!options)
            options = {}
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
                    predicate: Config.sousLeSensVocablesGraphUri + "property#" + key,
                    object: options[key]
                })

            }
        }

        return metaDataTriples

    }
    self.getProjectedGraphMetaDataTriples = function (graphUri, imports, options) {
        var triples = []
        if (!options)
            options = {}

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
        if (options.label) {
            triples.push({
                subject: graphUri,
                predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                object: options.label
            })
        }

        return triples
    }

    self.transformSameLabelsEdgesIntoSameAsRelations = function (callback) {
        var edges = visjsGraph.data.edges.get()
        var relations = [];
        var sameLabelEdgeIds = []
        edges.forEach(function (edge) {
            if (edge.data && edge.data.type == "sameLabel") {
                sameLabelEdgeIds.push(edge.id)
                relations.push({
                    type: "http://www.w3.org/2002/07/owl#sameAs",
                    sourceNode: {id: edge.data.from, source: edge.data.fromSource},
                    targetNode: {id: edge.data.to, source: edge.data.toSource}

                })
            }
        })
        if (relations.length > 0) {
            self.createRelationTriples(relations, true, function (err, result) {
                if (err)
                    return alert(err)
                visjsGraph.data.edges.remove(sameLabelEdgeIds);
                MainController.UI.message(relations.length + "  sameAs relations created", true)

            })


        }


    }


    self.createNode = function () {
        SourceBrowser.showNodeInfos(Lineage_classes.mainSource, null, 'mainDialogDiv', null, function (err, result) {

        })
    }


    self.initAllowedPropertiesForRelation = function () {
        var fromNode = self.currentAssociation[0]
        var toNode = self.currentAssociation[1]
        var distinctProperties={}
        var properties =[];
        Config.Lineage.basicObjectProperties.forEach(function(item){
            if(item.type=="ObjectProperty") {
                properties.push(item)
                distinctProperties[item.id]=1
            }
        })

     //   properties.splice(0, 0, {id: "http://www.w3.org/2002/07/owl#sameAs", label: "sameAs"})


        self.getAssociationAllowedProperties(fromNode, toNode, function (err, result) {

            if (err)
                return alert(err)


            result.forEach(function (item) {
               if(!distinctProperties[item.id]){
                   var prefix=''
                   if(item.p.value.indexOf("part14")>-1)
                       prefix="part14:"
                    properties.push({
                        id: item.p.value,
                        label: prefix+(item.pLabel ? item.pLabel.value : Sparql_common.getLabelFromURI(item.p.value))

                    })
                }

            })

            common.fillSelectOptions("lineage_createRelationPropertySelect", properties, false, "label", "id")
            /*
                    var words = [sourceNode.label, targetNode.label]
                    var indexes = [sourceNode.source.toLowerCase(), targetNode.source.toLowerCase()]
                    SearchUtil.getElasticSearchMatches(words, indexes, "exactMatch", 0, 10, function (err, result) {
                        if (err)
                            return alert(err);
                        var xx = result

                    })*/

        })
    }


    self.getAssociationAllowedProperties = function (fromNode, toNode,callback) {

        var topOntology = "TSF_TOP_ONTOLOGY"

        var query = "PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
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
            "   optional{ ?b owl:someValuesFrom ?toAncestor.  ?to rdfs:subClassOf+ ?toAncestor   filter( ?toAncestor!=owl:Thing  && ?to=<"+toNode.id+">)}\n" +
            "     optional{ ?b owl:someValuesFrom ?toAncestor.  filter( ?toAncestor=owl:Thing)}\n" +
            " filter(BOUND(?toAncestor))\n" +
            "   \n" +
            "  {SELECT ?fromAncestor   WHERE { ?from rdfs:subClassOf+ ?fromAncestor. filter (?from=<"+fromNode.id+"> )     }}}\n" +
            "  \n" +









        /*    "WHERE {?fromAncestor rdfs:subClassOf ?b. ?b owl:onProperty ?p.optional{?p rdfs:label ?pLabel} optional{?b owl:someValuesFrom ?toAncestor} " + //filter (regex(str(?p),\"http://standards.iso.org/iso/15926/part14/\",\"i\"))" +
            " {SELECT ?fromAncestor ?toAncestor ?from ?to" +
            "    WHERE { ?from rdfs:subClassOf+ ?fromAncestor. filter (str(?from)=\"" + fromNode.id + "\" )" +
            "        optional  { ?to rdfs:subClassOf+ ?toAncestor. filter (str(?to)=\"" + toNode.id + "\" )}" +
            "  }" +*/
            "} limit 1000"

        var sparql_url = Config.sources[topOntology].sparql_server.url;
        var url = sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: topOntology}, function (err, result) {
            if (err) {
                return callback(err)
            }
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["node", "concept"])



            return callback(null, result.results.bindings)

        })
    }


    return self;

})()