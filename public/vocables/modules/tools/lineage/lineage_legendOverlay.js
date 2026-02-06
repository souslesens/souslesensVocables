import LegendOverlayWidget from "../../uiWidgets/legendOverlayWidget.js";

var Lineage_legendOverlay = (function () {
    var self = {};

    self.containerId = null;
    self.visjsGraph = null;
    self.legendOptions = null;

    // Recommended stable orders for lineage categories
    self.nodeOrder = ["Source", "Container", "Class", "NamedIndividual", "Property", "DatatypeProperty", "bnode", "literal"];
    self.edgeOrder = ["ObjectProperty", "Hierarchy", "Domain", "Range", "Restriction", "Datatype", "DatatypeProperty", "InverseOf", "PropertyHierarchy", "RdfsMember", "SourceLink", "Other"];

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

        // Robust property detection in merged graphs:
        // - shape "box"
        // - light grey color "#ddd"
        // - data contains {id, label, source}
        if (
            node.shape === "box" &&
            node.data &&
            node.data.id &&
            node.data.label &&
            node.data.source &&
            LegendOverlayWidget.normalizeColor(LegendOverlayWidget.getColor(node, "")) === LegendOverlayWidget.normalizeColor("#ddd")
        ) {
            return "Property";
        }

        // NEW: If an ontology term id (BFO_/RO_) is tagged as NamedIndividual,
        // prefer Property when it matches the "property node" pattern.
        // Otherwise fall back to Class (split by source if available).
        if (node.data && node.data.rdfType === "NamedIndividual") {
            var lbl = node.label ? String(node.label).trim() : "";
            if (/^(BFO|RO)_\d+$/.test(lbl)) {
                var isPropertyNode =
                    node.shape === "box" &&
                    node.data &&
                    node.data.id &&
                    node.data.label &&
                    node.data.source &&
                    LegendOverlayWidget.normalizeColor(LegendOverlayWidget.getColor(node, "")) === LegendOverlayWidget.normalizeColor("#ddd");

                if (isPropertyNode) {
                    return "Property";
                }
                return node.data && node.data.source ? "Class:" + node.data.source : "Class";
            }
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
     *
     * @param {Object} edge
     * @param {Object<string,Object>} nodesByIdMap
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
            var edgeColor = LegendOverlayWidget.getColor(edge, "");
            var edgeColorNorm = LegendOverlayWidget.normalizeColor(edgeColor);
            var datatypeNorm = LegendOverlayWidget.normalizeColor(self.legendOptions && self.legendOptions.datatypeColor);

            var lbl = edge.label ? String(edge.label) : "";
            var looksLikeDatatype = lbl.indexOf("xsd:") === 0 || lbl.indexOf("http://www.w3.org/2001/XMLSchema#") === 0;

            if (datatypeNorm && edgeColorNorm === datatypeNorm && looksLikeDatatype) {
                return "Datatype";
            }
        }

        // InverseOf edges: dashed + blue (#0067bb) + no label + endpoints are Property
        if (nodesByIdMap && edge.dashes) {
            var invColor = LegendOverlayWidget.getColor(edge, "");
            var invColorNorm = LegendOverlayWidget.normalizeColor(invColor);
            var inverseOfNorm = LegendOverlayWidget.normalizeColor((self.legendOptions && self.legendOptions.inverseOfColor) || "#0067bb");

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
            var edgeColor2 = LegendOverlayWidget.getColor(edge, "");
            var edgeColorNorm2 = LegendOverlayWidget.normalizeColor(edgeColor2);
            var restrictionNorm = LegendOverlayWidget.normalizeColor(self.legendOptions && self.legendOptions.restrictionColor);
            var datatypeNorm2 = LegendOverlayWidget.normalizeColor(self.legendOptions && self.legendOptions.datatypeColor);

            if (restrictionNorm && edgeColorNorm2 === restrictionNorm) {
                return "Restriction";
            }
            if (datatypeNorm2 && edgeColorNorm2 === datatypeNorm2) {
                return "DatatypeProperty";
            }
            return "DatatypeProperty";
        }

        // 3) Source/import links (UI-level)
        if (!edge.label && edge.width && edge.width >= 5) {
            return "SourceLink";
        }

        // rdfs:member-like container membership edges: pink, solid, no label, involving a Container node.
        if (nodesByIdMap && !edge.label && !edge.dashes) {
            var memberColor = LegendOverlayWidget.getColor(edge, "");
            var memberColorNorm = LegendOverlayWidget.normalizeColor(memberColor);
            var rdfsMemberNorm = LegendOverlayWidget.normalizeColor((self.legendOptions && self.legendOptions.rdfsMemberColor) || "#e7a1be");

            if (memberColorNorm === rdfsMemberNorm) {
                var fromNode2 = nodesByIdMap[edge.from];
                var toNode2 = nodesByIdMap[edge.to];
                if (fromNode2 && toNode2) {
                    var fromCat2 = self.getNodeCategory(fromNode2);
                    var toCat2 = self.getNodeCategory(toNode2);
                    if (fromCat2 === "Container" || toCat2 === "Container") {
                        return "RdfsMember";
                    }
                }
            }
        }

        // Property hierarchy (subPropertyOf): grey (#aaa), no label, arrow-from, both endpoints are Property nodes.
        if (nodesByIdMap && !edge.label && edge.arrows && edge.arrows.from && edge.arrows.from.enabled && !edge.dashes) {
            var edgeColor3 = LegendOverlayWidget.getColor(edge, "");
            var edgeColorNorm3 = LegendOverlayWidget.normalizeColor(edgeColor3);
            var defaultEdgeNorm = LegendOverlayWidget.normalizeColor("#aaa");

            if (edgeColorNorm3 === defaultEdgeNorm) {
                var fromNode3 = nodesByIdMap[edge.from];
                var toNode3 = nodesByIdMap[edge.to];
                if (fromNode3 && toNode3) {
                    var fromCat3 = self.getNodeCategory(fromNode3);
                    var toCat3 = self.getNodeCategory(toNode3);
                    if (fromCat3 === "Property" && toCat3 === "Property") {
                        return "PropertyHierarchy";
                    }
                }
            }
        }

        // 4) Default category
        return "ObjectProperty";
    };

    /**
     * Node label function for lineage legend.
     * Signature: (node, baseKey, variantKey, originalShape)
     *
     * @param {Object} _node
     * @param {string} baseKey
     * @param {string} variantKey
     * @param {string} shape
     * @returns {string}
     */
    self.getNodeLabel = function (_node, baseKey, variantKey, shape) {
        var actualShape = shape;

        // Safety: if shape is missing but variantKey has "\nshape", extract it
        if (!actualShape && typeof variantKey === "string" && variantKey.indexOf("\n") > -1) {
            actualShape = variantKey.split("\n")[1];
        }

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

        if (actualShape === "text") {
            label += " (text)";
        }

        return label;
    };

    /**
     * Edge label function for lineage legend.
     * @param {Object} _edge
     * @param {string} key
     * @returns {string}
     */
    self.getEdgeLabel = function (_edge, key) {
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
    };

    /**
     * Apply lineage-specific state overrides after state is built.
     * @param {Object} state
     * @param {Object} options
     * @returns {void}
     */
    self.applyStateOverrides = function (state, options) {
        if (!state || !state.nodeTypeStyles) return;

        var containerColor = (options && options.containerColor) || "#efbf00";

        Object.keys(state.nodeTypeStyles).forEach(function (key) {
            // With splitNodeByShape enabled, keys can be "Container\nbox"
            if (key === "Container" || key.indexOf("Container\n") === 0) {
                if (state.nodeTypeStyles[key] && state.nodeTypeStyles[key].color === "#999") {
                    state.nodeTypeStyles[key].color = containerColor;
                    state.nodeTypeStyles[key].colors = [containerColor];
                }
            }
        });
    };

    /**
     * Initialize lineage legend overlay and attach the VisjsGraphClass instance.
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
                title: (self.legendOptions && self.legendOptions.title) || "📘 Legend",
                position: "top-right",
                initiallyExpanded: false,
                dynamicLegend: true,
                showDefaultSections: false,
                variant: "lineage",
            },
            buildOptions: {
                splitNodeByShape: true,
                legendTextShape: "dot",
                nodeKeyFn: self.getNodeCategory,
                nodeLabelFn: self.getNodeLabel,
                edgeKeyFn: self.getEdgeCategory,
                edgeLabelFn: self.getEdgeLabel,
                nodeOrder: self.nodeOrder,
                edgeOrder: self.edgeOrder,
            },
            applyStateOverrides: function (state, runtimeOptions) {
                self.applyStateOverrides(state, runtimeOptions);
            },
        });
    };

    /**
     * Force a refresh (optional visjsGraph override for rebinding).
     * @param {VisjsGraphClass} [visjsGraph]
     * @returns {void}
     */
    self.refresh = function (visjsGraph) {
        if (visjsGraph) {
            self.visjsGraph = visjsGraph;
            // Re-attach will rebind if graph instance changed
            self.init(self.containerId, self.visjsGraph, self.legendOptions);
            return;
        }
        if (!self.containerId) return;
        LegendOverlayWidget.refreshFromGraph(self.containerId);
    };

    /**
     * Destroy the legend overlay instance and detach graph events.
     * @returns {void}
     */
    self.destroy = function () {
        if (!self.containerId) return;

        LegendOverlayWidget.detachVisjsGraph(self.containerId);
        LegendOverlayWidget.destroy(self.containerId);

        self.containerId = null;
        self.visjsGraph = null;
        self.legendOptions = null;
    };

    return self;
})();

export default Lineage_legendOverlay;
window.Lineage_legendOverlay = Lineage_legendOverlay;
