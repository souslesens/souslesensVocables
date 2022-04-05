var KGmappingData = (function () {
    var self = {};
    self.sampleData = {};
    self.currentColumn = null;
    self.currentKGdataSource = null;

    self.mappedValues = {};
    self.initAdlsList = function () {
        var adls = [];
        for (var key in Config.sources) {
            var sourceObj = Config.sources[key];
            // eslint-disable-next-line no-console
            if (!sourceObj.schemaType) console.log(key);

            if (sourceObj.schemaType.indexOf("KNOWLEDGE_GRAPH") > -1) {
                // eslint-disable-next-line no-console
                if (!sourceObj.dataSource || !sourceObj.dataSource.dbName) console.log("KNOWLEDGE_GRAPH source " + key + " should have a datasource declared");
                else {
                    var dbName = sourceObj.dataSource.dbName;
                    if (adls.indexOf(dbName) < 0) adls.push(dbName);
                }
            }
        }
        common.fillSelectOptions("KGmappings_DatabaseSelect", adls, true);
    };

    /**
     *
     *
     *
     *
     *
     */
    self.loadKG_SQLModel = function (dbName) {
        //  if(KGmappings.currentMappedColumns && Object.keys(KGmappings.currentMappedColumns.mappings)>0)
        KGmappings.clearMappings();
        /*   if (source == "")
               return alert("select a KG database")*/
        if (!dbName) dbName = $("#KGmappings_DatabaseSelect").val();
        self.currentSource = KGmappings.currentKGsource;
        self.currentKGdataSource = Config.sources[self.currentSource].dataSource;
        self.currentDatabase = dbName;
        self.currentKGgraphURI = Config.sources[KGmappings.currentKGsource].graphUri;

        const params = new URLSearchParams({
            name: self.currentKGdataSource.dbName,
            type: self.currentKGdataSource.type,
        });

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/kg/data?" + params.toString(),
            dataType: "json",

            success: function (tablesData, textStatus, jqXHR) {
                self.addMappingDataToTableData(self.currentSource, function (err, mappingData) {
                    if (err) return alert(err);
                    var data = {};
                    for (var table in tablesData) {
                        data[table] = {
                            columns: tablesData[table],
                            mappings: mappingData[self.currentKGdataSource.dbName + "_" + table + ".json"],
                            source: self.currentKGdataSource.dbName,
                        };
                    }

                    self.showModelJstree(data);
                });
            },
            error: function (err) {
                alert(err.responseText);
            },
        });
    };

    self.showModelJstree = function (data) {
        if (self.currentMappingsMap) {
            // Pass
        } else {
            self.currentMappingsMap = {};
        }
        var modelJstreeData = [];
        var existingNodes = {};
        for (var key in data) {
            var parent = "#";
            var nodeData = {};
            var label = key;
            if (data[key].mappings) {
                nodeData = data[key].mappings;

                if (data[key].mappings.build) {
                    label = "<span style='color:#cc51ee'>" + label + "</span>";
                } else label = "<span style='color:#86d5f8'>" + label + "</span>";
            }
            nodeData.type = "table";
            nodeData.id = key.toLowerCase();
            nodeData.adlTable = key;
            nodeData.label = key;

            modelJstreeData.push({
                id: key.toLowerCase().replace(/\./g, "_"),
                text: label,
                parent: parent,
                type: "table",
                data: nodeData,
            });
        }

        var options = {
            selectTreeNodeFn: function (event, obj) {
                if (!KGmappings.checkMappingEditionSave()) return;

                if (KGmappings.isShowingAssetGraph) {
                    return KGassetGraph.zoomOnTable(obj.node.data);
                }

                self.currentKGtable = obj.node;
                KGmappings.clearMappings();

                self.showSampleData(obj.node, function () {
                    var name = self.currentKGtable.data.adlView || self.currentKGtable.data.adlTable || self.currentKGtable.data.label;
                    KGmappings.loadMappings(KGmappings.currentKGsource + "_" + self.currentDatabase + "_" + name);
                });
            },
            withCheckboxes: true,
            contextMenu: self.contextMenuFn(),
        };
        common.jstree.loadJsTree("KGmappings_dataModelTree", modelJstreeData, options);
        $("#waitImg").css("display", "none");
    };

    self.contextMenuFn = function () {
        var items = {};
        items.addFilteredViewToTable = {
            label: "add filtered view",
            action: function (e, xx) {
                // pb avec source
                KGmappingData.showAddFilteredViewDialog();
            },
        };
        return items;
    };
    self.addMappingDataToTableData = function (assetLabel, callback) {
        KGassetGraph.getBuiltMappingsStats(assetLabel, function (err, builtClasses) {
            if (err) return alert(err);
            $.ajax({
                type: "GET",
                url: Config.apiUrl + "/kg/assets/" + assetLabel,
                dataType: "json",

                success: function (result, textStatus, jqXHR) {
                    return callback(null, result.data);

                    // eslint-disable-next-line no-unreachable
                    for (var key in result.data) {
                        var obj = result.data[key];

                        if (obj.sql) {
                            var table = obj.adlTable.toLowerCase();
                            var tableId = table.replace(/\./g, "_");
                            var view = obj.adlView.toLowerCase();
                            var viewId = view.replace(/\./g, "_");
                            var node = {
                                id: viewId,
                                text: view,
                                parent: tableId,
                                data: obj,
                            };
                            common.jstree.addNodesToJstree("KGmappings_dataModelTree", tableId, [node]);
                        }
                    }

                    //color of labels
                    for (key in result.data) {
                        table = result.data[key].adlTable.toLowerCase();
                        var anchor = $("#" + table.replace(/\./g, "_") + "_anchor");
                        if (result.data[key].build) anchor.css("color", "#cc51ee");
                        else anchor.css("color", "#86d5f8");
                    }
                },
                error(err) {
                    callback(err);
                },
            });
        });
    };

    self.showAddFilteredViewDialog = function () {
        var html =
            "<div style='display: flex;flex-direction: column'> view suffix (added to table name)<input size='20' id='KGmapping_viewSuffix'><br>" +
            "SQL filter <textarea rows='5' cols=80' id='KGmapping_viewSQL'></textarea><br>" +
            "Comment<textarea rows='5' cols=80' id='KGmapping_viewComment'></textarea><br>" +
            "<div><button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='KGmappingData.addFilteredViewToTable()'>OK</button>" +
            "<button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick=' $(\"#mainDialogDiv\").dialog(\"close\")'>Cancel</button></div>" +
            "</div>";

        $("#mainDialogDiv").html(html);
        $("#mainDialogDiv").dialog("open");
    };

    self.addFilteredViewToTable = function () {
        var sql = $("#KGmapping_viewSQL").val();
        var suffix = $("#KGmapping_viewSuffix").val();
        var comment = $("#KGmapping_viewComment").val();

        $("#mainDialogDiv").dialog("close");
        if (!suffix || suffix == "" || !sql || sql == "") return alert("suffix and SQL filter are mandatory");

        var id = self.currentKGtable.id + "_" + suffix;
        var label = self.currentKGtable.text + "_" + suffix;
        var data = {
            sql: sql,
            type: "filteredView",
            label: label,
            id: id,
            adlTable: self.currentKGtable.text,
            adlView: id,
            comment: comment,
        };

        var node = {
            id: id,
            text: label,
            parent: self.currentKGtable.id,
            data: data,
        };
        common.jstree.addNodesToJstree("KGmappings_dataModelTree", self.currentKGtable.id, [node]);
    };
    self.showSampleData = function (node, callback) {
        KGmappings.isModifyingMapping = false;
        var SampleSizelimit = 30;

        var table = node.data.adlTable || node.data.label;

        function displaySampleData(data) {
            var cols = [];
            var str = "<table><tr>";
            var strTypes = "";
            var strMappings = "";
            var strJoins = "";
            data.forEach(function (item) {
                for (var key in item) {
                    if (cols.indexOf(key) < 0) {
                        cols.push(key);
                        var colId = table + "." + key;
                        var colType = "";
                        var colMappings = "";
                        var colJoins = "";
                        if (!self.currentMappingsMap[colId]) self.currentMappingsMap[colId] = { type: "", joins: [], mappings: [] };
                        else {
                            colType = self.currentMappingsMap[colId].type;
                            colMappings = JSON.stringify(self.currentMappingsMap[colId].mappings);
                            colJoins = JSON.stringify(self.currentMappingsMap[colId].joins);
                        }

                        str += "<td class='dataSample_cell'>" + key + "</td>";
                        //   strJoins += "<td  class='dataSample_cell dataSample_join'<span id='dataSample_join_" + colId + "'>" + colJoins + "</span> </td>"

                        var id = common.encodeToJqueryId("datasample_type_" + colId).toLowerCase();
                        strTypes += "<td  class='dataSample_cell dataSample_type'<span id='" + id + "'>" + colType + "</span> </td>";

                        //   strMappings += "<td  class='dataSample_cell dataSample_mapping'<span id='dataSample_mapping_" + colId + "'>" + colMappings + "</span> </td>"
                    }
                }
            });
            str += "</tr>";

            str += "<tr>" + strTypes + "</tr>";
            //   str += "<tr>" + strMappings + "</tr>"
            //   str += "<tr>" + strJoins + "</tr>"

            data.forEach(function (item) {
                str += "<tr>";
                cols.forEach(function (col) {
                    var value = "";

                    if (item[col]) {
                        value = item[col];
                    }
                    str += "<td class='dataSample_cell dataSample_cellValue'>" + value + "</td>";
                });
                str += "</tr>";
            });

            $("#KGmappings_dataSampleDiv").html(str);

            setTimeout(function () {
                if (callback) callback();

                /*   $(".dataSample_type").contextmenu(function (event) {*/
                $(".dataSample_type").bind("dblclick", function (event) {
                    event.stopPropagation();

                    var point = { x: event.clientX - leftPanelWidth, y: event.clientY };

                    var html =
                        '    <span class="popupMenuItem" onclick="KGmappingData.menuActions.removeMapping();"> remove Mapping</span>' +
                        '<span class="popupMenuItem" onclick="KGmappingData.menuActions.showAdvancedMappingDialog();"> advanced Mapping</span>' +
                        '<span class="popupMenuItem" onclick="KGadvancedMapping.standardizeValues();"> Standardize values</span>';
                    //   "<span class=\"popupMenuItem\" onclick=\"KGadvancedMapping.executeBulkMappingSequence();\">executeBulkMappingSequence</span>"

                    $("#graphPopupDiv").html(html);
                    MainController.UI.showPopup(point, "graphPopupDiv");
                });

                $(".dataSample_type").bind("click", function (event) {
                    MainController.UI.hidePopup("graphPopupDiv");

                    //  var nodeId = $(this).attr("id").substring(16).replace("__", ".")
                    var nodeId = common.decodeFromJqueryId($(this).attr("id"));
                    nodeId = nodeId.replace("datasample_type_", "");
                    self.currentColumn = nodeId;
                    /*    var mode = "properties"
                        if (event.ctrlKey)*/
                    var mode = "types";
                    $(".dataSample_type").removeClass("datasample_type_selected");
                    $(this).addClass("datasample_type_selected");
                });
                /*   $(".dataSample_mapping").bind("click", function () {

                   })*/
            });
        }

        if (self.sampleData[table]) {
            displaySampleData(self.sampleData[table]);
        } else {
            var sqlQuery = " select * from " + table + " limit " + SampleSizelimit;
            if (self.currentKGdataSource.type == "sql.sqlserver") sqlQuery = " select top " + SampleSizelimit + " * from " + table;

            const params = new URLSearchParams({
                dbName: self.currentKGdataSource.dbName,
                type: self.currentKGdataSource.type,
                sqlQuery: sqlQuery,
            });

            $.ajax({
                type: "GET",
                url: Config.apiUrl + "?" + params.toString(),
                dataType: "json",

                success: function (data, textStatus, jqXHR) {
                    (self.sampleData[table] = data), displaySampleData(self.sampleData[table]);
                },

                error: function (err) {
                    // Pass
                },
            });
        }
    };

    self.setDataSampleColumntype = function (columnId, typeObj) {
        var jqueryId = "#" + common.encodeToJqueryId("datasample_type_" + columnId).toLowerCase();
        if (!typeObj || typeObj == "") return $(jqueryId).html("");
        var typeStr = "";
        if (!Array.isArray(typeObj.data)) typeObj.data = [typeObj.data];

        if (typeObj.data.length == 1) {
            return $(jqueryId).html(typeObj.data[0].label);
        }

        var typesStr = "";
        typeObj.data.forEach(function (item, index) {
            typesStr += "-" + item.condition + " : " + item.label + "\n";
        });
        typesStr += "";

        $(jqueryId).html("<span title='" + typesStr + "'> multiple...</span>");
    };

    self.menuActions = {
        removeMapping: function () {
            KGmappings.unAssignOntologyTypeToColumn(self.currentColumn);
        },
        showAdvancedMappingDialog: function () {
            KGadvancedMapping.showAdvancedMappingDialog();
        },
        validateConditionalTypeMappings: function () {
            if (!confirm("Validate conditional mappings")) return;

            self.assignConditionalTypeOn = false;
            var types = [];
            $("#KGadvancedMapping_manualMappingContainerDiv")
                .children()
                .each(function () {
                    var data = $(this).attr("data");
                    var array = data.split("|");
                    var condition = array[0];
                    var type = array[1];
                    var ontologyNode = KGmappings.selectedOntologyNodes[type];
                    types.push({
                        condition: condition,
                        id: type,
                        label: ontologyNode.data.label,
                        parents: ontologyNode.parents,
                        source: ontologyNode.data.source,
                    });
                });

            KGmappings.AssignOntologyTypeToColumn(KGmappingData.currentColumn, { data: types }, true);

            $("#KGmappings_AdvancedMappingDialogDiv").dialog("close");
        },
    };
    self.assignConditionalType = function (ontologyNode) {
        var conditionValue = $("#KGmapping_columnValues").val();
        if (conditionValue && conditionValue != "") {
            var data = conditionValue + "|" + ontologyNode.data.id;
            var id = "condition_" + common.getRandomHexaId(3);
            // var idEncoded=btoa(id.replace(/=/g,"^"))
            var html =
                "<div class='KGmapping_conditionalMapping' data='" +
                data +
                "' id='" +
                id +
                "'>" +
                "" +
                conditionValue +
                " = " +
                ontologyNode.data.label +
                "<button class='btn btn-sm my-1 py-0 btn-outline-primary' style='margin-left: 100px' onclick='KGmappingData.unAssignConditionalType(\"" +
                id +
                "\")'>X</button> " +
                "</div>" +
                "</div>";

            $("#KGadvancedMapping_manualMappingContainerDiv").append(html);
        }
    };
    self.unAssignConditionalType = function (id) {
        //  id=atob(id)
        $("#" + id).remove();
    };

    return self;
})();
