import botEngine from "./botEngine.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";
import KGquery from "../tools/KGquery/KGquery.js";
import SparqlQuery_bot from "./sparqlQuery_bot.js";
import BotEngine from "./botEngine.js";
import Lineage_sources from "../tools/lineage/lineage_sources.js";
import AxiomsEditor from "../tools/lineage/axiomsEditor.js";
import Lineage_whiteboard from "../tools/lineage/lineage_whiteboard.js";


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


    self.workflow_saveResource =
      { saveResourceFn: { _OR: { editResourceFn: {}, drawResourceFn: {} } } };

    self.workflow = {

      "listResourceTypesFnFn": {
        "_OR":
          {
            "Class": { "promptResourceLabelFn": { listVocabsFn: { listSuperClassesFn: { axiomaticDefinitionFn: self.workflow_saveResource } } } },
            "ObjectProperty": { "promptResourceLabelFn": { listVocabsFn: { listObjectProperties: self.workflow_saveResource } } },
            "AnnotationProperty": { "promptResourceLabelFn": { listDatatypeProperties: self.workflow_saveResource } },
            "Individual": { "promptResourceLabelFn": { listVocabsFn: { listSuperClassesFn: self.workflow_saveResource } } }

          }
      }
    };





    self.functionTitles = {
      _OR: "Select an option",
      listResourceTypesFnFn: "Choose a resource type",
      promptResourceLabelFn: " Enter resource label (rdfs:label)",
      listVocabsFn: "Choose a reference ontology",
      listSuperClassesFn: "Choose a  Class as superClass ",
      listClassTypesFn: "Choose a  a class type ",
      axiomaticDefinitionFn: "",
      saveResourceFn:" Save Resource",
      editResourceFn:"EditResource",
      drawResourceFn:"EditResource",


    };


    self.functions = {
      listResourceTypesFnFn: function(queryParams, varName) {
        var choices = [
          { id: "Class", label: "Class" },
          { id: "Individual", label: "Individual" },
          { id: "ObjectProperty", label: "ObjectProperty" },
          { id: "AnnotationProperty", label: "AnnotationProperty" }
        ];
        BotEngine.showList(choices, "resourceType");
      },


      listVocabsFn: function() {
        var sourceLabel = self.source;
        var vocabs = [{ id: sourceLabel, label: sourceLabel }];
        var imports = Config.sources[sourceLabel].imports;
        imports.forEach(function(importSource) {
          vocabs.push({ id: importSource, label: importSource });
        });
        BotEngine.showList(vocabs, "currentVocab");
      },


      promptResourceLabelFn: function() {
        self.params.resourceLabel = prompt("resource label ");
        BotEngine.writeCompletedHtml(self.params.resourceLabel);
        BotEngine.nextStep();

      },

      listSuperClassesFn: function() {
        var vocab = self.params.currentVocab;
        var classes = [{ id: "owl:Thing", label: "owl:Thing" }];
        for (var key in Config.ontologiesVocabularyModels[vocab].classes) {
          var classId = Config.ontologiesVocabularyModels[vocab].classes[key];
          classes.push({ id: classId.id, label: classId.label });
        }
        BotEngine.showList(classes, "resourceId");

      },
      listClassTypesFn:function() {
        self.functions.listSuperClassesFn()
      },
      axiomaticDefinitionFn: function() {
        AxiomsEditor.init(self.params.resourceId,function(err,manchesterText){
          self.params.manchesterText=manchesterText
          BotEngine.nextStep()
        })

      },


      saveResourceFn: function() {


      },
      editResourceFn: function() {
        NodeInfosWidget.showNodeInfos(self.params.source,self.params.resourceId)

      },
      drawResourceFn: function() {
        var nodeData = {
          id:self.params.resourceId,
          data: {
            id: self.params.resourceId,
            source:self.params.source
          }
        };
        Lineage_whiteboard.drawNodesAndParents(nodeData, 2);

      },


    };


    return self;


  }
)
();

export default CreateResource_bot;
window.CreateResource_bot = CreateResource_bot;