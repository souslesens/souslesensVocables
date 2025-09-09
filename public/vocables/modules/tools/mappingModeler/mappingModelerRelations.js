import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import DataSourcesManager from "./dataSourcesManager.js";
import common from "../../shared/common.js";
import JstreeWidget from "../../uiWidgets/jstreeWidget.js";
import MappingModeler from "./mappingModeler.js";
import UI from "../../shared/UI.js";
var MappingModelerRelations = (function () {
    self.listPossibleRelations = function (callback) {
        var nodes = MappingColumnsGraph.visjsGraph.data.nodes.get();
        var edges = MappingColumnsGraph.visjsGraph.data.edges.get();
        var nodesMap = {};
        nodes.forEach(function (item) {
            nodesMap[item.id] = item;
        });
        var classesMap = {};
        var existingRelationsMap = {};
        edges.forEach(function (edge) {
            if (!nodesMap[edge.from]) return;

            if (MappingModeler.columnsMappingsObjects.includes(nodesMap[edge.from]?.data?.type) && MappingModeler.columnsMappingsObjects.includes(nodesMap[edge.to]?.data?.type == "Column")) {
                existingRelationsMap[nodesMap[edge.to].id] = nodesMap[edge.from].id;
            }

            if (
                MappingModeler.columnsMappingsObjects.includes(nodesMap[edge.from]?.data?.type) &&
                nodesMap[edge.to]?.data?.type == "Class" &&
                nodesMap[edge.from]?.data?.dataTable == MappingModeler.currentTable.name
            ) {
                if (!classesMap[nodesMap[edge.to].id]) {
                    classesMap[nodesMap[edge.to].id] = [nodesMap[edge.from].id];
                } else {
                    classesMap[nodesMap[edge.to].id].push(nodesMap[edge.from].id);
                }
            }
        });
        var classes = null; // Object.keys(classesMap);
        var relations = [];

        Sparql_OWL.getObjectRestrictions(DataSourcesManager.currentSlsvSource, classes, null, function (err, result) {
            if (err) {
                if (callback) callback(err);
                return;
            }
            result.forEach(function (item) {
                var fromColumn = classesMap[item.subject.value];
                var toColumn = classesMap[item.value.value];
                if (fromColumn && toColumn) {
                    fromColumn.forEach(function (fromColumnId) {
                        toColumn.forEach(function (toColumnId) {
                            if (nodesMap[fromColumnId].data.table != nodesMap[toColumnId].data.table) {
                                return;
                            }
                            relations.push({
                                fromColumn: { id: fromColumnId, label: nodesMap[fromColumnId].label },
                                toColumn: { id: toColumnId, label: nodesMap[toColumnId].label },
                                property: { id: item.prop.value, label: item.propLabel.value },
                            });
                        });
                    });
                }
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
            if (callback) callback(null, jstreeData);
            return;
        });
    };
    self.drawPossibleRelations = function () {
        var jstreeData = self.listPossibleRelations(function (err, jstreeData) {
            if (err) {
                alert(err);
            }
            var jstreeOptions = {
                openAll: true,
                withCheckboxes: true,
            };

            JstreeWidget.loadJsTree("mappingModelerRelations_jstreeDiv", jstreeData, jstreeOptions);
        });
        // Draw the relations using the jstreeData
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

        MappingColumnsGraph.saveVisjsGraph(function () {
            $("#MappingModeler_leftTabs").tabs("option", "active", 1);
            UIcontroller.onActivateLeftPanelTab("MappingModeler_columnsTab");
        });
    };

    return self;
})();
export default MappingModelerRelations;
window.MappingModelerRelations = MappingModelerRelations;
