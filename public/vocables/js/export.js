var Export = (function () {


    var self = {}
    self.context = null;
    self.currentOptions = {};
    self.currentSource = null
    self.showExportDatDialog = function (source, context, options, callback) {
        self.currentSource = source
        self.context = context;
        self.currentOptions = options || {}

        $("#mainDialogDiv").load("snippets/exportToTableDialog.html")
        $("#mainDialogDiv").dialog("open")
        setTimeout(function () {
            var jstreeData = [];
            Sparql_generic.getDistinctPredicates(source, {}, function (err, result) {
                result.forEach(function (item) {
                    jstreeData.push({
                        id: item.p.value,
                        text: item.pLabel.value,
                        parent: "#"
                    })
                })
                var options = {withCheckboxes: true};
                common.jstree.loadJsTree("exportTable_jstreeDiv", jstreeData, options, function (err, result) {

                    if (Config.sources[source].schemaType == "SKOS") {
                        var ids = ["http://www.w3.org/2004/02/skos/core#broader", "http://www.w3.org/2004/02/skos/core#narrower"]
                        $("#exportTable_jstreeDiv").jstree().check_node(ids)

                    }
                });

            })
            $("#exportTable_tabs").tabs({});


        }, 200)


    }


    self.cancelExportDialog = function () {
        $("#mainDialogDiv").dialog("close")
    }

    self.execExport = function () {
        var selectedProperties = $("#exportTable_jstreeDiv").jstree().get_checked();
        var langs = $("#exportTable_lang").val();
        var propertiesMap = {}
        selectedProperties.forEach(function (nodeId) {
            var node = $("#exportTable_jstreeDiv").jstree().get_node(nodeId)
            propertiesMap[node.id] = node.text
        })


        if (self.context == "BLENDER") {
            self.execExport_Blender(propertiesMap, langs)


        }

    }


    self.execExport_Blender = function (propertiesMap, langs) {
        var query = ""


        options = {}

        var filterSubjectLangsStr = "";
        var filterObjectLangsStr = "";
        if (langs != "") {

            var langsStr = ""
            langs.forEach(function (lang, index) {
                if (index > 0)
                    langsStr += ","
                langsStr += "'" + lang + "'"
            })
            filterSubjectLangsStr = "filter (lang(?subjectLabel)  in(" + langsStr + "))"
            filterObjectLangsStr = "filter (lang(?objectLabel)  in(" + langsStr + "))"
        }

        var propertiesArray = Object.keys(propertiesMap)

        var filterPropertiesStr = Sparql_common.setFilter("property", propertiesArray)

        var fromStr = Sparql_common.getFromStr(self.currentSource)
        var query = "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX  skos:<http://www.w3.org/2004/02/skos/core#> " +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "select distinct * " + fromStr + " WHERE {" +
            "?subject ?property ?object. " +
            "optional{?subject skos:prefLabel ?subjectLabel." + filterSubjectLangsStr + "} " +
            "optional{?object skos:prefLabel ?objectLabel. " + filterObjectLangsStr + "} " +
            filterPropertiesStr;
        query += "} limit " + Config.queryLimit

        var url = Config.sources[self.currentSource].sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {source: self.currentSource}, function (err, result) {
            if (err)
                return callback(err)
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["subject", "objectLabel", "property"])
            var data = result.results.bindings;
            var vars = result.head.vars

            var cols = [];
            var colsMap={}
            vars.forEach(function (item) {
                cols.push({title: item})
            })
            cols.push({title:"subject"})
            cols.push({title:"subjectLabel"})
            for( var prop in propertiesMap){
                cols.push({title:propertiesMap[prop]})
                colsMap[prop]=[]
            }


            data.forEach(function (item, indexRow) {
                for( var prop in propertiesMap){
                    colsMap[prop].push({row:indexRow,value:item.property.value})
                }

            })



            var dataSet = []
            data.forEach(function (item, indexRow) {
                var line = []
                line.push(item.subject.value);
                line.push(item.subjectLabel.value);
                colsMap[item.property.value].forEach(function(item2){
                   if(item2.row==indexRow)
                       line.push(item.object.value);
                })


                dataSet.push(line)
            })

            self.showDataTable(cols,dataSet)
        })


    }

    self.showDataTable = function (cols, dataSet) {


        $('#exportTable_dataTableDiv').DataTable({
            data: dataSet,
            columns: cols,
            // async: false,
            "pageLength": 15,
            dom: 'Bfrtip',
            buttons: [
                'copy', 'csv', 'excel', 'pdf', 'print'
            ]


        })
            , 500

    }


    return self;


})()