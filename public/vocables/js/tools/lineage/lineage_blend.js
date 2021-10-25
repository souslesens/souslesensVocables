var Lineage_blend = (function () {


    var self = {}


    self.addBlendJstreeMenuItems = function (items) {

        items.PasteAs = {
            label: "Paste as... ",
            "action": false,
            "submenu": {
                PasteAsSubClassOf: {
                    label: "SubClassOf",
                    action: function () {
                        Lineage_blend.pasteAsSubClassOf(SourceBrowser.currentTreeNode.data)

                    }
                },
                PasteAsSameAs: {
                    label: "SameAs",
                    action: function () {
                        Lineage_blend.pasteAsSameAs(SourceBrowser.currentTreeNode.data)

                    }
                }
            }
        }
        return items

    }

    self.setClipboardNode = function (node) {
        self.currentClipboardNode = node.data
        $("#lineage_clipboardNodeDiv").html(node.data.source + "." + node.data.label)

    }


    self.setCurrentNode = function (node) {
        self.currentSelectedNode = node.data
        $("#lineage_currentNodeDiv").html(node.data.source + "." + node.data.label)

    }
    self.clearClipboardNode = function () {
        self.currentClipboardNode = null
        $("#lineage_clipboardNodeDiv").html("")
    }

    self.pasteAsSubClassOf = function () {

        var sourceNode = self.currentClipboardNode
        var targetNode = self.currentSelectedNode
        if (!sourceNode || !targetNode)
            return "copy a source node and select "
        if (!confirm("paste " + sourceNode.source + "." + sourceNode.label + "  as subClassOf " + targetNode.source + "." + targetNode.label + "?"))
            return;
        var propId= "http://www.w3.org/2000/01/rdf-schema#subClassOf"
        self.createRestriction(sourceNode.id,targetNode.id, propId, function(err, result) {
            if (err)
                return alert(err);
            return alert("DONE")
        })


    }

    self.pasteAsSameAs = function (targetNode) {
        var sourceNode = self.currentClipboardNode
        var targetNode = self.currentSelectedNode
        if (!sourceNode || !targetNode)
            return "copy a source node and select "
        if (!confirm("paste " + sourceNode.source + "." + sourceNode.label + "  as subClassOf " + targetNode.source + "." + targetNode.label + "?"))
            return;
        var propId="http://www.w3.org/2002/07/owl#sameAs"
        self.createRestriction(sourceNode.id,targetNode.id, propId, function(err, result) {
            if (err)
                return alert(err);
            return alert("DONE")
        })


    }

    self.createRestriction=function(souceNodeId,targetNodeId, propId, callback){
        var restrictionsTriples = []
        var blankNode = "_:b" + common.getRandomHexaId(8)

        restrictionsTriples.push({
            subject: souceNodeId,
            predicate: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
            object: blankNode
        })
        restrictionsTriples.push({
            subject: blankNode,
            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            object: "http://www.w3.org/2002/07/owl#Restriction"
        })
        restrictionsTriples.push({
            subject: blankNode,
            predicate: "http://www.w3.org/2002/07/owl#onProperty",
            object: targetNodeId
        })
        restrictionsTriples.push({
            subject: blankNode,
            predicate: "http://www.w3.org/2002/07/owl#someValuesFrom",
            object: propId
        })


        Sparql_generic.insertTriples(Lineage_classes.mainSource, restrictionsTriples, function (err, result) {
           callback(err,"DONE")
        })
    }


    return self;

})()