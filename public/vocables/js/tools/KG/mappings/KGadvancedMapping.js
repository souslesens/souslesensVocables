var KGadvancedMapping = (function () {
    var self = {};
    self.dictionaries = {};
    KGmappingData.currentColumnDistinctValues = [];
    self.currentdictionaryEntryEntities = {};
    self.matchCandidates = {};

    var sourceColors = {};

    self.loadSuperClasses = function () {
        var column = "*";
        var table = "[onemodel].[dbo].[superClasses]";
        var sqlQuery = " select distinct " + column + " from " + table; //+ " limit " + Config.KG.maxDistinctValuesForAdvancedMapping;
        self.executeSqlserverQuery(sqlQuery, { dbName: "onemodel", type: "sql.sqlserver" }, function (err, data) {
            if (err) {
                alert(err.responseText);
                return MainController.UI.message(err.responseText);
            }

            self.referenceDictionary = {};

            var topTypesMap = {
                REFERENCE: "ONE-MODEL-superClasses",
                "NO-SUBCLASSES": "ONE-MODEL-informationObjects",
                "ARDL-SPECIFIC": "ONE-MODEL-ARDL-specific",
            };
            KGbrowserCustom.initsuperClassesPalette();
            var typesMap = {};
            data.forEach(function (item, _index) {
                if (!typesMap[item.type]) {
                    typesMap[item.type] = [];
                }
                typesMap[item.type].push(item);
            });

            var dictionaryJsTreeData = [];
            for (var type in typesMap) {
                var dicName = topTypesMap[type];
                dictionaryJsTreeData.push({
                    id: type,
                    text: dicName,
                    type: "OWL",
                    parent: "#",
                });

                typesMap[type].forEach(function (item) {
                    var group = "zz"; // KGbrowserCustom.superClassesMap[item.superClassUri].group;
                    self.referenceDictionary[item.superClassUri] = {
                        uri: item.superClassUri,
                        label: item.superClassLabel,
                        terms: {},
                        type: type,
                    };

                    dictionaryJsTreeData.push({
                        id: item.superClassUri,
                        text: item.superClassLabel,
                        type: group,
                        parent: type,
                        data: {
                            id: item.superClassUri,
                            label: item.superClassLabel,
                        },
                    });
                });
            }

            var optionsClass = {
                selectTreeNodeFn: KGmappings.selectTreeNodeFn,
                openAll: true,
                searchPlugin: {
                    case_insensitive: true,
                    fuzzy: false,
                    show_only_matches: true,
                },

                contextMenu: KGmappings.contextMenuFn("KGmappings_OneModelTree"),
            };
            common.jstree.loadJsTree("KGmappings_OneModelTree", dictionaryJsTreeData, optionsClass);
        });
    };
    self.loadReferenceDictionary = function (superClassId, forceReload, callback) {
        if (!self.referenceDictionary || !self.referenceDictionary[superClassId]) return alert("no dictionary for superClass " + superClassId);
        var terms = self.referenceDictionary[superClassId].terms;
        if (!forceReload && Object.keys(terms).length > 0) return self.referenceDictionary[superClassId];

        var column = "*";
        var table = "[onemodel].[dbo].[reference_dictionary]";
        var where = " where superClassUri='" + superClassId + "'";
        var sqlQuery = " select distinct " + column + " from " + table + where; //+ " limit " + Config.KG.maxDistinctValuesForAdvancedMapping;
        self.executeSqlserverQuery(sqlQuery, { dbName: "onemodel", type: "sql.sqlserver" }, function (err, data) {
            if (err) {
                alert(err.responseText);
                return MainController.UI.message(err.responseText);
            }

            data.forEach(function (item, _index) {
                if (item.term) {
                    if (!self.referenceDictionary[item.superClassUri].terms[item.term.toLowerCase()]) self.referenceDictionary[item.superClassUri].terms[item.term.toLowerCase()] = {};
                    if (!self.referenceDictionary[item.superClassUri].terms[item.term.toLowerCase()][item.source])
                        self.referenceDictionary[item.superClassUri].terms[item.term.toLowerCase()][item.source] = item;
                    // self.referenceDictionary[item.superClassUri].terms[item.term.toLowerCase()]=item
                }
                if (item.type != "REFERENCE" && item.type != "CANDIDATE") {
                    self.referenceDictionary[item.superClassUri].noSubClasses = true;
                }
            });
            callback();
        });
    };

    self.getColumnDistinctValues = function (_columnClassId, callback) {
        var obj = common.deconcatSQLTableColumn(KGmappingData.currentColumn);
        var column = obj.column;
        var table = "[" + KGmappingData.currentKGdataSource.dbName + "]." + obj.table;

        var sqlQuery = " select count( distinct [" + column + "]) as count from " + table;
        self.executeSqlserverQuery(sqlQuery, KGmappingData.currentKGdataSource, function (err, data) {
            if (err) {
                callback(err);
            }

            var count = data[0].count;
            if (count > Config.KG.maxDistinctValuesForAdvancedMapping)
                return alert("Too many distinct values for column " + column + " : " + count + " mapping impossible max :" + Config.KG.maxDistinctValuesForAdvancedMapping);

            var sqlQuery = " select distinct " + column + " from " + table + " limit " + Config.KG.maxDistinctValuesForAdvancedMapping;
            if (KGmappingData.currentKGdataSource.type == "sql.sqlserver") sqlQuery = " select  distinct top(10000) [" + column + "] from " + table;

            self.executeSqlserverQuery(sqlQuery, KGmappingData.currentKGdataSource, function (err, data) {
                if (err) {
                    callback(err);
                }

                if (data.length >= Config.KG.maxDistinctValuesForAdvancedMapping) callback(" too many distinct values :" + data.length);

                KGmappingData.currentColumnDistinctValues = [];
                var colName = common.deconcatSQLTableColumn(KGmappingData.currentColumn).column;

                data.forEach(function (item) {
                    if (item[colName]) KGmappingData.currentColumnDistinctValues.push(item[colName]);
                });
                callback(null, KGmappingData.currentColumnDistinctValues);
            });
        });
    };

    self.showAdvancedMappingDialog = function (dictionary, columnClassId) {
        $("#waitImg").css("display", "block");
        MainController.UI.message("Loading distinct values for column " + KGmappingData.currentColumn);
        var type = self.referenceDictionary[columnClassId].type;
        if (type != "REFERENCE" && type != "CANDIDATE") {
            return;
        }
        KGadvancedMapping.loadReferenceDictionary(columnClassId, true, function (err, _result) {
            if (err) alert(err);

            self.getColumnDistinctValues(columnClassId, function (err, _result) {
                if (err) return alert(err);
                $("#KGmappings_AdvancedMappingDialogDiv").load("snippets/KG/KGmappingAdvancedMappingDialog.html", function () {
                    $("#KGmappings_AdvancedMappingDialogDiv").dialog("open");

                    setTimeout(function () {
                        MainController.UI.message("", true);
                        $("#KGmappingData_column").html(KGmappingData.currentColumn);
                        self.setDictionaryMappings(dictionary, columnClassId, KGmappingData.currentColumnDistinctValues);
                    });
                });
            });
        });
    };
    self.getSourceColor = function (source) {
        if (!sourceColors[source]) sourceColors[source] = Config.KG.palette[Object.keys(sourceColors).length];
        return sourceColors[source];
    };

    self.setDictionaryMappings = function (_dictionary, columnClassId, columnValues) {
        var statsMap = { total: 0, candidates: 0 };
        self.currentColumnClass = { id: columnClassId };
        var superClassDictionary = self.referenceDictionary[columnClassId];
        if (!superClassDictionary) return alert("no dictionary exists for class " + columnClassId);

        $(".dataSample_type").removeClass("datasample_type_selected");
        self.currentColumnValueDivIds = {};
        var distinctSources = [];
        columnValues.forEach(function (value) {
            var value2 = value.toLowerCase().trim(); //.replace(/\-/g," ")
            var cssClass = null;
            var termObj = superClassDictionary.terms[value2];
            var sourcesHtml = "";
            statsMap["total"] += 1;
            var id = "columnValue" + common.getRandomHexaId(5);
            self.currentColumnValueDivIds[id] = { value: value, sources: [], entities: termObj };
            if (termObj) {
                cssClass = "KGmapping_columnValues_referenceValue";
                for (var source in termObj) {
                    self.currentColumnValueDivIds[id].sources.push(source);
                    if (termObj[source].status == "CANDIDATE") {
                        statsMap["candidates"] += 1;
                        cssClass = "KGmapping_columnValues_isCandidate";
                        self.currentColumnValueDivIds[id].isCandidate = true;
                    } else {
                        if (!statsMap[source]) statsMap[source] = 0;
                        statsMap[source] += 1;
                        if (source && distinctSources.indexOf(source) < 0) distinctSources.push(source);
                        sourcesHtml += "&nbsp;<span class='KGmapping_distinctColumnValueSource' style='background-color:" + self.getSourceColor(source) + "'>" + source + "</span>";
                    }
                }
            } else {
                cssClass = "KGmapping_columnValues_hasCandidateValues";
            }

            if (cssClass && cssClass != "") {
                $("#KGmapping_columnValues option[value='" + value + "']").addClass(cssClass);
            }

            var html = "<div onclick='KGadvancedMapping.editCandidateValues(\"" + id + "\")' id='" + id + "' class='KGmapping_columnValue " + cssClass + "'>" + value + sourcesHtml + "</div>";
            $("#KGmapping_matrixContainer").append(html);
        });
        var column = KGmappingData.currentColumn.substring(KGmappingData.currentColumn.indexOf("."));
        var superClass = superClassDictionary.label;
        $("#advancedMappings_mappingStatsDiv").html(column + "->" + superClass + " : " + JSON.stringify(statsMap));
        KGmappingData.currentColumn = null;

        distinctSources = ["readi", "cfihos", "pca"];
        var candidateEntities = distinctSources;
        candidateEntities.splice(0, 0, "all");
        common.fillSelectOptions("KGadvancedMapping_filterCandidateMappingsSelect", candidateEntities, false);

        distinctSources.splice(0, 0, "candidates");
        distinctSources.splice(0, 0, "alphabetic");
        common.fillSelectOptions("KGmapping_distinctColumnSortSelect", distinctSources, false);
    };

    self.sortDataBySource = function (array, topSource) {
        var sources = ["pca", "cfihos", "readi"];
        if (topSource) {
            sources = common.array.moveItem(sources, sources.indexOf(topSource), sources.length - 1);
        }
        array.sort(function (a, b) {
            var aIndex = sources.indexOf(a.source);
            var bIndex = sources.indexOf(b.source);
            if (aIndex < bIndex) return 1;
            if (bIndex < aIndex) return -1;
            return 0;
        });
    };

    self.sortColumnValues = function (sortType) {
        if (!sortType) sortType = $("#KGmapping_distinctColumnSortSelect").val();
        var sortMap = {};
        for (var key in self.currentColumnValueDivIds) {
            var item = self.currentColumnValueDivIds[key];
            if (sortType.indexOf("_search_" == 0)) {
                var word = sortType.substring(8);
                if (item.value.toLowerCase().indexOf(word.toLowerCase()) > -1) sortMap["_A_" + item.value] = key;
                else sortMap["_Z_" + item.value] = key;
            } else if (sortType == "alphabetic") {
                sortMap[item.value] = key;
            } else if (sortType == "candidates") {
                if (item.isCandidate) sortMap["_A_" + item.value] = key;
                else sortMap["_Z_" + item.value] = key;
            } else {
                if (item.sources.indexOf(sortType) > -1) sortMap["_A_" + item.value] = key;
                else sortMap["_Z_" + item.value] = key;
            }
        }

        var sortArray = Object.keys(sortMap);
        sortArray.sort();
        var html = "";
        sortArray.forEach(function (item) {
            var divId = sortMap[item];
            html += $("#" + divId)[0].outerHTML;
        });
        $("#KGmapping_matrixContainer").html(html);
    };

    self.sortCandidateMappings = function (index) {
        var divList = $(".KGmapping_candidateEntity");

        divList.sort(function (a, b) {
            var aData = self.self.currentdictionaryEntryEntities[$(a).attr("id")];
            var bData = self.self.currentdictionaryEntryEntities[$(b).attr("id")];

            if (a.index == index) a = aData.sources.indexOf(source);
            b = bData.sources.indexOf(source);
            return b - a;
        });
        $("#KGadvancedMapping_dictionaryMappingContainerDiv").html(divList);
    };

    self.searchColumn = function (word) {
        self.sortColumnValues("_search_" + word);
    };

    self.editCandidateValues = function (columnValueDivId, searchedText, entity) {
        if (!columnValueDivId) columnValueDivId = self.currentColumnValueDivId;
        else self.currentColumnValueDivId = columnValueDivId;

        // var xx= self.currentColumnValueDivIds[columnValueDivId]
        var columnValue = self.currentColumnValueDivIds[columnValueDivId].value;

        $("#KGadvancedMapping_editingColumnValue").html(columnValue);
        if (!searchedText) $("#KGadvancedMapping_searchEntitiesInput").val(columnValue);

        $(".KGmapping_columnValue").removeClass("KGmapping_columnValueSelected");
        $("#" + columnValueDivId).addClass("KGmapping_columnValueSelected");

        if (!entity) entity = self.referenceDictionary[self.currentColumnClass.id].terms[columnValue.toLowerCase()];
        if (entity) {
            var keys = [];

            for (var source in entity) {
                if (keys.length == 0) keys = Object.keys(entity[source]);
            }

            var html = "";
            for (source in entity) {
                html += "<b>" + source + "</b>";

                html += "<br><table>";

                keys.forEach(function (key) {
                    var value = "" + entity[source][key];
                    if (value.indexOf("http://") == 0) value = "<a href='" + value + "' target='_blank'>" + value + "</a>";
                    html += "<tr><td>" + key + "</td><td>" + value + "</td></tr>";
                });
                html += "</table>" + "<br>";

                if (authentication.currentUser.groupes.indexOf("admin") > -1) {
                    html += "<button class='btn btn-sm my-1 py-0 btn-outline-primary'  onclick='KGadvancedMapping.deleteItemFromReferenceDictionary(\"" + entity[source].id + "\")' >Delete</button>";
                    if (entity[source].status == "CANDIDATE")
                        html +=
                            "<button class='btn btn-sm my-1 py-0 btn-outline-primary'  onclick='KGadvancedMapping.validateCandidateInReferenceDictionary(\"" +
                            entity[source].id +
                            "\")' >Validate</button>";
                }
                html += "<hr>";
            }
            $("#KGadvancedMapping_dictionaryMappingContainerDiv").html(html);
        } else {
            self.searchEntities(columnValue);
        }
    };

    self.searchEntities = function (expression, _validateClassFn) {
        var queryType = $("#KGadvancedMapping_queryTypeSelect").val();

        var queryObj;
        if (queryType == "machAnyWord") {
            queryObj = {
                bool: {
                    must: [
                        {
                            query_string: {
                                query: expression,
                                //  "default_field": "attachment.content",
                                default_operator: "OR",
                            },
                        },
                    ],
                },
            };
        } else if (queryType == "moreLikeThis") {
            queryObj = {
                more_like_this: {
                    fields: ["label"],
                    like: expression,
                    min_term_freq: 1,
                    max_query_terms: 12,
                },
            };
        }
        if (queryType == "exactMatch") {
            queryObj = {
                bool: {
                    must: [
                        {
                            query_string: {
                                query: expression,
                                default_operator: "AND",
                            },
                        },
                    ],
                },
            };
        }

        var query = {
            query: queryObj,
            from: 0,
            size: 10000,
            _source: {
                excludes: ["attachment.content"],
            },
        };
        var selectedSource = $("#KGadvancedMapping_filterCandidateMappingsSelect").val();
        if (selectedSource == "all") {
            indexes = null; // XXX was ["readi", "pca", "cfihos"];
        } else {
            indexes = [selectedSource];
        }

        ElasticSearchProxy.queryElastic(query, indexes, function (err, result) {
            if (err) return alert(err);
            var entities = [];
            result.hits.hits.forEach(function (hit) {
                var entity = {
                    index: hit._index,
                    id: hit._source.subject,
                    score: hit._score,
                    term: hit._source.label,
                };
                entities.push(entity);
            });
            var sort = $("#KGadvancedMapping_sortCandidateMappingsSelect").val();
            if (sort == "alphabetic") {
                entities = common.array.sort(entities, "term");
            }
            var html = "";
            if (entities.length == 0) html = "No similar Match";
            else {
                entities.forEach(function (entity) {
                    var id = "dictionary" + common.getRandomHexaId(5);
                    self.currentdictionaryEntryEntities[id] = entity;

                    html +=
                        "<div class='KGmapping_candidateEntity'  id='" +
                        id +
                        "'>" +
                        "<span style='background-color: " +
                        self.getSourceColor(entity.index) +
                        "' class='KGmapping_entitySource'>" +
                        entity.index +
                        "</span>" +
                        entity.term +
                        "<div>" +
                        "<button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='KGadvancedMapping.showEntityInfos(\"" +
                        id +
                        "\")'>infos</button>" +
                        "<button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='KGadvancedMapping.setAsMatchCandidate(\"" +
                        id +
                        "\")'>Select</button></div>" +
                        "</div>";
                });
            }
            $("#KGadvancedMapping_dictionaryMappingContainerDiv").html(html);
        });
    };

    self.setAsMatchCandidate = function (candidateId) {
        var candidateEntityObj = self.currentdictionaryEntryEntities[candidateId];
        $(".KGmapping_candidateEntity").removeClass("KGmapping_columnValues_isCandidate");
        $("#" + candidateId).addClass("KGmapping_columnValues_isCandidate");

        var html = "<button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='KGadvancedMapping.removeMatchCandidate(\"" + self.currentColumnValueDivId + "\")'>-</button>";
        $("#" + self.currentColumnValueDivId).prepend(html);

        $(".KGmapping_columnValue").removeClass("KGmapping_columnValueSelected");
        $("#" + self.currentColumnValueDivId).addClass("KGmapping_columnValues_isCandidate");

        var term = self.currentColumnValueDivIds[self.currentColumnValueDivId].value;
        self.matchCandidates[self.currentColumnValueDivId] = {
            superClass: self.currentColumnClass,
            target: candidateEntityObj,
            term: term,
        };
    };

    self.removeMatchCandidate = function (columnValueDivId) {
        $("#" + columnValueDivId).removeClass("KGmapping_columnValues_isCandidate");
        delete self.matchCandidates[columnValueDivId];
    };
    self.showEntityInfos = function (id) {
        var obj = self.currentdictionaryEntryEntities[id];
        var source = Config.KG.elasticIndexSourceMap[obj.index];
        SourceBrowser.showNodeInfos(source, obj.id, "mainDialogDiv");
    };

    self.beforeCloseDialog = function () {
        if (Object.keys(self.matchCandidates).length == 0) return true;
        if (confirm("leave without saving candidate mappings")) return true;
        return false;
    };
    self.validateMapping = function () {
        // var  date = (new Date()).toLocaleString("en-US")
        var date = common.dateToSQlserverString(new Date()); //  20120618 10:34:09 AM
        var sql = "";
        sql +=
            " insert into [onemodel].[dbo].[reference_dictionary]" +
            " \n" +
            "([superClassUri],[superClassLabel],[term],[score],[classUri],[classLabel],[source]," +
            "[status],[creationDate],[modifiedBy])";
        sql += " \nVALUES ";

        var index = 0;
        for (var columnValueDivId in self.matchCandidates) {
            var item = self.matchCandidates[columnValueDivId];
            var superClassLabel = self.referenceDictionary[item.superClass.id].label;

            if (index++ > 0) sql += ",\n";

            sql +=
                "('" +
                item.superClass.id +
                "','" +
                superClassLabel +
                "','" +
                item.term +
                "','" +
                item.target.score +
                "','" +
                item.target.id +
                "','" +
                item.target.term +
                "','" +
                item.target.index +
                "'" +
                ",'CANDIDATE','" +
                date +
                "','" +
                authentication.currentUser.identifiant +
                "')";
        }

        self.executeSqlserverQuery(sql, KGmappingData.currentKGdataSource, function (err, _result) {
            if (err) return alert(err.toString());
            self.matchCandidates = {};
            return alert("Candidates mapping are registered");
        });
    };

    self.deleteItemFromReferenceDictionary = function (refDictId) {
        if (!confirm("Confirm delete entry from reference dictionary")) return;
        var sql = " delete from [onemodel].[dbo].[reference_dictionary] where id='" + refDictId + "'";
        self.executeSqlserverQuery(sql, KGmappingData.currentKGdataSource, function (err, _result) {
            if (err) return alert(err.toString());
            return MainController.UI.message(" reference dictionary modified");
        });
    };
    self.validateCandidateInReferenceDictionary = function (refDictId) {
        var sql = " update  [onemodel].[dbo].[reference_dictionary] set status='REFERENCE' where id='" + refDictId + "'";
        self.executeSqlserverQuery(sql, KGmappingData.currentKGdataSource, function (err, _result) {
            if (err) return alert(err.toString());
            return MainController.UI.message(" reference dictionary modified");
        });
    };

    self.executeSqlserverQuery = function (sql, datasource, callback) {
        const params = new URLSearchParams({
            dbName: datasource.dbName,
            type: datasource.type,
            sqlQuery: sql,
        });

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "?" + params.toString(),
            dataType: "json",

            success: function (data, _textStatus, _jqXHR) {
                callback(null, data);
            },
            error: function (err) {
                callback(err);
            },
        });
    };

    /*************************************************************************************************************************************/

    self.exportMappings = function () {
        var columns = [];
        var data = [];

        for (var id in self.currentColumnValueDivIds) {
            var obj = self.currentColumnValueDivIds[id];
            var entities = obj.entities;
            var term = obj.value;
            var line = { term: term, entities: {}, isCandidate: obj.isCandidate };
            if (entities) {
                for (var key in entities) {
                    if (columns.indexOf(key) < 0) columns.push(key);
                    line.entities = entities;
                }
            }

            data.push(line);
        }

        var dataTableCols = [];
        dataTableCols.push({ title: "source_label", defaultContent: "" });
        dataTableCols.push({ title: "isONE_MODELcandidate", defaultContent: "" });

        columns.forEach(function (col) {
            dataTableCols.push({ title: col + "_label", defaultContent: "" });
            dataTableCols.push({ title: col + " _uri", defaultContent: "" });
        });

        var dataTableRows = [];
        data.forEach(function (item) {
            var line = [item.term];
            if (item.isCandidate) line.push("X");
            else line.push("");
            columns.forEach(function (col) {
                if (item.entities[col]) {
                    line.push(item.entities[col].classLabel);
                    line.push(item.entities[col].classUri);
                } else {
                    line.push("");
                    line.push("");
                }
            });
            dataTableRows.push(line);
        });

        dataTableRows.sort(function (a, b) {
            if (a[0] > b[0]) return 1;
            if (b[0] > a[0]) return -1;
            return 0;
        });

        $("#mainDialogDiv").dialog("open");

        $("#mainDialogDiv").html("<table id='dataTableDiv'></table>");
        setTimeout(function () {
            MainController.UI.message("", true);
            $("#dataTableDiv").DataTable({
                data: dataTableRows,
                columns: dataTableCols,
                // async: false,
                pageLength: 15,
                dom: "Bfrtip",
                buttons: ["copy", "csv", "excel", "pdf", "print"],
            }),
                500;
        });
    };

    self.standardizeValues = function (_callback) {
        window.open(window.location.href + "?x=3", "SLSV_standardizer");
        setTimeout(function () {
            KGadvancedMapping.getColumnDistinctValues(KGmappingData.currentColumn, function (_err, result) {
                broadcastChannel.postMessage({ initStandardizerWords: result });
            });
        }, 500);

        return;
    };
    return self;
})();
