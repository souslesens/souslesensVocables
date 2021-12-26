var SearchUtil = (function () {

    var self = {}



    /**
     *
     *
     * @param fromSource if null ids or labels are mandatory
     * @param toSources if null search in all sources
     * @param labels an array  or labels
     * @param ids an array of uris
     * @param mode exactMatch or fuzzymatch
     * @param callback array of source objects containing each target sources object matches
     */
    self.getSimilarLabelsBetweenSources = function (fromSource, toSources, labels, ids, mode, callback) {

        var resultSize = 1
        var size = 200;
        var from = offset;
        var offset = 0
        var totalProcessed = 0
        var searchResultArray = []
        var allWords = []

        var indexes = null;
        var toSourcesIndexesMap = {}
        if (toSources) {
            indexes = []
            if (!Array.isArray(toSources))
                toSources = [toSources]
            toSources.forEach(function (source) {
                indexes.push(source.toLowerCase())
                toSourcesIndexesMap[source.toLowerCase()] = source
            })

        }

        var words = []
        var allClassesArray = []
        var classesArray = []
        async.whilst(function (test) {
                return resultSize > 0

            }, function (callbackWhilst) {

                async.series([
                        function (callbackSeries) {
                            if (!fromSource) {
                                return callbackSeries()
                            }

                            self.listSourcesAllLabels(fromSource.toLowerCase(), offset, size, function (err, hits) {
                                if (err)
                                    return callbackWhilst(err)
                                resultSize = hits.length
                                words = []
                                classesArray = []
                                offset += size

                                hits.forEach(function (hit) {
                                    if (ids && ids.indexOf(hit._source.id) < 0)
                                        return;
                                    if (labels && labels.indexOf(hit._source.label) < 0)
                                        return;
                                    words.push(hit._source.label);
                                    classesArray.push({
                                        source: fromSource,
                                        id: hit._source.id,
                                        label: hit._source.label,
                                        matches: {},
                                        parents: hit._source.parents
                                    })
                                })
                                callbackSeries()
                            })
                        },
                        function (callbackSeries) {
                            if (fromSource)
                                return callbackSeries
                            if (ids) {
                                words = ids;
                            } else if (labels)
                                words = labels;
                            else
                                return callbackSeries("too many null  parameters")

                            words.forEach(function (word) {
                                classesArray.push({
                                    id: word,
                                    label: word,
                                    matches: {},
                                })
                            })
                            resultSize=0
                            callbackSeries()
                        }
                        ,
                        function (callbackSeries) {
                            self.getElasticSearchMatches(words, indexes, mode, 0, words.length, function (err, result) {
                                if (err)
                                    return callbackSeries(err)
                                allWords = allWords.concat(words)

                                result.forEach(function (item, index) {
                                    var hits = item.hits.hits;
                                    var matches = {}
                                    hits.forEach(function (toHit) {
                                        var source = toSourcesIndexesMap[toHit._index]
                                        if (!matches[source])
                                            matches[source] = []
                                        matches[source].push({
                                            source: source,
                                            id: toHit._source.id,
                                            label: toHit._source.label,
                                            parents: toHit._source.parents
                                        })
                                    })
                                    classesArray[index].matches = matches
                                })
                                allClassesArray = allClassesArray.concat(classesArray);
                                callbackSeries()
                            })
                        }

                    ],

                    function (err) {
                        return callbackWhilst(err)
                    }
                )
            }
            ,

            function (err) {
                callback(err, allClassesArray)
            }
        )

    }


    self.listSourcesAllLabels = function (index, offset, size, callback) {
        if (!offset)
            offset = 0
        if (!size)
            size = 1000

        var queryObj = {"match_all": {}}
        var query = {
            "query": queryObj,
            "from": offset,
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

        ElasticSearchProxy.queryElastic(query, index, function (err, result) {
            if (err) {
                return callback(err)
            }
            return callback(null, result.hits ? result.hits.hits : [])
        })
    }


    self.getElasticSearchMatches = function (words, indexes, mode, from, size, callback) {

        $("#waitImg").css("display", "block")
        //   MainController.UI.message("Searching exact matches ")

        var entitiesMap = {};
        var count = 0

        self.getWordBulkQuery = function (word, mode, indexes) {
            var field = "label.keyword"
            if (word.indexOf("http://") == 0)
                var field = "id.keyword"
            var queryObj;
            if (!mode || mode == "exactMatch") {
                queryObj = {
                    "bool": {
                        "must": [
                            {
                                "term": {
                                    [field]: word.toLowerCase(),

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


    return self;
})
()