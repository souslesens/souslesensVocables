Lineage_sources = (function() {


  var self = {};
  self.activeSource = null;
  self.loadedSources = {};


  self.showSourcesDialog = function() {
    SourceBrowser.showSearchableSourcesTreeDialog(
      ["OWL", "SKOS"],
      null,
      function(){
        var source = $("#searchAll_sourcesTree").jstree(true).get_selected()[0];
        $("#sourcesSelectionDialogdiv").dialog("close");
        self.setCurrentSource(source)
    });
  };


  self.setCurrentSource = function( source) {
    if(!source)
      return;

    function highlightSourceDiv(source){
      $(".Lineage_sourceLabelDiv").removeClass("Lineage_selectedSourceDiv");
      $("#Lineage_source_" +    self.loadedSources[source].sourceDivId).addClass("Lineage_selectedSourceDiv");
    }
    self.activeSource=source
    //new source to load
    if (!self.loadedSources[source]){
      self.initSource(source,function(err, sourceDivId){
        if( err)
         return MainController.UI.message(err)
        self.loadedSources[source]={sourceDivId:sourceDivId}
        highlightSourceDiv(source)


    });
    }else {
      self.activeSource = source;
      highlightSourceDiv(source)
    }


  };








  self.initSource = function(source,callback) {
    if (!source || !Config.sources[source]) return;
    var sourceDivId="source_"+common.getRandomHexaId(5)
    self.registerSource(sourceDivId,source);
    Lineage_sources.setTopLevelOntologyFromImports(source);
    Lineage_sources.registerSourceImports(source);
    $("#Lineage_sourceLabelDiv").html(source);



if( false) {
  Lineage_classes.nodesSelection = [];
  Lineage_combine.init();
  Lineage_relations.init(true);

  Lineage_decoration.init();
  Lineage_linkedData.init();
}

  /*    if (!visjsGraph.isGraphNotEmpty() && Config.sources[Lineage_sources.activeSource].editable) {
        var visjsData = { nodes: [], edges: [] };
        self.drawNewGraph(visjsData);
      }*/
   var  drawTopConcepts=true
    if(drawTopConcepts) {
      Lineage_classes.drawTopConcepts(source, function(err) {
        if (err) return MainController.UI.message(err);
      });
    }
    callback(null,sourceDivId)

  }













  self.registerSource = function( sourceDivId,sourceLabel) {
    var html = "<div  id='" + sourceDivId + "' style='color: " + Lineage_classes.getSourceColor(sourceLabel) + "'" + " class='Lineage_sourceLabelDiv' " + ">" + sourceLabel + "</div>";
    $("#lineage_drawnSources").append(html);
    $("#" + sourceDivId).mousedown(function(e) {
      //  e.stopPropagation();
      e.preventDefault();
      if (e.which === 3) {
        var html =
          '    <span  class="popupMenuItem" onclick="Lineage_combine.menuActions.hideSource();"> Hide Source</span>' +
          ' <span  class="popupMenuItem" onclick="Lineage_combine.menuActions.showSource();"> Show Source</span>' +
          ' <span  class="popupMenuItem" onclick="Lineage_combine.menuActions.groupSource();"> Group Source</span>' +
          ' <span  class="popupMenuItem" onclick="Lineage_combine.menuActions.ungroupSource();"> ungroup Source</span>';
        $("#graphPopupDiv").html(html);
        var point = { x: e.pageX, y: e.pageY };
        MainController.UI.showPopup(point, "graphPopupDiv", true);
      } else {

      }
    });

  };

  self.registerSourceImports = function( sourceLabel) {
    self.registerSource(sourceLabel);
    var imports = Config.sources[sourceLabel].imports;
    if (!imports) imports = [];

    imports.forEach(function(/** @type {any} */ source) {
      self.registerSource(source);
    });
  };



  self.showHideCurrentSourceNodes = function(/** @type {any} */ hide) {


    var allNodes = visjsGraph.data.nodes.get();
    var newNodes = [];
    allNodes.forEach(function(node) {
      if (node && node.data && node.data.source == Lineage_sources.activeSource)
        newNodes.push({
          id: node.id,
          hidden: hide
        });
    });
    visjsGraph.data.nodes.update(newNodes);

    if (hide) $("#Lineage_source_" + Lineage_sources.activeSource).addClass("lineage_hiddenSource");
    else $("#Lineage_source_" + Lineage_sources.activeSource).removeClass("lineage_hiddenSource");
  };

  self.setTopLevelOntologyFromImports = function(sourceLabel) {
    Config.currentTopLevelOntology = null;
    if (Config.topLevelOntologies[sourceLabel])
      return Config.currentTopLevelOntology = sourceLabel;
    var imports = Config.sources[sourceLabel].imports;
    if (!imports) return (Config.currentTopLevelOntology = Object.keys(Config.topLevelOntologies)[0]);
    if (!Array.isArray(imports)) imports = [imports];
    var ok = false;

    imports.forEach(function(source) {
      if (!ok && Config.topLevelOntologies[source]) {
        ok = true;
        Config.currentTopLevelOntology = source;
      }
    });
    return Config.currentTopLevelOntology;
  };
  self.setTopLevelOntologyFromPrefix = function(prefix) {
    Config.currentTopLevelOntology = null;
    for (var key in Config.topLevelOntologies) {
      if (Config.topLevelOntologies[key].prefix == prefix) Config.currentTopLevelOntology = key;
    }
    return Config.currentTopLevelOntology;
  };


  return self;

})();