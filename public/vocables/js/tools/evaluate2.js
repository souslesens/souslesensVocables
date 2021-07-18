var Evaluate = (function () {


        var self = {}

        self.maxGraphConceptLength = 200
        var sourceGraphsUriMap = {}

        self.selectedSources = []
        self.categoriesTreeId = "evaluate_treeDiv"
        self.onSourceSelect = function () {
            /*   var html = "<button onclick='Evaluate.showActionPanel()'>OK</button>"
               $("#sourceDivControlPanelDiv").html(html)*/

        }

        self.onLoaded = function () {
            //    self.selectedSources = $("#sourcesTreeDiv").jstree(true).get_checked()
            $("#actionDiv").html("")
            $("#actionDivContolPanelDiv").load("snippets/evaluate/evaluate_left.html")
            $("#graphDiv").load("snippets/evaluate/evaluate_right.html")
            $("#accordion").accordion("option", {active: 2});
            setTimeout(function () {
                var w = $(document).width() - leftPanelWidth - 30;
                var h = $(document).height() - 20;
                $("#Evaluate_graphDiv").height(h - 200)
                $("#Evaluate_graphDiv").width(w - 200)
                $("#Evaluate_tabs").tabs({
                    activate: self.onTabActivate

                });

                common.fillSelectOptions("evaluate_sourceSelect", self.selectedSources, true)
                self.initCorpusList();


            }, 200)
        }


        self.showActionPanel = function () {


        }


        self.showNewCorpusDialog = function () {


            $("#mainDialogDiv").load("snippets/evaluate/annotateDialog.html");
            $("#mainDialogDiv").dialog("open");
            setTimeout(function () {
                MainController.UI.showSources("annotate_resourcesTreeDiv", true)
            }, 200)


        }

        self.execAnnotate = function () {
            var sourceNodes = $("#annotate_resourcesTreeDiv").jstree(true).get_checked();
            var sources = []
            sourceNodes.forEach(function (sourceId) {
                if (!Config.sources[sourceId].color)
                    Config.sources[sourceId].color = common.palette[Object.keys(sourceLabels).length];
                sources.push(Config.sources[sourceId])
            })
            if(sources.length==0)
                return alert("select at least one source")
            var corpusPath=$("#annotate_corpusPathInput").val();
            if(corpusPath=="")
                return alert("enter valid Corpus path(visible from server)")

            var corpusName=$("#annotate_corpusNameInput").val();
            if(corpusName=="")
                return alert("enter corpus name)")

            var payload = {
                annotateCorpus: true,
                corpusPath: corpusPath,
                sources: JSON.stringify(sources),
                corpusName:corpusName,
                options:JSON.stringify({})

            }

            $.ajax({
                type: "POST",
                url: Config.serverUrl,
                data: payload,
                dataType: "json",

                success: function (result, textStatus, jqXHR) {
                    $("#annotate_messageDiv").prepend("<span class='ADLbuild_infosOK'>ALL DONE</span><br>")


                }, error(err) {
                    $("#annotate_messageDiv").prepend("<span class='ADLbuild_infosError'>" + err.responseText+ "</span><br>")
                }
            })






        }
        self.cancelAnnotate = function () {
            $("#mainDialogDiv").dialog("close");
        }


        self.initCorpusList = function () {
            var corpusList = ["test"]
            common.fillSelectOptions("evaluate_corpusSelect", corpusList, true)


        }
        self.loadCorpusSubjectTree = function (corpusName) {

            var payload = {
                getConceptsSubjectsTree: 1,
                corpusName: corpusName,

            }
            $.ajax({
                type: "POST",
                url: Config.serverUrl,
                data: payload,
                dataType: "json",
                success: function (result, textStatus, jqXHR) {
                    common.jstree.loadJsTree(self.categoriesTreeId, result, {selectTreeNodeFn: Evaluate.onTreeClickNode});
                }, error(err) {
                    return alert(err)
                }
            })

        }


        self.onTreeClickNode = function (evt, obj) {
            $("#messageDiv").html("");
            self.currentTreeNode = obj.node
            self.getSubjectGraphData(obj.node)


        }
        self.onTabActivate = function (e, ui) {
            var divId = ui.newPanel.attr('id');
            if (divId == "ADLquery_tabs_wikiPageContent") {
                self.loadWikiPage()
            }
        }


        self.getSubjectGraphData = function (jstreeNode, callback) {
            var descendants = common.jstree.getNodeDescendants(self.categoriesTreeId, jstreeNode.id)
            var concepts = [];
            var ancestorsDepth = 3;

            var sources = {}
            descendants.forEach(function (node) {
                if (!node.data.files)
                    return;
                node.data.files.forEach(function (file) {
                    for (var source in file.sources) {
                        if (!sources[source])
                            sources[source] = []
                        file.sources[source].forEach(function (concept) {
                            sources[source].push(concept.id)
                        })


                    }
                })
                var visjsData = {nodes: [], edges: []}
                var existingNode = {}
                var offsetY = -leftPanelWidth
                var offsetYlength = 30
                async.eachSeries(Object.keys(sources), function (source, callbackSource) {

                    var color = Lineage_classes.getSourceColor(source, "palette")
                    visjsData.nodes.push({
                        id: source,
                        label: source,
                        shape: "ellipse",
                        color: color,
                        fixed: {x: true},
                        x: 500,
                        y: offsetY,
                        data: {type: "graph", source: source}
                    })

                    var sourceConcepts = sources[source]
                    var conceptsSlices = common.sliceArray(sourceConcepts);
                    async.eachSeries(conceptsSlices, function (concepts, callbackSlice) {
                        Sparql_generic.getNodeParents(source, null, concepts, ancestorsDepth, null, function (err, result) {
                            if (err)
                                return callbackSlice(err)
                            result.forEach(function (item) {
                                var conceptId = item.concept.value
                                if (!existingNode[conceptId]) {
                                    existingNode[conceptId] = 1
                                    visjsData.nodes.push({
                                        id: conceptId,
                                        label: item.conceptLabel.value,
                                        shape: "box",
                                        color: color,
                                        fixed: {x: true, y: true},
                                        x: -500,
                                        y: offsetY,
                                        data: {type: "leafConcept", source: source}
                                    })
                                    offsetY += offsetYlength
                                }


                                for (var i = 1; i < ancestorsDepth; i++) {
                                    var broaderId = item["broader" + i]
                                    if (broaderId) {
                                        broaderId = broaderId.value;
                                        if (!existingNode[broaderId]) {
                                            existingNode[broaderId] = 1
                                            var broaderLabel = item["broader" + i + "Label"].value
                                            visjsData.nodes.push({
                                                id: broaderId,
                                                label: broaderLabel,
                                                shape: "box",
                                                color: color,
                                                data: {type: "broaderConcept", source: source}
                                            })
                                        }
                                        if (i == 1) {
                                            var edgeId = conceptId + "_" + broaderId
                                            if (!existingNode[edgeId]) {
                                                existingNode[edgeId] = 1
                                                visjsData.edges.push({
                                                    id: edgeId,
                                                    from: conceptId,
                                                    to: broaderId,
                                                    arrows: "to"
                                                })
                                            }

                                        } else {

                                            var previousBroaderId = item["broader" + (i - 1)].value
                                            var edgeId = previousBroaderId + "_" + broaderId
                                            if (!existingNode[edgeId]) {
                                                existingNode[edgeId] = 1
                                                visjsData.edges.push({
                                                    id: edgeId,
                                                    from: previousBroaderId,
                                                    to: broaderId,
                                                    arrows: "to"
                                                })
                                            }

                                        }
                                        var nextBroaderId = item["broader" + (i + 1)]
                                        if (!nextBroaderId) {
                                            //  var previousBroaderId = item["broader" + (i - 1)].value
                                            var edgeId = source + "_" + broaderId
                                            if (!existingNode[edgeId]) {
                                                existingNode[edgeId] = 1
                                                visjsData.edges.push({
                                                    id: edgeId,
                                                    from: broaderId,
                                                    to: source,
                                                    arrows: "to"
                                                })
                                            }


                                        }
                                    }


                                }


                            })
                            callbackSlice()

                        })


                    }, function (err) {
                        callbackSource(err)
                    })


                }, function (err) {
                    visjsGraph.draw("Evaluate_graphDiv", visjsData, {onclickFn: Evaluate.onGraphNodeClick})
                    $("#waitImg").css("display", "none");
                    if (callback)
                        return callback(null)
                })


                return


                for (var key in similarNodes) {
                    var length = similarNodes[key].length;
                    if (length > 1) {
                        visjsData.nodes.push({
                            id: key,
                            label: key,
                            shape: "box",
                            color: "#ddd",
                            fixed: {x: false},
                            x: -650
                        })
                        for (var i = 0; i < length; i++) {
                            var edgeId = key + "_" + similarNodes[key][i]
                            if (allEdges.indexOf(edgeId) < 0) {
                                allEdges.push(edgeId)
                                visjsData.edges.push({id: edgeId, from: key, to: similarNodes[key][i], arrows: "to"})
                            }
                        }
                    }
                }
                //  $("#graphDiv").width($(window).width() - 20)
                //   $("#graphDiv").height($(window).height() - 20)
                visjsGraph.draw("Evaluate_graphDiv", visjsData, {onclickFn: Evaluate.onGraphNodeClick})
                $("#waitImg").css("display", "none");
                return callback(null)
                /* $("#sliderCountPagesMax").slider("option", "max", maxPages);
                 $("#sliderCountPagesMax").slider("option", "mmin", minPages);
                 $("#minPages").html(minPages)
                 $("#maxPages").html(maxPages)*/
                //  $( "#sliderCountPagesMax" ).slider( "option", "value", maxPages );
            })


            var data = {}
            async.eachSeries(Object.keys(sources), function (source, callbackEach) {

                var sourceIds = sources[source]

                Sparql_generic.getNodeParents(source, null, sourceIds, 5, {keepNodePositionOnDrag: true}, function (err, result) {
                    data[source] = result

                })

            }, function (err) {

            })
        }

        return self


    }
)()