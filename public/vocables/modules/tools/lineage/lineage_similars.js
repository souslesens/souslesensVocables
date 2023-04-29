

var Lineage_similars = (function () {
    var self = {};

    self.showDialog = function () {
        $("#mainDialogDiv").dialog("open");
        $("#mainDialogDiv").load("snippets/lineage/lineageSimilarsDialog.html");
    };

    self.onChangeSelection = function (value) {
        if (value == "chooseSource") {
            self.showSourcesTree();
        } else {
            $("#lineageSimilars_sourcesTreeDiv").html("");
        }
    };

    self.showSourcesTree = function () {
        SourceSelectorWidget.showDialog(
            ["OWL", "SKOS"],
            {
                includeSourcesWithoutSearchIndex: false,
                withCheckboxes: true,

                targetDiv: "lineageSimilars_sourcesTreeDiv",
                openTargetDialogDiv:true,
                // dontTie_selection: false,
                onOpenNodeFn: function () {},
            },

            function () {
                var searchSource = $("#Lineage_classes_SearchSourceInput").val();
                if (!searchSource) {
                    return;
                }
                var source = $("#searchAll_sourcesTree").jstree(true).get_selected()[0];
            },
            function () {
                //if checkbox

                var sources = $("#searchAll_sourcesTree").jstree(true).get_checked();

                self.loadSources(sources);
            }
        );
    };

    self.drawSimilars = function () {
        //Lineage_combine.getSimilars('graph')
    };

    return self;
})();

export default Lineage_similars;
window.Lineage_similars = Lineage_similars;
