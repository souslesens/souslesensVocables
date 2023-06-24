import Lineage_sources from "./lineage_sources.js";

var Lineage_rules = (function () {
    var self = {};

    self.showRulesDialog = function () {
        $("#smallDialogDiv").dialog("open");
        $("#smallDialogDiv").dialog("option", "title", "Reasoner");
        self.currentSource = Lineage_sources.activeSource;
        $("#smallDialogDiv").load("snippets/lineage/lineage_rulesDialog.html", function () {
            if (!self.loaded) {
                self.loaded = true;
            }
        });
    };

    self.runRule = function (operation) {
        const params = new URLSearchParams({
            operation: "inference",
            type: "internalGraphUri",
            predicates: JSON.stringify(predicates),
            describeSparqlQuery: describeQuery,
        });
        $("#lineage_rules_infosDiv").html("<span style='color:green;font-style:italic'>Processing " + Lineage_sources.activeSource + "...</span>");

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/jowl/rules?" + params.toString(),
            dataType: "json",

            success: function (data, _textStatus, _jqXHR) {
                if (data.result && data.result == "Error") {
                    return alert(" JOWL error ");
                }

                callback(null, data);
            },
            error(err) {
                return alert(err.responseText);
                if (callback) {
                    return callback(err);
                }
            },
        });
    };

    return self;
})();
export default Lineage_rules;
window.Lineage_rules = Lineage_rules;
