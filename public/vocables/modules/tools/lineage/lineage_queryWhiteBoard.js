import OntologyModels from "../../shared/ontologyModels.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import Lineage_sources from "./lineage_sources.js";
import SearchUtil from "../../search/searchUtil.js";

var Lineage_queryWhiteBoard = (function () {

    var self = {}

    self.indexName = "whiteboard_" + "test1"
    self.showDialog = function () {

        self.loadWhiteboardContent(function (err, result) {
            if(err){
                return alert (err)
            }
            $("#mainDialogDiv").load("modules/tools/lineage/html/queryWhiteBoardDialog.html", function () {
                $("#mainDialogDiv").dialog("open")


            })
        })

    }


    self.loadWhiteboardContent = function (callback) {
        return callback()
        if (!Lineage_whiteboard.lineageVisjsGraph || !Lineage_whiteboard.lineageVisjsGraph.data) {
            return callback("no whiteboard content")
        }

        var nodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get()
        var nodeIds = Lineage_whiteboard.lineageVisjsGraph.data.nodes.getIds()
        var edges = Lineage_whiteboard.lineageVisjsGraph.data.edges.get()












        self.getNodesAncestors (nodeIds,function(err, ancestorIdsMap){

            var nodeIdsMap={}
            var edgesFromMap={}
            nodes.forEach(function(node){
                nodeIdsMap[node.id]=node;
            })
            edges.forEach(function(edge){
                edgesFromMap[edge.from]=edge;
            })



            //prepare nodeLabelsMap





            var dataArray=[]
            nodes.forEach(function(node){
               var obj= {
                   id: node.data.id,
                   label: node.data.label,
                   skoslabels: [],
                   parents: [],
                   type: "Class"
               }

                if(edgesFromMap[node.id]){
                    var edge=edgesFromMap[node.id]
                    obj.parents.push(JSON.stringify({predicate:edge.label || "", object:edge.to, objectLabel:nodeIdsMap[edge.to].label }))
                }
                if(ancestorIdsMap[node.data.id]){
                    var parent=ancestorIdsMap[node.data.id]
                    obj.parent=parent.id
                }

                dataArray.push(obj)
            })


            SearchUtil.indexData(self.indexName, dataArray, true, function (err, result) {
                if (err) {
                    return callback(err)
                }


                callback(err, dataArray)
            })
    })





    }

    self.getNodesAncestors=function (nodeIds,callback){

        Sparql_OWL.getNodesAncestorsOrDescendants(Lineage_sources.activeSource, nodeIds, {excludeItself:false},function (err, result) {
            if (err) {
                return callback(err)
            }
            var uniqueNodes = {}
            var ancestorIdssMap = {}

            for (var key in result.rawResult) {
                var obj = result.rawResult[key]
                if (!uniqueNodes[obj.superClassSubClass.value]) {
                    uniqueNodes[obj.superClassSubClass.value] = 1
                    ancestorIdssMap[obj.superClassSubClass.value] = {
                        id: obj.superClassSubClass.value,
                        label: obj.superClassSubClassLabel.value,
                        superClass: obj.superClass.value
                    }

                }

            }

                callback(null, result)

        })



    }






    self.searchTerm=function(){

  var words=[$("#queryWhiteboard_searchInput").val()]
        SearchUtil.getElasticSearchMatches(words, [self.indexName], "fuzzy", 0, 1000, {}, function (err, result) {
            if (err) {
                return alert(err.responseText || err);
            }


            result.forEach(function (item, index) {
                if (item.error) {
                    classesArray[index].error = item.error;
                    return;
                }
                var hits = item.hits.hits;
                var matches = {};
                hits.forEach(function (toHit) {

                })
            })
        })
    }

    return self;


})()
export default Lineage_queryWhiteBoard;
window.Lineage_queryWhiteBoard = Lineage_queryWhiteBoard