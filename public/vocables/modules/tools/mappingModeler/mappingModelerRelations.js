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
        if (nodes.length == 0 || edges.length == 0) {
            return callback(null, []);
        }
        var nodesMap = {};
        nodes.forEach(function (item) {
            nodesMap[item.id] = item;
        });
        var classesMap = {};
        var nodesClassesMap = {};
        var existingRelationsMap = {};
        var classesRelationsMap = {};
        var objectPropertiesMap = {};

        edges.forEach(function (edge) {
            if (!nodesMap[edge.from] || !nodesMap[edge.to]) return;

            if (MappingModeler.columnsMappingsObjects.includes(nodesMap[edge.from]?.data?.type) && MappingModeler.columnsMappingsObjects.includes(nodesMap[edge.to]?.data?.type)) {
                existingRelationsMap[nodesMap[edge.to].id] = nodesMap[edge.from].id;
                if (edge?.data?.id) {
                    objectPropertiesMap[nodesMap[edge.to].id + "-->" + nodesMap[edge.from].id] = { propertyId: edge.data.id, fromColumnId: nodesMap[edge.from].id, toColumnId: nodesMap[edge.to].id };
                }
            }

            if (MappingModeler.columnsMappingsObjects.includes(nodesMap[edge.from]?.data?.type) && nodesMap[edge.to]?.data?.type == "Class") {
                //drawing only relations where nodes comes from the current table
                if (nodesMap[edge.from]?.data?.dataTable == MappingModeler.currentTable.name) {
                    if (!classesMap[nodesMap[edge.to].id]) {
                        classesMap[nodesMap[edge.to].id] = [nodesMap[edge.from].id];
                    } else {
                        classesMap[nodesMap[edge.to].id].push(nodesMap[edge.from].id);
                    }
                }
                // considering all edges for knowing if a restriction between the same two classes  already existing
                nodesClassesMap[nodesMap[edge.from].id] = nodesMap[edge.to].id;
            }
        });
        Object.keys(objectPropertiesMap).forEach(function (key) {
            var fromColumnId = objectPropertiesMap[key].fromColumnId;
            var toColumnId = objectPropertiesMap[key].toColumnId;
            var propertyId = objectPropertiesMap[key].propertyId;
            if (!fromColumnId || !toColumnId || !propertyId) {
                return;
            }
            var fromClass = nodesClassesMap[fromColumnId];
            var toClass = nodesClassesMap[toColumnId];
            if (!fromClass || !toClass) {
                return;
            }
            classesRelationsMap[fromClass + "-->" + toClass] = propertyId;
        });
        var classes = null; // Object.keys(classesMap);
        var relations = [];

        Sparql_OWL.getObjectRestrictions(DataSourcesManager.currentSlsvSource, classes, { includeInherited: true }, function (err, result) {
            if (err) {
                if (callback) callback(err);
                return;
            }
            result.forEach(function (item) {
                var fromColumn = classesMap[item?.subject?.value];
                var toColumn = classesMap[item?.value?.value];
                if (fromColumn && toColumn && item?.prop?.value) {
                    // the restriction found in the model carries its own constraint type and, for qualified
                    // cardinalities, the cardinality predicate itself (owl:onClass + owl:qualifiedCardinality)
                    var modelRestrictionType = item?.constraintType?.value || null;
                    var modelCardinality = null;
                    if (item?.cardinalityType?.value && item?.cardinalityValue?.value) {
                        modelRestrictionType = item.cardinalityType.value;
                        modelCardinality = { type: item.cardinalityType.value, value: item.cardinalityValue.value };
                    } else if (modelRestrictionType == "http://www.w3.org/2002/07/owl#onClass") {
                        // owl:onClass alone is not a valid restriction constraint, it only qualifies a cardinality
                        modelRestrictionType = "http://www.w3.org/2002/07/owl#someValuesFrom";
                    }

                    fromColumn.forEach(function (fromColumnId) {
                        toColumn.forEach(function (toColumnId) {
                            if (nodesMap[fromColumnId].data.table != nodesMap[toColumnId].data.table) {
                                return;
                            }
                            var relationObject = {
                                fromColumn: { id: fromColumnId, label: nodesMap[fromColumnId].label },
                                toColumn: { id: toColumnId, label: nodesMap[toColumnId].label },
                                property: { id: item.prop.value, label: item.propLabel.value },
                                restrictionType: modelRestrictionType,
                                cardinality: modelCardinality,
                                isAlreadyExisting: false,
                            };
                            var columnFromClass = nodesClassesMap[relationObject.fromColumn.id];
                            var columnFromTo = nodesClassesMap[relationObject.toColumn.id];
                            if (!columnFromClass || !columnFromTo) {
                                return relations.push(relationObject);
                            }
                            var isAlreadyExisting = classesRelationsMap[columnFromClass + "-->" + columnFromTo];
                            if (isAlreadyExisting && isAlreadyExisting == item.prop.value) {
                                relationObject.isAlreadyExisting = true;
                            }
                            relations.push(relationObject);
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
                var state = item.isAlreadyExisting ? { disabled: true } : { disabled: false };
                var restrictionLabel = "";
                if (item.cardinality) {
                    var cardinalityTypeParts = item.cardinality.type.split("#");
                    var cardinalityTypeName = cardinalityTypeParts[cardinalityTypeParts.length - 1];
                    restrictionLabel = " [" + cardinalityTypeName + " " + item.cardinality.value + "]";
                } else if (item.restrictionType) {
                    var restrictionTypeParts = item.restrictionType.split("#");
                    restrictionLabel = " [" + restrictionTypeParts[restrictionTypeParts.length - 1] + "]";
                }
                jstreeData.push({
                    id: common.getRandomHexaId(5),
                    text: item.fromColumn.label + "-" + item.property.label + "->" + item.toColumn.label + restrictionLabel,
                    parent: "Restrictions",
                    data: item,
                    state: state,
                });
            });
            if (callback) callback(null, jstreeData);
            return;
        });
    };
    self.drawPossibleRelations = function (callback) {
        var jstreeData = self.listPossibleRelations(function (err, jstreeData) {
            if (err) {
                MainController.errorAlert(err);
            }
            var jstreeOptions = {
                openAll: true,
                withCheckboxes: true,
            };

            JstreeWidget.loadJsTree("mappingModelerRelations_jstreeDiv", jstreeData, jstreeOptions, callback);
        });
        // Draw the relations using the jstreeData
    };

    self.applyColumnRelations = function () {
        var checkedItems = $("#mappingModelerRelations_jstreeDiv").jstree().get_checked(true);
        var relations = checkedItems.filter(function (item) {
            return item.parent !== "#";
        });
        if (relations.length == 0) {
            alert("Please select at least one relation");
            return;
        }
        relations.forEach(function (item) {
            var relation = item.data;
            var fromClassId = MappingColumnsGraph.getColumnClass(relation.fromColumn.id);
            var toClassId = MappingColumnsGraph.getColumnClass(relation.toColumn.id);
            var isBothClasses = fromClassId && toClassId;

            // restriction type and cardinality come from the model restriction that suggested this relation,
            // no dialog: the user is applying the model as is
            var restrictionType = isBothClasses ? relation.restrictionType : null;
            var cardinality = isBothClasses ? relation.cardinality : null;

            var edge = MappingColumnsGraph.getVisjsObjectPropertyEdge(
                relation.fromColumn.id,
                relation.toColumn.id,
                relation.property.label,
                "diamond",
                relation.property.id,
                relation.property.id,
                MappingModeler.propertyColor,
                restrictionType,
                cardinality,
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
