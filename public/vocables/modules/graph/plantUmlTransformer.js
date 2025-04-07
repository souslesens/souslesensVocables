var PlantUmlTransformer = (function () {
    var self = {};

    self.getImage = function (diagramText, imgId) {
        function encode64(data) {
            var r = "";
            for (var i = 0; i < data.length; i += 3) {
                if (i + 2 == data.length) {
                    r += append3bytes(data.charCodeAt(i), data.charCodeAt(i + 1), 0);
                } else if (i + 1 == data.length) {
                    r += append3bytes(data.charCodeAt(i), 0, 0);
                } else {
                    r += append3bytes(data.charCodeAt(i), data.charCodeAt(i + 1), data.charCodeAt(i + 2));
                }
            }
            return r;
        }

        function append3bytes(b1, b2, b3) {
            var c1 = b1 >> 2;
            var c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
            var c3 = ((b2 & 0xf) << 2) | (b3 >> 6);
            var c4 = b3 & 0x3f;
            var r = "";
            r += encode6bit(c1 & 0x3f);
            r += encode6bit(c2 & 0x3f);
            r += encode6bit(c3 & 0x3f);
            r += encode6bit(c4 & 0x3f);
            return r;
        }

        function encode6bit(b) {
            if (b < 10) {
                return String.fromCharCode(48 + b);
            }
            b -= 10;
            if (b < 26) {
                return String.fromCharCode(65 + b);
            }
            b -= 26;
            if (b < 26) {
                return String.fromCharCode(97 + b);
            }
            b -= 26;
            if (b == 0) {
                return "-";
            }
            if (b == 1) {
                return "_";
            }
            return "?";
        }

        //UTF8
        var diagramText = unescape(encodeURIComponent(diagramText));
        diagramText = encode64(deflate(diagramText, 9));
        //   $("#" + imgId).src = "http://www.plantuml.com/plantuml/img/" + diagramText;
        $.ajax({
            type: "GET",
            url: "http://www.plantuml.com/plantuml/svg/" + diagramText,
            dataType: "text/plain",

            success: function (data, _textStatus, _jqXHR) {
                var x = data;
            },
            error(err) {
                $("#plantUmlImg").html(err.responseText);
                //   return alert(err.responseText);
            },
        });
    };

    self.visjsDataToClassDiagram = function (visjsData,notDisplayDiagram) {
        if (!visjsData) {
            visjsData = {
                nodes: Lineage_whiteboard.lineageVisjsGraph.data.nodes.get(),
                edges: Lineage_whiteboard.lineageVisjsGraph.data.edges.get(),
            };
        }
        var nodesMap = {};

        // PlantUML does not support multiple items with the same label
        var labelsMapCount = {};
        visjsData.nodes.forEach(function (node) {
            if (node.label) {
                var nodeLabel = node.label.replace(/[ -\(\):\/]/g, "_");
                if (labelsMapCount[nodeLabel]) {
                    labelsMapCount[nodeLabel]++;
                    nodeLabel += "_" + labelsMapCount[nodeLabel];
                }else{
                    labelsMapCount[nodeLabel] = 1;
                }
                nodesMap[node.id] = nodeLabel;
            }
        });

        var str = "@startuml\r\n";

        visjsData.nodes.forEach(function (node) {
            if (!nodesMap[node.id]) return;
            if (node.shape == "dot" || node.data.type == "Class") {
                str += "class " + nodesMap[node.id] + "\r\n";
            } else {
                str += "object " + nodesMap[node.id] + "\r\n";
            }
        });

        visjsData.edges.forEach(function (edge) {
            var relation = "<--";
            if (!edge.label)
                //subClass
                relation = "<|--";
            var label = "";
            if (edge.label) label = " : " + edge.label;
            if (!nodesMap[edge.to]) return;
            if (nodesMap[edge.to].startsWith("class")) {
                relation = "<|--";
                label = "";
            }

            str += nodesMap[edge.to] + " " + relation + " " + nodesMap[edge.from] + label + "\r\n";
        });
        str += "@enduml";

        console.log(str);
        if(notDisplayDiagram){
            return str
        }
        $("#smallDialogDiv").html("<div id='plantUmlImg' style='width:80%;height: 500px' />");
        $("#smallDialogDiv").dialog("open");
        self.getImage(str, "plantUmlImg");
    };

    return self;
})();

export default PlantUmlTransformer;

window.PlantUmlTransformer = PlantUmlTransformer;
