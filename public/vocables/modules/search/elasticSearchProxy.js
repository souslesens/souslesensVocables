// eslint-disable-next-line @typescript-eslint/no-unused-vars

var ElasticSearchProxy = (function () {
    var self = {};

    /**
     * @param {Object} query - An ElasticSearch query object
     * @param {Array<string> | null} indexes - List of names of the indexes to search (search all indexes if null)
     * @param {Function} callback - Function that will process the result
     */
    self.queryElastic = function (query, indexes, callback) {
        var payload = {
            query: query,
            url: "_search",
            indexes: indexes,
        };

        $.ajax({
            type: "POST",
            url: Config.apiUrl + "/elasticsearch/query",
            data: JSON.stringify(payload),
            contentType: "application/json",
            dataType: "json",
            success: function (data, _textStatus, _jqXHR) {
                callback(null, data);
            },
            error: function (err) {
                console.error("ElasticSearchProxy.queryElastic", err.responseText);
                if (callback) {
                    return callback(err);
                }
                return err;
            },
        });
    };

    self.executeMsearch = function (ndjson, indexes, callback) {
        var payload = {
            ndjson: ndjson,
            indexes: indexes,
        };

        $.ajax({
            type: "POST",
            url: Config.apiUrl + "/elasticsearch/msearch",
            data: payload,
            dataType: "json",
            success: function (data, _textStatus, _jqXHR) {
                callback(null, data);
            },
            error: function (err) {
                // eslint-disable-next-line no-console
                console.log(err.responseText);
                if (callback) {
                    return callback(err);
                }
                return err;
            },
        });
    };
    self.deleteDocuments = function (sourceLabel, ids, options, callback) {
        var payload = {
            query: {
                query: {
                    terms: {
                        ["id.keyword"]: ids,
                    },
                },
            },
            url: "_delete_by_query",
            indexes: [sourceLabel.toLowerCase()],
        };
        $.ajax({
            type: "POST",
            url: Config.apiUrl + "/elasticsearch/query",
            data: JSON.stringify(payload),
            contentType: "application/json",
            dataType: "json",
            success: function (data, _textStatus, _jqXHR) {
                callback(null, data);
            },
            error: function (err) {
                console.error("ElasticSearchProxy.queryElastic", err.responseText);
                if (callback) {
                    return callback(err);
                }
                return err;
            },
        });
    };

    self.searchPlainText = function (options, callback) {
        if (!options) options = {};
        var question = options.question || $("#questionInput").val();

        //gestion de la pagination
        {
            var size = options.size || context.elasticQuery.size;
            var from = options.from || (options.page ? size * options.page : null) || context.elasticQuery.from;
            if (options.page) context.currentPage = options.page < 0 ? 0 : options.page;
            else context.currentPage = 0;
        }
        $("#entitiesWrapperDiv").css("visibility", "hidden");
        $("#thumbnailsDiv").css("display", "none");

        $("#resultDiv").html("");
        $(".indexDocCount").html("");
        $("#paginationDiv").html("");
        $("#associatedWordsDiv").html("");

        if (!question || question.length < 3) return $("#resultDiv").html("entrer une question (au moins 3 lettres)");

        if (context.curentSearchIndexes.length == 0) return $("#resultDiv").html("selectionner au moins une source");

        self.analyzeQuestion(question, function (err, query) {
            $("#queryTA").val(JSON.stringify(query, null, 2));

            var must = [query];
            if (options.mustQueries) must = must.concat(options.mustQueries);
            else context.filteredEntities = {};

            query = { bool: { must: must } };

            var aggregations = {
                associatedWords: {
                    significant_terms: {
                        size: 30,
                        field: appConfig.contentField,
                    },
                },

                indexesCountDocs: {
                    terms: { field: "_index" },
                },
            };
            Entities.setUserIndexesThesauri();
            for (var thesaurus in context.allowedThesauri) {
                aggregations["entities_" + thesaurus] = {
                    terms: {
                        field: "entities_" + thesaurus + ".id",
                        size: 50,
                        order: { _count: "desc" },
                    },
                };
            }

            ElasticSearchProxy.queryElastic(
                {
                    query: query,
                    from: from,
                    size: size,
                    _source: context.elasticQuery.source,
                    highlight: context.elasticQuery.highlight,
                    //   aggregations: aggregations
                },

                null,
                function (err, result) {
                    if (err) {
                        $("#resultDiv").html(err);
                        if (callback) return callback(err);
                        return;
                    }
                    if (result.hits.hits.length == 0) {
                        return $("#resultDiv").html("pas de résultats");
                        if (callback) return callback("pas de résultats");
                        return;
                    }

                    //    Entities.showAssociatedWords(result.aggregations.associatedWords)

                    //     self.setResultsCountByIndex(result.aggregations.indexesCountDocs);

                    self.thesauri = {};
                    var jsTreeArray = [];
                    for (var thesaurus in context.allowedThesauri) {
                        var thesaurusJsTreeArray = Entities.showThesaurusEntities(thesaurus, result.aggregations["entities_" + thesaurus]);
                        jsTreeArray = jsTreeArray.concat(thesaurusJsTreeArray);
                    }
                    $("#entitiesWrapperDiv").css("visibility", "visible");
                    Entities.drawJsTree("jstreeDiv", jsTreeArray);

                    context.currentHits = result.hits.hits;
                    if ($("#indexesCbxes_all").prop("checked")) $("#indexDocCount_all").html("(" + result.hits.total + ")");
                    else $("#indexDocCount_all").html("");
                    mainController.showPageControls(result.hits.total);

                    $("#thumbnailsDiv").css("display", "flex");
                    //   indexes. self.uncheckAllIndexes()
                    if (callback) callback();
                    return ui.showResultList(result.hits.hits);
                },
            );
        });
    };

    self.setResultsCountByIndex = function (aggregation) {
        aggregation.buckets.forEach(function (bucket) {
            $("#indexDocCount_" + bucket.key).html("(" + bucket.doc_count + " docs)");
        });
    };

    self.searchHitDetails = function (hitId) {
        // on ajoute la question + l'id pour avoir les highlight
        self.analyzeQuestion(context.question, function (err, query) {
            if (!query.bool) query = { bool: { must: [] } };
            //   query={bool:{must:[query]}};

            query.bool.must.push({
                term: {
                    _id: hitId,
                },
            });

            Search.queryElastic(
                {
                    query: query,
                    // _source: context.elasticQuery.source,
                    highlight: {
                        tags_schema: "styled",
                        fragment_size: 0,
                        number_of_fragments: 0,
                        fields: { [appConfig.contentField]: {} },
                    },
                },
                null,

                function (err, result) {
                    if (err) {
                        return $("#resultDiv").html(err);
                    }
                    if (result.hits.hits.length == 0) return $("#resultDiv").html("pas de résultats");

                    return ui.showHitDetails(result.hits.hits[0]);
                },
            );
        });
    };
    self.analyzeQuestion = function (question, options, callback) {
        if (!options) options = {};

        var query = {
            query_string: {
                query: question,
                default_field: "attachment.content",
                default_operator: options.operator || "AND",
            },
        };
        //prosess phrases
        if (question.indexOf('"') > -1) {
            var p = question.lastIndexOf('"');
            var suffix = question.substring(p + 1);
            var array = suffix.split(" ");
            var slop = array[0];

            if (slop) {
                question = question.substring(0, p + 1);
                query.query_string.phrase_slop = slop;
            }
            if (array.length > 1) {
                for (var i = 1; i < array.length; i++) {
                    question += " " + array[i];
                }
            }
            //process not phrases
        }
        /* if (true) {



               var str = question.replace(/(\w*\*?)\/(\w*\*?)/g, function (matched, $1, $2) {

                    return  $1 + " OR " + $2 ;
                });
                question="("+str+ ")"

            }*/

        query.query_string.query = question;

        return callback(null, query);
    };

    return self;
})();

export default ElasticSearchProxy;

window.ElasticSearchProxy = ElasticSearchProxy;