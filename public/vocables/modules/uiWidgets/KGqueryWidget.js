import VisjsGraphClass from "../graph/VisjsGraphClass.js";
import Lineage_sources from "../tools/lineage/lineage_sources.js";
import OntologyModels from "../shared/ontologyModels.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";
import Lineage_relationIndividualsFilter from "../tools/lineage/lineage_relationIndividualsFilter.js";
import Sparql_proxy from "../sparqlProxies/sparql_proxy.js";
import PopupMenuWidget from "./popupMenuWidget.js";
import Export from "../shared/export.js";


var KGqueryWidget = (function() {
  var self = {};
  self.queryPathParams = {};
  self.vicinityArray = [];
  self.allQueryPathes = [];
  self.showDialog = function() {

    $("#mainDialogDiv").dialog("open");
    $("#mainDialogDiv").dialog("option", "title", "Query");
    $("#mainDialogDiv").load("snippets/KGqueryWidget.html", function() {
      self.source = Lineage_sources.activeSource;
      self.queryPathParams = {};
      self.allQueryPathes = [];
      self.getInferredModelVisjsData(self.source, function(err, visjsData) {
        if (err) {
          return alert(err.responseText);
        }
        self.vicinityArray = [];
        visjsData.edges.forEach(function(edge) {
          self.vicinityArray.push([edge.from, edge.to, edge.data.propertyId]);
        });

        var options = {
          onclickFn: KGqueryWidget.graphActions.onNodeClick,
          dndCtrlFn: KGqueryWidget.graphActions.onDnDnode
        };


        self.KGqueryGraph = new VisjsGraphClass("KGqueryWidget_graphDiv", visjsData, options);
        self.KGqueryGraph.draw();
      });
    });


  };


  self.addNode = function(node,nodeEvent) {
    var html = "";
    if (!self.currentGraphNode) {
      return;
    }
    var nodeDivId = "nodeDiv_" + common.getRandomHexaId(3);

    var divId;

    function getHtml(role) {
      divId = "nodeDiv_" + role;
      var html = "<div  class='KGqueryWidget_nodeDiv' id='" + divId + "'>" +
        "<span>" + self.currentGraphNode.label + "</span>" +
        "&nbsp;<input type='image' src='./icons/caret-right.png'  style='opacity: 0.5; width: 20px;height: 20px;}' onclick='KGqueryWidget.showNodeDivPopupMenu($(this).parent())'/>" +
        "<div  id='" + divId + "_filter'></div> </div>";
      return html;
    }

    var color = null;
    var fromNode = $("#KGqueryWidget_fromClassNodeDiv").val();

    /**

     if a path exist the new node has to be the target (to) Node of a new path and the from node should be the nearest node among the previous paths nodes
     **/
    if (self.queryPathParams.fromNode && self.queryPathParams.toNode) {


      self.getNearestNode(self.currentGraphNode.id, self.allQueryPathes, function(err, nodeId) {
        self.queryPathParams = { fromNode: {id:nodeId} };
        self.addNode();
      });

      return;
    }


    if (!self.queryPathParams.fromNode) {
      self.queryPathParams.fromNode = self.currentGraphNode;
      $("#KGqueryWidget_fromClassNodeDiv").html(getHtml("from"));
      color = "blue";
    }
    else if (!self.queryPathParams.toNode) {
      self.queryPathParams.toNode = self.currentGraphNode;
      $("#KGqueryWidget_toClassNodeDiv").html(getHtml("to"));
      color = "green";

      self.getPathBetweenNodes(self.queryPathParams.fromNode.id, self.queryPathParams.toNode.id, function(err, path) {
        if (err) {
          return alert(err.responseText);
        }
        self.currentPath = path;
        self.queryPathParams.path = path;

        self.allQueryPathes.push(JSON.parse(JSON.stringify(self.queryPathParams)));


        var newVisjsEdges = [];
        path.forEach(function(pathItem, index) {
         var edgeId = pathItem[0] + "_" + pathItem[2] + "_" + pathItem[1];
          newVisjsEdges.push({ id: edgeId, color: color, width: 3 });
        });
        self.KGqueryGraph.data.edges.update(newVisjsEdges);

      });

    }
    self.KGqueryGraph.data.nodes.update({ id: self.currentGraphNode.id, shape: "hexagon", size: 14, color: color });


    if(nodeEvent && nodeEvent.ctrlKey )
    self.addFilterToNode(divId);
  };


  self.addFilterToNode = function(divId) {

    var role = (divId == "nodeDiv_from") ? "subject" : "object";
    self.queryPathParams.filteringRole = role;
    var varName = "";//role + "_" + self.queryPathParams.pathIndex;
    IndividualValueFilterWidget.showDialog(null, varName, function(err, filter) {
      if (err) {
        return alert(err);
      }
      if (!filter) {
        return;
      }
      var role;
      if (self.queryPathParams.filteringRole = "subject") {
        self.queryPathParams.fromNode.filter = filter;
        role = "from";
      }
      else {
        self.queryPathParams.toNode.filter = filter;
        role = "from";
      }
      $("#nodeDiv_" + role + "_filter").html(filter);
    });


  };


  self.queryKG = function(output) {

    if (!self.queryPathParams.toNode) {
      return alert("missing target node in  path");
    }
    if (self.allQueryPathes.length == 0) {
      self.allQueryPathes.push(self.queryPathParams);
    }

    self.execPathQuery(self.allQueryPathes, function(err, result) {
      if (err) {
        return callbackEach(err);
      }
      var data = result.bindings;


      var tableCols = [];

      var classLabel = self.queryPathParams.fromNode.label;
      tableCols.push({ title: classLabel + "_label", defaultContent: "", width: "15%" });
      tableCols.push({ title: classLabel + "_value", defaultContent: "", width: "15%" });
      classLabel = self.queryPathParams.toNode.label;
      tableCols.push({ title: classLabel + "_label", defaultContent: "", width: "15%" });
      tableCols.push({ title: classLabel + "_value", defaultContent: "", width: "15%" });


      var tableData = [];
      data.forEach(function(item) {
        var line = [];
        line.push(item.subjectLabel ? item.subjectLabel.value : null);
        line.push(item.subjectValue ? item.subjectValue.value : null);
        line.push(item.objectLabel ? item.objectLabel.value : null);
        line.push(item.objectValue ? item.objectValue.value : null);
        tableData.push(line);
      });


      Export.showDataTable("KGqueryWidget_dataTableDiv", tableCols, tableData);
    });


  };


  self.execPathQuery = function(allQueryPathes, filterStr, callback) {


    var predicateStr = "";
    var filterStr = "";
    var optionalStr = "";
    allQueryPathes.forEach(function(queryPath, queryIndex) {
      var subjectVarName;
      if (queryIndex == 0) {
        subjectVarName = "?subject_" + queryIndex;
      }
      else {
        subjectVarName = "?object_" + (queryIndex - 1);
      }
      var objectVarName = "?object_" + queryIndex;

      predicateStr += subjectVarName + " ";
      queryPath.path.forEach(function(pathItem, pathIndex) {
        if (pathIndex > 0) {
          predicateStr += "/";
        }
        var inverseStr = (pathItem.length == 4) ? "^" : "";

        predicateStr += inverseStr + "<" + pathItem[2] + ">";
        if (pathIndex == 0) {
          var subjectUri = (pathItem.length < 4) ? pathItem[0] : pathItem[1];
          filterStr += " " + subjectVarName + "  rdf:type <" + subjectUri + ">. ";
        }
        else if (pathIndex == queryPath.path.length - 1) {
          var objectUri = (pathItem.length < 4) ? pathItem[1] : pathItem[0];
          filterStr += " " + objectVarName + "  rdf:type <" + objectUri + ">.";
        }
      });
      predicateStr += " " + objectVarName + ". ";


      if (queryPath.fromNode.filter) {
        filterStr += " " + subjectVarName + " " + queryPath.fromNode.filter + " ";
      }

      if (queryPath.toNode.filter) {
        filterStr += " " + objectVarName + " " + queryPath.fromNode.toNode + " ";
      }


      function addToStringIfNotExists(str, text) {
        if (text.indexOf(str) > -1) {
          return text;
        }
        else {
          return text + str;
        }
      }

      optionalStr = addToStringIfNotExists(" OPTIONAL {" + subjectVarName + " owl:hasValue " + subjectVarName + "Value}\n", optionalStr);
      optionalStr = addToStringIfNotExists(" OPTIONAL {" + objectVarName + " owl:hasValue " + objectVarName + "Value}\n", optionalStr);
      optionalStr = addToStringIfNotExists(" OPTIONAL {" + subjectVarName + " rdfs:label " + subjectVarName + "Label}\n", optionalStr);
      optionalStr = addToStringIfNotExists(" OPTIONAL {" + objectVarName + " rdfs:label " + objectVarName + "Label}\n", optionalStr);


    });


    var query = "PREFIX owl: <http://www.w3.org/2002/07/owl#>" + "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" + "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>";
    var fromStr = Sparql_common.getFromStr(self.source);
    query += "Select distinct *  " + fromStr + " where {" + predicateStr +"\n"+ optionalStr +"\n"+ filterStr;

    query += "} limit 10000";

    var url = Config.sources[self.source].sparql_server.url + "?format=json&query=";

    Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: self.source, caller: "getObjectRestrictions" }, function(err, result) {
      if (err) {
        return callback(err);
      }

      callback(null, { sparqlQuery: query, bindings: result.results.bindings });

    });

  };

  self.visjsNodeOptions = {
    shape: "box",//Lineage_whiteboard.defaultShape,
    size: Lineage_whiteboard.defaultShapeSize,
    color: "#ddd"//Lineage_whiteboard.getSourceColor(source)
  };


  self.getPathBetweenNodes = function(fromNodeId, toNodeId, callback) {

    var vicinityArray = self.vicinityArray;

    var body = {
      fromNodeUri: fromNodeId,
      toNodeUri: toNodeId,
      vicinityArray: vicinityArray
    };

    var payload = {
      body: body
    };
    $.ajax({
      type: "POST",
      url: `${Config.apiUrl}/shortestPath`,
      data: payload,
      dataType: "json",
      success: function(data, _textStatus, _jqXHR) {
        return callback(null, data);
      },
      error: function(err) {
        return callback(err);
      }
    });


  };

  self.getNearestNode = function(nodeId, queryPathes, callback) {

    var allCandidateNodesMap={}

    queryPathes.forEach(function(querypath) {
      if(false){// take all nodes in the path
      querypath.path.forEach(function(pathItem) {
        allCandidateNodesMap[pathItem[0]] = 0;
        allCandidateNodesMap[pathItem[1]] = 0;

      });
      }else{// only terminaisons of path
        allCandidateNodesMap[querypath.fromNode.id] = 0;
        allCandidateNodesMap[querypath.toNode.id] = 0;
      }




    });
   var  allCandidateNodesArray=Object.keys(allCandidateNodesMap)
    async.eachSeries(allCandidateNodesArray,function( candidateNodeId,callbackEach) {
      self.getPathBetweenNodes(candidateNodeId, nodeId, function(err, path) {
        if (err)
          return callbackEach(err)

        allCandidateNodesMap[candidateNodeId] = path.length
        callbackEach()
      })
    },function(err) {
      if (err)
        return callback(err)

      var minEdges=100
      var nearestNodeId=null;
     for( var key in  allCandidateNodesMap)
      if(allCandidateNodesMap[key]< minEdges){
        minEdges=allCandidateNodesMap[key]
        nearestNodeId=key
      }
     callback(null,nearestNodeId)
    })


  };

  self.getInferredModelVisjsData = function(source, callback) {
    if (!source) {
      source = self.source;
    }
    var inferredModel = [];

    var visjsData = { nodes: [], edges: [] };

    async.series(
      [
        //get effective distinct ObjectProperties
        function(callbackSeries) {
          OntologyModels.getInferredModel(source, {}, function(err, result) {
            if (err) {
              return callbackSeries(err);
            }
            inferredModel = result;

            if (inferredModel.length == 0) {
              callbackSeries("no inferred model for source " + source);
            }
            else {
              callbackSeries();
            }
          });
        },

        function(callbackSeries) {
          var existingNodes = {};

          var source = self.source;
          inferredModel.forEach(function(item) {
            item.sClass = item.sClass || item.sparent;
            item.oClass = item.oClass || item.oparent;


            if (!existingNodes[item.sClass.value]) {
              existingNodes[item.sClass.value] = 1;
              var label = item.sClassLabel ? item.sClassLabel.value : Sparql_common.getLabelFromURI(item.sClass.value);
              visjsData.nodes.push(VisjsUtil.getVisjsNode(source, item.sClass.value, label, null, self.visjsNodeOptions));
            }
            if (!existingNodes[item.oClass.value]) {
              existingNodes[item.oClass.value] = 1;
              var label = item.oClassLabel ? item.oClassLabel.value : Sparql_common.getLabelFromURI(item.oClass.value);
              visjsData.nodes.push(VisjsUtil.getVisjsNode(source, item.oClass.value, label, null, self.visjsNodeOptions));
            }
            var edgeId = item.sClass.value + "_" + item.prop.value + "_" + item.oClass.value;
            if (!existingNodes[edgeId]) {
              existingNodes[edgeId] = 1;

              visjsData.edges.push({
                id: edgeId,
                from: item.sClass.value,
                to: item.oClass.value,
                label: item.propLabel.value,
                font: { color: Lineage_whiteboard.restrictionColor },
                data: {
                  propertyId: item.prop.value,
                  source: source,
                  propertyLabel: item.propLabel.value
                },

                arrows: {
                  to: {
                    enabled: true,
                    type: "solid",
                    scaleFactor: 0.5
                  }
                },
                dashes: true,
                color: Lineage_whiteboard.restrictionColor
              });
            }
          });
          return callbackSeries();
        }

      ],
      function(err) {
        if (err) {
          return callback(err);
        }

        return callback(null, visjsData);
      }
    );
  };
  self.resetVisjNodes = function(ids) {
    var newNodes = [];
    if (!ids) {
      ids = self.KGqueryGraph.data.nodes.getIds();
    }
    if (!Array.isArray(ids)) {
      ids = [ids];
    }
    ids.forEach(function(id) {
      newNodes.push({
        id: id,
        shape: self.visjsNodeOptions.shape,
        size: self.visjsNodeOptions.size,
        color: self.visjsNodeOptions.color
      });
    });
    self.KGqueryGraph.data.nodes.update(newNodes);
  };

  self.resetVisjEdges = function() {

    var newVisjsEdges = [];
    self.KGqueryGraph.data.edges.getIds().forEach(function(edgeId, index) {
      newVisjsEdges.push({ id: edgeId, color: Lineage_whiteboard.restrictionColor, width: 1 });
    });
    self.KGqueryGraph.data.edges.update(newVisjsEdges);
  };


  self.clearAll = function() {
    self.queryPathParams = {};
    self.allQueryPathes = [];

    self.resetVisjNodes();
    self.resetVisjEdges();
    $("#KGqueryWidget_fromClassNodeDiv").html("");
    $("#KGqueryWidget_toClassNodeDiv").html("");
  };
  self.graphActions = {
    onNodeClick: function(node,point,nodeEvent,) {
      self.currentGraphNode = node;
      KGqueryWidget.addNode(node,nodeEvent);

    },

    onDnDnode: function(startNode, endNode, point) {

    }


  };

  self.removeNode = function(divId) {

    if (self.currentPath.forEach) {
      var newVisjsEdges = [];
      self.currentPath.forEach(function(pathItem, index) {
        var edgeId = pathItem[0] + "_" + pathItem[2] + "_" + pathItem[1];
        newVisjsEdges.push({ id: edgeId, color: Lineage_whiteboard.restrictionColor, width: 1 });

      });
      self.KGqueryGraph.data.edges.update(newVisjsEdges);
    }


    var nodeId;
    if (divId == "nodeDiv_from") {
      nodeId = self.queryPathParams.fromNode.id;
      self.queryPathParams.fromNode = null;

    }
    else {
      nodeId = self.queryPathParams.toNode.id;
      self.queryPathParams.toNode = null;

    }


    self.resetVisjNodes(self.currentGraphNode.id);


    $("#" + divId).remove();


  };

  self.showNodeDivPopupMenu = function(nodeDiv) {
    var nodeDivId = $(nodeDiv).attr("id");
    var html =
      " <span  class=\"popupMenuItem\" onclick=\"KGqueryWidget.addFilterToNode('" + nodeDivId + "');\">set Filter</span>" +
      " <span  class=\"popupMenuItem\" onclick=\"KGqueryWidget.removeNode('" + nodeDivId + "');\"> remove</span>";

    PopupMenuWidget.initAndShow(html, "KGqueryWidget_popupMenuDiv");

  };

  return self;
})();

export default KGqueryWidget;
window.KGqueryWidget = KGqueryWidget;