var Lineage_individuals_graph = (function () {
    var self = {};

    self.onDataSourcesSelect = function (dataSourceKey) {
        self.currentDataSource = Lineage_individuals.currentDataSource;
    };

    self.getNodeLinkedData = function (node, callback) {
        Sparql_OWL.getNodesAncestors(node.data.source, node.data.id, { withoutImports: true, withlabels: true }, function (err, result) {
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
        });
    };

    self.initIndividualsPanel = function (node) {
        self.currentClassNode = Lineage_individuals.currentClassNode;
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
        self.currentFilters.push(filterObj);

        $("#LineageIndividualsQueryParams_value").val("");
    };

    self.drawIndividuals = function () {
        if (self.currentDataSource.type.indexOf("sql") > -1) {
            self.sql.drawSearchIndividuals();
        } else if (self.currentDataSource.type == "searchIndex") {
            self.searchIndex.drawIndividuals();
        }
    };

    return self;
})();
