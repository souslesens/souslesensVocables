const GraphManagement = (function () {
    const self = {};
    self.onSourceSelect = function () {};
    self.createApp = null;
    self.umountKGUploadApp = null;
    self.unload = function () {
        self.umountKGUploadApp();
    };
    self.onLoaded = function () {
        $("#accordion").accordion("option", { active: 2 });
        import("/assets/graph_management.js");
        setTimeout(function () {
            $("#mainDialogDiv").dialog("open");

            $("#mainDialogDiv").dialog("option", "title", "Graph Management");
            $("#mainDialogDiv").dialog({
                close: function (event, ui) {
                    self.umountKGUploadApp();
                },
            });
            $("#mainDialogDiv").parent().css("left", "100px");

            $("#mainDialogDiv").html("");
            $("#mainDialogDiv").html(`
                    <div id="mount-graph-management-here"></div>
            `);
            self.umountKGUploadApp = self.createApp();
        }, 200);
    };

    return self;
})();

export default GraphManagement;

window.GraphManagement = GraphManagement;
