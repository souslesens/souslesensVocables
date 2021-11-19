Lineage_relations = (function () {

    var self = {}
    self.graphUriSourceMap = {}

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
        var source = "?"
        Object.keys(self.graphUriSourceMap).forEach(function (graphUri) {

            if (uri.indexOf(graphUri) == 0) {
                source = self.graphUriSourceMap[graphUri]
            }
        })
        console.log(uri+"_"+source)
        return source
    }

    self.showAllProperties = function (output) {
        var relations = []
        var ids = []
        var graphUriSourceMap = {}
        async.series([
            function (callbackSeries) {
                Sparql_OWL.getSourceAllObjectProperties(Lineage_classes.mainSource, null, function (err, result) {
                    if (err)
                        return callbackSeries(err)
                    relations = result.results.bindings
                    relations.forEach(function (item) {
                        if (item.domain)
                            ids.push(item.domain.value)
                        if (item.range)
                            ids.push(item.range.value)
                    })
                    callbackSeries()
                })
            },

            function (callbackSeries) {
            var sources
                sources= Config.sources[Lineage_classes.mainSource].imports
                if(!sources)
                sources=[]
                sources.push(Lineage_classes.mainSource)
                sources.forEach(function(source){
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

                        var prop = item.prop.value
                        prop = Sparql_common.getLabelFromId(prop)

                        var domainSource = self.getUriSource(item.domain.value)


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
                        if (item.domain && !existingNodes[item.domain.value] && existingNodes[domainSource]) {
                            existingNodes[item.domain.value] = 1
                            if (output == "jstree") {
                                jstreeData.push({
                                    id: item.domain.value,
                                    text: item.domainLabel.value,
                                    parent: domainSource,
                                    data: {
                                        id: item.domain.value,
                                        text: item.domainLabel.value,
                                        source: domainSource,
                                    }

                                })

                            } else if (output == "visjs") {
                                visjsData.nodes.push({
                                    id: item.domain.value,
                                    label: item.domainLabel.value,
                                    shape: shape,
                                    size: size,
                                    color: Lineage_classes.getSourceColor(domainSource),
                                    data: {
                                        id: item.domain.value,
                                        label: item.domainLabel.value,
                                        source: domainSource

                                    }
                                })
                            }
                        }


                            var rangeSource = self.getUriSource(item.range.value)


                            if (output == "jstree") {
                                var nodeId = item.domain.value + "_" + prop + "_" + item.range.value
                                if (!existingNodes[nodeId]) {
                                    existingNodes[nodeId] = 1
                                    jstreeData.push({
                                        id: nodeId,
                                        text: prop + "_" + rangeSource + "." + item.rangeLabel.value,
                                        parent: item.domain.value,
                                        data: {
                                            id: nodeId,
                                            label: prop + "_" + rangeSource + "." + item.rangeLabel.value,
                                            source: rangeSource,
                                        }
                                    })
                                }
                            } else if (output == "visjs") {
                                if (!existingNodes[item.range.value]) {
                                    existingNodes[item.range.value] = 1
                                    visjsData.nodes.push({
                                        id: item.range.value,
                                        label: item.rangeLabel.value,
                                        shape: shape,
                                        size: size,
                                        color: Lineage_classes.getSourceColor(rangeSource),
                                        data: {
                                            id: item.range.value,
                                            label: item.rangeLabel.value,
                                            source: rangeSource

                                        }
                                    })
                                }
                                var propSource = self.getUriSource(prop)
                                var edgeId = item.domain.value + "_" + prop + "_" + item.range.value
                                if (!existingNodes[edgeId]) {
                                    existingNodes[edgeId] = 1
                                    visjsData.edges.push({
                                        id: edgeId,
                                        from: item.range.value,
                                        to: item.domain.value,
                                        data: {propertyId: item.prop.value, source: propSource},
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


                    } )
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


    return self;
})()