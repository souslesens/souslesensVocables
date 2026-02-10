var Axiom_UI = (function () {
    var self = {};

    self.currentView = null;

    var ALL_ELEMENTS = [
        "nodeInfosAxioms_activeLegendDiv",
        "nodeInfosAxioms_newAxiomPanel",
        "axiomEditor_clearBtn",
        "axiomEditor_saveBtn",
        "axiomEditor_showTriplesBtn",
        "axiomEditor_copyTriplesBtn",
        "axiomEditor_deleteTriplesBtn",
    ];

    var VIEW_CONFIG = {
        newAxiom: {
            visible: [
                "nodeInfosAxioms_activeLegendDiv",
                "nodeInfosAxioms_newAxiomPanel",
                "axiomEditor_clearBtn",
                "axiomEditor_saveBtn",
                "axiomEditor_showTriplesBtn",
            ],
            showTriplesLabel: "show triples",
        },
        visualisation: {
            visible: [
                "axiomEditor_showTriplesBtn",
            ],
            showTriplesLabel: "Edit Axiom",
        },
        showTriples: {
            visible: [
                "nodeInfosAxioms_activeLegendDiv",
                "nodeInfosAxioms_newAxiomPanel",
                "axiomEditor_saveBtn",
                "axiomEditor_copyTriplesBtn",
                "axiomEditor_deleteTriplesBtn",
            ],
            showTriplesLabel: "show triples",
        },
    };

    self.setView = function (viewName) {
        var config = VIEW_CONFIG[viewName];
        if (!config) {
            return;
        }

        self.currentView = viewName;

        ALL_ELEMENTS.forEach(function (elementId) {
            var element = $("#" + elementId);
            if (config.visible.indexOf(elementId) > -1) {
                element.show();
            } else {
                element.hide();
            }
        });

        $("#axiomEditor_showTriplesBtn").text(config.showTriplesLabel);
    };

    return self;
})();

export default Axiom_UI;
window.Axiom_UI = Axiom_UI;
