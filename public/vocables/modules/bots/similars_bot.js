import BotEngineClass from "./_botEngineClass.js";
import CommonBotFunctions_class from "./_commonBotFunctions_class.js";

var Similars_bot = (function () {
    var self = {};
    self.myBotEngine = new BotEngineClass();

    self.start = function (workflow, _params, callbackFn) {
        self.title = _params?.title || "Similars";
        var startParams = self.myBotEngine.fillStartParams(arguments);

        if (!workflow) {
            workflow = self.nodeSelectionWorkflow;
        }
        self.params = { nodeSelection: "", source: [], mode: "", output: "", parents: [] };
        self.profiles = null;
        self.users = null;
        self.myBotEngine.init(Similars_bot, workflow, null, function () {
            self.myBotEngine.startParams = startParams;
            if (_params) {
                for (var key in _params) {
                    self.params[key] = _params[key];
                }
            }

            self.myBotEngine.nextStep();
        });
    };

    self.nodeSelectionWorkflow = {
        startFn: {
            _OR: {
                "All whiteboard nodes": { allWhiteboardNodesFn: { searchSimilarsInWorkflowFn: {} } },
                "Selected whiteboard nodes": { selectedWhiteboardNodesFn: { searchSimilarsInWorkflowFn: {} } },
            },
        },
    };

    self.searchSimilarsInWorkflow = {
        _OR: {
            "whiteboard nodes": { similarsInWhiteboardNodesFn: { similarsSearchParamsFn: {} } },
            source: { similarsInSourceFn: { sourceWorkflowFn: {} } },
        },
    };
    self.sourceWorkflow = {
        _OR: {
            next: { similarsSearchParamsFn: {} },
            "add source": { similarsInSourceFn: { sourceWorkflowFn: {} } },
        },
    };
    self.similarsSearchParams = {
        _OR: {
            "exact match": { exactMatchFn: { elasticQueryFn: { filterResultsWorkflowFn: {} } } },
            "fuzzy match": { fuzzyMatchFn: { elasticQueryFn: { filterResultsWorkflowFn: {} } } },
        },
    };
    self.filterResultsWorkflow = {
        hasFilterFn: {
            _OR: {
                "Filter results": { setFilterFn: { filterResultsFn: { saveWorkflowFn: {} } } },
                "No filter": { noFilterFn: { saveWorkflowFn: {} } },
            },
        },
    };
    self.saveWorkflow = {
        drawResultsFn: {
            _OR: {
                "Save results": { saveResultsFn: {} },
                "Display in Table": { displayInTableFn: {} },
                end: { endFn: {} },
            },
        },
    };

    self.functionTitles = {
        startFn: "Search similars for",
        allWhiteboardNodesFn: "All whiteboard nodes",
        selectedWhiteboardNodesFn: "Selected whiteboard nodes",
        similarsSearchParamsFn: "Search similars with",
        exactMatchFn: "Exact match",
        fuzzyMatchFn: "Fuzzy match",
        filterResultsFn: "Filter results",
        noFilterFn: "No filter",
        saveResultsFn: "Save results",
        displayInTableFn: "Display in Table",
        displayInWhiteboardNodesFn: "Display in whiteboard nodes",
        searchSimilarsInWorkflowFn: "Search similars in ",
        similarsInSourceFn: "Choose source",
    };

    self.functions = {
        startFn: function () {
            self.myBotEngine.nextStep();
        },
        endFn: function () {
            self.myBotEngine.end();
        },
        allWhiteboardNodesFn: function () {
            self.params.nodeSelection = "AllWhiteboardNodes";
            self.myBotEngine.nextStep();
        },
        selectedWhiteboardNodesFn: function () {
            self.params.nodeSelection = "SelectedNodes";
            self.myBotEngine.nextStep();
        },
        similarsInWhiteboardNodesFn: function () {
            self.myBotEngine.nextStep();
        },
        similarsInSourceFn: function () {
            var sources = Object.keys(Config.sources);
            self.myBotEngine.showList(sources, "source", null, true);
        },
        searchSimilarsInWorkflowFn: function () {
            self.myBotEngine.currentObj = self.searchSimilarsInWorkflow;
            self.myBotEngine.nextStep();
        },
        similarsSearchParamsFn: function () {
            self.myBotEngine.currentObj = self.similarsSearchParams;
            self.myBotEngine.nextStep();
        },
        exactMatchFn: function () {
            self.params.mode = "exactMatch";
            self.myBotEngine.nextStep();
        },
        fuzzyMatchFn: function () {
            self.params.mode = "fuzzyMatch";
            self.myBotEngine.nextStep();
        },
        saveWorkflowFn: function () {
            self.myBotEngine.currentObj = self.saveWorkflow;
            self.myBotEngine.nextStep();
        },
        filterResultsWorkflowFn: function () {
            self.myBotEngine.currentObj = self.filterResultsWorkflow;
            self.myBotEngine.nextStep();
        },
        hasFilterFn: function () {
            var parents = [];
            Lineage_similars.visjsData.nodes.forEach(function (node) {
                if (node.data.parents.length > 0) {
                    parents = parents.concat(node.data.parents);
                }
            });
            parents = common.array.distinctValues(parents);
            self.params.parents = parents;
            if (parents.length > 0) {
                self.myBotEngine.nextStep();
            } else {
                self.functions.saveWorkflowFn();
            }
        },
        noFilterFn: function () {
            self.myBotEngine.nextStep();
        },
        setFilterFn: function () {
            if (self.params.parents.length > 0) {
                self.myBotEngine.showList(self.params.parents, "filterParent", null, true);
            } else {
                self.myBotEngine.nextStep();
            }
        },
        filterResultsFn: function () {
            if (self.params.filterParent) {
                Lineage_similars.visjsData.nodes = Lineage_similars.visjsData.nodes.filter(function (node) {
                    return node.data.parents.includes(self.params.filterParent);
                });
                var nodeIds = Lineage_similars.visjsData.nodes.map(function (node) {
                    return node.id;
                });
                Lineage_similars.visjsData.edges = Lineage_similars.visjsData.edges.filter(function (edge) {
                    return nodeIds.includes(edge.to);
                });
            }
            self.myBotEngine.nextStep();
        },
        elasticQueryFn: function () {
            if (self.params.source?.length > 0) {
                Lineage_similars.drawSourceSimilars(Lineage_sources.activeSource, self.params.source, self.params.mode, self.params.nodeSelection, "no draw", function () {
                    self.myBotEngine.nextStep();
                });
            } else {
                Lineage_similars.drawWhiteBoardSimilars(self.params.nodeSelection, self.params.mode, "no draw");
                self.myBotEngine.nextStep();
            }
        },
        drawResultsFn: function () {
            Lineage_similars.displaySimilars("graph", Lineage_similars.similarsSources, self.params.source, Lineage_sources.activeSource, function () {
                self.myBotEngine.nextStep();
            });
        },
        saveResultsFn: function () {
            self.myBotEngine.nextStep();
            Lineage_similars.save.showDialog();
        },
        displayInTableFn: function () {
            Lineage_similars.displaySimilars("table", Lineage_similars.similarsSources, self.params.source, Lineage_sources.activeSource, function () {
                self.myBotEngine.nextStep();
            });
        },
        sourceWorkflowFn: function () {
            self.myBotEngine.currentObj = self.sourceWorkflow;
            self.myBotEngine.nextStep();
        },
    };
    return self;
})();

export default Similars_bot;
window.Similars_bot = Similars_bot;
