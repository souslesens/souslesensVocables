var ADLmappingData = (function () {

    var self = {}
    self.sampleData = {}
    self.currentColumn = null
    self.currentADLdataSource = null;

    self.mappedValues = {}
    self.initAdlsList = function () {
        var adls = []
        for (var key in Config.sources) {
            var sourceObj = Config.sources[key];
            if (sourceObj.schemaType == "INDIVIDUAL" && sourceObj.dataSource && sourceObj.dataSource.dbName) {
                adls.push({id: key, label: key})
            }
        }
        common.fillSelectOptions("ADLmappings_DatabaseSelect", adls, true, "label", "id")

    }


    self.loadADL_SQLModel = function () {

        //  if(ADLmappings.currentMappedColumns && Object.keys(ADLmappings.currentMappedColumns.mappings)>0)
        ADLmappings.clearMappings()

        var source = $("#ADLmappings_DatabaseSelect").val();
        self.currentSource = source
        self.currentADLdataSource = Config.sources[source].dataSource;
        if (source == "")
            return alert("select a ADL database")

        $.ajax({
            type: "POST",
            url: Config.serverUrl,
            data: {ADLquery: 1, getModel: JSON.stringify(self.currentADLdataSource)},
            dataType: "json",

            success: function (tablesData, textStatus, jqXHR) {


                self.addMappingDataToTableData(self.currentSource, function (err, mappingData) {
                    if (err)
                        return alert(err)
                    var data = {}
                    for (var table in tablesData) {
                        data[table] = {
                            columns: tablesData[table],
                            mappings: mappingData[self.currentADLdataSource.dbName + "_" + table + ".json"],
                            source: self.currentADLdataSource.dbName
                        }

                    }

                    self.showModelJstree(data)
                })


            },
            error: function (err) {
                alert(err.responseText);
            }
        })


    }


    self.showModelJstree = function (data) {

        if (self.currentMappingsMap) {

        } else {
            self.currentMappingsMap = {}
        }
        var modelJstreeData = []
        var existingNodes = {}
        for (var key in data) {
            var parent = "#";
            var nodeData = {};
            var label = key
            if (data[key].mappings) {
                nodeData = data[key].mappings

                if (data[key].mappings.build) {
                    label = "<span style='color:#cc51ee'>" + label + "</span>"
                    self.currentADLgraphURI = data[key].mappings.build.graphUri
                } else
                    label = "<span style='color:#86d5f8'>" + label + "</span>"
            }
            nodeData.type = "table";
            nodeData.id = key.toLowerCase()
            nodeData.label = key;
            source:  data[key].source;

            modelJstreeData.push({
                id: key.toLowerCase().replace(/\./g, "_"),
                text: label,
                parent: parent,
                data: nodeData
            })


        }

        var options = {
            selectTreeNodeFn: function (event, obj) {
                if (!ADLmappings.checkMappingEditionSave())
                    return


                if (ADLmappings.isShowingAssetGraph) {
                    return ADLassetGraph.zoomOnTable(obj.node.data)

                }

                self.currentADLtable = obj.node
                ADLmappings.clearMappings()


                self.showSampleData(obj.node)
                setTimeout(function () {
                    var name = self.currentADLtable.data.adlView || self.currentADLtable.data.adlTable || self.currentADLtable.data.label
                    ADLmappings.loadMappings(self.currentADLdataSource.dbName + "_" + name)
                }, 500)

            },
            withCheckboxes: true,
            contextMenu: self.contextMenuFn()
            ,

        }
        common.jstree.loadJsTree("ADLmappings_dataModelTree", modelJstreeData, options)
        $("#waitImg").css("display", "none");
    }


    self.contextMenuFn = function () {
        var items = {}
        items.addFilteredViewToTable = {
            label: "add filtered view",
            action: function (e, xx) {// pb avec source
                ADLmappingData.showAddFilteredViewDialog()
            }
        }
        return items;
    }
    self.addMappingDataToTableData = function (assetLabel, callback) {
        ADLassetGraph.getBuiltMappingsStats(assetLabel, function (err, builtClasses) {
            if (err)
                return alert(err);
            $.ajax({
                type: "POST",
                url: Config.serverUrl,
                data: {getAssetGlobalMappings: assetLabel},
                dataType: "json",

                success: function (result, textStatus, jqXHR) {

                    return callback(null, result.data)


                    for (var key in result.data) {
                        var obj = result.data[key]


                        if (obj.sql) {
                            var table = obj.adlTable.toLowerCase()
                            var tableId = table.replace(/\./g, "_")
                            var view = obj.adlView.toLowerCase()
                            var viewId = view.replace(/\./g, "_")
                            var node = {
                                id: viewId,
                                text: view,
                                parent: tableId,
                                data: obj

                            }
                            common.jstree.addNodesToJstree("ADLmappings_dataModelTree", tableId, [node])
                        }


                    }

                    //color of labels
                    for (var key in result.data) {
                        var table = result.data[key].adlTable.toLowerCase()
                        var anchor = $("#" + table.replace(/\./g, "_") + "_anchor")
                        if (result.data[key].build)
                            anchor.css("color", "#cc51ee")
                        else
                            anchor.css("color", "#86d5f8")

                        if (result.data[key].build && result.data[key].build.graphUri)
                            self.currentADLgraphURI = result.data[key].build.graphUri
                    }

                }, error(err) {
                    callback(err)
                }
            })
        })
    }

    self.showAddFilteredViewDialog = function () {


        var html = "<div style='display: flex;flex-direction: column'> view suffix (added to table name)<input size='20' id='ADLmapping_viewSuffix'><br>" +
            "SQL filter <textarea rows='5' cols=80' id='ADLmapping_viewSQL'></textarea><br>" +
            "Comment<textarea rows='5' cols=80' id='ADLmapping_viewComment'></textarea><br>" +

            "<div><button onclick='ADLmappingData.addFilteredViewToTable()'>OK</button>" +
            "<button onclick=' $(\"#mainDialogDiv\").dialog(\"close\")'>Cancel</button></div>" +
            "</div>"

        $("#mainDialogDiv").html(html)
        $("#mainDialogDiv").dialog("open")


    }

    self.addFilteredViewToTable = function () {
        var sql = $("#ADLmapping_viewSQL").val();
        var suffix = $("#ADLmapping_viewSuffix").val();
        var comment = $("#ADLmapping_viewComment").val();

        $("#mainDialogDiv").dialog("close")
        if (!suffix || suffix == "" || !sql || sql == "")
            return alert("suffix and SQL filter are mandatory");

        var id = self.currentADLtable.id + "_" + suffix
        var label = self.currentADLtable.text + "_" + suffix
        var data = {
            sql: sql,
            type: "filteredView",
            label: label,
            id: id,
            adlTable: self.currentADLtable.text,
            adlView: id,
            comment: comment

        }

        var node = {
            id: id,
            text: label,
            parent: self.currentADLtable.id,
            data: data
        }
        common.jstree.addNodesToJstree("ADLmappings_dataModelTree", self.currentADLtable.id, [node])

    }
    self.showSampleData = function (node) {
        ADLmappings.isModifyingMapping = false;
        var SampleSizelimit = 30;
        var dbName = node.data.source;
        var table = node.data.adlTable || node.data.label


        function displaySampleData(data) {
            var cols = []
            var str = "<table><tr>"
            var strTypes = ""
            var strMappings = ""
            var strJoins = ""
            data.forEach(function (item) {
                for (var key in item) {
                    if (cols.indexOf(key) < 0) {
                        cols.push(key);
                        var colId = table + "." + key;
                        var colType = "";
                        var colMappings = ""
                        var colJoins = ""
                        if (!self.currentMappingsMap[colId])
                            self.currentMappingsMap[colId] = {type: "", joins: [], mappings: []}
                        else {
                            colType = self.currentMappingsMap[colId].type
                            colMappings = JSON.stringify(self.currentMappingsMap[colId].mappings)
                            colJoins = JSON.stringify(self.currentMappingsMap[colId].joins)

                        }

                        str += "<td class='dataSample_cell'>" + key + "</td>"
                        //   strJoins += "<td  class='dataSample_cell dataSample_join'<span id='dataSample_join_" + colId + "'>" + colJoins + "</span> </td>"

                        var id = common.encodeToJqueryId("datasample_type_" + colId).toLowerCase()
                        strTypes += "<td  class='dataSample_cell dataSample_type'<span id='" + id + "'>" + colType + "</span> </td>"

                        //   strMappings += "<td  class='dataSample_cell dataSample_mapping'<span id='dataSample_mapping_" + colId + "'>" + colMappings + "</span> </td>"
                    }
                }
            })
            str += "</tr>"

            str += "<tr>" + strTypes + "</tr>"
            //   str += "<tr>" + strMappings + "</tr>"
            //   str += "<tr>" + strJoins + "</tr>"

            data.forEach(function (item) {
                str += "<tr>"
                cols.forEach(function (col) {
                    var value = ""

                    if (item[col]) {
                        value = item[col]
                    }
                    str += "<td class='dataSample_cell dataSample_cellValue'>" + value + "</td>"
                })
                str += "</tr>"
            })

            $("#ADLmappings_dataSampleDiv").html(str)
            setTimeout(function () {

                /*   $(".dataSample_type").contextmenu(function (event) {*/
                $(".dataSample_type").bind("dblclick", function (event) {
                    event.stopPropagation();

                    var point = {x: event.clientX - leftPanelWidth, y: event.clientY}

                    var html = "    <span class=\"popupMenuItem\" onclick=\"ADLmappingData.menuActions.removeMapping();\"> remove Mapping</span>" +
                        "<span class=\"popupMenuItem\" onclick=\"ADLmappingData.menuActions.showAdvancedMappingDialog();\"> advanced Mapping</span>"
                    //   "<span class=\"popupMenuItem\" onclick=\"ADLadvancedMapping.executeBulkMappingSequence();\">executeBulkMappingSequence</span>"


                    $("#graphPopupDiv").html(html);
                    MainController.UI.showPopup(point, "graphPopupDiv")


                })

                $(".dataSample_type").bind("click", function (event) {

                    MainController.UI.hidePopup("graphPopupDiv")

                    //  var nodeId = $(this).attr("id").substring(16).replace("__", ".")
                    var nodeId = common.decodeFromJqueryId($(this).attr("id"))
                    nodeId = nodeId.replace("datasample_type_", "")
                    self.currentColumn = nodeId
                    /*    var mode = "properties"
                        if (event.ctrlKey)*/
                    var mode = "types"
                    $(".dataSample_type").removeClass("datasample_type_selected")
                    $(this).addClass("datasample_type_selected")


                })
                /*   $(".dataSample_mapping").bind("click", function () {

                   })*/

            })
        }


        if (self.sampleData[table]) {

            displaySampleData(self.sampleData[table])
        } else {

            var sqlQuery = " select * from " + table + " limit " + SampleSizelimit;
            if (self.currentADLdataSource.type == "sql.sqlserver")
                sqlQuery = " select top " + SampleSizelimit + " * from " + table;

            $.ajax({
                type: "POST",
                url: Config.serverUrl,
                data: {
                    ADLquery: 1,
                    getData: 1,
                    dataSource: JSON.stringify(self.currentADLdataSource),
                    sqlQuery: sqlQuery
                },
                dataType: "json",

                success: function (data, textStatus, jqXHR) {

                    self.sampleData[table] = data,
                        displaySampleData(self.sampleData[table])
                }
                , error: function (err) {


                }
            })
        }
    }

    self.setDataSampleColumntype = function (columnId, typeObj) {
        var jqueryId = "#" + common.encodeToJqueryId("datasample_type_" + columnId).toLowerCase()
        if (!typeObj || typeObj == "")
            return $(jqueryId).html("")
        var typeStr = "";
        if (!Array.isArray(typeObj.data))
            typeObj.data = [typeObj.data]

        if (typeObj.data.length == 1) {
            return $(jqueryId).html(typeObj.data[0].label)
        }

        var typesStr = ""
        typeObj.data.forEach(function (item, index) {
            typesStr += "-" + item.condition + " : " + item.label + "\n"
        })
        typesStr += ""

        $(jqueryId).html("<span title='" + typesStr + "'> multiple...</span>")


    }


    self.menuActions = {
        removeMapping: function () {
            ADLmappings.unAssignOntologyTypeToColumn(self.currentColumn)
        },
        showAdvancedMappingDialog: function () {
            ADLadvancedMapping.showAdvancedMappingDialog();
        },
        validateConditionalTypeMappings: function () {
            if (!confirm("Validate conditional mappings"))
                return;


            self.assignConditionalTypeOn = false;
            var types = []
            $("#ADLadvancedMapping_manualMappingContainerDiv").children().each(function () {
                var data = $(this).attr("data")
                var array = data.split("|")
                var condition = array[0];
                var type = array[1];
                var ontologyNode = ADLmappings.selectedOntologyNodes[type];
                types.push({
                    condition: condition,
                    id: type,
                    label: ontologyNode.data.label,
                    parents: ontologyNode.parents,
                    source: ontologyNode.data.source

                })
            })

            ADLmappings.AssignOntologyTypeToColumn(ADLmappingData.currentColumn, {data: types})

            $("#ADLmappings_AdvancedMappingDialogDiv").dialog("close")


        }


    }
    self.assignConditionalType = function (ontologyNode) {

        var conditionValue = $("#ADLmapping_distinctColumnValuesSelect").val();
        if (conditionValue && conditionValue != "") {
            var data = conditionValue + "|" + ontologyNode.data.id
            var id = "condition_" + common.getRandomHexaId(3)
            // var idEncoded=btoa(id.replace(/=/g,"^"))
            var html = "<div class='ADLmapping_conditionalMapping' data='" + data + "' id='" + id + "'>" +
                "" + conditionValue + " = " + ontologyNode.data.label +
                "<button style='margin-left: 100px' onclick='ADLmappingData.unAssignConditionalType(\"" + id + "\")'>X</button> " +
                "</div>" +

                "</div>"


            $("#ADLadvancedMapping_manualMappingContainerDiv").append(html)


        }

    }
    self.unAssignConditionalType = function (id) {
        //  id=atob(id)
        $("#" + id).remove()

    }

    return self;


})()
