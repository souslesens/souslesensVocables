var Ontocommons = (function () {
    var self = {};

    self.currentSource = null;
    self.init = function () {
        self.apiUrl = "/api/v1";
        var payload = {
            url: "http://data.industryportal.enit.fr/ontologies?apikey=521da659-7f0a-4961-b0d8-5e15b52fd185",
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
        $("#slsv_iframe").on("load", function () {
            setTimeout(function () {
                self.loadSourceInSlsv(self.currentSource);
            }, 2000);
        });
    };

    self.showOntologyInSLSV = function (ontologyId) {
        if (!ontologyId) return;
        var sourceUrl = "http://data.industryportal.enit.fr/ontologies/" + ontologyId + "/submissions/1/download?apikey=019adb70-1d64-41b7-8f6e-8f7e5eb54942";

        self.currentSource = ontologyId;

        var body = {
            importSourceFromUrl: 1,
            sourceUrl: sourceUrl,
            sourceName: ontologyId,
            options: {},
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
                $("#slsv_iframe").attr("src", "http://localhost:3010/vocables/");
            },
            error(err) {
                alert(err);
            },
        });
    };

    self.loadSourceInSlsv = function (source) {

        $("#slsv_iframe").attr("src","http://localhost:3010/vocables/?tool=lineage&source="+source)


    };

    self.callSlsv = function () {
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
    };

    return self;
})();
