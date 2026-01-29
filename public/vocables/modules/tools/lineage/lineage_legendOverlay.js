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
    // Source nodes
    if (node.shape === "box" || node.shape === "square") {
        return "Source";
    }

    // Property nodes (ellipses / predicate nodes)
    if (node.data && node.data.varName === "prop") {
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
  self.getEdgeCategory = function (edge) {
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
        nodeKeyFn: self.getNodeCategory,
        nodeLabelFn: function (_node, key) {
            if (key && key.indexOf("Class:") === 0) {
              return "Class (" + key.substring("Class:".length) + ")";
            }
            var map = {
                Source: "Source",
                Container: "Container",
                Class: "Class",
                Property: "Property (predicate)",
                NamedIndividual: "NamedIndividual",
                bnode: "Blank node",
                literal: "Literal",
            };
            return map[key] || key;
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
                SourceLink: "Source / import link",
                Other: "Other",
            };
            return map[key] || key;
        },
      });

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