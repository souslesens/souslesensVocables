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


    self.addNodeToAssociationNode = function (node) {
        if(!self.currentAssociation || self.currentAssociation.length==2 ) {
            self.currentAssociation = [node.data]
            $("#lineage_sourceNodeDiv").html(node.data.source + "." + node.data.label)
        } else {
            self.currentAssociation.push(node.data);
            $("#lineage_targetNodeDiv").html(node.data.source + "." + node.data.label)
        }
        if(self.currentAssociation && self.currentAssociation.length==2){
            $("#lineage_blendButtonsDiv").css('display','block')
        }else{
            $("#lineage_blendButtonsDiv").css('display','none')
        }
    }




    self.pasteAsSubClassOf = function () {
        var sourceNode = self.currentAssociation[0]
        var targetNode = self.currentAssociation[1]
        if (!sourceNode || !targetNode)
            return "copy a source node and select "
        if (!confirm("paste " + sourceNode.source + "." + sourceNode.label + "  as subClassOf " + targetNode.source + "." + targetNode.label + "?"))
            return;
        var propId= "http://www.w3.org/2000/01/rdf-schema#subClassOf"
        self.createRestriction(sourceNode.id,targetNode.id, propId, function(err, result) {
            if (err)
                return alert(err);
            MainController.UI.message("restriction added",true)
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
          MainController.UI.message("restriction added",true)
        })


    }

    self.deleteRestriction = function (restrictionNode) {
        if (confirm("delete selected restriction")){
            Sparql_generic.deleteTriples(restrictionNode.data.source, restrictionNode.data.bNodeId, null, null, function (err, result) {
                visjsGraph.data.edges.remove(restrictionNode.id)
                MainController.UI.message("restriction removed", true)
            })
        }
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
            object: propId
        })
        restrictionsTriples.push({
            subject: blankNode,
            predicate: "http://www.w3.org/2002/07/owl#someValuesFrom",
            object: targetNodeId
        })


        Sparql_generic.insertTriples(Lineage_classes.mainSource, restrictionsTriples, function (err, result) {
            Lineage_classes.drawRestrictions(null, false,Lineage_classes.mainSource)
           callback(err,"DONE")
        })
    }


    return self;

})()