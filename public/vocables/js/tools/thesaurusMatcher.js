//inclure altLabel


var ThesaurusMatcher = (function () {
        var self = {}
        self.maxSourceDescendants = 500;
        self.onSourceSelect = function (thesaurusLabel) {

            //  $("#actionDivContolPanelDiv").html("<button onclick='ThesaurusMatcher.showcompareWithDialog()'>Compare with...</button>")
            // $("#actionDivContolPanelDiv").html("<input id='GenericTools_searchTermInput'> <button onclick='ThesaurusBrowser.searchTerm()'>Search</button>")

            ThesaurusBrowser.showThesaurusTopConcepts(thesaurusLabel)


            $("#actionDivContolPanelDiv").load("snippets/thesaurusMatcher.html")
            setTimeout(function () {
                var sourceLabels = Object.keys(Config.sources).sort();
                common.fillSelectOptions("ThesaurusMatcher_targetGraphUriSelect", sourceLabels, true)
                $("#accordion").accordion("option", {active: 2});
            }, 200)


        }
        self.selectNodeFn = function (event, propertiesMap) {
            $("#ThesaurusMatcher_actionDiv").css('display', 'block')
            ThesaurusBrowser.openTreeNode("currentSourceTreeDiv", propertiesMap.node.data.source, propertiesMap.node)
            ThesaurusBrowser.currentTreeNode = propertiesMap.node
        }


        self.compareConcepts = function (compareAll, output, rdfType, fromSourceId, toSourceId, callback) {
            var sourceNodeId


            if (!fromSourceId)
                fromSourceId = MainController.currentSource;


            if (!toSourceId)
                toSourceId = $("#ThesaurusMatcher_targetGraphUriSelect").val();
            if (!fromSourceId)
                return MainController.UI.message("choose a target ressource");

            if (!output)
                output = $("#ThesaurusMatcher_outputTypeSelect").val();


            if (!rdfType)
                rdfType = ($("#ThesaurusMatcher_rdfTypeSelect").val());


            if (!compareAll)
                compareAll = $("#ThesaurusMatcher_compareAllCBX").prop("checked");


            if (!ThesaurusBrowser.currentTreeNode) {
                if (!compareAll) {
                    if (confirm("compare all  items")) {
                        $("#showOlderAncestorsOnlyCBX").prop("checked", "checked");
                        compareAll = true;
                    } else {
                        $("#waitImg").css("display", "none");
                        return;
                    }
                }
            } else {
                sourceNodeId = ThesaurusBrowser.currentTreeNode.data.id

                if (!sourceNodeId || sourceNodeId.length == 0) {
                    $("#waitImg").css("display", "none");
                    return alert(" no data.id field")
                }
            }

            var showAllSourceNodes = $("#showAllSourceNodesCBX").prop("checked");
            // var showOlderAncestorsOnly = $("#showOlderAncestorsOnlyCBX").prop("checked");
            var maxDescendantsDepth = parseInt($("#ThesaurusMatcher_maxDescendantsDepth").val());
            // var lang = "en"


            var sourceConceptAggrDepth = maxDescendantsDepth;
            var targetConceptAggrDepth = maxDescendantsDepth;
            var sliceSize = 30;

            var sourceConceptsCount = 0;
            var sourceConceptsProcessed = 0;
            var targetConceptsCount = 0
            var bindings = [];
            var allSourceConcepts = [];
            var commonConceptsMap = {};
            $("#dialogDiv").dialog("close")

            var targetSparql_url = Config.sources[toSourceId].sparql_server.url
            var targetGraphURI = Config.sources[toSourceId].graphUri;

            var matchResult = "";
            async.series([

                    //get source source Descendants
                    function (callbackSeries) {
                        if (compareAll)
                            return callbackSeries();

                        Sparql_generic.getNodeChildren(fromSourceId, null, sourceNodeId, sourceConceptAggrDepth, null, function (err, result) {
                            //                       Concepts.getConceptDescendants({depth: sourceConceptAggrDepth, selectLabels: true}, function (err, conceptsSets) {
                            if (err)
                                return callbackSeries(err);
                            result.forEach(function (item) {
                                sourceConceptsCount += 1
                                for (var i = 0; i <= sourceConceptAggrDepth; i++) {
                                    var child = item["child" + i]

                                    if (child) {
                                        var childLabel = item["child" + i + "Label"].value
                                        allSourceConcepts.push({
                                            id: child.value,
                                            label: childLabel,
                                        });
                                        commonConceptsMap[childLabel.toLowerCase()] = {source: {id: child.value, label: childLabel, broaders: []}}

                                    }
                                }

                            })
                            if (sourceConceptsCount > self.maxSourceDescendants && output == "graph") {

                                var ok = confirm("too many nodes  to draw graph: " + sourceConceptsCount + " continue ?")
                                if (!ok)
                                    return callbackSeries("too many nodes");
                                var ok = confirm("Generate same as triples")
                                if (!ok) {

                                    return callbackSeries("too many nodes");
                                }
                                output = "triples"

                                return callbackSeries();


                            }
                            MainController.UI.message(sourceConceptsCount + ' found in ' + fromSourceId)
                            callbackSeries();
                        })

                    },


                    // compare all
                    function (callbackSeries) {


                        if (!compareAll)
                            return callbackSeries();
                        var options = {}
                        if (rdfType && rdfType != "")
                            options = {filter: "?concept rdf:type " + rdfType}
                        Sparql_generic.getItems(fromSourceId, options, function (err, result) {
                            if (err) {
                                return callbackSeries(err);
                            }
                            sourceConceptsCount=result.length
                            result.forEach(function (item) {
                                allSourceConcepts.push({
                                    id: item.concept.value,
                                    label: item.conceptLabel.value,
                                });
                                commonConceptsMap[item.conceptLabel.value.toLowerCase()] = {source: {id: item.concept.value, label: item.conceptLabel.value, broaders: []}}
                            })
                            callbackSeries()

                        })


                    },


                    //search selected concepts  and descendants in targetThesaurus
                    function (callbackSeries) {
                        if (false && output == "stats")
                            return callbackSeries();


                        var sourceConceptsSlices = common.sliceArray(allSourceConcepts, sliceSize)
                        async.eachSeries(sourceConceptsSlices, function (sourceConcepts, callbackEach) {
                            sourceConceptsProcessed = sourceConcepts.length
                            var words = []
                            sourceConcepts.forEach(function (concept, index) {
                                words.push(concept.label.replace(/[-"]/g, ""));
                            })


                            Sparql_generic.getNodeParents(toSourceId, words, null, targetConceptAggrDepth, {exactMatch: true}, function (err, result) {
                                if (err) {
                                    return callbackEach(err);
                                }
                                var ids = [];
                                targetConceptsCount += result.length

                                result.forEach(function (item) {


                                    var targetObj = {
                                        id: item.concept.value,
                                        label: item.conceptLabel.value,
                                    }
                                    var targetBroaders = []
                                    for (var i = 1; i < targetConceptAggrDepth; i++) {

                                        var broaderId = item["broader" + i]
                                        if (typeof broaderId !== "undefined") {
                                            if (targetBroaders.indexOf(broaderId.value) < 0) {
                                                var broaderLabel = item["broader" + i + "Label"];
                                                if (typeof broaderLabel !== "undefined")
                                                    broaderLabel = item["broader" + i + "Label"].value
                                                else
                                                    broaderLabel = broaderId.value
                                                targetBroaders.push({level: i, id: broaderId.value, label: broaderLabel});
                                            }
                                        } else {
                                            //   targetBroaders.push({level: j, id:null, label: ""})
                                        }

                                    }
                                    targetObj.broaders = targetBroaders;
                                    if (commonConceptsMap[item.conceptLabel.value.toLowerCase()]) {
                                        commonConceptsMap[item.conceptLabel.value.toLowerCase()].target = targetObj
                                    }

                                })
                                MainController.UI.message(targetConceptsCount +  " processed" + sourceConceptsProcessed + '/' + sourceConceptsCount )
                                return callbackEach();

                            })


                        }, function (err) {
                            if (Object.keys(commonConceptsMap).length == 0) {
                                ;//  alert(("no matching concepts"))
                            }
                            MainController.UI.message("drawing" + targetConceptsCount + '/' + sourceConceptsCount + " concepts")
                            return callbackSeries(err);
                        })


                    },
                    //get source broaders
                    function (callbackSeries) {
                        if (output == "stats" || output == "triples")
                            return callbackSeries();
                        var conceptIds = []

                        for (var key in commonConceptsMap) {
                            var fromSourceId = commonConceptsMap[key].source.id
                            if (conceptIds.indexOf(fromSourceId) < 0)
                                conceptIds.push(fromSourceId)
                        }
                        if (conceptIds.length == 0)
                            return callbackSeries();

                        var conceptIdsSlices = common.sliceArray(conceptIds, sliceSize);
                        async.eachSeries(conceptIdsSlices, function (conceptIds, callbackSeriesSourceBroaders) {
                            Sparql_generic.getNodeParents(toSourceId, null, conceptIds, maxDescendantsDepth, null, function (err, result) {
                                if (err) {
                                    return callbackSeriesSourceBroaders(err)
                                }
                                var sourceBroaders = [];
                                result.forEach(function (item) {


                                    var sourceBroaders = []
                                    for (var i = 1; i < 8; i++) {
                                        var broaderId = item["broader" + i]
                                        if (typeof broaderId !== "undefined") {
                                            if (sourceBroaders.indexOf(broaderId.value) < 0) {
                                                sourceBroaders.push({level: i, id: broaderId.value, label: item["broader" + i + "Label"].value});
                                            }
                                        }
                                    }
                                    if (item.conceptLabel && item.conceptLabel.value && commonConceptsMap[item.conceptLabel.value.toLowerCase()]) {
                                        commonConceptsMap[item.conceptLabel.value.toLowerCase()].source.broaders = sourceBroaders;
                                    }
                                })

                                callbackSeriesSourceBroaders()
                            });

                        }, function (err) {
                            return callbackSeries();
                        })


                    }

                    ,
                    //draw commonConcepts
                    function (callbackSeries) {

                        if (output != "graph")
                            return callbackSeries();
                        var visjsData = {nodes: [], edges: []};
                        var uniqueNodes = [];
                        var uniqueEdges = [];
                        var currentX = 0;
                        var currentY = 50;
                        var xOffset = 150;
                        var yOffset = 30;


                        function addBroaderNodes(broaders, childId, startOffest, direction, color, source) {
                            broaders.forEach(function (itemBroader, index) {


                                if (uniqueNodes.indexOf(itemBroader.id) < 0) {
                                    uniqueNodes.push(itemBroader.id)

                                    var broaderSourceNode = {
                                        id: itemBroader.id,
                                        label: itemBroader.label,
                                        color: color,
                                        data: {source: source},
                                        shape: "box",
                                        fixed: {x: true, y: false},
                                        x: direction * (startOffest + (xOffset * (index + 1))),

                                    }
                                    visjsData.nodes.push(broaderSourceNode);
                                } else {
                                    visjsData.nodes.forEach(function (node) {
                                        if (node.id == itemBroader.id) {
                                            node.x = direction * (startOffest + (xOffset * (index + 1)))
                                        }

                                    })

                                }
                                var edgeFromId;
                                if (index == 0)
                                    edgeFromId = childId;
                                else
                                    edgeFromId = broaders[index - 1].id;
                                var edgeId = edgeFromId + "_" + itemBroader.id

                                if (uniqueEdges.indexOf(edgeId) < 0) {
                                    uniqueEdges.push(edgeId)
                                    visjsData.edges.push({
                                        id: edgeId,
                                        from: edgeFromId,
                                        to: itemBroader.id

                                    })
                                }


                            })
                        }


                        for (var key in commonConceptsMap) {
                            var item = commonConceptsMap[key];

                            if (showAllSourceNodes || (!showAllSourceNodes && item.target)) {

                                if (uniqueNodes.indexOf(item.source.id) < 0) {
                                    uniqueNodes.push(item.source.id)
                                    var sourceNode = {
                                        id: item.source.id,
                                        label: item.source.label,
                                        color: "#add",
                                        shape: "box",
                                        data: {source: fromSourceId},
                                        fixed: {x: true, y: true},
                                        x: currentX,
                                        y: currentY
                                    }
                                    visjsData.nodes.push(sourceNode);
                                    if (item.target) {
                                        if (uniqueNodes.indexOf(item.target.id) < 0) {
                                            uniqueNodes.push(item.target.id)
                                            var targetNode = {
                                                id: item.target.id,
                                                label: item.target.label,
                                                color: "#dda",
                                                shape: "box",
                                                data: {source: fromSourceId},
                                                fixed: {x: true, y: true},
                                                x: currentX + xOffset,
                                                y: currentY
                                            }
                                            visjsData.nodes.push(targetNode);
                                        }
                                        var edgeId = item.source.id + "_" + item.target.id
                                        if (uniqueEdges.indexOf(edgeId) < 0) {
                                            uniqueEdges.push(edgeId)
                                            visjsData.edges.push({
                                                id: edgeId,
                                                from: item.source.id,
                                                to: item.target.id

                                            })
                                        }
                                    }
                                    addBroaderNodes(item.source.broaders, item.source.id, currentX, -1, "#add", fromSourceId);
                                    if (item.target && item.target.broaders)
                                        addBroaderNodes(item.target.broaders, item.target.id, currentX + xOffset, +1, "#dda", fromSourceId)

                                }
                                currentY += yOffset;

                            }
                        }

                        visjsGraph.draw("graphDiv", visjsData, {onclickFn: ThesaurusMatcher.onGraphClickNode,})
                        return callbackSeries();
                    },


                    //draw table
                    function (callbackSeries) {

                        if (output != "table")
                            return callbackSeries();


                        var nSourceBroaders = 0;
                        var nTargetBroaders = 0;
                        for (var key in commonConceptsMap) {
                            var item = commonConceptsMap[key];
                            nSourceBroaders = Math.max(nSourceBroaders, item.source.broaders.length);
                            if (item.target)
                                nTargetBroaders = Math.max(nTargetBroaders, item.target.broaders.length);
                        }

                        var csv = "";
                        for (var key in commonConceptsMap) {
                            var item = commonConceptsMap[key];
                            if (showAllSourceNodes || (!showAllSourceNodes && item.target)) {


                                var sourceBroadersStr = ""
                                for (var i = 0; i < nSourceBroaders; i++) {

                                    if (i >= item.source.broaders.length)
                                        sourceBroadersStr += "\t";
                                    else
                                        sourceBroadersStr = item.source.broaders[i].label + "\t" + sourceBroadersStr
                                    // csv += item.source.broaders[i].label+ "\t";
                                }
                                csv += sourceBroadersStr;
                                csv += item.source.label + "\t";


                                if (item.target) {

                                    csv += item.target.label + "\t";
                                    if (showOlderAncestorsOnly) {
                                        if (item.target.broaders.length > 0) {
                                            if (item.target.broaders.length > 1)
                                                csv += item.target.broaders[item.target.broaders.length - 2].label + "\t";
                                            csv += item.target.broaders[item.target.broaders.length - 1].label;
                                        }


                                    } else {


                                        for (var i = nTargetBroaders; i > 0; i--) {
                                            if (item.target.broaders.length <= nTargetBroaders - i) {
                                                csv += "\t";
                                                //   if (i <item.target.broaders.length)
                                            } else {
                                                csv += item.target.broaders[(nTargetBroaders - i)].label + "\t";
                                            }
                                        }
                                    }
                                }

                                csv += "\n";
                            }

                        }
                        var maxCols = 0
                        var dataSet = []
                        var lines = csv.split("\n")
                        lines.forEach(function (line) {
                            var lineArray = [];
                            var cols = line.split("\t")
                            maxCols = Math.max(maxCols, cols.length)
                            cols.forEach(function (col) {
                                lineArray.push(col);
                            })
                            dataSet.push(lineArray);
                        })
                        var colnames = []
                        for (var i = 0; i < maxCols; i++) {
                            colnames.push({title: "col" + i})
                        }

                        dataSet.forEach(function (line) {
                            for (var i = line.length; i < maxCols; i++) {
                                line.push("")
                            }
                        })

                        $('#graphDiv').html("<table id='dataTableDiv'></table>");
                        setTimeout(function () {
                                $('#dataTableDiv').DataTable({
                                    data: dataSet,
                                    columns: colnames,
                                    // async: false,
                                    dom: 'Bfrtip',
                                    buttons: [
                                        'copy', 'csv', 'excel', 'pdf', 'print'
                                    ]


                                });
                                //     console.log(csv);

                            }, 1000
                        )
                    }


                    ,//draw triples
                    function (callbackSeries) {

                        if (output != "triples")
                            return callbackSeries();
                        var str = "";
                        for (var key in commonConceptsMap) {
                            var item = commonConceptsMap[key];
                            if (item.target) {
                                str += "<" + item.target.id + "> <http://www.w3.org/2002/07/owl#sameAs> <" + item.source.id + ">.\n";
                            }


                        }
                        var html = "<textarea cols='80' rows='30'>" + str + "</textarea>"
                        $("#graphDiv").html(html)
                        callbackSeries()
                    },


                    //draw stats
                    function (callbackSeries) {

                        if (output != "stats")
                            return callbackSeries();

                        // count total individuals in target
                        var query = "";
                        var schemaType = Config.sources[toSourceId].schemaType
                        if (schemaType == "SKOS") {
                            query = "PREFIX skos: <http://www.w3.org/2004/02/skos/core#> "
                            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
                            " SELECT (count(distinct ?id)  as ?countItems) "

                            if (targetGraphURI && targetGraphURI != "")
                                query += " FROM <" + targetGraphURI + "> "

                            query += " WHERE {" +
                                "?id skos:prefLabel ?prefLabel ." +
                                "?id rdf:type skos:concept." +
                                "} limit 10000";

                        } else if (schemaType == "OWL") {
                            query = " PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
                                " PREFIX  owl: <http://www.w3.org/2002/07/owl#> " +
                                " PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
                                " SELECT (count(distinct ?id)  as ?countItems) "

                            if (targetGraphURI && targetGraphURI != "")
                                query += " FROM <" + targetGraphURI + "> "

                            query += " WHERE {" + "?id rdfs:label ?prefLabel .";
                            if (rdfType && rdfType != "")
                                query += "?id rdf:type " + rdfType + "."
                            query += "} limit 10000";
                        } else
                            return alert("incorrect schema type  for target source")


                        var url = targetSparql_url + "?format=json&query=";// + query + queryOptions
                        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {source: toSourceId}, function (err, result) {
                            if (err) {
                                return callbackSeries(err);
                            }
                            var countTargetItems = 0
                            if (result.results.bindings.length > 0)
                                countTargetItems = result.results.bindings[0].countItems.value
                            var countSourceItems = 0;
                            var countMatchingItems = 0;
                            for (var key in commonConceptsMap) {
                                var item = commonConceptsMap[key];
                                countSourceItems += 1;
                                if (item.target) {
                                    countMatchingItems += 1;
                                }
                            }
                            var html = "<BR>" + rdfType + "<br> <table border='1'>" +
                                "<tr><td>" + fromSourceId + "</td><td>" + toSourceId + "</td><td>Matching items</td></tr>" +
                                "<tr><td>" + countSourceItems + "</td><td>" + countTargetItems + "</td><td>" + countMatchingItems + "</td></tr>"
                            if (callback)
                                $("#graphDiv").append(html)
                            else {
                                $("#graphDiv").html(html)

                            }

                            matchResult = {rdfType: rdfType, from: fromSourceId, to: toSourceId, matchingCount: countMatchingItems, fromCount: countSourceItems, toCount: countTargetItems}
                            return callbackSeries(null)
                        })
                    },


                ],

                function (err) {
                    $("#waitImg").css("display", "none");
                    if (err) {
                        MainController.UI.message(err)
                    }
                    MainController.UI.message("")
                    if (err) {
                        matchResult = {rdfType: rdfType, from: fromSourceId, to: toSourceId, error: err}
                    }
                    if (callback)
                        callback(null, matchResult)

                })


        }

        self.onGraphClickNode = function (node, point, event) {
            if (!node)
                return;
            if (event && event.ctrlKey) {
                Clipboard.copy({type: "node", source: node.data.source, id: node.id, label: node.label}, "_visjsNode", event)
            } else {
                MainController.UI.showNodeInfos(node.data.source, node.id, "mainDialogDiv")
            }


        }


        self.generateAllOwlStats = function () {

            var fromSources = [
                "ISO 15926-14",
                "ISO_15926_part_12",
                "CFIHOS-ISO",
                "ISO_15926_.org",
                "CFIHOS_equipment",
                "CFIHOS_READI",
                "ISO_15926_part_4",
                "ISO_15926_PCA",
                "QUANTUM"
            ];
            //  var fromSources=[ "ISO_15926_part_12"]
            var toSources = [
                "ISO 15926-14",
                "ISO_15926_part_12",
                "CFIHOS-ISO",
                "ISO_15926_.org",
                "CFIHOS_equipment",
                "CFIHOS_READI",
                "ISO_15926_part_4",
                "ISO_15926_PCA",
                "QUANTUM"
            ];
            var rdfTypes = [
                //  "owl:Class",
                //"owl:ObjectProperty",
                "owl:DatatypeProperty"
            ]
            $("#graphDiv").append("")
            var resultArray = [];
            var fromArray = []
            async.eachSeries(rdfTypes, function (rdfType, callbackRdfType) {

                async.eachSeries(fromSources, function (fromSourceId, callbackStart) {
                    fromArray.push(fromSourceId)
                    async.eachSeries(toSources, function (toSourceId, callbackEnd) {

                            if (fromArray.indexOf(toSourceId) < 0) {
                                $("#graphDiv").append("running " + rdfType + " from " + fromSourceId + " to " + toSourceId)
                                MainController.UI.message("running " + rdfType + " from " + fromSourceId + " to " + toSourceId)
                                self.compareConcepts(true, "stats", rdfType, fromSourceId, toSourceId, function (err, result) {
                                    if (result) {
                                        resultArray = resultArray.concat(result)
                                    }


                                    return callbackEnd(err)

                                })
                            } else
                                return callbackEnd()

                        }, function (err) {
                            return callbackStart();
                        }
                    )
                }, function (err) {
                    return callbackRdfType();
                })


            }, function (err) {
                if (err)
                    MainController.UI.message(err)
                console.log(JSON.stringify(resultArray, null, 2))
                $("#graphDiv").html(JSON.stringify(resultArray, null, 2))
                MainController.UI.message("Done")

            })
        }


        self.generateMatchingMatrix = function () {
            var json =
                [{"rdfType": "owl:DatatypeProperty", "from": "ISO 15926-14", "to": "ISO_15926_part_12", "matchingCount": 0, "fromCount": 3, "toCount": "9"}, {
                    "rdfType": "owl:DatatypeProperty",
                    "from": "ISO 15926-14",
                    "to": "CFIHOS-ISO",
                    "matchingCount": 0,
                    "fromCount": 3,
                    "toCount": "23"
                }, {"rdfType": "owl:DatatypeProperty", "from": "ISO 15926-14", "to": "ISO_15926_.org", "matchingCount": 0, "fromCount": 3, "toCount": "555"}, {
                    "rdfType": "owl:DatatypeProperty",
                    "from": "ISO 15926-14",
                    "to": "CFIHOS_equipment",
                    "matchingCount": 0,
                    "fromCount": 3,
                    "toCount": "0"
                }, {"rdfType": "owl:DatatypeProperty", "from": "ISO 15926-14", "to": "CFIHOS_READI", "matchingCount": 0, "fromCount": 3, "toCount": "93"}, {
                    "rdfType": "owl:DatatypeProperty",
                    "from": "ISO 15926-14",
                    "to": "ISO_15926_part_4",
                    "matchingCount": 0,
                    "fromCount": 3,
                    "toCount": "0"
                }, {"rdfType": "owl:DatatypeProperty", "from": "ISO 15926-14", "to": "ISO_15926_PCA", "matchingCount": 0, "fromCount": 3, "toCount": "2360"}, {
                    "rdfType": "owl:DatatypeProperty",
                    "from": "ISO 15926-14",
                    "to": "QUANTUM",
                    "matchingCount": 0,
                    "fromCount": 3,
                    "toCount": "0"
                }, {"rdfType": "owl:DatatypeProperty", "from": "ISO_15926_part_12", "to": "CFIHOS-ISO", "matchingCount": 1, "fromCount": 9, "toCount": "23"}, {
                    "rdfType": "owl:DatatypeProperty",
                    "from": "ISO_15926_part_12",
                    "to": "ISO_15926_.org",
                    "matchingCount": 1,
                    "fromCount": 9,
                    "toCount": "555"
                }, {"rdfType": "owl:DatatypeProperty", "from": "ISO_15926_part_12", "to": "CFIHOS_equipment", "matchingCount": 0, "fromCount": 9, "toCount": "0"}, {
                    "rdfType": "owl:DatatypeProperty",
                    "from": "ISO_15926_part_12",
                    "to": "CFIHOS_READI",
                    "matchingCount": 0,
                    "fromCount": 9,
                    "toCount": "93"
                }, {"rdfType": "owl:DatatypeProperty", "from": "ISO_15926_part_12", "to": "ISO_15926_part_4", "matchingCount": 0, "fromCount": 9, "toCount": "0"}, {
                    "rdfType": "owl:DatatypeProperty",
                    "from": "ISO_15926_part_12",
                    "to": "ISO_15926_PCA",
                    "matchingCount": 0,
                    "fromCount": 9,
                    "toCount": "2360"
                }, {"rdfType": "owl:DatatypeProperty", "from": "ISO_15926_part_12", "to": "QUANTUM", "matchingCount": 0, "fromCount": 9, "toCount": "0"}, {
                    "rdfType": "owl:DatatypeProperty",
                    "from": "CFIHOS-ISO",
                    "to": "ISO_15926_.org",
                    "matchingCount": 0,
                    "fromCount": 23,
                    "toCount": "555"
                }, {"rdfType": "owl:DatatypeProperty", "from": "CFIHOS-ISO", "to": "CFIHOS_equipment", "matchingCount": 0, "fromCount": 23, "toCount": "0"}, {
                    "rdfType": "owl:DatatypeProperty",
                    "from": "CFIHOS-ISO",
                    "to": "CFIHOS_READI",
                    "matchingCount": 0,
                    "fromCount": 23,
                    "toCount": "93"
                }, {"rdfType": "owl:DatatypeProperty", "from": "CFIHOS-ISO", "to": "ISO_15926_part_4", "matchingCount": 0, "fromCount": 23, "toCount": "0"}, {
                    "rdfType": "owl:DatatypeProperty",
                    "from": "CFIHOS-ISO",
                    "to": "ISO_15926_PCA",
                    "matchingCount": 0,
                    "fromCount": 23,
                    "toCount": "2360"
                }, {"rdfType": "owl:DatatypeProperty", "from": "CFIHOS-ISO", "to": "QUANTUM", "matchingCount": 0, "fromCount": 23, "toCount": "0"}, {
                    "rdfType": "owl:DatatypeProperty",
                    "from": "ISO_15926_.org",
                    "to": "CFIHOS_equipment",
                    "matchingCount": 0,
                    "fromCount": 266,
                    "toCount": "0"
                }, {"rdfType": "owl:DatatypeProperty", "from": "ISO_15926_.org", "to": "CFIHOS_READI", "matchingCount": 0, "fromCount": 266, "toCount": "93"}, {
                    "rdfType": "owl:DatatypeProperty",
                    "from": "ISO_15926_.org",
                    "to": "ISO_15926_part_4",
                    "matchingCount": 5,
                    "fromCount": 266,
                    "toCount": "0"
                }, {"rdfType": "owl:DatatypeProperty", "from": "ISO_15926_.org", "to": "ISO_15926_PCA", "matchingCount": 4, "fromCount": 266, "toCount": "2360"}, {
                    "rdfType": "owl:DatatypeProperty",
                    "from": "ISO_15926_.org",
                    "to": "QUANTUM",
                    "matchingCount": 19,
                    "fromCount": 266,
                    "toCount": "0"
                }, {"rdfType": "owl:DatatypeProperty", "from": "CFIHOS_equipment", "to": "CFIHOS_READI", "matchingCount": 0, "fromCount": 0, "toCount": "93"}, {
                    "rdfType": "owl:DatatypeProperty",
                    "from": "CFIHOS_equipment",
                    "to": "ISO_15926_part_4",
                    "matchingCount": 0,
                    "fromCount": 0,
                    "toCount": "0"
                }, {"rdfType": "owl:DatatypeProperty", "from": "CFIHOS_equipment", "to": "ISO_15926_PCA", "matchingCount": 0, "fromCount": 0, "toCount": "2360"}, {
                    "rdfType": "owl:DatatypeProperty",
                    "from": "CFIHOS_equipment",
                    "to": "QUANTUM",
                    "matchingCount": 0,
                    "fromCount": 0,
                    "toCount": "0"
                }, {"rdfType": "owl:DatatypeProperty", "from": "CFIHOS_READI", "to": "ISO_15926_part_4", "matchingCount": 3, "fromCount": 102, "toCount": "0"}, {
                    "rdfType": "owl:DatatypeProperty",
                    "from": "CFIHOS_READI",
                    "to": "ISO_15926_PCA",
                    "matchingCount": 2,
                    "fromCount": 102,
                    "toCount": "2360"
                }, {"rdfType": "owl:DatatypeProperty", "from": "CFIHOS_READI", "to": "QUANTUM", "matchingCount": 34, "fromCount": 102, "toCount": "0"}, {
                    "rdfType": "owl:DatatypeProperty",
                    "from": "ISO_15926_part_4",
                    "to": "ISO_15926_PCA",
                    "matchingCount": 0,
                    "fromCount": 0,
                    "toCount": "2360"
                }, {"rdfType": "owl:DatatypeProperty", "from": "ISO_15926_part_4", "to": "QUANTUM", "matchingCount": 0, "fromCount": 0, "toCount": "0"}, {
                    "rdfType": "owl:DatatypeProperty",
                    "from": "ISO_15926_PCA",
                    "to": "QUANTUM",
                    "matchingCount": 2,
                    "fromCount": 2346,
                    "toCount": "0"
                }]
            //listSources
            var sources = {}
            json.forEach(function (item) {
                if (!sources[item.from])
                    sources[item.from] = {}

                sources[item.from][item.to] = item
                var total;
                if (item.fromCount === null)
                    total = "error"
                else
                    total = item.fromCount;


                sources[item.from].total = total
            })

            var str = "Source\tTotal";

            for (var keyFrom in sources) {

                str += "\t" + keyFrom


            }
            str += "\n"


            for (var keyFrom in sources) {
                var total = sources[keyFrom].total;
                str += keyFrom + "\t" + total

                for (var keyTo in sources) {
                    var value = ""
                    var item = sources[keyFrom][keyTo]

                    if (item) {
                        if (item.matchingCount != null)
                            value = item.matchingCount
                        else if (item.error)
                            value = "Error"
                    }


                    str += "\t" + value
                }
                str += "\n"

            }
            console.log(str)
        }

        self.drawMatchingGraph = function () {
            var str = "Classes,ISO 15926-14,ISO_15926_part_12,CFIHOS-ISO,ISO_15926_.org,CFIHOS_equipment,CFIHOS_READI,ISO_15926_part_4,ISO_15926_PCA\n" +
                "ISO 15926-14,0,25,0,0,0,0,0,0\n" +
                "ISO_15926_part_12,0,0,0,0,0,0,0,0\n" +
                "CFIHOS-ISO,58,63,0,0,0,0,0,0\n" +
                "ISO_15926_.org,64,63,99,0,0,0,0,0\n" +
                "CFIHOS_equipment,0,2,0,1,0,0,0,0\n" +
                "CFIHOS_READI,88,26,7,14,99,0,0,0\n" +
                "ISO_15926_part_4,9,5,0,2,20,10,0,0\n" +
                "ISO_15926_PCA,42,22,6,8,26,14,77,0"

            var lines = str.split("\n");
            var visjsData = {nodes: [], edges: []}
            var header = lines[0].split(",")
            var maxLength = 500;
            var minLength = 100;

            header.forEach(function (source, indexLine) {
                if (indexLine > 0) {
                    visjsData.nodes.push({
                        id: source,
                        label: source,
                        shape: "box"
                    })
                }
            })

            lines.forEach(function (line, indexLine) {
                if (indexLine > 0) {

                    var cells = line.split(",")

                    cells.forEach(function (cell, indexCell) {
                        if (indexCell > 0) {
                            var length;

                            if (cell == 0) {
                                return
                            } else
                                var value = cell
                            length = minLength + 1 / (cell * 400);

                            visjsData.edges.push({
                                from: cells[0],
                                to: header[indexCell],
                                value: value
                            })
                        }


                    })
                }
            })

            visjsGraph.draw("graphDiv", visjsData)


        }


        return self;


    }
)
()
