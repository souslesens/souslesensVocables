import botEngine from "./botEngine.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";
import KGquery from "../tools/KGquery/KGquery.js";
import SparqlQuery_bot from "./sparqlQuery_bot.js";
import BotEngine from "./botEngine.js";
import Lineage_sources from "../tools/lineage/lineage_sources.js";
import CommonBotFunctions from "./commonBotFunctions.js";

var CreateSLSVsource_bot = (function () {
    var self = {};

    self.title = "OntoCreator";

    self.start = function () {
        BotEngine.init(CreateSLSVsource_bot, self.workflow, null, function () {
            self.params = { sourceLabel: "", graphUri: "", imports: [] };

            BotEngine.nextStep();
        });
    };
    self.loadingWorkflow = {
        _OR: {
            "Launch Ontology": { loadLineageFn: {} },
            "Launch Semantic Knowledge Graph": { loadKGqueryFn: {} },
        },
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

    self.workflow = {
        promptSourceNameFn: {
            promptGraphUriFn: self.workflow2,
        },
    };

    self.functionTitles = {
        promptSourceNameFn: "Enter source label",
        promptGraphUriFn: "Enter source graphUri",
        listImportsFn: "Add import ",
        saveFn: "Create source",
        uploadFromUrlFn: "Enter graph URL",
        uploadFromFileFn: "Choose graph file",
    };
    self.functions = {
        initFn: function () {
            BotEngine.nextStep();
        },
        createSLSVsourceFn: function () {
            BotEngine.nextStep();
        },
        promptSourceNameFn: function () {
            BotEngine.promptValue("source label", "sourceLabel", "", function (value) {
                if (!value) {
                    BotEngine.previousStep();
                }
                BotEngine.nextStep();
            });
        },
        promptGraphUriFn: function () {
            BotEngine.promptValue("graph Uri", "graphUri", "http://");
        },

        listImportsFn: function () {
            var sources = Object.keys(Config.sources);
            86;
            sources.sort();
            BotEngine.showList(sources, "imports");
        },

        afterImportFn: function () {
            //BotEngine.previousStep();
            BotEngine.currentObj = self.workflow2;
            BotEngine.nextStep(self.workflow2);
        },

        uploadFromUrlFn: function () {
            BotEngine.promptValue("enter remote Url", "uploadUrl", "", function (value) {
                if (!value) {
                    alert("enter a value ");
                    return BotEngine.previousStep();
                }
                self.uploadGraphFromUrl(function (err, result) {
                    if (err) {
                        return alert(err.responseText || err);
                    }
                    return BotEngine.nextStep();
                });
            });
        },
        uploadFromFileFn: function () {
            $("#smallDialogDiv").dialog("open");
            var html =
                '<form id="myForm" enctype="multipart/form-data" method="POST">\n' +
                //  "  <input type=\"file\" id=\"file\" name=\"data\">\n" +
                '  <input type="file" id="file" name="importRDF">\n' +
                '  <button type="submit">Submit</button>\n' +
                "</form>\n" +
                "</body>\n" +
                "<script>\n" +
                '  const form = document.querySelector("#myForm");\n' +
                '  form.addEventListener("submit", (e) => {\n' +
                "    e.preventDefault();\n" +
                "    CreateSLSVsource_bot.uploadGraphFromFile();\n" +
                "  });\n" +
                "</script>";

            $("#smallDialogDiv").html(html);
        },
        uploadFromFileFnResonsive: function () {
            $("#smallDialogDiv").dialog("open");
            var html =
                '<form id="myForm" enctype="multipart/form-data" method="POST">\n' +
                //  "  <input type=\"file\" id=\"file\" name=\"data\">\n" +
                '  <input type="file" id="file" name="importRDF">\n' +
                '  <button type="submit">Submit</button>\n' +
                "</form>\n" +
                "</body>\n" +
                "<script>\n" +
                '  const form = document.querySelector("#myForm");\n' +
                '  form.addEventListener("submit", (e) => {\n' +
                "    e.preventDefault();\n" +
                "    CreateSLSVsource_bot.uploadGraphFromFile();\n" +
                "  });\n" +
                "</script>";

            $("#smallDialogDiv").html(html);
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
                        return BotEngine.reset();
                    }
                    return BotEngine.nextStep();
                }
            );
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

    self.uploadGraphFromFile = function () {
        const form = document.querySelector("#myForm");
        const formData = new FormData(form);
        var input = document.getElementById("file");
        var files = input.files;
        for (var i = 0; i != files.length; i++) {
            formData.append("files", files[i]);
        }
        formData.append("graphUri", self.params.graphUri);
        self.upload(formData, function (err, result) {
            if (err) {
                alert(err.responseText);
                return BotEngine.reset();
            }
            return false;
        });
    };

    self.upload = function (body, callback) {
        MainController.UI.message("Importing graph...");
        $("#waitImg").css("display", "block");

        fetch(`${Config.apiUrl}/jowl/uploadGraph`, {
            method: "POST",
            body: body,
        })
            .then((response) => response.json())
            .then((data) => {
                $("#smallDialogDiv").dialog("close");

                if (data.result == -1) {
                    MainController.UI.message("", true);
                    alert("graph already exist ");
                    return BotEngine.reset();
                } else {
                    MainController.UI.message("imported triples :" + data.result, true);
                    botEngine.nextStep();
                }
                callback();
            })
            .catch((error) => {
                callback(error);
            });
    };

    // using api/rdf from Logilab
    self.uploadXXX = function (formData) {
        MainController.UI.message("Importing graph...");
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
                    MainController.UI.message("", true);
                    alert("graph already exist ");
                    return BotEngine.reset();
                } else {
                    MainController.UI.message("imported triples :" + data.result, true);
                    botEngine.nextStep();
                }
            })
            .catch((error) => {
                alert("graph already exist ");
                return BotEngine.reset();
            });
    };

    return self;
})();

export default CreateSLSVsource_bot;
window.CreateSLSVsource_bot = CreateSLSVsource_bot;
//import("/assets/kg_upload_app.js");
