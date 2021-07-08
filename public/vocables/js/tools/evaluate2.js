var Evaluate = (function () {


    var self = {}

    self.maxGraphConceptLength = 200
    var sourceGraphsUriMap = {}

    self.selectedSources = []
    self.categoriesTreeId = "evaluate_treeDiv"
    self.onSourceSelect = function () {
        var html = "<button onclick='Evaluate.showActionPanel()'>OK</button>"
        $("#sourceDivControlPanelDiv").html(html)

    }

    self.onLoaded = function () {

    }


    self.showActionPanel = function () {
        self.selectedSources = $("#sourcesTreeDiv").jstree(true).get_checked()
        $("#actionDiv").html("")
        $("#actionDivContolPanelDiv").load("snippets/evaluate_left.html")
        $("#graphDiv").load("snippets/evaluate_right.html")
        $("#accordion").accordion("option", {active: 2});
        setTimeout(function () {
            var w = $(document).width() - leftPanelWidth - 30;
            var h = $(document).height() - 20;
            $("#Evaluate_graphDiv").height(h - 200)
            $("#Evaluate_graphDiv").width(w - 200)
            $("#Evaluate_tabs").tabs({
                activate: self.onTabActivate

            });

            common.fillSelectOptions("evaluate_sourceSelect", self.selectedSources, true)
            self.initCorpusList();


        }, 200)


    }


    self.initCorpusList = function () {
        var corpusList = ["test"]
        common.fillSelectOptions("evaluate_corpusSelect", corpusList, true)


    }
    self.loadCorpusSubjectTree = function (corpusName) {

        var payload = {
            getConceptsSubjectsTree: 1,
            corpusName: corpusName,

        }
        $.ajax({
            type: "POST",
            url: Config.serverUrl,
            data: payload,
            dataType: "json",
            success: function (result, textStatus, jqXHR) {
                common.jstree.loadJsTree(self.categoriesTreeId, result, {selectTreeNodeFn: Evaluate.onTreeClickNode});
            }, error(err) {
                return alert(err)
            }
        })

    }


    self.onTreeClickNode = function (evt, obj) {
        $("#messageDiv").html("");
        self.currentTreeNode = obj.node
        self.getSubjectGraphData(obj.node)


    }
    self.onTabActivate = function (e, ui) {
        var divId = ui.newPanel.attr('id');
        if (divId == "ADLquery_tabs_wikiPageContent") {
            self.loadWikiPage()
        }
    }


    self.getSubjectGraphData = function (jstreeNode) {
        var descendants = common.jstree.getNodeDescendants(self.categoriesTreeId, jstreeNode.id)
        var concepts = [];

        var sources = {}
        descendants.forEach(function (node) {
            if( !node.data.files)
                return;
            node.data.files.forEach(function (file) {
                for (var source in file.sources) {
                    if (!sources[source])
                        sources[source] = []
                    file.sources[source].forEach(function (concept) {
                        sources[source].push(concept.id)
                    })


                }
            })


        })
        var data= {}
        async.eachSeries(Object.keys(sources), function(source,callbackEach){

            var sourceIds= sources[source]

            Sparql_generic.getNodeParents(source,null,sourceIds,5,{},function(err,result){
                data[source]=result

            })

        },function(err){

        })
    }

        return self


    }
)()