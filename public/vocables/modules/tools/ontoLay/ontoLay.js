import Lineage_sources from "../lineage/lineage_sources.js";
import MainController from "../../shared/mainController.js";

var OntoLay = (function () {
    var self = {}
       self.maxClasses = 100;
    self.currentTab='Class'
    self.onLoaded = function () {
        if (self.firstLoad) {
            self.firstLoad = false;

            SearchWidget.currentTargetDiv = "LineageNodesJsTreeDiv";
        }

        UI.initMenuBar(self.loadSources);
        $("#Lineage_graphEditionButtons").show();
        $("#Lineage_graphEditionButtons").load("./modules/tools/lineage/html/AddNodeEdgeButtons.html");
        $("KGquery_messageDiv").attr("id", "messageDiv");
        $("KGquery_waitImg").attr("id", "waitImg");
    };
    self.unload = function () {
        $("#graphDiv").empty();
        $("#lateralPanelDiv").resizable("destroy");
        $("#lateralPanelDiv").css("width", "435px");
    };
    self.loadSources = function () {
        Lineage_sources.loadSources(MainController.currentSource, function (err) {
            if (err) {
                return alert(err.responseText);
            }
            $("#lateralPanelDiv").load("./modules/tools/OntoLay/html/lateralPanel.html", function () {
                Lineage_whiteboard.initWhiteboardTab();
                Lineage_whiteboard.initUI();
                self.loadTopClasses();
                
            });
        })
    }
    self.loadTopClasses=function(){
        self.getTopClasses(Lineage_sources.activeSource, {},function (err, result) {
            if (err) {
                alert(err)
            }
            self.nodeIds = result.nodeIds
            self.currentDepth = result.currentDepth


        self.drawTopClasses ( self.nodeIds, self.currentDepth)
        });
    }


self.getTopClasses = function (sourceLabel, options, callback) {
    var options = {withoutImports: true}
    Sparql_generic.getSourceTaxonomy(sourceLabel, options, function (err, result) {
        if (err) {
            return callback(err)
        }
     
        
        

            var depthMap = {};
            for (var classUri in result.classesMap) {
                var parents = result.classesMap[classUri].parents;
                if (!depthMap["" + parents.length]) {
                    depthMap["" + parents.length] = [];
                }
                depthMap["" + parents.length].push(classUri);
            }
            var bottomClasses = null;
            var currentDepth;
            for (currentDepth = 0; currentDepth < 10; currentDepth++) {
                var parents = depthMap["" + currentDepth];
                if (parents && parents.length > 5 && parents.length < self.maxClasses) {
                    bottomClasses = depthMap["" + currentDepth];
                    break;
                }
            }
if(!bottomClasses){
 alert ("this graph has a horizontal hierarchical structure , cannot extract top Classes" )
 return  Lineage_whiteboard.drawTopConcepts(Lineage_sources.activeSource)
}
            var nodeIds = [];
            bottomClasses.forEach(function (classUri) {
                nodeIds.push({ data: { id: classUri } });
            });
            callback(null, { nodeIds: nodeIds, currentDepth: currentDepth });
        });
    };

    self.drawTopClasses = function (nodeIds, currentDepth, options) {
        if (!options) options = {};
        var totalDrawnClasses = 0;
        var newNodes = [];
        options.startLevel = currentDepth + 2;

        Lineage_whiteboard.drawNodesAndParents(nodeIds, currentDepth + 6, options, function (err, result) {
            result.nodes.forEach(function (node) {
                newNodes.push(node.id);
            });
            totalDrawnClasses += newNodes.length;
            options.drawBeforeCallback = true;
            async.whilst(
                function (callbackTest) {
                    //test

                    return totalDrawnClasses < self.maxClasses;
                },

                function (callbackWhilst) {
                    //   setTimeout(function () {

                    Lineage_whiteboard.addChildrenToGraph(Lineage_sources.activeSource, newNodes, options, function (err, result) {
                        newNodes = [];
                        result.nodes.forEach(function (node) {
                            newNodes.push(node.id);
                        });
                        //  newNodes=result.nodes
                        totalDrawnClasses += newNodes.length;
                        options.startLevel += 1;
                        callbackWhilst();
                    });
                    //  }, 1000)
                },
                function (err) {
                    Lineage_whiteboard.currentExpandLevel += options.startLevel;
                }
            );
        });
    };

    self.setHiearchicalLayout = function () {
        var options = {};
        if (!self.isHierarchical) {
            self.isHierarchical = true;
            options.shape = "box";
            options.layoutHierarchical = {
                direction: "LR",
                sortMethod: "hubsize",
                // parentCentralization: false,
                shakeTowards: "roots",
                blockShifting: true,
                edgeMinimization: true,
                parentCentralization: true,
                nodeSpacing: 40,
                treeSpacing: 50,
                levelSeparation: 250,
            };
        } else {
            self.isHierarchical = false;
        }

        Lineage_whiteboard.lineageVisjsGraph.clearGraph();
        self.drawTopClasses(self.nodeIds, self.currentDepth, options);
        // Lineage_whiteboard.lineageVisjsGraph.network.setOptions(options);
    };

    self.search = function (type) {
        var term = $("#ontolay_searchTermInput").val();

        $("#classesTab").css("display", "none");
        $("#propertiesTab").css("display", "none");

        $("#classesTab").css("display","none")
        $("#propertiesTab").css("display","none")
        if(!type){
            type=self.currentTab;
        }else{
            self.currentTab=type;
        }
        
        if(type=="Class"){

            $("#classesTab").css("display","block")
            var options={
                term:term,
                searchedSources:[Lineage_sources.activeSource],
                jstreeDiv: "LineageNodesJsTreeDiv"
            }

            SearchWidget.searchTermInSources(options)
        }

        else if(type=="Property"){
            $("#propertiesTab").css("display","block")
            Lineage_properties.searchTermInSources(term,true,false,"property")
        }
        else if(type=="Whiteboard"){

            Lineage_whiteboard.graph.searchNode(null, term)
        }
        







    }

    self.clearAll=function(){
        Lineage_whiteboard.initUI();
        self.loadTopClasses();
    }
    return self;
})();

export default OntoLay;
window.OntoLay = OntoLay;
