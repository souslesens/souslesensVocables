import common from "../../shared/common.js";
import SearchUtil from "../../search/searchUtil.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import visjsGraph from "../../graph/visjsGraph2.js";
import Lineage_classes from "./lineage_classes.js";
import Lineage_sources from "./lineage_sources.js";

var Lineage_reasoner = (function() {
  var self = {};
  self.inferenceTriples = [];
  self.loaded = false;
  self.currentSource;
  self.showReasonerDialog = function() {
    $("#smallDialogDiv").dialog("open");
    self.currentSource = Lineage_sources.activeSource;
    $("#smallDialogDiv").load("snippets/lineage/lineage_reasoner.html", function() {
      if (!self.loaded) {
        self.loaded = true;
        $("#lineage_reasoner_outputDiv").css("display", "none");

      }
    });
  };

  self.runOperation = function(operation) {
    self.currentOperation = operation;
 //  $("#lineage_reasoner_outputDiv").css("display", "none");
    $("#lineage_reasoner_operationSelect").val("");
    // $("#lineage_reasoner_outputDiv").css("display", "none");

    if (operation == "Inference") {

      self.showInferencePredicates();
    }
    else if (operation == "Consistency") {
      self.runConsistency();
    }
    else if (operation == "Unsatisfiable") {
      self.runUnsatisfiable();
    }
  };


  self.runConsistency = function() {
    var fromStr = Sparql_common.getFromStr(Lineage_sources.activeSource, false, false);
    var describeQuery = "DESCRIBE ?s ?p ?o  " + fromStr + "  WHERE {  ?s ?p ?o    } ";
    const params = new URLSearchParams({
      operation: "consistency",
      type: "internalGraphUri",
      describeSparqlQuery: describeQuery
    });
    $("#lineage_reasoner_infosDiv").html("Processing " + Lineage_sources.activeSource + "...");
    $.ajax({
      type: "GET",
      url: Config.apiUrl + "/jowl/reasoner?" + params.toString(),
      dataType: "json",

      success: function(data, _textStatus, _jqXHR) {
        $("#lineage_reasoner_infosDiv").html(JSON.stringify(data, null, 2));
        $("#lineage_reasoner_outputDiv").css("display", "block");
      },
      error(err) {
        alert(err.responseText);
      }
    });
  };

  self.runUnsatisfiable = function() {
    var fromStr = Sparql_common.getFromStr(Lineage_sources.activeSource, false, false);
    var describeQuery = "DESCRIBE ?s ?p ?o  " + fromStr + "  WHERE {  ?s ?p ?o    } ";
    const params = new URLSearchParams({
      operation: "unsatisfiable",
      type: "internalGraphUri",
      describeSparqlQuery: describeQuery
    });
    $("#lineage_reasoner_infosDiv").html("Processing " + Lineage_sources.activeSource + "...");
    $.ajax({
      type: "GET",
      url: Config.apiUrl + "/jowl/reasoner?" + params.toString(),
      dataType: "json",

      success: function(data, _textStatus, _jqXHR) {
        $("#lineage_reasoner_infosDiv").html(JSON.stringify(data, null, 2));
      },
      error(err) {
        alert(err.responseText);
      }
    });
  };

  self.showInferencePredicates = function() {

    $("#lineage_reasoner_infosDiv").html("getting ListInferenceParams ...");
    $.ajax({
      type: "GET",
      url: Config.apiUrl + "/jowl/reasonerListInferenceParams",
      dataType: "json",

      success: function(data, _textStatus, _jqXHR) {
        $("#lineage_reasoner_outputDiv").css("display", "block");
        common.fillSelectWithColorPalette("lineage_reasoner_colorSelect");   common.fillSelectWithColorPalette("lineage_reasoner_colorSelect");
        var jstreeData = [];
        for (var key in data) {
          jstreeData.push({
            id: key,
            text: key,
            parent: "#"
          });
        }
        var options = {
          openAll: true,
          withCheckboxes: true
        };

        $("#lineage_reasoner_infosDiv").html("<div id='reasonerTreeContainerDiv', style=width:300px;height:500px'>");
        JstreeWidget.loadJsTree("reasonerTreeContainerDiv", jstreeData, options);


      },
      error(err) {
        alert(err.responseText);
      }
    });
  };

  self.runInference = function(predicates, callback) {

    var operation = $("#lineage_reasoner_operationSelect").val();

    var fromStr = Sparql_common.getFromStr(Lineage_sources.activeSource, false, false);
    var describeQuery = "DESCRIBE ?s ?p ?o  " + fromStr + "  WHERE {  ?s ?p ?o    } ";

    const params = new URLSearchParams({
      operation: "inference",
      type: "internalGraphUri",
      predicates: JSON.stringify(predicates),
      describeSparqlQuery: describeQuery
    });

    $("#lineage_reasoner_infosDiv").html("Processing " + Lineage_sources.activeSource + "...");
    $.ajax({
      type: "GET",
      url: Config.apiUrl + "/jowl/reasoner?" + params.toString(),
      dataType: "json",

      success: function(data, _textStatus, _jqXHR) {

        for (var key in data) {
          data[key] = self.FunctionalStyleSyntaxToJson(data[key]);

        }

        callback(null, data);

      },
      error(err) {
        return alert(err.responseText);
        if (callback) {
          return callback(err);
        }
      }
    });
  };

  self.displayResult = function() {
    $("#lineage_reasoner_outputDiv").css("display", "block");
    if (self.currentOperation == "Inference") {
      var predicates = $("#reasonerTreeContainerDiv").jstree().get_checked();
      self.runInference(predicates, function(err, result) {
        if (err) {
          return alert(err);
        }
        self.inferenceData = result;
        self.displayInference(result);
      });

    }
    else if (self.currentOperation == "Consistency") {
      self.displayConsistency();
    }
    else if (self.currentOperation == "Unsatisfiable") {
      self.displayUnsatisfiable();
    }
  };

  self.displayConsistency = function() {
  };

  self.displayUnsatisfiable = function() {
  };

  self.displayInference = function() {
    var output = $("#lineage_reasoner_outputSelect").val();

    if (output == "Table") {
      $("#lineage_reasoner_infosDiv").html(JSON.stringify(self.inferenceData));
    }
    else if (output == "Graph") {
      var urisMap = {};

      var inferencePredicates = $("#lineage_reasoner_inferencePredicateSelect").val();
      var filteredData = [];

      for (var pred in self.inferenceData) {
        if (!inferencePredicates || inferencePredicates.indexOf(pred) > -1) {
          self.inferenceData[pred].forEach(function(item) {
            filteredData.push(item);
          });
        }
      }

      var visjsData = { nodes: [], edges: [] };
      var existingNodes = visjsGraph.getExistingIdsMap();


      filteredData.forEach(function(item) {

        if (!urisMap[item.subject]) {
          urisMap[item.subject] = "";
        }

        if (!urisMap[item.object]) {
          urisMap[item.object] = "";
        }
      });
      var filter = Sparql_common.setFilter("id", Object.keys(urisMap), null);

      var edgeColor = $("#lineage_reasoner_colorSelect").val();

      Sparql_OWL.getDictionary(Lineage_sources.activeSource, { filter: filter }, null, function(err, result) {
        var nodes={}
        result.forEach(function(item) {
          urisMap[item.id.value] = item.label ? item.label.value : Sparql_common.getLabelFromURI(item.id.value);
        });

        filteredData.forEach(function(item) {


          var label = urisMap[item.subject] || Sparql_common.getLabelFromURI(item.subject);
          if (!existingNodes[item.subject]) {
            existingNodes[item.subject] = 1;
            var node = VisjsUtil.getVisjsNode(self.currentSource, item.subject, label, item.predicate, { shape: "square" });
            nodes[item.subject] = node;

          }else{
            if( nodes[item.subject])
            nodes[item.subject]= VisjsUtil.setVisjsNodeAttributes( self.currentSource,nodes[item.subject],label, null, { shape: "square" })
          }




          var label2, shape, color;
          label2 = urisMap[item.object] || Sparql_common.getLabelFromURI(item.object);
          if (!existingNodes[item.object]) {
            existingNodes[item.object] = 1;
            var node = VisjsUtil.getVisjsNode(self.currentSource, item.object, label2, null, { shape: "square" });
            nodes[item.object] = node;

          }


          if (item.subject && item.object) {
            var edgeId = item.subject + "_" + item.object;
            if (!existingNodes[edgeId]) {
              existingNodes[edgeId] = 1;
              visjsData.edges.push({
                id: edgeId,
                from: item.subject,
                to: item.object,
                label: item.predicate,
                color: edgeColor || "red",
                font: { size: 10 },
                arrows: {
                  to: {
                    enabled: true,
                    type: Lineage_classes.defaultEdgeArrowType,
                    scaleFactor: 0.5
                  }
                }
              });
            }
          }
        });

        for(var nodeId in nodes){
          visjsData.nodes.push(nodes[nodeId]);
        }


        if (!visjsGraph.isGraphNotEmpty()) {
          Lineage_classes.drawNewGraph(visjsData);
        }
        visjsGraph.data.nodes.add(visjsData.nodes);
        visjsGraph.data.edges.add(visjsData.edges);
        visjsGraph.network.fit();
        $("#waitImg").css("display", "none");
      });
    }
  };

  self.FunctionalStyleSyntaxToJson = function(functionalStyleStrArray) {
    function getUri(str) {
      if (!str) {
        return null;
      }
      return str.replace(/[<>]/g, "");
    }

    /*    var regex = /([A-z]+)\(([^\)]+)\)/gm;

var regexNested = /<([^>]+)> ([^\(]+)\(<([^>]+)> <([^>]+)>/gm;


//  var regexNested = /([^<]+)\(<([^>]+)> <([^>]+)>\)/*/

    var regex = /([A-z]+)\(([^\)]+)\)/gm;
    var regexNested = /([^\(^"]+)\(<([^>]+)> ([^\(]+)\(<([^>]+)> <([^>]+)>/; //nested expression

    var array = [];
    var json = [];

    function cleanJenaUris(uri) {
      return uri.replace("file:/", "");
      //  return uri.replace("file:/", "_:");
    }

    functionalStyleStrArray.forEach(function(functionalStyleStr) {
      if ((array = regexNested.exec(functionalStyleStr)) != null) {
        //nested expression
        var subject = cleanJenaUris(array[2]);
        var predicate = array[3];
        var object1 = cleanJenaUris(array[4]);
        var object2 = cleanJenaUris(array[5]);



        var bNode = "_:" + common.getRandomHexaId(8);
        json.push({ subject: subject, predicate: predicate, object: bNode });
        json.push({ subject: bNode, predicate: "owl:first", object: object1 });
        json.push({ subject: bNode, predicate: "owl:rest", object: object2 });
      }
      else if ((array = regex.exec(functionalStyleStr)) != null) {
        var array2 = array[2].trim().split(" ");
        if (array2.length == 2) {
          var object =  cleanJenaUris(getUri(array2[0]));
          var subject =  cleanJenaUris(getUri(array2[1]));

          json.push({ subject: subject, predicate: array[1], object: object });
        }
      }
    });
    return json;
  };

  return self;
})();

export default Lineage_reasoner;
window.Lineage_reasoner = Lineage_reasoner;
