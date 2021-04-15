var ADLadvancedMapping = (function () {

    var self = {}
    ADLmappingData.currentColumnDistinctValues = [];

    self.showAdvancedMappingDialog = function () {
        self.assignConditionalTypeOn = true;
        self.mappedValues = {}
        var array = ADLmappingData.currentColumn.split(".")
        var column = array[1];
        var table = array[0]
        var sqlQuery = " select distinct " + column + " from " + table + " limit " + Config.ADL.maxDistinctValuesForAdvancedMapping;
        if (ADLmappingData.currentADLdataSource.type == "sql.sqlserver")
            sqlQuery = " select distinct " + column + " from rdl." + table;
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
                var colName = ADLmappingData.currentColumn.split(".")[1]
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


    self.setMappingTree = function (type) {


        var colName = ADLmappingData.currentColumn.split(".")[1]
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
                    newValues.push(item.trim())
                }
            })

            ADLmappingData.currentColumnDistinctValues = newValues;

        }

        if (ADLmappingData.currentSource == "ASSETS-QUANTUM-RDL") {
            unconcatQuantumRDL()
        }

        fuzzyValues = null;
        var fuzzyMatching = $("#ADLMappingAdvancedMappings_fuzzyMatching").prop("checked")
        if (fuzzyMatching) {
            fuzzyValues = {}
            ADLmappingData.currentColumnDistinctValues.forEach(function (item, index) {
                var itemLabel = item.toLowerCase()
                if (item.trim().indexOf(" ") > -1) {

                    var array = (item.split(" "))
                    array.forEach(function (fuzzyItem) {

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
                // fuzzyValues = fuzzyValues.concat(item.split(" "))
            })

        }


        //reduce  query to orphans
        var orphansFilter = []
        if ($("#advancedMappings_pickListMappingTree").jstree(true) && $("#ADLMappingAdvancedMappings_onlyOrphansCBX").prop("checked"))
            orphansFilter = $("#advancedMappings_pickListMappingTree").jstree().get_selected()

        /* if (false && $("#advancedMappings_pickListMappingTree").jstree(true)) {
             if ($("#ADLMappingAdvancedMappings_onlyOrphansCBX").prop("checked")) {
                 var nodes = common.getNodeDescendants("advancedMappings_pickListMappingTree", "#", 1)
                 nodes.forEach(function (item) {
                     if (item.children.length == 0) {
                         orphansFilter.push(item.id)
                     }

                 })

             }
         }*/

        self.mappedValues = {}

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

        if (!type)
            type = "pickList"

        if (type == "rdlQuantum_pickList") {
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

        } else if (type == "souslesens_dictionary") {
            sqlQuery = " select distinct class, LOWER(classLabel)  as classLabel ,superClass,superClassLabel, source from dbo.souslesensDictionary" +
                "   where classLabel in(" + itemsStr + ")"
            var sourceFilter = $("#ADLMappingAdvancedMappings_ontologiesSelect").val();
            $("#ADLMappingAdvancedMappings_ontologiesSelect").val("")
            if (sourceFilter != "")
                sqlQuery += " and source='" + sourceFilter + "'"

        }


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
                    if (!fuzzyValues) {

                        if (existingNodes.indexOf(key) < 0) {
                            existingNodes.push(key)
                            jstreeData.push({
                                id: key,
                                text: key,
                                parent: "#"
                            })
                        }
                    }
                }


                if (type == "rdlQuantum_pickList") {
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
                } else if (type == "souslesens_dictionary") {
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
                                })
                            }
                        }


                    })

                    var nodeIds = []
                    for (var key in self.mappedValues) {

                        self.mappedValues[key].forEach(function (item) {
                            var color = Lineage_classes.getSourceColor(item.source)
                            var text = "<span style='font-weight:normal'> " + item.classLabel + "</span><span  style='color:" + color + "' class='ADLmappingData_treeItem2' >" + item.source + "/" + item.superClassLabel
                            nodeIds.push(item.id)
                            jstreeData.push({
                                id: item.id,
                                text: text,
                                parent: key,
                                data: item
                            })


                        })
                    }

                    if (fuzzyValues) {
                        data.forEach(function (item) {
                            if (fuzzyValues[item.classLabel]) {
                                fuzzyValues[item.classLabel].forEach(function (originalLabel) {
                                    var color = Lineage_classes.getSourceColor(item.source)
                                    var text = "<span style='font-weight:normal;font-size:10px'> " + item.classLabel + "</span> <span  style='color:" + color + ";font-size: 10px' class='ADLmappingData_treeItem2' ><i>" + item.source + "/" + (item.superClassLabel || "?") + "</i>"

                                    jstreeData.push({
                                        id: item.class + "_" + item.classLabel,
                                        text: text,
                                        parent: originalLabel,
                                        data: item
                                    })

                                })

                            }
                        })
                    }


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

                if (!fuzzyMatching) {  //check added nodes if not fuzzyMatching
                    setTimeout(function () {
                        $("#advancedMappings_pickListMappingTree").jstree().check_node(nodeIds)
                    }, 500)
                }


            }, error: function (err) {
                MainController.UI.message(err)
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


    self.validateMapping = function () {

        var mappings = [];
        var orphans = [];
        var ambiguous = []
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


    }
    self.cancelMapping = function () {

    }


    return self;


})()