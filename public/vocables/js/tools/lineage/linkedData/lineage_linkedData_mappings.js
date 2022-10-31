var Lineage_linkedData_mappings = (function() {
  var self = {};


  self.context = "linkeData_mappings";
  self.tableShape = "square";
  self.columnShape = "diamond";
  self.databaseShape = "database";

  self.mappingSourceLabel = "linkedData_mappings_graph";

  self.init = function() {
    Config.sources[self.mappingSourceLabel] = {
      graphUri: Config.linkedData_mappings_graph,
      sparql_server: { url: Config.default_sparql_url }
    };
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
    return items;

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
    if (jstreeNode.parents.length != 2)
      return (alert("select a column"));
    var graphNode = Lineage_classes.currentGraphNode;
    if (!graphNode || graphNode.from || !graphNode.data.source)
      return (alert(" select a class or an individual node"));


    columnObj = {
      column: jstreeNode.data.id,
      table: jstreeNode.parent,
      database: KGcreator.currentCsvDir || KGcreator.currentDbName,
      contex: self.context,
      type: "column"
    };

    if (confirm("link " + columnObj.table + "." + columnObj.column + " to node" + graphNode.data.label))

      self.writeColumnMapping(graphNode.data.source, graphNode.data.id, columnObj, function(err, result) {
        if (err)
          return alert(err.responseText);
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
    if (!edge)
      return alert("select relation");

    var relation = edge.data;
    relation.from = edge.from;
    relation.to = edge.to;
    var filter = Sparql_common.setFilter("concept", [relation.from, relation.to]);
    self.queryMappings(Lineage_sources.activeSource, { filter: filter }, function(err, columns) {
      if (err)
        return alert(err.responseText);
     for(var  col in columns){
       if(columns[col].concept==relation.from)
         relation.fromColumn=columns[col]
       if(columns[col].concept==relation.to)
         relation.toColumn=columns[col]
     }
     if(!relation.fromColumn)
       return alert("no column mapping for node "+edge.fromNode.label)
      if(!relation.toColumn)
        return alert("no column mapping for node "+edge.toNode.label)


      if(relation.fromColumn.database!=relation.toColumn.database)
        return alert("linked column are not in the same database")
      var str="where "+relation.fromColumn.table+".XXX="+relation.toColumn.table+".YYY"
      var joinClause=prompt("enter join clause", str)
      if(!joinClause)
        return ;
      var triples=[];
      var joinUri = Config.linkedData_mappings_graph + common.getRandomHexaId(10);

      var sql="select * from "+relation.fromColumn.table+","+relation.toColumn.table+" "+joinClause
      triples.push({
        subject: joinUri,
        predicate: "slsv:sql",
        object: sql
      });


      triples.push({
        subject: joinUri,
        predicate: "slsv:database",
        object: relation.fromColumn.database
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
        "slsv": Config.linkedData_mappings_graph
      };


      Sparql_generic.insertTriples(self.mappingSourceLabel, triples, { sparqlPrefixes: sparqlPrefixes }, function(err, result) {

        if (err)
          return callback(err);

        var triples = [{
          subject: relation.bNodeId,
          predicate: "<" + Config.linkedData_mappings_graph + "hasSqlJoin>",
          object: joinUri
        }];
        var graphNodeSource=Lineage_sources.activeSource
        Sparql_generic.insertTriples(graphNodeSource, triples, null, function(err, result) {
          return callback(err, { columnUri: columnUri });
        });
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
      "slsv": Config.linkedData_mappings_graph
    };


    Sparql_generic.insertTriples(self.mappingSourceLabel, triples, { sparqlPrefixes: sparqlPrefixes }, function(err, result) {

      if (err)
        return callback(err);

      var triples = [{
        subject: entityUri,
        predicate: "<" + Config.linkedData_mappings_graph + "hasColumnMapping>",
        object: columnUri
      }];
      Sparql_generic.insertTriples(graphNodeSource, triples, null, function(err, result) {
        return callback(err, { columnUri: columnUri });
      });
    });
  };


  self.queryMappings = function(source, options, callback) {
    if (!options)
      options = {};
    var fromStr = Sparql_common.getFromStr(source);
    var query = "PREFIX owl: <http://www.w3.org/2002/07/owl#>\n" +
      "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
      "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
      "\n" +
      "\n" +
      "select distinct *  " + fromStr + "  FROM  <http://souslesens.org/resource/linkedData_mappings/> where { \n" +
      "  ?concept   <http://souslesens.org/resource/linkedData_mappings/hasColumnMapping> ?column . optional{?concept rdfs:label ?conceptLabel}\n" +
      "  ?column ?prop ?value.";
    if (options.filter)
      query += " " + options.filter;
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
        if (item.prop.value == "http://souslesens.org/resource/linkedData_mappings/database")
          columns[item.column.value].database = item.value.value;
        if (item.prop.value == "http://souslesens.org/resource/linkedData_mappings/table")
          columns[item.column.value].table = item.value.value;
        if (item.prop.value == "http://souslesens.org/resource/linkedData_mappings/column")
          columns[item.column.value].column = item.value.value;

      });
      return callback(null, columns);
    });
  };


  self.graphSourceMappings = function() {
    self.queryMappings(Lineage_sources.activeSource, {}, function(err, columns) {


      self.graphColumns(columns);


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
          shape: Lineage_linkedData_mappings.tableShape,
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
            source: Lineage_sources.currentSource,
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

  return self;

})
();