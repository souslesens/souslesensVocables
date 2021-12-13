var Standardizer = (function () {
    var self = {};
    self.matchCandidates = {}
    var matrixHtml = ""
    var maxCompareSource = 25
    var maxWordsListLength = 2000
    self.mode = "matrix";
    self.indexSourcesMap = {}
    self.currentAction = null;
    self.fuzzyMatches = []

    self.onSourceSelect = function () {

    }
    self.onLoaded = function () {
        $("#actionDiv").html("")
        $("#actionDivContolPanelDiv").load("snippets/standardizer/standardizer_left.html")
        MainController.UI.toogleRightPanel(true)
        $("#rightPanelDiv").html("")
        $("#rightPanelDiv").load("snippets/standardizer/standardizer_right.html")


        $("#graphDiv").html("")
        $("#graphDiv").load("snippets/standardizer/standardizer_central.html")
        $("#accordion").accordion("option", {active: 2});

        self.initSourcesIndexesList(null, function (err, sources) {
            if (err)
                return MainController.UI.message(err)

            var options = {
                contextMenu: Standardizer.getSourcesJstreeContextMenu(),
                selectTreeNodeFn: Standardizer.onselectSourcesTreeNodeFn
            }
            MainController.UI.showSources("Standardizer_sourcesTree", true, sources, ["OWL"], options);
            sources.sort()

            var candidateEntities = sources
            candidateEntities.splice(0, 0, "all")
            common.fillSelectOptions("KGadvancedMapping_filterCandidateMappingsSelect", candidateEntities, false)


            var sortList = ["alphabetic", "candidates"]
            sources.forEach(function (source) {
                sortList.push({value: "_search_" + source, text: source})
            })


            common.fillSelectOptions("KGmapping_distinctColumnSortSelect", sortList, false, "text", "value")
            KGadvancedMapping.setAsMatchCandidateExternalFn = Standardizer.setAsMatchCandidate
            self.matchCandidates = {}

            //   common.fillSelectOptions("Standardizer_sourcesSelect", sources, true);


        })
        setTimeout(function () {
            $("#graphDiv").html("")// sinon ne monte pas en dehors du timeout
            $("#graphDiv").load("snippets/standardizer/standardizer_central.html")
            setTimeout(function () {
                $("#standardizerCentral_tabs").tabs({});
            }, 200)
        }, 200)


    }


    self.initSourcesIndexesList = function (options, callback) {
        if (!options)
            options = {}
        var payload = {
            dictionaries_listIndexes: 1,

        }
        $.ajax({
            type: "POST",
            url: Config.serverUrl,
            data: payload,
            dataType: "json",
            success: function (indexes, textStatus, jqXHR) {
                var sources = [];


                Admin.showUserSources(function (userSources) {
                    userSources.forEach(function (source) {
                        if (userSources.index)
                            var sourceLabel = "" + source

                        if (options.schemaType && Config.sources[source].schemaType != options.schemaType) {
                            ;
                        } else {

                            indexes.forEach(function (indexName) {
                                if (indexName == source.toLowerCase()) {
                                    sources.push(source);
                                    self.indexSourcesMap[indexName] = source
                                }

                            })
                        }
                    })
                })

                return callback(null, sources)


            }
            , error: function (err) {
                return callback(err);

            }


        })


    }


    self.getElasticSearchMatches = function (words, indexes, mode, from, size, callback) {


        $("#waitImg").css("display", "block")
        //   MainController.UI.message("Searching exact matches ")
        KGadvancedMapping.currentColumnValueDivIds = {}


        var entitiesMap = {};
        var count = 0

        self.getWordBulkQuery = function (word, mode, indexes) {

            var queryObj;
            if (!mode || mode == "exactMatch") {
                queryObj = {
                    "bool": {
                        "must": [
                            {
                                "term": {
                                    "label.keyword": word.toLowerCase(),

                                }
                            }
                        ]
                    }
                }
            } else {
                queryObj = {

                    "bool": {
                        "must": [
                            {
                                "query_string": {
                                    "query": word,
                                    "default_field": "label",
                                    "default_operator": "OR"
                                }
                            }
                        ]

                    }

                }
            }
            var header = {}
            if (indexes)
                header = {"index": indexes}


            var query = {
                "query": queryObj,
                "from": from,
                "size": size,
                "_source": {
                    "excludes": [
                        "attachment.content"
                    ]
                },
            }
            var str = JSON.stringify(header) + "\r\n" + JSON.stringify(query) + "\r\n";
            return str;

        }


        self.entitiesMap = {}
        var bulQueryStr = ""
        var slices = common.array.slice(words, 100)
        var allResults = []
        var totalProcessed = 0
        async.eachSeries(slices, function (wordSlice, callbackEach) {
            bulQueryStr = "";
            wordSlice.forEach(function (word) {
                var wordQuery = self.getWordBulkQuery(word, mode, indexes)
                bulQueryStr += wordQuery;
            })
            ElasticSearchProxy.executeMsearch(bulQueryStr, function (err, result) {
                if (err)
                    return callbackEach(err)

                allResults = allResults.concat(result)
                callbackEach();
            })


        }, function (err) {
            callback(err, allResults);

        })
    }
    self.getClassesLabels = function (classUris, indexes, callback) {

        var bulQueryStr = ""
        var slices = common.array.slice(classUris, 100)
        var allResults = []
        var totalProcessed = 0
        var size = 200
        var queryResultsSize = 5000
        var classesMap = {}
        var slices;
        if (classUris)
            slices = common.array.slice(classUris, size)
        async.eachSeries(slices, function (urisSlice, callbackEach) {
            var queryObj = {
                "terms": {
                    "id.keyword": urisSlice,
                }
            }
            var query = {
                "query": queryObj,
                "from": 0,
                "size": queryResultsSize,
                "_source": {
                    "excludes": [
                        "attachment.content",
                        "parents"
                    ]
                },
            }


            ElasticSearchProxy.queryElastic(query, indexes, function (err, result) {
                if (err)
                    return callbackEach(err)

                var hits = result.hits.hits
                if (hits.length > queryResultsSize)
                    if (!confirm("resut troncated > " + hits.length))
                        return callback("resut troncated")
                hits.forEach(function (hit) {
                    classesMap[hit._source.id] = hit._source.label
                })
                callbackEach();
            })
        }, function (err) {
            if (err)
                return callback(err);
            return callback(null, classesMap)
        })

    }

    self.getSelectedIndexes = function (excludeCurrentSource) {
        var sources = $('#Standardizer_sourcesTree').jstree(true).get_checked();
        var indexes = []
        //  var sourceIndex = $("#Standardizer_sourcesSelect").val();
        var sourceIndex = self.currentSource;

        sources.forEach(function (source) {
            if (!Config.sources[source] || !Config.sources[source].schemaType)
                return;
            if (!excludeCurrentSource || source != sourceIndex)
                indexes.push(source.toLowerCase())
        })
        return indexes;
    }

    self.initMatrix = function (indexes) {    //titre des colonnes
        self.currentWordsCount = 0
        var html = "<div class='matrix'>"
        html += "<div class='matrixRow'>"
        html += "<div class='matrixRowTitle'></div>"
        indexes.forEach(function (index) {
            html += "<div class='matrixColTitle'>" + index + "&nbsp;&nbsp;</div>"
        })
        html += "<div style='width:50px'></div>"
        html += "</div>"

        return html;
    }

    self.processMatrixResult = function (words, data, indexes) {

        var entitiesMap = []
        words.forEach(function (word, index) {
            if (!entitiesMap[word]) {
                entitiesMap[word] = []
            }
            if (!data[index] || !data[index].hits)
                return;
            var hits = data[index].hits.hits


            hits.forEach(function (hit) {

                var entity = {
                    index: hit._index,
                    id: hit._source.id,
                    score: hit._score,
                    label: hit._source.label,
                    status: "exactMatch"
                }

                entitiesMap[word][entity.index] = entity
            })
        })


        if (self.mode == "normal") {

            KGadvancedMapping.currentColumnValueDivIds = {}
            var distinctSources = []
            words.forEach(function (word) {
                word = word.toLowerCase().trim()
                var sourcesHtml = ""
                var id = "columnValue" + common.getRandomHexaId(5)
                KGadvancedMapping.currentColumnValueDivIds[id] = {value: word, sources: [], indexData: []}
                var cssClass;


                if (entitiesMap[word]) {//exact match


                    cssClass = "KGmapping_columnValues_referenceValue"
                    for (var index in entitiesMap[word]) {
                        KGadvancedMapping.currentColumnValueDivIds[id].indexData.push(entitiesMap[word])
                        KGadvancedMapping.currentColumnValueDivIds[id].sources.push(index)

                        if (index && distinctSources.indexOf(index) < 0)
                            distinctSources.push(index)
                        sourcesHtml += "&nbsp;<span class='KGmapping_distinctColumnValueSource' style='background-color:" + KGadvancedMapping.getSourceColor(index) + "'>" + index + "</span>";

                    }
                } else {
                    cssClass = "KGmapping_columnValues_hasCandidateValues"
                }


                if (cssClass && cssClass != "") {
                    $("#KGmapping_columnValues option[value='" + word + "']").addClass(cssClass);

                }

                var html = "<div onclick='Standardizer.editCandidateValues(\"" + id + "\")' id='" + id + "' class='KGmapping_columnValue " + cssClass + "'>" + word + sourcesHtml + "</div>";
                $("#KGmapping_matrixContainer").append(html)


            })
        } else if (self.mode == "matrix") {
            var html = ""

            for (var word in entitiesMap) {

                var cellHtml = ""
                var hasMatchesClass = false

                self.matrixWordsMap.entities[word] = []
                indexes.forEach(function (indexName) {

                    var cellStr = ""
                    var specificClassStr = ""
                    var divId = common.getRandomHexaId(10)
                    self.matrixDivsMap[divId] = {index: indexName}


                    //     self.matrixIndexRankingsMap[divId]={index:indexName}
                    if (entitiesMap[word][indexName]) {
                        hasMatchesClass = true
                        cellStr = " "
                        specificClassStr = "matrixCellExactMatch"
                        self.matrixDivsMap[divId] = entitiesMap[word][indexName]

                        if (!self.matrixIndexRankingsMap)
                            self.matrixIndexRankingsMap = {}
                        if (!self.matrixIndexRankingsMap[indexName])
                            self.matrixIndexRankingsMap[indexName] = 0
                        self.matrixIndexRankingsMap[indexName] += 1

                    }
                    self.matrixWordsMap.entities[word].push(entitiesMap[word][indexName] || null)
                    self.matrixDivsMap[divId].word = word
                    // self.matrixDivsMap[divId].index=indexName


                    cellHtml += "<div id='" + divId + "' class='matrixCell " + specificClassStr + "' >" + cellStr + "</div>"


                })

                var rowHtml = "<div class='matrixRow'>"

                var hasMatchesClassStr = ""
                if (!hasMatchesClass)
                    hasMatchesClassStr = " matrixWordNoMatch"
                else
                    hasMatchesClassStr = " matrixWordExactMatch"

                var wordDivId = common.getRandomHexaId(10)
                self.matrixDivsMap[wordDivId] = word

                rowHtml += "<div id='" + wordDivId + "' class='matrixRowTitle " + hasMatchesClassStr + "'>" + word + "</div>"
                rowHtml += cellHtml + "</div>"
                html += rowHtml;

            }
            return html;


        }


    }
    self.exportExactMatchMatrix = function () {
        var cols = []

        cols.push({title: "word", defaultContent: ""})
        cols.push({title: "matches", defaultContent: ""})
        self.matrixWordsMap.indexes.forEach(function (col) {
            cols.push({title: col, defaultContent: ""})

        })


        var dataSet = []

        for (var key in self.matrixWordsMap.entities) {
            var line = [key]
            var matchesCount = 0
            var obj = self.matrixWordsMap.entities[key]
            obj.forEach(function (entity) {
                if (entity == null)
                    line.push("")
                else {
                    line.push(entity.label + " __ " + entity.id)
                    matchesCount += 1
                }
            })
            line.splice(1, 0, matchesCount)
            dataSet.push(line)

        }
        Export.showDataTable(null, cols, dataSet)

    }
    self.exportFuzzyMatches = function () {

        var cols = []
        cols.push({title: "word", defaultContent: ""})
        cols.push({title: "source", defaultContent: ""})
        cols.push({title: "label", defaultContent: ""})
        cols.push({title: "uri", defaultContent: ""})

        var dataSet = []
        self.fuzzyMatches.forEach(function (item) {
            dataSet.push(
                [item.word,
                    item.source,
                    item.item.label,
                    item.item.id,

                ])

        })
        Export.showDataTable(null, cols, dataSet)


    }

    self.createSameAsRelations = function () {
        var relations = []
        self.fuzzyMatches.forEach(function (item) {
            var from = self.currentWordsMap[item.word]

            if (from) {
                relations.push({
                    to: {

                        source: item.source,
                        label: item.item.label,
                        id: item.item.id,
                    }, from: {
                        source: from.source,
                        label: from.item.label,
                        id: from.item.id,
                    }
                })
            }

        })

        return alert(" coming soon");
    }


    self.getMatchesClassesByIndex = function (bulkResult) {
        var indexClassMap = {}
        bulkResult.forEach(function (item) {
            var hits = item.hits.hits;
            hits.forEach(function (hit) {
                if (!indexClassMap[hit._index])
                    indexClassMap[hit._index] = {}
                if (!indexClassMap[hit._index][hit._source.id])
                    indexClassMap[hit._index][hit._source.id] = {words: [], data: hit._source}
                indexClassMap[hit._index][hit._source.id].words.push(hit._source.label)
            })
        })
        return indexClassMap;
    }

    self.showMatchesIndexRanking = function () {
        if (!self.matrixIndexRankingsMap)
            return;
        var array = []
        for (var index in self.matrixIndexRankingsMap) {
            array.push({index: index, count: self.matrixIndexRankingsMap[index]})
        }

        array.sort(function (a, b) {

            return b.count - a.count;
        })
        var html = "<B>Sources ranking</B><br><table>"
        array.forEach(function (item) {
            var percent = Math.round(item.count / self.currentWordsCount * 100)
            html += "<tr><td>" + item.index + "</td><td> " + item.count + "</td><td>" + percent + "%</td></tr>"
        })
        html += "</table>"

        $("#Standardizer_matrixRankingDiv").html(html)


    }

    self.initAction = function (type) {
        self.currentAction = type
        if (type == "compareWordsList") {
            $("#Standardizer_leftTab").tabs("option", "active", 2)
        } else if (type == 'compareText') {
            self.extractText();
            $("#Standardizer_leftTab").tabs("option", "active", 2)
        } else if (type == 'compareSource') {
            if (!self.currentSource)
                return alert('select a source')
            self.compareSource(self.currentSource);
            ;
        }
    }
    self.compare = function () {
        if (!self.currentAction)
            return alert("select data to compare")
        if (self.currentAction == "compareWordsList") {
            self.compareWordsList()
        } else if (self.currentAction == 'compareText') {
            self.compareWordsList()
        } else if (self.currentAction == 'compareSource') {
            if (!self.currentSource)
                return alert('select a source')
            self.compareSource(self.currentSource);
        }
    }

    self.splitWords = function () {
        $("#KGmapping_matrixContainer").html("")
        var text = $("#Standardizer_wordsTA").val()
        if (text == "")
            return alert("Enter text to standardize")
        var words = text.split("\n")
        var words2 = ""
        words.forEach(function (word) {
            var word2 = word.replace(/[A-Z]/g, function (maj) {
                return " " + maj
            })
            word2 = word2.trim();

            words2 += (word2 + "\n")


        })
        $("#Standardizer_wordsTA").val(words2)


    }
    self.compareWordsList = function () {

        $("#KGmapping_matrixContainer").html("")
        var text = $("#Standardizer_wordsTA").val()
        if (text == "")
            return alert("Enter text to standardize")
        var words1 = text.split("\n")
        var words = []
        self.currentWordsMap = {}
        words1.forEach(function (word) {
            word = word.trim()
            if (words.indexOf(word) < 0)
                words.push(word)

        })
        if (words.length > maxWordsListLength)
            return alert(" too many words, max " + maxWordsListLength)
        self.matrixDivsMap = {}

        var resultSize = 1
        var size = 200;
        var totalProcessed = 0
        var searchResultArray = []

        var indexes = self.getSelectedIndexes()
        if (indexes.length == 0)
            return alert("select target Source of comparison")
        if (indexes.length > maxCompareSource)
            return alert("too many Sources of comparison selected max : " + maxCompareSource)
        var html = self.initMatrix(indexes)
        $("#KGmapping_matrixContainer").html(html)
        self.currentWordsCount = 0
        self.matrixWordsMap = {indexes: indexes, entities: []}
        var slices = common.array.slice(words, size)
        async.eachSeries(slices, function (words, callbackEach) {
            var indexes = self.getSelectedIndexes()

            self.currentWordsCount += words.length
            self.getElasticSearchMatches(words, indexes, "exactMatch", 0, words.length, function (err, result) {
                var html = self.processMatrixResult(words, result, indexes)
                MainController.UI.message(" processed items: " + (totalProcessed))
                $("#KGmapping_matrixContainer").append(html)
                totalProcessed += result.length;
                searchResultArray = searchResultArray.concat(result)
                callbackEach()
            })


        }, function (err) {
            self.isWorking = null;
            if (err)
                return alert(err)
            MainController.UI.message("DONE, total processed items: " + (totalProcessed), true)
            setTimeout(function () {
                $(".matrixCell").bind("click", Standardizer.onMatrixCellClick)
                $(".matrixWordNoMatch").bind("click", Standardizer.onMatrixWordNoMatchClick)
                $(".matrixWordExactMatch").bind("click", Standardizer.onMatrixWordExactMatchClick)
                self.showMatchesIndexRanking()
                self.searchResultArray = searchResultArray
                self.drawSunBurst(searchResultArray, words, {}, function (err) {

                })

            }, 500)
        })
    }


    self.compareSource = function (source) {
        if (self.isWorking)
            return alert(" busy !")
        self.matrixDivsMap = {}

        //   var source = $("#Standardizer_sourcesSelect").val();
        if (!source || source == "")
            return alert("select a source");
        var index = source.toLowerCase()
        var resultSize = 1
        var size = 200;
        var from = offset;
        var offset = 0
        var totalProcessed = 0
        var indexes = self.getSelectedIndexes(true)
        var p = indexes.indexOf(source.toLowerCase())
        if (p > -1)// remove source from indexes to compare with
            indexes.splice(p, 1)
        if (indexes.length == 0)
            return alert("select target Source of comparison")

        self.matrixWordsMap = {indexes: indexes, entities: []}
        var html = self.initMatrix(indexes)
        $("#KGmapping_matrixContainer").html(html)

        self.currentWordsCount = 0
        var searchResultArray = []
        var allWords = []
        self.currentWordsMap = {}
        async.whilst(function (test) {
            return resultSize > 0

        }, function (callbackWhilst) {

            self.listSourceLabels(index, offset, size, null, function (err, hits) {
                if (err)
                    return callbackWhilst(err)
                resultSize = hits.length
                self.currentWordsCount += hits.length
                var words = []
                offset += size
                hits.forEach(function (hit) {
                    words.push(hit._source.label);
                    allWords = allWords.concat(words)
                    self.currentWordsMap[hit._source.label] = {
                        source: self.currentSource,
                        id: hit._source.id,
                        label: hit._source.label
                    }
                    //   self.currentWords.push(hit._source.label)
                })
                var indexes = self.getSelectedIndexes(true)
                self.getElasticSearchMatches(words, indexes, "exactMatch", 0, size, function (err, result) {
                    if (err)
                        return alert(err)
                    //  self.getMatchesClassesByIndex(result)
                    var html = self.processMatrixResult(words, result, indexes)
                    searchResultArray = searchResultArray.concat(result)
                    totalProcessed += result.length;
                    MainController.UI.message(" processed items: " + (totalProcessed))
                    $("#KGmapping_matrixContainer").append(html)

                    callbackWhilst()
                })


            })
        }, function (err) {
            self.isWorking = null;
            if (err)
                return alert(err)
            MainController.UI.message("DONE, total processed items: " + (totalProcessed++), true)

            setTimeout(function () {
                $(".matrixCell").bind("click", Standardizer.onMatrixCellClick)
                $(".matrixWordNoMatch").bind("click", Standardizer.onMatrixWordNoMatchClick)
                $(".matrixWordExactMatch").bind("click", Standardizer.onMatrixWordExactMatchClick)


                self.showMatchesIndexRanking()

                self.searchResultArray = searchResultArray
                self.drawSunBurst(searchResultArray, allWords, {}, function (err) {

                })


            }, 500)
        })
    }


    self.onMatrixCellClick = function (event) {
        var cellData = self.matrixDivsMap[this.id]
        self.editCellData(cellData)
    }

    self.onMatrixWordExactMatchClick = function (event) {
        var cellData = self.matrixDivsMap[this.id]
        //  self.editCellData(cellData)
    }
    self.onMatrixWordNoMatchClick = function (event) {
        var word = self.matrixDivsMap[this.id]
        self.fuzzyMatches.currentFuzzyDiv = this.id
        self.fuzzyMatches.currentFuzzyWord = word
        self.showFuzzyMatchSearch(word)


    }
    self.onSunBurstClick = function (node) {
        $("#Standardizer_matrixCellDataDiv").html("")
        if (node.parent && node.parent.name == "orphans")
            self.showFuzzyMatchSearch(node.name)
        else {
            if (node.parent && node.parent.ancestors) {
                var cellData = {
                    index: node.parent.ancestors[0],
                    name: node.name,
                    uri: node.id

                }
                self.editCellData(cellData)

            }
        }
    }


    self.showFuzzyMatchSearch = function (word) {
        var html = 'search<input class="KGadvancedMapping_searchEntitiesInput" id="Standardizer_searchEntitiesInput2" ' +
            'onkeyup="if (event.keyCode == 13)Standardizer.searchFuzzyMatches($(this).val(),null,\'Standardizer_searchResulDiv2\')">'
        html += '<div id="Standardizer_searchResulDiv2" </div>'
        $("#Standardizer_matrixCellDataDiv").html(html);
        setTimeout(function () {
            $("#Standardizer_searchEntitiesInput2").val(word)
            Standardizer.searchFuzzyMatches($("#Standardizer_searchEntitiesInput2").val(), null, "Standardizer_searchResulDiv2")
        }, 200)


    }

    self.editCellData = function (cellData) {
        var html = "<b>" + cellData.index + "</b>"

        html += "<br><table>"

        for (var key in cellData) {
            var value = "" + cellData[key]
            if (value.indexOf("http://") == 0)
                value = "<a target='_blank' href='" + value + "'>" + value + "</a>"
            html += "<tr><td>" + key + "</td><td>" + value + "</td></tr>"
        }
        html += "</table>" +
            "<br>"
        $("#Standardizer_matrixCellDataDiv").html(html)
        MainController.UI.message("", true)

    }

    self.editCandidateValues = function (columnValueDivId, searchedText) {
        KGadvancedMapping.currentColumnValueDivId = columnValueDivId
        var columnValue = KGadvancedMapping.currentColumnValueDivIds[columnValueDivId].value
        $("#KGadvancedMapping_searchEntitiesInput").val(columnValue)
        var entity = self.entitiesMap[columnValue.toLowerCase()]
        if (entity) {
            var keys = []

            for (var source in entity) {
                if (keys.length == 0)
                    keys = Object.keys(entity[source])
            }

            var html = ""
            for (var source in entity) {
                html += "<b>" + source + "</b>"

                html += "<br><table>"

                keys.forEach(function (key) {
                    var value = "" + entity[source][key]
                    if (value.indexOf("http://") == 0)
                        value = "<a href='" + value + "'>" + value + "</a>"
                    html += "<tr><td>" + key + "</td><td>" + value + "</td></tr>"
                })
                html += "</table>" +
                    "<br>"

                if (authentication.currentUser.groupes.indexOf("admin") > -1) {
                    html += "<button class='btn btn-sm my-1 py-0 btn-outline-primary'  onclick='Standardizer.removeAsReference(\"" + entity[source].id + "\")' >Remove</button>"
                    if (entity[source].status == "CANDIDATE")
                        html += "<button class='btn btn-sm my-1 py-0 btn-outline-primary'  onclick='Standardizer.setAsReference(\"" + entity[source].id + "\")' >Validate</button>"
                }
                html += "<hr>"

            }

            $("#KGadvancedMapping_dictionaryMappingContainerDiv").html(html)
            MainController.UI.message("", true)

        } else {

            KGadvancedMapping.searchEntities(columnValue,)
        }
    }

    self.setAsReference = function (referenceId) {

    }
    self.removeAsReference = function (referenceId) {

    }


    self.exportMappings = function () {
        var columns = []
        var sourcesMap = {}
        var exportAncestors = $("#Standardizer_exportAncestorsCBX").prop("checked")

        for (var term in self.entitiesMap) {
            for (var index in self.entitiesMap[term]) {
                var item = {
                    target: self.entitiesMap[term][index],
                    term: term
                }

                var source = Config.Standardizer.elasticIndexesSourcesMap[index]

                if (!sourcesMap[source])
                    sourcesMap[source] = []
                sourcesMap[source].push(item)
            }
        }


        for (var columnValueDivId in KGadvancedMapping.matchCandidates) {

            var item = KGadvancedMapping.matchCandidates[columnValueDivId];
            item.target.status = "similar"
            var source = Config.Standardizer.elasticIndexesSourcesMap[item.target.index]
            if (!sourcesMap[source])
                sourcesMap[source] = []
            sourcesMap[source].push(item)

        }

        var sources = Object.keys(sourcesMap)
        var idsMap = {};
        async.eachSeries(sources, function (source, callbackEachSource) {

            var items = sourcesMap[source]

            items.forEach(function (item) {
                idsMap[item.target.id] = item;
            })


            if (!exportAncestors)
                return callbackEachSource();

            var ids = Object.keys(idsMap)
            var ancestorsDepth = 4
            var datatableColumns = []
            var dataTableData = []
            $("#waitImg").css("display", "block")
            MainController.UI.message("searching, classes ancestors in source " + source)
            Sparql_OWL.getNodeParents(source, null, ids, ancestorsDepth, null, function (err, result) {
                if (err)
                    return callbackEachSource(err)
                result.forEach(function (item2) {
                    var strBroaderLabels = ""
                    var strBroaderUris = ""
                    for (var i = 1; i < ancestorsDepth; i++) {
                        if (item2["broader" + i]) {
                            var broaderId = item2["broader" + i].value;
                            var broaderLabel = item2["broader" + i + "Label"].value;
                            strBroaderUris += broaderId + "/"
                            strBroaderLabels += broaderLabel + "/"

                        }

                    }
                    idsMap[item2.concept.value].superClassUris = strBroaderUris
                    idsMap[item2.concept.value].superClassLabels = strBroaderLabels
                })

                callbackEachSource();
            })


        }, function (err) {
            MainController.UI.message("building table",)
            var keys = ['term', 'status', 'index', 'classLabel', 'classId', 'score']
            if (exportAncestors) {
                keys.push('superClassUris')
                keys.push('superClassLabels')
            }
            var cols = [];
            var dataSet = [];
            keys.forEach(function (key) {
                cols.push({title: key, "defaultContent": ""})
            })


            for (var id in idsMap) {
                var line = [];
                var item = idsMap[id];
                line.push(item.term)
                line.push(item.target.status)
                line.push(item.target.index)
                line.push(item.target.label || item.target.term)
                line.push(item.target.id)
                line.push(item.target.score)
                if (exportAncestors) {
                    line.push(item.superClassUris)
                    line.push(item.superClassLabels)
                }
                dataSet.push(line)

            }


            $('#mainDialogDiv').dialog("open")

            $('#mainDialogDiv').html("<table id='dataTableDiv'></table>");
            setTimeout(function () {
                MainController.UI.message("", true)
                $('#dataTableDiv').DataTable({
                    data: dataSet,
                    columns: cols,
                    // async: false,
                    "pageLength": 15,
                    dom: 'Bfrtip',
                    buttons: [
                        'copy', 'csv', 'excel', 'pdf', 'print'
                    ]


                })
                    , 500
            })

        })

    }

    self.listSourceLabels = function (source, from, size, options, callback) {
        if (!options)
            options = {}
        if (!from)
            from = 0
        if (!size)
            size = 1000
        if (!source) {
            //   source = $("#Standardizer_sourcesSelect").val();
            source = self.currentSource
            if (!source || source == "")
                return alert("select a source");
        }


        var queryObj = {"match_all": {}}


        var query = {
            "query": queryObj,
            "from": from,
            "size": size,
            "_source": {
                "excludes": [
                    "attachment.content"
                ]
            }
            , "sort": {
                "label.keyword": {"order": "asc"}
            }
        }

        var index = source.toLowerCase()
        ElasticSearchProxy.queryElastic(query, index, function (err, result) {
                if (err) {
                    if (callback)
                        return callback(err)
                    return alert(err)
                }

                if (callback) {
                    return callback(null, result.hits ? result.hits.hits : [])
                } else {

                    if (err)
                        return alert(err)
                    var str = ""
                    if (!result.hits)
                        return alert(JSON.stringify(result, null, 2))
                    result.hits.hits.forEach(function (hit) {
                        str += hit._source.label + "\n";

                    })

                    $("#Standardizer_wordsTA").val(str)
                }
            }
        )
    }


    self.generateSourceDictionary = function (sourceLabel) {
        if (Config.sources[sourceLabel].schemaType == "OWL") {
            Sparql_OWL.getDictionary(sourceLabel, {}, null, function (err, result) {
                if (err)
                    MainController.UI.message(err, true)

            })
        }
    }

    self.generateElasticIndex = function (sourceLabel, callback) {
        var totalLines = 0


        var processor = function (data, replaceIndex, callback) {


            if (data.length == 0)
                return callback();
            //  MainController.UI.message("indexing " + data.length)
            var options = {replaceIndex: replaceIndex, owlType: "Class"}
            var payload = {
                dictionaries_indexSource: 1,
                indexName: sourceLabel.toLowerCase(),
                data: JSON.stringify(data),
                options: JSON.stringify(options)
            }

            $.ajax({
                type: "POST",
                url: Config.serverUrl,
                data: payload,
                dataType: "json",
                success: function (data2, textStatus, jqXHR) {
                    totalLines += data.length
                    MainController.UI.message("indexed " + totalLines + " in index " + sourceLabel.toLowerCase())
                    callback(null, data)
                }
                , error: function (err) {
                    callback(err);

                }


            })

        }

        if (Config.sources[sourceLabel].schemaType == "OWL") {
            Sparql_OWL.getSourceTaxonomyAnClasses(sourceLabel, null, function (err, result) {

                if (err) {
                    if (callback)
                        return callback(err);
                    MainController.UI.message(err, true)
                }
                var index = 0
                var classesArray = [];
                for (var key in result.classesMap) {
                    classesArray.push(result.classesMap[key])
                }
                var slices = common.array.slice(classesArray, 200)
                async.eachSeries(slices, function (data, callbackEach) {
                    var replaceIndex = false
                    if ((index++) == 0)
                        replaceIndex = true;
                    processor(data, replaceIndex, function (err, result) {
                        if (err)
                            return callbackEach(err)
                        //   MainController.UI.message("indexed "+data.length+" lines in "+sourceLabel)
                        callbackEach();
                    })
                }, function (err) {
                    if (callback)
                        return callback(err);
                    MainController.UI.message("DONE " + sourceLabel, true)
                })

            })

            return;
            Sparql_OWL.getDictionary(sourceLabel, {}, processor, function (err, result) {
                if (err) {

                    if (callback)
                        return callback(err);
                    MainController.UI.message(err, true)
                }


                if (callback)
                    return callback();
                MainController.UI.message("DONE " + sourceLabel, true)
            })
        }
    }


    self.drawSunBurst = function (searchResultArray, words, options, callback) {
        if ({options})
            options = {}

        var sunburstDivId = "Standardizer_sunburstDiv"
        //  var graphDivId = "Standardizer_graphDiv"
        //  var treeDivId = "Standardizer_rightJstreeDiv"


        self.classUriLabelMap = {}

        var classUris = []
        var nodes = {}
        var orphans = []
        var treemapData = {}
        var distinctParentsMap = {}
        var hierarchy = {}

        async.series([
                function (callbackSeries) {//prepare data

                    var indexes = []
                    var distinctHits = []

                    searchResultArray.forEach(function (item, itemIndex) {


                        var hits = []
                        if (item.hits) {
                            hits = item.hits.hits;
                            if (hits.length == 0)
                                orphans.push(words[itemIndex])
                        }

                        hits.forEach(function (hit) {
                            if (distinctHits.indexOf(hit._source.label) < 0)
                                distinctHits.push(hit._source.label)

                            if (indexes.indexOf(hit._index) < 0)
                                indexes.push(hit._index)
                            var parentsStr = hit._source.parents

                            classUris.push(hit._source.id)
                            if (parentsStr) {

                                var lastParent
                                var parents = parentsStr.substring(0, parentsStr.length - 1).split("|")

                                if (!distinctParentsMap[parentsStr])
                                    distinctParentsMap[parentsStr] = []

                                var ancestors = [];
                                var path = "";
                                parents.forEach(function (itemParent, index) {
                                    var parentPath = path
                                    path += itemParent + "|"
                                    ancestors.push(itemParent)
                                    if (classUris.indexOf(itemParent) < 0)
                                        classUris.push(itemParent)
                                    var parent = hit._index


                                    if (index > 0)
                                        parent = parents[index - 1]
                                    else
                                        parent = null

                                    if (!nodes[itemParent]) {
                                        nodes[itemParent] = {
                                            id: itemParent,
                                            path: path,
                                            parentPath: parentPath,
                                            parent: parent,
                                            index: hit._index,
                                            classes: [],
                                            ancestors: ancestors,
                                            countChildren: 0
                                        }


                                    }
                                    lastParent = itemParent

                                })


                                if (nodes[lastParent].classes.indexOf(hit._source.id) < 0) {
                                    nodes[lastParent].classes.push(hit._source.id)

                                }

                            }
                        })


                    })

                    callbackSeries()
                }


                , function (callbackSeries) { //get labels
                    var indexes = self.getSelectedIndexes()
                    Standardizer.getClassesLabels(classUris, indexes, function (err, result) {
                        self.classUriLabelMap = result;
                        callbackSeries()
                    })
                }, function (callbackSeries) {
                    if (!sunburstDivId)
                        return callbackSeries()


                    function getUnflatten(arr, parentId) {
                        let output = []
                        for (const obj of arr) {
                            if (obj.parentId == parentId) {
                                var children = getUnflatten(arr, obj.id)

                                if (children.length) {
                                    obj.children = children
                                }

                                output.push(obj)
                            }


                        }
                        return output
                    }


                    var array = []
                    var root = "indexes"
                    for (var nodeId in nodes) {
                        var obj = nodes[nodeId];
                        if (!obj.parent)
                            obj.parentId = root;
                        else
                            obj.parentId = obj.parent;
                        obj.name = self.classUriLabelMap[nodeId]

                        array.push(obj)
                        obj.classes.forEach(function (classId) {
                            array.push({id: classId, name: self.classUriLabelMap[classId], parentId: nodeId})
                        })


                    }

                    hierarchy = getUnflatten(array, root)

                    var orphanChildren = [];
                    orphans.forEach(function (orphan) {
                        orphanChildren.push({name: orphan, children: []})
                    })
                    hierarchy.push({name: "orphans", children: orphanChildren})
                    var root = {name: "matches", children: hierarchy}

                    if (!sunburstDivId)
                        return callbackSeries()
                    var options = {
                        onNodeClick: Standardizer.onSunBurstClick
                    }
                    Sunburst.draw(sunburstDivId, root, options)
                    return callbackSeries()
                }

            ],
            function (err) {

            })


    }


    self.drawBestMatches = function (words, indexes, options, callback) {

        if ({options})
            options = {}

        var sunburstDivId = "Standardizer_sunburstDiv"
        var graphDivId = "Standardizer_graphDiv"
        var treeDivId = "Standardizer_rightJstreeDiv"

        if (!words)
            return alert("no words input")

        self.classUriLabelMap = {}
        var searchResultArray = []
        var classUris = []
        var nodes = {}
        var orphans = []
        var treemapData = {}
        var distinctParentsMap = {}
        var hierarchy = {}

        async.series([

            function (callbackSeries) {//get indexes to compare
                if (indexes) {
                    return callbackSeries();
                }
                Standardizer.initSourcesIndexesList({schemaType: "OWL"}, function (err, result) {
                    if (err)
                        return callbackSeries(err)
                    result.forEach(function (item) {
                        indexes.push(item.toLowerCase())
                    })

                    callbackSeries();
                })
            }
            , function (callbackSeries) {//get indexes matches class map
                MainController.UI.message("matching " + words.length + "words")
                var resultSize = 1
                var size = 200;
                var offset = 0
                var totalProcessed = 0


                Standardizer.getElasticSearchMatches(words, indexes, "exactMatch", 0, size, function (err, result) {
                    if (err)
                        return callbackSeries(err)
                    resultSize = result.length;
                    offset += size
                    searchResultArray = result;
                    MainController.UI.message("matches found :" + searchResultArray.length)
                    callbackSeries()
                })

            }
            , function (callbackSeries) {//prepare data

                var indexes = []
                var distinctHits = []

                searchResultArray.forEach(function (item, itemIndex) {
                    if (item.hits && item.hits.hits && item.hits.hits.length == 0)
                        orphans.push(words[itemIndex])
                    var hits = item.hits.hits;

                    hits.forEach(function (hit) {
                        if (distinctHits.indexOf(hit._source.label) < 0)
                            distinctHits.push(hit._source.label)

                        if (indexes.indexOf(hit._index) < 0)
                            indexes.push(hit._index)
                        var parentsStr = hit._source.parents

                        classUris.push(hit._source.id)
                        if (parentsStr) {

                            var lastParent
                            var parents = parentsStr.substring(0, parentsStr.length - 1).split("|")

                            if (!distinctParentsMap[parentsStr])
                                distinctParentsMap[parentsStr] = []

                            var ancestors = [];
                            var path = "";
                            parents.forEach(function (itemParent, index) {
                                var parentPath = path
                                path += itemParent + "|"
                                ancestors.push(itemParent)
                                if (classUris.indexOf(itemParent) < 0)
                                    classUris.push(itemParent)
                                var parent = hit._index


                                if (index > 0)
                                    parent = parents[index - 1]
                                else
                                    parent = null

                                if (!nodes[itemParent]) {
                                    nodes[itemParent] = {
                                        id: itemParent,
                                        path: path,
                                        parentPath: parentPath,
                                        parent: parent,
                                        index: hit._index,
                                        classes: [],
                                        ancestors: ancestors,
                                        countChildren: 0
                                    }


                                }
                                lastParent = itemParent

                            })


                            if (nodes[lastParent].classes.indexOf(hit._source.id) < 0) {
                                nodes[lastParent].classes.push(hit._source.id)

                            }

                        }
                    })


                })

                callbackSeries()
            }


            , function (callbackSeries) { //get labels
                Standardizer.getClassesLabels(classUris, indexes, function (err, result) {
                    self.classUriLabelMap = result;
                    callbackSeries()
                })
            }



            //getGraph data and draw
            , function (callbackSeries) {
                if (!graphDivId)
                    return callbackSeries()
                var visjsData = {edges: [], nodes: []}
                visjsData.nodes.push({
                    id: "#",
                    label: "#",
                    shape: "star"

                })
                var existingNodes = {}
                for (var key in nodes) {


                    var node = nodes[key]

                    var color = Lineage_classes.getSourceColor(node.index)

                    if (!existingNodes[node.index]) {
                        existingNodes[node.index] = 1
                        visjsData.nodes.push({
                            id: node.index,
                            label: node.index,
                            shape: "ellipse",
                            color: color

                        })
                        var edgeId = node.index + "_#"
                        if (!existingNodes[edgeId]) {
                            existingNodes[edgeId] = 1
                            visjsData.edges.push({
                                from: node.index,
                                to: "#",

                            })
                        }
                    }

                    if (!existingNodes[node.id]) {
                        existingNodes[node.id] = 1
                        visjsData.nodes.push({
                            id: node.id,
                            label: self.classUriLabelMap[node.id],
                            color: color,
                            shape: "dot",
                            //  size: 8,

                            data: {
                                id: node.id,
                                label: self.classUriLabelMap[node.id],
                                classes: node.classes,
                                countChildren: node.countChildren
                            }
                        })


                        var edgeId = node.parent + "_" + node.id
                        if (!existingNodes[edgeId]) {
                            existingNodes[edgeId] = 1
                            visjsData.edges.push({
                                from: node.id,
                                to: node.parent || node.index,

                            })
                        }


                    }
                }

                visjsData.nodes.forEach(function (node) {
                    if (node.data && node.data.classes && node.data.classes.length > 0) {
                        var value = node.data.classes.length
                        node.value = value
                        node.shape = "square"
                    } else {
                        node.value = node.countChildren
                    }
                })
                var orphansNode = {
                    id: "orphans",
                    text: "orphans",
                    shape: "square",
                    color: "#ddd",
                    size: 20,
                    data: {
                        id: "orphans",
                        text: "orphans",
                        words: orphans
                    }

                }
                var edgeId = "orphans" + "_#"
                if (!existingNodes[edgeId]) {
                    existingNodes[edgeId] = 1
                    visjsData.edges.push({
                        from: "orphans",
                        to: "#",

                    })
                }
                visjsData.nodes.push(orphansNode)
                setTimeout(function () {
                    var options = {
                        onclickFn: Standardizer.bestMatches.onNodeClick,

                        nodes: {

                            scaling: {
                                customScalingFunction: function (min, max, total, value) {
                                    return value / total;
                                },
                                min: 5,
                                max: 150,
                            },
                        },
                        /*  layoutHierarchical: {
                              direction: "UD",
                              sortMethod: "hubsize",

                          }*/
                    }


                    visjsGraph.draw(graphDivId, visjsData, options)
                }, 500)

                callbackSeries();


            },


            //draw tree
            function (callbackSeries) {
                if (!treeDivId)
                    return callbackSeries()

                var jstreeData = [];
                var distinctNodes = {}
                for (var nodeId in nodes) {
                    var node = nodes[nodeId];


                    if (!distinctNodes[node.path]) {
                        distinctNodes[node.path] = 1
                        var parentPath = node.parentPath
                        if (!parentPath || parentPath == "")
                            parentPath = "#"

                        var label = self.classUriLabelMap[node.id]

                        if (!label)
                            var x = 3
                        jstreeData.push({
                            id: node.path,
                            text: label || node.id,
                            parent: parentPath,
                            data: {
                                id: node.id,
                                text: label,
                                index: node.index
                            }

                        })

                        if (node.classes) {

                            node.classes.forEach(function (classId) {
                                var classUniqueId = node.path + "_" + classId
                                if (!distinctNodes[classUniqueId]) {
                                    distinctNodes[classUniqueId] = 1
                                    var label = self.classUriLabelMap[classId];
                                    jstreeData.push({
                                        id: classUniqueId,
                                        text: label,
                                        parent: nodeId,
                                        data: {
                                            id: classId,
                                            text: label,
                                            index: node.index
                                        }

                                    })
                                }
                            })
                        }
                    }


                }
                jstreeData.push({
                    id: "orphans",
                    text: "Orphans",
                    parent: "#",
                    data: {
                        id: orphans,
                        text: orphans,
                        type: "orphan"

                    }

                })

                orphans.forEach(function (orphan) {
                    jstreeData.push({
                        id: orphan,
                        text: orphan,
                        parent: "orphans",
                        data: {
                            id: orphan,
                            text: orphan,

                        }

                    })
                })
                var options = {
                    selectTreeNodeFn: Standardizer.bestMatches.onTreeNodeClick
                }
                common.jstree.loadJsTree(treeDivId, jstreeData, options, function (err) {
                    common.jstree.openNodeDescendants(treeDivId, "#", 8)

                })
                callbackSeries()
            }


            //get sunburst data
            , function (callbackSeries) {
                if (!sunburstDivId)
                    return callbackSeries()


                function getUnflatten(arr, parentId) {
                    let output = []
                    for (const obj of arr) {
                        if (obj.parentId == parentId) {
                            var children = getUnflatten(arr, obj.id)

                            if (children.length) {
                                obj.children = children
                            }

                            output.push(obj)
                        }


                    }
                    return output
                }


                var array = []
                var root = "indexes"
                for (var nodeId in nodes) {
                    var obj = nodes[nodeId];
                    if (!obj.parent)
                        obj.parentId = root;
                    else
                        obj.parentId = obj.parent;
                    obj.name = self.classUriLabelMap[nodeId]

                    array.push(obj)
                    obj.classes.forEach(function (classId) {
                        array.push({id: classId, name: self.classUriLabelMap[classId], parentId: nodeId})
                    })


                }

                hierarchy = getUnflatten(array, root)

                var orphanChildren = [];
                orphans.forEach(function (orphan) {
                    orphanChildren.push({name: orphan, children: []})
                })
                hierarchy.push({name: "orphans", children: orphanChildren})
                var root = {name: "matches", children: hierarchy}

                if (!sunburstDivId)
                    return callbackSeries()
                var options = {
                    onNodeClick: Standardizer.bestMatches.onNodeClick
                }
                Sunburst.draw(sunburstDivId, root, options)
                return callbackSeries()
            }


        ], function (err) {
            return "DONE"
        })


    }
    self.bestMatches = {
        onNodeClick: function (node, point, options) {


            if (node) {
                // $("#Standardizer_rightJstreeDiv").jstree().show_node(node.id)
                $("#Standardizer_rightJstreeDiv").jstree().open_node(node.id)
            }

            return;
            if (!node || !node.data)
                return;
            var html = "<div><a target ='blank' href='" + node.data.id + "'>" + node.data.label + "</a></div>"
            html += "<ul>"
            if (node.data.classes) {
                node.data.classes.forEach(function (classUri) {
                    var classLabel = self.classUriLabelMap[classUri]
                    html += "<li><a target ='blank' href='" + classUri + "'>" + classLabel + "</a></li>"
                })
            }

            if (node.data.words) {
                node.data.words.forEach(function (word) {

                    html += "<li>" + word + "</li>"
                })
            }

            html += "</ul>"
            $("#bestMatchesInfosDiv").html(html)
        },

        onTreeNodeClick: function (event, obj) {
            var node = obj.node
            var source = self.indexSourcesMap[node.data.index]
            if (node.data.type = "orphan") {// orphans
                $("#Standardizer_searchEntitiesInput").val(node.data.text)
            } else
                SourceBrowser.showNodeInfos(source, node.data.id, "mainDialogDiv")

        }

    }

    self.searchFuzzyMatches = function (words, indexes, resultDiv) {

        if (!words || words == "")
            return alert(" no word Selected")
        var searchType = "fuzzyMatch"

        if (!Array.isArray(words)) {
            if (words.match(/".*"/)) {
                searchType = "exactMatch"
                words = words.replace(/"/g, "")
            }
            words = [words]
        }


        var size = 200
        var slices = common.array.slice(words, size)
        var html = ""
        self.currentSearchedResultsMap = {}

        var dataSet = []
        var cols = [];
        async.eachSeries(slices, function (words, callbackEach) {

            self.getElasticSearchMatches(words, indexes, searchType, 0, 10000, function (err, result) {
                if (err)
                    return alert(err)
                var entities = []

                result.forEach(function (item) {
                    if (!item.hits || !item.hits.hits)
                        return;
                    item.hits.hits.forEach(function (hit) {
                        var entity = {
                            index: hit._index,
                            id: hit._source.id,
                            score: hit._score,
                            label: hit._source.label
                        }
                        self.currentSearchedResultsMap[entity.id] = entity
                        entities.push(entity)
                    })

                })

                if (Object.keys(self.currentSearchedResultsMap).length == 0)
                    html = "No similar Match"
                else {

                    cols.push({
                        title: "source", defaultContent: "", width: '50px', render: function (datum, type, row) {
                            var indexStr = row[0];
                            if (indexStr.length > 15)
                                indexStr = indexStr.substring(0, 15)
                            return "<span style='width:50px;background-color: " + Lineage_classes.getSourceColor(row[0]) + ";' class='standardizer_entitySource'>" + indexStr + "</span>"
                        }
                    })
                    cols.push({title: "word", defaultContent: "", width: '150px'})
                    cols.push({
                        title: "action", render: function (datum, type, row) {

                            return "<button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='  SourceBrowser.showNodeInfos (\"" + row[0] + "\",\"" + row[2] + "\",\"mainDialogDiv\")'>I</button>" +
                                "<button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='  Standardizer.selectAsFuzzyMatch (\"" + row[0] + "\",\"" + row[2] + "\")'>S</button>"
                        },
                        width: '50px'
                    })


                    entities.forEach(function (entity) {
                        var id = "entity" + common.getRandomHexaId(5)
                        self.currentSearchedResultsMap[id] = entity
                        var source = Standardizer.indexSourcesMap[entity.index]
                        if (source)
                            dataSet.push([source, entity.label, entity.id])


                    })
                }

                callbackEach();
            })


        }, function (err) {
            // $("#" + resultDiv).html(html)
            $('#' + resultDiv).html();
            $('#' + resultDiv).html("<table id='dataTableDiv'></table>");

            setTimeout(function () {


                var buttons = 'Bi'
                $('#dataTableDiv').DataTable({
                    data: dataSet,
                    columns: cols,

                    // async: false,
                    "pageLength": 100,
                    dom: buttons,
                    buttons: [
                        {
                            extend: 'csvHtml5',
                            text: 'Export CSV',
                            fieldBoundary: '',
                            fieldSeparator: ';'
                        },

                    ],
                    order: []


                })


            }, 200)
            //   Export.showDataTable(resultDiv, cols, dataSet,'Bi')
        })

    }


    self.extractText = function () {
        $("#Standardizer_wordsTA").val("")
        var text = $("#Standardizer_textTA").val();
        if (!text || text == "")
            return alert("enter a text")

        var options = {"composedWords_2": 0}
        var chunks = [];
        var chunkSize = 5000
        var currentChunk = ""
        var currentIndex = 0
        var textSize = text.length
        while (currentChunk.length == "" || currentIndex < textSize) {

            currentChunk = text.substring(currentIndex, currentIndex + chunkSize)
            chunks.push(currentChunk)
            currentIndex += chunkSize


        }
        var allTokens = {};
        var index = 0
        async.eachSeries(chunks, function (chunk, callbackEach) {


                var payload = {
                    SpacyExtract: 1,
                    text: chunk,
                    options: JSON.stringify(options),
                    types: JSON.stringify(["NN"])
                }
                $.ajax({
                    type: "POST",
                    url: Config.serverUrl,
                    data: payload,
                    dataType: "json",
                    success: function (tokens, textStatus, jqXHR) {
                        var percent = Math.round(((++index) * chunkSize / textSize) * 100)
                        MainController.UI.message("extracting nouns : " + percent + "%", true)
                        tokens.forEach(function (word) {
                            if (!allTokens[word])
                                allTokens[word] = 1

                        })

                        callbackEach();
                    },
                    error: function (err) {
                        callbackEach(err);
                    }
                })
            }, function (err) {
                if (err)
                    return alert(err)

                MainController.UI.message("extracted nouns : " + Object.keys(allTokens).length)
                var str = ""
                for (var word in allTokens) {

                    str += word + "\n"
                }

                $("#Standardizer_wordsTA").val(str)
            }
        )

        /*  ElasticSearchProxy.analyzeSentence(text, function (err, result) {
        if (err)
            return alert(err)
        var str = ""
        result.tokens.forEach(function (item) {

            var word = item.token
            if (word.length > 4) {
                str += word + "\n"
            }
        })
        $("#Standardizer_wordsTA").val(str)


    }) */

    }

    self.selectAsFuzzyMatch = function (source, itemId) {
        var item = self.currentSearchedResultsMap[itemId]
        self.fuzzyMatches.push({word: self.fuzzyMatches.currentFuzzyWord, source: source, item: item})
        $("#" + self.fuzzyMatches.currentFuzzyDiv).addClass("matrixWordFuzzyMatch")


    }

    self.getConnections = function () {
        var ids = Object.keys(self.classUriLabelMap)
        var indexes = self.getSelectedIndexes()
        var allconnections = []
        async.eachSeries(indexes, function (index, callbackEach) {
            var source = self.indexSourcesMap[index]
            Sparql_OWL.getObjectRestrictions(source, ids, null, function (err, result) {
                if (err) {
                    //  alert(err);
                    return callbackEach()
                }
                allconnections = allconnections.concat(result)
                callbackEach()
            })
        }, function (err) {
            var distinctNodes = {}
            var html = "<table style='border:1px solid brown'>"

            var filterTargetClass = $("#Standardizer_restrictionMode").prop("checked")

            allconnections.forEach(function (connection) {
                if (!filterTargetClass || ids.indexOf(connection.value.value) > -1) {


                    if (!distinctNodes[connection.node.value]) {


                        html += "<tr>"
                        html += "<td>" + connection.conceptLabel.value + "</td><td>" + connection.propLabel.value + "</td><td>" + connection.valueLabel.value + "</td>"
                        html += "</tr>"
                    }
                }
            })
            html += "</table>"
            $("#Standardizer_connectionsDiv").html(html)
        })
    }

    self.getSourcesJstreeContextMenu = function () {
        var items = {}


        items.nodeInfos = {
            label: "Compare",
            action: function (e) {// pb avec source
                Standardizer.initAction('compareSource')
            }
        }
        return items;
    }
    self.onselectSourcesTreeNodeFn = function (event, obj) {
        self.currentSource = obj.node.id
    }


    self.showMatchesIntoLineage = function () {

        var indexes = []
        var classUrisByIndex = {}

        self.searchResultArray.forEach(function (item, itemIndex) {
            var hits = item.hits.hits;
            if (hits.length == 0)
                return
            hits.forEach(function (hit) {
                if (!classUrisByIndex[hit._index])
                    classUrisByIndex[hit._index] = []
                classUrisByIndex[hit._index].push(hit._source.id)
            })
        })

        MainController.UI.initTool("lineage");
        setTimeout(function () {
            var i = 0;
            async.eachSeries(Object.keys(classUrisByIndex), function (index, callbackEach) {

                var source = self.indexSourcesMap[index]

              if (i++ == 0)
                    MainController.currentSource = source
                MainController.UI.onSourceSelect()
                Lineage_classes.addParentsToGraph(source, classUrisByIndex[index],function(err){
                    if(err)
                        return alert(err)
                    callbackEach()
                } )

            })


        }, 500)

    }


    return self;
})
()