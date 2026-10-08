import SimpleListSelectorWidget from "../../uiWidgets/simpleListSelectorWidget.js";
import Lineage_sources from "./lineage_sources.js";
import MappingColumnsGraph from "../mappingModeler/mappingColumnsGraph.js";

var Lineage_sqlDataExtractor = (function () {

    var self = {}

    self.currentNodeType="mappedToTableNode"
    self.Lineage_sqlDataExtractor =
        self.init = function () {
            self.isRecording = false
            $("#dataExtractorDiv").load("./modules/tools/lineage/html/lineage_sqlDataExtractorDialog.html", function (err) {


            })


        }


    self.drawDatabaseMappedNodes = function () {
        var source = Lineage_sources.activeSource
        MappingColumnsGraph.getSourceMappingsModel(source, "ClassesAndRelations", function (err, json) {
            if (err) {
                return alert(err.responseText || err)
            }

            if (json.nodes.length == 0) {
                return alert("nod Classes found")
            }
            var visjsData = {nodes: [], edges: []};
            var shape = "diamond"

            var existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
            json.nodes.forEach(function (node) {

                if (!existingNodes[node.id]) {
                    existingNodes[node.id] = 1;
                    visjsData.nodes.push({
                        id: node.id,
                        label: node.data.label,
                        shape: shape,
                        color: "#ddd",
                        data: {
                            id: node.id,
                            label: node.data.label,
                            source: source,
                            type: self.currentNodeType
                        },
                    });
                }

            });
            if (Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                Lineage_whiteboard.lineageVisjsGraph.data.nodes.update(visjsData.nodes);
                Lineage_whiteboard.lineageVisjsGraph.data.edges.update(visjsData.edges);
            } else {
                Lineage_whiteboard.drawNewGraph(visjsData, "graphDiv");
            }
        });


    }


    self.startPathRecording = function () {
        self.isRecording = true


    }
    self.getSQL = function () {

    }

    self.executeSQL = function () {

    }

    self.addClassToPath=function(node){



    }


    return self;
})()

export default Lineage_sqlDataExtractor;
window.Lineage_sqlDataExtractor = Lineage_sqlDataExtractor