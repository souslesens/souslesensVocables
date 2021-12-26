var SearchUtil = (function () {

    var self = {}


    self.getSimilarLabelsInSources = function (labels, inSources, callback) {

    }
    self.getSimilarLabelsBetweenSources = function (fromSource, toSources,mode, callback) {

        var resultSize = 1
        var size = 200;
        var from = offset;
        var offset = 0
        var totalProcessed = 0
        var searchResultArray = []
        var allWords = []

        var indexes = null;
        var toSourcesIndexesMap={}
        if (toSources) {
            indexes = []
            if (!Array.isArray(toSources))
                toSources = [toSources]
            toSources.forEach(function (source) {
                indexes.push(source.toLowerCase())
                toSourcesIndexesMap[source.toLowerCase()]=source
            })

        }

        var fromSourceClassesMap={}


        async.whilst(function (test) {
            return resultSize > 0

        }, function (callbackWhilst) {
            self.listSourcesAllLabels(fromSource.toLowerCase(), offset, size, function (err, hits) {
                if (err)
                    return callbackWhilst(err)
                resultSize = hits.length
                var words = []
                offset += size

                hits.forEach(function (hit) {
                    words.push(hit._source.label);
                    fromSourceClassesMap[hit._source.id] = {
                        source: fromSource,
                        id: hit._source.id,
                        label: hit._source.label
                    }
                })
                    self.getElasticSearchMatches(words, indexes, mode, 0, size, callback)
                    {
                        allWords = allWords.concat(words)

                    }
                )


            })
        })

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


    return self;
})()