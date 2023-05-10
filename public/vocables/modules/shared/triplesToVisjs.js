import Sparql_common from "../sparqlProxies/sparql_common.js";
import Lineage_classes from "../tools/lineage/lineage_classes.js";
import Lineage_sources from "../tools/lineage/lineage_sources.js";
import visjsGraph from "../graph/visjsGraph2.js";

var TriplesToVisjs = (function () {
    var self = {};

    self.drawTriples = function (source, triples, options) {
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
                    shape = options.subjectShape || Lineage_classes.defaultShape;
                    color = color || "grey";
                }
                visjsData.nodes.push({
                    id: id,
                    label: label,
                    shape: shape,
                    color: color,
                    size: Lineage_classes.defaultShapeSize,
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
            addNode(item.subject, label, Config.Lineage.logicalOperatorsMap[item.predicate]);

            var label = item.objectLabel || Sparql_common.getLabelFromURI(item.object);
            addNode(item.object, label);

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
                            type: Lineage_classes.defaultEdgeArrowType,
                            scaleFactor: 0.5,
                        },
                    },
                });
            }
        });

        if (!visjsGraph.isGraphNotEmpty()) {
            Lineage_classes.drawNewGraph(visjsData);
        }
        visjsGraph.data.nodes.add(visjsData.nodes);
        visjsGraph.data.edges.add(visjsData.edges);
        visjsGraph.network.fit();
        $("#waitImg").css("display", "none");
    };

    return self;
})();

export default TriplesToVisjs;
window.TriplesToVisjs = TriplesToVisjs;
