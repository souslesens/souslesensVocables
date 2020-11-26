var GraphController = (function () {

    var self = {};
    self.defaultNodeColor = "blue"


    self.toVisjsData = function (visjsData, data, parentNodeId, fromVar, toVar, visjOptions) {
        if (!visjOptions) {
            visjOptions = {from: {}, to: {}}
        }

        if (!visjsData) {
            visjsData = {nodes: [],edges:[]}
        }

        function getShape(target,nodeData) {
            if (visjOptions[target] && visjOptions[target].shape) {
                if (typeof visjOptions[target].shape == "string")
                    return visjOptions[target].shape
                else//fn
                    return visjOptions[target].shape(nodeData)
                    }
            return  "dot";
        }

        var existingNodes = {}
        var existingEdges = {};
        if (parentNodeId) {// add to existingGraph
            visjsGraph.data.nodes.getIds().forEach(function (id) {
                existingNodes[id] = id
            });
            visjsGraph.data.edges.getIds().forEach(function (id) {
                existingEdges[id] = id
            });

        } else {// new Graph
            if (!visjsData) //new visjsData
                visjsData = {nodes: [], edges: []};
            else {//add to existing  visjsData
                visjsData.nodes.forEach(function (item) {
                    existingNodes[item.id] = item.id
                })
                visjsData.edges.forEach(function (item) {
                    existingEdges[item.id] = item.id
                })
            }

        }

        data.forEach(function (item) {

            if (parentNodeId) {
                fromId = parentNodeId
            }
            else{
                var fromId = ""
                var fromLabel = "";

                if (fromVar == "#") {
                    fromId = "#"
                    fromLabel = "#"
                } else {
                    if (!item[fromVar])
                        return console.log(JSON.stringify(item));
                    fromId = item[fromVar].value
                    fromLabel = item[fromVar + "Label"].value;
                }


                if (!existingNodes[fromId]) {
                    existingNodes[fromId] = 1;
                    var node = {
                        id: fromId,
                        label: fromLabel,
                        shape: getShape("from",fromId),
                        color: visjOptions.from.color || self.defaultNodeColor
                    }
                    if(visjOptions.data)
                        node.data=visjOptions.data
                    visjsData.nodes.push(node)
                }
            }

            if (toVar && item[toVar]) {
                var toId = item[toVar].value || "#";
                var toLabel = item[toVar + "Label"].value;

                if (!existingNodes[toId]) {
                    existingNodes[toId] = 1;

                    var node = {
                        id: toId,
                        label: toLabel,
                        shape: getShape("to",toId),
                        color: visjOptions.to.color || self.defaultNodeColor
                    }
                    if(visjOptions.data)
                        node.data=visjOptions.data
                    visjsData.nodes.push(node);
                }

                var edgeId = fromId + "_" + toId;
                if (!existingEdges[edgeId]) {
                    existingEdges[edgeId] = 1
                    var edge = {
                        id: edgeId,
                        from: fromId,
                        to: toId
                    }
                    visjsData.edges.push(edge);

                }

            }



        })

        return visjsData;


    }


    return self;

})();
