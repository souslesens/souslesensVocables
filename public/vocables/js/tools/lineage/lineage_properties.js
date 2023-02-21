/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

Lineage_properties = (function () {
    var self = {};
    sourceColors = {};
    self.defaultShape = "triangle";
    self.defaultEdgeArrowType = "triangle";
    self.defaultShape = "dot";
    self.defaultShape = "text";
    self.defaultShapeSize = 8;

    self.init = function () {
        self.graphInited = false;
    };
    self.showPropInfos = function (_event, obj) {
        var id = obj.node.id;
        var html = JSON.stringify(self.properties[id]);
        $("#graphDiv").html(html);
    };

    self.jstreeContextMenu = function () {
        var items = {
            nodeInfos: {
                label: "Property infos",
                action: function (_e) {
                    // pb avec source

                    SourceBrowser.showNodeInfos(self.currentTreeNode.data.source, self.currentTreeNode, "mainDialogDiv", { resetVisited: 1 }, function (_err, _result) {
                        // pass
                    });
                },
            },
        };
        if (MainController.currentTool == "lineage") {
            /* items.drawRangesAndDomainsProperty = {
label: "Draw ranges and domains",
action: function (_e) {
  // pb avec source
  setTimeout(function () {
      self.drawRangeAndDomainsGraph(self.currentTreeNode);
  }, 200);
},
};*/
            items.copyNodeToClipboard = {
                label: "copy to Clipboard",
                action: function (_e) {
                    // pb avec source

                    Lineage_common.copyNodeToClipboard(self.currentTreeNode.data);
                },
            };

            if (!Lineage_sources.activeSource || Config.sources[Lineage_sources.activeSource].editable) {
                items.pasteNodeFromClipboard = {
                    label: "paste from Clipboard",
                    action: function (_e) {
                        // pb avec source

                        Lineage_common.pasteNodeFromClipboard(self.currentTreeNode);
                    },
                };
                items.deleteProperty = {
                    label: "delete property",
                    action: function (_e) {
                        // pb avec source

                        Lineage_common.jstree.deleteNode(self.currentTreeNode, "Lineage_propertiesTree");
                    },
                };
            }
        }

        return items;
    };
    self.onTreeNodeClick = function (_event, obj) {
        if (!obj || !obj.node) {
            return;
        }
        self.currentTreeNode = obj.node;
        if (obj.node.children && obj.node.children.length > 0) {
            return;
        }
        self.openNode(obj.node);
    };

    self.openNode = function (node) {
        var options = { subPropIds: node.data.id };
        MainController.UI.message("searching in " + node.data.source);
        // @ts-ignore
        Sparql_OWL.getObjectPropertiesDomainAndRange(node.data.source, null, options, function (err, result) {
            if (err) {
                return MainController.UI.message(err);
            }
            var data = common.array.sort(common.array.distinctValues(result, "prop"), "propLabel");
            var distinctIds = {};
            var jstreeData = [];
            data.forEach(function (item) {
                if (!distinctIds[item.prop.value]) {
                    distinctIds[item.prop.value] = 1;

                    var parent = node.data.source;
                    if (item.subProp) {
                        parent = item.subProp.value;
                    }
                    jstreeData.push({
                        text: item.propLabel.value,
                        id: item.prop.value,
                        parent: parent,
                        data: {
                            label: item.propLabel.value,
                            id: item.prop.value,
                            parent: parent,
                            type: "http://www.w3.org/2002/07/owl#ObjectProperty",
                            source: node.data.source,
                        },
                    });
                }
            });
            common.jstree.addNodesToJstree("Lineage_propertiesTree", node.id, jstreeData);
            MainController.UI.message("", true);
        });
    };

    /**
     *
     *  generate jstree data with ObjectProperties
     *
     * @param source
     * @param ids
     * @param words
     * @param options
     *  - searchType:filters properties on words  present in  predicate or subject or object label
     * @param callback
     */
    self.getPropertiesjsTreeData = function (source, ids, words, options, callback) {
        if (!options) {
            options = {};
        }
        if (words) {
            options.words = words;
        }
        options.whitoutImports = true;
        var distinctIds = {};
        var jstreeData = [];
        async.series(
            [
                function (callbackSeries) {
                    Sparql_OWL.getObjectPropertiesDomainAndRange(source, ids, options, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        var data = common.array.sort(common.array.distinctValues(result, "prop"), "propLabel");

                        data.forEach(function (item) {
                            if (!distinctIds[item.prop.value]) {
                                distinctIds[item.prop.value] = 1;

                                var parent = source;
                                if (item.subProp) {
                                    parent = item.subProp.value;
                                }
                                jstreeData.push({
                                    text: item.propLabel.value,
                                    id: item.prop.value,
                                    parent: parent,
                                    data: {
                                        label: item.propLabel.value,
                                        id: item.prop.value,
                                        parent: parent,
                                        type: "http://www.w3.org/2002/07/owl#ObjectProperty",
                                        source: source,
                                    },
                                });
                            }
                        });
                        callbackSeries(null);
                    });
                },

                function (callbackSeries) {
                    options = { distinct: "?prop ?Label" };
                    Sparql_OWL.getFilteredTriples(source, null, null, null, options, function (err, result) {
                        if (err) {
                            return callback(err);
                        }

                        result.forEach(function (item) {
                            if (!distinctIds[item.prop.value]) {
                                distinctIds[item.prop.value] = 1;

                                var parent = source;
                                jstreeData.push({
                                    text: item.propLabel.value,
                                    id: item.prop.value,
                                    parent: parent,
                                    data: {
                                        label: item.propLabel.value,
                                        id: item.prop.value,
                                        parent: parent,
                                        type: "http://www.w3.org/2002/07/owl#Property",
                                        source: source,
                                    },
                                });
                            }
                        });
                        callbackSeries(null);
                    });
                },
            ],
            function (err) {
                callback(null, jstreeData);
            }
        );
    };

    /**
     *
     * draws subject propert object graph
     *
     *
     *
     * @param source
     * @param nodes
     * @param nodeData
     */
    self.drawPredicatesGraph = function (source, nodeIds, properties, options, callback) {
        if (nodeIds && !Array.isArray(nodeIds)) {
            nodeIds = [nodeIds];
        }
        if (properties && !Array.isArray(properties)) {
            properties = [properties];
        }
        var filter = "";
        if ((!properties || properties.length == 0) && !options.filter) {
            filter = " FILTER( ?prop not in(rdf:type, rdfs:subClassOf,rdfs:member))";
        }
        if (!options) {
            options = {};
        }
        var subjectIds, objectIds;

        if (options.inversePredicate) {
            subjectIds = null;
            objectIds = nodeIds;
        } else {
            subjectIds = nodeIds;
            objectIds = null;
        }

        options.filter = (options.filter || "") + " " + filter;






        Sparql_OWL.getFilteredTriples(source, subjectIds, properties, objectIds, options, function (err, result) {
            if (err) {
                return callback(err);
            }
            result = Lineage_classes.truncateResultToVisGraphLimit(result);
            Sparql_common.setSparqlResultPropertiesLabels(source, result, "prop", function (err, result2) {
                if (err) {
                    return callback(err);
                }

                var visjsData = { nodes: [], edges: [] };
                var existingNodes = visjsGraph.getExistingIdsMap();
                var color = Lineage_classes.getSourceColor(source);

                result2.forEach(function (item) {
                    if (!existingNodes[item.subject.value]) {
                        existingNodes[item.subject.value] = 1;

                        var shape = Lineage_classes.defaultShape;

                        var type =item.subjectType? item.subjectType.value:"?";
                        if (type.indexOf("NamedIndividual") > -1) {
                            shape = Lineage_classes.namedIndividualShape;
                        }

                        if(Config.Lineage.logicalOperatorsMap[item.prop.value]){
                            label=Config.Lineage.logicalOperatorsMap[item.prop.value]
                            shape="hegagon"
                            color="#EEE"

                        }
                        visjsData.nodes.push({
                            id: item.subject.value,
                            label: item.subjectLabel.value,
                            shape: shape,
                            size: Lineage_classes.defaultShapeSize,
                            color: color,
                            data: {
                                source: source,
                                id: item.subject.value,
                                label: item.subjectLabel.value,
                            },
                        });
                    }
                    if (!existingNodes[item.object.value]) {
                        existingNodes[item.object.value] = 1;

                        var shape = Lineage_classes.defaultShape;

                        var type =item.objectType? item.objectType.value:"?";

                        if (type.indexOf("NamedIndividual") > -1) {
                            shape = Lineage_classes.namedIndividualShape;
                        }
                        var label=item.objectLabel.value

                        if(Config.Lineage.logicalOperatorsMap[item.prop.value]){
                           label=Config.Lineage.logicalOperatorsMap[item.prop.value]
                            shape="hegagon"
                            color="#EEE"

                            }


                        visjsData.nodes.push({
                            id: item.object.value,
                            label: label,
                            shape: shape,
                            size: Lineage_classes.defaultShapeSize,
                            color: color,
                            data: {
                                source: source,
                                id: item.object.value,
                                label: item.objectLabel.value,
                            },
                        });
                    }
                    var edgeId = item.subject.value + "_" + item.prop.value + "_" + item.object.value;
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1;

                        //specific case of equivalentClass and sameAs
                        {
                            var nodeSource = source;
                            var prop = item.prop.value;
                            if (options.includeSources && options.includeSources.length > 0 &&
                              (prop == "http://www.w3.org/2002/07/owl#sameAs" ||
                                prop == "http://www.w3.org/2002/07/owl#equivalentClass")){
                                nodeSource = options.includeSources[0];
                            }
                        }

                        visjsData.edges.push({
                            id: edgeId,
                            from: item.subject.value,
                            to: item.object.value,
                            data: {
                                id: edgeId,
                                type: "ObjectProperty",
                                propLabel: item.propLabel.value,
                                from: item.subject.value,
                                to: item.object.value,
                                prop: item.prop.value,
                                source: nodeSource,
                            },
                            label: item.propLabel.value,
                            font: { color: Lineage_classes.defaultPredicateEdgeColor },
                            arrows: {
                                to: {
                                    enabled: true,
                                    type: "solid",
                                    scaleFactor: 0.5,
                                },
                            },
                            dashes: [3, 3],
                            color: Lineage_classes.defaultPredicateEdgeColor,
                        });
                    }
                });
                if (visjsGraph.isGraphNotEmpty()) {
                    visjsGraph.data.nodes.add(visjsData.nodes);
                    visjsGraph.data.edges.add(visjsData.edges);
                } else {
                    Lineage_classes.drawNewGraph(visjsData);
                }

                $("#waitImg").css("display", "none");
                if (callback) {
                    return callback(null, visjsData);
                }
            });
        });
    };

    self.drawObjectPropertiesRestrictions = function (source, nodeIds, properties) {
        var options = {};

        if (nodeIds && nodeIds.length > 0) {
            options.filter = Sparql_common.setFilter("sourceClass", nodeIds);
        }

        Sparql_OWL.getPropertiesRestrictionsDescription(source, properties, options, function (err, result) {
            if (err) {
                alert(err.responseText);
                return MainController.UI.message(err.responseText, true);
            }
            var visjsData = { nodes: [], edges: [] };

            var existingNodes = visjsGraph.getExistingIdsMap();
            var isNewGraph = true;
            if (Object.keys(existingNodes).length > 0) {
                isNewGraph = false;
            }

            var color = Lineage_classes.getSourceColor(source);
            //  console.log(JSON.stringify(result, null, 2))
            result.forEach(function (item) {
                if (true && !existingNodes[item.prop.value]) {
                    existingNodes[item.prop.value] = 1;
                    visjsData.nodes.push({
                        id: item.prop.value,
                        label: item.propLabel.value,
                        shape: "ellipse",
                        size: Lineage_classes.defaultShapeSize,
                        color: "#fdbf01",
                        data: {
                            source: source,
                            id: item.prop.value,
                            label: item.propLabel.value,
                            varName: "prop",
                        },
                    });
                }

                if (!existingNodes[item.restriction.value]) {
                    existingNodes[item.restriction.value] = 1;
                    visjsData.nodes.push({
                        id: item.restriction.value,
                        label: item.sourceClassLabel.value + (item.targetClassLabel ? " -> " + item.targetClassLabel.value : " -> any"),
                        shape: "box",
                        font: { background: "#ddd" },
                        //  size: Lineage_classes.defaultShapeSize,
                        // color: color,
                        data: {
                            source: source,
                            id: item.sourceClass.value,
                            label: item.sourceClassLabel.value,
                            varName: "value",
                        },
                    });
                    edgeId = item.prop.value + "_" + item.restriction.value;
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1;

                        visjsData.edges.push({
                            id: edgeId,
                            from: item.prop.value,
                            to: item.restriction.value,
                            data: { restrictionId: item.restriction.value, propertyId: item.prop.value, source: source },

                            arrows: {
                                to: {
                                    enabled: true,
                                    type: "solid",
                                    scaleFactor: 0.5,
                                },
                            },
                            dashes: true,
                            color: Lineage_classes.restrictionColor,
                        });
                    }
                }
                if (false && item.sourceClass && item.targetClass) {
                    edgeId = item.sourceClass.value + "_" + item.targetClass.value;
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1;

                        visjsData.edges.push({
                            id: edgeId,
                            label: item.propLabel.value,
                            from: item.sourceClass.value,
                            to: item.targetClass.value,
                            data: { restrictionId: item.restriction.value, propertyId: item.prop.value, source: source },

                            arrows: {
                                to: {
                                    enabled: true,
                                    type: "solid",
                                    scaleFactor: 0.5,
                                },
                            },
                            dashes: true,
                            color: Lineage_classes.restrictionColor,
                        });
                    }
                }
            });
            if (!isNewGraph) {
                visjsGraph.data.nodes.add(visjsData.nodes);
                visjsGraph.data.edges.add(visjsData.edges);
            } else {
                Lineage_classes.drawNewGraph(visjsData);
            }
            visjsGraph.network.fit();
            $("#waitImg").css("display", "none");
        });
    };

    self.exportRangeAndDomainsGraph = function (property) {
        var source = Lineage_sources.activeSource;
        var targetnodes = null;
        var nodesSelection = $("#LineagePropertie_nodesSelectionSelect").val();
        nodesSelection = false;
        if (visjsGraph.data && visjsGraph.data.nodes && nodesSelection == "currentGraphNodes") {
            targetnodes = visjsGraph.data.nodes.getIds();
        }
        self.getPropertiesRangeAndDomain(source, property, function (err, result) {
            if (err) {
                return alert(err.responseText);
            }
            var strAll = "domainLabel\tsubPropertyLabel\tpropertyLabel\trangeLabel\tinversePropertyURI\t--\tdomainURI\tsubPropertyURI\tpropertyURI\trangeURI\tinversePropertyURI\n";

            var uniqueLines = {};

            result.forEach(function (item) {
                var ok = 0;
                if (targetnodes) {
                    if (item.range && targetnodes.indexOf(item.range.value) > -1) {
                        ok = 1;
                    } else if (item.domain && targetnodes.indexOf(item.domain.value) > -1) {
                        ok = 1;
                    }

                    if (!ok) {
                        return;
                    }
                }
                var str = "";
                str += (item.domainLabel ? item.domainLabel.value : "") + "\t";
                str += (item.subPropertyLabel ? item.subPropertyLabel.value : "") + "\t";
                str += (item.propertyLabel ? item.propertyLabel.value : "") + "\t";
                str += (item.rangeLabel ? item.rangeLabel.value : "") + "\t";
                str += (item.inversePropertyLabel ? item.inversePropertyLabel.value : "") + "\t";
                str += "" + "\t";
                str += (item.domain ? item.domain.value : "") + "\t";
                str += (item.subProperty ? item.subProperty.value : "") + "\t";
                str += (item.property ? item.property.value : "") + "\t";
                str += (item.inverseProperty ? item.inverseProperty.value : "") + "\t";
                str += item.range ? item.range.value : "";

                // needs to remove duplicates why ??
                if (!uniqueLines[str]) {
                    uniqueLines[str] = 1;
                    strAll += str + "\n";
                }
            });

            common.copyTextToClipboard(strAll);
        });
    };
    /**
     *
     * draws  graph of properties ranges and domains depending on
     *    $("#LineagePropertie_nodesSelectionSelect").val()  to filter the drawned objects
     *    the property to filter the query
     *
     * @param property : a specific property uri or null (all)
     */
    self.drawRangeAndDomainsGraph = function (source, targetnodes, property) {
        self.getPropertiesRangeAndDomain(source, property, function (err, result) {
            if (err) {
                return alert(err.responseText);
            }
            var visjsData = { nodes: [], edges: [] };
            var existingNodes = {};
            if (visjsGraph.data && visjsGraph.data.nodes) {
                existingNodes = visjsGraph.getExistingIdsMap();
            }
            var color = Lineage_classes.getSourceColor(Lineage_sources.activeSource);

            var classShape = "dot";
            var propColor = "#ddd";
            var propShape = "box";

            result.forEach(function (item) {
                var ok = 0;
                if (!item.property || !item.property.value) {
                    return;
                }
                if (targetnodes) {
                    if (item.range && targetnodes.indexOf(item.range.value) > -1) {
                        ok = 1;
                    } else if (item.domain && targetnodes.indexOf(item.domain.value) > -1) {
                        ok = 1;
                    }

                    if (!ok) {
                        return;
                    }
                }
                if (item.property.value.indexOf("#type") > -1 && item.property.value.indexOf("#label") > -1) {
                    return;
                }

                if (!existingNodes[item.property.value]) {
                    let label = item.propertyLabel ? item.propertyLabel.value : Sparql_common.getLabelFromURI(item.property.value);
                    existingNodes[item.property.value] = 1;
                    visjsData.nodes.push({
                        id: item.property.value,
                        label: label,
                        data: {
                            id: item.property.value,
                            label: label,
                            subProperties: [],
                            source: Lineage_sources.activeSource,
                        },
                        size: self.defaultShapeSize,
                        color: propColor,
                        shape: propShape,
                        font: { color: "blue", size: 12 },
                    });
                }
                if (item.subProperties) {
                    item.subProperties.forEach(function (subProperty) {
                        if (!existingNodes[subProperty.id]) {
                            existingNodes[subProperty.id] = 1;
                            visjsData.nodes.push({
                                id: subProperty.id,
                                label: subProperty.label,
                                data: {
                                    id: subProperty.id,
                                    label: subProperty.label,
                                    subProperties: [],
                                    source: Lineage_sources.activeSource,
                                },
                                font: { color: "blue", size: 12 },
                                size: self.defaultShapeSize,
                                color: propColor,
                                shape: propShape,
                            });
                        }
                        var edgeId = item.property.value + "_" + subProperty.id;
                        if (!existingNodes[edgeId]) {
                            existingNodes[edgeId] = 1;
                            visjsData.edges.push({
                                id: edgeId,
                                from: item.property.value,
                                to: subProperty.id,
                                data: { id: edgeId, source: Lineage_sources.activeSource },
                                color: Lineage_classes.defaultEdgeColor,
                                arrows: {
                                    from: {
                                        enabled: true,
                                        type: Lineage_classes.defaultEdgeArrowType,
                                        scaleFactor: 0.5,
                                    },
                                },
                            });
                        }
                    });
                }

                if (item.subProperty) {
                    var subProperty = item.subProperty.value;
                    let label = item.subPropertyLabel ? item.subPropertyLabel.value : Sparql_common.getLabelFromURI(item.subProperty.value);
                    if (!existingNodes[subProperty]) {
                        existingNodes[subProperty] = 1;
                        visjsData.nodes.push({
                            id: subProperty,
                            label: label,
                            data: {
                                id: subProperty,
                                label: label,
                                subProperties: [],
                                source: Lineage_sources.activeSource,
                            },
                            font: { color: "blue", size: 12 },
                            size: self.defaultShapeSize,
                            color: propColor,
                            shape: propShape,
                        });
                    }
                    var edgeId = item.property.value + "_" + subProperty;
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1;
                        visjsData.edges.push({
                            id: edgeId,
                            from: item.property.value,
                            to: subProperty,
                            color: Lineage_classes.defaultEdgeColor,
                            data: { id: edgeId, source: Lineage_sources.activeSource },
                            arrows: {
                                from: {
                                    enabled: true,
                                    type: Lineage_classes.defaultEdgeArrowType,
                                    scaleFactor: 0.5,
                                },
                            },
                        });
                    }
                }

                if (item.range) {
                    if (!existingNodes[item.range.value]) {
                        if (item.rangeType) {
                            if (item.rangeType.value.indexOf("Class") > -1) {
                                shape = Lineage_classes.defaultShape;
                            }
                            if (item.rangeType.value.indexOf("property") > -1) {
                                shape = self.defaultShape;
                            }
                        }
                        existingNodes[item.range.value] = 1;
                        let rangeLabel = item.rangeLabel ? item.rangeLabel.value : Sparql_common.getLabelFromURI(item.range.value);
                        visjsData.nodes.push({
                            id: item.range.value,
                            label: rangeLabel,
                            data: {
                                id: item.range.value,
                                label: rangeLabel,
                                source: Lineage_sources.activeSource,
                            },
                            size: self.defaultShapeSize,
                            color: color,
                            shape: classShape,
                        });
                    }
                    edgeId = item.property.value + "_" + item.range.value;
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1;
                        visjsData.edges.push({
                            id: edgeId,
                            from: item.property.value,
                            to: item.range.value,
                            data: { id: edgeId, source: Lineage_sources.activeSource },
                            color: "#cb6601",
                            arrows: {
                                to: {
                                    enabled: true,
                                    type: Lineage_classes.defaultEdgeArrowType,
                                    scaleFactor: 0.5,
                                },
                            },
                        });
                    }
                }
                if (item.domain) {
                    if (!existingNodes[item.domain.value]) {
                        existingNodes[item.domain.value] = 1;
                        shape = "text";
                        if (item.domainType) {
                            if (item.domainType.value.indexOf("Class") > -1) {
                                shape = Lineage_classes.defaultShape;
                            }
                            if (item.domainType.value.indexOf("property") > -1) {
                                shape = self.defaultShape;
                            }
                        }
                        let domainLabel = item.domainLabel ? item.domainLabel.value : Sparql_common.getLabelFromURI(item.domain.value);
                        visjsData.nodes.push({
                            id: item.domain.value,
                            label: domainLabel,
                            data: {
                                id: item.domain.value,
                                label: domainLabel,
                                source: Lineage_sources.activeSource,
                            },
                            color: color,
                            size: self.defaultShapeSize,
                            shape: classShape,
                        });
                    }
                    edgeId = item.property.value + "_" + item.domain.value;
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1;
                        visjsData.edges.push({
                            id: edgeId,
                            from: item.property.value,
                            to: item.domain.value,
                            color: "#008000",
                            data: { id: edgeId, source: Lineage_sources.activeSource },
                            arrows: {
                                from: {
                                    enabled: true,
                                    type: Lineage_classes.defaultEdgeArrowType,
                                    scaleFactor: 0.5,
                                },
                            },
                        });
                    }
                }
                if (item.range) {
                    if (!existingNodes[item.range.value]) {
                        shape = "text";
                        if (item.rangeType) {
                            if (item.rangeType.value.indexOf("Class") > -1) {
                                shape = Lineage_classes.defaultShape;
                            }
                            if (item.rangeType.value.indexOf("property") > -1) {
                                shape = self.propertiesLineage_classes.defaultShape;
                            }
                        }
                        existingNodes[item.range.value] = 1;

                        visjsData.nodes.push({
                            id: item.range.value,
                            label: item.rangeLabel.value,
                            data: {
                                id: item.range.value,
                                label: item.rangeLabel.value,
                                source: Lineage_sources.activeSource,
                            },
                            color: color,
                            size: self.defaultShapeSize,
                            shape: classShape,
                        });
                    }
                    edgeId = item.property.value + "_" + item.range.value;
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1;
                        visjsData.edges.push({
                            id: edgeId,
                            from: item.property.value,
                            to: item.range.value,
                            color: "#cb6601",
                            data: { id: edgeId, source: Lineage_sources.activeSource },
                            arrows: {
                                to: {
                                    enabled: true,
                                    type: Lineage_classes.defaultEdgeArrowType,
                                    scaleFactor: 0.5,
                                },
                            },
                        });
                    }
                }

                if (item.inverseProperty) {
                    if (!existingNodes[item.inverseProperty.value]) {
                        existingNodes[item.inverseProperty.value] = 1;
                        var propLabel = item.inversePropertyLabel ? item.inversePropertyLabel.value : Sparql_common.getLabelFromURI(item.inverseProperty.value);
                        visjsData.nodes.push({
                            id: item.inverseProperty.value,
                            label: propLabel,
                            data: {
                                id: item.inverseProperty.value,
                                label: propLabel,
                                source: Lineage_sources.activeSource,
                            },
                            color: propColor,
                            size: self.defaultShapeSize,
                            shape: propShape,
                        });
                    }
                    edgeId = item.inverseProperty.value + "_" + item.property.value;
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1;
                        visjsData.edges.push({
                            id: edgeId,
                            from: item.property.value,
                            to: item.inverseProperty.value,
                            color: "#0067bb",
                            data: { id: edgeId, source: Lineage_sources.activeSource },
                            dashes: true,
                        });
                    }
                }
            });

            if (!visjsGraph.data || !visjsGraph.data.nodes) {
                var options = {
                    onclickFn: Lineage_classes.graphActions.onNodeClick,
                    onRightClickFn: Lineage_classes.graphActions.showGraphPopupMenu,
                };
                visjsGraph.draw("graphDiv", visjsData, options);
            } else {
                visjsGraph.data.nodes.add(visjsData.nodes);
                visjsGraph.data.edges.add(visjsData.edges);
            }
            visjsGraph.network.fit();
            self.graphInited = true;
        });
    };

    /**
     *
     *
     * @param property  a specific property uri or null (all)
     *
     * @param callback returns an array of object witeh all characterisitcs of objectProperties
     *            item.property
     *           item.propertyLabel
     *           item.domain
     *           item.domainLabel
     *           item.range
     *           item.rangeLabel
     *           item.subProperty
     *           item.subPropertyLabel
     *           item.inverseProperty
     *           item.subProperties
     */
    self.getPropertiesRangeAndDomain = function (source, properties, callback) {
        if (Config.sources[source].schemaType == "OWL") {
            var options = {};
            var mode = $("#LineagePropertie_nodesSelectionSelect").val();
            var filterNodes = null;
            if (mode == "currentGraphNodes") {
                if (visjsGraph.isGraphNotEmpty) {
                    filterNodes = visjsGraph.data.nodes.getIds();
                }
            }

            Sparql_OWL.getInferredPropertiesDomainsAndRanges(source, options, function (err, result) {
                if (err) {
                    return callback(err);
                }
                var allProps = [];

                for (var propId in result) {
                    var item = result[propId];
                    if (!filterNodes || filterNodes.indexOf(item.domain) > -1 || filterNodes.indexOf(item.range) > -1) {
                        if (!properties || properties.indexOf(item.prop) > -1) {
                            allProps.push(item);
                        }
                    }
                }

                allProps.forEach(function (item) {
                    item.property = { value: item.prop };
                    item.propertyLabel = { value: item.propLabel };
                    item.domain = { value: item.domain };
                    item.domainLabel = { value: item.domainLabel };
                    item.range = { value: item.range };
                    item.rangeLabel = { value: item.rangeLabel };
                    item.subProperty = { value: item.subProp };
                    item.subPropertyLabel = { value: item.subPropLabel };
                    item.inverseProperty = { value: item.inverseProp };
                    item.subProperties = [];
                    item.subProps.forEach(function (subPropId) {
                        if (result[subPropId]) {
                            item.subProperties.push({ id: subPropId, label: result[subPropId].propLabel });
                        }
                    });
                    item.inversePropertyLabel = { value: item.inversePropLabel };
                });

                return callback(null, allProps);
            });
        } else if (Config.sources[source].schemaType == "KNOWLEDGE_GRAPH") {
            let options = {};
            Sparql_OWL.getFilteredTriples(source, targetnodes, null, null, options, function (err, result) {
                if (err) {
                    return callback(err);
                }

                result.forEach(function (item) {
                    item.range = { value: item.object.value };
                    item.rangeLabel = { value: item.objectLabel.value };
                    item.domain = { value: item.subject.value };
                    item.domainLabel = { value: item.subjectLabel.value };
                });
                return callback(null, result);
            });
        }
    };

    self.graphActions = {
        expandNode: function (node, _point, _event) {
            self.drawGraph(node);
        },
        showNodeInfos: function () {
            SourceBrowser.showNodeInfos(self.currentGraphNode.data.source, self.currentGraphNode, "mainDialogDiv");
        },
    };

    self.searchAllSourcesTerm = function () {
        var term = $("#LineageProperties_searchAllSourcesTermInput").val();
        var exactMatch = $("#LineageProperties_allExactMatchSearchCBX").prop("checked");
        var searchAllSources = $("#LineageProperties_searchInAllSources").prop("checked");
        var searchType = $("#LineageProperties_searchAllType").val();

        if (!term || term == "") {
            term == null;
        } else if (!exactMatch && term.indexOf("*") < 0) {
            term += "*";
        }

        var searchedSources = [];
        if (searchAllSources) {
            for (var sourceLabel in Config.sources) {
                if (Config.sources[sourceLabel].schemaType == "OWL") {
                    searchedSources.push(sourceLabel);
                }
            }
        } else {
            if (!Lineage_sources.activeSource) {
                return alert("select a source or search in all source");
            }
            searchedSources.push(Lineage_sources.activeSource);
        }
        var jstreeData = [];
        var uniqueIds = {};

        async.eachSeries(
            searchedSources,
            function (sourceLabel, callbackEach) {
                $("waitImg").css("display", "block");
                MainController.UI.message("searching in " + sourceLabel);

                self.getPropertiesjsTreeData(
                    sourceLabel,
                    null,
                    term,
                    {
                        exactMatch: exactMatch,
                        justPropertyAndLabel: 1,
                        searchType: searchType,
                    },
                    function (err, result) {
                        if (err) {
                            return callbackEach(err);
                        }

                        result.forEach(function (item) {
                            if (!uniqueIds[item.id]) {
                                uniqueIds[item.id] = 1;
                                item.parent = sourceLabel;
                                jstreeData.push(item);
                            }
                        });

                        if (result.length > 0) {
                            var text = "<span class='searched_conceptSource'>" + sourceLabel + "</span>";
                            jstreeData.push({ id: sourceLabel, text: text, parent: "#", data: { source: sourceLabel } });
                        }

                        callbackEach();
                    }
                );
            },
            function (err) {
                if (err) {
                    MainController.UI.message(err, true);
                }

                if (jstreeData.length == 0) {
                    $("#Lineage_propertiesTree").html("no properties found");
                }

                MainController.UI.message(jstreeData.length + " nodes found", true);
                var options = {
                    selectTreeNodeFn: Lineage_properties.onTreeNodeClick,
                    openAll: true,
                    withCheckboxes: true,
                };
                options.contextMenu = self.jstreeContextMenu();

                common.jstree.loadJsTree("Lineage_propertiesTree", jstreeData, options);
            }
        );
    };

    self.drawPropsRangeAndDomainMatrix = function (source) {
        var classes = [];
        var matrixMap = {};
        async.series(
            [
                //list classes and init matrixMap
                function (callbackSeries) {
                    Sparql_OWL.getDictionary(source, null, null, function (err, result) {
                        if (err) {
                            return callback(err);
                        }
                        result.forEach(function (item) {
                            classes.push(item.id.value);
                        });
                        classes.forEach(function (aClass1) {
                            matrixMap[aClass1] = {};

                            classes.forEach(function (aClass2) {
                                matrixMap[aClass1][aClass2] = "";
                            });
                        });
                        return callbackSeries();
                    });
                },
                //get props ranges and domains
                function (callbackSeries) {
                    Sparql_OWL.getInferredPropertiesDomainsAndRanges(source, {}, function (err, result) {
                        if (err) {
                            return callback(err);
                        }
                        result.forEach(function (item) {
                            var propLabel = item.propLabel ? item.propLabel.value : Sparql_common.getLabelFromURI(item.prop.value);
                            if (item.domain && item.range) {
                                matrixMap[item.domain.value][item.range.value] = propLabel;
                            } else if (item.domain) {
                                matrixMap[item.domain.value]["isDomain"] = propLabel;
                            } else if (item.range) {
                                matrixMap[item.range.value]["isRange"] = propLabel;
                            }
                        });
                        return callbackSeries();
                    });
                },
                //draw matrix
                function (callbackSeries) {
                    var cols = [];
                    var dataSet = [];

                    var domainsRow = [""];
                    classes.forEach(function (aClass1, index1) {
                        let class1Label = Sparql_common.getLabelFromURI(aClass1);
                        cols.push({ title: class1Label, defaultContent: "" });

                        let row = [];
                        var cell = "";

                        if (matrixMap[aClass1]["isRange"]) {
                            cell += matrixMap[aClass1]["isRange"];
                        }
                        row.push(cell);

                        classes.forEach(function (aClass2) {
                            if (index1 == 0) {
                                var cell = "";
                                if (matrixMap[aClass2]["isDomain"]) {
                                    cell = matrixMap[aClass2]["isDomain"];
                                }
                                domainsRow.push(cell);
                            }
                            var cell = "";
                            if (matrixMap[aClass1][aClass2]) {
                                cell = matrixMap[aClass1][aClass2];
                            }

                            row.push(cell);
                        });
                        dataSet.push(row);
                    });
                    dataSet.splice(0, 0, domainsRow);
                    cols.splice(0, 0, { title: "any", defaultContent: "" });
                    let x = dataSet;
                    Export.showDataTable(null, cols, dataSet);
                    return callbackSeries();
                },
            ],

            function (err) {}
        );
    };

    self.onPropertyActionClick = function (action, target) {
        var properties = null;
        if ($("#Lineage_propertiesTree").jstree().get_checked) {
            properties = $("#Lineage_propertiesTree").jstree().get_checked();
            if (properties.length == 0) {
                properties = null;
            }
        }
        var nodeIds = null;
        var nodesSelection = $("#lineageProperties_nodesSelectionSelect").val();
        if (visjsGraph.data && visjsGraph.data.nodes && nodesSelection == "currentGraphNodes") {
            nodeIds = visjsGraph.data.nodes.getIds();
        }

        var source = Lineage_sources.activeSource;
        var searchAllSources = $("#LineageProperties_searchInAllSources").prop("checked");

        if (searchAllSources && properties.length > 0) {
            var firstProperty = $("#Lineage_propertiesTree").jstree().get_node(properties[0]);
            source = firstProperty.parent;
        }

        if (action == "relations") {
            if (!nodeIds && !properties) {
                return alert("You must select properties or nodes to show predicates");
            }
            if (target == "visj") {
                var options = {
                    filter: Sparql_common.setFilter("prop", properties),
                };
                if (!nodeIds) {
                    options.allNodes = true;
                }
                Lineage_relations.drawRelations(null, null, "Properties", options);
                // Lineage_properties.drawPredicatesGraph(source, nodeIds, properties);
            } else if (target == "table") {
                //  Lineage_classes.graphNodeNeighborhood(data, "outcoming", function(err, result) {
            }
        }

        if (action == "predicates") {
            if (!nodeIds && !properties) {
                return alert("You must select properties or nodes to show predicates");
            }
            if (target == "visj") {
                Lineage_properties.drawPredicatesGraph(source, nodeIds, properties);
            } else if (target == "table") {
                //  Lineage_classes.graphNodeNeighborhood(data, "outcoming", function(err, result) {
            }
        } else if (action == "restrictions") {
            if (target == "visj") {
                Lineage_properties.drawObjectPropertiesRestrictions(source, nodeIds, properties);
            } else if (target == "table") {
                Lineage_properties.drawObjectPropertiesRestrictions(source, nodeIds, properties);
            }
        } else if (action == "rangesAndDomains") {
            if (target == "visj") {
                self.drawRangeAndDomainsGraph(source, nodeIds, properties);
            } else if (target == "table") {
                self.exportRangeAndDomainsGraph(source, nodeIds, properties);
            }
        }
    };

    return self;
})();
