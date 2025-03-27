// eslint-disable-next-line @typescript-eslint/no-unused-vars
var GraphMlExport = (function () {
    var self = {};
    /*


<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<graphml
 xmlns="http://graphml.graphdrawing.org/xmlns"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
 xmlns:y="http://www.yworks.com/xml/graphml"
 xmlns:yed="http://www.yworks.com/xml/yed/3"
 xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns http://www.yworks.com/xml/schema/graphml/1.1/ygraphml.xsd">
  <key for="node" id="d1" yfiles.type="nodegraphics"/>
  <graph edgedefault="directed" id="G">
    <node id="n0">
      <data key="d1">
        <y:ShapeNode>
          <y:Shape type="rectangle"/>                              <!-- node shape -->
          <y:Geometry height="30.0" width="30.0" x="0.0" y="0.0"/> <!-- position and size -->
          <y:Fill color="#FFCC00" transparent="false"/>            <!-- fill color -->
          <y:BorderStyle color="#000000" type="line" width="1.0"/> <!-- border -->
          <y:NodeLabel>Label Text</y:NodeLabel>                    <!-- label text -->
        </y:ShapeNode>
      </data>
    </node>
  </graph>
</graphml>

     */

    self.VisjsDataToGraphMl = function (visjsData) {
        // remove orphan nodes or edges

        var nodesMap = {};
        visjsData.nodes.forEach(function (node) {
            nodesMap[node.id] = node;
        });
        var newNodes = [];
        var newEdges = [];
        var newNodesMap = {};
        visjsData.edges.forEach(function (edge) {
            if (nodesMap[edge.from] && nodesMap[edge.to]) {
                if (!newNodesMap[edge.from]) {
                    newNodes.push(nodesMap[edge.from]);
                }
                if (!newNodesMap[edge.to]) {
                    newNodes.push(nodesMap[edge.to]);
                }
                newEdges.push(edge);
            }
        });

        visjsData = { nodes: newNodes, edges: newEdges };

        var xml =
            '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' +
            "<graphml\n" +
            ' xmlns="http://graphml.graphdrawing.org/xmlns"\n' +
            ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n' +
            ' xmlns:y="http://www.yworks.com/xml/graphml"\n' +
            ' xmlns:yed="http://www.yworks.com/xml/yed/3"\n' +
            ' xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns http://www.yworks.com/xml/schema/graphml/1.1/ygraphml.xsd">';

        xml += '  <key for="node" id="d1" yfiles.type="nodegraphics"/>\n<key id="d2" for="edge" yfiles.type="edgegraphics"/>\n' + ' <graph edgedefault="directed" id="G">';

        visjsData.nodes.forEach(function (node) {
            if (!node.label) {
                node.label = "?";
            }
            node.label = node.label.replace("&", "&amp;");

            var color = common.RGBtoHexColor(node.color.background || node.color);
            xml +=
                ' \n<node id="' +
                node.id +
                '">\n' +
                '  <data key="d1">\n' +
                "        <y:ShapeNode>\n" +
                '          <y:Shape type="roundrectangle"/>                              <!-- node shape -->\n' +
                '          <y:Geometry height="30.0" width="' +
                node.label.length * 7 +
                ".0" +
                '" x="0.0" y="0.0"/> <!-- position and size -->\n' +
                '          <y:Fill color="' +
                color +
                '" transparent="false"/>            <!-- fill color -->\n' +
                '          <y:BorderStyle color="#000000" type="line" width="1.0"/> <!-- border -->\n' +
                "          <y:NodeLabel>" +
                node.label +
                "</y:NodeLabel>                    <!-- label text -->\n" +
                "        </y:ShapeNode>\n" +
                "      </data>" +
                "</node>\n";
        });

        visjsData.edges.forEach(function (edge) {
            if (!edge.label) edge.label = "";
            edge.label = edge.label.replace("&", "&amp;");
            xml +=
                '     <edge source="' +
                edge.from +
                '" target="' +
                edge.to +
                '">\n' +
                //' <data key="d8"/>\n' +
                '      <data key="d2">\n' +
                "        <y:PolyLineEdge>\n" +
                '          <y:Path sx="-55.0" sy="0.0" tx="47.5" ty="0.0"/>\n' +
                '          <y:LineStyle color="#000000" type="line" width="1.0"/>\n' +
                '          <y:Arrows source="none" target="standard"/>\n' +
                "          <y:EdgeLabel>" +
                edge.label +
                "</y:EdgeLabel>\n" +
                '          <y:BendStyle smoothed="false"/>\n' +
                "        </y:PolyLineEdge>\n" +
                "      </data>" +
                "</edge>\n";
        });
        xml += " </graph>\n" + "</graphml>";
        return xml;
    };

    return self;
})();

export default GraphMlExport;

window.GraphMlExport = GraphMlExport;
window.GraphMlExport = GraphMlExport;
