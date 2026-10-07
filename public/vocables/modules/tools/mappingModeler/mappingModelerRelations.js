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
        var columnClassIds = Object.keys(classesMap);
        var ancestorDistancesByColumnClass = {};
        var modelRestrictions = [];

        async.series(
            [
                // a restriction also applies to the subclasses of the class bearing it and of its target
                function (callbackSeries) {
                    if (columnClassIds.length == 0) {
                        return callbackSeries();
                    }
                    Sparql_OWL.getSuperClassEdges(DataSourcesManager.currentSlsvSource, columnClassIds, function (err, superClassEdges) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        var superClassesBySubClass = {};
                        superClassEdges.forEach(function (superClassEdge) {
                            var subClassId = superClassEdge.subClass.value;
                            if (!superClassesBySubClass[subClassId]) {
                                superClassesBySubClass[subClassId] = [];
                            }
                            if (superClassesBySubClass[subClassId].indexOf(superClassEdge.superClass.value) < 0) {
                                superClassesBySubClass[subClassId].push(superClassEdge.superClass.value);
                            }
                        });
                        // breadth first, so the first distance reached is the shortest one
                        columnClassIds.forEach(function (columnClassId) {
                            var ancestorDistances = {};
                            ancestorDistances[columnClassId] = 0;
                            var currentLevelClassIds = [columnClassId];
                            while (currentLevelClassIds.length > 0) {
                                var nextLevelClassIds = [];
                                currentLevelClassIds.forEach(function (classId) {
                                    var superClassIds = superClassesBySubClass[classId] || [];
                                    superClassIds.forEach(function (superClassId) {
                                        if (ancestorDistances[superClassId] === undefined) {
                                            ancestorDistances[superClassId] = ancestorDistances[classId] + 1;
                                            nextLevelClassIds.push(superClassId);
                                        }
                                    });
                                });
                                currentLevelClassIds = nextLevelClassIds;
                            }
                            ancestorDistancesByColumnClass[columnClassId] = ancestorDistances;
                        });
                        callbackSeries();
                    });
                },
                // the bearer of a restriction applying to a column is one of the ancestors of its class: reading only
                // those keeps the query under its row limit
                function (callbackSeries) {
                    var ancestorIdsMap = {};
                    columnClassIds.forEach(function (columnClassId) {
                        for (var ancestorId in ancestorDistancesByColumnClass[columnClassId]) {
                            ancestorIdsMap[ancestorId] = true;
                        }
                    });
                    var ancestorIds = Object.keys(ancestorIdsMap);
                    if (ancestorIds.length == 0) {
                        return callbackSeries();
                    }
                    Sparql_OWL.getObjectRestrictions(DataSourcesManager.currentSlsvSource, ancestorIds, { values: 1 }, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        modelRestrictions = result;
                        callbackSeries();
                    });
                },
            ],
            function (err) {
                if (err) {
                    if (callback) callback(err);
                    return;
                }
                var candidateRelations = [];
                modelRestrictions.forEach(function (item) {
                    if (!item?.prop?.value) {
                        return;
                    }
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

                    columnClassIds.forEach(function (fromClassId) {
                        var fromDistance = ancestorDistancesByColumnClass[fromClassId][item?.subject?.value];
                        if (fromDistance === undefined) {
                            return;
                        }
                        columnClassIds.forEach(function (toClassId) {
                            var toDistance = ancestorDistancesByColumnClass[toClassId][item?.value?.value];
                            if (toDistance === undefined) {
                                return;
                            }
                            classesMap[fromClassId].forEach(function (fromColumnId) {
                                classesMap[toClassId].forEach(function (toColumnId) {
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
                                    if (columnFromClass && columnFromTo) {
                                        var isAlreadyExisting = classesRelationsMap[columnFromClass + "-->" + columnFromTo];
                                        if (isAlreadyExisting && isAlreadyExisting == item.prop.value) {
                                            relationObject.isAlreadyExisting = true;
                                        }
                                    }
                                    candidateRelations.push({
                                        columnsPropertyKey: fromColumnId + "-->" + toColumnId + "-->" + item.prop.value,
                                        distance: fromDistance + toDistance,
                                        relation: relationObject,
                                    });
                                });
                            });
                        });
                    });
                });

                // several restrictions of a property can apply to a pair of columns: the closest to the two column
                // classes wins, a tie with another restriction type keeps both
                var closestDistanceByColumnsProperty = {};
                candidateRelations.forEach(function (candidateRelation) {
                    var closestDistance = closestDistanceByColumnsProperty[candidateRelation.columnsPropertyKey];
                    if (closestDistance === undefined || candidateRelation.distance < closestDistance) {
                        closestDistanceByColumnsProperty[candidateRelation.columnsPropertyKey] = candidateRelation.distance;
                    }
                });
                var relations = [];
                var keptRestrictionKeys = {};
                candidateRelations.forEach(function (candidateRelation) {
                    if (candidateRelation.distance != closestDistanceByColumnsProperty[candidateRelation.columnsPropertyKey]) {
                        return;
                    }
                    var restrictionKey = candidateRelation.columnsPropertyKey + "-->" + candidateRelation.relation.restrictionType + "-->" + JSON.stringify(candidateRelation.relation.cardinality);
                    if (keptRestrictionKeys[restrictionKey]) {
                        return;
                    }
                    keptRestrictionKeys[restrictionKey] = true;
                    relations.push(candidateRelation.relation);
                });

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
            },
        );
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
