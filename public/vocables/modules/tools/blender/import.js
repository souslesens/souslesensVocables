


/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
var Import = (function () {
    var self = {};
    self.currentType;

    self.showImportNodesDialog = function (type) {
        Blender.nodeEdition.openDialog();
        $("#Blender_PopupEditDiv").load("snippets/blender/import.html");
        self.currentType = type;
    };

    (self.importNodes = function (type) {
        var skosType;
        if (!type) type = self.currentType;
        if (!type) alert("no type");
        var parentNode, treeDivId, predicate;
        if (type == "subject") {
            parentNode = Blender.currentTreeNode;
            skosType = "http://www.w3.org/2004/02/skos/core#Concept";
            predicate = "http://www.w3.org/2004/02/skos/core#broader";
            treeDivId = "Blender_conceptTreeDiv";
        } else if (type == "collection") {
            parentNode = Collection.currentTreeNode;
            treeDivId = "Blender_collectionTreeDiv";
            skosType = "http://www.w3.org/2004/02/skos/core#Collection";
            predicate = "http://www.w3.org/2004/02/skos/core#member";
        }

        var lang = $("#import_langInput").val();
        var str = $("#Import_TextArea").val();
        if (str == "") return MainController.UI.message("no data to import");
        str = str.replace(/\r/g, "");

        var words = str.split("\n");

        var triples = [];

        var words2 = [];
        words.forEach(function (word) {
            var newNodeId = common.getNewUri(Blender.currentSource);
            word = Sparql_common.formatStringForTriple(word.trim());
            if (!word) return;

            words2.push({ id: newNodeId, label: word, type: skosType });
            if (type == "subject") {
                triples.push({ subject: newNodeId, predicate: predicate, object: parentNode.data.id, valueType: "uri" });
            } else if (type == "collection") {
                triples.push({ subject: parentNode.id, predicate: predicate, object: newNodeId, valueType: "uri" });
            }
            triples.push({ subject: newNodeId, predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type", object: skosType, valueType: "uri" });
            var labelTriple = { subject: newNodeId, predicate: "http://www.w3.org/2004/02/skos/core#prefLabel", object: word, valueType: "literal" };
            if (lang != "") labelTriple.lang = lang;
            triples.push(labelTriple);
        });

        Sparql_generic.insertTriples(Blender.currentSource, triples, null, function (err, _result) {
            if (err) return $("#Import_MessageDiv").html(err);
            $("#Import_MessageDiv").html("imported " + words.length + " new nodes");

            var jsTreeData = [];
            words2.forEach(function (item) {
                jsTreeData.push({
                    id: item.id,
                    text: item.label,
                    parent: parentNode,
                    data: { type: item.type },
                });
            });

            common.jstree.addNodesToJstree(treeDivId, parentNode, jsTreeData, {});
        });
        self.clearImportNodesDialog();
    }),
        (self.clearImportNodesDialog = function () {
            // $("#graphDiv").html("")
            $("#Blender_PopupEditDiv").dialog("close");
        });

    return self;
})();



export default Import

window.Import=Import;