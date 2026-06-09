const GraphManagement = (function () {
    const self = {};
    self.onSourceSelect = function () {};
    self.createApp = null;
    self.umountKGUploadApp = null;
    import("/assets/graph_management.js");

    function getDialogHeight() {
        return Math.floor(window.innerHeight * 0.9);
    }

    function onWindowResize() {
        try {
            const isGraphManagementMounted = $("#mount-graph-management-here").length > 0;
            if (isGraphManagementMounted && $("#mainDialogDiv").dialog("isOpen")) {
                $("#mainDialogDiv").dialog("option", "width", "auto");
                $("#mainDialogDiv").dialog("option", "height", getDialogHeight());
                UI.clampAndCenterDialog("mainDialogDiv");
            }
        } catch (e) {}
    }

    self.unload = function () {
        self.umountKGUploadApp();
        window.removeEventListener("resize", onWindowResize);
    };

    self.onLoaded = function () {
        $("#accordion").accordion("option", { active: 2 });

        setTimeout(function () {
            $("#mainDialogDiv").on("dialogclose", function (event, ui) {
                self.umountKGUploadApp();
                window.removeEventListener("resize", onWindowResize);
            });

            $("#mainDialogDiv").html("");
            $("#mainDialogDiv").html(`
                    <div style="width:90vw;height:100%"><div id="mount-graph-management-here" style="height:100%"></div></div>
            `);
            UI.openDialog("mainDialogDiv", { title: "Graph Management", height: getDialogHeight() });
            UI.clampAndCenterDialog("mainDialogDiv");
            window.addEventListener("resize", onWindowResize);
            self.umountKGUploadApp = self.createApp();
        }, 200);
    };

    return self;
})();

export default GraphManagement;

window.GraphManagement = GraphManagement;
