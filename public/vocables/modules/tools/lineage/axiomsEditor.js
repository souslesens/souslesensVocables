import common from "../../shared/common.js";
import ManchesterSyntaxWidget from "../../bots/manchesterSyntaxWidget.js";

var AxiomsEditorXX = (function () {
    var self = {};
    self.keywordsMap = null;

    self.init = function (resourceId, validateFn) {
        self.resourceId = resourceId;
        self.validateFn = validateFn;
        self.showDialog();
    };

    self.showDialog = function () {
        var sourceLabel = Lineage_sources.activeSource;

        $("#smallDialogDiv").dialog("open");
        $("#smallDialogDiv").load("modules/tools/axioms/axiomEditor.html", function () {
            var keyWords = {
                and: { css: "bot-syntax", id: "and", label: "and" },
                or: { css: "bot-syntax", id: "or", label: "or" },
                "(": { css: "bot-syntax", id: "(", label: "(" },
                ")": { css: "bot-syntax", id: ")", label: ")" },
            };

            ManchesterSyntaxWidget.init("axiomInputDiv", sourceLabel, keyWords);
        });
    };

    self.validate = function () {
        var text = ManchesterSyntaxWidget.getText();
        self.validateFn(null, text);
    };

    return self;
})();

export default AxiomsEditorXX;
window.AxiomEditor = AxiomsEditorXX;
