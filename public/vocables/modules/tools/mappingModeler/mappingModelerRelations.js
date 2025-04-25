import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import DataSourcesManager from "./dataSourcesManager.js";
import common from "../../shared/common.js";
import JstreeWidget from "../../uiWidgets/jstreeWidget.js";
import MappingModeler from "./mappingModeler.js";
var MappingModelerRelations = (function () {
    self.listPossibleRelations = function () {
        var nodes = MappingColumnsGraph.visjsGraph.data.nodes.get();
        var edges = MappingColumnsGraph.visjsGraph.data.edges.get();
        var nodesMap = {};
        nodes.forEach(function (item) {
            nodesMap[item.id] = item;
        });
        var classesMap = {};
        var existingRelationsMap = {};
        edges.forEach(function (edge) {
            if (nodesMap[edge.from]?.data?.type == "Column" && nodesMap[edge.to]?.data?.type == "Column") {
                existingRelationsMap[nodesMap[edge.to].id] = nodesMap[edge.from].id;
            }

            if (nodesMap[edge.from]?.data?.type == "Column" && nodesMap[edge.to]?.data?.type == "Class") {
                classesMap[nodesMap[edge.to].id] = nodesMap[edge.from].id;
            }
        });
        var classes = Object.keys(classesMap);
        var relations = [];
        Sparql_OWL.getObjectRestrictions(DataSourcesManager.currentSlsvSource, classes, null, function (err, result) {
            result.forEach(function (item) {
                var fromColumnId = classesMap[item.subject.value];
                var toColumnId = classesMap[item.value.value];
                if (fromColumnId && toColumnId) {
                    relations.push({
                        fromColumn: { id: fromColumnId, label: nodesMap[fromColumnId].label },
                        toColumn: { id: toColumnId, label: nodesMap[toColumnId].label },
                        property: { id: item.prop.value, label: item.propLabel.value },
                    });
                }

                /*  var fromColumnId = classesMap[item.value.value]
                var toColumnId = classesMap[item.subject.value]
                if (fromColumnId && toColumnId) {
                    relations.push({
                        fromColumn: {id: fromColumnId, label: nodesMap[fromColumnId].label},
                        toColumn: {id: toColumnId, label: nodesMap[toColumnId].label},
                        property: {id: item.prop.value, label: item.propLabel.value},
                        inverse: true,
                    })
                }*/
            });
            var x = relations;

            var jstreeData = [
                {
                    id: "Restrictions",
                    text: "Restrictions",
                    parent: "#",
                },
            ];

            relations.forEach(function (item) {
                jstreeData.push({
                    id: common.getRandomHexaId(5),
                    text: item.fromColumn.label + "-" + item.property.label + "->" + item.toColumn.label,
                    parent: "Restrictions",
                    data: item,
                });
            });

            var options = {
                openAll: true,
                withCheckboxes: true,
            };

            JstreeWidget.loadJsTree("mappingModelerRelations_jstreeDiv", jstreeData, options);
        });
    };

    self.applyColumnRelations = function () {
        var relations = $("#mappingModelerRelations_jstreeDiv").jstree().get_checked(true);

        relations.forEach(function (item) {
            if (item.parent == "#") return;
            var relation = item.data;
            var edge = MappingColumnsGraph.getVisjsObjectPropertyEdge(
                relation.fromColumn.id,
                relation.toColumn.id,
                relation.property.label,
                "diamond",
                relation.property.id,
                relation.property.id,
                MappingModeler.propertyColor,
            );

            MappingColumnsGraph.addEdge([edge]);
        });
    };

    return self;
})();
export default MappingModelerRelations;
window.MappingModelerRelations = MappingModelerRelations;
