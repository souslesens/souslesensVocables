var Lineage_combine = (function() {

  var self = {};
  self.currentSources = [];
  self.showSourcesDialog = function() {
    SourceBrowser.showSearchableSourcesTreeDialog(["OWL", "SKOS"], Lineage_combine.addSelectedSourcesToGraph);


  };

  self.init = function() {
    self.currentSources = [];
  };

  self.addSelectedSourcesToGraph = function() {
    $("#sourcesSelectionDialogdiv").dialog("close");

    var term = $("#GenericTools_searchAllSourcesTermInput").val();
    var selectedSources = [];
    if ($("#searchAll_sourcesTree").jstree(true)) {
      selectedSources = $("#searchAll_sourcesTree").jstree(true).get_checked();
    }
    if (selectedSources.length == 0)
      return;

    async.eachSeries(selectedSources, function(source, callbackEach) {
      if (!Config.sources[source])
        callbackEach();
      Lineage_classes.registerSource(source);
      self.currentSources.push(source);
      Lineage_classes.drawTopConcepts(source, function(err) {
        if (err) return callbackEach();

        callbackEach();

        //  SourceBrowser.showThesaurusTopConcepts(sourceLabel, { targetDiv: "LineagejsTreeDiv" });
      });
    }, function(err) {
      if (err) return MainController.UI.message(err);
      $("#GenericTools_searchScope").val("graphSources")
    });


  };

  self.setGraphPopupMenus = function() {
    var html =
      "    <span  class=\"popupMenuItem\" onclick=\"Lineage_combine.menuActions.hideSource();\"> Hide Source</span>" +
      " <span  class=\"popupMenuItem\" onclick=\"Lineage_combine.menuActions.showSource();\"> Show Source</span>" +
      " <span  class=\"popupMenuItem\" onclick=\"Lineage_combine.menuActions.groupSource();\"> Group Source</span>" +
      " <span  class=\"popupMenuItem\" onclick=\"Lineage_combine.menuActions.ungroupSource();\"> ungroup Source</span>";
    $("#graphPopupDiv").html(html);
  };

  self.menuActions = {
    hideSource: function() {
      MainController.UI.hidePopup("graphPopupDiv");
      Lineage_classes.showHideCurrentSourceNodes(true);
    },
    showSource: function() {
      MainController.UI.hidePopup("graphPopupDiv");
      Lineage_classes.showHideCurrentSourceNodes(false);
    }
    ,
    groupSource: function() {
      MainController.UI.hidePopup("graphPopupDiv");

      var source = Lineage_common.currentSource;
      var color = Lineage_classes.getSourceColor(source);
      var visjsData = { nodes: [], edges: [] };
      var existingNodes = visjsGraph.getExistingIdsMap();

      for (var nodeId in existingNodes) {
        var node = visjsGraph.data.nodes.get(nodeId);
        if (node && node.id != source && node.data && node.data.source == source) {
          var edgeId = nodeId + "_" + source;
          if (!existingNodes[edgeId]) {
            existingNodes[nodeId] = 1;
            var edge = {
              id: edgeId,
              from: nodeId,
              to: source,
              arrows: " middle",
              color: color,
              width: 1
            };
            visjsData.edges.push(edge);
          }
        }
      }
      if (!existingNodes[source]) {
        existingNodes[source] = 1;
        var sourceNode = {
          id: source,
          label: source,
          shadow: Lineage_classes.nodeShadow,
          shape: "box",
          level: 1,
          size: Lineage_classes.defaultShapeSize,
          data: { source: source },
          color: color
        };
        visjsData.nodes.push(sourceNode);
      }
      visjsGraph.data.nodes.update(visjsData.nodes);
      visjsGraph.data.edges.update(visjsData.edges);

    },
    ungroupSource: function() {
      MainController.UI.hidePopup("graphPopupDiv");
      var source = Lineage_common.currentSource;
      visjsGraph.data.nodes.remove(source);
    }


  };

  self.getSimilars = function(output) {
    /* var source = Lineage_common.currentSource;
     var color=Lineage_classes.getSourceColor(source)*/

    var commonNodes = [];
    var existingNodes = visjsGraph.getExistingIdsMap();
    var nodes = visjsGraph.data.nodes.get();
    nodes.forEach(function(node1) {
      if (!node1.data)
        return;
      nodes.forEach(function(node2) {
        if (!node2.data)
          return;
        if (node1.data.id == node2.data.id)
          return;
        if (node1.data.label == node2.data.label)
          commonNodes.push({ fromNode: node1, toNode: node2 });

      });
    });

    if (output == "graph") {
      var visjsData = { nodes: [], edges: [] };
      commonNodes.forEach(function(item) {
        var edgeId = item.fromNode.id + "_" + item.toNode.id;
        if (!existingNodes[edgeId]) {
          existingNodes[edgeId] = 1;
          visjsData.edges.push({
            id: edgeId,
            from: item.fromNode.id,
            to: item.toNode.id,
            length: 50,
            width: 3,
            color: "#ccc"
          });

        }

      });
      visjsGraph.data.edges.update(visjsData.edges);
    }
  };

  self.showAggregateNodesDialog=function(){
    $("#mainDialogDiv").load("snippets/lineage/lineageAggregateNodesDialog.html",function(){
      common.fillSelectOptions("LineageAggregate_targetGraphSelect",self.currentSources)
    });


    $("#mainDialogDiv").dialog("open")


  }

  self.aggregateNodes=function(){

  }

  return self;

})();