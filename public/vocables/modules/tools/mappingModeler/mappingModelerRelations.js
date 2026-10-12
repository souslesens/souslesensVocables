import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import DataSourcesManager from "./dataSourcesManager.js";
import common from "../../shared/common.js";
import JstreeWidget from "../../uiWidgets/jstreeWidget.js";
import MappingModeler from "./mappingModeler.js";
import UI from "../../shared/UI.js";
import CommonBotFunctions from "../../bots/_commonBotFunctions.js";
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
        var ancestorIdsByColumnClass = {};
        var ancestorIdsMap = {};
        var modelRestrictions = [];
        var jstreeData = [
            {
                id: "Restrictions",
                text: "Restrictions",
                parent: "#",
            },
        ];
        if (columnClassIds.length == 0) {
            return callback(null, jstreeData);
        }

        async.series(
            [
                // a restriction also applies to the subclasses of its subject and of its value
                function (callbackSeries) {
                    Sparql_OWL.getNodesAncestorsOrDescendants(DataSourcesManager.currentSlsvSource, columnClassIds, { excludeItself: 0 }, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        columnClassIds.forEach(function (columnClassId) {
                            var columnClassAncestorIds = {};
                            columnClassAncestorIds[columnClassId] = true;
                            ancestorIdsMap[columnClassId] = true;
                            result.hierarchies[columnClassId].forEach(function (ancestorBinding) {
                                columnClassAncestorIds[ancestorBinding.superClass.value] = true;
                                ancestorIdsMap[ancestorBinding.superClass.value] = true;
                            });
                            ancestorIdsByColumnClass[columnClassId] = columnClassAncestorIds;
                        });
                        callbackSeries();
                    });
                },
                // reading all the restrictions of the source hits the query limit;
                // one query per source, to show each restriction under the source declaring it
                function (callbackSeries) {
                    var ancestorIds = Object.keys(ancestorIdsMap);
                    var modelSources = CommonBotFunctions.getSourceAndImports(DataSourcesManager.currentSlsvSource);
                    async.eachSeries(
                        modelSources,
                        function (modelSource, callbackEach) {
                            Sparql_OWL.getObjectRestrictions(modelSource, ancestorIds, { values: 1, withoutImports: true }, function (err, result) {
                                if (err) {
                                    return callbackEach(err);
                                }
                                result.forEach(function (modelRestriction) {
                                    modelRestriction.source = modelSource;
                                });
                                modelRestrictions = modelRestrictions.concat(result);
                                callbackEach();
                            });
                        },
                        callbackSeries,
                    );
                },
            ],
            function (err) {
                if (err) {
                    return callback(err);
                }
                var relations = [];
                var relationKeysMap = {};
                modelRestrictions.forEach(function (modelRestriction) {
                    // the restriction found in the model carries its own constraint type and, for qualified
                    // cardinalities, the cardinality predicate itself (owl:onClass + owl:qualifiedCardinality)
                    var modelRestrictionType = modelRestriction.constraintType.value;
                    var modelCardinality = null;
                    if (modelRestriction.cardinalityType?.value && modelRestriction.cardinalityValue?.value) {
                        modelRestrictionType = modelRestriction.cardinalityType.value;
                        modelCardinality = { type: modelRestriction.cardinalityType.value, value: modelRestriction.cardinalityValue.value };
                    } else if (modelRestrictionType == "http://www.w3.org/2002/07/owl#onClass") {
                        // owl:onClass alone is not a valid restriction constraint, it only qualifies a cardinality
                        modelRestrictionType = "http://www.w3.org/2002/07/owl#someValuesFrom";
                    }

                    columnClassIds.forEach(function (fromClassId) {
                        if (!ancestorIdsByColumnClass[fromClassId][modelRestriction.subject.value]) {
                            return;
                        }
                        columnClassIds.forEach(function (toClassId) {
                            if (!ancestorIdsByColumnClass[toClassId][modelRestriction.value.value]) {
                                return;
                            }
                            classesMap[fromClassId].forEach(function (fromColumnId) {
                                classesMap[toClassId].forEach(function (toColumnId) {
                                    // the same restriction repeated on an ancestor or in an import gives the same line
                                    var relationKey = fromColumnId + "-->" + toColumnId + "-->" + modelRestriction.prop.value + "-->" + modelRestrictionType + "-->" + modelCardinality?.value;
                                    if (relationKeysMap[relationKey]) {
                                        return;
                                    }
                                    relationKeysMap[relationKey] = true;
                                    var existingPropertyId = classesRelationsMap[nodesClassesMap[fromColumnId] + "-->" + nodesClassesMap[toColumnId]];
                                    relations.push({
                                        source: modelRestriction.source,
                                        fromColumn: { id: fromColumnId, label: nodesMap[fromColumnId].label },
                                        toColumn: { id: toColumnId, label: nodesMap[toColumnId].label },
                                        property: { id: modelRestriction.prop.value, label: modelRestriction.propLabel.value },
                                        restrictionType: modelRestrictionType,
                                        cardinality: modelCardinality,
                                        isAlreadyExisting: existingPropertyId == modelRestriction.prop.value,
                                    });
                                });
                            });
                        });
                    });
                });

                var sourceNodeIdsMap = {};
                relations.forEach(function (relation) {
                    var sourceNodeId = "Restrictions_" + relation.source;
                    if (!sourceNodeIdsMap[sourceNodeId]) {
                        sourceNodeIdsMap[sourceNodeId] = true;
                        jstreeData.push({
                            id: sourceNodeId,
                            text: relation.source,
                            parent: "Restrictions",
                        });
                    }
                    var state = relation.isAlreadyExisting ? { disabled: true } : { disabled: false };
                    var restrictionLabel = "";
                    if (relation.cardinality) {
                        var cardinalityTypeParts = relation.cardinality.type.split("#");
                        var cardinalityTypeName = cardinalityTypeParts[cardinalityTypeParts.length - 1];
                        restrictionLabel = " [" + cardinalityTypeName + " " + relation.cardinality.value + "]";
                    } else if (relation.restrictionType) {
                        var restrictionTypeParts = relation.restrictionType.split("#");
                        restrictionLabel = " [" + restrictionTypeParts[restrictionTypeParts.length - 1] + "]";
                    }
                    jstreeData.push({
                        id: common.getRandomHexaId(5),
                        text: relation.fromColumn.label + "-" + relation.property.label + "->" + relation.toColumn.label + restrictionLabel,
                        parent: sourceNodeId,
                        data: relation,
                        state: state,
                    });
                });
                callback(null, jstreeData);
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
        // the root and the source nodes carry no relation
        var relations = checkedItems.filter(function (item) {
            return item.data?.fromColumn;
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
