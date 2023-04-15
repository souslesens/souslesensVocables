


// tentative , not working now

var Lineage_alignChainedObjects = (function () {
    self.alignListMembers = function (containerId) {
        if (!containerId) containerId = self.currentContainer.id;

        var containerPosition = visjsGraph.network.getPositions()[containerId];
        containerPosition.index = 0;
        var edges = visjsGraph.data.edges.get();
        var nodes = visjsGraph.data.nodes.get();

        var listMembersFromMap = [];
        var listMembersToMap = [];

        var xOffset = 15;
        var yOffset = 70;
        var nodesMap = {};

        /*
//position of firstNode
var firstNodeId = null;
nodes.forEach(function(node) {
  if (node.data.first) {
    firstNodeId = node.id;
  }

});


recurse = function(nodeFromId, previousPosition) {
  nodes.forEach(function(node) {
    nodesMap[node.id] = node;
    if (node.id == nodeFromId) {

      var x = previousPosition.x;
      var y = previousPosition.y;
      var goRecurse = false;


      var nextPosition = previousPosition;

      if (node.data.position) {
        nextPosition.x = node.data.position.x + xOffset;
        nextPosition.y = node.data.position.y,
          nextPosition.index++;

      } else {
        node.data.position = {
          x: x,
          y: y,
          index: nextPosition.index
        };
        goRecurse = true;
        nextPosition.y += yOffset;
      }


      //  if(goRecurse)
      if (!nodesMap[node.data.next].data.position)
        recurse(node.data.next, nextPosition);
    }

  });

};
recurse(firstNodeId, containerPosition);


recurseBack = function() {
  nodes.forEach(function(node) {
    if( !nodesMap[node.id].data.position) {
      if (node.data.previous ){
      if (nodesMap[node.data.previous].data.position) {
        if (!nodesMap[node.data.previous].data.children)
          nodesMap[node.data.previous].data.children = []
        nodesMap[node.data.previous].data.children.push(node.id)
        nodesMap[node.id].data.position={
          x:nodesMap[node.data.previous].data.position.x+(xOffset* nodesMap[node.data.previous].data.children.length),
          y:nodesMap[node.data.previous].data.position.y+yOffset
        }

      } else {
        recurseBack(node.data.previous)
      }
    }
    }
  })

};

recurseBack()



var newNodes = [];
nodes.forEach(function(node) {
  if (node.data.position) {

    newNodes.push({
      id: node.id,
      x: node.data.position.x,
      y: node.data.position.y,
      fixed: { x: true, y: true },
      shape: "box",
      // label:node.data.position.index,
      color: "#00afef"
    });
  }
});




visjsGraph.data.nodes.update(newNodes);

**/

        if (false) {
            var sortedNodes = [];
            visjsGraph.data.nodes.forEach(function (node) {
                if (node.data.next || node.data.previous) {
                    sortedNodes.push(node);
                }
            });
            sortedNodes.sort(function (a, b) {
                if (!b.data.previous) return -1;
                if (!a.data.previous) return 1;
                if (!b.data.next) return 1;
                if (!a.data.next) return -1;
                else if (b.data.next === a.id) return -1;
                else return 0;
            });

            sortedNodes.reverse();
            var existingEdges = {};
            var newNodes = [];
            var newEdges = [];
            sortedNodes.forEach(function (node, index) {
                newNodes.push({
                    id: node.id,
                    x: containerPosition.x + xOffset * index,
                    y: containerPosition.y + yOffset * index,
                    fixed: { x: true, y: true },
                    shape: "box",
                    // label:node.data.position.index,
                    color: "#00afef",
                });

                var from, to;
                if (node.data.next) {
                    from = node.id;
                    to = node.data.next;
                } else if (node.data.previous) {
                    from = node.data.previous;
                    to = node.id;
                }
                var edgeId = from + "_next_" + to;
                if (!existingEdges[edgeId]) {
                    existingEdges[edgeId] = 1;

                    newEdges.push({
                        id: edgeId,
                        from: from,
                        to: to,
                        label: "" + index,
                        font: { size: 14 },
                        arrows: {
                            to: {
                                enabled: true,
                                type: "solid",
                                scaleFactor: 0.5,
                            },
                        },
                    });
                }
            });

            visjsGraph.data.nodes.update(newNodes);
            visjsGraph.data.edges.add(newEdges);
        }

        var nextEdges = [];
        var nodesMap = {};
        visjsGraph.data.nodes.forEach(function (node) {
            nodesMap[node.id] = node;
        });
        visjsGraph.data.edges.forEach(function (edge) {
            if (edge.data.type == "next") nextEdges.push(edge);
        });

        nextEdges.sort(function (a, b) {
            if (a.from == b.to) return 1;
            if (a.from == b.from) return 0;
            if (a.to == b.to) return 0;
            return -1;
        });

        /**********************************/

        var nextEdges = [];
        var nodesMap = {};
        visjsGraph.data.nodes.forEach(function (node) {
            if (node.data.next) {
                if (!nodesMap[node.id]) nodesMap[node.id] = node;

                nextEdges.push({
                    id: node.id + "_" + node.data.next,
                    from: node.id,
                    to: node.data.next,
                    font: { size: 14 },
                    arrows: {
                        to: {
                            enabled: true,
                            type: "solid",
                            scaleFactor: 0.5,
                        },
                    },
                });
            }
        });

        nextEdges.sort(function (a, b) {
            if (a.from == b.to) return 1;
            if (a.from == b.from) return 0;
            if (a.to == b.to) return 0;
            return -1;
        });

        var newNodes = [];
        nextEdges.forEach(function (edge, edgeIndex) {
            nextEdges[edgeIndex].label = "" + (edgeIndex + 1);
            if (edgeIndex == 0) {
                newNodes.push({
                    id: edge.from,
                    x: containerPosition.x + xOffset,
                    y: containerPosition.y,
                    fixed: { x: true, y: true },
                    shape: "box",
                    color: "#00afef",
                });
            }
            newNodes.push({
                id: edge.to,
                x: containerPosition.x + xOffset,
                y: containerPosition.y + (yOffset * edgeIndex + 1),
                fixed: { x: true, y: true },
                shape: "box",
                color: "#00afef",
            });
        });

        visjsGraph.data.nodes.update(newNodes);
        visjsGraph.data.edges.update(nextEdges);

        return;
        /*******************************************/

        var newNodes = [];

        nextEdges.forEach(function (edge, edgeIndex) {
            nextEdges[edgeIndex].label = "" + (edgeIndex + 1);
            if (edgeIndex == 0) {
                newNodes.push({
                    id: edge.from,
                    x: containerPosition.x + xOffset,
                    y: containerPosition.y,
                    fixed: { x: true, y: true },
                    shape: "box",
                    color: "#00afef",
                });
            }
            newNodes.push({
                id: edge.to,
                x: containerPosition.x + xOffset,
                y: containerPosition.y + (yOffset * edgeIndex + 1),
                fixed: { x: true, y: true },
                shape: "box",
                color: "#00afef",
            });
        });

        visjsGraph.data.nodes.update(newNodes);
        visjsGraph.data.edges.add(nextEdges);

        return;

        var edgesFrom = [];
        visjsGraph.data.edges.forEach(function (edge) {
            var p = edgesFrom.indexOf(edge.from);
            if (p < 0) {
                edgesFrom.splice(0, 0, edge.from);
            }
        });

        var x = nextEdges;

        var newEdges = [];
        var newNodesMap = {};
        var existingPositions = {};
        nextEdges.forEach(function (edge, edgeIndex) {
            newEdges.push({
                id: edge.id,
                label: "" + edgeIndex,
            });
            /*   if (!newNodesMap[edge.from]) {
     newNodesMap[edge.from] = {
       id: edge.from,
       x: containerPosition.x,
       y: containerPosition.y + (yOffset * edgeIndex),
       fixed: { x: true, y: true },
       shape: "box",
       // label:node.data.position.index,
       color: "#00afef"
     };
   } else {
     // newNodes[edge.from].x+=xO
   }

   if (!newNodesMap[edge.to]) {
     newNodesMap[edge.to] = {
       id: edge.from,
       x: containerPosition.x,
       y: containerPosition.y + (yOffset * edgeIndex),
       fixed: { x: true, y: true },
       shape: "box",
       // label:node.data.position.index,
       color: "#00afef"
     };
   } else {
     // newNodes[edge.from].x+=xO
   }
*/
        });

        var newNodes = [];
        for (var id in newNodesMap) {
            newNodes = newNodesMap[id];
        }

        visjsGraph.data.nodes.update(newNodes);
        visjsGraph.data.edges.update(newEdges);

        return;
    };
})();



export default Lineage_alignChainedObjects
