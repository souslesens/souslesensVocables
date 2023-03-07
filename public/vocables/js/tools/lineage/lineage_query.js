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

  },

    self.showAddFilterDialog = function() {
      if (!self.currentProperty) {
        return;
      }

      $("#mainDialogDiv").dialog("open");
      $("#mainDialogDiv").load("snippets/lineage/relationsDialogFilter.html", function() {

        var propStr = self.currentProperty.vocabulary + "." + self.currentProperty.label + "<br>";
        var domainStr = "any";
        var rangeStr = "any";
        var domainValue = "";
        var rangeValue = "";
        var domain = null;
        var range = null;


        if (Config.basicVocabGraphs[self.currentProperty.vocabulary]) {
          var constraints = Config.basicVocabGraphs[self.currentProperty.vocabulary].constraints;


          if (constraints) {
            if (constraints[self.currentProperty.id]) {
              domain = constraints[self.currentProperty.id].domain;
              range = constraints[self.currentProperty.id].range;
              domainStr = domain || "any";
              rangeStr = range || "any";
            }

          }


        }
        /*  var html = "<table>" +
            "<tr>" +
            "<td>Subject</td>" +
            "<td>" + domainStr + "</td>" +
            "<td>  <select id='Lineage_relation_domainTypeSelect' onchange='Lineage_relations.onFilterObjectTypeSelect(\"domain\",$(this).val())'></select>"+ domainValue + "</td>" +
            "</tr>" +
            "<tr>" +
            "<td>Property</td>" +
           "<td>" + propStr + "</td>" +
            "<td>" + "" + "</td>" +

            "</tr>" +
            "<tr>" +
            "<td>Object</td>" +
            "<td>" + rangeStr + "</td>" +
            "<td> <select id='Lineage_relation_rangeTypeSelect' onchange='Lineage_relations.onFilterObjectTypeSelect(\"range\",$(this).val())'></select>" + rangeValue + "</td>" +
            "</tr>" +
            "</table>";

          $("#mainDialogDiv").html(html);*/


        var ObjectsTypesMap = {
          any: ["String", "Date", "Number", "Class", "Bag", "NamedIndividual", "ObjectProperty", "DataTypeProperty"],
          Literal: ["String", "Date", "Number"],
          Resource: ["Class", "Bag", "NamedIndividual"],
          Class: ["Class"],
          Property: ["ObjectProperty", "DataTypeProperty"]
        };

        self.operators = {
          "String": ["contains", "not contains", "="],
          "Number": ["=", "!=", "<", "<=", ">", ">="]

        };

        $("#Lineage_relation_property").html(propStr);

        var types = Object.keys(ObjectsTypesMap);
        if (domain) {
          for (var type in ObjectsTypesMap) {
            if (domain.indexOf(type) > -1) {
              common.fillSelectOptions("Lineage_relation_domainTypeSelect", ObjectsTypesMap[type], true);
            }
          }
        }
        if (range) {
          for (var type in ObjectsTypesMap) {
            if (range.indexOf(type) > -1) {
              common.fillSelectOptions("Lineage_relation_rangeTypeSelect", ObjectsTypesMap[type], true);
            }
          }
        }
        else {
          common.fillSelectOptions("Lineage_relation_rangeTypeSelect", ObjectsTypesMap["any"], true);
        }
      });

    };
  self.onSelectResourceType = function(role, type) {
    if (type == "String") {
      common.fillSelectOptions("lineageQuery_operator", self.operators["String"]);
      $("#lineageQuery_valueDiv").css("display", "block");
    }
    else {
      var scopes = ["whiteBoardNodes", Lineage_sources.activeSource];
      var imports = Config.sources[Lineage_sources.activeSource].imports;
      if (imports) {
        scopes = scopes.concat(imports);
      }
      if (role == "domain") {
        common.fillSelectOptions("Lineage_relation_domainVocabularySelect", scopes, true);
      }
      else if (role == "range") {
        common.fillSelectOptions("Lineage_relation_rangesVocabularySelect",scopes, true);
      }


    }


  };


  self.onSelectResource = function(role, type) {
    if (role == "domain") {
      var resourceType = $("#Lineage_relation_domainTypeSelect").val()
      if (type == "whiteBoardNodes") {
      }
      else {
        if (resourceType == "Class") {
          KGcreator.fillObjectOptionsFromPrompt("owl:Class", "Lineage_relation_domainResourcesSelect",type)
        }
      }

    }
    else if (role == "range") {
      var resourceType = $("#Lineage_relation_rangeTypeSelect").val()
      if (type == "whiteBoardNodes") {
      }
      else {
        if (resourceType == "Class") {
          KGcreator.fillObjectOptionsFromPrompt("owl:Class", "Lineage_relation_rangeResourcesSelect",type)
        }
      }

    }
  }

  return self;
})();
