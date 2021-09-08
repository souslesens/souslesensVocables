var ADLbuild = (function () {
    var self = {};

    self.initDialog = function () {
        var currentADL = $("#ADLmappings_DatabaseSelect").val();
        if (!currentADL || currentADL == "")
            return alert("select an ADL")

            if(!ADLmappings.checkMappingEditionSave())
                return



        $("#mainDialogDiv").load("snippets/ADL/ADLbuildDialog.html");
        $("#mainDialogDiv").dialog("open");
        setTimeout(function () {
            var graphUri = "http://data.total.com/resource/one-model/assets/..."
            if (ADLmappingData.currentADLgraphURI)
                graphUri = ADLmappingData.currentADLgraphURI
            $("#ADLbuild_sparqlServerUrl").val(Config.default_sparql_url)
            $("#ADLbuild_adlGraphUri").val(graphUri)
            $("#ADLbuild_rdlGraphUri").val("http://data.total.com/resource/one-model/quantum-rdl/")
            $("#ADLbuild_oneModelGraphUri").val(Config.sources["ONE-MODEL"].graphUri[0])
        }, 200)


    }

    self.onAllTreeCbxChange = function (allCBX, jstreeDiv) {
        var checked = $(allCBX).prop("checked")
        var jsonNodes = $('#'+jstreeDiv).jstree(true).get_json('#', { flat: true });
        var nodes=[]
        var graphUri
        $.each(jsonNodes, function (i, val) {
            if( val.data.adlSource) {
                nodes.push($(val).attr('id'))

            }


        })

        $("#" + jstreeDiv).jstree(true).check_node(nodes);

    }

    self.buildTriples = function () {
        $("#ADLbuild_infosDiv").html("")
        self.checked_tables = $("#ADLmappings_dataModelTree").jstree().get_checked();
        if (self.checked_tables.length == 0)
            return alert("Select mapped tables")
        var tables = []
        self.checked_tables.forEach(function (table) {
            tables.push(ADLmappingData.currentSource + "_" + table.replace(/_/,"."))
        })

        var sparqlServerUrl = $("#ADLbuild_sparqlServerUrl").val()
        var adlGraphUri = $("#ADLbuild_adlGraphUri").val()
        var replaceGraph = $("#ADLbuild_replaceGraph").prop("checked")



        if(replaceGraph && !confirm("erase existing graph"))
            return


        if (adlGraphUri.indexOf("...") > -1) {
            return alert("enter a valid graph URI")
        }

        var payload = {
            buildADL: true,
            mappingFileNames: JSON.stringify(tables),
            sparqlServerUrl: sparqlServerUrl,
            adlGraphUri: adlGraphUri,
            replaceGraph: replaceGraph,
            dataSource:JSON.stringify(Config.sources[ADLmappingData.currentSource].dataSource)
        }

        $.ajax({
            type: "POST",
            url: Config.serverUrl,
            data: payload,
            dataType: "json",

            success: function (result, textStatus, jqXHR) {
                $("#ADLbuild_infosDiv").prepend("<span class='ADLbuild_infosOK'>ALL DONE</span><br>")

            }, error(err) {
                $("#ADLbuild_infosDiv").prepend("<span class='ADLbuild_infosError'>" + err.responseText+ "</span><br>")
            }
        })

        //  triplesGenerator.buidlADL(mappingFileNames, sparqlServerUrl, adlGraphUri, rdlGraphUri, oneModelGraphUri, replaceGraph, function (err, result) {


    }
    self.serverMessage=function(message){
        $("#ADLbuild_infosDiv").prepend("<span class='ADLbuild_infosServer'>"+message+"</span><br>")
    }

    self.cancelBuild = function () {
        $("#mainDialogDiv").dialog("close")
    }
    return self;
})()