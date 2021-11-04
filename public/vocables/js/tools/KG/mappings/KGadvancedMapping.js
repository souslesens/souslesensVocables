var KGadvancedMapping = (function () {

        var self = {}
        self.dictionaries = {}
        KGmappingData.currentColumnDistinctValues = [];
        self.currentdictionaryEntryEntities = {};
        self.matchCandidates = {}

        var sourceColors = {}

        self.loadSuperClasses = function () {
            var column = "*";
            var table = "[onemodel].[dbo].[superClasses]"
            var sqlQuery = " select distinct " + column + " from " + table;//+ " limit " + Config.KG.maxDistinctValuesForAdvancedMapping;
            self.executeSqlserverQuery(sqlQuery, {dbName: "onemodel", type: "sql.sqlserver"}, function (err, data) {
                if (err) {
                    alert(err.responseText)
                    return MainController.UI.message(err.responseText)
                }

                self.referenceDictionary = {}

                var topTypesMap = {
                    "REFERENCE": "ONE-MODEL-superClasses",
                    "NO-SUBCLASSES": "ONE-MODEL-informationObjects",
                    "ARDL-SPECIFIC": "ONE-MODEL-ARDL-specific",

                }
                KGbrowserCustom.initsuperClassesPalette()
                var typesMap = {}
                data.forEach(function (item, index) {

                    if (!typesMap[item.type]) {
                        typesMap[item.type] = []
                    }
                    typesMap[item.type].push(item)

                })

                var dictionaryJsTreeData = []
                for (var type in typesMap) {
                    var dicName = topTypesMap[type]
                    dictionaryJsTreeData.push({
                        id: type,
                        text: dicName,
                        type: "OWL",
                        parent: "#"
                    })

                    typesMap[type].forEach(function (item) {
                        var group = KGbrowserCustom.superClassesMap[item.superClassUri].group
                        self.referenceDictionary[item.superClassUri] = {
                            uri: item.superClassUri,
                            label: item.superClassLabel,
                            terms: {},
                            type: type
                        }

                        dictionaryJsTreeData.push({
                            id: item.superClassUri,
                            text: item.superClassLabel,
                            type: group,
                            parent: type,
                            data: {
                                id: item.superClassUri,
                                label: item.superClassLabel,
                            }
                        })
                    })
                }


                var optionsClass = {
                    selectTreeNodeFn: KGmappings.selectTreeNodeFn,
                    openAll: true,
                    searchPlugin: {
                        "case_insensitive": true,
                        "fuzzy": false,
                        "show_only_matches": true
                    },

                    contextMenu: KGmappings.contextMenuFn("KGmappings_OneModelTree")
                }
                common.jstree.loadJsTree("KGmappings_OneModelTree", dictionaryJsTreeData, optionsClass)


            })
        }
        self.loadReferenceDictionary = function (superClassId, forceReload, callback) {

            if (!self.referenceDictionary || !self.referenceDictionary[superClassId])
                return alert("no dictionary for superClass " + superClassId)
            var terms = self.referenceDictionary[superClassId].terms;
            if (!forceReload && Object.keys(terms).length > 0)
                return self.referenceDictionary[superClassId]


            var column = "*";
            var table = "[onemodel].[dbo].[reference_dictionary]"
            var where = " where superClassUri='" + superClassId + "'"
            var sqlQuery = " select distinct " + column + " from " + table + where;//+ " limit " + Config.KG.maxDistinctValuesForAdvancedMapping;
            self.executeSqlserverQuery(sqlQuery, {dbName: "onemodel", type: "sql.sqlserver"}, function (err, data) {
                if (err) {
                    alert(err.responseText)
                    return MainController.UI.message(err.responseText)

                }

                data.forEach(function (item, index) {


                    if (item.term) {
                        if (!self.referenceDictionary[item.superClassUri].terms[item.term.toLowerCase()])
                            self.referenceDictionary[item.superClassUri].terms[item.term.toLowerCase()] = {}
                        if (!self.referenceDictionary[item.superClassUri].terms[item.term.toLowerCase()][item.source])
                            self.referenceDictionary[item.superClassUri].terms[item.term.toLowerCase()][item.source] = item
                        // self.referenceDictionary[item.superClassUri].terms[item.term.toLowerCase()]=item
                    }
                    if (item.type != "REFERENCE" && item.type != "CANDIDATE") {
                        self.referenceDictionary[item.superClassUri].noSubClasses = true
                    }
                })
                callback()


            })
        }

        self.getColumnDistinctValues = function (columnClassId, callback) {
            var obj = common.deconcatSQLTableColumn(KGmappingData.currentColumn)
            var column = obj.column;
            var table = "[" + KGmappingData.currentKGdataSource.dbName + "]." + obj.table;

            var sqlQuery = " select count( distinct [" + column + "]) as count from " + table;
            self.executeSqlserverQuery(sqlQuery, KGmappingData.currentKGdataSource, function (err, data) {
                if (err) {
                    callback(err)
                }

                var count = data[0].count
                if (count > Config.KG.maxDistinctValuesForAdvancedMapping)
                    return alert("Too many distinct values for column " + column + " : " + count + " mapping impossible max :" + Config.KG.maxDistinctValuesForAdvancedMapping)

                var sqlQuery = " select distinct " + column + " from " + table + " limit " + Config.KG.maxDistinctValuesForAdvancedMapping;
                if (KGmappingData.currentKGdataSource.type == "sql.sqlserver")
                    sqlQuery = " select  distinct top(10000) [" + column + "] from " + table;

                self.executeSqlserverQuery(sqlQuery, KGmappingData.currentKGdataSource, function (err, data) {
                    if (err) {
                        callback(err)
                    }

                    if (data.length >= Config.KG.maxDistinctValuesForAdvancedMapping)
                        callback(" too many distinct values :" + data.length)

                    KGmappingData.currentColumnDistinctValues = [];
                    var colName = common.deconcatSQLTableColumn(KGmappingData.currentColumn).column

                    data.forEach(function (item) {
                        if (item[colName])
                            KGmappingData.currentColumnDistinctValues.push(item[colName])
                    })
                    callback(null, KGmappingData.currentColumnDistinctValues)


                })


            })
        }


        self.showAdvancedMappingDialog = function (dictionary, columnClassId) {
            $("#waitImg").css("display", "block")
            MainController.UI.message("Loading distinct values for column " + KGmappingData.currentColumn)
            var type = self.referenceDictionary[columnClassId].type
            if (type != "REFERENCE" && type != "CANDIDATE") {
                return;
            }
            KGadvancedMapping.loadReferenceDictionary(columnClassId, true, function (err, result) {
                    if (err)
                        alert(err)

                    self.getColumnDistinctValues(columnClassId, function (err, result) {

                        if (err)
                            return alert(err)
                        $("#KGmappings_AdvancedMappingDialogDiv").load("snippets/KG/KGmappingAdvancedMappingDialog.html");
                        $("#KGmappings_AdvancedMappingDialogDiv").dialog("open")

                        setTimeout(function () {
                            MainController.UI.message("", true)
                            $("#KGmappingData_column").html(KGmappingData.currentColumn)
                            self.setDictionaryMappings(dictionary, columnClassId, KGmappingData.currentColumnDistinctValues)
                        }, 200)


                    })
                }
            )
        }
        self.getSourceColor = function (source) {
            if (!sourceColors[source])
                sourceColors[source] = Config.KG.palette[Object.keys(sourceColors).length]
            return sourceColors[source]
        }

        self.setDictionaryMappings = function (dictionary, columnClassId, columnValues) {
            var statsMap = {"total": 0, "candidates": 0}
            self.currentColumnClass = {id: columnClassId}
            var superClassDictionary = self.referenceDictionary[columnClassId];
            if (!superClassDictionary)
                return alert("no dictionary exists for class " + columnClassId)


            $(".dataSample_type").removeClass("datasample_type_selected")
            self.currentColumnValueDivIds = {}
            var distinctSources = []
            columnValues.forEach(function (value) {

                var value2 = value.toLowerCase().trim();//.replace(/\-/g," ")
                var cssClass = null;
                var termObj = superClassDictionary.terms[value2];
                var sourcesHtml = ""
                statsMap["total"] += 1
                var id = "columnValue" + common.getRandomHexaId(5)
                self.currentColumnValueDivIds[id] = {value: value, sources: [], entities: termObj}
                if (termObj) {
                    var isCandidate = false

                    cssClass = "KGmapping_columnValues_referenceValue"
                    for (var source in termObj) {
                        self.currentColumnValueDivIds[id].sources.push(source)
                        if (termObj[source].status == "CANDIDATE") {
                            statsMap["candidates"] += 1
                            cssClass = "KGmapping_columnValues_isCandidate"
                            self.currentColumnValueDivIds[id].isCandidate = true;
                        } else {
                            if (!statsMap[source])
                                statsMap[source] = 0
                            statsMap[source] += 1
                            if (source && distinctSources.indexOf(source) < 0)
                                distinctSources.push(source)
                            sourcesHtml += "&nbsp;<span class='KGmapping_distinctColumnValueSource' style='background-color:" + self.getSourceColor(source) + "'>" + source + "</span>";

                        }
                    }


                } else {
                    cssClass = "KGmapping_columnValues_hasCandidateValues"
                }


                if (cssClass && cssClass != "") {
                    $("#KGmapping_columnValues option[value='" + value + "']").addClass(cssClass);

                }

                var html = "<div onclick='KGadvancedMapping.editCandidateValues(\"" + id + "\")' id='" + id + "' class='KGmapping_columnValue " + cssClass + "'>" + value + sourcesHtml + "</div>";
                $("#KGmapping_matrixContainer").append(html)


            })
            var column = KGmappingData.currentColumn.substring(KGmappingData.currentColumn.indexOf("."))
            var superClass = superClassDictionary.label
            $("#advancedMappings_mappingStatsDiv").html(column + "->" + superClass + " : " + JSON.stringify(statsMap));
            KGmappingData.currentColumn = null;


            distinctSources = ["readi", "cfihos", "pca"]
            var candidateEntities = distinctSources
            candidateEntities.splice(0, 0, "all")
            common.fillSelectOptions("KGadvancedMapping_filterCandidateMappingsSelect", candidateEntities, false)

            distinctSources.splice(0, 0, "candidates")
            distinctSources.splice(0, 0, "alphabetic")
            common.fillSelectOptions("KGmapping_distinctColumnSortSelect", distinctSources, false)

        }


        self.sortDataBySource = function (array, topSource) {
            var sources = ["pca", "cfihos", "readi"]
            if (topSource) {

                sources = common.array.moveItem(sources, sources.indexOf(topSource), sources.length - 1)
            }
            array.sort(function (a, b) {
                var aIndex = sources.indexOf(a.source)
                var bIndex = sources.indexOf(b.source)
                if (aIndex < bIndex)
                    return 1;
                if (bIndex < aIndex)
                    return -1;
                return 0;
            })

        }

        self.sortColumnValues = function (sortType) {
            if (!sortType)
                sortType = $("#KGmapping_distinctColumnSortSelect").val()
            var sortMap = {};
            for (var key in self.currentColumnValueDivIds) {
                var item = self.currentColumnValueDivIds[key]
                if (sortType.indexOf("_search_" == 0)) {
                    var word = sortType.substring(8)
                    if (item.value.toLowerCase().indexOf(word.toLowerCase()) > -1)
                        sortMap["_A_" + item.value] = key;
                    else
                        sortMap["_Z_" + item.value] = key

                } else if (sortType == "alphabetic") {
                    sortMap[item.value] = key

                } else if (sortType == "candidates") {
                    if (item.isCandidate)
                        sortMap["_A_" + item.value] = key
                    else
                        sortMap["_Z_" + item.value] = key
                } else {
                    if (item.sources.indexOf(sortType) > -1)
                        sortMap["_A_" + item.value] = key
                    else
                        sortMap["_Z_" + item.value] = key
                }
            }

            var sortArray = Object.keys(sortMap);
            sortArray.sort()
            var html = ""
            sortArray.forEach(function (item) {
                var divId = sortMap[item]
                var x = $("#" + divId)
                html += $("#" + divId)[0].outerHTML
            })
            $("#KGmapping_matrixContainer").html(html);

        }


        self.sortCandidateMappings = function (index) {
            var divList = $(".KGmapping_candidateEntity");

            divList.sort(function (a, b) {
                var aData = self.self.currentdictionaryEntryEntities[$(a).attr("id")]
                var bData = self.self.currentdictionaryEntryEntities[$(b).attr("id")]

                if (a.index == index)
                    var a = aData.sources.indexOf(source)
                var b = bData.sources.indexOf(source)
                if (!aData.sources)
                    var x = 3
                return b - a;
                if (a >= 0 && b < 0)
                    return -1;
                if (b >= 0 && a < 0)
                    return -1;
                return 0;


            });
            $("#KGadvancedMapping_dictionaryMappingContainerDiv").html(divList);

        }


        self.searchColumn = function (word) {
            self.sortColumnValues("_search_" + word)
        }


        self.editCandidateValues = function (columnValueDivId, searchedText, entity) {
            if (!columnValueDivId)
                columnValueDivId = self.currentColumnValueDivId;
            else
                self.currentColumnValueDivId = columnValueDivId;

            // var xx= self.currentColumnValueDivIds[columnValueDivId]
            var columnValue = self.currentColumnValueDivIds[columnValueDivId].value


            $("#KGadvancedMapping_editingColumnValue").html(columnValue)
            if (!searchedText)
                $("#KGadvancedMapping_searchEntitiesInput").val(columnValue)


            $(".KGmapping_columnValue").removeClass("KGmapping_columnValueSelected")
            $("#" + columnValueDivId).addClass("KGmapping_columnValueSelected")

            if (!entity)
                entity = self.referenceDictionary[self.currentColumnClass.id].terms[columnValue.toLowerCase()]
            /* var html = JSON.stringify(entities, null, 2)
           */
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
                            value = "<a href='" + value + "' target='_blank'>" + value + "</a>"
                        html += "<tr><td>" + key + "</td><td>" + value + "</td></tr>"
                    })
                    html += "</table>" +
                        "<br>"

                    if (authentication.currentUser.groupes.indexOf("admin") > -1) {
                        html += "<button  onclick='KGadvancedMapping.deleteItemFromReferenceDictionary(\"" + entity[source].id + "\")' >Delete</button>"
                        if (entity[source].status == "CANDIDATE")
                            html += "<button  onclick='KGadvancedMapping.validateCandidateInReferenceDictionary(\"" + entity[source].id + "\")' >Validate</button>"
                    }
                    html += "<hr>"

                }
                $("#KGadvancedMapping_dictionaryMappingContainerDiv").html(html)

            } else {
                self.searchEntities(columnValue)
                // });


            }


        }

        self.searchEntities = function (expression, validateClassFn) {
            var queryType = $("#KGadvancedMapping_queryTypeSelect").val()
            /*  var expression = columnValue;// columnValue.replace(/ /g, "/")
              if (searchedText)
                  expression = searchedText*/


            var queryObj;
            if (queryType == "machAnyWord") {
                queryObj = {
                    "bool": {
                        "must": [
                            {
                                "query_string": {
                                    "query": expression,
                                    //  "default_field": "attachment.content",
                                    "default_operator": "OR"
                                }
                            }
                        ]
                    }
                }
            } else if (queryType == "moreLikeThis") {
                var queryObj = {
                    "more_like_this": {
                        "fields": ["label"],
                        "like": expression,
                        "min_term_freq": 1,
                        "max_query_terms": 12
                    }
                }
            }
            if (queryType == "exactMatch") {
                queryObj = {
                    "bool": {
                        "must": [
                            {
                                "query_string": {
                                    "query": expression,
                                    // "default_field": "attachment.content",
                                    "default_operator": "AND"
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
            var indexes = ["readi", "pca", "cfihos"]
            //   var indexes = $('#KGMappingAdvancedMappings_sourcesTree').jstree(true).get_checked();
            var selectedSource = $("#KGadvancedMapping_filterCandidateMappingsSelect").val()
            if (selectedSource != "all")
                indexes = [selectedSource]

            ElasticSearchProxy.queryElastic(query, indexes, function (err, result) {
                if (err)
                    return alert(err)
                var entities = []
                result.hits.hits.forEach(function (hit) {
                    var entity = {
                        index: hit._index,
                        id: hit._source.subject,
                        score: hit._score,
                        term: hit._source.label
                    }
                    entities.push(entity)
                })
                var sort = $("#KGadvancedMapping_sortCandidateMappingsSelect").val();
                if (sort == "alphabetic") {
                    entities = common.array.sort(entities, "term")

                }
                var html = ""
                if (entities.length == 0)
                    html = "No similar Match"
                else {
                    entities.forEach(function (entity) {
                        var id = "dictionary" + common.getRandomHexaId(5)
                        self.currentdictionaryEntryEntities[id] = entity

                        html += "<div class='KGmapping_candidateEntity'  id='" + id + "'>" +
                            "<span style='background-color: " + self.getSourceColor(entity.index) + "' class='KGmapping_entitySource'>" + entity.index + "</span>" +
                            entity.term +
                            "<div>" +
                            "<button onclick='KGadvancedMapping.showEntityInfos(\"" + id + "\")'>infos</button>" +
                            "<button onclick='KGadvancedMapping.setAsMatchCandidate(\"" + id + "\")'>Select</button></div>" +
                            "</div>"

                    })
                }
                $("#KGadvancedMapping_dictionaryMappingContainerDiv").html(html)

            })
        }


        self.setAsMatchCandidate = function (candidateId) {

            if (self.setAsMatchCandidateExternalFn)
                ;// return   self.setAsMatchCandidateExternalFn(candidateId)


            var candidateEntityObj = self.currentdictionaryEntryEntities[candidateId]
            $(".KGmapping_candidateEntity").removeClass("KGmapping_columnValues_isCandidate")
            $("#" + candidateId).addClass("KGmapping_columnValues_isCandidate")


            var html = "<button onclick='KGadvancedMapping.removeMatchCandidate(\"" + self.currentColumnValueDivId + "\")'>-</button>"
            $("#" + self.currentColumnValueDivId).prepend(html)


            $(".KGmapping_columnValue").removeClass("KGmapping_columnValueSelected")
            $("#" + self.currentColumnValueDivId).addClass("KGmapping_columnValues_isCandidate")

            var term = self.currentColumnValueDivIds[self.currentColumnValueDivId].value
            self.matchCandidates[self.currentColumnValueDivId] = {
                superClass: self.currentColumnClass,
                target: candidateEntityObj,
                term: term
            }

        }


        self.removeMatchCandidate = function (columnValueDivId) {
            $("#" + columnValueDivId).removeClass("KGmapping_columnValues_isCandidate")
            delete self.matchCandidates[columnValueDivId]

        }
        self.showEntityInfos = function (id) {
            var obj = self.currentdictionaryEntryEntities[id]
            var source = Config.KG.elasticIndexSourceMap[obj.index]
            SourceBrowser.showNodeInfos(source, obj.id, "mainDialogDiv")
        }


        self.beforeCloseDialog = function () {

            if (Object.keys(self.matchCandidates).length == 0)
                return true
            if (confirm("leave without saving candidate mappings"))
                return true;
            return false;


        }
        self.validateMapping = function () {

            // var  date = (new Date()).toLocaleString("en-US")
            var date = common.dateToSQlserverString(new Date())  //  20120618 10:34:09 AM
            var sql = ""
            sql += " insert into [onemodel].[dbo].[reference_dictionary]" + " \n" +

                "([superClassUri],[superClassLabel],[term],[score],[classUri],[classLabel],[source]," +
                "[status],[creationDate],[modifiedBy])"
            sql += " \nVALUES "

            var index = 0
            for (var columnValueDivId in self.matchCandidates) {
                var item = self.matchCandidates[columnValueDivId]
                var superClassLabel = self.referenceDictionary[item.superClass.id].label

                if (index++ > 0)
                    sql += ",\n"

                sql += "('" + item.superClass.id + "','" + superClassLabel + "','" + item.term + "','" + item.target.score + "','" + item.target.id + "','" + item.target.term + "','" + item.target.index + "'" +
                    ",'CANDIDATE','" + date + "','" + authentication.currentUser.identifiant + "')"


            }


            self.executeSqlserverQuery(sql, KGmappingData.currentKGdataSource, function (err, result) {
                if (err)
                    return alert(err.toString())
                self.matchCandidates = {}
                return alert("Candidates mapping are registered")

            })


        }


        self.deleteItemFromReferenceDictionary = function (refDictId) {
            if (!confirm("Confirm delete entry from reference dictionary"))
                return;
            var sql = " delete from [onemodel].[dbo].[reference_dictionary] where id='" + refDictId + "'";
            self.executeSqlserverQuery(sql, KGmappingData.currentKGdataSource, function (err, result) {
                if (err)
                    return alert(err.toString())
                return MainController.UI.message(" reference dictionary modified")

            })

        }
        self.validateCandidateInReferenceDictionary = function (refDictId) {
            var sql = " update  [onemodel].[dbo].[reference_dictionary] set status='REFERENCE' where id='" + refDictId + "'";
            self.executeSqlserverQuery(sql, KGmappingData.currentKGdataSource, function (err, result) {
                if (err)
                    return alert(err.toString())
                return MainController.UI.message(" reference dictionary modified")

            })
        }

        self.executeSqlserverQuery = function (sql, datasource, callback) {
            $.ajax({
                type: "POST",
                url: Config.serverUrl,
                data: {
                    KGquery: 1,
                    getData: 1,
                    dataSource: JSON.stringify(datasource),
                    sqlQuery: sql
                },
                dataType: "json",

                success: function (data, textStatus, jqXHR) {
                    callback(null, data)
                }
                , error: function (err) {
                    callback(err)


                }
            })
        }

        /*************************************************************************************************************************************/


        self.exportMappings = function () {
            var columns = []
            var data = []
            var sourcesMap = {}
            var exportAncestors = false;//$("#Standardizer_exportAncestorsCBX").prop("checked")

            for (var id in self.currentColumnValueDivIds) {

                var obj = self.currentColumnValueDivIds[id]
                var entities = obj.entities;
                var term = obj.value
                var line = {term: term, entities: {}, isCandidate: obj.isCandidate}
                if (entities) {
                    for (var key in entities) {
                        if (columns.indexOf(key) < 0)
                            columns.push(key)
                        line.entities = entities

                    }
                }

                data.push(line)
            }


            var dataTableCols = []
            dataTableCols.push({title: "source_label", "defaultContent": ""})
            dataTableCols.push({title: "isONE_MODELcandidate", "defaultContent": ""})

            columns.forEach(function (col) {
                dataTableCols.push({title: col + "_label", "defaultContent": ""})
                dataTableCols.push({title: col + " _uri", "defaultContent": ""})
            })

            var dataTableRows = []
            data.forEach(function (item) {
                var line = [item.term]
                if (item.isCandidate)
                    line.push("X");
                else
                    line.push("");
                columns.forEach(function (col) {
                    if (item.entities[col]) {
                        line.push(item.entities[col].classLabel)
                        line.push(item.entities[col].classUri)
                    } else {
                        line.push("")
                        line.push("")
                    }

                })
                dataTableRows.push(line)
            })

            dataTableRows.sort(function (a, b) {
                if (a[0] > b[0])
                    return 1
                if (b[0] > a[0])
                    return -1
                return 0;
            })


            $('#mainDialogDiv').dialog("open")

            $('#mainDialogDiv').html("<table id='dataTableDiv'></table>");
            setTimeout(function () {
                MainController.UI.message("", true)
                $('#dataTableDiv').DataTable({
                    data: dataTableRows,
                    columns: dataTableCols,
                    // async: false,
                    "pageLength": 15,
                    dom: 'Bfrtip',
                    buttons: [
                        'copy', 'csv', 'excel', 'pdf', 'print'
                    ]


                })
                    , 500
            })


        }


        self.findBestMatches = function () {
            if (!KGmappingData.currentColumn)
                return alert("no column selected")
            var words = [];
            var indexes = []
            self.classUriLabelMap = {}
            var searchResultArray = []
            var classUris = []
            var nodes = {}
            var orphans = []
            var treemapData = {}
            var distinctParentsMap = {}
            var allWords
            async.series([
                function (callbackSeries) {// get words
                    KGadvancedMapping.getColumnDistinctValues(KGmappingData.currentColumn, function (err, result) {
                        if (err)
                            return callbackSeries(err)
                        words = result;
                        allWords=JSON.parse(JSON.stringify(words))
                        callbackSeries();
                    })
                }
                , function (callbackSeries) {//get indexes to compare
                    Standardizer.initSourcesIndexesList({schemaType: "OWL"}, function (err, result) {
                        if (err)
                            return callbackSeries(err)
                        result.forEach(function (item) {
                            indexes.push(item.toLowerCase())
                        })

                        callbackSeries();
                    })
                }
                , function (callbackSeries) {//get indexes matches class map
                    MainController.UI.message("matching " + words.length + "words")
                    var resultSize = 1
                    var size = 200;
                    var offset = 0
                    var totalProcessed = 0


                 /*   var wordSlices = common.array.slice(words, size)
                    async.eachSeries(wordSlices, function (slice, callbackEach) {*/

                        Standardizer.getElasticSearchExactMatches(words, indexes, 0, size, function (err, result) {
                            if (err)
                                return callbackSeries(err)
                            resultSize = result.length;
                            offset += size
                            searchResultArray =  result;
                            MainController.UI.message("matches found :" +  searchResultArray.length)
                            callbackSeries()
                        })
                    /*   }, function (err) {
                       if (err)
                           return callbackSeries(err)
                       searchResultArray = allResults;


                       return callbackSeries()
                      indexClassMap = Standardizer.getMatchesClassesByIndex(allResults)
                          MainController.UI.message("", true)
                          callbackSeries()*/
                   // })
                }
                , function (callbackSeries) {// get labels and stats

                    var indexes = []
                    var distinctHits = []

                    searchResultArray.forEach(function (item,itemIndex) {
                        if (item.hits && item.hits.hits && item.hits.hits.length==0)
                          orphans.push(allWords[itemIndex])
                        var hits = item.hits.hits;

                        hits.forEach(function (hit) {


                            if(hit._source.id== "http://w3id.org/readi/rdl/CFIHOS-30000128")
                                var x=3
                            if (distinctHits.indexOf(hit._source.label) < 0)
                                distinctHits.push(hit._source.label)

                            if (indexes.indexOf(hit._index) < 0)
                                indexes.push(hit._index)
                            var parentsStr = hit._source.parents

                            if (parentsStr) {

                                var lastParent
                                var parents = parentsStr.substring(0, parentsStr.length - 1).split("|")

                                if (!distinctParentsMap[parentsStr])
                                    distinctParentsMap[parentsStr]=[]

                                var ancestors=[]
                                parents.forEach(function (itemParent, index) {
                                    ancestors.push(itemParent)
                                    if (classUris.indexOf(itemParent) < 0)
                                        classUris.push(itemParent)
                                    var parent = hit._index


                                    if (index > 0)
                                        parent = parents[index - 1]


                                    if (!nodes[itemParent]) {
                                        nodes[itemParent] = {
                                            id: itemParent,
                                            parent: parent,
                                            index: hit._index,
                                            classes: [],
                                            ancestors:ancestors,
                                            countChildren:0
                                        }


                                    }
                                    lastParent = itemParent

                                })


                                if (nodes[lastParent].classes.indexOf(hit._source.id) < 0)
                                    nodes[lastParent].classes.push(hit._source.id)
                                classUris.push(hit._source.id)

                            }
                        })


                    })
                    var hierarchy={}
                    for( var parent in nodes){
                        if(nodes[parent].classes && nodes[parent].classes.length>0){
                            nodes[parent].countChildren=nodes[parent].classes.length
                            var ancestors=nodes[parent].ancestors
                          for(var i=ancestors.length-2;i>=0;i--){
                              nodes[ancestors[i]].countChildren+=nodes[ancestors[i+1]].countChildren

                          }

                        }

                    }


                    callbackSeries()
                }




                , function (callbackSeries) { //get labels
                    Standardizer.getClassesLabels(classUris, indexes, function (err, result) {
                        self.classUriLabelMap = result;
                        callbackSeries()
                    })
                }


                , function (callbackSeries) {//get treemap data

                    var hierarchy={name:"bestMatch",children:[]};
                    var distinctNodes={}
                    for( var parent in nodes){
                            var ancestors=nodes[parent].ancestors
                        var previousChildObj=null;
                            for(var i=ancestors.length-1;i>=0;i--){
                                var ancestorObj= nodes[ancestors[i]]
                                var currentChildObj=distinctNodes[ancestorObj.id]
                                if(!currentChildObj){
                                    currentChildObj = {
                                        name: self.classUriLabelMap[ancestorObj.id] ||  ancestorObj.id,
                                        id: ancestorObj.id,
                                        size: ancestorObj.countChildren,
                                        children: []
                                    }
                                    distinctNodes[ancestorObj.id] = currentChildObj;
                                }else {
                                    currentChildObj.size += ancestorObj.size;
                                }

                                if(i==ancestors.length-1 && !previousChildObj)
                                            previousChildObj=currentChildObj

                                    else {
                                            currentChildObj.children.push(JSON.parse(JSON.stringify(previousChildObj)))
                                            previousChildObj =currentChildObj
                                        }


                                }



                        hierarchy.children.push(previousChildObj)

                        }



                    return callbackSeries()
                    var parentsToTree = function (array) {
                        const nest = (items, id = null, link = 'id') =>
                            items
                                .filter(item => item[link] === id)
                                .map(item => ({...item, children: nest(items, item.id)}));


                        return nest(array)


                    }
                    var targetArray=[]
                    var distinctPaths=[]
                 for(var str  in   distinctParentsMap) {

                     distinctPaths.forEach(function (path) {

                         var parents = str.substring(0, parentsStr.length - 1).split("|")

                     })

                 }



                        //console.log(JSON.stringify( distinctHits,null,2))
                    callbackSeries()
                }

                , function (callbackSeries) { //draw graph

                    var visjsData = {edges: [], nodes: []}
                      visjsData.nodes.push({
                           id: "#",
                           label: "#",
                           shape: "star"

                       })
                    var existingNodes = {}
                    for (var key in nodes) {


                        var node = nodes[key]

                        var color = Lineage_classes.getSourceColor(node.index)

                        if (!existingNodes[node.index]) {
                            existingNodes[node.index] = 1
                            visjsData.nodes.push({
                                id: node.index,
                                label: node.index,
                                shape: "ellipse",
                                color: color

                            })
                            var edgeId = node.index + "_#"
                            if (!existingNodes[edgeId]) {
                                existingNodes[edgeId] = 1
                                visjsData.edges.push({
                                    from: node.index,
                                    to: "#",

                                })
                            }
                        }

                        if (!existingNodes[node.id]) {
                            existingNodes[node.id] = 1
                            visjsData.nodes.push({
                                id: node.id,
                                label: self.classUriLabelMap[node.id],
                                color: color,
                                shape:"dot",
                                //  size: 8,

                                data: {
                                    id: node.id,
                                    label: self.classUriLabelMap[node.id],
                                    classes: node.classes,
                                    countChildren: node.countChildren
                                }
                            })


                            var edgeId = node.parent + "_" + node.id
                            if (!existingNodes[edgeId]) {
                                existingNodes[edgeId] = 1
                                visjsData.edges.push({
                                    from: node.id,
                                    to: node.parent,

                                })
                            }


                        }
                    }

                    visjsData.nodes.forEach(function (node) {

                        if (node.data && node.data.classes && node.data.classes.length > 0) {
                            var value = node.data.classes.length
                            node.value = value
                            node.shape = "square"
                        } else {

                            node.value = node.countChildren
                          //  node.shape = "dot"
                        }
                    })


                    var orphansNode = {
                        id: "orphans",
                        text: "orphans",
                        shape: "square",
                        color: "#ddd",
                        size: 20,
                        data: {
                            id: "orphans",
                            text: "orphans",
                            words: orphans
                        }

                    }

                    visjsData.nodes.push(orphansNode)


                    var html = "<div style='display: flex;flex-direction:row';width:100%;height:100%>" +
                        "<div id='bestMatchesGraphDiv' style='width:800px;height:800px'></div>" +
                        "<div id='bestMatchesInfosDiv' style='width:200px;height:100%'></div>" +
                        "</div>"

                    $("#mainDialogDiv").dialog("open");

                    $("#mainDialogDiv").html(html)
                    setTimeout(function () {

                        var options = {
                            onclickFn: KGadvancedMapping.bestMatches.onGraphNodeClick,

                            nodes: {

                                    scaling: {
                                    customScalingFunction: function (min, max, total, value) {
                                        return value / total;
                                    },
                                    min: 5,
                                        max: 150,
                                },
                            },
                            layoutHierarchical : {
                                direction: "UD",
                                sortMethod: "hubsize",

                            }
                        }


                        visjsGraph.draw("bestMatchesGraphDiv", visjsData, options)
                    }, 500)

                    callbackSeries();


                }
            ], function (err) {
                return "DONE"
            })


        }
        self.bestMatches = {
            onGraphNodeClick: function (node, point, options) {
                if(!node || !node.data)
                    return;
                var html = "<div><a target ='blank' href='" + node.data.id + "'>" + node.data.label + "</a></div>"
                html += "<ul>"
                if (node.data.classes) {
                    node.data.classes.forEach(function (classUri) {
                        var classLabel = self.classUriLabelMap[classUri]
                        html += "<li><a target ='blank' href='" + classUri + "'>" + classLabel + "</a></li>"
                    })
                }

                if (node.data.words) {
                    node.data.words.forEach(function (word) {

                        html += "<li>" + word + "</li>"
                    })
                }

                html += "</ul>"
                $("#bestMatchesInfosDiv").html(html)
            }

        }


        return self;


    }
)
()