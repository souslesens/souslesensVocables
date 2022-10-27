Lineage_sources = (function() {


  var self = {};
  self.activeSource = null;
  self.loadedSources = {};
  self.sourceDivsMap = {};
  Lineage_classes.nodesSelection = [];


  self.init = function() {
    if (self.loadedSources) {
      for (var source in self.loadedSources) {
        self.menuActions.closeSource(source);
      }
    }
    self.activeSource = null;
    self.loadedSources = {};
    self.sourceDivsMap = {};
    Lineage_classes.nodesSelection = [];
  };

  self.showSourcesDialog = function() {
    SourceBrowser.showSearchableSourcesTreeDialog(
      ["OWL", "SKOS"],
      null,
      function() {
        var source = $("#searchAll_sourcesTree").jstree(true).get_selected()[0];
        $("#sourcesSelectionDialogdiv").dialog("close");
        self.setCurrentSource(source);
      });
  };


  self.setCurrentSource = function(source) {
    if (!source)
      return;

    function highlightSourceDiv(source) {
      $(".Lineage_sourceLabelDiv").removeClass("Lineage_selectedSourceDiv");
      $("#" + self.loadedSources[source].sourceDivId).addClass("Lineage_selectedSourceDiv");
    }

    self.activeSource = source;
    //new source to load
    if (!self.loadedSources[source]) {
      self.initSource(source, function(err, sourceDivId) {
        if (err)
          return MainController.UI.message(err);

        highlightSourceDiv(source);

        Lineage_classes.initWhiteBoard(false);
        self.initActiveSourceActions();
        self.initWhiteboardActions();
        self.showHideLineageLeftPanels();


      });
    } else {
      self.activeSource = source;
      highlightSourceDiv(source);
      self.whiteboard_ActivateSource(source);
    }


    $("#LineageNodesJsTreeDiv").empty();
    $("#Lineage_propertiesTree").empty();
    self.showHideEditButtons(source);


  };

  self.showHideLineageLeftPanels = function() {
    /*  $("#lineage_actionsWrapper").css("display","flex")
     $("#lineage_actionsWrapper2").css("display","flex")
      $("#lineage_actionsWrapper3").css("display","flex")
      $("#lineage_actionDiv_title_hidden").css("display","flex")*/
    $("#lineage_allActions").css("visibility", "visible");
    if (!Config.currentTopLevelOntology) {
      $("#lineage_legendWrapper").css("display", "block");
      return;
    } else {
      $("#lineage_legendWrapper").css("display", "flex");
    }

  };


  self.showHideEditButtons = function(source) {

    if (!visjsGraph.isGraphNotEmpty())
      return;
    var isNodeEditable = Lineage_sources.isSourceEditable(source);
    if (isNodeEditable) {
      visjsGraph.network.enableEditMode();
      $(".vis-edit-mode").css("display", "block");
    } else {
      visjsGraph.network.disableEditMode();
      $(".vis-edit-mode").css("display", "none");
    }
  };


  self.whiteboard_ActivateSource = function(source) {
    var nodesMapSources = {};
    var nodes = visjsGraph.data.nodes.get();
    var newNodes = [];
    nodes.forEach(function(node) {
      nodesMapSources[node.id] = node.data.source;
      var fontColor = "#343434";
      var opacity = 1.0;
      if (node.data.source != source) {
        opacity = 0.2;
        fontColor = "#ddd";
      }
      // newNodes.push({id:node.id, "color":{"opacity":opacity}})
      newNodes.push({ id: node.id, "color": common.colorToRgba(node.color, opacity), font: { color: fontColor } });

    });
    visjsGraph.data.nodes.update(newNodes);

    var edges = visjsGraph.data.edges.get();
    var newEdges = [];
    edges.forEach(function(edge) {
      var fontColor = "#343434";
      var opacity = 1.0;
      if (nodesMapSources[edge.from] != source) {
        opacity = 0.2;
        fontColor = "#ddd";
      }
      // newNodes.push({id:node.id, "color":{"opacity":opacity}})
      newEdges.push({ id: edge.id, "color": common.colorToRgba(edge.color, opacity), font: { color: fontColor } });

    });
    visjsGraph.data.edges.update(newEdges);

  };


  self.initSource = function(source, callback) {
    if (!source || !Config.sources[source]) return;

    self.registerSource(source);
    Lineage_sources.setTopLevelOntologyFromImports(source);
    Lineage_sources.registerSourceImports(source);
    // $("#Lineage_sourceLabelDiv").html(source);


    if (false) {

      Lineage_combine.init();
      Lineage_relations.init(true);

      Lineage_decoration.init();
      Lineage_linkedData.init();
      Lineage_upperOntologies.getSourcePossiblePredicatesAndObject(self.activeSource);
    }

    /*    if (!visjsGraph.isGraphNotEmpty() && Config.sources[Lineage_sources.activeSource].editable) {
          var visjsData = { nodes: [], edges: [] };
          self.drawNewGraph(visjsData);
        }*/
    var drawTopConcepts = true;
    if (drawTopConcepts) {
      Lineage_classes.drawTopConcepts(source, function(err) {
        if (err) return MainController.UI.message(err);
      });
    }
    callback(null, source);

  };


  self.registerSource = function(sourceLabel) {
    if (self.loadedSources[sourceLabel])
      return;
    var sourceDivId = "source_" + common.getRandomHexaId(5);
    self.loadedSources[sourceLabel] = { sourceDivId: sourceDivId };
    self.sourceDivsMap[sourceDivId] = sourceLabel;
    var html = "<div  id='" + sourceDivId + "' style='color: " + Lineage_classes.getSourceColor(sourceLabel) + "'" + " class='Lineage_sourceLabelDiv' " + ">" +
      sourceLabel + "&nbsp;" +
      "<i class='lineage_sources_menuIcon' onclick='Lineage_sources.showSourceDivPopupMenu(\"" + sourceDivId + "\")'>[-]</i>";
    //  "<input type='image' src='./icons/caret-down.png' onclick='Lineage_sources.showSourceDivPopupMenu(\""+ sourceDivId + "\")'/> </div>";
    $("#lineage_drawnSources").append(html);


    $("#" + sourceDivId).bind("click", function(e) {
      var sourceDivId = $(this).attr("id");
      var source = self.sourceDivsMap[sourceDivId];
      self.setCurrentSource(source);

    });


  };
  self.showSourceDivPopupMenu = function(sourceDivId) {
    var html =
      "    <span  class=\"popupMenuItem\" onclick=\"Lineage_sources.menuActions.closeSource();\"> Close</span>" +
      "    <span  class=\"popupMenuItem\" onclick=\"Lineage_sources.menuActions.hideSource();\"> Hide </span>" +
      " <span  class=\"popupMenuItem\" onclick=\"Lineage_sources.menuActions.showSource();\"> Show </span>" +
      " <span  class=\"popupMenuItem\" onclick=\"Lineage_sources.menuActions.groupSource();\"> Group </span>" +
      " <span  class=\"popupMenuItem\" onclick=\"Lineage_sources.menuActions.ungroupSource();\"> ungroup </span>";
    $("#graphPopupDiv").html(html);
    var e = window.event;
    var point = { x: e.pageX, y: e.pageY };
    //  var point={x:100,y:100}
    MainController.UI.showPopup(point, "graphPopupDiv", true);
    $("#graphPopupDiv").on("mouseleave", function() {
      MainController.UI.hidePopup("graphPopupDiv");
    });
  };

  self.registerSourceImports = function(sourceLabel) {

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


  self.menuActions = {
    closeSource: function(source) {
      if (source)
        self.activeSource = source;
      if (visjsGraph.isGraphNotEmpty) {
        var nodes = visjsGraph.data.nodes.get();
        var nodesToRemove = [];
        nodes.forEach(function(node) {
          if (node.data.source == self.activeSource)
            nodesToRemove.push(node.id);
        });
        visjsGraph.data.nodes.remove(nodesToRemove);
      }
      var sourceDivId = self.loadedSources[self.activeSource].sourceDivId;
      self.loadedSources[self.activeSource] = null;
      $("#" + sourceDivId).remove();


    },
    hideSource: function() {

      MainController.UI.hidePopup("graphPopupDiv");
      Lineage_sources.showHideCurrentSourceNodes(true);
    },
    showSource: function() {
      MainController.UI.hidePopup("graphPopupDiv");
      Lineage_sources.showHideCurrentSourceNodes(false);
    },
    groupSource: function(source) {
      MainController.UI.hidePopup("graphPopupDiv");

      if (!source) source = Lineage_sources.activeSource;
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
      var source = Lineage_sources.activeSource;
      visjsGraph.data.nodes.remove(source);
    }
  };


  self.initActiveSourceActions = function() {
    self.activeSourcesActions = {
      TopClasses: Lineage_classes.drawTopConcepts,
      Expand: Lineage_classes.addChildrenToGraph,
      Parents: Lineage_classes.addNodesAndParentsToGraph,
      Properties: Lineage_classes.drawObjectProperties,
      Relations: Lineage_classes.drawRelations,
      "Inv Relations": Lineage_classes.drawRelations,
      "Equiv Class": Lineage_dictionary.showTSFdictionaryDialog

    };


    var actions = Object.keys(self.activeSourcesActions);
    common.fillSelectOptions("lineage_classes_activeSourceActionSelect", actions, true);

  };

  self.onSelectActiveSourceAction = function(action) {
    var fn = self.activeSourcesActions[action];
    if (fn)
      fn();
    $("#lineage_classes_activeSourceActionSelect").val("");

  };


  self.initWhiteboardActions = function() {
    self.whiteboardActions = {
      "Clear all": Lineage_classes.clearLastAddedNodesAndEdges,
      "Show Last only": Lineage_classes.showLastAddedNodesOnly,
      "Show/Hide individuals": Lineage_classes.showHideIndividuals,
      "Draw similar label nodes": Lineage_combine.getSimilars,
      "Selection": "",
      "  Show": Lineage_classes.selection.listNodesSelection,
      "  Clear": Lineage_classes.selection.clearNodesSelection


    };


    var actions = Object.keys(self.whiteboardActions);
    common.fillSelectOptions("lineage_classes_whiteboardSelect", actions, true);

  };

  self.onSelectWhiteboardAction = function(action) {
    var fn = self.whiteboardActions[action];
    if (fn)
      fn();
    $("#lineage_classes_whiteboardSelect").val("");

  };


  self.isSourceEditable = function(source) {
    const groups = authentication.currentUser.groupes;
    const currentAccessControls = groups.map((group) => {
      const defaultAccessControl = Config.profiles[group].defaultSourceAccessControl;
      const sourcesAccessControl = Config.profiles[group].sourcesAccessControl;
      return sourcesAccessControl.hasOwnProperty(source) ? sourcesAccessControl[source] : defaultAccessControl;
    });

    self.realAccessControl = currentAccessControls.includes("readwrite") ? "readwrite" : currentAccessControls.includes("read") ? "read" : "forbidden";

    if (self.realAccessControl === "readwrite" && Config.sources[source].editable > -1) {
      return true;
    } else
      return false;
  };


  return self;

})();