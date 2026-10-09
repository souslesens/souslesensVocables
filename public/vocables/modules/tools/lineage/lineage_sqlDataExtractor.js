import SimpleListSelectorWidget from "../../uiWidgets/simpleListSelectorWidget.js";
import Lineage_sources from "./lineage_sources.js";
import MappingColumnsGraph from "../mappingModeler/mappingColumnsGraph.js";

import MappingsToSql, {extractRelationMap,buildSqlByDatabaseSources} from "../mappingModeler/mappingsToSql.js";

var Lineage_sqlDataExtractor = (function () {

    var self = {}

    self.currentNodeType = "mappedToTableNode"
    self.Lineage_sqlDataExtractor =
        self.init = function () {
            self.isRecording = false
            $("#dataExtractorDiv").load("./modules/tools/lineage/html/lineage_sqlDataExtractorDialog.html", function (err) {


            })


        }


    self.drawDatabaseMappedNodes = function () {
        var source = Lineage_sources.activeSource
        MappingColumnsGraph.getSourceMappingsModel(source, null, function (err, json) {
            var relationsMap = MappingsToSql.extractRelationMap(json);
            self.currentMappingJson=json

self.currentRelationsMap=relationsMap;
            var visjsData = {nodes: [], edges: []};
            var existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
            var shape = "diamond"
            for (const [key, values] of relationsMap) {
                values.forEach(function (value) {
                    if (value.kind == "objectProperty") {
                        if (!existingNodes[value.subjectUri]) {
                            existingNodes[value.subjectUri] = 1;
                            visjsData.nodes.push({
                                id: value.subjectUri,
                                label: value.subjectLabel,
                                shape: shape,
                                color: "#ddd",
                                data: {
                                    id: value.subjectUri,
                                    label: value.subjectLabel,
                                    source: source,
                                    type: self.currentNodeType
                                },
                            });
                        }
                        if (!existingNodes[value.objectUri]) {
                            existingNodes[value.objectUri] = 1;
                            visjsData.nodes.push({
                                id: value.objectUri,
                                label: value.objectLabel,
                                shape: shape,
                                color: "#ddd",
                                data: {
                                    id: value.objectUri,
                                    label: value.objectLabel,
                                    source: source,
                                    type: self.currentNodeType
                                },
                            });
                        }

                        if (!existingNodes[key]) {
                            existingNodes[key] = 1;
                            visjsData.edges.push({
                                id: key,
                                from: value.subjectUri,
                                to: value.objectUri,
                                label: value.predicateLabel,
                                data: {
                                    label: value.predicateLabel,
                                    source: source,
                                }
                            })


                        }
                    }
                })


            }


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
        self.currentPaths=[]
        var jstreeData = []
        JstreeWidget.loadJsTree("sqlDataExtractor_jstreeDiv", jstreeData, {})


    }
    self.clearPath = function () {
        JstreeWidget.empty("sqlDataExtractor_jstreeDiv")
    }
    self.getSQL = function () {



        const queries =
            buildSqlByDatabaseSources(
                self.currentPaths,
                self.currentRelationsMap,
                self.currentMappingJson
            );

        for (
            const [
                databaseName,
                { datasource, sql }
            ] of queries
            ) {
            console.log(
                databaseName,
                datasource,
                sql
            );
            self.sql=sql


        }


        /* var str = "" + fsSync.readFileSync("C:\\Users\\claud\\Downloads\\mappings_PAZFLOR_ABOX_ALL_51.json")
         var json = JSON.parse(str)

         var sql=run(json,"CFIHOS")
     }

     self.executeSQL = function () {*/

        var x= self.sql

    }

    self.addClassToPath = function (node) {
      // var nodes= JstreeWidget.getjsTreeNodes("sqlDataExtractor_jstreeDiv");


if(self.lastRecordedNode){
    for (const [key, values] of self.currentRelationsMap) {
        if(key.startsWith(self.lastRecordedNode.id) && key.endsWith(node.id)){
            self.currentPaths.push(key)
        }else if(key.endsWith(self.lastRecordedNode.id) && key.startsWith(node.id)){
            self.currentPaths.push(key)
        }
    }
}




       self.lastRecordedNode=node

        var jstreedata = [{
            id: node.id,
            text: node.label,
            parent: "#",
            data:{}
        }]
        JstreeWidget.addNodesToJstree("sqlDataExtractor_jstreeDiv", "#", jstreedata);

        jstreedata = []
        for (const [key, values] of self.currentRelationsMap) {
            values.forEach(function (value) {
                if(value.subjectUri==node.id && value.kind=="dataProperty"){
                    jstreedata.push({
                       id:key,
                        text:value.predicateLabel,
                        parent:node.id,
                        data:{
                           type: value.objectUri,
                            path:key,
                        }



                    })

                }



            })
        }

        JstreeWidget.addNodesToJstree("sqlDataExtractor_jstreeDiv", node.id, jstreedata);


    }


    return self;
})()

export default Lineage_sqlDataExtractor;
window.Lineage_sqlDataExtractor = Lineage_sqlDataExtractor