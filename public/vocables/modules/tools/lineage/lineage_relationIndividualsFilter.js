import common from "../../shared/common.js";
//import Lineage_relationFilter from "./lineage_relationFilter.js";
import Lineage_sources from "./lineage_sources.js";
import SearchUtil from "../../search/searchUtil.js";
import Lineage_relations from "./lineage_relations.js";
import DateWidget from "../../uiWidgets/dateWidget.js";

var Lineage_relationIndividualsFilter = (function() {
  var self = {};
  self.filter = "";
  self.individualsFilter = [];

  self.init = function() {
    self.filter = "";
    var currentPropertyNode = Lineage_relations.currentPropertyTreeNode;
    $("#smallDialogDiv").dialog("open");
    $("#smallDialogDiv").load("snippets/lineage/relationPropDomainRangeDialog.html", function() {
      if (currentPropertyNode.data.constraints) {
        var roles = [currentPropertyNode.data.constraints.domain, currentPropertyNode.data.constraints.range];
      }
      else {
        roles = [{ id: "anyClass", label: "any Class" }];
      }
      common.fillSelectOptions("lineage_relationIndividuals_filterRoleSelect", roles, null, "label", "id");
      if (currentPropertyNode.data.constraints) {
        $("#lineage_relationIndividuals_filterRoleSelect").val(currentPropertyNode.data.constraints.domain.id);
      }

      $("#lineage_relationIndividuals_searchTermInput").keypress(function(e) {
        if (e.which == 13 || e.which == 9) {
          Lineage_relationIndividualsFilter.searchClassIndividuals();
          self.filter = "";
        }
      });
      $(".lineage_relationIndividuals_filterTypeDiv").css("display", "none");
      // $("#lineage_relationIndividuals_searchTermInput").focus();

      return;
      /* PredicatesSelectorWidget.load("lineage_relation_predicateSelectorDomainRangeDiv", Lineage_sources.activeSource, function() {
  var roles = [currentPropertyNode.data.constraints.domain, currentPropertyNode.data.constraints.range];

  common.fillSelectOptions("lineage_relation_filterDomainRangeRoleSelect", roles, null, "label", "id");

  $("#editPredicate_vocabularySelect2").val(Lineage_sources.activeSource);
  PredicatesSelectorWidget.setCurrentVocabClassesSelect(Lineage_sources.activeSource, "editPredicate_objectSelect");

});*/
    });
  };

  self.searchClassIndividuals = function(term) {
    var classId = $("#lineage_relationIndividuals_filterRoleSelect").val();

    if (!classId || classId!="anyClass") {
      return alert(" select a class");
    }
    if (term.indexOf("*") < 0) {
      term += "*";
    }

    var mode = "exactMatch";
    if (term.indexOf("*") > -1) {
      mode = "fuzzyMatch";
      // term=term.replace("*","")
    }
    if(classId=="anyClass")
      classId=null;
    var options = { classFilter: classId, skosLabels: true };
    var indexes = [Lineage_sources.activeSource.toLowerCase()];
    SearchUtil.getElasticSearchMatches([term], indexes, mode, 0, 1000, options, function(err, result) {
      if (err) {
        return alert(err);
      }

      var matches = [];
      result.forEach(function(item, index) {
        if (item.error) {
          return alert(err);
        }
        var hits = item.hits.hits;
        var uniqueItems = {};
        hits.forEach(function(hit) {
          if (!uniqueItems[hit._source.id]) {
            uniqueItems[hit._source.id] = 1;
            matches.push(hit._source);
          }
        });
      });

      var jstreeData = [];
      matches.forEach(function(item) {
        jstreeData.push({
          id: item.id,
          text: item.label,
          parent: "#"
        });
      });
      var options = {
        openAll: true,
        withCheckboxes: true,
        selectTreeNodeFn: Lineage_relationIndividualsFilter.addIndividualFilter
      };

      JstreeWidget.loadJsTree("lineage_relationIndividuals_matchesTreeDiv", jstreeData, options);

      //   common.fillSelectOptions("lineage_relationIndividuals_matchesSelect", matches, false, "label", "id");
    });
  };

  self.addIndividualFilter = function(event, obj) {

    var classId = $("#lineage_relationIndividuals_filterRoleSelect").val();
    var classIndex = $("#lineage_relationIndividuals_filterRoleSelect")[0].selectedIndex;
    var classLabel = $("#lineage_relationIndividuals_filterRoleSelect").text();
    var individuals = [];
    var individualLabels = [];
    if (!obj) {
      var individualObjs = $("#lineage_relationIndividuals_matchesTreeDiv").jstree().get_checked(true);
      individualObjs.forEach(function(item) {
        individuals.push(item.id);
        individualLabels.push(item.text);
      });
    }
    else {
      individuals = [obj.node.id];
    }
    var individualLabel = $("#lineage_relationIndividuals_filterRoleSelect").text();
    //  var message="filter  "+classLabel+" = "+individualLabel
    Lineage_relations.currentQueryInfos.filter.classLabel = classLabel;
    Lineage_relations.currentQueryInfos.filter.value = individualLabels.toString();
    var role = classIndex == 0 ? "subject" : "object";

    var message = Sparql_common.setFilter(role, individuals);
    // var message = "FILTER(?" + role + " = <" + individual + ">)  ";
    $("#lineage_relationIndividuals_fitlerTA").text(message);
  };

  self.execFilter = function(action) {
    $("#smallDialogDiv").dialog("close");
    $("#mainDialogDiv").dialog("close");

    Lineage_relationIndividualsFilter.addRangeAndDomainFilter();
    Lineage_relations.onshowDrawRelationsDialogValidate(action);
  };

  self.addRangeAndDomainFilter = function() {
    var filter = $("#lineage_relationIndividuals_fitlerTA").text();
    if (filter) {
      self.filter = filter;
    }
    else {
      self.filter = "";
    }
  };

  self.onFilterTypeSelect = function(filterType) {
    $(".lineage_relationIndividuals_filterTypeDiv").css("display", "none");
 /*   var classId = $("#lineage_relationIndividuals_filterRoleSelect").val();
    if (!classId) {
      return alert(" select a class");
    }*/
    $(".filterTypeDiv_" + filterType).css("display", "flex");

    if (filterType == "searchLabel") {
      var term = prompt("contains");
      if (false && !term) {
        return $(".filterTypeDiv_" + filterType).css("display", "none");
      }
      self.searchClassIndividuals(term);
    }
    else if (filterType == "dateRange") {
      DateWidget.setDateRangePickerOnInput("lineage_relationIndividuals_dateRangePicker", function(dateRange) {
        var classIndex = $("#lineage_relationIndividuals_filterRoleSelect")[0].selectedIndex;
        var role = classIndex == 0 ? "subject" : "object";
        var filter = Sparql_common.setDateRangeSparqlFilter(role, dateRange.startDate, dateRange.endDate);
        $("#lineage_relationIndividuals_fitlerTA").text(filter);
      });
    }
    else if (filterType == "date") {
      DateWidget.setDatePickerOnInput("lineage_relationIndividuals_datePicker", function(date) {
      });
      Lineage_relations.currentQueryInfos.filter.value = "Date between " + dateRange.startDate + " and " + dateRange.endDate;
    }
    else if (filterType == "advanced") {
    $("#lineage_relationIndividuals_LeftDiv").css("display","none")
      PredicatesSelectorWidget.load("lineage_relation_predicateSelectorDiv", Lineage_sources.activeSource);
    }


  };
  self.setDateFilter = function(precision) {
    if (!precision) {
      return;
    }
    var classIndex = $("#lineage_relationIndividuals_filterRoleSelect")[0].selectedIndex;
    var date = $("#lineage_relationIndividuals_datePicker").datepicker("getDate");
    if (!date) {
      return alert("select a date");
    }
    var role = classIndex == 0 ? "subject" : "object";
    Lineage_relations.currentQueryInfos.filter.value = "Date" + precision + date.toDateString();

    var filter = Sparql_common.setDateRangeSparqlFilter(role, date, null, { precision: precision });
    $("#lineage_relationIndividuals_fitlerTA").text(filter);
  };

  return self;
})();

export default Lineage_relationIndividualsFilter;

window.Lineage_relationIndividualsFilter = Lineage_relationIndividualsFilter;
