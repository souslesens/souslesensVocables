import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Lineage_whiteboard from "./lineage_whiteboard.js";
import common from "../../shared/common.js";
import Export from "../../shared/export.js";
import GraphDisplayLegend from "../../graph/graphDisplayLegend.js";
import Lineage_decoration from "./lineage_decoration.js";
import Lineage_sources from "./lineage_sources.js";
import JstreeWidget from "../../uiWidgets/jstreeWidget.js";

/* The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * @module Lineage_properties
 * @description Module for managing ontology properties and their relationships.
 * Provides functionality for:
 * - Managing object and data properties
 * - Visualizing property hierarchies
 * - Handling property restrictions and constraints
 * - Supporting property domains and ranges
 * - Managing property metadata and visualization
 * - Supporting property tree operations
 * - Handling property-based graph operations
 */

var Lineage_properties = (function () {
    var self = {};
    var sourceColors = {};
    self.defaultShape = "triangle";
    self.defaultEdgeArrowType = "triangle";
    self.defaultShape = "dot";
    self.defaultShape = "text";
    self.defaultShapeSize = 8;

    /**
     * Initializes the properties module by resetting the graph initialization state.
     * @function
     * @name init
     * @memberof module:Lineage_properties
     * @returns {void}
     */
    self.init = function () {
        self.graphInited = false;
    };

    /**
     * Displays property information in the graph div.
     * @function
     * @name showPropInfos
     * @memberof module:Lineage_properties
     * @param {Event} _event - The event object (unused).
     * @param {Object} obj - Object containing the node information.
     * @param {Object} obj.node - The node object.
     * @param {string} obj.node.id - The ID of the node.
     * @returns {void}
     */
    self.showPropInfos = function (_event, obj) {
        var id = obj.node.id;
        var html = JSON.stringify(self.properties[id]);
        $("#graphDiv").html(html);
    };

    /**
     * Creates the context menu for the jstree nodes.
     * @function
     * @name jstreeContextMenu
     * @memberof module:Lineage_properties
     * @returns {Object} Object containing menu items and their actions.
     */
    self.jstreeContextMenu = function () {
        var items = {
            nodeInfos: {
                label: "Property infos",
                action: function (_e) {
                    // pb avec source

                    NodeInfosWidget.showNodeInfos(self.currentTreeNode.data.source, self.currentTreeNode, "mainDialogDiv", { resetVisited: 1 }, function (_err, _result) {
                        // pass
                    });
                },
            },
        
           
        }
        
    
        if (self.currentTreeNode?.data?.type === "http://www.w3.org/2002/07/owl#ObjectProperty") {
            items["graphNode"] = {
                label: "graph node",
                action: function (_e) {
                    try {
                        const properties = "http://www.w3.org/2002/07/owl#ObjectProperty";
                        const jsTree = $("#Lineage_propertiesTree").jstree(true);
                        const selected = jsTree ? jsTree.get_selected(true) : [];

                        let propIds = selected
                        .filter(n => n?.data?.type === properties && n?.data?.id)
                        .map(n => n.data.id);

            
                        if (propIds.length === 0 && self.currentTreeNode?.data?.id) {
                        propIds = [self.currentTreeNode.data.id];
                        }
                        if (propIds.length === 0) {
                        return UI.message("Sélectionne une ObjectProperty d'abord.", true);
                        }

           
                        const visjsData = { nodes: [], edges: [] };
                        const existing = (Lineage_whiteboard?.lineageVisjsGraph?.getExistingIdsMap)
                        ? Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap()
                        : {};

                        const propShape = "box";
                        const propColor = "#ddd";
                        const propFont = { color: "blue", size: 12 };
                        const src = Lineage_sources.activeSource || self.currentTreeNode?.data?.source;

                        propIds.forEach((id) => {
                        if (existing[id]) return;

            
                        const fromSel = selected.find(n => n?.data?.id === id)?.data;
                        const label =
                            (fromSel && fromSel.label) ||
                            (self.currentTreeNode?.data?.id === id ? self.currentTreeNode.data.label : null) ||
                            Sparql_common.getLabelFromURI(id);

                        visjsData.nodes.push({
                            id,
                            label,
                            shape: propShape,         
                            color: propColor,
                            size: self.defaultShapeSize,
                            font: propFont,
                            data: {
                            id,
                            label,
                            source: src,
                            type: properties
                            }
                        });
                        existing[id] = 1;
                        });

                
                    if (!Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                    Lineage_whiteboard.drawNewGraph(visjsData);
                    } else {
                    Lineage_whiteboard.addVisDataToGraph(visjsData);
                    }
                    Lineage_whiteboard.lineageVisjsGraph.network.fit();
                    } catch (err) {
                        const msg = err?.responseText || err?.message || String(err);
                        UI.message(msg, true);
                    }
                }
            };
    }

    
    
        if (MainController.currentTool == "lineage") {
            items.restrictions = {
                label: "Restrictions",
                action: function (_e) {
                    // pb avec source

                    Lineage_properties.drawObjectPropertiesRestrictions(Lineage_sources.activeSource, null, [self.currentTreeNode.data.id], { withoutImports: true });
                },
            };
            items.rangeAndDomain = {
                label: "ranges and domains",
                action: function (_e) {
                    // pb avec source
                    self.drawRangeAndDomainsGraph(Lineage_sources.activeSource, null, { withoutImports: true }, [self.currentTreeNode.data.id]);
                    //Lineage_properties.drawObjectPropertiesRestrictions(Lineage_sources.activeSource,null , [self.currentTreeNode.data.id], { withoutImports: true });
                },
            };
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
                /* items.deleteProperty = {
            label: "delete property",
            action: function (_e) {
                // pb avec source

                JstreeWidget.deleteNode(self.currentTreeNode, "Lineage_propertiesTree");
            },
        };*/
            }
        }

        return items;
    };

    /**
     * Handles click events on tree nodes.
     * @function
     * @name onTreeNodeClick
     * @memberof module:Lineage_properties
     * @param {Event} _event - The click event object.
     * @param {Object} obj - Object containing the clicked node information.
     * @returns {void}
     */
    self.onTreeNodeClick = function (_event, obj) {
        if (!obj || !obj.node) {
            return;
        }
        self.currentTreeNode = obj.node;
        if (obj.node.children && obj.node.children.length > 0) {
            return;
        }
        //  self.openNode(obj.node);
    };

    /**
     * Opens a node in the property tree and loads its subproperties.
     * @function
     * @name openNode
     * @memberof module:Lineage_properties
     * @param {Object} node - The node to open.
     * @param {Object} node.data - The node's data.
     * @param {string} node.data.id - The node's ID.
     * @param {string} node.data.source - The node's source.
     * @returns {void}
     */
    self.openNode = function (node) {
        var options = { subPropIds: node.data.id };
        UI.message("searching in " + node.data.source);
        // @ts-ignore
        Sparql_OWL.getObjectPropertiesDomainAndRange(node.data.source, null, options, function (err, result) {
            if (err) {
                return UI.message(err);
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
            JstreeWidget.addNodesToJstree("Lineage_propertiesTree", node.id, jstreeData);
            UI.message("", true);
        });
    };

    /**
     * Generates jstree data structure for object properties.
     * @function
     * @name getPropertiesjsTreeData
     * @memberof module:Lineage_properties
     * @param {string} source - The source to query.
     * @param {Array<string>} ids - Array of property IDs to filter by.
     * @param {Array<string>} words - Array of words to search for in property labels.
     * @param {Object} options - Additional options for the query.
     * @param {string} [options.searchType] - Type of search to perform (filters properties on words present in predicate or subject or object label).
     * @param {Function} callback - Callback function with signature (error, jstreeData).
     * @returns {void}
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
        var objectPropertyNode = {
            text: "ObjectProperties",
            id: source + "_ObjectProperties",
            parent: parent,
            data: {
                label: "ObjectProperties",
                id: source + "_ObjectProperties",
                parent: source,
            },
        };
        var datatypePropertyNode = {
            text: "DatatypeProperties",
            id: source + "_DatatypeProperties",
            parent: parent,
            data: {
                label: "DatatypeProperties",
                id: source + "_DatatypeProperties",
                parent: source,
            },
        };
        jstreeData.push(objectPropertyNode);
        jstreeData.push(datatypePropertyNode);
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

                                var parent = source + "_ObjectProperties";
                                /*
                                if (item.subProp) {
                                    parent = item.subProp.value;
                                }*/
                                var superProp = Config.ontologiesVocabularyModels[source].properties[item.prop.value].superProp;
                                if (superProp != null) {
                                    // for use it as parent superProp need to be on jstre
                                    var superPropFilter = data.filter(function (prop) {
                                        return prop.prop.value == superProp;
                                    });
                                    if (superPropFilter.length > 0) {
                                        parent = superProp;
                                    }
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
                    options.dataTypeProperties = true;
                    Sparql_OWL.getObjectPropertiesDomainAndRange(source, ids, options, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        var data = common.array.sort(common.array.distinctValues(result, "prop"), "propLabel");

                        data.forEach(function (item) {
                            if (!distinctIds[item.prop.value]) {
                                distinctIds[item.prop.value] = 1;

                                var parent = source + "_DatatypeProperties";
                                /*
                                if (item.subProp) {
                                    parent = item.subProp.value;
                                }*/
                                var superProp = Config.ontologiesVocabularyModels[source]?.nonObjectProperties[item.prop.value]?.superProp;
                                if (superProp != null) {
                                    parent = superProp;
                                }
                                jstreeData.push({
                                    text: item.propLabel.value,
                                    id: item.prop.value,
                                    parent: parent,
                                    data: {
                                        label: item.propLabel.value,
                                        id: item.prop.value,
                                        parent: parent,
                                        type: "http://www.w3.org/2002/07/owl#DatatypeProperty",
                                        source: source,
                                    },
                                });
                            }
                        });
                        callbackSeries(null);
                    });
                },

                function (callbackSeries) {
                    return callbackSeries(null);

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
            },
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

    self.drawObjectPropertiesRestrictions = function (source, nodeIds, properties, options) {
        if (!options) {
            options = {};
        }

        if (nodeIds && nodeIds.length > 0) {
            options.filter = Sparql_common.setFilter("sourceClass", nodeIds);
        }

        Sparql_OWL.getPropertiesRestrictionsDescription(source, properties, options, function (err, result) {
            if (err) {
                alert(err.responseText);
                return UI.message(err.responseText, true);
            }
            var visjsData = { nodes: [], edges: [] };

            var existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
            var isNewGraph = true;
            if (Object.keys(existingNodes).length > 0) {
                isNewGraph = false;
            }

            var color = Lineage_whiteboard.getSourceColor(source);
            //  console.log(JSON.stringify(result, null, 2))
            result.forEach(function (item) {
                if (true && !existingNodes[item.prop.value]) {
                    existingNodes[item.prop.value] = 1;
                    visjsData.nodes.push({
                        id: item.prop.value,
                        label: item.propLabel.value,
                        shape: "ellipse",
                        size: Lineage_whiteboard.defaultShapeSize,
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
                        //  size: Lineage_whiteboard.defaultShapeSize,
                        // color: color,
                        data: {
                            source: source,
                            id: item.sourceClass.value,
                            label: item.sourceClassLabel.value,
                            varName: "value",
                        },
                    });
                    var edgeId = item.prop.value + "_" + item.restriction.value;
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
                            color: Lineage_whiteboard.restrictionColor,
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
                            color: Lineage_whiteboard.restrictionColor,
                        });
                    }
                }
            });
            if (!isNewGraph) {
                Lineage_whiteboard.addVisDataToGraph(visjsData);
            } else {
                Lineage_whiteboard.drawNewGraph(visjsData);
            }
            Lineage_whiteboard.lineageVisjsGraph.network.fit();
            $("#waitImg").css("display", "none");
        });
    };

    self.exportRangeAndDomainsGraph = function (property) {
        var source = Lineage_sources.activeSource;
        var targetnodes = null;
        var nodesSelection = $("#LineagePropertie_nodesSelectionSelect").val();
        nodesSelection = false;
        if (Lineage_whiteboard.lineageVisjsGraph.data && Lineage_whiteboard.lineageVisjsGraph.data.nodes && nodesSelection == "currentGraphNodes") {
            targetnodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.getIds();
        }
        self.getPropertiesRangeAndDomain(source, property, {}, function (err, result) {
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
    self.drawRangeAndDomainsGraph = function (source, targetnodes, options, property) {
        self.getPropertiesRangeAndDomain(source, property, options, function (err, result) {
            if (err) {
                return alert(err.responseText);
            }

            //set invers properties
            var inversePropsItems = [];
            result.forEach(function (item) {
                if (item.inverseProperty && item.inverseProperty.value) {
                    var prop = {
                        property: item.inverseProperty,
                        propertyLabel: item.inversePropertyLabel,
                        domain: item.range,
                        domainLabel: item.rangeLabel,
                        range: item.domain,
                        rangeLabel: item.domainLabel,
                    };

                    inversePropsItems.push(prop);
                }
            });

            result = result.concat(inversePropsItems);

            var visjsData = { nodes: [], edges: [] };
            var existingNodes = {};
            if (Lineage_whiteboard.lineageVisjsGraph.data && Lineage_whiteboard.lineageVisjsGraph.data.nodes) {
                existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
            }
            var color = Lineage_whiteboard.getSourceColor(Lineage_sources.activeSource);

            var classShape = "dot";
            var propColor = "#ddd";
            var propShape = "box";
            var allNodeIds = [];

            result.forEach(function (item) {
                var ok = 0;
                if (!item.property || !item.property.value) {
                    return;
                }
                if (targetnodes && targetnodes.length > 0) {
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
                                color: Lineage_whiteboard.defaultEdgeColor,
                                arrows: {
                                    from: {
                                        enabled: true,
                                        type: Lineage_whiteboard.defaultEdgeArrowType,
                                        scaleFactor: 0.5,
                                    },
                                },
                            });
                        }
                    });
                }

                if (item.subProperty?.value) {
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
                            color: Lineage_whiteboard.defaultEdgeColor,
                            data: { id: edgeId, source: Lineage_sources.activeSource },
                            arrows: {
                                from: {
                                    enabled: true,
                                    type: Lineage_whiteboard.defaultEdgeArrowType,
                                    scaleFactor: 0.5,
                                },
                            },
                        });
                    }
                }

                if (item.range?.value) {
                    if (!existingNodes[item.range.value]) {
                        allNodeIds.push({ id: item.range.value });
                        if (item.rangeType) {
                            if (item.rangeType.value.indexOf("Class") > -1) {
                                shape = Lineage_whiteboard.defaultShape;
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
                    edgeId = item.property.value + "_range_" + item.range.value;
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1;
                        visjsData.edges.push({
                            id: edgeId,
                            from: item.property.value,
                            to: item.range.value,
                            label: "R",
                            font: { size: 12, color: "#cb6601" },
                            data: { id: edgeId, source: Lineage_sources.activeSource },
                            color: "#cb6601",
                            arrows: {
                                to: {
                                    enabled: true,
                                    type: Lineage_whiteboard.defaultEdgeArrowType,
                                    scaleFactor: 0.5,
                                },
                            },
                        });
                    }
                }
                if (item.domain?.value) {
                    if (!existingNodes[item.domain.value]) {
                        allNodeIds.push({ id: item.domain.value });
                        existingNodes[item.domain.value] = 1;
                        var shape = "text";
                        if (item.domainType) {
                            if (item.domainType.value.indexOf("Class") > -1) {
                                shape = Lineage_whiteboard.defaultShape;
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
                    edgeId = item.property.value + "_domain_" + item.domain.value;
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1;
                        visjsData.edges.push({
                            id: edgeId,
                            from: item.property.value,
                            to: item.domain.value,
                            color: "#008000",
                            label: "D",
                            font: { size: 12, color: "#008000" },
                            data: { id: edgeId, source: Lineage_sources.activeSource },
                            arrows: {
                                to: {
                                    enabled: true,
                                    type: Lineage_whiteboard.defaultEdgeArrowType,
                                    scaleFactor: 0.5,
                                },
                            },
                        });
                    }
                }
                if (item.range?.value) {
                    if (!existingNodes[item.range.value]) {
                        allNodeIds.push({ id: item.range.value });
                        shape = "text";
                        if (item.rangeType) {
                            if (item.rangeType.value.indexOf("Class") > -1) {
                                shape = Lineage_whiteboard.defaultShape;
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
                    edgeId = item.property.value + "_range_" + item.range.value;
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1;
                        visjsData.edges.push({
                            id: edgeId,
                            from: item.property.value,
                            to: item.range.value,
                            color: "#cb6601",
                            label: "R",
                            font: { size: 12, color: "#cb6601" },
                            data: { id: edgeId, source: Lineage_sources.activeSource },
                            arrows: {
                                to: {
                                    enabled: true,
                                    type: Lineage_whiteboard.defaultEdgeArrowType,
                                    scaleFactor: 0.5,
                                },
                            },
                        });
                    }
                }

                if (item.inverseProperty?.value) {
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
                    var inverseEdge = item.property.value + "_" + item.inverseProperty.value;
                    if (!existingNodes[edgeId] && !existingNodes[inverseEdge]) {
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

            if (!Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                Lineage_whiteboard.drawNewGraph(visjsData);
            } else {
                Lineage_whiteboard.addVisDataToGraph(visjsData);
            }
            Lineage_decoration.decorateNodeAndDrawLegend(allNodeIds, null);
            GraphDisplayLegend.drawLegend("RangesAndDomains", "LineageVisjsLegendCanvas", false);
            /*  Lineage_whiteboard.lineageVisjsGraph.network.fit();

*/
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
    self.getPropertiesRangeAndDomain = function (source, properties, options, callback) {
        if (Config.sources[source].schemaType == "OWL") {
            if (!options) {
                options = {};
            }
            var mode = $("#LineagePropertie_nodesSelectionSelect").val();
            var filterNodes = null;
            if (mode == "currentGraphNodes") {
                if (Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty) {
                    filterNodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.getIds();
                }
            }
            if (properties && properties.length > 0) {
                options.filter = Sparql_common.setFilter("prop", properties);
            }
            UI.message("searching...");
            Sparql_OWL.getInferredPropertiesDomainsAndRanges(source, options, function (err, result) {
                if (err) {
                    return callback(err);
                }
                var allProps = [];
                if (Object.keys(allProps).length == 0) {
                }
                //  UI.message("No data found",true)

                UI.message("drawing...");
                for (var propId in result) {
                    var item = result[propId];

                    if (filterNodes) {
                        if (filterNodes.indexOf(item.domain) > -1 || filterNodes.indexOf(item.range) > -1) {
                            if (!properties || properties.indexOf(item.prop) > -1) {
                                allProps.push(item);
                            }
                        }
                    } else {
                        allProps.push(item);
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
            NodeInfosWidget.showNodeInfos(self.currentGraphNode.data.source, self.currentGraphNode, "mainDialogDiv");
        },
    };

    self.searchTermInSources = function (term, inCurrentSource, exactMatch, searchType) {
        if (!term) term = $("#LineageProperties_searchAllSourcesTermInput").val();
        if (!exactMatch) {
            exactMatch = $("#LineageProperties_allExactMatchSearchCBX").prop("checked");
        }
        var searchAllSources = false;
        if (!inCurrentSource) {
            searchAllSources = $("#LineageProperties_searchInAllSources").prop("checked");
        }
        if (!searchType) {
            searchType = $("#LineageProperties_searchAllType").val();
        }

        if (!term || term == "") {
            term == null;
        } else {
            if (term.indexOf("*") > -1) {
                exactMatch = false;
                $("#LineageProperties_allExactMatchSearchCBX").removeProp("checked");
            }
            term = term.replace("*", "");
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
                UI.message("searching in " + sourceLabel);

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
                                //item.parent = sourceLabel;
                                if (item.parent != sourceLabel) {
                                    if (result.filter((node) => node.id == item.parent).length == 0) {
                                        item.parent = sourceLabel;
                                    }
                                }
                                item.type = "Property";
                                jstreeData.push(item);
                            }
                        });

                        if (result.length > 0) {
                            var text = "<span class='searched_conceptSource'>" + sourceLabel + "</span>";
                            jstreeData.push({
                                id: sourceLabel,
                                text: text,
                                type: "Source",
                                parent: "#",
                                data: { source: sourceLabel },
                            });
                        }

                        callbackEach();
                    },
                );
            },
            function (err) {
                if (err) {
                    UI.message(err, true);
                }

                if (jstreeData.length == 0) {
                    $("#Lineage_propertiesTree").html("no properties found");
                }

                UI.message(jstreeData.length + " nodes found", true);
                var options = {
                    selectTreeNodeFn: Lineage_properties.onTreeNodeClick,
                    openAll: true,
                    withCheckboxes: true,
                };
                options.contextMenu = self.jstreeContextMenu;

                JstreeWidget.loadJsTree("Lineage_propertiesTree", jstreeData, options);
            },
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

            function (err) {},
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
        if (Lineage_whiteboard.lineageVisjsGraph.data && Lineage_whiteboard.lineageVisjsGraph.data.nodes && nodesSelection == "currentGraphNodes") {
            nodeIds = Lineage_whiteboard.lineageVisjsGraph.data.nodes.getIds();
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
                    options.withoutImports = true;
                }
                Lineage_relations.drawRelations(null, null, "Properties", options);
            } else if (target == "table") {
            }
        }

        if (action == "predicates") {
            if (!nodeIds && !properties) {
                return alert("You must select properties or nodes to show predicates");
            }
            if (target == "visj") {
                Lineage_whiteboard.drawPredicatesGraph(source, nodeIds, properties, { withoutImports: true });
            } else if (target == "table") {
                //  Lineage_whiteboard.graphNodeNeighborhood(data, "outcoming", function(err, result) {
            }
        } else if (action == "restrictions") {
            if (target == "visj") {
                Lineage_properties.drawObjectPropertiesRestrictions(source, nodeIds, properties, { withoutImports: true });
            } else if (target == "table") {
                Lineage_properties.drawObjectPropertiesRestrictions(source, nodeIds, properties, { withoutImports: true });
            }
        } else if (action == "rangesAndDomains") {
            if (target == "visj") {
                self.drawRangeAndDomainsGraph(source, nodeIds, { withoutImports: true }, properties);
            } else if (target == "table") {
                self.exportRangeAndDomainsGraph(source, nodeIds, properties);
            }
        }
    };
    self.changeIconForPropertiesGraphAction = function (div) {
        var icon = $(div).children().attr("class");
        if (icon == "allPropertyIcon slsv-invisible-button" || icon == "slsv-invisible-button allPropertyIcon") {
            $(div).children().removeClass("allPropertyIcon");
            $(div).children().addClass("currentPropertyIcon");
        } else {
            $(div).children().removeClass("currentPropertyIcon");
            $(div).children().addClass("allPropertyIcon");
        }
    };
    return self;
})();

export default Lineage_properties;

window.Lineage_properties = Lineage_properties;
