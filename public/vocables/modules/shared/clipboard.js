import visjsGraph from "../graph/visjsGraph2.js";

/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
var Clipboard = (function () {
    var self = {};
    var content = [];

    self.copy = function (data, element, event) {
        // if (false && !data.source) return console.log("copied data has no source property " + data.label);

        data.tool = MainController.currentTool;
        data.date = new Date();

        if (!event.alt) {
            content = [data];
            $(".clipboardSelected").removeClass("clipboardSelected");
        } else {
            content.push(data);
        }

        if (element) {
            if (element === "_visjsNode") {
                blinkVisjsNode(data.id, data.initialShape);
            } else {
                var elt = document.getElementById(element);
                if (elt) {
                    $(elt).addClass("clipboardSelected");
                }
            }
        }
    };

    self.getContent = function () {
        return content;
    };

    self.clear = function () {
        $(".clipboardSelected").removeClass("clipboardSelected");

        blinkVisjsNode(null);
        content = [];
    };

    var blinkVisjsNode = function (selectedNodeId, initialShape) {
        var hidden = true;
        var setInt;
        if (!initialShape) initialShape = "box";

        function nodeFlash(nodeId, _stop) {
            var stopInterv = _stop; //!!! variable globale
            setInt = setInterval(function () {
                if (stopInterv && !hidden && setInt) {
                    clearInterval(setInt);
                    visjsGraph.data.nodes.update({
                        id: nodeId,
                        hidden: hidden,
                    });
                    hidden = !hidden;
                }
            }, 500);
        }

        var newNodes = [];
        if (!visjsGraph.isGraphNotEmpty()) return;
        visjsGraph.data.nodes.getIds().forEach(function (id) {
            var newNode = { id: id, hidden: false };
            if (selectedNodeId && selectedNodeId == id) {
                newNode.shape = "star";
            } else newNode.shape = initialShape;

            newNodes.push(newNode);
        });
        visjsGraph.data.nodes.update(newNodes);
        if (selectedNodeId) nodeFlash(selectedNodeId);
        else nodeFlash(content.id, true);
    };

    return self;
})();

export default Clipboard;

window.Clipboard = Clipboard;
window.Clipboard = Clipboard;
