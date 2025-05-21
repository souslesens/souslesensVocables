import common from "./common.js";

/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
var TreeController = (function () {
    var self = {};

    self.drawOrUpdateTree = function (treeDivId, data, parentNodeId, childNodeVar, jsTreeOptions, callback) {
        if (!jsTreeOptions) jsTreeOptions = {};

        var jstreeData = [];
        var existingNodes = {};
        if(!Array.isArray(data) || data.length== 0) { 
            return;
        }   
        data.sort(function (a, b) {
            var labelA = a.child1 ? a.child1.value : '';
            var labelB = b.child1 ? b.child1.value : '';
            if (labelA > labelB) {
                return -1;
            }
            if (labelA < labelB) {
                return 1;
            }
            return 0;
        });
        if(data.length > 500) {
            alert("Too many nodes : only 500 first nodes are displayed");
           data = data.slice(0, 500);
        }
        UI.message("Loading " + data.length + " nodes in the tree");

        data.forEach(function (item) {
            var typeObj = item[childNodeVar + "Type"];
            if (!typeObj) {
                // force concept Type
                typeObj = { value: "http://www.w3.org/2004/02/skos/core#Concept" };
                // eslint-disable-next-line no-console
                console.log("node " + item[childNodeVar].value + " has no type");
            }

            var type = typeObj.value;
            var cssType = type.substring(type.lastIndexOf("#") + 1);

            var jstreeType = jsTreeOptions.type || null;
            if (childNodeVar && item[childNodeVar]) {
                var childNodeId = item[childNodeVar].value;

                if (!existingNodes[childNodeId]) {
                    existingNodes[childNodeId] = 1;

                    var childNodeLabel = common.getItemLabel(item, childNodeVar);

                    // PROBLEM
                    //if (true || jsTreeOptions.labelClass) {
                    var label = "<span class='treeType_" + cssType + "'>" + childNodeLabel + "</span>";
                    //}
                    var type_icon = JstreeWidget.selectTypeForIconsJstree(type);
                    if (type_icon == "default") {
                        // blank node case
                        type_icon = "Individual";
                    }

                    var child = {
                        parent: parentNodeId,
                        id: childNodeId + "_" + common.getRandomHexaId(4),
                        text: label,
                        type: type_icon,
                        data: { type: type, source: jsTreeOptions.source, label: childNodeLabel, id: childNodeId },
                    };
                    if (jsTreeOptions.optionalData) {
                        for (var key in jsTreeOptions.optionalData) {
                            child.data[key] = jsTreeOptions.optionalData[key];
                        }
                    }
                    jstreeData.push(child);
                }
            }
        });

        if (parentNodeId == "#") {
            JstreeWidget.loadJsTree(treeDivId, jstreeData, jsTreeOptions, callback);
        } else {
            JstreeWidget.addNodesToJstree(treeDivId, parentNodeId, jstreeData, jsTreeOptions);
        }
        $("#waitImg").css("display", "none");
    };

    /*  a revoir
    self.toCsv = function (topNode,treeDivId,resultDivId) {

        function copyToClipboard(element) {
            var $temp = $("<input>");
            $("body").append($temp);
            $temp.val($(element).text()).select();
            document.execCommand("copy");
            $temp.remove();
        }

        var depth = prompt("depth", "2")
        if (isNaN(depth))
            return;
        depth = parseInt(depth)
        var str = "";
        for (var i = 1; i <= depth; i++) {
            str += "\tlevel_" + i + "\t"
        }
        str += "\n";

        var descendants = topNode.children_d;
        var treeDivId = topNode.data.treeDivId;
        var map = {}



        var recurseChildren = function (nodeId, lineStr, level) {
            var node = $("#" + treeDivId).jstree(true).get_node(nodeId);
            var children = node.children;
            lineStr += node.text + "\t";
            if (level > depth || !children || children.length == 0) {

                str += lineStr + "\n";
                return;
            } else {


            }
            if (!children)
                return;
            children.forEach(function (child) {
                recurseChildren(child, lineStr, level + 1)
            })

        }


        recurseChildren(topNode.id, "", 1)
        $("#"+resultDivId).html("<textArea id='commonConceptsTA' rows='50' cols='80'>" + str + "</textArea>")
        $("#popupDiv").css("display", "block")
        // copyToClipboard("#editorDivId");
        //  alert ("csv  is copied on clipboard")

    }*/

    return self;
})();

export default TreeController;

window.TreeController = TreeController;
