import SimpleListSelectorWidget from "../../uiWidgets/simpleListSelectorWidget.js";
import Lineage_sources from "./lineage_sources.js";
import MappingColumnsGraph from "../mappingModeler/mappingColumnsGraph.js";

import common from "../../shared/common.js";
import MappingsToSql, { extractRelationMap, buildSqlByDatabaseSources, buildObjectPropertyKey, quoteIdentifier, quotePublicTableName, getDatabaseSources } from "../mappingModeler/mappingsToSql.js";
import KGquery_filter_bot from "../../bots/KGquery_filter_bot.js";
import KGquery_paths from "../KGquery/KGquery_paths.js";
import SqlLargeResult_bot from "../../bots/sqlLargeResult_bot.js";
import SQLquery_run from "../KGquery/sql/SQLquery_run.js";

var Lineage_sqlDataExtractor = (function () {
    var self = {};

    self.currentNodeType = "mappedToTableNode";
    self.sqlFilters = [];
    self.filterVariableName = "v";
    self.filterValuesLimit = 500;
    self.xsdPrefixRegex = /^xsd:/;
    self.previewRowsLimit = 10000;
    // node-pg dataTypeID of date, timestamp and timestamptz, sent by the route as UTC ISO text
    self.postgresDateTypeIds = [1082, 1114, 1184];
    // SLS dateFormat codes, see util.getDateFromSLSformat on the server
    self.postgresDateFormatBySlsFormat = {
        FR: "DD/MM/YYYY HH24:MI:SS",
        USA: "MM/DD/YYYY HH24:MI:SS",
        EUR: "DD.MM.YYYY HH24:MI:SS",
    };
    // a timestamp column or an ISO text, both cast directly
    self.isoDateFormats = ["ISO", "ISO-time"];
    // a range is written xsd:x or with its full XMLSchema# URI
    self.xsdRangePrefixPattern = "(^xsd:|XMLSchema#)";
    self.numericRangeRegex = new RegExp(
        self.xsdRangePrefixPattern +
            "(decimal|float|double|integer|int|long|short|byte|nonNegativeInteger|nonPositiveInteger|negativeInteger|positiveInteger|unsignedLong|unsignedInt|unsignedShort|unsignedByte)$",
    );
    self.dateRangeRegex = new RegExp(self.xsdRangePrefixPattern + "date");
    // the style KGquery_paths.drawPathOnGraph gives the path of its first query set
    self.pathEdgeStyle = { color: "green", width: 3 };
    self.edgesBeforeHighlight = [];
    // checking it checks every class and property of the path
    self.pathTreeRootId = "sqlDataExtractorPathRoot";
    // the data_type of each column by table, by datasource of the mapping
    self.dataTypesByDatasource = {};
    self.Lineage_sqlDataExtractor = self.init = function () {
        self.isRecording = false;
        $("#dataExtractorDiv").load("./modules/tools/lineage/html/lineage_sqlDataExtractorDialog.html", function () {
            self.startPathRecording();
        });
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
            self.loadDataTypes(json);
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

    // the previous types stay until the new ones arrive: a query built meanwhile keeps its casts
    self.loadDataTypes = function (mappingJson) {
        var dataTypesByDatasource = {};
        var datasources = Object.keys(getDatabaseSources(mappingJson));
        async.each(
            datasources,
            function (datasource, callbackEach) {
                SQLquery_run.getDBmodel({ name: datasource, type: "sql", withTypes: true }, function (error, dataTypesByTable) {
                    if (error) {
                        UI.message("data types of " + datasource + " not read");
                        return callbackEach();
                    }
                    dataTypesByDatasource[datasource] = dataTypesByTable;
                    callbackEach();
                });
            },
            function () {
                self.dataTypesByDatasource = dataTypesByDatasource;
            },
        );
    };

    self.startPathRecording = function () {
        self.isRecording = true;
        self.currentPaths = [];
        // clearAll empties the graph before redrawing it
        if (Lineage_whiteboard.lineageVisjsGraph.data) {
            Lineage_whiteboard.lineageVisjsGraph.data.edges.update(self.edgesBeforeHighlight);
        }
        self.edgesBeforeHighlight = [];

        var jstreeData = [{ id: self.pathTreeRootId, text: "Path", parent: "#" }];
        JstreeWidget.loadJsTree("sqlDataExtractor_jstreeDiv", jstreeData, {
            withCheckboxes: true,
            contextMenu: function (node) {
                if (node.id == self.pathTreeRootId) {
                    return null;
                }
                if (node.parent == self.pathTreeRootId) {
                    return {
                        removeClass: {
                            label: "Remove from path",
                            action: function () {
                                self.removeClassFromPath(node.id);
                            },
                        },
                    };
                }
                return {
                    filter: {
                        label: "Filter",
                        action: function () {
                            self.addFilter(node.parent, node.id);
                        },
                    },
                };
            },
        });
    };
    self.clearPath = function () {
        self.currentPaths = [];
        var pathTree = $("#sqlDataExtractor_jstreeDiv").jstree(true);
        JstreeWidget.deleteNode("sqlDataExtractor_jstreeDiv", pathTree.get_node(self.pathTreeRootId).children);
    };
    self.getPathKeys = function () {
        var checkedNodes = JstreeWidget.getjsTreeCheckedNodes("sqlDataExtractor_jstreeDiv");

        var dataTypePaths = [];
        checkedNodes.forEach(function (node) {
            if (node.parents.length == 3) {
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
        return allPaths;
    };

    self.getSQL = function (options) {
        if (!options) {
            options = {};
        }
        var queries;
        try {
            queries = buildSqlByDatabaseSources(self.getPathKeys(), self.currentRelationsMap, self.currentMappingJson, self.dataTypesByDatasource);
        } catch (error) {
            // mappingsToSql throws when the path cannot be read from the mapping
            self.sql = null;
            return MainController.errorAlert(error.message);
        }

        for (const [databaseName, { datasource, sql, aliasMap }] of queries) {
            // the ::text of an xml column comes from the data types
            if (!self.dataTypesByDatasource[datasource]) {
                self.sql = null;
                return MainController.errorAlert("data types of " + databaseName + " not read");
            }
            // mappingsToSql reads a data property from one column
            var filterExpressionByKey = {};
            for (const [, column] of aliasMap) {
                if (!column.key) {
                    continue;
                }
                // a range xsd:string can sit on an xml column, which has no equality: compare as text
                // KGquery_filter_bot skips its ILIKE cast on this ::text suffix
                var textExpression = column.expression + "::text";
                var filterExpression = textExpression;
                // compare dates as days, never as text: '13/11/2018' > '2020-01-01' holds as text, 10:00 on a day equals that day
                var postgresDateFormat = self.postgresDateFormatBySlsFormat[column.format];
                if (postgresDateFormat) {
                    filterExpression = "TO_TIMESTAMP(NULLIF(" + textExpression + ", ''), '" + postgresDateFormat + "')::date";
                } else if (self.isoDateFormats.indexOf(column.format) > -1 || self.dateRangeRegex.test(column.range)) {
                    filterExpression = "NULLIF(" + textExpression + ", '')::date";
                } else if (self.numericRangeRegex.test(column.range)) {
                    // numbers can be text with a space as thousands separator: '3 422.21'
                    filterExpression = "NULLIF(REGEXP_REPLACE(" + textExpression + ", '\\s', '', 'g'), '')::numeric";
                }
                filterExpressionByKey[column.key] = filterExpression;
            }
            var filterConditions = [];
            var untranslatedFilterLabels = [];
            self.sqlFilters.forEach(function (sqlFilter) {
                var expressionByVariable = {};
                for (var variable in sqlFilter.keyByVariable) {
                    expressionByVariable[variable] = filterExpressionByKey[sqlFilter.keyByVariable[variable]];
                }
                var condition = KGquery_filter_bot.sparqlFilterToSqlCondition(sqlFilter.filter, expressionByVariable);
                if (!condition) {
                    return untranslatedFilterLabels.push(sqlFilter.filterLabel);
                }
                filterConditions.push("(" + condition + ")");
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
            // views have no key, a class id sorts faster; SELECT DISTINCT orders on selected columns only
            var classIdAliases = [];
            var dataPropertyAliases = [];
            for (const [sqlAlias, column] of aliasMap) {
                if (column.isClassIdColumn) {
                    classIdAliases.push(quoteIdentifier(sqlAlias));
                } else {
                    dataPropertyAliases.push(quoteIdentifier(sqlAlias));
                }
            }
            var orderByAliases = [...classIdAliases, ...dataPropertyAliases];
            // sorted outside the joins: a LIMIT on the joins makes postgres pick nested loops, hours on tables without index
            self.sortedSql = "SELECT * FROM (\n" + self.sql + "\n) extracted\nORDER BY " + orderByAliases.join(", ");
        }

        if (options.hideDialog) {
            return;
        }
        var previewSql = self.sortedSql + "\nLIMIT " + self.previewRowsLimit;
        $("#smallDialogDiv").html(
            "<button onclick='Lineage_sqlDataExtractor.copySqlToClipboard()'>copy</button><br>" +
                "<textarea id='sqlDataExtractor_sqlTextarea' style='width:500px;height: 350px'>" +
                previewSql +
                "</textarea>",
        );
        $("#smallDialogDiv").dialog("open");
    };

    self.copySqlToClipboard = function () {
        common.copyTextToClipboard($("#sqlDataExtractor_sqlTextarea").val());
    };

    self.executeSQL = function () {
        self.sql = null;
        self.getSQL({ hideDialog: true });
        if (!self.sql) {
            return UI.message("no SQL generated from the selected path");
        }
        var rows = [];
        var dateColumns = [];
        var isExportChosen = false;
        async.series(
            [
                function (callbackSeries) {
                    self.runSql(self.sortedSql + "\nLIMIT " + (self.previewRowsLimit + 1), self.sqlDatasource, function (err, firstRows, fields) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        rows = firstRows;
                        fields.forEach(function (field) {
                            if (self.postgresDateTypeIds.indexOf(field.dataTypeID) > -1) {
                                dateColumns.push(field.name);
                            }
                        });
                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    if (rows.length <= self.previewRowsLimit) {
                        return callbackSeries();
                    }
                    SqlLargeResult_bot.start(self.previewRowsLimit, function (_err, isExport, displayedRowsLimit) {
                        isExportChosen = isExport;
                        if (!isExportChosen) {
                            rows = rows.slice(0, displayedRowsLimit);
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
                        // a date column comes as UTC ISO text of the server local time, show it as stored; a text column is already as stored
                        if (dateColumns.indexOf(column) > -1 && cellValue !== "") {
                            var storedDate = new Date(cellValue);
                            var storedTimeString = storedDate.toTimeString();
                            var storedTime = storedTimeString.slice(0, 8);
                            cellValue = common.getSimpleDateStrFromDate(storedDate) + " " + storedTime;
                        } else if (cellValue.type == "Buffer") {
                            // a bytea comes as {type: "Buffer", data: [bytes]}, shown as the \x hex text postgres compares
                            var hexBytes = cellValue.data.map(function (byteValue) {
                                var hexByte = byteValue.toString(16);
                                return hexByte.padStart(2, "0");
                            });
                            cellValue = "\\x" + hexBytes.join("");
                        }
                        line.push(cellValue);
                    });
                    lines.push(line);
                });
                if (isExportChosen) {
                    return Export.exportDataToCSV([headers].concat(lines), self.currentSource + ".csv");
                }
                // 10000 rows drawn at once take 11 s, a page of 200 rows 1.5 s
                Export.showDataTable("smallDialogDiv", tableCols, lines, null, { paging: true });
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
                return callback(null, result.rows, result.fields);
            },
            error(err) {
                // the route answers {error}, a postgres error object for a failing query
                var routeError = err.responseJSON?.error || err.responseText || err;
                return callback(typeof routeError == "string" ? routeError : JSON.stringify(routeError));
            },
        });
    };

    self.addFilter = function (classNodeId, propertyKey) {
        var classLabel = JstreeWidget.getjsTreeNodeObj("sqlDataExtractor_jstreeDiv", classNodeId).data.label;

        var keyByVariable = {};
        var nonObjectProperties = [];
        // the bot skips its property list when given one
        var chosenPropertyId = "";
        for (const [key, values] of self.currentRelationsMap) {
            var mapping = values[0];
            if (mapping.kind != "dataProperty" || mapping.subjectUri != classNodeId) {
                continue;
            }
            // the bot names its SPARQL variable varName_<property id>, a short id keeps it a plain word
            var propertyId = "p" + nonObjectProperties.length;
            keyByVariable[self.filterVariableName + "_" + propertyId] = key;
            if (key == propertyKey) {
                chosenPropertyId = propertyId;
            }
            // the bot offers numeric operators to xsd:int, xsd:float and xsd:decimal only
            var datatype = self.numericRangeRegex.test(mapping.range) ? "xsd:decimal" : mapping.range;
            nonObjectProperties.push({
                id: propertyId,
                label: mapping.predicateLabel,
                datatype: datatype.replace(self.xsdPrefixRegex, "http://www.w3.org/2001/XMLSchema#"),
            });
        }
        if (nonObjectProperties.length == 0) {
            return UI.message("no datatype property to filter on this class");
        }

        var filterQuery = {
            source: self.currentSource,
            currentClass: classNodeId,
            property: chosenPropertyId,
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

    // the values of the column the filter on key reads, which depends on the path
    self.listColumnValues = function (key, callback) {
        var pathKeys = self.getPathKeys();
        if (pathKeys.indexOf(key) < 0) {
            pathKeys.push(key);
        }
        var filteredColumn = null;
        var datasource = null;
        try {
            var queries = buildSqlByDatabaseSources(pathKeys, self.currentRelationsMap, self.currentMappingJson, self.dataTypesByDatasource);
            for (const [, query] of queries) {
                for (const [, column] of query.aliasMap) {
                    if (column.key == key) {
                        filteredColumn = column;
                        datasource = query.datasource;
                        break;
                    }
                }
            }
        } catch (error) {
            return callback(error.message);
        }
        if (!filteredColumn) {
            return callback("no column read for " + key);
        }
        // xml has no equality and a bytea comes as an object: listed as postgres text
        var column = quoteIdentifier(filteredColumn.column) + "::text";
        var sql = "SELECT DISTINCT " + column + " AS value FROM " + quotePublicTableName(filteredColumn.table) + " WHERE " + column + " IS NOT NULL ORDER BY 1 LIMIT " + self.filterValuesLimit;
        self.runSql(sql, datasource, function (err, rows) {
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

    // the path stays one piece: what the removed class cuts off from the first class entered goes with it
    self.removeClassFromPath = function (classId) {
        var pathTree = $("#sqlDataExtractor_jstreeDiv").jstree(true);
        // addNodesToJstree inserts first: the tree lists the classes latest first
        var pathClassIds = pathTree.get_node(self.pathTreeRootId).children;
        var remainingClassIds = pathClassIds.filter((pathClassId) => pathClassId != classId);
        var firstClassId = remainingClassIds[remainingClassIds.length - 1];

        var keptClassIds = firstClassId ? [firstClassId] : [];
        for (var keptClassIndex = 0; keptClassIndex < keptClassIds.length; keptClassIndex++) {
            var keptClassId = keptClassIds[keptClassIndex];
            self.currentPaths.forEach(function (relationKey) {
                var mapping = self.currentRelationsMap.get(relationKey)[0];
                var relationClassIds = [mapping.subjectUri, mapping.objectUri];
                if (relationClassIds.indexOf(keptClassId) < 0 || relationClassIds.indexOf(classId) > -1) {
                    return;
                }
                relationClassIds.forEach(function (relationClassId) {
                    if (keptClassIds.indexOf(relationClassId) < 0) {
                        keptClassIds.push(relationClassId);
                    }
                });
            });
        }

        var removedClassIds = pathClassIds.filter((pathClassId) => keptClassIds.indexOf(pathClassId) < 0);
        removedClassIds.forEach(function (removedClassId) {
            pathTree.get_node(removedClassId).children.forEach(function (propertyKey) {
                self.removePropertyFilters(propertyKey);
            });
            JstreeWidget.deleteNode("sqlDataExtractor_jstreeDiv", removedClassId);
        });

        var removedRelationKeys = self.currentPaths.filter(function (relationKey) {
            var mapping = self.currentRelationsMap.get(relationKey)[0];
            return keptClassIds.indexOf(mapping.subjectUri) < 0 || keptClassIds.indexOf(mapping.objectUri) < 0;
        });
        // splice, not a new array: addClassToPath tells a clear all by the array identity
        removedRelationKeys.forEach(function (relationKey) {
            self.currentPaths.splice(self.currentPaths.indexOf(relationKey), 1);
        });
        var restoredEdges = self.edgesBeforeHighlight.filter((edgeBeforeHighlight) => removedRelationKeys.indexOf(edgeBeforeHighlight.id) > -1);
        self.edgesBeforeHighlight = self.edgesBeforeHighlight.filter((edgeBeforeHighlight) => removedRelationKeys.indexOf(edgeBeforeHighlight.id) < 0);
        Lineage_whiteboard.lineageVisjsGraph.data.edges.update(restoredEdges);

        var latestClassId = pathTree.get_node(self.pathTreeRootId).children[0];
        self.lastRecordedNode = latestClassId ? { id: latestClassId, label: pathTree.get_node(latestClassId).data.label } : null;
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
                parent: self.pathTreeRootId,
                data: { label: node.label },
            },
        ];
        JstreeWidget.addNodesToJstree("sqlDataExtractor_jstreeDiv", self.pathTreeRootId, jstreedata);

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
