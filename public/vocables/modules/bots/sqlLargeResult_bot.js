import BotEngineClass from "./_botEngineClass.js";

var SqlLargeResult_bot = (function () {
    var self = {};
    self.myBotEngine = new BotEngineClass();

    self.title = "Large result";
    self.exportChoiceId = "export";
    self.displayChoiceId = "display";
    self.dialogCloseEvent = "dialogclose.sqlLargeResult";

    self.workflow = {
        chooseExportOrDisplayFn: {},
    };

    self.start = function (previewRowsLimit, callbackFn) {
        self.myBotEngine.init(SqlLargeResult_bot, self.workflow, null, function () {
            self.params = { previewRowsLimit: previewRowsLimit };
            self.callbackFn = callbackFn;
            // closing without a choice means display
            $("#botPanel").one(self.dialogCloseEvent, function () {
                callbackFn(null, false);
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
            ];
            self.myBotEngine.showList(choices, null, null, false, function (selectedChoiceId) {
                $("#botPanel").off(self.dialogCloseEvent);
                self.myBotEngine.closeDialog();
                self.callbackFn(null, selectedChoiceId == self.exportChoiceId);
            });
        },
    };

    return self;
})();

export default SqlLargeResult_bot;
window.SqlLargeResult_bot = SqlLargeResult_bot;
