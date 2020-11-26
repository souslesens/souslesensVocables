var Clipboard = (function () {
    var self = {};
    var content = [];

    self.copy = function (data, element, event) {


if(!data.source)
    return console.log("copied data has no source property "+data.label)

        data.tool = MainController.currentTool
        data.date = new Date()



        if(!event.alt) {
            content = [data]
            $(".clipboardSelected").removeClass("clipboardSelected")
        }
        else{
            content.push(data)


        }


        if (element) {
            if (element === "_visjsNode") {
                blinkVisjsNode(data.id);
            } else {
                var elt = document.getElementById(element)
                if (elt) {
                    $(elt).addClass("clipboardSelected")
                }
            }
        }


    }

    self.getContent = function () {
        return content;
    }


    self.clear = function () {
        $(".clipboardSelected").removeClass("clipboardSelected")
        blinkVisjsNode(null);
        content = []
    }


    blinkVisjsNode = function (selectedNodeId) {
        var hidden = true
        var setInt;


        function nodeFlash(nodeId, _stop) {

            stopInterv = _stop//!!! variable globale
            setInt = setInterval(function () {
                if (stopInterv && !hidden)
                    clearInterval(setInt)
                visjsGraph.data.nodes.update({
                    id: nodeId, hidden: hidden
                });
                hidden = !hidden

            }, 500);
        }


        var newNodes = [];
        if(!visjsGraph.data)
            return;
        visjsGraph.data.nodes.getIds().forEach(function (id) {
            var newNode = {id: id, hidden: false}
            if (selectedNodeId && selectedNodeId == id)
                newNode.shape = "star";
            else
                newNode.shape = "box";

            newNodes.push(newNode)

        })
        visjsGraph.data.nodes.update(newNodes)
        if (selectedNodeId)
            nodeFlash(selectedNodeId)
        else
            nodeFlash(content.id, true)

    }


    return self;
})()
