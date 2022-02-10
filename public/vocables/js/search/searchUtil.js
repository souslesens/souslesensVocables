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
        self.getSimilarLabelsInSources = function (fromSource, toSources, labels, ids, mode, options, callback) {
            if (!options)
                options = {}
            var resultSize = 1
            var size = 200;
            var from = offset;
            var offset = 0
            var totalProcessed = 0
            var searchResultArray = []
            var allWords = []


            var indexes = null;
            var toSourcesIndexesMap = {}
            var words = []
            var allClassesArray = []
            var classesArray = []
            var parentsMap = {}
            async.whilst(function (test) {
                    return resultSize > 0

                }, function (callbackWhilst) {

                    async.series([
                            function (callbackSeries) {


                                Standardizer.initSourcesIndexesList(null, function (err, indexedSources) {
                                    if (err)
                                        return callbackSeries(err)

                                    indexes = []
                                    if (toSources && !Array.isArray(toSources))
                                        toSources = [toSources]
                                    indexedSources.forEach(function (source) {
                                        if (!toSources || toSources.length == 0 || toSources.indexOf(source) > -1) {
                                            indexes.push(source.toLowerCase())
                                            toSourcesIndexesMap[source.toLowerCase()] = source
                                        }
                                    })
                                    callbackSeries()
                                })
                            },

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
                                resultSize = 0
                                callbackSeries()
                            }
                            ,
                            function (callbackSeries) {
                                self.getElasticSearchMatches(words, indexes, mode, 0, 1000, function (err, result) {
                                    if (err)
                                        return callbackSeries(err)
                                    allWords = allWords.concat(words)


                                    result.forEach(function (item, index) {
                                        if (item.error) {
                                            classesArray[index].error = item.error;
                                            return;
                                        }
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
                                            var parentsArray = toHit._source.parents;
                                            if (Array.isArray(parentsArray) ) {//} && toHit._source.parents.split) {
                                              //.split("|")
                                                parentsArray.forEach(function (parent, indexParent) {
                                                    if (indexParent > 0 && !parentsMap[parent])
                                                        parentsMap[parent] = {}
                                                })
                                            }else{
                                                var x=3
                                            }

                                        })
                                        classesArray[index].matches = matches
                                    })
                                    allClassesArray = allClassesArray.concat(classesArray);
                                    callbackSeries()
                                })
                            }


                            //get parentsLabels
                            , function (callbackSeries) {

                                if (!options.parentlabels)
                                    return callbackSeries();

                                var ids = Object.keys(parentsMap);

                                var query = {
                                    "query":
                                        {
                                            "terms": {
                                                "id.keyword": ids,

                                            }
                                        },
                                    "from": 0,
                                    "size": 1000,
                                    "_source": {
                                        "excludes": [
                                            "attachment.content",
                                            "parents"
                                        ]
                                    }

                                }
                                ElasticSearchProxy.queryElastic(query, indexes, function (err, result) {
                                    if (err) {
                                        return callbackSeries(err)
                                    }
                                    result.hits.hits.forEach(function (hit) {
                                        parentsMap[hit._source.id] = hit._source.label
                                    })
                                    allClassesArray.parentIdsLabelsMap = parentsMap
                                    return callbackSeries()
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
                if (word.indexOf && word.indexOf("http://") == 0)
                    var field = "id.keyword"
                var queryObj;
                if (!mode || mode == "exactMatch") {
                    queryObj = {
                        "bool": {
                            "should": [
                                {
                                    "term": {
                                        [field]: word.toLowerCase(),

                                    }
                                },
                                {
                                    "term": {
                                        "skoslabels.keyword": word,

                                    }
                                }
                            ]
                        }
                    }
                } else if (word.indexOf("*") > -1) {

                    queryObj = {
                        "bool": {
                            "should": [
                                {
                                    "wildcard": {
                                        "label": {
                                            "value": word,
                                            "boost": 1.0,
                                            "rewrite": "constant_score"
                                        }
                                    }
                                },
                                {
                                    "wildcard": {
                                        "label": {
                                            "value": word,
                                            "boost": 1.0,
                                            "rewrite": "constant_score"
                                        }
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
                                        "fields": ["label", "skoslabels"],
                                        "default_operator": "AND"
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
                        ,

                    }
                }
                var str = JSON.stringify(header) + "\r\n" + JSON.stringify(query) + "\r\n";
                return str;

            }




           var  x= {
               "query": {
                   "bool": {
                       "must": [
                           {
                               "term": {
                                   "id": "/var/montageJungle/Photo/FONDS/0003_val_d'oise_70-81/002/002/",

                               }
                           },
                           {
                               "term": {
                                   "id": "0003-002-002_001.jpg",

                               }
                           },

                       ]
                   }
               }
           }





            self.entitiesMap = {}
            var bulQueryStr = ""
            var slices = common.array.slice(words, 100)
            var allResults = []
            var totalProcessed = 0
            async.eachSeries(slices, function (wordSlice, callbackEach) {
                bulQueryStr = "";
                wordSlice.forEach(function (word) {
                    if(!word)
                        return;
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


        self.indexData = function (indexName, data, replaceIndex, callback) {

            var totalLines = 0
            if (data.length == 0)
                return callback();
            //  MainController.UI.message("indexing " + data.length)
            var options = {replaceIndex: replaceIndex, owlType: "Class"}
            var payload = {
                dictionaries_indexSource: 1,
                indexName: indexName,
                data: JSON.stringify(data),
                options: JSON.stringify(options)
            }

            $.ajax({
                type: "POST",
                url: Config.serverUrl,
                data: payload,
                dataType: "json",
                success: function (data2, textStatus, jqXHR) {

                    callback(null, data)
                }
                , error: function (err) {
                    callback(err);

                }


            })

        }


        self.generateElasticIndex = function (sourceLabel, callback) {

            var withImports = $("#admin_refreshIndexWithImportCBX").prop("checked")
            var sources = [sourceLabel]
            if (withImports) {
                sources = sources.concat(Config.sources[sourceLabel].imports || []);
            }


            var totalLinesAllsources = 0
            async.eachSeries(sources, function (sourceLabel, callbackEachSource) {
                var totalLines = 0
                var options = {withoutImports: true}

                //    if (Config.sources[sourceLabel].schemaType == "OWL") {
                Sparql_generic.getSourceTaxonomy(sourceLabel, options, function (err, result) {

                    if (err) {
                        return callbackEachSource(err);
                        MainController.UI.message(err, true)
                    }
                    var index = 0
                    var classesArray = [];
                    for (var key in result.classesMap) {
                        result.classesMap[key].parents = result.classesMap[key].parents;//.split("|")
                        classesArray.push(result.classesMap[key])
                    }
                    var slices = common.array.slice(classesArray, 100)
                    async.eachSeries(slices, function (data, callbackEach) {
                            var replaceIndex = false
                            if ((index++) == 0)
                                replaceIndex = true;
                            self.indexData(sourceLabel.toLowerCase(), data, replaceIndex, function (err, result) {
                                if (err)
                                    return callbackEach(err)
                                if (!result)
                                    return callbackEach()
                                totalLines += result.length
                                totalLinesAllsources += totalLines
                                MainController.UI.message("indexed " + totalLines + " in index " + sourceLabel.toLowerCase())
                                callbackEach();
                            })
                        }
                        , function (err) {
                            MainController.UI.message("DONE " + sourceLabel + " total indexed : " + totalLinesAllsources, true)
                            return callbackEachSource(err);

                        })

                })

                // }
            }, function (err) {

                MainController.UI.message("ALL DONE  total indexed : " + totalLinesAllsources)
                if (callback)
                    return callback(err);

            })
        }

        self.addObjectsToIndex = function (sourceLabel, ids, callback) {
            var filter = " filter (?concept =<" + self.currentNodeId + ">) "
            var filter = Sparql_common.setFilter("concept", ids)
            Sparql_generic.getSourceTaxonomy(sourceLabel, {filter: filter}, function (err, result) {
                var classesArray = []
                for (var key in result.classesMap) {
                    classesArray.push(result.classesMap[key])
                }
                var slices = common.array.slice(classesArray, 100)
                async.eachSeries(slices, function (data, callbackEach) {
                    var replaceIndex = false

                    self.indexData(sourceLabel.toLowerCase(), data, replaceIndex, function (err, result) {
                        if (err)
                            return callbackEach(err)
                        callbackEach()

                    })
                }, function (err) {
                    return callback(err, "DONE")
                })
            })
        }


        self.getParentAllDescendants = function (parentId, indexes, options, callback) {
            var allData = []
            var allLabelsMap = {}

            async.series([
                function (callbackSeries) {
                    var queryObj = {
                        "term": {
                            "parents.keyword": parentId
                        }
                    };

                    var size = 200;
                    var from = 0
                    var resultSize = 1;

                    async.whilst(function (test) {
                            return resultSize > 0
                        },

                        function (callbackWhilst) {
                            var query = {
                                "query": queryObj,
                                "from": from,
                                "size": size,
                                "_source": {
                                    "excludes": [
                                        "attachment.content"
                                    ]
                                    ,

                                }
                            }
                            ElasticSearchProxy.queryElastic(query, indexes, function (err, result) {
                                if (err)
                                    return callback(err);
                                var hits = result.hits.hits;
                                resultSize = hits.length
                                from += size
                                hits.forEach(function (hit) {
                                    var data = hit._source;
                                    data.index = hit._index;
                                    allData.push(data)
                                })
                                callbackWhilst()

                            })
                        }, function (err) {
                            return callbackSeries(err);
                        })
                }, function (callbackSeries) {
                    var resultSize = 1;
                    var allData = [];
                    var offset = 0;
                    var size = 500;
                    async.whilst(
                        function (test) {
                            return resultSize > 0
                        },

                        function (callbackWhilst) {

                            self.listSourcesAllLabels(indexes[0], offset, size, function (err, hits) {
                                if (err)
                                    return callbackWhilst(err);
                             //
                                resultSize = hits.length
                                offset += size
                                hits.forEach(function (hit) {
                                    allLabelsMap[hit._source.id] = hit._source.label

                                })
                                callbackWhilst()


                            })

                        }, function (err) {
                                return callbackSeries(err)

                        })
                }
            ], function (err) {
                return callback(err, {data: allData, labelsMap: allLabelsMap});
            })

        }


        return self;
    }
)
()