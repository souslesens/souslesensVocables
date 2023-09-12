import common from "../shared/common.js";
import visjsGraphClass from "../graph/VisjsGraphClass.js";
import JstreeWidget from "../uiWidgets/jstreeWidget.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";


var KGcreatorGraph = (function () {
    var self = {};

    self.showDialog = function (mappingObjectsMap) {
        self.drawMappings(mappingObjectsMap, function (err, visjsData) {
            self.loadMappingsJstree(visjsData);
        });
    };

    self.loadMappingsJstree = function (visjsData) {
        var jstreeData = [
            {
                id: "MappingFiles",
                text: "MappingFiles",
                parent: "#",
                data:{
                    type:"MappingFiles"
                }
            },
            {
                id: "Classes",
                text: "Classes",
                parent: "#",
                data:{
                    type:"Classes"
                }
            },
        ];
        // var nodes=self.mappingVisjsGraph.data.nodes.get();
        var nodes = visjsData.nodes;
        var existingNodes={}
        nodes.forEach(function (item) {
            var jstreeNode = JSON.parse(JSON.stringify(item));
            jstreeNode.text = jstreeNode.label;
            if (item.data && item.data.type == "Class") {
                jstreeNode.parent = "Classes";
                jstreeData.push(jstreeNode);
            }
            if (item.data && item.data.type == "FileColumn") {
                if(!existingNodes[jstreeNode.data.fileName]) {
                    existingNodes[jstreeNode.data.fileName]=1
                    jstreeNode.parent = "MappingFiles";
                    jstreeData.push({
                        id:jstreeNode.data.fileName,
                        text:jstreeNode.data.fileName,
                        parent:"MappingFiles",
                        data:{  id:jstreeNode.data.fileName,
                            label:jstreeNode.data.fileName,
                            fileName:jstreeNode.data.fileName

                        }
                    });
                }
            }
        });
        var options = {selectTreeNodeFn:function(event, obj){
            if(!obj.node.data)
                return;
            var fileName=obj.node.data.fileName
            var newNodes=[]
                self.mappingVisjsGraph.data.nodes.get().forEach(function(visjsNode){
                    var hidden=true
                if(obj.node.data.type=="MappingFiles" || visjsNode.data && visjsNode.data.fileName==fileName){
                    hidden=false
                    }
                    newNodes.push({id:visjsNode.id,hidden:hidden})
                })
                self.mappingVisjsGraph.data.nodes.update(newNodes)
            }};

        JstreeWidget.loadJsTree("KGcreatorGraph_jstreeDiv", jstreeData, options);
    };

    self.drawMappings = function (mappingObjectsMap, callback) {
        if (!mappingObjectsMap) {
            mappingObjectsMap = { [self.currentJsonObject.fileName]: self.currentJsonObject };
        }
        var visjsData = { nodes: [], edges: [] };

        var existingNodes = {};
        var shape = "box";
        for (var fileName in mappingObjectsMap) {
            var mappingObject = mappingObjectsMap[fileName];
            if (mappingObject.tripleModels) {
                mappingObject.tripleModels.forEach(function (item) {
                    function getNodeAttrs(str) {
                        if (str.indexOf("http") > -1) {
                            return { type: "Class", color: "#70ac47", shape: "ellipse" };
                        }
                        if (str.indexOf(":") > -1) {
                            // return "#0067bb";
                            return { type: "OwlType", color: "#0067bb", shape: "ellipse" };
                        } else {
                            if (mappingObject.fileName) {
                                var color = common.getResourceColor("mappingFileName", mappingObject.fileName);
                                return { type: "FileColumn", color: color, shape: "box" };
                            }
                            return {};
                        }
                    }

                    if (!existingNodes[item.s]) {
                        existingNodes[item.s] = 1;
                        var label = Sparql_common.getLabelFromURI(item.s);
                        var attrs = getNodeAttrs(item.s);
                        visjsData.nodes.push({
                            id: item.s,
                            label: label,
                            shape: attrs.shape,
                            color: attrs.color,
                            data: {
                                id: item.s,
                                label: label,
                                fileName: fileName,
                                type: attrs.type,
                            },
                        });
                    }
                    if (!existingNodes[item.o]) {
                        existingNodes[item.o] = 1;
                        var label = Sparql_common.getLabelFromURI(item.o);

                        var attrs = getNodeAttrs(item.s);
                        visjsData.nodes.push({
                            id: item.o,
                            label: label,
                            shape: attrs.shape,
                            color: attrs.color,
                            data: {
                                id: item.s,
                                label: label,
                                fileName: fileName,
                                type: attrs.type,
                            },
                        });
                    }
                    var edgeId = item.s + item.p + item.o;
                    var label = Sparql_common.getLabelFromURI(item.p);
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1;
                        visjsData.edges.push({
                            id: edgeId,
                            from: item.s,
                            to: item.o,
                            label: label,
                            // color: getNodeAttrs(item.o),
                            arrows: {
                                to: {
                                    enabled: true,
                                    type: Lineage_whiteboard.defaultEdgeArrowType,
                                    scaleFactor: 0.5,
                                },
                            },
                        });
                    }
                });
            }
        }

        //  var html = "<div id='KGcreator_mappingsGraphDiv' style='width:1100px;height:750px'></div>";
        $("#mainDialogDiv").dialog("open");
        //$("#mainDialogDiv").html(html);
        $("#mainDialogDiv").load("snippets/KGcreator/KGcreatorGraph.html", function () {
            self.mappingVisjsGraph = new visjsGraphClass("KGcreator_mappingsGraphDiv", visjsData, {});
            self.mappingVisjsGraph.draw();

            callback(null, visjsData);
        });
    };
    self.groupByFile = function () {
        var nodes = self.mappingVisjsGraph.data.nodes.get();
        var newNodes = {};
        var visjsData = { nodes: [], edges: [] };
        nodes.forEach(function (node) {
            if (!node.data || !node.data.fileName) return;
            if (!newNodes[node.data.fileName]) {
                newNodes[node.data.fileName] = 1;
                visjsData.nodes.push({
                    id: node.data.fileName,
                    label: node.data.fileName,
                    shape: "dot",
                    color: node.color,
                });
            }
            var edgeId = node.data.fileName + "_" + node.id;
            visjsData.edges.push({
                id: edgeId,
                from: node.id,
                to: node.data.fileName,
                color: "grey",
            });
        });

        self.mappingVisjsGraph.data.nodes.update(visjsData.nodes);
        self.mappingVisjsGraph.data.edges.update(visjsData.edges);
    };
    self.groupByClass = function () {};

    self.toSVG = function () {
        self.mappingVisjsGraph.toSVG();
    };

    return self;
})();

export default KGcreatorGraph;
window.KGcreatorGraph = KGcreatorGraph;
