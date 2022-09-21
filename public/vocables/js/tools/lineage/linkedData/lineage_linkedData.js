var Lineage_linkedData = (function () {
    var self = {};
    self.currentFilters = [];
    self.dataSources = {};

    self.init = function () {
        self.currentFilters = [];
        $("#LineageLinkedDataTab").load("snippets/lineage/lineageLinkedDataSearchDialog.html", function () {
            $("#LineageLinkedDataQueryParams_dataSourcesSelect").children().remove().end();
            $("#LineageLinkedDataQueryParams_filterPanel").css("display", "none");
            self.dataSources = Config.sources[Lineage_classes.mainSource].dataSources;
            if (!self.dataSources) {
                $("#LineageLinkedDataQueryParams_showLinkedDataTriples").css("display", "block");
            } else {
                var dataSourcesArray = Object.keys(self.dataSources);
                var emptyOption = false;
                common.fillSelectOptions("LineageLinkedDataQueryParams_dataSourcesSelect", dataSourcesArray, emptyOption);
                if (!emptyOption) self.onDataSourcesSelect($("#LineageLinkedDataQueryParams_dataSourcesSelect").val());
            }
        });
    };

    self.onDataSourcesSelect = function (dataSourceKey) {
        $(".LineageLinkedDataQueryParams_panel").css("display", "none");
        self.currentDataSource = self.dataSources[dataSourceKey];
        self.currentDataSource.name = dataSourceKey;
        if (!self.currentDataSource) return;

        if (self.currentDataSource.type.indexOf("sql") > -1) {
            Lineage_linkedData_sql.onDataSourcesSelect(dataSourceKey);
        } else if (self.currentDataSource.type.indexOf("search") > -1) {
            Lineage_linkedData_search.onDataSourcesSelect(dataSourceKey);
        }
        if (self.currentDataSource.type.indexOf("graph") > -1) {
            Lineage_linkedData_graph.onDataSourcesSelect(dataSourceKey);
        }
    };

    /**
     *
     * check if there is a linkedMapping for any ancesstor of this class
     * @param node
     * @param callback
     */
    self.getNodeLinkedData = function (node, callback) {
        self.currentNode = Lineage_classes.currentGraphNode || Lineage_classes.currentTreeNode;
        if (!node) return callback(null, []);

        Sparql_OWL.getNodesAncestors(
            node.data.source,
            node.data.id,
            {
                withoutImports: true,
                withlabels: true,
            },
            function (err, result) {
                if (err) return err;
                var currentNodeLinkedMappingKeys = [];
                result.forEach(function (item) {
                    var classId = item.superClass.value;
                    var mapping = self.currentDataSource.classMappings[classId];
                    if (mapping) {
                        currentNodeLinkedMappingKeys.push(classId);
                    }
                });
                return callback(null, currentNodeLinkedMappingKeys);
            }
        );
    };

    self.showLinkedDataPanel = function (node) {
        $("#Lineage_Tabs").tabs("option", "active", 3);
        self.currentClassNode = node;
        $("#LineageLinkedDataQueryParams_className").html(self.currentClassNode.data.label);
        if (!self.currentDataSource) return;
        if (self.currentDataSource.type == "searchIndex") {
            Lineage_linkedData_search.initLinkedDataPanel(node);
        } else if (self.currentDataSource.type.indexOf("sql") > -1) {
            Lineage_linkedData_sql.initLinkedDataPanel(node);
        } else if (self.currentDataSource.type == "graph") {
            Lineage_linkedData_graph.initLinkedDataPanel(node);
        }
    };

    self.executeQuery = function () {
        if (self.currentDataSource.type.indexOf("sql") > -1) {
            Lineage_linkedData_sql.executeQuery();
        } else if (self.currentDataSource.type == "searchIndex") {
            Lineage_linkedData_search.executeQuery();
        } else if (self.currentDataSource.type == "graph") {
            Lineage_linkedData_graph.executeQuery();
        }
    };

    self.onSearchDialogOperatorSelect = function (operator) {};

    self.showAll = function () {
        Lineage_classes.drawNamedLinkedData([self.currentClassNode.id]);
    };

    self.clearQuery = function () {
        self.currentFilters = [];
        $("#LineageLinkedDataQueryParams_QueryDiv").html("");
    };

    self.addFilter = function () {
        var existingVisjsIds = visjsGraph.getExistingIdsMap();

        if (!self.currentClassNode.color) self.currentClassNode.color = Lineage_classes.getSourceColor(self.currentClassNode.data.id);

        var filterObj = null;
        if (self.currentDataSource.type.indexOf("sql") > -1) {
            filterObj = Lineage_linkedData_sql.getFilter();
        } else if (self.currentDataSource.type == "searchIndex") {
            filterObj = Lineage_linkedData_search.getFilter();
        } else if (self.currentDataSource.type == "graph") {
            filterObj = Lineage_linkedData_graph.getFilter();
        }
        self.currentFilters.push(filterObj);

        $("#LineageLinkedDataQueryParams_value").val("");
    };

    self.removeQueryElement = function (index) {
        self.currentFilters.splice(index, 1);
        $("#LineageLinkedDataQueryParams_Elt_" + index).remove();
    };

    self.onQueryParamsDialogCancel = function () {
        $("#LineagePopup").dialog("close");
    };

    self.drawLinkedData = function () {
        if (Lineage_linkedData.currentFilters.length == 0) return alert("no filter specified");
        if (self.currentDataSource.type.indexOf("sql") > -1) {
            Lineage_linkedData_sql.drawSearchLinkedData();
        } else if (self.currentDataSource.type == "searchIndex") {
            Lineage_linkedData_search.drawLinkedData();
        } else if (self.currentDataSource.type == "graph") {
            Lineage_linkedData_graph.drawLinkedData();
        }
    };

    self.graphActions = {
        showIndividualInfos: function () {
            var node = Lineage_classes.currentGraphNode || Lineage_classes.currentTreeNode;
            var dataSourceLabel = node.data.source;
            if (!dataSourceLabel) return;

            if (!Config.sources[Lineage_classes.mainSource].dataSources) return Lineage_classes.graphActions.showNodeInfos();

            var dataSource = Config.sources[Lineage_classes.mainSource].dataSources[dataSourceLabel];
            if (!dataSource) return Lineage_classes.graphActions.showNodeInfos();

            if (dataSource.type.indexOf("sql") > -1) {
                Lineage_linkedData_sql.getIndividualInfos(dataSource, node, function (err, result) {
                    if (err) return alert(err);
                    self.displayIndividualInfos(result);
                });
            } else if (dataSource.type == "searchIndex") {
                Lineage_linkedData_search.getIndividualInfos(dataSource, node, function (err, result) {
                    if (err) return alert(err);
                    self.displayIndividualInfos(result);
                });
            } else if (dataSource.type == "graph") {
                Lineage_linkedData_graph.getIndividualInfos(dataSource, node, function (err, result) {
                    if (err) return alert(err);
                    self.displayIndividualInfos(result);
                });
            }
        },
        expandIndividual: function () {
            var data = Lineage_classes.currentGraphNode.data;
        },
    };

    self.displayIndividualInfos = function (html) {
        $("#mainDialogDiv").html(html);
        $("#mainDialogDiv").dialog("open");
    };

    return self;
})();
