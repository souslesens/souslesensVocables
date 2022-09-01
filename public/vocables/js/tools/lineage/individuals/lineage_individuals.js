var Lineage_individuals = (function () {
    var self = {};
    self.currentFilters = [];
    self.dataSources = {};

    self.init = function () {
        self.currentFilters = [];
        $("#LineageIndividualsTab").load("snippets/lineage/lineageIndividualsSearchDialog.html", function () {
            $("#LineageIndividualsQueryParams_dataSourcesSelect").children().remove().end();
            $("#LineageIndividualsQueryParams_filterPanel").css("display", "none");
            self.dataSources = Config.sources[Lineage_classes.mainSource].dataSources;
            if (!self.dataSources) {
                $("#LineageIndividualsQueryParams_showIndividualsTriples").css("display", "block");
            } else {
                var dataSourcesArray = Object.keys(self.dataSources);
                var emptyOption = false;
                common.fillSelectOptions("LineageIndividualsQueryParams_dataSourcesSelect", dataSourcesArray, emptyOption);
                if (!emptyOption) self.onDataSourcesSelect($("#LineageIndividualsQueryParams_dataSourcesSelect").val());
            }
        });
    };

    self.onDataSourcesSelect = function (dataSourceKey) {
        $(".LineageIndividualsQueryParams_panel").css("display", "none");
        self.currentDataSource = self.dataSources[dataSourceKey];
        self.currentDataSource.name = dataSourceKey;
        if (!self.currentDataSource) return;

        if (self.currentDataSource.type.indexOf("sql") > -1) {
            Lineage_individuals_sql.onDataSourcesSelect(dataSourceKey);
        } else if (self.currentDataSource.type.indexOf("search") > -1) {
            Lineage_individuals_search.onDataSourcesSelect(dataSourceKey);
        }
        if (self.currentDataSource.type.indexOf("graph") > -1) {
            Lineage_individuals_graph.onDataSourcesSelect(dataSourceKey);
        }
    };

    /**
     *
     * detects if node has some mappings
     *
     * @param node
     * @param callback
     */
    self.getNodeLinkedData = function (node, callback) {
        Sparql_OWL.getNodesAncestors(
            node.data.source,
            node.data.id,
            {
                withoutImports: true,
                withlabels: true,
            },
            function (err, result) {
                if (err) return err;
                var currentNodeLinkedMappings = [];
                result.forEach(function (item) {
                    var classId = item.superClass.value;
                    var mapping = self.currentDataSource.classMappings[classId];
                    if (mapping) {
                        mapping.currentNode = node;
                        currentNodeLinkedMappings.push(mapping);
                    }
                });
                return callback(null, currentNodeLinkedMappings);
            }
        );
    };

    self.showIndividualsPanel = function (node) {
        $("#Lineage_Tabs").tabs("option", "active", 3);
        self.currentClassNode = node;
        $("#LineageIndividualsQueryParams_className").html(self.currentClassNode.data.label);
        self.currentDataSource.currentClassNodeMapping = self.currentDataSource.classMappings[self.currentClassNode.data.id];
        if (!self.currentDataSource.currentClassNodeMapping) return alert("No mapping for Class " + self.currentClassNode.data.label + " in data source " + self.currentDataSource.name);

        if (self.currentDataSource.type == "searchIndex") {
            Lineage_individuals_search.initIndividualsPanel(node);
        } else if (self.currentDataSource.type.indexOf("sql") > -1) {
            Lineage_individuals_sql.initIndividualsPanel(node);
        } else if (self.currentDataSource.type == "graph") {
            Lineage_individuals_graph.initIndividualsPanel(node);
        }
    };

    self.executeQuery = function () {
        if (self.currentDataSource.type.indexOf("sql") > -1) {
            Lineage_individuals_sql.executeQuery();
        } else if (self.currentDataSource.type == "searchIndex") {
            Lineage_individuals_search.executeQuery();
        } else if (self.currentDataSource.type == "graph") {
            Lineage_individuals_graph.executeQuery();
        }
    };

    self.onSearchDialogOperatorSelect = function (operator) {};

    self.showAll = function () {
        Lineage_classes.drawNamedIndividuals([self.currentClassNode.id]);
    };

    self.clearQuery = function () {
        self.currentFilters = [];
        $("#LineageIndividualsQueryParams_QueryDiv").html("");
    };

    self.addFilter = function () {
        var existingVisjsIds = visjsGraph.getExistingIdsMap();

        if (!self.currentClassNode.color) self.currentClassNode.color = Lineage_classes.getSourceColor(self.currentClassNode.data.id);

        var filterObj = null;
        if (self.currentDataSource.type.indexOf("sql") > -1) {
            filterObj = Lineage_individuals_sql.getFilter();
        } else if (self.currentDataSource.type == "searchIndex") {
            filterObj = Lineage_individuals_search.getFilter();
        } else if (self.currentDataSource.type == "graph") {
            filterObj = Lineage_individuals_graph.getFilter();
        }
        self.currentFilters.push(filterObj);

        $("#LineageIndividualsQueryParams_value").val("");
    };

    self.removeQueryElement = function (index) {
        self.currentFilters.splice(index, 1);
        $("#LineageIndividualsQueryParams_Elt_" + index).remove();
    };

    self.onQueryParamsDialogCancel = function () {
        $("#LineagePopup").dialog("close");
    };

    self.drawIndividuals = function () {
        if (self.currentDataSource.type.indexOf("sql") > -1) {
            Lineage_individuals_sql.drawSearchIndividuals();
        } else if (self.currentDataSource.type == "searchIndex") {
            Lineage_individuals_search.drawIndividuals();
        } else if (self.currentDataSource.type == "graph") {
            Lineage_individuals_graph.drawIndividuals();
        }
    };

    return self;
})();
