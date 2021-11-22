var KGassetGraph = (function () {
    var self = {}
    self.currentKGgraphURI = null;

    self.getAssetGlobalMappings = function (assetLabel, callback) {


        if (!assetLabel)
            assetLabel = $("#KGmappings_DatabaseSelect").val();

        var assetMappings = {}
        var builtClasses = {}
        var visjsData = {nodes: [], edges: []}
        var predicates = {}
        var classes = {}
        var mappingsData
        async.series([

            function (callbackSeries) {

                KGassetGraph.getBuiltMappingsStats(assetLabel, function (err, result) {
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
                        mappingsData = data;
                        return callbackSeries();
                    },
                    error: function (err) {
                        return callbackSeries(err);

                    }
                })
            },


            //draw graph
            function (callbackSeries) {
                var relationalKeys = {}
                for (var key in mappingsData.relationalKeysMap) {
                    relationalKeys[key.toLowerCase()] = mappingsData.relationalKeysMap[key].toLowerCase()
                }


                var existingNodes = {}

                mappingsData.mappings.sort(function (a, b) {
                    var subjectA = common.deconcatSQLTableColumn(a.subject, true).column
                    var subjectB = common.deconcatSQLTableColumn(b.subject, true).column
                    if (subjectA = "id" && subjectB != "id")
                        return -1
                    if (subjectA != "id" && subjectB == "id")
                        return 1
                    return 0;
                })


                mappingsData.mappings.forEach(function (mapping) {
                    if (mapping.subject.indexOf("functionalclass") > -1)
                        var x = 3


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

                        if (subjectBis) {
                            //  return console.log("Missing primary key to" + mapping.subject);


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
                    }


                    var borderWidth = 1;
                    var objectId = mapping.object
                    if (true && subjectId.column == "id") {


                        borderWidth = 6
                        var label = objectId
                        var modelObj = mappingsData.model[objectId];
                        if (modelObj)
                            label = modelObj.label
                        var shape = "box"
                        var color = "#eee8dd"
                        var colorKey = ""
                        if (mappingsData.model[objectId] && mappingsData.model[objectId].parents.indexOf("ONE-MODEL") > -1) {
                            colorKey = "KGmappings_OneModelTree"
                        } else {

                            colorKey = "KGmappingsjsOtherOntologiesTreeDiv"

                        }
                        color = KGmappings.sourceTypeColors[colorKey]

                        if (builtClasses[objectId])
                            shape = "ellipse"
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


                    var color = "#eee8dd"

                    if (mapping.predicate.indexOf("DataTypeProperty") > -1)
                        color = "red"
                    if (subjectObj.column == "id")
                        borderWidth = 6
                    //   var subjectId = subjectObj.table + "." + subjectObj.column
                    if (!existingNodes[subjectId]) {

                        existingNodes[subjectId] = 1
                        visjsData.nodes.push({
                            id: subjectId,
                            label: subjectId,
                            shape: "box",
                            color: color,
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
                        var modelObj = mappingsData.model[objectId];
                        if (modelObj)
                            label = modelObj.label
                        var shape = "box"
                        var color = "#eee8dd"

                        if (mapping.predicate == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
                            shape = "box"
                            var colorKey = ""
                            if (mappingsData.model[objectId] && mappingsData.model[objectId].parents.indexOf("ONE-MODEL") > -1) {
                                colorKey = "KGmappings_OneModelTree"
                            } else if (objectId.indexOf("xsd") > -1) {
                                colorKey = "KGmappings_LiteralsTree"
                                shape = "star"
                                objectId = objectId + common.getRandomHexaId(3)
                            } else {

                                colorKey = "KGmappingsjsOtherOntologiesTreeDiv"

                            }
                            color = KGmappings.sourceTypeColors[colorKey]
                        }
//console.log(mapping.predicate)
                        if (mapping.predicate.indexOf("DatatypeProperty") > -1)
                            color = "#dac"

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
                            var modelObj = mappingsData.model[mapping.predicate];
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
                            length: 2,
                            color: color,
                            width: 3


                        })

                    }

                })

                callbackSeries()


            }

        ], function (err) {
            if (err)
                callback(err)
            var predicates2 = {}
            for (var predicate in predicates) {
                predicates2[predicate] = {}
                for (var subject in predicates[predicate]) {
                    if (!predicates2[predicate][classes[subject]])
                        predicates2[predicate][classes[subject]] = [];
                    predicates[predicate][subject].forEach(function (object) {
                        predicates2[predicate][classes[subject]].push(classes[object])
                    })

                }
            }
            return (callback(null, {visjsData: visjsData, predicates: predicates2, model: mappingsData.model}))
        })


    }
    self.getBuiltMappingsStats = function (assetLabel, callback) {
        //  filterClassesStr = Sparql_common.setFilter("sub", node.data.id)
        var fromStr = Sparql_common.getFromStr(assetLabel)
        var query = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
            "SELECT (COUNT(distinct ?sub) AS ?count) ?type " + fromStr + " WHERE {\n" +
            "  ?sub rdf:type ?type\n" +
            "} group by ?type"

        var url = Config.sources[assetLabel].sparql_server.url + "?format=json&query=";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: assetLabel}, function (err, result) {
            if (err) {
                return callback(err)
            }

            var buildClasses = {}
            result.results.bindings.forEach(function (item) {
                var color;
                if(KGbrowserCustom.superClassesMap[item.type.value])
                    color=KGbrowserCustom.superClassesMap[item.type.value].color
                else
                    color= Lineage_classes.getPropertyColor(item.type.value)

                buildClasses[item.type.value] = {
                    count: item.count.value,
                    color: color
                }
            })
            callback(null, buildClasses)
        })
    }


    self.drawAssetTablesMappingsGraph = function (assetLabel) {


        self.getAssetGlobalMappings(assetLabel, function (err, result) {
            if (err)
                return MainController.UI.message(err);
            var visjsData = result.visjsData
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
            $("#KGassetGraphDiv").dialog("option", "title", "Global Tables mappings");
            $("#KGassetGraphDiv").dialog("open")
            setTimeout(function () {

                $("#KGassetGraphDiv").html("<div id='KGmappings_GlobalGraph' style='width:100%;height:90%'></div>")
                // $("#mainDialogDiv").height()
                visjsGraph.draw("KGmappings_GlobalGraph", visjsData, options)
                visjsGraph.network.fit()
            })
        })
    }

    self.drawClassesAndPropertiesGraph = function (source, graphDiv, options, callback) {


        if (!source)
            source = KGmappingData.currentSource
        if (!source) {
            return alert("select a source")
        }

        var hasMappings = Config.sources[source].dataSource
        if (!options)
            options = {}

        self.classes = {}
        var visjsData = {nodes: [], edges: []}

        MainController.UI.message("Processing data")
        async.series([
                //get adl types Stats
                function (callbackSeries) {

                    var filterClassesStr = ""

                    self.buildClasses = {}
                    KGassetGraph.getBuiltMappingsStats(source, function (err, result) {
                        if (err)
                            return callbackSeries(err)
                        self.buildClasses = result
                        return callbackSeries();
                    })


                },
                //get classes from mappings
                function (callbackSeries) {
                    if (!hasMappings) {
                        return callbackSeries();
                    }

                    KGassetGraph.getAssetGlobalMappings(source, function (err, result) {
                        KGbrowserCustom.initsuperClassesPalette()
                        self.model = result.model;
                        for (var predicate in result.predicates) {
                            if (predicate.indexOf("REQ") > -1)
                                var x = 0;
                            for (var subject in result.predicates[predicate]) {
                                if (!self.buildClasses[subject]) {
                                    //var color = Lineage_classes.getPropertyColor(subject)
                                    var color;
                                    if(KGbrowserCustom.superClassesMap[subject])
                                        color=KGbrowserCustom.superClassesMap[subject].color
                                    else
                                        color= Lineage_classes.getPropertyColor(subject)
                                    self.buildClasses[subject] = {
                                        count: 0,
                                        color: color
                                    }
                                    self.model[subject].color = color
                                }

                                if (!self.classes[subject])
                                    self.classes[subject] = {}
                                if (!self.classes[subject][predicate])
                                    self.classes[subject][predicate] = []
                                result.predicates[predicate][subject].forEach(function (object) {
                                    // if (self.buildClasses[object])
                                    if (object)
                                        self.classes[subject][predicate].push(object)
                                })


                            }

                        }
                        return callbackSeries();
                    })
                },

                function (callbackSeries) {
                    if (hasMappings) {
                        return callbackSeries();
                    }
                    KGassetGraph.getAssetGlobalModelFromTriples(source, function (err, result) {
                        if (err)
                            return callbackSeries(err)
                        self.classes = result.classes;
                        self.model = result.model
                        return callbackSeries()
                    })


                },

                function (callbackSeries) {

                    if (false && Object.keys(self.classes).length > Config.KG.browserMaxClassesToDrawClassesGraph)
                        return callbackSeries()
                    var existingNodes = {}
                    var newParents = []
                    var topNodeId
                    for (var subject in self.classes) {


                        if (subject.indexOf("xsd:") < 0) {

                            if (!existingNodes[subject]) {
                                existingNodes[subject] = 1
                                var countStr = ""
                                if (self.buildClasses[subject])
                                    countStr = " (" + self.buildClasses[subject].count + ")"
                                var label = self.model[subject].label ;//+ countStr;
                                var color = options.nodeColor || self.buildClasses[subject].color
                                if (!options.nodeColor)
                                    self.model[subject].color = color

                                var shape = "box"
                                if (subject.indexOf("xsd:") > -1) {
                                    shape = "star"
                                    color = "#ffe0aa"
                                }

                                var imageUrl = KGbrowserCustom.iconsDir + KGbrowserCustom.superClassesMap[subject].group.toLowerCase() + ".png"
                                var obj = {
                                    id: subject,
                                    label: label,
                                    // shape: shape,
                                    image: imageUrl,
                                   // size:25,
                                    imagePadding:3,
                                    shape: "circularImage",
                                    font: {bold: true, size: 18, color: color},
                                    fixed:true,
                                    color: color,

                                    data: {
                                        id: subject,
                                        type: "subject",
                                        label: self.model[subject].label,
                                        count: self.buildClasses[subject] ? self.buildClasses[subject].count : 0,


                                    }
                                }

                                visjsData.nodes.push(obj)

                            }
                            for (var predicate in self.classes[subject]) {


                                self.classes[subject][predicate].forEach(function (object) {
                                    if (object.indexOf("xsd:") > -1)
                                        return

                                    var edgeId = subject + "_" + predicate + "_" + object
                                    if (!existingNodes[edgeId]) {
                                        existingNodes[edgeId] = 1
                                        var predicateLabel = predicate;
                                        if (self.model[predicate])
                                            predicateLabel = self.model[predicate].label


                                        visjsData.edges.push({
                                            id: edgeId,
                                            from: subject,
                                            to: object,
                                            font: {bold: false,ital:1 ,size: 12, color: "#aaa"},
                                            label: predicateLabel,
                                            arrows: {to: true},
                                         /*   smooth: {
                                                type: "cubicBezier",
                                                forceDirection: "vertical",

                                                roundness: 0.4,
                                            }*/


                                        })
                                    }

                                    if (!existingNodes[object]) {
                                        existingNodes[object] = 1
                                        var label = self.model[object].label;
                                        var countStr = ""
                                        if (self.buildClasses[subject])
                                            countStr = " (" + self.buildClasses[subject].count + ")"
                                        label = label ;//+ countStr
                                        var color = options.nodeColor || self.buildClasses[object].color
                                        if (!options.nodeColor)
                                            self.model[object].color = color
                                        var shape = "box"
                                        if (object.indexOf("xsd:") > -1) {
                                            shape = "star"
                                            color = "#ffe0aa"
                                        }
                                        var imageUrl = KGbrowserCustom.iconsDir + KGbrowserCustom.superClassesMap[object].group.toLowerCase() + ".png"
                                        visjsData.nodes.push({
                                            id: object,
                                            label: label,
                                            //  shape: shape,
                                            imagePadding:3,
                                            color: color,
                                            image: imageUrl,
                                            fixed:true,
                                            shape: "circularImage",
                                            font: {bold: true, size: 18, color: color},
                                            data: {
                                                id: object,
                                                type: "subject",
                                                label: label,


                                            }
                                        })
                                    }
                                })


                            }
                        }
                    }


                    return callbackSeries();


                }],
            function (err) {
                if (err)
                    return alert(err)

                MainController.UI.message("Drawing model graph")
                if (true || visjsData.nodes.length <= Config.KG.browserMaxClassesToDrawClassesGraph) {

                    if (!options)
                        options = {}
                    options.keepNodePositionOnDrag = true
                    options.layoutHierarchical = {
                        direction: "UD",
                        //   levelSeparation: 50,
                     nodeSpacing: 150,
                        levelSeparation: 100,
                        sortMethod: "hubsize",
                        //  sortMethod:"directed",
                        //   shakeTowards:"roots"
                    }

                    if (!graphDiv) {
                        graphDiv = "KGmappings_GlobalGraph"
                        $("#KGassetGraphDiv").dialog("option", "title", "Asset Classes and properties");
                        $("#KGassetGraphDiv").dialog("open")
                        setTimeout(function () {

                            $("#KGassetGraphDiv").html("<div id='KGmappings_GlobalGraph' style='width:100%;height:90%'></div>")
                            // $("#mainDialogDiv").height()

                            if (visjsData.nodes.length < Config.KG.browserMaxClassesToDrawClassesGraph) {

                                visjsGraph.draw(graphDiv, visjsData, options)
                                visjsGraph.network.fit()
                            }
                        })
                    } else {
                        //  $("#KGassetGraphDiv").html("<div id='KGmappings_GlobalGraph' style='width:100%;height:90%'></div>")
                        // $("#mainDialogDiv").height()
                        if (visjsData.nodes.length < Config.KG.browserMaxClassesToDrawClassesGraph) {


                            visjsGraph.draw(graphDiv, visjsData, options)
                            visjsGraph.network.fit()
                        }

                    }
                }
                if (!self.model["http://www.w3.org/2000/01/rdf-schema#label"])
                    self.model["http://www.w3.org/2000/01/rdf-schema#label"] = {label:"label"}

                MainController.UI.message("", true)

                if (callback)
                    return callback(null, {model: self.model, classes: self.classes})


            })


    }

    self.getAssetGlobalModelFromTriples = function (sourceLabel, callback) {


        var assetGlobalModel = {
            "classes": {},
            "model": {}

        }
        var ids = []
        async.series([


            // query triples
            function (callbackSeries) {
                var fromStr = Sparql_common.getFromStr(sourceLabel)
                var query = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
                    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
                    "SELECT distinct ?subType ?prop ?objType ?subTypeLabel ?propLabel ?objTypeLabel  " + fromStr + "  WHERE {\n" +
                    "  ?sub ?prop ?obj.\n" +
                    "  ?sub rdf:type ?subType.\n" +
                    "  ?obj rdf:type ?objType.\n" +
                    "  filter( ?objType!=rdfs:Class)\n" +
                    "  optional {?subType rdfs:label ?subTypeLabel}\n" +
                    "   optional {?prop rdfs:label ?propLabel}\n" +
                    "   optional {?objType rdfs:label ?objTypeLabel}\n" +
                    "} "


                var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";

                Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: sourceLabel}, function (err, result) {
                    if (err) {
                        return callbackSeries(err)
                    }

                    var classes = {}

                    result.results.bindings.forEach(function (item) {
                        ids.push(item.subType.value)
                        ids.push(item.prop.value)
                        ids.push(item.objType.value)
                        if (!classes[item.subType.value])
                            classes[item.subType.value] = {}

                        if (!classes[item.subType.value][item.prop.value])
                            classes[item.subType.value][item.prop.value] = []
                        if (classes[item.subType.value][item.prop.value].indexOf(item.objType.value) < 0)
                            classes[item.subType.value][item.prop.value].push(item.objType.value)
                    })

                    assetGlobalModel.classes = classes
                    callbackSeries()
                })
            },

            //get model
            function (callbackSeries) {
                var slices = common.array.slice(ids, 30)
                var model = {}

                async.eachSeries(slices, function (ids, callbackEach) {
                    var filterStr = Sparql_common.setFilter("id", ids);
                    var query = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
                        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
                        "SELECT distinct ?id ?idLabel where { ?id rdfs:label ?idLabel.  " + filterStr + " }"


                    var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
                    Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: sourceLabel}, function (err, result) {
                        if (err) {
                            return callbackEach(err)
                        }
                        result.results.bindings.forEach(function (item) {
                            var label
                            if (!item.idLabel)
                                label = Sparql_common.getLabelFromURI(item.id.value)
                            else
                                label = item.idLabel.value

                            model[item.id.value] = {label: label}

                        })
                        callbackEach()
                    })

                }, function (err) {
                    ids.forEach(function (id) {
                        if (!model[id])
                            model[id] = {label: Sparql_common.getLabelFromURI(id)}
                    })

                    assetGlobalModel.model = model


                    callbackSeries()


                })


            }


        ], function (err) {
            /* for(var id in  assetGlobalModel.classes){
                 assetGlobalModel.classes[id]={"http://www.w3.org/2000/01/rdf-schema#label":["xsd:string"]}
             }*/
            return callback(err, assetGlobalModel)
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


})
()