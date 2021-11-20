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

    self.showRestrictions = function (output, relations) {
        var currentSource = Lineage_common.currentSource


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

                }, function (err, result) {
                    if (err)
                        return callbackSeries(err)
                    relations = []
                    result.forEach(function (item) {
                        var domain, range, domainLabel, rangeLabel, prop, propLabel, node
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

                        relations.push({

                            domain: domain,
                            domainLabel: domainLabel,
                            range: range,
                            rangeLabel: rangeLabel,
                            prop: prop,
                            propLabel: propLabel,
                            node: node

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


                var jstreeData = [];
                var visjsData = {nodes: [], edges: []}
                var existingNodes = visjsGraph.getExistingIdsMap()

                var color;
                var shape = Lineage_classes.defaultShape;
                var size = Lineage_classes.defaultShapeSize


                relations.forEach(function (item) {

                    var prop;
                    if (item.propLabel)
                        prop = item.propLabel
                    else
                        prop = Sparql_common.getLabelFromId(prop)

                    var domainSource = self.getUriSource(item.domain)


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
                    if (item.concept && !existingNodes[item.domain] && existingNodes[domainSource]) {
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
                                color: Lineage_classes.getSourceColor(domainSource),
                                data: {
                                    id: item.domain,
                                    label: item.domainLabel,
                                    source: domainSource

                                }
                            })
                        }
                    }


                    var rangeSource = self.getUriSource(item.range)


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


                })
                if (visjsGraph.data && visjsGraph.data.nodes) {
                    visjsGraph.data.nodes.update(visjsData.nodes)
                    visjsGraph.data.edges.update(visjsData.edges)
                } else {

                    Lineage_classes.drawNewGraph(visjsData)
                }

                callbackSeries()
            }
        ], function (err) {

        })


    }

    self.graphAllProperties = function () {

        Lineage_classes.drawObjectProperties(Lineage_common.currentSource, "all")


    }

    self.exportProperties = function () {

    }


    self.showExactMatchSameAs = function () {
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
        var resultSize = 1
        var size = 200;
        var from = offset;
        var offset = 0
        var totalProcessed = 0

        var restrictions = []
        self.matrixWordsMap = {indexes: [toIndex], entities: []}

        self.currentWordsCount = 0
        var fromClasses = []

        var wordsMap = {}
        async.whilst(function (test) {
            return resultSize > 0

        }, function (callbackWhilst) {

            Standardizer.listSourceLabels(fromIndex, offset, size, function (err, hits) {
                if (err)
                    return callbackWhilst(err)
                resultSize = hits.length
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


                            var entity = {
                                domain: sourceEntity.id,
                                domainLabel: sourceEntity.label,
                                range: hit._source.id,
                                rangeLabel: hit._source.label,
                                prop: "http://www.w3.org/2002/07/owl#sameAs",
                                propLabel: "sameAs",
                                node: "_:b" + common.getRandomHexaId(10)
                            }

                            restrictions.push(entity)
                        })


                    })
                    callbackWhilst()

                })

            })
        }, function (err) {
            if (err)
                return alert(err);
            self.showRestrictions("visjs", restrictions)

        })
    }


    return self;
})()