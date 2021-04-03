var ADLmappingData = (function () {

    var self = {}
    self.sampleData = {}
    self.currentColumn = null
    self.currentDatabase = null;

    self.initAdlsList = function () {
        var adls = []
        for (var key in Config.sources) {
            var sourceObj = Config.sources[key];
            if (sourceObj.schemaType == "INDIVIDUAL" && sourceObj.dataSource && sourceObj.dataSource.dbName) {
                adls.push({id: sourceObj.dataSource.dbName, label: key})
            }
        }
        common.fillSelectOptions("ADLmappings_DatabaseSelect", adls, true, "label", "id")

    }

    self.loadADL_SQLModel = function () {

        var dbName = $("#ADLmappings_DatabaseSelect").val()
        self.currentADLdatabase = dbName;
        if (dbName == "")
            return alert("select a ADL database")

        $.ajax({
            type: "POST",
            url: Config.serverUrl,
            data: {ADLquery: 1, getModel: dbName},
            dataType: "json",

            success: function (data, textStatus, jqXHR) {
                self.showModelJstree(data, dbName)

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
                /*    self.currentModelJstreeNode = obj.node
                    self.currentJstreeNode = obj.node;*/
                var mode = "properties"
                if (obj.event && obj.event.ctrlKey)
                    mode = "types"
                self.currentADLtable = obj.node
                ADLmappings.displayOneModelTree(obj.node.data, mode)
                self.showSampleData(obj.node)
                ADLmappings.loadMappings(self.currentADLdatabase + "_" + self.currentADLtable.data.label)

            },
            // contextMenu: self.jstreeContextMenu("Column")
        }
        common.loadJsTree("ADLmappings_dataModelTree", modelJstreeData, options)
        $("#waitImg").css("display", "none");
    }


    self.showSampleData = function (node) {
        var SampleSizelimit = 30
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
                        var colId = table + "__" + key;
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
                        strTypes += "<td  class='dataSample_cell dataSample_type'<span id='dataSample_type_" + colId + "'>" + colType + "</span> </td>"

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
                /*  $(".dataSample_join").bind("click", function () {

                  })*/

                $(".dataSample_type").bind("click", function (event) {
                    if (event.ctrlKey) {

                        var point = {x: event.client.X, y: event.client.Y}

                        var html = "    <span class=\"popupMenuItem\" onclick=\"ADLmappingGraph.graphActions.setConditionOnValues();\"> remove Mapping</span>" +
                            "<span class=\"popupMenuItem\" onclick=\"ADLmappingGraph.graphActions.setConditionOnValues();\"> setConditionOnValues</span>"

                        $("#graphPopupDiv").html(html);
                        MainController.UI.showPopup(point, "graphPopupDiv")


                    }
                    var nodeId = $(this).attr("id").substring(16).replace("__", ".")
                    self.currentColumn = nodeId
                    /*    var mode = "properties"
                        if (event.ctrlKey)*/
                    var mode = "types"
                    $(".dataSample_type").removeClass("dataSample_type_selected")
                    $(this).addClass("dataSample_type_selected")
                    //   ADLmappings.Ontology.showNodePropertiesTree(nodeId, mode)


                })
                /*   $(".dataSample_mapping").bind("click", function () {

                   })*/

            })
        }


        if (self.sampleData[table]) {

            displaySampleData(self.sampleData[table])
        } else {

            var sqlQuery = " select * from " + table + " limit " + SampleSizelimit;

            $.ajax({
                type: "POST",
                url: Config.serverUrl,
                data: {ADLquery: 1, getData: 1, dbName: dbName, sqlQuery: sqlQuery},
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

    self.setDataSampleColumntype = function (columnId,typeObj) {
        $("#dataSample_type_" + columnId.replace(".", "__")).html(typeObj.data.label)


        ADLmappings.currentMappedColumns[columnId] = {
            columnId: columnId,
            type_id: typeObj.data.id,
            type_label: typeObj.data.label,
            type_parents: typeObj.parents,

        }
    }


    return self;


})()
