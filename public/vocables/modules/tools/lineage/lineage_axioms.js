import NodeInfosAxioms from "../axioms/nodeInfosAxioms.js";

var Lineage_axioms = (function () {
    var self = {};

    self.drawClassesWithAxioms = function (source, axiomType) {
        if (!source) {
            source = Lineage_sources.activeSource;
        }
        Axiom_manager.listClassesWithAxioms(source, function (err, result) {
            if (err) {
                return alert(err);
            }
            var axiomTypes = {};
            var visjsData = {nodes: [], edges: []};
            result.forEach(function (item) {
                item.axiomTypes.forEach(function (type) {
                    if (!axiomTypes[type]) {
                        axiomTypes[type] = 1;
                        visjsData.nodes.push({
                            id: type,
                            label: type,
                            shape: "ellipse",
                            color: "#ddd",
                            data: {
                                id: type,
                                label: type,
                                source: source,
                            },
                        });
                    }
                    visjsData.edges.push({
                        id: common.getRandomHexaId(5),
                        from: item.class,
                        to: type,
                    });
                });
                visjsData.nodes.push({
                    id: item.class,
                    label: item.label,
                    shape: "hexagon",
                    color: "#ddd",
                    size: Lineage_whiteboard.defaultShapeSize,
                    data: {
                        id: item.class,
                        label: item.label,
                        source: source,
                    },
                });
            });

            Lineage_whiteboard.drawNewGraph(visjsData, "graphDiv");
        });
    };

    self.testAxioms = function () {
        var node = {
            id: "https://spec.industrialontologies.org/ontology/core/Core/AgentRole",
            label: "AgentRole",
            data: {
                id: "https://spec.industrialontologies.org/ontology/core/Core/AgentRole",
                label: "AgentRole"
            }
        }
        NodeInfosAxioms.init("IOF-CORE-202401", node, "mainDialogDiv");
    }


    return self;
})();

export default Lineage_axioms;
window.Lineage_axioms = Lineage_axioms;
