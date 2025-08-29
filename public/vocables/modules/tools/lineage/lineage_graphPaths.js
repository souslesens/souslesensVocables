var Lineage_graphPaths = (function () {
    // from chatGPT
    var self = {};
    self.limit = 100;
    self.maxPaths = 1000;

    self.getGraphFromVisjsData = function (visjsdata, inverse) {
        var graph = {};
        visjsdata.edges.forEach(function (edge) {
            if (!graph[edge.from]) {
                graph[edge.from] = [];
            }
            graph[edge.from].push(edge.to);
            if (inverse) {
                if (!graph[edge.to]) {
                    graph[edge.to] = [];
                }
                graph[edge.to].push(edge.from);
            }
        });
        return graph;
    };
    self.getEdgesFromToMap = function (visjsData, inverse) {
        var nodesMap = {};
        var edgesFromToMap = {};
        visjsData.nodes.forEach(function (node) {
            nodesMap[node.id] = node;
        });
        visjsData.edges.forEach(function (edge) {
            edge.fromNode = nodesMap[edge.from];
            edge.toNode = nodesMap[edge.to];
            if (!edgesFromToMap[edge.from]) {
                edgesFromToMap[edge.from] = {};
            }
            edgesFromToMap[edge.from][edge.to] = edge;
            if (inverse) {
                if (!edgesFromToMap[edge.to]) {
                    edgesFromToMap[edge.to] = {};
                }
                edgesFromToMap[edge.to][edge.from] = edge;
            }
        });
        return edgesFromToMap;
    };

    self.formatPaths = function (visjsData, paths, format, options) {
        if (!format) {
            return paths;
        }
        if (!options) {
            options = {};
        }
        if (self.tooManyIterations) {
            alert("too many iterations result truncated");
        }

        var edgesFromToMap = self.getEdgesFromToMap(visjsData, options.inverse);

        var resultArray = [];
        paths.forEach(function (path) {
            var lineStr = "";
            for (var i = 1; i < path.length; i++) {
                var edgesFrom = edgesFromToMap[path[i - 1]];
                if (edgesFrom) {
                    var edge = edgesFrom[path[i]];
                    var fromLabel = edge.fromNode.label;
                    var toLabel = edge.toNode.label;
                    /*  if(path[i - 1]==edge.to) {//inverse relation
                            edge.label = "#" + edge.label
                            fromLabel=edge.toNode.label
                            toLabel=edge.fromNode.label

                        }*/

                    if (format == "text") {
                        lineStr += (i == 1 ? fromLabel : "") + "-" + (edge.label || "hasChild") + "->" + toLabel + " ";
                    } else if (format == "csv") {
                        lineStr += (i == 1 ? fromLabel + "" : "") + (edge.label || "hasChild") + "\t" + toLabel + "\t";
                    } else if (format == "html") {
                        lineStr += (i == 1 ? fromLabel : "") + " <span style='font-style:italic;color:blue'>" + (edge.label || "hasChild") + "</span> " + toLabel + " ";
                    } else if (format == "listEdges") {
                        resultArray.push(edge);
                    }
                }
            }
            resultArray.push(lineStr);
        });

        if (true || options.removeDuplicates) {
            if (resultArray.length > 0) {
                resultArray = resultArray.sort(function (a, b) {
                    return b.length - a.length;
                });
            }
            var filteredArray = [];
            resultArray.forEach(function (line) {
                if (filteredArray.indexOf(line) == 0) {
                    var x = 3;
                } else {
                    filteredArray.push(line);
                }
            });
            resultArray = filteredArray;
        }

        if (format == "listEdges") {
            return resultArray;
        } else {
            if (resultArray.length > self.limit && format == "text") {
                alert("result is too long (" + resultArray.length + "paths), it will be truncated to " + self.limit + " paths.");
                resultArray = resultArray.slice(0, self.limit);
            }
            var result = "";
            resultArray.forEach(function (line) {
                if (!line) return;
                if (format == "text") {
                    line += line + "\n";
                } else if (format == "csv") {
                    result += line + "\n";
                } else if (format == "html") {
                    result += line + "<br/>";
                }
            });

            return result;
        }
    };

    self.getAllpathsBetweenNodes = function (visjsData, start, end, format, options) {
        if (!options) {
            options = {};
        }
        var countIterations = 0;
        self.tooManyIterations = false;
        var graph = self.getGraphFromVisjsData(visjsData, options.inverse);

        function findAllPathsUndirected(graph, start, target) {
            let result = [];

            function dfs(node, path, visited) {
                path.push(node);
                visited.add(node);

                if (node === target) {
                    if (countIterations++ > self.maxPaths) {
                        return (self.tooManyIterations = true);
                    }
                    result.push([...path]); // found one path
                } else {
                    for (let neighbor of graph[node] || []) {
                        if (!visited.has(neighbor)) {
                            dfs(neighbor, path, visited);
                        }
                    }
                }

                path.pop();
                visited.delete(node); // backtrack for other paths
            }

            dfs(start, [], new Set());
            return result;
        }

        function findAllPaths(graph, start, end, path = [], paths = []) {
            path = [...path, start]; // extend current path

            if (start === end) {
                if (countIterations++ > self.maxPaths) {
                    return (self.tooManyIterations = true);
                }
                paths.push(path); // found a complete path
                return paths;
            }

            if (!graph[start]) {
                return paths;
            } // dead end

            for (let neighbor of graph[start]) {
                if (!path.includes(neighbor)) {
                    // avoid cycles
                    findAllPaths(graph, neighbor, end, path, paths);
                }
            }

            return paths;
        }

        // var paths = findAllPaths(graph, start, end)
        var paths = findAllPathsUndirected(graph, start, end);
        var result = self.formatPaths(visjsData, paths, format, options);

        return result;
    };

    self.getAllpathsFromNode = function (visjsData, start, format, options) {
        var graph = self.getGraphFromVisjsData(visjsData);
        var countIterations = 0;
        self.tooManyIterations = false;
        function findAllPaths(graph, start, path = [], paths = []) {
            path = [...path, start]; // extend current path
            paths.push(path); // record this path (even if it’s partial)

            if (!graph[start] || graph[start].length === 0) {
                return paths; // dead end
            }

            for (let neighbor of graph[start]) {
                if (!path.includes(neighbor)) {
                    if (countIterations++ > self.maxPaths) {
                        return (self.tooManyIterations = true);
                    }
                    // avoid cycles
                    findAllPaths(graph, neighbor, path, paths);
                }
            }

            return paths;
        }

        var paths = findAllPaths(graph, start);
        var result = self.formatPaths(visjsData, paths, format, options);

        return result;
    };
    self.getAllpathsToNode = function (visjsData, end, format, options) {
        var graph = self.getGraphFromVisjsData(visjsData);
        var countIterations = 0;
        self.tooManyIterations = false;
        function findAllPathsToTargetUndirected(graph, target) {
            let paths = [];

            function dfs(node, path, visited) {
                path.push(node);
                visited.add(node);

                if (node === target) {
                    if (countIterations++ > self.maxPaths) {
                        return (self.tooManyIterations = true);
                    }
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

        function findAllPathsToTarget(graph, target, options) {
            let result = [];

            function dfs(node, path) {
                path.push(node);

                if (node === target) {
                    result.push([...path]); // found a path to target
                } else {
                    for (let neighbor of graph[node] || []) {
                        if (!path.includes(neighbor)) {
                            // avoid cycles
                            dfs(neighbor, path);
                        }
                    }
                }

                path.pop(); // backtrack
            }

            // Try starting from every node in the graph
            for (let node in graph) {
                dfs(node, []);
            }

            return result;
        }

        var paths = findAllPathsToTarget(graph, end);
        //  var paths = findAllPathsToTargetUndirected(graph, end)
        var result = self.formatPaths(visjsData, paths, format, options);

        return result;
    };

    self.drawPaths = function (paths, outputType, color) {
        if (paths.length == 0) {
            alert("no path found");
        } else if (outputType == "text") {
            common.copyTextToClipboard(paths);
        } else if (outputType == "csv") {
            common.copyTextToClipboard(paths);
        } else if (outputType == "html") {
            var html = "<div>" + paths + "</div>";
            $("#mainDialogDiv").html(html);
            $("#mainDialogDiv").dialog("open");
        } else if (outputType == "listEdges") {
            var newEdgesMap = {};
            paths.forEach(function (edge) {
                //  path.forEach(function (edge) {
                if (!newEdgesMap[edge.id]) {
                    newEdgesMap[edge.id] = { id: edge.id, color: color, oldColor: edge.color, width: 2 };
                }
                if (newEdgesMap[edge.id].width < 5) {
                    newEdgesMap[edge.id].width += 1;
                }
            });
            // })
            var newEdges = [];
            for (var id in newEdgesMap) {
                newEdges.push(newEdgesMap[id]);
            }

            Lineage_whiteboard.lineageVisjsGraph.data.edges.update(newEdges);
            self.hasPathDecoration = true;
        }
    }; //SparqlQuery_bot.functions;
    self.clearPaths = function () {
        var newEdges = [];
        Lineage_whiteboard.lineageVisjsGraph.data.edges.forEach(function (edge) {
            if (edge.oldColor) {
                newEdges.push({ id: edge.id, width: 1, color: edge.oldColor });
            }
        });
        Lineage_whiteboard.lineageVisjsGraph.data.edges.update(newEdges);
        Lineage_graphPaths.hasPathDecoration = null;
    };
    return self;
})();

export default Lineage_graphPaths;
window.Lineage_graphPaths = Lineage_graphPaths;
