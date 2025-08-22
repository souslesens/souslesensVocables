var Lineage_graphPaths = (function () {
// from chatGPT
        var self = {}

        self.getGraphFromVisjsData = function (visjsdata) {
            var graph = {}
            visjsdata.edges.forEach(function (edge) {
                if (!graph[edge.from]) {
                    graph[edge.from] = []
                }
                graph[edge.from].push(edge.to)
            })
            return graph;

        }
        self.getEdgesFromToMap = function (visjsData) {
            var nodesMap = {}
            var edgesFromToMap = {}
            visjsData.nodes.forEach(function (node) {

                    nodesMap[node.id] = node

            })
            visjsData.edges.forEach(function (edge) {

                    edge.fromNode = nodesMap[edge.from]
                    edge.toNode = nodesMap[edge.to]
                if (!edgesFromToMap[edge.from]) {
                    edgesFromToMap[edge.from] = {}
                }
                    edgesFromToMap[edge.from][edge.to] = edge

            })
            return edgesFromToMap;
        }

        self.formatPaths = function (visjsData, paths, format) {
            if (!format)
                return paths;

            var edgesFromToMap = self.getEdgesFromToMap(visjsData)
            var resultStr = ""
            var resultArray=[]
            paths.forEach(function (path) {
                var edgesArray=[]
                for (var i = 1; i < path.length; i++) {
                    var edgesFrom = edgesFromToMap[path[i - 1]]
                    if (edgesFrom) {
                        var edge = edgesFrom[path[i]]

                        if (format == "text") {
                            resultStr += (i==1?(edge.fromNode.label + "\t-" ):"")+ (edge.label || "") + "\t->" + edge.toNode.label+"\t"
                        }
                        if (format == "listEdges") {
                            edgesArray.push(edge)
                        }

                    }

                }
                resultArray.push(edgesArray)
                    resultStr += "\n";
            })

                if (format == "text") {
                    return resultStr;
                }else{
                    return resultArray;
                }

        }


        self.getAllpathsBetweenNodes = function (visjsData, start, end, format) {
            var graph = self.getGraphFromVisjsData(visjsData)

            function findAllPaths(graph, start, end, path = [], paths = []) {
                path = [...path, start]; // extend current path

                if (start === end) {
                    paths.push(path); // found a complete path
                    return paths;
                }

                if (!graph[start]) {
                    return paths;
                } // dead end

                for (let neighbor of graph[start]) {
                    if (!path.includes(neighbor)) { // avoid cycles
                        findAllPaths(graph, neighbor, end, path, paths);
                    }
                }

                return paths;
            }

            var paths = findAllPaths(graph, start, end)
            var result = self.formatPaths(visjsData,paths, format)

            return result;
        }

        self.getAllpathsFromNode = function (visjsData, start,format) {
            var graph = self.getGraphFromVisjsData(visjsData)
            function findAllPaths(graph, start, path = [], paths = []) {
                path = [...path, start]; // extend current path
                paths.push(path); // record this path (even if it’s partial)

                if (!graph[start] || graph[start].length === 0) {
                    return paths; // dead end
                }

                for (let neighbor of graph[start]) {
                    if (!path.includes(neighbor)) { // avoid cycles
                        findAllPaths(graph, neighbor, path, paths);
                    }
                }

                return paths;
            }
            var paths = findAllPaths(graph, start)
            var result = self.formatPaths(visjsData,paths, format)

            return result;


        }
    self.getAllpathsToNode = function (visjsData, end,format) {
        var graph = self.getGraphFromVisjsData(visjsData)
        function findAllPathsToTargetUndirected(graph, target) {
            let paths = [];

            function dfs(node, path, visited) {
                path.push(node);
                visited.add(node);

                if (node === target) {
                    paths.push([...path]);
                } else {
                    for (let neighbor of graph[node] || []) {
                        if (!visited.has(neighbor)) {
                            dfs(neighbor, path, visited);
                        }
                    }
                }

                // backtrack
                path.pop();
                visited.delete(node);
            }

            // Start DFS from every node
            for (let node in graph) {
                dfs(node, [], new Set());
            }

            return paths;
        }
        function findAllPathsToTarget(graph, target) {
            let paths = [];

            function dfs(node, path) {
                path.push(node);

                if (node === target) {
                    paths.push([...path]);
                    path.pop();
                    return;
                }

                for (let neighbor of graph[node] || []) {
                    if (!path.includes(neighbor)) { // avoid cycles
                        dfs(neighbor, path);
                    }
                }

                path.pop();
            }

            // Start DFS from every node in the graph
            for (let node in graph) {
                dfs(node, []);
            }

            return paths;
        }
       // var paths = findAllPathsToTarget(graph, end)
        var paths=findAllPathsToTargetUndirected(graph, end)
        var result = self.formatPaths(visjsData,paths, format)

        return result;


    }
        return self;
    })()

    export default Lineage_graphPaths;
    window.Lineage_graphPaths = Lineage_graphPaths;