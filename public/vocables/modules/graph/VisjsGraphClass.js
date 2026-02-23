import common from "../shared/common.js";
import SVGexport2 from "./SVGexport2.js";

import GraphMlExport from "./graphMLexport.js";

const VisjsGraphClass = function (graphDiv, data, options) {
    if (!options) {
        options = {};
    }

    if (!options.visjsOptions) {
        options.visjsOptions = {};
    }
    this.graphDiv = graphDiv;
    this.data = data;
    this.options = options;
    var self = this;
    self.network = null;
    self.simulationTimeOut = 3000;
    self.data;
    self.legendLabels = [];
    self.context = {};
    self.currentScale;
    self.simulationOn;
    self.globalOptions = { nodes: {}, edges: {} };
    self.defaultShape = "dot";

    self.defaultTextSize = 14;
    self.defaultNodeSize = 7;
    self.showNodesLabelMinScale = 0.5;
    self.currentContext;
    self.drawingDone = false;
    var lastClickTime = new Date();
    var dbleClickIntervalDuration = 500;
    if (options.defaultShape) {
        self.defaultShape = options.defaultShape;
    }

    /**
     * Initializes and renders an interactive Vis.js network graph, configuring layout, events, datasets,
     * and user interactions. It sets up node/edge behavior and calls a callback once drawing is complete
     * @function
     * @name draw
     * @memberof module:VisjsGraphClass
     * @param {function} callback -  executed once the graph has finished drawing
     * @param {object} self.graphDiv - internal, ID of the DOM container where the graph is drawn
     * @param {object} self.data - internal, input nodes, edges, labels
     * @param {object} self.options - internal, configuration options (events, layout, behaviors, styling…)
     * @returns {void}
     */
    self.draw = function (callback) {
        var divId = self.graphDiv;
        var visjsData = self.data;
        var _options = self.options;

        var improvedLayout = true;
        //When enabled, the network will use the Kamada Kawai algorithm for initial layout. For networks larger than 100 nodes, ...
        if (self.data.edges.getIds && self.data.edges.getIds().length > 150) {
            improvedLayout = false;
        }

        self.drawingDone = false;
        self.currentContext = { divId: divId, options: _options, callback: callback };
        if (!_options) {
            _options = {};
        }

        $("#" + divId).keydown(function (event) {
            self.currentKeyboardEventy = event;
        });

        self.legendLabels = self.legendLabels.concat(visjsData.labels);
        var container = document.getElementById(divId);

        var nodesDataSet = null;
        var edgesDataSet = null;
        if (Array.isArray(visjsData.nodes)) {
            // new data
            var nodesDataSet = new vis.DataSet(visjsData.nodes);
            var edgesDataSet = new vis.DataSet(visjsData.edges);
        } else {
            // already dataset
            var nodesDataSet = visjsData.nodes;
            var edgesDataSet = visjsData.edges;
        }
        self.lastAddedNodes = visjsData.nodes;
        nodesDataSet.on("*", function (/** @type {string} */ event, /** @type {{ items: any; }} */ properties, /** @type {any} */ senderId) {
            if (_options.onAddNodeToGraph) {
                if (event == "add") {
                    _options.onAddNodeToGraph(properties, senderId);
                }
            }
            if (event == "add") {
                self.lastAddedNodes = properties.items;
            }
        });

        self.data = {
            nodes: nodesDataSet,
            edges: edgesDataSet,
        };
        self.canvasDimension = {
            w: $("#" + divId).width(),
            h: $("#" + divId).height() - 50,
        };
        var options = {
            interaction: { hover: true },
            width: "" + self.canvasDimension.w + "px",
            height: "" + self.canvasDimension.h + "px",
            nodes: {
                //   shape: self.defaultShape,
                size: 12,
                chosen: { node: true },
                // scaling:{min:6,max:20}
            },
            edges: {
                //  scaling:{min:1,max:8}
            },

            layout: { improvedLayout: improvedLayout },
        };

        for (var key in _options) {
            options[key] = _options[key];
        }

        if (_options.layoutHierarchical) {
            options.visjsOptions.layout = {
                hierarchical: _options.layoutHierarchical,
            };
            options.visjsOptions.physics = { enabled: false };
        } else {
            $("#visjsGraph_layoutSelect").val("");
        }

        self.network = new vis.Network(container, self.data, options.visjsOptions);
        self.simulationOn = true;
        Lineage_selection.selectedNodes = [];
        self.network.on("afterDrawing", function (/** @type {any} */ _params) {
            self.drawingDone = true;
        });
        self.network.on("selectNode", function (/** @type {{ nodes: any[]; }} */ params) {
            // if shift key is pressed, add to selection
            var isShiftKey = params.event.srcEvent.shiftKey;
            var ctrlKey = params.event.srcEvent.ctrlKey;
            if (isShiftKey && !ctrlKey) {
                if (self.network.getSelectedNodes().length > 0 && params.nodes.length > 1) {
                    var newNodes = self.network.getSelectedNodes().concat(params.nodes);
                    newNodes = common.array.distinctValues(newNodes);
                    self.setSelectedNodes(newNodes);
                }
            }
            // else default behavior
        });
        self.network.on("deselectNode", function (/** @type {{ nodes: any[]; }} */ params) {
            // deselect Nodes only if no nodes clicked (click on whiteboard) or other node left clicked (without shift key)
            if (params.nodes.length == 0) {
                self.setSelectedNodes([]);
            } else {
                // reset previous selection because it is automatically deselected by native behavior when shift key is pressed
                var isShiftKey = params.event.srcEvent.shiftKey;
                var ctrlKey = params.event.srcEvent.ctrlKey;
                if (isShiftKey && !ctrlKey) {
                    var previousNodesIds = params.previousSelection.nodes.map(function (node) {
                        return node.id;
                    });
                    previousNodesIds.push(params.nodes[0]);
                    self.setSelectedNodes(previousNodesIds);
                }
            }
        });
        self.network.on("oncontext", function (/** @type {{ event: { preventDefault: () => void; which: number; }; pointer: { DOM: any; }; }} */ params) {
            params.event.preventDefault();
            if (params.event.which == 3) {
                if (_options.onRightClickFn) {
                    var point = params.pointer.DOM;
                    var objId = self.network.getNodeAt(params.pointer.DOM);
                    if (objId) {
                        var obj = self.data.nodes.get(objId);
                        if (obj) {
                            _options.onRightClickFn(obj, point, params.event);
                        }
                    } else {
                        objId = self.network.getEdgeAt(params.pointer.DOM);
                        if (objId) {
                            obj = self.data.edges.get(objId);
                            if (obj) {
                                _options.onRightClickFn(obj, point, params.event);
                            }
                        } else {
                            _options.onRightClickFn(null, point, params.event);
                        }
                    }
                }
            } //rigth click
        });

        self.network.on("doubleClick", function (/** @type {any} */ params) {
            self.processClicks(params, _options, true);
        });

        self.network
            .on("click", function (/** @type {{ pointer: { DOM: { x: any; y: any; }; }; }} */ params) {
                // eslint-disable-next-line no-console
                //  console.log(self.network.getNodeAt(params.pointer.DOM.x, params.pointer.DOM.y));
                self.processClicks(params, _options);
            })
            .on("hoverNode", function (/** @type {{ node: any; pointer: { DOM: any; }; }} */ params) {
                var nodeId = params.node;
                var node = self.data.nodes.get(nodeId);
                // eslint-disable-next-line no-console
                if (!node) {
                    return console.log("hoverNode :no node ");
                }
                node._graphPosition = params.pointer.DOM;
                var point = params.pointer.DOM;
                self.context.currentNode = node;
                var options = {};

                if (params.event) {
                    var options = {
                        ctrlKey: params.event.ctrlKey ? 1 : 0,
                        altKey: params.event.altKey ? 1 : 0,
                        shiftKey: params.event.shiftKey ? 1 : 0,
                    };
                }
                if (_options.onHoverNodeFn) {
                    _options.onHoverNodeFn(node, point, options);
                }
            })
            .on("blurNode", function (/** @type {any} */ _params) {
                // $("#popupMenuWidgetDiv").css("display", "none")
            })
            .on("zoom", function (/** @type {any} */ _params) {
                self.onScaleChange();
            })
            .on("hoverEdge", function (/** @type {{ edge: any; }} */ params) {
                if (!self.data || !self.data.edges) {
                    return;
                }
                var edgeId = params.edge;
                var edge = self.data.edges.get(edgeId);
                if (!edge) {
                    return;
                }
                edge.fromNode = self.data.nodes.get(edge.from);
                edge.toNode = self.data.nodes.get(edge.to);
                //   sinequaResultVis.onEdgeHover(edge, point)
            })
            .on("blurEdge", function (/** @type {any} */ _params) {
                //  sinequaResultVis.onEdgeBlur()
            })

            .on("dragStart", function (/** @type {{ nodes: any[]; }} */ params) {
                var nodeId = params.nodes[0];

                if (!nodeId) {
                    return;
                }

                if (self.network.clustering.isCluster(nodeId)) {
                    return;
                }
                self.movingNodeStartPosition = self.network.getPosition(nodeId);
                //   var nodes = self.data.nodes.getIds();
                var newNodes = [];
                var fixed = false;

                newNodes.push({ id: nodeId, fixed: fixed });
                self.data.nodes.update(newNodes);
                /*self.network.setOptions({ physics: {enabled: true,
                    stabilization: {
                      enabled: true,
                      iterations: 1000, // Nombre d'itérations pour stabiliser le réseau
                      updateInterval: 25,
                      onlyDynamicEdges: false,
                      fit: true
                    }} });*/
            })
            .on("controlNodeDragging", function (params) {
                self.currentDraggingMousePosition = params.pointer.DOM;
            })
            .on("dragging", function (_params) {})
            .on("dragEnd", function (/** @type {{ event: { srcEvent: { ctrlKey: any; altKey: any; }; }; pointer: { DOM: any; }; nodes: string | any[]; }} */ params) {
                //self.network.setOptions({ physics: { enabled: false } });
                if (!self.data) {
                    return;
                }
                var startNode = self.data.nodes.get(params.nodes[0]);
                if (!startNode) {
                    return;
                }

                //move nodes of same group together
                if (startNode.group && !params.event.srcEvent.ctrlKey) {
                    self.movingNodeEndPosition = self.network.getPosition(params.nodes[0]);
                    var offset = {
                        x: self.movingNodeEndPosition.x - self.movingNodeStartPosition.x,
                        y: self.movingNodeEndPosition.y - self.movingNodeStartPosition.y,
                    };

                    var newNodes = [];
                    self.data.nodes.get().forEach(function (node) {
                        if (node.group.indexOf(startNode.group) > -1 && startNode.id != node.id) {
                            var position = self.network.getPosition(node.id);
                            newNodes.push({
                                id: node.id,
                                x: position.x + offset.x,
                                y: position.y + offset.y,
                                fixed: true,
                                color: node.color,
                            });
                        }
                    });
                    self.data.nodes.update(newNodes);
                }

                if (params.event.srcEvent.ctrlKey && options.dndCtrlFn) {
                    var dropCtrlNodeId = self.network.getNodeAt(params.pointer.DOM);
                    if (!dropCtrlNodeId) {
                        return;
                    }

                    var endNode = self.data.nodes.get(dropCtrlNodeId);

                    options.dndCtrlFn(startNode, endNode, params.pointer.DOM);
                }

                if (params.nodes.length == 1) {
                    /* if (true || (!params.event.srcEvent.ctrlKey && !self.currentContext.options.keepNodePositionOnDrag))
                    return;*/

                    var nodeId = params.nodes[0];

                    var node = self.data.nodes.get(nodeId);

                    self.lastMovedNode = nodeId;
                    //   var nodes = self.data.nodes.getIds();
                    var newNodes = [];
                    var fixed = true;
                    if (params.event.srcEvent.altKey) {
                        fixed = false;
                    }
                    var newNode = { id: nodeId, fixed: fixed };

                    newNodes.push(newNode);
                    if (!self.currentContext.options["layoutHierarchical"]) {
                        self.data.nodes.update(newNodes);
                    }
                }
            })
            .on("beforeDrawing", function () {
                var x = 3;
            });

        if (callback) {
            var intervalIncrement = 0;
            var interval = setInterval(function () {
                if (self.drawingDone || intervalIncrement > 100) {
                    clearInterval(interval);
                    return callback();
                }
                intervalIncrement += 1;
            }, 300);
        }
    };

    /**
     * Configures the graph layout (vertical or horizontal hierarchical) by updating layout and edge‑smoothness
     * settings, then triggers a full redraw of the Vis.js network. It adjusts direction, sorting, and animation
     * timing depending on the selected layout mode
     * @function
     * @name setLayout
     * @memberof module:VisjsGraphClass
     * @param {string} layout desired layout mode, "hierarchical vertical" or "hierarchical horizontal"
     * determines how nodes are arranged
     * @param {object} self.currentContext.options - internal, stores active graph options; updated with
     * new layout parameters
     * @returns {void}
     */
    self.setLayout = function (/** @type {string} */ layout) {
        if (layout == "hierarchical vertical") {
            self.currentContext.options.layoutHierarchical = {
                direction: "UD",
                sortMethod: "hubsize",
            };
            self.currentContext.options.edges = {
                smooth: {
                    type: "cubicBezier",
                    forceDirection: "vertical",
                    roundness: 0.1,
                },
            };
            self.currentContext.simulationTimeOut = 10000;

            self.redraw();
        } else if (layout == "hierarchical horizontal") {
            self.currentContext.options.layoutHierarchical = {
                direction: "LR",
                sortMethod: "hubsize",
                levelSeparation: 200,
            };
            self.currentContext.options.edges = {
                smooth: {
                    type: "cubicBezier",
                    forceDirection: "horizontal",

                    roundness: 0.4,
                },
            };

            self.redraw();
        } else {
            self.currentContext.options = {};
            self.redraw();
        }
    };
    /** call draw function
     * @function
     * @name redraw
     * @memberof module:VisjsGraphClass
     */
    self.redraw = function () {
        self.draw();
    };

    /**
     * Exports the current graph by enriching edges with their corresponding node objects and converting the full
     * edge list into a JSON string. This serialized graph data is then copied directly to the clipboard
     * @function
     * @name exportGraph
     * @memberof module:VisjsGraphClass
     * @returns {void}
     */
    self.exportGraph = function () {
        var nodes = self.data.nodes.get();
        var edges = self.data.edges.get();
        var nodesMap = {};
        nodes.forEach(function (/** @type {{ id: string | number; }} */ node) {
            nodesMap[node.id] = node;
        });
        edges.forEach(function (/** @type {{ fromNode: any; from: string | number; toNode: any; to: string | number; }} */ edge) {
            edge.fromNode = nodesMap[edge.from];
            edge.toNode = nodesMap[edge.to];
        });
        var str = JSON.stringify(edges);
        common.copyTextToClipboard(str);
    };

    /**
     * Rebuilds node references for each edge by linking fromNode and toNode using the existing node dataset,
     * then serializes the enriched edge list. It finally copies this JSON graph representation to the clipboard
     * @function
     * @name importGraph
     * @memberof module:VisjsGraphClass
     * @returns {void}
     */
    self.importGraph = function (/** @type {string} */ str) {
        var nodes = self.data.nodes.get();
        var edges = self.data.edges.get();
        var nodesMap = {};
        nodes.forEach(function (/** @type {{ id: string | number; }} */ node) {
            nodesMap[node.id] = node;
        });
        edges.forEach(function (/** @type {{ fromNode: any; from: string | number; toNode: any; to: string | number; }} */ edge) {
            edge.fromNode = nodesMap[edge.from];
            edge.toNode = nodesMap[edge.to];
        });
        str = JSON.stringify(edges);
        common.copyTextToClipboard(str);
    };

    /**
     * Completely resets the current graph by clearing all nodes and edges from their Vis.js datasets. It then
     * removes the internal self.data reference to ensure the graph state is fully emptied
     * It operates entirely on internal state: self.data.nodes and self.data.edges
     * Sets self.data = null, making the graph effectively empty and ready for a fresh initialization
     * @function
     * @name clearGraph
     * @memberof module:VisjsGraphClass
     * @returns {void}
     */
    self.clearGraph = function () {
        // comment ca marche  bad doc???

        if (self.data && self.data.edges && self.data.edges.clear) {
            //  var edges = self.data.edges.getIds();
            self.data.edges.clear();
        }
        if (self.data && self.data.nodes && self.data.nodes.clear) {
            self.data.nodes.clear();
        }

        self.data = null;
    };

    /**
     * Removes all nodes whose specified property matches a given value, and optionally removes edges with the
     * same property. It filters node and edge datasets, collects matching IDs, and deletes from the Vis.js graph
     * @function
     * @name removeNodes
     * @memberof module:VisjsGraphClass
     * @param {string|number} layout property name of nodes (and optionally edges) to check (e.g., "group", "type", "id")
     * @param {any} value expected value of that property; matching items will be removed
     * @param {boolean} removeEdges If true, edges with the same property/value pair are also removed
     * @returns {void}
     */
    self.removeNodes = function (/** @type {string | number} */ key, /** @type {any} */ value, /** @type {any} */ removeEdges) {
        /**
         * @type {any[]}
         */
        var nodeIds = [];
        var nodes = self.data.nodes.get();
        nodes.forEach(function (/** @type {{ [x: string]: any; id: any; }} */ node) {
            if (node[key] == value) {
                nodeIds.push(node.id);
            }
        });
        self.data.nodes.remove(nodeIds);

        if (removeEdges) {
            /**
             * @type {any[]}
             */
            var edgeIds = [];
            var edges = self.data.edges.get();
            edges.forEach(function (/** @type {{ [x: string]: any; id: any; }} */ edge) {
                if (edge[key] == value) {
                    edgeIds.push(edge.id);
                }
            });
            self.data.edges.remove(edgeIds);
        }
    };

    /**
     * Removes every node from the graph except those explicitly listed in nodesToKeep, and also
     * removes any edges connected to the deleted nodes
     * @function
     * @name removeOtherNodesFromGraph
     * @memberof module:VisjsGraphClass
     * @param {any} nodesToKeep node(s) that must remain in the graph; all others will be deleted
     * @returns {void}
     */
    (self.removeOtherNodesFromGraph = function (/** @type {any} */ nodesToKeep) {
        var nodes = self.data.nodes.get();
        /**
         * @type {any[]}
         */
        var nodeIds = [];
        if (!Array.isArray(nodesToKeep)) {
            nodesToKeep = [nodesToKeep];
        }
        nodes.forEach(function (/** @type {{ id: any; }} */ node) {
            if (!nodesToKeep.includes(node.id)) {
                nodeIds.push(node.id);
            }
        });
        self.data.nodes.remove(nodeIds);
        var edges = self.data.edges.get();
        /**
         * @type {any[]}
         */
        var edgesIds = [];
        edges.forEach(function (/** @type {{ from: any; to: any; id: any; }} */ edge) {
            if (nodeIds.indexOf(edge.from) > -1 || nodeIds.indexOf(edge.to) > -1) {
                edgesIds.push(edge.id);
            }
        });
        self.data.edges.remove(edgesIds);
    }),
        /**
         * Updates node sizes, labels, and font sizes dynamically based on the graph’s zoom level to maintain readability.
         * It recalculates visual properties only when the scale changes significantly
         * @function
         * @name onScaleChange
         * @memberof module:VisjsGraphClass
         * @returns {void}
         */
        (self.onScaleChange = function () {
            if (!self.data || !self.data.nodes) {
                return;
            }
            var scale = self.network.getScale();
            if (!self.currentScale || Math.abs(scale - self.currentScale) > 0.01) {
                var scaleCoef = scale >= 1 ? scale * 0.9 : scale * 2;

                var size = self.defaultNodeSize / scaleCoef;
                var fontSize = self.defaultTextSize / scaleCoef;
                if (scale < 1) {
                    fontSize = self.defaultTextSize / 1;
                } //fontSize = (self.defaultTextSize / (scaleCoef * 0.8));
                else {
                    fontSize = self.defaultTextSize / (scaleCoef * 1.3);
                }

                var nodes = self.data.nodes.get();
                nodes.forEach(function (/** @type {{ size: number; originalSize: number; hiddenLabel: any; label: null; shape: any; font: { size: number; }; }} */ node) {
                    if (node.size) {
                        if (!node.originalSize) {
                            node.originalSize = node.size;
                        }
                        size = node.originalSize * scaleCoef;
                    }
                    if (!node.hiddenLabel) {
                        node.hiddenLabel = node.label;
                    }
                    var shape = node.shape;
                    if (!shape) {
                        shape = self.defaultNodeShape;
                    }
                    if (shape != "box") {
                        if (scale > self.showNodesLabelMinScale) {
                            node.label = node.hiddenLabel;
                            node.size = size;
                            node.font = { size: fontSize };
                            self.labelsVisible = true;
                            //node.fixed = false;
                        } else {
                            node.label = null;
                            node.size = size;
                            node.font = { size: fontSize };
                        }

                        //nodes.push(node);
                    }
                    if (node.x || node.y) {
                        var currentPositions = self.network.getPositions(node.id);
                        node.x = currentPositions[node.id].x;
                        node.y = currentPositions[node.id].y;
                    }
                });

                self.data.nodes.update(nodes);
            }
            self.currentScale = scale;
        });

    /**
     * builds a lookup map of all existing node IDs — and optionally edge IDs — currently present in the Vis.js graph
     * It returns an object where each ID is used as a key for fast existence checks
     * @function
     * @name getExistingIdsMap
     * @memberof module:VisjsGraphClass
     * @param {boolean} nodesOnly truth, only node IDs are included; false, both node IDs and edge IDs are added to map
     * @returns {object} existingVisjsIds used as a set where each existing ID maps to 1
     */
    self.getExistingIdsMap = function (/** @type {any} */ nodesOnly) {
        var existingVisjsIds = {};
        if (!self.data || !self.data.nodes || self.data.nodes.length == 0) {
            return {};
        }
        var oldIds = self.data.nodes.getIds();
        if (!nodesOnly) {
            oldIds = oldIds.concat(self.data.edges.getIds());
        }
        oldIds.forEach(function (/** @type {string | number} */ id) {
            existingVisjsIds[id] = 1;
        });
        return existingVisjsIds;
    };

    /** check if the graph contains any nodes
     * @function
     * @name isGraphNotEmpty
     * @memberof module:VisjsGraphClass
     */
    self.isGraphNotEmpty = function () {
        // if(self.isGraphNotEmpty()){
        return Object.keys(self.getExistingIdsMap()).length > 0;
    };

    /** convert the current graph data to CSV format and copies it to the system clipboard
     * @function
     * @name graphCsvToClipBoard
     * @memberof module:VisjsGraphClass
     */
    self.graphCsvToClipBoard = function () {
        var csv = self.toCsv();
        common.copyTextToClipboard(csv, function (/** @type {any} */ err, /** @type {any} */ _result) {
            if (err) {
                UI.message(err);
            }
            UI.message("csv copied in system clipboard");
        });
    };

    /**
     * Converts the current graph (nodes and edges) into a CSV‑formatted string, optionally including extra node data
     * fields. It builds CSV rows for isolated nodes and for each edge by combining the source node, edge label, and
     * target node into a readable line
     * @function
     * @name toCsv
     * @memberof module:VisjsGraphClass
     * @param {any} dataFields optional list of node data fields to append
     * @returns {string} csvStr, string containing the full CSV representation of the graph
     */
    self.toCsv = function (/** @type {any[]} */ dataFields) {
        var sep = ",";
        if (dataFields && !Array.isArray(dataFields)) {
            dataFields = [dataFields];
        }

        var nodes = self.data.nodes.get();
        var edges = self.data.edges.get();
        var nodesMap = {};
        var csvStr = "";

        /**
         * @param {{ id: string; label: string; data: { [x: string]: string; }; }} node
         */
        function getNodeStr(node) {
            if (node) {
                var str = node.id + sep + node.label;
            }
            if (dataFields && node.data) {
                sep +
                    dataFields.forEach(function (/** @type {string | number} */ field) {
                        str += node.data[field];
                    });
            }

            return str;
        }

        nodes.forEach(function (/** @type {{ id: string | number; }} */ node) {
            nodesMap[node.id] = node;
            if (edges.length == 0) {
                csvStr += getNodeStr(node) + "\n";
            }
        });
        edges.sort(function (/** @type {{ from: number; }} */ a, /** @type {{ from: number; }} */ b) {
            if (a.from > b.from) {
                return 1;
            }
            if (a.from < b.from) {
                return -1;
            }
            return 0;
        });
        edges.forEach(function (/** @type {{ label: string; from: string | number; to: string | number; }} */ edge) {
            var edgeLabel = "->";
            if (edge.label) {
                edgeLabel = edge.label;
            }
            csvStr += getNodeStr(nodesMap[edge.from]) + sep + edgeLabel + sep + getNodeStr(nodesMap[edge.to]) + "\n";
        });

        return csvStr;
    };

    /**
     * Recursively finds all descendant nodes reachable from one or several starting nodes by following outgoing
     * edges. It returns a list of child node IDs, optionally including the original parent nodes
     * @function
     * @name getNodeDescendantIds
     * @memberof module:VisjsGraphClass
     * @param {any} nodeIds node ID or an array of node IDs from which descendant traversal begins
     * @param {any} includeParents if truth, the starting node IDs are also included in the returned list
     * @returns {array} nodes array of descendant IDs (and optionally parents)
     */
    self.getNodeDescendantIds = function (/** @type {any[]} */ nodeIds, /** @type {any} */ includeParents) {
        if (!Array.isArray(nodeIds)) {
            nodeIds = [nodeIds];
        }
        var nodes = [];
        if (includeParents) {
            nodes = nodeIds;
        }
        var allEdges = self.data.edges.get();
        var allNodes = {};

        /**
         * @param {any} nodeId
         */
        function recurse(nodeId) {
            allEdges.forEach(function (/** @type {{ from: any; to: string | number; }} */ edge) {
                if (edge.from == nodeId) {
                    if (!allNodes[edge.to]) {
                        allNodes[edge.to] = 1;
                        nodes.push(edge.to);
                        recurse(edge.to);
                    }
                }
                /* if(includeParents && edge.to == nodeId){
                        nodes.push(edge.from)
                        recurse(edge.from)
                        }
                */
            });
        }

        nodeIds.forEach(function (/** @type {any} */ parentId) {
            recurse(parentId);
        });
        return nodes;
    };

    /**
     * Returns the collection of node objects corresponding to all descendant IDs (expanded via getNodeDescendantIds)
     * @function
     * @name getNodeDescendant
     * @memberof module:VisjsGraphClass
     * @param {any} nodeIds node ID or an array of node IDs from which descendant traversal begins
     * @param {any} includeParents if truth, the starting node IDs are also included in the returned list
     * @returns {array} nodes objects array of descendant Ids
     */
    self.getNodeDescendants = function (/** @type {any} */ nodeIds, /** @type {any} */ includeParents) {
        nodeIds = self.getNodeDescendantIds(nodeIds, includeParents);
        return self.data.nodes.get(nodeIds);
    };

    /**
     * Returns an object containing the current positions of all nodes in the network,
     * obtained from self.network.getPositions()
     * @function
     * @name getNodesPosition
     * @memberof module:VisjsGraphClass
     * @returns {object} positions of all nodes in the network
     */
    self.getNodesPosition = function () {
        var positions = self.network.getPositions();
        return positions;
    };

    /**
     * Returns an array of edge objects connected to the source node, optionally restricted to those leading
     * to the given target node
     * @function
     * @name getNodeEdges
     * @memberof module:VisjsGraphClass
     * @param {string} sourceNodeId ID of the source node
     * @param {string} targetNodeId optional, filters to edges whose to equals this ID
     * @returns {object} connectedEdges array
     */
    self.getNodeEdges = function (sourceNodeId, targetNodeId) {
        var connectedEdges = [];
        var sourceNodeEdges = self.network.getConnectedEdges(sourceNodeId);
        sourceNodeEdges.forEach(function (edgeId) {
            var edge = self.data.edges.get(edgeId);
            if (!targetNodeId || edge.to == targetNodeId) {
                connectedEdges.push(edge);
            }
        });
        return connectedEdges;
    };

    /**
     * Finds all edges connected to sourceNodeId, and for each edge that is either outgoing from the source or
     * (if bothDirections is true) in any direction, it returns the edge plus its from and to node objects
     * @function
     * @name getNodeEdgesAndToNodes
     * @memberof module:VisjsGraphClass
     * @param {string} sourceNodeId ID of the source node
     * @param {boolean} bothDirections  if true, include edges in both directions; if false, include only edges
     * @returns {object} connectedEdges array where Edge typically has id and Node is a node object (IDs usually
     * string | number in vis-network/vis-data)
     */
    self.getFromNodeEdgesAndToNodes = function (sourceNodeId, bothDirections) {
        var connectedEdges = [];
        var sourceNodeEdges = self.network.getConnectedEdges(sourceNodeId);
        sourceNodeEdges.forEach(function (edgeId) {
            var edge = self.data.edges.get(edgeId);
            var fromNode = self.data.nodes.get(edge.from);
            if (bothDirections || edge.from == sourceNodeId) {
                var toNode = self.data.nodes.get(edge.to);
                connectedEdges.push({ edge: edge, fromNode: fromNode, toNode: toNode });
            }
        });
        return connectedEdges;
    };

    /**
     * Handles single and double click events on a graph to control simulation and select elements
     * Toggles the physics simulation on empty clicks, and detects modifier keys (Ctrl/Alt/Shift)
     * On node, cluster, or edge selection, it builds a context object and calls the appropriate callback
     * @function
     * @name processClicks
     * @memberof module:VisjsGraphClass
     * @param {objet} params information about what was clicked and the pointer state
     * @param {objet} _options configuration and callback handlers
     * @param {boolean} isDbleClick indicates whether the click should be treated as a double click
     * @returns {void} return the result of onClusterClickFn or onclickFn when invoked
     *  side effects:
     *      - starting/stopping the network simulation
     *      - updating self.context.currentNode
     *      - calling user-provided callbacks with click context data
     */
    self.processClicks = function (
        /** @type {{ edges: string | any[]; nodes: string | any[]; event: { srcEvent: { ctrlKey: any; altKey: any; shiftKey: any; }; }; pointer: { DOM: any; }; }} */ params,
        /** @type {{ fixedLayout: any; onclickFn: (arg0: null, arg1: any, arg2: { dbleClick?: any; ctrlKey?: number; altKey?: number; shiftKey?: number; }) => void; onClusterClickFn: (arg0: any, arg1: any, arg2: { dbleClick: any; ctrlKey: number; altKey: number; shiftKey: number; }) => any; }} */ _options,
        /** @type {any} */ isDbleClick,
    ) {
        var now = new Date();
        if (now - lastClickTime < dbleClickIntervalDuration) {
            lastClickTime = now;
            return;
        }

        if (params.edges.length == 0 && params.nodes.length == 0) {
            //simple click stop animation

            if (self.simulationOn || _options.fixedLayout) {
                self.network.stopSimulation();
            } else {
                self.network.startSimulation();
            }
            self.simulationOn = !self.simulationOn;
            // graphController.hideNodePopover();
            if (_options.onclickFn) {
                _options.onclickFn(null, point, {});
            }
        }

        // select node
        else if (params.nodes.length == 1) {
            self.network.stopSimulation();
            const options = {
                dbleClick: isDbleClick,
                ctrlKey: params.event.srcEvent.ctrlKey ? 1 : 0,
                altKey: params.event.srcEvent.altKey ? 1 : 0,
                shiftKey: params.event.srcEvent.shiftKey ? 1 : 0,
            };
            var point = params.pointer.DOM;
            var nodeId = params.nodes[0];
            var node = self.data.nodes.get(nodeId);
            if (!node && self.network.isCluster(nodeId)) {
                if (_options.onClusterClickFn) {
                    return _options.onClusterClickFn(nodeId, point, options);
                } else {
                    if (_options.onclickFn) {
                        return _options.onclickFn({ id: nodeId }, point, options);
                    }
                }
            }

            node._graphPosition = params.pointer.DOM;

            self.context.currentNode = node;

            if (_options.onclickFn) {
                _options.onclickFn(node, point, options);
            }
        }

        //select edge{
        else if (params.edges.length == 1) {
            var edgeId = params.edges[0];
            var edge = self.data.edges.get(edgeId);
            edge.fromNode = self.data.nodes.get(edge.from);
            edge.toNode = self.data.nodes.get(edge.to);
            const point = params.pointer.DOM;
            const options = {
                dbleClick: isDbleClick,
                ctrlKey: params.event.srcEvent.ctrlKey ? 1 : 0,
                altKey: params.event.srcEvent.altKey ? 1 : 0,
                shiftKey: params.event.srcEvent.shiftKey ? 1 : 0,
            };
            if (_options.onclickFn) {
                _options.onclickFn(edge, point, options);
            }
        }
    };

    /**
     * Finds all outgoing edges from a given node and collects the connected target nodes and edge IDs
     * Removes those edges and nodes from the graph, effectively collapsing the node
     * @function
     * @name collapseNode
     * @memberof module:VisjsGraphClass
     * @param {any} nodeId identifier of the node to collapse. All edges starting from this node and their
     * destination nodes will be removed
     * @returns {void} return the result of onClusterClickFn or onclickFn when invoked
     *  side effects:
     *      - Removes all edges where edge.from === nodeId
     *      - Removes all destination nodes connected by those edges
     *      - Mutates the graph by updating self.data.edges and self.data.node
     */
    self.collapseNode = function (/** @type {any} */ nodeId) {
        var nodeEdges = self.data.edges.get();
        /**
         * @type {any[]}
         */
        var targetEdges = [];
        /**
         * @type {any[]}
         */
        var targetNodes = [];
        nodeEdges.forEach(function (/** @type {{ from: any; id: any; to: any; }} */ edge) {
            if (edge.from == nodeId) {
                targetEdges.push(edge.id);
                if (targetNodes.indexOf(edge.to) < 0) {
                    targetNodes.push(edge.to);
                }
            }
        });
        self.data.edges.remove(targetEdges);
        self.data.nodes.remove(targetNodes);
    };

    /**
     * Highlights a specific node by changing its shape and size and resets all other nodes to
     * their default appearance. Animates the graph view to center and focus on the selected node
     * @function
     * @name focusOnNode
     * @memberof module:VisjsGraphClass
     * @param {any} id (string | number) identifier of the node to focus on
     * @param {any} _label Unused parameter (likely kept for API compatibility or future use)
     * @returns {void} return the result of onClusterClickFn or onclickFn when invoked
     *  side effects :
     *      - updates all nodes in self.data.nodes:
     *              - Target node → shape: "star", size: 14
     *              - Other nodes → default shape and size
     *      - animates the network viewport to center on the target node
     */
    self.focusOnNode = function (/** @type {any} */ id, /** @type {any} */ _label) {
        if (id) {
            /**
             * @type {{ id: any; shape: string; size: any; }[]}
             */
            var newNodes = [];
            self.data.nodes.getIds().forEach(function (/** @type {any} */ nodeId) {
                var shape = self.defaultShape;
                var size = self.defaultNodeSize;
                if (nodeId == id) {
                    shape = "star";
                    size = 14;
                }
                newNodes.push({ id: nodeId, shape: shape, size: size });
            });
            self.data.nodes.update(newNodes);

            setTimeout(function () {
                self.network.focus(id, {
                    scale: 1,
                    animation: true,
                });
            }, 100);
        }
    };

    /**
     * Iterates over all nodes in the graph and checks them against given conditions and selects nodes whose data
     * properties match the condition values. It updates a visual property for all matching nodes
     * @function
     * @name setNodesProperty
     * @memberof module:VisjsGraphClass
     * @param {object} conditions (string | any) map of node data properties and expected values
     * @param {any} hide bolean hidden property of matching nodes (e.g. true to hide, false to show)
     * @returns {void}
     *  side effects :
     *      - mutates node visibility by calling self.data.nodes.update
     *      - only nodes matching at least one condition key are affected
     */
    self.setNodesProperty = function (/** @type {{ [x: string]: any; }} */ conditions, /** @type {any} */ hide) {
        var nodes = self.data.nodes.get();
        /**
         * @type {{ id: any; hidden: any; }[]}
         */
        var newNodes = [];
        nodes.forEach(function (/** @type {{ data: { [x: string]: any; }; id: any; }} */ node) {
            for (var key in conditions) {
                if (node.data[key] == conditions[key]) {
                    newNodes.push({ id: node.id, hidden: hide });
                }
            }
        });
        self.data.nodes.update(newNodes);
    };

    /**
     * Scans all graph nodes and compares their data fields to given conditions and collects nodes whose
     * properties match the specified values. Hides or shows nodes by updating their hidden property
     * @function
     * @name hideShowNodes
     * @memberof module:VisjsGraphClass
     * @param {object} conditions (string | any) Key–value pairs used to match against node.data
     * a node is selected if node.data[key] == conditions[key] for any key
     * @param {any} hide bolean true to hide matching nodes, false to show matching nodes
     * @returns {void}
     *  side effects :
     *      - Updates visibility of matching nodes via self.data.nodes.update
     *      - Modifies only nodes that satisfy at least one condition
     */
    self.hideShowNodes = function (/** @type {{ [x: string]: any; }} */ conditions, /** @type {any} */ hide) {
        var nodes = self.data.nodes.get();
        /**
         * @type {{ id: any; hidden: any; }[]}
         */
        var newNodes = [];
        nodes.forEach(function (/** @type {{ data: { [x: string]: any; }; id: any; }} */ node) {
            for (var key in conditions) {
                if (node.data[key] == conditions[key]) {
                    newNodes.push({ id: node.id, hidden: hide });
                }
            }
        });
        self.data.nodes.update(newNodes);
    };

    /**
     * Converts the current graph (nodes and edges) into a Graphviz DOT description and sends the DOT
     * graph to a backend API to render it as SVG .It also receives the generated SVG text asynchronously
     * via an AJAX request.
     * @function
     * @name toSVG_graphviz
     * @memberof module:VisjsGraphClass
     * @returns {void}
     * Uses internal graph state:
     *      - self.data.nodes — collection of nodes
     *      - self.data.edges — collection of edges
     *  side effects :
     *      - builds a Graphviz DOT string representing the directed graph
     *      - sends an HTTP GET request to a backend Graphviz service
     *      - logs a status message ("getting Class axioms").
     */
    self.toSVG_graphviz = function () {
        var nodes = self.data.nodes.get();
        var edges = self.data.edges.get();

        var nodesMap = {};
        nodes.forEach(function (node) {
            nodesMap[node.id] = node;
        });

        var str = "digraph G {\n";

        edges.forEach(function (edge) {
            str += nodesMap[edge.from].label + "->" + nodesMap[edge.to].label + ";\n";
        });
        str += "}";

        var payload = {
            dotStr: str,
            format: "svg",
            output: "text",
        };
        const params = new URLSearchParams(payload);
        Axiom_editor.message("getting Class axioms");
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/graphvis?" + params.toString(),
            dataType: "text",

            success: function (data, _textStatus, _jqXHR) {
                var svg = JSON.parse(data).result;
                //  return callback(null,data.result)
                //  callback(null, data);
            },
            error(err) {
                callback(err.responseText);
            },
        });

        return;
    };

    /**
     * Export the current graph as an SVG file
     * @function
     * @name toSVG
     * @memberof module:VisjsGraphClass
     */
    self.toSVG = function () {
        SVGexport2.toSVG(self);
        //self.redraw();
    };

    /**
     * Convert the current Vis.js nodes and edges into a GraphML string
     * @function
     * @name toGraphMl
     * @memberof module:VisjsGraphClass
     */
    self.toGraphMl = function () {
        var visjsData = {
            nodes: self.data.nodes.get(),
            edges: self.data.edges.get(),
        };
        var xmlStr = GraphMlExport.VisjsDataToGraphMl(visjsData);

        download(xmlStr, "SLSwhiteboard.graphml", "graphml");
        // common.copyTextToClipboard(xmlStr);
    };

    /**
     * Searches graph nodes by label text or node id. Matching nodes are visually highlighted
     * (star shape, bigger size). First match is automatically focused/zoomed in the network view
     * @function
     * @name searchNode
     * @memberof module:VisjsGraphClass
     * @param {any} id optional, exact node ID to search for
     * @param {string} id optional, text to match against node labels (case-insensitive)
     *                    if not provided, it reads from #visjsGraph_searchInput
     * @returns {void}
     *  side effects :
     *      - updates node styles in the graph and focuses the first matching node
     */
    self.searchNode = function (id, word) {
        if (!word || word == "") {
            word = $("#visjsGraph_searchInput").val();
            if (word == "" && !id) {
                return;
            }
        }
        if (!self.data || !self.data.nodes) {
            return;
        }
        var nodes = self.data.nodes.get();
        /**
         * @type {any[]}
         */
        var matches = [];
        /**
         * @type {{ id: any; shape: string; size: any; }[]}
         */
        var newNodes = [];
        nodes.forEach(function (/** @type {{ data: { label: string; }; id: any; }} */ node) {
            var shape = self.defaultShape;
            if (node.shape && node.shape != "star") {
                shape = node.shape;
            }
            var size = self.defaultNodeSize;
            var ok = false;
            if (word) {
                ok = node.data && node.data.label && node.data.label.toLowerCase().indexOf(word.toLowerCase()) > -1;
            }
            if (id) {
                ok = node.id == id;
            }
            if (k) {
                shape = "star";
                size = 14;
                matches.push(node.id);
            }
            newNodes.push({ id: node.id, shape: shape, size: size });
        });
        self.data.nodes.update(newNodes);
        matches.forEach(function (match, index) {
            if (index == 0) {
                setTimeout(function () {
                    self.network.focus(match, {
                        scale: 1,
                        animation: true,
                    });
                }, 500);
            }
        });
    };

    /**
     * Serialize the current graph (nodes, edges, layout, and context). It converts functions
     * to strings (unless raw is true) and builds a JSON file
     * @function
     * @name saveGraph
     * @memberof module:VisjsGraphClass
     * @param {string} fileName optional, Name of the graph file to save
     * @param {boolean} raw optional, if true, skips converting functions to string
     * @param {object} options optional, extra save options
     * @returns {void}
     *  side effects :
     *      - sends a POST request to save the graph JSON, updates the UI
     *      - optionally triggers a callback
     */
    self.saveGraph = function (fileName, raw, options) {
        if (!self.currentContext) {
            return;
        }
        var positions = self.network.getPositions();

        if (!raw) {
            for (var key in self.currentContext.options) {
                if (key.indexOf("Fn") > 0) {
                    self.currentContext.options[key] = self.currentContext.options[key].toString();
                }
            }
        }

        var nodes = self.data.nodes.get();

        var data = {
            nodes: nodes,
            edges: self.data.edges.get(),
            context: self.currentContext,
            positions: positions,
        };
        if (options) {
            data.options = options;
        } else {
            options = {};
        }
        if (!fileName) {
            fileName = prompt("graph name");
        }
        if (!fileName || fileName == "") {
            return;
        }
        if (fileName.indexOf(".json") < 0) {
            fileName = fileName + ".json";
        }
        var payload = {
            fileName: fileName,
            data: data,
        };
        var payload = {
            dir: "graphs/",
            fileName: fileName,
            data: JSON.stringify(data, null, 2),
        };

        $.ajax({
            type: "POST",
            url: `${Config.apiUrl}/data/file`,
            data: payload,
            dataType: "json",
            success: function (_result, _textStatus, _jqXHR) {
                $("#visjsGraph_savedGraphsSelect").append($("<option></option>").attr("value", fileName).text(fileName));
                UI.message("graph saved");
                if (options.callback) {
                    return options.callback();
                }
            },
            error(err) {
                return MainController.errorAlert(err);
            },
        });
    };

    /**
     * Export the current graph as an SVG file
     * @function
     * @name toSVG
     * @memberof module:VisjsGraphClass
     */
    self.message = function (/** @type {string | JQuery.Node | ((this: HTMLElement, index: number, oldhtml: string) => string | JQuery.Node)} */ message) {
        $("#VisJsGraph_message").html(message);
    };

    /**
     * Serialize the current graph (nodes, edges, layout, and context). It converts functions
     * to strings (unless raw is true) and builds a JSON file
     * @function
     * @name loadGraph
     * @memberof module:VisjsGraphClass
     * @param {string} fileName optional, Name of the graph file to load
     * @param {boolean} add optional, if true, forces adding the graph to the existing one
     * @param {function} callback optional, Called after load (or on error) with (err, visjsData)
     * @param {boolean} dontDraw optional, if true, returns processed data without drawing the graph
     * @param {function} dataProcessorFn optional, transform the loaded data before use
     * @returns {void}
     *  side effects :
     *      - performs an AJAX GET, updates graph data/visuals, fits the network
     *      - triggers callbacks or error handling
     */
    self.loadGraph = function (fileName, add, callback, dontDraw, dataProcessorFn) {
        if (!fileName) {
            fileName = $("#visjsGraph_savedGraphsSelect").val();
        }
        var addToCurrentGraph = $("#visjsGraph_addToCurrentGraphCBX").prop("checked");
        if (!fileName || fileName == "") {
            return;
        }

        self.message("Loading Graph...");

        var payload = {
            dir: "graphs/",
            fileName: fileName,
        };

        $.ajax({
            type: "GET",
            url: `${Config.apiUrl}/data/file`,
            data: payload,
            dataType: "json",
            success: function (result, _textStatus, _jqXHR) {
                var data = JSON.parse(result);
                if (dataProcessorFn) {
                    data = dataProcessorFn(data);
                }
                var positions = data.positions;
                var options = data.context.options;
                var visjsData = { nodes: [], edges: [] };
                visjsData.options = data.options;
                var existingNodes = {};
                if (addToCurrentGraph) {
                    existingNodes = self.getExistingIdsMap();
                }
                data.nodes.forEach(function (node) {
                    if (!existingNodes[node.id]) {
                        existingNodes[node.id] = 1;
                        if (positions[node.id]) {
                            node.x = positions[node.id].x;
                            node.y = positions[node.id].y;
                        }
                        visjsData.nodes.push(node);
                    }
                });

                data.edges.forEach(function (/** @type {{ id: string | number; }} */ edge) {
                    if (!existingNodes[edge.id]) {
                        existingNodes[edge.id] = 1;
                        visjsData.edges.push(edge);
                    }
                });

                if (dontDraw && callback) {
                    return callback(null, visjsData);
                }

                if (add || (addToCurrentGraph && self.data.nodes && self.data.nodes.getIds().length > 0)) {
                    self.data.nodes.add(visjsData.nodes);
                    self.data.edges.add(visjsData.edges);
                    self.message("");
                } else {
                    //functions
                    var context = JSON.parse(JSON.stringify(data.context).replace(/self./g, "Lineage_whiteboard."));

                    if (context.callback) {
                        callback = context.callback;
                    }
                    if (self.data.nodes || self.isGraphNotEmpty()) {
                        self.data.edges.add(visjsData.edges);
                        self.data.nodes.add(visjsData.nodes);

                        self.network.fit();
                        if (callback) {
                            return callback(null, visjsData);
                        }
                    } else {
                        self.draw(function () {
                            self.network.fit();
                            if (callback) {
                                return callback(null, visjsData);
                            }
                        });
                    }

                    self.message("");
                }
            },
            error(err) {
                if (callback) {
                    return callback(err);
                }
                if (err.responseJSON == "file does not exist") {
                    return;
                }
                return MainController.errorAlert(err);
            },
        });
    };

    /**
     * Load graphs from the "/data/graphs" directory
     *
     * The loaded graphs are then added as options to the `select` element with
     * id "visjsGraph_savedGraphsSelect".
     *
     * @param {(err: string | null, result?: string[]) => void} callback
     *
     * @todo Can't find the place where visjsGraph_savedGraphsSelect is
     * declared in HTML files.
     */
    self.listSavedGraphs = function (callback) {
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/data/files",
            data: { dir: "graphs" },
            dataType: "json",
            success: function (result, _textStatus, _jqXHR) {
                if (callback) {
                    return callback(null, result);
                }
                common.fillSelectOptions("visjsGraph_savedGraphsSelect", result, true);
            },
            error(_jqXHR, _status, err) {
                if (callback) {
                    return callback(err);
                }
                return MainController.errorAlert(err);
            },
        });
    };

    /**
     * Updates visual or data attributes of selected graph nodes
     * @function
     * @name decorateNodes
     * @memberof module:VisjsGraphClass
     * @param {any} nodeIds single nodeID array of node IDs or null to target all nodes
     * @param {object} attrsMap key–value map of attributes to apply
     * @returns {void}
     *  side effects :
     *      - updates node properties in the graph’s data store and refreshes their appearance
     */
    self.decorateNodes = function (nodeIds, attrsMap) {
        if (nodeIds && !Array.isArray(nodeIds)) {
            nodeIds = [nodeIds];
        }
        var newIds = [];
        self.data.nodes.getIds().forEach(function (nodeId) {
            if (!nodeIds || nodeIds.indexOf(nodeId) > -1) {
                var obj = { id: nodeId };
                for (var attrName in attrsMap) {
                    obj[attrName] = attrsMap[attrName];
                }
                newIds.push(obj);
            }
        });
        self.data.nodes.update(newIds);
    };

    /**
     * Open and configures a UI panel to edit graph display and physics settings
     * It injects a theme selector (white/dark) and enables vis.js config controls
     * @function
     * @name showGraphConfig
     * @memberof module:VisjsGraphClass
     * @returns {void}
     *  side effects :
     *      - modifies DOM elements, updates network configuration options
     *      - opens a dialog for graph parameter editing
     */
    self.showGraphConfig = function () {
        $("#graphDisplay_theme").remove();
        $("#visjsConfigureDiv").parent().css("left", "20%");
        $("#visjsConfigureDiv").parent().css("overflow-y", "auto !important");
        $("#visjsConfigureDiv").parent().css("height", "550px !important");
        $("#visjsConfigureDiv").prepend(
            "<div id='graphDisplay_theme' class='div.vis-configuration.vis-config-item '>theme" +
                "<select onchange='Lineage_sources.setTheme($(this).val())' >" +
                "<option>white</option>" +
                "<option>dark</option>" +
                "</select></div>",
        );
        // these are all options in full.
        var options = {
            configure: {
                enabled: true,
                filter: "physics,layout,manipulation,renderer",

                container: document.getElementById("visjsConfigureDiv"),
                showButton: true,
            },
        };
        self.network.setOptions(options);
        $("#visjsConfigureDiv").dialog({
            //   autoOpen: false,
            height: 700,
            width: 550,
            modal: false,
            title: "Graph parameters",
        });
        setTimeout(function () {
            $("#visjsConfigureDiv").css("overflow-y", "auto !important");
            $("#visjsConfigureDiv").css("height", "550px !important");
        }, 2000);
    };

    /**
     * @function
     * @name exportGraphToDataTable
     * @memberof module:graphActions.graph
     * *@param {boolean} exportData - If true, exports visjsGraph elements directy without using dataTable
     * Exports the graph data to a tabular format (data table) for easier inspection and manipulation.
     * @returns {void}
     */
    self.exportGraphToDataTable = function (exportData) {
        Export.exportGraphToDataTable(self, null, null, null, exportData);
    };

    /**
     * Converts the current graph to PlantUML format
     *
     * @function
     * @name toPlantUML
     * @memberof VisjsGraphClass
     * @param {boolean} [exportToFile] - If true, exports to a file; if false, returns the PlantUML string
     * @param {string} [fileName] - Name of the file to export (only used if exportToFile is true)
     * @returns {string|void} Returns the PlantUML string if exportToFile is false, otherwise exports to file
     */
    self.toPlantUML = function (exportToFile, fileName) {
        var visjsData = {
            nodes: self.data.nodes.get(),
            edges: self.data.edges.get(),
        };

        var plantUMLString = PlantUmlTransformer.visjsDataToClassDiagram(visjsData, exportToFile);

        if (exportToFile) {
            if (!fileName) {
                fileName = "diagram";
            }
            Export.exportPlantUML(plantUMLString, fileName);
        }
    };

    /**
     * Open and configures a UI panel to edit graph display and physics settings
     * It injects a theme selector (white/dark) and enables vis.js config controls
     * @function
     * @name addSelectNode
     * @memberof module:VisjsGraphClass
     * @param {any} newNodeId ID of the node to add to the current selection
     * @returns {void}
     *  side effects :
     *      - updates the network’s selected nodes visually in the graph
     */
    self.addSelectNode = function (newNodeId) {
        var selectedNodes = self.network.getSelectedNodes();

        if (!selectedNodes.includes(newNodeId)) {
            selectedNodes.push(newNodeId);
        }
        self.network.selectNodes(selectedNodes);
    };

    /**
     * Set a specific set of nodes as selected in the graph. It handles both single node IDs,
     * node objects or arrays, ensuring uniqueness. The selection is updated visually and stored
     * in a global selection tracker
     * @function
     * @name setSelectedNodes
     * @memberof module:VisjsGraphClass
     * @param {any|object} nodes node ID(s) or node object(s) to select
     * @returns {void}
     *  side effects :
     *      - updates the network’s selected nodes visually and updates Lineage_selection.selectedNodes
     */
    self.setSelectedNodes = function (nodes) {
        if (!nodes) {
            return;
        }
        if (!Array.isArray(nodes)) {
            nodes = [nodes];
        }
        /*if (!(nodes.length > 0)) {
            return;
        }*/
        var selectedNodes = [];
        nodes.forEach(function (node) {
            if (node?.id) {
                selectedNodes.push(node?.id);
            } else {
                selectedNodes.push(node);
            }
        });
        selectedNodes = common.array.distinctValues(selectedNodes);
        self.network.selectNodes(selectedNodes);
        Lineage_selection.selectedNodes = selectedNodes;
    };
};
export default VisjsGraphClass;
window.VisjsGraphClass = VisjsGraphClass;
