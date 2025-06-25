var Similars_bot = (function () {
    var self = {};

    self.start = function (workflow, _params, callbackFn) {
        self.title = _params?.title || "Similars";
        var startParams = _botEngine.fillStartParams(arguments);

        if (!workflow) {
            workflow = self.nodeSelectionWorkflow;
        }
        self.params = { nodeSelection: "", source: [], mode: "", output: "", parents: [] };
        self.profiles = null;
        self.users = null;
        _botEngine.init(Similars_bot, workflow, null, function () {
            _botEngine.startParams = startParams;
            if (_params) {
                for (var key in _params) {
                    self.params[key] = _params[key];
                }
            }

            _botEngine.nextStep();
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
            _botEngine.nextStep();
        },
        endFn: function () {
            _botEngine.end();
        },
        allWhiteboardNodesFn: function () {
            self.params.nodeSelection = "AllWhiteboardNodes";
            _botEngine.nextStep();
        },
        selectedWhiteboardNodesFn: function () {
            self.params.nodeSelection = "SelectedNodes";
            _botEngine.nextStep();
        },
        similarsInWhiteboardNodesFn: function () {
            _botEngine.nextStep();
        },
        similarsInSourceFn: function () {
            var sources = Object.keys(Config.sources);
            _botEngine.showList(sources, "source", null, true);
        },
        searchSimilarsInWorkflowFn: function () {
            _botEngine.currentObj = self.searchSimilarsInWorkflow;
            _botEngine.nextStep();
        },
        similarsSearchParamsFn: function () {
            _botEngine.currentObj = self.similarsSearchParams;
            _botEngine.nextStep();
        },
        exactMatchFn: function () {
            self.params.mode = "exactMatch";
            _botEngine.nextStep();
        },
        fuzzyMatchFn: function () {
            self.params.mode = "fuzzyMatch";
            _botEngine.nextStep();
        },
        saveWorkflowFn: function () {
            _botEngine.currentObj = self.saveWorkflow;
            _botEngine.nextStep();
        },
        filterResultsWorkflowFn: function () {
            _botEngine.currentObj = self.filterResultsWorkflow;
            _botEngine.nextStep();
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
                _botEngine.nextStep();
            } else {
                self.functions.saveWorkflowFn();
            }
        },
        noFilterFn: function () {
            _botEngine.nextStep();
        },
        setFilterFn: function () {
            if (self.params.parents.length > 0) {
                _botEngine.showList(self.params.parents, "filterParent", null, true);
            } else {
                _botEngine.nextStep();
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
            _botEngine.nextStep();
        },
        elasticQueryFn: function () {
            if (self.params.source?.length > 0) {
                Lineage_similars.drawSourceSimilars(Lineage_sources.activeSource, self.params.source, self.params.mode, self.params.nodeSelection, "no draw", function () {
                    _botEngine.nextStep();
                });
            } else {
                Lineage_similars.drawWhiteBoardSimilars(self.params.nodeSelection, self.params.mode, "no draw");
                _botEngine.nextStep();
            }
        },
        drawResultsFn: function () {
            Lineage_similars.displaySimilars("graph", Lineage_similars.similarsSources, self.params.source, Lineage_sources.activeSource, function () {
                _botEngine.nextStep();
            });
        },
        saveResultsFn: function () {
            _botEngine.nextStep();
            Lineage_similars.save.showDialog();
        },
        displayInTableFn: function () {
            Lineage_similars.displaySimilars("table", Lineage_similars.similarsSources, self.params.source, Lineage_sources.activeSource, function () {
                _botEngine.nextStep();
            });
        },
        sourceWorkflowFn: function () {
            _botEngine.currentObj = self.sourceWorkflow;
            _botEngine.nextStep();
        },
    };
    return self;
})();

export default Similars_bot;
window.Similars_bot = Similars_bot;
