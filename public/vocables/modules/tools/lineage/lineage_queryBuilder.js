import BotWidget from "../../uiWidgets/botWidget.js";
import Lineage_sources from "./lineage_sources.js";
import common from "../../shared/common.js";
import KGquery_graph from "../KGquery/KGquery_graph.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import Lineage_relationIndividualsFilter from "./lineage_relationIndividualsFilter.js";
import Lineage_whiteboard from "./lineage_whiteboard.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import IndividualValueFilterWidget from "../../uiWidgets/individualValuefilterWidget.js";



var Lineage_queryBuilder = (function() {
    var self = {};

    self.init = function() {
      $("#mainDialogDiv").dialog("open");
      $("#mainDialogDiv").load("modules/tools/lineage/html/queryBuilder.html", function() {


        //  self.doNext(keywordsTree)
        var html = self.getHtml();
        $("#lineage_queryBotDiv").html(html);

        self.start();


      })
      ;


    };

    self.getSourceInferredModelVisjsData = function(sourceLabel, callback) {
      if (self.currentQuery.currentSourceInferredModelVijsData) {
        return callback(null, self.currentQuery.currentSourceInferredModelVijsData);
      }
      var visjsGraphFileName = self.currentQuery.source + "_KGmodelGraph.json";
      $.ajax({
        type: "GET",
        url: `${Config.apiUrl}/data/file?dir=graphs&fileName=${visjsGraphFileName}`,
        dataType: "json",
        success: function(result, _textStatus, _jqXHR) {
          self.currentQuery.currentSourceInferredModelVijsData = JSON.parse(result);
          return callback(null, self.currentQuery.currentSourceInferredModelVijsData);
        }, error: function(err) {
          return callback(err);
        }
      });


    };
    self.showList = function(values, varToFill, returnValue) {

      values.sort(function(a, b) {
        if (a.label > b.label) {
          return 1;
        }
        if (a.label < b.label) {
          return -1;
        }
        return 0;

      });

      $("#bot_resourcesProposalSelect").css("display", "block");
      common.fillSelectOptions("bot_resourcesProposalSelect", values, false, "label", "id");
      $("#bot_resourcesProposalSelect").unbind("change");
      $("#bot_resourcesProposalSelect").bind("change", function() {

        var text = $("#bot_resourcesProposalSelect option:selected").text();
        self.writeCompletedHtml(text + ":");

        var selectedValue = $(this).val();
        if (varToFill) {
          self.currentQuery[varToFill] = selectedValue;
        }
        self.nextStep(returnValue || selectedValue);
      });

    };


    self.writeCompletedHtml = function(str) {
      if (!str) {
        return;
      }
      var tokenId = "token_" + common.getRandomHexaId(5);
      var html = "<span class='bot-token " + "" + "' id='" + tokenId + "'>" + str + "</span>";
      html += "<span>&nbsp;</span>";
      $(html).insertBefore("#bot_input");
      $("#bot_input").val("");
      $("#bot_input").focus();
      return;
    };


    self.nextStep = function(returnValue) {


      var keys = Object.keys(self.currentObj);
      if (keys.length == 0) {
        return;
      }

      var key = keys[0];

      if (key == "_OR") {// alternative
        var alternatives = self.currentObj[key];
        if (returnValue && alternatives[returnValue]) {
          var obj = self.currentObj["_OR"][returnValue];
          var fnName = Object.keys(obj)[0];
          var fn = self.functions[fnName];
          if (!fn || typeof fn !== "function") {
            return alert("function not defined :" + fnName);
          }
          self.currentObj = obj[fnName];
          fn();


        }


      }
      else {
        var fn = self.functions[key];
        if (!fn || typeof fn !== "function") {
          return alert("function not defined :" + key);
        }

        fn();
        self.currentObj = self.currentObj[key];
      }
    };


    self.workflow_individualsFilter = {
      "listFilterTypes": {
        "_OR":
          {
            "label": { "promptIndividualsLabel": { "listWhiteBoardFilterType": { "executeQuery": {} } } },
            "list": { "listIndividuals": { "listWhiteBoardFilterType": { "executeQuery": {} } } },
            "advanced": { "promptIndividualsAdvandedFilter": { "listWhiteBoardFilterType": { "executeQuery": {} } } }
            // }
          }
      }
    };

    self.workflow_individualsRole = {
      "listIndividualFilterType": {
        "_OR":
          {
            "all": {
              "listWhiteBoardFilterType": {
                "executeQuery": {}
              }
            },
            "subject": self.workflow_individualsFilter,
            "object": self.workflow_individualsFilter
          }
      }

    };


    self.workflow = {
      "listVocabsFn": {
        "listQueryTypeFn": {
          "_OR":
            {
              "Class": {
                "listClassesFn": {
                  "listPredicatePathsFn": {
                    "_OR":
                      {
                        "empty": { "listWhiteBoardFilterType": { "executeQuery": {} } },
                        "ok": self.workflow_individualsRole
                      }
                  }
                }

              }
              ,

              "Property": {
                "listPropertiesFn": {
                  "listPredicatePathsFn": {
                    "_OR": {
                      "empty": { "listWhiteBoardFilterType": { "executeQuery": {} } },
                      "ok": self.workflow_individualsRole
                    }
                  }
                }
              }
            }


        }
      }
    };


    self.functions = {

      listVocabsFn: function() {
        var sourceLabel = Lineage_sources.activeSource;
        var vocabs = [{ id: sourceLabel, label: sourceLabel }];
        var imports = Config.sources[sourceLabel].imports;
        imports.forEach(function(importSource) {
          vocabs.push({ id: importSource, label: importSource });
        });

        for (var key in Config.basicVocabularies) {
          vocabs.push({ id: key, label: key });
        }
        self.showList(vocabs, "currentVocab");


      },
      listQueryTypeFn: function() {
        var choices = [
          { id: "Class", label: "Class" },
          { id: "Property", label: "Property" }
        ];

        self.showList(choices, null);
        return;

      },


      listClassesFn: function() {
        var vocab = self.currentQuery.currentVocab;
        var classes = [];
        for (var key in Config.ontologiesVocabularyModels[vocab].classes) {
          var classId = Config.ontologiesVocabularyModels[vocab].classes[key];
          classes.push({ id: classId.id, label: classId.label });
        }
        self.showList(classes, "currentClass");
      },

      listPropertiesFn: function() {
        var vocab = self.currentQuery.currentVocab;
        var props = [];
        for (var key in Config.ontologiesVocabularyModels[vocab].properties) {
          var prop = Config.ontologiesVocabularyModels[vocab].properties[key];
          props.push({ id: prop.id, label: prop.label });
        }
        self.showList(props, "currentProperty");

      },


      listPredicatePathsFn: function() {
        var property = self.currentQuery.currentProperty;
        var fromClass = self.currentQuery.currentClass;
        var toClass = self.currentQuery.currentClass;

        self.getSourceInferredModelVisjsData(self.currentQuery.source + "_KGmodelGraph.json", function(err, visjsData) {
          if (err) {
            console.log(err.responseText);
            return self.nextStep("empty");
          }
          var nodesMap = {};
          visjsData.nodes.forEach(function(node) {
            nodesMap[node.id] = node;
          });
          var paths = [];
          visjsData.edges.forEach(function(edge) {
            var selected = false;
            if (property && edge.data.propertyId == property) {
              selected = true;
            }
            if (fromClass && edge.from == fromClass) {
              selected = true;
            }
            if (toClass && edge.to == toClass) {
              selected = true;
            }
            if (selected) {
              edge.fromLabel = nodesMap[edge.from].label;
              edge.toLabel = nodesMap[edge.to].label,
                paths.push({
                  id: edge.from + "|" + edge.data.propertyId + "|" + edge.to,
                  label: edge.fromLabel + " -" + edge.data.propertyLabel + "-> " + edge.toLabel
                });
            }
          });
          if (paths.length == 0) {
            self.nextStep("empty");
            return;
          }
          self.showList(paths, "path", "ok");
          return;


        });
      },

      listIndividualFilterType: function() {

        var subject = "subject";
        var object = "object";
        if (self.currentQuery.path) {
          var array = self.currentQuery.path.split("|");
          if (array.length == 3) {
            subject = Sparql_common.getLabelFromURI(array[0]);
            object = Sparql_common.getLabelFromURI(array[2]);
          }
        }
        var choices = [
          { id: "all", label: "all individuals" },
          { id: "subject", label: ("filter " + subject) },
          { id: "object", label: ("filter " + object )}
        ];
        self.showList(choices, "individualsFilterRole");
        return;


      }
      ,
      listFilterTypes: function(target) {
        var choices = [
          { id: "label", label: "label contains" },
          { id: "list", label: "choose in list" },
          { id: "advanced", label: "advanced search" }
        ];
        self.showList(choices, "individualsFilterType");

      },


      listIndividuals: function() {
        Sparql_OWL.getDistinctClassLabels(self.currentQuery.source, [self.currentQuery.currentClass], {}, function(err, result) {
          if (err) {
            return alert(err);
          }
          var individuals = [];
          result.forEach(function(item) {
            individuals.push({
              id: item.id.value,
              label: item.label.value
            });

          });
          self.showList(individuals, "individualsFilterValue");

        });
      },
      promptIndividualsLabel: function() {
        self.currentQuery.individualsFilterValue = prompt("label contains ");
        self.nextStep();

      },
      promptIndividualsAdvandedFilter: function() {
        IndividualValueFilterWidget.showDialog(null, self.currentQuery.source, self.currentQuery.individualsFilterRole, self.currentQuery.currentClass, null, function(err, filter) {
          self.currentQuery.advancedFilter = filter;
          self.nextStep("advanced");
        });
      },

      listWhiteBoardFilterType: function() {
        var choices = [
          { id: "selectedNode", label: "selectedNode" },
          { id: "whiteboardNodes", label: "whiteboard nodes" },
          { id: "sourceNodes", label: "all Source Nodes" }
        ];
        self.showList(choices, "whiteboardFilterType");

      },
      executeQuery: function() {
        self.executeQuery();
      }


    };


    self.getHtml = function() {


      var html = "  <div id=\"botTA\" contenteditable=\"false\">\n" +
        "          <div id=\"bot_inputContainer\" style=\"display: flex;flex-direction: row;border:none;\">\n" +
        // "            <button style=\"width:10px\" id=\"bot_back\"><</button>"+
        "            <div id=\"bot_input\" size='3' autocomplete=\"off\" onkeyup=\"BotWidget.analyse($(this).val())\">\n" +

        "            <select id=\"bot_resourcesProposalSelect\" size=\"10\" )\"></select></div>\n" +
        "          </div>\n" +

        "        </div>" + "<div><button onclick='Lineage_queryBuilder.clear()'>X</button>" + "<button onclick='Lineage_queryBuilder.previousStage()'><ok></button></div>";

      return html;
    };


    self.clear = function() {
      self.start();

    };

    self.start = function() {

      self.currentQuery = { source: Lineage_sources.activeSource };
      self.currentObj = self.workflow;
      self.nextStep(self.workflow);
    };


    self.executeQuery = function() {

      var source = self.currentQuery.source;
      var currentClass = self.currentQuery.currentClass;
      var currentProperty = self.currentQuery.currentProperty;
      var path = self.currentQuery.path;
      var individualId = self.currentQuery.individualId;
      var individualsFilterRole = self.currentQuery.individualsFilterRole;
      var individualsFilterType = self.currentQuery.individualsFilterType;
      var individualsFilterValue = self.currentQuery.individualsFilterValue;
      var advancedFilter = self.currentQuery.advancedFilter || "";


      function getPathFilter() {
        if (!path) {
          if (currentClass) {
            return Sparql_common.setFilter("subjectType", currentClass, null, { useFilterKeyWord: 1 });
          }
          if (currentProperty) {
            return Sparql_common.setFilter("prop", currentProperty);
          }
        }
        var array = path.split("|");
        if (array.length != 3) {
          return "";
        }
        var propFilter = Sparql_common.setFilter("prop", array[1]);
        var subjectClassFilter = Sparql_common.setFilter("subjectType", array[0], null, { useFilterKeyWord: 1 });
        var objectClassFilter = Sparql_common.setFilter("objectType", array[2], null, { useFilterKeyWord: 1 });
        return propFilter + " " + subjectClassFilter + " " + objectClassFilter;
      }

      function getIndividualsFilter() {
        var filter = "";
        if (!individualsFilterRole) {
          return "";
        }
        if (individualsFilterType == "label") {
          filter = Sparql_common.setFilter(individualsFilterRole, null, individualsFilterValue);
        }
        else if (individualsFilterType == "list") {
          filter = Sparql_common.setFilter(individualsFilterRole, individualsFilterValue, null, { useFilterKeyWord: 1 });
        }
        else if (individualsFilterType == "advanced") {
          filter = advancedFilter;
        }
        return filter;
      }

      function getWhiteBoardFilter() {
        var data;

        var whiteboardFilterType = self.currentQuery.whiteboardFilterType;

        if (whiteboardFilterType == "selectedNode") {
          data = Lineage_whiteboard.currentGraphNode.data.id;

        }
        else if (whiteboardFilterType == "whiteboardNodes") {
          Lineage_sources.fromAllWhiteboardSources = true;
          if (!Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
            data = null;
          }
          else {
            data = [];
            var nodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get();
            nodes.forEach(function(node) {
              if (node.data && (!node.data.type || node.data.type != "literal")) {
                data.push(node.id);
              }
            });
          }
        }
        else if (whiteboardFilterType == "all") {
          data = null;
        }

        return data;
      }


      var data = getWhiteBoardFilter();
      var filter = getPathFilter() + " " + getIndividualsFilter();
      var options = {
        filter: filter
      };

      Lineage_whiteboard.drawPredicatesGraph(source, data, null, options);
      $("#mainDialogDiv").dialog("close");

    }
    ;

    return self;


  }
)
();

export default Lineage_queryBuilder;
window.Lineage_queryBuilder = Lineage_queryBuilder;