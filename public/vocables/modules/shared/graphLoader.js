var GraphLoader = (function () {
    var self = {};

    self.showImportGraphFromUriDialog = function () {
        $("#smallDialogDiv").load("modules/tools/admin/graphLoaderDialog.html");
        $("#smallDialogDiv").dialog("open");
    };

    self.onImportGraphFromUriDialogValidate = function () {
        var source = $("#importSource_sourceNameInput").val();
        var rdfUrl = $("#importSource_sourceUrlInput").val();
        var graphUri = $("#importSource_graphUriInput").val();
        var group = $("#importSource_groupInput").val();
        var reload = $("#importSource_reloadCBX").prop("checked") ? "true" : null;
        var editable = $("#importSource_editableCBX").prop("checked") ? "true" : null;
        $("#smallDialogDiv").dialog("close");
        var options = {};
        $("#waitImg").css("display", "block");
        UI.message("loading ontology ...");
        GraphLoader.loadGraphFromUrl(source, rdfUrl, graphUri, reload, editable, group, options, function (err, result) {
            if (err) {
                MainController.errorAlert(err);
                callback(err);
            }
            UI.message("Graph loaded", true);
        });
    };

    self.loadGraphFromUrl = function (sourceName, rdfUrl, graphUri, reload, editable, group, options, callback) {
        //  var apiKey = "019adb70-1d64-41b7-8f6e-8f7e5eb54942";
        //  var rdfUrl = "http://data.industryportal.enit.fr/ontologies/" + sourceName + "/download?apikey=" + apiKey + "&download_format=rdf";
        var sourcesJsonFile = "sources.json";

        if (!graphUri) graphUri = "http://industryportal.enit.fr/ontologies/" + sourceName + "/";
        if (!group) group = "ONTOCOMMONS";
        var body = {
            rdfUrl: rdfUrl,
            sourceName: sourceName,
            graphUri: graphUri,
            options: {
                metadata: {},
                sourcesJsonFile: sourcesJsonFile,
                group: group,
                reload: reload,
                editable: editable,
            },
        };

        var payload = {
            body: body,
            POST: true,
        };

        $("#waitImg").css("display", "block");
        UI.message("loading ontology and imports...");

        $.ajax({
            type: "POST",
            url: `${Config.apiUrl}/jowl/importSource`,
            data: payload,
            dataType: "json",
            success: function (data, _textStatus, _jqXHR) {
                var message = "";
                if (data.result > -1) {
                    message = "imported " + data.result + " triples";
                    MainController.loadSources(null, function (_err, _result) {
                        UI.message(message, true);
                        callback(null, message);
                    });
                }
                UI.message(message, true);
                callback(null, message);
            },
            error(err) {
                callback(err.responseText);
            },
        });
    };

    return self;
})();

export default GraphLoader;
window.GraphLoader = GraphLoader;
