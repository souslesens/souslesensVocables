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
       if(Collection.isNodeOk(childNodeId)){
                           var child = {
                            parent: parentNodeId,
                            id: childNodeId + "_" + common.getRandomHexaId(4),
                            text: label,
                            data: {type: type, source: jsTreeOptions.source, label: childNodeLabel, id: childNodeId}

                        }
                        jstreeData.push(child);
                    }


                }


            }


        })


        if (parentNodeId == "#") {
            common.loadJsTree(treeDivId, jstreeData, jsTreeOptions, callback)

        } else {
            common.addNodesToJstree(treeDivId, parentNodeId, jstreeData, jsTreeOptions)
        }


    }


    return self;

})();
