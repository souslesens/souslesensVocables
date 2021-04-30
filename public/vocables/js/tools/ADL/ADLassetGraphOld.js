var ADLassetGraph = (function () {
    var self = {}


    self.drawAsset = function (assetLabel) {

        if (!assetLabel)
            assetLabel = $("#ADLmappings_DatabaseSelect").val();

        var assetMappings = {}


        $.ajax({
            type: "POST",
            url: Config.serverUrl,
            data: {getAssetGlobalMappings: assetLabel},
            dataType: "json",

            success: function (data, textStatus, jqXHR) {
                var relationalKeys = {}
                for (var key in data.relationalKeysMap) {
                    relationalKeys[key.toLowerCase()] = data.relationalKeysMap[key].toLowerCase()
                }


                assetMappings = data;
                var visjsData = {nodes: [], edges: []}
                var existingNodes = {}

                assetMappings.mappings.sort(function (a, b) {
                    var subjectA = common.deconcatSQLTableColumn(a.subject).column
                    var subjectB = common.deconcatSQLTableColumn(b.subject).column
                    if (subjectA = "id" && subjectB != "id")
                        return -1
                    if (subjectA != "id" && subjectB == "id")
                        return 1
                    return 0;
                })
                assetMappings.mappings.forEach(function (mapping) {

                    var subjectObj = common.deconcatSQLTableColumn(mapping.subject)
                    var anchor = $("#" + subjectObj.table.replace(/\./g, "_") + "_anchor")
                    anchor.css("color", "#86d5f8")
                    if (subjectObj.column != "id" && (subjectObj.column.indexOf("id") == subjectObj.column.length - 2)) {
                        if (subjectObj.column == "functionalclassid")
                            var x = 3
                        var subjectBis = relationalKeys[mapping.subject.substring(mapping.subject.indexOf(".") + 1)]
                        if (!subjectBis)
                            return console.log(mapping.subject);
                      //  console.log(subjectBis)
                        subjectObj = common.deconcatSQLTableColumn(subjectBis)

                    }
                var borderWidth=1;

                    var p=subjectObj.table.indexOf(".")//pb with schema
                    if(p>-1)
                    subjectObj.table=subjectObj.table.substring(p+1)
                    if(subjectObj.column == "id" )
                        borderWidth=3
                    var subject = subjectObj.table + "." + subjectObj.column
                    if (!existingNodes[subject]) {
                        existingNodes[subject] = 1
                        visjsData.nodes.push({
                            id: subject,
                            label: subject,
                            shape: "box",
                            color: "#eee8dd",
                            borderWidth:borderWidth,
                            data: {}

                        })

                    }

                    var objectId=mapping.object
                    var objectObj = common.deconcatSQLTableColumn(mapping.object)
                    if(objectObj && objectObj.table) {
                        var p = objectObj.table.indexOf(".")//pb with schema
                        if (p > -1)
                            objectObj.table = objectObj.table.substring(p + 1)
                        objectId=objectObj.table+"."+objectObj.column
                    }
                    if (!existingNodes[objectId] || objectId.indexOf("xsd") > -1) {
                        existingNodes[objectId] = 1
                        var label = objectId
                        var modelObj = data.model[objectId];
                        if (modelObj)
                            label = modelObj.label
                        var shape = "box"
                        var color = "#eee8dd"
                        if (mapping.predicate == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
                            shape = "box"
                            var colorKey = ""
                            if (data.model[objectId] && data.model[objectId].parents.indexOf("ONE-MODEL") > -1) {
                                colorKey = "ADLmappings_OneModelTree"
                            } else if (objectId.indexOf("xsd") > -1) {
                                colorKey = "ADLmappings_LiteralsTree"
                                shape = "star"
                                objectId=objectId+common.getRandomHexaId(3)
                            } else {

                                colorKey = "ADLmappingsjsOtherOntologiesTreeDiv"

                            }
                            color = ADLmappings.sourceTypeColors[colorKey]
                        }


                        visjsData.nodes.push({
                            id:objectId,
                            label: label,
                            data: {},
                            shape: shape,
                            color: color

                        })

                    }
                    var edgeId = subject + "_" + mapping.predicate + "_" +objectId
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1
                        var label = mapping.predicate
                        var modelObj = data.model[mapping.predicate];
                        if (modelObj)
                            label = modelObj.label
                        else {
                            var p = label.lastIndexOf("#")
                            if (p > -1)
                                label = label.substring(p + 1)
                        }
                        visjsData.edges.push({
                            id: edgeId,
                            from: subject,
                            to: objectId,
                            label: label

                        })

                    }

                })

                var options = {
                    selectNodeFn: function (node, event) {
                        if (node)
                            self.currentNode = node;
                    },
                    //  onRightClickFn: self.graphActions.showGraphPopupMenu,
                    keepNodePositionOnDrag: 1,

                    /*    "physics": {
                            "barnesHut": {
                                "gravitationalConstant": -34200,
                                "centralGravity": 0.35,
                                "springLength": 400
                            },
                            "minVelocity": 0.75
                        }*/
                }
                $("#ADLassetGraphDiv").dialog("open")
                setTimeout(function () {

                    $("#ADLassetGraphDiv").html("<div id='ADLmappings_GlobalGraph' style='width:100%;height:100%'></div>")
                    // $("#mainDialogDiv").height()
                    visjsGraph.draw("ADLmappings_GlobalGraph", visjsData, options)
                    visjsGraph.network.fit()
                })


            }, error: function (err) {
                MainController.UI.message(err)
            }
        })


    }


    return self;


})()