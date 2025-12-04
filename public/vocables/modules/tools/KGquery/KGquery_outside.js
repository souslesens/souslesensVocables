var KGquery_proxy = (function () {
    var self = {};

    self.init = function (source, callback) {
        KGquery.currentSource = source;
        KGquery_graph.downloadVisjsGraph(source, function () {
            try {
                // the function crash but init necessary variables for KGquery
                KGquery_graph.drawModel();
            } catch {}
            KGquery.initVarNamesMap();
            if (callback) {
                callback();
            }
        });
    };
    /**
     * Sequentially adds nodes from an array of identifiers to KGquery using KGquery.addNode
     * @param {Array<string>} nodeIds - Array of node or edge identifiers from the graph
     * @param {Function} callback - Callback function called at the end with (err, result)
     */
    self.addNodesToKGquery = function (nodeIds, callback) {
        if (!nodeIds || !Array.isArray(nodeIds)) {
            return callback("nodeIds must be an array");
        }

        if (nodeIds.length === 0) {
            return callback(null, { success: true, message: "No nodes to add" });
        }

        var graph = KGquery_graph.visjsData;
        if (!graph || !graph.nodes) {
            return callback("KGquery_graph is not initialized");
        }

        var nodesMap = {};
        graph.nodes.forEach(function (node) {
            nodesMap[node.id] = node;
        });

        var edgesMap = {};
        if (graph.edges) {
            graph.edges.forEach(function (edge) {
                edgesMap[edge.id] = edge;
            });
        }

        var addedNodes = [];
        var errors = [];

        var processNodeId = function (nodeId, callback) {
            self.addSingleNode(nodeId, nodesMap, edgesMap, addedNodes, errors, callback);
        };

        async.eachSeries(nodeIds, processNodeId, function (err) {
            if (err) {
                return callback(err);
            }

            var result = {
                success: true,
                addedNodes: addedNodes,
                errors: errors.length > 0 ? errors : null,
                message: "Added " + addedNodes.length + " node(s) out of " + nodeIds.length + " requested",
            };

            callback(null, result);
        });
    };

    /**
     * Adds a single node or edge to KGquery
     * @param {string} nodeId - Node or edge identifier
     * @param {Object} nodesMap - Map of nodes by ID
     * @param {Object} edgesMap - Map of edges by ID
     * @param {Array} addedNodes - Array to track added nodes
     * @param {Array} errors - Array to track errors
     * @param {Function} callback - Callback function
     */
    self.addSingleNode = function (nodeId, nodesMap, edgesMap, addedNodes, errors, callback) {
        var node = nodesMap[nodeId];
        var edge = edgesMap[nodeId];

        if (!node && !edge) {
            errors.push("Node or edge not found with ID: " + nodeId);
            return callback();
        }

        if (edge) {
            var fromNode = nodesMap[edge.from];
            var toNode = nodesMap[edge.to];

            if (!fromNode || !toNode) {
                errors.push("Edge nodes not found for ID: " + nodeId);
                return callback();
            }

            KGquery.addNode(fromNode, {}, function () {
                KGquery.addNode(toNode, {}, function () {
                    addedNodes.push({ from: fromNode.id, to: toNode.id, type: "edge" });
                    callback();
                });
            });
        } else {
            KGquery.addNode(node, {}, function () {
                addedNodes.push({ id: node.id, type: "node" });
                callback();
            });
        }
    };

    /**
     * Sets optional predicates for nodes based on a map of node IDs to property IDs
     * @param {Object} nodesPropertiesMap - Map where key is node ID from KGquery_graph.visjsData and value is array of property IDs to select (or null for all properties)
     */
    self.setOptionalPredicates = function (nodesPropertiesMap, options, callback) {
        // Handle optional options parameter
        if (typeof options === "function") {
            callback = options;
            options = {};
        }
        options = options || {};

        if (!nodesPropertiesMap || typeof nodesPropertiesMap !== "object") {
            return callback("nodesPropertiesMap must be an object");
        }

        var graph = KGquery_graph.visjsData;
        if (!graph || !graph.nodes) {
            return callback("KGquery_graph is not initialized");
        }

        // Initialize KGquery.labelFromURIToDisplay
        KGquery.labelFromURIToDisplay = [];

        // Initialize SELECT clause and optional predicates if initLabel is provided
        var initialSelectClause = "";
        var initialOptionalPredicates = "";

        // Build property nodes structure expected by KGquery_filter.getOptionalPredicates
        var propertyNodes = [];

        Object.keys(nodesPropertiesMap).forEach(function (nodeId) {
            // Find the node in the graph
            var graphNode = graph.nodes.find(function (n) {
                return n.id === nodeId;
            });

            if (!graphNode) {
                console.warn("Node not found in graph: " + nodeId);
                return;
            }

            if (!graphNode.data || !graphNode.data.nonObjectProperties) {
                console.warn("Node has no nonObjectProperties: " + nodeId);
                return;
            }

            // Get the variable name for this node
            var varName = KGquery.classToVarNameMap[nodeId];

            // Find the nodeDivId from KGquery.divsMap
            var nodeDivId = null;
            Object.keys(KGquery.divsMap).forEach(function (key) {
                if (KGquery.divsMap[key].id === nodeId) {
                    nodeDivId = key;
                }
            });

            // Get properties to include (all if null/undefined, or filtered list)
            var propertiesToInclude = nodesPropertiesMap[nodeId];
            var properties = graphNode.data.nonObjectProperties;

            if (propertiesToInclude && Array.isArray(propertiesToInclude)) {
                // Filter properties based on provided IDs
                properties = properties.filter(function (prop) {
                    return propertiesToInclude.includes(prop.id);
                });
            }

            // Create property nodes in the format expected by getOptionalPredicates
            properties.forEach(function (property) {
                var propertyNodeId = varName + "_" + property.label;
                propertyNodeId = propertyNodeId.replaceAll("?", "");

                // Build queryElementData with all required properties
                var queryElementData = {
                    nonObjectProperties: graphNode.data.nonObjectProperties,
                    source: graphNode.data.source || KGquery.currentSource,
                    id: nodeId,
                    label: graphNode.label,
                    setIndex: graphNode.data.setIndex !== undefined ? graphNode.data.setIndex : 0,
                    nodeDivId: nodeDivId,
                };
                varName = varName.replaceAll("?", "");
                propertyNodes.push({
                    id: propertyNodeId,
                    parents: ["root", "#"], // Correct order: root first, then #
                    data: {
                        varName: varName,
                        property: property,
                        queryElementData: queryElementData,
                    },
                });
            });
        });

        if (propertyNodes.length === 0 && !initialSelectClause) {
            return callback("No valid properties found for the given nodes");
        }

        // If no property nodes but initial label, set up the result manually
        if (propertyNodes.length === 0 && initialSelectClause) {
            KGquery.selectClauseSparql = initialSelectClause;
            KGquery.currentOptionalPredicatesSparql = initialOptionalPredicates;
            KGquery.optionalPredicatesSubjecstMap = {};
            return callback(null, {
                selectClauseSparql: initialSelectClause,
                optionalPredicatesSparql: initialOptionalPredicates,
                optionalPredicatesSubjecstMap: {},
                labelFromURIToDisplay: [],
            });
        }

        // Call KGquery_filter.getOptionalPredicates with the constructed property nodes
        KGquery_filter.getOptionalPredicates(propertyNodes, { noConfirm: true }, function (err, result) {
            if (err) {
                return callback(err);
            }

            // Prepend initial label to the results if provided
            if (initialSelectClause) {
                result.selectClauseSparql = initialSelectClause + " " + result.selectClauseSparql;
                result.optionalPredicatesSparql = initialOptionalPredicates + "\n" + result.optionalPredicatesSparql;
            }

            // Update KGquery with the results
            KGquery.selectClauseSparql = result.selectClauseSparql;
            KGquery.currentOptionalPredicatesSparql = result.optionalPredicatesSparql;
            KGquery.optionalPredicatesSubjecstMap = result.optionalPredicatesSubjecstMap;
            KGquery.labelFromURIToDisplay = result.labelFromURIToDisplay || [];

            callback(null, result);
        });
    };

    /**
     * Adds filters to nodes based on a map of node IDs to filter configurations
     * @param {Object} nodeFiltersMap - Map where key is node ID from KGquery_graph and value is filter configuration
     * @param {Function} callback - Callback function called with (err, result)
     */
    self.addNodeFilters = function (nodeFiltersMap, callback) {
        if (!nodeFiltersMap || typeof nodeFiltersMap !== "object") {
            return callback("nodeFiltersMap must be an object");
        }

        var graph = KGquery_graph.visjsData;
        if (!graph || !graph.nodes) {
            return callback("KGquery_graph is not initialized");
        }

        var results = [];
        var errors = [];

        // Process each filter in the map
        async.eachSeries(
            Object.keys(nodeFiltersMap),
            function (nodeId, callbackEach) {
                // Find the node in the graph
                var graphNode = graph.nodes.find(function (n) {
                    return n.id === nodeId;
                });

                if (!graphNode) {
                    errors.push("Node not found in graph: " + nodeId);
                    return callbackEach();
                }

                // Find the corresponding divId in KGquery.divsMap
                var divId = null;
                Object.keys(KGquery.divsMap).forEach(function (key) {
                    if (KGquery.divsMap[key].id === nodeId) {
                        divId = key;
                    }
                });

                if (!divId) {
                    errors.push("No div found for node: " + nodeId);
                    return callbackEach();
                }

                var filterConfig = nodeFiltersMap[nodeId];

                // Apply the filter using KGquery_filter.addNodeFilter
                try {
                    KGquery_filter.addNodeFilter(divId, null, null, { filter: filterConfig });
                    results.push({ nodeId: nodeId, divId: divId, success: true });
                } catch (err) {
                    errors.push("Error adding filter for node " + nodeId + ": " + err);
                }

                callbackEach();
            },
            function (err) {
                if (err) {
                    return callback(err);
                }

                callback(null, {
                    success: true,
                    results: results,
                    errors: errors.length > 0 ? errors : null,
                });
            },
        );
    };

    return self;
})();

export default KGquery_proxy;
window.KGquery_proxy = KGquery_proxy;
