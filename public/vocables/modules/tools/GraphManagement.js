const GraphManagement = (function () {
    const self = {};
    self.onSourceSelect = function () {};

    self.onLoaded = function () {
        $("#accordion").accordion("option", { active: 2 });
        setTimeout(function () {
            $("#graphDiv").html("");
            $("#graphDiv").html(`
                    <div id="mount-graph-management-here"></div>
                `);
            import("/assets/graph_management.js");
        }, 200);
    };

    return self;
})();

export default GraphManagement;

window.GraphManagement = GraphManagement;
