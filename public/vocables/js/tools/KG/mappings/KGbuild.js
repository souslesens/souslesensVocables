var KGbuild = (function () {
    var self = {};

    self.initDialog = function () {
        var currentKG = $("#KGmappings_DatabaseSelect").val();
        if (!currentKG || currentKG == "")
            return alert("select an KG")

        if (!KGmappings.checkMappingEditionSave())
            return


        $("#mainDialogDiv").load("snippets/KG/KGbuildDialog.html",function(){
            $("#mainDialogDiv").dialog("open");
            var graphUri = KGmappingData.currentKGgraphURI
            $("#KGbuild_sparqlServerUrl").val(Config.default_sparql_url)
            $("#KGbuild_adlGraphUri").val(graphUri)
            $("#KGbuild_rdlGraphUri").val("http://data.total.com/resource/one-model/quantum-rdl/")
            $("#KGbuild_oneModelGraphUri").val(Config.sources["ONE-MODEL"].graphUri[0])
        });




    }

    self.onAllTreeCbxChange = function (allCBX, jstreeDiv) {
        var checked = $(allCBX).prop("checked")
        var jsonNodes = $('#' + jstreeDiv).jstree(true).get_json('#', {flat: true});
        var nodes = []
        var graphUri
        $.each(jsonNodes, function (i, val) {
            if (val.data.adlSource) {
                nodes.push($(val).attr('id'))

            }


        })

        $("#" + jstreeDiv).jstree(true).check_node(nodes);

    }

    self.buildTriples = function () {
        $("#KGbuild_infosDiv").html("")
        self.checked_tables = $("#KGmappings_dataModelTree").jstree().get_checked();
        if (self.checked_tables.length == 0)
            return alert("Select mapped tables")
        var mappingFileNames = []
        self.checked_tables.forEach(function (table) {
            mappingFileNames.push(KGmappings.currentKGsource + "_" + KGmappingData.currentDatabase + "_" + table.replace(/_/, "."))
        })

        var sparqlServerUrl = $("#KGbuild_sparqlServerUrl").val()
        var adlGraphUri = $("#KGbuild_adlGraphUri").val()
        var replaceGraph = $("#KGbuild_replaceGraph").prop("checked")
        var skipOneModelOrphans = $("#KGbuild_skipOneModelOrphans").prop("checked")
        var skipLocalDictionaryOrphans = $("#KGbuild_skipLocalDictionaryOrphans").prop("checked")

        var options = {skipOneModelOrphans: skipOneModelOrphans, skipLocalDictionaryOrphans: skipLocalDictionaryOrphans}

        if (replaceGraph && !confirm("erase existing graph"))
            return


        if (adlGraphUri.indexOf("...") > -1) {
            return alert("enter a valid graph URI")
        }
        self.serverMessageCount = 0;
        var payload = {
            mappingFileNames: mappingFileNames,
            sparqlServerUrl: sparqlServerUrl,
            adlGraphUri: adlGraphUri,
            replaceGraph: replaceGraph,
            options: options,
            dataSource: Config.sources[KGmappingData.currentSource].dataSource
        }

        $.ajax({
            type: "POST",
            url: Config.apiUrl + "/kg",
            data: payload,
            dataType: "json",

            success: function (result, textStatus, jqXHR) {
                $("#KGbuild_infosDiv").prepend("<span class='KGbuild_infosOK'>ALL DONE</span><br>")

            }, error(err) {
                $("#KGbuild_infosDiv").prepend("<span class='KGbuild_infosError'>" + err.responseText + "</span><br>")
            }
        })

        //  triplesGenerator.buidlKG(mappingFileNames, sparqlServerUrl, adlGraphUri, rdlGraphUri, oneModelGraphUri, replaceGraph, function (err, result) {


    }
    self.serverMessage = function (message) {

        if (message.indexOf("tableSize_") == 0)
            self.tableSize = parseInt(message.substring(message.indexOf("_") + 1))
        self.t0 = new Date()


        self.serverMessageCount += 1
        if (self.serverMessageCount % 100 == 0)
            $("#KGbuild_infosDiv").html("")
        var duration = new Date() - self.t0

        $("#KGbuild_infosDiv").prepend("<span class='KGbuild_infosServer'>" + message + "  in  " + (duration * 1000) + " sec. total records :" + (self.tableSize || "") + "</span><br>")
    }

    self.cancelBuild = function () {
        $("#mainDialogDiv").dialog("close")
    }
    return self;
})()
