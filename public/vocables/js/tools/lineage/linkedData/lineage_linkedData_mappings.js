var Lineage_linkedData_mappings = (function() {
  var self = {};


  self.context = "linkeData_mappings";
  self.tableShape = "square";
  self.columnShape = "diamond";
  self.databaseShape = "database";

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
      contex:self.context,
      type:"column"
    }



      self.writeColumnMapping(graphNode.data.source, graphNode.data.id, columnObj, function(err, result) {
        if (err)
          return alert(err.responseText);
        var columnUri = result.columnUri;
        var visjsData = { nodes: [], edges: [] };
        var existingNodes = visjsGraph.getExistingIdsMap();
        if (!existingNodes[columnUri]) {

          var color=Lineage_classes.getSourceColor(columnObj.database)
          existingNodes[columnUri] = 1;
          visjsData.nodes.push({
            id: columnUri,
            label: columnObj.table+"."+columnObj.column,

            shadow: Lineage_classes.nodeShadow,
            shape: Lineage_linkedData_mappings.columnShape,
            level: 1,
            size: Lineage_classes.defaultShapeSize,
            color: color,
            data: columnObj
          });
        }
        var edgeId = columnUri + "_" +graphNode.id;
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

      })
    };


    self.writeColumnMapping = function(graphNodeSource, entityUri, columnDesc, callback) {
      var columnUri = Config.linkedData_mappings_graph + common.getRandomHexaId(10);
      var triples = [];
      triples.push({
        subject: columnUri,
        predicate: " slsv:database",
        object: columnDesc.database
      });
      triples.push({
        subject: columnUri,
        predicate: " slsv:table",
        object: columnDesc.table
      });
      triples.push({
        subject: columnUri,
        predicate: " slsv:column",
        object: columnDesc.column
      });

      var sparqlPrefixes = {
        "slsv": Config.linkedData_mappings_graph
      };
      var mappingSource="linkedData_mappings_graph"
      Config.sources[mappingSource]={
        graphUri:Config.linkedData_mappings_graph,
        sparql_server:{url:Config.default_sparql_url}
      }
      Sparql_generic.insertTriples(mappingSource, triples, { sparqlPrefixes: sparqlPrefixes }, function(err, result) {

        if (err)
          return callback(err);

        var triples = [{
          subject: entityUri,
          predicate: "<" + Config.linkedData_mappings_graph + "/hasColumnMapping>",
          object: columnUri
        }];
        Sparql_generic.insertTriples(graphNodeSource, triples, null, function(err, result) {
          return callback(err, { columnUri: columnUri });
        });
      });
    };






    self.graphTable = function(jstreeNode) {
      var existingNodes = visjsGraph.getExistingIdsMap();
      var database = KGcreator.currentCsvDir || KGcreator.currentDbName;
      var color = Lineage_classes.getSourceColor(database);

      var columns = jstreeNode.children;
      var node = jstreeNode.data;
      var table = node.id;

      var visjsData = { nodes: [], edges: [] };
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
      if (!existingNodes[table]) {
        existingNodes[table] = 1;
        visjsData.nodes.push({
          id: database + "." + table,
          label: database + "." + table,

          shadow: Lineage_classes.nodeShadow,
          shape: Lineage_linkedData_mappings.tableShape,
          level: 1,
          size: Lineage_classes.defaultShapeSize,
          color: color,
          data: {
            context: self.context,
            database: database,
            table: table,
            type: "table"
          }
        });
        var edgeId = database + "." + table + "_" + database;
        if (!existingNodes[edgeId]) {
          existingNodes[edgeId] = 1;

          visjsData.edges.push({
            id: edgeId,
            from: database + "." + table,
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
      columns.forEach(function(column) {
        if (!existingNodes[database + "." + table + "." + column]) {
          existingNodes[database + "." + table + "." + column] = 1;
          visjsData.nodes.push({
            id: database + "." + table + "." + column,
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

        var edgeId = database + "." + table + "_" + column;
        if (!existingNodes[edgeId]) {
          existingNodes[edgeId] = 1;

          visjsData.edges.push({
            id: edgeId,
            from: database + "." + table + "." + column,
            to: database + "." + table,
            data: {
              context: self.context,
              database: database,
              table: table,
              column: column,
              type: "relation"
            },

            /* arrows: {
               to: {
                 enabled: true,
                 type: "bar",
                 scaleFactor: 0.5
               }
             },*/
            //  dashes: true,
            color: color
          });
        }
      });


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