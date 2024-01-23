import botEngine from "./botEngine.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";
import KGquery from "../tools/KGquery/KGquery.js";
import SparqlQuery_bot from "./sparqlQuery_bot.js";
import BotEngine from "./botEngine.js";
import Lineage_sources from "../tools/lineage/lineage_sources.js";
import CommonBotFunctions from "./commonBotFunctions.js";

var CreateSLSVsource_bot = (function () {
    var self = {};
    self.umountKGUploadApp = null;
    self.createApp = null;
    self.title = "Create Source";
    self.uploadFormData = {
        displayForm: "file", // can be database, file or ""
        currentSource: "",
        selectedDatabase: "",
        selectedFiles: [],
        files: [],
    };
    self.start = function () {
        BotEngine.init(CreateSLSVsource_bot, null, function () {
            self.params = { sourceLabel: "", graphUri: "", imports: [] };
            BotEngine.currentObj = self.workflow;
            BotEngine.nextStep(self.workflow);
        });
    };

    self.workflow2 = {
        _OR: {
            "create source": { saveFn: { loadLineage: {} } },
            "add import": { listImportsFn: { afterImportFn: {} } },
            "upload graph from file": { uploadFromFileFn: { afterImportFn: {} } },
            "upload graph from URL": { uploadFromUrlFn: { afterImportFn: {} } },
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
        promptSourceNameFn: "enter source label",
        promptGraphUriFn: "enter source graphUri",
        listImportsFn: "add import ",
        saveFn: "create source",
        uploadFromUrlFn: "enter graph URL",
        uploadFromFileFn: "choose graph file",
    };
    self.functions = {
        createSLSVsourceFn: function () {
            BotEngine.nextStep();
        },
        promptSourceNameFn: function () {
            BotEngine.promptValue("source label", "sourceLabel", "", function (value) {
                if (!value) BotEngine.previousStep();
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
            BotEngine.promptValue("enter graph Url", uploadUrl);
        },
        uploadFromFileFn: function () {
            var answer = window.confirm("This operation will create the source automatically after the file uploading, Make sure you have finished to make your imports");
            if (!answer) {
                BotEngine.previousStep();
            } else {
                var html = ' <div id="mount-upload-here"></div>';
                $("#smallDialogDiv").html(html);
                $("#smallDialogDiv").dialog({
                    open: function (event, ui) {
                        if (self.createApp === null) {
                            throw new Error("React app is not ready");
                        }
                        self.uploadFormData.currentSource = self.params.sourceLabel;
                        self.umountKGUploadApp = self.createApp(self.uploadFormData);
                    },
                    beforeClose: function () {
                        self.umountKGUploadApp();
                    },
                });
                $("#smallDialogDiv").dialog("open");
                BotEngine.nextStep();
            }
        },

        saveFn: function () {
            async.series(
                [
                    function (callbackSeries) {
                        Lineage_createSource.createSource(self.params.sourceLabel, self.params.graphUri, self.params.imports, function (err, result) {
                            if (err) {
                                return alert(err);
                            }

                            callbackSeries();
                        });
                    },
                    function (callbackSeries) {},
                ],
                function (err) {
                    if (err) alert(err.responsetext);
                    return BotEngine.nextStep();
                }
            );
        },
        loadLineage: function () {},
    };

    return self;
})();

export default CreateSLSVsource_bot;
window.CreateSLSVsource_bot = CreateSLSVsource_bot;
// imports React app
import("/assets/SourceCreatorUploading.js");
