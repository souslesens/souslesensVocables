var ADLassetGraph = (function () {
    var self = {}
 self.currentADLgraphURI=null;
    self.highlightMappedTables = function (assetLabel) {

        $.ajax({
            type: "POST",
            url: Config.serverUrl,
            data: {getAssetGlobalMappings: assetLabel},
            dataType: "json",

            success: function (result, textStatus, jqXHR) {
                for (var key in result.data) {
                    var table = result.data[key].adlTable.toLowerCase()
                    var anchor = $("#" + table.replace(/\./g, "_") + "_anchor")
                    if (result.data[key].build)
                        anchor.css("color", "#cc51ee")
                    else
                        anchor.css("color", "#86d5f8")

                    if(result.data[key].build && result.data[key].build.graphUri)
                        self.currentADLgraphURI=result.data[key].build.graphUri
                }

            }, error(err) {
                alert("Cannot load mappingFiles")
            }
        })
    }

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
                    var subjectA = common.deconcatSQLTableColumn(a.subject, true).column
                    var subjectB = common.deconcatSQLTableColumn(b.subject, true).column
                    if (subjectA = "id" && subjectB != "id")
                        return -1
                    if (subjectA != "id" && subjectB == "id")
                        return 1
                    return 0;
                })
                assetMappings.mappings.forEach(function (mapping) {


                    //mark table in tables tree
                    var anchor = $("#" + common.deconcatSQLTableColumn(mapping.subject).table.replace(/\./g, "_") + "_anchor")
                    anchor.css("color", "#86d5f8")

                    var subjectObj = common.deconcatSQLTableColumn(mapping.subject, true)
                    var subjectId = subjectObj.table + "." + subjectObj.column

                    if (subjectObj.column != "id" && (subjectObj.column.indexOf("id") == subjectObj.column.length - 2)) {

                        //  var subjectBis = relationalKeys[mapping.subject.substring(mapping.subject.indexOf(".") + 1)]

                        var subjectBis = relationalKeys[subjectId]
                        if (!subjectBis)
                            return console.log("Missing primary key to" + mapping.subject);

                        subjectId = subjectBis;
                        /*   var edgeId = subjectId + "_" + "join" + "_" +subjectBis
                           if (!existingNodes[edgeId]) {
                               existingNodes[edgeId] = 1
                               visjsData.edges.push({
                                   id: edgeId,
                                   from: subjectId,
                                   to: subjectBis,
                                   dashes: true,
                                   color:"blue"
                               })
                           }*/
                    }


                    var borderWidth = 1;
                    if (subjectObj.column == "id")
                        borderWidth = 6
                    //   var subjectId = subjectObj.table + "." + subjectObj.column
                    if (!existingNodes[subjectId]) {
                        existingNodes[subjectId] = 1
                        visjsData.nodes.push({
                            id: subjectId,
                            label: subjectId,
                            shape: "box",
                            color: "#eee8dd",
                            borderWidth: borderWidth,
                            data: {}

                        })

                    }
                    var objectId = mapping.object
                    var objectObj = common.deconcatSQLTableColumn(mapping.object, true)
                    if (objectObj)
                        objectId = objectObj.table + "." + objectObj.column

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
                                objectId = objectId + common.getRandomHexaId(3)
                            } else {

                                colorKey = "ADLmappingsjsOtherOntologiesTreeDiv"

                            }
                            color = ADLmappings.sourceTypeColors[colorKey]
                        }


                        visjsData.nodes.push({
                            id: objectId,
                            label: label,
                            data: {},
                            shape: shape,
                            color: color

                        })

                    }
                    var edgeId = subjectId + "_" + mapping.predicate + "_" + objectId
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1
                        var label = null
                        if (mapping.predicate != "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
                            label = mapping.predicate
                            var modelObj = data.model[mapping.predicate];
                            if (modelObj)
                                label = modelObj.label
                            else {
                                var p = label.lastIndexOf("#")
                                if (p > -1)
                                    label = label.substring(p + 1)
                            }
                        }
                        visjsData.edges.push({
                            id: edgeId,
                            from: subjectId,
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

    self.drawSemanticAsset = function (assetLabel) {

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


                var classes = {}
                var columns = {}
                assetMappings.mappings.forEach(function (mapping) {


                    if (mapping.predicate == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
                        if (!classes[mapping.object])
                            classes[mapping.object] = {}
                        classes[mapping.object][mapping.subject] = {}


                    } else {
                        if (!columns[mapping.subject])
                            columns[mapping.subject] = {direct: {}, inverse: {}}
                        // columns[mapping.subject].direct:{},inverse:{}}

                    }
                })


                assetMappings.mappings.forEach(function (mapping) {

                })


                assetMappings.mappings.forEach(function (mapping) {
                    var subjectObj = common.deconcatSQLTableColumn(mapping.subject, true)
                    var subjectId = subjectObj.table + "." + subjectObj.column

                    if (subjectObj.column != "id" && (subjectObj.column.indexOf("id") == subjectObj.column.length - 2)) {

                        //  var subjectBis = relationalKeys[mapping.subject.substring(mapping.subject.indexOf(".") + 1)]

                        var subjectBis = relationalKeys[subjectId]
                        if (!subjectBis)
                            return console.log("Missing primary key to" + mapping.subject);

                        subjectId = subjectBis;
                        /*   var edgeId = subjectId + "_" + "join" + "_" +subjectBis
                           if (!existingNodes[edgeId]) {
                               existingNodes[edgeId] = 1
                               visjsData.edges.push({
                                   id: edgeId,
                                   from: subjectId,
                                   to: subjectBis,
                                   dashes: true,
                                   color:"blue"
                               })
                           }*/
                    }


                    var borderWidth = 1;
                    if (subjectObj.column == "id")
                        borderWidth = 6
                    //   var subjectId = subjectObj.table + "." + subjectObj.column
                    if (!existingNodes[subjectId]) {
                        existingNodes[subjectId] = 1
                        visjsData.nodes.push({
                            id: subjectId,
                            label: subjectId,
                            shape: "box",
                            color: "#eee8dd",
                            borderWidth: borderWidth,
                            data: {}

                        })

                    }
                    var objectId = mapping.object
                    var objectObj = common.deconcatSQLTableColumn(mapping.object, true)
                    if (objectObj)
                        objectId = objectObj.table + "." + objectObj.column

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
                                objectId = objectId + common.getRandomHexaId(3)
                            } else {

                                colorKey = "ADLmappingsjsOtherOntologiesTreeDiv"

                            }
                            color = ADLmappings.sourceTypeColors[colorKey]
                        }


                        visjsData.nodes.push({
                            id: objectId,
                            label: label,
                            data: {},
                            shape: shape,
                            color: color

                        })

                    }
                    var edgeId = subjectId + "_" + mapping.predicate + "_" + objectId
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1
                        var label = null
                        if (mapping.predicate != "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
                            label = mapping.predicate
                            var modelObj = data.model[mapping.predicate];
                            if (modelObj)
                                label = modelObj.label
                            else {
                                var p = label.lastIndexOf("#")
                                if (p > -1)
                                    label = label.substring(p + 1)
                            }
                        }
                        visjsData.edges.push({
                            id: edgeId,
                            from: subjectId,
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
    self.zoomOnTable = function (nodeData) {
        var visjsId = nodeData.id + ".id"
        var obj = common.deconcatSQLTableColumn(visjsId, true)
        visjsId = obj.table + "." + obj.column
        visjsGraph.network.focus(visjsId, {
            scale: 1,
            animation: true

        })
    }


    return self;


})()