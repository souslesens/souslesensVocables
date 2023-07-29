import common from "../../shared/common.js";
//import Lineage_relationFilter from "./lineage_relationFilter.js";
import Lineage_sources from "./lineage_sources.js";
import SearchUtil from "../../search/searchUtil.js";
import Lineage_relations from "./lineage_relations.js";

var Lineage_relationIndividualsFilter=(function(){

  var self={}
  self.filter=""
  self.individualsFilter=[]

  self.init=function(){
    self.filter=""
    var currentPropertyNode=Lineage_relations.currentPropertyTreeNode
      $("#smallDialogDiv").dialog("open");
      $("#smallDialogDiv").load("snippets/lineage/relationPropDomainRangeDialog.html", function() {


        var roles = [
          currentPropertyNode.data.constraints.domain, currentPropertyNode.data.constraints.range
        ];

        common.fillSelectOptions("lineage_relationIndividuals_filterRoleSelect", roles, null, "label", "id");




        return;
        PredicatesSelectorWidget.load("lineage_relation_predicateSelectorDomainRangeDiv", Lineage_sources.activeSource, function() {
          var roles = [
            currentPropertyNode.data.constraints.domain, currentPropertyNode.data.constraints.range
          ];

          common.fillSelectOptions("lineage_relation_filterDomainRangeRoleSelect", roles, null, "label", "id");

          $("#editPredicate_vocabularySelect2").val(Lineage_sources.activeSource);
          PredicatesSelectorWidget.setCurrentVocabClassesSelect(Lineage_sources.activeSource, "editPredicate_objectSelect");
        });
      });



  };


  self.searchClassIndividuals = function() {
    var classId=$("#lineage_relationIndividuals_filterRoleSelect").val();
    if(!classId)
      return alert (" select a class")
    var term = $("#lineage_relationIndividuals_searchTermInput").val();

    var mode = "exactMatch";
    if (term.indexOf("*") > -1) {
      mode = "fuzzyMatch";
      // term=term.replace("*","")
    }
    var options={classFilter: classId,skosLabels:true};
    var indexes=[Lineage_sources.activeSource.toLowerCase()]
    SearchUtil.getElasticSearchMatches([term], indexes, mode, 0, 1000, options, function (err, result) {
      if (err) {
        return alert(err);
      }

      var matches=[]
      result.forEach(function (item, index) {
        if (item.error) {
          return alert(err);
        }
        var hits = item.hits.hits;

        hits.forEach(function(hit) {
          matches.push(hit._source)
        })
      })

      common.fillSelectOptions("lineage_relationIndividuals_matchesSelect",matches,false,"label","id")
    })


  };

  self.addIndividualFilter=function() {
    var classId = $("#lineage_relationIndividuals_filterRoleSelect").val();
    var classIndex = $("#lineage_relationIndividuals_filterRoleSelect")[0].selectedIndex
    var classLabel = $("#lineage_relationIndividuals_filterRoleSelect").text();
    var individual = $("#lineage_relationIndividuals_matchesSelect").val()
    var individualLabel = $("#lineage_relationIndividuals_filterRoleSelect").text();
    //  var message="filter  "+classLabel+" = "+individualLabel


    var role = (classIndex == 0) ? "subject" : "object"
    var message = "?" + role + " = <" + individual + ">  "

    $("#lineage_relationIndividuals_fitlerTA").text(message)


  }



  self.addRangeAndDomainFilter=function(){
    var filter=$("#lineage_relationIndividuals_fitlerTA").text()
    if(filter)
  self.filter="FILTER( "+filter+")"
    else
      self.filter=""
    $("#smallDialogDiv").dialog("close")
   }





  return self;

})()

export default Lineage_relationIndividualsFilter

window.Lineage_relationIndividualsFilter=Lineage_relationIndividualsFilter