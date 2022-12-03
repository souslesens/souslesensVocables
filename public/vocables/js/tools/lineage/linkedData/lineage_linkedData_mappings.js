//www.nstauthority.co.uk/data-centre/data-downloads-and-publications/well-data/

https: var Lineage_linkedData_mappings = (function() {
  var self = {};

  self.context = "linkedData_mappings";
  self.tableShape = "square";
  self.columnShape = "diamond";
  self.databaseShape = " database";


  self.mappingSourceLabel = "linkedData_mappings_graph";

  self.init = function() {
    Config.sources[self.mappingSourceLabel] = {
      graphUri: Config.linkedData_mappings_graph,
      sparql_server: { url: Config.default_sparql_url },
       controller:Sparql_OWL,
    };
    self.initSourceMappingsTree();
  };

  self.initKGcreatorDialogWithDatabase = function(database) {
    KGcreator.onChangeSourceTypeSelect("DATABASE", function(err, result) {
      $("#KGcreator_csvDirsSelect").val(database);

      KGcreator.listTables();
    });
  };

  self.onSelectRelation = function(relationId) {
    self.relationObj = self.joinsMap[relationId];
    self.databasesMap = self.joinsMap[relationId].databases;
  };


  self.getTablesTreeContextMenu = function() {
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
      action: function(_e) {
        self.linkColumnToGraphNode(KGcreator.currentTreeNode);
      }
    };

    items.showSampledata = {
      label: "Show sample data",
      action: function(_e) {
        self.showSampledata(KGcreator.currentTreeNode);
      }
    };

    return items;
  };

  self.showSampledata = function(node) {
    KGcreator.showSampleData(node, true, 100, function(err, result) {
      $("#mainDialogDiv").dialog("open");

      result = result.replace(/\n/g, "</td><tr><td>");
      result = result.replace(/\t/g, "</td><td>");
      var html = "<table><tr><td>" + result + "</tr></table>";

      $("#mainDialogDiv").html(html);
    });
  };

  self.onCsvtreeNodeClicked = function() {
    return;
  };

  self.onAddEdgeDropped = function(edgeData) {
    var sourceNode = visjsGraph.data.nodes.get(edgeData.from).data;
    var targetNode = visjsGraph.data.nodes.get(edgeData.to).data;

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

  self.linkColumnToGraphNode = function(jstreeNode) {
    if (jstreeNode.parents.length != 2) return alert("select a column");
    var graphNode = Lineage_classes.currentGraphNode;
    if (!graphNode || graphNode.from || !graphNode.data.source) return alert(" select a class or an individual node");

    columnObj = {
      column: jstreeNode.data.id,
      table: jstreeNode.parent,
      database: KGcreator.currentCsvDir || KGcreator.currentDbName,
      contex: self.context,
      type: "column"
    };

    if (confirm("link " + columnObj.table + "." + columnObj.column + " to node" + graphNode.data.label))
      self.writeColumnMapping(graphNode.data.source, graphNode.data.id, columnObj, function(err, result) {
        if (err) return alert(err.responseText);
        var columnUri = result.columnUri;
        var visjsData = { nodes: [], edges: [] };
        var existingNodes = visjsGraph.getExistingIdsMap();
        if (!existingNodes[columnUri]) {
          var color = Lineage_classes.getSourceColor(columnObj.database);
          existingNodes[columnUri] = 1;
          visjsData.nodes.push({
            id: columnUri,
            label: columnObj.table + "." + columnObj.column,

            shadow: Lineage_classes.nodeShadow,
            shape: Lineage_linkedData_mappings.columnShape,
            level: 1,
            size: Lineage_classes.defaultShapeSize,
            color: color,
            data: columnObj
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
              type: "relation"
            },
            color: color
          });
        }
        if (visjsGraph.isGraphNotEmpty()) {
          visjsGraph.data.nodes.add(visjsData.nodes);
          visjsGraph.data.edges.add(visjsData.edges);
        } else {
          Lineage_classes.drawNewGraph(visjsData);
        }
      });
  };

  self.createGraphRelationJoin = function() {
    var edge = Lineage_classes.currentGraphEdge;
    if (!edge) return alert("select relation");

    self.currentDatabase = KGcreator.currentCsvDir || KGcreator.currentDbName;
    if (!self.currentDatabase) return alert("select a database");

    var relation = edge.data;
    relation.from = edge.from;
    relation.to = edge.to;
    self.currentRelation = relation;
    var filterStr = Sparql_common.setFilter("concept", [relation.from, relation.to]);

    self.queryColumnsMappings(
      Lineage_sources.activeSource,
      {
        filter: filterStr,
        database: self.currentDatabase
      },
      function(err, columns) {
        if (err) return alert(err.responseText);
        for (var col in columns) {
          if (columns[col].concept == relation.from) {
            relation.fromColumn = columns[col];
          }
          if (columns[col].concept == relation.to) {
            relation.toColumn = columns[col];
          }
        }
        if (!relation.fromColumn) return alert("no column mapping for node " + edge.fromNode.label);
        if (!relation.toColumn) return alert("no column mapping for node " + edge.toNode.label);

        if (relation.fromColumn.database != relation.toColumn.database) return alert("linked column are not in the same database");
        var str = "where " + relation.fromColumn.table + ".XXX=" + relation.toColumn.table + ".YYY";
        $("#mainDialogDiv").dialog("open");
        $("#mainDialogDiv").load("snippets/lineage/linkedData/lineage_linkedData_joinTablesDialog.html", function() {
          $("#lineage_linkedData_join_databaseId").html(relation.fromColumn.database);
          $("#lineage_linkedData_join_fromClassId").html(relation.fromColumn.conceptLabel);
          $("#lineage_linkedData_join_toClassId").html(relation.toColumn.conceptLabel);

          $("#lineage_linkedData_join_fromTableId").html(relation.fromColumn.table);
          $("#lineage_linkedData_join_toTableId").html(relation.toColumn.table);

          var fromColumns = $("#KGcreator_csvTreeDiv").jstree().get_node(relation.fromColumn.table).children;

          fromColumns.forEach(function(item, index) {
            fromColumns[index] = relation.fromColumn.table + "." + item.substring(relation.fromColumn.table.length + 1);
          });
          var toColumns = $("#KGcreator_csvTreeDiv").jstree().get_node(relation.toColumn.table).children;

          toColumns.forEach(function(item, index) {
            toColumns[index] = relation.toColumn.table + "." + item.substring(relation.toColumn.table.length + 1);
          });

          common.fillSelectOptions("lineage_linkedData_join_fromColumnSelect", fromColumns);
          common.fillSelectOptions("lineage_linkedData_join_toColumnSelect", toColumns);

          var joinTables= $("#KGcreator_csvTreeDiv").jstree().get_node("#").children;
          common.fillSelectOptions("lineage_linkedData_join_joinTableSelect", joinTables,true);


          KGcreator.showSampleData({ data: {}, parent: relation.fromColumn.table }, true, 20, function(err, result) {
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
          });
        });
      }
    );
  };


  self.showJoinTableColumns=function(joinTable){
    var joinTableColumns = $("#KGcreator_csvTreeDiv").jstree().get_node(joinTable).children;

    common.fillSelectOptions("lineage_linkedData_join_joinColumnSelect", joinTableColumns);

  }
  self.joinTable=function(direction){

  }


  self.writeJoinMapping = function() {
    var fromColumn = $("#lineage_linkedData_join_fromColumnSelect").val();
    var toColumn = $("#lineage_linkedData_join_toColumnSelect").val();
    if (!fromColumn || !toColumn) return alert("enter fromColumn and toColumn ");

    var join = {
      database: self.currentDatabase,
      fromTable: self.currentRelation.fromColumn.table,
      toTable: self.currentRelation.toColumn.table,
      fromColumn: fromColumn,
      toColumn: toColumn
    };

    var triples = [];
    var joinUri = Config.linkedData_mappings_graph + common.getRandomHexaId(10);

    //   var sql = "select * from " + relation.fromColumn.table + "," + relation.toColumn.table + " " + joinClause;

    triples.push({
      subject: joinUri,
      predicate: "slsv:database",
      object: join.database
    });
    triples.push({
      subject: joinUri,
      predicate: "slsv:fromTable",
      object: join.fromTable
    });
    triples.push({
      subject: joinUri,
      predicate: "slsv:toTable",
      object: join.toTable
    });
    triples.push({
      subject: joinUri,
      predicate: "slsv:fromColumn",
      object: join.fromColumn
    });
    triples.push({
      subject: joinUri,
      predicate: "slsv:toColumn",
      object: join.toColumn
    });

    triples.push({
      subject: joinUri,
      predicate: "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>",
      object: "slsv:sql-join"
    });

    triples.push({
      subject: joinUri,
      predicate: "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>",
      object: "<http://www.w3.org/2002/07/owl#NamedIndividual>"
    });
    var sparqlPrefixes = {
      slsv: Config.linkedData_mappings_graph
    };

    Sparql_generic.insertTriples(self.mappingSourceLabel, triples, { sparqlPrefixes: sparqlPrefixes }, function(err, result) {
      if (err) return callback(err);

      var triples = [
        {
          subject: self.currentRelation.bNodeId,
          predicate: "<" + Config.linkedData_mappings_graph + "hasSqlJoin>",
          object: joinUri
        }
      ];
      var graphNodeSource = Lineage_sources.activeSource;
      Sparql_generic.insertTriples(graphNodeSource, triples, null, function(err, result) {
        //   return callback(err, { columnUri: result });
        return alert(" join saved");
      });
    });
  };

  self.writeColumnMapping = function(graphNodeSource, entityUri, columnDesc, callback) {
    var columnUri = Config.linkedData_mappings_graph + common.getRandomHexaId(10);
    var triples = [];
    triples.push({
      subject: columnUri,
      predicate: "slsv:database",
      object: columnDesc.database
    });
    triples.push({
      subject: columnUri,
      predicate: "slsv:table",
      object: columnDesc.table
    });
    triples.push({
      subject: columnUri,
      predicate: "slsv:column",
      object: columnDesc.column
    });

    triples.push({
      subject: columnUri,
      predicate: "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>",
      object: "slsv:sql-column"
    });

    triples.push({
      subject: columnUri,
      predicate: "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>",
      object: "<http://www.w3.org/2002/07/owl#NamedIndividual>"
    });

    var sparqlPrefixes = {
      slsv: Config.linkedData_mappings_graph
    };

    Sparql_generic.insertTriples(self.mappingSourceLabel, triples, { sparqlPrefixes: sparqlPrefixes }, function(err, result) {
      if (err) return callback(err);

      var triples = [
        {
          subject: entityUri,
          predicate: "<" + Config.linkedData_mappings_graph + "hasColumnMapping>",
          object: columnUri
        }
      ];
      Sparql_generic.insertTriples(graphNodeSource, triples, null, function(err, result) {
        return callback(err, { columnUri: columnUri });
      });
    });
  };

  self.queryColumnsMappings = function(source, options, callback) {
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
      "  ?concept   <http://souslesens.org/resource/linkedData_mappings/hasColumnMapping> ?column . optional{?concept rdfs:label ?conceptLabel}\n" +
      "  ?column ?prop ?value.";
    if (options.filter) query += " " + options.filter;
    if (options.database) query += "?column slsv:database ?database.filter (?database='" + options.database + "') ";

    query += "  }";

    var url = Config.sources[self.mappingSourceLabel].sparql_server.url + "?format=json&query=";

    Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function(err, result) {
      if (err) {
        return callback(err);
      }
      var columns = {};
      result.results.bindings.forEach(function(item) {
        if (!columns[item.column.value])
          columns[item.column.value] = {
            concept: item.concept.value,
            conceptLabel: item.concept ? item.conceptLabel.value : Sparql_common.getLabelFromURI(item.concept.value)
          };
        if (item.prop.value == "http://souslesens.org/resource/linkedData_mappings/database") columns[item.column.value].database = item.value.value;
        if (item.prop.value == "http://souslesens.org/resource/linkedData_mappings/table") columns[item.column.value].table = item.value.value;
        if (item.prop.value == "http://souslesens.org/resource/linkedData_mappings/column") columns[item.column.value].column = item.value.value;
      });
      return callback(null, columns);
    });
  };

  self.getSourceJoinsMappings = function(source, options, callback) {
    var joinsMap = {};
    var joinsIds = [];
    async.series(
      [
        function(callbackSeries) {
          var filter = "?node <" + Config.linkedData_mappings_graph + "hasSqlJoin> ?join. ";
          Sparql_OWL.getObjectRestrictions(source, null, { filter: filter }, function(err, result) {
            result.forEach(function(item) {
              if (joinsIds.indexOf(item.join.value) < 0) joinsIds.push(item.join.value);
              joinsMap[item.join.value] = {
                bNode: item.node.value,
                from: { classId: item.concept.value, classLabel: item.conceptLabel.value },
                to: { classId: item.value.value, classLabel: item.valueLabel.value },
                prop: item.prop.value,
                propLabel: item.propLabel.value
              };
            });

            return callbackSeries();
          });
        },
        function(callbackSeries) {
          if (Object.keys(joinsIds).length == 0) return callbackSeries();
          if (options.withoutSqldescription) return callbackSeries();
          var filterStr = Sparql_common.setFilter("join", joinsIds);
          var query = "" + "" + "select * FROM  <" + Config.linkedData_mappings_graph + "> where {" + "?join ?p ?o. " + filterStr + "} ";

          var url = Config.sources[self.mappingSourceLabel].sparql_server.url + "?format=json&query=";

          Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: self.mappingSourceLabel }, function(err, result) {
            if (err) {
              return callbackSeries(err);
            }

            var joinDatabaseMap = {};
            result.results.bindings.forEach(function(item) {
              var joinId = item.join.value;
              if (item.p.value.indexOf("database") > -1) {
                joinDatabaseMap[joinId] = item.o.value;
                joinsMap[joinId].databases = {};
                joinsMap[joinId].databases[item.o.value] = { from: {}, to: {} };
              }
            });

            result.results.bindings.forEach(function(item) {
              var joinId = item.join.value;

              if (item.p.value.indexOf("fromTable") > -1) joinsMap[joinId].databases[joinDatabaseMap[joinId]].from.table = item.o.value;
              if (item.p.value.indexOf("toTable") > -1) joinsMap[joinId].databases[joinDatabaseMap[joinId]].to.table = item.o.value;
              if (item.p.value.indexOf("fromColumn") > -1) joinsMap[joinId].databases[joinDatabaseMap[joinId]].from.column = item.o.value;
              if (item.p.value.indexOf("toColumn") > -1) joinsMap[joinId].databases[joinDatabaseMap[joinId]].to.column = item.o.value;
            });

            return callbackSeries();
          });
        }
      ],
      function(err) {
        return callback(null, joinsMap);
      }
    );
  };

  self.graphSourceMappings = function() {
    self.queryColumnsMappings(Lineage_sources.activeSource, {}, function(err, columns) {
      self.graphColumns(columns);
      self.graphRelations();
    });
  };
  self.graphRelations = function() {
    self.getSourceJoinsMappings(Lineage_sources.activeSource, { withoutSqlDescription: true }, function(err, joinsMap) {
      var edges = [];
      var existingNodes = visjsGraph.getExistingIdsMap();
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
              id: join.prop
            },
            arrows: {
              to: {
                enabled: true,
                type: "solid",
                scaleFactor: 0.5
              }
            },
            label: join.propLabel,
            font: { color: "green", size: 12, background: "#eee" },
            dashes: true,
            color: "green",
            width: 2
          });
        }
      }
      visjsGraph.data.edges.add(edges);
    });
  };

  self.graphColumns = function(columns) {
    var existingNodes = visjsGraph.getExistingIdsMap();

    var visjsData = { nodes: [], edges: [] };

    for (var colId in columns) {
      var columnObj = columns[colId];
      var database = columnObj.database;
      var table = columnObj.table;
      var column = columnObj.column;
      var color = Lineage_classes.getSourceColor(database);

      var columnId = database + "." + table + "." + column;
      var tableId = database + "." + table;

      if (!existingNodes[database]) {
        existingNodes[database] = 1;
        visjsData.nodes.push({
          id: database,
          label: database,

          shadow: Lineage_classes.nodeShadow,
          shape: Lineage_linkedData_mappings.databaseShape,
          level: 1,
          size: Lineage_classes.defaultShapeSize,
          color: color,
          data: {
            context: self.context,
            database: database,
            type: "database"
          }
        });
      }
      if (!existingNodes[tableId]) {
        existingNodes[tableId] = 1;
        visjsData.nodes.push({
          id: tableId,
          label: table,

          shadow: Lineage_classes.nodeShadow,
          shape: Lineage_linkedData_mappings.tableShape,
          level: 1,
          size: Lineage_classes.defaultShapeSize,
          color: color,
          data: {
            context: self.context,
            database: database,
            table: tableId,
            type: "table"
          }
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
              type: "relation"
            },

            arrows: {
              to: {
                enabled: true,
                type: "bar",
                scaleFactor: 0.5
              }
            },
            //  dashes: true,
            color: color
          });
        }
      }

      if (!existingNodes[columnId]) {
        existingNodes[columnId] = 1;
        visjsData.nodes.push({
          id: columnId,
          label: column,

          shadow: Lineage_classes.nodeShadow,
          shape: Lineage_linkedData_mappings.columnShape,
          level: 1,
          size: Lineage_classes.defaultShapeSize,
          color: color,
          data: {
            context: self.context,
            database: database,
            table: database + "." + table,
            type: "column",
            column: column
          }
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
            type: "relation"
          },

          //  dashes: true,
          color: color
        });
      }

      if (!existingNodes[columnObj.concept]) {
        existingNodes[columnObj.concept] = 1;
        visjsData.nodes.push({
          id: columnObj.concept,
          label: columnObj.conceptLabel,

          shadow: Lineage_classes.nodeShadow,
          shape: Lineage_classes.defaultShape,
          level: 1,
          size: Lineage_classes.defaultShapeSize,
          color: Lineage_classes.getSourceColor(Lineage_sources.currentSource),
          data: {
            source: Lineage_sources.activeSource,
            id: columnObj.concept,
            label: columnObj.conceptLabel
          }
        });
      }

      var edgeId = columnId + "_" + columnObj.concept;
      if (!existingNodes[edgeId]) {
        existingNodes[edgeId] = 1;

        visjsData.edges.push({
          id: edgeId,
          from: columnId,
          to: columnObj.concept,
          data: {
            type: "relation"
          },

          dashes: true,
          color: "blue"
        });
      }
    }

    if (visjsGraph.isGraphNotEmpty()) {
      visjsGraph.data.nodes.add(visjsData.nodes);
      visjsGraph.data.edges.add(visjsData.edges);
    } else {
      Lineage_classes.drawNewGraph(visjsData);
    }
  };


  self.clearSourceMappings = function(source, mappingIds) {
    if (!source) source = Lineage_sources.activeSource;
    if (!confirm(" delete mappings in  source" + source)) return;
    var url = Config.sources[source].sparql_server.url + "?format=json&query=";

    async.series(
      [
        //get joins Uris in source
        function(callbackSeries) {
        if(mappingIds){
        return callbackSeries()
        }
          mappingIds = [];
        var filterStr=""
          if(mappingId)

          var query = "select * " + "where {?s ?p ?o filter( ?p in (<" + Config.linkedData_mappings_graph + "hasColumnMapping>,<" + Config.linkedData_mappings_graph + "hasSqlJoin>))}";
          Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function(err, result) {
            if (err) {
              return callbackSeries(err);
            }
            result.results.bindings.forEach(function(item) {
              mappingIds.push(item.o.value);
            });
            return callbackSeries();
          });
        },
        //delete mappings in mappings graph for this source
        function(callbackSeries) {
          var filterStr = Sparql_common.setFilter("s", mappingIds);
          var query = "with <" + Config.linkedData_mappings_graph + ">\n" + "delete {?s ?p ?o}\n" + "where {?s ?p ?o " + filterStr + "}";
          var urlM = Config.sources[self.mappingSourceLabel].sparql_server.url + "?format=json&query=";
          Sparql_proxy.querySPARQL_GET_proxy(urlM, query, "", { source: self.mappingSourceLabel }, function(err, result) {
            return callbackSeries(err);
          });
        },
        //delete joins predicates in source
        function(callbackSeries) {
          var graphUri = Config.sources[source].graphUri;
          var filterStr = Sparql_common.setFilter("o", mappingIds);
          var query =
            "with <" +
            graphUri +
            ">\n" +
            "delete {?s ?p ?o}\n" +
            "where {?s ?p ?o filter( ?p in (<" +
            Config.linkedData_mappings_graph +
            "hasColumnMapping>,<" +
            Config.linkedData_mappings_graph +
            "hasSqlJoin>))"+filterStr+"}";

          Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function(err, result) {
            return callbackSeries(err);
          });
        }
      ],
      function(err) {
        if (err) return alert(err.responseText);

        if(mappingIds.length==0)
        $("#Lineage_mappingsTreeDiv").jstree().delete_node(mappingIds[0])
        return alert("mappings deleted");
      }
    );
  };

  self.initSourceMappingsTree = function() {
    var columns;
    var joinsMap;
    self.queryColumnsMappings(Lineage_sources.activeSource, {}, function(err, _columns) {
      columns = _columns;
      self.getSourceJoinsMappings(Lineage_sources.activeSource, { withoutSqlDescription: true }, function(err, _joinsMap) {
        joinsMap = _joinsMap;



        var jstreeData=[];
        var existingNodes={}
      for(var resourceId in columns){
        var item= columns[resourceId]
          if(!existingNodes[item.database]){
            existingNodes[item.database]=1

            jstreeData.push({
              id:item.database,
              text:item.database,
              parent:"#"
            })
          }
          if(!existingNodes[resourceId]){
            existingNodes[resourceId]=1

            jstreeData.push({
              id:resourceId,
              text:item.conceptLabel+"->"+item.table+"."+item.column,
              parent:item.database
            })
          }


        }

        for(var joinId in joinsMap) {
          var relation = joinsMap[joinId]
          for (var database in relation.databases) {

            if (!existingNodes[database]) {
              existingNodes[database] = 1
              jstreeData.push({
                id:database,
                text:database,
                parent:"#"
              })

            }

         //   var item = relation.databases[database]

            if(!existingNodes[joinId]){
              existingNodes[joinId]=1

              jstreeData.push({
                id:joinId,
                text:relation.from.classLabel+"-"+relation.propLabel+"->"+relation.from.classLabel,
                parent:database
              })
            }


          }

        }

        var options={
          openAll:true,
          contextMenu: Lineage_linkedData_mappings.getmappingsTreeContextMenu(),
          selectTreeNodeFn: function(event,obj){
            self.currentMappingNode=obj.node
          }

        }
        common.jstree.loadJsTree("Lineage_mappingsTreeDiv",jstreeData,options)



      });

    });


  };

  self.getmappingsTreeContextMenu=function(){
    var items = {};
    items.nodeInfos = {
      label: "Node infos",
      action: function (_e) {

       SourceBrowser.showNodeInfos(self.mappingSourceLabel,self.currentMappingNode.id, "mainDialogDiv");
      },
    };
    items.deleteNode = {
      label: "Delete",
      action: function (_e) {

        Lineage_linkedData_mappings.clearSourceMappings(Lineage_sources.activeSource,[self.currentMappingNode.id])
      },
    };
    return items;
  }

  return self;
})();
