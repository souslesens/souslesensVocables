var ADLadvancedMapping = (function () {

        var self = {}
        self.dictionary = {}
        ADLmappingData.currentColumnDistinctValues = [];


        self.loadDictionaries = function () {
            var payload = {
                ADLmappingDictionary: 1,
                load: "dictionary_READI.json"
            }

            $.ajax({
                type: "POST",
                url: Config.serverUrl,
                data: payload,

                dataType: "json",

                success: function (data, textStatus, jqXHR) {

                    self.dictionary = {}
                    for (var classId in data) {
                        self.dictionary[classId] = {}
                        for (var value in data[classId]) {
                            self.dictionary[classId][value.toLowerCase()] = data[classId][value]
                        }
                    }

                }, error: function () {

                }
            })
        }

        self.showAdvancedMappingDialog = function (columnClassId) {

            self.assignConditionalTypeOn = true;
            self.mappedValues = {}
            var obj = common.deconcatSQLTableColumn(ADLmappingData.currentColumn)
            var column = obj.column;
            var table = obj.table
            var sqlQuery = " select distinct " + column + " from " + table + " limit " + Config.ADL.maxDistinctValuesForAdvancedMapping;
            if (ADLmappingData.currentADLdataSource.type == "sql.sqlserver")
                sqlQuery = " select distinct " + column + " from " + table;
            $.ajax({
                type: "POST",
                url: Config.serverUrl,
                data: {
                    ADLquery: 1,
                    getData: 1,
                    dataSource: JSON.stringify(ADLmappingData.currentADLdataSource),
                    sqlQuery: sqlQuery
                },
                dataType: "json",

                success: function (data, textStatus, jqXHR) {

                    if (data.length >= Config.ADL.maxDistinctValuesForAdvancedMapping)
                        return alert(" too many distinct values :" + data.length)

                    ADLmappingData.currentColumnDistinctValues = [];
                    var colName = common.deconcatSQLTableColumn(ADLmappingData.currentColumn).column

                    data.forEach(function (item) {
                        if (item[colName])
                            ADLmappingData.currentColumnDistinctValues.push(item[colName])
                    })


                    $("#ADLmappings_AdvancedMappingDialogDiv").load("snippets/ADL/ADLmappingAdvancedMappingDialog.html");
                    $("#ADLmappings_AdvancedMappingDialogDiv").dialog("open")
                    setTimeout(function () {
                        $("#ADLmappingData_column").html(ADLmappingData.currentColumn)
                        common.fillSelectOptions("ADLmapping_distinctColumnValuesSelect", data, null, column, column)
                        self.setDictionaryMappings(columnClassId, ADLmappingData.currentColumnDistinctValues)
                    }, 200)
                }
                , error: function (err) {
                    alert(err.responseText)
                    MainController.UI.message(err.responseText)

                }
            })
        }

        self.setDictionaryMappings = function (columnClassId, columnValues) {
            self.currentColumnClassId = columnClassId
            var columnDictionary = self.dictionary[columnClassId];
            if (!columnDictionary)
                return alert("no dictionary exists for class " + columnClassId)

            ADLmappingData.currentColumn = null;

            $(".dataSample_type").removeClass("datasample_type_selected")

            columnValues.forEach(function (value) {
                var value2 = value.toLowerCase()
                var cssClass = null;
                if (columnDictionary[value2]) {
                    columnDictionary[value2].forEach(function (entity) {

                        if (entity.isReferenceValue)
                            cssClass = "ADLmapping_distinctColumnValuesSelect_referenceValue"
                        else
                            cssClass = "ADLmapping_distinctColumnValuesSelect_candidateValues"
                    })
                    if (cssClass)
                        $("#ADLmapping_distinctColumnValuesSelect option[value='" + value + "']").addClass(cssClass);
                }

            })


        }


        self.editDictionaryValues = function (columnValue) {
            var entities = self.dictionary[self.currentColumnClassId][columnValue.toLowerCase()]
            var html = JSON.stringify(entities, null, 2)
            $("#ADLadvancedMapping_manualMappingContainerDiv").html(html)
        }


        self.runAutomaticMapping = function () {


            var filter = Sparql_common.setFilter("concept", null, ADLmappingData.currentColumnDistinctValues, {exactMatch: true})

            var options = {filter: filter}
            Sparql_generic.getItems(Config.ADL.mappingAlternativeSource, options, function (err, result) {
                if (err) {
                    return callbackEachSlice(err);
                }

                var ids = []
                result.forEach(function (item) {
                })
            })
        }


        self.setQuantumRdlMappingTree = function () {


            var colName = common.deconcatSQLTableColumn(ADLmappingData.currentColumn).column[1]
            var itemsStr = ""
            var fuzzyValues


            //reduce  query to orphans
            var orphansFilter = []
            if ($("#advancedMappings_pickListMappingTree").jstree(true) && $("#ADLMappingAdvancedMappings_onlyOrphansCBX").prop("checked"))
                orphansFilter = $("#advancedMappings_pickListMappingTree").jstree().get_selected()

            self.mappedValues = {}


            // process labels
            ADLmappingData.currentColumnDistinctValues.forEach(function (item) {
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

            $.ajax({
                type: "POST",
                url: Config.serverUrl,
                data: {
                    ADLquery: 1,
                    getData: 1,
                    dataSource: JSON.stringify(quantumRDLsource),
                    sqlQuery: sqlQuery
                },
                dataType: "json",


                success: function (data, textStatus, jqXHR) {
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
                            contextMenu: ADLadvancedMapping.contextMenuFn(),
                            selectTreeNodeFn: function (event, obj) {
                                ADLadvancedMapping.currentTreeNode = obj.node
                            }
                        }
                        common.jstree.loadJsTree("advancedMappings_pickListMappingTree", jstreeData, options)

                    }


                    setTimeout(function () {
                        $("#advancedMappings_pickListMappingTree").jstree().check_node(nodeIds)
                    }, 500)


                }, error: function (err) {
                    MainController.UI.message(err)
                }
            })


        }


        self.setDictionaryMappingTree = function (colName, type, ontologySource, fuzzyMatching, onlyOrphans, existingNodes, callback) {
            var allowSingleWordMatching = true
            if (!colName)
                colName = common.deconcatSQLTableColumn(ADLmappingData.currentColumn).column
            if (!type)
                type = "";// $("#ADLMappingAdvancedMappings_typeSelect").val()
            if (!ontologySource)
                ontologySource = $("#ADLMappingAdvancedMappings_ontologiesSelect").val();
            if (!fuzzyMatching)
                fuzzyMatching = $("#ADLMappingAdvancedMappings_fuzzyMatching").prop("checked")
            if (!onlyOrphans)
                onlyOrphans = $("#ADLMappingAdvancedMappings_onlyOrphansCBX").prop("checked")
            var parentClass = $("#ADLMappingAdvancedMappings_parentClassLabel").val()


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


            $("#ADLMappingAdvancedMappings_ontologiesSelect").val("");
            //concat Quantum RDL
            /*  function unconcatQuantumRDL() {
                  var newValues = []


                  ADLmappingData.currentColumnDistinctValues.forEach(function (item, index) {
                      if (item.indexOf('|') > -1) {
                          newValues = newValues.concat(item.split("|"))
                          newValues.forEach(function (item) {
                              item.trim()
                          })
                      } else if (item.indexOf('-') > -1) {
                          newValues = newValues.concat(item.split("-"))
                          newValues.forEach(function (item) {
                              item.trim()
                          })
                      } else {
                          newValues.push(Sparql_common.formatStringForTriple(item.trim()))
                      }
                  })

                  ADLmappingData.currentColumnDistinctValues = newValues;

              }

              if (false && ADLmappingData.currentSource == "ASSETS-QUANTUM-RDL") {
                  unconcatQuantumRDL()
              }*/
            async.series([


                function (callbackSeries) { //prepare query parameters
                    fuzzyValues = null;

                    if (fuzzyMatching) {
                        fuzzyValues = {}

                        // ADLmappingData.currentColumnDistinctValues=["electrical|electricity"]
                        ADLmappingData.currentColumnDistinctValues.forEach(function (item, index) {
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
                    ADLmappingData.currentColumnDistinctValues.forEach(function (item) {
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

                        $("#ADLMappingAdvancedMappings_messageSpan").html("searching..." + ontologySource + " " + (fuzzyMatching ? "fuzzy" : "exactMatch") + " .processed :" + (total += values.length))

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
                        $("#ADLMappingAdvancedMappings_messageSpan").html("no matching found")


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
                            var text = "<span style='font-weight:normal'> " + item.classLabel + " : " + type + " </span><span  style='color:" + color + "' class='ADLmappingData_treeItem2' >/" + (item.superClassLabel || "?") + "/" + ontologySource + "</i>"
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
                                    var text = "<span style='font-weight:normal;font-style:italic'> " + item.classLabel + " : " + type + " </span> <span  style='color:" + color + ";' class='ADLmappingData_treeItem2' ><i>/" + (item.superClassLabel || "?") + "/" + ontologySource + "</i>"

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
                        return callback(null, {columnName: ADLmappingData.currentColumn, data: jstreeData})
                    }
                    if ($("#advancedMappings_pickListMappingTree").jstree(true)) {

                        common.jstree.addNodesToJstree("advancedMappings_pickListMappingTree", "#", jstreeData);
                    } else {
                        var options = {
                            openAll: true,
                            withCheckboxes: true,
                            contextMenu: ADLadvancedMapping.contextMenuFn(),
                            selectTreeNodeFn: function (event, obj) {
                                ADLadvancedMapping.currentTreeNode = obj.node
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
                    $("#ADLMappingAdvancedMappings_messageSpan").html(totalMatches + "matches found")


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
                    var node = ADLadvancedMapping.currentTreeNode
                    if (!node || node.parent == "#")
                        return;
                    MainController.UI.showNodeInfos(node.data.source, node.data.id, "mainDialogDiv")


                }
            }


            items.setValueManuallyFromOntology = {
                label: "set value manually from ontology",
                action: function (e, xx) {// pb avec source
                    var node = ADLadvancedMapping.currentTreeNode
                    if (!node || node.parent != "#")
                        return;
                    $("#GenericTools_searchAllSourcesTermInput").val(node.text)
                    $("#ADLmappings_OneModelSearchTree").val(node.text)

                    self.addingValueManuallyToNode = node;


                }
            }

            items.setAsNewClassInDictionary = {
                label: "add as new class in ONE-MODEL",
                action: function (e, xx) {// pb avec source
                    var node = ADLadvancedMapping.currentTreeNode
                    if (!node)
                        return;
                    ADLadvancedMapping.setAsNewClassInDictionary(node)
                }
            }

            return items
        }


        self.addValueManuallyFromOntology = function (labelNode, ontologyNode) {
            self.addingValueManuallyToNode = null;
            var color = "red"
            var text = "<span style='font-weight:normal'> " + ontologyNode.data.label + "</span> <span  style='color:" + color + ";font-size: 10px' class='ADLmappingData_treeItem2' >" + ontologyNode.data.source + ""
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

            var newUri = Config.ADL.oneModelDictionaryGraphURI + common.getRandomHexaId(12);

            newUri = prompt("create dictionary entry :" + node.text, newUri)
            if (newUri) {
                var color = "red"
                var text = "<span style='font-weight:normal'> " + node.text + "</span> <span  style='color:" + color + ";font-size: 10px' class='ADLmappingData_treeItem2' >ONE-MODEL"

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


        self.validateMapping = function (tab) {

            if (tab == 'manualMapping')
                ADLmappingData.menuActions.validateConditionalTypeMappings()


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

            $("#mainDialogDiv").load('snippets/ADL/ADLmappingAvancedMAppingDialog2.html')
            $("#mainDialogDiv").dialog("open")
            setTimeout(function () {
                common.fillSelectOptions("ADLadvanceMappingDialog2_mappedItemsSelect", mappings, null, "label", "class")
                common.fillSelectOptions("ADLadvanceMappingDialog2_orphansSelect", orphans, null)
                common.fillSelectOptions("ADLadvanceMappingDialog2_mappedItemsSelect", ambiguous, null, "label", "label")

            }, 500)


        }
        self.cancelMapping = function () {
            $("#ADLmappings_AdvancedMappingDialogDiv").dialog("close")
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

            var columnLabel = ADLmappingData.currentColumn
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