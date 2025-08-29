/**
 * KGquery_paths Module
 * @module KGquery_paths
 * @description Module for managing paths in knowledge graph queries.
 * This module provides functionality for:
 * - Configuring and managing paths between nodes
 * - Manipulating identifiers and variables in paths
 * - Managing graphical display of paths
 * - Finding shortest paths between nodes
 * - Managing path ambiguities
 *
 * @requires module:shared/common
 * @requires module:KGquery_graph
 * @requires module:uiWidgets/simpleListSelectorWidget
 * @requires module:sparqlProxies/sparql_common
 */

import common from "../../shared/common.js";
import KGquery_graph from "./KGquery_graph.js";
import SimpleListSelectorWidget from "../../uiWidgets/simpleListSelectorWidget.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";

var KGquery_paths = (function () {
    var self = {};
    //  self.pathDivsMap = {};

    /**
     * Configures the path of a query element by finding and managing paths between nodes.
     * @function
     * @name setQueryElementPath
     * @memberof KGquery_paths
     * @param {Object} queryElement - The query element to configure
     * @param {Function} callback - Callback function called with (err, queryElement)
     * @returns {void}
     */
    self.setQueryElementPath = function (queryElement, callback) {
        self.getPathBetweenNodes(queryElement.fromNode.id, queryElement.toNode.id, function (err, path) {
            if (err) {
                return callback(err);
            }

            path = JSON.parse(JSON.stringify(path));
            self.managePathAmbiguousEdges(path, function (unAmbiguousPath) {
                self.drawPathOnGraph(unAmbiguousPath);

                var pathWithVarNames = self.substituteClassIdToVarNameInPath(queryElement, unAmbiguousPath);
                queryElement.paths = pathWithVarNames;
                return callback(err, queryElement);
            });
        });
    };

    /**
     * Substitutes class IDs with variable names in a path.
     * @function
     * @name substituteClassIdToVarNameInPath
     * @memberof KGquery_paths
     * @param {Object} queryElement - The query element containing node information
     * @param {Array} path - The path to transform
     * @returns {Array} The path with substituted variable names
     */
    self.substituteClassIdToVarNameInPath = function (queryElement, path) {
        path.forEach(function (item, index) {
            var fromLabel = KGquery_graph.labelsMap[item[0]];
            if (queryElement.fromNode.label == fromLabel && queryElement.fromNode.alias) {
                fromLabel = queryElement.fromNode.alias;
            }
            item[0] = "?" + Sparql_common.formatStringForTriple(fromLabel, true);
            var toLabel = KGquery_graph.labelsMap[item[1]];
            if (queryElement.toNode.label == toLabel && queryElement.toNode.alias) {
                toLabel = queryElement.toNode.alias;
            }
            item[1] = "?" + Sparql_common.formatStringForTriple(toLabel, true);
        });
        return path;
    };

    /**
     * Checks if a path is valid in a query set.
     * @function
     * @name isPathValid
     * @memberof KGquery_paths
     * @param {Object} querySet - The query set to check
     * @param {string} targetNodeId - The target node ID
     * @returns {boolean} True if the path is valid, false otherwise
     */
    self.isPathValid = function (querySet, targetNodeId) {
        if (querySet.elements.length > 1) {
            var ok = false;
            querySet.elements.forEach(function (element) {
                element.paths.forEach(function (path) {
                    if (path[0] == targetNodeId || path[0] == element.fromNode.id) {
                        ok = true;
                    }
                    if (path[2] == targetNodeId || path[2] == element.fromNode.id) {
                        ok = true;
                    }
                });
            });
            return ok;
        } else {
            return true;
        }
    };

    /**
     * Handles duplicate class IDs in a path.
     * @function
     * @name processPathDuplicateClassIds
     * @memberof KGquery_paths
     * @param {Array} path - The path to process
     * @param {Object} currentQueryElement - The current query element
     * @returns {Array} The path with processed duplicate IDs
     */
    self.processPathDuplicateClassIds = function (path, currentQueryElement) {
        //manage multiple instance or sameClass
        path.forEach(function (pathItem, index) {
            for (var i = 0; i < 2; i++) {
                if (pathItem[i] == currentQueryElement.fromNode.id && currentQueryElement.fromNode.newInstance) {
                    path[index][i] = pathItem[i] + "_" + currentQueryElement.fromNode.newInstance;
                }
                if (pathItem[i] == currentQueryElement.toNode.id && currentQueryElement.toNode.newInstance) {
                    path[index][i] = pathItem[i] + "_" + currentQueryElement.toNode.newInstance;
                }
            }
        });
        return path;
    };

    /**
     * Draws a path on the graph by updating edge colors.
     * @function
     * @name drawPathOnGraph
     * @memberof KGquery_paths
     * @param {Array} path - The path to draw
     * @returns {void}
     */
    self.drawPathOnGraph = function (path) {
        //update of graph edges color
        var newVisjsEdges = [];
        path.forEach(function (pathItem, index) {
            var edgeId;
            if (true || pathItem.length == 3) {
                edgeId = pathItem[0] + "_" + pathItem[2] + "_" + pathItem[1];
            } else {
                edgeId = pathItem[1] + "_" + pathItem[2] + "_" + pathItem[0];
            }

            var color = KGquery.currentQuerySet.color;
            newVisjsEdges.push({ id: edgeId, color: color, width: 3 });
        });
        if (KGquery_graph.KGqueryGraph.data.edges.update) {
            KGquery_graph.KGqueryGraph.data.edges.update(newVisjsEdges);
        }
    };

    /**
     * Gets nodes linked to a given node up to a certain level.
     * @function
     * @name getNodeLinkedNodes
     * @memberof KGquery_paths
     * @param {string} fromNodeId - The starting node ID
     * @param {number} [maxLevels=1] - Maximum number of levels to traverse
     * @returns {Array} List of linked node IDs
     */
    self.getNodeLinkedNodes = function (fromNodeId, maxLevels) {
        if (!maxLevels) maxLevels = 1;
        var edges = KGquery_graph.visjsData.edges;

        var linkedNodes = [];
        var nodesMap = {};

        edges.forEach(function (edge) {
            if (!nodesMap[edge.from]) nodesMap[edge.from] = [];
            nodesMap[edge.from].push(edge.to);

            if (!nodesMap[edge.to]) nodesMap[edge.to] = [];
            nodesMap[edge.to].push(edge.from);
        });
        function recurse(node, level) {
            nodesMap[node].forEach(function (targetNode) {
                if (fromNodeId == targetNode) return;
                if (level < maxLevels && linkedNodes.indexOf(targetNode) < 0) {
                    linkedNodes.push(targetNode);
                    recurse(targetNode, level + 1);
                }
            });
        }
        recurse(fromNodeId, 0);

        return linkedNodes;
    };

    /**
     * Finds the shortest path between two nodes.
     * @function
     * @name getPathBetweenNodes
     * @memberof KGquery_paths
     * @param {string} fromNodeId - The starting node ID
     * @param {string} toNodeId - The destination node ID
     * @param {Function} callback - Callback function called with (err, path)
     * @returns {void}
     */
    self.getPathBetweenNodes = function (fromNodeId, toNodeId, callback) {
        if (!self.vicinityArray) {
            self.vicinityArray = [];
            // var edges = KGquery_graph.KGqueryGraph.data.edges.get();
            var edges = KGquery_graph.visjsData.edges;
            edges.forEach(function (edge) {
                if (!edge.data) {
                    return;
                }
                self.vicinityArray.push([edge.from, edge.to, edge.data.propertyId]);
            });
        }

        if (fromNodeId == toNodeId) {
            var pathes = [];

            self.vicinityArray.forEach(function (path) {
                if (path[0] == path[1] && path[1] == fromNodeId) {
                    pathes.push(path);
                }
            });
            return callback(null, pathes);
        }
        var body = {
            fromNodeUri: fromNodeId,
            toNodeUri: toNodeId,
            vicinityArray: self.vicinityArray,
        };

        var payload = {
            body: body,
        };

        $.ajax({
            type: "POST",
            url: `${Config.apiUrl}/shortestPath`,
            data: payload,
            dataType: "json",
            success: function (data, _textStatus, _jqXHR) {
                return callback(null, data);
            },
            error: function (err) {
                return callback(err);
            },
        });
    };

    /**
     * Counts how many times a node appears in a query set.
     * @function
     * @name countNodeVarExistingInSet
     * @memberof KGquery_paths
     * @param {string} nodeId - The node ID to count
     * @param {Object} querySet - The query set to analyze
     * @returns {number} The number of occurrences of the node
     */
    self.countNodeVarExistingInSet = function (nodeId, querySet) {
        var count = 0;
        querySet.elements.forEach(function (queryElement) {
            if (nodeId == queryElement.fromNode.id) {
                count += 1;
            }
            if (nodeId == queryElement.toNode.id) {
                count += 1;
            }
        });
        return count;
    };

    /**
     * Finds the ID of the nearest node in a query set.
     * @function
     * @name getNearestNodeId
     * @memberof KGquery_paths
     * @param {string} nodeId - The reference node ID
     * @param {Object} querySet - The query set to analyze
     * @param {boolean} excludeSelf - If true, excludes the node itself
     * @param {Function} callback - Callback function called with (err, nearestNodeId)
     * @returns {void}
     */
    self.getNearestNodeId = function (nodeId, querySet, excludeSelf, callback) {
        var allCandidateNodesMap = {};

        querySet.elements.forEach(function (queryElement) {
            if (false) {
                // take all nodes in the path
                queryElement.paths.forEach(function (pathItem) {
                    allCandidateNodesMap[pathItem[0]] = 0;
                    allCandidateNodesMap[pathItem[1]] = 0;
                });
            } else {
                // only terminaisons of path
                if (queryElement.fromNode && (!excludeSelf || queryElement.fromNode.id != nodeId)) {
                    allCandidateNodesMap[queryElement.fromNode.id] = 0;
                }
                if (queryElement.toNode && (!excludeSelf || queryElement.toNode.id != nodeId)) {
                    allCandidateNodesMap[queryElement.toNode.id] = 0;
                }
            }
        });
        var allCandidateNodesArray = Object.keys(allCandidateNodesMap);
        async.eachSeries(
            allCandidateNodesArray,
            function (candidateNodeId, callbackEach) {
                self.getPathBetweenNodes(candidateNodeId, nodeId, function (err, path) {
                    if (err) {
                        return callbackEach(err);
                    }

                    allCandidateNodesMap[candidateNodeId] = path.length;
                    callbackEach();
                });
            },
            function (err) {
                if (err) {
                    return callback(err);
                }

                var minEdges = 100;
                var nearestNodeId = null;
                for (var key in allCandidateNodesMap)
                    if (allCandidateNodesMap[key] < minEdges) {
                        minEdges = allCandidateNodesMap[key];
                        nearestNodeId = key;
                    }
                callback(null, nearestNodeId);
            },
        );
    };

    /**
     * Manages ambiguous edges in a path.
     * @function
     * @name managePathAmbiguousEdges
     * @memberof KGquery_paths
     * @param {Array} path - The path potentially containing ambiguous edges
     * @param {Function} callback - Callback function called with the unambiguous path
     * @returns {void}
     */
    self.managePathAmbiguousEdges = function (path, callback) {
        var fromToMap = {};
        path.forEach(function (pathItem, pathIndex) {
            var fromTo = [pathItem[0] + "_" + pathItem[1]];
            if (!fromToMap[fromTo]) {
                fromToMap[fromTo] = [];
            }
            fromToMap[fromTo].push(pathItem[2]);
        });
        var ambiguousEdges = [];
        for (var key in fromToMap) {
            if (fromToMap[key].length > 1) {
                ambiguousEdges.push({ id: key, properties: fromToMap[key] });
            }
        }

        if (ambiguousEdges.length == 0) {
            return callback(path);
        }
        var pathsToDelete = [];
        async.eachSeries(
            ambiguousEdges,
            function (ambiguousEdge, callbackEach) {
                if (ambiguousEdge && ambiguousEdge.properties.length > 0) {
                    return SimpleListSelectorWidget.showDialog(
                        null,
                        function (callbackLoad) {
                            return callbackLoad(ambiguousEdge.properties);
                        },
                        function (selectedProperty) {
                            ambiguousEdge.selectedProperty = selectedProperty;
                            path.forEach(function (pathItem, pathIndex) {
                                if (ambiguousEdge.id == [pathItem[0] + "_" + pathItem[1]] || ambiguousEdge.id == [pathItem[1] + "_" + pathItem[0]]) {
                                    if (pathItem[2] != ambiguousEdge.selectedProperty) {
                                        pathsToDelete.push(pathIndex);
                                    }
                                }
                            });

                            callbackEach();
                        },
                    );
                }
            },
            function (err) {
                var unambiguousPaths = [];
                path.forEach(function (pathItem, pathIndex) {
                    if (pathsToDelete.indexOf(pathIndex) < 0) {
                        unambiguousPaths.push(pathItem);
                    }
                });

                return callback(unambiguousPaths);
            },
        );
    };

    return self;
})();

export default KGquery_paths;
window.KGquery_paths = KGquery_paths;
