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
                self.matchCandidates = {}
                self.assignConditionalTypeOn = true;
                self.mappedValues = {}
                var obj = common.deconcatSQLTableColumn(KGmappingData.currentColumn)
                var column = obj.column;
                var table = "[" + KGmappingData.currentKGdataSource.dbName + "]." + obj.table;

                var sqlQuery = " select count( distinct [" + column + "]) as count from " + table;
                self.executeSqlserverQuery(sqlQuery, KGmappingData.currentKGdataSource, function (err, data) {
                    if (err) {
                        alert(err.responseText)
                        return MainController.UI.message(err.responseText)
                    }

                    var count = data[0].count
                    if (count > Config.KG.maxDistinctValuesForAdvancedMapping)
                        return alert("Too many distinct values for column " + column + " : " + count + " mapping impossible max :" + Config.KG.maxDistinctValuesForAdvancedMapping)

                    var sqlQuery = " select distinct " + column + " from " + table + " limit " + Config.KG.maxDistinctValuesForAdvancedMapping;
                    if (KGmappingData.currentKGdataSource.type == "sql.sqlserver")
                        sqlQuery = " select  distinct top(10000) [" + column + "] from " + table;

                    self.executeSqlserverQuery(sqlQuery, KGmappingData.currentKGdataSource, function (err, data) {
                        if (err) {
                            alert(err.responseText)
                            return MainController.UI.message(err.responseText)
                        }

                        if (data.length >= Config.KG.maxDistinctValuesForAdvancedMapping)
                            return alert(" too many distinct values :" + data.length)

                        KGmappingData.currentColumnDistinctValues = [];
                        var colName = common.deconcatSQLTableColumn(KGmappingData.currentColumn).column

                        data.forEach(function (item) {
                            if (item[colName])
                                KGmappingData.currentColumnDistinctValues.push(item[colName])
                        })


                        $("#KGmappings_AdvancedMappingDialogDiv").load("snippets/KG/KGmappingAdvancedMappingDialog.html");
                        $("#KGmappings_AdvancedMappingDialogDiv").dialog("open")

                        setTimeout(function () {
                            MainController.UI.message("", true)
                            $("#KGmappingData_column").html(KGmappingData.currentColumn)
                            self.setDictionaryMappings(dictionary, columnClassId, KGmappingData.currentColumnDistinctValues)
                        }, 200)


                    })


                })
            })
        }
        self.getSourceColor = function (source) {
            if (!sourceColors[source])
                sourceColors[source] = Config.KG.palette[Object.keys(sourceColors).length]
            return sourceColors[source]
        }

        self.setDictionaryMappings = function (dictionary, columnClassId, columnValues) {
            var statsMap = {"total":0,"candidates":0}
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
                self.currentColumnValueDivIds[id] = {value: value, sources: []}
                if (termObj) {
                    var isCandidate = false

                    cssClass = "KGmapping_columnValues_referenceValue"
                    for (var source in termObj) {
                        self.currentColumnValueDivIds[id].sources.push(source)
                        if (termObj[source].status == "CANDIDATE") {
                            statsMap["candidates"]+=1
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
                $("#KGmapping_distinctColumnValuesContainer").append(html)


            })
            var column=KGmappingData.currentColumn.substring(KGmappingData.currentColumn.indexOf("."))
            var superClass=superClassDictionary.label
            $("#advancedMappings_mappingStatsDiv").html(column+"->"+superClass+" : "+JSON.stringify(statsMap));
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
            $("#KGmapping_distinctColumnValuesContainer").html(html);

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
                                    "default_field": "attachment.content",
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
                                    "default_field": "attachment.content",
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

        /*************************************************************************************************************************************/

        /*************************************************************************************************************************************/

        /*************************************************************************************************************************************/

        self.loadDictionariesOld = function () {
            self.dictionaries = {}
            var dicNames = Object.keys(Config.KG.dictionaries)
            dictionaryJsTreeData = []


            async.eachSeries(dicNames, function (dicName, callbackEach) {
                var payload = {
                    KGmappingDictionary: 1,
                    load: Config.KG.dictionaries[dicName].fileName
                }

                $.ajax({
                    type: "POST",
                    url: Config.serverUrl,
                    data: payload,

                    dataType: "json",

                    success: function (data, textStatus, jqXHR) {
                        self.dictionaries[dicName] = {matches: {}}

                        dictionaryJsTreeData.push({
                            id: dicName,
                            text: dicName,
                            type: "dictionary",
                            parent: "#"
                        })


                        for (var classId in data) {
                            self.dictionaries[dicName][classId] = {matches: {}}

                            dictionaryJsTreeData.push({
                                id: classId,
                                text: data[classId].label,
                                type: "owl:Class",
                                parent: dicName,
                                data: {
                                    type: "owl:Class",
                                    id: classId,
                                    label: data[classId].label,
                                    source: Config.KG.OneModelSource,
                                    dictionary: dicName,
                                }
                            })


                            for (var value in data[classId].matches) {
                                self.dictionaries[dicName][classId].matches[value.toLowerCase()] = data[classId].matches[value]
                            }

                        }
                        callbackEach()
                    }, error: function () {
                        return callbackEach(err)
                    }
                })
            }, function (err) {
                if (err) {
                    return MainController.UI.message(err)
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


        self.runAutomaticMapping = function () {


            var filter = Sparql_common.setFilter("concept", null, KGmappingData.currentColumnDistinctValues, {exactMatch: true})

            var options = {filter: filter}
            Sparql_generic.getItems(Config.KG.mappingAlternativeSource, options, function (err, result) {
                if (err) {
                    return callbackEachSlice(err);
                }

                var ids = []
                result.forEach(function (item) {
                })
            })
        }


        self.setQuantumRdlMappingTree = function () {


            var colName = common.deconcatSQLTableColumn(KGmappingData.currentColumn).column[1]
            var itemsStr = ""
            var fuzzyValues


            //reduce  query to orphans
            var orphansFilter = []
            if ($("#advancedMappings_pickListMappingTree").jstree(true) && $("#KGMappingAdvancedMappings_onlyOrphansCBX").prop("checked"))
                orphansFilter = $("#advancedMappings_pickListMappingTree").jstree().get_selected()

            self.mappedValues = {}


            // process labels
            KGmappingData.currentColumnDistinctValues.forEach(function (item) {
                var value = item.toLowerCase()

                if (orphansFilter.length > 0 && orphansFilter.indexOf(value) > -1) {
                    delete self.mappedValues[value]
                } else {


                    if (itemsStr != "")
                        itemsStr += ","
                    itemsStr += "'" + Sparql_common.formatStringForTriple(value) + "'"

                    if (!self.mappedValues[value])
                        self.mappedValues[value] = []
                }

            })


            var sqlQuery = ""


            sqlQuery = "select" +
                " picklist.ID as picklistId," +
                " LOWER(picklist.Name) as picklistValue," +
                "picklist.PickListValueGroupingID as picklistGroupId," +
                "picklistGroup.name as picklistGroupName," +
                "mapping.SourceCode as originCode," +
                "origin.name as originName" +
                " from  rdl.tblAttributePickListValue as picklist\n" +
                "left join  ssl.tblMappingSource as mapping on picklist.ID =mapping.AttributePickListValueID\n" +
                "left join  rdl.tblPickListValueGrouping as picklistGroup on picklist.PickListValueGroupingID =picklistGroup.id\n" +
                "left join ssl.tblMappingSourceOrigin as origin on mapping.MappingSourceOriginID=origin.ID"

            "  where picklist.name in(" + itemsStr + ")"


            var quantumRDLsource = Config.sources["ASSETS-QUANTUM-RDL"].dataSource
            self.executeSqlserverQuery(sqlQuery, function (err, data) {
                if (err) {
                    alert(err.responseText)
                    return MainController.UI.message(err.responseText)
                }

                var jstreeData = [];

                var existingNodes = []
                if ($("#advancedMappings_pickListMappingTree").jstree(true)) {
                    existingNodes = common.jstree.getjsTreeNodes("advancedMappings_pickListMappingTree", true, "#")
                }


                for (var key in self.mappedValues) {

                    if (existingNodes.indexOf(key) < 0) {
                        existingNodes.push(key)
                        jstreeData.push({
                            id: key,
                            text: key,
                            parent: "#"
                        })
                    }
                }


                data.forEach(function (item) {
                    if (existingNodes.indexOf(item.picklistId) < 0) {
                        existingNodes.push(item.picklistId)
                        self.mappedValues[item.picklistValue].push({
                            source: "quantumRDL",
                            picklistId: item.picklistId,
                            picklistGroupId: item.picklistGroupId,
                            picklistGroupName: item.picklistGroupName,
                            originCode: item.originCode,
                            originName: item.originName,
                        })
                    }

                })

                for (var key in self.mappedValues) {
                    self.mappedValues[key].forEach(function (item) {
                        var text = item.source + " " + item.picklistId + " " + item.picklistGroupName + " " + item.originName
                        jstreeData.push({
                            id: item.picklistId,
                            text: text,
                            parent: key,
                            data: item
                        })

                    })
                }


                if ($("#advancedMappings_pickListMappingTree").jstree(true))
                    common.jstree.addNodesToJstree("advancedMappings_pickListMappingTree", "#", jstreeData);
                else {
                    var options = {
                        openAll: true,
                        withCheckboxes: true,
                        contextMenu: KGadvancedMapping.contextMenuFn(),
                        selectTreeNodeFn: function (event, obj) {
                            KGadvancedMapping.currentTreeNode = obj.node
                        }
                    }
                    common.jstree.loadJsTree("advancedMappings_pickListMappingTree", jstreeData, options)

                }


                setTimeout(function () {
                    $("#advancedMappings_pickListMappingTree").jstree().check_node(nodeIds)
                }, 500)


            })


        }


        self.setDictionaryMappingTree = function (colName, type, ontologySource, fuzzyMatching, onlyOrphans, existingNodes, callback) {
            var allowSingleWordMatching = true
            if (!colName)
                colName = common.deconcatSQLTableColumn(KGmappingData.currentColumn).column
            if (!type)
                type = "";// $("#KGMappingAdvancedMappings_typeSelect").val()
            if (!ontologySource)
                ontologySource = $("#KGMappingAdvancedMappings_ontologiesSelect").val();
            if (!fuzzyMatching)
                fuzzyMatching = $("#KGMappingAdvancedMappings_fuzzyMatching").prop("checked")
            if (!onlyOrphans)
                onlyOrphans = $("#KGMappingAdvancedMappings_onlyOrphansCBX").prop("checked")
            var parentClass = $("#KGMappingAdvancedMappings_parentClassLabel").val()


            //reduce  query to orphans
            if (!existingNodes) {
                existingNodes = {}
                if ($("#advancedMappings_pickListMappingTree").jstree(true)) {
                    var array = common.jstree.getjsTreeNodes("advancedMappings_pickListMappingTree", false, "#")
                    array.forEach(function (item) {
                        if (!item.children)
                            existingNodes[item.id] = -1
                        else
                            existingNodes[item.id] = item.children.length
                    })
                }
            }
            if (ontologySource == "")
                return

            var sliceSize = 50;
            var itemsStr = ""
            var fuzzyValues = null;
            var exactValues = []
            var data = []
            var jstreeData = [];
            var totalMatches = 0;
            var nodeIds = []


            var color = Lineage_classes.getSourceColor(ontologySource)

            var orphansFilter = []
            if ($("#advancedMappings_pickListMappingTree").jstree(true) && onlyOrphans)
                orphansFilter = $("#advancedMappings_pickListMappingTree").jstree().get_selected()


            $("#KGMappingAdvancedMappings_ontologiesSelect").val("");

            async.series([


                function (callbackSeries) { //prepare query parameters
                    fuzzyValues = null;

                    if (fuzzyMatching) {
                        fuzzyValues = {}

                        // KGmappingData.currentColumnDistinctValues=["electrical|electricity"]
                        KGmappingData.currentColumnDistinctValues.forEach(function (item, index) {
                            if (onlyOrphans && existingNodes[item] > 0)
                                return;
                            var itemLabel = item.trim().toLowerCase()
                            item = item.replace(/[\(\)\/]/g, "")
                            item = item.replace(/and /g, "")
                            //   if (item.trim().indexOf(" ") > -1) {

                            var array1 = (item.split(/[\|\-]/g))

                            array1.forEach(function (item) {
                                var array = item.toLowerCase().trim().split(/\s/g)
                                var words = []
                                var escapeWords = ["", "of", "and"]
                                array.forEach(function (word) {
                                    if (escapeWords.indexOf(word) > -1)
                                        return;

                                    if (word.charAt(words.length - 1) == "s") {
                                        var word = word.substring(0, word.length - 1)
                                    }
                                    words.push(word);
                                })

                                function add(str) {
                                    if (!fuzzyValues[str])
                                        fuzzyValues[str] = [];
                                    if (fuzzyValues[str].indexOf(itemLabel) < 0)
                                        fuzzyValues[str].push(itemLabel);

                                }

                                /*   if(words.length>=3) {
                                       add(array[0]+".*"+array[1])
                                       add(array[1]+".*"+array[2])
                                       add(array[0]+".*"+array[2])

                                   }
                                       add(array[0]+".*"+array[1])*/

                                if (allowSingleWordMatching) {//&& existingNodes[array[0]] == 0) {
                                    add(array[0])
                                }


                            })


                        })

                    }


                    self.mappedValues = {}
                    exactValues = []
                    orphansFilter = []
                    KGmappingData.currentColumnDistinctValues.forEach(function (item) {
                        var value = item.toLowerCase()
                        // value= Sparql_common.formatStringForTriple(value);
                        if (orphansFilter.length > 0 && orphansFilter.indexOf(value) > -1) {
                            delete self.mappedValues[value]
                        } else {
                            exactValues.push(value)
                            if (!self.mappedValues[value])
                                self.mappedValues[value] = []
                        }
                    })
                    callbackSeries()
                },


                function (callbackSeries) {  //executeQuery and concat result by fetch

                    var valuesSlices = []
                    if (fuzzyMatching) {
                        valuesSlices = common.array.slice(Object.keys(fuzzyValues), sliceSize)
                    } else {
                        valuesSlices = common.array.slice(exactValues, sliceSize)
                    }
                    var total = 0
                    async.eachSeries(valuesSlices, function (values, callbackEach) {

                        $("#KGMappingAdvancedMappings_messageSpan").html("searching..." + ontologySource + " " + (fuzzyMatching ? "fuzzy" : "exactMatch") + " .processed :" + (total += values.length))

                        var fromStr = Sparql_common.getFromStr(ontologySource)
                        var query = "PREFIX owl: <http://www.w3.org/2002/07/owl#>\n" +
                            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
                            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
                            "SELECT distinct ?class ?classLabel  ?superClass ?superClassLabel ?type" + fromStr + "  WHERE {\n"


                        var clause = "  ?class rdfs:label ?classLabel."

                        if (fuzzyMatching) {
                            var valuesStr = ""
                            values.forEach(function (value, index) {
                                if (index > 0)
                                    valuesStr += "|"
                                valuesStr += "" + value + "";
                                // valuesStr += ".*" + value + ".|." + value + ".*"
                            })

                            clause += "FILTER (regex(?classLabel ,\"" + valuesStr + "\" ,\"i\") )"
                            //   clause+="FILTER (regex(?classLabel ,\"^(?!("+valuesStr+")).*("+valuesStr+").*$\" ,\"i\") )"
                            // query+="filter ( (bif:lower(?classLabel))  not in("+notInStr+"))"
                        } else {
                            clause += Sparql_common.setFilter("class", null, values, {exactMatch: true})

                        }


                        if (type == "class") {
                            clause += "?class rdf:type ?type. filter(?type not in(owl:NamedIndividual,<http://w3id.org/readi/rdl/D101001497>,<http://w3id.org/readi/rdl/D101001500>) && ?type=owl:Class) "
                        } else if (type == "named individual") {
                            clause += "?class rdf:type ?type. filter(?type in(owl:NamedIndividual,<http://w3id.org/readi/rdl/D101001497>,<http://w3id.org/readi/rdl/D101001500>)) "
                        } else {
                            clause += " optional{ ?class rdf:type ?type.}"
                        }

                        if (parentClass != "") {
                            clause += "?class rdfs:subClassOf+|rdf:type+ ?superClass. ?superClass rdfs:label ?superClassLabel. filter (regex(?superClassLabel,'" + parentClass + "','i'))"
                        } else {
                            clause += " optional {?class rdfs:subClassOf|rdf:type ?superClass. optional {?superClass rdfs:label ?superClassLabel}} "
                        }

                        query += clause;

                        query += " } LIMIT 10000"


                        var url = Config.sources[ontologySource].sparql_server.url + "?format=json&query=";
                        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: ontologySource}, function (err, result) {
                            if (err) {
                                callbackSeries(err)
                            }


                            result.results.bindings.forEach(function (item) {
                                var obj = {}
                                for (var key in item) {
                                    if (key == "classLabel")
                                        obj[key] = item[key].value.toLowerCase()
                                    else
                                        obj[key] = item[key].value
                                }
                                data.push(obj);

                            })
                            //   return callbackSeries()
                            callbackEach()
                        })
                    }, function (err) {
                        callbackSeries()
                    })

                },


                function (callbackSeries) {  //prepare jstreeData
                    $("#waitImg").css("display", "none");
                    if (data.length == 0)
                        $("#KGMappingAdvancedMappings_messageSpan").html("no matching found")


                    var distinctMappedValues = {}

                    data.forEach(function (item) {
                        var id = item.class + "_" + ontologySource
                        if (existingNodes[id] == null) {
                            existingNodes[id] = -1


                            var label = item.classLabel.toLowerCase()
                            if (self.mappedValues[label]) {

                                if (!distinctMappedValues[item.class]) {
                                    distinctMappedValues[item.class] = 1


                                    self.mappedValues[label].push({
                                        source: ontologySource,
                                        id: item.class,
                                        classLabel: item.classLabel,
                                        superClass: item.superClass,
                                        superClassLabel: item.superClassLabel || "?",
                                        type: item.type
                                    })
                                }
                            }

                        }
                    })


                    for (var key in self.mappedValues) {

                        self.mappedValues[key].forEach(function (item) {


                            var type = "?"
                            if (item.type)
                                type = item.type.substring(item.type.lastIndexOf("#") + 1)
                            var text = "<span style='font-weight:normal'> " + item.classLabel + " : " + type + " </span><span  style='color:" + color + "' class='KGmappingData_treeItem2' >/" + (item.superClassLabel || "?") + "/" + ontologySource + "</i>"
                            nodeIds.push(item.id + "_" + ontologySource)
                            jstreeData.push({
                                id: item.id,
                                text: text,
                                parent: key,
                                data: {
                                    id: item.id,
                                    label: item.classLabel,
                                    source: ontologySource,
                                    type: type,
                                    superClass: item.superClass,
                                    superClassLabel: item.superClassLabel
                                }
                            })

                            totalMatches += 1
                        })
                    }

                    if (fuzzyMatching) {
                        var fuzzyFoundItems = {}
                        var fuzzyWords = {}
                        data.forEach(function (item) {
                            fuzzyFoundItems[item.class] = item;
                            var array = item.classLabel.toLowerCase().split(" ")
                            var fuzzyHasExactMatch = false
                            array.forEach(function (word) {
                                if (fuzzyValues[word]) {

                                    var originalLabels = fuzzyValues[word]
                                    originalLabels.forEach(function (originalLabel) {

                                        if (!fuzzyWords[originalLabel])
                                            fuzzyWords[originalLabel] = {}
                                        if (!fuzzyWords[originalLabel][item.class])
                                            fuzzyWords[originalLabel][item.class] = 0
                                        fuzzyWords[originalLabel][item.class] += 1
                                        if (originalLabel == item.classLabel) {
                                            //on enleve les exact matches des fuzzy
                                            fuzzyWords[originalLabel]["hasExactMatch"] = true
                                            console.log(originalLabel)
                                        }
                                        if (self.mappedValues[item.classLabel])
                                            fuzzyWords[originalLabel][item.class] = 0


                                    })
                                }

                            })
                        })

                        var fuzzyMatches = {}
                        var minMatches = 2
                        for (var originalLabel in fuzzyWords) {
                            for (var classId in fuzzyWords[originalLabel]) {
                                if (!fuzzyWords[originalLabel]["hasExactMatch"]) {  //on enleve les exact matches des fuzzy

                                    if (fuzzyWords[originalLabel][classId] > -1) {

                                        if (fuzzyWords[originalLabel][classId] >= (minMatches)) {
                                            if (!fuzzyMatches[originalLabel])
                                                fuzzyMatches[originalLabel] = []
                                            fuzzyMatches[originalLabel].push(fuzzyFoundItems[classId])
                                        }
                                    }
                                }
                            }

                        }


                        for (var originalLabel in fuzzyMatches) {
                            //   if (fuzzyValues[item.classLabel]) {
                            fuzzyMatches[originalLabel].forEach(function (item) {


                                var type = "?"
                                if (item.type)
                                    type = item.type.substring(item.type.lastIndexOf("#") + 1)

                                //   fuzzyValues[item.classLabel].forEach(function (originalLabel) {
                                var id = originalLabel + "_" + item.classLabel + "_" + ontologySource
                                if (existingNodes[id] == null) {
                                    existingNodes[id] = 1
                                    item.source = ontologySource
                                    var text = "<span style='font-weight:normal;font-style:italic'> " + item.classLabel + " : " + type + " </span> <span  style='color:" + color + ";' class='KGmappingData_treeItem2' ><i>/" + (item.superClassLabel || "?") + "/" + ontologySource + "</i>"

                                    jstreeData.push({
                                        id: id,
                                        text: text,
                                        parent: originalLabel,
                                        data: {
                                            id: item.class,
                                            fuzzy: true,
                                            label: item.classLabel,
                                            source: ontologySource,
                                            type: type,
                                            superClass: item.superClass,
                                            superClassLabel: item.superClassLabel
                                        }

                                    })
                                    totalMatches += 1
                                }

                            })


                        }


                    }
                    callbackSeries();
                },


                function (callbackSeries) {//draw jstree
                    for (var key in self.mappedValues) {
                        if (true || !fuzzyMatching) {

                            if (existingNodes[key] == null) {
                                existingNodes[key] = 1
                                jstreeData.push({
                                    id: key,
                                    text: key,
                                    parent: "#",
                                    data: {id: key, label: key, source: null}
                                })
                            }
                        }
                    }


                    if (callback) {
                        return callback(null, {columnName: KGmappingData.currentColumn, data: jstreeData})
                    }
                    if ($("#advancedMappings_pickListMappingTree").jstree(true)) {

                        common.jstree.addNodesToJstree("advancedMappings_pickListMappingTree", "#", jstreeData);
                    } else {
                        var options = {
                            openAll: true,
                            withCheckboxes: true,
                            contextMenu: KGadvancedMapping.contextMenuFn(),
                            selectTreeNodeFn: function (event, obj) {
                                KGadvancedMapping.currentTreeNode = obj.node
                            },
                            doNotAdjustDimensions: true
                        }
                        common.jstree.loadJsTree("advancedMappings_pickListMappingTree", jstreeData, options)

                    }

                    if (!fuzzyMatching) {  //check added nodes if not fuzzyMatching
                        setTimeout(function () {
                            $("#advancedMappings_pickListMappingTree").jstree().check_node(nodeIds)
                        }, 500)
                    }
                    $("#KGMappingAdvancedMappings_messageSpan").html(totalMatches + "matches found")


                    callbackSeries();
                }

            ], function (err) {
                if (err) {
                    $("#waitImg").css("display", "none");
                    if (callback)
                        return callback(err)
                    alert(err)
                }
            })


        }

        self.contextMenuFn = function () {
            var items = {}
            items.nodeInfos = {
                label: "node infos",
                action: function (e, xx) {// pb avec source
                    var node = KGadvancedMapping.currentTreeNode
                    if (!node || node.parent == "#")
                        return;
                    SourceBrowser.showNodeInfos(node.data.source, node.data.id, "mainDialogDiv")


                }
            }


            items.setValueManuallyFromOntology = {
                label: "set value manually from ontology",
                action: function (e, xx) {// pb avec source
                    var node = KGadvancedMapping.currentTreeNode
                    if (!node || node.parent != "#")
                        return;
                    $("#GenericTools_searchAllSourcesTermInput").val(node.text)
                    $("#KGmappings_OneModelSearchTree").val(node.text)

                    self.addingValueManuallyToNode = node;


                }
            }

            items.setAsNewClassInDictionary = {
                label: "add as new class in ONE-MODEL",
                action: function (e, xx) {// pb avec source
                    var node = KGadvancedMapping.currentTreeNode
                    if (!node)
                        return;
                    KGadvancedMapping.setAsNewClassInDictionary(node)
                }
            }

            return items
        }


        self.addValueManuallyFromOntology = function (labelNode, ontologyNode) {
            self.addingValueManuallyToNode = null;
            var color = "red"
            var text = "<span style='font-weight:normal'> " + ontologyNode.data.label + "</span> <span  style='color:" + color + ";font-size: 10px' class='KGmappingData_treeItem2' >" + ontologyNode.data.source + ""
            var jstreeData = [{
                id: ontologyNode.data.id,
                text: text,
                parent: labelNode.id,
                data: {id: ontologyNode.data.id, label: ontologyNode.data.label, source: ontologyNode.data.source}
            }]
            common.jstree.addNodesToJstree("advancedMappings_pickListMappingTree", labelNode.id, jstreeData)
            setTimeout(function () {
                $("#advancedMappings_pickListMappingTree").jstree().check_node(ontologyNode.data.id)
            }, 500)


        }

        self.setAsNewClassInDictionary = function (node) {

            var newUri = Config.KG.oneModelDictionaryGraphURI + common.getRandomHexaId(12);

            newUri = prompt("create dictionary entry :" + node.text, newUri)
            if (newUri) {
                var color = "red"
                var text = "<span style='font-weight:normal'> " + node.text + "</span> <span  style='color:" + color + ";font-size: 10px' class='KGmappingData_treeItem2' >ONE-MODEL"

                var jstreeData = [{
                    id: newUri,
                    text: text,
                    parent: node.id,
                    data: {id: newUri, label: node.text, source: "ONE-MODEL"}
                }]
                common.jstree.addNodesToJstree("advancedMappings_pickListMappingTree", node.id, jstreeData)
                setTimeout(function () {
                    $("#advancedMappings_pickListMappingTree").jstree().check_node(newUri)
                }, 500)


            }

        }


        self.validateMappingXXX = function (tab) {

            if (tab == 'manualMapping')
                KGmappingData.menuActions.validateConditionalTypeMappings()


            var mappings = [];
            var orphans = [];
            var ambiguous = [];
            var nodes = $("#advancedMappings_pickListMappingTree").jstree().get_json("#", {})
            nodes.forEach(function (node) {
                if (node.state.selected && node.children.length > 0) {
                    if (node.children.length == 1) {
                        var x = node
                        mappings.push({label: node.id, class: node.children[0].id})
                    } else {
                        ambiguous.push({label: node.id, class: node.children})
                    }
                } else {
                    orphans.push(node.id)

                }


            })

            $("#mainDialogDiv").load('snippets/KG/KGmappingAvancedMAppingDialog2.html')
            $("#mainDialogDiv").dialog("open")
            setTimeout(function () {
                common.fillSelectOptions("KGadvanceMappingDialog2_mappedItemsSelect", mappings, null, "label", "class")
                common.fillSelectOptions("KGadvanceMappingDialog2_orphansSelect", orphans, null)
                common.fillSelectOptions("KGadvanceMappingDialog2_mappedItemsSelect", ambiguous, null, "label", "label")

            }, 500)


        }
        self.cancelMapping = function () {
            $("#KGmappings_AdvancedMappingDialogDiv").dialog("close")
        }


        self.exportTreeToCSV = function (columnName, nodes) {
            if (!nodes)
                nodes = $("#advancedMappings_pickListMappingTree").jstree().get_json("#", {flat: true})


            var map = {}
            var childrenMap = {}
            nodes.forEach(function (node) {
                if (node.parent == "#") {
                    node.children = []
                    map[node.id] = node
                }
            })
            nodes.forEach(function (node) {
                if (node.parent != "#") {
                    if (map[node.parent])
                        map[node.parent].children.push(node)
                }
            })

            var str = "column\tstatus\tid\tlabel\tsuperClass_Label\turi\tsuperClass_Uri\tsource\ttype\n"
            var existingNodes = {}
            for (var id in map) {
                if (map[id].children.length > 0) {

                    var hasFuzzy = false
                    /*   map[id].children.forEach(function (item) {
                           console.log(item.fuzzy)
                           if (item.fuzzy)
                              hasFuzzy=true
                       })*/

                    map[id].children.forEach(function (item) {
                        //    var item = map[nodeId]
                        var nodeId = id + "_" + item.data.id + "_" + item.data.source


                        if (existingNodes[nodeId] !== null) {
                            existingNodes[nodeId] = 1
                            item = item.data
                            var matchType = "Exact"
                            if (item.fuzzy) {
                                if (hasFuzzy)
                                    matchType = "Fuzzy+"
                                else
                                    matchType = "Fuzzy"
                            }

                            str += columnName + "\t" + matchType + "\t" + id + "\t" + item.label + "\t" + item.superClassLabel + "\t" + item.id + "\t" + item.superClass + "\t" + item.source + "\t" + item.type + "\n"
                        }
                    })
                } else {
                    var matchType = "NO"
                    str += columnName + "\t" + matchType + "\t" + id + "\n"
                }


            }
            common.copyTextToClipboard(str, function (err, result) {
                if (err)
                    return alert(" copy to clipboard failed")
                return alert("result copied to clipboard")
            })


        }


        self.executeBulkMappingSequence = function () {
            var colNames = [null]
            //  var types = ["class", "named individual"]
            var ontologySources = ["CFIHOS_READI", "ISO_15926-PCA", "ISO_15926-org"]
            var ontologySources = ["CFIHOS_READI", "ISO_15926-PCA",]
            var fuzzyMatchings = [false, true]
            var fuzzyMatchings = [true]
            var onlyOrphans = false

            var columnLabel = KGmappingData.currentColumn
            var jstreeData = [];
            var existingNodes = {}
            async.eachSeries(colNames, function (colName, callbackColName) {
                async.eachSeries(ontologySources, function (ontologySource, callbackOntologySource) {
                    async.eachSeries(fuzzyMatchings, function (fuzzyMatching, callbackType) {
                        if (fuzzyMatching)
                            onlyOrphans = true;
                        else
                            onlyOrphans = false;

                        self.setDictionaryMappingTree(colName, "", ontologySource, fuzzyMatching, onlyOrphans, existingNodes, function (err, result) {
                            if (err)
                                return callbackType(err);
                            jstreeData = jstreeData.concat(result.data);
                            result.data.forEach(function (item) {
                                if (!item.children)
                                    existingNodes[item.id + "_" + item.data.source] = 0
                                else
                                    existingNodes[item.id + "_" + item.data.source] = children.length
                            })
                            callbackType()
                        })
                    }, function (err) {
                        callbackOntologySource(err);
                    })

                }, function (err) {
                    callbackColName(err);
                })
            }, function (err) {
                var x = jstreeData
                self.exportTreeToCSV(columnLabel, jstreeData)
                console.log("DONE")
            })


        }


        return self;


    }
)()