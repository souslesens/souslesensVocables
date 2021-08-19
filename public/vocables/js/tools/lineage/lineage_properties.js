/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */


Lineage_properties = (function () {
        var self = {}
        sourceColors = {}
        self.defaultShape = "triangle";
        self.defaultEdgeArrowType = "triangle"
        self.defaultShape = "dot";
        self.defaultShape = "square";
        self.defaultShapeSize = 8


        self.init = function () {
            self.graphInited = false
            Lineage_common.currentSource = MainController.currentSource
          

        }
        self.showPropInfos = function (event, obj) {
            var id = obj.node.id
            var html = JSON.stringify(self.properties[id])
            $("#graphDiv").html(html)
        }


        self.jstreeContextMenu = function () {

            var items = {
                nodeInfos: {
                    label: "Property infos",
                    action: function (e) {// pb avec source
                        MainController.UI.showNodeInfos(self.currentTreeNode.data.source, self.currentTreeNode.data.id, "mainDialogDiv")
                    }

                },

              /*  drawPredicateTriples: {
                    label: "Draw predicate triples",
                    action: function (e) {// pb avec source
                        setTimeout(function () {
                            self.drawPredicateTriples(self.currentTreeNode)
                        }, 200)
                    }

                }*/

            }
            if (MainController.currentTool == "lineage") {
                items.graphNode = {
                    label: "graph Node",
                    action: function (e) {// pb avec source

                        Lineage_classes.addArbitraryNodeToGraph(self.currentTreeNode.data)

                    }

                }
                items.drawRangesAndDomainsProperty= {
                    label: "Draw ranges and domains",
                        action: function (e) {// pb avec source
                        setTimeout(function () {
                            self.drawRangeAndDomainsGraph(self.currentTreeNode)
                        }, 200)
                    }

                }
                items.copyNodeToClipboard = {
                    label: "copy to Clipboard",
                    action: function (e) {// pb avec source

                        Lineage_common.copyNodeToClipboard(self.currentTreeNode.data)

                    }

                }

                if (!Lineage_common.currentSource || Config.sources[Lineage_common.currentSource].editable) {
                    items.pasteNodeFromClipboard = {
                        label: "paste from Clipboard",
                        action: function (e) {// pb avec source

                            Lineage_common.pasteNodeFromClipboard(self.currentTreeNode)

                        }

                    }
                    items.deleteProperty = {
                        label: "delete property",
                        action: function (e) {// pb avec source

                            Lineage_common.jstree.deleteNode(self.currentTreeNode, "Lineage_propertiesTree")

                        }

                    }
                 /*   items.editProperty = {
                        label: "edit property",
                        action: function (e) {// pb avec source

                            Lineage_properties.editProperty(self.currentTreeNode)

                        }

                    }*/
                }



            }


            return items;


        }
        self.onTreeNodeClick = function (event, obj) {
            self.currentTreeNode = obj.node
            self.openNode(obj.node);

        }

        self.openNode=function(node){
            var options={subPropIds:node.id}
            MainController.UI.message("searching in " + Lineage_common.currentSource)
            Sparql_OWL.getObjectProperties(Lineage_common.currentSource, null, options, function (err, result) {
                if(err)
                    return MainController.UI.message(err)
                var data = common.array.sort(common.array.distinctValues(result, "prop"), "propLabel");
                var distinctIds = {}
                var jstreeData = []
                data.forEach(function (item) {
                    if (!distinctIds[item.prop.value]) {
                        distinctIds[item.prop.value] = 1

                        var parent = Lineage_common.currentSource;
                        if (item.subProp)
                            parent = item.subProp.value;
                        jstreeData.push({
                            text: item.propLabel.value,
                            id: item.prop.value,
                            parent: parent,
                            data: {
                                label: item.propLabel.value,
                                id: item.prop.value,
                                parent: parent,
                                type: "http://www.w3.org/2002/07/owl#ObjectProperty",
                                source: Lineage_common.currentSource
                            }
                        })
                    }
                })
                common.jstree.addNodesToJstree("Lineage_propertiesTree",node.id, jstreeData )
                MainController.UI.message("",true)
            })

        }



        self.getPropertiesjsTreeData = function (source, ids, words, options, callback) {

            if (!options)
                options = {}
            if (words && words != "")
                options.filter = Sparql_common.setFilter("prop", null, words, {})
            else{
                options.inheritedProperties=1
            }
            Sparql_OWL.getObjectProperties(source, ids, options, function (err, result) {
                if (err)
                    return callback(err);
                var data = common.array.sort(common.array.distinctValues(result, "prop"), "propLabel");
                var distinctIds = {}
                var jstreeData = []
                data.forEach(function (item) {
                    if (!distinctIds[item.prop.value]) {
                        distinctIds[item.prop.value] = 1

                        var parent = source;
                        if (item.subProp)
                            parent = item.subProp.value;
                        jstreeData.push({
                            text: item.propLabel.value,
                            id: item.prop.value,
                            parent: parent,
                            data: {
                                label: item.propLabel.value,
                                id: item.prop.value,
                                parent: parent,
                                type: "http://www.w3.org/2002/07/owl#ObjectProperty",
                                source: source
                            }
                        })
                    }
                })
                callback(null, jstreeData)



            })
        }

        self.drawPredicateTriples = function (predicate) {

            if (!predicate)
                predicate = self.currentTreeNode
            if (!predicate)
                return alert("select a property first")
            var graphUri = Config.sources[Lineage_common.currentSource].graphUri;
            var sparql_url = Config.sources[Lineage_common.currentSource].sparql_server.url;
            var fromStr = Sparql_common.getFromStr(Lineage_common.currentSource)

            var query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
                "select * " + fromStr + " where {";


            query += " ?sub ?prop ?obj. filter (?prop in ( <" + predicate.data.id + ">)) ";

            query += "  Optional {?sub rdfs:label ?subLabel}  Optional {?obj rdfs:label ?objLabel} "
            query += "} limit 1000"
            var url = sparql_url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: Lineage_common.currentSource}, function (err, result) {
                if (err)
                    return MainController.UI.message(err);


                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["sub", "obj", "prop"])
                var data = result.results.bindings
                if (data.length == 0) {
                    $("#waitImg").css("display", "none");
                    MainController.UI.message("no dataFound")
                    return;
                }
                var color = Lineage_classes.getSourceColor(Lineage_common.currentSource)
                var visjsData = {nodes: [], edges: []}
                var existingIds = visjsGraph.getExistingIdsMap()


                data.forEach(function (item) {

                    if (!existingIds[item.sub.value]) {
                        existingIds[item.sub.value] = 1
                        var node = {
                            id: item.sub.value,
                            label: item.subLabel.value,
                            shape: Lineage_classes.defaultShape,
                            size: Lineage_classes.defaultShapeSize,
                            color: color,
                            font: {multi: true, size: 10},
                            data: {
                                source: Lineage_common.currentSource,
                                id: item.sub.value,
                                label: item.sub.value,
                            }
                        }

                        visjsData.nodes.push(node)
                    }

                    if (!existingIds[item.obj.value]) {
                        existingIds[item.obj.value] = 1
                        var node = {
                            id: item.obj.value,
                            label: item.objLabel.value,
                            shape: Lineage_classes.defaultShape,
                            size: Lineage_classes.defaultShapeSize,
                            color: color,
                            font: {multi: true, size: 10},
                            data: {
                                source: Lineage_common.currentSource,
                                id: item.obj.value,
                                label: item.obj.value,
                            }
                        }

                        visjsData.nodes.push(node)
                    }


                    var edgeId = item.sub.value + "_" + item.obj.value

                    var arrows = {
                        to: {
                            enabled: true,
                            type: Lineage_classes.defaultEdgeArrowType,
                            scaleFactor: 0.5
                        },
                    }


                    if (!existingIds[edgeId]) {
                        existingIds[edgeId] = 1
                        visjsData.edges.push({
                            id: edgeId,
                            from: item.sub.value,
                            to: item.obj.value,
                            arrows: arrows
                        })
                    }


                })


                if (visjsGraph.data && visjsGraph.data.nodes) {
                    visjsGraph.data.nodes.update(visjsData.nodes)
                    visjsGraph.data.edges.update(visjsData.edges)
                } else {
                    Lineage_classes.drawNewGraph(visjsData)
                }


            })

        }

        self.drawRangeAndDomainsGraph = function (property) {
            if (!property)
                property = self.currentTreeNode
            if (!property)
                return alert("select a property first")
            var source = Lineage_common.currentSource
            var propId = null
            if (property) {
                source = property.data.source
                propId = property.id
            }
            // Sparql_OWL.getObjectProperties(Lineage_common.currentSource, null, {propIds:[propId]}, function (err, result) {

            OwlSchema.initSourceSchema(source, function (err, schema) {
                if (err)
                    return MainController.UI.message(err);
                //  var options={filter:"Filter (NOT EXISTS{?property rdfs:subPropertyOf ?x})"}
                var options = {mandatoryDomain: 1}

                Sparql_schema.getPropertiesRangeAndDomain(schema, propId, null, {mandatoryDomain: 0}, function (err, result) {

                    if (err)
                        return MainController.UI.message(err);
                    var visjsData = {nodes: [], edges: []}
                    var existingNodes = {}
                    if (visjsGraph.data && visjsGraph.data.nodes)
                        existingNodes = visjsGraph.getExistingIdsMap()
                    var color = Lineage_classes.getSourceColor(Lineage_common.currentSource, "palette")

                    result.forEach(function (item) {


                        if (!existingNodes[item.property.value]) {
                            existingNodes[item.property.value] = 1
                            visjsData.nodes.push({
                                id: item.property.value,
                                label: item.propertyLabel.value,
                                data: {
                                    id: item.property.value,
                                    label: item.propertyLabel.value,
                                    subProperties: [],
                                    source: Lineage_common.currentSource

                                },
                                size: self.defaultShapeSize,
                                color: color,
                                shape: self.defaultShape
                            })
                        }

                        if (item.subProperty) {
                            var subProperty = item.subProperty.value
                            if (!existingNodes[subProperty]) {
                                existingNodes[subProperty] = 1
                                visjsData.nodes.push({
                                    id: subProperty,
                                    label: item.subPropertyLabel.value,
                                    data: {
                                        id: subProperty,
                                        label: item.subPropertyLabel.value,
                                        subProperties: [],
                                        source: Lineage_common.currentSource

                                    },
                                    size: self.defaultShapeSize,
                                    color: color,
                                    shape: self.defaultShape
                                })
                                var edgeId = item.property.value + "_" + subProperty
                                if (!existingNodes[edgeId]) {
                                    existingNodes[edgeId] = 1
                                    visjsData.edges.push({
                                        id: edgeId,
                                        from: item.property.value,
                                        to: subProperty,
                                        // label: "range"
                                        color: "brown",
                                        dashes: true,
                                        arrows: {
                                            from: {
                                                enabled: true,
                                                type: Lineage_classes.defaultEdgeArrowType,
                                                scaleFactor: 0.5
                                            },
                                        },
                                    })
                                }
                            }


                        }
                        if (item.range) {
                            if (!existingNodes[item.range.value]) {
                                var shape = "text"
                                if (item.rangeType) {
                                    if (item.rangeType.value.indexOf("Class") > -1)
                                        shape = Lineage_classes.defaultShape
                                    if (item.rangeType.value.indexOf("property") > -1)
                                        shape = self.defaultShape
                                }
                                existingNodes[item.range.value] = 1

                                visjsData.nodes.push({
                                    id: item.range.value,
                                    label: item.rangeLabel.value,
                                    data: {
                                        id: item.range.value,
                                        label: item.rangeLabel.value,
                                        source: Lineage_common.currentSource

                                    },
                                    size: self.defaultShapeSize,
                                    color: color,
                                    shape: shape
                                })
                            }
                            var edgeId = item.property.value + "_" + item.range.value
                            if (!existingNodes[edgeId]) {
                                existingNodes[edgeId] = 1
                                visjsData.edges.push({
                                    id: edgeId,
                                    from: item.property.value,
                                    to: item.range.value,
                                    // label: "range"
                                    color: "brown",
                                    dashes: true,
                                    arrows: {
                                        to: {
                                            enabled: true,
                                            type: Lineage_classes.defaultEdgeArrowType,
                                            scaleFactor: 0.5
                                        },
                                    },
                                })
                            }

                        }
                        if (item.domain) {
                            if (!existingNodes[item.domain.value]) {
                                existingNodes[item.domain.value] = 1
                                var shape = "text"
                                if (item.domainType) {
                                    if (item.domainType.value.indexOf("Class") > -1)
                                        shape = Lineage_classes.defaultShape
                                    if (item.domainType.value.indexOf("property") > -1)
                                        shape = self.defaultShape
                                }

                                visjsData.nodes.push({
                                    id: item.domain.value,
                                    label: item.domainLabel.value,
                                    data: {
                                        id: item.domain.value,
                                        label: item.domainLabel.value,
                                        source: Lineage_common.currentSource

                                    },
                                    color: color,
                                    size: self.defaultShapeSize,
                                    shape: shape
                                })
                            }
                            var edgeId = item.property.value + "_" + item.domain.value
                            if (!existingNodes[edgeId]) {
                                existingNodes[edgeId] = 1
                                visjsData.edges.push({
                                    id: edgeId,
                                    from: item.property.value,
                                    to: item.domain.value,
                                    // label: "domain",
                                    color: "green",
                                    dashes: true,
                                    arrows: {
                                        from: {
                                            enabled: true,
                                            type: Lineage_classes.defaultEdgeArrowType,
                                            scaleFactor: 0.5
                                        },
                                    },
                                })
                            }

                        }
                        if (item.range) {
                            if (!existingNodes[item.range.value]) {
                                var shape = "text"
                                if (item.rangeType) {
                                    if (item.rangeType.value.indexOf("Class") > -1)
                                        shape = Lineage_classes.defaultShape
                                    if (item.rangeType.value.indexOf("property") > -1)
                                        shape = self.propertiesLineage_classes.defaultShape
                                }
                                existingNodes[item.range.value] = 1

                                visjsData.nodes.push({
                                    id: item.range.value,
                                    label: item.rangeLabel.value,
                                    data: {
                                        id: item.range.value,
                                        label: item.rangeLabel.value,
                                        source: Lineage_common.currentSource

                                    },
                                    color: color,
                                    size: self.defaultShapeSize,
                                    shape: shape
                                })
                            }
                            var edgeId = item.property.value + "_" + item.range.value
                            if (!existingNodes[edgeId]) {
                                existingNodes[edgeId] = 1
                                visjsData.edges.push({
                                    id: edgeId,
                                    from: item.property.value,
                                    to: item.range.value,
                                    color: "brown",
                                    dashes: true,
                                    arrows: {
                                        to: {
                                            enabled: true,
                                            type: Lineage_classes.defaultEdgeArrowType,
                                            scaleFactor: 0.5
                                        },
                                    },
                                })
                            }

                        }


                    })


                    if (!visjsGraph.data || !visjsGraph.data.nodes) {
                        var options = {
                            onclickFn: Lineage_classes.graphActions.onNodeClick,
                            onRightClickFn: Lineage_classes.graphActions.showGraphPopupMenu,
                        }
                        visjsGraph.draw("graphDiv", visjsData, options)
                    } else {

                        visjsGraph.data.nodes.add(visjsData.nodes)
                        visjsGraph.data.edges.add(visjsData.edges)
                    }
                    visjsGraph.network.fit()
                    self.graphInited = true
                    /*  var html = JSON.stringify(self.properties[propertyId], null, 2)
                      $("#LineageProperties_propertyInfosDiv").html(html);*/
                })
            })
        }
        self.graphActions = {


            expandNode: function (node, point, event) {
                self.drawGraph(node)
            },
            showNodeInfos: function () {
                MainController.UI.showNodeInfos(self.currentGraphNode.data.source, self.currentGraphNode.id, "mainDialogDiv")
            }

        }
        self.searchAllSourcesTerm = function () {

            var term = $("#LineageProperties_searchAllSourcesTermInput").val()
            if (!term || term == "")
                term == null; // return

            var exactMatch = $("#LineageProperties_allExactMatchSearchCBX").prop("checked")
            var searchAllSources = $("#LineageProperties_searchInAllSources").prop("checked")
            var searchedSources = [];
            if (searchAllSources) {
                for (var sourceLabel in Config.sources) {
                    if (Config.sources[sourceLabel].schemaType == "OWL")
                        searchedSources.push(sourceLabel)
                }
            } else {
                if (!MainController.currentSource)
                    return alert("select a source or search in all source")
                searchedSources.push(MainController.currentSource)
            }
            var jstreeData = []
            var uniqueIds = {}

            async.eachSeries(searchedSources, function (sourceLabel, callbackEach) {
              //  setTimeout(function () {
                    MainController.UI.message("searching in " + sourceLabel)
              //  }, 100)


                self.getPropertiesjsTreeData(sourceLabel, null, term, {exactMatch: exactMatch}, function (err, result) {
                    if (err)
                        callbackEach(err);

                    result.forEach(function (item) {
                        if (!uniqueIds[item.id]) {
                            uniqueIds[item.id] = 1
                            //  item.parent = sourceLabel
                            jstreeData.push(item)

                        }
                    })

                    jstreeData.forEach(function (item) {
                        if (!uniqueIds[item.parent])
                            item.parent = sourceLabel
                    })
                    var text = "<span class='searched_conceptSource'>" + sourceLabel + "</span>"
                    jstreeData.push({id: sourceLabel, text: text, parent: "#", data: {source: sourceLabel}})


                    callbackEach()
                })
            }, function (err) {
                if(err)
                    MainController.UI.message(err,true)
                MainController.UI.message(jstreeData.length+" nodes found",true)
                var options = {selectTreeNodeFn: Lineage_properties.onTreeNodeClick, openAll: true}
                options.contextMenu = self.jstreeContextMenu()
                common.jstree.loadJsTree("Lineage_propertiesTree", jstreeData, options);



            })

        }


        return self;

    }
)
()


