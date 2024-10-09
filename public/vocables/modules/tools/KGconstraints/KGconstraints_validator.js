var KGconstraints_editor_editor = (function () {
    var self = {};

    self.onLoaded = function () {
        $("#graphDiv").load("./modules/tools/KGcontstraints/html/centralPanel.html", function () {
            $("#lateralPanelDiv").load("./modules/tools/KGcontstraints/html/leftPanel.html", function () {});
        });
    };

    self.startConstraintEidtorBot = function () {};
    return self;
})();
export default KGconstraints_editor;
window.KGconstraints_editor = KGconstraints_editor;
