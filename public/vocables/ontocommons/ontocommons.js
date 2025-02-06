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

    self.listPortalOntologies = function (callback) {
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
            if (err) {
                return alert(err.responseText);
            }

            $("#slsv_iframe").attr("src", null);

            var sourceUrl = "http://data.industryportal.enit.fr/ontologies/" + ontologyId + "/download?apikey=" + apiKey + "&download_format=rdf";
            self.currentSource = ontologyId;
            var reload = $("#reloadOntologyCBX").prop("checked");
            var editable = $("#editableCBX").prop("checked");

            var body = {
                rdfUrl: sourceUrl,
                sourceName: ontologyId,
                graphUri: metadata.URI || "http://industryportal.enit.fr/ontologies/" + ontologyId + "/",
                options: {
                    metadata: metadata,
                    sourcesJsonFile: sourcesJsonFile,
                    group: "ONTOCOMMONS",
                    reload: reload,
                    editable: editable,
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
                url: `${self.apiUrl}/jowl/importSource`,
                data: payload,
                dataType: "json",
                success: function (data, _textStatus, _jqXHR) {
                    self.message("");

                    if (data.result != "DONE") {
                        alert(data.result);
                    }
                    var sourcesFile = "ontocommonsSources.json";
                    sourcesFile = "";

                    $("#slsv_iframe").attr("src", window.location.origin + "/vocables/index.html?" + sourcesFile + "tool=lineage&source=" + ontologyId);
                },
                error(err) {
                    alert(err.responseText);
                },
            });
        });
    };

    self.showOntologyInSLSV_iFrame = function (ontologyId, rdfUrlUrl) {
        if (!ontologyId) {
            return;
        }
        var reload = $("#reloadOntologyCBX").prop("checked");
        var editable = $("#editableCBX").prop("checked");

        if (!rdfUrlUrl) {
            rdfUrlUrl = "http://data.industryportal.enit.fr/ontologies/" + ontologyId + "/download?apikey=" + apiKey + "&download_format=rdf";
        }
        var rdfUrlEncoded = encodeURIComponent(rdfUrlUrl);
        var slsvUrl = window.location.protocol + "//" + window.location.host;
        //  var slsvUrl = "https://slsvasso.org/vocables/";
        var slsvUrl = "http://51.178.39.209/vocables/";
        var targetUrl = slsvUrl + "?tool=lineage&source=" + ontologyId + "&rdfUrl=" + rdfUrlEncoded + "&reload=" + reload + "&editable=" + editable;
        $("#slsv_iframe").attr("src", targetUrl);
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
            slsv.UI.initTool("lineage", function (err, result) {
                if (err) {
                    return callback(err);
                }
                slsv.Lineage_sources.showSourcesDialog(source);
            });
        });
    };

    self.getOntologyRootUris = function (ontologyId, callback) {
        $("#TA").val("");
        var sourceUrl = "http://data.industryportal.enit.fr/ontologies/" + ontologyId + "/download?apikey=" + apiKey + "&download_format=rdf";

        var body = {
            sourceUrl: sourceUrl,
            options: {},
        };

        var payload = {
            url: "_default",
            body: body,
            POST: true,
        };

        self.message("processing ontology " + ontologyId + "...");
        $.ajax({
            type: "POST",
            url: `${self.apiUrl}/getOntologyRootUris`,
            data: payload,
            dataType: "json",
            success: function (data, _textStatus, _jqXHR) {
                if (callback) {
                    return callback(null, data);
                }
                var myFrame = $("#slsv_iframe").contents().find("body");

                $(myFrame).addClass("iframeDiv");
                myFrame.html("<textarea id='TA' style='width:500px;height: 600px'>" + ontologyId + "\n" + data.uriRoots + "</textarea>");
            },
            error(err) {
                if (callback) {
                    return callback(err);
                }
                // alert(err.responseText);
            },
        });
    };

    self.getAllRootUris = function () {
        var allUris = {};

        var ontologyIds = [];
        var ontologiesInfos = [];
        var synthesis;
        async.series(
            [
                function (callbackSeries) {
                    ontologyIds = Object.keys(self.ontologiesMap);
                    //  ontologyIds = ontologyIds.slice(0, 5);
                    callbackSeries();
                },
                function (callbackSeries) {
                    async.eachSeries(
                        ontologyIds,
                        function (ontologyId, callbackEach) {
                            console.log(ontologiesInfos.length + "  " + ontologyId);
                            var obj = { id: ontologyId };
                            self.getOntologyRootUris(ontologyId, function (err, result) {
                                if (err) {
                                    obj.error = err.responseText;
                                    ontologiesInfos.push(obj);
                                    return callbackEach();
                                }
                                obj.triplesCount = result.triplesCount;
                                obj.rootUris = result.uriRoots;
                                ontologiesInfos.push(obj);
                                result.uriRoots.forEach(function (uri) {
                                    if (!allUris[uri]) {
                                        allUris[uri] = [];
                                    }
                                    allUris[uri].push(ontologyId);
                                });

                                callbackEach();
                            });
                        },
                        function (err) {
                            synthesis = {
                                allUris: allUris,
                                ontologiesInfos: ontologiesInfos,
                            };

                            callbackSeries(err);
                        },
                    );
                },
                function (callbackSeries) {
                    var str = "";
                    for (var key in synthesis.allUris) {
                        var ids = synthesis.allUris[key];
                        str += key + JSON.stringify(ids) + "\n";
                    }
                    console.log(str);
                    console.log("-----------");
                    var str2 = "";
                    synthesis.ontologiesInfos.forEach(function (ontology) {
                        str2 += ontology.id + "," + (ontology.triplesCount || "") + "," + (ontology.error || "") + "\n";
                    });
                    console.log(str2);
                    callbackSeries();
                },
            ],
            function (err) {
                console.log("DONE");
            },
        );
    };
    self.importOntologyFromURL = function () {
        var sourceName = prompt("enter a SLSV source name");
        if (!sourceName) {
            return;
        }
        var url = prompt("enter ontology URL");
        if (!url) {
            return;
        }
        self.showOntologyInSLSV_iFrame(sourceName, url);
    };

    return self;
})();
