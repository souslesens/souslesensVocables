import NodeInfosAxioms from "../axioms/nodeInfosAxioms.js";

var Lineage_axioms = (function () {
    var self = {};


    /**
     * Draws classes with associated axioms in a visual graph representation.
     * Retrieves axioms from the specified source and visualizes them using Vis.js.
     * @function
     * @name drawClassesWithAxioms
     * @memberof module:Lineage_axioms
     * @param {string} [source] - The name of the data source. Defaults to the active source if not provided.
     * @param {string} [axiomType] - The specific type of axiom to filter by (optional).
     * @returns {void}
     */
    self.drawClassesWithAxioms = function (source, axiomType) {
        if (!source) {
            source = Lineage_sources.activeSource;
        }
        Axiom_manager.listClassesWithAxioms(source, function (err, result) {
            if (err) {
                return alert(err);
            }
            var axiomTypes = {};
            var visjsData = { nodes: [], edges: [] };
            if (!result.forEach) {
                // nothing found
                return alert(result.result);
            }

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


    /**
     * Tests axiom functionalities by initializing a sample node with axiom data.
     * Opens a dialog displaying axioms for the test node.
     * @function
     * @name testAxioms
     * @memberof module:Lineage_axioms
     * @returns {void}
     */
    self.testAxioms = function () {
        var node = {
            id: "https://spec.industrialontologies.org/ontology/core/Core/AgentRole",
            label: "AgentRole",
            data: {
                id: "https://spec.industrialontologies.org/ontology/core/Core/AgentRole",
                label: "AgentRole",
            },
        };
        NodeInfosAxioms.init("IOF-CORE-202401", node, "mainDialogDiv");
    };

    return self;
})();

export default Lineage_axioms;
window.Lineage_axioms = Lineage_axioms;
