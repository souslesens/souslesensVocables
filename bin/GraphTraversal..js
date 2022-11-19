var httpProxy = require("./httpProxy.");


var GraphTraversal = {


  getViscinityArray: function(serverUrl, grahUri, callback) {


    var query = "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
      "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
      "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
      "SELECT distinct ?s ?p ?o  FROM   <" + grahUri + ">" +
      "  WHERE {{ ?s rdfs:subClassOf ?node.  ?node rdf:type owl:Restriction." +
      " ?node owl:onProperty ?p . " +
      " ?node owl:allValuesFrom|owl:someValuesFrom|owl:aValueFrom ?o." +
      //  " FILTER ( ?concept in( <http://data.total.com/resource/tsf/ontology/gaia-test/b9bc0b6764>,<http://data.total.com/resource/tsf/ontology/gaia-test/cc7b582c0f>,<http://data.total.com/resource/tsf/ontology/gaia-test/928a5fd4a7>,<http://data.total.com/resource/tsf/ontology/gaia-test/045c8a28ac>,<http://data.total.com/resource/tsf/ontology/gaia-test/2580264383>,<http://data.total.com/resource/tsf/ontology/gaia-test/Company>,<http://data.total.com/resource/tsf/ontology/gaia-test/57521c5f20>,<http://data.total.com/resource/tsf/ontology/gaia-test/8de9d78c14>,<http://data.total.com/resource/tsf/ontology/gaia-test/dc010a5210>,<http://data.total.com/resource/tsf/ontology/gaia-test/194d634594>,<http://data.total.com/resource/tsf/ontology/gaia-test/Deformation_Style>,<http://data.total.com/resource/tsf/ontology/gaia-test/f8f4a29312>,<http://data.total.com/resource/tsf/ontology/gaia-test/2bf1d252d3>,<http://data.total.com/resource/tsf/ontology/gaia-test/19bbe45904>,<http://data.total.com/resource/tsf/ontology/gaia-test/8dcbadccd2>,<http://data.total.com/resource/tsf/ontology/gaia-test/4d3c6cc502>,<http://data.total.com/resource/tsf/ontology/gaia-test/5c1a97c410>,<http://data.total.com/resource/tsf/ontology/gaia-test/b8763fc1bd>,<http://data.total.com/resource/tsf/ontology/gaia-test/6a55df9075>,<http://data.total.com/resource/tsf/ontology/gaia-test/dea801d896>,<http://data.total.com/resource/tsf/ontology/gaia-test/240ba55799>,<http://data.total.com/resource/tsf/ontology/gaia-test/7d636c5bd6>,<http://data.total.com/resource/tsf/ontology/gaia-test/40f16fab15>,<http://data.total.com/resource/tsf/ontology/gaia-test/26601fc18e>,<http://data.total.com/resource/tsf/ontology/gaia-test/LithologicDescription>,<http://data.total.com/resource/tsf/ontology/gaia-test/bfbda1c8f9>,<http://data.total.com/resource/tsf/ontology/gaia-test/9ef56bb860>,<http://data.total.com/resource/tsf/ontology/gaia-test/5ac2bd3e5f>,<http://data.total.com/resource/tsf/ontology/gaia-test/31d60c5c63>,<http://data.total.com/resource/tsf/ontology/gaia-test/7a103349dd>,<http://data.total.com/resource/tsf/ontology/gaia-test/d2c4658680>,<http://data.total.com/resource/tsf/ontology/gaia-test/Participation>,<http://data.total.com/resource/tsf/ontology/gaia-test/d934bdab91>,<http://data.total.com/resource/tsf/ontology/gaia-test/386b11cdb6>,<http://data.total.com/resource/tsf/ontology/gaia-test/317d7ea4e0>,<http://data.total.com/resource/tsf/ontology/gaia-test/68f663c9be>,<http://data.total.com/resource/tsf/ontology/gaia-test/Report>,<http://data.total.com/resource/tsf/ontology/gaia-test/faa184342d>,<http://data.total.com/resource/tsf/ontology/gaia-test/738e98d5f8>,<http://data.total.com/resource/tsf/ontology/gaia-test/Seep>,<http://data.total.com/resource/tsf/ontology/gaia-test/Seismic_campain>,<http://data.total.com/resource/tsf/ontology/gaia-test/Seismic_line>,<http://data.total.com/resource/tsf/ontology/gaia-test/e04c80f390>,<http://data.total.com/resource/tsf/ontology/gaia-test/abc685bd46>,<http://data.total.com/resource/tsf/ontology/gaia-test/12f13a12e6>,<http://data.total.com/resource/tsf/ontology/gaia-test/1029e6bf3c>,<http://data.total.com/resource/tsf/ontology/gaia-test/0d8ef71523>,<http://data.total.com/resource/tsf/ontology/gaia-test/ebc8e3ae5b>,<http://data.total.com/resource/tsf/ontology/gaia-test/66dea73978>,<http://data.total.com/resource/tsf/ontology/gaia-test/af9bf2ddf5>,<http://data.total.com/resource/tsf/ontology/gaia-test/Well_test>,<http://data.total.com/resource/tsf/ontology/gaia-test/de62adbf1d>) ) " +
      // "OPTIONAL {?prop rdfs:label ?propLabel. filter( lang(?propLabel)= 'en' || !lang(?propLabel))} " +
      // " OPTIONAL {?concept rdfs:label ?conceptLabel. filter( lang(?conceptLabel)= 'en' || !lang(?conceptLabel))}" +
      // " OPTIONAL {?value rdfs:label ?valueLabel. filter( lang(?valueLabel)= 'en' || !lang(?valueLabel))}" +
      " } UNION " +
      "{?s ?p ?o." +
      " FILTER( ?p not in(rdf:type, rdfs:subClassOf,rdfs:member)) " +
      "filter (!isLiteral(?o) ) " +
      //  "  ?subject rdf:type ?subjectType. ?object rdf:type ?objectType. " +
      // "  FILTER ( ?subject in( <http://data.total.com/resource/tsf/ontology/gaia-test/b9bc0b6764>,<http://data.total.com/resource/tsf/ontology/gaia-test/cc7b582c0f>,<http://data.total.com/resource/tsf/ontology/gaia-test/928a5fd4a7>,<http://data.total.com/resource/tsf/ontology/gaia-test/045c8a28ac>,<http://data.total.com/resource/tsf/ontology/gaia-test/2580264383>,<http://data.total.com/resource/tsf/ontology/gaia-test/Company>,<http://data.total.com/resource/tsf/ontology/gaia-test/57521c5f20>,<http://data.total.com/resource/tsf/ontology/gaia-test/8de9d78c14>,<http://data.total.com/resource/tsf/ontology/gaia-test/dc010a5210>,<http://data.total.com/resource/tsf/ontology/gaia-test/194d634594>,<http://data.total.com/resource/tsf/ontology/gaia-test/Deformation_Style>,<http://data.total.com/resource/tsf/ontology/gaia-test/f8f4a29312>,<http://data.total.com/resource/tsf/ontology/gaia-test/2bf1d252d3>,<http://data.total.com/resource/tsf/ontology/gaia-test/19bbe45904>,<http://data.total.com/resource/tsf/ontology/gaia-test/8dcbadccd2>,<http://data.total.com/resource/tsf/ontology/gaia-test/4d3c6cc502>,<http://data.total.com/resource/tsf/ontology/gaia-test/5c1a97c410>,<http://data.total.com/resource/tsf/ontology/gaia-test/b8763fc1bd>,<http://data.total.com/resource/tsf/ontology/gaia-test/6a55df9075>,<http://data.total.com/resource/tsf/ontology/gaia-test/dea801d896>,<http://data.total.com/resource/tsf/ontology/gaia-test/240ba55799>,<http://data.total.com/resource/tsf/ontology/gaia-test/7d636c5bd6>,<http://data.total.com/resource/tsf/ontology/gaia-test/40f16fab15>,<http://data.total.com/resource/tsf/ontology/gaia-test/26601fc18e>,<http://data.total.com/resource/tsf/ontology/gaia-test/LithologicDescription>) )" +
      // " OPTIONAL {?property rdfs:label ?propertyLabel. filter( lang(?propertyLabel)= 'en' || !lang(?propertyLabel))} " +
      // " OPTIONAL {?subject rdfs:label ?subjectLabel. filter( lang(?subjectLabel)= 'en' || !lang(?subjectLabel))} " +
      // " OPTIONAL {?object rdfs:label ?objectLabel. filter( lang(?objectLabel)= 'en' || !lang(?objectLabel))}  " +

      " }" +
      "} limit 10000";


    /*  var query = "PREFIX owl: <http://www.w3.org/2002/07/owl#>\n" +

        "SELECT ?s ?o FROM   <" + grahUri + ">  WHERE {\n" +
        " ?s ?p ?o\n" +
        "  filter(isUri(?o) && ?p not in (rdfs:member) && ?o not in (owl:Class, owl:NamedIndividual, owl:Restriction,owl:ObjectProperty ,<http://souslesens.org/resource/vocabulary/TopConcept> ))}";
  */
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
        viscinityArray.push([item.s.value, item.o.value,item.p.value]);

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
  getShortestPath: function(sparqlServerUrl, graphUri, fromNodeId, toNodeId, callback) {
    GraphTraversal.getViscinityArray(sparqlServerUrl, graphUri, function(err, viscinityArray) {
      if (err)
        return callback(err);
      var graph = new GraphTraversal.path.Graph();
      viscinityArray.forEach(function(edge) {
        graph.addEdge(edge[0], edge[1]);
      });
      GraphTraversal.path.bfs(graph, fromNodeId);
      var path = GraphTraversal.path.shortestPath(graph, fromNodeId, toNodeId);
      if(!path)
        return callback(null,[]);

      var path2=[]
      path.forEach(function(nodeId,index) {
        if (index == 0)
          return;
        viscinityArray.forEach(function(edge){
          if(edge[0]==path[index-1] && edge[1]==nodeId)
            path2.push(edge)

        })

      })


      return callback(null,path2);
    });


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