var ADLbuild = (function () {
    var self = {};

    self.initDialog = function () {
        var currentADL = $("#ADLmappings_DatabaseSelect").val();
        if (!currentADL || currentADL == "")
            return alert("select an ADL")





            $("#mainDialogDiv").load("snippets/ADL/ADLbuildDialog.html");
        $("#mainDialogDiv").dialog("open");
        setTimeout(function () {
            var graphUri = "http://data.total.com/resource/one-model/assets/..."
            if (ADLassetGraph.currentADLgraphURI)
                graphUri = ADLassetGraph.currentADLgraphURI
            $("#ADLbuild_sparqlServerUrl").val(Config.default_sparql_url)
            $("#ADLbuild_adlGraphUri").val(graphUri)
            $("#ADLbuild_rdlGraphUri").val("http://data.total.com/resource/one-model/quantum-rdl/")
            $("#ADLbuild_oneModelGraphUri").val(Config.sources["ONE-MODEL"].graphUri[0])
        }, 200)


    }
    self.buildTriples = function () {
        self.checked_tables = $("#ADLmappings_dataModelTree").jstree().get_checked();
        if (self.checked_tables.length == 0)
            return alert("Select mapped tables")
        var tables = []
        self.checked_tables.forEach(function (table) {
            tables.push(ADLmappingData.currentADLdataSource.dbName + "_" + table.replace(/_/g,"."))
        })

        var sparqlServerUrl = $("#ADLbuild_sparqlServerUrl").val()
        var adlGraphUri = $("#ADLbuild_adlGraphUri").val()
        var rdlGraphUri = $("#ADLbuild_rdlGraphUri").val()
        var oneModelGraphUri = $("#ADLbuild_oneModelGraphUri").val()
        var replaceGraph = $("#ADLbuild_replaceGraph").prop("checked")

        if (adlGraphUri.indexOf("...") > -1) {
            return alert("enter a valid graph URI")
        }

        var payload = {
            buildADL: true,
            mappingFileNames: JSON.stringify(tables),
            sparqlServerUrl: sparqlServerUrl,
            adlGraphUri: adlGraphUri,
            rdlGraphUri: rdlGraphUri,
            oneModelGraphUri: oneModelGraphUri,
            replaceGraph: replaceGraph
        }

        $.ajax({
            type: "POST",
            url: Config.serverUrl,
            data: payload,
            dataType: "json",

            success: function (result, textStatus, jqXHR) {
                $("#ADLbuild_infosDiv").prepend("<span class='ADLbuild_infosError'>ALL DONE</span>")

            }, error(err) {
                $("#ADLbuild_infosDiv").prepend("<span class='ADLbuild_infosError'>" + err + "</span>")
            }
        })

        //  triplesGenerator.buidlADL(mappingFileNames, sparqlServerUrl, adlGraphUri, rdlGraphUri, oneModelGraphUri, replaceGraph, function (err, result) {


    }

    self.cancelBuild = function () {
        $("#mainDialogDiv").dialog("close")
    }
    return self;
})()