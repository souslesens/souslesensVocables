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
      var roles = [currentPropertyNode.data.constraints.domain, currentPropertyNode.data.constraints.range];

      common.fillSelectOptions("lineage_relationIndividuals_filterRoleSelect", roles, null, "label", "id");
      $("#lineage_relationIndividuals_filterRoleSelect").val(currentPropertyNode.data.constraints.domain.id);

      $("#lineage_relationIndividuals_searchTermInput").keypress(function(e) {
        if (e.which == 13 || e.which == 9) {
          Lineage_relationIndividualsFilter.searchClassIndividuals();
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
    if (!classId) {
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
        onCheckNodeFn: Lineage_relationIndividualsFilter.addIndividualFilter
      };

      JstreeWidget.loadJsTree("lineage_relationIndividuals_matchesTreeDiv", jstreeData, options);

      //   common.fillSelectOptions("lineage_relationIndividuals_matchesSelect", matches, false, "label", "id");
    });
  };

  self.addIndividualFilter = function() {
    var classId = $("#lineage_relationIndividuals_filterRoleSelect").val();
    var classIndex = $("#lineage_relationIndividuals_filterRoleSelect")[0].selectedIndex;
    var classLabel = $("#lineage_relationIndividuals_filterRoleSelect").text();
    var individual = $("#lineage_relationIndividuals_matchesSelect").val();
    var individualLabel = $("#lineage_relationIndividuals_filterRoleSelect").text();
    //  var message="filter  "+classLabel+" = "+individualLabel

    var role = classIndex == 0 ? "subject" : "object";
    var message = "FILTER(?" + role + " = <" + individual + ">)  ";

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
    var classId = $("#lineage_relationIndividuals_filterRoleSelect").val();
    if (!classId) {
      return alert(" select a class");
    }
    $(".filterTypeDiv_" + filterType).css("display", "flex");


    if (filterType == "searchLabel") {
      var term = prompt("contains");
      if (!term) {
        return   $(".filterTypeDiv_" + filterType).css("display", "none");;
      }
      self.searchClassIndividuals(term)
    }
   else  if (filterType == "dateRange") {
      DateWidget.setDateRangePickerOnInput("lineage_relationIndividuals_dateRangePicker",function(dateRange){
       var classIndex = $("#lineage_relationIndividuals_filterRoleSelect")[0].selectedIndex;
       var role = classIndex == 0 ? "subject" : "object";
       var filter=Sparql_common.setDateRangeSparqlFilter(role,dateRange.startDate,dateRange.endDate)
       $("#lineage_relationIndividuals_fitlerTA").text(filter);
     })

    }

    else  if (filterType == "date") {

      DateWidget.setDatePickerOnInput("lineage_relationIndividuals_datePicker",function(date){

      })


    }

    self.setDateFilter=function(precision){
      if(!precision)
        return;
      var classIndex = $("#lineage_relationIndividuals_filterRoleSelect")[0].selectedIndex;
      var date=$("#lineage_relationIndividuals_datePicker").datepicker( "getDate" );
      var role = classIndex == 0 ? "subject" : "object";

      var filter=Sparql_common.setDateRangeSparqlFilter(role,date,null, {precision:precision})
      $("#lineage_relationIndividuals_fitlerTA").text(filter);
    }


  };

  return self;
})();

export default Lineage_relationIndividualsFilter;

window.Lineage_relationIndividualsFilter = Lineage_relationIndividualsFilter;
