import BotEngineClass from "./_botEngineClass.js";

var SqlLargeResult_bot = (function () {
    var self = {};
    self.myBotEngine = new BotEngineClass();

    self.title = "Large result";
    self.exportChoiceId = "export";
    self.displayChoiceId = "display";
    self.sampleChoiceId = "sample";
    self.dialogCloseEvent = "dialogclose.sqlLargeResult";
    self.positiveIntegerRegex = /^\d+$/;

    self.workflow = {
        chooseExportOrDisplayFn: {},
    };

    self.start = function (previewRowsLimit, callbackFn) {
        self.myBotEngine.init(SqlLargeResult_bot, self.workflow, null, function () {
            self.params = { previewRowsLimit: previewRowsLimit };
            self.callbackFn = callbackFn;
            // closing without a choice means display
            $("#botPanel").one(self.dialogCloseEvent, function () {
                callbackFn(null, false, previewRowsLimit);
            });
            self.myBotEngine.nextStep();
        });
    };

    self.functions = {
        chooseExportOrDisplayFn: function () {
            self.myBotEngine.insertBotMessage("More than " + self.params.previewRowsLimit + " rows", { isQuestion: true });
            var choices = [
                { id: self.exportChoiceId, label: "Export all rows to CSV" },
                { id: self.displayChoiceId, label: "Display the first " + self.params.previewRowsLimit + " rows" },
                { id: self.sampleChoiceId, label: "sample" },
            ];
            self.myBotEngine.showList(choices, null, null, false, function (selectedChoiceId) {
                if (selectedChoiceId == self.sampleChoiceId) {
                    return self.functions.promptSampleSizeFn();
                }
                $("#botPanel").off(self.dialogCloseEvent);
                self.myBotEngine.closeDialog();
                self.callbackFn(null, selectedChoiceId == self.exportChoiceId, self.params.previewRowsLimit);
            });
        },

        promptSampleSizeFn: function () {
            self.myBotEngine.promptValue("enter a sample < " + self.params.previewRowsLimit, "sampleSize", "", null, function (typedValue) {
                var trimmedValue = typedValue.trim();
                var sampleSize = parseInt(trimmedValue);
                if (!self.positiveIntegerRegex.test(trimmedValue) || sampleSize < 1 || sampleSize >= self.params.previewRowsLimit) {
                    return self.functions.promptSampleSizeFn();
                }
                $("#botPanel").off(self.dialogCloseEvent);
                self.myBotEngine.closeDialog();
                self.callbackFn(null, false, sampleSize);
            });
        },
    };

    return self;
})();

export default SqlLargeResult_bot;
window.SqlLargeResult_bot = SqlLargeResult_bot;
