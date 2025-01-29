import common from "../../shared/common.js";
import SearchUtil from "../../search/searchUtil.js";
import ElasticSearchProxy from "../../search/elasticSearchProxy.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Lineage_dictionary from "../lineage/lineage_dictionary.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import visjsGraph from "../../graph/visjsGraph2.js";
import Lineage_whiteboard from "../lineage/lineage_whiteboard.js";
import Export from "../../shared/export.js";
import SourceSelectorWidget from "../../uiWidgets/sourceSelectorWidget.js";

var Standardizer = (function () {
    var self = {};
    self.matchCandidates = {};
    var maxCompareSource = 25;
    var maxWordsListLength = 2000;
    self.mode = "matrix";

    self.currentAction = null;
    self.fuzzyMatches = [];

    self.onSourceSelect = function () {
        // pass
    };

    self.searchInSourcesTree = function (event) {
        SearchWidget.searchInSourcesTree(event, "Standardizer_sourcesTree");
    };

    self.onLoaded = function (callback) {
        $("#actionDiv").html("");
        $("#graphDiv").html("");
        SearchWidget.searchableSourcesTreeIsInitialized = false;
        $("#graphDiv").load("modules/tools/standardizer/standardizer_central.html", function () {
            $("#standardizerCentral_tabs").tabs({});
            $("#standardizerRightPanel").load("modules/tools/standardizer/standardizer_right.html", function () {
                // pass
            });
        });

        $("#lateralPanelDiv").load("modules/tools/standardizer/standardizer_left.html", function () {
            $("#Lineage_classes_SearchSourceInput").bind("keydown", null, Standardizer.searchInSourcesTree);
            $("#Standardizer_leftTab").tabs({});
        });

        $("#graphDiv").html("");

        $("#accordion").accordion("option", { active: 2 });

        SearchUtil.initSourcesIndexesList(null, function (err, sources) {
            if (err) return UI.message(err);
            sources.sort();
            var options = {
                contextMenu: Standardizer.getSourcesJstreeContextMenu(),
                selectTreeNodeFn: Standardizer.onselectSourcesTreeNodeFn,
                withCheckboxes: true,
            };

            SourceSelectorWidget.initWidget(["OWL", "KNOWLEDGE_GRAPH", "SKOS"], "Standardizer_sourcesTree", false, Standardizer.onselectSourcesTreeNodeFn, null, options);

            var candidateEntities = sources;
            candidateEntities.splice(0, 0, "all");
            common.fillSelectOptions("KGadvancedMapping_filterCandidateMappingsSelect", candidateEntities, false);

            var sortList = ["alphabetic", "candidates"];
            sources.forEach(function (source) {
                sortList.push({ value: "_search_" + source, text: source });
            });

            common.fillSelectOptions("KGmapping_distinctColumnSortSelect", sortList, false, "text", "value");
            self.matchCandidates = {};

            //   common.fillSelectOptions("Standardizer_sourcesSelect", sources, true);
        });
        setTimeout(function () {
            if (callback) callback();
        }, 500);
    };

    self.getClassesLabels = function (classUris, indexes, callback) {
        var slices = common.array.slice(classUris, 100);
        var size = 200;
        var queryResultsSize = 5000;
        var classesMap = {};
        if (classUris) slices = common.array.slice(classUris, size);
        async.eachSeries(
            slices,
            function (urisSlice, callbackEach) {
                var queryObj = {
                    terms: {
                        "id.keyword": urisSlice,
                    },
                };
                var query = {
                    query: queryObj,
                    from: 0,
                    size: queryResultsSize,
                    _source: {
                        excludes: ["attachment.content", "parents"],
                    },
                };

                ElasticSearchProxy.queryElastic(query, indexes, function (err, result) {
                    if (err) return callbackEach(err);
                    if (result.error) {
                        console.log(JSON.stringify(result.error));
                        return callback();
                    }
                    var hits = result.hits.hits;
                    if (hits.length > queryResultsSize) if (!confirm("resut troncated > " + hits.length)) return callback("resut troncated");
                    hits.forEach(function (hit) {
                        classesMap[hit._source.id] = hit._source.label;
                    });
                    callbackEach();
                });
            },
            function (err) {
                if (err) return callback(err);
                return callback(null, classesMap);
            },
        );
    };

    self.getSelectedIndexes = function (excludeCurrentSource) {
        var sources = SourceSelectorWidget.getCheckedSources();
        var indexes = [];
        var sourceIndex = self.currentSource;

        sources.forEach(function (source) {
            if (!Config.sources[source] || !Config.sources[source].schemaType) return;
            if (!excludeCurrentSource || source != sourceIndex) indexes.push(source.toLowerCase());
        });
        return indexes;
    };

    self.initMatrix = function (indexes) {
        self.currentWordsCount = 0;
        var html = "<div class='matrix'>";
        html += "<div class='matrixRow'>";
        html += "<div class='matrixRowTitle'>" + self.currentSource + "</div>";
        indexes.forEach(function (index) {
            html += "<div class='matrixColTitle'>" + index + "&nbsp;&nbsp;</div>";
        });
        html += "<div style='width:50px'></div>";
        html += "</div>";

        return html;
    };

    self.addDictionaryMatches = function (sourceObjects, callback) {
        var ids = [];
        sourceObjects.forEach(function (item) {
            ids.push(item.id);
        });
        var filter = Sparql_common.setFilter("domain", ids);
        Lineage_dictionary.queryTSFdictionary(Config.dictionarySource, filter, function (err, result) {
            if (err) return callback(err);
            var dictionaryMatches = {};
            result.forEach(function (item) {
                if (!dictionaryMatches[item.domain.value]) dictionaryMatches[item.domain.value] = [];
                dictionaryMatches[item.domain.value].push(item);
            });

            sourceObjects.forEach(function (item) {
                if (dictionaryMatches[item.id]) item.dictionary = dictionaryMatches[item.id];
            });
            return callback(null, sourceObjects);
        });
    };

    self.processMatrixResult = function (sourceObjects, data, indexes) {
        var entitiesMap = [];
        sourceObjects.forEach(function (obj, index) {
            var word;
            if (typeof obj === "string")
                //compare words
                word = obj;
            else {
                //compare sources
                word = obj.label;
            }

            if (!entitiesMap[word]) {
                entitiesMap[word] = [];
                entitiesMap[word].divId = common.getRandomHexaId(10);
                entitiesMap[word].sourceObject = obj;
            }
            if (!data[index] || !data[index].hits) return;
            var hits = data[index].hits.hits;

            hits.forEach(function (hit) {
                var entity = {
                    index: hit._index,
                    id: hit._source.id,
                    score: hit._score,
                    label: hit._source.label,
                    status: "exactMatch",
                };
                if (obj.label.toLowerCase() == entity.label.toLowerCase()) {
                    //  entity.status="exactMatch";
                    if (typeof obj === "object") entity.sourceHit = obj;
                    entitiesMap[word][entity.index] = entity;
                }
            });
        });

        if (self.mode == "matrix") {
            var html = "";

            for (var word in entitiesMap) {
                var cellHtml = "";
                var hasMatchesClass = false;

                self.matrixWordsMap.entities[word] = [];
                indexes.forEach(function (indexName) {
                    var cellStr = "";
                    var specificClassStr = "";
                    var divId = common.getRandomHexaId(10);
                    self.matrixDivsMap[divId] = { index: indexName };
                    var entityIndexObj = entitiesMap[word][indexName];
                    //     self.matrixIndexRankingsMap[divId]={index:indexName}
                    if (entityIndexObj) {
                        hasMatchesClass = true;
                        cellStr = " ";
                        specificClassStr = "matrixCellExactMatch";
                        self.matrixDivsMap[divId] = entityIndexObj;

                        if (!self.matrixIndexRankingsMap) self.matrixIndexRankingsMap = {};
                        if (!self.matrixIndexRankingsMap[indexName]) self.matrixIndexRankingsMap[indexName] = 0;
                        self.matrixIndexRankingsMap[indexName] += 1;
                    }
                    self.matrixWordsMap.entities[word].push(entityIndexObj || null);
                    self.matrixDivsMap[divId].word = word;

                    cellHtml += "<div id='" + divId + "' class='matrixCell " + specificClassStr + "' >" + cellStr + "</div>";
                });

                var rowHtml = "<div class='matrixRow'>";

                var hasMatchesClassStr = "";
                if (!hasMatchesClass) hasMatchesClassStr = " matrixWordNoMatch";
                else hasMatchesClassStr = " matrixWordExactMatch";

                if (entitiesMap[word].sourceObject.dictionary) {
                    hasMatchesClassStr += " matrixWordDictionaryMatch";
                }
                var wordDivId = entitiesMap[word].divId;
                self.matrixDivsMap[wordDivId] = { word: word, sourceObject: entitiesMap[word].sourceObject };

                rowHtml += "<div id='" + wordDivId + "' class='matrixRowTitle " + hasMatchesClassStr + "'>" + word + "</div>";
                rowHtml += cellHtml + "</div>";
                html += rowHtml;
            }
            return html;
        }
    };

    self.getMatchesClassesByIndex = function (bulkResult) {
        var indexClassMap = {};
        bulkResult.forEach(function (item) {
            var hits = item.hits.hits;
            hits.forEach(function (hit) {
                if (!indexClassMap[hit._index]) indexClassMap[hit._index] = {};
                if (!indexClassMap[hit._index][hit._source.id])
                    indexClassMap[hit._index][hit._source.id] = {
                        words: [],
                        data: hit._source,
                    };
                indexClassMap[hit._index][hit._source.id].words.push(hit._source.label);
            });
        });
        return indexClassMap;
    };

    self.showMatchesIndexRanking = function () {
        if (!self.matrixIndexRankingsMap) return;
        var array = [];
        for (var index in self.matrixIndexRankingsMap) {
            array.push({ index: index, count: self.matrixIndexRankingsMap[index] });
        }

        array.sort(function (a, b) {
            return b.count - a.count;
        });
        var html = "<B>Sources ranking</B><br><table style='border: 1px black solid'>";
        array.forEach(function (item) {
            var percent = Math.round((item.count / self.currentWordsCount) * 100);
            html += "<tr><td>" + item.index + "</td><td> matches : " + item.count + "</td><td>&nbsp;&nbsp;%&nbsp;" + percent + "</td></tr>";
        });
        html += "</table>";

        $("#Standardizer_matrixRankingDiv").html(html);
    };

    self.initAction = function (type) {
        self.currentAction = type;
        if (type == "compareWordsList") {
            $("#Standardizer_leftTab").tabs("option", "active", 2);
        } else if (type == "compareText") {
            self.extractText();
            $("#Standardizer_leftTab").tabs("option", "active", 2);
        } else if (type == "compareSource") {
            if (!self.currentSource) return alert("select a source");
            self.compareSource(self.currentSource);
        } else if (type == "compareSourceFilter") {
            if (!self.currentSource) return alert("select a source");

            var options = {
                targetDiv: "Standardizer_filterClassesTree",
                selectTreeNodeFn: function (evt, obj) {
                    var node = obj.node;
                    SearchWidget.openTreeNode("Standardizer_filterClassesTree", self.currentSource, node);
                },
                selectGraph: true,
            };

            $("#Standardizer_filterClassesDialogDiv").dialog("open");
            SearchWidget.showTopConcepts(self.currentSource, options);
        }
    };
    self.compare = function () {
        if (!self.currentAction) return alert("select data to compare");
        if (self.currentAction == "compareWordsList") {
            self.compareWordsList();
        } else if (self.currentAction == "compareText") {
            self.compareWordsList();
        } else if (self.currentAction == "compareSource") {
            if (!self.currentSource) return alert("select a source");
            self.compareSource(self.currentSource);
        }
    };

    self.splitWords = function () {
        $("#KGmapping_matrixContainer").html("");
        var text = $("#Standardizer_wordsTA").val();
        if (text == "") return alert("Enter text to standardize");
        var words = text.split("\n");
        var words2 = "";
        words.forEach(function (word) {
            common.decapitalizeLabel(word);
            var word2 = common.decapitalizeLabel(word);

            words2 += word2 + "\n";
        });
        $("#Standardizer_wordsTA").val(words2);
    };
    self.compareWordsList = function () {
        $("#KGmapping_matrixContainer").html("");
        var text = $("#Standardizer_wordsTA").val();
        if (text == "") return alert("Enter text to standardize");
        var words1 = text.split("\n");
        var words = [];
        self.matrixIndexRankingsMap = {};
        words1.forEach(function (word) {
            word = word.trim();
            if (words.indexOf(word) < 0) words.push(word);
        });
        if (words.length > maxWordsListLength) return alert(" too many words, max " + maxWordsListLength);
        self.matrixDivsMap = {};

        var size = 200;
        var totalProcessed = 0;
        var searchResultArray = [];

        var indexes = self.getSelectedIndexes();
        if (indexes.length == 0) return alert("select target Source of comparison");
        if (indexes.length > maxCompareSource) return alert("too many Sources of comparison selected max : " + maxCompareSource);
        var html = self.initMatrix(indexes);
        $("#KGmapping_matrixContainer").html(html);
        self.currentWordsCount = 0;
        self.matrixWordsMap = { indexes: indexes, entities: [] };
        var slices = common.array.slice(words, size);
        async.eachSeries(
            slices,
            function (words, callbackEach) {
                var indexes = self.getSelectedIndexes();

                self.currentWordsCount += words.length;
                SearchUtil.getElasticSearchMatches(words, indexes, "exactMatch", 0, 10000, {}, function (err, result) {
                    var html = self.processMatrixResult(words, result, indexes);
                    UI.message(" processed items: " + totalProcessed);
                    $("#KGmapping_matrixContainer").append(html);
                    totalProcessed += result.length;
                    searchResultArray = searchResultArray.concat(result);
                    callbackEach();
                });
            },
            function (err) {
                self.isWorking = null;
                if (err) return alert(err);
                UI.message("DONE, total processed items: " + totalProcessed, true);
                setTimeout(function () {
                    $(".matrixCell").bind("click", Standardizer.onMatrixCellClick);
                    $(".matrixWordNoMatch").bind("click", Standardizer.onMatrixWordNoMatchClick);
                    $(".matrixWordExactMatch").bind("click", Standardizer.onMatrixWordExactMatchClick);
                    self.showMatchesIndexRanking();
                    self.searchResultArray = searchResultArray;
                    self.drawSunBurst(searchResultArray, words, {}, function (_err) {
                        // pass
                    });
                }, 500);
            },
        );
    };

    self.compareSource = function (source, useClassFilter) {
        var options = {};
        if (useClassFilter) {
            var node = $("#Standardizer_filterClassesTree").jstree().get_selected(true);
            $("#Standardizer_filterClassesDialogDiv").dialog("close");
            if (!node || node.length == 0) return alert("select a node");
            options.filteredQuery = { ["term"]: { ["parents.keyword"]: node[0].data.id } };
        }
        if (self.isWorking) return alert(" busy !");
        self.matrixDivsMap = {};
        self.matrixIndexRankingsMap = {};
        //   var source = $("#Standardizer_sourcesSelect").val();
        if (!source || source == "") source = self.currentSource;
        if (!source) return alert("select a source");
        var index = source.toLowerCase();
        var resultSize = 1;
        var size = 200;
        var offset = 0;
        var totalProcessed = 0;
        var indexes = self.getSelectedIndexes(true);
        var p = indexes.indexOf(source.toLowerCase());
        if (p > -1)
            // remove source from indexes to compare with
            indexes.splice(p, 1);
        if (indexes.length == 0) return alert("select target Source of comparison");

        self.matrixWordsMap = { indexes: indexes, entities: [] };
        var html = self.initMatrix(indexes);
        $("#KGmapping_matrixContainer").html(html);

        self.currentWordsCount = 0;
        var searchResultArray = [];
        var allWords = [];

        async.whilst(
            function (_test) {
                return resultSize > 0;
            },
            function (callbackWhilst) {
                self.listSourceLabels(index, offset, size, options, function (err, hits) {
                    if (err) return callbackWhilst(err);
                    resultSize = hits.length;
                    self.currentWordsCount += hits.length;
                    var words = [];
                    offset += size;
                    var sourceClassUri = [];
                    var objects = [];
                    hits.forEach(function (hit) {
                        if (!hit._source || !hit._source.parents) return;
                        words.push(hit._source.label);
                        hit._source.parent = hit._source.parents[hit._source.parents.length - 1];
                        if (hit._source.parent && hit._source.parent.length > 1) {
                            sourceClassUri.push(hit._source.parent);
                        }
                        allWords = allWords.concat(words);

                        objects.push(hit._source);
                    });
                    Standardizer.getClassesLabels(sourceClassUri, [self.currentSource.toLowerCase()], function (err, result) {
                        if (err) return callbackWhilst(err);
                        objects.forEach(function (item) {
                            item.parentLabel = result[item.parent] || Sparql_common.getLabelFromURI(item.id);
                        });

                        var indexes = self.getSelectedIndexes(true);
                        SearchUtil.getElasticSearchMatches(words, indexes, "exactMatch", 0, size, {}, function (err, result) {
                            if (err) return callbackWhilst(err);
                            //  self.getMatchesClassesByIndex(result)
                            self.addDictionaryMatches(objects, function (err, result2) {
                                if (err) return callbackWhilst(err);
                                objects = result2;
                                var html = self.processMatrixResult(objects, result, indexes);
                                searchResultArray = searchResultArray.concat(result);
                                totalProcessed += result.length;
                                UI.message(" processed items: " + totalProcessed);
                                $("#KGmapping_matrixContainer").append(html);

                                callbackWhilst();
                            });
                        });
                    });
                });
            },
            function (err) {
                self.isWorking = null;
                if (err) return alert(err);
                UI.message("DONE, total processed items: " + totalProcessed++, true);

                setTimeout(function () {
                    $(".matrixCell").bind("click", Standardizer.onMatrixCellClick);
                    $(".matrixWordNoMatch").bind("click", Standardizer.onMatrixWordNoMatchClick);
                    $(".matrixWordExactMatch").bind("click", Standardizer.onMatrixWordExactMatchClick);

                    self.showMatchesIndexRanking();

                    self.searchResultArray = searchResultArray;
                    self.drawSunBurst(searchResultArray, allWords, {}, function (_err) {
                        // pass
                    });
                }, 500);
            },
        );
    };

    self.onMatrixCellClick = function (_event) {
        var cellData = self.matrixDivsMap[this.id];
        self.editCellData(cellData);
    };

    self.onMatrixWordExactMatchClick = function (_event) {
        var cellData = self.matrixDivsMap[this.id];
        self.editCellData(cellData);
    };
    self.onMatrixWordNoMatchClick = function (_event) {
        var cellData = self.matrixDivsMap[this.id];
        self.editCellData(cellData);
        var word = self.matrixDivsMap[this.id].word;
        self.fuzzyMatches.currentFuzzyWord = word;
        self.fuzzyMatches.currentFuzzyDiv = this.id;
        self.fuzzyMatches.currentSourceObject = self.matrixDivsMap[this.id].sourceObject;
        self.fuzzyMatches.currentFuzzyWord = word;
        self.showFuzzyMatchSearch(word);
    };
    self.onSunBurstClick = function (node) {
        $("#Standardizer_matrixCellDataDiv").html("");
        if (node.parent && node.parent.name == "orphans") self.showFuzzyMatchSearch(node.name);
        else {
            if (node.parent && node.parent.ancestors) {
                var cellData = {
                    index: node.parent.ancestors[0],
                    name: node.name,
                    uri: node.id,
                };
                self.editCellData(cellData);
            }
        }
    };

    self.showFuzzyMatchSearch = function (word) {
        var html =
            'search<input class="KGadvancedMapping_searchEntitiesInput" id="Standardizer_searchEntitiesInput2" ' +
            "onkeyup=\"if (event.keyCode == 13 || event.keyCode == 9)Standardizer.searchFuzzyMatches($(this).val(),null,'Standardizer_searchResulDiv2')\">" +
            "<br><input type='checkbox'  id='Standardizer_fuzzySearchAllsourcesCBX'>All sources" +
            "<button onclick='Standardizer.clearFuzzyMatch()'>Clear fuzzyMatch</button>";
        //"<button onclick='SourceSelectorWidget.showDialog()'> filter Sources</button>"
        html += '<div id="Standardizer_searchResulDiv2" style="height: 600px; overflow: auto"></div>';
        $("#Standardizer_fuzzySearchDivDiv").html(html);
        setTimeout(function () {
            $("#Standardizer_searchEntitiesInput2").val(word);
            $("#Standardizer_fuzzySearchAllsourcesCBX").bind("change", function (e) {
                Standardizer.fuzzySearchAllsourcesCBXchecked = $(this).prop("checked");
            });
            $("#Standardizer_fuzzySearchAllsourcesCBX").prop("checked", Standardizer.fuzzySearchAllsourcesCBXchecked);

            Standardizer.searchFuzzyMatches($("#Standardizer_searchEntitiesInput2").val(), null, "Standardizer_searchResulDiv2");
        }, 200);
    };

    self.fireFuzzyMatchSearch = function (word) {
        if (word) word = $("#Standardizer_searchEntitiesInput2").val();
        Standardizer.searchFuzzyMatches(word, null, "Standardizer_searchResulDiv2");
    };

    self.editCellData = function (cellData) {
        if (cellData.sourceObject) cellData = cellData.sourceObject;

        var index = cellData.index || self.currentSource;
        var html = "<div style='font-size:12px;font-weight: normal>'><b>" + index || "" + "</b>";

        html += "<br><table>";
        if (cellData.dictionary) {
            cellData.dictionary.forEach(function (item) {
                html +=
                    "<tr><td>" +
                    "TSF_dictionary" +
                    "</td><td>" +
                    "<span class='Standardizer_dictionaryEntry' onclick='Standardizer.showDictionaryEntry(\"" +
                    item.node.value +
                    "\")'>" +
                    item.domainSourceLabel.value +
                    "->" +
                    item.rangeSourceLabel.value +
                    "</td></tr>";
            });
        }
        for (var key in cellData) {
            var value = cellData[key];
            if (key == "dictionary");
            else if (typeof value === "object") {
                for (var key2 in value) {
                    var value2 = "" + value[key2];
                    if (value2.indexOf("http://") == 0) value2 = "<a target='_blank' href='" + value2 + "'>" + value2 + "</a>";
                    html += "<tr><td>" + key2 + "</td><td>" + value2 + "</td></tr>";
                }
            } else {
                value = "" + value;
                if (value.indexOf("http://") == 0) value = "<a target='_blank' href='" + value + "'>" + value + "</a>";
                html += "<tr><td>" + key + "</td><td>" + value + "</td></tr>";
            }
        }
        html += "</table>" + "<br></div>";
        $("#Standardizer_matrixCellDataDiv").html(html);
        UI.message("", true);
    };

    self.showDictionaryEntry = function (restrictionId) {
        alert("in construction");
    };

    self.editCandidateValues = function (columnValueDivId, _searchedText) {
        KGadvancedMapping.currentColumnValueDivId = columnValueDivId;
        var columnValue = KGadvancedMapping.currentColumnValueDivIds[columnValueDivId].value;
        $("#KGadvancedMapping_searchEntitiesInput").val(columnValue);
        var entity = self.entitiesMap[columnValue.toLowerCase()];
        if (entity) {
            var keys = [];

            for (const source in entity) {
                if (keys.length == 0) keys = Object.keys(entity[source]);
            }

            var html = "";
            for (const source in entity) {
                html += "<b>" + source + "</b>";

                html += "<br><table>";

                keys.forEach(function (key) {
                    var value = "" + entity[source][key];
                    if (value.indexOf("http://") == 0) value = "<a href='" + value + "'>" + value + "</a>";
                    html += "<tr><td>" + key + "</td><td>" + value + "</td></tr>";
                });
                html += "</table>" + "<br>";

                if (authentication.currentUser.groupes.indexOf("admin") > -1) {
                    html += "<button class='btn btn-sm my-1 py-0 btn-outline-primary'  onclick='Standardizer.removeAsReference(\"" + entity[source].id + "\")' >Remove</button>";
                    if (entity[source].status == "CANDIDATE")
                        html += "<button class='btn btn-sm my-1 py-0 btn-outline-primary'  onclick='Standardizer.setAsReference(\"" + entity[source].id + "\")' >Validate</button>";
                }
                html += "<hr>";
            }

            $("#KGadvancedMapping_dictionaryMappingContainerDiv").html(html);
            UI.message("", true);
        } else {
            KGadvancedMapping.searchEntities(columnValue);
        }
    };

    self.setAsReference = function (_referenceId) {
        // pass
    };
    self.removeAsReference = function (_referenceId) {
        // pass
    };

    self.exportMappings = function () {
        var sourcesMap = {};
        var exportAncestors = $("#Standardizer_exportAncestorsCBX").prop("checked");

        for (var term in self.entitiesMap) {
            for (var index in self.entitiesMap[term]) {
                const item = {
                    target: self.entitiesMap[term][index],
                    term: term,
                };

                const source = Config.Standardizer.elasticIndexesSourcesMap[index];

                if (!sourcesMap[source]) sourcesMap[source] = [];
                sourcesMap[source].push(item);
            }
        }

        for (const columnValueDivId in KGadvancedMapping.matchCandidates) {
            const item = KGadvancedMapping.matchCandidates[columnValueDivId];
            item.target.status = "similar";
            const source = Config.Standardizer.elasticIndexesSourcesMap[item.target.index];
            if (!sourcesMap[source]) sourcesMap[source] = [];
            sourcesMap[source].push(item);
        }

        var sources = Object.keys(sourcesMap);
        var idsMap = {};
        async.eachSeries(
            sources,
            function (source, callbackEachSource) {
                var items = sourcesMap[source];

                items.forEach(function (item) {
                    idsMap[item.target.id] = item;
                });

                if (!exportAncestors) return callbackEachSource();

                var ids = Object.keys(idsMap);
                var ancestorsDepth = 4;
                $("#waitImg").css("display", "block");
                UI.message("searching, classes ancestors in source " + source);
                Sparql_OWL.getNodeParents(source, null, ids, ancestorsDepth, null, function (err, result) {
                    if (err) return callbackEachSource(err);
                    result.forEach(function (item2) {
                        var strBroaderLabels = "";
                        var strBroaderUris = "";
                        for (var i = 1; i < ancestorsDepth; i++) {
                            if (item2["broader" + i]) {
                                var broaderId = item2["broader" + i].value;
                                var broaderLabel = item2["broader" + i + "Label"].value;
                                strBroaderUris += broaderId + "/";
                                strBroaderLabels += broaderLabel + "/";
                            }
                        }
                        idsMap[item2.subject.value].superClassUris = strBroaderUris;
                        idsMap[item2.subject.value].superClassLabels = strBroaderLabels;
                    });

                    callbackEachSource();
                });
            },
            function (_err) {
                UI.message("building table");
                var keys = ["term", "status", "index", "classLabel", "classId", "score"];
                if (exportAncestors) {
                    keys.push("superClassUris");
                    keys.push("superClassLabels");
                }
                var cols = [];
                var dataSet = [];
                keys.forEach(function (key) {
                    cols.push({ title: key, defaultContent: "" });
                });

                for (var id in idsMap) {
                    var line = [];
                    var item = idsMap[id];
                    line.push(item.term);
                    line.push(item.target.status);
                    line.push(item.target.index);
                    line.push(item.target.label || item.target.term);
                    line.push(item.target.id);
                    line.push(item.target.score);
                    if (exportAncestors) {
                        line.push(item.superClassUris);
                        line.push(item.superClassLabels);
                    }
                    dataSet.push(line);
                }

                $("#mainDialogDiv").html("<table id='dataTableDiv'></table>");
                $("#mainDialogDiv").dialog("open");
                setTimeout(function () {
                    UI.message("", true);
                    $("#dataTableDiv").DataTable({
                        data: dataSet,
                        columns: cols,
                        // async: false,
                        pageLength: 15,
                        dom: "Bfrtip",
                        buttons: ["copy", "csv", "excel", "pdf", "print"],
                    }),
                        500;
                });
            },
        );
    };

    self.listSourceLabels = function (source, from, size, options, callback) {
        if (!options) options = {};
        if (!from) from = 0;
        if (!size) size = 1000;
        if (!source) {
            //   source = $("#Standardizer_sourcesSelect").val();
            source = self.currentSource;
            if (!source || source == "") return alert("select a source");
        }
        var queryObj;
        if (options.filteredQuery) queryObj = options.filteredQuery;
        else queryObj = { match_all: {} };

        var query = {
            query: queryObj,
            from: from,
            size: size,
            _source: {
                excludes: ["attachment.content"],
            },
            sort: {
                "label.keyword": { order: "asc" },
            },
        };

        ElasticSearchProxy.queryElastic(query, [source.toLowerCase()], function (err, result) {
            if (err) {
                if (callback) return callback(err);
                return alert(err);
            }

            if (callback) {
                return callback(null, result.hits ? result.hits.hits : []);
            } else {
                if (err) return alert(err);
                var str = "";
                if (!result.hits) return alert(JSON.stringify(result, null, 2));
                result.hits.hits.forEach(function (hit) {
                    str += hit._source.label + "\n";
                });

                $("#Standardizer_wordsTA").val(str);
            }
        });
    };

    self.generateSourceDictionary = function (sourceLabel) {
        if (Config.sources[sourceLabel].schemaType == "OWL") {
            Sparql_OWL.getDictionary(sourceLabel, {}, null, function (err, _result) {
                if (err) UI.message(err, true);
            });
        }
    };

    self.drawSunBurst = function (searchResultArray, words, options, _callback) {
        //    return;
        if ({ options }) options = {}; // pb ici: {options} est toujours vrai

        var sunburstDivId = "Standardizer_sunburstDiv";
        //  var graphDivId = "Standardizer_graphDiv"
        //  var treeDivId = "Standardizer_rightJstreeDiv"

        self.classUriLabelMap = {};

        var classUris = [];
        var nodes = {};
        var orphans = [];
        var hierarchy = {};

        async.series(
            [
                function (callbackSeries) {
                    //prepare data

                    var indexes = [];
                    var distinctHits = [];

                    searchResultArray.forEach(function (item, itemIndex) {
                        var hits = [];
                        if (item.hits) {
                            hits = item.hits.hits;
                            if (hits.length == 0) orphans.push(words[itemIndex]);
                        }

                        hits.forEach(function (hit) {
                            if (distinctHits.indexOf(hit._source.label) < 0) distinctHits.push(hit._source.label);

                            if (indexes.indexOf(hit._index) < 0) indexes.push(hit._index);
                            //   var parentsStr = hit._source.parents
                            var parents = hit._source.parents;
                            classUris.push(hit._source.id);
                            if (parents) {
                                var lastParent;
                                //   var parents = parentsStr.substring(0, parentsStr.length - 1).split("|")

                                var ancestors = [];
                                var path = "";
                                if (!parents.forEach) return;
                                parents.forEach(function (itemParent, index) {
                                    var parentPath = path;
                                    path += itemParent + "|";
                                    ancestors.push(itemParent);
                                    if (classUris.indexOf(itemParent) < 0) classUris.push(itemParent);
                                    var parent = hit._index;

                                    if (index > 0) parent = parents[index - 1];
                                    else parent = null;

                                    if (!nodes[itemParent]) {
                                        nodes[itemParent] = {
                                            id: itemParent,
                                            path: path,
                                            parentPath: parentPath,
                                            parent: parent,
                                            index: hit._index,
                                            classes: [],
                                            ancestors: ancestors,
                                            countChildren: 0,
                                        };
                                    }
                                    lastParent = itemParent;
                                });

                                if (nodes[lastParent].classes.indexOf(hit._source.id) < 0) {
                                    nodes[lastParent].classes.push(hit._source.id);
                                }
                            }
                        });
                    });

                    callbackSeries();
                },

                function (callbackSeries) {
                    //get labels
                    var indexes = self.getSelectedIndexes();
                    Standardizer.getClassesLabels(classUris, indexes, function (err, result) {
                        self.classUriLabelMap = result;
                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    if (!sunburstDivId) return callbackSeries();

                    function getUnflatten(arr, parentId) {
                        let output = [];
                        for (const obj of arr) {
                            if (obj.parentId == parentId) {
                                var children = getUnflatten(arr, obj.id);

                                if (children.length) {
                                    obj.children = children;
                                }

                                output.push(obj);
                            }
                        }
                        return output;
                    }

                    var array = [];
                    var root = "indexes";
                    for (var nodeId in nodes) {
                        var obj = nodes[nodeId];
                        if (!obj.parent) obj.parentId = root;
                        else obj.parentId = obj.parent;
                        obj.name = self.classUriLabelMap[nodeId];

                        array.push(obj);
                        obj.classes.forEach(function (classId) {
                            array.push({ id: classId, name: self.classUriLabelMap[classId], parentId: nodeId });
                        });
                    }

                    hierarchy = getUnflatten(array, root);

                    var orphanChildren = [];
                    orphans.forEach(function (orphan) {
                        orphanChildren.push({ name: orphan, children: [] });
                    });
                    hierarchy.push({ name: "orphans", children: orphanChildren });
                    root = { name: "matches", children: hierarchy };

                    if (!sunburstDivId) return callbackSeries();
                    var options = {
                        onNodeClick: Standardizer.onSunBurstClick,
                    };
                    self.hierarchy = root;
                    Sunburst.draw(sunburstDivId, root, options);
                    return callbackSeries();
                },

                function (callbackSeries) {
                    return callbackSeries();
                    //$("#standardizerCentral_tabs").tabs("active",2)
                },

                function (callbackSeries) {
                    var visjsData = { nodes: [], edges: [] };
                    var maxlevels = 2;
                    maxlevels = parseInt($("#Standardizer_ancestorsMaxLevels").val());
                    var existingNodes = {};

                    var recurse = function (parent, level) {
                        if (level > maxlevels) return;
                        if (!parent.children) return;
                        parent.children.forEach(function (item) {
                            if (!existingNodes[item.id]) {
                                existingNodes[item.id] = 1;

                                var ancestorsLabel = "";
                                if (item.path) {
                                    var ancestors = item.path.split("|");
                                    ancestors.forEach(function (ancestor, index) {
                                        if (index > 0) ancestorsLabel += "/";
                                        ancestorsLabel += Sparql_common.getLabelFromURI(ancestor);
                                    });
                                } else {
                                    ancestorsLabel = item.name;
                                }

                                visjsData.nodes.push({
                                    id: item.id,
                                    label: item.name || Sparql_common.getLabelFromURI(item.id),
                                    level: level,
                                    color: Lineage_whiteboard.getSourceColor(item.index),
                                    shape: "box",
                                    //  fixed:{x:false, y:true},

                                    // y:  y,
                                    data: {
                                        id: item.id,
                                        text: item.name,
                                        path: item.path,
                                        ancestorsLabel: ancestorsLabel,
                                    },
                                });
                                if (level > 0) {
                                    var edgeId = item.id + "_" + parent.id;
                                    if (!existingNodes[edgeId]) {
                                        existingNodes[edgeId] = 1;
                                        visjsData.edges.push({
                                            id: edgeId,
                                            from: item.id,
                                            to: parent.id,
                                        });
                                    }
                                }
                            }
                            recurse(item, level + 1);
                        });
                    };

                    recurse(self.hierarchy, 0);

                    if (true) {
                        // add cluster nodes with  leafs linked to hierarchies

                        var pairs = {};
                        self.searchResultArray.forEach(function (item, _itemIndex) {
                            if (!item.hits) return;
                            var hits = item.hits.hits;
                            if (hits.length == 0) return;
                            var commonNodes = [];
                            hits.forEach(function (hit) {
                                if (!hit._source.parents || !hit._source.parents.reverse) return;
                                // var ancestors = hit._source.parents.split("|").reverse()
                                var ancestors = hit._source.parents.reverse();
                                var done = false;
                                ancestors.forEach(function (ancestor) {
                                    if (!done) {
                                        if (existingNodes[ancestor]) {
                                            done = true;
                                            commonNodes.push(ancestor);
                                        }
                                    }
                                });
                            });

                            if (commonNodes.length > 1) {
                                commonNodes.forEach(function (node, index) {
                                    if (index > 0) {
                                        var id = commonNodes[index - 1] + "|" + node;
                                        if (!pairs[id]) pairs[id] = 0;
                                        pairs[id] += 1;
                                    }
                                });
                            }
                        });
                        for (var key in pairs) {
                            if (true) {
                                if (!existingNodes[key]) {
                                    existingNodes[key] = 1;

                                    visjsData.nodes.push({
                                        id: key,
                                        label: "" + pairs[key],
                                        shape: "circle",
                                        value: pairs[key],
                                        level: maxlevels + 2,
                                        fixed: { x: true, y: true },
                                        //   y:0,
                                        //   x:  (x+=xoffset)
                                    });
                                }
                                var array = key.split("|");

                                var edgeId = array[0] + "_" + key;
                                if (!existingNodes[edgeId]) {
                                    existingNodes[edgeId] = 1;
                                    visjsData.edges.push({
                                        id: edgeId,
                                        from: key,
                                        to: array[0],
                                    });
                                }
                                edgeId = array[1] + "_" + key;
                                if (!existingNodes[edgeId]) {
                                    existingNodes[edgeId] = 1;
                                    visjsData.edges.push({
                                        id: edgeId,
                                        from: key,
                                        to: array[1],
                                    });
                                }
                            } else {
                            }
                        }
                    }
                    if (false) {
                    } else {
                        var options = {
                            edges: {
                                smooth: {
                                    type: "cubicBezier",
                                    forceDirection: "vertical",

                                    roundness: 0.4,
                                },
                            },
                            layoutHierarchical: {
                                direction: "LR",
                                sortMethod: "hubsize",
                            },
                        };

                        visjsGraph.draw("Standardizer_ancestorsDiv", visjsData, options);

                        return callbackSeries();
                    }
                },
            ],

            function (_err) {
                // pass
            },
        );
    };

    self.drawBestMatches = function (words, indexes, options, _callback) {
        if ({ options }) options = {};

        var sunburstDivId = "Standardizer_sunburstDiv";
        var graphDivId = "Standardizer_graphDiv";
        var treeDivId = "Standardizer_rightJstreeDiv";

        if (!words) return alert("no words input");

        self.classUriLabelMap = {};
        var searchResultArray = [];
        var classUris = [];
        var nodes = {};
        var orphans = [];

        var hierarchy = {};

        async.series(
            [
                function (callbackSeries) {
                    //get indexes to compare
                    if (indexes) {
                        return callbackSeries();
                    }
                    SearchUtil.initSourcesIndexesList({ schemaType: "OWL" }, function (err, result) {
                        if (err) return callbackSeries(err);
                        result.forEach(function (item) {
                            indexes.push(item.toLowerCase());
                        });

                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    //get indexes matches class map
                    UI.message("matching " + words.length + "words");
                    var size = 200;

                    SearchUtil.getElasticSearchMatches(words, indexes, "exactMatch", 0, size, {}, function (err, result) {
                        if (err) return callbackSeries(err);
                        searchResultArray = result;
                        UI.message("matches found :" + searchResultArray.length);
                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    //prepare data

                    var indexes = [];
                    var distinctHits = [];

                    searchResultArray.forEach(function (item, itemIndex) {
                        if (item.hits && item.hits.hits && item.hits.hits.length == 0) orphans.push(words[itemIndex]);
                        var hits = item.hits.hits;

                        hits.forEach(function (hit) {
                            if (distinctHits.indexOf(hit._source.label) < 0) distinctHits.push(hit._source.label);

                            if (indexes.indexOf(hit._index) < 0) indexes.push(hit._index);
                            //    var parentsStr = hit._source.parents
                            var parents = hit._source.parents;
                            classUris.push(hit._source.id);
                            if (parents) {
                                var lastParent;
                                //  var parents = parentsStr.substring(0, parentsStr.length - 1).split("|")

                                var ancestors = [];
                                var path = "";
                                if (!parents.forEach) return;
                                parents.forEach(function (itemParent, index) {
                                    var parentPath = path;
                                    path += itemParent + "|";
                                    ancestors.push(itemParent);
                                    if (classUris.indexOf(itemParent) < 0) classUris.push(itemParent);
                                    var parent = hit._index;

                                    if (index > 0) parent = parents[index - 1];
                                    else parent = null;

                                    if (!nodes[itemParent]) {
                                        nodes[itemParent] = {
                                            id: itemParent,
                                            path: path,
                                            parentPath: parentPath,
                                            parent: parent,
                                            index: hit._index,
                                            classes: [],
                                            ancestors: ancestors,
                                            countChildren: 0,
                                        };
                                    }
                                    lastParent = itemParent;
                                });

                                if (nodes[lastParent].classes.indexOf(hit._source.id) < 0) {
                                    nodes[lastParent].classes.push(hit._source.id);
                                }
                            }
                        });
                    });

                    callbackSeries();
                },

                function (callbackSeries) {
                    //get labels
                    Standardizer.getClassesLabels(classUris, indexes, function (err, result) {
                        self.classUriLabelMap = result;
                        callbackSeries();
                    });
                },

                //getGraph data and draw
                function (callbackSeries) {
                    if (!graphDivId) return callbackSeries();
                    var visjsData = { edges: [], nodes: [] };
                    visjsData.nodes.push({
                        id: "#",
                        label: "#",
                        shape: "star",
                    });
                    var existingNodes = {};
                    for (var key in nodes) {
                        var node = nodes[key];

                        var color = Lineage_whiteboard.getSourceColor(node.index);

                        if (!existingNodes[node.index]) {
                            existingNodes[node.index] = 1;
                            visjsData.nodes.push({
                                id: node.index,
                                label: node.index,
                                shape: "ellipse",
                                color: color,
                            });
                            var edgeId = node.index + "_#";
                            if (!existingNodes[edgeId]) {
                                existingNodes[edgeId] = 1;
                                visjsData.edges.push({
                                    from: node.index,
                                    to: "#",
                                });
                            }
                        }

                        if (!existingNodes[node.id]) {
                            existingNodes[node.id] = 1;
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
                                    countChildren: node.countChildren,
                                },
                            });

                            edgeId = node.parent + "_" + node.id;
                            if (!existingNodes[edgeId]) {
                                existingNodes[edgeId] = 1;
                                visjsData.edges.push({
                                    from: node.id,
                                    to: node.parent || node.index,
                                });
                            }
                        }
                    }

                    visjsData.nodes.forEach(function (node) {
                        if (node.data && node.data.classes && node.data.classes.length > 0) {
                            var value = node.data.classes.length;
                            node.value = value;
                            node.shape = "square";
                        } else {
                            node.value = node.countChildren;
                        }
                    });
                    var orphansNode = {
                        id: "orphans",
                        text: "orphans",
                        shape: "square",
                        color: "#ddd",
                        size: 20,
                        data: {
                            id: "orphans",
                            text: "orphans",
                            words: orphans,
                        },
                    };
                    edgeId = "orphans" + "_#";
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1;
                        visjsData.edges.push({
                            from: "orphans",
                            to: "#",
                        });
                    }
                    visjsData.nodes.push(orphansNode);
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
                        };

                        visjsGraph.draw(graphDivId, visjsData, options);
                    }, 500);

                    callbackSeries();
                },

                //draw tree
                function (callbackSeries) {
                    if (!treeDivId) return callbackSeries();

                    var jstreeData = [];
                    var distinctNodes = {};
                    for (var nodeId in nodes) {
                        var node = nodes[nodeId];

                        if (!distinctNodes[node.path]) {
                            distinctNodes[node.path] = 1;
                            var parentPath = node.parentPath;
                            if (!parentPath || parentPath == "") parentPath = "#";

                            var label = self.classUriLabelMap[node.id];

                            jstreeData.push({
                                id: node.path,
                                text: label || node.id,
                                parent: parentPath,
                                data: {
                                    id: node.id,
                                    text: label,
                                    index: node.index,
                                },
                            });

                            if (node.classes) {
                                node.classes.forEach(function (classId) {
                                    var classUniqueId = node.path + "_" + classId;
                                    if (!distinctNodes[classUniqueId]) {
                                        distinctNodes[classUniqueId] = 1;
                                        var label = self.classUriLabelMap[classId];
                                        jstreeData.push({
                                            id: classUniqueId,
                                            text: label,
                                            parent: nodeId,
                                            data: {
                                                id: classId,
                                                text: label,
                                                index: node.index,
                                            },
                                        });
                                    }
                                });
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
                            type: "orphan",
                        },
                    });

                    orphans.forEach(function (orphan) {
                        jstreeData.push({
                            id: orphan,
                            text: orphan,
                            parent: "orphans",
                            data: {
                                id: orphan,
                                text: orphan,
                            },
                        });
                    });
                    var options = {
                        selectTreeNodeFn: Standardizer.bestMatches.onTreeNodeClick,
                    };

                    JstreeWidget.loadJsTree(treeDivId, jstreeData, options, function (_err) {
                        JstreeWidget.openNodeDescendants(treeDivId, "#", 8);
                    });
                    callbackSeries();
                },

                //get sunburst data
                function (callbackSeries) {
                    if (!sunburstDivId) return callbackSeries();

                    function getUnflatten(arr, parentId) {
                        let output = [];
                        for (const obj of arr) {
                            if (obj.parentId == parentId) {
                                var children = getUnflatten(arr, obj.id);

                                if (children.length) {
                                    obj.children = children;
                                }

                                output.push(obj);
                            }
                        }
                        return output;
                    }

                    var array = [];
                    var root = "indexes";
                    for (var nodeId in nodes) {
                        var obj = nodes[nodeId];
                        if (!obj.parent) obj.parentId = root;
                        else obj.parentId = obj.parent;
                        obj.name = self.classUriLabelMap[nodeId];

                        array.push(obj);
                        obj.classes.forEach(function (classId) {
                            array.push({ id: classId, name: self.classUriLabelMap[classId], parentId: nodeId });
                        });
                    }

                    hierarchy = getUnflatten(array, root);

                    var orphanChildren = [];
                    orphans.forEach(function (orphan) {
                        orphanChildren.push({ name: orphan, children: [] });
                    });
                    hierarchy.push({ name: "orphans", children: orphanChildren });
                    root = { name: "matches", children: hierarchy };

                    if (!sunburstDivId) return callbackSeries();
                    var options = {
                        onNodeClick: Standardizer.bestMatches.onNodeClick,
                    };
                    Sunburst.draw(sunburstDivId, root, options);
                    return callbackSeries();
                },
            ],
            function (_err) {
                return "DONE";
            },
        );
    };
    self.bestMatches = {
        onNodeClick: function (node, _point, _options) {
            if (node) {
                // $("#Standardizer_rightJstreeDiv").jstree().show_node(node.id)
                $("#Standardizer_rightJstreeDiv").jstree().open_node(node.id);
            }

            return;
            //if (!node || !node.data) return;
            //var html = "<div><a target ='blank' href='" + node.data.id + "'>" + node.data.label + "</a></div>";
            //html += "<ul>";
            //if (node.data.classes) {
            //    node.data.classes.forEach(function (classUri) {
            //        var classLabel = self.classUriLabelMap[classUri];
            //        html += "<li><a target ='blank' href='" + classUri + "'>" + classLabel + "</a></li>";
            //    });
            //}

            //if (node.data.words) {
            //    node.data.words.forEach(function (word) {
            //        html += "<li>" + word + "</li>";
            //    });
            //}

            //html += "</ul>";
            //$("#bestMatchesInfosDiv").html(html);
        },

        onTreeNodeClick: function (event, obj) {
            var node = obj.node;
            var source = SearchUtil.indexSourcesMap[node.data.index];
            if ((node.data.type = "orphan") /* probably a problem with the single '=' here */) {
                // orphans
                $("#Standardizer_searchEntitiesInput").val(node.data.text);
            }
            elseNodeInfosWidget.showNodeInfos(source, node, "mainDialogDiv");
        },
    };

    self.searchFuzzyMatches = function (words, indexes, resultDiv) {
        UI.message("", true);
        if (!words || words == "") return alert(" no word Selected");
        var searchType = "fuzzyMatch";

        if (!Array.isArray(words)) {
            if (words.match(/".*"/)) {
                searchType = "exactMatch";
                words = words.replace(/"/g, "");
            }
            words = [words];
        }
        var filteredIndexes = $("#Standardizer_fuzzySearchAllsourcesCBX").prop("checked");
        if (!indexes && !filteredIndexes) {
            indexes = self.getSelectedIndexes(true);
        }

        if (!indexes && !filteredIndexes) {
            indexes = self.getSelectedIndexes(true);
        }

        var size = 200;
        var slices = common.array.slice(words, size);
        self.currentSearchedResultsMap = {};

        var dataSet = [];
        var cols = [];
        async.eachSeries(
            slices,
            function (words, callbackEach) {
                SearchUtil.getElasticSearchMatches(words, indexes, searchType, 0, 10000, {}, function (err, result) {
                    if (err) return alert(err);
                    var entities = [];
                    if (!result.forEach || result.hits) return UI.message("no result");
                    result.forEach(function (item) {
                        if (!item.hits || !item.hits.hits) return;
                        item.hits.hits.forEach(function (hit) {
                            if (self.currentSource && hit._index == self.currentSource.toLowerCase()) return;
                            var entity = {
                                index: hit._index,
                                id: hit._source.id,
                                score: hit._score,
                                label: hit._source.label,
                            };
                            self.currentSearchedResultsMap[entity.id] = entity;
                            entities.push(entity);
                        });
                    });
                    if (entities.length == 0) return UI.message("no result", true);
                    if (Object.keys(self.currentSearchedResultsMap).length !== 0) {
                        cols.push({
                            title: "source",
                            defaultContent: "",
                            width: "100px",
                            render: function (datum, type, row) {
                                var indexStr = row[0];
                                if (indexStr.length > 25) indexStr = indexStr.substring(0, 25);
                                return "<span style='width:100px;background-color: " + Lineage_whiteboard.getSourceColor(row[0]) + ";' class='standardizer_entitySource'>" + indexStr + "</span>";
                            },
                        });
                        cols.push({ title: "word", defaultContent: "", width: "150px" });
                        cols.push({
                            title: "action",
                            render: function (datum, type, row) {
                                return (
                                    "<button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick=' NodeInfosWidget.showNodeInfos (\"" +
                                    row[0] +
                                    '","' +
                                    row[2] +
                                    '","mainDialogDiv")\'>I</button>' +
                                    "<button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='  Standardizer.selectAsFuzzyMatch (\"" +
                                    row[0] +
                                    '","' +
                                    row[2] +
                                    "\")'>S</button>"
                                );
                            },
                            width: "50px",
                        });

                        entities.forEach(function (entity) {
                            var id = "entity" + common.getRandomHexaId(5);
                            self.currentSearchedResultsMap[id] = entity;
                            var source = SearchUtil.indexSourcesMap[entity.index];
                            if (source) dataSet.push([source, entity.label, entity.id]);
                        });
                    }

                    callbackEach();
                });
            },
            function (_err) {
                if (dataSet.length == 0) return;

                $("#" + resultDiv).html();
                $("#" + resultDiv).html("<table id='dataTableDiv'></table>");

                setTimeout(function () {
                    var buttons = "Bi";
                    $("#dataTableDiv").DataTable({
                        data: dataSet,
                        columns: cols,

                        // async: false,
                        pageLength: 100,
                        /*  dom: buttons,
  buttons: [
      {
          extend: "csvHtml5",
          text: "Export CSV",
          fieldBoundary: "",
          fieldSeparator: ";",
      },
  ],*/
                        order: [],
                    });
                }, 200);
                //   Export.showDataTable(resultDiv, cols, dataSet,'Bi')
            },
        );
    };

    self.clearFuzzyMatch = function () {
        if (!self.fuzzyMatches.currentSourceObject) return;

        var itemIndexes = [];
        self.fuzzyMatches.forEach(function (item, index) {
            if (typeof self.fuzzyMatches.currentSourceObject == "string") {
                if (item.sourceNode == self.fuzzyMatches.currentSourceObject) {
                    $("#" + item.divId).removeClass("matrixWordFuzzyMatch");
                    itemIndexes.push(index);
                }
            } else {
                if (item.sourceNode.id == self.fuzzyMatches.currentSourceObject.id) {
                    $("#" + item.divId).removeClass("matrixWordFuzzyMatch");
                    itemIndexes.push(index);
                }
            }
        });
        itemIndexes.forEach(function (index) {
            self.fuzzyMatches.splice(index, 1);
        });
    };

    self.extractText = function () {
        $("#Standardizer_wordsTA").val("");
        var text = $("#Standardizer_textTA").val();
        if (!text || text == "") return alert("enter a text");

        var options = { composedWords_2: 0 };
        var chunks = [];
        var chunkSize = 5000;
        var currentChunk = "";
        var currentIndex = 0;
        var textSize = text.length;
        while (currentChunk.length == "" || currentIndex < textSize) {
            currentChunk = text.substring(currentIndex, currentIndex + chunkSize);
            chunks.push(currentChunk);
            currentIndex += chunkSize;
        }
        var allTokens = {};
        var index = 0;
        async.eachSeries(
            chunks,
            function (chunk, callbackEach) {
                var payload = {
                    text: chunk,
                    options: options,
                    types: ["NN"],
                };
                $.ajax({
                    type: "POST",
                    url: Config.apiUrl + "/annotator/spacyextract",
                    data: payload,
                    dataType: "json",
                    success: function (tokens, _textStatus, _jqXHR) {
                        var percent = Math.round(((++index * chunkSize) / textSize) * 100);
                        UI.message("extracting nouns : " + percent + "%", true);
                        tokens.forEach(function (word) {
                            if (!allTokens[word]) allTokens[word] = 1;
                        });

                        callbackEach();
                    },
                    error: function (err) {
                        callbackEach(err);
                    },
                });
            },
            function (err) {
                if (err) return alert(err);

                UI.message("extracted nouns : " + Object.keys(allTokens).length);
                var str = "";
                for (var word in allTokens) {
                    str += word + "\n";
                }

                $("#Standardizer_wordsTA").val(str);
            },
        );
    };

    self.selectAsFuzzyMatch = function (source, itemId) {
        var item = self.currentSearchedResultsMap[itemId];
        self.fuzzyMatches.push({
            divId: self.fuzzyMatches.currentFuzzyDiv,
            sourceNode: self.fuzzyMatches.currentSourceObject,
            targetNode: { word: self.fuzzyMatches.currentFuzzyWord, source: source, id: item.id, label: item.label },
        });
        $("#" + self.fuzzyMatches.currentFuzzyDiv).addClass("matrixWordFuzzyMatch");
    };

    self.getConnections = function () {
        var ids = Object.keys(self.classUriLabelMap);
        var indexes = self.getSelectedIndexes();
        var allconnections = [];
        async.eachSeries(
            indexes,
            function (index, callbackEach) {
                var source = SearchUtil.indexSourcesMap[index];
                Sparql_OWL.getObjectRestrictions(source, ids, null, function (err, result) {
                    if (err) {
                        //  alert(err);
                        return callbackEach();
                    }
                    allconnections = allconnections.concat(result);
                    callbackEach();
                });
            },
            function (_err) {
                var distinctNodes = {};
                var html = "<table style='border:1px solid brown'>";

                var filterTargetClass = $("#Standardizer_restrictionMode").prop("checked");

                allconnections.forEach(function (connection) {
                    if (!filterTargetClass || ids.indexOf(connection.value.value) > -1) {
                        if (!distinctNodes[connection.node.value]) {
                            html += "<tr>";
                            html += "<td>" + connection.subjectLabel.value + "</td><td>" + connection.propLabel.value + "</td><td>" + connection.valueLabel.value + "</td>";
                            html += "</tr>";
                        }
                    }
                });
                html += "</table>";
                $("#Standardizer_connectionsDiv").html(html);
            },
        );
    };

    self.getSourcesJstreeContextMenu = function () {
        var items = {};

        items.compareSource = {
            label: "Compare all",
            action: function (_e) {
                // pb avec source
                Standardizer.initAction("compareSource");
            },
        };

        items.compareSourceFilter = {
            label: "Compare...",
            action: function (_e) {
                // pb avec source
                Standardizer.initAction("compareSourceFilter");
            },
        };
        return items;
    };
    self.onselectSourcesTreeNodeFn = function (event, obj) {
        self.currentSource = obj.node.id;
    };

    self.showMatchesIntoLineage = function () {
        window.open(window.location.href + "?x=3", "SLSV_lineage");
        setTimeout(function () {
            var classUrisBySource = {};

            self.searchResultArray.forEach(function (item, _itemIndex) {
                var hits = item.hits.hits;
                if (hits.length == 0) return;
                hits.forEach(function (hit) {
                    var source = SearchUtil.indexSourcesMap[hit._index];
                    if (!classUrisBySource[source]) classUrisBySource[source] = [];
                    classUrisBySource[source].push(hit._source.id);
                });
            });

            broadcastChannel.postMessage({ showStandardizerResultsInLineage: classUrisBySource });
        }, 500);

        return;
    };

    self.drawAncestors = function () {
        self.searchResultArray.forEach(function (_item, _itemIndex) {
            // pass
        });
    };

    self.exportExactMatchMatrix = function (callback) {
        var cols = [];
        cols.push({ title: "Source", defaultContent: "" });
        cols.push({ title: "Label", defaultContent: "" });
        cols.push({ title: "Uri", defaultContent: "" });
        cols.push({ title: "MatchSource", defaultContent: "" });
        cols.push({ title: "MatchLabel", defaultContent: "" });
        cols.push({ title: "MatchUri", defaultContent: "" });

        var dataSet = [];

        for (var key in self.matrixWordsMap.entities) {
            var obj = self.matrixWordsMap.entities[key];

            obj.forEach(function (entity) {
                if (entity == null) return;
                else {
                    var line = [self.currentSource, entity.sourceHit ? entity.sourceHit.label : "", entity.sourceHit ? entity.sourceHit.id : ""];
                    line.push(entity.index, entity.label, entity.id);
                    dataSet.push(line);
                }
            });
            //  line.splice(1, 0, matchesCount);
        }
        if (callback) return callback(null, { cols: cols, data: dataSet });
        Export.showDataTable(null, cols, dataSet);
    };

    self.exportFuzzyMatches = function () {
        var cols = [];
        cols.push({ title: "word", defaultContent: "" });
        cols.push({ title: "source", defaultContent: "" });
        cols.push({ title: "label", defaultContent: "" });
        cols.push({ title: "uri", defaultContent: "" });

        var dataSet = [];
        self.fuzzyMatches.forEach(function (item) {
            dataSet.push([item.word, item.targetNode.source, item.targetNode.label, item.targetNode.id]);
        });
        Export.showDataTable(null, cols, dataSet);
    };

    self.createSameAsRelations = function (type) {
        var relations = [];
        var targetSources = [];
        var dictionarySourceLabel = Config.dictionarySource;

        if (type == "exactMatch") {
            for (var key in self.matrixWordsMap.entities) {
                self.matrixWordsMap.entities[key].forEach(function (obj) {
                    if (obj) {
                        var targetSource = SearchUtil.indexSourcesMap[obj.index];
                        if (targetSources.indexOf(targetSource) < 0) targetSources.push(targetSource);
                        relations.push({
                            sourceNode: {
                                source: self.currentSource,
                                label: obj.sourceHit.label,
                                id: obj.sourceHit.id,
                            },
                            targetNode: {
                                source: targetSource,
                                label: obj.label,
                                id: obj.id,
                            },
                            type: "http://www.w3.org/2002/07/owl#sameAs",
                        });
                    }
                });
            }
        } else if (type == "fuzzyMatch") {
            self.fuzzyMatches.forEach(function (item) {
                if (item) {
                    relations.push({
                        sourceNode: {
                            source: self.currentSource,
                            label: item.sourceNode.label,
                            id: item.sourceNode.id,
                        },
                        targetNode: {
                            source: item.targetNode.source,
                            label: item.targetNode.label,
                            id: item.targetNode.id,
                        },
                        type: "http://www.w3.org/2002/07/owl#sameAs",
                    });
                }
            });
        }

        if (!confirm("create " + relations.length + " relations sameAs in " + dictionarySourceLabel)) return;

        var sliceLength = 10;
        var totalCreated = 0;

        async.series(
            [
                function (callbackSeries) {
                    return callbackSeries();
                },
                function (callbackSeries) {
                    var slices = common.array.slice(relations, sliceLength);
                    UI.message(" Creating relations  in +" + dictionarySourceLabel + "...");
                    async.eachSeries(
                        slices,
                        function (slice, callbackEach) {
                            var options = {
                                origin: "Standardizer_" + type,
                                status: "candidate",
                            };

                            Lineage_createRelation.createRelationTriples(slice, true, dictionarySourceLabel, options, function (err, _result) {
                                if (err) return callbackEach(err);

                                totalCreated += sliceLength;
                                UI.message(totalCreated + " relations created in " + dictionarySourceLabel);

                                return callbackEach();
                            });
                        },
                        function (_err) {
                            callbackSeries();
                        },
                    );
                },
            ],
            function (err) {
                if (err) return alert(err);

                UI.message(totalCreated + " relations created in " + dictionarySourceLabel, true);
            },
        );
    };

    return self;
})();

export default Standardizer;

window.Standardizer = Standardizer;
