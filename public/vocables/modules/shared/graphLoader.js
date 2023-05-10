var GraphLoader = (function () {
    var self = {};

    self.loadGraphFromUrl = function (sourceName, rdfUrl, reload, editable, options, callback) {
        var apiKey = "019adb70-1d64-41b7-8f6e-8f7e5eb54942";
        //  var rdfUrl = "http://data.industryportal.enit.fr/ontologies/" + sourceName + "/download?apikey=" + apiKey + "&download_format=rdf";
        var sourcesJsonFile = "sources.json";

        var body = {
            rdfUrl: rdfUrl,
            sourceName: sourceName,
            graphUri: "http://industryportal.enit.fr/ontologies/" + sourceName + "/",
            options: {
                metadata: {},
                sourcesJsonFile: sourcesJsonFile,
                group: "ONTOCOMMONS",
                reload: reload,
                editable: editable,
            },
        };

        var payload = {
            body: body,
            POST: true,
        };

        $("#waitImg").css("display", "block");
        MainController.UI.message("loading ontology and imports...");

        $.ajax({
            type: "POST",
            url: `${Config.apiUrl}/jowl/importSource`,
            data: payload,
            dataType: "json",
            success: function (data, _textStatus, _jqXHR) {
                MainController.UI.message("");

                if (data.result != "DONE") {
                    callback(data.result);
                }
                callback(null, data.result);
            },
            error(err) {
                callback(err.responseText);
            },
        });
    };

    return self;
})();

export default GraphLoader;
