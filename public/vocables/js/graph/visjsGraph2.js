/**
 The MIT License
 The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
var visjsGraph = (function () {


    var self = {};
    self.network = null;
    self.simulationTimeOut = 3000;
    self.data;
    self.legendLabels = [];
    self.context = {};
    self.currentScale;
    self.simulationOn;
    self.globalOptions = {nodes: {}, edges: {}};


    self.defaultTextSize = 14;
    self.defaultNodeSize = 7;
    self.showNodesLabelMinScale = 0.5
    self.currentContext;
    self.drawingDone = false;
    var lastClickTime = new Date();
    var dbleClickIntervalDuration = 500

    self.simulationOn = false;
    self.redraw = function () {
        if (!self.currentContext)
            return;
        var visjsData = {nodes: self.data.nodes.get(), edges: self.data.edges.get()}
        self.draw(self.currentContext.divId, visjsData, self.currentContext.options, self.currentContext.callback)

    }
    self.draw = function (divId, visjsData, _options, callback) {
        self.drawingDone = false;
        self.currentContext = {divId: divId, options: _options, callback: callback}
        if (!_options)
            _options = {}

        self.legendLabels = self.legendLabels.concat(visjsData.labels)
        var container = document.getElementById(divId);

        var nodesDataSet = new vis.DataSet(visjsData.nodes)
        var edgesDataSet = new vis.DataSet(visjsData.edges)
        nodesDataSet.on('*', function (event, properties, senderId) {
            if (event == "add")
                self.lastAddedNodes = properties.items
            // console.log('add:', event, 'properties:', properties, 'senderId:', senderId);
        });

        self.data = {
            nodes: nodesDataSet,
            edges: edgesDataSet
        };
        self.canvasDimension = {
            w: $("#" + divId).width(),
            h: ($("#" + divId).height() - 50)
        }
        var options = {

            interaction: {hover: true},
            width: "" + self.canvasDimension.w + "px",
            height: "" + self.canvasDimension.h + "px",
            nodes: {
                shape: 'dot',
                size: 12,
                chosen: {node: true}
                // scaling:{min:6,max:20}
            },
            edges: {
                //  scaling:{min:1,max:8}
            },
            layout: {improvedLayout: false}

        };

        for (var key in _options) {
            options[key] = _options[key]
        }


        if (_options.layoutHierarchical) {

            options.layout = {
                hierarchical: _options.layoutHierarchical
            }

        } else {
            $("#visjsGraph_layoutSelect").val("")
        }

        self.globalOptions = options
        self.network = new vis.Network(container, self.data, options);
        self.simulationOn = true;


        // self.network.startSimulation()
        window.setTimeout(function () {

                return;


            if (!_options.layoutHierarchical) {
                if (!self.network.stopSimulation)
                    return;
                self.network.stopSimulation();
                if(!_options.noFit)
                self.network.fit()
                self.simulationOn = false;
                if (_options.afterDrawing)
                    _options.afterDrawing()
            }
        }, self.simulationTimeOut)

        self.network.on("afterDrawing", function (params) {
            self.drawingDone = true;
        });

        self.network.on("oncontext", function (params) {

            params.event.preventDefault();
            if (params.event.which == 3) {
                if (_options.onRightClickFn) {
                    var point = params.pointer.DOM;
                    var objId = self.network.getNodeAt(params.pointer.DOM)
                    if (objId) {

                        var obj = self.data.nodes.get(objId);
                        if (obj)
                            _options.onRightClickFn(obj, point, params.event)
                    } else {
                        objId = self.network.getEdgeAt(params.pointer.DOM)
                        var obj = self.data.edges.get(objId);
                        if (obj)
                            _options.onRightClickFn(obj, point, params.event)
                    }


                }
            }//rigth click

        });

        self.network.on("doubleClick", function (params) {
            self.processClicks(params, _options, true)
        });

        self.network.on("click", function (params) {
            console.log(self.network.getNodeAt(params.pointer.DOM.x, params.pointer.DOM.y))
            self.processClicks(params, _options)

        }).on("hoverNode", function (params) {
            var nodeId = params.node;
            var node = self.data.nodes.get(nodeId);
            if (!node)
                return console.log("hoverNode :no node ")
            node._graphPosition = params.pointer.DOM;
            var point = params.pointer.DOM;
            self.context.currentNode = node;
            var options = {}
            /*  var options = {

                  ctrlKey: (params.event.srcEvent.ctrlKey ? 1 : 0),
                  altKey: (params.event.srcEvent.altKey ? 1 : 0),
                  shiftKey: (params.event.srcEvent.shiftKey ? 1 : 0),
              }*/
            if (_options.onHoverNodeFn)
                _options.onHoverNodeFn(node, point, options)

        }).on("blurNode", function (params) {
            // $("#graphPopupDiv").css("display", "none")

        }).on("zoom", function (params) {
            self.onScaleChange()

        }).on("hoverEdge", function (params) {
            var edgeId = params.edge;
            var edge = self.data.edges.get(edgeId);
            edge.fromNode = self.data.nodes.get(edge.from);
            edge.toNode = self.data.nodes.get(edge.to);
            var point = params.pointer.DOM;
            //   sinequaResultVis.onEdgeHover(edge, point)


        }).on("blurEdge", function (params) {

            //  sinequaResultVis.onEdgeBlur()


        })

            .on("dragStart", function (params) {

                var nodeId = params.nodes[0]
                if (!nodeId)
                    return;
                //   var nodes = self.data.nodes.getIds();
                var newNodes = [];
                var fixed = false;
                /*  if (params.event.srcEvent.altKey)
                      fixed = false;*/
                newNodes.push({id: nodeId, fixed: fixed})
                visjsGraph.data.nodes.update(newNodes)

            })

            .on("dragging", function (params) {
               /* if (params.event.srcEvent.ctrlKey && options.dndCtrlFn) {
                return false;
                }*/
            })
            .on("dragEnd", function (params) {
                if (params.event.srcEvent.ctrlKey && options.dndCtrlFn) {
                    var dropCtrlNodeId = self.network.getNodeAt(params.pointer.DOM)
                    if (!dropCtrlNodeId)
                        return;
                    var startNode = self.data.nodes.get(params.nodes[0])
                    var endNode = self.data.nodes.get(dropCtrlNodeId)

                    options.dndCtrlFn(startNode, endNode, params.pointer.DOM)

                }

                if (params.nodes.length == 1) {
                    /* if (true || (!params.event.srcEvent.ctrlKey && !self.currentContext.options.keepNodePositionOnDrag))
                         return;*/

                    var nodeId = params.nodes[0]
                    var nodeObj = self.data.nodes.get(nodeId)

                    self.lastMovedNode = nodeId
                    //   var nodes = self.data.nodes.getIds();
                    var newNodes = [];
                    var fixed = true;
                    if (params.event.srcEvent.altKey)
                        fixed = false;
                    var newNode = {id: nodeId, fixed: fixed}
                    newNodes.push(newNode)


                    visjsGraph.data.nodes.update(newNodes)


                }
            });


        /*   window.setTimeout(function () {
              var ids=  self.data.nodes.getIds();
              var newNodes=[]
              ids.forEach(function(id) {
                  newNodes.push({id:id, "label":""})
              })
                  self.data.nodes.update(newNodes);

              }, 3000)*/


        var htmlPlus = "<div style='border:solid brown 0px;background-color:#ddd;padding: 1px'><button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='visjsGraph.saveGraph()'>Save </button>" +
            "Load<select style='width: 100px' id='visjsGraph_savedGraphsSelect' onchange='visjsGraph.loadGraph()'></select>" +
            "<input type='checkbox' id='visjsGraph_addToCurrentGraphCBX'>add</div><div id='VisJsGraph_message'></div>"


        if (true) {
            if (!$("#graphButtons").length) {

                var html = "<div  id='graphButtons' style='position: relative; top:0px;left:10px;display: flex;flex-direction: row;gap:10px'>" +
                    // " <div> <B>Graph</B> </div><div><button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='Export.showExportDatDialog(null,\"GRAPH\")'>Export...</button></div>" +
                    " <div> <B>Graph</B> </div><div><button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='Export.exportGraphToDataTable(null,\"GRAPH\")'>Export...</button></div>" +

                    "<div style='border:solid brown 0px;background-color:#ddd;padding: 1px'>Layout <select id='visjsGraph_layoutSelect' style='width: 100px' onchange='visjsGraph.setLayout($(this).val())' >" +
                    "<option ></option>" +
                    "<option >standard</option>" +
                    "<option>hierarchical vertical</option>" +
                    "<option>hierarchical horizontal</option>" + "</select></div>";


                html += " <div style='border:solid brown 0px;background-color:#ddd;padding: 1px'><input style='width: 100px' id='visjsGraph_searchInput'>&nbsp;<button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='visjsGraph.searchNode()'>Search</button></div>"

                html += "<button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='visjsGraph.showGraphConfig()'> Graph parameters</button>"
                html += "<div id='visjsConfigureDiv' style='overflow: auto'></div>"


                if (false)
                    html += " &nbsp;&nbsp;" + htmlPlus

                var parent = $("#" + divId).parent()

                $(parent).css("flex-direction", "column")
                $(parent).prepend(html)
            }

            html += "</div>"
        }
        setTimeout(function () {
            self.listSavedGraphs()
            // CustomPluginController.setGraphNodesIcons()
        }, 500)

        if (callback) {
            var intervalIncrement = 0;
            var interval = setInterval(function () {
                if (self.drawingDone || intervalIncrement > 100) {
                    clearInterval(interval);
                    return callback();
                }
                intervalIncrement += 1
            }, 300)
        }


    }
    self.setLayout = function (layout) {
        if (layout == "hierarchical vertical") {
            if (false && self.lastMovedNode) {
                var newNodes = []
                self.data.nodes.getIds().forEach(function (nodeId) {
                    var fixed = false
                    if (nodeId == self.lastMovedNode)
                        fixed = true;
                    newNodes.push({id: nodeId, x: {fixed: fixed}, y: {fixed: fixed}})
                })
                self.data.nodes.update(newNodes)
            }


            self.currentContext.options.layoutHierarchical = {
                direction: "UD",
                sortMethod: "hubsize",
            }
            self.currentContext.options.edges = {
                smooth: {
                    type: "cubicBezier",
                    forceDirection: "vertical",
                    roundness: 0.1,
                },
            }
            shakeTowards:true
            self.currentContext.simulationTimeOut = 10000


            self.redraw()
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

            }
            self.currentContext.options.edges = {
                smooth: {
                    type: "cubicBezier",
                    forceDirection: "horizontal",

                    roundness: 0.4,
                },
            }

            self.redraw()
        } else {
            self.currentContext.options = {}
            self.redraw()
        }
    }

    self.exportGraph = function () {
        var nodes = visjsGraph.data.nodes.get();
        var edges = visjsGraph.data.edges.get();
        var nodesMap = {}
        nodes.forEach(function (node) {
            nodesMap[node.id] = node
        })
        edges.forEach(function (edge) {
            edge.fromNode = nodesMap[edge.from]
            edge.toNode = nodesMap[edge.to]
        })
        var str = JSON.stringify(edges)
        common.copyTextToClipboard(str)
    }

    self.importGraph = function (str) {
        var edges = json.parse()
        var nodes = visjsGraph.data.nodes.get();
        var edges = visjsGraph.data.edges.get();
        var nodesMap = {}
        nodes.forEach(function (node) {
            nodesMap[node.id] = node
        })
        edges.forEach(function (edge) {
            edge.fromNode = nodesMap[edge.from]
            edge.toNode = nodesMap[edge.to]
        })
        var str = JSON.stringify(edges)
        common.copyTextToClipboard(str)
    }


    self.clearGraph = function () {// comment ca marche  bad doc???

        if (self.data && self.data.nodes) {
            self.data.nodes.remove(self.data.nodes.getIds())
            self.data.edges.remove(self.data.edges.getIds())
        }
        self.data = null

    }


    self.drawLegend = function () {

    }


    self.removeNodes = function (key, value, removeEdges) {
        var nodeIds = [];
        var nodes = visjsGraph.data.nodes.get();
        nodes.forEach(function (node) {
            if (node[key] == value)
                nodeIds.push(node.id)
        })
        visjsGraph.data.nodes.remove(nodeIds);

        if (removeEdges) {
            var edgeIds = [];
            var edges = visjsGraph.data.edges.get();
            edges.forEach(function (edge) {
                if (edge[key] == value)
                    edgeIds.push(edge.id)
            })
            visjsGraph.data.edges.remove(edgeIds);
        }
    }

    self.removeOtherNodesFromGraph = function (nodeId) {

        var nodes = visjsGraph.data.nodes.get();
        var nodeIds = []
        nodes.forEach(function (node) {
            if (node.id != nodeId)
                nodeIds.push(node.id)
        })
        visjsGraph.data.nodes.remove(nodeIds);
        var edges = visjsGraph.data.edges.get();
        var edgesIds = []
        edges.forEach(function (edge) {
            if (nodeIds.indexOf(edge.from) > -1 || nodeIds.indexOf(edge.to) > -1)
                edgesIds.push(edge.id)
        })
        visjsGraph.data.edges.remove(edgesIds);

    },


        self.onScaleChange = function () {
            // return;
            var scale = self.network.getScale();
            if (!self.currentScale || Math.abs(scale - self.currentScale) > .01) {

                var scaleCoef = scale >= 1 ? (scale * .9) : (scale * 2)

                var size = self.defaultNodeSize / scaleCoef;
                var fontSize = (self.defaultTextSize / (scaleCoef));
                if (scale < 1)
                    fontSize = (self.defaultTextSize / 1); //fontSize = (self.defaultTextSize / (scaleCoef * 0.8));
                else
                    fontSize = (self.defaultTextSize / (scaleCoef * 1.3));

                var nodes = self.data.nodes.get();
                nodes.forEach(function (node) {
                    if (node.size) {
                        if (!node.originalSize)
                            node.originalSize = node.size
                        size = node.originalSize * scaleCoef
                    }
                    if (!node.hiddenLabel)
                        node.hiddenLabel = node.label
                    var shape = node.shape;
                    if (!shape)
                        shape = self.defaultNodeShape;
                    if (shape != "box") {

                        if (scale > self.showNodesLabelMinScale) {
                            node.label = node.hiddenLabel;
                            node.size = size;
                            node.font = {size: fontSize}
                            self.labelsVisible = true;


                        } else {
                            node.label = null;
                            node.size = size;
                            node.font = {size: fontSize}

                        }

                        //nodes.push(node);
                    }
                })
                self.data.nodes.update(nodes)

            }
            self.currentScale = scale;
        }

    self.getExistingIdsMap = function (nodesOnly) {
        var existingVisjsIds = {}
        if (!visjsGraph.data || !visjsGraph.data.nodes)
            return {}
        var oldIds = visjsGraph.data.nodes.getIds()
        if (!nodesOnly)
            oldIds = oldIds.concat(visjsGraph.data.edges.getIds())
        oldIds.forEach(function (id) {
            existingVisjsIds[id] = 1;
        })
        return existingVisjsIds;
    }

    self.isGraphNotEmpty = function () {
        // if(visjsGraph.isGraphNotEmpty()){
        return Object.keys(visjsGraph.getExistingIdsMap()).length > 0
    }


    self.graphCsvToClipBoard = function () {
        var csv = visjsGraph.toCsv()
        common.copyTextToClipboard(csv, function (err, result) {

            if (err)
                MainController.UI.message(err);
            MainController.UI.message("csv copied in system clipboard");
        })

    }

    self.toCsv = function (dataFields) {
        var sep = ","
        if (dataFields && !Array.isArray(dataFields))
            dataFields = [dataFields]

        var nodes = self.data.nodes.get();
        var edges = self.data.edges.get();
        var nodesMap = {};
        var csvStr = "";

        function getNodeStr(node) {
            if (node)
                var str = node.id + sep + node.label;
            if (dataFields && node.data) {
                sep + dataFields.forEach(function (field) {
                    str += node.data[field]
                })
            }

            return str;
        }

        nodes.forEach(function (node) {
            nodesMap[node.id] = node
            if (edges.length == 0) {
                csvStr += getNodeStr(node) + "\n"
            }
        })
        edges.sort(function (a, b) {
            if (a.from > b.from)
                return 1;
            if (a.from < b.from)
                return -1;
            return 0;
        })
        edges.forEach(function (edge) {
            var edgeLabel = "->";
            if (edge.label)
                edgeLabel = edge.label;
            csvStr += getNodeStr(nodesMap[edge.from]) + sep + edgeLabel + sep + getNodeStr(nodesMap[edge.to]) + "\n"

        })

        return csvStr;
    }
    self.getNodeDescendantIds = function (nodeIds, includeParents) {
        if (!Array.isArray(nodeIds))
            nodeIds = [nodeIds]
        var nodes = [];
        if (includeParents)
            nodes = nodeIds
        var allEdges = self.data.edges.get();
        var allNodes = {}

        function recurse(nodeId) {
            allEdges.forEach(function (edge) {
                if (edge.from == nodeId) {

                    if (!allNodes[edge.to]) {
                        allNodes[edge.to] = 1
                        nodes.push(edge.to)
                        recurse(edge.to)
                    }
                }
                /* if(includeParents && edge.to == nodeId){
                     nodes.push(edge.from)
                     recurse(edge.from)
                 }*/
            })
        }


        nodeIds.forEach(function (parentId) {
            recurse(parentId)
        })
        return nodes;
    }

    self.getNodeDescendants = function (nodeIds, includeParents) {
        var nodeIds = self.getNodeDescendantIds(nodeIds, includeParents);
        return self.data.nodes.get(nodeIds)

    }

    self.getNodesPosition = function () {
        var nodes = self.data.nodes.getIds();
        var positions = self.network.getPositions()
        return positions
    }


    self.processClicks = function (params, _options, isDbleClick) {

        var now = new Date()
        if ((now - lastClickTime) < dbleClickIntervalDuration) {
            lastClickTime = now;
            return
        }
        if (isDbleClick)
            var x = 3

        if (params.edges.length == 0 && params.nodes.length == 0) {//simple click stop animation

            if (self.simulationOn || _options.fixedLayout)
                self.network.stopSimulation();
            else {

                self.network.startSimulation();

            }
            self.simulationOn = !self.simulationOn;
            // graphController.hideNodePopover();
            if (_options.onclickFn)
                _options.onclickFn(null, point, {})
        }

        // select node
        else if (params.nodes.length == 1) {
            var options = {
                dbleClick: isDbleClick,
                ctrlKey: (params.event.srcEvent.ctrlKey ? 1 : 0),
                altKey: (params.event.srcEvent.altKey ? 1 : 0),
                shiftKey: (params.event.srcEvent.shiftKey ? 1 : 0),
            }
            var point = params.pointer.DOM;
            var nodeId = params.nodes[0];
            var node = self.data.nodes.get(nodeId);
            if (!node && self.network.isCluster(nodeId)) {
                if (_options.onClusterClickFn)
                    return _options.onClusterClickFn(nodeId, point, options)
            }

            node._graphPosition = params.pointer.DOM;

            self.context.currentNode = node;

            if (_options.onclickFn)
                _options.onclickFn(node, point, options)


        }

        //select edge{
        else if (params.edges.length == 1) {
            var edgeId = params.edges[0];
            var edge = self.data.edges.get(edgeId);
            edge.fromNode = self.data.nodes.get(edge.from);
            edge.toNode = self.data.nodes.get(edge.to);
            var point = params.pointer.DOM;
            var options = {
                dbleClick: isDbleClick,
                ctrlKey: (params.event.srcEvent.ctrlKey ? 1 : 0),
                altKey: (params.event.srcEvent.altKey ? 1 : 0),
                shiftKey: (params.event.srcEvent.shiftKey ? 1 : 0),
            }
            if (_options.onclickFn)
                _options.onclickFn(edge, point, options)

        }
    }

    self.collapseNode = function (nodeId) {
        var nodeEdges = visjsGraph.data.edges.get();
        var targetEdges = []
        var targetNodes = []
        nodeEdges.forEach(function (edge) {
            if (edge.from == nodeId) {
                targetEdges.push(edge.id)
                if (targetNodes.indexOf(edge.to) < 0)
                    targetNodes.push(edge.to)
            }

        })
        visjsGraph.data.edges.remove(targetEdges)
        visjsGraph.data.nodes.remove(targetNodes)
    }

    self.focusOnNode = function (id, label) {

        if (id) {

            var newNodes = []
            self.data.nodes.getIds().forEach(function (nodeId) {
                var shape = "dot"
                var size = self.defaultNodeSize
                if (nodeId == id) {
                    shape = "star"
                    size = 14
                }
                newNodes.push({id: nodeId, shape: shape, size: size})
            })
            visjsGraph.data.nodes.update(newNodes)


            setTimeout(function () {
                self.network.focus(id, {
                    scale: 1,
                    animation: true

                })

            }, 100)
        }


    }

    self.setNodesProperty = function (conditions, hide) {
        var nodes = self.data.nodes.get();
        var newNodes = []
        nodes.forEach(function (node) {
            for (var key in conditions) {
                if (node.data[key] == conditions[key]) {
                    newNodes.push({id: node.id, hidden: hide})
                }
            }

        })
        visjsGraph.data.nodes.update(newNodes)


    }

    self.hideShowNodes = function (conditions, hide) {
        var nodes = self.data.nodes.get();
        var newNodes = []
        nodes.forEach(function (node) {
            for (var key in conditions) {
                if (node.data[key] == conditions[key]) {
                    newNodes.push({id: node.id, hidden: hide})
                }
            }

        })
        visjsGraph.data.nodes.update(newNodes)


    }
    self.toSVG = function () {
        SVGexport.toSVG(self.network)
        self.redraw()
    }

    self.toGraphMl = function () {
        var visjsData = {
            nodes: visjsGraph.data.nodes.get(),
            edges: visjsGraph.data.edges.get(),
        }
        var xmlStr = GraphMlExport.VisjsDataToGraphMl(visjsData)
        common.copyTextToClipboard(xmlStr)
    }


    self.searchNode = function (id, word) {

     /*   if (word === null && !id)
            return;*/
        if (word == "") {
            word = $("#visjsGraph_searchInput").val()
            if (word == "")
                return;
        }

        var nodes = visjsGraph.data.nodes.get()
        var matches = []
        var newNodes = []
        nodes.forEach(function (node) {
            var shape = "dot"
            var size = self.defaultNodeSize
            var ok = false
            if (word) {
                ok = node.data && node.data.label && node.data.label.toLowerCase().indexOf(word.toLowerCase()) > -1
            }
            if (id) {
                ok = (node.id == id)
            }
            if (ok) {
                shape = "star"
                size = 14
                matches.push(node.id)
            }
            newNodes.push({id: node.id, shape: shape, size: size})
        })
        visjsGraph.data.nodes.update(newNodes)
        matches.forEach(function (match, index) {
            if (index == 0) {
                setTimeout(function () {
                    self.network.focus(match, {
                        scale: 1,
                        animation: true

                    })

                }, 500)
            }
        })

    }


    self.saveGraph = function (fileName, raw) {
        if (!self.currentContext)
            return;
        var nodes = visjsGraph.data.nodes.get()
        var positions = self.network.getPositions()

        if (!raw) {
            for (var key in self.currentContext.options) {
                if (key.indexOf("Fn") > 0) {
                    self.currentContext.options[key] = self.currentContext.options[key].toString();
                }

            }
        }
        var data = {
            nodes: visjsGraph.data.nodes.get(),
            edges: visjsGraph.data.edges.get(),
            context: self.currentContext,
            positions: positions
        }
        if (!fileName)
            fileName = prompt("graph name")
        if (!fileName || fileName == "")
            return;
        if (fileName.indexOf(".json") < 0)
            fileName = fileName + ".json"
        var payload = {
            fileName: fileName,
            data: data
        }
        $.ajax({
            type: "POST",
            url: Config.apiUrl + "/data",
            data: payload,
            dataType: "json",
            success: function (result, textStatus, jqXHR) {
                $('#visjsGraph_savedGraphsSelect').append($("<option></option>").attr("value", fileName).text(fileName));
                MainController.UI.message("graph saved")
            }, error(err) {
                return alert(err)
            }
        })

    }

    self.message = function (message) {
        $("#VisJsGraph_message").html(message)
    }

    self.loadGraph = function (fileName, add, callback) {
        if (false && !self.currentContext)
            return;
        if (!fileName)
            fileName = $("#visjsGraph_savedGraphsSelect").val()
        var addToCurrentGraph = $("#visjsGraph_addToCurrentGraphCBX").prop("checked")
        if (!fileName || fileName == "")
            return;

        self.message("Loading Graph...")
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/data/" + fileName,
            data: payload,
            dataType: "json",
            success: function (result, textStatus, jqXHR) {
                var data = JSON.parse(result.result);
                var positions = data.positions;
                var options=data.context.options;
                var visjsData = {nodes: [], edges: []}
                var existingNodes = {}
                if (addToCurrentGraph)
                    existingNodes = self.getExistingIdsMap();
                data.nodes.forEach(function (node) {
                    if (!existingNodes[node.id]) {
                        existingNodes[node.id] = 1
                        if ( ((node.fixed && positions[node.id])|| options.nodes.fixed)) {
                            node.x = positions[node.id].x;
                            node.y = positions[node.id].y;
                            node.fixed={x:true,y:true};
                        }
                        visjsData.nodes.push(node)
                    }
                })

                data.edges.forEach(function (edge) {
                    if (!existingNodes[edge.id]) {
                        existingNodes[edge.id] = 1
                        visjsData.edges.push(edge)
                    }
                })

                if (callback)
                    return callback(null, visjsData)


                if (add || (addToCurrentGraph && self.data.nodes && self.data.nodes.getIds().length > 0)) {
                    self.data.nodes.add(visjsData.nodes)
                    self.data.edges.add(visjsData.edges)
                    self.message("")

                } else {
                    //functions
                    var context = JSON.parse(JSON.stringify(data.context).replace(/self./g, "Lineage_classes."))
                    //  var context = data.context

                    for (var key in context.options) {
                        if (key.indexOf("Fn") > 0) {
                            context.options[key] = eval(key + "=" + context.options[key]);
                        }
                    }
                    if (context.callback)
                        callback = context.callback
                    if (self.isGraphNotEmpty()) {
                        self.data.edges.add(visjsData.edges)
                        self.data.nodes.add(visjsData.nodes)

                    } else {
                        self.draw(context.divId, visjsData, context.options, callback)
                    }
                    self.message("")
                }


            }, error(err) {
                return alert(err)
            }
        })


    }
    self.listSavedGraphs = function (callback) {
        if (!Config || !Config.serverUrl)
            return

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/data/files",
            data: payload,
            dataType: "json",
            success: function (result, textStatus, jqXHR) {
                if (callback)
                    return callback(null, result)
                common.fillSelectOptions("visjsGraph_savedGraphsSelect", result, true)
            }, error(err) {
                if (callback)
                    return callback(err)
                return alert(err)
            }
        })
    }


    self.showGraphConfig = function () {

        $("#visjsConfigureDiv").dialog({
            //   autoOpen: false,
            height: 700,
            width: 550,
            modal: false,
            title: "Graph parameters",
            position: {my: "left top", at: "right top",}
        })


        //    $('#graphConfigDiv').dialog("open")


        setTimeout(function () {
            // these are all options in full.
            var options = {
                configure: {
                    enabled: true,
                    filter: "physics,layout,manipulation,renderer",

                    container: document.getElementById("visjsConfigureDiv"),
                    showButton: true
                }
            }

            visjsGraph.network.setOptions(options);
        }, 500)
    }


    return self;


})()
