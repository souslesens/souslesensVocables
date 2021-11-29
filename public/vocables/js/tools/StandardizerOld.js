var Standardizer = (function () {
    var self = {};
    self.matchCandidates = {}


    self.onLoaded = function () {
        //    self.selectedSources = $("#sourcesTreeDiv").jstree(true).get_checked()
        $("#actionDiv").html("")
        $("#actionDivContolPanelDiv").load("snippets/standardizer/standardizer_left.html")
        self.mode = "matrix"

        if (self.mode == "normal") {
            $("#graphDiv").load("snippets/standardizer/standardizer_central.html")

        }
        if (self.mode == "matrix") {
            $("#graphDiv").load("snippets/standardizer/standardizer_centralMatrix.html")

        }


        $("#graphDiv").load("snippets/standardizer/standardizer_centralMatrix.html")
        $("#accordion").accordion("option", {active: 2});
        setTimeout(function () {
            var w = $(document).width() - leftPanelWidth - 30;
            var h = $(document).height() - 20;

            self.initSourcesIndexesList(function (err, indexes) {
                if (err)
                    return MainController.UI.message(err)
                var indexesTreeData = []
                indexes.forEach(function (item) {
                    indexesTreeData.push({id: item, text: item, parent: "#"})
                })

                var distinctSources = indexes
                common.jstree.loadJsTree("KGMappingAdvancedMappings_sourcesTree", indexesTreeData, {withCheckboxes: 1});
                //    var distinctSources = ["readi", "cfihos", "pca"]
                var candidateEntities = distinctSources
                candidateEntities.splice(0, 0, "all")
                common.fillSelectOptions("KGadvancedMapping_filterCandidateMappingsSelect", candidateEntities, false)


                var sortList = ["alphabetic", "candidates"]
                distinctSources.forEach(function (source) {
                    sortList.push({value: "_search_" + source, text: source})
                })


                common.fillSelectOptions("KGmapping_distinctColumnSortSelect", sortList, false, "text", "value")
                KGadvancedMapping.setAsMatchCandidateExternalFn = Standardizer.setAsMatchCandidate

                common.fillSelectOptions("Standardizer_sourcesSelect", indexes, true);


            })
            self.matchCandidates = {}
        }, 200)
    }


    self.initSourcesIndexesList = function (callback) {
        var payload = {
            dictionaries_listIndexes: 1,

        }
        $.ajax({
            type: "POST",
            url: Config.serverUrl,
            data: payload,
            dataType: "json",
            success: function (data, textStatus, jqXHR) {
                var sources = [];
                for (var source in Config.sources) {
                    sources.push(source.toLowerCase())
                }
                var indexes = []
                data.forEach(function (item) {
                    if (sources.indexOf(item) > -1) {
                        indexes.push(item);
                    }
                })
                return callback(null, indexes)


            }
            , error: function (err) {
                return callback(err);

            }


        })


    }


    self.getElasticSearchMatches = function (words) {
        var mode = $("#KGadvancedMapping_queryTypeSelect").val()
        $("#waitImg").css("display", "block")
        MainController.UI.message("Searching exact matches ")
        KGadvancedMapping.currentColumnValueDivIds = {}
        $("#KGmapping_matrixContainer").html("")
        var text = $("#Standardizer_wordsTA").val()
        if (text == "")
            return alert("Enter text to standardize")


        var words = text.split("\n")
        var entitiesMap = {};
        self.fuzzyMatchesMap = {}
        var count = 0
        var matrixHtml = ""


        //titre des colonnes
        if (self.mode == "matrix") {
            var indexes = $('#KGMappingAdvancedMappings_sourcesTree').jstree(true).get_checked();
            var matrixHtml = "<div class='matrix'>"
            //columns titles
            matrixHtml += "<div class='matrixRow'>"
            matrixHtml += "<div class='matrixRowTitle'></div>"
            indexes.forEach(function (index) {
                matrixHtml += "<div class='matrixColTitle'>" + index + "&nbsp;&nbsp;</div>"
            })
            matrixHtml += "</div>"

        }


        async.eachSeries(words, function (word, callbackEach) {


            self.fuzzyMatchesMap[word] = {entities: []}
            word = word.toLowerCase().trim()
            if ((count++) % 10 == 0)
                MainController.UI.message("Searching exact matches " + count + "/" + words.length)
            var queryObj;
            if (!mode || mode == "exactMatch") {
                queryObj = {
                    "bool": {
                        "must": [
                            {
                                "match": {
                                    "label": word,

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

            var query = {
                "query": queryObj,
                "from": 0,
                "size": 10000,
                "_source": {
                    "excludes": [
                        "attachment.content"
                    ]
                },
            }
            var indexes = $('#KGMappingAdvancedMappings_sourcesTree').jstree(true).get_checked();
            /*  var indexes=[];
              indexesArray.forEach(function(item){
                  indexes.push(item)
              })*/
            //   var indexes = ["readi", "pca", "cfihos"]

            ElasticSearchProxy.queryElastic(query, indexes, function (err, result) {
                if (err)
                    return alert(err)
                self.currentHits = result.hits.hits;
                result.hits.hits.forEach(function (hit) {

                    var entity = {
                        index: hit._index,
                        id: hit._source.subject,
                        score: hit._score,
                        label: hit._source.label,
                        status: "exactMatch"
                    }
                    var key = entity.label.toLowerCase();
                    if (key == word) {

                        if (!entitiesMap[key]) {
                            entitiesMap[key] = []
                        }

                        if (!entitiesMap[key][entity.index]) {
                            entitiesMap[key][entity.index] = ""
                        }

                        entitiesMap[key][entity.index] = entity
                    } else if (key.indexOf(word) > -1) {
                      //  entitiesMap[key][entity.index] = entity
                   //  self.fuzzyMatchesMap[key].entities.push(entity)
                    }

                })
                self.entitiesMap = entitiesMap;
                callbackEach()
            })
        }, function (err) {


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

                words.forEach(function (Word) {
                    var word=Word.toLowerCase()
                    matrixHtml +="<div class='matrixRow'>"
                    matrixHtml += "<div class='matrixRowTitle'>" + word  + "</div>"
                    indexes.forEach(function (indexName) {
                        var cellStr=""
                        var specificClassStr=""
                        if(self.entitiesMap[word]) {
                            var entity = self.entitiesMap[word][indexName]
                            if (entity) {
                                cellStr = "X"
                                specificClassStr="matrixCellExactMatch"
                            }

                        }

                            matrixHtml += "<div class='matrixCell "+specificClassStr+"' >" + cellStr + "</div>"


                    })
                    matrixHtml +="</div>"



                })


                /* self.currentHits.forEach(function (index) {


                 })*/

            }
            $("#KGmapping_matrixContainer").html(matrixHtml)
        })


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

    self.listSourceLabels = function () {
        var source = $("#Standardizer_sourcesSelect").val();
        if (!source || source == "")
            return alert("select a source");


        var queryObj = {"match_all": {}}


        var query = {
            "query": queryObj,
            "from": 0,
            "size": 100,
            "_source": {
                "excludes": [
                    "attachment.content"
                ]
            },
        }


        ElasticSearchProxy.queryElastic(query, source, function (err, result) {
            if (err)
                return alert(err)
            self.currentHits = result.hits.hits;
            var str = ""
            result.hits.hits.forEach(function (hit) {
                str += hit._source.label + "\n";

            })
            $("#Standardizer_wordsTA").val(str)
        })
    }










    return self;


})
()