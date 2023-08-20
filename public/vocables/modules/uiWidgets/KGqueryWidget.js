import VisjsGraphClass from "../graph/VisjsGraphClass.js";
import Lineage_sources from "../tools/lineage/lineage_sources.js";
import OntologyModels from "../shared/ontologyModels.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";
import Lineage_relationIndividualsFilter from "../tools/lineage/lineage_relationIndividualsFilter.js";


var KGqueryWidget = (function() {
  var self = {};
  self.queryNodes = {};
  self.vicinityArray = [];
  self.showDialog = function() {

    $("#mainDialogDiv").dialog("open");
    $("#mainDialogDiv").dialog("option", "title", "Query");
    $("#mainDialogDiv").load("snippets/KGqueryWidget.html", function() {
      self.getInferredModelVisjsData(Lineage_sources.activeSource, function(err, visjsData) {
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

    var html = "<div  class='KGqueryWidget_nodeDiv' id='" + nodeDivId + "'>" +
      "<span>" + self.currentGraphNode.label + "</span>" +
      "<input type='image' src='./icons/caret-right.png'  style='opacity: 0.5; width: 20px;height: 20px;}' onclick='KGqueryWidget.showLegendDivPopupMenu($(this).parent())'/> </div>";

    var fromNode = $("#KGqueryWidget_fromClassNodeDiv").val();
    if (!self.queryNodes.fromNode) {
      self.queryNodes.fromNode = self.currentGraphNode;
      $("#KGqueryWidget_fromClassNodeDiv").html(html);
    }
    else {
      self.queryNodes.toNode = self.currentGraphNode;
      $("#KGqueryWidget_toClassNodeDiv").html(html);

    }

  };

  self.filterNode = function() {
    PredicatesSelectorWidget.load("KGqueryWidget_predicateSelectDiv", Lineage_sources.activeSource, function() {
      $("#editPredicate_customContentDiv").html("<button onclick='KGqueryWidget.addNode()'>ADD</button>");

    });
  };


  self.queryKG = function(output) {
    if (!self.queryNodes.toNode) {
      return;
    }

    self.getPathBetweenNodes(self.queryNodes.fromNode.id, self.queryNodes.toNode.id, function(err, path) {
      if (err) {
        return alert(err.responseText);
      }

      var filterStr = "";
      self.execPathQuery(path, filterStr, function(err, result) {
        if (err) {
          return alert(err.responseText);
        }
        var x=result;
      });
    });
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
      predicateStr +=inverseStr+ "<"+pathItem[2]+ ">";
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
    var fromStr = Sparql_common.getFromStr(Lineage_sources.activeSource);
    query += "Select *  " + fromStr + " where {" +
      "?subject " + predicateStr + " ?object.";

    if (filterStr) {
      query += filterStr;
    }
   query+= "} limit 10000";


    var x = query;
  };

  self.getInferredModelVisjsData = function(source, callback) {
    if (!source) {
      source = Lineage_sources.activeSource;
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

          var source = Lineage_sources.activeSource;
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
})();

export default KGqueryWidget;
window.KGqueryWidget = KGqueryWidget;