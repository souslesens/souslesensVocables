var Lineage_query = (function() {
    var self = {};
    self.getPropertiesJstreeMenu = function() {
      var items = {};

      items.addFilter = {
        label: "addFilter",
        action: function(_e) {
          // pb avec source
          Lineage_query.showAddFilterDialog();
        }
      };
      return items;
    };

    self.onSelectPropertyTreeNode = function(event, object) {
      if (object.node.parent == "#") {
        return self.currentProperty = null;
      }

      var vocabulary = object.node.parent;
      self.currentProperty = { id: object.node.data.id, label: object.node.data.label, vocabulary: vocabulary };
      self.showAddFilterDialog();
    },

      self.showAddFilterDialog = function() {

        $("#lineage_relation_filterRoleSelect").val("");
        $("#Lineage_relation_filterTypeSelect").val("");
        $("#Lineage_relation_filterVocabularySelect").val("");
        $("#lineageQuery_valueDiv").css("display", "none");
        if (!self.currentProperty) {
          return;
        }

        $("#lineageRelations_filterDiv").css("display", "flex");

        /* $("#mainDialogDiv").dialog("open");
         $("#mainDialogDiv").load("snippets/lineage/relationsDialogFilter.html", function() {*/

        var propStr = self.currentProperty.vocabulary + "." + self.currentProperty.label + "<br>";

        self.domainValue = "";
        self.rangeValue = "";
        self.domain = null;
        self.range = null;


        self.ObjectsTypesMap = {
          any: ["String", "Date", "Number", "owl:Class", "rdf:Bag", "owl:NamedIndividual", "owl:ObjectProperty", "owl:DataTypeProperty"],
          Literal: ["String", "Date", "Number"],
          Resource: ["owl:Class", "rdf:Bag", "owl:NamedIndividual"],
          Class: ["owl:Class"],
          Property: ["owl:ObjectProperty", "owl:DataTypeProperty"]
        };

        self.operators = {
          "String": ["contains", "not contains", "="],
          "Number": ["=", "!=", "<", "<=", ">", ">="]

        };

        if (Config.ontologiesVocabularyModels[self.currentProperty.vocabulary]) {
          var restrictions = Config.ontologiesVocabularyModels[self.currentProperty.vocabulary].restrictions;
          var constraints = Config.ontologiesVocabularyModels[self.currentProperty.vocabulary].constraints;

          var suffix = "";
          if (restrictions[self.currentProperty.id]) {
            suffix = " Restr.";
            self.domain = restrictions[self.currentProperty.id].domain;
            self.range = restrictions[self.currentProperty.id].range;


          }

          else if (constraints[self.currentProperty.id]) {
            self.domain = constraints[self.currentProperty.id].domain;
            self.range = constraints[self.currentProperty.id].range;

          }

          var domainLabel = "any";
          if (self.domain) {
            if (Config.ontologiesVocabularyModels[self.currentProperty.vocabulary].classes[self.domain]) {
              domainLabel = Config.ontologiesVocabularyModels[self.currentProperty.vocabulary].classes[self.domain].label;
            }
            else {
              domainLabel = self.domain;
            }
          }
          var rangeLabel = "any";
          if (self.range) {
            if (Config.ontologiesVocabularyModels[self.currentProperty.vocabulary].classes[self.range]) {
              var rangeLabel = Config.ontologiesVocabularyModels[self.currentProperty.vocabulary].classes[self.range].label;
            }
            else {
              rangeLabel = self.range;
            }
          }

          $("#Lineage_relation_constraints").html(
            "<b>" + self.currentProperty.label + "</b>" +
            "<br>" + suffix + "Domain :" + domainLabel +

            "<br>" + suffix + "Range :" + rangeLabel
          );


        }
        $("#Lineage_relation_property").html(propStr);


        if (false) {
          var types = Object.keys(self.ObjectsTypesMap);
          if (self.domain) {
            for (var type in self.ObjectsTypesMap) {
              if (domain.indexOf(type) > -1) {
                common.fillSelectOptions("Lineage_relation_filterTypeSelect", self.ObjectsTypesMap[type], true);
              }
            }
          }
          if (self.range) {
            for (var type in ObjectsTypesMap) {
              if (range.indexOf(type) > -1) {
                common.fillSelectOptions("Lineage_relation_rangeTypeSelect", self.ObjectsTypesMap[type], true);
              }
            }
          }
          else {
            common.fillSelectOptions("Lineage_relation_rangeTypeSelect", self.ObjectsTypesMap["any"], true);
          }
        }
        // });

      }
    ;


    self.onSelectRoleType = function(role) {
      self.currentFilterRole = role;
      $("#lineage_relation_filterRole").html(role);

      var types = Object.keys(self.ObjectsTypesMap);

      var ok = false;
      for (var type in self.ObjectsTypesMap) {
        if ((role == "subject" && self.domain.indexOf(type) > -1) || (role == "object" && self.range.indexOf(type) > -1)) {
          ok = true;
          common.fillSelectOptions("Lineage_relation_filterTypeSelect", self.ObjectsTypesMap[type], true);
        }
      }
      if (!ok) {
        common.fillSelectOptions("Lineage_relation_filterTypeSelect", self.ObjectsTypesMap["any"], true);
      }

    };


    self.onSelectResourceType = function(role, type) {
      if (type == "String") {
        common.fillSelectOptions("lineageQuery_operator", self.operators["String"]);
        $("#lineageQuery_valueDiv").css("display", "block");
      }
      else {
        var scopes = [];
        if (visjsGraph.isGraphNotEmpty) {
          scopes.push("whiteBoardNodes");
        }
        scopes.push(Lineage_sources.activeSource);
        var imports = Config.sources[Lineage_sources.activeSource].imports;
        if (imports) {
          scopes = scopes.concat(imports);
        }
        if (role == "domain") {
          common.fillSelectOptions("Lineage_relation_filterVocabularySelect", scopes, true);
        }
        else if (role == "range") {
          common.fillSelectOptions("Lineage_relation_rangesVocabularySelect", scopes, true);
        }


      }


    };


    self.onSelectResource = function(role, type) {

      var resourceType = $("#Lineage_relation_filterTypeSelect").val();
      if (type == "whiteBoardNodes") {
      }
      else {

        //  if (resourceType == "owl:Class") {
        KGcreator.fillObjectOptionsFromPrompt("owl:Class", "Lineage_relation_filterResourcesSelect", type);
        //  }
      }


    };

    self.attachFilterToProperty = function() {

      var role = self.currentFilterRole;
      var resourceType = $("#Lineage_relation_filterTypeSelect").val();
      var resource = $("#Lineage_relation_filterResourcesSelect").val();

      var filter = {};
      if (!resourceType) {
        return (alert("no filter defined"));
      }
      if (resourceType == "whiteBoardNodes") {
        var nodeIds = visjsGraph.data.nodes.getIds();
        if (role == "subject") {
          filter.filterStr = " ?subject rdf:type " + resourceType + ". ";
          filter.subjectIds = nodeIds;
        }
        else if (role == "object") {
          filter.filterStr = " ?object rdf:type " + resourceType + ". ";
          filter.objectIds = nodeIds;
        }
      }
      else {
        if (resourceType == "String") {
          filter.filterStr = "FILTER ";
        }
        else {
          if (role == "subject") {
            filter.filterStr = " ?subject rdf:type " + resourceType + ". ";
            if (resource) {
              filter.filterStr += " VALUES ?subject {<" + resource + ">} ";
            }
          }
          else if (role == "object") {
            filter.filterStr = " ?object rdf:type " + resourceType + ". ";
            if (resource) {
              filter.filterStr += " VALUES ?object {<" + resource + ">} ";
            }
          }


        }


      }

      Lineage_relations.filter = filter.filterStr;
      $("#Lineage_relation_filterText").val(filter.filterStr);


    };

    return self;
  }
)
();
