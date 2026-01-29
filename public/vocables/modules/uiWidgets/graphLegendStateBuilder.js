/*
 * GraphLegendStateBuilder
 * Build a dynamic legend "state" by inspecting a VisjsGraphClass instance.
 * Goal: reusable across tools (lineage, mapping, implicit, etc.)
 */
var GraphLegendStateBuilder = (function () {
    var self = {};

    /**
     * Safely pick a color from vis.js node/edge objects.
     * vis.js sometimes stores color as a string or as an object ({background, border} or {color}).
     * @param {Object} visItem
     * @param {string} fallback
     * @returns {string}
     */
    self.getColor = function (visItem, fallback) {
        if (!visItem) {
            return fallback || "#999";
        }
        if (typeof visItem.color === "string") {
            return visItem.color;
        }
        if (visItem.color && typeof visItem.color === "object") {
            if (visItem.color.background) {
                return visItem.color.background;
            }
            if (visItem.color.color) {
                return visItem.color.color;
            }
        }
        if (visItem.color && visItem.color.color) {
            return visItem.color.color;
        }
        return fallback || "#999";
    };

    /**
     * Return true if the node is visible in the graph (not hidden).
     * @param {Object} node
     * @returns {boolean}
     */
    self.isVisibleNode = function (node) {
        if (!node) {
            return false;
        }
        return node.hidden !== true;
    };

    /**
     * Return true if the edge is visible and both endpoints are visible.
     * @param {Object} edge
     * @param {Object<string, boolean>} visibleNodeIdsMap
     * @returns {boolean}
     */
    self.isVisibleEdge = function (edge, visibleNodeIdsMap) {
        if (!edge) {
            return false;
        }
        if (edge.hidden === true) {
            return false;
        }
        if (visibleNodeIdsMap && (visibleNodeIdsMap[edge.from] !== true || visibleNodeIdsMap[edge.to] !== true)) {
            return false;
        }
        return true;
    };

    /**
     * Sort an object by a preferred key order, then append remaining keys alphabetically.
     * @param {Object} obj
     * @param {Array<string>} orderedKeys
     * @returns {Object}
     */
    self.sortByOrder = function (obj, orderedKeys) {
        var sorted = {};
        (orderedKeys || []).forEach(function (key) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                sorted[key] = obj[key];
            }
        });

        Object.keys(obj || {})
            .sort()
            .forEach(function (key) {
                if (!Object.prototype.hasOwnProperty.call(sorted, key)) {
                    sorted[key] = obj[key];
                }
            });

        return sorted;
    };

    /**
     * Build a dynamic legend state.
     *
     * @param {VisjsGraphClass} visjsGraph - VisjsGraphClass instance
     * @param {Object} options
     * @param {function(Object):string} [options.nodeKeyFn] - category key for nodes
     * @param {function(Object,string):string} [options.nodeLabelFn] - display label for nodes
     * @param {function(Object):string} [options.edgeKeyFn] - category key for edges
     * @param {function(Object,string):string} [options.edgeLabelFn] - display label for edges
     * @param {Array<string>} [options.nodeOrder] - preferred order for node categories
     * @param {Array<string>} [options.edgeOrder] - preferred order for edge categories
     * @returns {Object} state compatible with LegendOverlayWidget.update()
     */
    self.buildState = function (visjsGraph, options) {
        options = options || {};
        var state = {
            dynamicLegend: true,
            nodeTypeStyles: {},
            edgeCatStyles: {},
        };

        if (!visjsGraph || !visjsGraph.data || !visjsGraph.data.nodes || !visjsGraph.data.edges) {
            return state;
        }

        var nodes = visjsGraph.data.nodes.get();
        var edges = visjsGraph.data.edges.get();
        var visibleNodeIdsMap = {};

        nodes.forEach(function (node) {
            if (!self.isVisibleNode(node)) {
                return;
            }
            visibleNodeIdsMap[node.id] = true;

            var categoryKey = options.nodeKeyFn ? options.nodeKeyFn(node) : (node.data && (node.data.rdfType || node.data.type)) || node.shape || "Node";
            categoryKey = String(categoryKey);

            var color = self.getColor(node, "#999");
            var shape = node.shape || "dot";

            // Force ellipse shape for Property in legend
            if (categoryKey === "Property") {
                shape = "ellipse";
            }

            var label = options.nodeLabelFn ? options.nodeLabelFn(node, categoryKey) : categoryKey;

            if (categoryKey === "Source") {
                label = "DatatypeProperty";
            }

            if (!state.nodeTypeStyles[categoryKey]) {
                state.nodeTypeStyles[categoryKey] = {
                    color: color,
                    colors: [color], //  initialize colors list
                    shape: shape,
                    classLabel: label,
                    type: categoryKey,
                };
            } else {
                // If we detect a new color for the same category, append it
                var typeStyle = state.nodeTypeStyles[categoryKey];
                if (!typeStyle.colors) {
                    typeStyle.colors = [typeStyle.color];
                }
                if (typeStyle.colors.indexOf(color) < 0) {
                    typeStyle.colors.push(color);
                }
            }
        });

        edges.forEach(function (edge) {
            if (!self.isVisibleEdge(edge, visibleNodeIdsMap)) {
                return;
            }

            var edgeCategoryKey = options.edgeKeyFn ? options.edgeKeyFn(edge) : (edge.data && (edge.data.type || edge.data.propLabel)) || edge.label || "Edge";
            edgeCategoryKey = String(edgeCategoryKey);

            if (!state.edgeCatStyles[edgeCategoryKey]) {
                var color = self.getColor(edge, "#aaa");
                var dashed = edge.dashes ? true : false;
                var label = options.edgeLabelFn ? options.edgeLabelFn(edge, edgeCategoryKey) : edgeCategoryKey;

                state.edgeCatStyles[edgeCategoryKey] = {
                    color: color,
                    dashed: dashed,
                    label: label,
                };
            }
        });

        var nodeOrder = options.nodeOrder || ["Source", "Class", "NamedIndividual", "Property", "bnode", "literal"];
        var edgeOrder = options.edgeOrder || ["ObjectProperty", "Hierarchy", "Restriction", "DatatypeProperty", "SourceLink", "Other"];

        state.nodeTypeStyles = self.sortByOrder(state.nodeTypeStyles, nodeOrder);
        state.edgeCatStyles = self.sortByOrder(state.edgeCatStyles, edgeOrder);

        return state;
    };

    return self;
})();

export default GraphLegendStateBuilder;
window.GraphLegendStateBuilder = GraphLegendStateBuilder;
