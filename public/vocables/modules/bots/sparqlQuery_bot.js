
import Lineage_sources from "../tools/lineage/lineage_sources.js";
import common from "../shared/common.js";
//import KGquery_graph from "..tools/KGquery/KGquery_graph.js";
import Sparql_OWL from "../sparqlProxies/sparql_OWL.js";
import Lineage_relationIndividualsFilter from "../tools/lineage/lineage_relationIndividualsFilter.js";
import Lineage_whiteboard from "../tools/lineage/lineage_whiteboard.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";
import IndividualValueFilterWidget from "../uiWidgets/individualValuefilterWidget.js";
import BotEngine from "./BotEngine.js";



var SparqlQuery_bot = (function() {
    var self = {};



self.start=function() {
  BotEngine.init(SparqlQuery_bot, function() {
    self.title = "Query graph"
    self.params = { source: Lineage_sources.activeSource };
    BotEngine.currentObj = self.workflow;
    BotEngine.nextStep(self.workflow);

  })
}



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
      "listIndividualFilterRole": {
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
        BotEngine.showList(vocabs, "currentVocab");


      },
      listQueryTypeFn: function() {
        var choices = [
          { id: "Class", label: "Class" },
          { id: "Property", label: "Property" }
        ];

        BotEngine.showList(choices, null);
        return;

      },


      listClassesFn: function() {
        var vocab = self.params.currentVocab;
        var classes = [];
        for (var key in Config.ontologiesVocabularyModels[vocab].classes) {
          var classId = Config.ontologiesVocabularyModels[vocab].classes[key];
          classes.push({ id: classId.id, label: classId.label });
        }
        BotEngine.showList(classes, "currentClass");
      },

      listPropertiesFn: function() {
        var vocab = self.params.currentVocab;
        var props = [];
        for (var key in Config.ontologiesVocabularyModels[vocab].properties) {
          var prop = Config.ontologiesVocabularyModels[vocab].properties[key];
          props.push({ id: prop.id, label: prop.label });
        }
        BotEngine.showList(props, "currentProperty");

      },


      listPredicatePathsFn: function() {
        var property = self.params.currentProperty;
        var fromClass = self.params.currentClass;
        var toClass = self.params.currentClass;

        self.getSourceInferredModelVisjsData(self.params.source + "_KGmodelGraph.json", function(err, visjsData) {
          if (err) {
            console.log(err.responseText);
            return BotEngine.nextStep("empty");
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
            BotEngine.nextStep("empty");
            return;
          }
          BotEngine.showList(paths, "path", "ok");
          return;


        });
      },

      listIndividualFilterRole: function() {

        var subject = "subject";
        var object = "object";
        if (self.params.path) {
          var array = self.params.path.split("|");
          if (array.length == 3) {
            subject = Sparql_common.getLabelFromURI(array[0]);
            object = Sparql_common.getLabelFromURI(array[2]);
          }
        }
        var choices = [
          { id: "all", label: "all individuals" },
          { id: "subject", label: ("filter " + subject) },
          { id: "object", label: ("filter " + object) }
        ];
        BotEngine.showList(choices, "individualsFilterRole");
        return;


      }
      ,
      listFilterTypes: function(target) {
        var choices = [
          { id: "label", label: "label contains" },
          { id: "list", label: "choose in list" },
          { id: "advanced", label: "advanced search" }
        ];
        BotEngine.showList(choices, "individualsFilterType");

      },


      listIndividuals: function() {
        Sparql_OWL.getDistinctClassLabels(self.params.source, [self.params.currentClass], {}, function(err, result) {
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
          BotEngine.showList(individuals, "individualsFilterValue");

        });
      },
      promptIndividualsLabel: function() {
        self.params.individualsFilterValue = prompt("label contains ");
        BotEngine.writeCompletedHtml(self.params.individualsFilterValue)
        BotEngine.nextStep();

      },
      promptIndividualsAdvandedFilter: function() {
        IndividualValueFilterWidget.showDialog(null, self.params.source, self.params.individualsFilterRole, self.params.currentClass, null, function(err, filter) {
          self.params.advancedFilter = filter;
          BotEngine.writeCompletedHtml(self.params.advancedFilter)
          BotEngine.nextStep("advanced");
        });
      },

      listWhiteBoardFilterType: function() {
        var choices = [
          { id: "selectedNode", label: "selectedNode" },
          { id: "whiteboardNodes", label: "whiteboard nodes" },
          { id: "sourceNodes", label: "all Source Nodes" }
        ];
        BotEngine.showList(choices, "whiteboardFilterType");

      },
      executeQuery: function() {

        var source = self.params.source;
        var currentClass = self.params.currentClass;
        var currentProperty = self.params.currentProperty;
        var path = self.params.path;
        var individualsFilterRole = self.params.individualsFilterRole;
        var individualsFilterType = self.params.individualsFilterType;
        var individualsFilterValue = self.params.individualsFilterValue;
        var advancedFilter = self.params.advancedFilter || "";

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

          var whiteboardFilterType = self.params.whiteboardFilterType;

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
     BotEngine.nextStep()

      }
    }


    self.getSourceInferredModelVisjsData = function(sourceLabel, callback) {
        if (self.params.currentSourceInferredModelVijsData) {
          return callback(null, self.params.currentSourceInferredModelVijsData);
        }
        var visjsGraphFileName = self.params.source + "_KGmodelGraph.json";
        $.ajax({
          type: "GET",
          url: `${Config.apiUrl}/data/file?dir=graphs&fileName=${visjsGraphFileName}`,
          dataType: "json",
          success: function(result, _textStatus, _jqXHR) {
            self.params.currentSourceInferredModelVijsData = JSON.parse(result);
            return callback(null, self.params.currentSourceInferredModelVijsData);
          }, error: function(err) {
            return callback(err);
          }
        });

      }

    return self;


  })
();

export default SparqlQuery_bot;
window.SparqlQuery_bot = SparqlQuery_bot;