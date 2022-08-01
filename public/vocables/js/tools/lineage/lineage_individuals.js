var Lineage_individuals = (function () {
    var self = {};
    self.currentFilters = [];
    self.dataSources = {};

    self.init = function () {
        self.currentFilters = [];
        $("#LineageIndividualsTab").load("snippets/lineage/lineageIndividualsSearchDialog.html", function () {
            $("#LineageIndividualsQueryParams_dataSourcesSelect").children().remove().end();
            $("#LineageIndividualsQueryParams_filterPanel").css("display", "none");
            self.dataSources = Config.sources[Lineage_classes.mainSource].dataSources;
            if (!self.dataSources) {
                $("#LineageIndividualsQueryParams_showIndividualsTriples").css("display", "block");
            } else {
                var dataSourcesArray = Object.keys(self.dataSources);
                var emptyOption = false;
                common.fillSelectOptions("LineageIndividualsQueryParams_dataSourcesSelect", dataSourcesArray, emptyOption);
                if (!emptyOption) self.onDataSourcesSelect($("#LineageIndividualsQueryParams_dataSourcesSelect").val());
            }
        });
    };

    self.onDataSourcesSelect = function (dataSourceKey) {
        $(".LineageIndividualsQueryParams_panel").css("display", "none");
        self.currentDataSource = self.dataSources[dataSourceKey];
        self.currentDataSource.name = dataSourceKey;
        if (!self.currentDataSource) return;

        if (self.currentDataSource.type.indexOf("sql") > -1) {
            $("#LineageIndividualsQueryParams_SQLfilterPanel").css("display", "block");
        } else if (self.currentDataSource.type == "searchIndex") {
            $("#LineageIndividualsQueryParams_searchIndexFilterPanel").css("display", "block");
            self.setClass(self.currentClassNode);
        }
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

    self.setClass = function (node) {
        //  self.getNodeLinkedData(node)
        $("#Lineage_Tabs").tabs("option", "active", 3);
        self.currentClassNode = node;
        $("#LineageIndividualsQueryParams_className").html(self.currentClassNode.data.label);
        if (self.currentDataSource.type == "searchIndex") {
            self.searchIndex.showClassIndividualsTree();
        } else if (self.currentDataSource.type.indexOf("sql") > -1) {
            self.currentDataSource.currentClassNodeMapping = self.currentDataSource.classMappings[self.currentClassNode.data.id];
            if (!self.currentDataSource.currentClassNodeMapping) return alert("No mapping for Class " + self.currentClassNode.data.label + " in data source " + self.currentDataSource.name);
            self.sql.getModel(self.currentDataSource, function (err, model) {
                if (err) return alert(err);
                self.sql.showTables(self.currentClassNode.data.id);
            });
        }
    };

    self.executeQuery = function () {
        if (self.currentDataSource.type.indexOf("sql") > -1) {
            self.sql.executeQuery();
        } else if (self.currentDataSource.type == "searchIndex") {
            self.searchIndex.executeQuery();
        }
    };

    self.onSearchDialogOperatorSelect = function (operator) {};

    self.showAll = function () {
        Lineage_classes.drawNamedIndividuals([self.currentClassNode.id]);
    };

    self.clearQuery = function () {
        self.currentFilters = [];
        $("#LineageIndividualsQueryParams_QueryDiv").html("");
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

    self.removeQueryElement = function (index) {
        self.currentFilters.splice(index, 1);
        $("#LineageIndividualsQueryParams_Elt_" + index).remove();
    };

    self.onQueryParamsDialogCancel = function () {
        $("#LineagePopup").dialog("close");
    };

    self.drawIndividuals = function () {
        if (self.currentDataSource.type.indexOf("sql") > -1) {
            self.sql.drawSearchIndividuals();
        } else if (self.currentDataSource.type == "searchIndex") {
            self.searchIndex.drawIndividuals();
        }
    };

    self.sql = {
        getModel: function (dataSource, callback) {
            if (dataSource.model) return callback(null, dataSource.model);

            if (self.currentDataSource.model) return self.currentDataSource.model;

            const params = new URLSearchParams({
                name: self.currentDataSource.dbName,
                type: self.currentDataSource.type,
            });
            $.ajax({
                type: "GET",
                url: Config.apiUrl + "/kg/model?" + params.toString(),
                dataType: "json",

                success: function (data, _textStatus, _jqXHR) {
                    self.currentDataSource.model = data;
                    callback();
                },
                error: function (_err) {
                    callback(err);
                },
            });
        },
        showTables: function (dataSource) {
            if (!self.currentDataSource.classMappings[self.currentClassNode.data.id]) return alert("node mappings for class " + self.currentClassNode.data.label);
            var tables = Object.keys(self.currentDataSource.classMappings[self.currentClassNode.data.id]);
            common.fillSelectOptions("LineageIndividualsQueryParams_SQL_tablesSelect", tables, true);
        },
        showColumns: function (table) {
            var schema = self.currentDataSource.table_schema;
            var tableColumns = self.currentDataSource.model[schema + "." + table];

            common.fillSelectOptions("LineageIndividualsQueryParams_SQL_columnsSelect", tableColumns, true);
        },
        onColumnChange: function (column) {
            $("#LineageIndividualsQueryParams_value").val("");
            if (true) {
                self.sql.fillValuesSelect();
            }
        },
        fillValuesSelect: function () {
            var table = $("#LineageIndividualsQueryParams_SQL_tablesSelect").val();
            var column = $("#LineageIndividualsQueryParams_SQL_columnsSelect").val();
            if (!table || !column) return alert("select a tbale and a column");
            var SampleSizelimit = 1000;
            var sqlQuery = " select distinct column from " + table + " limit " + SampleSizelimit;
            if (self.currentDataSource.type == "sql.sqlserver") sqlQuery = " select distinct  " + column + " from " + table;

            const params = new URLSearchParams({
                type: self.currentDataSource.type,
                dbName: self.currentDataSource.dbName,
                sqlQuery: sqlQuery,
            });

            $.ajax({
                type: "GET",
                url: Config.apiUrl + "/kg/data?" + params.toString(),
                dataType: "json",

                success: function (data, _textStatus, _jqXHR) {
                    if (data.size >= SampleSizelimit) return alert("too many values");
                    common.fillSelectOptions("LineageIndividualsQueryParams_valuesSelect", data, true, column, column);
                    $("#LineageIndividualsQueryParams_operator").val("=");
                },
                error(err) {
                    return alert(err.responseText);
                },
            });
        },
        getFilter: function () {
            var classId = self.currentClassNode.data.id;
            var classLabel = self.currentClassNode.data.label;

            var table = $("#LineageIndividualsQueryParams_SQL_tablesSelect").val();
            var column = $("#LineageIndividualsQueryParams_SQL_columnsSelect").val();
            var operator = $("#LineageIndividualsQueryParams_operator").val();
            var value = $("#LineageIndividualsQueryParams_value").val();
            var html = "<div class='LineageIndividualsQueryParams_QueryElt' id='LineageIndividualsQueryParams_Elt_" + self.currentFilters.length + "'> ";
            var obj = {
                classId: classId,
                classLabel: classLabel,
                table: table,
            };

            html += classLabel + "&nbsp;";
            if (value) {
                obj.column = column;
                obj.operator = operator;
                obj.value = value;
                html += table + "." + column + " " + operator + "&nbsp;" + value + "&nbsp;";
            } else {
                html += "ALL &nbsp;";
                obj.column = column;
            }
            html += "<button style='size: 10px' onclick='Lineage_individuals.removeQueryElement(" + self.currentFilters.length + ")'>X</button></div>";
            $("#LineageIndividualsQueryParams_QueryDiv").append(html);
            return obj;
        },

        drawSearchIndividuals: function () {
            var tables = [];

            self.currentFilters.forEach(function (filter) {
                if (tables.indexOf(filter.table) < 0) tables.push(filter.table);
            });
            var from = "";
            var tablesCount = tables.length;
            if (tablesCount > 1) {
                return alert("no join between table");
            } else tablesCount == 1;
            fromStr = tables[0];

            var SampleSizelimit = 5000;

            var whereArray = [];
            var columnsStr = "";
            var columnToClassMap = {};

            self.currentFilters.forEach(function (filter, index) {
                if (index > 0) columnsStr += ",";
                columnsStr += filter.table + "." + filter.column;
                columnToClassMap[filter.column] = filter.classId;
                if (filter.value) {
                    var opValue = "";
                    if (filter.operator == "contains") {
                        opValue = " LIKE ('%" + filter.value + "%')";
                    } else {
                        if (common.isNumber(filter.value)) {
                            opValue = filter.operator + filter.value;
                        } else {
                            opValue = filter.operator + "'" + filter.value + "'";
                        }
                    }
                    whereArray.push(filter.column + " " + opValue);
                }
            });
            var whereStr = "";
            whereArray.forEach(function (whereItem, index) {
                if (index > 0) whereStr += " AND ";
                whereStr += whereItem;
            });

            var currentClassNodeMapping = self.currentDataSource.currentClassNodeMapping;
            for (var table in currentClassNodeMapping) {
                if (tables.indexOf(table) > -1) columnsStr += "," + table + "." + currentClassNodeMapping[table];
                columnToClassMap[currentClassNodeMapping[table]] = self.currentClassNode.id;
            }

            var sqlQuery = " select  " + columnsStr + " from " + fromStr + " limit " + SampleSizelimit;
            if (self.currentDataSource.type == "sql.sqlserver") sqlQuery = " select top  " + SampleSizelimit + " " + columnsStr + "  from " + fromStr;

            if (whereStr != "") sqlQuery += " WHERE " + whereStr;

            const params = new URLSearchParams({
                type: self.currentDataSource.type,
                dbName: self.currentDataSource.dbName,
                sqlQuery: sqlQuery,
            });

            $.ajax({
                type: "GET",
                url: Config.apiUrl + "/kg/data?" + params.toString(),
                dataType: "json",

                success: function (data, _textStatus, _jqXHR) {
                    if (data.size >= SampleSizelimit) alert("too many values");
                    var visjsData = { nodes: [], edges: [] };
                    var existingVisjsIds = visjsGraph.getExistingIdsMap();

                    data.forEach(function (item) {
                        for (var column in columnToClassMap) {
                            var classNodeId = columnToClassMap[column];

                            var individual = item[column];

                            if (individual) {
                                if (visjsGraph.isGraphNotEmpty()) {
                                    var classNodeObj = visjsGraph.data.nodes.get(classNodeId);
                                    if (existingVisjsIds[classNodeId]) {
                                        var color = classNodeObj.color;
                                        var edgeId = individual + "_" + classNodeId;
                                        if (!existingVisjsIds[edgeId]) {
                                            existingVisjsIds[edgeId] = 1;

                                            visjsData.edges.push({
                                                id: edgeId,
                                                from: individual,
                                                to: classNodeId,
                                                color: color,
                                            });
                                        }
                                    }
                                }

                                if (!existingVisjsIds[individual]) {
                                    existingVisjsIds[individual] = 1;

                                    visjsData.nodes.push({
                                        id: individual,
                                        label: individual,
                                        shape: Lineage_classes.namedIndividualShape,

                                        color: color,
                                        data: {
                                            id: individual,
                                            label: individual,
                                            source: "linked_" + self.currentDataSource.name,
                                        },
                                    });
                                }
                            }
                        }
                        var array = Object.keys(columnToClassMap);
                        for (var i = 0; i < array.length; i++) {
                            for (var j = 0; j < array.length; j++) {
                                if (i == j) continue;
                                var from = item[array[i]];
                                var to = item[array[j]];
                                var edgeId = from + "_" + to;
                                var inverseEdgeId = to + "_" + from;
                                if (!existingVisjsIds[edgeId] && !existingVisjsIds[inverseEdgeId]) {
                                    existingVisjsIds[edgeId] = 1;

                                    visjsData.edges.push({
                                        id: edgeId,
                                        from: from,
                                        to: to,
                                        color: "#0067bb",
                                        data: {
                                            from: from,
                                            to: to,
                                            source: "linked_" + self.currentDataSource.name,
                                        },
                                    });
                                }
                            }
                        }
                    });
                    if (false) {
                        // draw edges between indiviudals
                        var individualEdges = {};
                        for (var paragraphId in graphEdgesMap) {
                            var individuals = graphEdgesMap[paragraphId];
                            individuals.forEach(function (item1) {
                                individuals.forEach(function (item2) {
                                    if (item1.individual != item2.individual && item1.classId != item2.classId) {
                                        var edgeId = item1.individual + "_" + item2.individual;
                                        if (!individualEdges[edgeId]) individualEdges[edgeId] = [];
                                        individualEdges[edgeId].push(paragraphId);
                                    }
                                });
                            });
                        }
                        for (var edgeId in individualEdges) {
                            var array = edgeId.split("_");
                            var inverseEdgeId = array[1] + "_" + array[0];
                            if (!existingVisjsIds[edgeId] && !existingVisjsIds[inverseEdgeId]) {
                                existingVisjsIds[edgeId] = 1;

                                visjsData.edges.push({
                                    id: edgeId,
                                    from: "searchIndex_" + array[0],
                                    to: "searchIndex_" + array[1],
                                    color: "#0067bb",
                                    data: {
                                        from: array[0],
                                        to: array[1],
                                        source: "_searchIndex_paragraph",
                                        paragraphs: individualEdges[edgeId],
                                    },
                                });
                            }
                        }
                    }
                    if (visjsGraph.isGraphNotEmpty()) {
                        visjsGraph.data.nodes.add(visjsData.nodes);
                        visjsGraph.data.edges.add(visjsData.edges);
                    } else {
                        Lineage_classes.drawNewGraph(visjsData);
                    }
                },
                error(err) {
                    return alert(err.responseText);
                },
            });
        },
        onValuesSelectChange: function () {
            var value = $("#LineageIndividualsQueryParams_valuesSelect").val();
            $("#LineageIndividualsQueryParams_value").val(value);
        },
        executeQuery: function (output) {
            var SampleSizelimit = 5000;
            var table = $("#LineageIndividualsQueryParams_SQL_tablesSelect").val();
            var column = $("#LineageIndividualsQueryParams_SQL_columnsSelect").val();
            var operator = $("#LineageIndividualsQueryParams_operator").val();
            var value = $("#LineageIndividualsQueryParams_value").val();

            var sqlQuery = " select  * from " + table + " limit " + SampleSizelimit;
            if (self.currentDataSource.type == "sql.sqlserver") sqlQuery = " select top  " + SampleSizelimit + " * from " + table;

            if (value) {
                var value2 = "";
                if (operator == "contains") value2 = " LIKE ('%" + value + "%')";
            }
            sqlQuery += " where " + column + value2;

            const params = new URLSearchParams({
                type: self.currentDataSource.type,
                dbName: self.currentDataSource.dbName,
                sqlQuery: sqlQuery,
            });

            $.ajax({
                type: "GET",
                url: Config.apiUrl + "/kg/data?" + params.toString(),
                dataType: "json",

                success: function (data, _textStatus, _jqXHR) {
                    if (data.size >= SampleSizelimit) return alert("too many values");
                    if (output == "table") {
                    }
                },
                error(err) {
                    return alert(err.responseText);
                },
            });
        },
    };
    self.searchIndex = {
        getFilter: function () {
            var individuals = $("#LineageIndividuals_individualsTree").jstree().get_checked(true);
            if (individuals.length == 0) return alert("no indiviual selected");
            var obj = { classNode: self.currentClassNode, individuals: [] };

            var html = "<div class='LineageIndividualsQueryParams_QueryElt' id='LineageIndividualsQueryParams_Elt_" + self.currentFilters.length + "'> ";
            html += "<b>" + self.currentClassNode.data.label + "</b>";
            var queryIndex = self.currentFilters.length;
            if (individuals[0].id == "_ALL") {
                self.currentFilters.push(obj);

                html += " ALL";
            } else {
                individuals.forEach(function (individual) {
                    obj.individuals.push(individual.data.id);
                });
                self.currentFilters.push(obj);

                if (individuals.length < 5) {
                    individuals.forEach(function (individual) {
                        html += " " + individual.data.label;
                    });
                }
            }
            html += "<button style='size: 10px' onclick='Lineage_individuals.removeQueryElement(" + queryIndex + ")'>X</button></div>";
            $("#LineageIndividualsQueryParams_QueryDiv").append(html);
            return obj;
        },

        executeFilterQuery: function (callback) {
            if (self.currentFilters.length == 0) return alert("no query filter");
            var mustFilters = [];
            var shouldFilters = [];
            var terms = [];
            self.currentFilters.forEach(function (filter, index) {
                if (filter.individuals.length == 0) {
                    terms.push({ term: { ["Concepts." + filter.classNode.data.label + ".name.keyword"]: filter.classNode.data.label } });
                } else {
                    var individuals = [];
                    filter.individuals.forEach(function (individual) {
                        individuals.push(individual);
                    });

                    terms.push({ terms: { ["Concepts." + filter.classNode.data.label + ".instances.keyword"]: individuals } });
                }
                if (index == 0) {
                    mustFilters = terms;
                    terms = [];
                } else shouldFilters = terms;
            });

            var query = {
                query: {
                    bool: {
                        must: mustFilters,

                        //  "boost": 1.0
                    },
                },
            };
            if (shouldFilters.length > 0) {
                query.query.bool.filter = shouldFilters;
                //  query.query.bool.minimum_should_match = 1;
            }

            var payload = {
                query: query,
                url: "_search",
                indexes: self.currentDataSource.indexes,
            };
            $.ajax({
                type: "POST",
                url: Config.apiUrl + "/elasticsearch/query_gaia",
                data: JSON.stringify(payload),
                contentType: "application/json",
                dataType: "json",

                success: function (result, _textStatus, _jqXHR) {
                    callback(null, result);
                },
                error: function (_err) {
                    callback(err);
                },
            });
        },

        showClassIndividualsTree: function (output) {
            var query = {};

            query = {
                aggs: {
                    [self.currentClassNode.data.label]: {
                        terms: {
                            field: "Concepts." + self.currentClassNode.data.label + ".instances.keyword",
                            size: 1000,
                            min_doc_count: 2,
                        },
                    },
                },
            };

            if (!Array.isArray(self.currentDataSource.indexes)) self.currentDataSource.indexes = [self.currentDataSource.indexes];

            var payload = {
                query: query,
                url: "_search",
                indexes: self.currentDataSource.indexes,
            };
            $.ajax({
                type: "POST",
                url: Config.apiUrl + "/elasticsearch/query_gaia",
                data: JSON.stringify(payload),
                contentType: "application/json",
                dataType: "json",

                success: function (result, _textStatus, _jqXHR) {
                    if (Object.keys(result.aggregations).length == 0) {
                        return;
                    }
                    for (var key in result.aggregations) {
                        var buckets = result.aggregations[key].buckets;
                        var jstreeData = [];

                        jstreeData.push({
                            id: "_ALL",
                            text: "ALL",
                            parent: "#",
                            data: {
                                id: "_ALL",
                                text: "ALL",
                                class: self.currentClassNode,
                            },
                        });
                        buckets.sort(function (a, b) {
                            if (a.key > b.key) return 1;
                            if (a.key < b.key) return -1;
                            return 0;
                        });
                        buckets.forEach(function (bucket) {
                            jstreeData.push({
                                id: bucket.key,
                                text: bucket.key + " " + bucket.doc_count,
                                parent: "#",
                                data: {
                                    id: bucket.key,
                                    label: bucket.key,
                                    class: self.currentClassNode,
                                },
                            });
                        });
                        var options = {
                            openAll: false,
                            withCheckboxes: true,
                            contextMenu: function () {},
                            searchPlugin: {
                                case_insensitive: true,
                                fuzzy: false,
                                show_only_matches: true,
                            },
                        };
                        $("#LineageIndividuals_individualsTreeSearchInput").bind("keyup", null, Lineage_individuals.searchIndex.searchInIndividualsTree);
                        common.jstree.loadJsTree("LineageIndividuals_individualsTree", jstreeData, options);
                    }
                },
                error: function (_err) {
                    callback(err);
                },
            });
        },
        searchInIndividualsTree: function (event) {
            if (event.keyCode != 13) return;
            var value = $("#LineageIndividuals_individualsTreeSearchInput").val();
            $("#LineageIndividuals_individualsTree").jstree(true).search(value);
            $("#LineageIndividuals_individualsTreeSearchInput").val("");
        },
        drawIndividuals: function () {
            $("#LineageIndividualsQueryParams_message").html("searching...");
            self.searchIndex.executeFilterQuery(function (err, result) {
                if (err) return alert(err.responseText);
                var message = "" + result.hits.hits.length + " hits found";
                $("#LineageIndividualsQueryParams_message").html(message);

                var graphNodesMap = {};
                var graphEdgesMap = {};

                // aggregate individuals inside map of graph nodes map
                self.currentFilters.forEach(function (filter) {
                    var filterClassName = filter.classNode.data.label;
                    var fitlerIndividuals = filter.individuals;
                    if (!graphNodesMap[filter.classNode.data.id])
                        graphNodesMap[filter.classNode.data.id] = {
                            filter: filter,
                            individuals: {},
                        };

                    result.hits.hits.forEach(function (hit) {
                        var hitConceptObj = hit._source.Concepts[filterClassName];
                        if (!hitConceptObj) return;
                        var hitConceptIndividuals = hitConceptObj.instances;
                        hitConceptIndividuals.forEach(function (hitIndividual) {
                            if (fitlerIndividuals.length == 0 || fitlerIndividuals.indexOf(hitIndividual) > -1) {
                                if (!graphNodesMap[filter.classNode.data.id].individuals[hitIndividual]) graphNodesMap[filter.classNode.data.id].individuals[hitIndividual] = 0;
                                graphNodesMap[filter.classNode.data.id].individuals[hitIndividual] += 1;

                                if (!graphEdgesMap[hit._source.ParagraphId]) graphEdgesMap[hit._source.ParagraphId] = [];
                                graphEdgesMap[hit._source.ParagraphId].push({
                                    classId: filter.classNode.data.id,
                                    individual: hitIndividual,
                                });
                            }
                        });
                    });
                });

                visjsData = { nodes: [], edges: [] };

                var existingVisjsIds = visjsGraph.getExistingIdsMap();
                for (var graphNodeId in graphNodesMap) {
                    var classNode = graphNodesMap[graphNodeId].filter.classNode;
                    var color = classNode.color;

                    if (false && !existingVisjsIds[graphNodeId]) {
                        existingVisjsIds[graphNodeId] = 1;

                        visjsData.nodes.push({
                            id: classNode.data.id,
                            label: classNode.data.label,
                            shape: Lineage_classes.defaultShape,
                            size: Lineage_classes.defaultShapeSize,
                            color: color,
                            data: {
                                id: classNode.data.id,
                                label: classNode.data.label,
                                source: classNode.data.source,
                            },
                        });
                    } else {
                    }

                    for (var hitIndividual in graphNodesMap[graphNodeId].individuals) {
                        var id = "searchIndex_" + hitIndividual;
                        if (!existingVisjsIds[id]) {
                            existingVisjsIds[id] = 1;

                            visjsData.nodes.push({
                                id: id,
                                label: hitIndividual,
                                shape: Lineage_classes.namedIndividualShape,
                                color: color,
                                data: {
                                    id: hitIndividual,
                                    label: hitIndividual,
                                    source: "linked_" + self.currentDataSource.name,
                                    filter: graphNodesMap[graphNodeId].filter,
                                },
                            });
                        }
                        var edgeId = id + "_" + graphNodeId;
                        if (!existingVisjsIds[edgeId]) {
                            existingVisjsIds[edgeId] = 1;
                            visjsData.edges.push({
                                id: edgeId,
                                from: id,
                                to: graphNodeId,
                                data: {
                                    source: "linked_" + self.currentDataSource.name,
                                },
                            });
                        }
                    }
                }
                // draw edges between indiviudals
                var individualEdges = {};
                for (var paragraphId in graphEdgesMap) {
                    var individuals = graphEdgesMap[paragraphId];
                    individuals.forEach(function (item1) {
                        individuals.forEach(function (item2) {
                            if (item1.individual != item2.individual && item1.classId != item2.classId) {
                                var edgeId = item1.individual + "_" + item2.individual;
                                if (!individualEdges[edgeId]) individualEdges[edgeId] = [];
                                individualEdges[edgeId].push(paragraphId);
                            }
                        });
                    });
                }
                for (var edgeId in individualEdges) {
                    var array = edgeId.split("_");
                    var inverseEdgeId = array[1] + "_" + array[0];
                    if (!existingVisjsIds[edgeId] && !existingVisjsIds[inverseEdgeId]) {
                        existingVisjsIds[edgeId] = 1;

                        visjsData.edges.push({
                            id: edgeId,
                            from: "searchIndex_" + array[0],
                            to: "searchIndex_" + array[1],
                            color: "#0067bb",
                            data: {
                                from: array[0],
                                to: array[1],
                                source: "_searchIndex_paragraph",
                                paragraphs: individualEdges[edgeId],
                            },
                        });
                    }
                }
                if (visjsGraph.isGraphNotEmpty()) {
                    visjsGraph.data.nodes.add(visjsData.nodes);
                    visjsGraph.data.edges.add(visjsData.edges);
                } else {
                    Lineage_classes.drawNewGraph(visjsData);
                }
            });
        },
        listParagraphs: function () {
            self.searchIndex.executeFilterQuery(function (err, result) {
                if (err) return alert(err.responseText);
            });
        },
    };

    return self;
})();
