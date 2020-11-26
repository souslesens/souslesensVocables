var TreeController = (function () {

    var self = {};


    self.drawOrUpdateTree = function (treeDivId, data, parentNodeId, childNodeVar, jsTreeOptions, callback) {
        if (!jsTreeOptions)
            jsTreeOptions = {}

        var jstreeData = [];
        var existingNodes = {}
        data.forEach(function (item) {

            var type = item[childNodeVar + "Type"]
            if (!type) {// force concept Type
                type="http://www.w3.org/2004/02/skos/core#Concept"
                 console.log("node " + item[childNodeVar].value + " has no type")
            }
            type=type.value;
            type= jsTreeOptions.type || type
            if (childNodeVar && item[childNodeVar]) {
                var childNodeId = item[childNodeVar].value;
                var childNodeLabel = common.getItemLabel(item, childNodeVar)
                if(false){
                    console.log(childNodeLabel)
                }
if(true || jsTreeOptions.labelClass) {
    var cssType=type
    if(type=="http://www.w3.org/2004/02/skos/core#Concept")
        cssType="concept"
    childNodeLabel = "<span class='treeType_" + cssType + "'>" + childNodeLabel + "</span>"
}

                if (!existingNodes[childNodeId]) {
                    existingNodes[childNodeId] = 1;

                    var child = {
                        parent: parentNodeId,
                        id: childNodeId,
                        text: childNodeLabel,
                        data: {type: type,source:jsTreeOptions.source}

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


    }




    return self;

})();
