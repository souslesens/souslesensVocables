var Axiom_UI = (function () {
    var self = {};

    self.currentView = null;
    self.previousView = null;

    var ALL_ELEMENTS = [
        "nodeInfosAxioms_activeLegendDiv",
        "nodeInfosAxioms_newAxiomPanel",
        "axiomEditor_clearBtn",
        "axiomEditor_saveBtn",
        "axiomEditor_showTriplesBtn",
        "axiomEditor_copyTriplesBtn",
        "axiomEditor_deleteTriplesBtn",
        "axiomsEditor_textDiv",
        "nodeInfosAxioms_newAxiomBtn",
        "nodeInfosAxioms_axiomSelect",
    ];

    var VIEW_CONFIG = {
        newAxiom: {
            visible: ["nodeInfosAxioms_activeLegendDiv", "nodeInfosAxioms_newAxiomPanel", "axiomEditor_clearBtn", "axiomEditor_saveBtn", "axiomEditor_showTriplesBtn","nodeInfosAxioms_axiomSelect"],
            showTriplesLabel: "show triples",
        },
        visualisation: {
            visible: ["axiomEditor_showTriplesBtn", "nodeInfosAxioms_newAxiomBtn"],
            showTriplesLabel: "show triples",
        },
        showTriples: {
            visible: ["axiomEditor_saveBtn", "axiomEditor_copyTriplesBtn", "axiomEditor_deleteTriplesBtn", "axiomsEditor_textDiv", "nodeInfosAxioms_newAxiomBtn"],
            showTriplesLabel: "show triples",
        },
    };

    self.setView = function (viewName) {
        var config = VIEW_CONFIG[viewName];
        if (!config) {
            return;
        }

        self.previousView = self.currentView;
        self.currentView = viewName;

        ALL_ELEMENTS.forEach(function (elementId) {
            var element = $("#" + elementId);
            if (config.visible.indexOf(elementId) > -1) {
                element.show();
            } else {
                element.hide();
            }
        });

        if (viewName === "showTriples" && self.previousView !== "newAxiom") {
            $("#axiomEditor_saveBtn").hide();
        }

        $("#axiomEditor_showTriplesBtn").text(config.showTriplesLabel);

        if (config.visible.indexOf("nodeInfosAxioms_activeLegendDiv") > -1 && Axiom_activeLegend.axiomsLegendVisjsGraph) {
            Axiom_activeLegend.axiomsLegendVisjsGraph.network.fit();
        }
    };

    self.showSuggestionsPanel = function () {
        $("#nodeInfosAxioms_activeLegendDiv").css("visibility", "hidden");
        $("#nodeInfosAxioms_newAxiomPanel").css("visibility", "visible");
    };

    self.showLegendPanel = function () {
        $("#nodeInfosAxioms_newAxiomPanel").css("visibility", "hidden");
        $("#nodeInfosAxioms_activeLegendDiv").css("visibility", "visible");
        if (Axiom_activeLegend.axiomsLegendVisjsGraph) {
            Axiom_activeLegend.axiomsLegendVisjsGraph.network.fit();
        }
    };

    return self;
})();

export default Axiom_UI;
window.Axiom_UI = Axiom_UI;
