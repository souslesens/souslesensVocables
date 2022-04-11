/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
var GraphController = (function () {
    var self = {};
    self.defaultNodeColor = "blue";
    defaultNodeShape = "dot";

    self.toVisjsData = function (visjsData, data, parentNodeId, fromVar, toVar, visjOptions, _fromLevel) {
        self.defaultNodeColor = visjsGraph.globalOptions.nodes.color || self.defaultNodeColor;
        self.defaultNodeShape = visjsGraph.globalOptions.nodes.coshapelor || defaultNodeShape;

        if (!visjOptions) {
            visjOptions = { from: {}, to: {} };
        }

        var existingIds = visjsGraph.getExistingIdsMap();

        if (!visjsData) {
            visjsData = { nodes: [], edges: [] };
        } else {
            visjsData.nodes.forEach(function (item) {
                existingIds[item.id] = 1;
            });
            visjsData.edges.forEach(function (item) {
                existingIds[item.id] = 1;
            });
        }

        function getShape(target, nodeData) {
            if (visjOptions[target] && visjOptions[target].shape) {
                if (typeof visjOptions[target].shape == "string") return visjOptions[target].shape;
                //fn
                else return visjOptions[target].shape(nodeData);
            }
            return self.defaultNodeShape;
        }

        data.forEach(function (item) {
            if (parentNodeId) {
                fromId = parentNodeId;
            } else {
                var fromId = "";
                var fromLabel = "";
                if (!fromVar) {
                    // Pass
                } else if (fromVar == "#") {
                    fromId = "#";
                    fromLabel = visjOptions.rootLabel || "#";
                } else {
                    if (!item[fromVar]) return; //console.log(JSON.stringify(item));
                    fromId = item[fromVar].value;
                    fromLabel = item[fromVar + "Label"].value;
                }

                if (!existingIds[fromId]) {
                    var color = Lineage_classes.getSourceColor(null, fromId);
                    existingIds[fromId] = 1;
                    var node = {
                        id: fromId,
                        label: fromLabel,
                        shape: getShape("from", fromId),
                        size: visjOptions.to.size || 5,
                        color: color || visjOptions.from.color || self.defaultNodeColor,
                    };
                    node.data = {};
                    if (visjOptions.data) node.data = JSON.parse(JSON.stringify(visjOptions.data));
                    node.data.id = fromId;
                    node.data.label = fromLabel;
                    node.data.varName = fromVar;
                    // node.data.graphLevel = fromLevel
                    visjsData.nodes.push(node);
                }
            }

            if (toVar && (item[toVar] || toVar == "#")) {
                var toId;
                var toLabel;
                if (toVar == "#") {
                    toId = "#";
                    toLabel = visjOptions.rootLabel || "#";
                } else {
                    toId = item[toVar].value || "#";

                    if (!item[toVar + "Label"]) toLabel = toId;
                    else toLabel = item[toVar + "Label"].value;
                }

                if (!existingIds[toId]) {
                    existingIds[toId] = 1;
                    color = Lineage_classes.getSourceColor(null, toId);
                    node = {
                        id: toId,
                        label: toLabel,
                        shape: getShape("to", toId),
                        size: visjOptions.to.size || 5,
                        color: color || visjOptions.from.color || self.defaultNodeColor,
                    };
                    node.data = {};
                    if (visjOptions.data) node.data = JSON.parse(JSON.stringify(visjOptions.data));
                    node.data.id = toId;
                    node.data.label = toLabel;
                    node.data.varName = toVar;
                    // node.data.graphLevel = fromLevel + 1
                    visjsData.nodes.push(node);
                }

                var edgeId = fromId + "_" + toId;
                var inverseEdge = toId + "_" + fromId;
                if (!existingIds[edgeId] && !existingIds[inverseEdge]) {
                    existingIds[edgeId] = 1;
                    var edge = {
                        id: edgeId,
                        from: fromId,
                        to: toId,
                    };
                    if (visjOptions.arrows) edge.arrows = visjOptions.arrows;
                    if (visjOptions.edgeColor) edge.color = visjOptions.edgeColor;

                    visjsData.edges.push(edge);
                }
            }
        });

        return visjsData;
    };

    return self;
})();
