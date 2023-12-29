import BotWidget from "../../uiWidgets/botWidget.js";
import Lineage_sources from "./lineage_sources.js";
import common from "../../shared/common.js";
import KGquery_graph from "../KGquery/KGquery_graph.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import Lineage_relationIndividualsFilter from "./lineage_relationIndividualsFilter.js";
import Lineage_whiteboard from "./lineage_whiteboard.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";


var Lineage_queryBuilder = (function() {
    var self = {};

    self.init = function() {
      $("#mainDialogDiv").dialog("open");
      $("#mainDialogDiv").load("modules/tools/lineage/html/queryBuilder.html", function() {


        //  self.doNext(keywordsTree)
        var html = self.getHtml();
        $("#lineage_queryBotDiv").html(html);

        self.test();

        /*  BotWidget.init("lineage_queryBotDiv", Lineage_sources.activeSource, {}, true, function(err, result) {




          });*/


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


    self.test = function() {
      self.currentQuery = {};
      self.currentQuery.source = Lineage_sources.activeSource;


      function showList(values, changeFn) {

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
        $("#bot_resourcesProposalSelect").unbind("change");
        $("#bot_resourcesProposalSelect").bind("change", changeFn);
        common.fillSelectOptions("bot_resourcesProposalSelect", values, false, "label", "id");

      }


      function writeCompletedHtml(str) {
        if (!str) {
          return;
        }
        var tokenId = "token_" + common.getRandomHexaId(5);
        /*  selectedToken.index = Object.keys(self.currentValidTokens).length;
          self.currentValidTokens[tokenId] = selectedToken;
          self.previousTokenId = tokenId;*/
        var html = "<span class='bot-token " + "" + "' id='" + tokenId + "'>" + str + "</span>";
        html += "<span>&nbsp;</span>";
        $(html).insertBefore("#bot_input");
        $("#bot_input").val("");
        $("#bot_input").focus();


        return;


      };

      function listVocabsFn() {
        var sourceLabel = Lineage_sources.activeSource;
        var vocabs = [{ id: sourceLabel, label: sourceLabel }];
        var imports = Config.sources[sourceLabel].imports;
        imports.forEach(function(importSource) {
          vocabs.push({ id: importSource, label: importSource });
        });

        for (var key in Config.basicVocabularies) {
          vocabs.push({ id: key, label: key });
        }


        showList(vocabs, function(obj, xx) {
          self.currentQuery.currentVocab = $("#bot_resourcesProposalSelect").val();
          var text = $("#bot_resourcesProposalSelect option:selected").text();
          writeCompletedHtml(text + ":");
          listQueryType();
        });

      }

      function listQueryType() {
        var choices = [
          { id: "Class", label: "Class" },
          { id: "Property", label: "Property" }
        ];
        showList(choices, function() {
          var currentChoice = $(this).val();
          writeCompletedHtml(currentChoice + ":");
          if (currentChoice == "Class") {
            listClassesFn();
          }
          else if (currentChoice == "Property") {
            listPropertiesFn();
          }
        });
      }


      function listClassesFn() {
        var vocab = self.currentQuery.currentVocab;


        var classes = [];
        for (var key in Config.ontologiesVocabularyModels[vocab].classes) {
          var classId = Config.ontologiesVocabularyModels[vocab].classes[key];
          classes.push({ id: classId.id, label: classId.label });
        }
        showList(classes, function() {
          self.currentQuery.currentClass = $(this).val();
          var text = $("#bot_resourcesProposalSelect option:selected").text();
          writeCompletedHtml(text + ":");
          listPredicatePathsFn(self.currentQuery.currentClass, null, self.currentQuery.currentClass);
        });
      }


      function listPropertiesFn() {
        var vocab = self.currentQuery.currentVocab;


        var props = [];
        for (var key in Config.ontologiesVocabularyModels[vocab].properties) {
          var prop = Config.ontologiesVocabularyModels[vocab].properties[key];
          props.push({ id: prop.id, label: prop.label });
        }
        showList(props, function() {
          self.currentQuery.currentProperty = $(this).val();
          var text = $("#bot_resourcesProposalSelect option:selected").text();
          writeCompletedHtml(text + ":");
          listPredicatePathsFn(null, self.currentQuery.currentProperty, null);
        });
      }


      function listPredicatePathsFn(fromClass, property, toClass) {
        self.getSourceInferredModelVisjsData(self.currentQuery.source + "_KGmodelGraph.json", function(err, visjsData) {
          if (err) {
            return alert(err.responseText);
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
          showList(paths, function() {
            self.currentQuery.path = $(this).val();
            var text = $("#bot_resourcesProposalSelect option:selected").text();
            writeCompletedHtml(text + ":");
            listIndividualFilterType();
          });


        });
      }

      function listIndividualFilterType() {
        var choices = [
          { id: "allIndividuals", label: "all individuals" },
          { id: "filterSubject", label: "filter subject" },
          { id: "filterObject", label: "filter object" }
        ];
        showList(choices, function() {
          var currentChoice = $("#bot_resourcesProposalSelect option:selected").text();
          writeCompletedHtml(currentChoice + ":");
          if (currentChoice == "allIndividuals") {

            self.currentQuery.individualsFilterRole = null;
            listWhiteBoardFilterType();
          }
          else if (currentChoice == "filterSubject") {
            self.currentQuery.individualsFilterRole = "subject";
            listFilterTypes("subject");
          }
          else if (currentChoice == "filterObject") {
            self.currentQuery.individualsFilterRole = "object";
            listFilterTypes("object");
          }
        });

      }

      function listFilterTypes(target) {
        var choices = [
          { id: "label", label: "label contains" },
          { id: "list", label: "choose in list" },
          { id: "advanced", label: "advanced search" }
        ];
        showList(choices, function() {
          var currentChoice =  $("#bot_resourcesProposalSelect option:selected").text();
          writeCompletedHtml(currentChoice + ":");
          self.currentQuery.individualsFilterType=currentChoice
          if (currentChoice == "label") {
            self.currentQuery.individualsFilterValue = prompt("label contains ");
            listWhiteBoardFilterType();
          }
          else if (currentChoice == "list") {
            listIndividuals();
          }
          else if (currentChoice == "advanced") {
            Lineage_relationIndividualsFilter.init();
          }
        });
      }


      function listIndividuals() {
        Sparql_OWL.getDistinctClassLabels(self.currentQuery.source, [self.currentQuery.currentClass], {}, function(err, result) {
          if (err) {
            return alert(err);
          }
          var individuals = [];
          result.forEach(function(item) {
            individuals.push({
              id: item.label.value,
              label: item.label.value
            });

          });
          showList(individuals, function() {
            var individual = $(this).val();
            writeCompletedHtml(individual + ":");
            self.currentQuery.individualsFilterValue = individual;
            listWhiteBoardFilterType();
          });
        });
      }

      function listWhiteBoardFilterType() {
        var choices = [
          { id: "selectedNode", label: "selectedNode" },
          { id: "whiteboardNodes", label: "whiteboard nodes" },
          { id: "sourceNodes", label: "activeSource" }
        ];
        showList(choices, function() {
          var currentChoice = $(this).val();
          self.currentQuery.whiteboardFilterType = currentChoice;
          self.executQuery();
        });

      }


      var query = [
        listVocabsFn

      ];


      var doNext = function(currentObj, callback) {

        var type = typeof currentObj;

        if (type === "object") {


        }
        if (type === "function") {
          currentObj();

        }


        if (Array.isArray(currentObj)) {
          async.eachSeries(currentObj, function(item, callbackEach) {
            doNext(item, function(err) {
              callbackEach();
            });
          });


        }

        if (type === "object") {
          for (var key in currentObj) {
            if (key == "OR") {

            }

          }


        }


      };
      var currentObj = null;
      doNext(query);
    };


    self.getHtml = function() {


      var html = "  <div id=\"botTA\" contenteditable=\"false\">\n" +
        "          <div id=\"bot_inputContainer\" style=\"display: flex;flex-direction: column;border:none;\">\n" +
        // "            <button style=\"width:10px\" id=\"bot_back\"><</button>"+
        "            <input id=\"bot_input\"  autocomplete=\"off\" onkeyup=\"BotWidget.analyse($(this).val())\">\n" +
        "            <select id=\"bot_resourcesProposalSelect\" size=\"10\" )\"></select>\n" +
        "          </div>\n" +
        "        </div>" + "<div><button onclick='Lineage_queryBuilder.clear()'>X</button>" + "<button onclick='Lineage_queryBuilder.previousStage()'><ok></button></div>";

      return html;
    };


    self.clear = function() {
      self.test();
    };


    self.executQuery = function() {

      var source = self.currentQuery.source;
      var currentClass = self.currentQuery.currentClass;
      var path = self.currentQuery.path;
      var individualId = self.currentQuery.individualId;
      var individualsFilterRole= self.currentQuery.individualsFilterRole
      var individualsFilterType = self.currentQuery.individualsFilterType;
      var individualsFilterValue = self.currentQuery.individualsFilterValue;


      function getPathFilter() {
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
        var filter=""
        if(!individualsFilterRole)
          return "";
        if (individualsFilterType == "label") {
          filter=Sparql_common.setFilter(individualsFilterRole,null,individualsFilterValue)
        }
        else if (individualsFilterType == "list") {
          filter=Sparql_common.setFilter(individualsFilterRole,individualsFilterValue,null, { useFilterKeyWord: 1 });
        }
        else if (individualsFilterType == "advanced") {
          filter=individualsFilterValue
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
            data=[]
            var nodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get();
            nodes.forEach(function(node) {
              if (node.data && (!node.data.type || node.data.type != "literal")) {
                data.push(node.id);
              }
            });
          }
        }
        else if (selection == "all") {
          data = null;
        }

        return data;
      }


      var data = getWhiteBoardFilter();
      var filter=getPathFilter()+" "+getIndividualsFilter()
      var options = {
        filter: filter
      };

      Lineage_whiteboard.drawPredicatesGraph(source, data, null, options, )

    }
    ;

    return self;


  }
)
();

export default Lineage_queryBuilder;
window.Lineage_queryBuilder = Lineage_queryBuilder;