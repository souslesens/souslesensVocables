import KGquery from "./KGquery.js";
import SavedQueriesComponent from "../../uiComponents/savedQueriesComponent.js";


var KGquery_myQueries = (function() {

  var self = {};


  self.save = function(callback) {
    var data = {
      querySets: KGquery.querySets
    };
    return callback(null, data);

  };


  self.load = function(err, result) {
    if (err) {
      return alert(err.responseText);
    }
    $("#KGquery_leftPanelTabs").tabs("option","active",1)
    KGquery.clearAll();KGquery.switchRightPanel(true)
    var querySets = result.querySets.sets;

    querySets.forEach(function(set) {
      set.elements.forEach(function(element) {
        var node = element.fromNode;
        KGquery.addNode(node);
        node = element.toNode;
        KGquery.addNode(node);

      });

    });




  };


  return self;


})();

export default KGquery_myQueries;
window.KGquery_myQueries = KGquery_myQueries