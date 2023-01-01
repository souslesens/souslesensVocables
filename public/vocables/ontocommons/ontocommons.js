var Ontocommons = (function () {
    var self = {};
    var apiKey = "019adb70-1d64-41b7-8f6e-8f7e5eb54942";
    var sourcesJsonFile = "ontocommonsSources.json";
    self.currentSource = null;
    self.init = function () {
        self.listPortalOntologies();

        $("#slsv_iframe").on("load", function () {
            setTimeout(function () {
                self.loadSourceInSlsv(self.currentSource);
            }, 2000);
        });
    };

    self.listPortalOntologies = function () {
        self.apiUrl = "/api/v1";
        var payload = {
            url: "http://data.industryportal.enit.fr/ontologies?apikey=" + apiKey,
            GET: true,
        };
        $.ajax({
            type: "POST",
            url: `${self.apiUrl}/httpProxy`,
            data: payload,
            dataType: "json",
            success: function (data, _textStatus, _jqXHR) {
                var x = data;
                var jsonArray = JSON.parse(data.result);
                self.ontologiesMap = {};

                jsonArray.forEach(function (item) {
                    self.ontologiesMap[item.acronym] = item;
                });

                var acronyms = Object.keys(self.ontologiesMap);
                acronyms.sort();
                common.fillSelectOptions("ontocommons_ontologiesSelect", acronyms, true);
            },
            error(err) {},
        });
    };

    self.showOntologyInSLSV = function (ontologyId) {
        if (!ontologyId) return;
        var sourceUrl = "http://data.industryportal.enit.fr/ontologies/" + ontologyId + "/submissions/1/download?apikey=" + apiKey;

        self.currentSource = ontologyId;
        var reload = $("#reloadOntologyCBX").prop("checked");
        var editable = $("#editableCBX").prop("checked");

        var body = {
            importSourceFromUrl: 1,
            sourceUrl: sourceUrl,
            sourceName: ontologyId,
            options: {
                sourcesJsonFile: sourcesJsonFile,
                reload: reload,
                editable: editable,
            },
        };

        var payload = {
            url: "_default",
            body: JSON.stringify(body),
            POST: true,
        };

        $.ajax({
            type: "POST",
            url: `${self.apiUrl}/httpProxy`,
            data: payload,
            dataType: "json",
            success: function (data, _textStatus, _jqXHR) {
                $("#slsv_iframe").attr("src", window.location.origin + "/vocables/");
            },
            error(err) {
                alert(err.responseText);
            },
        });
    };

    self.loadSourceInSlsv = function (source) {
        self.currentSource = source;
        var slsv = $("#slsv_iframe")[0].contentWindow;
        slsv.MainController.currentTool = "lineage";
        slsv.MainController.loadSources(sourcesJsonFile, function (err, result) {
            if (err) return callback(err);
            slsv.MainController.UI.initTool("lineage", function (err, result) {
                if (err) return callback(err);
                slsv.Lineage_sources.showSourcesDialog(source);
            });
        });
    };

    /* self.callSlsv = function () {
        var body = {
            openLineage: true,
            source: "ddd",
        };

        var payload = {
            url: "_default",
            body: JSON.stringify(body),
            POST: true,
        };

        $.ajax({
            type: "POST",
            url: `${self.apiUrl}/httpProxy`,
            data: payload,
            dataType: "json",
            success: function (data, _textStatus, _jqXHR) {
                return callback(null, data);
            },
            error: function (err) {
                return callback(err);
            },
        });
    };*/

    return self;
})();
