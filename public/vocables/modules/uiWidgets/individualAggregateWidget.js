import common from "../shared/common.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";


var IndividualAggregateWidget = (function() {
  var self = {};
  self.groupFunctions = ["sum", "max", "min", "avg"];


  self.showDialog = function(divId, loadClassesFn, validateFn) {
    self.validateFn = validateFn;

    if (!divId) {
      divId = "smallDialogDiv";
      self.divId = divId;
      $("#smallDialogDiv").dialog("open");
    }
    $("#" + divId).load("snippets/IndividualAggregateWidget.html", function() {


      loadClassesFn(function(data) {
        var groupByClasses = [];
        var functionVarClasses = [];
        for (var key in data) {
          var item = data[key];
          if (item.data.datatype) {
            functionVarClasses.push(item);
          }
          else {
            groupByClasses.push(item);
          }
        }
        common.fillSelectOptions("individualAggregate_groupBySelect", groupByClasses, null, "label", "id");
        common.fillSelectOptions("individualAggregate_functionVariableSelect", functionVarClasses, null, "label", "id");
        common.fillSelectOptions("individualAggregate_groupFunctionSelect", self.groupFunctions, null );



      });

    });

  };


  self.getSparqlFilter = function(varName, property, operator, value) {
    if (varName) {
      varName = "?" + varName;
    }
    else {
      varName = "";
    }
    if (!property || !value) {
      return null;
    }
    if (property.indexOf("xsd:") == 0) {
      var xsd = property;
      property = "owl:hasValue";
      value = "'" + value + "'^^" + xsd;

    }


    var filter = "";


    if (value.indexOf("xsd:dateTime") > -1) {
      filter = varName + "  owl:hasValue " + varName + "_value  filter(    datatype(" + varName + "_value) = xsd:dateTime" + " && " + varName + "_value" + operator + value + ")";
    }
    else if (value.indexOf("xsd:") > -1) {
      filter = varName + "  owl:hasValue " + varName + "_value  filter(  " + varName + "_value" + operator + value + ")";

    }
    else {

      if (operator == "contains") {
        filter += varName + "  " + property + " " + varName + "_value. Filter(regex(str(" + varName + "_value),'" + value + "','i')).";
      }
      else if (operator == "not contains") {
        filter += varName + "  " + property + " " + varName + "_value. Filter(!regex(str(" + varName + "_value),'" + value + "','i')).";
      }
      else {
        if (Sparql_common.isTripleObjectString(property, value)) {
          value = "'" + value + "'";
        }

        filter += varName + "  " + property + " " + varName + "_value. Filter(" + varName + "_value" + operator + "" + value + ").";


      }

    }

    return filter;
  };


  self.onSelectOperator = function(value) {
    $("#individualValueFilter_objectValue").focus();
  };
  self.onSelectObject = function(value) {

  };
  self.onSelectProperty = function(property) {

  };


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

  return self;
})();
export default IndividualAggregateWidget;
window.IndividualAggregateWidget = IndividualAggregateWidget;