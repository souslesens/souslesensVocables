var Lineage_linkedData_mappings = (function() {
  var self = {};


 self.context="linkeData_mappings"
  self.tableShape = "square";
  self.columnShape = "diamond";
  self.databaseShape="database"

  self.getTablesTreeContextMenu = function() {
    var items = {};

    items.setAsSubject = {
      label: "Graph table",
      action: function(_e) {

        if (KGcreator.currentTreeNode.parents.length != 1) return;
        self.graphTable(KGcreator.currentTreeNode);
      }
    };
    return items;

  };

  self.graphTable = function(jstreeNode) {
    var existingNodes = visjsGraph.getExistingIdsMap();
    var database = KGcreator.currentCsvDir || KGcreator.currentDbName
    var color=Lineage_classes.getSourceColor(database)

    var columns = jstreeNode.children;
    var node = jstreeNode.data;
    var table=node.id

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
        id:  database+"."+table,
        label: database+"."+table,

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
      var edgeId = database+"."+table + "_" + database;
      if (!existingNodes[edgeId]) {
        existingNodes[edgeId] = 1;

        visjsData.edges.push({
          id: edgeId,
          from: database+"."+table  ,
          to: database,
          data: {
            context: self.context,
            database: database,
            table:  table,
            type: "relation",
          },

          arrows: {
            to: {
              enabled: true,
              type: "bar",
              scaleFactor: 0.5
            }
          },
          //  dashes: true,
          color:color
        });
      }
    }
    columns.forEach(function(column) {
      if (!existingNodes[ database+"."+table+ "." + column]) {
        existingNodes[ database+"."+table + "." + column] = 1;
        visjsData.nodes.push({
          id:  database+"."+table + "." + column,
          label: column,

          shadow: Lineage_classes.nodeShadow,
          shape: Lineage_linkedData_mappings.tableShape,
          level: 1,
          size: Lineage_classes.defaultShapeSize,
          color: color,
          data: {
            context: self.context,
            database: database,
            table: database+"."+table,
            type: "column",
            column: column
          }
        });
      }

      var edgeId =  database+"."+table + "_" + column;
      if (!existingNodes[edgeId]) {
        existingNodes[edgeId] = 1;

        visjsData.edges.push({
          id: edgeId,
          from:  database+"."+table+ "." + column,
          to:  database+"."+table,
          data: {
            context: self.context,
            database: database,
            table: table,
            column: column,
            type: "relation",
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
    })


    if (visjsGraph.isGraphNotEmpty()) {
      visjsGraph.data.nodes.add(visjsData.nodes);
      visjsGraph.data.edges.add(visjsData.edges);
    } else {
      Lineage_classes.drawNewGraph(visjsData);
    }


  }

  self.onAddEdgeDropped=function(edgeData){
    var sourceNode = visjsGraph.data.nodes.get(edgeData.from).data;
    var targetNode = visjsGraph.data.nodes.get(edgeData.to).data;

    // link join beetwen tables
    if(sourceNode.context== self.context && targetNode.context== self.context){

    }
// link column to entity (class or Individual)
    else if(sourceNode.context!= self.context && targetNode.context== self.context){
      var entityUri=sourceNode.id;
      var columnDesc=targetNode

    }
    // link column to entity (class or Individual)
    else if(sourceNode.context== self.context && targetNode.context!= self.context){
      var columnDesc=sourceNode.id;
      var entityUri=targetNode;




    }else{

    }

  }


  self.saveColumnMapping=function(graph,entityUri,columnDesc){
    var columnUri=graph+common.getRandomHexaId(10);
    var triples=[]
    triples.push({
      subject:entityUri,
      predicate :" slsv:database",
      object:columnDesc.database,
    })
    triples.push({
      subject:entityUri,
      predicate :" slsv:table",
      object:columnDesc.table,
    })
    triples.push({
      subject:entityUri,
      predicate :" slsv:column",
      object:columnDesc.table,
    })

    Sparql_generic.insertTriples(Config.linkedData_mappings_graph, triples)


  }

  return self;

})
  ();