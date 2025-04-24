import _botEngine from "./_botEngine.js";
import Sparql_proxy from "../sparqlProxies/sparql_proxy.js";

var CreateSLSVsource_bot = (function () {
    var self = {};

    self.title = "OntoCreator";

    self.start = function () {
        _botEngine.init(CreateSLSVsource_bot, self.workflow, null, function () {
            self.params = { sourceLabel: "", graphUri: "", imports: [] };

            _botEngine.nextStep();
        });
    };
    self.loadingWorkflow = {
        loadLineageFn: {},
        /*  _OR: {
            "Launch Lineage": { loadLineageFn: {} },
            "Launch KGquery": { loadKGqueryFn: {} },
        },*/
    };
    self.workflowUpload = {
        _OR: {
            "Upload graph from file": { uploadFromFileFn: self.loadingWorkflow },
            "Upload graph from URL": { uploadFromUrlFn: self.loadingWorkflow },
            Finish: self.loadingWorkflow,
        },
    };

    self.workflow2 = {
        _OR: {
            "Add import": { listImportsFn: { afterImportFn: {} } },
            "Create source": { saveFn: self.workflowUpload },
        },
    };
    self.workflow2withoutUpload = {
        _OR: {
            "Add import": { listImportsFn: { afterImportFnWithoutUpload: {} } },
            "Create source": { getURIFromUpload: { fillParamsFromUpload: self.loadingWorkflow } },
        },
    };

    self.workflow = {
        promptSourceNameFn: {
            _OR: {
                "Create source from upload": {
                    saveUploadSource: {
                        _OR: {
                            "Upload graph from file": { uploadFromFileFn: self.workflow2withoutUpload },
                            "Upload graph from URL": { uploadFromUrlFn: self.workflow2withoutUpload },
                        },
                    },
                },
                "Define new source": { promptGraphUriFn: { validateGraphUriFn: self.workflow2 } },
            },
        },
    };

    self.functionTitles = {
        promptSourceNameFn: "Enter source label",
        promptGraphUriFn: "Enter source graphUri",
        listImportsFn: "Add import ",
        saveFn: "Create source",
        uploadFromUrlFn: "Enter graph URL",
        uploadFromFileFn: "Choose graph file",
        validateGraphUriFn: "validate GraphUri",
    };
    self.functions = {
        initFn: function () {
            _botEngine.nextStep();
        },
        createSLSVsourceFn: function () {
            _botEngine.nextStep();
        },
        promptSourceNameFn: function () {
            _botEngine.promptValue("source label", "sourceLabel", "", null, function (value) {
                if (!value) {
                    _botEngine.previousStep();
                }
                _botEngine.nextStep();
            });
        },
        promptGraphUriFn: function () {
            _botEngine.promptValue("graph Uri", "graphUri", "http://");
        },
        validateGraphUriFn: function () {
            var regex = /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}(\.[a-z]{2,6}|:[0-9]{3,4})\b([-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)/i;
            if (!self.params.graphUri.match(regex)) {
                alert("graphUri is not a correct URL");
                _botEngine.previousStep();
            } else {
                _botEngine.nextStep();
            }
        },

        listImportsFn: function () {
            var sources = Object.keys(Config.sources);
            86;
            sources.sort();
            _botEngine.showList(sources, "imports");
        },

        afterImportFn: function () {
            //_botEngine.previousStep();
            _botEngine.currentObj = self.workflow2;
            _botEngine.nextStep(self.workflow2);
        },
        afterImportFnWithoutUpload: function () {
            //_botEngine.previousStep();
            _botEngine.currentObj = self.workflow2withoutUpload;
            _botEngine.nextStep(self.workflow2withoutUpload);
        },

        uploadFromUrlFn: function () {
            _botEngine.promptValue("enter remote Url", "uploadUrl", "", null, function (value) {
                if (!value) {
                    alert("enter a value ");
                    return _botEngine.previousStep();
                }
                self.uploadGraphFromUrl(function (err, result) {
                    if (err) {
                        return alert(err.responseText || err);
                    }
                    return _botEngine.nextStep();
                });
            });
        },
        uploadFromFileFn: function () {
            window.UploadGraphModal.open(self.params.sourceLabel, () => {
                //_botEngine.currentObj = self.workflowUpload;
                _botEngine.nextStep();
            });
        },

        saveFn: function () {
            async.series(
                [
                    function (callbackSeries) {
                        Lineage_createSLSVsource.createSource(self.params.sourceLabel, self.params.graphUri, self.params.imports, function (err, result) {
                            if (err) {
                                callbackSeries(err);
                            }

                            callbackSeries();
                        });
                    },
                ],
                function (err) {
                    if (err) {
                        alert(err.responseText);
                        return _botEngine.reset();
                    }
                    return _botEngine.nextStep();
                },
            );
        },
        saveUploadSource: function () {
            async.series(
                [
                    function (callbackSeries) {
                        var randomID = common.getRandomHexaId(8);
                        var url = "http://temporary.graphUri." + self.params.sourceLabel + randomID + "/";
                        self.params.graphUri = url;
                        self.params.imports = [];
                        Lineage_createSLSVsource.createSource(self.params.sourceLabel, url, self.params.imports, function (err, result) {
                            if (err) {
                                callbackSeries(err);
                            }
                            self.params.newConfig = result;
                            callbackSeries();
                        });
                    },
                ],
                function (err) {
                    if (err) {
                        alert(err.responseText);
                        return _botEngine.reset();
                    }
                    return _botEngine.nextStep();
                },
            );
        },

        getURIFromUpload: function () {
            var query = `PREFIX owl: <http://www.w3.org/2002/07/owl#>
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            SELECT * FROM <${self.params.graphUri}>   WHERE{
            ?sub ?pred owl:Ontology .
            } `;
            Sparql_proxy.querySPARQL_GET_proxy("_default", query, null, null, function (err, result) {
                if (result?.results?.bindings?.length > 0) {
                    var graphUri = result.results.bindings[0].sub.value;
                    self.params.graphUri = graphUri;
                }
                if (!graphUri) {
                    alert("graphUri not found in the source file, please enter it manually");
                    // Enter it manually and continue worflow
                    return _botEngine.promptValue("enter manually graphUri", "graphUri", self.params.graphUri, null, function (value) {
                        if (!value) {
                            alert("enter a value ");
                            return _botEngine.previousStep();
                        }
                        self.params.graphUri = value;
                        _botEngine.nextStep();
                    });
                } else {
                    _botEngine.nextStep();
                }
            });
        },
        fillParamsFromUpload: function () {
            if (self.params.newConfig) {
                var sourceConfig = self.params.newConfig[self.params.sourceLabel];
                if (!sourceConfig) {
                    alert("source not registered");
                    return _botEngine.reset();
                }
            }

            sourceConfig.graphUri = self.params.graphUri;
            sourceConfig.imports = self.params.imports;
            $.ajax({
                type: "PUT",
                url: `${Config.apiUrl}/sources/${self.params.sourceLabel}`,
                data: JSON.stringify(sourceConfig),
                contentType: "application/json",
                dataType: "json",
                success: function (data, _textStatus, _jqXHR) {
                    return _botEngine.nextStep();
                },
                error: function (err) {
                    return alert(err.responseText);
                },
            });
        },
        loadLineageFn: function () {
            var url = window.location.href;
            url = url.replace("index_old.html", "");
            var p = url.indexOf("?");
            if (p > -1) {
                url = url.substring(0, p);
            }

            url += "?tool=lineage&source=" + self.params.sourceLabel;
            window.location.href = url;
        },
        loadKGqueryFn: function () {
            var url = window.location.href;
            url = url.replace("index_old.html", "");
            var p = url.indexOf("?");
            if (p > -1) {
                url = url.substring(0, p);
            }

            url += "?tool=KGquery&source=" + self.params.sourceLabel;
            window.location.href = url;
        },
    };

    self.uploadGraphFromUrl = function (callback) {
        const formData = new FormData();

        formData.append("graphUri", self.params.graphUri || "http://testCFxxx");
        formData.append("uploadUrl", self.params.uploadUrl);

        self.upload(formData, function (err, result) {
            return callback(err);
        });
    };

    self.upload = function (body, callback) {
        UI.message("Importing graph...");
        $("#waitImg").css("display", "block");

        fetch(`${Config.apiUrl}/jowl/uploadGraph`, {
            method: "POST",
            body: body,
        })
            .then((response) => response.json())
            .then((data) => {
                $("#smallDialogDiv").dialog("close");

                if (data.result == -1) {
                    UI.message("", true);
                    alert("graph already exist ");
                    return _botEngine.reset();
                } else {
                    UI.message("imported triples :" + data.result, true);
                    _botEngine.nextStep();
                }
                callback();
            })
            .catch((error) => {
                callback(error);
            });
    };

    // using api/rdf from Logilab
    self.uploadXXX = function (formData) {
        UI.message("Importing graph...");
        $("#waitImg").css("display", "block");
        var currentUserToken = authentication.currentUser.currentUserToken;
        fetch("/api/v1/rdf/graph", {
            method: "post",
            headers: { Authorization: `Bearer ${currentUserToken}` },
            body: formData,
        })
            .then((response) => response.json())
            .then((data) => {
                $("#smallDialogDiv").dialog("close");
                if (data.result == -1) {
                    UI.message("", true);
                    alert("graph already exist ");
                    return _botEngine.reset();
                } else {
                    UI.message("imported triples :" + data.result, true);
                    botEngine.nextStep();
                }
            })
            .catch((error) => {
                alert("graph already exist ");
                return _botEngine.reset();
            });
    };

    return self;
})();

export default CreateSLSVsource_bot;
window.CreateSLSVsource_bot = CreateSLSVsource_bot;
