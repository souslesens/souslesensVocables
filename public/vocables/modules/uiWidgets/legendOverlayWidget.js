/**
 * LegendOverlayWidget
 *
 * Purpose:
 * - Render an informative legend overlay (DOM-based) with an internal toggle (open/close).
 * - Provide a common base legend (Nodes/Edges) and optional variant-specific sections
 *   (e.g., Implicit Model: "Columns (color = table)").
 *
 * Standards alignment:
 *
 * - Module pattern with self methods and dual export.
 * - HTML is built progressively with '+=' for clarity.
 */
var LegendOverlayWidget = (function () {
    var self = {};

    /**
     * Internal instances map keyed by containerId.
     * @type {Object<string, {expanded:boolean, ids:Object, options:Object}>}
     */
    self.instances = {};

    /**
     * Default visual constants used by the legend.
     * Consumers may override colors through options.items if needed.
     * @type {Object}
     */
    self.defaultColors = {
        node: {
            Class: "#00AFEF",
            Column: "#CB9801",
            Table: "#D8CACD",
            URI: "#BC7DEC",
            DatatypeProperty: "#9B59B6",
        },
        edge: {
            ObjectProperty: "#409304",
            OtherRelation: "#333333",
            RdfType: "#00AFEF",
            SystemDefault: "#CCCCCC",
            DatatypeProperty: "#9B59B6",
            DatasourceLink: "#8F8A8C",
            TechnicalLink: "#EF4270",
        },
    };

    /**
     * -----------------------------
     * Vis.js legend state builder
     * -----------------------------
     * Purpose:
     * - Inspect a VisjsGraphClass instance and build a dynamic legend state
     *   compatible with LegendOverlayWidget.update().
     * - Keep this logic inside the widget so external overlays only provide
     *   config (category/labels/order/overrides).
     */

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
     * Build a dynamic legend state by inspecting a VisjsGraphClass instance.
     *
     * @param {VisjsGraphClass} visjsGraph - VisjsGraphClass instance
     * @param {Object} options
     * @param {boolean} [options.splitNodeByShape] - if true, split node categories by shape (key becomes "Type\nshape")
     * @param {string} [options.legendTextShape="dot"] - legend icon for text nodes
     * @param {function(Object):string} [options.nodeKeyFn] - category key for nodes
     * @param {function(Object,string,string,string):string} [options.nodeLabelFn] - display label (node, baseKey, variantKey, originalShape)
     * @param {function(Object,Object<string,Object>):string} [options.edgeKeyFn] - category key for edges (edge, nodesByIdMap)
     * @param {function(Object,string):string} [options.edgeLabelFn] - display label for edges
     * @param {Array<string>} [options.nodeOrder] - preferred order for node categories
     * @param {Array<string>} [options.edgeOrder] - preferred order for edge categories
     * @returns {Object} state compatible with LegendOverlayWidget.update()
     */
    self.buildStateFromVisjsGraph = function (visjsGraph, options) {
        options = options || {};
        var splitNodeByShape = options.splitNodeByShape === true;

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
        var nodesByIdMap = {};

        nodes.forEach(function (node) {
            if (!node || !node.id) return;
            nodesByIdMap[node.id] = node;
        });

        nodes.forEach(function (node) {
            if (!self.isVisibleNode(node)) return;

            visibleNodeIdsMap[node.id] = true;

            var categoryKey = options.nodeKeyFn ? options.nodeKeyFn(node) : (node.data && (node.data.rdfType || node.data.type)) || node.shape || "Node";

            categoryKey = String(categoryKey);

            var color = self.getColor(node, "#999");
            var originalShape = node.shape || "dot";

            var keyForLegend = splitNodeByShape ? categoryKey + "\n" + originalShape : categoryKey;

            var legendShape = originalShape;
            if (legendShape === "text") {
                legendShape = options.legendTextShape || "dot";
            }

            var label = options.nodeLabelFn ? options.nodeLabelFn(node, categoryKey, keyForLegend, originalShape) : categoryKey;

            if (!state.nodeTypeStyles[keyForLegend]) {
                state.nodeTypeStyles[keyForLegend] = {
                    color: color,
                    colors: [color],
                    shape: legendShape,
                    classLabel: label,
                    type: categoryKey,
                };
            } else {
                var typeStyle = state.nodeTypeStyles[keyForLegend];
                if (!typeStyle.colors) {
                    typeStyle.colors = [typeStyle.color];
                }
                if (typeStyle.colors.indexOf(color) < 0) {
                    typeStyle.colors.push(color);
                }
            }
        });

        edges.forEach(function (edge) {
            if (!self.isVisibleEdge(edge, visibleNodeIdsMap)) return;

            var edgeCategoryKey = options.edgeKeyFn
                ? options.edgeKeyFn.length >= 2
                    ? options.edgeKeyFn(edge, nodesByIdMap)
                    : options.edgeKeyFn(edge)
                : (edge.data && (edge.data.type || edge.data.propLabel)) || edge.label || "Edge";

            edgeCategoryKey = String(edgeCategoryKey);

            if (!state.edgeCatStyles[edgeCategoryKey]) {
                var eColor = self.getColor(edge, "#aaa");
                var dashed = edge.dashes ? true : false;

                var eLabel = options.edgeLabelFn ? options.edgeLabelFn(edge, edgeCategoryKey) : edgeCategoryKey;

                state.edgeCatStyles[edgeCategoryKey] = {
                    color: eColor,
                    dashed: dashed,
                    label: eLabel,
                };
            }
        });

        // Default orders (can be overridden by caller)
        var nodeOrder = options.nodeOrder || ["Source", "Class", "NamedIndividual", "Property", "bnode", "literal"];

        var edgeOrder = options.edgeOrder || ["ObjectProperty", "Hierarchy", "PropertyHierarchy", "Restriction", "Datatype", "DatatypeProperty", "SourceLink", "Other"];

        state.nodeTypeStyles = self.sortByOrder(state.nodeTypeStyles, nodeOrder);
        state.edgeCatStyles = self.sortByOrder(state.edgeCatStyles, edgeOrder);

        return state;
    };

    /**
     * Build a safe suffix for DOM ids based on a containerId.
     * @param {string} containerId
     * @returns {string}
     */
    self.getSafeIdSuffix = function (containerId) {
        if (!containerId) {
            return "legend";
        }
        return String(containerId).replace(/[^a-zA-Z0-9_\-]/g, "_");
    };

    /**
     * Minimal HTML escaping for user-controlled strings.
     * @param {string} str
     * @returns {string}
     */
    self.escapeHtml = function (str) {
        return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
    };

    /**
     * Get default legend item definitions.
     * @returns {{nodes:Array, edges:Array}}
     */
    self.getDefaultItems = function () {
        return {
            nodes: [
                { type: "Class", label: "Class", color: self.defaultColors.node.Class, swatch: "box" },
                { type: "Column", label: "Column", color: self.defaultColors.node.Column, swatch: "box" },
                { type: "Table", label: "Table", color: self.defaultColors.node.Table, swatch: "box" },
                { type: "URI", label: "URI", color: self.defaultColors.node.URI, swatch: "box" },
            ],
            edges: [
                { cat: "ObjectProperty", label: "ObjectProperty (relation)", color: self.defaultColors.edge.ObjectProperty, swatch: "line" },
                { cat: "OtherRelation", label: "Other relation (e.g., rdfs:member)", color: self.defaultColors.edge.OtherRelation, swatch: "line" },
                { cat: "RdfType", label: "rdf:type / rdfs:subClassOf link", color: self.defaultColors.edge.RdfType, swatch: "line" },
                { cat: "SystemDefault", label: "System / default edge", color: self.defaultColors.edge.SystemDefault, swatch: "line" },
                { cat: "DatasourceLink", label: "Datasource (Table → Column)", color: self.defaultColors.edge.DatasourceLink, swatch: "line" },
                { cat: "DatatypeProperty", label: "DatatypeProperty (dashed)", color: self.defaultColors.edge.DatatypeProperty, swatch: "dashed" },
            ],
        };
    };

    /**
     * Compute the DOM ids used by an instance.
     * @param {string} containerId
     * @param {Object} options
     * @returns {Object}
     */
    self.getInstanceIds = function (containerId, options) {
        var suffix = self.getSafeIdSuffix(containerId);
        var prefix = options && options.idPrefix ? String(options.idPrefix) : "legend";
        var wrapId = prefix + "_wrapper_" + suffix;
        return {
            wrapperId: wrapId,
            buttonId: prefix + "_toggleBtn_" + suffix,
            panelId: prefix + "_panel_" + suffix,
            extraSlotId: prefix + "_extraSlot_" + suffix,
        };
    };

    /**
     * Render the legend overlay inside the given container.
     *
     * @param {string} containerId - DOM id of the container element.
     * @param {Object} options
     * @param {string} [options.title="Legend"] - Button label.
     * @param {boolean} [options.initiallyExpanded=true] - Initial open/closed state.
     * @param {string} [options.variant="default"] - Variant name (e.g., mapping, implicit, lineage).
     * @param {string} [options.position="top-right"] - Overlay position.
     * @param {Object} [options.items] - Optional override for legend items.
     * @returns {void}
     */
    self.render = function (containerId, options) {
        if (!containerId) {
            return;
        }
        if (!options) {
            options = {};
        }

        var container = document.getElementById(containerId);
        if (!container) {
            return;
        }

        var ids = self.getInstanceIds(containerId, options);

        // Prevent duplicates
        if (container.querySelector("#" + ids.wrapperId)) {
            return;
        }

        // Ensure container is positioned
        if (!container.style.position || container.style.position === "") {
            container.style.position = "relative";
        }

        var expanded = options.initiallyExpanded !== undefined ? options.initiallyExpanded : true;
        var title = options.title ? String(options.title) : "🔍 Legend";

        var items = options.items ? options.items : self.getDefaultItems();

        var showDefaultSections = options.showDefaultSections !== undefined ? options.showDefaultSections : true;

        var html = "";

        html += "<div id='" + ids.wrapperId + "'";
        html += " style='position:absolute; z-index:1;";
        html += self.getPositionStyle(options.position);
        html += "'>";

        html += "<button id='" + ids.buttonId + "' type='button'";
        html += " data-legend-container='" + self.escapeHtml(containerId) + "'";
        html += " style='cursor:pointer; border:1px solid #ddd; background:#fff;";
        html += " border-radius:8px; padding:6px 10px; font-size:12px;";
        html += " box-shadow:0 2px 10px rgba(0,0,0,0.08); margin-bottom:6px;'>";
        html += self.escapeHtml(title);
        html += "</button>";

        html += "<div id='" + ids.panelId + "'";
        html += " style='background:#fff; border:1px solid #ddd; border-radius:8px;";
        html += " padding:10px 12px; font-size:12px;";
        html += " box-shadow:0 2px 10px rgba(0,0,0,0.08); min-width:260px;";
        html += " display:" + (expanded ? "block" : "none") + ";'>";

        if (showDefaultSections) {
            html += self.buildNodesSectionHtml(items.nodes);
            html += self.buildEdgesSectionHtml(items.edges);
        }
        // Variant-specific slot (initially empty; may be filled by update())
        html += "<div id='" + ids.extraSlotId + "' data-legend-slot='extra'></div>";

        html += "</div>"; // panel
        html += "</div>"; // wrapper

        container.insertAdjacentHTML("beforeend", html);

        self.instances[containerId] = {
            expanded: expanded,
            ids: ids,
            options: options,
        };

        self.bindToggle(containerId);
    };

    /**
     * Update legend visibility and optional variant content.
     *
     * @param {string} containerId
     * @param {Object} state
     * @param {Object<string, boolean>} [state.nodeTypesPresent]
     * @param {Object<string, boolean>} [state.edgeCatsPresent]
     * @param {Object<string, string>} [state.tableColors] - For implicit variant: map tableName -> color.
     * @returns {void}
     */
    self.update = function (containerId, state) {
        if (!containerId) {
            return;
        }
        var instance = self.instances[containerId];
        if (!instance) {
            return;
        }
        var ids = instance.ids;
        var panel = document.getElementById(ids.panelId);
        if (!panel) {
            return;
        }

        if (!state) {
            state = {};
        }

        self.applyRowVisibility(panel, state);
        self.applyRowStyles(panel, state);
        self.updateExtraSlot(containerId, state);
    };

    /**
     * Show or hide the legend wrapper.
     * @param {string} containerId
     * @param {boolean} visible
     * @returns {void}
     */
    self.setVisible = function (containerId, visible) {
        var instance = self.instances[containerId];
        if (!instance) {
            return;
        }
        var wrapper = document.getElementById(instance.ids.wrapperId);
        if (!wrapper) {
            return;
        }
        wrapper.style.display = visible ? "block" : "none";
    };

    /**
     * Internal map for dialog auto-hide bindings, keyed by "containerId::namespace".
     * Stores handler references to unbind precisely.
     * @type {Object<string, {ns:string, onOpen:function, onClose:function}>}
     */
    self._autoHideBindings = self._autoHideBindings || {};

    /**
     * Install legend auto-hide when jQuery UI dialogs open/close.
     * - If ignoreDialogIds is empty: hide when ANY dialog is visible.
     * - If ignoreDialogIds is provided: ignore those dialog content ids (host dialogs),
     *   and hide only when another dialog is visible.
     *
     * Idempotent per (containerId + namespace).
     *
     * @param {string} containerId
     * @param {Object} [options]
     * @param {Array<string>} [options.ignoreDialogIds] Dialog content ids to ignore (e.g. ["mainDialogDiv"]).
     * @param {string} [options.namespace] jQuery event namespace suffix.
     * @returns {void}
     */
    self.installAutoHideOnDialogs = function (containerId, options) {
        if (!containerId) {
            return;
        }

        options = options || {};

        // jQuery UI dialogs required
        if (!window.$ || !$.fn || !$.fn.dialog) {
            return;
        }

        var ignoreDialogIds = Array.isArray(options.ignoreDialogIds) ? options.ignoreDialogIds : [];
        // Default namespace: unique per container to avoid collisions across tools
        var ns = options.namespace ? String(options.namespace) : "legendAutoHide_" + self.getSafeIdSuffix(containerId);

        var key = containerId + "::" + ns;
        if (self._autoHideBindings[key]) {
            return;
        }

        function isIgnoredDialog($dlg) {
            if (!ignoreDialogIds || ignoreDialogIds.length === 0) {
                return false;
            }
            var id = $dlg && $dlg.attr ? $dlg.attr("id") : null;
            if (!id) {
                return false;
            }
            return ignoreDialogIds.indexOf(id) > -1;
        }

        function refreshLegendVisibility() {
            var anyDialogOpen = false;

            $(".ui-dialog-content").each(function () {
                var $dlg = $(this);
                if (!$dlg.is(":visible")) {
                    return;
                }
                if (isIgnoredDialog($dlg)) {
                    return;
                }
                anyDialogOpen = true;
            });

            self.setVisible(containerId, !anyDialogOpen);
        }

        // Keep handler refs for a clean uninstall
        var onOpen = function () {
            refreshLegendVisibility();
        };
        var onClose = function () {
            refreshLegendVisibility();
        };

        $(document).on("dialogopen." + ns, ".ui-dialog-content", onOpen);
        $(document).on("dialogclose." + ns, ".ui-dialog-content", onClose);

        self._autoHideBindings[key] = { ns: ns, onOpen: onOpen, onClose: onClose };

        // Initial sync
        refreshLegendVisibility();
    };

    /**
     * Uninstall dialog auto-hide handlers for a given containerId/namespace.
     *
     * @param {string} containerId
     * @param {Object} [options]
     * @param {string} [options.namespace] jQuery event namespace suffix.
     * @returns {void}
     */
    self.uninstallAutoHideOnDialogs = function (containerId, options) {
        if (!containerId) {
            return;
        }

        options = options || {};

        if (!window.$) {
            return;
        }

        var ns = options.namespace ? String(options.namespace) : "legendAutoHide_" + self.getSafeIdSuffix(containerId);

        var key = containerId + "::" + ns;
        var binding = self._autoHideBindings[key];
        if (!binding) {
            // Best-effort cleanup in case handlers exist without stored refs
            $(document).off("." + ns);
            return;
        }

        $(document).off("dialogopen." + ns, ".ui-dialog-content", binding.onOpen);
        $(document).off("dialogclose." + ns, ".ui-dialog-content", binding.onClose);

        delete self._autoHideBindings[key];
    };
    /**
     * Destroy legend instance from the container.
     * @param {string} containerId
     * @returns {void}
     */
    self.destroy = function (containerId) {
        var instance = self.instances[containerId];
        if (!instance) {
            return;
        }
        // Remove dialog auto-hide bindings (if any)
        self.uninstallAutoHideOnDialogs(containerId);

        // detach graph events/timers first
        self.detachVisjsGraph(containerId);

        var wrapper = document.getElementById(instance.ids.wrapperId);
        if (wrapper && wrapper.parentNode) {
            wrapper.parentNode.removeChild(wrapper);
        }
        delete self.instances[containerId];
    };

    /**
     * Return inline css for desired overlay position.
     * @param {string} position
     * @returns {string}
     */
    self.getPositionStyle = function (position) {
        // Default: top-right
        if (!position) {
            position = "top-right";
        }
        if (position === "top-left") {
            return " top:10px; left:10px;";
        }
        if (position === "bottom-right") {
            return " bottom:10px; right:10px;";
        }
        if (position === "bottom-left") {
            return " bottom:10px; left:10px;";
        }
        return " top:10px; right:10px;";
    };

    /**
     * Bind the internal toggle handler.
     * @param {string} containerId
     * @returns {void}
     */
    self.bindToggle = function (containerId) {
        var instance = self.instances[containerId];
        if (!instance) {
            return;
        }
        var btn = document.getElementById(instance.ids.buttonId);
        if (!btn) {
            return;
        }
        // Avoid multiple bindings
        btn.removeEventListener("click", self.onToggleClick);
        btn.addEventListener("click", self.onToggleClick);
    };

    /**
     * Toggle click handler (shared for all instances).
     * @param {Event} event
     * @returns {void}
     */
    self.onToggleClick = function (event) {
        var btn = event && event.currentTarget ? event.currentTarget : null;
        if (!btn) {
            return;
        }
        var containerId = btn.getAttribute("data-legend-container");
        if (!containerId) {
            return;
        }
        var instance = self.instances[containerId];
        if (!instance) {
            return;
        }
        instance.expanded = !instance.expanded;
        var panel = document.getElementById(instance.ids.panelId);
        if (panel) {
            panel.style.display = instance.expanded ? "block" : "none";
        }
    };

    /**
     * Build HTML for the Nodes section.
     * @param {Array<Object>} items
     * @returns {string}
     */
    self.buildNodesSectionHtml = function (items) {
        var html = "";
        html += "<div style='font-weight:700; margin:8px 0 6px;'>Nodes</div>";
        if (!items || items.length === 0) {
            html += "<div style='opacity:.7;'>No node legend items</div>";
            return html;
        }
        items.forEach(function (item) {
            html += self.buildRowHtml({
                kind: "node",
                keyAttr: "data-node-type",
                key: item.type,
                label: item.label,
                swatch: item.swatch,
                color: item.color,
            });
        });
        return html;
    };

    /**
     * Build HTML for the Edges section.
     * @param {Array<Object>} items
     * @returns {string}
     */
    self.buildEdgesSectionHtml = function (items) {
        var html = "";
        html += "<div style='font-weight:700; margin:10px 0 6px;'>Edges</div>";
        if (!items || items.length === 0) {
            html += "<div style='opacity:.7;'>No edge legend items</div>";
            return html;
        }
        items.forEach(function (item) {
            html += self.buildRowHtml({
                kind: "edge",
                keyAttr: "data-edge-cat",
                key: item.cat,
                label: item.label,
                swatch: item.swatch,
                color: item.color,
            });
        });
        return html;
    };

    /**
     * Build one legend row.
     * @param {Object} row
     * @param {string} row.kind - 'node' or 'edge'.
     * @param {string} row.keyAttr - attribute holding the key ('data-node-type' or 'data-edge-cat').
     * @param {string} row.key
     * @param {string} row.label
     * @param {string} row.swatch - 'box' | 'line' | 'dashed'.
     * @param {string} row.color
     * @returns {string}
     */
    self.buildRowHtml = function (row) {
        var html = "";
        var swatchHtml = self.getSwatchHtml(row.swatch, row.color);
        html += "<div data-legend-kind='" + row.kind + "' " + row.keyAttr + "='" + self.escapeHtml(row.key) + "'";
        html += " style='display:flex; align-items:center; gap:8px; margin:4px 0;'>";
        html += swatchHtml;
        html += "<span>" + self.escapeHtml(row.label) + "</span>";
        html += "</div>";
        return html;
    };

    /**
     * Build the swatch HTML (box/line/dashed).
     * @param {string} type
     * @param {string} color
     * @returns {string}
     */
    self.getSwatchHtml = function (type, color) {
        var html = "";
        var safeColor = color ? String(color) : "#ddd";
        if (type === "line") {
            html += "<span style='width:14px; height:3px; background:" + self.escapeHtml(safeColor) + "; display:inline-block; border-radius:50%;'></span>";
            return html;
        }
        if (type === "dashed") {
            html += "<span style='width:14px; height:0; display:inline-block; border-top:3px dashed " + self.escapeHtml(safeColor) + ";'></span>";
            return html;
        }

        if (type === "rect") {
            html += "<span style='width:18px; height:10px; background:" + self.escapeHtml(safeColor) + "; display:inline-block; border-radius:2px;'></span>";
            return html;
        }

        if (type === "triangle") {
            // CSS triangle: color comes from border-bottom
            html +=
                "<span style='width:0; height:0; display:inline-block; border-left:8px solid transparent; border-right:8px solid transparent; border-bottom:14px solid " +
                self.escapeHtml(safeColor) +
                ";'></span>";
            return html;
        }

        // default: box
        html += "<span style='width:12px; height:12px; background:" + self.escapeHtml(safeColor) + "; display:inline-block; border-radius:2px;'></span>";
        return html;
    };

    /**
     * Build a larger swatch for dynamic legends.
     * @param {string} kind - "node" or "edge"
     * @param {Object} info - style info (color, shape, dashed)
     * @returns {string}
     */
    self.getDynamicSwatchHtml = function (kind, info) {
        var color = info && info.color ? String(info.color) : "#ddd"; //
        var colors = info && info.colors && Array.isArray(info.colors) ? info.colors : null;

        var size = 12;
        var lineWidth = 26;
        var lineHeight = 5;

        if (kind === "edge") {
            if (info && info.dashed) {
                return "<span style='width:" + lineWidth + "px; height:0; display:inline-block; border-top:" + lineHeight + "px dashed " + self.escapeHtml(color) + ";'></span>";
            }
            return "<span style='width:" + lineWidth + "px; height:" + lineHeight + "px; background:" + self.escapeHtml(color) + "; display:inline-block; border-radius:3px;'></span>";
        }

        // Nodes
        var shape = info && info.shape ? String(info.shape) : "dot";
        var backgroundCss = self.escapeHtml(color);

        if (colors && colors.length > 1) {
            var gradientColors = colors.slice(0, 4);
            var percentStep = 100 / gradientColors.length;
            var gradientStops = [];
            for (var i = 0; i < gradientColors.length; i++) {
                var startPct = Math.round(i * percentStep);
                var endPct = Math.round((i + 1) * percentStep);
                gradientStops.push(self.escapeHtml(String(gradientColors[i])) + " " + startPct + "% " + endPct + "%");
            }
            backgroundCss = "linear-gradient(90deg," + gradientStops.join(",") + ")";
        }
        // Do NOT return here: apply the computed backgroundCss to the actual shape below.

        // Sans gradient
        if (shape === "box" || shape === "square") {
            return "<span style='width:" + size + "px; height:" + size + "px; background:" + backgroundCss + "; display:inline-block; border-radius:2px;'></span>";
        }
        if (shape === "ellipse") {
            return "<span style='width:16px; height:10px; background:" + backgroundCss + "; display:inline-block; border-radius:50%;'></span>";
        }
        if (shape === "triangle") {
            // Use clip-path so gradients can be applied while keeping the triangle shape.
            // Fallback: if clip-path is not supported, it will still display a small colored block.
            return "<span style='width:14px; height:14px; background:" + backgroundCss + "; display:inline-block; clip-path:polygon(50% 0%, 0% 100%, 100% 100%);'></span>";
        }
        if (shape === "hexagon") {
            // Hexagon swatch (used for blank nodes in the graph)
            // Using clip-path allows both solid colors and gradients.
            return "<span style='width:14px; height:14px; background:" + backgroundCss + "; display:inline-block; clip-path:polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);'></span>";
        }

        return "<span style='width:" + size + "px; height:" + size + "px; background:" + backgroundCss + "; display:inline-block; border-radius:50%;'></span>";
    };

    /**
     * Apply visibility rules based on state maps.
     * @param {HTMLElement} panel
     * @param {Object} state
     * @returns {void}
     */
    self.applyRowVisibility = function (panel, state) {
        var nodeTypesPresent = state.nodeTypesPresent ? state.nodeTypesPresent : {};
        var edgeCatsPresent = state.edgeCatsPresent ? state.edgeCatsPresent : {};

        var rows = panel.querySelectorAll("[data-legend-kind]");
        rows.forEach(function (row) {
            var kind = row.getAttribute("data-legend-kind");
            if (kind === "node") {
                var nodeType = row.getAttribute("data-node-type");
                row.style.display = nodeTypesPresent[nodeType] ? "flex" : "none";
            }
            if (kind === "edge") {
                var edgeCat = row.getAttribute("data-edge-cat");
                row.style.display = edgeCatsPresent[edgeCat] ? "flex" : "none";
            }
        });
    };

    /**
     * Update variant-specific content in the extra slot.
     * Currently used for the 'implicit' variant (table colors).
     *
     * @param {string} containerId
     * @param {Object} state
     * @returns {void}
     */
    self.updateExtraSlot = function (containerId, state) {
        var instance = self.instances[containerId];
        if (!instance) {
            return;
        }
        var options = instance.options ? instance.options : {};
        var slot = document.getElementById(instance.ids.extraSlotId);
        if (!slot) {
            return;
        }

        // Default: clear
        slot.innerHTML = "";

        // Generic "dynamic legend" mode (usable by any tool)
        if (options.dynamicLegend === true && state && state.dynamicLegend === true && state.nodeTypeStyles && state.edgeCatStyles) {
            var html = self.buildDynamicLegendHtmlFromState(state);

            // Allow implicit table colors section to be shown along with dynamic legend
            if (options.variant === "implicit" && state.tableColors) {
                html += self.buildTableColorsSectionHtml(state.tableColors);
            }

            slot.innerHTML = html;
            return;
        }

        // Implicit Model extra section: show table->color mapping
        if (options.variant === "implicit" && state.tableColors) {
            slot.innerHTML = self.buildTableColorsSectionHtml(state.tableColors);
            return;
        }

        // Optional custom extra HTML supplied by caller
        if (state.extraHtml) {
            slot.innerHTML = String(state.extraHtml);
        }
    };

    /**
     * Build the Implicit Model extra section: "Columns (color = table)".
     * @param {Object<string, string>} tableColors
     * @returns {string}
     */
    self.buildTableColorsSectionHtml = function (tableColors) {
        var html = "";
        html += "<div style='margin-top:10px;'>";
        html += "<div style='font-weight:700; margin:10px 0 6px;'>Columns (color = table)</div>";

        var keys = Object.keys(tableColors);
        if (keys.length === 0) {
            html += "<div style='opacity:.7;'>No columns detected</div>";
            html += "</div>";
            return html;
        }

        keys.sort(function (a, b) {
            return String(a).localeCompare(String(b));
        });

        keys.forEach(function (table) {
            var color = tableColors[table];
            var backgroundCss = typeof color === "string" ? color : "#ddd";
            html += "<div style='display:flex; align-items:center; gap:8px; margin:4px 0;'>";
            html += "<span style='width:12px; height:12px; background:" + self.escapeHtml(backgroundCss) + "; display:inline-block; border-radius:2px;'></span>";
            html += "<span>" + self.escapeHtml(table) + "</span>";
            html += "</div>";
        });

        html += "</div>";
        return html;
    };

    /**
     * Apply dynamic swatch styles (colors) based on observed graph styles.
     * @param {HTMLElement} panel
     * @param {Object} state
     * @returns {void}
     */
    self.applyRowStyles = function (panel, state) {
        if (!panel || !state) {
            return;
        }
        var nodeTypeStyles = state.nodeTypeStyles ? state.nodeTypeStyles : {};
        var edgeCatStyles = state.edgeCatStyles ? state.edgeCatStyles : {};

        var rows = panel.querySelectorAll("[data-legend-kind]");
        rows.forEach(function (row) {
            var kind = row.getAttribute("data-legend-kind");
            var key = null;
            var styleDef = null;

            if (kind === "node") {
                key = row.getAttribute("data-node-type");
                styleDef = nodeTypeStyles[key];
            } else if (kind === "edge") {
                key = row.getAttribute("data-edge-cat");
                styleDef = edgeCatStyles[key];
            }

            if (!styleDef || !styleDef.color) {
                return;
            }

            // The first child span is the swatch.
            var swatch = row.querySelector("span");
            if (!swatch) {
                return;
            }

            var color = String(styleDef.color);

            // Update according to swatch rendering style already used in HTML:
            // - line: background
            // - dashed: borderTop
            // - rect/box: background
            // - triangle: borderBottom
            var cssText = swatch.getAttribute("style") || "";

            if (cssText.indexOf("border-top") > -1) {
                // dashed
                swatch.style.borderTopColor = color;
            } else if (cssText.indexOf("border-bottom") > -1) {
                // triangle
                swatch.style.borderBottomColor = color;
            } else {
                // line / box / rect
                swatch.style.background = color;
            }
        });
    };

    /**
     * Build HTML for the dynamic legend from a state object.
     * @param {Object} state
     * @returns {string}
     */
    self.buildDynamicLegendHtmlFromState = function (state) {
        if (!state) {
            return "";
        }

        var html = "<div class='dynamicLegend'>";

        html += "<div class='legendSectionTitle' style='font-weight:700; margin:8px 0 6px;'>Nodes</div>";
        Object.keys(state.nodeTypeStyles || {}).forEach(function (key) {
            var info = state.nodeTypeStyles[key];
            if (!info) {
                return;
            }
            var label = info.classLabel || info.type || "Node";

            html +=
                "<div class='legendRow' style='display:flex; align-items:center; gap:10px; margin:6px 0;'>" +
                self.getDynamicSwatchHtml("node", info) +
                "<span class='legendLabel' style='line-height:16px;'>" +
                self.escapeHtml(label) +
                "</span>" +
                "</div>";
        });

        html += "<div class='legendSectionTitle' style='font-weight:700; margin:10px 0 6px;'>Edges</div>";
        Object.keys(state.edgeCatStyles || {}).forEach(function (cat) {
            var info = state.edgeCatStyles[cat];
            if (!info) {
                return;
            }
            var label = info.label || cat;
            html +=
                "<div class='legendRow' style='display:flex; align-items:center; gap:10px; margin:6px 0;'>" +
                self.getDynamicSwatchHtml("edge", info) +
                "<span class='legendLabel' style='line-height:16px;'>" +
                self.escapeHtml(label) +
                "</span>" +
                "</div>";
        });

        html += "</div>";
        return html;
    };

    /**
     * Ensure the legend overlay exists in the container.
     * If the container was cleared, re-render the overlay.
     *
     * @param {string} containerId
     * @param {Object} options - same as render() options
     * @returns {void}
     */
    self.ensure = function (containerId, options) {
        if (!containerId) return;

        var instance = self.instances[containerId];
        if (!instance) {
            self.render(containerId, options);
            return;
        }

        var wrapper = document.getElementById(instance.ids.wrapperId);
        if (!wrapper) {
            // The container was emptied -> DOM is gone, recreate safely
            delete self.instances[containerId];
            self.render(containerId, options);
        }
    };

    function setupVisBinding(instance, cfg, visjsGraph) {
        instance._vis = instance._vis || {};
        instance._vis.cfg = cfg || {};
        instance._vis.runtimeOptions = (cfg && cfg.runtimeOptions) || {};
        instance._vis.buildOptions = (cfg && cfg.buildOptions) || {};
        instance._vis.applyStateOverrides = cfg && typeof cfg.applyStateOverrides === "function" ? cfg.applyStateOverrides : null;
        instance._vis.debounceMs = cfg && cfg.debounceMs !== undefined ? cfg.debounceMs : 50;
        instance._vis.visjsGraph = visjsGraph || null;
    }

    function scheduleRefreshFromGraph(containerId) {
        var instance = self.instances[containerId];
        if (!instance || !instance._vis) {
            return;
        }
        if (instance._vis.refreshTimer) {
            clearTimeout(instance._vis.refreshTimer);
        }
        instance._vis.refreshTimer = setTimeout(function () {
            instance._vis.refreshTimer = null;
            self.refreshFromGraph(containerId);
        }, instance._vis.debounceMs || 50);
    }

    function bindVisjsEvents(containerId) {
        var instance = self.instances[containerId];
        if (!instance || !instance._vis || !instance._vis.visjsGraph) {
            return;
        }

        unbindVisjsEvents(containerId);

        var visjsGraph = instance._vis.visjsGraph;
        if (!visjsGraph.data || !visjsGraph.data.nodes || !visjsGraph.data.edges) {
            return;
        }

        instance._vis.boundHandler = function () {
            scheduleRefreshFromGraph(containerId);
        };

        ["add", "update", "remove"].forEach(function (eventName) {
            visjsGraph.data.nodes.on(eventName, instance._vis.boundHandler);
            visjsGraph.data.edges.on(eventName, instance._vis.boundHandler);
        });
    }

    function unbindVisjsEvents(containerId) {
        var instance = self.instances[containerId];
        if (!instance || !instance._vis || !instance._vis.visjsGraph || !instance._vis.boundHandler) {
            return;
        }

        var visjsGraph = instance._vis.visjsGraph;
        if (!visjsGraph.data || !visjsGraph.data.nodes || !visjsGraph.data.edges) {
            return;
        }

        ["add", "update", "remove"].forEach(function (eventName) {
            visjsGraph.data.nodes.off(eventName, instance._vis.boundHandler);
            visjsGraph.data.edges.off(eventName, instance._vis.boundHandler);
        });

        instance._vis.boundHandler = null;
    }

    /**
     * Attach a VisjsGraphClass instance to a legend overlay.
     *
     * @param {string} containerId
     * @param {VisjsGraphClass} visjsGraph
     * @param {Object} cfg
     * @returns {void}
     */
    self.attachVisjsGraph = function (containerId, visjsGraph, cfg) {
        if (!containerId) {
            return;
        }
        cfg = cfg || {};

        self.ensure(containerId, cfg.renderOptions || {});
        var instance = self.instances[containerId];
        if (!instance) {
            return;
        }

        // Keep last render options for future ensure() calls
        if (cfg.renderOptions) {
            instance.options = cfg.renderOptions;
        }

        // Rebind if graph changed
        if (instance._vis && instance._vis.visjsGraph && visjsGraph && visjsGraph !== instance._vis.visjsGraph) {
            self.detachVisjsGraph(containerId);
            instance = self.instances[containerId];
            if (!instance) {
                return;
            }
        }

        setupVisBinding(instance, cfg, visjsGraph);

        bindVisjsEvents(containerId);
        self.refreshFromGraph(containerId);
    };

    /**
     * Detach VisjsGraphClass instance and remove event bindings.
     * Does not destroy the overlay DOM.
     *
     * @param {string} containerId
     * @returns {void}
     */
    self.detachVisjsGraph = function (containerId) {
        var instance = self.instances[containerId];
        if (!instance || !instance._vis) {
            return;
        }

        if (instance._vis.refreshTimer) {
            clearTimeout(instance._vis.refreshTimer);
            instance._vis.refreshTimer = null;
        }

        unbindVisjsEvents(containerId);

        instance._vis.visjsGraph = null;
    };

    /**
     * Refresh legend content from the attached graph.
     *
     * @param {string} containerId
     * @returns {void}
     */
    self.refreshFromGraph = function (containerId) {
        var instance = self.instances[containerId];
        if (!instance || !instance._vis || !instance._vis.visjsGraph) {
            return;
        }

        try {
            var buildOptions = instance._vis.buildOptions || {};
            var state = self.buildStateFromVisjsGraph(instance._vis.visjsGraph, buildOptions);

            if (instance._vis.applyStateOverrides) {
                instance._vis.applyStateOverrides(state, instance._vis.runtimeOptions || {}, instance._vis.visjsGraph);
            }

            self.ensure(containerId, instance.options || {});
            self.update(containerId, state);
        } catch (e) {
            console.error("Legend refresh failed", e);
        }
    };
    return self;
})();

export default LegendOverlayWidget;
window.LegendOverlayWidget = LegendOverlayWidget;
