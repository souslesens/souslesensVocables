import botEngine from "./botEngine.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";
import KGquery from "../tools/KGquery/KGquery.js";
import SparqlQuery_bot from "./sparqlQuery_bot.js";
import BotEngine from "./botEngine.js";
import Lineage_sources from "../tools/lineage/lineage_sources.js";
import CommonBotFunctions from "./commonBotFunctions.js";

var CreateSLSVsource_bot = (function () {
    var self = {};

    self.title = "Create Source";

    self.start = function () {
        BotEngine.init(CreateSLSVsource_bot, null, function () {
            self.params = { sourceLabel: "", graphUri: "", imports: [] };
            BotEngine.currentObj = self.workflow;
            BotEngine.nextStep(self.workflow);
        });
    };

    self.workflowUpload = {
        _OR: {
            "Upload graph from file": { uploadFromFileFn: { loadLineageFn: {} } },
            //  "Upload graph from URL": { uploadFromUrlFn: {  loadLineageFn: {} }},
            Finish: { loadLineageFn: {} },
        },
    };

    self.workflow2 = {
        _OR: {
            "Add import": { listImportsFn: { afterImportFn: {} } },
            "Create source": { saveFn: self.workflowUpload },
        },
    };

    self.workflow = {
        createSLSVsourceFn: {
            promptSourceNameFn: {
                promptGraphUriFn: self.workflow2,
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
    };
    self.functions = {
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
            sources.sort();
            BotEngine.showList(sources, "imports");
        },

        afterImportFn: function () {
            BotEngine.previousStep();
        },

        uploadFromUrlFn: function () {
            BotEngine.promptValue("enter graph Url", uploadUrl, "http", function (value) {
                if (!value) return BotEngine.nextStep();
            });
        },
        uploadFromFileFn: function () {
            $("#smallDialogDiv").dialog("open");
            var html =
                '<form id="myForm" enctype="multipart/form-data" method="POST">\n' +
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
    };

    self.uploadGraphFromUrl = function () {
        var body = {
            graphUri: self.params.graphUri,
            sourceUrl: self.params.uploadUrl,
        };
        self.upload(body);
        return false;
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
        self.upload(formData);
        return false;
    };
    self.upload = function (body) {
        MainController.UI.message("Importing graph...");
        $("#waitImg").css("display", "block");
        fetch("/api/v1/jowl/uploadGraph", {
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
