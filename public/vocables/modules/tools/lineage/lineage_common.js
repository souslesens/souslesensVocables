import common from "../../shared/common.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";

/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
// eslint-disable-next-line no-global-assign
var Lineage_common = (function () {
    var self = {};
    self.currentSource = null;
    self.copyNodeToClipboard = function (nodeData) {
        common.copyTextToClipboard(JSON.stringify(nodeData), function (err, result) {
            if (err) return UI.message(err);
            UI.message(result);
        });
    };

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

    self.onshowImportsCBXChange = function (cbx) {
        var checked = $(cbx).prop("checked");
        Sparql_common.includeImports = checked;
    };
    return self;
})();

export default Lineage_common;

window.Lineage_common = Lineage_common;
