var Evaluate = (function () {


        var self = {}

        self.maxGraphConceptLength = 200
        var sourceGraphsUriMap = {}
        self.currentCorpusData
        self.selectedSources = []
        self.categoriesTreeId = "evaluate_treeDiv"

        self.copyTypeColors={}
        self.copyTypeColors["concept"]="#a2afc8";
        self.copyTypeColors["altLabel"]="#bfb4a1";



        self.onSourceSelect = function () {
            /*   var html = "<button onclick='Evaluate.showActionPanel()'>OK</button>"
               $("#sourceDivControlPanelDiv").html(html)*/

        }

        self.onLoaded = function () {
            //    self.selectedSources = $("#sourcesTreeDiv").jstree(true).get_checked()
            $("#actionDiv").html("")
            $("#actionDivContolPanelDiv").load("snippets/evaluate/evaluate_left.html")
            $("#graphDiv").load("snippets/evaluate/evaluate_central.html")
            $("#rightPanelDiv").load("snippets/evaluate/evaluate_right.html")
            $("#accordion").accordion("option", {active: 2});
            setTimeout(function () {
                var w = $(document).width() - leftPanelWidth - 30;
                var h = $(document).height() - 20;
                $("#Evaluate_graphDiv").height(h - 200)
                $("#Evaluate_graphDiv").width(w - 200)
                $("#Evaluate_tabs").tabs({
                    activate: self.onTabActivate

                });
                $("#Evaluate_rightPanelTabs").tabs({});
                MainController.UI.openRightPanel()

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
                MainController.UI.showSources("annotate_resourcesTreeDiv", true, null,function () {
                    $("#annotate_resourcesTreeDiv").jstree(true).open_all()
                })

            }, 200)


        }

        self.execAnnotate = function () {
            var sourceNodes = $("#annotate_resourcesTreeDiv").jstree(true).get_checked();
            var sources = {}
            sourceNodes.forEach(function (sourceLabel) {
                if (!Config.sources[sourceLabel].color)
                    Config.sources[sourceLabel].color = common.palette[Object.keys(sourceLabel).length];
                var sourceObj = (Config.sources[sourceLabel])
                delete sourceObj.controller
                sources[sourceLabel] = sourceObj


            })
            if (Object.keys(sources).length == 0)
                return alert("select at least one source")
            var corpusPath = $("#annotate_corpusPathInput").val();
            if (corpusPath == "")
                return alert("enter valid Corpus path(visible from server)")

            var corpusName = $("#annotate_corpusNameInput").val();
            if (corpusName == "")
                return alert("enter corpus name)")

            var payload = {
                annotateAndStoreCorpus: true,
                corpusPath: corpusPath,
                sources: JSON.stringify(sources),
                corpusName: corpusName,
                options: JSON.stringify({})

            }
            $("#annotate_waitImg").css("display", "block");
            $.ajax({
                type: "POST",
                url: Config.serverUrl,
                data: payload,
                dataType: "json",

                success: function (result, textStatus, jqXHR) {
                    MainController.initControllers()
                    $("#annotate_messageDiv").prepend("<span class='ADLbuild_infosOK'>ALL DONE</span><br>")
                    $("#annotate_waitImg").css("display", "none");
                    self.initCorpusList();

                }, error(err) {
                    MainController.initControllers()
                    $("#annotate_waitImg").css("display", "none");
                    $("#annotate_messageDiv").prepend("<span class='ADLbuild_infosError'>" + err.responseText + "</span><br>")
                }
            })


        }
        self.execUploadCorpusAndAnnotate = function () {
            var sourceNodes = $("#annotate_resourcesTreeDiv").jstree(true).get_checked();
            var sources = {}
            sourceNodes.forEach(function (sourceLabel) {
                if (!Config.sources[sourceLabel].color)
                    Config.sources[sourceLabel].color = common.palette[Object.keys(sourceLabel).length];
                var sourceObj = (Config.sources[sourceLabel])
                delete sourceObj.controller
                sources[sourceLabel] = sourceObj


            })
            if (Object.keys(sources).length == 0)
                return alert("select at least one source")
            var corpusPath = $("#annotate_corpusPathInput").val();
            if (corpusPath == "")
                return alert("enter valid Corpus path(visible from server)")

            var corpusName = $("#annotate_corpusNameInput").val();
            if (corpusName == "")
                return alert("enter corpus name)")

            var fileObject = document.getElementById('fileButton').files[0];
            //  var formData = new FormData($(this)[0]);
            var formData = new FormData(document.getElementById('uploadForm'));

            formData.append("file", fileObject);


            formData.append("sources", JSON.stringify(sources));
            formData.append("corpusName", corpusName);
            formData.append("options", JSON.stringify({}));
            if (fileObject.type != "application/x-zip-compressed")
                return alert("zip files are accepted")

            if (fileObject.size > Config.evaluate.maxZipFileSize)
                return alert("file too big : " + (fileObject.size / 1000) + "ko, max " + (self.maxZipFileSize / 1000) + "ko")
            self.serverMessage("Uploading zip file " + fileObject.name)
            $.ajax({
                method: "POST",
                url: "/upload",
                data: formData,
                cache: false,
                contentType: false,
                processData: false,
                dataType: 'json',
                success: function (textResponse) {
                    MainController.initControllers()
                    $("#annotate_messageDiv").prepend("<span class='ADLbuild_infosOK'>ALL DONE</span><br>")
                    $("#annotate_waitImg").css("display", "none");
                    self.initCorpusList();
                    // alert(textResponse.result);


                }, error: function (err) {
                    alert(err.responseText || "error undefined");
                }
            })
        }

        /*
                    var payload = {
                        annotateAndStoreCorpus: true,
                        corpusPath: corpusPath,
                        sources: JSON.stringify(sources),
                        corpusName: corpusName,
                        options: JSON.stringify({})

                    }
                    $("#annotate_waitImg").css("display", "block");
                    $.ajax({
                        type: "POST",
                        url: Config.serverUrl,
                        data: payload,
                        dataType: "json",

                        success: function (result, textStatus, jqXHR) {
                            MainController.initControllers()
                            $("#annotate_messageDiv").prepend("<span class='ADLbuild_infosOK'>ALL DONE</span><br>")
                            $("#annotate_waitImg").css("display", "none");
                            self.initCorpusList();

                        }, error(err) {
                            MainController.initControllers()
                            $("#annotate_waitImg").css("display", "none");
                            $("#annotate_messageDiv").prepend("<span class='ADLbuild_infosError'>" + err.responseText + "</span><br>")
                        }
                    })


                }*/

        self.cancelAnnotate = function () {
            $("#mainDialogDiv").dialog("close");
        }


        self.initCorpusList = function () {


            var payload = {
                getAnnotatedCorpusList: 1,
                group: "all",

            }
            $.ajax({
                type: "POST",
                url: Config.serverUrl,
                data: payload,
                dataType: "json",
                success: function (result, textStatus, jqXHR) {
                    common.fillSelectOptions("evaluate_corpusSelect", result, true)
                }, error(err) {
                    return alert(err)
                }
            })

        }


        self.loadCorpusSubjectTree = function (corpusName, callback) {
            if (corpusName == "")
                return;
            var payload = {
                getConceptsSubjectsTree: 1,
                corpusName: corpusName,

            }
            $.ajax({
                type: "POST",
                url: Config.serverUrl,
                data: payload,
                dataType: "json",
                success: function (data, textStatus, jqXHR) {
                    self.currentCorpusData = data;

                    common.jstree.loadJsTree(self.categoriesTreeId, data.jstreeData, {selectTreeNodeFn: Evaluate.onTreeClickNode}, function (err, result) {
                        common.jstree.openNode(self.categoriesTreeId, data.jstreeData[0].id);
                    });


                    self.showCorpusSources(data.sources)
                }, error(err) {
                    return alert(err.responseText)

                }
            })

        }


        self.onTreeClickNode = function (evt, obj) {
            $("#messageDiv").html("");
            self.currentTreeNode = obj.node
            self.getSubjectGraphData(obj.node, function (err, result) {
                if (err)
                    return MainController.UI.message(err)
                self.showMissingWords(self.currentTreeNode)
            })


        }
        self.onTabActivate = function (e, ui) {
            var divId = ui.newPanel.attr('id');
            if (divId == "Annotate_tabs_missingTerms") {
                self.showMissingWords(self.currentTreeNode)
            } else if (divId == "Annotate_tabs_underlineEntities") {
                self.showUnderlinedEntities(self.currentTreeNode)
            }


        }


        self.getSubjectGraphData = function (jstreeNode, callback) {
            MainController.UI.message("processing data")
            var descendants = common.jstree.getNodeDescendants(self.categoriesTreeId, jstreeNode.id)
            var concepts = [];
            var ancestorsDepth = 3;

            var selectedSources = $("#Evaluate_rightPanel_sourcesTreeDiv").jstree().get_checked()
            var sources = {}
            selectedSources.forEach(function (source) {
                sources[source] = []
            })

            descendants.forEach(function (node) {
                if (!node.data.files)
                    return;
                node.data.files.forEach(function (fileObj) {

                    for (var noun in fileObj.nouns) {
                        var nounObj = fileObj.nouns[noun]

                        if (nounObj.entities) {
                            for (var source in nounObj.entities) {
                                nounObj.entities[source].forEach(function (entity) {
                                    sources[source].push(entity)
                                })
                            }
                        }
                    }
                })
            })
            var visjsData = {nodes: [], edges: []}
            var existingNode = {}
            var offsetY = -leftPanelWidth
            var offsetYlength = 30
            var nounColor = "#0bf1f1"
            async.eachSeries(Object.keys(sources), function (source, callbackSource) {
                MainController.initControllers()
                var sourceConcepts = sources[source]

                var color = Lineage_classes.getSourceColor(source, "palette")
                visjsData.nodes.push({
                    id: source,
                    label: source,
                    shape: "ellipse",
                    color: color,
                    fixed: {x: true},
                    x: 500,
                    y: offsetY,
                    data: {type: "graph", source: source, varName: "source"}
                })

                if (sourceConcepts.length == 0)
                    return callbackSource()

                var conceptsSlices = common.array.slice(sourceConcepts);
                async.eachSeries(conceptsSlices, function (concepts, callbackSlice) {
                    Sparql_generic.getNodeParents(source, null, concepts, ancestorsDepth, null, function (err, result) {
                        if (err)
                            return callbackSlice(err)
                        result.forEach(function (item) {
                            var conceptId = item.conceptLabel.value
                            if (!existingNode[conceptId]) {
                                existingNode[conceptId] = 1
                                visjsData.nodes.push({
                                    id: conceptId,
                                    label: item.conceptLabel.value,
                                    shape: "box",
                                    color: nounColor,
                                    fixed: {x: true, y: true},
                                    x: -500,
                                    y: offsetY,
                                    data: {
                                        type: "leafConcept",
                                        source: source,
                                        varName: "concept",
                                        id: conceptId,
                                        label: item.conceptLabel.value,
                                    }
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
                                            data: {
                                                type: "broaderConcept", source: source,
                                                varName: "broader" + i,
                                                id: broaderId,
                                                label: broaderLabel,
                                            }
                                        })
                                    }
                                    if (i == 1) {
                                        var edgeId = conceptId + "_" + broaderId
                                        if (!existingNode[edgeId]) {
                                            existingNode[edgeId] = 1
                                            visjsData.edges.push({
                                                id: edgeId,
                                                from: conceptId,
                                                color: color,
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
                                                color: color,
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
                MainController.UI.message("Drawing graph (" + visjsData.nodes.length + " nodes)")
                visjsGraph.draw("Evaluate_graphDiv", visjsData, {onclickFn: Evaluate.onGraphNodeClick}, function () {
                    $("#waitImg").css("display", "none");
                    MainController.UI.message("")
                })

                if (callback)
                    return callback(null)
            })


        }


        self.showMissingWords = function (jstreeNode) {
            var descendants = common.jstree.getNodeDescendants(self.categoriesTreeId, self.currentTreeNode.id)

            var sources = {}
            var missingNouns = []
            var selectedSources = $("#Evaluate_rightPanel_sourcesTreeDiv").jstree().get_checked()

            var sourceMissingWords = []
            descendants.forEach(function (node) {
                if (!node.data.files)
                    return;

                node.data.files.forEach(function (fileObj) {


                    for (var noun in fileObj.nouns) {
                        var nounObj = fileObj.nouns[noun]

                        if (!nounObj.entities) {
                            if (sourceMissingWords.indexOf(noun) < 0)
                                sourceMissingWords.push(noun)

                        }
                    }


                })


            })
            var html = ""//<div style='flex-wrap;width:500px'>"

            sourceMissingWords.sort()
            sourceMissingWords.forEach(function (noun, index) {
                html += "<div class='evaluate_missingWord'>" + noun + "</div>"
                /*if(index%15==0)
                    html += "<br>"*/
            })
            html += "<div> "

            $("#evaluate_missingWordsDiv").html(html);
            setTimeout(function () {
                $(".evaluate_missingWord").bind("click", Evaluate.onMissingWordClick)
            }, 200)

        }
        self.onMissingWordClick = function (event) {
            var word = event.currentTarget.innerText
            var html = "<b>" + word + "</b>&nbsp;" +
                "<button style=' background-color: "+Evaluate.copyTypeColors["concept"]+"' onclick='Evaluate.copyWordToClipboard(\"" + word + "\",\"concept\")'>Copy as Concept</button>" +
                "<button style=' background-color: "+Evaluate.copyTypeColors["altLabel"]+"' onclick='Evaluate.copyWordToClipboard(\"" + word + "\",\"altLabel\")'>Copy as AltLabel</button>" +
                "<br><ul>"
            var descendants = common.jstree.getNodeDescendants(self.categoriesTreeId, self.currentTreeNode.id)

            descendants.forEach(function (node) {
                if (!node.data.files)
                    return;

                node.data.files.forEach(function (fileObj) {

                    var nounObj = fileObj.nouns[word];
                    if (nounObj) {
                        var str = '<li>' + fileObj.fileName + ' : ' + nounObj.offsets.length + ' occurences</li>'
                        if (html.indexOf(str) < 0)
                            html += str
                    }
                })


            })
            $("#Annotate_missingWordInfosDiv").html(html)
            $(".evaluate_missingWord").removeClass("evaluate_missingWord_selected")
            $(".evaluate_missingWord:contains('" + word + "')").addClass("evaluate_missingWord_selected")


        }
        self.copyWordToClipboard = function (word, pasteType) {
            var id = "_annotate_missing_word_" + common.getRandomHexaId(5)
            var data = {

                "type": "node",
                "id": id,
                "label": word,

                "data": {
                    "type": "http://www.w3.org/2004/02/skos/core#Concept",
                    "source": "_annotate_missing_word",
                    "id": id,
                    "label": word,
                    "pasteType": pasteType,
                    "altLabelLang": "en"

                }

            }
            Clipboard.copy(data, null, {})

            $(".evaluate_missingWord:contains('" + word + "')").css("background-color", Evaluate.copyTypeColors[pasteType]);




        }

        self.showUnderlinedEntities = function (jstreeNode) {

            MainController.UI.message("processing data")
            var descendants = common.jstree.getNodeDescendants(self.categoriesTreeId, jstreeNode.id)
            var concepts = [];
            var ancestorsDepth = 3;

            var selectedSources = $("#Evaluate_rightPanel_sourcesTreeDiv").jstree().get_checked()
            var sources = {}
            selectedSources.forEach(function (source) {
                sources[source] = []
            })

            descendants.forEach(function (node) {
                if (!node.data.files)
                    return;

                node.data.files.forEach(function (fileObj, index) {
                    $("#underlineEntities").append("<br><b>----------------" + fileObj.filePath + "-----------------</b><br>")
                    var outputText = "";
                    var initialText = fileObj.text;
                    var offsetsArray = []
                    var offsets = {}
                    for (var noun in fileObj.nouns) {
                        var nounObj = fileObj.nouns[noun]

                        if (nounObj.entities) {
                            nounObj.offsets.forEach(function (offset) {
                                offsets[offset] = {entities: nounObj.entities, noun: noun}
                                offsetsArray.push(offset)
                            })


                        }
                    }

                    offsetsArray = offsetsArray.sort(function (a, b) {
                        return a - b;
                    })
                    outputText += "<hr>"
                    var lastOffset = 0
                    offsetsArray.forEach(function (offset) {
                        var chunk = initialText.substring(lastOffset, offset);
                        outputText += chunk
                        outputText += "<a href=''>" + "<span class='underlinedEntity' >" + offsets[offset].noun + "</span>" + "</a>"
                        lastOffset += offsets[offset].noun.length


                    })
                    $("#underlineEntities").append(outputText)
                })

            })

        }


        self.showCorpusSources = function (sources) {

            var jstreeData = []
            sources.forEach(function (source) {
                jstreeData.push({
                    id: source,
                    text: source,
                    parent: "#"
                })
            })
            common.jstree.loadJsTree("Evaluate_rightPanel_sourcesTreeDiv", jstreeData, {
                withCheckboxes: true,
                openAll: true
            }, function (err, result) {
                common.jstree.checkAll("Evaluate_rightPanel_sourcesTreeDiv");
            })
        }

        self.contextMenuFn = function (treeDiv) {

            var items = {}
            items.matchAllResources = {
                label: "match all ressources",
                action: function (e, xx) {// pb avec source
                    self.treeMenu.matchAllRessources()


                }
            }
            /*    self.currentTreeNode = obj.node
                self.getSubjectGraphData(obj.node)
                self.showMissingWords(obj.node)*/

            var sources = {}

        }
        self.treeMenu = {

            matchAllRessources: function () {
                var x = self.currentTreeNode

            }
        }

        self.serverMessage = function (data) {
            $("#annotate_messageDiv").prepend(data + "<hr>")
        }


        self.testUnderline = function () {
            let selection = window.getSelection();
            let strongs = document.getElementsByTagName('strong');

            if (selection.rangeCount > 0) {
                selection.removeAllRanges();
            }

            for (let i = 0; i < strongs.length; i++) {
                let range = document.createRange();
                range.selectNode(strongs[i]);
                selection.addRange(range);
            }
        }

        return self


    }
)()