import BotEngineClass from "./_botEngineClass.js";
import Sparql_proxy from "../sparqlProxies/sparql_proxy.js";

var CreateSLSVsource_bot = (function () {
    var self = {};
    self.myBotEngine = new BotEngineClass();

    self.title = "OntoCreator";

    self.start = function () {
        self.myBotEngine.init(CreateSLSVsource_bot, self.workflow, null, function () {
            self.params = { sourceLabel: "", graphUri: "", imports: [] };

            self.myBotEngine.nextStep();
        });
    };

    self.loadingWorkflow = {
        _OR: {
            "Launch Lineage": { loadLineageFn: {} },
            "Launch Mapping Modeler": { loadMappingModelerFn: {} },
            "Add Ontology Metadata": { workflowMetaDataFn: {} },
        },
    };
 

    self.workflowMetaData = {
        _OR: {
            "Add Ontology Description": { promptDescriptionFn: self.loadingWorkflow },
            Finish: self.loadingWorkflow,
        },
    };

    self.workflowUpload = {
        _OR: {
            "Upload graph from file": { uploadFromFileFn: self.loadingWorkflow },
            "Upload graph from URL": { uploadFromUrlFn: self.loadingWorkflow },
            "Add description": { addMetadata: self.workflowUploadwithoutDescription },
            Finish: self.loadingWorkflow,
        },
    };

    self.workflowUploadwithoutDescription = {
        _OR: {
            "Upload graph from file": { uploadFromFileFn: self.loadingWorkflow },
            "Upload graph from URL": { uploadFromUrlFn: self.loadingWorkflow },
            Finish: self.loadingWorkflow,
        },
    };
    self.workflow2 = {
        _OR: {
            "Add import": { listImportsFn: { afterImportFn: {} } },
            "Create source": { saveFn: { addCreatorFn: self.workflowUpload } },
        },
    };
    self.workflow2withoutUpload = {
        _OR: {
            "Add import": { listImportsFn: { afterImportFnWithoutUpload: {} } },
            "Create source": { getURIFromUpload: { fillParamsFromUpload: self.loadingWorkflow } },
        },
    };

    self.workflowAfterUpload = {
        _OR: {
            "Add import": { listImportsFn: { afterImportFn: {} } },
            "Create source": self.loadingWorkflow,
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
            self.myBotEngine.nextStep();
        },
        createSLSVsourceFn: function () {
            self.myBotEngine.nextStep();
        },
        promptSourceNameFn: function () {
            self.myBotEngine.promptValue("source label", "sourceLabel", "", null, function (value) {
                if (!value) {
                    return self.myBotEngine.previousStep();
                }
                self.params.sourceLabel = value;
                self.myBotEngine.nextStep();
            });
        },
        promptGraphUriFn: function () {
            self.myBotEngine.promptValue("graph Uri", "graphUri", "http://");
        },
        validateGraphUriFn: function () {
            // check that graphUri is a valid URL using URL constructor.
            // this is the same method used by zod
            // https://zod.dev/api?id=urls
            try {
                new URL(self.params.graphUri);
            } catch {
                alert("graphUri is not a correct URL");
                return self.myBotEngine.previousStep();
            }
            self.myBotEngine.nextStep();
        },

        addMetadata: function () {
            self.myBotEngine.promptTextarea("Ontology description", "ontologyDescription", "", function (value) {
                const removeData = [];
                const addDataWithType = [
                    {
                        metadata: "http://purl.org/dc/elements/1.1/description",
                        value: value,
                        type: "literal",
                        "xml:lang": "en",
                    },
                ];

                $.ajax({
                    type: "POST",
                    url: `/api/v1/rdf/graph/metadata?source=${self.params.sourceLabel}`,
                    data: JSON.stringify({
                        addedData: addDataWithType,
                        removedData: [],
                    }),
                    contentType: "application/json",

                    success: function () {
                        UI.message("Ontology description added", true);
                        self.myBotEngine.currentObj = self.workflowUploadwithoutDescription;
                        self.myBotEngine.nextStep();
                    },

                    error: function (err) {
                        MainController.errorAlert(err);
                        self.myBotEngine.currentObj = self.workflowUploadwithoutDescription;
                        self.myBotEngine.nextStep();
                    },
                });
                return false;
            });
        },

        listImportsFn: function () {
            var sources = Object.keys(Config.sources);
            sources.sort();
            self.myBotEngine.showList(sources, "imports");
        },

        afterImportFn: function () {
            //self.myBotEngine.previousStep();
            self.myBotEngine.currentObj = self.workflow2;
            self.myBotEngine.nextStep(self.workflow2);
        },
        afterImportFnWithoutUpload: function () {
            //self.myBotEngine.previousStep();
            self.myBotEngine.currentObj = self.workflow2withoutUpload;
            self.myBotEngine.nextStep(self.workflow2withoutUpload);
        },

        uploadFromUrlFn: function () {
            self.myBotEngine.promptValue("enter remote Url", "uploadUrl", "", null, function (value) {
                if (!value) {
                    alert("enter a value ");
                    return self.myBotEngine.previousStep();
                }
                self.uploadGraphFromUrl(function (err, result) {
                    if (err) {
                        return MainController.errorAlert(err);
                    }
                    return self.myBotEngine.nextStep();
                });
            });
        },
        uploadFromFileFn: function () {
            const apiUrl = Config.slsPyApi.enabled ? Config.slsPyApi.url.replace(/\/$/, "").concat("/") : "/";
            window.UploadGraphModal.open(apiUrl, self.params.sourceLabel, () => {
                self.myBotEngine.currentObj = self.workflowUpload;
                self.myBotEngine.nextStep(self.workflowUpload);
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
                        MainController.errorAlert(err);
                        return self.myBotEngine.reset();
                    }
                    return self.myBotEngine.nextStep();
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
                        MainController.errorAlert(err);
                        return self.myBotEngine.reset();
                    }
                    return self.myBotEngine.nextStep();
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
                    return self.myBotEngine.promptValue("enter manually graphUri", "graphUri", self.params.graphUri, null, function (value) {
                        if (!value) {
                            alert("enter a value ");
                            return self.myBotEngine.previousStep();
                        }
                        self.params.graphUri = value;
                        self.myBotEngine.nextStep();
                    });
                } else {
                    self.myBotEngine.nextStep();
                }
            });
        },
        fillParamsFromUpload: function () {
            if (self.params.newConfig) {
                var sourceConfig = self.params.newConfig[self.params.sourceLabel];
                if (!sourceConfig) {
                    alert("source not registered");
                    return self.myBotEngine.reset();
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
                    return self.myBotEngine.nextStep();
                },
                error: function (err) {
                    return MainController.errorAlert(err);
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
        loadMappingModelerFn: function () {
            var url = window.location.href;
            url = url.replace("index_old.html", "");
            var p = url.indexOf("?");
            if (p > -1) {
                url = url.substring(0, p);
            }

            url += "?tool=MappingModeler&source=" + self.params.sourceLabel;
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
        promptDescriptionFn: function () {
            self.myBotEngine.promptValue("Ontology description", "ontologyDescription", "", null, function (value) {
                if (!value) {
                    return self.myBotEngine.previousStep();
                }
                const ontologyDescription = [
                    {
                        id: 1,
                        isNew: true,
                        metadata: "http://purl.org/dc/elements/1.1/description",
                        shortType: undefined,
                        type: "literal",
                        value: value,
                        "xml:lang": "en",
                    },
                ];

                $.ajax({
                    type: "POST",
                    url: `${Config.apiUrl}/rdf/graph/metadata?source=${self.params.sourceLabel}`,
                    data: JSON.stringify({ addedData: ontologyDescription, removedData: [] }),
                    contentType: "application/json",
                    success: function (data, _textStatus, _jqXHR) {
                        return self.myBotEngine.nextStep();
                    },
                    error: function (err) {
                        MainController.errorAlert(err);
                        return self.myBotEngine.previousStep();
                    },
                });
            });
        },
        addCreatorFn: function () {
            const ontologyCreator = [
                {
                    id: 0,
                    isNew: true,
                    metadata: "http://purl.org/dc/elements/1.1/creator",
                    shortType: undefined,
                    type: "literal",
                    value: authentication.currentUser.identifiant,
                    "xml:lang": "en",
                },
            ];

            $.ajax({
                type: "POST",
                url: `${Config.apiUrl}/rdf/graph/metadata?source=${self.params.sourceLabel}`,
                data: JSON.stringify({ addedData: ontologyCreator, removedData: [] }),
                contentType: "application/json",
                success: function (data, _textStatus, _jqXHR) {
                    return self.myBotEngine.nextStep();
                },
                error: function (err) {
                    MainController.errorAlert(err);
                    return self.myBotEngine.previousStep();
                },
            });
        },
        workflowMetaDataFn: function () {
            self.myBotEngine.currentObj = self.workflowMetaData;
            self.myBotEngine.nextStep(self.workflowMetaData);
        },

        updateSourceFn: (sourceConfig) => {
            setLoading(true);
            $.ajax({
                url: `/api/v1/sources/${self.params.sourceLabel}`,
                type: "PUT",
                contentType: "application/json",
                data: JSON.stringify(sourceConfig, null, "\t"),
                success: function (data, textStatus, jqXHR) {
                    if (jqXHR.status === 200) {
                        window.Config.sources = data.resources;
                    } else {
                        alert(data.message);
                        return self.myBotEngine.previousStep();
                    }
                    setLoading(false);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    MainController.errorAlert(jqXHR);
                    setLoading(false);
                    return self.myBotEngine.previousStep();
                },
            });
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
                    return self.myBotEngine.reset();
                } else {
                    UI.message("imported triples :" + data.result, true);
                    self.myBotEngine.nextStep();
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
                    return self.myBotEngine.reset();
                } else {
                    UI.message("imported triples :" + data.result, true);
                    botEngine.nextStep();
                }
            })
            .catch((error) => {
                alert("graph already exist ");
                return self.myBotEngine.reset();
            });
    };

    return self;
})();

export default CreateSLSVsource_bot;
window.CreateSLSVsource_bot = CreateSLSVsource_bot;
