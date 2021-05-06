var ADLassetGraph = (function () {
    var self = {}
    self.currentADLgraphURI = null;
    self.drawAssetNew = function (assetLabel) {

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


                    var subjectObj = common.deconcatSQLTableColumn(mapping.subject, true)
                    var subjectId = subjectObj.table + "." + subjectObj.column

                    if (subjectObj.column != "id" && (subjectObj.column.indexOf("id") == subjectObj.column.length - 2)) {
//console.log(subjectId)
                        if (subjectId == "tbltagtomodel.modelid")
                            var x = 3
                        //  var subjectBis = relationalKeys[mapping.subject.substring(mapping.subject.indexOf(".") + 1)]

                        var subjectBis = relationalKeys[subjectId]

                        if (!subjectBis)
                            return console.log("Missing primary key to" + mapping.subject);

                        subjectId = subjectBis;

                    }

                    var borderWidth = 1;
                    if (subjectObj.column == "id") {

                        borderWidth = 6
                        if (mapping.predicate == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
                            shape = "box"
                            var colorKey = ""
                            if (data.model[objectId] && data.model[objectId].parents.indexOf("ONE-MODEL") > -1) {
                                colorKey = "ADLmappings_OneModelTree"
                            } else {

                                colorKey = "ADLmappingsjsOtherOntologiesTreeDiv"

                            }
                            color = ADLmappings.sourceTypeColors[colorKey]
                        }
                        var classLabel = mapping.object;
                        if (data.model[mapping.object])
                            classLabel = data.model[mapping.object].label
                        var label = classLabel + " / " + subjectId
                        //   var subjectId = subjectObj.table + "." + subjectObj.column
                        if (!existingNodes[subjectId]) {
                            existingNodes[subjectId] = 1
                            visjsData.nodes.push({
                                id: subjectId,
                                label: label,
                                shape: shape,
                                color: color,
                                borderWidth: borderWidth,
                                data: {}

                            })

                        }
                        return;
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

    self.drawAsset = function (assetLabel, callback) {

        if (!assetLabel)
            assetLabel = $("#ADLmappings_DatabaseSelect").val();

        var assetMappings = {}
        var builtClasses = {}
        var mappingsData
        async.series([
            function (callbackSeries) {
                ADLassetGraph.getBuiltMappingsStats(assetLabel, function (err, result) {
                    if (err)
                        return callbackSeries(err)
                    builtClasses = result
                    return callbackSeries();
                })

            },

            //load mappings
            function (callbackSeries) {
                $.ajax({
                    type: "POST",
                    url: Config.serverUrl,
                    data: {getAssetGlobalMappings: assetLabel},
                    dataType: "json",

                    success: function (data, textStatus, jqXHR) {
                        mappingsData=data;
                        return callbackSeries();
                    },
                    error: function (err) {
                        return callbackSeries(err);

                    }
                })
            },
            //draw graph
            function (callbackSeries) {
            var data=mappingsData;
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

                var predicates = {}
                var classes = {}
                assetMappings.mappings.forEach(function (mapping) {

                    if (mapping.predicate == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
                        if (!classes[mapping.subject])
                            classes[mapping.subject] = mapping.object
                    }


                    //mark table in tables tree
                    var anchor = $("#" + common.deconcatSQLTableColumn(mapping.subject).table.replace(/\./g, "_") + "_anchor")
                    anchor.css("color", "#86d5f8")

                    var subjectObj = common.deconcatSQLTableColumn(mapping.subject, true)
                    var subjectId = subjectObj.table + "." + subjectObj.column

                    if (subjectObj.column != "id" && (subjectObj.column.indexOf("id") == subjectObj.column.length - 2)) {

                        var subjectBis = relationalKeys[subjectId]

                        if (!subjectBis)
                            return console.log("Missing primary key to" + mapping.subject);


                        var edgeId = subjectId + "_" + "join" + "_" + subjectBis
                        if (!existingNodes[edgeId]) {
                            existingNodes[edgeId] = 1
                            visjsData.edges.push({
                                id: edgeId,
                                from: subjectId,
                                to: subjectBis,
                                dashes: true,
                                color: "blue"
                            })
                        }
                        subjectId = subjectBis;
                    } else {

                    }


                    var borderWidth = 1;
                    var objectId = mapping.object
                    if (true && subjectId.column == "id") {


                        borderWidth = 6
                        var label = objectId
                        var modelObj = data.model[objectId];
                        if (modelObj)
                            label = modelObj.label
                        var shape = "box"
                        var color = "#eee8dd"
                        var colorKey = ""
                        if (data.model[objectId] && data.model[objectId].parents.indexOf("ONE-MODEL") > -1) {
                            colorKey = "ADLmappings_OneModelTree"
                        } else {

                            colorKey = "ADLmappingsjsOtherOntologiesTreeDiv"

                        }
                        color = ADLmappings.sourceTypeColors[colorKey]

                        if(builtClasses[objectId])
                            shape="ellipse"
                        label = subjectId + " -> " + label
                        if (!existingNodes[subjectId]) {
                            existingNodes[subjectId] = 1
                            visjsData.nodes.push({
                                id: subjectId,
                                label: label,
                                data: {},
                                shape: shape,
                                color: color,
                                widthConstraint: true

                            })
                        }

                        return

                    } else {
                        if (!predicates[mapping.predicate])
                            predicates[mapping.predicate] = {}
                        if (!predicates[mapping.predicate][mapping.subject])
                            predicates[mapping.predicate][mapping.subject] = []
                        predicates[mapping.predicate][mapping.subject].push(mapping.object)
                    }


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
                            widthConstraint: true,
                            data: {}

                        })

                    }

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
                            color: color,
                            widthConstraint: true,

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
                            label: label,
                            length:2,
                            color:color,
                            width:3


                        })

                    }

                })

                var predicates2 = {}
                for (var predicate in predicates) {
                    predicates2[predicate] = {}
                    for (var subject in predicates[predicate]) {
                        predicates2[predicate][classes[subject]] = [];
                        predicates[predicate][subject].forEach(function (object) {
                            predicates2[predicate][classes[subject]].push(classes[object])
                        })


                    }
                }
                var x = predicates2


                if (callback)
                    return (callback(null, {predicates: predicates2, model: data.model}))


                var options = {
                    selectNodeFn: function (node, event) {
                        if (node)
                            self.currentNode = node;
                    },
                    //  onRightClickFn: self.graphActions.showGraphPopupMenu,
                    keepNodePositionOnDrag: 1,
                    simulationTimeOut: 10000

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
            }

        ], function (err) {
if(err)
    MainController.UI.message(err)
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


self.getBuiltMappingsStats = function (assetLabel, callback) {
    //  filterClassesStr = Sparql_common.setFilter("sub", node.data.id)
    var fromStr = Sparql_common.getFromStr(assetLabel)
    var query = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
        "SELECT (COUNT(?sub) AS ?count) ?type " + fromStr + " WHERE {\n" +
        "  ?sub rdf:type ?type\n" +
        "} group by ?type"

    var url = Config.sources[assetLabel].sparql_server.url + "?format=json&query=";

    Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: assetLabel}, function (err, result) {
        if (err) {
            return callback(err)
        }
        var buildClasses = {}
        result.results.bindings.forEach(function (item) {
            buildClasses[item.type.value] = {
                count: item.count.value,
                color: Lineage_classes.getPropertyColor(item.type.value)
            }
        })
        callback(null, buildClasses)
    })
}


return self;


})
()