Lineage_relations = (function () {

    var self = {}


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

    self.setAllProperties = function (output) {
        var relations = []
        var ids = []
        var labelsMap = {}
        var graphUriSourceMap = {}
        async.series([
            function (callbackSeries) {
                Sparql_OWL.getSourceAllObjectProperties(Lineage_common.currentSource, function (err, result) {
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

            // get graphUriSourceMap
            function (callbackSeries) {

                var imports = Config.sources[Lineage_classes.mainSource].imports
                if (!imports)
                    imports = []
                imports.push(Lineage_classes.mainSource)
                imports.forEach(function (item) {
                    var graphUri = Config.sources[item].graphUri;
                    if (graphUri)
                        graphUriSourceMap[graphUri] = item
                })


                callbackSeries()
            },
            //getLabels and Sources
            function (callbackSeries) {
                var filter = Sparql_common.setFilter("concept", ids)
                //   filter+=" filter (?p=rdf:type) "
                var options = {
                    filter: filter,
                    withoutImports: false,
                    selectGraph: true
                }
                Sparql_OWL.getItems(Lineage_common.currentSource, options, function (err, result) {
                    if (err)
                        callbackSeries(err)
                    result.forEach(function (item) {
                        labelsMap[item.concept.value] = {
                            label: item.conceptLabel.value,
                            source: graphUriSourceMap[item.g.value]
                        }

                    })
                    callbackSeries()

                })
            }

            ,
            function (callbackSeries) {


                var jstreeData = [];
                var visjsData = {nodes: [], edges: []}
                var uniqueNodes = {}

                var color;
                var shape = Lineage_classes.defaultShape;
                var size = Lineage_classes.defaultShapeSize


                relations.forEach(function (item) {

                    var prop = item.prop.value
                    prop = Sparql_common.getLabelFromId(prop)

                    var source = null;
                    if (item.domain && item.domain.value && labelsMap[item.domain.value])
                        source = labelsMap[item.domain.value].source
                    if (!source)
                        source = "?"

                    if (!uniqueNodes[source]) {
                        uniqueNodes[source] = 1
                        if (output == "jstree") {
                            jstreeData.push({
                                id: source,
                                text: source,
                                parent: "#",

                            })
                        } else if (output == "visjs") {
                            ;

                        }

                    }
                    if (item.domain && labelsMap[item.domain.value] && !uniqueNodes[item.domain.value] && uniqueNodes[source]) {
                        uniqueNodes[item.domain.value] = 1
                        if (output == "jstree") {
                            jstreeData.push({
                                id: item.domain.value,
                                text: labelsMap[item.domain.value].label,
                                parent: source,
                                data: {
                                    id: item.domain.value,
                                    text: labelsMap[item.domain.value].label,
                                    source: labelsMap[item.domain.value].source,
                                }

                            })

                        } else if (output == "visjs") {
                            visjsData.nodes.push({
                                id: item.domain.value,
                                label: labelsMap[item.domain.value].label,
                                shape: shape,
                                size: size,
                                color: Lineage_classes.getSourceColor(labelsMap[item.domain.value].source),
                                data: {
                                    id: item.domain.value,
                                    label: labelsMap[item.domain.value].label,
                                    source: labelsMap[item.domain.value].source

                                }
                            })
                        }

                        var nodeId = item.domain.value + "_" + prop + "_" + item.range.value
                        if (item.range && labelsMap[item.range.value] && prop && !uniqueNodes[nodeId]) {
                            uniqueNodes[nodeId] = 1
                            if (output == "jstree") {
                                jstreeData.push({
                                    id: nodeId,
                                    text: prop + "_" +  labelsMap[item.range.value].source+"."+labelsMap[item.range.value].label,
                                    parent: item.domain.value,
                                    data: {
                                        id: nodeId,
                                        label: labelsMap[item.range.value].label,
                                        source: labelsMap[item.range.value].source,
                                    }
                                })
                            } else if (output == "visjs") {
                                if (!uniqueNodes[item.range.value]) {
                                    uniqueNodes[item.range.value] = 1
                                    visjsData.nodes.push({
                                        id: item.range.value,
                                        label:labelsMap[item.range.value].label,
                                        shape: shape,
                                        size: size,
                                        color: Lineage_classes.getSourceColor(labelsMap[item.range.value].source),
                                        data: {
                                            id: item.range.value,
                                            label: labelsMap[item.range.value].label,
                                            source: labelsMap[item.range.value].source

                                        }
                                    })
                                }

                                visjsData.edges.push({
                                    id: nodeId,
                                    from: item.range.value,
                                    to: item.domain.value,
                                    data: {propertyId: item.prop.value, source: source},
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


                            } else {
                                if (output == "jstree") {
                                    jstreeData.push({
                                        id: item.domain.value + "_" + prop,
                                        text: prop,
                                        parent: item.domain.value,
                                        data: {
                                            id: item.domain.value + "_" + prop,
                                            text: prop,
                                            source: labelsMap[item.domain.value].source,
                                        }
                                    })
                                } else if (output == "visjs") {
                                    return
                                    visjsData.nodes.push({
                                        id: "?_" + item.domain.value + "_" + prop,
                                        label: "any",
                                        shape: shape,
                                        size: size,
                                        color: Lineage_classes.getSourceColor(labelsMap[item.range.value].source),
                                        data: {
                                            id: "?_" + item.domain.value + "_" + prop,
                                            label: "any",
                                            source: labelsMap[item.domain.value].source

                                        }
                                    })
                                }

                            }
                        }
                    }
                })
                if (output == "jstree") {
                    common.jstree.loadJsTree("Lineage_relationsTree", jstreeData)
                } else if (output == "visjs") {
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