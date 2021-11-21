Lineage_relations = (function () {

    var self = {}
    self.graphUriSourceMap = {}


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
        var provenance = ["manual", " auto_exactMatch"]
        common.fillSelectOptions("LineageRelations_provenanceSelect", provenance, true)
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
            common.fillSelectOptions("LineageRelations_propertiesSelect", props, true, "label", "id")

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
        var source = Lineage_classes.mainSource
        Object.keys(self.graphUriSourceMap).forEach(function (graphUri) {

            if (uri.indexOf(graphUri) == 0) {
                source = self.graphUriSourceMap[graphUri]
            }
        })
        console.log(uri + "_" + source)
        return source
    }

    self.showRestrictions = function (output, relations, toLabelsMap) {
        var currentSource = Lineage_common.currentSource
        var filter = ""
        var propertyFilter = $("#LineageRelations_propertiesSelect").val()
        if (propertyFilter && propertyFilter != "")
            filter += " filter (?prop=<" + propertyFilter + ">)"

        var graphUriSourceMap = {}
        async.series([
            function (callbackSeries) {
                if (relations)
                    return callbackSeries()
                else
                    relations = []

                Sparql_OWL.getObjectRestrictions(currentSource, null, {
                    withoutImports: 0,
                    someValuesFrom: 1,
                    filter: filter

                }, function (err, result) {
                    if (err)
                        return callbackSeries(err)
                    relations = []
                    result.forEach(function (item) {
                        var domain, range, domainLabel, rangeLabel, prop, propLabel, node, domainSourceLabel,
                            rangeSourceLabel
                        if (item.concept)
                            domain = item.concept.value
                        if (item.value)
                            range = item.value.value
                        if (item.conceptLabel)
                            domainLabel = item.conceptLabel
                        if (item.valueLabel)
                            rangeLabel = item.valueLabel.value
                        if (item.prop)
                            prop = item.prop.value
                        if (item.propLabel)
                            propLabel = item.propLabel.value
                        if (item.node)
                            node = item.node.value

                        if (item.domainSourceLabel) {
                            domainSourceLabel = item.domainSourceLabel.value
                        }
                        if (item.rangeSourceLabel) {
                            rangeSourceLabel = item.rangeSourceLabel.value
                        }

                        relations.push({

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
                    })

                    callbackSeries()
                })
            },

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
                var sameAsLevel =1;
                if (relations && toLabelsMap && output == "visjs") {// get ancestors first if called by projectCurrrentSourceOnSource
                    visjsData = self.getRestrictionAncestorsVisjsData(relations, toLabelsMap, output)
                    visjsData.nodes.forEach(function (node) {
                        existingNodes[node.id] = 1
                    })
                    visjsData.edges.forEach(function (edge) {
                        existingNodes[edge.id] = 1
                    })
                   sameAsLevel =visjsData.maxLevel+1;

                }



                var color;
                var shape = Lineage_classes.defaultShape;
                var size = Lineage_classes.defaultShapeSize


                relations.forEach(function (item) {

                    var prop;
                    if (item.propLabel)
                        prop = item.propLabel
                    else
                        prop = Sparql_common.getLabelFromId(prop)

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
                                shape: shape,
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
                                shape: shape,
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
                        if (!existingNodes[edgeId]) {
                            existingNodes[edgeId] = 1
                            visjsData.edges.push({
                                id: item.node,
                                from: item.range,
                                to: item.domain,
                                data: {propertyId: item.prop, source: propSource},
                                arrows: {
                                    from: {
                                        enabled: true,
                                        type: "bar",
                                        scaleFactor: 0.5
                                    },
                                },
                                label: "<i>" + prop + "</i>",
                                font: {multi: true, size: 10},

                                dashes: true,
                                color: Lineage_classes.objectPropertyColor
                            })


                        }
                    }


                    //********************************************


                })
                if (visjsGraph.data && visjsGraph.data.nodes) {
                    visjsGraph.data.nodes.update(visjsData.nodes)
                    visjsGraph.data.edges.update(visjsData.edges)
                } else {

                    var options={layoutHierarchical:1}
                    Lineage_classes.drawNewGraph(visjsData,options)
                }

                callbackSeries()
            },
            function (callbackSeries) {
                //  self.showRestrictionAncestors(relations, toLabelsMap, output)
                callbackSeries()
            }
        ], function (err) {
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
                                shape: "box",
                                level: index,

                                color: Lineage_classes.getSourceColor(parentId),
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
                                shape: shape,
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


    self.projectSameAsRestrictionsOnSource = function () {
        if(!$("#LineageRelations_setExactMatchSameAsSourceInitUIcBX").prop("checked"))
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
        async.series([
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
                    Standardizer.listSourceLabels(fromIndex, offset, size, function (err, hits) {
                        if (err)
                            return callbackWhilst(err)
                        resultSize = hits.length
                        totalProcessed += resultSize

                        offset += size

                        hits.forEach(function (hit) {
                            wordsMap[hit._source.label] = {id: hit._source.id, label: hit._source.label, matches: []};
                        })


                        Standardizer.getElasticSearchMatches(Object.keys(wordsMap), toIndex, "exactMatch", 0, size, function (err, result) {
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
                        Standardizer.listSourceLabels(toIndex, offset, size, function (err, hits) {
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
            self.showRestrictions("visjs", restrictions, toLabelsMap)
        })
    }


    return self;
})()