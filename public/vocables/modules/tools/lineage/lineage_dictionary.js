import common from "../../shared/common.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import Export from "../../shared/export.js";
import SearchUtil from "../../search/searchUtil.js";
import Lineage_whiteboard from "./lineage_whiteboard.js";
import Lineage_createRelation from "./lineage_createRelation.js";


/**
 * Lineage Dictionary module
 * Manages the dictionary-related functionalities within the lineage tool.
 * @module Lineage_dictionary
 */
var Lineage_dictionary = (function () {
    var self = {};
    self.currentDomainSource = null;
    self.domainAndRangeSourcesmap = {};
    self.dataTablesHiddenColumns = [];
    self.dataTablesOrderedColumns = ["status", "domainSourceLabel", "domainLabel", "rangeSourceLabel", "rangeLabel"]; // ATTENTION status doit toujours etre la premiere colonne

    self.onLoaded = function () {
        Lineage_dictionary.showTSFdictionaryDialog("Lineage_dictionary");
    };

    self.showTSFdictionaryDialog = function (context) {
        var targetDiv;
        if (true && context == "Lineage_dictionary") {
            $("#graphDiv").html("<div id='LineageDictionary_mainDiv' style='width:800px;height:800px;overflow: auto'></div>");
            $("#LineageDictionary_mainDiv").height($("#graphDiv").height() - 100);
            $("#LineageDictionary_mainDiv").width($("#graphDiv").width());
            targetDiv = "LineageDictionary_mainDiv";
        } else {
            targetDiv = "mainDialogDiv";
        }

        $("#" + targetDiv).load("modules/tools/lineage/html/lineageDictionary.html", function () {
            $("#mainDialogDiv").dialog("open");
            $("#LineageDictionary_Tabs").tabs({
                activate: function (event, ui) {
                    var divId = ui.newPanel.selector;
                    /*  if (divId == "#LineageDictionary_selectionTab") {

}*/
                },
            });
            var lineageCurrentSource = Lineage_sources.activeSource;
            if (context == "Lineage_similars") {
                self.currentDomainSource = lineageCurrentSource;
                self.currentDictionary = Config.dictionarySource;
                self.filterClass = "dictionary_filter";
                self.filterIdPrefix = "LineageDictionary";
                $("#LineageDictionary_nodesSelectionDiv").css("display", "block");
                $("#LineageDictionary_drawSimilars").css("display", "block");
            } else if (context == "Lineage_relations") {
                self.currentDomainSource = lineageCurrentSource;
                self.currentDictionary = lineageCurrentSource;
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
                        self.getDictionarySources(self.currentDictionary, self.currentDomainSource, null, function (err, result) {
                            if (err) UI.message(err.responseText);
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
                            if (!self.domainAndRangeSourcesmap[self.currentDomainSource]) return alert(" source " + self.currentDomainSource + " is not present in dictionary");
                            $("#" + self.filterIdPrefix + "_domainSourceLabel_select").val(self.currentDomainSource);

                            var rangeSources = self.domainAndRangeSourcesmap[self.currentDomainSource];
                            common.fillSelectOptions(self.filterIdPrefix + "_rangeSourceLabel_select", rangeSources, true);
                        }

                        callbackSeries();
                    },
                    function (callbackSeries) {
                        return callbackSeries();
                    },
                ],
                function (err) {},
            );
        });
    };

    self.onChangeFilterSelect = function (value) {
        self.fillDictionaryFilters(self.filterClass, self.currentDictionary);
    };

    self.getDictionarySources = function (dictionary, domainSource, rangeSource, callback) {
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
            },
        );
    };

    self.exportDictionaryToTable = function (filters) {
        var SparqlqueryResult = [];
        var domainIds = {};
        var rangeIds = {};
        async.series(
            [
                function (callbackSeries) {
                    var dictionarySource = self.currentDictionary;
                    if (!filters) filters = "";
                    filters = self.getDictionaryFilters();
                    var mode = $("#LineageDictionary_nodesSelectionSelect").val();
                    if (mode == "currentGraphNodes") {
                        var nodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.getIds();
                        filters += Sparql_common.setFilter("domain", nodes);
                    }
                    $("#LineageDictionary_Tabs").tabs("option", "active", 1);
                    $("#LineageDictionary_dataTab").html("");
                    self.queryTSFdictionary(dictionarySource, filters, function (err, result) {
                        if (err) callbackSeries(err.responseText);
                        SparqlqueryResult = result;
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
                    UI.message("Drawing table...");
                    var dataset = [];
                    var cols = [];

                    cols.push({
                        defaultContent: "",
                        title: "Selection",
                        className: "select-checkbox",
                        render: function (datum, type, row) {
                            return "";
                        },
                    }); // cols.push({ title: "", defaultContent: "" });

                    self.dataTablesOrderedColumns.forEach(function (item) {
                        cols.push({ title: item, defaultContent: "" });
                    });
                    cols.push({ title: "creationDate", defaultContent: "" });
                    for (var key in Config.dictionaryMetaDataPropertiesMap) {
                        if (self.dataTablesOrderedColumns.indexOf(key) < 0)
                            if (self.dataTablesHiddenColumns.indexOf(key) < 0)
                                cols.push({
                                    title: key,
                                    defaultContent: "",
                                });
                    }

                    SparqlqueryResult.forEach(function (item, index) {
                        var line = [];
                        cols.forEach(function (col) {
                            // ATTENTION cette colonne doit toujours etre la premiere
                            if (col.title == "restrictionNode") {
                                line.push(item.node.value);
                            } else if (col.title == "domainLabel") {
                                if (item.domain && domainIds[item.domain.value]) line.push(domainIds[item.domain.value].label);
                                else line.push("");
                            } else if (col.title == "rangeLabel") {
                                if (item.range && rangeIds[item.range.value]) line.push(rangeIds[item.range.value].label);
                                else line.push("");
                            }
                            // ATTENTION cette colonne doit toujours etre la deuxieme
                            else if (col.title == "status") {
                                var value = item[col.title].value;
                                value = value ? value.substring(value.lastIndexOf("/") + 1) : "";
                                line.push(value);
                            } else if (item[col.title]) {
                                line.push(item[col.title].value);
                            } else {
                                line.push("");
                            }
                        });
                        dataset.push(line);
                    });

                    $("#LineageDictionary_dataTab").html("<table id='dataTableDivExport'></table>");

                    setTimeout(function () {
                        self.dictionaryDataTable = $("#dataTableDivExport").DataTable({
                            data: dataset,
                            columns: cols,
                            pageLength: 200,
                            dom: "Bfrtip",

                            buttons: [
                                {
                                    extend: "csvHtml5",
                                    text: "Export CSV",
                                    fieldBoundary: "",
                                    fieldSeparator: ";",
                                },
                                {
                                    text: "Select All",
                                    action: function (e, dt, node, config) {
                                        Lineage_dictionary.dictionaryDataTable.rows().select();
                                    },
                                },

                                {
                                    text: "UnSelect All",
                                    action: function (e, dt, node, config) {
                                        Lineage_dictionary.dictionaryDataTable.rows().deselect();
                                    },
                                },
                                {
                                    text: "Promote",
                                    action: function (e, dt, node, config) {
                                        var data = Lineage_dictionary.dictionaryDataTable.rows({ selected: true }).data();
                                        Lineage_dictionary.validation.promote(data);
                                    },
                                },
                                {
                                    text: "UnPromote",
                                    action: function (e, dt, node, config) {
                                        var data = Lineage_dictionary.dictionaryDataTable.rows({ selected: true }).data();
                                        Lineage_dictionary.validation.unPromote(data);
                                    },
                                },
                                {
                                    text: "trash",
                                    action: function (e, dt, node, config) {
                                        var data = Lineage_dictionary.dictionaryDataTable.rows({ selected: true }).data();
                                        Lineage_dictionary.validation.trash(data);
                                    },
                                },
                                {
                                    text: "Delete",
                                    action: function (e, dt, node, config) {
                                        var data = Lineage_dictionary.dictionaryDataTable.rows({ selected: true }).data();
                                        Lineage_dictionary.validation.remove(data);
                                    },
                                },
                            ],

                            columnDefs: [
                                /*{
orderable: false,
className: "select-checkbox",
targets: [0]
} {
"targets": [0],
"visible": false,
"searchable": false
}*/
                            ],
                            select: {
                                style: "multi",
                                selector: "td:first-child",
                            },

                            order: [],
                        });
                    }, 200);

                    // Export.showDataTable(null, cols, dataset);
                },
            ],
            function (err) {
                if (err) return alert(err.responseText);
            },
        );
    };

    self.queryTSFdictionary = function (dictionarySource, filters, callback) {
        var query =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>SELECT * from" +
            " <" +
            Config.sources[Config.dictionarySource].graphUri +
            ">" +
            " WHERE {{ ?domain rdfs:subClassOf ?node.  ?node rdf:type owl:Restriction. ?node owl:onProperty ?prop ." +
            " OPTIONAL {?prop rdfs:label ?propLabel} " +
            "?node ?p ?range." +
            " OPTIONAL {?node <http://data.souslesens.org/property#domainSourceLabel> ?domainSourceLabel}\n" +
            "  OPTIONAL {?node <http://data.souslesens.org/property#rangeSourceLabel> ?rangeSourceLabel} \n" +
            "  OPTIONAL {?node <http://purl.org/dc/terms/created> ?creationDate} \n" +
            "  OPTIONAL {?node <https://www.dublincore.org/specifications/bibo/bibo/bibo.rdf.xml#status> ?status} \n" +
            "  OPTIONAL {?node <http://purl.org/dc/terms/creator> ?author} \n" +
            "  OPTIONAL {?node  <http://purl.org/dc/terms/source> ?provenance }\n";
        query += " filter (?prop=<http://www.w3.org/2002/07/owl#sameAs>) }";
        query += filters || "";
        query += "} limit 10000";
        var sparql_url = Config.sources[dictionarySource].sparql_server.url;
        var url = sparql_url + "?format=json&query=";
        UI.message("Searching ...");
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: dictionarySource }, function (err, result) {
            if (err) {
                return callback(err);
            }
            callback(null, result.results.bindings);
        });
    };

    self.drawDictionarySameAs = function () {
        var filter = " FILTER (?prop = <http://www.w3.org/2002/07/owl#sameAs>) ";
        var rangeSourceLabel = $("#LineageDictionary_rangeSourceSelect").val();
        filter += "  FILTER (?domainSourceLabel ='" + Lineage_sources.activeSource + "')";
        if (rangeSourceLabel) filter += "  FILTER (?rangeSourceLabel ='" + rangeSourceLabel + "')";
        var nodes = null;
        var mode = $("#LineageDictionary_nodesSelectionSelect").val();
        if (mode == "currentGraphNodes") nodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.getIds();
        var options = {
            // processorFn: processMetadata,
            filter: filter,
            getMetadata: true,
        };
        Lineage_whiteboard.drawRestrictions(Config.dictionarySource, nodes, false, false, options, function (err) {
            if (err) return alert(err.responseText);
            var nodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.getIds();
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
                Lineage_whiteboard.lineageVisjsGraph.data.nodes.update(newNodes);

                newSources.forEach(function (source) {
                    Lineage_sources.registerSource(source);
                });
            });
        });
    };

    self.validation = {
        promote: function (data) {
            self.validation.executeRestrictionSparql(data, "promote", function (err) {
                self.validation.updateDatatableCells("promote");
            });
        },
        unPromote: function (data) {
            self.validation.executeRestrictionSparql(data, "unPromote", function (err) {
                self.validation.updateDatatableCells("unPromote");
            });
        },
        trash: function (data) {
            self.validation.executeRestrictionSparql(data, "trash", function (err) {
                self.validation.updateDatatableCells("trash");
            });
        },

        remove: function (data) {
            if (data.length == 0) return alert("no row is selected");
            if (!confirm(" remove  permanently " + data.length + " dictionary entries ?")) return;
            var restrictions = [];
            for (var i = 0; i < data.length; i++) {
                restrictions.push({ data: { bNodeId: data[i][0] } });
            }

            async.eachSeries(
                restrictions,
                function (restrictionNode, callbackEach) {
                    Lineage_createRelation.deleteRestriction(Config.dictionarySource, restrictionNode, function (err, result) {
                        if (err) return callbackEach(err);
                        callbackEach();
                    });
                },
                function (err) {
                    if (err) {
                        return alert(err.responseText);
                    }
                    Lineage_dictionary.validation.updateDatatableCells("delete");
                },
            );
        },

        executeRestrictionSparql: function (data, operation, callback) {
            if (data.length == 0) return alert("no row is selected");
            if (!confirm(operation + " " + data.length + " dictionary entries ?")) return;
            var restrictionIds = [];
            for (var i = 0; i < data.length; i++) {
                restrictionIds.push(data[i][0]);
            }
            var slices = common.array.slice(restrictionIds, 100);
            async.eachSeries(
                slices,
                function (restrictionIds, callbackEach) {
                    var filter = Sparql_common.setFilter("node", restrictionIds);
                    var query = "WITH <" + Config.sources[Config.dictionarySource].graphUri + "> ";
                    /*  if (operation == "promote") {
query += "delete{ ?node <" + Config.dictionaryMetaDataPropertiesMap["status"] + "> ?status} ";
query += " insert { ?node <" + Config.dictionaryMetaDataPropertiesMap["status"] + "> '"+Config.dictionaryStatusMap[operation]+"'} ";
query += " where { ?node <" + Config.dictionaryMetaDataPropertiesMap["status"] + "> ?status " + filter + "} ";
} else if (operation == "unPromote") {
query += "delete{ ?node <" + Config.dictionaryMetaDataPropertiesMap["status"] + "> ?status} ";
query += " insert { ?node <" + Config.dictionaryMetaDataPropertiesMap["status"] + "> '"+Config.dictionaryStatusMap[operation]+"'} ";
query += " where { ?node <" + Config.dictionaryMetaDataPropertiesMap["status"] + "> ?status " + filter + "} ";
}*/
                    if (operation == "remove") {
                        query += "delete{ ?node ?p ?o} ";
                        query += " where { ?node ?p ?o " + filter + "} ";
                    } else {
                        query += "delete{ ?node <" + Config.dictionaryMetaDataPropertiesMap["status"] + "> ?status} ";
                        query += " insert { ?node <" + Config.dictionaryMetaDataPropertiesMap["status"] + "> '" + Config.dictionaryStatusMap[operation] + "'} ";
                        query += " where { ?node <" + Config.dictionaryMetaDataPropertiesMap["status"] + "> ?status " + filter + "} ";
                    }

                    var sparql_url = Config.sources[Config.dictionarySource].sparql_server.url;
                    var url = sparql_url + "?format=json&query=";
                    Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: Config.dictionarySource }, function (err, result) {
                        if (operation == "remove") {
                            var query2 = "WITH <" + Config.sources[Config.dictionarySource].graphUri + "> ";
                            query2 += "delete{ ?s  ?p ?node} ";
                            query2 += " where { ?s ?p ?node. filter ?p=<http://www.w3.org/2000/01/rdf-schema#subClassOf> " + filter + "} ";
                            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: Config.dictionarySource }, function (err, result) {
                                callbackEach(err);
                            });
                        } else {
                            callbackEach(err);
                        }
                    });
                },
                function (err) {
                    if (err) {
                        return alert("err");
                        // Lineage_dictionary.showTSFdictionaryDialog("Lineage_dictionary");
                    }
                    UI.message(operation + " " + data.length + " dictionary entries DONE", true);
                    callback(null);
                },
            );
        },
        updateDatatableCells: function (operation) {
            var indexes = Lineage_dictionary.dictionaryDataTable.rows({ selected: true })[0];
            for (var i = 0; i < indexes.length; i++) {
                Lineage_dictionary.dictionaryDataTable.cell(indexes[i], 1).data(Config.dictionaryStatusMap[operation]);
            }
        },
    };

    return self;
})();

export default Lineage_dictionary;

window.Lineage_dictionary = Lineage_dictionary;
