//inclure altLabel


var ThesaurusMatcher = (function () {
        var self = {}

        self.onSourceSelect = function (thesaurusLabel) {

          //  $("#actionDivContolPanelDiv").html("<button onclick='ThesaurusMatcher.showcompareWithDialog()'>Compare with...</button>")
        // $("#actionDivContolPanelDiv").html("<input id='GenericTools_searchTermInput'> <button onclick='ThesaurusBrowser.searchTerm()'>Search</button>")

            ThesaurusBrowser.showThesaurusTopConcepts(thesaurusLabel)


            $("#actionDivContolPanelDiv").load("snippets/thesaurusMatcher.html")
            setTimeout(function () {
                $("#ThesaurusMatcher_targetGraphUriSelect").append(new Option("", ""));
                for (var key in Config.sources) {
                    var selected = ""
                    if (key != MainController.currentSource) {
                        $("#ThesaurusMatcher_targetGraphUriSelect").append(new Option(key, key));

                    }
                }
                $("#ThesaurusMatcher_actionDiv").css('display', 'none')
                $("#accordion").accordion("option", {active: 2});
            }, 200)


        }
        self.selectNodeFn = function (event, propertiesMap) {
            $("#ThesaurusMatcher_actionDiv").css('display', 'block')
            ThesaurusBrowser.openTreeNode("currentSourceTreeDiv", MainController.currentSource, propertiesMap.node)
            ThesaurusBrowser.currentTreeNode = propertiesMap.node
        }


        self.compareConcepts = function () {

            var sourceNodeId = $("#currentSourceTreeDiv").jstree(true).get_selected()
            if (!sourceNodeId || sourceNodeId.length == 0)
                return
            sourceNodeId = sourceNodeId[0];
            self.targetSourceId = $("#ThesaurusMatcher_targetGraphUriSelect").val();
            if (!self.targetSourceId)
                return MainController.UI.message("choose a target ressource");


            var output = $("#ThesaurusMatcher_outputTypeSelect").val();
            var maxDescendantsDepth = parseInt($("#ThesaurusMatcher_maxDescendantsDepth").val());
            var showAllSourceNodes = $("#showAllSourceNodesCBX").prop("checked");
            var showOlderAncestorsOnly = $("#showOlderAncestorsOnlyCBX").prop("checked");


            var lang = "en"


            var sourceConceptAggrDepth = maxDescendantsDepth;
            var targetConceptAggrDepth = maxDescendantsDepth;
            var sliceSize = 20;

var sourceConceptsCount=0;
            var sourceConceptsProcessed=0;
            var targetConceptsCount=0
            var bindings = [];
            var allSourceConcepts = [];
            var commonConceptsMap = {};
            $("#dialogDiv").dialog("close")

            if (output == "stats") {
                return self.getdescendantsMatchingStats(sourceConceptAggrDepth, targetConceptAggrDepth)


            }
            async.series([

                    //get source source Descendants
                    function (callbackSeries) {


                        Sparql_generic.getNodeChildren(MainController.currentSource, null, sourceNodeId, sourceConceptAggrDepth, null, function (err, result) {
                            //                       Concepts.getConceptDescendants({depth: sourceConceptAggrDepth, selectLabels: true}, function (err, conceptsSets) {
                            if (err)
                                return callbackSeries(err);
                            result.forEach(function (item) {
                                sourceConceptsCount+=1
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

MainController.UI.message(sourceConceptsCount+ ' found in '+MainController.currentSource)
                            callbackSeries();
                        })

                    },


                    //count matching target concept for each source concept
                    function (callbackSeries) {
                        if (output != "stats")
                            return callbackSeries();
                        var sourceConceptsSlices = common.sliceArray(allSourceConcepts, sliceSize)
                        async.eachSeries(sourceConceptsSlices, function (sourceConcepts, callbackEach) {

                            var regexStr = ""
                            sourceConcepts.forEach(function (concept, index) {
                                if (index > 0)
                                    regexStr += "|";
                                regexStr += "^" + concept.label.replace(/[-"]/g, "") + "$";
                            })
                            regexStr += ")"


                            var filter = "  regex(?prefLabel, \"" + regexStr + "\", \"i\")";

                            var query = "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>" +
                                "SELECT count(*) " +
                                "FROM <" + self.targetThesaurusGraphURI + "> " +
                                "WHERE {" +
                                "?id skos:prefLabel|skos:altLabel ?prefLabel ." +
                                "FILTER (lang(?prefLabel) = '" + lang + "')" +
                                " filter " + filter + "} limit 10000";


                            var url = self.targetSparql_url + "?default-graph-uri=" + encodeURIComponent(self.targetThesaurusGraphURI) + "&query=";// + query + queryOptions
                            var queryOptions = "&should-sponge=&format=application%2Fsparql-results%2Bjson&timeout=20000&debug=off"
                            sparql.querySPARQL_GET_proxy(url, query, queryOptions, null, function (err, result) {
                                if (err) {
                                    return callbackEach(err);
                                }
                                var bindings = [];
                                var ids = [];
                                if (result.results.bindings.length > 0) {
                                    result.results.bindings.forEach(function (item) {
                                    })
                                }
                                return callbackEach(err);
                            })
                        }, function (err) {
                            callbackSeries(err)
                        })
                    },


                    //search selected concepts  and descendants in targetThesaurus
                    function (callbackSeries) {
                        if (output == "stats")
                            return callbackSeries();

                        var targetSparql_url = Config.sources[self.targetSourceId].sparql_url
                        var targetGraphURI = Config.sources[self.targetSourceId].graphUri

                        var sourceConceptsSlices = common.sliceArray(allSourceConcepts, sliceSize)
                        async.eachSeries(sourceConceptsSlices, function (sourceConcepts, callbackEach) {
                            sourceConceptsProcessed+=sourceConcepts.length
                            var words = []
                            sourceConcepts.forEach(function (concept, index) {
                                words.push(concept.label.replace(/[-"]/g, ""));
                            })


                            Sparql_generic.getNodeParents(self.targetSourceId , words, null, targetConceptAggrDepth, {exactMatch:true}, function(err, result){
                                if (err) {
                                    return callbackEach(err);
                                }
                                var ids = [];
                                targetConceptsCount+=result.length

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
                                                    var broaderLabel = item["broader"+ i+"Label" ];
                                                    if (typeof broaderLabel !== "undefined")
                                                        broaderLabel = item["broader"+ i+"Label" ].value
                                                    else
                                                        broaderLabel = broaderId.value
                                                    targetBroaders.push({level: i, id: broaderId.value, label: broaderLabel});
                                                }
                                            } else {
                                                //   targetBroaders.push({level: j, id:null, label: ""})
                                            }

                                        }
                                        targetObj.broaders = targetBroaders;
                                        if (!commonConceptsMap[item.conceptLabel.value.toLowerCase()]) {
                                            return callbackEach();
                                        }
                                        commonConceptsMap[item.conceptLabel.value.toLowerCase()].target = targetObj

                                    })
                                MainController.UI.message(targetConceptsCount+" found  " +sourceConceptsProcessed+ '/'+ sourceConceptsCount+" processed")
                                return callbackEach();

                            })



                        }, function (err) {
                            if (Object.keys(commonConceptsMap).length == 0) {
                                alert(("no matching concepts"))
                            }
                            MainController.UI.message("drawing"+ targetConceptsCount+'/'+ sourceConceptsCount+" concepts")
                            return callbackSeries(err);
                        })


                    },
                    //get source broaders
                    function (callbackSeries) {
                        if (output == "stats")
                            return callbackSeries();
                        var conceptIds = []

                        for (var key in commonConceptsMap) {
                            var sourceId = commonConceptsMap[key].source.id
                            if (conceptIds.indexOf(sourceId) < 0)
                                conceptIds.push(sourceId)
                        }
                        if (conceptIds.length == 0)
                            return callbackSeries();

                       var conceptIdsSlices=common.sliceArray(conceptIds,"50");
                       async.eachSeries(conceptIdsSlices,function(conceptIds,callbackSeriesSourceBroaders){
                        Sparql_generic.getNodeParents(MainController.currentSource, null, conceptIds, maxDescendantsDepth, null, function (err, result) {
                            if(err){
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

                        },function(err){
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
                                        data: {source: MainController.currentSource},
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
                                                data: {source: self.targetSourceId},
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
                                    addBroaderNodes(item.source.broaders, item.source.id, currentX, -1, "#add", MainController.currentSource);
                                    if (item.target && item.target.broaders)
                                        addBroaderNodes(item.target.broaders, item.target.id, currentX + xOffset, +1, "#dda", self.targetSourceId)

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

                    }


                ],

                function (err) {

                    if (err)
                        return MainController.UI.message(err)

                }
            )


        }

        self.onGraphClickNode = function (node, point, event) {
            if (event && event.ctrlKey) {
                Clipboard.copy({type: "node", source: node.data.source, id: node.id, label: node.label}, "_visjsNode", event)
            }


        }


        self.getdescendantsMatchingStats = function (sourceConceptAggrDepth, targetConceptAggrDepth) {
            var conceptLabelsMap = {};
            var matchingConceptsTreeArray = [];
            var uniqueConceptIds = []
            async.series([
                    function (callbackSeries) {
                        Concepts.getConceptDescendants({depth: sourceConceptAggrDepth, selectLabels: true, rawData: true}, function (err, conceptsSets) {
                            if (err)
                                return callbackSeries(err);


                            var minIndex;
                            conceptsSets.forEach(function (conceptSet) {
                                conceptSet.forEach(function (item) {
                                    for (var i = 0; i < 10; i++) {
                                        if (typeof item["concept" + i] != "undefined") {
                                            if (!minIndex) {
                                                minIndex = i;
                                            }

                                            var parentId;
                                            var parentLabel;
                                            if (i == minIndex) {
                                                parentId = "#";
                                                parentLabel = "#"
                                            } else {
                                                parentId = item["concept" + (i - 1)].value
                                                parentLabel = item["conceptLabel" + (i - 1)].value
                                            }
                                            var label = item["conceptLabel" + i].value;
                                            if (!conceptLabelsMap[label.toLowerCase()])
                                                conceptLabelsMap[label.toLowerCase()] = ({
                                                    parentId: parentId,
                                                    parentLabel: parentLabel,
                                                    parentLabel,
                                                    id: item["concept" + i].value,
                                                    label: label,
                                                    count: 0
                                                })


                                        }

                                    }
                                })


                            })
                            callbackSeries();
                        })
                    }

                    // get matching target concepts
                    , function (callbackSeries) {
                        var allSourceConcepts = Object.keys(conceptLabelsMap);
                        var sliceSize = 50;
                        var lang = "en"
                        var sourceConceptsSlices = common.sliceArray(allSourceConcepts, sliceSize);
                        async.eachSeries(sourceConceptsSlices, function (sourceConcepts, callbackEach) {

                            var regexStr = "("
                            sourceConcepts.forEach(function (concept, index) {
                                if (index > 0)
                                    regexStr += "|";
                                regexStr += +concept.label.replace(/[-"]/g, "") + "$";
                            })
                            regexStr += ")"


                            var filter = "  regex(?prefLabel, \"^" + regexStr + "$\", \"i\")";
                            if (false) {
                                filter = "  regex(?prefLabel, \"" + regexStr + "\", \"i\")";
                            }
                            var query = "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>" +
                                "SELECT ?id ?prefLabel  count(?id as ?count) " +
                                "FROM <" + self.targetThesaurusGraphURI + "> " +
                                "WHERE {" +
                                "?id skos:prefLabel ?prefLabel ." +
                                "FILTER (lang(?prefLabel) = '" + lang + "')" +
                                " filter " + filter + "  } GROUP by ?id ?prefLabel   limit 10000"


                            var url = self.targetSparql_url + "?default-graph-uri=" + encodeURIComponent(self.targetThesaurusGraphURI) + "&query=";// + query + queryOptions
                            var queryOptions = "&should-sponge=&format=application%2Fsparql-results%2Bjson&timeout=20000&debug=off"
                            sparql.querySPARQL_GET_proxy(url, query, queryOptions, null, function (err, result) {
                                if (err) {
                                    return callbackEach(err);
                                }
                                var bindings = [];
                                var ids = [];

                                if (result.results.bindings.length > 0) {
                                    result.results.bindings.forEach(function (item) {
                                        var sourceConcept = conceptLabelsMap[item.prefLabel.value.toLowerCase()]
                                        if (sourceConcept && uniqueConceptIds.indexOf(sourceConcept.id) < 0) {
                                            uniqueConceptIds.push(sourceConcept.id)
                                            matchingConceptsTreeArray.push({
                                                id: sourceConcept.id,
                                                text: sourceConcept.label,
                                                parent: sourceConcept.parentId,
                                                data: {count: 1, parentLabel: sourceConcept.parentLabel}


                                            })

                                        }
                                    })
                                }
                                // add missing parents
                                matchingConceptsTreeArray.forEach(function (item) {
                                    if (uniqueConceptIds.indexOf(item.parent) < 0) {

                                        var parentConcept = conceptLabelsMap[item.data.parentLabel]
                                        if (item.data.parentId == "#" || !parentConcept)
                                            return;
                                        matchingConceptsTreeArray.push({
                                            id: parentConcept.id,
                                            text: parentConcept.label,
                                            parent: parentConcept.parentId,
                                            data: {count: 0}
                                        })
                                    }

                                })
                                return callbackEach(err);

                            })
                        }, function (err) {
                            //    var x=matchingConceptsTreeArray;
                            callbackSeries(err)
                        })


                    },
                    function (callbackSeries) {

                        console.log(JSON.stringify(matchingConceptsTreeArray, null, 2))
                        $("#lefTabs").tabs("option", "active", 1);
                        common.loadJsTree("jstreeFilterConceptsDiv", matchingConceptsTreeArray, {
                            withCheckboxes: 1,
                            //  openAll: true,
                            selectDescendants: true,
                            searchPlugin: true,
                            onCheckNodeFn: function (evt, obj) {
                                filterGraph.alterGraph.onFilterConceptsChecked(evt, obj);
                            },
                            onUncheckNodeFn: function (evt, obj) {
                                filterGraph.alterGraph.onFilterConceptsChecked(evt, obj);
                            }

                        })


                    }

                ], function (err) {
                    return common.message(err);
                }
            )
        }


        return self;


    }
)
()
