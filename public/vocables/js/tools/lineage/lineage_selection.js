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
  };
  self.getSelectedNodesTree = function() {
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

  self.listNodesSelection = function(allGraphNodes) {
    if (allGraphNodes) Lineage_selection.selectedNodes = visjsGraph.data.nodes.get();

    if (Lineage_selection.selectedNodes.length == 0) Lineage_selection.selectedNodes = visjsGraph.data.nodes.get();
    var jstreeData = Lineage_selection.getSelectedNodesTree();
    var options = {
      openAll: true,
      withCheckboxes: true,
      tie_selection: false,
      selectTreeNodeFn: Lineage_selection.onSelectedNodeTreeclick
    };
    $("#mainDialogDiv").load("snippets/lineage/selection/lineageSelectionDialog.html", function() {
      $("#mainDialogDiv").dialog("open");
      common.jstree.loadJsTree("lineage_selection_selectedNodesTreeDiv", jstreeData, options, function(err, result) {
      });
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
    SourceBrowser.showNodeInfos(node.data.source, node, "lineage_selection_rightPanel");
  };

  self.onSelectionExecuteAction = function(action) {
    var jstreeNodes = $("#lineage_selection_selectedNodesTreeDiv").jstree(true).get_checked(true);
    if (jstreeNodes.length == 0) return alert("check nodes to process");

    if (action == "mergeInto") {
      self.mergeNodes.showDialog();
    } else if (action == "decorate") {
      self.decorate.showDialog();
    } else if (action == "container") {
      self.container.showDialog();
    } else if (action == "modifyPredicates") {
      self.modifyPredicates.showDialog();
    } else if (action == "deleteSelection") {
      self.modifyPredicates.deleteSelection();
    } else if (action == "exportCsv") {
    } else if (action == "getPaths") {
      self.modifyPredicates.getPaths();
    }


  };

  self.mergeNodes = {
    showDialog: function() {
      $("#lineage_selection_rightPanel").load("snippets/lineage/selection/lineage_selection_mergeNodesDialog.html", function() {
        var sources = [];
        for (var key in Config.sources) {
          if (Config.sources[key].editable) sources.push(key);
        }
        sources.sort();
        common.fillSelectOptions("LineageMerge_targetSourceSelect", sources, null);
      });
    },
    mergeNodesUI: function() {
      var targetNode = null;
      var targetSource = $("#LineageMerge_targetSourceSelect").val();
      var mergeMode = $("#LineageMerge_aggregateModeSelect").val();
      var mergeDepth = $("#LineageMerge_aggregateDepthSelect").val();
      var mergeRestrictions = $("#LineageMerge_aggregateRelationsCBX").prop("checked");
      var targetNode = $("#LineageMerge_targetNodeUriSelect").val();
      var mergedNodesType = $("#LineageMerge_mergedNodesTypeSelect").val();
      var jstreeNodes = $("#lineage_selection_selectedNodesTreeDiv").jstree(true).get_checked(true);

      if (!mergedNodesType) if (!confirm("confirm that no Type is added to merged nodes")) return;

      self.mergeNodes.mergeNodes(jstreeNodes, mergeMode, mergeDepth, mergeRestrictions, mergedNodesType, targetSource, targetNode);
    },

    mergeNodes: function(jstreeNodes, mergeMode, mergeDepth, mergeRestrictions, mergedNodesType, targetSource, targetNode, callback) {
      var maxDepth = 10;

      var newUriPrefix = Config.sources[targetSource].graphUri;
      if (!newUriPrefix) newUriPrefix = prompt("enter new uri prefix");
      if (!newUriPrefix) return;
      var nodesToMerge = {};
      var descendantsMap = {};
      var newTriples = [];
      var message = "";
      jstreeNodes.forEach(function(node) {
        if (node.parent == "#") return;
        if (!nodesToMerge[node.parent]) nodesToMerge[node.parent] = {};
        nodesToMerge[node.parent][node.data.id] = [];
      });

      var sources = Object.keys(nodesToMerge);

      async.eachSeries(sources, function(source, callbackEachSource) {
        var nodesToCopyMap = {};
        var selectedNodeIds = Object.keys(nodesToMerge[source]);
        var sourceGraphUri = Config.sources[source].graphUri;
        var targetGraphUri = Config.sources[targetSource].graphUri;
        var editable = Config.sources[targetSource].editable;
        if (!targetGraphUri || !editable) alert("targetSource must have  graphUri and must be editable");
        callbackEachSource();

        var sourceMessage = "";

        async.eachSeries(
          selectedNodeIds,
          function(selectedNodeId, callbackEachNodeToMerge) {
            var nodesToCopy = [selectedNodeId];
            async.series(
              [
                //getNodes descendants by depth and add them to ids
                function(callbackSeries) {
                  if (mergeDepth == "nodeOnly") {
                    return callbackSeries();
                  } else {
                    var depth;
                    if (mergeDepth == "nodeAndDirectChildren") depth = 1;
                    else depth = maxDepth;
                    Sparql_generic.getNodeChildren(source, null, selectedNodeId, depth, { selectGraph: false }, function(err, result) {
                      if (err) return callbackSeries(err);

                      result.forEach(function(item, index) {
                        for (var i = 1; i <= maxDepth; i++) {
                          if (item["child" + i]) {
                            var parent;
                            if (i == 1) {
                              var parent = item.concept.value;
                              if (mergeDepth == "nodeDescendantsOnly") parent = targetNode;
                              item["child" + i].parent = parent;
                            } else item["child" + i].parent = item["child" + (i - 1)].value;

                            descendantsMap[item["child" + i].value] = item["child" + i];
                          }
                        }
                      });

                      var descendantIds = Object.keys(descendantsMap);
                      nodesToCopy = nodesToCopy.concat(descendantIds);
                      return callbackSeries();
                    });
                  }
                },

                //set nodesMap for change URI later
                function(callbackSeries) {
                  nodesToCopy.forEach(function(nodeId) {
                    nodesToCopyMap[nodeId] = {};
                  });

                  return callbackSeries();
                },

                //create hierarchy if needed (when targetNode  and mergedNodesType)
                function(callbackSeries) {
                  if (!targetNode) return callbackSeries();

                  var mergedNodesParentProperty = null;
                  if (mergedNodesType == "owl:NamedIndividual") mergedNodesParentProperty = "rdf:type";
                  else if (mergedNodesType == "owl:Class") mergedNodesParentProperty = "rdfs:subClassOf";
                  else return callbackSeries();

                  if (mergeDepth != "nodeDescendantsOnly") {
                    newTriples.push({
                      subject: selectedNodeId,
                      predicate: "rdf:type",
                      object: mergedNodesType
                    });

                    newTriples.push({
                      subject: selectedNodeId,
                      predicate: mergedNodesParentProperty,
                      object: targetNode
                    });
                  }

                  var descendantIds = Object.keys(descendantsMap);
                  descendantIds.forEach(function(item) {
                    newTriples.push({
                      subject: item,
                      predicate: "rdf:type",
                      object: mergedNodesType
                    });
                    newTriples.push({
                      subject: item,
                      predicate: mergedNodesParentProperty,
                      object: descendantsMap[item].parent
                    });
                  });

                  callbackSeries();
                },

                //get all node ids subject triple including descendants
                function(callbackSeries) {
                  Sparql_OWL.getAllTriples(source, "subject", nodesToCopy, { removeBlankNodesObjects: true }, function(err, result) {
                    if (err) return callbackSeries(err);
                    result.forEach(function(item) {
                      if (nodesToMerge[source][selectedNodeId]) nodesToMerge[source][selectedNodeId].push(item);
                    });
                    callbackSeries();
                  });
                }
              ],
              function(err) {
                callbackEachNodeToMerge();
              }
            );
          },
          // end for each node to merge

          function(err) {
            async.series(
              [
                //get restrictions triple including descendants
                function(callbackSeries) {
                  if (!mergeRestrictions) return callbackSeries();

                  var ids = Object.keys(nodesToMerge[source]);

                  var fromStr = sourceGraphUri ? " FROM " + sourceGraphUri : "";
                  var filterStr = Sparql_common.setFilter("class", ids);
                  var query =
                    "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
                    "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>";
                  query +=
                    "SELECT   ?s ?p ?o from <http://data.total.com/resource/tsf/ontology/gaia-test/> WHERE {?s ?p ?o." +
                    "filter (exists {?class rdfs:subClassOf ?s.  ?s rdf:type owl:Restriction." +
                    filterStr +
                    "})} LIMIT 10000";
                  var sparql_url = Config.sources[source].sparql_server.url;
                  if ((sparql_url = "_default")) sparql_url = Config.default_sparql_url;
                  var url = sparql_url + "?format=json&query=";
                  Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function(err, result) {
                    if (err) return callbackSeries(err);

                    result.results.bindings.forEach(function(item) {
                      var value = item.o.value;
                      if (item.o.datatype == "http://www.w3.org/2001/XMLSchema#dateTime") value += "^^xsd:dateTime";
                      if (item.o.type == "literal") value = common.formatStringForTriple(value);

                      newTriples.push({
                        subject: item.s.value,
                        predicate: item.p.value,
                        object: value
                      });
                    });
                    return callbackSeries();
                  });
                },

                //create news uris
                function(callbackSeries) {
                  if (mergeMode == "keepUri") return callbackSeries();

                  function getNewUri(uri) {
                    var p = Math.max(uri.lastIndexOf("/"), uri.lastIndexOf("#"));
                    if (p < 0) return callbackSeries("cannot process  uri " + uri);
                    var id = uri.substring(p + 1);
                    return newUriPrefix + id;
                  }

                  newTriples.forEach(function(triple) {
                    if (nodesToCopyMap[triple.subject]) {
                      triple.subject = getNewUri(triple.subject);
                    }
                    if (nodesToCopyMap[triple.object]) {
                      triple.subject = getNewUri(triple.object);
                    }
                  });
                  callbackSeries();
                },

                //create newTriples
                function(callbackSeries) {
                  return callbackSeries();
                  if (true) {
                    nodesToMerge[source][selectedNodeId].forEach(function(item) {
                      var value = item.object.value;
                      if (item.object.datatype == "http://www.w3.org/2001/XMLSchema#dateTime") value += "^^xsd:dateTime";
                      if (item.object.type == "literal") value = common.formatStringForTriple(value);

                      newTriples.push({
                        subject: item.subject.value,
                        predicate: item.predicate.value,
                        object: value
                      });
                    });

                    // return callbackSeries();
                    Sparql_generic.insertTriples(targetSource, newTriples, {}, function(err, result) {
                      if (err) return callbackSeries(err);
                      sourceMessage = result + " inserted from source " + source + "  to source " + targetSource;

                      message += sourceMessage + "\n";
                      return callbackSeries();
                    });
                  }
                }
              ],
              function(err) {
                if (err) return callbackEachNodeToMerge(err);
                return callbackEachSource();
                MainController.UI.message(sourceMessage + " indexing data ...  ");
                SearchUtil.generateElasticIndex(targetSource, { ids: nodesToCopy }, function(err, _result) {
                  MainController.UI.message("DONE " + source, true);
                  callbackEachNodeToMerge();
                });
              },
              function(err) {
                callbackEachSource(err);
              }
            );
          },
          function(err) {
            if (callback) return callback(err, sourceMessage);
            if (err) return alert(err.responseText);
            alert(message);
            return MainController.UI.message("ALL DONE", true);
          }
        );
      });
    }
  };

  self.decorate = {
    showDialog: function() {
      $("#lineage_selection_rightPanel").load("snippets/lineage/selection/lineage_selection_decorateDialog.html", function() {
        var colors = common.paletteIntense;
        var array = [];
        colors.forEach(function(color) {
          array.push();
        });
        common.fillSelectOptions("lineage_selection_decorate_colorSelect", colors, true);

        $("#lineage_selection_decorate_colorSelect option").each(function() {
          $(this).css("background-color", $(this).val());
        });

        var shapes = ["ellipse", " circle", " database", " box", " text", "diamond", " dot", " star", " triangle", " triangleDown", " hexagon", " square"];
        common.fillSelectOptions("lineage_selection_decorate_shapeSelect", shapes, true);
      });
    },

    decorate: function() {
      var jstreeNodes = $("#lineage_selection_selectedNodesTreeDiv").jstree(true).get_checked(true);

      var newIds = [];

      var color = $("#lineage_selection_decorate_colorSelect").val();
      var shape = $("#lineage_selection_decorate_shapeSelect").val();
      var size = $("#lineage_selection_decorate_sizeInput").val();
      jstreeNodes.forEach(function(node) {
        if (!node.data) return;
        var obj = { id: node.id };
        if (color) obj.color = color;
        if (shape) obj.shape = shape;
        if (size) obj.size = size;
        newIds.push(obj);
      });

      $("#mainDialogDiv").dialog("close");
      visjsGraph.data.nodes.update(newIds);
    }
  };

  self.container = {
    showDialog: function() {
      $("#lineage_selection_rightPanel").load("snippets/lineage/selection/lineage_selection_containerDialog.html", function() {
        var filter = " ?concept rdf:type <http://www.w3.org/1999/02/22-rdf-syntax-ns#Bag>";
        Sparql_generic.getItems(
          Lineage_sources.activeSource,
          {
            filter: filter,
            distinct: "?concept ?conceptLabel"
          },
          function(err, result) {
            if (err) return alert(err.responseText);
            var containers = [];
            result.forEach(function(item) {
              containers.push({ id: item.concept.value, label: item.conceptLabel.value });
            });
            common.fillSelectOptions("lineage_selection_container_containersSelect", containers, true, "label", "id");
          }
        );
      });
    },

    newContainer: function() {
      var containerName = prompt("New container name");
      if (!containerName) return;
      self.container.isNew = 1;
      var containerUri = Config.sources[Lineage_sources.activeSource].graphUri + common.formatStringForTriple(containerName, true);
      $("#lineage_selection_container_containersSelect").append("<option selected='selected'  value='" + containerUri + "'>" + containerName + "</option>");
    },
    apply: function() {
      var jstreeNodes = $("#lineage_selection_selectedNodesTreeDiv").jstree(true).get_checked(true);
      var containerUri = $("#lineage_selection_container_containersSelect").val();
      var containerName = $("#lineage_selection_container_containersSelect option:selected").text();

      var isNew = $(" #lineage_selection_container_containersSelect option:selected").prop("isNew");
      var isNew2 = $(" #lineage_selection_container_containersSelect option:selected ").attr("isNew");
      var triples = [];

      if (self.container.isNew) {
        self.container.isNew = false;
        triples.push({
          subject: "<" + containerUri + ">",
          predicate: " rdf:type",
          object: "<http://www.w3.org/1999/02/22-rdf-syntax-ns#Bag>"
        });
        triples.push({
          subject: containerUri,
          predicate: " rdfs:label",
          object: containerName
        });
      }

      var otherSourcesNodes = [];
      jstreeNodes.forEach(function(node) {
        if (!node.data) return;
        if (node.data.source == Lineage_sources.activeSource) {
          triples.push({
            subject: "<" + containerUri + ">",
            predicate: "<http://www.w3.org/2000/01/rdf-schema#member>",
            object: "<" + node.data.id + ">"
          });
        } else {
          otherSourcesNodes.push(node.id);
        }
      });

      var str = "";
      if (otherSourcesNodes.length != 0) str = " ! otherSourcesNodes.length not belonging to active source will be ignored";
      if (!confirm("Add selected nodes to container " + containerName + str)) return;

      Sparql_generic.insertTriples(Lineage_sources.activeSource, triples, null, function(err, result) {
        if (err) return alert(err.responseText);
        MainController.UI.message("nodes added to container " + containerName);
      });
    }
  };

  self.modifyPredicates = {
    showDialog: function() {
      $("#lineage_selection_rightPanel").load("snippets/lineage/selection/lineage_selection_modifyPredicates.html", function() {
        KGcreator.getSourcePropertiesAndObjectLists(Lineage_sources.activeSource, Config.currentTopLevelOntology, function(err, result) {
          if (err) return alert(err.responseText);
          common.fillSelectOptions("lineage_selection_modifyPredicate_propertySelect", result.predicates, true, "label", "id");
          common.fillSelectOptions("lineage_selection_modifyPredicate_objectSelect", result.objectClasses, true, "label", "id");
        });
      });
    },

    addPredicate: function() {
      var property = $("#lineage_selection_modifyPredicate_propertySelect").val();
      var object = $("#lineage_selection_modifyPredicate_objectValue").val();
      if (!property || !object) return alert("enter predicate property and object");

      var jstreeNodes = $("#lineage_selection_selectedNodesTreeDiv").jstree(true).get_checked(true);

      var triples = [];
      var otherSourcesNodes = [];
      jstreeNodes.forEach(function(node) {
        if (!node.data) return;
        if (node.data.source == Lineage_sources.activeSource) {
          triples.push({
            subject: "<" + node.data.id + ">",
            predicate: "<" + property + ">",
            object: object
          });
        } else {
          otherSourcesNodes.push(node.data.id);
        }
      });

      var str = "";
      if (otherSourcesNodes.length != 0) str = " ! otherSourcesNodes.length not belonging to active source will be ignored";
      if (!confirm("create new predicate for selected nodes (" + jstreeNodes.length + ")" + str)) return;

      Sparql_generic.insertTriples(Lineage_sources.activeSource, triples, null, function(err, result) {
        if (err) return alert(err.responseText);
        MainController.UI.message("predicate added to container " + containerName);
      });
    },
    deletePredicate: function() {
      var property = $("#lineage_selection_modifyPredicate_propertySelect").val();
      var object = $("#lineage_selection_modifyPredicate_objectValue").val();
      if (!property && !object) return alert("enter predicate property and/or object");

      var nodeIds = $("#lineage_selection_selectedNodesTreeDiv").jstree(true).get_checked();
      if (!confirm("delete predicate on  selection")) if (!confirm("Are you sure ?")) return;

      Sparql_generic.deleteTriples(Lineage_sources.activeSource, nodeIds, property, object, function(err, result) {
        return alert(err.responseText);
        MainController.UI.message(nodeIds.length + " nodes deleted  ");
      });
    },

    deleteSelection: function() {
      var nodeIds = $("#lineage_selection_selectedNodesTreeDiv").jstree(true).get_checked();
      if (!confirm("delete node selection")) if (!confirm("Are you sure you want to delete " + jstreeNodes.length + " nodes")) return;

      Sparql_generic.deleteTriples(Lineage_sources.activeSource, nodeIds, null, null, function(err, result) {
        if (err) return alert(err.responseText);
        Sparql_generic.deleteTriples(Lineage_sources.activeSource, null, null, nodeIds, function(err, result) {
          if (err) return alert(err.responseText);
          MainController.UI.message(nodeIds.length + " nodes deleted  ");
        });
      });
    },

    getPaths: function() {
      var nodeIds = $("#lineage_selection_selectedNodesTreeDiv").jstree(true).get_checked();
      if (nodeIds.length < 2)
        return alert("select at least two nodes");
      var fromNodeId = nodeIds[0];
      var toNodeId = nodeIds[nodeIds.length - 1];
    GraphTraversal.drawShortestpath(Lineage_sources.activeSource,fromNodeId,toNodeId)


    }
  };

  return self;
})();
