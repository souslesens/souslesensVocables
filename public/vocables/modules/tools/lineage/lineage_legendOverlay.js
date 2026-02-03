import LegendOverlayWidget from "../../uiWidgets/legendOverlayWidget.js";
import GraphLegendStateBuilder from "../../uiWidgets/graphLegendStateBuilder.js";

var Lineage_legendOverlay = (function () {
    var self = {};
    self.containerId = null;
    self.visjsGraph = null;
    self.legendOptions = null;

    // Auto-refresh internals (no logs)
    self._boundVisDataHandler = null;
    self._refreshTimer = null;

    /**
     * Debounced refresh to avoid flooding during bulk graph updates.
     * @returns {void}
     */
    self.scheduleRefresh = function () {
        if (self._refreshTimer) {
            clearTimeout(self._refreshTimer);
        }
        self._refreshTimer = setTimeout(function () {
            self._refreshTimer = null;
            self.refresh();
        }, 50);
    };

    /**
     * Bind vis.js DataSet events to keep legend always in sync.
     * @param {VisjsGraphClass} visjsGraph
     * @returns {void}
     */
    self.bindGraphEvents = function (visjsGraph) {
        self.unbindGraphEvents();

        if (!visjsGraph || !visjsGraph.data || !visjsGraph.data.nodes || !visjsGraph.data.edges) {
            return;
        }

        self._boundVisDataHandler = function () {
            self.scheduleRefresh();
        };

        ["add", "update", "remove"].forEach(function (eventName) {
            visjsGraph.data.nodes.on(eventName, self._boundVisDataHandler);
            visjsGraph.data.edges.on(eventName, self._boundVisDataHandler);
        });
    };

    /**
     * Unbind previously registered DataSet events.
     * @returns {void}
     */
    self.unbindGraphEvents = function () {
        if (!self.visjsGraph || !self._boundVisDataHandler || !self.visjsGraph.data) {
            self._boundVisDataHandler = null;
            return;
        }

        ["add", "update", "remove"].forEach(function (eventName) {
            self.visjsGraph.data.nodes.off(eventName, self._boundVisDataHandler);
            self.visjsGraph.data.edges.off(eventName, self._boundVisDataHandler);
        });

        self._boundVisDataHandler = null;
    };

    /**
     * Normalize a hex color for comparison (remove leading #, lowercase).
     * @param {string} color
     * @returns {string}
     */
    self.normalizeColor = function (color) {
        if (!color) {
            return "";
        }
        var str = String(color).trim().toLowerCase();
        if (str.indexOf("#") === 0) {
            str = str.substring(1);
        }
        return str;
    };

        /**
     * Ensure the legend overlay DOM exists in the container.
     * If the graph container was emptied, the overlay DOM is lost and must be re-rendered.
     * @returns {void}
     */
    self.ensureOverlayRendered = function () {
    if (!self.containerId) {
        return;
    }
    var container = document.getElementById(self.containerId);
    if (!container) {
        return;
    }

    // Try to detect the overlay root element (adapt selectors if your widget uses another class)
    var hasOverlay =
        container.querySelector(".legendOverlayWidget") ||
        container.querySelector("[data-legend-overlay]");

    if (hasOverlay) {
        return;
    }

    // Re-render overlay with same options as init()
    LegendOverlayWidget.render(self.containerId, {
        title: (self.legendOptions && self.legendOptions.title) || "📘 Legend",
        position: "top-right",
        initiallyExpanded: true,
        dynamicLegend: true,
        showDefaultSections: false,
        variant: "lineage",
    });
    };

    /**
     * Initialize the legend overlay in the graph container.
     * @param {string} containerId
     * @param {VisjsGraphClass} visjsGraph
     * @param {Object} options
     * @param {string} [options.title] - Legend button label
     * @param {string} [options.restrictionColor] - Lineage restriction edge color (e.g. "#efbf00")
     * @param {string} [options.datatypeColor] - Lineage datatype edge color (e.g. "#8F8F8F")
     * @returns {void}
     */
    self.init = function (containerId, visjsGraph, options) {
        self.containerId = containerId || "graphDiv";
        self.visjsGraph = visjsGraph || self.visjsGraph;
        self.legendOptions = options || self.legendOptions || {};

        LegendOverlayWidget.render(self.containerId, {
            title: self.legendOptions.title || "📘 Legend",
            position: "top-right",
            initiallyExpanded: true,
            dynamicLegend: true,
            showDefaultSections: false,
            variant: "lineage",
        });

        self.bindGraphEvents(self.visjsGraph);
        self.refresh();
    };

    /**
     * Compute the node category for Lineage.
     * @param {Object} node
     * @returns {string}
     */
    self.getNodeCategory = function (node) {
        if (!node) {
            return "Class";
        }
        if (node.data && node.data.type === "container") {
            return "Container";
        }
        // DatatypeProperty nodes (drawDataTypeProperties uses shape "box")
        if (node.data && node.data.type === "DatatypeProperty") {
            return "DatatypeProperty";
        }
        // Source nodes: in drawTopConcepts source nodes have id === data.source
        if ((node.shape === "box" || node.shape === "square") && node.data && node.id === node.data.source) {
            return "Source";
        }

        // Property nodes (ellipses / predicate nodes)
        if (node.data && node.data.varName === "prop") {
            return "Property";
        }

        // Property nodes created by Lineage_properties graphs (robust detection):
        // - usually shape "box"
        // - usually light grey color "#ddd"
        // - data contains {id, label, source}
        // We avoid relying on font/subProperties because they may be missing depending on how nodes were merged/updated.
        if (
            node.shape === "box" &&
            node.data &&
            node.data.id &&
            node.data.label &&
            node.data.source &&
            self.normalizeColor(GraphLegendStateBuilder.getColor(node, "")) === self.normalizeColor("#ddd")
            ) {
            return "Property";
        }

        // Typed nodes (when rdfType/type is provided)
        var type = node.data && (node.data.rdfType || node.data.type);
        if (type) {
            type = String(type);

            if (type.indexOf("NamedIndividual") > -1) {
                return "NamedIndividual";
            }
            if (type.indexOf("Property") > -1) {
                return "Property";
            }
            if (type.indexOf("Class") > -1) {
                // Optional: split class by source (only if source exists)
                if (node.data && node.data.source) {
                    return "Class:" + node.data.source;
                }
                return "Class";
            }
            if (type === "bnode") {
                return "bnode";
            }
            if (type === "literal") {
                return "literal";
            }
            return type;
        }

        // Untyped nodes: treat as Class, optionally split by source
        if (node.data && node.data.source) {
            return "Class:" + node.data.source;
        }
        return "Class";
    };

    /**
     * Compute the edge category for Lineage (categories only).
     * Priority: semantic data > visual style.
     * @param {Object} edge
     * @returns {string}
     */
    self.getEdgeCategory = function (edge, nodesByIdMap) {
        if (!edge) {
            return "Other";
        }

        if (edge.label === "D" || (edge.id && String(edge.id).indexOf("_domain_") > -1)) {
            return "Domain";
        }
        if (edge.label === "R" || (edge.id && String(edge.id).indexOf("_range_") > -1)) {
            return "Range";
        }

        // 1) Semantic markers
        if (edge.data) {
            if (edge.data.bNodeId) {
                return "Restriction";
            }
            if (edge.data.type === "parent") {
                return "Hierarchy";
            }
            if (edge.data.type === "DatatypeProperty") {
                return "DatatypeProperty";
            }
            if (edge.data.type === "ObjectProperty") {
                return "ObjectProperty";
            }
        }
        // 2) Specific datatype edges: dashed + datatypeColor + label looks like an XSD type
        if (edge.dashes) {
            var edgeColor = GraphLegendStateBuilder.getColor(edge, "");
            var edgeColorNorm = self.normalizeColor(edgeColor);
            var datatypeNorm = self.normalizeColor(self.legendOptions && self.legendOptions.datatypeColor);

            var lbl = edge.label ? String(edge.label) : "";
            // typical values: "xsd:float", "xsd:dateTime", etc.
            var looksLikeDatatype = lbl.indexOf("xsd:") === 0 || lbl.indexOf("http://www.w3.org/2001/XMLSchema#") === 0;

            if (datatypeNorm && edgeColorNorm === datatypeNorm && looksLikeDatatype) {
                return "Datatype";
            }
        }

        // InverseOf edges (property <-> inverse property): dashed + blue (#0067bb) + no label + endpoints are Property
        if (nodesByIdMap && edge.dashes) {
            var invColor = GraphLegendStateBuilder.getColor(edge, "");
            var invColorNorm = self.normalizeColor(invColor);
            var inverseOfNorm = self.normalizeColor((self.legendOptions && self.legendOptions.inverseOfColor) || "#0067bb");

            if (invColorNorm === inverseOfNorm && !edge.label) {
                var fromNode = nodesByIdMap[edge.from];
                var toNode = nodesByIdMap[edge.to];
                if (fromNode && toNode) {
                var fromCat = self.getNodeCategory(fromNode);
                var toCat = self.getNodeCategory(toNode);
                if (fromCat === "Property" && toCat === "Property") {
                    return "InverseOf";
                }
                }
            }
        }
        // 2) Visual fallback (dashes + color)
        var isDashed = edge.dashes ? true : false;
        if (isDashed) {
            var edgeColor = GraphLegendStateBuilder.getColor(edge, "");
            var edgeColorNorm = self.normalizeColor(edgeColor);
            var restrictionNorm = self.normalizeColor(self.legendOptions && self.legendOptions.restrictionColor);
            var datatypeNorm = self.normalizeColor(self.legendOptions && self.legendOptions.datatypeColor);

            if (restrictionNorm && edgeColorNorm === restrictionNorm) {
                return "Restriction";
            }
            if (datatypeNorm && edgeColorNorm === datatypeNorm) {
                return "DatatypeProperty";
            }
            return "DatatypeProperty";
        }

        // 3) Source/import links (UI-level)
        if (!edge.label && edge.width && edge.width >= 5) {
            return "SourceLink";
        }
        // rdfs:member-like container membership edges: pink, solid, no label, involving a Container node.
        // NOTE: This is a fallback heuristic because the predicate URI is not stored on the edge (edge.data.prop is undefined).
        if (nodesByIdMap && !edge.label && !edge.dashes) {
        var memberColor = GraphLegendStateBuilder.getColor(edge, "");
        var memberColorNorm = self.normalizeColor(memberColor);
        var rdfsMemberNorm = self.normalizeColor((self.legendOptions && self.legendOptions.rdfsMemberColor) || "#e7a1be");

        if (memberColorNorm === rdfsMemberNorm) {
            var fromNode = nodesByIdMap[edge.from];
            var toNode = nodesByIdMap[edge.to];
            if (fromNode && toNode) {
            var fromCat = self.getNodeCategory(fromNode);
            var toCat = self.getNodeCategory(toNode);
            if (fromCat === "Container" || toCat === "Container") {
                return "RdfsMember";
            }
            }
        }
        }
        // Property hierarchy (subPropertyOf): grey edge (#aaa), no label, arrow-from, and both endpoints are Property nodes.
        if (
            nodesByIdMap &&
            !edge.label &&
            edge.arrows &&
            edge.arrows.from &&
            edge.arrows.from.enabled &&
            !edge.dashes
            ) {
            var edgeColor2 = GraphLegendStateBuilder.getColor(edge, "");
            var edgeColorNorm2 = self.normalizeColor(edgeColor2);
            var defaultEdgeNorm2 = self.normalizeColor("#aaa");

            if (edgeColorNorm2 === defaultEdgeNorm2) {
                var fromNode = nodesByIdMap[edge.from];
                var toNode = nodesByIdMap[edge.to];
                if (fromNode && toNode) {
                var fromCat = self.getNodeCategory(fromNode);
                var toCat = self.getNodeCategory(toNode);
                if (fromCat === "Property" && toCat === "Property") {
                    return "PropertyHierarchy";
                }
                }
            }
        }

        // 4) Default category
        return "ObjectProperty";
    };

    /**
     * Refresh legend content by inspecting the current graph.
     * @param {VisjsGraphClass} [visjsGraph]
     * @returns {void}
     */
    self.refresh = function (visjsGraph) {
        if (visjsGraph) {
            // If graph instance changes, rebind events to the new datasets
            if (visjsGraph !== self.visjsGraph) {
                self.visjsGraph = visjsGraph;
                self.bindGraphEvents(self.visjsGraph);
            } else {
                self.visjsGraph = visjsGraph;
            }
        }

        if (!self.containerId || !self.visjsGraph) {
            return;
        }

        try {
            var state = GraphLegendStateBuilder.buildState(self.visjsGraph, {
                splitNodeByShape: true,
                legendTextShape: "dot",
                nodeKeyFn: self.getNodeCategory,
                nodeLabelFn: function (_node, keyOrBaseKey, variantKey, shape) {
                // Support both signatures:
                // - old: (node, key)
                // - new: (node, baseKey, variantKey, shape)

                var baseKey = keyOrBaseKey;
                var actualShape = shape;

                // If variantKey is provided and contains "|", extract shape from it
                if (!actualShape && typeof variantKey === "string" && variantKey.indexOf("|") > -1) {
                    baseKey = variantKey.split("|")[0];
                    actualShape = variantKey.split("|")[1];
                }

                // If only key is provided and contains "|", extract shape from it
                if (!actualShape && typeof baseKey === "string" && baseKey.indexOf("|") > -1) {
                    actualShape = baseKey.split("|")[1];
                    baseKey = baseKey.split("|")[0];
                }

                // Human labels
                var label;
                if (baseKey && baseKey.indexOf("Class:") === 0) {
                    label = "Class (" + baseKey.substring("Class:".length) + ")";
                } else {
                    var map = {
                    Source: "Source",
                    Container: "Container",
                    Class: "Class",
                    DatatypeProperty: "DatatypeProperty",
                    Property: "Property (predicate)",
                    NamedIndividual: "NamedIndividual",
                    bnode: "Blank node",
                    literal: "Literal",
                    };
                    label = map[baseKey] || baseKey;
                }

                // Append shape so duplicates are understandable
                if (actualShape === "text") {
                    label += " (text)";
                }
                return label;
                },
                edgeKeyFn: self.getEdgeCategory,
                edgeLabelFn: function (_edge, key) {
                    var map = {
                        ObjectProperty: "Relation (ObjectProperty)",
                        Hierarchy: "Hierarchy (parent/subClassOf)",
                        Domain: "Domain (D)",
                        Range: "Range (R)",
                        Restriction: "Restriction",
                        DatatypeProperty: "DatatypeProperty",
                        Datatype: "Datatype",
                        SourceLink: "Source / import link",
                        PropertyHierarchy: "Hierarchy (subPropertyOf)",
                        InverseOf: "InverseOf",
                        RdfsMember: "rdfs:member",
                        Other: "Other",
                    };
                    return map[key] || key;
                },
            });
            // If container nodes do not carry a color (node.color is undefined),
            // align legend with the UI convention used in container graphs (yellow).
            if (state.nodeTypeStyles) {
                var containerColor = (self.legendOptions && self.legendOptions.containerColor) || "#efbf00";

                // With splitNodeByShape enabled, container keys are typically "Container\n<shape>" (or "Container|<shape>")
                Object.keys(state.nodeTypeStyles).forEach(function (key) {
                    if (key === "Container" || key.indexOf("Container\n") === 0 || key.indexOf("Container|") === 0) {
                    // Only override if builder fell back to default grey
                    if (state.nodeTypeStyles[key] && state.nodeTypeStyles[key].color === "#999") {
                        state.nodeTypeStyles[key].color = containerColor;
                        state.nodeTypeStyles[key].colors = [containerColor];
                    }
                    }
                });
            }

            self.ensureOverlayRendered();
            LegendOverlayWidget.update(self.containerId, state);
        } catch (e) {
            console.error("Legend refresh failed", e);
        }
    };

    /**
     * Destroy the legend overlay instance.
     * @returns {void}
     */
    self.destroy = function () {
        if (!self.containerId) {
            return;
        }
        if (self._refreshTimer) {
            clearTimeout(self._refreshTimer);
            self._refreshTimer = null;
        }
        self.unbindGraphEvents();
        LegendOverlayWidget.destroy(self.containerId);
        self.containerId = null;
        self.visjsGraph = null;
        self.legendOptions = null;
    };

    return self;
})();

export default Lineage_legendOverlay;
window.Lineage_legendOverlay = Lineage_legendOverlay;
