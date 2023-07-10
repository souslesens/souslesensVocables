import common from "../shared/common.js";
import SVGexport from "./SVGexport.js";
import GraphMlExport from "./graphMLexport.js";

const VisjsGraphClass = function (graphDiv, data, options) {
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

    self.defaultTextSize = 14;
    self.defaultNodeSize = 7;
    self.showNodesLabelMinScale = 0.5;
    self.currentContext;
    self.drawingDone = false;
    self.skipColorGraphNodesByType = false;
    var lastClickTime = new Date();
    var dbleClickIntervalDuration = 500;

    self.draw = function (callback) {
        var divId = self.graphDiv;
        var visjsData = self.data;
        var _options = self.options;

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

        var nodesDataSet = new vis.DataSet(visjsData.nodes);
        var edgesDataSet = new vis.DataSet(visjsData.edges);
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
                shape: "dot",
                size: 12,
                chosen: { node: true },
                // scaling:{min:6,max:20}
            },
            edges: {
                //  scaling:{min:1,max:8}
            },
            layout: { improvedLayout: false },
        };

        for (var key in _options) {
            options[key] = _options[key];
        }

        if (_options.layoutHierarchical) {
            options.layout = {
                hierarchical: _options.layoutHierarchical,
            };
            options.physics = { enabled: false };
        } else {
            $("#visjsGraph_layoutSelect").val("");
        }

        if (_options.skipColorGraphNodesByType) {
            self.skipColorGraphNodesByType = true;
        }

        self.globalOptions = options;
        self.network = new vis.Network(container, self.data, options);
        self.simulationOn = true;

        // self.network.startSimulation()

        /*  window.setTimeout(function () {
        return;
        // if (!_options.layoutHierarchical) {
        //     if (!self.network.stopSimulation) return;
        //     self.network.stopSimulation();
        //     if (!_options.noFit) self.network.fit();
        //     self.simulationOn = false;
        //     if (_options.afterDrawing) _options.afterDrawing();
        // }
    }, self.simulationTimeOut);*/

        self.network.on("afterDrawing", function (/** @type {any} */ _params) {
            self.drawingDone = true;
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
                        obj = self.data.edges.get(objId);
                        if (obj) {
                            _options.onRightClickFn(obj, point, params.event);
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
                console.log(self.network.getNodeAt(params.pointer.DOM.x, params.pointer.DOM.y));
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
                // $("#graphPopupDiv").css("display", "none")
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
                //   var nodes = self.data.nodes.getIds();
                var newNodes = [];
                var fixed = false;
                /*  if (params.event.srcEvent.altKey)
      fixed = false;*/
                newNodes.push({ id: nodeId, fixed: fixed });
                self.data.nodes.update(newNodes);
            })
            .on("controlNodeDragging", function (params) {
                self.currentDraggingMousePosition = params.pointer.DOM;
            })
            .on("dragging", function (_params) {
                /* if (params.event.srcEvent.ctrlKey && options.dndCtrlFn) {
return false;
}*/
            })
            .on("dragEnd", function (/** @type {{ event: { srcEvent: { ctrlKey: any; altKey: any; }; }; pointer: { DOM: any; }; nodes: string | any[]; }} */ params) {
                if (params.event.srcEvent.ctrlKey && options.dndCtrlFn) {
                    var dropCtrlNodeId = self.network.getNodeAt(params.pointer.DOM);
                    if (!dropCtrlNodeId) {
                        return;
                    }
                    var startNode = self.data.nodes.get(params.nodes[0]);
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
                //  sortMethod:"directed",
                //    shakeTowards:"roots",
                //  sortMethod:"directed",
                levelSeparation: 200,
                //   parentCentralization: true,
                //  shakeTowards:true

                //   nodeSpacing:25,
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

    self.clearGraph = function () {
        // comment ca marche  bad doc???

        if (self.data && self.data.nodes) {
            //  var edges = self.data.edges.getIds();
            self.data.edges.clear();
            self.data.nodes.clear();
            //  if (edges.length > 0) self.data.edges.remove(edges);
            var nodes = self.data.nodes.getIds();
            var edges = self.data.edges.getIds();
            // if (nodes.length > 0) self.data.nodes.remove(nodes);
        }
        self.data = null;
    };

    self.drawLegend = function () {
        // Pass
    };

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

    (self.removeOtherNodesFromGraph = function (/** @type {any} */ nodeId) {
        var nodes = self.data.nodes.get();
        /**
         * @type {any[]}
         */
        var nodeIds = [];
        nodes.forEach(function (/** @type {{ id: any; }} */ node) {
            if (node.id != nodeId) {
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
        (self.onScaleChange = function () {
            // return;
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
                        } else {
                            node.label = null;
                            node.size = size;
                            node.font = { size: fontSize };
                        }

                        //nodes.push(node);
                    }
                });
                self.data.nodes.update(nodes);
            }
            self.currentScale = scale;
        });
    self.getExistingIdsMap = function (/** @type {any} */ nodesOnly) {
        var existingVisjsIds = {};
        if (!self.data || !self.data.nodes) {
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

    self.isGraphNotEmpty = function () {
        // if(self.isGraphNotEmpty()){
        return Object.keys(self.getExistingIdsMap()).length > 0;
    };

    self.graphCsvToClipBoard = function () {
        var csv = self.toCsv();
        common.copyTextToClipboard(csv, function (/** @type {any} */ err, /** @type {any} */ _result) {
            if (err) {
                MainController.UI.message(err);
            }
            MainController.UI.message("csv copied in system clipboard");
        });
    };

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
 }*/
            });
        }

        nodeIds.forEach(function (/** @type {any} */ parentId) {
            recurse(parentId);
        });
        return nodes;
    };

    self.getNodeDescendants = function (/** @type {any} */ nodeIds, /** @type {any} */ includeParents) {
        nodeIds = self.getNodeDescendantIds(nodeIds, includeParents);
        return self.data.nodes.get(nodeIds);
    };

    self.getNodesPosition = function () {
        var positions = self.network.getPositions();
        return positions;
    };

    self.getNodeEdges = function (sourceNodeId, targetNodeId) {
        var connectedEdges = [];
        var sourceNodeEdges = self.network.getConnectedEdges(sourceNodeId);
        sourceNodeEdges.forEach(function (edgeId) {
            var edge = self.data.edges.get(edgeId);
            if (edge.to == targetNodeId || edge.from == targetNodeId) {
                connectedEdges.push(edge);
            }
        });
        return connectedEdges;
    };

    self.processClicks = function (
        /** @type {{ edges: string | any[]; nodes: string | any[]; event: { srcEvent: { ctrlKey: any; altKey: any; shiftKey: any; }; }; pointer: { DOM: any; }; }} */ params,
        /** @type {{ fixedLayout: any; onclickFn: (arg0: null, arg1: any, arg2: { dbleClick?: any; ctrlKey?: number; altKey?: number; shiftKey?: number; }) => void; onClusterClickFn: (arg0: any, arg1: any, arg2: { dbleClick: any; ctrlKey: number; altKey: number; shiftKey: number; }) => any; }} */ _options,
        /** @type {any} */ isDbleClick
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

    self.focusOnNode = function (/** @type {any} */ id, /** @type {any} */ _label) {
        if (id) {
            /**
             * @type {{ id: any; shape: string; size: any; }[]}
             */
            var newNodes = [];
            self.data.nodes.getIds().forEach(function (/** @type {any} */ nodeId) {
                var shape = "dot";
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
    self.toSVG = function () {
        SVGexport.toSVG(self.network);
        self.redraw();
    };

    self.toGraphMl = function () {
        var visjsData = {
            nodes: self.data.nodes.get(),
            edges: self.data.edges.get(),
        };
        var xmlStr = GraphMlExport.VisjsDataToGraphMl(visjsData);
        common.copyTextToClipboard(xmlStr);
    };

    self.searchNode = function (/** @type {any} */ id, /** @type {string | number | string[] | undefined} */ word) {
        /*   if (word === null && !id)
    return;*/
        if (!word || word == "") {
            word = $("#visjsGraph_searchInput").val();
            if (word == "") {
                return;
            }
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
            var shape = "dot";
            var size = self.defaultNodeSize;
            var ok = false;
            if (word) {
                ok = node.data && node.data.label && node.data.label.toLowerCase().indexOf(word.toLowerCase()) > -1;
            }
            if (id) {
                ok = node.id == id;
            }
            if (ok) {
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

    self.saveGraph = function (
        /** @type {string | number | boolean | string[] | ((this: HTMLElement, index: number, attr: string) => string | number | void | undefined) | ((this: HTMLElement, index: number, text: string) => string | number | boolean) | null} */ fileName,
        /** @type {any} */ raw
    ) {
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
        var data = {
            nodes: self.data.nodes.get(),
            edges: self.data.edges.get(),
            context: self.currentContext,
            positions: positions,
        };
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

        $.ajax({
            type: "POST",
            url: Config.apiUrl + "/data",
            data: payload,
            dataType: "json",
            success: function (_result, _textStatus, _jqXHR) {
                $("#visjsGraph_savedGraphsSelect").append($("<option></option>").attr("value", fileName).text(fileName));
                MainController.UI.message("graph saved");
            },
            error(err) {
                return alert(err);
            },
        });
    };

    self.message = function (/** @type {string | JQuery.Node | ((this: HTMLElement, index: number, oldhtml: string) => string | JQuery.Node)} */ message) {
        $("#VisJsGraph_message").html(message);
    };

    self.loadGraph = function (
        /** @type {string | number | string[] | undefined} */ fileName,
        /** @type {any} */ add,
        /** @type {(arg0: null, arg1: { nodes: never[]; edges: never[]; }) => void} */ callback
    ) {
        if (!fileName) {
            fileName = $("#visjsGraph_savedGraphsSelect").val();
        }
        var addToCurrentGraph = $("#visjsGraph_addToCurrentGraphCBX").prop("checked");
        if (!fileName || fileName == "") {
            return;
        }

        self.message("Loading Graph...");
        $.ajax({
            type: "GET",
            url: `${Config.apiUrl}/data/file?dir=graphs&name=${fileName}`,
            dataType: "json",
            success: function (result, _textStatus, _jqXHR) {
                var data = JSON.parse(result);
                var positions = data.positions;
                var options = data.context.options;
                var visjsData = { nodes: [], edges: [] };
                var existingNodes = {};
                if (addToCurrentGraph) {
                    existingNodes = self.getExistingIdsMap();
                }
                data.nodes.forEach(function (/** @type {{ id: string | number; fixed: { x: boolean; y: boolean; }; x: any; y: any; }} */ node) {
                    if (!existingNodes[node.id]) {
                        existingNodes[node.id] = 1;
                        if ((node.fixed && positions[node.id]) || options.nodes.fixed) {
                            node.x = positions[node.id].x;
                            node.y = positions[node.id].y;
                            node.fixed = { x: true, y: true };
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

                if (callback) {
                    return callback(null, visjsData);
                }

                if (add || (addToCurrentGraph && self.data.nodes && self.data.nodes.getIds().length > 0)) {
                    self.data.nodes.add(visjsData.nodes);
                    self.data.edges.add(visjsData.edges);
                    self.message("");
                } else {
                    //functions
                    var context = JSON.parse(JSON.stringify(data.context).replace(/self./g, "Lineage_classes."));
                    //  var context = data.context

                    for (var key in context.options) {
                        if (key.indexOf("Fn") > 0) {
                            context.options[key] = eval(key + "=" + context.options[key]);
                        }
                    }
                    if (context.callback) {
                        callback = context.callback;
                    }
                    if (self.isGraphNotEmpty()) {
                        self.data.edges.add(visjsData.edges);
                        self.data.nodes.add(visjsData.nodes);
                    } else {
                        self.draw(context.divId, visjsData, context.options, callback);
                    }
                    self.message("");
                }
            },
            error(err) {
                return alert(err);
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
                return alert(err);
            },
        });
    };

    self.showGraphConfig = function () {
        $("#visjsConfigureDiv").dialog({
            //   autoOpen: false,
            height: 700,
            width: 550,
            modal: false,
            title: "Graph parameters",
            position: { my: "left top", at: "right top" },
        });

        //    $('#graphConfigDiv').dialog("open")

        setTimeout(function () {
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

            setTimeout(function () {
                $("#graphDisplay_theme").remove();
                $("#visjsConfigureDiv").prepend(
                    "<div id='graphDisplay_theme' class='div.vis-configuration.vis-config-item '>theme" +
                        "<select onchange='Lineage_sources.setTheme($(this).val())' >" +
                        "<option>white</option>" +
                        "<option>dark</option>" +
                        "</select></div>"
                );
            }, 500);
        }, 500);
    };
};

export default VisjsGraphClass;
