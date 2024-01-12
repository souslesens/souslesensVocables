
import Sparql_common from "../sparqlProxies/sparql_common.js";
import KGquery from "../tools/KGquery/KGquery.js";
import SparqlQuery_bot from "./sparqlQuery_bot.js";
import BotEngine from "./botEngine.js";
import Lineage_sources from "../tools/lineage/lineage_sources.js";
import AxiomsEditor from "../tools/lineage/axiomsEditor.js";
import Lineage_whiteboard from "../tools/lineage/lineage_whiteboard.js";
import CommonBotFunctions from "./commonBotFunctions.js";


var CreateResource_bot = (function() {
    var self = {};
    self.title = "Create Resource";

    self.start = function() {
      BotEngine.init(CreateResource_bot, function() {
        self.source = Lineage_sources.activeSource;
        self.params = { source: self.source, resourceType: "", resourceLabel: "", currentVocab: "" };
        BotEngine.currentObj = self.workflow;
        BotEngine.nextStep(self.workflow);

      });
    };

    self.workflow_end =
      {
          "_OR":
            {
              "New Resource": {newResourceFn:{}},
              "End": {}
            }
      };
    self.workflow_saveResource =
      {
        "saveResourceFn": {
          "_OR": {
            "Edit": { editResourceFn: self.workflow_end },
            "Draw": { drawResourceFn: self.workflow_end }


          }


        }
      };

    self.workflow = {

      "listResourceTypesFn": {
        "_OR":
          {
            "owl:Class": { "promptResourceLabelFn": { listVocabsFn: { listSuperClassesFn: self.workflow_saveResource } } },
            "owl:ObjectProperty": { "promptResourceLabelFn": { listVocabsFn: { listObjectProperties: self.workflow_saveResource } } },
            "owl:AnnotationProperty": { "promptResourceLabelFn": { listDatatypeProperties: self.workflow_saveResource } },
            "owl:Individual": { "promptResourceLabelFn": { listVocabsFn: { listSuperClassesFn: self.workflow_saveResource } } }

          }
      }
    };


    self.functionTitles = {
      _OR: "Select an option",
      listResourceTypesFn: "Choose a resource type",
      promptResourceLabelFn: " Enter resource label (rdfs:label)",
      listVocabsFn: "Choose a reference ontology",
      listSuperClassesFn: "Choose a  Class as superClass ",
      listClassTypesFn: "Choose a  a class type ",
      saveResourceFn: " Save Resource",


    };


    self.functions = {
      listResourceTypesFn: function(queryParams, varName) {
        var choices = [
          { id: "owl:Class", label: "Class" },
          { id: "owl:Individual", label: "Individual" },
          { id: "owl:ObjectProperty", label: "ObjectProperty" },
          { id: "owl:AnnotationProperty", label: "AnnotationProperty" }
        ];
        BotEngine.showList(choices, "resourceType");
      },


      listVocabsFn: function() {

        CommonBotFunctions.listVocabsFn(self.source,"currentVocab")

      },


      promptResourceLabelFn: function() {
        self.params.resourceLabel = prompt("resource label ");
        BotEngine.writeCompletedHtml(self.params.resourceLabel);
        BotEngine.nextStep();

      },

      listSuperClassesFn: function() {
        CommonBotFunctions.listVocabClasses(self.params.currentVocab,"resourceId",true);

      },
      listClassTypesFn: function() {
        self.functions.listSuperClassesFn();
      },
      axiomaticDefinitionFn: function() {
        AxiomsEditor.init(self.params.resourceId, function(err, manchesterText) {
          self.params.manchesterText = manchesterText;
          BotEngine.nextStep();
        });

      },


      saveResourceFn: function() {
        var triples = Lineage_createResource.getResourceTriples(self.params.source, self.params.resourceType, null, self.params.resourceLabel, self.params.resourceId);
        Lineage_createResource.writeResource(self.params.source, triples, function(err, resourceId) {

          if (err) {
            BotEngine.abort(err.responseText)
          }
          self.params.resourceId = resourceId;
          BotEngine.nextStep();

        });

      },

      editResourceFn: function() {
        NodeInfosWidget.showNodeInfos(self.params.source, self.params.resourceId,"mainDialogDiv");
        BotEngine.nextStep();

      },
      drawResourceFn: function() {
        var nodeData = {
          id: self.params.resourceId,
          data: {
            id: self.params.resourceId,
            source: self.params.source
          }
        };
        Lineage_whiteboard.drawNodesAndParents(nodeData, 2);
        BotEngine.nextStep();

      },
      newResourceFn:function(){
        self.start()
      }


    };


    return self;


  }
)
();

export default CreateResource_bot;
window.CreateResource_bot = CreateResource_bot;