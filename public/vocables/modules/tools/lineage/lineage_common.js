import common from "../../shared/common.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";

/* The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * @module Lineage_common
 * @description Common utility functions for the lineage system.
 * Provides functionality for:
 * - Managing clipboard operations with nodes
 * - Node deletion and manipulation
 * - Copy/paste operations between nodes
 * - Managing ontology imports
 * - Basic node operations and validations
 */

// eslint-disable-next-line no-global-assign
var Lineage_common = (function () {
    var self = {};
    self.currentSource = null;

    /**
     * Copies a node's data to the clipboard as a JSON string.
     * @function
     * @name copyNodeToClipboard
     * @memberof module:Lineage_common
     * @param {Object} nodeData - The node data to copy.
     * @returns {void}
     */
    self.copyNodeToClipboard = function (nodeData) {
        common.copyTextToClipboard(JSON.stringify(nodeData), function (err, result) {
            if (err) return UI.message(err);
            UI.message(result);
        });
    };

    /**
     * Deletes a specified ontology node, removing its associated triples.
     * If the node has children, deletion is prevented.
     * @function
     * @name deleteNode
     * @memberof module:Lineage_common
     * @param {Object} node - The node to delete.
     * @param {string} jstreeId - The ID of the jstree instance where the node is displayed.
     * @returns {void}
     */
    self.deleteNode = function (node, jstreeId) {
        if (node.children && node.children.length > 0) return alert("cannot delete node with children");
        if (confirm("delete node " + node.data.label)) {
            Sparql_generic.deleteTriples(Lineage_sources.activeSource, node.data.id, null, null, function (err, _result) {
                if (err) UI.message(err);
                UI.message("node " + node.data.label + " deleted");
                $("#" + jstreeId)
                    .jstree(true)
                    .delete_node(node.id);
            });
        }
    };

    /**
     * Pastes a copied node from the clipboard under a specified parent node.
     * The function ensures that only compatible node types are pasted.
     * @function
     * @name pasteNodeFromClipboard
     * @memberof module:Lineage_common
     * @param {Object} parentNode - The parent node under which the copied node will be pasted.
     * @returns {void}
     */
    self.pasteNodeFromClipboard = function (parentNode) {
        //  console.log(JSON.stringify(parentNode.data))
        common.pasteTextFromClipboard(function (text) {
            //   console.log(text)

            try {
                var nodeData = JSON.parse(text);
                var triples = [];
                var treeDiv;

                if (nodeData.id == parentNode.data.id) return alert("Cannot paste node inside its parent");
                if (parentNode.data.type == "http://www.w3.org/2002/07/owl#Class" && nodeData.type == "http://www.w3.org/2002/07/owl#Class") {
                    treeDiv = "LineageNodesJsTreeDiv";
                    triples.push({
                        subject: nodeData.id,
                        predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                        object: "http://www.w3.org/2002/07/owl#Class",
                        valueType: "uri",
                    });
                    triples.push({
                        subject: nodeData.id,
                        predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                        object: nodeData.label,
                    });
                    triples.push({
                        subject: nodeData.id,
                        predicate: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                        object: parentNode.data.id,
                        valueType: "uri",
                    });
                } else if (parentNode.data.type == "http://www.w3.org/2002/07/owl#ObjectProperty" && nodeData.type == "http://www.w3.org/2002/07/owl#ObjectProperty") {
                    treeDiv = "Lineage_propertiesTree";
                    triples.push({
                        subject: nodeData.id,
                        predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                        object: "http://www.w3.org/2002/07/owl#ObjectProperty",
                        valueType: "uri",
                    });
                    triples.push({
                        subject: nodeData.id,
                        predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                        object: nodeData.label,
                    });
                    triples.push({
                        subject: nodeData.id,
                        predicate: "http://www.w3.org/2000/01/rdf-schema#subPropertyOf",
                        object: parentNode.data.id,
                        valueType: "uri",
                    });
                } else {
                    return alert(" paste from clipboard not allowed");
                }

                if (confirm("insert inside " + parentNode.data.label + "  triples " + JSON.stringify(triples, null, 2))) {
                    Sparql_generic.insertTriples(parentNode.data.source, triples, null, function (err, _result) {
                        if (err) return UI.message(err);
                        nodeData.source = parentNode.data.source;
                        var jstreeData = [
                            {
                                id: nodeData.id,
                                text: nodeData.label,
                                parent: parentNode.id,
                                data: nodeData,
                            },
                        ];
                        JstreeWidget.addNodesToJstree(treeDiv, parentNode.id, jstreeData);
                    });
                }
            } catch (e) {
                UI.message(e);
            }
        });
    };

    /**
     * Toggles the inclusion of ontology imports in SPARQL queries.
     * @function
     * @name onshowImportsCBXChange
     * @memberof module:Lineage_common
     * @param {HTMLInputElement} cbx - The checkbox input element controlling the setting.
     * @returns {void}
     */
    self.onshowImportsCBXChange = function (cbx) {
        var checked = $(cbx).prop("checked");
        Sparql_common.includeImports = checked;
    };
    return self;
})();

export default Lineage_common;

window.Lineage_common = Lineage_common;
