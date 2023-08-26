import VisjsGraphClass from "../graph/VisjsGraphClass.js";
import Lineage_sources from "../tools/lineage/lineage_sources.js";
import OntologyModels from "../shared/ontologyModels.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";
import Lineage_relationIndividualsFilter from "../tools/lineage/lineage_relationIndividualsFilter.js";
import Sparql_proxy from "../sparqlProxies/sparql_proxy.js";
import PopupMenuWidget from "./popupMenuWidget.js";
import Export from "../shared/export.js";
import common from "../shared/common.js";
import Lineage_whiteboard from "../tools/lineage/lineage_whiteboard.js";
import IndividualAggregateWidget from "./individualAggregateWidget.js";
import IndividualValueFilterWidget from "./individualValuefilterWidget.js";
import SimpleListSelectorWidget from "./simpleListSelectorWidget.js";


var KGqueryWidget = (function() {
  var self = {};
  self.queryPathParams = {};
  self.vicinityArray = [];
  self.allQueryPathes = [];
  self.classDivsMap = {};
  self.classeMap = {};
  self.pathDivsMap = {};
  self.classFiltersMap = {};


  self.showDialog = function() {

    $("#mainDialogDiv").dialog("open");
    $("#mainDialogDiv").dialog("option", "title", "Query");
    $("#mainDialogDiv").load("snippets/KGqueryWidget.html", function() {
      self.source = Lineage_sources.activeSource;

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
        self.clearAll();
      });
    });


  };


  self.addNode = function(node, nodeEvent) {
    var html = "";
    if (!self.currentGraphNode) {
      return;
    }


    function getClassNodeDivHtml(node, nodeDivId) {
      var html = "<div  class='KGqueryWidget_pathNodeDiv' id='" + nodeDivId + "'>" +
        "<span style='font:bold 14px'>" + self.getVarName(node, true) + "" +
        "<button class='KGqueryWidget_divActions btn btn-sm my-1 py-0 btn-outline-primary' about='add filter' onclick='KGqueryWidget.addNodeFilter(\"" + nodeDivId + "\");'>F</button>";
      /*   if (node.data.datatype) {
           html += "<button class='KGqueryWidget_divActions btn btn-sm my-1 py-0 btn-outline-primary' about='add filter' onclick='KGqueryWidget.groupBy(\"" + nodeDivId + "\");'>∑</button>";
         }
         else {
           html += "<button class='KGqueryWidget_divActions btn btn-sm my-1 py-0 btn-outline-primary' about='add filter' onclick='KGqueryWidget.groupBy(\"" + nodeDivId + "\");'>⋃</button>";
         }*/
      html += "<div style='font-size: 10px;' id='" + nodeDivId + "_filter'></div> " +
        "</div>" +
        "</div>";
      return html;


    }


    function getPathHtml(pathDivId) {
      var html = "<div  class='KGqueryWidget_pathDiv' id='" + pathDivId + "'>" + "</div>";
      return html;
    }


    var color = null;


    /**

     if a path exist the new node has to be the target (to) Node of a new path and the from node should be the nearest node among the previous paths nodes
     */
    if (self.queryPathParams.fromNode && self.queryPathParams.toNode) {


      self.getNearestNode(self.currentGraphNode.id, self.allQueryPathes, function(err, nodeId) {
        self.queryPathParams = { fromNode: { id: nodeId } };
        var pathDivId = "pathDiv_" + common.getRandomHexaId(3);
        var nodeDivId = "nodeDiv_" + common.getRandomHexaId(3);
        var fromNode = self.classeMap[nodeId];
        self.queryPathParams.fromNode = fromNode;
        self.queryPathParams.pathDivId = pathDivId;
        self.queryPathParams.fromNodeDivId = nodeDivId;
        self.classDivsMap[nodeDivId] = self.currentGraphNode;

        $("#KGqueryWidget_pathsDiv").append(getPathHtml(pathDivId));

        $("#" + self.queryPathParams.pathDivId).append(getClassNodeDivHtml(fromNode, nodeDivId));

        self.addNode();
      });

      return;
    }


    else if (!self.queryPathParams.fromNode) {
      color = "blue";
      self.classeMap[self.currentGraphNode.id] = self.currentGraphNode;
      var pathDivId = "pathDiv_" + common.getRandomHexaId(3);
      var nodeDivId = "nodeDiv_" + common.getRandomHexaId(3);
      self.queryPathParams.fromNode = self.currentGraphNode;
      self.queryPathParams.pathDivId = pathDivId;
      self.queryPathParams.fromNodeDivId = nodeDivId;

      self.classDivsMap[nodeDivId] = self.currentGraphNode;

      $("#KGqueryWidget_pathsDiv").append(getPathHtml(pathDivId));
      $("#" + self.queryPathParams.pathDivId).append(getClassNodeDivHtml(self.currentGraphNode, nodeDivId));


    }
    else if (!self.queryPathParams.toNode) {
      self.classeMap[self.currentGraphNode.id] = self.currentGraphNode;
      self.queryPathParams.toNode = self.currentGraphNode;
      color = "green";
      self.getPathBetweenNodes(self.queryPathParams.fromNode.id, self.queryPathParams.toNode.id, function(err, path) {
        if (err) {
          return alert(err.responseText);
        }

        self.managePathAmbiguousEdges(path,function(unAmbiguousPath){
          self.currentPath = unAmbiguousPath;
          self.queryPathParams.path = unAmbiguousPath;

        self.queryPathParams.index = self.allQueryPathes.length;


        var queryObject = JSON.parse(JSON.stringify(self.queryPathParams));
        self.pathDivsMap[pathDivId] = queryObject;
        self.allQueryPathes.push(queryObject);

        var nodeDivId = "nodeDiv_" + common.getRandomHexaId(3);
        self.classDivsMap[nodeDivId] = self.currentGraphNode;
        $("#" + self.queryPathParams.pathDivId).append(getClassNodeDivHtml(self.currentGraphNode, nodeDivId));
        //  self.queryPathParams = {};


        var newVisjsEdges = [];
        path.forEach(function(pathItem, index) {
          var edgeId = pathItem[0] + "_" + pathItem[2] + "_" + pathItem[1];
          newVisjsEdges.push({ id: edgeId, color: color, width: 3 });
        });





        self.KGqueryGraph.data.edges.update(newVisjsEdges);


          if (nodeEvent && nodeEvent.ctrlKey) {
            self.addNodeFilter(nodeDivId);
          }

        });

      });

    }
    self.KGqueryGraph.data.nodes.update({ id: self.currentGraphNode.id, shape: "hexagon", size: 14, color: color });


    if (nodeEvent && nodeEvent.ctrlKey) {
      self.addNodeFilter(nodeDivId);
    }
  };

  self.managePathAmbiguousEdges = function(path,callback) {
    var fromToMap = {};
    path.forEach(function(pathItem, pathIndex) {
      var fromTo = [pathItem[0] +"_"+ pathItem[1]];
      if (!fromToMap[fromTo]) {
        fromToMap[fromTo] = [];
      }
      fromToMap[fromTo].push(pathItem[2]);
    });
    var ambiguousEdges = null;
    for (var key in fromToMap) {
      if (fromToMap[key].length > 1) {
        ambiguousEdges= { id: key, properties: fromToMap[key] };
      }
    }
    if (ambiguousEdges && ambiguousEdges.properties.length > 0) {
      return SimpleListSelectorWidget.showDialog(null,
        function(callbackLoad) {
          return callbackLoad(ambiguousEdges.properties);
        }
        , function(selectedProperty) {
          ambiguousEdges.selectedProperty = selectedProperty;

          var pathsToDelete = []
          path.forEach(function(pathItem, pathIndex) {
            if (ambiguousEdges.id == [pathItem[0] + "_" + pathItem[1]] || ambiguousEdges.id == [pathItem[1] + "_" + pathItem[0]]) {
              if (pathItem[2] != ambiguousEdges.selectedProperty) {
                pathsToDelete.push(pathIndex)
              }
            }
          })
          var unambiguousPaths = []
          path.forEach(function(pathItem, pathIndex) {
            if (pathsToDelete.indexOf(pathIndex) < 0)
              unambiguousPaths.push(pathItem)
          })
          return callback(unambiguousPaths)
        })

    }else
      return callback(path)

  }









  self.addNodeFilter = function(classDivId) {
    var aClass = self.classDivsMap[classDivId];

    if (self.classFiltersMap[aClass.id]) {
      delete self.classFiltersMap[aClass.id];
      $("#" + classDivId + "_filter").html("");
      return;
    }
    var varName = [self.getVarName(aClass, true)];
    var datatype = aClass.data.datatype;

    IndividualValueFilterWidget.showDialog(null, varName, aClass.id, datatype, function(err, filter) {
      if (err) {
        return alert(err);
      }
      if (!filter) {
        return;
      }
      self.classFiltersMap[aClass.id] = { class: aClass, filter: filter };
      $("#" + classDivId + "_filter").append(filter);
    });
  };


  self.removeNodeFilter = function(nodeDivId) {
    var queryObject = self.classDivsMap[nodeDivId];
    self.allQueryPathes[self.classDivsMap[nodeDivId].index].filter = null;
    self.classDivsMap[nodeDivId].filter = null;
    $("#" + nodeDivId + "_filter").append(filter);
  };

  self.aggregateQuery = function() {

    IndividualAggregateWidget.showDialog(null, function(callback) {

        callback(self.classeMap);
      }

      , function(err, aggregateClauses) {

        self.queryKG("table", { aggregate: aggregateClauses });

      });

  };

  self.queryKG = function(output, options) {
    if (!options) {
      options = {};
    }
    if (!self.queryPathParams.toNode) {
      return alert("missing target node in  path");
    }
    if (self.allQueryPathes.length == 0) {
      self.allQueryPathes.push(self.queryPathParams);
    }


    $("#KGqueryWidget_dataTableDiv").html("");
    self.message("searching...");
    $("#KGqueryWidget_waitImg").css("display", "block");
    self.execPathQuery(self.allQueryPathes, options, function(err, result) {
      self.message("", true);
      if (err) {
        return alert(err.responseText);
      }

      if (result.results.bindings.length == 0) {
        return alert("no result");
      }

      self.message("found items :" + result.results.bindings.length);
      if (output == "table") {
        self.queryResultToTable(result);
      }
      else if (output == "vijsGraph") {
        self.queryResultToVisjsGraph(result);
      }
    });
  };


  self.queryResultToVisjsGraph = function(result) {

    var classNodes = self.getAllQueryPathClasses();


    var data = result.results.bindings;
    var visjsData = { nodes: [], edges: [] };
    var existingNodes = {};
    data.forEach(function(item) {
      classNodes.forEach(function(classNode) {
        var varNameKey = self.getVarName(classNode, true);
        var labelKey = varNameKey + "Label";

        if (!existingNodes[item[varNameKey].value]) {
          existingNodes[item[varNameKey].value] = 1;
          var options = {
            shape: Lineage_whiteboard.defaultShape,
            size: Lineage_whiteboard.defaultShapeSize,
            color: Lineage_whiteboard.getSourceColor(varNameKey)
          };
          var label = item[labelKey] ? item[labelKey].value : Sparql_common.getLabelFromURI(item[varNameKey].value);
          visjsData.nodes.push(VisjsUtil.getVisjsNode(self.source, item[varNameKey].value, label, null, options));
        }
      });


    });
    $("#mainDialogDiv").dialog("close");
    Lineage_whiteboard.drawNewGraph(visjsData, "graphDiv");
  };

  self.queryResultToTable = function(result) {
    var data = result.results.bindings;
    //prepare columns
    var nonNullCols = {};
    data.forEach(function(item) {
      result.head.vars.forEach(function(varName) {
        if (varName.length < 3) {
          return;
        }
        if (nonNullCols[varName]) {
          return;
        }

        if (item[varName]) {
          if (item[varName].type != "uri") {
            nonNullCols[varName] = item[varName].type;
          }
        }
      });
    });
    var tableCols = [];
    var colNames = [];
    for (var varName in nonNullCols) {
      tableCols.push({ title: varName, defaultContent: "", width: "15%" });
      colNames.push(varName);

    }


    var tableData = [];
    data.forEach(function(item) {
      var line = [];
      colNames.forEach(function(col) {
        line.push(item[col] ? item[col].value : null);
      });

      tableData.push(line);
    });


    Export.showDataTable("KGqueryWidget_dataTableDiv", tableCols, tableData);

  };


  self.execPathQuery = function(allQueryPathes, options, callback) {

    if (!options) {
      options = {};
    }
    var predicateStr = "";
    var filterStr = "";
    var optionalStr = "";
    var distinctTypesMap = {};
    allQueryPathes.forEach(function(queryPath, queryIndex) {
      var subjectVarName = self.getVarName(queryPath.fromNode);
      var subjectUri = queryPath.fromNode.id;
      if (!distinctTypesMap[subjectVarName]) {
        distinctTypesMap[subjectVarName] = 1;
        filterStr += " " + subjectVarName + "  rdf:type <" + subjectUri + ">. ";

      }

      var objectVarName = self.getVarName(queryPath.toNode);
      var objectUri = queryPath.toNode.id;
      var subjectUri = queryPath.fromNode.id;
      if (!distinctTypesMap[objectVarName]) {
        distinctTypesMap[objectVarName] = 1;
        filterStr += " " + objectVarName + "  rdf:type <" + objectUri + ">.";
      }

      predicateStr += " " + subjectVarName + "  ";
      queryPath.path.forEach(function(pathItem, pathIndex) {


        if (pathIndex > 0) {
          predicateStr += "/";
        }
        var inverseStr = (pathItem.length == 4) ? "^" : "";
        predicateStr += inverseStr + "<" + pathItem[2] + ">";
      });

      predicateStr += " " + objectVarName + ". ";


      for (var key in self.classFiltersMap) {
        filterStr += self.classFiltersMap[key].filter + " \n";
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

    var selectStr = "distinct *";
    var groupByStr = "";
    if (options.aggregate) {
      selectStr = options.aggregate.select;
      groupByStr = " GROUP BY " + options.aggregate.groupBy;
    }

    query += "Select " + selectStr + "  " + fromStr + " where {" + predicateStr + "\n" + optionalStr + "\n" + filterStr;

    query += "} " + groupByStr + " limit 10000";

    var url = Config.sources[self.source].sparql_server.url + "?format=json&query=";

    Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: self.source, caller: "getObjectRestrictions" }, function(err, result) {
      if (err) {
        return callback(err);
      }

      callback(null, result);

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

    var allCandidateNodesMap = {};

    queryPathes.forEach(function(querypath) {
      if (false) {// take all nodes in the path
        querypath.path.forEach(function(pathItem) {
          allCandidateNodesMap[pathItem[0]] = 0;
          allCandidateNodesMap[pathItem[1]] = 0;

        });
      }
      else {// only terminaisons of path
        allCandidateNodesMap[querypath.fromNode.id] = 0;
        allCandidateNodesMap[querypath.toNode.id] = 0;
      }


    });
    var allCandidateNodesArray = Object.keys(allCandidateNodesMap);
    async.eachSeries(allCandidateNodesArray, function(candidateNodeId, callbackEach) {
      self.getPathBetweenNodes(candidateNodeId, nodeId, function(err, path) {
        if (err) {
          return callbackEach(err);
        }

        allCandidateNodesMap[candidateNodeId] = path.length;
        callbackEach();
      });
    }, function(err) {
      if (err) {
        return callback(err);
      }

      var minEdges = 100;
      var nearestNodeId = null;
      for (var key in allCandidateNodesMap)
        if (allCandidateNodesMap[key] < minEdges) {
          minEdges = allCandidateNodesMap[key];
          nearestNodeId = key;
        }
      callback(null, nearestNodeId);
    });


  };

  self.getInferredModelVisjsData = function(source, callback) {
    if (!source) {
      source = self.source;
    }
    var inferredModel = [];
    var dataTypes = {};

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
          OntologyModels.getInferredClassValueDataTypes(source, {}, function(err, result) {
            if (err) {
              return callbackSeries(err);
            }


            result.forEach(function(item) {
              dataTypes[item.class.value] = item.datatype.value;
            });
            callbackSeries();
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
              self.visjsNodeOptions.data = { datatype: dataTypes[item.sClass.value] };
              var label = item.sClassLabel ? item.sClassLabel.value : Sparql_common.getLabelFromURI(item.sClass.value);
              visjsData.nodes.push(VisjsUtil.getVisjsNode(source, item.sClass.value, label, null, self.visjsNodeOptions));
            }
            if (!existingNodes[item.oClass.value]) {
              existingNodes[item.oClass.value] = 1;
              self.visjsNodeOptions.data = { datatype: dataTypes[item.oClass.value] };
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
    self.classDivsMap = {};
    self.classeMap = {};
    self.pathDivsMap = {};
    self.classFiltersMap = {};
    $("#KGqueryWidget_pathsDiv").html("");
    self.resetVisjNodes();
    self.resetVisjEdges();

  };
  self.graphActions = {
    onNodeClick: function(node, point, nodeEvent) {
      self.currentGraphNode = node;
      KGqueryWidget.addNode(node, nodeEvent);

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

  self.getVarName = function(node, withoutQuestionMark) {
    return (withoutQuestionMark ? "" : "?") + Sparql_common.formatStringForTriple(node.label || Sparql_common.getLabelFromURI(node.id),true);
  };

  self.getAllQueryPathClasses = function() {
    var classes = [];
    self.allQueryPathes.forEach(function(queryPath) {
      classes.push(queryPath.fromNode);
      classes.push(queryPath.toNode);
    });
    return classes;
  };

  self.showNodeDivPopupMenu = function(nodeDiv) {
    var nodeDivId = $(nodeDiv).attr("id");
    var html =
      " <span  class=\"popupMenuItem\" onclick=\"KGqueryWidget.addNodeFilter('" + nodeDivId + "');\">set Filter</span>" +
      " <span  class=\"popupMenuItem\" onclick=\"KGqueryWidget.removeNode('" + nodeDivId + "');\"> remove</span>";

    PopupMenuWidget.initAndShow(html, "KGqueryWidget_popupMenuDiv");

  };

  self.message = function(message, stopWaitImg) {
    $("#KGqueryWidget_messageDiv").html(message);
    if (stopWaitImg) {
      $("#KGqueryWidget_waitImg").css("display", "none");
    }
    else {
      $("#KGqueryWidget_waitImg").css("display", "block");
    }
  };


  return self;
})();

export default KGqueryWidget;
window.KGqueryWidget = KGqueryWidget;