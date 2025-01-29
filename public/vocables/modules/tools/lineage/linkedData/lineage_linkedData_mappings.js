import KGcreator from "../../KGcreator/KGcreator.js";

import Lineage_whiteboard from "../lineage_whiteboard.js";
import common from "../../../shared/common.js";
import Sparql_common from "../../../sparqlProxies/sparql_common.js";
import Sparql_generic from "../../../sparqlProxies/sparql_generic.js";
import Sparql_proxy from "../../../sparqlProxies/sparql_proxy.js";
import Sparql_OWL from "../../../sparqlProxies/sparql_OWL.js";

//www.nstauthority.co.uk/data-centre/data-downloads-and-publications/well-data/

var Lineage_linkedData_mappings = (function () {
    var self = {};

    self.context = "linkedData_mappings";
    self.tableShape = "square";
    self.columnShape = "diamond";
    self.databaseShape = " database";
    self.isInitialized = false;

    self.mappingSourceLabel = "linkedData_mappings_graphUri";

    self.init = function () {
        if (!self.isInitialized) {
            self.isInitialized = true;

            Config.sources[self.mappingSourceLabel] = {
                graphUri: Config.linkedData_mappings_graphUri,
                sparql_server: { url: Config.sparql_server.url },
                controller: Sparql_OWL,
            };
            self.initSourceMappingsTree();
        }

        //
    };

    self.initKGcreatorDialogWithDatabase = function (database) {
        KGcreator.onChangeSourceTypeSelect("DATABASE", function (err, result) {
            $("#KGcreator_csvDirsSelect").val(database);

            KGcreator.listTables();
        });
    };

    self.onSelectRelation = function (relationId) {
        self.relationObj = self.joinsMap[relationId];
        self.databasesMap = self.joinsMap[relationId].databases;
    };

    self.getTablesTreeContextMenu = function () {
        var items = {};

        /*  items.setAsSubject = {
label: "Graph table",
action: function(_e) {

if (KGcreator.currentTreeNode.parents.length != 1) return;
self.graphTable(KGcreator.currentTreeNode);
}
};*/
        items.LinkToGraphNode = {
            label: "Link to graphNode",
            action: function (_e) {
                self.linkColumnToGraphNode(KGcreator.currentTreeNode);
            },
        };

        items.showSampledata = {
            label: "Show sample data",
            action: function (_e) {
                self.showSampledata(KGcreator.currentTreeNode, null, "mainDialogDiv");
            },
        };

        return items;
    };

    self.showSampledata = function (table, column, targetDiv) {
        var node = { parent: table };
        var allColumns = true;
        if (column) {
            allColumns = false;
            column = column.substring(table.length + 1);
            node.data = { id: column };
        }
        KGcreator.showSampleData(node, allColumns, 100, function (err, result) {
            if (err) return alert(err.responseText);

            result = result.replace(/\n/g, "</td><tr><td>");
            result = result.replace(/\t/g, "</td><td>");
            var html = "<table><tr><td>" + result + "</tr></table>";

            $("#" + targetDiv).html(html);
            if (targetDiv == "mainDailogDiv") $("#mainDialogDiv").dialog("open");
        });
    };

    self.onCsvtreeNodeClicked = function () {
        return;
    };

    self.onAddEdgeDropped = function (edgeData) {
        var sourceNode = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get(edgeData.from).data;
        var targetNode = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get(edgeData.to).data;

        // link join beetwen tables
        if (sourceNode.context == self.context && targetNode.context == self.context) {
        }
        // link column to entity (class or Individual)
        else if (sourceNode.context != self.context && targetNode.context == self.context) {
            var entityUri = sourceNode.id;
            var columnDesc = targetNode;
        }
        // link column to entity (class or Individual)
        else if (sourceNode.context == self.context && targetNode.context != self.context) {
            var columnDesc = sourceNode.id;
            var entityUri = targetNode;
        } else {
        }
    };

    self.linkColumnToGraphNode = function (jstreeNode) {
        if (jstreeNode.parents.length != 2) return alert("select a column");
        var graphNode = Lineage_whiteboard.currentGraphNode;
        if (!graphNode || graphNode.from || !graphNode.data.source) return alert(" select a class or an individual node");

        var columnObj = {
            column: jstreeNode.data.id,
            table: jstreeNode.parent,
            database: KGcreator.currentCsvDir || KGcreator.currentDbName,
            contex: self.context,
            type: "column",
        };

        if (confirm("link " + columnObj.table + "." + columnObj.column + " to node" + graphNode.data.label))
            self.writeColumnMapping(graphNode.data, columnObj, function (err, result) {
                if (err) return alert(err.responseText);
                var columnUri = result.columnUri;
                var visjsData = { nodes: [], edges: [] };
                var existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
                if (!existingNodes[columnUri]) {
                    var color = Lineage_whiteboard.getSourceColor(columnObj.database);
                    existingNodes[columnUri] = 1;
                    visjsData.nodes.push({
                        id: columnUri,
                        label: columnObj.table + "." + columnObj.column,

                        shadow: Lineage_whiteboard.nodeShadow,
                        shape: Lineage_linkedData_mappings.columnShape,
                        level: 1,
                        size: Lineage_whiteboard.defaultShapeSize,
                        color: color,
                        data: columnObj,
                    });
                }
                var edgeId = columnUri + "_" + graphNode.id;
                if (!existingNodes[edgeId]) {
                    existingNodes[edgeId] = 1;

                    visjsData.edges.push({
                        id: edgeId,
                        from: columnUri,
                        to: graphNode.id,
                        data: {
                            context: self.context,
                            id: edgeId,
                            from: columnUri,
                            to: graphNode.id,
                            type: "relation",
                        },
                        color: color,
                    });
                }
                if (Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                    Lineage_whiteboard.lineageVisjsGraph.data.nodes.add(visjsData.nodes);
                    Lineage_whiteboard.lineageVisjsGraph.data.edges.add(visjsData.edges);
                } else {
                    Lineage_whiteboard.drawNewGraph(visjsData);
                }
            });
    };

    self.createGraphRelationJoin = function () {
        var edge = Lineage_whiteboard.currentGraphEdge;
        if (!edge) return alert("select relation");

        self.currentDatabase = KGcreator.currentCsvDir || KGcreator.currentDbName;
        if (!self.currentDatabase) return alert("select a database");

        var relation = edge.data;

        relation.from = edge.from;
        relation.to = edge.to;
        self.currentRelation = relation;
        var filterStr = Sparql_common.setFilter("subject", [relation.from, relation.to]);

        self.queryColumnsMappings(
            Lineage_sources.activeSource,
            {
                filter: filterStr,
                database: self.currentDatabase,
            },
            function (err, columns) {
                if (err) return alert(err.responseText);
                for (var col in columns) {
                    if (columns[col].subject == relation.from) {
                        relation.fromColumn = columns[col];
                    }
                    if (columns[col].subject == relation.to) {
                        relation.toColumn = columns[col];
                    }
                }
                if (!relation.fromColumn) return alert("no column mapping for node " + edge.fromNode.label);
                if (!relation.toColumn) return alert("no column mapping for node " + edge.toNode.label);

                if (relation.fromColumn.database != relation.toColumn.database) return alert("linked column are not in the same database");
                var str = "where " + relation.fromColumn.table + ".XXX=" + relation.toColumn.table + ".YYY";

                $("#mainDialogDiv").load("modules/tools/lineage/html/linkedData/lineage_linkedData_joinTablesDialog.html", function () {
                    $("#mainDialogDiv").dialog("open");

                    $("#lineage_linkedData_join_databaseId").html(relation.fromColumn.database);
                    $("#lineage_linkedData_join_fromClassId").html(relation.fromColumn.subjectLabel);
                    $("#lineage_linkedData_join_toClassId").html(relation.toColumn.subjectLabel);

                    $("#lineage_linkedData_join_fromTableId").html(relation.fromColumn.table);
                    $("#lineage_linkedData_join_toTableId").html(relation.toColumn.table);

                    var fromColumnObjs = [];
                    var fromColumns = $("#KGcreator_csvTreeDiv").jstree().get_node(relation.fromColumn.table).children;
                    fromColumns.forEach(function (item, index) {
                        var column = item.substring(relation.fromColumn.table.length + 1);
                        var id = relation.fromColumn.table + "." + column;
                        fromColumnObjs.push({ id: id, label: column });
                    });

                    var toColumnObjs = [];
                    var toColumns = $("#KGcreator_csvTreeDiv").jstree().get_node(relation.toColumn.table).children;
                    toColumns.forEach(function (item, index) {
                        var column = item.substring(relation.toColumn.table.length + 1);
                        var id = relation.toColumn.table + "." + column;
                        toColumnObjs.push({ id: id, label: column });
                    });

                    common.fillSelectOptions("lineage_linkedData_join_fromColumnSelect", fromColumnObjs, null, "label", "id");
                    common.fillSelectOptions("lineage_linkedData_join_toColumnSelect", toColumnObjs, null, "label", "id");

                    var joinTables = $("#KGcreator_csvTreeDiv").jstree().get_node("#").children;
                    common.fillSelectOptions("lineage_linkedData_join_joinTableSelect", joinTables, true);

                    /*    KGcreator.showSampleData({ data: {}, parent: relation.fromColumn.table }, true, 20, function(err, result) {
                if (err) return;
                result = result.replace(/\n/g, "</td><tr><td>");
                result = result.replace(/\t/g, "</td><td>");
                var html = "<table><tr><td>" + result + "</tr></table>";
                $("#lineage_linkedData_join_fromSampleDataDiv").html(html);
                KGcreator.showSampleData({ data: {}, parent: relation.toColumn.table }, true, 20, function(err, result) {
                  if (err) return;
                  result = result.replace(/\n/g, "</td><tr><td>");
                  result = result.replace(/\t/g, "</td><td>");
                  var html = "<table><tr><td>" + result + "</tr></table>";
                  $("#lineage_linkedData_join_toSampleDataDiv").html(html);
                });
              });*/
                });
            },
        );
    };

    /* self.showTableSample=function(table,div){
     KGcreator.showSampleData({ data: {}, parent: table }, true, 20, function(err, result) {
       if (err) return;
       result = result.replace(/\n/g, "</td><tr><td>");
       result = result.replace(/\t/g, "</td><td>");
       var html = "<table><tr><td>" + result + "</tr></table>";
       $("#"+div).html(html);
     })
   }*/

    self.showJoinTableColumns = function (joinTable) {
        $("#lineage_linkedData_join_sampleDataTableName").html(joinTable);
        self.currentRelation.joinTable = { table: joinTable, fromColumn: "", toColumn: "" };

        var joinColumnObjs = [];
        var joinTableColumns = $("#KGcreator_csvTreeDiv").jstree().get_node(joinTable).children;
        joinTableColumns.forEach(function (item) {
            var column = item.substring(joinTable.length + 1);
            var id = joinTable + "." + column;
            joinColumnObjs.push({ id: id, label: column });
        });

        common.fillSelectOptions("lineage_linkedData_join_joinColumnSelect", joinColumnObjs, null, "label", "id");
    };
    self.joinTable = function (direction) {
        var joinColumn = $("#lineage_linkedData_join_joinColumnSelect").val();

        if (direction == "from") {
            var column = $("#lineage_linkedData_join_fromColumnSelect").val();
            self.currentRelation.joinTable.fromColumn = joinColumn;
            $("#lineage_linkedData_join_fromJoinSpan").html(column + " -> " + joinColumn);
        } else if (direction == "to") {
            var column = $("#lineage_linkedData_join_toColumnSelect").val();
            self.currentRelation.joinTable.toColumn = joinColumn;
            $("#lineage_linkedData_join_toJoinSpan").html(joinColumn + " -> " + column);
        }
    };
    self.viewTableSample = function (direction) {
        if (direction == "from") {
            var column = $("#lineage_linkedData_join_fromColumnSelect").val();
            self.showSampledata(self.currentRelation.fromColumn.table, column, "lineage_linkedData_join_fromSampleDataDiv");
        } else if (direction == "join") {
            var column = $("#lineage_linkedData_join_joinColumnSelect").val();
            self.showSampledata(self.currentRelation.joinTable.table, column, "lineage_linkedData_join_joinSampleDataDiv");
        } else if (direction == "to") {
            var column = $("#lineage_linkedData_join_toColumnSelect").val();
            self.showSampledata(self.currentRelation.toColumn.table, column, "lineage_linkedData_join_toSampleDataDiv");
        }
    };

    self.buildJoin = function () {
        var fromColumn = $("#lineage_linkedData_join_fromColumnSelect").val();
        var toColumn = $("#lineage_linkedData_join_toColumnSelect").val();
        if (!fromColumn || !toColumn) return alert("enter fromColumn and toColumn ");

        var join = {
            database: self.currentDatabase,
            fromTable: self.currentRelation.fromColumn.table,
            toTable: self.currentRelation.toColumn.table,
            fromColumn: fromColumn,
            toColumn: toColumn,
        };

        if (self.currentRelation.joinTable) {
            join.joinTable = self.currentRelation.joinTable.table;
            join.joinWhere = fromColumn + " = " + self.currentRelation.joinTable.fromColumn + " and " + self.currentRelation.joinTable.toColumn + " = " + toColumn;
        }

        return join;
    };

    self.testJoin = function () {
        var join = self.buildJoin();
        var query = "select count(*) as count from " + join.fromTable + "," + join.toTable;
        if (join.joinTable) query += "," + join.joinTable;
        query += " where ";
        if (join.joinTable) query += join.joinWhere;
        else query += join.fromColumn + "=" + join.toColumn;

        const params = new URLSearchParams({
            type: "sql.sqlserver",
            dbName: KGcreator.currentDbName,
            sqlQuery: query,
        });

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/kg/data?" + params.toString(),
            dataType: "json",

            success: function (data, _textStatus, _jqXHR) {
                var count = data[0].count;
                alert("Join OK, found joins : " + count);
            },
            error(err) {
                return alert(err.responseText);
            },
        });
    };

    self.writeJoinMapping = function () {
        var join = self.buildJoin();

        var joinUri = Config.linkedData_mappings_graphUri + common.getRandomHexaId(10);

        var triples = [];
        triples.push({
            subject: joinUri,
            predicate: "slsv:database",
            object: join.database,
        });
        triples.push({
            subject: joinUri,
            predicate: "slsv:fromTable",
            object: join.fromTable,
        });
        triples.push({
            subject: joinUri,
            predicate: "slsv:toTable",
            object: join.toTable,
        });
        triples.push({
            subject: joinUri,
            predicate: "slsv:fromColumn",
            object: join.fromColumn,
        });
        triples.push({
            subject: joinUri,
            predicate: "slsv:toColumn",
            object: join.toColumn,
        });

        if (self.currentRelation.joinTable) {
            triples.push({
                subject: joinUri,
                predicate: "slsv:joinTable",
                object: join.joinTable,
            });

            triples.push({
                subject: joinUri,
                predicate: "slsv:joinWhere",
                object: join.joinWhere,
            });
        }

        triples.push({
            subject: joinUri,
            predicate: "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>",
            object: "slsv:sql-join",
        });

        triples.push({
            subject: joinUri,
            predicate: "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>",
            object: "<http://www.w3.org/2002/07/owl#NamedIndividual>",
        });

        var sparqlPrefixes = {
            slsv: Config.linkedData_mappings_graphUri,
        };

        Sparql_generic.insertTriples(self.mappingSourceLabel, triples, { sparqlPrefixes: sparqlPrefixes }, function (err, result) {
            if (err) return callback(err);

            var triples = [
                {
                    subject: "<" + self.currentRelation.bNodeId + ">",
                    predicate: "<" + Config.linkedData_mappings_graphUri + "hasSqlJoin>",
                    object: joinUri,
                },
            ];
            var graphNodeSource = Lineage_sources.activeSource;
            Sparql_generic.insertTriples(graphNodeSource, triples, null, function (err, result) {
                //   return callback(err, { columnUri: result });
                return alert(" join saved");
            });
        });
    };

    self.writeColumnMapping = function (graphNodeData, columnDesc, callback) {
        var columnUri = Config.linkedData_mappings_graphUri + common.getRandomHexaId(10);
        var triples = [];
        triples.push({
            subject: columnUri,
            predicate: "slsv:database",
            object: columnDesc.database,
        });
        triples.push({
            subject: columnUri,
            predicate: "slsv:table",
            object: columnDesc.table,
        });
        triples.push({
            subject: columnUri,
            predicate: "slsv:column",
            object: columnDesc.column,
        });

        triples.push({
            subject: columnUri,
            predicate: "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>",
            object: "slsv:sql-column",
        });

        triples.push({
            subject: columnUri,
            predicate: "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>",
            object: "<http://www.w3.org/2002/07/owl#NamedIndividual>",
        });

        var sparqlPrefixes = {
            slsv: Config.linkedData_mappings_graphUri,
        };

        Sparql_generic.insertTriples(self.mappingSourceLabel, triples, { sparqlPrefixes: sparqlPrefixes }, function (err, result) {
            if (err) return callback(err);

            var triples = [
                {
                    subject: graphNodeData.id,
                    predicate: "<" + Config.linkedData_mappings_graphUri + "hasColumnMapping>",
                    object: columnUri,
                },
            ];
            Sparql_generic.insertTriples(graphNodeData.source, triples, null, function (err, result) {
                return callback(err, { columnUri: columnUri });
            });
        });
    };

    self.queryColumnsMappings = function (source, options, callback) {
        if (!options) options = {};
        var fromStr = Sparql_common.getFromStr(source);
        var query =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>\n" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
            "PREFIX slsv:<http://souslesens.org/resource/linkedData_mappings/>" +
            "\n" +
            "\n" +
            "select distinct *  " +
            fromStr +
            "  FROM  <http://souslesens.org/resource/linkedData_mappings/> where { \n" +
            "  ?subject   <http://souslesens.org/resource/linkedData_mappings/hasColumnMapping> ?column . optional{?subject rdfs:label ?subjectLabel}\n" +
            "  ?column ?prop ?value.";
        if (options.filter) query += " " + options.filter;
        if (options.database) query += "?column slsv:database ?database.filter (?database='" + options.database + "') ";

        query += "  }";

        var url = Config.sources[self.mappingSourceLabel].sparql_server.url + "?format=json&query=";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
            if (err) {
                return callback(err);
            }
            var columns = {};
            result.results.bindings.forEach(function (item) {
                if (!columns[item.column.value])
                    columns[item.column.value] = {
                        subject: item.subject.value,
                        subjectLabel: item.subject ? item.subjectLabel.value : Sparql_common.getLabelFromURI(item.subject.value),
                    };
                if (item.prop.value == "http://souslesens.org/resource/linkedData_mappings/database") columns[item.column.value].database = item.value.value;
                if (item.prop.value == "http://souslesens.org/resource/linkedData_mappings/table") columns[item.column.value].table = item.value.value;
                if (item.prop.value == "http://souslesens.org/resource/linkedData_mappings/column") columns[item.column.value].column = item.value.value;
            });
            return callback(null, columns);
        });
    };

    self.getSourceJoinsMappings = function (source, options, callback) {
        var joinsMap = {};
        var joinsIds = [];
        self.init();
        async.series(
            [
                function (callbackSeries) {
                    var filter = "?node <" + Config.linkedData_mappings_graphUri + "hasSqlJoin> ?join. ";
                    Sparql_OWL.getObjectRestrictions(source, null, { filter: filter }, function (err, result) {
                        result.forEach(function (item) {
                            if (joinsIds.indexOf(item.join.value) < 0) joinsIds.push(item.join.value);
                            joinsMap[item.join.value] = {
                                bNode: item.node.value,
                                from: { classId: item.subject.value, classLabel: item.subjectLabel.value },
                                to: { classId: item.value.value, classLabel: item.valueLabel.value },
                                prop: item.prop.value,
                                propLabel: item.propLabel.value,
                            };
                        });

                        return callbackSeries();
                    });
                },
                function (callbackSeries) {
                    if (Object.keys(joinsIds).length == 0) return callbackSeries();
                    if (options.withoutSqldescription) return callbackSeries();
                    var filterStr = Sparql_common.setFilter("join", joinsIds);
                    var query = "" + "" + "select * FROM  <" + Config.linkedData_mappings_graphUri + "> where {" + "?join ?p ?o. " + filterStr + "} ";

                    var url = Config.sources[self.mappingSourceLabel].sparql_server.url + "?format=json&query=";

                    Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: self.mappingSourceLabel }, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }

                        var joinDatabaseMap = {};
                        result.results.bindings.forEach(function (item) {
                            var joinId = item.join.value;
                            if (item.p.value.indexOf("database") > -1) {
                                joinDatabaseMap[joinId] = item.o.value;
                                joinsMap[joinId].databases = {};
                                joinsMap[joinId].databases[item.o.value] = { from: {}, to: {} };
                            }
                        });

                        result.results.bindings.forEach(function (item) {
                            var joinId = item.join.value;

                            if (item.p.value.indexOf("fromTable") > -1) joinsMap[joinId].databases[joinDatabaseMap[joinId]].from.table = item.o.value;
                            if (item.p.value.indexOf("toTable") > -1) joinsMap[joinId].databases[joinDatabaseMap[joinId]].to.table = item.o.value;
                            if (item.p.value.indexOf("fromColumn") > -1) joinsMap[joinId].databases[joinDatabaseMap[joinId]].from.column = item.o.value;
                            if (item.p.value.indexOf("toColumn") > -1) joinsMap[joinId].databases[joinDatabaseMap[joinId]].to.column = item.o.value;
                            if (item.p.value.indexOf("joinTable") > -1) joinsMap[joinId].databases[joinDatabaseMap[joinId]].joinTable = item.o.value;
                            if (item.p.value.indexOf("joinWhere") > -1) joinsMap[joinId].databases[joinDatabaseMap[joinId]].joinWhere = item.o.value;
                        });

                        return callbackSeries();
                    });
                },
            ],
            function (err) {
                return callback(null, joinsMap);
            },
        );
    };

    self.graphSourceMappings = function () {
        self.queryColumnsMappings(Lineage_sources.activeSource, {}, function (err, columns) {
            self.graphColumns(columns);
            self.graphRelations();
        });
    };
    self.graphRelations = function () {
        self.getSourceJoinsMappings(Lineage_sources.activeSource, { withoutSqlDescription: true }, function (err, joinsMap) {
            var edges = [];
            var existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
            for (var joinId in joinsMap) {
                var join = joinsMap[joinId];
                var edgeId = join.bNode;
                if (!existingNodes[edgeId]) {
                    existingNodes[edgeId] = 1;

                    edges.push({
                        id: edgeId,
                        from: join.from.classId,
                        to: join.to.classId,
                        data: {
                            source: Lineage_sources.activeSource,
                            id: join.prop,
                        },
                        arrows: {
                            to: {
                                enabled: true,
                                type: "solid",
                                scaleFactor: 0.5,
                            },
                        },
                        label: join.propLabel,
                        font: { color: "green", size: 12, background: "#eee" },
                        dashes: true,
                        color: "green",
                        width: 2,
                    });
                }
            }
            Lineage_whiteboard.lineageVisjsGraph.data.edges.add(edges);
        });
    };

    self.graphColumns = function (columns) {
        var existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();

        var visjsData = { nodes: [], edges: [] };

        for (var colId in columns) {
            var columnObj = columns[colId];
            var database = columnObj.database;
            var table = columnObj.table;
            var column = columnObj.column;
            var color = Lineage_whiteboard.getSourceColor(database);

            var columnId = database + "." + table + "." + column;
            var tableId = database + "." + table;

            if (!existingNodes[database]) {
                existingNodes[database] = 1;
                visjsData.nodes.push({
                    id: database,
                    label: database,

                    shadow: Lineage_whiteboard.nodeShadow,
                    shape: Lineage_linkedData_mappings.databaseShape,
                    level: 1,
                    size: Lineage_whiteboard.defaultShapeSize,
                    color: color,
                    data: {
                        context: self.context,
                        database: database,
                        type: "database",
                    },
                });
            }
            if (!existingNodes[tableId]) {
                existingNodes[tableId] = 1;
                visjsData.nodes.push({
                    id: tableId,
                    label: table,

                    shadow: Lineage_whiteboard.nodeShadow,
                    shape: Lineage_linkedData_mappings.tableShape,
                    level: 1,
                    size: Lineage_whiteboard.defaultShapeSize,
                    color: color,
                    data: {
                        context: self.context,
                        database: database,
                        table: tableId,
                        type: "table",
                    },
                });
                var edgeId = tableId + "_" + database;
                if (!existingNodes[edgeId]) {
                    existingNodes[edgeId] = 1;

                    visjsData.edges.push({
                        id: edgeId,
                        from: tableId,
                        to: database,
                        data: {
                            context: self.context,
                            database: database,
                            table: table,
                            type: "relation",
                        },

                        arrows: {
                            to: {
                                enabled: true,
                                type: "bar",
                                scaleFactor: 0.5,
                            },
                        },
                        //  dashes: true,
                        color: color,
                    });
                }
            }

            if (!existingNodes[columnId]) {
                existingNodes[columnId] = 1;
                visjsData.nodes.push({
                    id: columnId,
                    label: column,

                    shadow: Lineage_whiteboard.nodeShadow,
                    shape: Lineage_linkedData_mappings.columnShape,
                    level: 1,
                    size: Lineage_whiteboard.defaultShapeSize,
                    color: color,
                    data: {
                        context: self.context,
                        database: database,
                        table: database + "." + table,
                        type: "column",
                        column: column,
                    },
                });
            }

            var edgeId = columnId + "_" + tableId;
            if (!existingNodes[edgeId]) {
                existingNodes[edgeId] = 1;

                visjsData.edges.push({
                    id: edgeId,
                    from: columnId,
                    to: tableId,
                    data: {
                        context: self.context,
                        database: database,
                        table: table,
                        column: column,
                        type: "relation",
                    },

                    //  dashes: true,
                    color: color,
                });
            }

            if (!existingNodes[columnObj.subject]) {
                existingNodes[columnObj.subject] = 1;
                visjsData.nodes.push({
                    id: columnObj.subject,
                    label: columnObj.subjectLabel,

                    shadow: Lineage_whiteboard.nodeShadow,
                    shape: Lineage_whiteboard.defaultShape,
                    level: 1,
                    size: Lineage_whiteboard.defaultShapeSize,
                    color: Lineage_whiteboard.getSourceColor(Lineage_sources.currentSource),
                    data: {
                        source: Lineage_sources.activeSource,
                        id: columnObj.subject,
                        label: columnObj.subjectLabel,
                    },
                });
            }

            var edgeId = columnId + "_" + columnObj.subject;
            if (!existingNodes[edgeId]) {
                existingNodes[edgeId] = 1;

                visjsData.edges.push({
                    id: edgeId,
                    from: columnId,
                    to: columnObj.subject,
                    data: {
                        type: "relation",
                    },

                    dashes: true,
                    color: "blue",
                });
            }
        }

        if (Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
            Lineage_whiteboard.lineageVisjsGraph.data.nodes.add(visjsData.nodes);
            Lineage_whiteboard.lineageVisjsGraph.data.edges.add(visjsData.edges);
        } else {
            Lineage_whiteboard.drawNewGraph(visjsData);
        }
    };

    self.clearSourceMappings = function (source, mappingIds) {
        if (!source) source = Lineage_sources.activeSource;
        if (!confirm(" delete mappings in  source" + source)) return;
        var url = Config.sources[source].sparql_server.url + "?format=json&query=";

        async.series(
            [
                //get joins Uris in source
                function (callbackSeries) {
                    if (mappingIds) {
                        return callbackSeries();
                    }
                    mappingIds = [];
                    var filterStr = "";
                    if (mappingId)
                        var query =
                            "select * " + "where {?s ?p ?o filter( ?p in (<" + Config.linkedData_mappings_graphUri + "hasColumnMapping>,<" + Config.linkedData_mappings_graphUri + "hasSqlJoin>))}";
                    Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        result.results.bindings.forEach(function (item) {
                            mappingIds.push(item.o.value);
                        });
                        return callbackSeries();
                    });
                },
                //delete mappings in mappings graph for this source
                function (callbackSeries) {
                    var filterStr = Sparql_common.setFilter("s", mappingIds);
                    var query = "with <" + Config.linkedData_mappings_graphUri + ">\n" + "delete {?s ?p ?o}\n" + "where {?s ?p ?o " + filterStr + "}";
                    var urlM = Config.sources[self.mappingSourceLabel].sparql_server.url + "?format=json&query=";
                    Sparql_proxy.querySPARQL_GET_proxy(urlM, query, "", { source: self.mappingSourceLabel }, function (err, result) {
                        return callbackSeries(err);
                    });
                },
                //delete joins predicates in source
                function (callbackSeries) {
                    var graphUri = Config.sources[source].graphUri;
                    var filterStr = Sparql_common.setFilter("o", mappingIds);
                    var query =
                        "with <" +
                        graphUri +
                        ">\n" +
                        "delete {?s ?p ?o}\n" +
                        "where {?s ?p ?o filter( ?p in (<" +
                        Config.linkedData_mappings_graphUri +
                        "hasColumnMapping>,<" +
                        Config.linkedData_mappings_graphUri +
                        "hasSqlJoin>))" +
                        filterStr +
                        "}";

                    Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
                        return callbackSeries(err);
                    });
                },
            ],
            function (err) {
                if (err) return alert(err.responseText);

                if (mappingIds.length == 0) $("#Lineage_mappingsTreeDiv").jstree().delete_node(mappingIds[0]);
                return alert("mappings deleted");
            },
        );
    };

    self.initSourceMappingsTree = function () {
        var columns;
        var joinsMap;
        self.queryColumnsMappings(Lineage_sources.activeSource, {}, function (err, _columns) {
            columns = _columns;
            self.getSourceJoinsMappings(Lineage_sources.activeSource, { withoutSqlDescription: true }, function (err, _joinsMap) {
                joinsMap = _joinsMap;

                var jstreeData = [];

                var existingNodes = {};
                for (var resourceId in columns) {
                    var item = columns[resourceId];
                    if (!existingNodes[item.database]) {
                        existingNodes[item.database] = 1;

                        jstreeData.push({
                            id: item.database,
                            text: item.database,
                            parent: "#",
                        });
                        jstreeData.push({
                            id: item.database + "column_mappings",
                            text: "Column mappings",
                            parent: item.database,
                        });
                        jstreeData.push({
                            id: item.database + "join_mappings",
                            text: "Join mappings",
                            parent: item.database,
                        });

                        jstreeData.push({
                            id: item.database + "individual_mappings",
                            text: "Individual mappings",
                            parent: item.database,
                        });
                    }
                    if (!existingNodes[resourceId]) {
                        existingNodes[resourceId] = 1;

                        jstreeData.push({
                            id: resourceId,
                            text: item.subjectLabel + "->" + item.table + "." + item.column,
                            parent: item.database + "column_mappings",
                        });
                    }
                }

                for (var joinId in joinsMap) {
                    var relation = joinsMap[joinId];
                    for (var database in relation.databases) {
                        //   var item = relation.databases[database]

                        if (!existingNodes[joinId]) {
                            existingNodes[joinId] = 1;

                            jstreeData.push({
                                id: joinId,
                                text: relation.from.classLabel + "-" + relation.propLabel + "->" + relation.to.classLabel,
                                parent: database + "join_mappings",
                            });
                        }
                    }
                }

                var options = {
                    openAll: true,
                    contextMenu: Lineage_linkedData_mappings.getmappingsTreeContextMenu(),
                    selectTreeNodeFn: function (event, obj) {
                        self.currentMappingNode = obj.node;
                    },
                };
                JstreeWidget.loadJsTree("Lineage_mappingsTreeDiv", jstreeData, options);
            });
        });
    };

    self.getmappingsTreeContextMenu = function () {
        var items = {};
        items.nodeInfos = {
            label: "Node infos",
            action: function (_e) {
                NodeInfosWidget.showNodeInfos(self.mappingSourceLabel, self.currentMappingNode.id, "mainDialogDiv");
            },
        };
        items.deleteNode = {
            label: "Delete",
            action: function (_e) {
                Lineage_linkedData_mappings.clearSourceMappings(Lineage_sources.activeSource, [self.currentMappingNode.id]);
            },
        };
        return items;
    };

    return self;
})();

export default Lineage_linkedData_mappings;

window.Lineage_linkedData_mappings = Lineage_linkedData_mappings;
