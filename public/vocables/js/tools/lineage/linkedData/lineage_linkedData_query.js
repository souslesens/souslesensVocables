var Lineage_linkedData_query = (function () {
    var self = {};

    self.init = function () {
        $("#LineageLinkedDataRelationsDiv").load("snippets/lineage/lineage_linkedData_queryRelations.html", function () {
            Lineage_linkedData_mappings.getSourceJoinsMappings(Lineage_sources.activeSource, {}, function (err, joinsMap) {
                if (err) return alert(err.responseText);
                var joins = [];
                for (var join in joinsMap) {
                    var joinObj = joinsMap[join];
                    joins.push({ id: join, label: joinObj.fromLabel + "-" + joinObj.propLabel + "->" + joinObj.toLabel });
                }

                common.fillSelectOptions("lineage_linkedata_queryRelations_relationsSelect", joins, null, "label", "id");
            });
        });
    };

    return self;
})();
