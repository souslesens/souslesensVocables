import Admin from "../tools/admin/admin.js";
import ElasticSearchProxy from "./elasticSearchProxy.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";
import Sparql_generic from "../sparqlProxies/sparql_generic.js";
import Sparql_OWL from "../sparqlProxies/sparql_OWL.js";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
var SearchUtil = (function () {
    var self = {};
    self.existingIndexes = null;
    self.indexSourcesMap = {};

    self.initSourcesIndexesList = function (options, callback) {
        if (!options) {
            options = {};
        }
        var payload = {
            dictionaries_listIndexes: 1,
        };
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/elasticsearch/indices",
            data: payload,
            dataType: "json",
            success: function (indexes, _textStatus, _jqXHR) {
                var sources = [];

                Admin.showUserSources(function (userSources) {
                    userSources.forEach(function (source) {
                        if (options.schemaType && Config.sources[source].schemaType != options.schemaType) {
                            // pass
                        } else {
                            indexes.forEach(function (indexName) {
                                if (indexName == source.toLowerCase()) {
                                    sources.push(source);
                                    self.indexSourcesMap[indexName] = source;
                                }
                            });
                        }
                    });
                });

                return callback(null, sources);
            },
            error: function (err) {
                return callback(err);
            },
        });
    };

    /**
     * @param fromSource if null ids or labels are mandatory
     * @param toSources if null search in all sources
     * @param labels an array  or labels
     * @param ids an array of uris
     * @param mode exactMatch or fuzzymatch
     * @param callback array of source objects containing each target sources object matches
     */
    self.getSimilarLabelsInSources = function (fromSource, toSources, labels, ids, mode, options, callback) {
        if (!options) {
            options = {};
        }
        var resultSize = 1;
        var size = 200;
        var offset = 0;
        var allWords = [];

        var indexes = null;
        var toSourcesIndexesMap = {};
        var words = [];
        var allClassesArray = [];
        var classesArray = [];
        var parentsMap = {};
        async.whilst(
            function (_test) {
                return resultSize > 0;
            },
            function (callbackWhilst) {
                async.series(
                    [
                        function (callbackSeries) {
                            SearchUtil.initSourcesIndexesList(null, function (err, indexedSources) {
                                if (err) {
                                    return callbackSeries(err);
                                }

                                indexes = [];
                                /*  if (toSources) {
toSources.forEach(function (source) {
indexes.push(source.toLowerCase());
});
}*/
                                indexedSources.forEach(function (source) {
                                    if (!toSources || toSources.length == 0 || toSources.indexOf(source) > -1) {
                                        indexes.push(source.toLowerCase());
                                        toSourcesIndexesMap[source.toLowerCase()] = source;
                                    }
                                });
                                if (toSources && toSources.length > 0 && Object.keys(toSourcesIndexesMap).length == 0) {
                                    return callbackSeries(toSources.toString() + "Not in search index, see admin");
                                }
                                callbackSeries();
                            });
                        },

                        function (callbackSeries) {
                            if (!fromSource) {
                                return callbackSeries();
                            }

                            self.getSourceLabels(fromSource.toLowerCase(), null, offset, size, function (err, hits) {
                                if (err) {
                                    return callbackWhilst(err);
                                }
                                resultSize = hits.length;
                                words = [];
                                classesArray = [];
                                offset += size;

                                hits.forEach(function (hit) {
                                    if (ids && ids.indexOf(hit._source.id) < 0) {
                                        return;
                                    }
                                    if (labels && labels.indexOf(hit._source.label) < 0) {
                                        return;
                                    }
                                    words.push(hit._source.label);
                                    classesArray.push({
                                        source: fromSource,
                                        id: hit._source.id,
                                        label: hit._source.label,
                                        matches: {},
                                        parents: hit._source.parents,
                                    });
                                });
                                callbackSeries();
                            });
                        },
                        function (callbackSeries) {
                            if (fromSource) {
                                return callbackSeries();
                            }
                            if (ids) {
                                words = ids;
                            } else if (labels) {
                                words = labels;
                            } else {
                                return callbackSeries("too many null  parameters");
                            }

                            words.forEach(function (word) {
                                classesArray.push({
                                    id: word,
                                    label: word,
                                    matches: {},
                                });
                            });
                            resultSize = 0;
                            callbackSeries();
                        },
                        function (callbackSeries) {
                            self.getElasticSearchMatches(words, indexes, mode, 0, 1000, options, function (err, result) {
                                if (err) {
                                    return callbackSeries(err);
                                }
                                allWords = allWords.concat(words);

                                result.forEach(function (item, index) {
                                    if (item.error) {
                                        classesArray[index].error = item.error;
                                        return;
                                    }
                                    var hits = item.hits.hits;
                                    var matches = {};
                                    hits.forEach(function (toHit) {
                                        var source = toSourcesIndexesMap[toHit._index];
                                        if (!matches[source]) {
                                            matches[source] = [];
                                        }
                                        if (!options.type || toHit._source.type.indexOf(options.type) > -1) {
                                            matches[source].push({
                                                source: source,
                                                id: toHit._source.id,
                                                label: toHit._source.label,
                                                parents: toHit._source.parents,
                                                type: toHit._source.type,
                                            });
                                        }
                                        var parentsArray = toHit._source.parents;
                                        if (Array.isArray(parentsArray)) {
                                            //} && toHit._source.parents.split) {
                                            //.split("|")
                                            parentsArray.forEach(function (parent, indexParent) {
                                                if (indexParent > 0 && !parentsMap[parent]) {
                                                    parentsMap[parent] = {};
                                                }
                                            });
                                        } else {
                                            // Pass
                                        }
                                    });
                                    classesArray[index].matches = matches;
                                });
                                allClassesArray = allClassesArray.concat(classesArray);
                                callbackSeries();
                            });
                        },

                        //get parentsLabels
                        function (callbackSeries) {
                            if (!options.parentlabels) {
                                return callbackSeries();
                            }

                            var ids = Object.keys(parentsMap);

                            var query = {
                                query: {
                                    terms: {
                                        "id.keyword": ids,
                                    },
                                },
                                from: 0,
                                size: 1000,
                                _source: {
                                    excludes: ["attachment.content", "parents"],
                                },
                            };

                            const payload = {
                                method: "POST",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify({ indices: indexes, uris: ids }),
                            };

                            fetch(`${Config.apiUrl}/elasticsearch/search`, payload)
                                .then((result) => {
                                    result
                                        .json()
                                        .then((json) => {
                                            const hits = json.hits;
                                            hits.forEach(function (hit) {
                                                parentsMap[hit._source.id] = hit._source.label;
                                            });
                                            allClassesArray.parentIdsLabelsMap = parentsMap;
                                            return callbackSeries();
                                        })
                                        .catch((e) => {
                                            console.log(e);
                                            callbackSeries(e);
                                        });
                                })
                                .catch((e) => callbackSeries(e));
                        },
                    ],

                    function (err) {
                        return callbackWhilst(err);
                    },
                );
            },
            function (err) {
                callback(err, allClassesArray);
            },
        );
    };

    /**
     * @param {string} index - Name of the ElasticSearch index to search
     */
    self.getSourceLabels = function (index, _ids, offset, size, callback) {
        if (!offset) {
            offset = 0;
        }
        if (!size) {
            size = 10000;
        }

        var indexes = null;
        if (index) {
            indexes = index;
        } else {
            indexes = "*";
        }

        if (_ids) {
            var slices = common.array.slice(_ids, 100);
            var allHits = [];
            async.eachSeries(
                slices,
                function (ids, callbackEach) {
                    var str = "";
                    var header = { index: indexes };

                    ids.forEach(function (id) {
                        var query = {
                            query: {
                                term: {
                                    "id.keyword": id,
                                },
                            },
                            _source: "label",
                        };
                        str += JSON.stringify(header) + "\r\n" + JSON.stringify(query) + "\r\n";
                    });
                    UI.message("getting labels " + allHits.length + " ...");
                    ElasticSearchProxy.executeMsearch(str, [indexes], function (err, result) {
                        if (err) {
                            return callbackEach(err);
                        }
                        var hits = [];
                        result.forEach(function (item) {
                            if (item.hits.hits.length > 0) {
                                hits.push(item.hits.hits[0]);
                            }
                        });
                        allHits = allHits.concat(hits);
                        return callbackEach();
                    });
                },
                function (err) {
                    return callback(null, allHits);
                },
            );
        } else {
            var queryObj = { match_all: {} };

            var query = {
                query: queryObj,
                from: offset,
                size: size,
                _source: {
                    excludes: ["attachment.content"],
                },
                sort: {
                    "label.keyword": { order: "asc" },
                },
            };

            ElasticSearchProxy.queryElastic(query, [index], function (err, result) {
                if (err) {
                    return callback(err);
                }
                return callback(null, result.hits ? result.hits.hits : []);
            });
        }
    };

    self.escapeElasticReservedChars = function (word) {
        var chars = ["+", "-", "=", "&&", "||", ">", "<", "!", "(", ")", "{", "}", "[", "]", "^", '"', "~", "?", ":", "/"];
        var p = word.indexOf("*");
        var word2 = word.replace("*", "");

        chars.forEach(function (char) {
            if (word.indexOf(char) > -1) {
                p = -1;
            }
            word2 = word2.replaceAll(char, "\\\\" + char);
        });
        if (p > -1) {
            word2 += "*";
        }
        return word2;
    };

    self.getWordBulkQuery = function (word, mode, indexes, options) {
        word = self.escapeElasticReservedChars(word);
        var field = "label.keyword";
        if (word.indexOf && word.indexOf("http://") == 0) {
            field = "id.keyword";
        }
        //  word=word.toLowerCase()
        var queryObj;
        if (!mode || mode == "exactMatch") {
            queryObj = {
                bool: {
                    must: [
                        {
                            //  match: {
                            term: {
                                [field]: word,
                            },
                        },
                    ],
                },
            };
        } else if (word == "*") {
            /*
            queryObj = {
                match_all: {},
            };*/
            queryObj = {
                bool: {
                    must: {
                        match_all: {},
                    },
                },
            };
        } else if (word.indexOf("*") > -1) {
            queryObj = {
                bool: {
                    must: {
                        query_string: {
                            query: word,
                            fields: ["label"],
                        },
                    },
                },
            };
            if (options.skosLabels) {
                queryObj.bool.must.query_string.fields.push("skoslabels");
            }
        } else {
            queryObj = {
                bool: {
                    must: [
                        {
                            query_string: {
                                query: word,
                                fields: ["label", "skoslabels"],
                                default_operator: "AND",
                            },
                        },
                    ],
                },
            };
            if (options.skosLabels) {
                queryObj.bool.must[0].query_string.fields.push("skoslabels");
            }
        }
        if (options.onlyClasses) {
            queryObj.bool.filter = {
                term: {
                    "type.keyword": "Class",
                },
            };
        }
        if (options.classFilter) {
            queryObj.bool.filter = {
                multi_match: {
                    query: options.classFilter,
                    fields: ["parents.keyword", "parent.keyword", "id.keyword"],
                    operator: "or",
                },
            };
        }

        return queryObj;
    };

    self.getElasticSearchMatches = function (words, indexes, mode, from, size, options, callback) {
        $("#waitImg").css("display", "block");
        //   UI.message("Searching exact matches ")

        self.entitiesMap = {};
        var bulQueryStr = "";
        var slices = common.array.slice(words, 100);
        var allResults = [];
        async.eachSeries(
            slices,
            function (wordSlice, callbackEach) {
                if (wordSlice.length == 0) {
                    return callbackEach();
                }
                bulQueryStr = "";
                wordSlice.forEach(function (word) {
                    if (!word) {
                        return;
                    }
                    var queryObj = self.getWordBulkQuery(word, mode, indexes, options);
                    var header = {};
                    if (indexes) {
                        header = { index: indexes };
                    }

                    var query = {
                        query: queryObj,
                        from: from,
                        size: size,
                        _source: {
                            excludes: ["attachment.content"],
                        },
                    };
                    var wordQuery = JSON.stringify(header) + "\r\n" + JSON.stringify(query) + "\r\n";
                    bulQueryStr += wordQuery;
                });
                ElasticSearchProxy.executeMsearch(bulQueryStr, indexes, function (err, result) {
                    if (err) {
                        return callbackEach(err);
                    }

                    from += size;

                    allResults = allResults.concat(result);
                    callbackEach();
                });
            },
            function (err) {
                callback(err, allResults);
            },
        );
    };

    self.indexData = function (indexName, data, replaceIndex, callback) {
        if (data.length == 0) {
            return callback();
        }
        var options = { replaceIndex: replaceIndex, owltype: "Class" };
        var payload = {
            indexName: indexName,
            data: data,
            options: options,
        };

        $.ajax({
            type: "POST",
            url: Config.apiUrl + "/elasticsearch/indexsource",
            data: JSON.stringify(payload),
            contentType: "application/json",
            dataType: "json",
            success: function (_data2, _textStatus, _jqXHR) {
                callback(null, data);
            },
            error: function (err) {
                callback(err);
            },
        });
    };

    self.generateElasticIndex = function (sourceLabel, options, callback) {
        if (!options) {
            options = {};
        }

        var withImports = $("#admin_refreshIndexWithImportCBX").prop("checked");
        options.withoutImports = true;
        options.parentsTopDown = true;
        var sources = [sourceLabel];
        if (withImports) {
            sources = sources.concat(Config.sources[sourceLabel].imports || []);
        }

        var totalLinesAllsources = 0;
        async.eachSeries(
            sources,
            function (sourceLabel, callbackEachSource) {
                var totalLines = 0;
                var taxonomyClasses = [];
                async.series(
                    [
                        // index nodes hierarchy
                        function (callbackSeries) {
                            Sparql_generic.getSourceTaxonomy(sourceLabel, options, function (err, result) {
                                if (err) {
                                    return callbackEachSource(err);
                                }
                                var index = 0;
                                var classesArray = [];
                                for (var key in result.classesMap) {
                                    classesArray.push(result.classesMap[key]);
                                }
                                var slices = common.array.slice(classesArray, 50);
                                taxonomyClasses = classesArray;
                                async.eachSeries(
                                    slices,
                                    function (data, callbackEach) {
                                        var replaceIndex = false;
                                        if (index++ == 0 && !options.ids) {
                                            replaceIndex = true;
                                        }
                                        data.forEach(function (item) {
                                            item.type = "Class";
                                        });
                                        self.indexData(sourceLabel.toLowerCase(), data, replaceIndex, function (err, result) {
                                            if (err) {
                                                return callbackEach(err);
                                            }
                                            if (!result) {
                                                return callbackEach();
                                            }
                                            totalLines += result.length;
                                            totalLinesAllsources += totalLines;
                                            UI.message("indexed " + totalLines + "/" + classesArray.length + " in index " + sourceLabel.toLowerCase());

                                            callbackEach();
                                        });
                                    },
                                    function (err) {
                                        // UI.message("DONE " + sourceLabel + " total indexed : " + totalLinesAllsources, true);
                                        return callbackSeries(err);
                                    },
                                );
                            });
                        },

                        // indexNamedIndividuals
                        function (callbackSeries) {
                            var taxonomyClassesIdsMap = {};
                            taxonomyClasses.forEach(function (item) {
                                taxonomyClassesIdsMap[item.id] = item;
                            });

                            var totalLines = 0;
                            UI.message("indexing namedIndividuals");

                            var processor = function (data, callbackProcessor) {
                                var individualsToIndex = [];
                                data.forEach(function (item) {
                                    var parent;
                                    var parents;

                                    if (taxonomyClassesIdsMap[item.type.value]) {
                                        parent = item.type.value;
                                        parents = taxonomyClassesIdsMap[item.type.value].parents.concat(item.type.value);
                                    } else {
                                        parent = item.type.value;
                                        parents = [sourceLabel, item.type.value];
                                    }

                                    var skosLabel = item.skosPrefLabel ? item.skosPrefLabel.value : null;
                                    individualsToIndex.push({
                                        id: item.id.value,
                                        label: item.label ? item.label.value : Sparql_common.getLabelFromURI(item.id.value),
                                        skoslabels: [skosLabel],
                                        parent: parent,
                                        parents: parents,
                                        type: "NamedIndividual",
                                        //  type: item.type2.value,
                                    });
                                });

                                self.indexData(sourceLabel.toLowerCase(), individualsToIndex, false, function (err, result) {
                                    if (err) {
                                        return callbackEach(err);
                                    }
                                    if (!result) {
                                        return callbackSeries();
                                    }

                                    totalLines += result.length;
                                    totalLinesAllsources += totalLines;

                                    UI.message("indexed " + totalLines + " namedIndividuals in index " + sourceLabel.toLowerCase());

                                    callbackProcessor(err);
                                });
                            };

                            //var filter = "?id rdf:type ?type2. filter (?type= owl:NamedIndividual && ?type2!=?type)";
                            //Filter on individuals = entities that are  type of a class
                            var filter = "?id rdf:type ?type.?type rdf:type owl:Class";
                            //  filter+="?id <http://souslesens.org/KGcreator#mappingFile> 'dbo.V_jobcard'"
                            Sparql_OWL.getDictionary(sourceLabel, { filter: filter, processorFectchSize: 100, skosPrefLabel: true }, processor, function (err, result) {
                                if (err) console.log(err.responseText);
                                return callbackSeries(err);
                            });
                        },
                        // index properties
                        function (callbackSeries) {
                            if (!options.indexProperties) {
                                return callbackSeries();
                            }
                            UI.message("indexing properties");
                            totalLines = 0;
                            Sparql_OWL.getObjectProperties(sourceLabel, {}, function (err, result) {
                                if (err) {
                                    return callback(err);
                                }
                                var allData = [];
                                result.forEach(function (item) {
                                    allData.push({
                                        id: item.property.value,
                                        label: item.propertyLabel.value,
                                        // type: "property",
                                        type: "ObjectProperty",
                                    });
                                });

                                var slices = common.array.slice(allData, 50);
                                async.eachSeries(
                                    slices,
                                    function (data, callbackEach) {
                                        self.indexData(sourceLabel.toLowerCase(), data, false, function (err, result) {
                                            if (err) {
                                                return callbackEach(err);
                                            }
                                            if (!result) {
                                                return callbackSeries();
                                            }
                                            totalLines += result.length;
                                            totalLinesAllsources += totalLines;
                                            UI.message("indexed " + totalLines + " objectProperties in index " + sourceLabel.toLowerCase());
                                            callbackEach();
                                        });
                                    },
                                    function (err) {
                                        return callbackSeries(err);
                                    },
                                );
                            });
                        },

                        // containers --> like classes --> care to refresh
                    ],
                    function (err) {
                        // UI.message("indexed " + totalLines + " in index " + sourceLabel.toLowerCase());

                        return callbackEachSource(err);
                    },
                );

                // }
            },
            function (err) {
                if (err) {
                    alert(err.responseText);
                } else {
                    UI.message("ALL DONE  total indexed : " + totalLinesAllsources);
                }
                if (callback) {
                    return callback(err);
                }
            },
        );
    };

    self.addPropertiesToIndex = function (sourceLabel, data, callback) {
        if (!Array.isArray(data)) {
            data = [data];
        }

        self.indexData(sourceLabel.toLowerCase(), data, false, function (err, _result) {
            if (err) {
                return callback(err);
            }
            callback();
        });
    };

    self.addObjectsToIndex = function (sourceLabel, ids, callback) {
        var filter = " filter (?subject =<" + self.currentNodeId + ">) ";
        filter = Sparql_common.setFilter("subject", ids);
        Sparql_generic.getSourceTaxonomy(sourceLabel, { filter: filter, withoutImports: true, parentsTopDown: true }, function (err, result) {
            var classesArray = [];
            for (var key in result.classesMap) {
                classesArray.push(result.classesMap[key]);
            }
            var slices = common.array.slice(classesArray, 100);
            async.eachSeries(
                slices,
                function (data, callbackEach) {
                    var replaceIndex = false;

                    self.indexData(sourceLabel.toLowerCase(), data, replaceIndex, function (err, _result) {
                        if (err) {
                            return callbackEach(err);
                        }
                        callbackEach();
                    });
                },
                function (err) {
                    return callback(err, "DONE");
                },
            );
        });
    };

    /**
     * @param {Array<string>} indexes - List of ElasticSearch indexes to search
     */
    self.getParentAllDescendants = function (parentId, indexes, options, callback) {
        var allData = [];
        var allLabelsMap = {};

        async.series(
            [
                function (callbackSeries) {
                    var queryObj = {
                        term: {
                            "parents.keyword": parentId,
                        },
                    };

                    var size = 200;
                    var from = 0;
                    var resultSize = 1;

                    async.whilst(
                        function (_test) {
                            return resultSize > 0;
                        },

                        function (callbackWhilst) {
                            var query = {
                                query: queryObj,
                                from: from,
                                size: size,
                                _source: {
                                    excludes: ["attachment.content"],
                                },
                            };
                            ElasticSearchProxy.queryElastic(query, indexes, function (err, result) {
                                if (err) {
                                    return callback(err);
                                }
                                var hits = result.hits.hits;
                                resultSize = hits.length;
                                from += size;
                                hits.forEach(function (hit) {
                                    var data = hit._source;
                                    data.index = hit._index;
                                    allData.push(data);
                                });
                                callbackWhilst();
                            });
                        },
                        function (err) {
                            return callbackSeries(err);
                        },
                    );
                },
                function (callbackSeries) {
                    var resultSize = 1;
                    var offset = 0;
                    var size = 500;
                    async.whilst(
                        function (_test) {
                            return resultSize > 0;
                        },

                        function (callbackWhilst) {
                            self.getSourceLabels(indexes[0], null, offset, size, function (err, hits) {
                                if (err) {
                                    return callbackWhilst(err);
                                }
                                //
                                resultSize = hits.length;
                                offset += size;
                                hits.forEach(function (hit) {
                                    allLabelsMap[hit._source.id] = hit._source.label;
                                });
                                callbackWhilst();
                            });
                        },
                        function (err) {
                            return callbackSeries(err);
                        },
                    );
                },
            ],
            function (err) {
                return callback(err, { data: allData, labelsMap: allLabelsMap });
            },
        );
    };

    self.getSourceLabelFromIndexName = function (index) {
        for (var source in Config.sources) {
            if (source.toLowerCase() == index) {
                return source;
            }
        }
        return null;
    };

    self.getExistingIndexes = function (indices, callback) {
        function filterIndices() {
            if (!indices) {
                return self.existingIndexes;
            }
            var indices2 = [];
            indices.forEach(function (index) {
                if (self.existingIndexes.indexOf(index) > -1) {
                    indices2.push(index);
                }
            });
            return indices2;
        }

        if (self.existingIndexes) {
            var filteredIndices = filterIndices(indices);
            return filteredIndices;
        } else {
            $.ajax({
                type: "GET",
                url: Config.apiUrl + "/elasticsearch/indices",
                dataType: "json",

                success: function (data, _textStatus, _jqXHR) {
                    self.existingIndexes = data;
                    var filteredIndices = filterIndices(indices);
                    callback(null, filteredIndices);
                },
                error(err) {
                    return callback(err.responseText);
                },
            });
        }
    };

    return self;
})();

export default SearchUtil;

window.SearchUtil = SearchUtil;
window.SearchUtil = SearchUtil;
