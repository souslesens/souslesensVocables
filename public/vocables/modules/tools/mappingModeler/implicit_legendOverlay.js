import LegendOverlayWidget from "../../uiWidgets/legendOverlayWidget.js";

/**
 * Implicit_legendOverlay
 * Implicit Model legend overlay config (categories/labels/order + tableColors).
 */
var Implicit_legendOverlay = (function () {
  var self = {};

  self.containerId = null;
  self.visjsGraph = null;
  self.legendOptions = null;

  self.nodeOrder = ["Table", "Column", "Class", "DatatypeProperty", "URI", "Node"];
  self.edgeOrder = ["ObjectProperty", "RdfType", "DatatypeProperty", "DatasourceLink", "TechnicalLink", "OtherRelation", "SystemDefault"];

  function getEdgeColorString(edge) {
    return LegendOverlayWidget.getColor(edge, "");
  }

  function normalizeColor(color) {
    return LegendOverlayWidget.normalizeColor(color);
  }

  function computeDominantTableColors(visjsGraph) {
    var result = {};
    if (!visjsGraph || !visjsGraph.data || !visjsGraph.data.nodes) {
      return result;
    }

    var nodes = visjsGraph.data.nodes.get();
    var countsByTable = {};

    nodes.forEach(function (n) {
      if (!n || !n.data) {
        return;
      }
      if (n.data.type !== "Column" || !n.data.dataTable) {
        return;
      }

      var table = String(n.data.dataTable);
      var c = typeof n.color === "string" ? n.color : n.color && n.color.background ? n.color.background : "#ddd";
      c = normalizeColor(c) ? (String(c).indexOf("#") === 0 ? String(c).toLowerCase() : "#" + String(c).toLowerCase()) : "#ddd";

      if (!countsByTable[table]) {
        countsByTable[table] = {};
      }
      countsByTable[table][c] = (countsByTable[table][c] || 0) + 1;
    });

    Object.keys(countsByTable).forEach(function (table) {
      var colorsCount = countsByTable[table];
      var bestColor = null;
      var bestN = -1;

      Object.keys(colorsCount).forEach(function (color) {
        if (colorsCount[color] > bestN) {
          bestN = colorsCount[color];
          bestColor = color;
        }
      });

      if (bestColor) {
        result[table] = bestColor;
      }
    });

    return result;
  }

  self.getNodeCategory = function (node) {
    if (!node || !node.data) {
      return "Node";
    }
    return node.data.type ? String(node.data.type) : "Node";
  };

  self.getEdgeCategory = function (edge, nodesByIdMap) {
    if (!edge) {
      return "SystemDefault";
    }

    var predicateType = edge.data ? edge.data.type : null;

    if (predicateType === "rdf:type" || predicateType === "rdfs:subClassOf") {
      return "RdfType";
    }

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

  self.getNodeLabel = function (_node, baseKey) {
    var map = {
      Table: "Table",
      Column: "Column",
      Class: "Class",
      DatatypeProperty: "DatatypeProperty",
      URI: "URI",
      Node: "Node",
    };
    return map[baseKey] || baseKey;
  };

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

    self.applyStateOverrides = function (state, options, visjsGraph) {
        if (!state) {
            return;
        }
        state.tableColors = computeDominantTableColors(visjsGraph);
    };

  self.init = function (containerId, visjsGraph, options) {
    self.containerId = containerId || self.containerId;
    self.visjsGraph = visjsGraph || self.visjsGraph;
    self.legendOptions = options || self.legendOptions || {};

    LegendOverlayWidget.attachVisjsGraph(self.containerId, self.visjsGraph, {
      debounceMs: 50,
      runtimeOptions: self.legendOptions,
      renderOptions: {
        idPrefix: "implicitLegend",
        title: (self.legendOptions && self.legendOptions.title) || "📘 Legend",
        position: "top-right",
        initiallyExpanded: true,
        variant: "implicit",
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
      applyStateOverrides: function (state, runtimeOptions, graph) {
        self.applyStateOverrides(state, runtimeOptions, graph);
      },
    });
  };

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

export default Implicit_legendOverlay;
window.Implicit_legendOverlay = Implicit_legendOverlay;
