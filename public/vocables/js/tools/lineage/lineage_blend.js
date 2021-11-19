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
                        Lineage_blend.createRelation(SourceBrowser.currentTreeNode.data)

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


    self.addNodeToAssociationNode = function (node,role) {
        if(role=="source") {
            self.currentAssociation = [node.data,[]]
            $("#lineage_sourceNodeDiv").html(node.data.source + "." + node.data.label)
            $("#lineage_targetNodeDiv").html("")
        }
        else  if(role=="target") {
            self.currentAssociation[1]=node.data;
            $("#lineage_targetNodeDiv").html(node.data.source + "." + node.data.label)
        }
     /*   if (!self.currentAssociation || self.currentAssociation.length == 2) {
            self.currentAssociation = [node.data]
            $("#lineage_sourceNodeDiv").html(node.data.source + "." + node.data.label)
            $("#lineage_targetNodeDiv").html("")
        } else {
            self.currentAssociation.push(node.data);
            $("#lineage_targetNodeDiv").html(node.data.source + "." + node.data.label)
        }*/

        if (self.currentAssociation && self.currentAssociation.length == 2) {
            $("#lineage_blendButtonsDiv").css('display', 'block')
        } else {
            $("#lineage_blendButtonsDiv").css('display', 'none')
        }


        $("#GenericTools_searchAllSourcesTermInput").val(node.data.label)
        $("#GenericTools_searchInAllSources").prop("checked",true)
    }


    self.createRelation = function (type) {
        var sourceNode = self.currentAssociation[0]
        var targetNode = self.currentAssociation[1]
        if (!sourceNode || !targetNode)
            return "copy a source node and select "
        if (!confirm("paste " + sourceNode.source + "." + sourceNode.label + "  as subClassOf " + targetNode.source + "." + targetNode.label + "?"))
            return;


        async.series([
            function (callbackSeries) {
                var imports = Config.sources[Lineage_classes.mainSource].imports;
                if (imports || imports.indexOf(sourceNode.source) > -1) {
                    return callbackSeries()
                }
                if (!confirm("add  source " + targetNode.source + " to imports of source " + Lineage_common.currentSource))
                    return callbackSeries("stop");
                self.addImportToCurrentSource(Lineage_classes.mainSource, targetNode.source, function (err, result) {
                    Lineage_classes.registerSource(targetNode.source);
                    callbackSeries()

                })

            }

            ,    function (callbackSeries) {
                if (type == 'sameAs') {
                var propId = "http://www.w3.org/2002/07/owl#sameAs"
                self.createPropertyRangeAndDomain(Lineage_classes.mainSource, sourceNode.id, targetNode.id, propId, function (err, result) {
                    if (err)
                        return alert(err);
                    callbackSeries()
                    MainController.UI.message("relation added", true)

                })
            }

            }

        ], function (err) {

        })



    }

    self.pasteAsSameAs = function (targetNode) {
        var sourceNode = self.currentClipboardNode
        var targetNode = self.currentSelectedNode
        if (!sourceNode || !targetNode)
            return "copy a source node and select "
        if (!confirm("paste " + sourceNode.source + "." + sourceNode.label + "  as subClassOf " + targetNode.source + "." + targetNode.label + "?"))
            return;
        var propId = "http://www.w3.org/2002/07/owl#sameAs"
        self.createRestriction(sourceNode.id, targetNode.id, propId, function (err, result) {
            if (err)
                return alert(err);
            MainController.UI.message("restriction added", true)
        })


    }

    self.deleteRestriction = function (restrictionNode) {
        if (confirm("delete selected restriction")) {
            Sparql_generic.deleteTriples(restrictionNode.data.source, restrictionNode.data.bNodeId, null, null, function (err, result) {
                visjsGraph.data.edges.remove(restrictionNode.id)
                MainController.UI.message("restriction removed", true)
            })
        }
    }


    self.createPropertyRangeAndDomain = function (source, souceNodeId, targetNodeId, propId, callback) {
        var triples = []


        triples.push({
            subject: propId,
            predicate: "http://www.w3.org/2000/01/rdf-schema#domain",
            object: souceNodeId
        })
        triples.push({
            subject: propId,
            predicate: "http://www.w3.org/2000/01/rdf-schema#range",
            object: targetNodeId
        })



        Sparql_generic.insertTriples(source, triples, function (err, result) {
            self.addRelationToGraph(propId)
           // Lineage_classes.drawObjectProperties(null,   [souceNodeId], Lineage_classes.mainSource)
            callback(err, "DONE")
        })
    }

        ,
        self.createRestriction = function (souceNodeId, targetNodeId, propId, callback) {
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

console.log(JSON.stringify(restrictionsTriples,null,2))
            Sparql_generic.insertTriples(Lineage_classes.mainSource, restrictionsTriples, function (err, result) {
                Lineage_classes.drawRestrictions(null, false, Lineage_classes.mainSource)
                callback(err, "DONE")
            })
        }

    self.addImportToCurrentSource = function (parentSource, importedSource, callback) {
        var payload = {
            addImportToSource: 1,
            parentSource: parentSource,
            importedSource: importedSource
        }
        $.ajax({
            type: "POST",
            url: Config.serverUrl,
            data: payload,
            dataType: "json",
            success: function (data, textStatus, jqXHR) {
                if (!Config.sources[parentSource].imports)//synchro on client
                    Config.sources[parentSource].imports = []
                Config.sources[parentSource].imports.push(importedSource)
                return callback()
            },
            error: function (err) {
                return callback(err)
            }
        })


    }

    self.addRelationToGraph=function(propUri){
        var sourceNode = self.currentAssociation[0]
        var targetNode = self.currentAssociation[1]

        var existingNodes=visjsGraph.getExistingIdsMap();
        var visjsData={nodes:[],edges:[]}

        if (!existingNodes[sourceNode.id]) {
            existingNodes[sourceNode.id] = 1;
            visjsData.nodes.push({
                id: sourceNode.id,
                label: sourceNode.label,
                shape: Lineage_classes.defaultShape,
                size: Lineage_classes.defaultShapeSize,
                color: Lineage_classes.getSourceColor(sourceNode.source),
                level: Lineage_classes.currentExpandLevel,
                data: {
                    id: sourceNode.id,
                    label: sourceNode.label,
                    source:sourceNode.source
                }
            })

        }


        if (!existingNodes[targetNode.id]) {
            existingNodes[targetNode.id] = 1;
            visjsData.nodes.push({
                id: targetNode.id,
                label: targetNode.label,
                shape: Lineage_classes.defaultShape,
                size: Lineage_classes.defaultShapeSize,
                color: Lineage_classes.getSourceColor(targetNode.source),
                level: Lineage_classes.currentExpandLevel,
                data: {
                    id: targetNode.id,
                    label: targetNode.label,
                    source:targetNode.source
                }
            })

        }

        var edgeId=sourceNode.id+"_"+propUri+"_"+targetNode.id
        if (!existingNodes[edgeId]) {
            existingNodes[edgeId] = 1
          var propLabel=Sparql_common.getLabelFromId(propUri)
                visjsData.edges.push({
                    id: edgeId,
                    from: sourceNode.id,
                    to:targetNode.id,
                    label: "<i>" + propLabel + "</i>",
                    data: {propertyId: propUri, source: Lineage_classes.mainSource},
                    font: {multi: true, size: 10},
                    // font: {align: "middle", ital: {color:Lineage_classes.objectPropertyColor, mod: "italic", size: 10}},
                    //   physics:false,
                    arrows: {
                        from: {
                            enabled: true,
                            type: "bar",
                            scaleFactor: 0.5
                        },
                    },
                    dashes: true,
                    color: Lineage_classes.objectPropertyColor

                })

        }
        visjsGraph.data.nodes.add(visjsData.nodes)
        visjsGraph.data.edges.add(visjsData.edges)
        visjsGraph.network.fit()
        $("#waitImg").css("display", "none");

    }





    return self;

})()