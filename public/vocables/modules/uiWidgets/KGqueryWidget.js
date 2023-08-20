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
  self.queryNodes = {};
  self.vicinityArray = [];
  self.showDialog = function() {

    $("#mainDialogDiv").dialog("open");
    $("#mainDialogDiv").dialog("option", "title", "Query");
    $("#mainDialogDiv").load("snippets/KGqueryWidget.html", function() {
      self.source = Lineage_sources.activeSource;

      self.getInferredModelVisjsData(self.source, function(err, visjsData) {
        if (err) {
          return alert(err.responseText);
        }

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

  self.graphActions = {
    onNodeClick: function(node) {
      self.currentGraphNode = node;
      KGqueryWidget.addNode();

    },

    onDnDnode: function(startNode, endNode, point) {

    }


  };

  self.addNode = function() {
    var html = "";
    if (!self.currentGraphNode) {
      return;
    }
    var nodeDivId = "nodeDiv_" + common.getRandomHexaId(3);

    var divId
    function getHtml(role) {
      divId = "nodeDiv_" + role
      var html = "<div  class='KGqueryWidget_nodeDiv' id='" + divId + "'>" +
        "<span>" + self.currentGraphNode.label + "</span>" +
        "&nbsp;<input type='image' src='./icons/caret-right.png'  style='opacity: 0.5; width: 20px;height: 20px;}' onclick='KGqueryWidget.showNodeDivPopupMenu($(this).parent())'/>" +
        "<div  id='" + divId + "_filter'></div> </div>";
      return html;
    }

    var color = null;
    var fromNode = $("#KGqueryWidget_fromClassNodeDiv").val();
    if (!self.queryNodes.fromNode) {
      self.queryNodes.fromNode = self.currentGraphNode;
      $("#KGqueryWidget_fromClassNodeDiv").html(getHtml("from"));
      color = "blue";
    }
    else {
      self.queryNodes.toNode = self.currentGraphNode;
      $("#KGqueryWidget_toClassNodeDiv").html(getHtml("to"));
      color = "green";

      self.getPathBetweenNodes(self.queryNodes.fromNode.id, self.queryNodes.toNode.id, function(err, path) {
        if (err) {
          return alert(err.responseText);
        }
        self.currentPath = path;
        var newVisjsEdges = [];
        path.forEach(function(pathItem, index) {

          //  var edgeId=(pathItem.length<4)?pathItem[0]+"_"+pathItem[2]+"_"+pathItem[1]:pathItem[1]+"_"+pathItem[2]+"_"+pathItem[0]
          var edgeId = pathItem[0] + "_" + pathItem[2] + "_" + pathItem[1];

          newVisjsEdges.push({ id: edgeId, color: color, width: 3 });

        });
        self.KGqueryGraph.data.edges.update(newVisjsEdges);
      });

    }
    self.KGqueryGraph.data.nodes.update({ id: self.currentGraphNode.id, shape: "hexagon", size: 14, color: color });

    self.popupActions.addFilterToNode(divId)
  }
  ;
  self.showNodeDivPopupMenu = function(nodeDiv) {
    var nodeDivId = $(nodeDiv).attr("id");
    var html =
      " <span  class=\"popupMenuItem\" onclick=\"KGqueryWidget.popupActions.addFilterToNode('" + nodeDivId + "');\">set Filter</span>" +
      " <span  class=\"popupMenuItem\" onclick=\"KGqueryWidget.popupActions.removeNode('" + nodeDivId + "');\"> remove</span>";

    PopupMenuWidget.initAndShow(html, "KGqueryWidget_popupMenuDiv");

  };

  self.popupActions = {
    addFilterToNode: function(divId) {

      var role = (divId == "nodeDiv_from") ? "subject" : "object";
      self.queryNodes.filteringRole = role;

      IndividualValueFilterWidget.showDialog(null, role, function(err, filter) {
        if (err) {
          return alert(err);
        }
        if(!filter)
          return;
        var role;
        if (self.queryNodes.filteringRole = "subject") {
          self.queryNodes.fromNode.filter = filter;
          role = "from";
        }
        else {
          self.queryNodes.toNode.filter = filter;
          role = "from";
        }
        $("#nodeDiv_" + role + "_filter").html(filter);
      });


    },
    removeNode: function(divId) {

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
        nodeId = self.queryNodes.fromNode.id;
        self.queryNodes.fromNode = null;

      }
      else {
        nodeId = self.queryNodes.toNode.id;
        self.queryNodes.toNode = null;

      }

      self.KGqueryGraph.data.nodes.update({
        id: self.currentGraphNode.id,
        shape: Lineage_whiteboard.defaultShape,
        size: Lineage_whiteboard.defaultShapeSize,
        color: Lineage_whiteboard.getSourceColor(self.source)
      });

      $("#" + divId).remove();

    }
  };


  self.queryKG = function(output) {


    if (!self.queryNodes.toNode) {
      return;
    }


    var filterStr = "";
    if (self.queryNodes.fromNode.filter) {
      filterStr += " " + self.queryNodes.fromNode.filter + " ";
    }

    if (self.queryNodes.toNode.filter) {
      filterStr += " " + self.queryNodes.fromNode.toNode + " ";
    }


    self.execPathQuery(self.currentPath, filterStr, function(err, result) {
      if (err) {
        return alert(err.responseText);
      }
      var x = result;


      var tableCols = [];


      var classLabel = self.queryNodes.fromNode.label;
      tableCols.push({ title: classLabel + "_label", defaultContent: "", width: "15%" });
      tableCols.push({ title: classLabel + "_value", defaultContent: "", width: "15%" });
      classLabel = self.queryNodes.toNode.label;
      tableCols.push({ title: classLabel + "_label", defaultContent: "", width: "15%" });
      tableCols.push({ title: classLabel + "_value", defaultContent: "", width: "15%" });


      var tableData = [];
      result.results.bindings.forEach(function(item){
      var line = [];
      line.push(item.subjectLabel ? item.subjectLabel.value : null);
      line.push(item.subjectValue ? item.subjectValue.value : null);
      line.push(item.objectLabel ? item.objectLabel.value : null);
      line.push(item.objectValue ? item.objectValue.value : null);
      tableData.push(line);
    })

    Export.showDataTable("KGqueryWidget_dataTableDiv", tableCols, tableData);
    })
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


  self.execPathQuery = function(path, filterStr, callback) {


    if (!filterStr) {
      filterStr = "";
    }


    var predicateStr = "";
    path.forEach(function(pathItem, index) {
      var inverseStr = (pathItem.length < 4) ? "" : "^";
      if (index > 0) {
        predicateStr += "/";
      }
      predicateStr += inverseStr + "<" + pathItem[2] + ">";
      if (index == 0) {
        var subjectUri = (pathItem.length < 4) ? pathItem[0] : pathItem[1];
        filterStr += "  ?subject  rdf:type <" + subjectUri + ">. ";
      }
      else if (index == path.length - 1) {
        var objectUri = (pathItem.length < 4) ? pathItem[1] : pathItem[0];
        filterStr += " ?object  rdf:type <" + objectUri + ">.";
      }

    });


    var query = "PREFIX owl: <http://www.w3.org/2002/07/owl#>" + "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" + "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>";
    var fromStr = Sparql_common.getFromStr(self.source);
    query += "Select distinct *  " + fromStr + " where {" +
      "?subject " + predicateStr + " ?object.";

    if (filterStr) {
      query += filterStr;
    }


    query += " OPTIONAL {?subject owl:hasValue ?subjectValue}\n" +
      "    OPTIONAL {?object owl:hasValue ?objectValue}\n" +
      "      OPTIONAL {?subject rdfs:label ?subjectLabel}\n" +
      "   OPTIONAL {?object rdfs:label ?objectLabel}\n";
    query += "} limit 10000";

    var url = Config.sources[self.source].sparql_server.url + "?format=json&query=";

    Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: self.source, caller: "getObjectRestrictions" }, function(err, result) {
      if (err) {
        return callback(err);
      }

      callback(null, result);

    });
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

            var options = {
              shape: Lineage_whiteboard.defaultShape,
              size: Lineage_whiteboard.defaultShapeSize,
              color: Lineage_whiteboard.getSourceColor(source)
            };
            if (!existingNodes[item.sClass.value]) {
              existingNodes[item.sClass.value] = 1;
              var label = item.sClassLabel ? item.sClassLabel.value : Sparql_common.getLabelFromURI(item.sClass.value);
              visjsData.nodes.push(VisjsUtil.getVisjsNode(source, item.sClass.value, label, null, options));
            }
            if (!existingNodes[item.oClass.value]) {
              existingNodes[item.oClass.value] = 1;
              var label = item.oClassLabel ? item.oClassLabel.value : Sparql_common.getLabelFromURI(item.oClass.value);
              visjsData.nodes.push(VisjsUtil.getVisjsNode(source, item.oClass.value, label, null, options));
            }
            var edgeId = item.sClass.value + "_" + item.prop.value + "_" + item.oClass.value;
            if (!existingNodes[edgeId]) {
              existingNodes[edgeId] = 1;

              visjsData.edges.push({
                id: edgeId,
                from: item.sClass.value,
                to: item.oClass.value,
                label: item.propLabel.value,
                font: { color: options.edgesColor || Lineage_whiteboard.restrictionColor },
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
                color: options.edgesColor || Lineage_whiteboard.restrictionColor
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


  return self;
})
();

export default KGqueryWidget;
window.KGqueryWidget = KGqueryWidget;