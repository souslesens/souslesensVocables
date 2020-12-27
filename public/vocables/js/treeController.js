var TreeController = (function () {

    var self = {};


    self.drawOrUpdateTree = function (treeDivId, data, parentNodeId, childNodeVar, jsTreeOptions, callback) {
        if (!jsTreeOptions)
            jsTreeOptions = {}

        var jstreeData = [];
        var existingNodes = {}
        data.forEach(function (item) {

            var typeObj = item[childNodeVar + "Type"]
            if (!typeObj) {// force concept Type
                typeObj = {value: "http://www.w3.org/2004/02/skos/core#Concept"}
                console.log("node " + item[childNodeVar].value + " has no type")
            }

            var type = typeObj.value;
            var cssType = type.substring(type.lastIndexOf("#") + 1)

            type = jsTreeOptions.type || type
            if (childNodeVar && item[childNodeVar]) {
                var childNodeId = item[childNodeVar].value;

                if (!existingNodes[childNodeId]) {
                    existingNodes[childNodeId] = 1;

                    var childNodeLabel = common.getItemLabel(item, childNodeVar)

                    if (true || jsTreeOptions.labelClass) {
                        var label = "<span class='treeType_" + cssType + "'>" + childNodeLabel + "</span>"
                    }

                           var child = {
                            parent: parentNodeId,
                            id: childNodeId + "_" + common.getRandomHexaId(4),
                            text: label,
                            data: {type: type, source: jsTreeOptions.source, label: childNodeLabel, id: childNodeId}

                        }
                        jstreeData.push(child);



                }


            }


        })


        if (parentNodeId == "#") {
            common.loadJsTree(treeDivId, jstreeData, jsTreeOptions, callback)

        } else {
            common.addNodesToJstree(treeDivId, parentNodeId, jstreeData, jsTreeOptions)
        }
        $("#waitImg").css("display", "none");


    }

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
