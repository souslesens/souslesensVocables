var Config = {};
var Ontocommons = (function () {
    var self = {};
    var apiKey = "019adb70-1d64-41b7-8f6e-8f7e5eb54942";
   // var sourcesJsonFile = "ontocommonsSources.json";
    var sourcesJsonFile = "sources.json";
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

    self.getOntologyMetaData = function (ontologyId, callback) {
        var metaDataUrl = "http://data.industryportal.enit.fr/ontologies/" + ontologyId + "/submissions/1?display=all&apikey=" + apiKey;
        self.apiUrl = "/api/v1";
        var payload = {
            url: metaDataUrl,
            GET: true,
        };
        $.ajax({
            type: "POST",
            url: `${self.apiUrl}/httpProxy`,
            data: payload,
            dataType: "json",

            success: function (data, _textStatus, _jqXHR) {
                var json = JSON.parse(data.result);
                var metaData = {
                    URI: json.URI,
                    imports: json.useImports,
                };
                return callback(null, metaData);
            },
            error(err) {
                return callback(err);
            },
        });
    };

    self.onOntologiesSelect = function (ontologyId) {
        $("#ontolologyUrl").val(ontologyId);
    };

    self.showOntologyInSLSV = function (ontologyId) {
        if (!ontologyId) {
            return;
        }

        self.getOntologyMetaData(ontologyId, function (err, metadata) {
            if (err) return alert(err.responseText);

            $("#slsv_iframe").attr("src", null);
            // var sourceUrl = "http://data.industryportal.enit.fr/ontologies/" + ontologyId + "/submissions/1/download?apikey=" + apiKey;
            var sourceUrl = "http://data.industryportal.enit.fr/ontologies/" + ontologyId + "/download?apikey=" + apiKey + "&download_format=rdf";
            self.currentSource = ontologyId;
            var reload = $("#reloadOntologyCBX").prop("checked");
            var editable = $("#editableCBX").prop("checked");

            var body = {
                sourceUrl: sourceUrl,
                sourceName: ontologyId,

                options: {
                    metadata: metadata,
                    sourcesJsonFile: sourcesJsonFile,

                    reload: reload,
                    editable: editable,
                    graphUri: metadata.URI || null,
                },
            };

            var payload = {
                url: "_default",
                body: body,
                POST: true,
            };

            $("#waitImg").css("display", "block");
            self.message("loading ontology and imports...");
            $.ajax({
                type: "POST",
                url: `${self.apiUrl}/importsource`,
                data: payload,
                dataType: "json",
                success: function (data, _textStatus, _jqXHR) {
                    self.message("");

                    if (data.result != "DONE") {
                        alert(data.result);
                    }

                    $("#slsv_iframe").attr("src", window.location.origin + "/vocables/?sourcesFile=ontocommonsSources.json&tool=lineage&source=" + ontologyId);
                },
                error(err) {
                    alert(err.responseText);
                },
            });
        });
    };
    self.message = function (message) {
        $("#messageDiv").html(message);
    };

    self.loadSourceInSlsv = function (source) {
        return;
        self.currentSource = source;
        var slsv = $("#slsv_iframe")[0].contentWindow;
        slsv.MainController.currentTool = "lineage";
        slsv.MainController.loadSources(sourcesJsonFile, function (err, result) {
            if (err) {
                return callback(err);
            }
            slsv.MainController.UI.initTool("lineage", function (err, result) {
                if (err) {
                    return callback(err);
                }
                slsv.Lineage_sources.showSourcesDialog(source);
            });
        });
    };

    self.getOntologyRootUris = function (url) {
        var body = {
            sourceUrl: url,
            options: {},
        };

        var payload = {
            url: "_default",
            body: JSON.stringify(body),
            POST: true,
        };

        self.message("proecessing ontology ...");
        $.ajax({
            type: "POST",
            url: `${self.apiUrl}/getontologyrooturis`,
            data: payload,
            dataType: "json",
            success: function (data, _textStatus, _jqXHR) {
                /*  var myFrame = $("#slsv_iframe").contents().find('body');
                myFrame.html("<html>"+data.uriRoots+"</html>");*/
                //   $("#resultDiv").html(data.uriRoots)
                alert(data.uriRoots);
                $("#slsv_iframe").html(data.uriRoots)
            },
            error(err) {
                alert(err.responseText);
            },
        });
    };

    return self;
})();
