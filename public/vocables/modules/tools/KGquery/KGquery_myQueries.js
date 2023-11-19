import KGquery from "./KGquery.js";
import SavedQueriesComponent from "../../uiComponents/savedQueriesComponent.js";


var KGquery_myQueries=(function(){

  var self={}


  self.save=function(callback) {
    var data = {
      querySets: KGquery.querySets,
    }
    return callback(null, data)

  }


  self.load=function(err, result){
if(err)
  return alert(err.responseText)

    var queryData=result;




  }









  return self;



})()

export default KGquery_myQueries;
window.KGquery_myQueries=KGquery_myQueries