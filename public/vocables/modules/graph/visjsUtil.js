import Sparql_common from "../sparqlProxies/sparql_common.js";
import Lineage_whiteboard from "../tools/lineage/lineage_whiteboard.js";
import Lineage_sources from "../tools/lineage/lineage_sources.js";
import visjsGraph from "../graph/visjsGraph2.js";

var VisjsUtil = (function () {
    var self = {};

    self.setNodeSymbol = function (node, symbol) {
        if (!symbol) return node;
        node.shape = "circle";
        node.label = symbol;
        node.color = "#eee";
        // node.font="bold"
        return node;
    };

    self.getVisjsNodeAttributes = function (source, uri, label, options) {
        if (!options) {
            options = {};
        }
        var shape, color, lab;
        var size = Lineage_whiteboard.defaultShapeSize;
        var str;
        if (options.symbol) {
            shape = "circle";
            label = options.symbol;
            color = "#eee";
        } else {
            shape = options.shape || Lineage_whiteboard.defaultShape;
            color = options.color || Lineage_whiteboard.getSourceColor(source);
            var regex = /[0-9a-f]{3}/; //blank nodes
            if (uri.indexOf("http") < 0 && label.match(regex)) {
                shape = "hexagon";
                label = null;
                color = "#bbb";
                size = 5;
            }
        }
        var attrs = {
            label: label,
            shape: shape,
            color: color,
            size: size,
        };
        return attrs;
    };

    self.setVisjsNodeAttributes = function (source, node, label, options) {
        var attrs = self.getVisjsNodeAttributes(source, node.id, label, options);
        if (!attrs) return node;
        node.label = attrs.label;
        node.shape = attrs.shape;
        node.color = attrs.color;
        node.size = attrs.size;
        return node;
    };

    self.getVisjsNode = function (source, id, label, predicateUri, options) {
        if (!options) {
            options = {};
        }
        var attrs = self.getVisjsNodeAttributes(source, id, label, options);

        var node = {
            id: id,
            label: attrs.label || label,
            shape: attrs.shape,
            color: attrs.color,
            size: attrs.size,
            data: {
                id: id,
                label: attrs.label || label,
                source: source,
                type: options.type,
                rdfType: options.rdfType,
            },
        };
        for (var key in options) {
            if (key == "color" && node.color == "#bbb");
            else node[key] = options[key];
        }

        if (options.data) {
            for (var key in options.data) {
                node.data[key] = options.data[key];
            }
        }
        if (!options.level) {
            node.level = Lineage_whiteboard.currentExpandLevel;
        }
        return node;
    };

    self.getVisjsData = function (source, triples, options) {
        if (!options) {
            options = {};
        }
        var existingNodes = visjsGraph.getExistingIdsMap();
        var visjsData = { nodes: [], edges: [] };

        function addNode(id, label, logicalOperator, color) {
            if (!existingNodes[id]) {
                existingNodes[id] = 1;
                var shape, color;
                if (logicalOperator) {
                    shape = "circle";
                    label = Config.Lineage.logicalOperatorsMap[logicalOperator];
                    color = "#eee";
                } else {
                    shape = options.subjectShape || Lineage_whiteboard.defaultShape;
                    color = color || "grey";
                }
                visjsData.nodes.push({
                    id: id,
                    label: label,
                    shape: shape,
                    color: color,
                    size: Lineage_whiteboard.defaultShapeSize,
                    data: {
                        id: id,
                        label: label,
                        source: source,
                    },
                });
            }
        }

        triples.forEach(function (item) {
            var label = item.subjectLabel || Sparql_common.getLabelFromURI(item.subject);
            if (!existingNodes[item.subject]) {
                existingNodes[item.subject] = 1;
                visjsData.nodes.push(VisjsUtil.getVisjsNode(source, item.subject, label, item.predicate));
            }
            if (!existingNodes[item.object]) {
                existingNodes[item.object] = 1;
                var label = item.objectLabel || Sparql_common.getLabelFromURI(item.object);
                visjsData.nodes.push(VisjsUtil.getVisjsNode(source, item.object, label));
            }

            var label = item.predicateLabel || Sparql_common.getLabelFromURI(item.predicate);
            var edgeId = item.subject + "_" + item.object;
            if (!existingNodes[edgeId]) {
                existingNodes[edgeId] = 1;
                visjsData.edges.push({
                    id: edgeId,
                    from: item.subject,
                    to: item.object,
                    label: label,
                    color: options.edgeColor || "red",
                    font: { size: 10 },
                    arrows: {
                        to: {
                            enabled: true,
                            type: Lineage_whiteboard.defaultEdgeArrowType,
                            scaleFactor: 0.5,
                        },
                    },
                });
            }
        });

        return visjsData;
    };

    self.drawTriples = function (source, triples, options) {
        var visjsData = self.getVisjsData(source, triples, options);
        self.drawVisjsData(visjsData);
    };

    self.drawVisjsData = function (visjsData, graphDiv, options) {
        if (!visjsGraph.isGraphNotEmpty()) {
            Lineage_whiteboard.drawNewGraph(visjsData, graphDiv, options);
        }
        visjsGraph.data.nodes.add(visjsData.nodes);
        visjsGraph.data.edges.add(visjsData.edges);
        visjsGraph.network.fit();
        $("#waitImg").css("display", "none");
    };

    return self;
})();

export default VisjsUtil;
window.VisjsUtil = VisjsUtil;
