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

            success: function (data, textStatus, jqXHR) {
                self.showModelJstree(data, self.currentADLdataSource.dbName)

            },
            error: function (err) {
                alert(err.responseText);
            }
        })


    }

    self.loadXlsModel = function (path) {

        var path = "D:\\NLP\\ontologies\\assets\\turbogenerator\\TO-G-6010A FJ-BCmodel.json"
        var payload = {
            triplesGenerator: 1,
            getJsonModel: path
        }


        $.ajax({
            type: "POST",
            url: Config.serverUrl,
            data: payload,
            dataType: "json",

            success: function (data, textStatus, jqXHR) {
                self.showModelJstree(data, path)
            }
            , error: function (err) {


                $("#waitImg").css("display", "none");
                console.log(JSON.stringify(err))
                console.log(JSON.stringify(query))
                MainController.UI.message(err.responseText);
            }
        })


    }

    self.showModelJstree = function (data, source) {

        if (self.currentMappingsMap) {

        } else {
            self.currentMappingsMap = {}
        }
        var modelJstreeData = []
        var existingNodes = {}
        for (var key in data) {
            modelJstreeData.push({
                id: key,
                text: key,
                parent: "#",
                data: {type: "table", id: key, label: key, source: source}
            })


        }

        var options = {
            selectTreeNodeFn: function (event, obj) {

                self.currentADLtable = obj.node
                ADLmappings.clearMappings()
                self.showSampleData(obj.node)
                setTimeout(function () {
                    ADLmappings.loadMappings(self.currentADLdataSource.dbName + "_" + self.currentADLtable.data.label)
                }, 500)

            },

        }
        common.jstree.loadJsTree("ADLmappings_dataModelTree", modelJstreeData, options)
        $("#waitImg").css("display", "none");
    }


    self.showSampleData = function (node) {
        var SampleSizelimit = 30;
        var dbName = node.data.source;
        var table;
        if (node.parents.length == 1)
            table = node.id
        if (node.parents.length == 2)
            table = node.parent
        if (node.parents.length == 3)
            table = node.parents[node.parents[2]]

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
        if(!typeObj || typeObj=="")
            return  $(jqueryId).html()
        var typeStr = "";
        if (!Array.isArray(typeObj.data))
            typeObj.data=[ typeObj.data]

            if(typeObj.data.length==1) {
              return  $(jqueryId).html( typeObj.data[0].label)
            }

        var typesStr = ""
        typeObj.data.forEach(function (item, index) {
            typesStr += "-" + item.condition+" : "+item.label+"\n"
        })
        typesStr += ""

        $(jqueryId).html("<span title='"+typesStr+"'> multiple...</span>")






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
