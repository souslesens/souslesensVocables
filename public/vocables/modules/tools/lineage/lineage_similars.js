import SourceSelectorWidget from "../../uiWidgets/sourceSelectorWidget.js";

var Lineage_similars = (function() {
  var self = {};

  self.showDialog = function() {
    $("#mainDialogDiv").dialog("open");
    $("#mainDialogDiv").load("snippets/lineage/lineageSimilarsDialog.html");
  };

  self.onChangeSelection = function(value) {
    if (value == "chooseSource") {
      self.showSourcesTree();
    }
    else {
      $("#lineageSimilars_sourcesTreeDiv").html("");
    }
  };

  self.showSourcesTree = function() {
    var options = {
      withCheckboxes:false
    };

    SourceSelectorWidget.initWidget(["OWL"], "lineageSimilars_sourcesTreeDiv", false, Lineage_similars.onSourceSelected, Lineage_similars.onValidateSources, options);


  };


  self.onSourceSelected = function(evt,obj) {
    var source=obj.node

    self.drawSimilars(source)
  };
  self.onValidateSources =function(){
  };


  self.drawSimilars = function() {
    //Lineage_combine.getSimilars('graph')
  };

  return self;
})();

export default Lineage_similars;
window.Lineage_similars = Lineage_similars;
