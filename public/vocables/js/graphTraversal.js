// eslint-disable-next-line @typescript-eslint/no-unused-vars
var GraphTraversal = (function() {


  var self = {};


  /**
   *
   * get nodes shortest path from server
   *
   * @param source
   * @param fromNodeId
   * @param toNodeId
   * @param callback return shortestPath nodes array
   */
  self.getShortestpath = function(source, fromNodeId, toNodeId, callback) {
    var body = {
      getShortestPath: 1,
      sparqlServerUrl: Config.sources[source].sparql_server.url,
      graphUri: Config.sources[source].graphUri,
      fromNodeUri: fromNodeId,
      toNodeUri: toNodeId

    };
    var payload = {
      url: Config.sources[source].sparql_server.url,
      body: JSON.stringify(body),
      POST: true
    };
    $.ajax({
      type: "POST",
      url: `${Config.apiUrl}/httpProxy`,
      data: payload,
      dataType: "json",
      success: function(data, _textStatus, _jqXHR) {
        return callback(null, data);
      }, error: function(err) {
        return callback(err);
      }
    });

  };

  self.drawShortestpath = function(source, fromNodeId, toNodeId) {


    var path = [];
    var relations = {};
   var labelsMap={}

    async.series([

      //get shortestPath nodes array
      function(callbackSeries) {

        self.getShortestpath(source, fromNodeId, toNodeId, function(err, result) {
          if (err)
            return callbackSeries(err);
          path = result;


        if(path.length==0)
          return alert("no path found ")

          callbackSeries();
        });
      }
      ,

      //get labels
      function(callbackSeries) {
        var ids = []
        path.forEach(function(item) {
            item.forEach(function(item2) {
              ids.push(item2)
            })
        });



       var fitlerStr=Sparql_common.setFilter("s", ids)

        var fromStr=Sparql_common.getFromStr(source,true)
        var query =

          "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
          "SELECT distinct * " +
          fromStr +
          " WHERE { GRAPH ?g {" +
          "?s rdf:type ?type "+ Sparql_common.getVariableLangLabel("s", true)+"" +
          fitlerStr +
          "}" +
          "} limit 10000" ;

            var url = Config.sources[source].sparql_server.url; + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function(err, result) {

          result.results.bindings.forEach(function(item) {
            labelsMap[item.s.value] = item.sLabel?item.sLabel.value: Sparql_common.getLabelFromURI("s")


          })
          callbackSeries();
        })
      }
      ,
     // setRelations
      function(callbackSeries) {

          path.forEach(function(item) {

            var relation = {
              from: item[0],
              fromLabel:labelsMap[item[0]],

              prop: item[2],
              propLabel: labelsMap[item[2]],

              to: item[1],
              toLabel: labelsMap[item[1]],

            };
            relations[item[0]] = relation;


          });
          return callbackSeries();

      }

      ,




      //build visjsNodeData
      function(callbackSeries) {

        var visjsData = { nodes: [], edges: [] };
        var existingIdsMap = visjsGraph.getExistingIdsMap();

        var shape = Lineage_classes.defaultShape;
        var color = Lineage_classes.getSourceColor(source);
        path.forEach(function(pathNodeId, index) {

          var item = relations[pathNodeId];

          if (!item)
            return;

          if (!existingIdsMap[item.from]) {
            existingIdsMap[item.from] = 1;
            var node = {
              id: item.from,
              label: item.fromLabel,
              shadow: Lineage_classes.nodeShadow,
              shape: shape,
              color: color,
              size: Lineage_classes.defaultShapeSize,
              data: {
                source: source,
                id: item.from,
                label: item.fromLabel
              }
            };
            visjsData.nodes.push(node);

          }
          if (!existingIdsMap[item.to]) {
            existingIdsMap[item.to] = 1;
            var node = {
              id: item.to,
              label: item.toLabel,
              shadow: Lineage_classes.nodeShadow,
              shape: shape,
              color: color,
              size: Lineage_classes.defaultShapeSize,
              data: {
                source: source,
                id: item.to,
                label: item.toLabel
              }
            };
            visjsData.nodes.push(node);

          }

          var edgeId = "P_" + common.getRandomHexaId(6);
          if (!existingIdsMap[edgeId]) {
            existingIdsMap[edgeId] = 1;

            visjsData.edges.push({
              id: edgeId,
              from: item.from,
              to: item.to,
              label: item.propLabel,
              color: "red",
              size: 3,
              // arrows: arrows,
              type: "path",
              data: {
                source: source,
                type: "path",
                path: path,
                id: edgeId,
                from: item.from,
                to: item.to,
                label: item.propLabel

              }

            });
          }

        });


        var oldEdges = visjsGraph.data.edges.get();
        var toDelete = [];
        oldEdges.forEach(function(edge) {
          if (edge.type == "path")
            toDelete.push(edge.id);
        });
        visjsGraph.data.edges.remove(toDelete);


        if (visjsGraph.isGraphNotEmpty()) {
          visjsGraph.data.nodes.add(visjsData.nodes);
          visjsGraph.data.edges.add(visjsData.edges);
        } else {
          Lineage_classes.drawNewGraph(visjsData);
        }


        return callbackSeries();
      }

    ], function(err) {
      if (err)
        return alert(err);


    });

  };


  self.initPathMode = function() {
    self.inPathMode = true;
    visjsGraph.network.addEdgeMode();


  };

  self.showPathNodesList = function(source, path) {

    var filter = Sparql_common.setFilter("concept", path, null);
    Sparql_OWL.getItems(source, { filter: filter }, function(err, result) {

    });


  };

  return self;


})();


/*

edges=[];



edges.push(["A", "B"]);
edges.push(["B", "C"])
edges.push(["B", "E"])
edges.push(["C", "D"])
edges.push(["C", "E"])
edges.push(["C", "G"])
edges.push(["D", "E"])
edges.push(["E", "F"]);
var path=GraphTraversal.getShortestPath(edges,"G","A")
console.log(path.toString());

 */

