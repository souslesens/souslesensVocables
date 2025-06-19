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
                self.browse.init()


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






self.browse= {
        init:function() {


          self.currentSearchResult = null;
            var currentHit = null;
            $("#Browse_searchAllSourcesTermInput").keypress(function (e) {
                if (e.which == 13) {
                    var term = $("#Browse_searchAllSourcesTermInput").val();
                    var exactMatch = $("#Browse_exactMatchCBX").prop("checked");
                    var mode = "fuzzyMatch";
                    if (exactMatch) mode = "exactMatch";
                    var options = {parentlabels: true, skosLabels: true};
                    if (!term || term == "") return alert(" enter a word ");


                    var sources = Object.keys(Lineage_sources.loadedSources)

                    SearchUtil.getSimilarLabelsInSources(null, sources, [term], null, mode, options, function (_err, result) {
                        if (_err) return alert(err.responseText);
                        self.currentSearchResult = result[0].matches;
                        self.currentSearchResult.parentIdsLabelsMap = result.parentIdsLabelsMap;

                        var html = "<ul>";

                        var array = Object.keys(self.currentSearchResult);
                        array.sort(function (a, b) {
                            return self.currentSearchResult[b].length - self.currentSearchResult[a].length;
                        });
                        array.forEach(function (index) {
                            // for (var index in self.currentSearchResult) {
                            if (index != "parentIdsLabelsMap")
                                html += '<li  class= "Browse_searchList" id=\'' + index + "' onclick='Lineage_queryWhiteBoard.browse.listIndexHits(\"" + index + "\")'>" + index + " : " + self.currentSearchResult[index].length + "</li>";
                        });
                        html += "</ul>";
                        $("#Browse_searchListDiv").html(html);
                        $("#Browse_indexHitsDiv").html("");
                        $("#Browse_hitDetailsDiv").html("");
                    });
                }
            });
        },

    encodeUriForHtmlId:function (uri) {
        var str = btoa(uri).replace(/=/g, "");
        return str;
    },



    listIndexHits : function (index) {

        var html = "<ul>";
        var distinctIds = {};
        $(".Browse_searchList").removeClass("selectedItem");
        $("#" + index).addClass("selectedItem");

        self.currentSearchResult[index].sort(function (a, b) {
            if (a.label > b.label) return 1;
            if (a.label < b.label) return -1;
            return 0;
        });

        self.currentSearchResult[index].forEach(function (hit) {
            if (!distinctIds[hit.id]) {
                distinctIds[hit.id] = 1;

                html += '<li   class="Browse_indexList" id=\'' + self.browse.encodeUriForHtmlId(hit.id) + "' onclick='Lineage_queryWhiteBoard.browse.showHitDetails(\"" + index + "|" + hit.id + "\")'>" + hit.label + "</li>";
            }
        });
        html += "</ul>";
        $("#Browse_indexHitsDiv").html(html);
        $("#Browse_hitDetailsDiv").html("");
    },

    showHitDetails: function (hitKey) {
        var array = hitKey.split("|");
        var hit;
        self.currentSearchResult[array[0]].forEach(function (item) {
            if ((item.id = array[1])) hit = item;
        });
        if (!hit) return console.log("no hit");
        $(".Browse_indexList").removeClass("selectedItem");
        $("#" + self.browse.encodeUriForHtmlId(hit.id)).addClass("selectedItem");
        var html = "";
        if (hit.parents) {
            html += "<div class='Browse_nodeParents'>";
            var notFirst = false;
            hit.parents.forEach(function (parent, index) {
                if (notFirst) html += " -> ";
                var parentLabel = self.currentSearchResult.parentIdsLabelsMap[parent];
                if (parentLabel && typeof parentLabel == "string") {
                    html += parentLabel;
                    notFirst = true;
                }
            });
            html += "</div>";
        }
        html += "<div  id='Browse_nodeInfosDiv' ></div>";
        if (!Config.sources[hit.source].controllerName) {
            Config.sources[hit.source].controllerName = "" + Config.sources[hit.source].controller;
            Config.sources[hit.source].controller = eval(Config.sources[hit.source].controller);
        }
        var node = {data: {id: hit.id}};
        NodeInfosWidget.showNodeInfos(hit.source, node, "Browse_hitDetailsDiv", {
            hideModifyButtons: true,
            noDialog: true
        });

        // $("#Browse_hitDetailsDiv").html(html);
    }
}

    return self;


})()
export default Lineage_queryWhiteBoard;
window.Lineage_queryWhiteBoard = Lineage_queryWhiteBoard