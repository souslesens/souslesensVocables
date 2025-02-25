

var NodeRelationsWidget = (function () {

    var self = {}


    self.showDependanciesTree = function () {
        var node = Lineage_whiteboard.currentGraphNode
        SubGraph.getSubGraphVisjsData(Lineage_sources.activeSource, node.id, {}, function (err, result) {
            var options = {}
            self.visjsGraph = new VisjsGraphClass("nodeRelationsWidget_graphDiv", result.visjsData, options);


            self.visjsGraph.draw(function () {
            })


        })

    }


    return self;

})()

export default NodeRelationsWidget;
window.NodeRelationsWidget = NodeRelationsWidget