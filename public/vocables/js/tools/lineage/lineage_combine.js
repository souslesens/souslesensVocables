var Lineage_combine = (function() {

  var self = {};
  self.currentSources = [];
  self.showSourcesDialog = function() {
    SourceBrowser.showSearchableSourcesTreeDialog(["OWL", "SKOS"], Lineage_combine.addSelectedSourcesToGraph);


  };

  self.init = function() {
    self.currentSources = [];
    $("#Lineage_combine_actiosDiv").css("display","none")
    $("#Lineage_combine_mergeNodesDialogButton").css("display","none")


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
        self.menuActions.groupSource(source)

        callbackEach();

        //  SourceBrowser.showThesaurusTopConcepts(sourceLabel, { targetDiv: "LineagejsTreeDiv" });
      });
    }, function(err) {
      if (err) return MainController.UI.message(err);
      if(self.currentSources.length>0) {
        $("#GenericTools_searchScope").val("graphSources")
        $("#Lineage_combine_actiosDiv").css("display", "block")
      }
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
    groupSource: function(source) {
      MainController.UI.hidePopup("graphPopupDiv");

     if(!source)
       source=Lineage_common.currentSource;
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

  self.showmergeNodesDialog=function(){
    if(Lineage_classes.nodesSelection.length==0)
      return alert ("no nodes selected")
    $("#mainDialogDiv").load("snippets/lineage/lineagemergeNodesDialog.html",function(){
      common.fillSelectOptions("LineageMerge_targetGraphSelect",[Lineage_classes.mainSource])

      var jstreeData=[];
      var distinctNodes={}
      Lineage_classes.nodesSelection.forEach(function(node){
        if(!distinctNodes[node.data.id]) {
          distinctNodes[node.data.id] = 1
          jstreeData.push({
            id: node.data.id,
            text: node.data.label,
            parent: node.data.source,
            data: node.data
          })
          if (!distinctNodes[node.data.source]) {
            distinctNodes[node.data.source] = 1
            jstreeData.push({
              id: node.data.source,
              text: node.data.source,
              parent: "#",
            })
          }
        }
      })
      var options={
        withCheckboxes:true,openAll:true,
      }
     common.jstree.loadJsTree("LineageMerge_nodesJsTreeDiv",jstreeData,options)


    });


    $("#mainDialogDiv").dialog("open")


  }

  self.mergeNodes=function(){
    var targetGraph=$("#LineageMerge_targetGraphSelect").val()
    var mergeMode=$("#LineageMerge_aggregateModeSelect").val()
    var mergeDepth=$("#LineageMerge_aggregateDepthSelect").val()
    var mergeRestrictions=$("#LineageMerge_aggregateRelationsCBX").prop("checked")

var jstreeNodes= $("#LineageMerge_nodesJsTreeDiv").jstree(true).get_checked(true)

   var  nodesToMerges=[]
    jstreeNodes.forEach(function(node){
      if(node.parent!="#")
        nodesToMerges.push(node)
    })


    var newTriples=[]










      async.series([

        //get node triple
        function(callbackSeries) {
        var objTriples=[];




          return callbackSeries();
        },
        //set descendants triple
        function(callbackSeries) {
          return callbackSeries();
        },

        //set restrictions triple
        function(callbackSeries) {
          return callbackSeries();
        }

      ], function(err) {
        callbackEach(err)
      })

    async.eachSeries(nodesToMerges,function(node,callbackEach) {
    },function(err){

    })

  }

  return self;

})();