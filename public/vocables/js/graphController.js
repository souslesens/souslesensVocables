var GraphController = (function () {

    var self = {};
    self.defaultNodeColor = "blue"
    defaultNodeShape = "dot"


    self.toVisjsData = function (visjsData, data, parentNodeId, fromVar, toVar, visjOptions) {
        self.defaultNodeColor = visjsGraph.globalOptions.nodes.color || self.defaultNodeColor
        self.defaultNodeShape = visjsGraph.globalOptions.nodes.coshapelor || defaultNodeShape

        if (!visjOptions) {
            visjOptions = {from: {}, to: {}}
        }

        var existingIds = visjsGraph.getExistingIdsMap()

        if (!visjsData) {
            visjsData = {nodes: [], edges: []}
        } else {
            visjsData.nodes.forEach(function (item) {
                existingIds[item.id] = 1;
            })
            visjsData.edges.forEach(function (item) {
                existingIds[item.id] = 1;
            })

        }

        function getShape(target, nodeData) {
            if (visjOptions[target] && visjOptions[target].shape) {
                if (typeof visjOptions[target].shape == "string")
                    return visjOptions[target].shape
                else//fn
                    return visjOptions[target].shape(nodeData)
            }
            return self.defaultNodeShape;
        }


        data.forEach(function (item) {

            if (parentNodeId) {
                fromId = parentNodeId
            } else {
                var fromId = ""
                var fromLabel = "";

                if (fromVar == "#") {
                    fromId = "#"
                    fromLabel = visjOptions.rootLabel || "#"
                } else {
                    if (!item[fromVar])
                        return console.log(JSON.stringify(item));
                    fromId = item[fromVar].value
                    fromLabel = item[fromVar + "Label"].value;
                }


                if (!existingIds[fromId]) {
                    existingIds[fromId] = 1;
                    var node = {
                        id: fromId,
                        label: fromLabel,
                        shape: getShape("from", fromId),
                        size: visjOptions.to.size || 5,
                        color: visjOptions.from.color || self.defaultNodeColor
                    }
                    if (visjOptions.data)
                        node.data = visjOptions.data
                    visjsData.nodes.push(node)
                }
            }

            if (toVar && item[toVar]) {
                var toId = item[toVar].value || "#";
                var toLabel
                if (!item[toVar + "Label"])
                    toLabel = toId
                else
                    toLabel = item[toVar + "Label"].value;

                if (!existingIds[toId]) {
                    existingIds[toId] = 1;

                    var node = {
                        id: toId,
                        label: toLabel,
                        shape: getShape("to", toId),
                        size: visjOptions.to.size || 5,
                        color: visjOptions.to.color || self.defaultNodeColor
                    }
                    if (visjOptions.data)
                        node.data = visjOptions.data
                    visjsData.nodes.push(node);
                }

                var edgeId = fromId + "_" + toId;
                var inverseEdge=toId + "_" + fromId;
                if (!existingIds[edgeId] && !existingIds[inverseEdge]) {
                    existingIds[edgeId] = 1
                    var edge = {
                        id: edgeId,
                        from: fromId,
                        to: toId
                    }
                    if (visjOptions.arrows)
                        edge.arrows = visjOptions.arrows
                    visjsData.edges.push(edge);

                }

            }


        })

        return visjsData;


    }


    return self;

})();
