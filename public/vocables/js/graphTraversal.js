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


    var path=[]
  async.series([

    //get shortestPath nodes array
    function(callbackSeries) {

      self.getShortestpath(source, fromNodeId, toNodeId, function(err, result) {
if(err)
  return callbackSeries(err)
        path=result;
        callbackSeries()
      })
    }
    ,
    function(callbackSeries){

      path.forEach(function(nodeId, index) {
        if (index == 0)
          return;

        var from = path[index - 1];

      var options = {
        onlyObjectProperties: true,
        distinct: "?subject ?property ?object"
      };
      Sparql_OWL.getFilteredTriples(source, null, null, null, options, function(err, result) {
        if (err)
          return callback(err);
        result.forEach(function(item) {
          edgesArray.push([item.subject.value, item.object.value]);
          properties[item.subject.value + "_" + item.object.value] = {
            id: item.propertyLabel.value,
            label: item.propertyLabel.value
          };


        });
        self.sourcesEdgeArrays[source] = { properties: properties, edges: edgesArray };
        return callback(null, self.sourcesEdgeArrays[source]);
      });
    });
  };

  }



  ],function(err){

  }


    )




      path.forEach(function(nodeId, index) {
        if (index == 0)
          return;

        var from = path[index - 1];
        var to = nodeId;
        var edgeId = "Path_" + common.getRandomHexaId(6);
        var label = null;
        var arrow = null;
        if (result.properties[from + "_" + to]) {
          label = result.properties[from + "_" + to].label;
          arrows = {
            to: true
          };
        }

        if (result.properties[to + "_" + from]) {
          label = result.properties[to + "_" + from].label;
          arrows = {
            from: true
          };
        }

        self.currentpathEdges.push(edgeId);
        newEdges.push({
          id: edgeId,
          from: from,
          to: to,
          label: label,
          color: "red",
          size: 3,
          arrows: arrows,
          type: "path",
          data: {
            source: source,
            type: "path",
            path: path

          }

        });

      });


      visjsGraph.data.edges.add(newEdges);




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

