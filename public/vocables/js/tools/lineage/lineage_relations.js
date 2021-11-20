Lineage_relations = (function () {

    var self = {}
    self.graphUriSourceMap = {}





    self.init=function(){
        Sparql_OWL.getObjectRestrictions(Lineage_common.currentSource, null, {withoutImports: 0,someValuesFrom:1,listProperties:1}, function (err, result) {
            if (err)
                return callbackSeries(err)
            relations = result

            callbackSeries()
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
        console.log(uri+"_"+source)
        return source
    }

    self.showRestrictions = function (output) {
        var currentSource=Lineage_common.currentSource
        var relations = []

        var graphUriSourceMap = {}
        async.series([
            function (callbackSeries) {
              //  Sparql_OWL.getSourceAllObjectProperties(currentSource, null, function (err, result) {
                Sparql_OWL.getObjectRestrictions(currentSource, null, {withoutImports: 0,someValuesFrom:1,listProperties:0}, function (err, result) {
                    if (err)
                        return callbackSeries(err)
                    relations = result

                    callbackSeries()
                })
            },

            function (callbackSeries) {
            var sources
                sources= Config.sources[currentSource].imports
                if(!sources)
                sources=[]
                sources.push(currentSource)
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

                        var domainSource = self.getUriSource(item.concept.value)


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
                        if (item.concept && !existingNodes[item.concept.value] && existingNodes[domainSource]) {
                            existingNodes[item.concept.value] = 1
                            if (output == "jstree") {
                                jstreeData.push({
                                    id: item.concept.value,
                                    text: item.conceptLabel.value,
                                    parent: domainSource,
                                    data: {
                                        id: item.concept.value,
                                        text: item.conceptLabel.value,
                                        source: domainSource,
                                    }

                                })

                            } else if (output == "visjs") {
                                visjsData.nodes.push({
                                    id: item.concept.value,
                                    label: item.conceptLabel.value,
                                    shape: shape,
                                    size: size,
                                    color: Lineage_classes.getSourceColor(domainSource),
                                    data: {
                                        id: item.concept.value,
                                        label: item.conceptLabel.value,
                                        source: domainSource

                                    }
                                })
                            }
                        }


                            var rangeSource = self.getUriSource(item.value.value)


                            if (output == "jstree") {
                                var nodeId = item.concept.value + "_" + prop + "_" + item.value.value
                                if (!existingNodes[nodeId]) {
                                    existingNodes[nodeId] = 1
                                    jstreeData.push({
                                        id: nodeId,
                                        text: prop + "_" + rangeSource + "." + item.valueLabel.value,
                                        parent: item.concept.value,
                                        data: {
                                            id: nodeId,
                                            label: prop + "_" + rangeSource + "." + item.valueLabel.value,
                                            source: rangeSource,
                                        }
                                    })
                                }
                            } else if (output == "visjs") {
                                if (!existingNodes[item.value.value]) {
                                    existingNodes[item.value.value] = 1
                                    visjsData.nodes.push({
                                        id: item.value.value,
                                        label: item.valueLabel.value,
                                        shape: shape,
                                        size: size,
                                        color: Lineage_classes.getSourceColor(rangeSource),
                                        data: {
                                            id: item.value.value,
                                            label: item.valueLabel.value,
                                            source: rangeSource

                                        }
                                    })
                                }
                                var propSource = Lineage_classes.mainSource
                                var edgeId = item.node.value
                                if (!existingNodes[edgeId]) {
                                    existingNodes[edgeId] = 1
                                    visjsData.edges.push({
                                        id: item.node.value,
                                        from: item.value.value,
                                        to: item.concept.value,
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