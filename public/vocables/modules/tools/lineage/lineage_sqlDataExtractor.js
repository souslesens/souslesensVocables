import SimpleListSelectorWidget from "../../uiWidgets/simpleListSelectorWidget.js";
import Lineage_sources from "./lineage_sources.js";
import MappingColumnsGraph from "../mappingModeler/mappingColumnsGraph.js";

import common from "../../shared/common.js";
import MappingsToSql, { extractRelationMap, buildSqlByDatabaseSources, buildObjectPropertyKey, quoteIdentifier, getDatasource } from "../mappingModeler/mappingsToSql.js";
import KGquery_filter_bot from "../../bots/KGquery_filter_bot.js";
import KGquery_paths from "../KGquery/KGquery_paths.js";
import SqlLargeResult_bot from "../../bots/sqlLargeResult_bot.js";

var Lineage_sqlDataExtractor = (function () {
    var self = {};

    self.currentNodeType = "mappedToTableNode";
    self.sqlFilters = [];
    self.filterVariableName = "v";
    self.filterValuesLimit = 500;
    self.xsdPrefixRegex = /^xsd:/;
    self.previewRowsLimit = 10000;
    self.utcIsoDateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
    // SLS dateFormat codes, see util.getDateFromSLSformat on the server
    self.postgresDateFormatBySlsFormat = {
        FR: "DD/MM/YYYY HH24:MI:SS",
        USA: "MM/DD/YYYY HH24:MI:SS",
        EUR: "DD.MM.YYYY HH24:MI:SS",
    };
    // a timestamp column or an ISO text, both cast directly
    self.isoDateFormats = ["ISO", "ISO-time"];
    self.numericRangeRegex = /(int|integer|float|double|decimal)$/;
    // the style KGquery_paths.drawPathOnGraph gives the path of its first query set
    self.pathEdgeStyle = { color: "green", width: 3 };
    self.edgesBeforeHighlight = [];
    self.Lineage_sqlDataExtractor = self.init = function () {
        self.isRecording = false;
        $("#dataExtractorDiv").load("./modules/tools/lineage/html/lineage_sqlDataExtractorDialog.html", function (err) {});
    };

    self.drawDatabaseMappedNodes = function (source) {
        if (!source) {
            source = Lineage_sources.activeSource;
        }
        self.currentSource = source;
        // filters point at relation keys of the previous source
        self.sqlFilters = [];
        MappingColumnsGraph.getSourceMappingsModel(source, null, function (err, json) {
            var relationsMap = MappingsToSql.extractRelationMap(json);
            self.currentMappingJson = json;

            self.currentRelationsMap = relationsMap;
            var visjsData = { nodes: [], edges: [] };
            var existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
            self.currentDatypesMap = {};
            var shape = "diamond";
            for (const [key, values] of relationsMap) {
                values.forEach(function (value) {
                    if (value.kind == "dataProperty") {
                        self.currentDatypesMap[key] = value;
                    } else if (value.kind == "objectProperty") {
                        if (!existingNodes[value.subjectUri]) {
                            existingNodes[value.subjectUri] = 1;
                            visjsData.nodes.push({
                                id: value.subjectUri,
                                label: value.subjectLabel,
                                shape: shape,
                                color: "#ddd",
                                data: {
                                    id: value.subjectUri,
                                    label: value.subjectLabel,
                                    source: source,
                                    type: self.currentNodeType,
                                },
                            });
                        }
                        if (!existingNodes[value.objectUri]) {
                            existingNodes[value.objectUri] = 1;
                            visjsData.nodes.push({
                                id: value.objectUri,
                                label: value.objectLabel,
                                shape: shape,
                                color: "#ddd",
                                data: {
                                    id: value.objectUri,
                                    label: value.objectLabel,
                                    source: source,
                                    type: self.currentNodeType,
                                },
                            });
                        }

                        if (!existingNodes[key]) {
                            existingNodes[key] = 1;
                            visjsData.edges.push({
                                id: key,
                                from: value.subjectUri,
                                to: value.objectUri,
                                label: value.predicateLabel,
                                data: {
                                    label: value.predicateLabel,
                                    source: source,
                                },
                            });
                        }
                    }
                });
            }

            if (Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                Lineage_whiteboard.lineageVisjsGraph.data.nodes.update(visjsData.nodes);
                Lineage_whiteboard.lineageVisjsGraph.data.edges.update(visjsData.edges);
            } else {
                Lineage_whiteboard.drawNewGraph(visjsData, "graphDiv");
            }
        });
    };

    self.startPathRecording = function () {
        self.isRecording = true;
        self.currentPaths = [];
        // clearAll empties the graph before redrawing it
        if (Lineage_whiteboard.lineageVisjsGraph.data) {
            Lineage_whiteboard.lineageVisjsGraph.data.edges.update(self.edgesBeforeHighlight);
        }
        self.edgesBeforeHighlight = [];

        var jstreeData = [];
        JstreeWidget.loadJsTree("sqlDataExtractor_jstreeDiv", jstreeData, { withCheckboxes: true });
    };
    self.clearPath = function () {
        self.currentPaths = [];
        JstreeWidget.empty("sqlDataExtractor_jstreeDiv");
    };
    self.getSQL = function (options) {
        if (!options) {
            options = {};
        }

        var checkedNodes = JstreeWidget.getjsTreeCheckedNodes("sqlDataExtractor_jstreeDiv");

        var dataTypePaths = [];
        checkedNodes.forEach(function (node) {
            if (node.parents.length == 2) {
                dataTypePaths.push(node.id);
            }
        });

        var allPaths = dataTypePaths.concat(self.currentPaths);
        // a filtered property joins its table even when it is not checked
        self.sqlFilters.forEach(function (sqlFilter) {
            for (var variable in sqlFilter.keyByVariable) {
                if (allPaths.indexOf(sqlFilter.keyByVariable[variable]) < 0) {
                    allPaths.push(sqlFilter.keyByVariable[variable]);
                }
            }
        });
        var queries;
        try {
            queries = buildSqlByDatabaseSources(allPaths, self.currentRelationsMap, self.currentMappingJson);
        } catch (error) {
            // mappingsToSql throws when two tables share no class of the path to join on
            self.sql = null;
            return MainController.errorAlert(error.message);
        }

        for (const [databaseName, { datasource, sql, aliasMap }] of queries) {
            // a property mapped in several tables has one column per table, the filter holds on each of them
            var filterExpressionsByKey = {};
            for (const [, column] of aliasMap) {
                if (!column.key) {
                    continue;
                }
                var filterExpression = column.expression;
                // compare dates as timestamps, never as text: '13/11/2018' > '2020-01-01' holds as text
                var postgresDateFormat = self.postgresDateFormatBySlsFormat[column.format];
                if (postgresDateFormat) {
                    filterExpression = "TO_TIMESTAMP(NULLIF(" + column.expression + "::text, ''), '" + postgresDateFormat + "')";
                } else if (self.isoDateFormats.indexOf(column.format) > -1) {
                    filterExpression = column.expression + "::timestamp";
                } else if (self.numericRangeRegex.test(column.range || "")) {
                    // numbers can be text with a space as thousands separator: '3 422.21'
                    filterExpression = "NULLIF(REGEXP_REPLACE(" + column.expression + "::text, '\\s', '', 'g'), '')::numeric";
                }
                filterExpressionsByKey[column.key] = (filterExpressionsByKey[column.key] || []).concat(filterExpression);
            }
            var filterConditions = [];
            var untranslatedFilterLabels = [];
            self.sqlFilters.forEach(function (sqlFilter) {
                var columnCount = 1;
                for (var variable in sqlFilter.keyByVariable) {
                    var variableExpressions = filterExpressionsByKey[sqlFilter.keyByVariable[variable]] || [];
                    columnCount = Math.max(columnCount, variableExpressions.length);
                }
                for (var columnIndex = 0; columnIndex < columnCount; columnIndex++) {
                    var expressionByVariable = {};
                    for (var filteredVariable in sqlFilter.keyByVariable) {
                        var expressions = filterExpressionsByKey[sqlFilter.keyByVariable[filteredVariable]] || [];
                        expressionByVariable[filteredVariable] = expressions[Math.min(columnIndex, expressions.length - 1)];
                    }
                    var condition = KGquery_filter_bot.sparqlFilterToSqlCondition(sqlFilter.filter, expressionByVariable);
                    if (!condition) {
                        return untranslatedFilterLabels.push(sqlFilter.filterLabel);
                    }
                    filterConditions.push("(" + condition + ")");
                }
            });
            if (untranslatedFilterLabels.length > 0) {
                self.sql = null;
                return MainController.errorAlert("filter not translatable to SQL: " + untranslatedFilterLabels.join(", "));
            }
            var filteredSql = sql;
            if (filterConditions.length > 0) {
                // buildSqlFromMappings always writes a WHERE: one IS NOT NULL per mapping
                filteredSql += "\n  AND " + filterConditions.join("\n  AND ");
            }
            console.log(databaseName, datasource, filteredSql);
            self.sql = filteredSql;
            self.sqlDatasource = datasource;
            // views without primary key: batches are stable only when ordered on every column
            var orderByColumns = [];
            for (const [sqlAlias] of aliasMap) {
                orderByColumns.push(quoteIdentifier(sqlAlias));
            }
            self.sortedSql = self.sql + "\nORDER BY " + orderByColumns.join(", ");
        }

        if (options.hideDialog) {
            return;
        }
        var previewSql = self.sortedSql + "\nLIMIT " + self.previewRowsLimit;
        $("#smallDialogDiv").html("<textarea style='width:500px;height: 350px'>" + previewSql + "</textarea>");
        $("#smallDialogDiv").dialog("open");
    };

    self.executeSQL = function () {
        self.sql = null;
        self.getSQL({ hideDialog: true });
        if (!self.sql) {
            return UI.message("no SQL generated from the selected path");
        }
        var rows = [];
        var isExportChosen = false;
        async.series(
            [
                function (callbackSeries) {
                    self.runSql(self.sortedSql + "\nLIMIT " + (self.previewRowsLimit + 1), self.sqlDatasource, function (err, firstRows) {
                        rows = firstRows;
                        callbackSeries(err);
                    });
                },
                function (callbackSeries) {
                    if (rows.length <= self.previewRowsLimit) {
                        return callbackSeries();
                    }
                    SqlLargeResult_bot.start(self.previewRowsLimit, function (_err, isExport) {
                        isExportChosen = isExport;
                        if (!isExportChosen) {
                            rows = rows.slice(0, self.previewRowsLimit);
                        }
                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    if (!isExportChosen) {
                        return callbackSeries();
                    }
                    async.doWhilst(
                        function (callbackWhilst) {
                            self.runSql(self.sortedSql + "\nLIMIT " + self.previewRowsLimit + " OFFSET " + rows.length, self.sqlDatasource, function (err, batchRows) {
                                if (err) {
                                    return callbackWhilst(err);
                                }
                                rows = rows.concat(batchRows);
                                UI.message("retrieving results... " + rows.length);
                                callbackWhilst(null, batchRows.length);
                            });
                        },
                        function (batchRowCount) {
                            return batchRowCount == self.previewRowsLimit;
                        },
                        callbackSeries,
                    );
                },
            ],
            function (err) {
                if (err) {
                    return MainController.errorAlert(err);
                }
                UI.message(rows.length + " results retrieved");
                var headers = [];
                var tableCols = [];
                rows.forEach(function (row) {
                    for (var column in row) {
                        if (headers.indexOf(column) < 0) {
                            headers.push(column);
                            tableCols.push({ title: column, defaultContent: "", width: "15%" });
                        }
                    }
                });
                var lines = [];
                rows.forEach(function (row) {
                    var line = [];
                    headers.forEach(function (column) {
                        var cellValue = row[column] ?? "";
                        // the server sends a postgres timestamp as UTC ISO text, show it as stored
                        if (self.utcIsoDateTimeRegex.test(cellValue)) {
                            var storedDate = new Date(cellValue);
                            var storedTimeString = storedDate.toTimeString();
                            var storedTime = storedTimeString.slice(0, 8);
                            cellValue = common.getSimpleDateStrFromDate(storedDate) + " " + storedTime;
                        }
                        line.push(cellValue);
                    });
                    lines.push(line);
                });
                if (isExportChosen) {
                    return Export.exportDataToCSV([headers].concat(lines), self.currentSource + ".csv");
                }
                Export.showDataTable("smallDialogDiv", tableCols, lines);
            },
        );
    };

    self.runSql = function (sql, datasource, callback) {
        const params = new URLSearchParams({
            dbName: datasource,
            sqlQuery: sql,
        });
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/kg/data?" + params.toString(),
            dataType: "json",
            success: function (result, _textStatus, _jqXHR) {
                // knex raw result on postgres
                return callback(null, result.rows);
            },
            error(err) {
                // the route answers {error}, a postgres error object for a failing query
                var routeError = err.responseJSON?.error || err.responseText || err;
                return callback(typeof routeError == "string" ? routeError : JSON.stringify(routeError));
            },
        });
    };

    self.addFilter = function (classNodeId) {
        var classLabel = JstreeWidget.getjsTreeNodeObj("sqlDataExtractor_jstreeDiv", classNodeId).data.label;

        var keyByVariable = {};
        var nonObjectProperties = [];
        for (const [key, values] of self.currentRelationsMap) {
            var mapping = values[0];
            if (mapping.kind != "dataProperty" || mapping.subjectUri != classNodeId) {
                continue;
            }
            // the bot names its SPARQL variable varName_<property id>, a short id keeps it a plain word
            var propertyId = "p" + nonObjectProperties.length;
            keyByVariable[self.filterVariableName + "_" + propertyId] = key;
            nonObjectProperties.push({
                id: propertyId,
                label: mapping.predicateLabel,
                datatype: (mapping.range || "").replace(self.xsdPrefixRegex, "http://www.w3.org/2001/XMLSchema#"),
            });
        }
        if (nonObjectProperties.length == 0) {
            return UI.message("no datatype property to filter on this class");
        }

        var filterQuery = {
            source: self.currentSource,
            currentClass: classNodeId,
            property: "",
            varName: self.filterVariableName,
            listValuesFn: function (propertyId, callback) {
                self.listColumnValues(keyByVariable[self.filterVariableName + "_" + propertyId], callback);
            },
        };
        KGquery_filter_bot.start({ id: classNodeId, nonObjectProperties: nonObjectProperties }, filterQuery, function (err, result) {
            if (err) {
                return MainController.errorAlert(err);
            }
            var usedKeyByVariable = {};
            // the bot gives no readable text here: the filter itself, variables named after their property
            var readableFilter = result.filter.replace(KGquery_filter_bot.filterWrapperRegex, "$1");
            for (var variable in keyByVariable) {
                // ?v_p1 must not match inside ?v_p10
                var variableRegex = new RegExp("\\?" + variable + "\\b", "g");
                if (result.filter.search(variableRegex) > -1) {
                    usedKeyByVariable[variable] = keyByVariable[variable];
                    readableFilter = readableFilter.replace(variableRegex, self.currentRelationsMap.get(keyByVariable[variable])[0].predicateLabel);
                }
            }
            self.sqlFilters.push({
                filter: result.filter,
                keyByVariable: usedKeyByVariable,
                filterLabel: classLabel + " : " + readableFilter.trim(),
            });
            var pathTree = $("#sqlDataExtractor_jstreeDiv").jstree(true);
            for (var usedVariable in usedKeyByVariable) {
                pathTree.check_node(usedKeyByVariable[usedVariable]);
            }
            self.updateFilterIcons();
        });
    };

    self.listColumnValues = function (key, callback) {
        var mapping = self.currentRelationsMap.get(key)[0];
        var column = quoteIdentifier(mapping.to.id);
        var sql = "SELECT DISTINCT " + column + " AS value FROM " + quoteIdentifier(mapping.to.dataTable) + " WHERE " + column + " IS NOT NULL ORDER BY 1 LIMIT " + self.filterValuesLimit;
        self.runSql(sql, getDatasource(mapping.to, self.currentMappingJson), function (err, rows) {
            if (err) {
                return callback(err);
            }
            var values = [];
            rows.forEach(function (row) {
                values.push({ id: String(row.value), label: String(row.value) });
            });
            callback(null, values);
        });
    };

    self.updateFilterIcons = function () {
        var pathTree = $("#sqlDataExtractor_jstreeDiv").jstree(true);
        var filterLabelsByKey = {};
        self.sqlFilters.forEach(function (sqlFilter) {
            for (var variable in sqlFilter.keyByVariable) {
                var key = sqlFilter.keyByVariable[variable];
                filterLabelsByKey[key] = (filterLabelsByKey[key] || []).concat(sqlFilter.filterLabel);
            }
        });
        for (const [key, values] of self.currentRelationsMap) {
            if (!pathTree.get_node(key)) {
                continue;
            }
            var propertyText = values[0].predicateLabel;
            if (filterLabelsByKey[key]) {
                var removeFilterButton = $("<button>")
                    .addClass("slsv-invisible-button filterIcon")
                    .attr("title", filterLabelsByKey[key].join("\n") + "\n(click to remove)")
                    .attr("onclick", "event.stopPropagation();Lineage_sqlDataExtractor.removePropertyFilters(" + JSON.stringify(key) + ")");
                propertyText += "&nbsp;" + removeFilterButton[0].outerHTML;
            }
            pathTree.rename_node(key, propertyText);
        }
    };

    self.removePropertyFilters = function (key) {
        self.sqlFilters = self.sqlFilters.filter(function (sqlFilter) {
            var filteredKeys = Object.values(sqlFilter.keyByVariable);
            return filteredKeys.indexOf(key) < 0;
        });
        self.updateFilterIcons();
    };

    self.clearAll = function (source) {
        self.lastRecordedNode = null;
        Lineage_whiteboard.lineageVisjsGraph.clearGraph();
        self.drawDatabaseMappedNodes(source || self.currentSource);
        self.startPathRecording();
    };

    // same path finding as KGquery: shortest path over the relations, then managePathAmbiguousEdges
    self.addClassToPath = function (node) {
        var previousNode = self.lastRecordedNode;
        if (!previousNode) {
            self.lastRecordedNode = node;
            return self.addClassToTree(node);
        }
        if (previousNode.id == node.id) {
            return;
        }

        var labelByClassId = {};
        var vicinityArray = [];
        for (const [, mappings] of self.currentRelationsMap) {
            var mapping = mappings[0];
            if (mapping.kind != "objectProperty") {
                continue;
            }
            labelByClassId[mapping.subjectUri] = mapping.subjectLabel;
            labelByClassId[mapping.objectUri] = mapping.objectLabel;
            vicinityArray.push([mapping.subjectUri, mapping.objectUri, mapping.predicateUri]);
        }

        // startPathRecording replaces it: an answer arriving after a clear all is dropped
        var recordedPaths = self.currentPaths;
        $.ajax({
            type: "POST",
            url: `${Config.apiUrl}/shortestPath`,
            data: { body: { fromNodeUri: previousNode.id, toNodeUri: node.id, vicinityArray: vicinityArray } },
            dataType: "json",
            success: function (pathEdges) {
                if (self.currentPaths !== recordedPaths) {
                    return;
                }
                if (pathEdges.length == 0) {
                    UI.message("no relation between " + previousNode.label + " and " + node.label);
                    self.lastRecordedNode = node;
                    return self.addClassToTree(node);
                }
                KGquery_paths.managePathAmbiguousEdges(pathEdges, function (unambiguousPathEdges) {
                    unambiguousPathEdges.forEach(function (pathEdge) {
                        // the server appends 1 to an edge it walks backwards, subject and object keep their place
                        var [subjectUri, objectUri, predicateUri] = pathEdge;
                        var relationKey = buildObjectPropertyKey(subjectUri, predicateUri, objectUri);
                        if (recordedPaths.indexOf(relationKey) < 0) {
                            recordedPaths.push(relationKey);
                        }
                        [subjectUri, objectUri].forEach(function (classId) {
                            var isIntermediateClass = classId != previousNode.id && classId != node.id;
                            if (isIntermediateClass && !JstreeWidget.getjsTreeNodeObj("sqlDataExtractor_jstreeDiv", classId)) {
                                self.addClassToTree({ id: classId, label: labelByClassId[classId] });
                            }
                        });
                    });
                    self.lastRecordedNode = node;
                    self.addClassToTree(node);
                    self.highlightPathOnGraph();
                });
            },
            error: function (error) {
                MainController.errorAlert(error.responseText || error);
            },
        });
    };

    // the whiteboard edge of a relation has the relation key as id (drawDatabaseMappedNodes)
    self.highlightPathOnGraph = function () {
        var edgesDataSet = Lineage_whiteboard.lineageVisjsGraph.data.edges;
        var highlightedEdges = [];
        self.currentPaths.forEach(function (relationKey) {
            var edge = edgesDataSet.get(relationKey);
            var isAlreadyHighlighted = self.edgesBeforeHighlight.some((edgeBeforeHighlight) => edgeBeforeHighlight.id == relationKey);
            if (!edge || isAlreadyHighlighted) {
                return;
            }
            // null gives the edge back the graph default
            self.edgesBeforeHighlight.push({ id: relationKey, color: edge.color ?? null, width: edge.width ?? null });
            highlightedEdges.push({ id: relationKey, ...self.pathEdgeStyle });
        });
        edgesDataSet.update(highlightedEdges);
    };

    self.addClassToTree = function (node) {
        var jstreedata = [
            {
                id: node.id,
                // same filter icon as the KGquery class divs, stopPropagation keeps the click from checking the node
                text:
                    node.label +
                    "&nbsp;<button class='slsv-invisible-button filterIcon' about='add filter' " +
                    "onclick=\"event.stopPropagation();Lineage_sqlDataExtractor.addFilter('" +
                    node.id +
                    "')\"></button>",
                parent: "#",
                data: { label: node.label },
            },
        ];
        JstreeWidget.addNodesToJstree("sqlDataExtractor_jstreeDiv", "#", jstreedata);

        jstreedata = [];
        for (const [key, values] of self.currentRelationsMap) {
            // a key holds one value per mapped column, the tree shows the key once
            var mapping = values[0];
            if (mapping.subjectUri == node.id && mapping.kind == "dataProperty") {
                jstreedata.push({
                    id: key,
                    text: mapping.predicateLabel,
                    parent: node.id,
                    data: {
                        type: mapping.objectUri,
                        path: key,
                        state: {
                            checked: true,
                        },
                    },
                });
            }
        }

        JstreeWidget.addNodesToJstree("sqlDataExtractor_jstreeDiv", node.id, jstreedata);
    };

    return self;
})();

export default Lineage_sqlDataExtractor;
window.Lineage_sqlDataExtractor = Lineage_sqlDataExtractor;
