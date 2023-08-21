import common from "../shared/common.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";


var IndividualValueFilterWidget = (function() {
  var self = {};
  self.operators = {
    String: ["contains", "not contains", "="],
    Number: ["=", "!=", "<", "<=", ">", ">="]
  };


  self.properties = [
    "rdfs:label",
    "rdfs:isDefinedBy",
    "rdfs:comment",

    "",
    "xsd:string",
    "xsd:dateTime",
    "xsd:boolean",
    "xsd:integer",
    "xsd:float",
    "xsd:double",
    "xsd:decimal",
    "rdf:XMLLiteral",

    "",

    "skos:altLabel",
    "skos:prefLabel",
    "skos:definition",
    "skos:example",


    ""
  ];


  self.showDialog = function(divId, varName, validateFn) {
    self.varName = varName;
    self.validateFn = validateFn;

    if (!divId) {
      divId = "smallDialogDiv";
      self.divId = divId;
      $("#smallDialogDiv").dialog("open");
    }
    $("#" + divId).load("snippets/IndividualValueFilterWidget.html", function() {

      common.fillSelectOptions("individualValueFilter_propertySelect", self.properties, true);

    });

  };

  self.onSelectProperty = function(property) {
    if (Sparql_common.isTripleObjectString(property)) {
      var operators = self.operators["String"];

    }
    else {
      var operators = self.operators["Number"];
    }
    common.fillSelectOptions("individualValueFilter_operatorSelect", operators, true);
  }

    self.onOKbutton = function() {
      var property = $("#individualValueFilter_propertySelect").val();
      var operator = $("#individualValueFilter_operatorSelect").val();
      var value = $("#individualValueFilter_objectValue").val();

   /*   if (self.validateFn && (!property || !operator || !value)) {
        return self.validateFn("missing paramaters in filter");
      }*/


      self.filter = self.getSparqlFilter(self.varName, property, operator, value);
      $("#" + self.divId).dialog("close");
      if (self.validateFn) {

          return self.validateFn(null, self.filter);

      }

    };



  self.getSparqlFilter = function(varName, property, operator, value) {

    if (!property || !value) {
      return null;
    }
    if (property.indexOf("xsd:") == 0) {
      var xsd = property;
      property = "owl:hasValue";
      value = "'" + value + "'^^" + xsd;

    }


    var filter = "";
    var filterIndex = "";

    if (value.indexOf("xsd:dateTime") > -1) {
      filter = "?" + varName + "  owl:hasValue ?value  filter(    datatype(?value) = xsd:dateTime" + " && ?value" + operator + value + ")";
    }
    else if (value.indexOf("xsd:") > -1) {
      filter = "?" + varName + "  owl:hasValue ?value  filter(  ?value" + operator + value + ")";

    }
    else {

      if (operator == "contains") {
        filter += "?" + varName + "  " + property + " ?q. Filter(regex(str(?q" + filterIndex + "),'" + value + "','i')).";
      }
      else if (operator == "not contains") {
        filter += "?" + varName + "  " + property + " ?q. Filter(!regex(str(?q" + filterIndex + "),'" + value + "','i')).";
      }
      else {
        if (Sparql_common.isTripleObjectString(property, value)) {
          value = "'" + value + "'";
        }

        filter += "?" + varName + "  " + property + " ?q. Filter(?q" + operator + ")" + value + ").";


      }

    }

    return filter;
  };


  self.onSelectOperator = function(value) {
    $("#individualValueFilter_objectValue").focus()
  };
  self.onSelectObject = function(value) {

  };

  return self;
})();
export default IndividualValueFilterWidget;
window.IndividualValueFilterWidget = IndividualValueFilterWidget