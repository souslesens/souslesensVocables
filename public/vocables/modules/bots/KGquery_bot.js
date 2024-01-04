import botEngine from "./botEngine.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";


var KGquery_bot=(function(){
  var self={}



  self.init = function(source,workflowName,classId, varName,validateFn) {
    self.validateFn=validateFn;
    $("#mainDialogDiv").dialog("open");
    $("#mainDialogDiv").load("modules/tools/lineage/html/queryBuilder.html", function() {


      //  self.doNext(keywordsTree)
      var html = Lineage_queryBuilder.getHtml();
      $("#botDiv").html(html);

      self.start(source,workflowName,classId,varName);


    })
    ;


  };

  self.start=function(source,workflowName,classId,varName){
    Lineage_queryBuilder.currentQuery = { source: source };
    Lineage_queryBuilder.workflowEndCallbackFn =function(err,queryParams){
      self.setSparqlQueryFilter(queryParams,varName)
    }
    Lineage_queryBuilder.currentQuery.currentClass=classId
    Lineage_queryBuilder.currentObj = self[workflowName];

    Lineage_queryBuilder.nextStep( self[workflowName])
  }



  self.workflow_filterClass = {
    "listFilterTypes": {
      "_OR":
        {
          "label": { "promptIndividualsLabel": {} },
          "list": { "listIndividuals": {  } },
          "advanced": { "promptIndividualsAdvandedFilter": {  } },
         "date": { "promptIndividualsAdvandedFilter": {  } },
          "period": { "promptIndividualsAdvandedFilter": {  } }
          // }
        }
    }
  }


self.setSparqlQueryFilter=function(queryParams,varName){

  var individualsFilterType = queryParams.individualsFilterType;
  var individualsFilterValue =queryParams.individualsFilterValue;
  var advancedFilter = queryParams.advancedFilter || "";
  var filterLabel= queryParams.queryText;

  var filter=""
  if (individualsFilterType == "label") {
    filter = Sparql_common.setFilter(varName, null, individualsFilterValue);
  }
  else if (individualsFilterType == "list") {
    filter = Sparql_common.setFilter(varName, individualsFilterValue, null, { useFilterKeyWord: 1 });
  }
  else if (individualsFilterType == "advanced") {
    filter = advancedFilter;
  }

  if (self.validateFn) {
    return self.validateFn(null, {filter:filter,filterLabel:filterLabel});
  }


}






  return self;




})()

export default KGquery_bot;
window.KGquery_bot=KGquery_bot