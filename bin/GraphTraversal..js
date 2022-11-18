var httpProxy = require("./httpProxy.");


var GraphTraversal = {


    getViscinityArray: function(serverUrl, grahUri, callback) {

      var query = "PREFIX owl: <http://www.w3.org/2002/07/owl#>\n" +

        "SELECT ?s ?o FROM   <" + grahUri + ">  WHERE {\n" +
        " ?s ?p ?o\n" +
        "  filter(isUri(?o) && ?o not in (owl:Class, owl:NamedIndividual, owl:Restriction,owl:ObjectProperty  ))}";

      var headers = {};
      headers["Accept"] = "application/sparql-results+json";
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      var params = { query: query };
      var url = serverUrl + "?query=&format=json";
      var viscinityArray = [];
      httpProxy.post(url, headers, params, function(err, result) {
        if (err)
          return callback(err);
        result.results.bindings.forEach(function(item) {
          viscinityArray.push([item.s.value, item.o.value]);
        });
        return callback(null, viscinityArray);

      });
    },
  path: {
    Graph: function() {
      var neighbors = this.neighbors = {}; // Key = vertex, value = array of neighbors.

      this.addEdge = function(u, v) {
        if (neighbors[u] === undefined) {  // Add the edge u -> v.
          neighbors[u] = [];
        }
        neighbors[u].push(v);
        if (neighbors[v] === undefined) {  // Also add the edge v -> u in order
          neighbors[v] = [];               // to implement an undirected graph.
        }                                  // For a directed graph, delete
        neighbors[v].push(u);              // these four lines.
      };

      return this;
    },

    bfs: function(graph, source) {
      var queue = [{ vertex: source, count: 0 }],
        visited = { source: true },
        tail = 0;
      while (tail < queue.length) {
        var u = queue[tail].vertex,
          count = queue[tail++].count;  // Pop a vertex off the queue.
        graph.neighbors[u].forEach(function(v) {
          if (!visited[v]) {
            visited[v] = true;
            queue.push({ vertex: v, count: count + 1 });
          }
        });
      }
    },

    shortestPath: function(graph, source, target) {
      if (source == target) {   // Delete these four lines if
        print(source);          // you want to look for a cycle
        return;                 // when the source is equal to
      }                         // the target.
      var queue = [source],
        visited = { source: true },
        predecessor = {},
        tail = 0;
      while (tail < queue.length) {
        var u = queue[tail++],  // Pop a vertex off the queue.
          neighbors = graph.neighbors[u];
        for (var i = 0; i < neighbors.length; ++i) {
          var v = neighbors[i];
          if (visited[v]) {
            continue;
          }
          visited[v] = true;
          if (v === target) {   // Check if the path is complete.
            var path = [v];   // If so, backtrack through the path.
            while (u !== source) {
              path.push(u);
              u = predecessor[u];
            }
            path.push(u);
            path.reverse();

            return path;
          }
          predecessor[v] = u;
          queue.push(v);
        }
      }


    }
  }
  ,
  getShortestPath: function(sparqlServerUrl,graphUri, fromNodeId, toNodeId, callback) {
    GraphTraversal.getViscinityArray(sparqlServerUrl,graphUri, function(err,visicinityArray){
      if(err)
        return callback(err);
      var graph = new GraphTraversal.path.Graph();
      visicinityArray.forEach(function(edge) {
        graph.addEdge(edge[0], edge[1]);
      });
      GraphTraversal.path.bfs(graph, fromNodeId);
      var path = GraphTraversal.path.shortestPath(graph, fromNodeId, toNodeId);









      return callback(null,path);
    })




  }


};
module.exports = GraphTraversal;


return;
GraphTraversal.getShortestPath("http://51.178.139.80:8890/sparql",
  "http://data.total.com/resource/tsf/ontology/tsf-standards_landscape/",
  "http://data.total.com/resource/tsf/ontology/tsf-standards_landscape/Richard_Mortimer",
  "http://data.total.com/resource/tsf/ontology/tsf-standards_landscape/Reference_Standards",
  function(err, result) {
  var x = result;
});