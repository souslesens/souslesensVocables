var Lineage_dictionary = (function () {
    var self = {};
    self.currentDomainSource = null;
    self.domainAndRangeSourcesmap = {};
    self.dataTablesHiddenColumns = [];
    self.showTSFdictionaryDialog = function (context) {
        $("#mainDialogDiv").dialog("open");
        $("#mainDialogDiv").load("snippets/lineage/lineageDictionary.html", function () {
            if (context == "Lineage_similars") {
                self.currentDomainSource = Lineage_common.currentSource;
                self.currentDictionary = Config.dictionarySource;
                self.filterClass = "dictionary_filter";
                self.filterIdPrefix = "LineageDictionary";
                $("#LineageDictionary_nodesSelectionDiv").css("display", "block");
                $("#LineageDictionary_drawSimilars").css("display", "block");
            } else if (context == "Lineage_relations") {
                self.currentDomainSource = Lineage_common.currentSource;
                self.currentDictionary = Lineage_common.currentSource;
                self.filterClass = "relation_filter";
                self.filterIdPrefix = "LineageRelations";
            } else if (context == "Lineage_dictionary") {
                self.dataTablesHiddenColumns.push("prop");
                self.currentDomainSource = null;
                self.currentDictionary = Config.dictionarySource;
                self.filterClass = "dictionary_filter";
                self.filterIdPrefix = "LineageDictionary";
            }

            $(function () {
                $("#LineageDictionary_startDate_input").datepicker();
                $("#LineageDictionary_endDate_input").datepicker();
            });

            async.series(
                [
                    //get domain and range sources
                    function (callbackSeries) {
                        self.getDictionaryTargetSources(self.currentDictionary, self.currentDomainSource, null, function (err, result) {
                            if (err) MainController.UI.message(err.responseText);
                            var rangeSourceLabel = [];
                            result.forEach(function (item) {
                                if (!self.domainAndRangeSourcesmap[item.domainSourceLabel.value]) self.domainAndRangeSourcesmap[item.domainSourceLabel.value] = [];
                                self.domainAndRangeSourcesmap[item.domainSourceLabel.value].push(item.rangeSourceLabel.value);
                            });
                            for (var key in self.domainAndRangeSourcesmap) {
                                self.domainAndRangeSourcesmap[key].sort();
                            }
                            callbackSeries();
                        });
                    },
                    //fill domainSource and rangeSource
                    function (callbackSeries) {
                        var domainSources = Object.keys(self.domainAndRangeSourcesmap).sort();
                        common.fillSelectOptions(self.filterIdPrefix + "_domainSourceLabel_select", domainSources, true);
                        if (self.currentDomainSource) {
                            if (!self.domainAndRangeSourcesmap[self.currentDomainSource]) return alert(" source " + self.currentDomainSource + " is not presnt in dictionary");
                            $("#" + self.filterIdPrefix + "_domainSourceLabel_select").val(self.currentDomainSource);

                            var rangeSources = self.domainAndRangeSourcesmap[self.currentDomainSource];
                            common.fillSelectOptions(self.filterIdPrefix + "_rangeSourceLabel_select", rangeSources, true);
                        }

                        callbackSeries();
                    },
                    function (callbackSeries) {
                        return callbackSeries();
                        /*var rangeSelectId
                    if(context=="LineageSimilars"){
                      rangeSelectId = "LineageRelations_rangeSource_select";
                      $("#LineageDictionary_domainSourceLabel_select").val(self.currentDomainSource)
                      self.fillDictionaryFilters(target,Lineage_common.currentSource);
                   if( context=="LineageRelations"){
                      rangeSelectId = "LineageDictionary_rangeSourceSelect";
                      $("#LineageDictionary_drawSimilars").css("display","none")
                      self.fillDictionaryFilters(target,Config.dictionarySource);
                    }
                    common.fillSelectOptions(rangeSelectId, rangeSourceLabel, true);


                    if (useCurrentDomainSource) {
                      self.initDialogFilterLists()
                      callbackSeries()
                    }else{
                      callbackSeries()
                    }*/
                    },
                ],
                function (err) {}
            );
        });
    };

    self.onChangeFilterSelect = function (value) {
        self.fillDictionaryFilters(self.filterClass, self.currentDictionary);
    };

    self.getDictionaryTargetSources = function (dictionary, domainSource, rangeSource, callback) {
        var strFrom = Sparql_common.getFromStr(dictionary, false, false);
        var query =
            "PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> select distinct  ?domainSourceLabel ?rangeSourceLabel " +
            strFrom +
            " where " +
            "{?restriction <http://data.souslesens.org/property#domainSourceLabel> ?domainSourceLabel. ?restriction <http://data.souslesens.org/property#rangeSourceLabel> ?rangeSourceLabel ";
        if (domainSource) query += " filter (?domainSourceLabel='" + domainSource + "') ";
        if (rangeSource) query += " filter (?rangeSourceLabel='" + rangeSource + "') ";

        query += " }  limit 10000";

        var sparql_url = Config.sources[dictionary].sparql_server.url;
        var url = sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: dictionary }, function (err, result) {
            if (err) {
                return callback(err);
            }

            return callback(null, result.results.bindings);
        });
    };

    self.getDictionaryFilters = function () {
        var filters = "";
        $(".dictionary_filter").each(function (item) {
            var id = $(this).attr("id");

            var propName = id.split("_")[1];
            var value = $("#" + id).val();
            if (value) {
                if (propName == "startDate") {
                    var date = $("#" + id).datepicker("getDate");
                    value = Sparql_common.getSparqlDate(date);
                    filters += " FILTER (?creationDate >=" + value + ") ";
                } else if (propName == "endDate") {
                    var date = $("#" + id).datepicker("getDate");
                    date.setDate(date.getDate() + 1);
                    value = Sparql_common.getSparqlDate(date);
                    filters += " FILTER (?creationDate  <=" + value + ") ";
                } else filters += " FILTER (?" + propName + "='" + value + "') ";
            }
        });
        return filters;
    };
    self.getFilterPredicates = function (subjectVarname) {
        var filters = "";
        $(".dictionary_filter").each(function (item) {
            var id = $(this).attr("id");

            var propName = id.split("_")[1];
            var value = $("#" + id).val();
            if (value) {
                filters += "?" + subjectVarname + " <" + Config.dictionaryMetaDataPropertiesMap[propName] + "> ?" + propName + ".";
                if (propName == "startDate") {
                    var date = $("#" + id).datepicker("getDate");
                    value = Sparql_common.getSparqlDate(date);
                    filters += " FILTER (?creationDate >=" + value + ") ";
                } else if (propName == "endDate") {
                    var date = $("#" + id).datepicker("getDate");
                    date.setDate(date.getDate() + 1);
                    value = Sparql_common.getSparqlDate(date);
                    filters += " FILTER (?creationDate  <=" + value + ") ";
                }
                filters += " FILTER (?" + propName + "='" + value + "') ";
            }
        });
        return filters;
    };

    self.fillDictionaryFilters = function (filterClassName, source) {
        var filtersMap = {};

        $("." + filterClassName).each(function () {
            var id = $(this).attr("id");

            var value = $(this).val();
            if (!value) {
                var propName = id.split("_")[1];
                if (propName == " startDate");
                else if (propName == " endDate");
                else filtersMap[id] = propName;
            }
        });
        async.eachSeries(
            Object.keys(filtersMap),
            function (filterId, callbackEach) {
                var filterVar = filtersMap[filterId];
                if (filterVar == "date") return callbackEach();
                var prop = Config.dictionaryMetaDataPropertiesMap[filterVar];
                if (!prop) {
                    console.log("property not recognized " + prop);
                    return callbackEach();
                }
                var query =
                    "PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                    " SELECT distinct ?obj  from " +
                    " <" +
                    Config.sources[source].graphUri +
                    "> where {?restriction <" +
                    prop +
                    "> ?obj.";
                query += self.getFilterPredicates("restriction");
                query += "}";
                var sparql_url = Config.sources[source].sparql_server.url;
                var url = sparql_url + "?format=json&query=";
                Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
                    if (err) {
                        return callbackEach(err);
                    }
                    var values = [];
                    result.results.bindings.forEach(function (item) {
                        values.push(item.obj.value);
                    });
                    values.sort();
                    common.fillSelectOptions(filterId, values, true);

                    return callbackEach();
                });
            },
            function (err) {
                if (err) {
                    return alert(err.responseText);
                }
            }
        );
    };

    self.exportDictionaryToTable = function () {
        var SparqlqueryResult = [];
        var domainIds = {};
        var rangeIds = {};
        async.series(
            [
                function (callbackSeries) {
                    self.queryTSFdictionary(function (err, result) {
                        if (err) callbackSeries(err.responseText);
                        SparqlqueryResult = result.results.bindings;
                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    SparqlqueryResult.forEach(function (item, index) {
                        rangeIds[item.range.value] = {};
                        domainIds[item.domain.value] = {};
                    });
                    callbackSeries();
                },
                function (callbackSeries) {
                    SearchUtil.getSourceLabels(null, Object.keys(domainIds), null, null, function (err, result) {
                        if (err) callbackSeries(err.responseText);
                        result.forEach(function (hit) {
                            hit._source.index = hit._index;
                            domainIds[hit._source.id] = hit._source;
                        });
                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    SearchUtil.getSourceLabels(null, Object.keys(rangeIds), null, null, function (err, result) {
                        if (err) callbackSeries(err.responseText);
                        result.forEach(function (hit) {
                            hit._source.index = hit._index;
                            rangeIds[hit._source.id] = hit._source;
                        });
                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    var dataset = [];
                    var cols = [];
                    cols.push({ title: "domainLabel", defaultContent: "" });
                    cols.push({ title: "rangeLabel", defaultContent: "" });
                    for (var key in Config.dictionaryMetaDataPropertiesMap) {
                        if (self.dataTablesHiddenColumns.indexOf(key) < 0) cols.push({ title: key, defaultContent: "" });
                    }
                    cols.push({ title: "creationDate", defaultContent: "" });
                    SparqlqueryResult.forEach(function (item, index) {
                        var line = [];
                        cols.forEach(function (col) {
                            if (col.title == "domainLabel") {
                                if (item.domain && domainIds[item.domain.value]) line.push(domainIds[item.domain.value].label);
                                else line.push("");
                            } else if (col.title == "rangeLabel") {
                                if (item.range && rangeIds[item.range.value]) line.push(rangeIds[item.range.value].label);
                                else line.push("");
                            } else if (item[col.title]) line.push(item[col.title].value);
                            else line.push("");
                        });
                        dataset.push(line);
                    });

                    Export.showDataTable(null, cols, dataset);
                },
            ],
            function (err) {
                if (err) return alert(err.responseText);
            }
        );
    };

    self.queryTSFdictionary = function (callback) {
        var query =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>SELECT * from" +
            " <" +
            Config.sources[Config.dictionarySource].graphUri +
            ">" +
            " WHERE {{ ?domain rdfs:subClassOf ?node.  ?node rdf:type owl:Restriction. ?node owl:onProperty ?prop ." +
            " OPTIONAL {?prop rdfs:label ?propLabel} " +
            "?node owl:someValuesFrom ?range." +
            " OPTIONAL {?node <http://data.souslesens.org/property#domainSourceLabel> ?domainSourceLabel}\n" +
            "  OPTIONAL {?node <http://data.souslesens.org/property#rangeSourceLabel> ?rangeSourceLabel} \n" +
            "  OPTIONAL {?node <purl.org/dc/terms/created> ?creationDate} \n" +
            "  OPTIONAL {?node <https://www.dublincore.org/specifications/bibo/bibo/bibo.rdf.xml#status> ?status} \n" +
            "  OPTIONAL {?node <http://purl.org/dc/terms/creator> ?author} \n" +
            "  OPTIONAL {?node  <http://purl.org/dc/terms/source> ?provenance }\n";
        query += " filter (?prop=<http://www.w3.org/2002/07/owl#sameAs>) }";
        query += self.getDictionaryFilters();
        query += "} limit 10000";
        var sparql_url = Config.sources[self.currentDictionary].sparql_server.url;
        var url = sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: self.currentDictionary }, function (err, result) {
            if (err) {
                return callback(err);
            }
            callback(null, result);
        });
    };

    self.drawDictionarySameAs = function () {
        var filter = " FILTER (?prop = <http://www.w3.org/2002/07/owl#sameAs>) ";
        var rangeSourceLabel = $("#LineageDictionary_rangeSourceSelect").val();
        filter += "  FILTER (?domainSourceLabel ='" + Lineage_common.currentSource + "')";
        if (rangeSourceLabel) filter += "  FILTER (?rangeSourceLabel ='" + rangeSourceLabel + "')";
        var nodes = null;
        var mode = $("#LineageDictionary_nodesSelectionSelect").val();
        if (mode == "currentGraphNodes") nodes = visjsGraph.data.nodes.getIds();
        var options = {
            // processorFn: processMetadata,
            filter: filter,
            getMetadata: true,
        };
        Lineage_classes.drawRestrictions(Config.dictionarySource, nodes, false, false, options, function (err) {
            if (err) return alert(err.responseText);
            var nodes = visjsGraph.data.nodes.getIds();
            $("#mainDialogDiv").dialog("close");
            var distinctSources = [];
            SearchUtil.getSourceLabels(null, nodes, null, null, function (err, result) {
                if (err) return alert(err.responseText);
                var newNodes = [];
                var newSources = [];
                result.forEach(function (hit) {
                    var hitSource = SearchUtil.getSourceLabelFromIndexName(hit._index);
                    if (newSources.indexOf(hitSource) < 0) {
                        newSources.push(hitSource);
                    }
                    newNodes.push({
                        id: hit._source.id,
                        label: hit._source.label,
                        data: {
                            id: hit._source.id,
                            label: hit._source.label,
                            source: hitSource,
                        },
                    });
                });
                visjsGraph.data.nodes.update(newNodes);

                newSources.forEach(function (source) {
                    Lineage_classes.registerSource(source);
                });
            });
        });
    };

    return self;
})();
