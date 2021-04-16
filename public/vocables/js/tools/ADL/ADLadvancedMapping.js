var ADLadvancedMapping = (function () {

    var self = {}
    ADLmappingData.currentColumnDistinctValues = [];

    self.showAdvancedMappingDialog = function () {
        self.assignConditionalTypeOn = true;
        self.mappedValues = {}
      var obj=common.deconcatSQLTableColumn(ADLmappingData.currentColumn)
        var column =obj.column;
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
                var colName=common.deconcatSQLTableColumn(ADLmappingData.currentColumn).column

                data.forEach(function (item) {
                    if (item[colName])
                        ADLmappingData.currentColumnDistinctValues.push(item[colName])
                })


                $("#ADLmappings_AdvancedMappingDialogDiv").load("snippets/ADL/ADLmappingAdvancedMappingDialog.html");
                $("#ADLmappings_AdvancedMappingDialogDiv").dialog("open")
                setTimeout(function () {
                    $("#ADLmappingData_column").html(column)
                    common.fillSelectOptions("ADLmapping_distinctColumnValuesSelect", data, null, column, column)
                }, 200)
            }
            , error: function (err) {
                alert(err.responseText)
                MainController.UI.message(err.responseText)

            }
        })
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


        var colName =common.deconcatSQLTableColumn(ADLmappingData.currentColumn).column[1]
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
                itemsStr += "'" + value + "'"

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
                    existingNodes = common.getjsTreeNodes("advancedMappings_pickListMappingTree", true, "#")
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
                    common.addNodesToJstree("advancedMappings_pickListMappingTree", "#", jstreeData);
                else {
                    var options = {
                        openAll: true,
                        withCheckboxes: true,
                        contextMenu: ADLadvancedMapping.contextMenuFn(),
                        selectTreeNodeFn: function (event, obj) {
                            ADLadvancedMapping.currentTreeNode = obj.node
                        }
                    }
                    common.loadJsTree("advancedMappings_pickListMappingTree", jstreeData, options)

                }


                setTimeout(function () {
                    $("#advancedMappings_pickListMappingTree").jstree().check_node(nodeIds)
                }, 500)


            }, error: function (err) {
                MainController.UI.message(err)
            }
        })


    }


    self.setDictionaryMappingTree = function () {

        $("#ADLMappingAdvancedMappings_messageSpan").html("searching...")
        var colName =common.deconcatSQLTableColumn(ADLmappingData.currentColumn).column[1]
        var itemsStr = ""
        var fuzzyValues

        //concat Quantum RDL
        function unconcatQuantumRDL() {
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
        }

        fuzzyValues = null;
        var fuzzyMatching = $("#ADLMappingAdvancedMappings_fuzzyMatching").prop("checked")
        if (fuzzyMatching) {
            fuzzyValues = {}
            ADLmappingData.currentColumnDistinctValues.forEach(function (item, index) {
                var itemLabel = item.toLowerCase()
                if (item.trim().indexOf(" ") > -1) {

                    var array = (item.split(/[\s\|\-]/g))
                    array.forEach(function (fuzzyItem) {
                        if (fuzzyItem == "")
                            return;
                        fuzzyItem = fuzzyItem.trim().toLowerCase()
                        if (!fuzzyValues[fuzzyItem])
                            fuzzyValues[fuzzyItem] = [];
                        if (fuzzyValues[fuzzyItem].indexOf(itemLabel) < 0)
                            fuzzyValues[fuzzyItem].push(itemLabel);

                        if (fuzzyItem.charAt(item.length - 1) == "s") {
                            var fuzzyItemSingular = fuzzyItem.substring(0, fuzzyItem.length - 1)
                            if (!fuzzyValues[fuzzyItemSingular])
                                fuzzyValues[fuzzyItemSingular] = [];
                            if (fuzzyValues[fuzzyItemSingular].indexOf(itemLabel) < 0)
                                fuzzyValues[fuzzyItemSingular].push(itemLabel);
                        }
                    })

                }

            })

        }


        //reduce  query to orphans
        var orphansFilter = []
        if ($("#advancedMappings_pickListMappingTree").jstree(true) && $("#ADLMappingAdvancedMappings_onlyOrphansCBX").prop("checked"))
            orphansFilter = $("#advancedMappings_pickListMappingTree").jstree().get_selected()


        self.mappedValues = {}


        var values = []
        ADLmappingData.currentColumnDistinctValues.forEach(function (item) {


            var value = item.toLowerCase()

            if (orphansFilter.length > 0 && orphansFilter.indexOf(value) > -1) {
                delete self.mappedValues[value]
            } else {
                values.push(value)
                if (!self.mappedValues[value])
                    self.mappedValues[value] = []
            }

        })


        var type = $("#ADLMappingAdvancedMappings_typeSelect").val()
        var ontologySource = $("#ADLMappingAdvancedMappings_ontologiesSelect").val();
        $("#ADLMappingAdvancedMappings_ontologiesSelect").val("");
        if (ontologySource == "")
            return
        var schemes = {
            "CFIHOS_READI": "http://w3id.org/readi/rdl/",
            "ISO_15926-PCA": "http://staging.data.posccaesar.org/rdl/",
            "CFIHOS-ISO": "http://data.15926.org/cfihos/",
        }

        var query = ""

        var fromStr = Sparql_common.getFromStr(ontologySource)
        var query = "PREFIX owl: <http://www.w3.org/2002/07/owl#>\n" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
            "SELECT distinct ?class ?classLabel  ?superClass ?superClassLabel ?type" + fromStr + "  WHERE {\n" +
            "  ?class rdfs:label ?classLabel.\n" +
            " optional {?class rdfs:subClassOf ?superClass. optional {?superClass rdfs:label ?superClassLabel}} "
        if (fuzzyValues)
            query += Sparql_common.setFilter("class", null, Object.keys(fuzzyValues), {exactMatch: false})
        else
            query += Sparql_common.setFilter("class", null, values, {exactMatch: true})

        if (type == "class") {
            query += "?class rdf:type ?type. filter(?type not in(owl:NamedIndividual,<http://w3id.org/readi/rdl/D101001497>,<http://w3id.org/readi/rdl/D101001500>) && ?type=owl:Class) "
        } else {
            query += "?class rdf:type ?type. filter(?type in(owl:NamedIndividual,<http://w3id.org/readi/rdl/D101001497>,<http://w3id.org/readi/rdl/D101001500>)) "
        }

        query += " } LIMIT 10000"


        var url = Config.default_sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: "ONE-DICTIONARY"}, function (err, result) {
            if (err) {
                $("#waitImg").css("display", "none");
                return alert(err)
            }


            var data = []
            result.results.bindings.forEach(function (item) {
                var obj = {}
                for (var key in item) {
                    obj[key] = item[key].value
                }
                data.push(obj);

            })
            $("#waitImg").css("display", "none");
            if (data.length == 0)
                $("#ADLMappingAdvancedMappings_messageSpan").html("no matching found")


            var jstreeData = [];

            var existingNodes = []
            if ($("#advancedMappings_pickListMappingTree").jstree(true)) {
                existingNodes = common.getjsTreeNodes("advancedMappings_pickListMappingTree", true, "#")
            }


            for (var key in self.mappedValues) {
                if (!fuzzyValues) {

                    if (existingNodes.indexOf(key) < 0) {
                        existingNodes.push(key)
                        jstreeData.push({
                            id: key,
                            text: key,
                            parent: "#",
                            data:{id:key,label:key,source:null}
                        })
                    }
                }
            }


            data.forEach(function (item) {
                if (self.mappedValues[item.classLabel]) {

                    if (existingNodes.indexOf(item.class) < 0) {
                        existingNodes.push(item.class)

                        self.mappedValues[item.classLabel].push({
                            source: item.source,
                            id: item.class,
                            classLabel: item.classLabel,
                            superClass: item.superClass,
                            superClassLabel: item.superClassLabel || "?",
                            type: item.type
                        })
                    }
                }


            })
            var totalMatches = 0;
            var nodeIds = []
            var color = Lineage_classes.getSourceColor(ontologySource)
            for (var key in self.mappedValues) {

                self.mappedValues[key].forEach(function (item) {


                    var type = item.type.substring(item.type.lastIndexOf("#") + 1)
                    var text = "<span style='font-weight:normal'> " + item.classLabel + " : " + type + " </span><span  style='color:" + color + "' class='ADLmappingData_treeItem2' >/" + (item.superClassLabel || "?") + "/" + ontologySource + "</i>"
                    nodeIds.push(item.id)
                    jstreeData.push({
                        id: item.id,
                        text: text,
                        parent: key,
                        data: {id: item.id, label: item.classLabel, source: ontologySource,type:type,superClass:item.superClass,superClassLabel:item.superClassLabel}
                    })

                    totalMatches += 1
                })
            }

            if (fuzzyValues) {
                data.forEach(function (item) {
                    var type = item.type.substring(item.type.lastIndexOf("#") + 1)
                    if (fuzzyValues[item.classLabel]) {


                        fuzzyValues[item.classLabel].forEach(function (originalLabel) {
                            var id = originalLabel + "_" + item.classLabel
                            if (existingNodes.indexOf(id) < 0) {
                                existingNodes.push(id)
                                item.source = ontologySource
                                var text = "<span style='font-weight:normal;font-style:italic'> " + item.classLabel + " : " + type + " </span> <span  style='color:" + color + ";' class='ADLmappingData_treeItem2' ><i>/" + (item.superClassLabel || "?") + "/" + ontologySource + "</i>"

                                jstreeData.push({
                                    id: id,
                                    text: text,
                                    parent: originalLabel,
                                    data: {id: item.class, fuzzy:true,label: item.classLabel, source: ontologySource,type:type,superClass:item.superClass,superClassLabel:item.superClassLabel}

                                })
                                totalMatches += 1
                            }

                        })


                    }

                })
            }


            if ($("#advancedMappings_pickListMappingTree").jstree(true))
                common.addNodesToJstree("advancedMappings_pickListMappingTree", "#", jstreeData);
            else {
                var options = {
                    openAll: true,
                    withCheckboxes: true,
                    contextMenu: ADLadvancedMapping.contextMenuFn(),
                    selectTreeNodeFn: function (event, obj) {
                        ADLadvancedMapping.currentTreeNode = obj.node
                    },
                    doNotAdjustDimensions: true
                }
                common.loadJsTree("advancedMappings_pickListMappingTree", jstreeData, options)

            }

            if (!fuzzyMatching) {  //check added nodes if not fuzzyMatching
                setTimeout(function () {
                    $("#advancedMappings_pickListMappingTree").jstree().check_node(nodeIds)
                }, 500)
            }
            $("#ADLMappingAdvancedMappings_messageSpan").html(totalMatches + "matches found")


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
        common.addNodesToJstree("advancedMappings_pickListMappingTree", labelNode.id, jstreeData)
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
            common.addNodesToJstree("advancedMappings_pickListMappingTree", node.id, jstreeData)
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

    self.exportTreeToCSV=function(){
        var nodes = $("#advancedMappings_pickListMappingTree").jstree().get_json("#", {flat:false})


        var map={}
        nodes.forEach(function (node) {
            map[node.id]=node
            if( node.children){
                node.children.forEach(function(item){
                    map[item.id]=item
                })
            }

        })

        var str="exactMatch\tid\ttype\tlabel\tsuperClass_Label\turi\tsuperClass_Uri\tsource\n"
        for(var id in map){
            if (map[id].children.length>0) {

                map[id].children.forEach(function (item) {
                //    var item = map[nodeId]
                    if (true) {
                       item = item.data
                        var exactMatch=""
                        if(!item.fuzzy)
                            exactMatch="Y"
                        str +=exactMatch+"\t"+ id + "\t" + item.type + "\t" + item.label + "\t" + item.superClassLabel   + "\t" + item.id + "\t" + item.superClass+ "\t" + item.source+"\n"
                    }
                })
            }
            else{
             str += id+"\n"
            }


        }
        var result = common.copyTextToClipboard(str)
        MainController.UI.message(result);
    }







    return self;


})()