import httpProxy from './httpProxy.';
import async from 'async';
var GraphTraversal = {
    graphViscinityArraysMap: {},

    getViscinityArray: function (serverUrl, grahUri, options, callback) {
        if (!options.reload && GraphTraversal.graphViscinityArraysMap[grahUri]) {
            return callback(null, GraphTraversal.graphViscinityArraysMap[grahUri]);
        }

        var query =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "SELECT distinct ?s ?p ?o  FROM   <" +
            grahUri +
            ">" +
            "  WHERE {{ ?s rdfs:subClassOf ?node.  ?node rdf:type owl:Restriction." +
            " ?node owl:onProperty ?p . " +
            " ?node owl:allValuesFrom|owl:someValuesFrom|owl:aValueFrom ?o." +
            " } UNION " +
            "{?s ?p ?o." +
            " FILTER( ?p not in(rdf:type, rdfs:subClassOf,rdfs:member)) " +
            "filter (!isLiteral(?o)  && !isBlank(?s)) " +
            " }" +
            "   UNION {?s  ?p ?o. ?o rdf:type owl:Class  filter (?p=rdfs:subClassOf)}" +
            "} limit 10000";

        var headers = {};
        headers["Accept"] = "application/sparql-results+json";
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        var params = { query: query, auth: options.auth };
        var url = serverUrl + "?query=&format=json";
        var viscinityArray = [];

        httpProxy.post(url, headers, params, function (err, result) {
            if (err) return callback(err);
            result.results.bindings.forEach(function (item) {
                viscinityArray.push([item.s.value, item.o.value, item.p.value]);
            });
            if (!options.reload) GraphTraversal.graphViscinityArraysMap[grahUri] = viscinityArray;
            return callback(null, viscinityArray);
        });
    },
    path: {
        Graph: function () {
            var neighbors = (this.neighbors = {}); // Key = vertex, value = array of neighbors.

            this.addEdge = function (u, v) {
                if (neighbors[u] === undefined) {
                    // Add the edge u -> v.
                    neighbors[u] = [];
                }
                neighbors[u].push(v);
                if (neighbors[v] === undefined) {
                    // Also add the edge v -> u in order
                    neighbors[v] = []; // to implement an undirected graph.
                } // For a directed graph, delete
                neighbors[v].push(u); // these four lines.
            };

            return this;
        },

        bfs: function (graph, source) {
            var queue = [{ vertex: source, count: 0 }],
                visited = { source: true },
                tail = 0;
            while (tail < queue.length) {
                var u = queue[tail].vertex,
                    count = queue[tail++].count; // Pop a vertex off the queue.
                if (graph.neighbors[u]) {
                    graph.neighbors[u].forEach(function (v) {
                        if (!visited[v]) {
                            visited[v] = true;
                            queue.push({ vertex: v, count: count + 1 });
                        }
                    });
                }
            }
        },

        shortestPath: function (graph, source, target) {
            var shortestPaths = {};
            if (source == target) {
                // Delete these four lines if
                //  print(source); // you want to look for a cycle
                return; // when the source is equal to
            } // the target.
            var queue = [source],
                visited = { source: true },
                predecessor = {},
                tail = 0;
            while (tail < queue.length) {
                var u = queue[tail++], // Pop a vertex off the queue.
                    neighbors = graph.neighbors[u];

                if (neighbors) {
                    for (var i = 0; i < neighbors.length; ++i) {
                        var v = neighbors[i];
                        if (visited[v]) {
                            continue;
                        }
                        visited[v] = true;
                        if (v === target) {
                            // Check if the path is complete.
                            var path = [v]; // If so, backtrack through the path.
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
        },
    },
    getShortestPath: function (sparqlServerUrl, graphUri, fromNodeId, toNodeId, options, callback) {
        if (!options) options = {};
        GraphTraversal.getViscinityArray(sparqlServerUrl, graphUri, options, function (err, viscinityArray) {
            if (err) return callback(err);

            GraphTraversal.getSortestPathFromVicinityArray(viscinityArray, fromNodeId, toNodeId, options, function (err, path) {
                if (err) return callback(err);
                return callback(null, path);
            });
        });
    },

    getSortestPathFromVicinityArray: function (viscinityArray, fromNodeId, toNodeId, options, callback) {
        if (!options) {
            options = {};
        }
        var graph = new GraphTraversal.path.Graph(viscinityArray);

        viscinityArray.forEach(function (edge) {
            if (options.skipNode == edge[0]) return;
            graph.addEdge(edge[0], edge[1]);
        });
        GraphTraversal.path.bfs(graph, fromNodeId);
        var path = GraphTraversal.path.shortestPath(graph, fromNodeId, toNodeId);
        if (!path) return callback(null, []);

        var path2 = [];

        path.forEach(function (nodeId, index) {
            if (index == 0) return;
            viscinityArray.forEach(function (edge) {
                if (edge[0] == path[index - 1] && edge[1] == nodeId) {
                    path2.push(edge);
                    return;
                }
                if (edge[1] == path[index - 1] && edge[0] == nodeId) {
                    var inverseEdge = edge;
                    inverseEdge.push(1);
                    path2.push(inverseEdge);

                    return;
                }
            });
        });

        return callback(null, path2);
    },

    getAllShortestPath: function (sparqlServerUrl, graphUri, fromNodeId, toNodeId, numberOfPathes, options, callback) {
        var allpaths = [];
        var lastPathSize = 1;
        var iterations = 0;
        var skipNode = null;
        var stop = false;
        var firstPath = null;

        async.whilst(
            function (test) {
                return test(null, !stop);
            },
            function (callbackWhilst) {
                GraphTraversal.getShortestPath(sparqlServerUrl, graphUri, fromNodeId, toNodeId, { skipNode: skipNode }, function (err, path) {
                    if (err) return callbackWhilst(err);
                    if (path.length < 3) stop = true;

                    if (!firstPath) firstPath = path;
                    iterations += 1;
                    if (path.length > 0) {
                        skipNode = path[path.length - 2][0];
                        allpaths.push(path);
                    }

                    if (iterations >= numberOfPathes) stop = true;
                    callbackWhilst();
                });
            },
            function (err) {
                return callback(null, allpaths);
            },
        );
    },

    //https://www.tutorialspoint.com/The-Floyd-Warshall-algorithm-in-Javascript
    //https://mgechev.github.io/javascript-algorithms/graphs_shortest-path_floyd-warshall.js.html
    AllPathGraph: function (nodes, edges) {
        this.nodes = nodes;
        this.edges = edges;
        this.floydWarshallAlgorithm = function () {
            let dist = {};
            for (let i = 0; i < this.nodes.length; i++) {
                dist[this.nodes[i]] = {};
                // For existing edges assign the dist to be same as weight
                this.edges[this.nodes[i]].forEach((e) => (dist[this.nodes[i]][e.node] = e.weight));
                this.nodes.forEach((n) => {
                    // For all other nodes assign it to infinity
                    if (dist[this.nodes[i]][n] == undefined) dist[this.nodes[i]][n] = Infinity;
                    // For self edge assign dist to be 0
                    if (this.nodes[i] === n) dist[this.nodes[i]][n] = 0;
                });
            }
            this.nodes.forEach((i) => {
                this.nodes.forEach((j) => {
                    this.nodes.forEach((k) => {
                        // Check if going from i to k then from k to j is better
                        // than directly going from i to j. If yes then update
                        // i to j value to the new value
                        if (dist[i][k] + dist[k][j] < dist[i][j]) dist[i][j] = dist[i][k] + dist[k][j];
                    });
                });
            });
            return dist;
        };
        return this;
    },
};
module.exports = GraphTraversal;

if (false) {
    /*g.addNode("A");
g.addNode("B");
g.addNode("C");
g.addNode("D");*/
    /*
g.addEdge("A", "C", 100);
g.addEdge("A", "B", 3);
g.addEdge("A", "D", 4);
g.addEdge("D", "C", 3);*/
    /*    var nodes = ["A", "B", "C", "D"];

      var edges = [
          ["A", "C", 100],
          ["A", "B", 3],
          ["A", "D", 4],
          ["D", "C", 3],
      ];
      let g = new GraphTraversal.AllPathGraph(nodes, edges);

      console.log(g.floydWarshallAlgorithm());*/
}
return;
//GraphTraversal.getShortestPath(
GraphTraversal.getAllShortestPath(
    "",
    "http://data.total.com/resource/tsf/ontology/gaia-test/",
    "http://data.total.com/resource/tsf/ontology/gaia-test/abc685bd46",
    "http://data.total.com/resource/tsf/ontology/gaia-test/cc7b582c0f",
    5,
    {},
    function (err, result) {
        var x = result;
    },
);
