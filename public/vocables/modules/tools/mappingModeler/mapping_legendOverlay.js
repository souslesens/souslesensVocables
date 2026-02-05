import LegendOverlayWidget from "../../uiWidgets/legendOverlayWidget.js";

/**
 * Mapping_legendOverlay
 * Mapping Modeler legend overlay config (categories/labels/order only).
 * Uses LegendOverlayWidget.attachVisjsGraph for automatic refresh on graph changes.
 */
var Mapping_legendOverlay = (function () {
    var self = {};

    self.containerId = null;
    self.visjsGraph = null;
    self.legendOptions = null;

    // Stable ordering for Mapping Modeler legend
    self.nodeOrder = ["Table", "Column", "VirtualColumn", "RowIndex", "Class", "superClass", "URI", "Node"];
    self.edgeOrder = ["ObjectProperty", "RdfType", "DatatypeProperty", "DatasourceLink", "TechnicalLink", "OtherRelation", "SystemDefault"];

    function getEdgeColorString(edge) {
        return LegendOverlayWidget.getColor(edge, "");
    }

    function normalizeColor(color) {
        return LegendOverlayWidget.normalizeColor(color);
    }

    /**
     * Compute node category for Mapping Modeler.
     * @param {Object} node
     * @returns {string}
     */
    self.getNodeCategory = function (node) {
        if (!node || !node.data) {
            return "Node";
        }
        return node.data.type ? String(node.data.type) : "Node";
    };

    /**
     * Compute edge category for Mapping Modeler.
     * @param {Object} edge
     * @param {Object<string,Object>} nodesByIdMap
     * @returns {string}
     */
    self.getEdgeCategory = function (edge, nodesByIdMap) {
        if (!edge) {
            return "SystemDefault";
        }

        var predicateType = edge.data ? edge.data.type : null;

        // rdf:type / rdfs:subClassOf
        if (predicateType === "rdf:type" || predicateType === "rdfs:subClassOf") {
            return "RdfType";
        }

        // DatatypeProperty (dashed)
        if (predicateType === "DatatypeProperty" || edge.dashes === true) {
            return "DatatypeProperty";
        }

        var color = normalizeColor(getEdgeColorString(edge));
        if (color === normalizeColor("#8f8a8c")) {
            return "DatasourceLink";
        }
        if (color === normalizeColor("#ef4270")) {
            return "TechnicalLink";
        }

        if (typeof predicateType === "string" && predicateType.indexOf("rdfs:") === 0) {
            return "OtherRelation";
        }

        if (predicateType) {
            return "ObjectProperty";
        }

        return "SystemDefault";
    };

    /**
     * Node label function for Mapping Modeler legend.
     * Signature follows LegendOverlayWidget.buildStateFromVisjsGraph(): (node, baseKey, variantKey, originalShape)
     *
     * @param {Object} _node
     * @param {string} baseKey
     * @returns {string}
     */
    self.getNodeLabel = function (_node, baseKey) {
        var map = {
            Table: "Table",
            Column: "Column",
            VirtualColumn: "VirtualColumn",
            RowIndex: "RowIndex",
            Class: "Class",
            superClass: "SuperClass",
            URI: "URI",
            Node: "Node",
        };
        return map[baseKey] || baseKey;
    };

    /**
     * Edge label function for Mapping Modeler legend.
     * @param {Object} _edge
     * @param {string} key
     * @returns {string}
     */
    self.getEdgeLabel = function (_edge, key) {
        var map = {
            ObjectProperty: "ObjectProperty (relation)",
            RdfType: "rdf:type / rdfs:subClassOf link",
            DatatypeProperty: "DatatypeProperty (dashed)",
            DatasourceLink: "Datasource (Table → Column)",
            TechnicalLink: "TechnicalLink",
            OtherRelation: "Other relation (e.g., rdfs:member)",
            SystemDefault: "System / default edge",
        };
        return map[key] || key;
    };

    /**
     * Initialize Mapping legend overlay and attach the VisjsGraphClass instance.
     * @param {string} containerId
     * @param {VisjsGraphClass} visjsGraph
     * @param {Object} options
     * @returns {void}
     */
    self.init = function (containerId, visjsGraph, options) {
        self.containerId = containerId || self.containerId;
        self.visjsGraph = visjsGraph || self.visjsGraph;
        self.legendOptions = options || self.legendOptions || {};

        LegendOverlayWidget.attachVisjsGraph(self.containerId, self.visjsGraph, {
            debounceMs: 50,
            runtimeOptions: self.legendOptions,
            renderOptions: {
                idPrefix: "mappingLegend",
                title: (self.legendOptions && self.legendOptions.title) || "📘 Legend",
                position: "top-right",
                initiallyExpanded: true,
                variant: "mapping",
                dynamicLegend: true,
                showDefaultSections: false,
            },
            buildOptions: {
                splitNodeByShape: false,
                legendTextShape: "dot",
                nodeKeyFn: self.getNodeCategory,
                nodeLabelFn: self.getNodeLabel,
                edgeKeyFn: self.getEdgeCategory,
                edgeLabelFn: self.getEdgeLabel,
                nodeOrder: self.nodeOrder,
                edgeOrder: self.edgeOrder,
            },
        });
    };

    /**
     * Force refresh (optional visjsGraph override for rebinding).
     * @param {VisjsGraphClass} [visjsGraph]
     * @returns {void}
     */
    self.refresh = function (visjsGraph) {
        if (visjsGraph) {
            self.visjsGraph = visjsGraph;
            self.init(self.containerId, self.visjsGraph, self.legendOptions);
            return;
        }
        if (!self.containerId) {
            return;
        }
        LegendOverlayWidget.refreshFromGraph(self.containerId);
    };

    /**
     * Destroy overlay instance.
     * @returns {void}
     */
    self.destroy = function () {
        if (!self.containerId) {
            return;
        }
        LegendOverlayWidget.detachVisjsGraph(self.containerId);
        LegendOverlayWidget.destroy(self.containerId);

        self.containerId = null;
        self.visjsGraph = null;
        self.legendOptions = null;
    };
    return self;
})();

export default Mapping_legendOverlay;
window.Mapping_legendOverlay = Mapping_legendOverlay;
