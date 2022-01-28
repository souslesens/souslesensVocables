Lineage_relations = (function () {

    var self = {}
    self.graphUriSourceMap = {}
    self.projectedGraphsMap = {}
    self.maxRelationToDraw=1000

    self.init = function () {
        var sources = []
        for (var source in Config.sources) {
            if (Config.sources[source].schemaType == "OWL")
                sources.push(source)
        }
        sources.sort()
        if (!sources || sources.length == 0)
            return;
        common.fillSelectOptions("LineageRelations_setExactMatchSameAsSourceSelect", sources, true)
        common.fillSelectOptions("LineageRelations_propertiesSelect", [], true)
        var statusList = ["candidate", " reference"]
        common.fillSelectOptions("LineageRelations_statusSelect", statusList, true)
        var provenances = ["manual", " auto_exactMatch"]
        common.fillSelectOptions("LineageRelations_provenanceSelect", provenances, true)
        Sparql_OWL.getObjectRestrictions(Lineage_common.currentSource, null, {
            withoutImports: 0,
            someValuesFrom: 1,
            listPropertiesOnly: 1
        }, function (err, result) {
            if (err)
                return alert(err)
            var x = result
            var props = [];
            result.forEach(function (item) {
                props.push({id: item.prop.value, label: item.propLabel.value})
            })
            props.sort(function(a,b){
                if(a.label>b.label)
                    return 1;
                if(a.label<b.label)
                    return -1;
                return 0
            })
            common.fillSelectOptions("LineageRelations_propertiesSelect", props, true, "label", "id")
            // self.initProjectedGraphs()
        })


    }


    self.listAllRestrictions = function () {

        Sparql_OWL.getObjectRestrictions(Lineage_common.currentSource, null, {}, function (err, result) {
            if (err)
                return alert(err)

        })
    }

    self.graphAllRestrictions = function () {

        Lineage_classes.drawRestrictions(Lineage_common.currentSource, "all")


    }

    self.exportRestrictions = function () {

    }
    self.getUriSource = function (uri) {
        var source = Lineage_common.currentSource
        Object.keys(self.graphUriSourceMap).forEach(function (graphUri) {

            if (uri.indexOf(graphUri) == 0) {
                source = self.graphUriSourceMap[graphUri]
            }
        })
       // console.log(uri + "_" + source)
        return source
    }

    self.getFromSourceSelection = function (callback) {
        var selectionMode = $("#LineageRelations_nodesSelectionSelect").val()
        var selectedNodes
        if (selectionMode == "selectedNodeDescendants") {
            var selectedNode = Lineage_classes.currentGraphNode
            if (!selectedNode)
                return callback("no node selected on graph")
            if (Config.sources[selectedNode.id]) {// selection of source in graph
                Lineage_classes.setCurrentSource(selectedNode.id)
                selectedNodes = null
                return callback(null,selectedNodes)

            }
           selectedNodes = [selectedNode.id]
            Sparql_generic.getNodeChildren(Lineage_common.currentSource, null, selectedNode.id, 3, null, function (err, result) {
                if (err)
                    callback(err)
                result.forEach(function (item) {
                    selectedNodes.push(item.child1.value)
                })
                return callback(null,selectedNodes)
            })

        } else {
            selectedNodes = null
            return callback(null,selectedNodes)
        }


    }
    self.getExistingRestrictions = function (currentSource, callback) {

        function formatResult(result) {
            restrictions=[]
            result.forEach(function (item) {
                var domain, range, domainLabel, rangeLabel, prop, propLabel, node, domainSourceLabel,
                    rangeSourceLabel
                if (item.concept)
                    domain = item.concept.value
                if (item.value)
                    range = item.value.value
                if (item.conceptLabel)
                    domainLabel = item.conceptLabel.value
                if (item.valueLabel)
                    rangeLabel = item.valueLabel.value
                if (item.prop)
                    prop = item.prop.value
                if (item.propLabel)
                    propLabel = item.propLabel.value
                if (item.node)
                    node = item.node.value
               /* if (item.g) {
                    domainSourceLabel = Sparql_common.getLabelFromURI(item.g.value)
                }*/
                if (item.domainSourceLabel) {
                    domainSourceLabel = item.domainSourceLabel.value
                }
                if (item.rangeSourceLabel) {
                    rangeSourceLabel = item.rangeSourceLabel.value
                }

                restrictions.push({

                    domain: domain,
                    domainLabel: domainLabel,
                    range: range,
                    rangeLabel: rangeLabel,
                    prop: prop,
                    propLabel: propLabel,
                    node: node,
                    rangeSourceLabel: rangeSourceLabel,
                    domainSourceLabel: domainSourceLabel

                })

                restrictions.sort(function(a,b){
                  return (a.propLabel>b.prop)
                })





            })
            return restrictions
        }




        var restrictions = []
        var filter = ""
        var propertyFilter = $("#LineageRelations_propertiesSelect").val()
        $("#LineageRelations_propertiesSelect").val("")
        if (propertyFilter && propertyFilter != "")
            filter += " filter (?prop=<" + propertyFilter + ">)"
        self.getFromSourceSelection(function (err, selectedNodes) {
            if (err)
                return callback(err)

            if(selectedNodes==null){
                Sparql_OWL.getObjectRestrictions(currentSource, null, {
                    withoutImports: 0,
                    someValuesFrom: 1,
                    filter: filter,
                    selectGraph:true

                }, function (err, result) {
                    if (err)
                        return callback(err)

                    restrictions=formatResult(result)
                    callback(null,restrictions)

                })

            }else {


                var slices = common.array.slice(selectedNodes, 200)
                async.eachSeries(slices, function (slice, callbackEach) {
                    Sparql_OWL.getObjectRestrictions(currentSource, slice, {
                        withoutImports: 0,
                        someValuesFrom: 1,
                        filter: filter,
                        selectGraph:true

                    }, function (err, result) {
                        if (err)
                            return callbackEach(err)
                        restrictions = restrictions.concat(formatResult(result))
                        callbackEach()

                    })


                }, function (err) {
                    callback(null, restrictions)
                })
            }
        })
    }



    self.showRestrictions = function (output, relations, toLabelsMap) {
        var currentSource = Lineage_common.currentSource
        var selectedNodes = null


        var graphUriSourceMap = {}
        async.series([
            //get nodes to map
            function (callbackSeries) {
                if (relations)
                    return callbackSeries()
                self.getExistingRestrictions(currentSource, function (err, restrictions) {
                    if(err)
                        return callbackSeries(err)
                    relations=restrictions
                    return callbackSeries()
                })
            },
             function (callbackSeries) {
            if(!relations || relations.length==0)
                return callbackSeries("no relations found")
            if(relations.length>self.maxRelationToDraw)
                return callbackSeries("Cannot draw : too many relations "+relations.length +" max "+self.maxRelationToDraw)
                    else
                return callbackSeries()
             }
,
            function (callbackSeries) {
                var sources
                sources = Config.sources[currentSource].imports
                if (!sources)
                    sources = []
                sources.push(currentSource)
                sources.forEach(function (source) {
                    if (Config.sources[source].schemaType == "OWL")
                        self.graphUriSourceMap[Config.sources[source].graphUri] = source
                })

                callbackSeries()
            },

            function (callbackSeries) {

                var existingNodes = visjsGraph.getExistingIdsMap()
                var jstreeData = [];
                var visjsData = {nodes: [], edges: []}
                var sameAsLevel = 1;
                if (relations && toLabelsMap && output == "visjs") {// get ancestors first if called by projectCurrrentSourceOnSource
                    visjsData = self.getRestrictionAncestorsVisjsData(relations, toLabelsMap, output)
                    visjsData.nodes.forEach(function (node) {
                        existingNodes[node.id] = 1
                    })
                    visjsData.edges.forEach(function (edge) {
                        existingNodes[edge.id] = 1
                    })
                    sameAsLevel = visjsData.maxLevel + 1;

                }


                var color;
                var shape = Lineage_classes.defaultShape;
                var size = Lineage_classes.defaultShapeSize


                relations.forEach(function (item) {

                    var prop;
                    if (item.propLabel)
                        prop = item.propLabel
                    else
                        prop = Sparql_common.getLabelFromURI(prop)

                    var domainSource, rangeSource
                    if (item.domainSourceLabel)
                        domainSource = item.domainSourceLabel
                    else
                        domainSource = self.getUriSource(item.domain)

                    if (item.rangeSourceLabel)
                        rangeSource = item.rangeSourceLabel
                    else
                        rangeSource = self.getUriSource(item.range)


                    if (!existingNodes[domainSource]) {
                        existingNodes[domainSource] = 1
                        if (output == "jstree") {
                            jstreeData.push({
                                id: domainSource,
                                text: domainSource,
                                parent: "#",


                            })
                        } else if (output == "visjs") {
                            ;

                        }

                    }
                    if (item.domain && !existingNodes[item.domain] && existingNodes[domainSource]) {
                        existingNodes[item.domain] = 1
                        if (output == "jstree") {
                            jstreeData.push({
                                id: item.domain,
                                text: item.domainLabel,
                                parent: domainSource,

                                data: {
                                    id: item.domain,
                                    text: item.domainLabel,
                                    source: domainSource,
                                }

                            })

                        } else if (output == "visjs") {
                            visjsData.nodes.push({
                                id: item.domain,
                                label: item.domainLabel,
                               shadow:Lineage_classes.nodeShadow, shape: shape,
                                size: size,
                                level: sameAsLevel,
                                color: Lineage_classes.getSourceColor(domainSource),
                                data: {
                                    id: item.domain,
                                    label: item.domainLabel,
                                    source: domainSource

                                }
                            })
                        }
                    }


                    if (output == "jstree") {
                        var nodeId = item.domain + "_" + prop + "_" + item.range
                        if (!existingNodes[nodeId]) {
                            existingNodes[nodeId] = 1
                            jstreeData.push({
                                id: nodeId,
                                text: prop + "_" + rangeSource + "." + item.rangeLabel,
                                parent: item.domain,
                                data: {
                                    id: nodeId,
                                    label: prop + "_" + rangeSource + "." + item.rangeLabel,
                                    source: rangeSource,
                                }
                            })
                        }
                    } else if (output == "visjs") {
                        if (!existingNodes[item.range]) {
                            existingNodes[item.range] = 1
                            visjsData.nodes.push({
                                id: item.range,
                                label: item.rangeLabel,
                               shadow:Lineage_classes.nodeShadow, shape: shape,
                                size: size,
                                level: sameAsLevel,
                                color: Lineage_classes.getSourceColor(rangeSource),
                                data: {
                                    id: item.range,
                                    label: item.rangeLabel,
                                    source: rangeSource

                                }
                            })
                        }
                        var propSource = Lineage_classes.mainSource
                        var edgeId = item.node
                        var edgeId = item.domain+"_"+item.prop+"_"+item.range
                        if (!existingNodes[edgeId]) {
                            existingNodes[edgeId] = 1
                            visjsData.edges.push({
                                id:edgeId,
                                from: item.range,
                                to: item.domain,
                                data: {id: item.node,propertyId: item.prop, source: propSource,  id:edgeId,
                                    from: item.range},
                                arrows: {
                                    from: {
                                        enabled: true,
                                        type: "bar",
                                        scaleFactor: 0.5
                                    },
                                    length: 30,
                                },

                                width:3,

                                label: "<i>" + prop + "</i>",
                                font: {multi: true, size: 10},

                                dashes: true,
                                color: Lineage_classes.restrictionColor
                            })


                        }
                    }


                    //********************************************


                })
                if (visjsGraph.data && visjsGraph.data.nodes) {
                    visjsGraph.data.nodes.update(visjsData.nodes)
                    visjsGraph.data.edges.update(visjsData.edges)
                } else {

                    var options = {layoutHierarchical: 1}
                    Lineage_classes.drawNewGraph(visjsData, options)
                }

                callbackSeries()
            },
            function (callbackSeries) {
                //  self.showRestrictionAncestors(relations, toLabelsMap, output)
                callbackSeries()
            }
        ], function (err) {
            if(err)
                return alert(err)
            MainController.UI.message("DONE", true)
        })


    }

    self.getRestrictionAncestorsVisjsData = function (restrictions, labelsMap, output) {

        var visjsData = {nodes: [], edges: []}
        var existingNodes = visjsGraph.getExistingIdsMap()

        var color;
        var shape = Lineage_classes.defaultShape;
        var size = Lineage_classes.defaultShapeSize

        var maxLevel = 1
        restrictions.forEach(function (restriction) {
            var parentsArray = restriction.parents.split("|")
            maxLevel = Math.max(maxLevel, parentsArray.length)

            var ancestorsSource = parentsArray[0]
            parentsArray.forEach(function (parentId, index) {
                if (parentId == "http://souslesens.org/workorder/maintenance_inspection/Maintenance_Details")
                    var x = 3

                if (output == "jstree") {
                    var nodeId = item.domain + "_" + prop + "_" + item.range
                    if (!existingNodes[nodeId]) {
                        existingNodes[nodeId] = 1
                        jstreeData.push({
                            id: nodeId,
                            text: prop + "_" + rangeSource + "." + item.rangeLabel,
                            parent: item.domain,
                            data: {
                                id: nodeId,
                                label: prop + "_" + rangeSource + "." + item.rangeLabel,
                                source: rangeSource,
                            }
                        })
                    }
                } else if (output == "visjs") {
                    if (!existingNodes[parentId]) {
                        existingNodes[parentId] = 1
                        if (index == 0) {//source Node
                            visjsData.nodes.push({
                                id: parentId,
                                label: parentId,
                               shadow:Lineage_classes.nodeShadow, shape: "box",
                                level: index,

                                color: Lineage_classes.getSourceColor(ancestorsSource),
                                data: {
                                    id: parentId,
                                    label: parentId,
                                    source: parentId

                                }
                            })
                        } else {

                            visjsData.nodes.push({
                                id: parentId,
                                label: labelsMap[parentId],
                               shadow:Lineage_classes.nodeShadow, shape: shape,
                                size: size,
                                level: index,
                                color: Lineage_classes.getSourceColor(restriction.rangeSourceLabel),
                                data: {
                                    id: parentId,
                                    label: labelsMap[parentId],
                                    source: restriction.rangeSourceLabel

                                }
                            })
                        }
                    }
                    if (index > 0) {
                        var fromId = parentsArray[index - 1]
                        var edgeId = parentId + "_" + fromId
                        if (!existingNodes[edgeId]) {
                            existingNodes[edgeId] = 1
                            visjsData.edges.push({
                                id: edgeId,
                                from: parentId,
                                to: fromId,

                            })


                        }
                    }
                }
            })

        })
        visjsData.maxLevel = maxLevel
        return visjsData;
    }

    self.graphAllProperties = function () {

        Lineage_classes.drawObjectProperties(Lineage_common.currentSource, "all")


    }

    self.exportProperties = function () {

    }


    self.projectSameAsRestrictionsOnSource = function (orphans) {
        if(orphans)
            return alert("Coming soon...")
        if (!$("#LineageRelations_setExactMatchSameAsSourceInitUIcBX").prop("checked"))
            Lineage_classes.initUI()
        var fromSource = Lineage_common.currentSource
        var toSource = $("#LineageRelations_setExactMatchSameAsSourceSelect").val()
        if (!fromSource)
            return alert("select a start source")
        if (!toSource || toSource == "")
            return alert("select a target source ")
        if (fromSource == toSource)
            return alert("the two sources are the same")
        var fromIndex = fromSource.toLowerCase()
        var toIndex = toSource.toLowerCase()


        var restrictions = []
        var fromClasses = []
        var toLabelsMap = {}
        var wordsMap = {}
        var fromNodesSelection = null
        async.series([
            function (callbackSeries) {

                self.getFromSourceSelection(function (err, result) {
                    if (err)
                        return callbackSeries(err)
                    fromNodesSelection = result;
                    callbackSeries()
                })

            }
            ,
            function (callbackSeries) {
                var resultSize = 1
                var size = 200;
                var from = offset;
                var offset = 0
                var totalProcessed = 0

                async.whilst(function (test) {
                    return resultSize > 0

                }, function (callbackWhilst) {
                    MainController.UI.message("searching labels in " + fromSource)
                    Standardizer.listSourceLabels(fromIndex, offset, size, null, function (err, hits) {
                        if (err)
                            return callbackWhilst(err)
                        resultSize = hits.length
                        totalProcessed += resultSize

                        offset += size

                        hits.forEach(function (hit) {
                            if (!fromNodesSelection || fromNodesSelection.indexOf(hit._source.id) > -1)
                                wordsMap[hit._source.label] = {
                                    id: hit._source.id,
                                    label: hit._source.label,
                                    matches: []
                                };
                        })


                        SearchUtil.getElasticSearchMatches(Object.keys(wordsMap), toIndex, "exactMatch", 0, size, function (err, result) {
                            if (err)
                                return alert(err)
                            var entities = []
                            Object.keys(wordsMap).forEach(function (word, index) {

                                if (!result[index] || !result[index].hits)
                                    return;
                                var hits = result[index].hits.hits

                                var sourceEntity = wordsMap[word]
                                hits.forEach(function (hit) {

                                    if (sourceEntity.id == hit._source.id)
                                        return;
                                    var entity = {
                                        domain: sourceEntity.id,
                                        domainLabel: sourceEntity.label,
                                        range: hit._source.id,
                                        rangeLabel: hit._source.label,
                                        prop: "http://www.w3.org/2002/07/owl#sameAs",
                                        propLabel: "sameAs",
                                        parents: hit._source.parents,
                                        node: "_:b" + common.getRandomHexaId(10),
                                        domainSourceLabel: fromSource,
                                        rangeSourceLabel: toSource,
                                    }
                                    entity.parents += hit._source.id

                                    restrictions.push(entity)
                                    MainController.UI.message("Matching labels in " + toSource + " : " + restrictions.length)
                                })


                            })
                            callbackWhilst()

                        })

                    })


                }, function (err) {

                    callbackSeries(err);
                })
            },
            // get target source labels and add them to restriction
            function (callbackSeries) {
                var resultSize = 1
                var size = 200;
                var from = offset;
                var offset = 0
                var totalProcessed = 0
                async.whilst(function (test) {
                        return resultSize > 0
                    },
                    function (callbackWhilst) {
                        MainController.UI.message("searching labels in " + toSource)
                        Standardizer.listSourceLabels(toIndex, offset, size, null, function (err, hits) {
                            if (err)
                                return callbackWhilst(err)
                            resultSize = hits.length
                            offset += size


                            hits.forEach(function (hit) {
                                toLabelsMap[hit._source.id] = hit._source.label

                            })


                            callbackWhilst()
                        })

                    }, function (err) {
                        callbackSeries(err)
                    })
            }
        ], function (err) {
            if (err)
                return alert(err);
            MainController.UI.message("Drawing Graph")
            self.projectedGraphData = restrictions
            self.showRestrictions("visjs", restrictions, toLabelsMap)
        })
    }

    self.saveProjectedGraph = function () {
        return alert("coming soon...")
        var version = prompt("graph version name")
        if (!version || version == "")
            return;
        var triples = [];
        var uniqueIds = {}
        var imports = []
        self.projectedGraphData.forEach(function (item) {

            var parentsArray = item.parents.split("|")


            parentsArray.forEach(function (parentId, index) {
                if (index == 0) {
                    if (!uniqueIds[parentId]) {
                        uniqueIds[parentId] = 1
                        imports.push(parentId)
                    }
                } else if (index == 1) {
                    ;

                } else {
                    var id = parentId + "_" + parentsArray[index - 1]
                    if (!uniqueIds[parentId]) {
                        triples = triples.concat(Lineage_blend.getSubClassTriples(parentId, parentsArray[index - 1]))

                    }

                }
            })
            // leafNode create restrictions sameAs
            var propId = "http://www.w3.org/2002/07/owl#sameAs"
            var id = item.range + "_" + propId + "_" + item.domain
            if (!uniqueIds[id]) {
                uniqueIds[id] = 1
                triples = triples.concat(Lineage_blend.getRestrictionTriples(item.range, item.domain, propId))
            }

        })


        var graphUri = Config.sources[Lineage_classes.mainSource].graphUri + "projected/" + version + "/";

        var graphMetaDataOptions = {label: "" + Lineage_classes.mainSource + " projected " + version, comment: ""}

        var graphMetaData = Lineage_blend.getProjectedGraphMetaDataTriples(graphUri, imports, graphMetaDataOptions)
        triples = triples.concat(graphMetaData)
        var commonMetaData = Lineage_blend.getCommonMetaDataTriples(graphUri, "exactMatch_projection", "draft")
        triples = triples.concat(commonMetaData)

        var insertTriplesStr = ""
        triples.forEach(function (item, index) {

            insertTriplesStr += Sparql_generic.triplesObjectToString(item);

        })

        var query = " WITH GRAPH  <" + graphUri + ">  " +
            "INSERT DATA" +
            "  {" +
            insertTriplesStr +
            "  }"


        // console.log(query)
        var url = Config.sources[Lineage_classes.mainSource].sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {source: Lineage_classes.mainSource}, function (err, result) {
            return MainController.UI.message("Project Graph saved", true);
        })
    }


    self.loadProjectedGraph = function (graphUri) {
        //   var graphUri= $("#LineageRelations_projectedGraphsSelect").val()
        var properties = self.projectedGraphs[graphUri]
        var query = " WITH GRAPH  <" + graphUri + ">  " +
            "INSERT DATA" +
            "  {" +
            insertTriplesStr +
            "  }"


        // console.log(query)
        var url = Config.sources[Lineage_classes.mainSource].sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {source: Lineage_classes.mainSource}, function (err, result) {

        })

    }


    return self;

})()