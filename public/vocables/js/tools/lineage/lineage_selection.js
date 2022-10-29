var Lineage_selection = (function() {

    var self = {};
    self.selectedNodes = [];


    self.addNodeToSelection = function(node) {
      Lineage_selection.selectedNodes.push(node);
      $("#Lineageclasses_selectedNodesCount").html(Lineage_selection.selectedNodes.length);
      visjsGraph.data.nodes.update({ id: node.data.id, borderWidth: 6 });
      $("#Lineage_combine_mergeNodesDialogButton").css("display", "block");
    };
    
    self.clearNodesSelection = function(ids) {
      if (ids && !Array.isArray(ids)) ids = [ids];
      var newNodes = [];
      var newSelection = [];
     Lineage_selection.selectedNodes.forEach(function(node) {
        if (!ids || ids.indexOf(node.data.id) > -1) newNodes.push({ id: node.data.id, borderWidth: 1 });
        if (ids && ids.indexOf(node.data.id) < 0) newSelection.push(node);
      });
      visjsGraph.data.nodes.update(newNodes);
     Lineage_selection.selectedNodes = newSelection;
      $("#Lineageclasses_selectedNodesCount").html(Lineage_selection.selectedNodes.length);
      $("#Lineage_combine_mergeNodesDialogButton").css("display", "none");
    }
    ;
    self.getSelectedNodesTre = function() {
      var jstreeData = [];
      var distinctNodes = {};
     Lineage_selection.selectedNodes.forEach(function(node) {
        if (!distinctNodes[node.data.id]) {
          distinctNodes[node.data.id] = 1;
          jstreeData.push({
            id: node.data.id,
            text: node.data.label,
            parent: node.data.source,
            data: node.data
          });
          if (!distinctNodes[node.data.source]) {
            distinctNodes[node.data.source] = 1;
            jstreeData.push({
              id: node.data.source,
              text: node.data.source,
              parent: "#"
            });
          }
        }
      });
      return jstreeData;
    };

    self.listNodesSelection = function() {
      if (Lineage_selection.selectedNodes.length == 0) alert("no node selection");
      var jstreeData =Lineage_selection.getSelectedNodesTree();
      var options = {
        openAll: true,
        withCheckboxes: true,
        selectTreeNodeFn:Lineage_selection.onSelectedNodeTreeclick
      };
      $("#mainDialogDiv").load("./snippets/lineageSelectionDialog.html", function(){

      })
    /*  $("#mainDialogDiv").html(
        "<div style=\"display: flex;flex-direction: row\">" +
        " <div>" +
        "    Selected nodes " +

        " <div class=\"jstreeContainer\" style=\"width: 350px;height: 700px;overflow: auto\">" +
        "      <div id=\"LineageClasses_selectdNodesTreeDiv\"></div>" +
        "    </div>" +
        " </div>" +
        "<div id=\"LineageClasses_selectdNodesInfosDiv\" style=\"width: 650px;height: 700px;overflow: auto\" ></div>" +
        "</div>"
      );*/
      $("#mainDialogDiv").dialog("open");
      common.jstree.loadJsTree("LineageClasses_selectdNodesTreeDiv", jstreeData, options, function(err, result) {
      });
    };

    self.selectNodesOnHover = function(node, point, options) {
      if (options.ctrlKey && options.altKey) {
        Lineage_selection.addNodeToSelection(node);
      } else if (options.ctrlKey && options.shiftKey) {
        Lineage_selection.clearNodesSelection(node.data.id);
      }
    };

    self.onSelectedNodeTreeclick = function(event, obj) {
      var node = obj.node;
      if (node.parent == "#") return;
      SourceBrowser.showNodeInfos(node.data.source, node, "LineageClasses_selectdNodesInfosDiv");
    };

    self.onSelectionExecuteAction=function(action){







    }


    return self;
  }

)();