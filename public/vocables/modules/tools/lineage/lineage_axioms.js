import NodeInfosAxioms from "../axioms/nodeInfosAxioms.js";

/**
 * @module Lineage_axioms
 * @description Module for managing and visualizing ontological axioms in the lineage graph.
 * Provides functionality for:
 * - Visualizing classes with their associated axioms
 * - Drawing axiom relationships in the graph
 * - Supporting different types of axioms
 * - Testing axiom functionality
 * - Managing axiom metadata and visualization
 */

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
        //  Axiom_manager.listClassesWithAxioms(source, function (err, result) {
        AxiomExtractor.listClassesWithAxioms(source, function (err, result) {
            if (err) {
                return alert(err);
            }

            result = result.slice(0, 500);
            var axiomTypes = {};
            var visjsData = { nodes: [], edges: [] };
            if (!result.forEach) {
                // nothing found
                return alert(result.result);
            }

            var existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
            result.forEach(function (item) {
                if (item.axiomTypes) {
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
                }
                if (!existingNodes[item.class]) {
                    existingNodes[item.class] = 1;
                    visjsData.nodes.push({
                        id: item.class,
                        label: item.label,
                        shape: "hexagon",

                        color: "#ddd",
                        size: 16,
                        borderWidth: item.data.axiomType == "equivalentClass" ? 4 : 1,
                        data: {
                            id: item.class,
                            label: item.label,
                            source: source,
                        },
                    });
                }
            });
            if (Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                Lineage_whiteboard.lineageVisjsGraph.data.nodes.update(visjsData.nodes);
                Lineage_whiteboard.lineageVisjsGraph.data.edges.update(visjsData.edges);
            } else {
                Lineage_whiteboard.drawNewGraph(visjsData, "graphDiv");
            }
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
