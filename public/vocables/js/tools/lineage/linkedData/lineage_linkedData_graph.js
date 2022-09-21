var Lineage_linkedData_graph = (function () {
    var self = {};

    self.onDataSourcesSelect = function (dataSourceKey) {
        self.currentDataSource = Lineage_linkedData.currentDataSource;
    };

    self.initLinkedDataPanel = function (node) {
        self.currentClassNode = Lineage_linkedData.currentClassNode;
    };

    self.executeQuery = function () {
        if (self.currentDataSource.type.indexOf("sql") > -1) {
            self.sql.executeQuery();
        } else if (self.currentDataSource.type == "searchIndex") {
            self.searchIndex.executeQuery();
        }
    };

    self.addFilter = function () {
        var existingVisjsIds = visjsGraph.getExistingIdsMap();

        if (!self.currentClassNode.color) self.currentClassNode.color = Lineage_classes.getSourceColor(self.currentClassNode.data.id);

        var filterObj = null;
        if (self.currentDataSource.type.indexOf("sql") > -1) filterObj = self.sql.getFilter();
        else if (self.currentDataSource.type == "searchIndex") filterObj = self.searchIndex.getFilter();
        Lineage_linkedData.currentFilters.push(filterObj);

        $("#LineageLinkedDataQueryParams_value").val("");
    };

    self.drawLinkedData = function () {
        if (self.currentDataSource.type.indexOf("sql") > -1) {
            self.sql.drawSearchLinkedData();
        } else if (self.currentDataSource.type == "searchIndex") {
            self.searchIndex.drawLinkedData();
        }
    };
    self.getIndividualInfos = function (dataSource, node, callback) {
        return callback(null, infos);
    };
    return self;
})();
