// eslint-disable-next-line no-global-assign
Lineage_relations = (function() {
  var self = {};
  self.showDrawRelationsDialog = function(caller) {

    self.drawRelationCurrentCaller = caller;
    $("#LineagePopup").dialog("open");
    $("#LineagePopup").load("snippets/lineage/relationsDialog.html", function() {

      $("#LineageRelations_searchJsTreeInput").keypress(function(e) {
        if (e.which == 13 || e.which == 9) {
          $("#lineageRelations_propertiesJstreeDiv").jstree(true).uncheck_all();
          $("#lineageRelations_propertiesJstreeDiv").jstree(true).settings.checkbox.cascade = "";
          var term = $("#LineageRelations_searchJsTreeInput").val();

          $("#lineageRelations_propertiesJstreeDiv").jstree(true).search(term);
          $("#LineageRelations_searchJsTreeInput").val("");
        }
      });

      var cbxValue;
      if (caller == "Graph" || caller == "Tree") {
        cbxValue = "selected";
      }
      else {
        if (!visjsGraph.data || visjsGraph.data.nodes.get().length == 0) {
          cbxValue = "all";
        }
        else {
          cbxValue = "visible";
        }
      }

      $("input[name='lineageRelations_selection'][value=" + cbxValue + "]").prop("checked", true);

      var jstreeData = [];
      var uniqueNodes = {};


      var vocabulariesPropertiesMap = {};
      async.series([


        function(callbackSeries) {
          var vocabularies = ["usual", Lineage_sources.activeSource];
          if (Config.sources[Lineage_sources.activeSource].imports){
            vocabularies = vocabularies.concat(Config.sources[Lineage_sources.activeSource].imports);
          }
          vocabularies = vocabularies.concat(Object.keys(Config.basicVocabGraphs));

          async.eachSeries(vocabularies, function(vocabulary, callbackEach) {
              if (vocabulary == "usual") {
                return callbackEach();
                var properties = [];
                KGcreator.usualProperties.forEach(function(item) {
                  properties.push({ label: item, id: item });
                });

                vocabulariesPropertiesMap[vocabulary] = properties;
                return callbackEach();
              }
              else if (Config.basicVocabGraphs[vocabulary]) {
                properties = Config.basicVocabGraphs[vocabulary].properties;
                vocabulariesPropertiesMap[vocabulary] = properties;
                return callbackEach();
              }
              else {
                Sparql_OWL.getObjectProperties(vocabulary, { withoutImports: 1 }, function(err, result) {

                  if (err) {
                    callbackEach(err);
                  }
                  result.sort(function(a, b) {
                    if (!a.propertyLabel || !b.propertyLabel) {
                      return 0;
                    }
                    if (a.propertyLabel.value > b.propertyLabel.value) {
                      return 1;
                    }
                    if (a.propertyLabel.value < b.propertyLabel.value) {
                      return -1;
                    }
                    return 0;
                  });
                  var properties = [];
                  result.forEach(function(item) {
                    properties.push(
                      { label: item.propertyLabel.value, id: item.property.value }
                    );
                  });
                  vocabulariesPropertiesMap[vocabulary] = properties;
                  return callbackEach();
                });
              }


            }, function(err) {
              callbackSeries(err);
            }
          );
        },


        function(callbackSeries) {
          for (var vocabulary in vocabulariesPropertiesMap) {
            var properties = vocabulariesPropertiesMap[vocabulary];
            jstreeData.push({
              id: vocabulary,
              text: vocabulary,
              parent: "#"
            });
            properties.forEach(function(item) {
              jstreeData.push({
                id: item.id,
                text: item.label,
                parent: vocabulary,
                data: {
                  id: item.id,
                  label: item.label,
                  source: vocabulary
                }
              });
            });

          }
          callbackSeries();

        },


        function(callbackSeries) {
          jstreeData.sort(function(a, b) {
            if (a.label > b.label) {
              return 1;
            }
            else if (b.label > a.label) {
              return -1;
            }
            return 0;
          });
          var options = {
            withCheckboxes: true,
            searchPlugin: {
              case_insensitive: true,
              fuzzy: false,
              show_only_matches: true
            }
          };
          common.jstree.loadJsTree("lineageRelations_propertiesJstreeDiv", jstreeData, options, function() {

            //  $("#lineageRelations_propertiesJstreeDiv").jstree().check_node(Lineage_sources.activeSource);
          });
        }
      ]);

    });
  };

  self.onshowDrawRelationsDialogValidate = function(action) {
    if (action == "clear") {
      var properties = $("#lineageRelations_propertiesJstreeDiv").jstree().get_checked(true);
      var edges = visjsGraph.data.edges.get();
      var edgesToClear = [];
      edges.forEach(function(edge) {
        if (properties.length > 0) {
          properties.forEach(function(property) {
            if (property.text == edge.label) {
              edgesToClear.push(edge.id);
            }
          });
        }
        else {
          if (edge.label) {
            edgesToClear.push(edge.id);
          }
        }
      });

      visjsGraph.data.edges.remove(edgesToClear);
    }
    else {
      //draw
      var x = $("input[name='lineageRelations_selection']");
      x = x.filter(":checked").val();
      var direction = $("input[name='lineageRelations_relDirection']").filter(":checked").val();
      var type = $("input[name='lineageRelations_relType']").filter(":checked").val();
      var selection = $("input[name='lineageRelations_selection']").filter(":checked").val();
      var options = {};

      var caller = self.drawRelationCurrentCaller;
      if (selection == "selected") {
        if (caller == "Graph") {
          options.data = Lineage_classes.currentGraphNode.data.id;
        }
        else if (caller == "Tree") {
          options.data = Lineage_classes.currentTreeNode.data.id;
        }
      }
      else if (selection == "visible") {
        if (!visjsGraph.isGraphNotEmpty) {
          options.data = null;
        }
        else {
          options.data = visjsGraph.data.nodes.getIds();
        }
      }
      else if (selection == "all") {
        options.data = "allSourceNodes";
      }

      var properties = $("#lineageRelations_propertiesJstreeDiv").jstree().get_checked();

      if (properties.length > 0) {
        // if active source selected take all properties( ==no filter on props)
        var filter = "";
        if (properties.indexOf(Config.sources[Lineage_sources.activeSource].graphUri) < 0) {
          filter = Sparql_common.setFilter("prop", properties);
        }
        options.filter = filter;
      }
      if (type == "both") {
        type = null;
      }
      if (direction == "both") {
        direction = null;
      }

      self.drawRelations(direction, type, caller, options);
    }
    $("#LineagePopup").dialog("close");
  };

  self.drawRelations = function(direction, type, caller, options) {
    if (!options) {
      options = {};
    }

    var source = null;
    var data = null;
    if (!options.data) {
      if (caller == "Graph") {
        data = Lineage_classes.currentGraphNode.data.id;
      }
      else if (caller == "Tree") {
        data = Lineage_classes.currentTreeNode.data.id;
      }
      else if (caller == "both") {
        data = null;
      }
      else if (caller == "leftPanel" || type == "dictionary") {
        data = visjsGraph.data.nodes.getIds();
      }
    }
    else if (options.data == "allSourceNodes") {
      data = null;
    }
    else {
      data = options.data;
    }
// manage drawing at the end off all visjs query
    options.returnVisjsData = true;
    var existingNodes = visjsGraph.getExistingIdsMap();
    var allVisjsData = { nodes: [], edges: [] };

    function concatVisjsdata(visjsData) {
      if (!visjsData.nodes || !visjsData.edges) {
        return;
      }
      visjsData.nodes.forEach(function(item) {
        if (!existingNodes[item.id]) {
          existingNodes[item.id] = 1;
          allVisjsData.nodes.push(item);
        }
      });
      visjsData.edges.forEach(function(item) {
        if (!existingNodes[item.id]) {
          existingNodes[item.id] = 1;
          allVisjsData.edges.push(item);
        }
      });
    }


    var totalTriples = 0;
    async.series(
      [
        // draw equivClasses or sameLabel (coming from Config.dictionarySource)
        function(callbackSeries) {
          if (type != "dictionary") {
            return callbackSeries();
          }
          source = Config.dictionarySource;
          options.includeSources = Config.dictionarySource;

          data = visjsGraph.data.nodes.getIds();
          options.filter = "FILTER (?prop in (owl:sameAs,owl:equivalentClass))";
          Lineage_sources.registerSource(Config.dictionarySource);

          type = null;
          return callbackSeries();
        },

        // draw restrictions normal
        function(callbackSeries) {
          if (type && type != "restrictions") {
            return callbackSeries();
          }
          if (!direction || direction == "direct") {
            options.inverse = false;

            MainController.UI.message("searching restrictions");
            Lineage_classes.drawRestrictions(source, data, null, null, options, function(err, result) {
              if (err) {
                return callbackSeries(err);
              }
              concatVisjsdata(result);
              return callbackSeries();
            });
          }
          else {
            return callbackSeries();
          }
        },
        // draw restrictions inverse
        function(callbackSeries) {
          if (type && type != "restrictions") {
            return callbackSeries();
          }
          if (!direction || direction == "inverse") {
            options.inverse = true;
            MainController.UI.message("searching inverse restrictions");
            Lineage_classes.drawRestrictions(source, data, null, null, options, function(err, result) {
              if (err) {
                return callbackSeries(err);
              }
              concatVisjsdata(result);
              return callbackSeries();
            });
          }
          else {
            return callbackSeries();
          }
        },

        // draw objectProperties direct
        function(callbackSeries) {
          if (type && type == "restrictions") {
            return callbackSeries();
          }

          if (type != "dictionary") {
            source = Lineage_sources.activeSource;
          }

          if (!data) {
            if (options.data != "allSourceNodes") {
              data = Lineage_classes.getGraphIdsFromSource(Lineage_sources.activeSource);
            }
          }
          if (!direction || direction == "direct") {
            MainController.UI.message("searching predicates");
            Lineage_properties.drawPredicatesGraph(source, data, null, options, function(err, result) {
              if (err) {
                return callbackSeries(err);
              }
              concatVisjsdata(result);
              return callbackSeries(err);
            });
          }
          else {
            return callbackSeries();
          }
        },
        // draw objectProperties inverse
        function(callbackSeries) {
          if (type && type == "restrictions") {
            return callbackSeries();
          }
          if (type != "dictionary") {
            source = Lineage_sources.activeSource;
          }

          if (!data) {
            if (options.data != "allSourceNodes") {
              data = Lineage_classes.getGraphIdsFromSource(Lineage_sources.activeSource);
            }
          }
          if (!direction || direction == "inverse") {
            options.inversePredicate = true;
            MainController.UI.message("searching inverse predicates");
            Lineage_properties.drawPredicatesGraph(source, data, null, options, function(err, result) {
              if (err) {
                return callbackSeries(err);
              }
              concatVisjsdata(result);
              return callbackSeries();
            });
          }
          else {
            return callbackSeries();
          }
        }
      ],

      function(err) {
        if (allVisjsData.nodes.length == 0 && allVisjsData.edges.length == 0) {
          return MainController.UI.message("no data found", true);
        }
        MainController.UI.message("drawing " + allVisjsData.nodes.length + "nodes and " + allVisjsData.edges.length + " edges...", true);
        if (visjsGraph.isGraphNotEmpty()) {
          visjsGraph.data.nodes.add(allVisjsData.nodes);
          visjsGraph.data.edges.add(allVisjsData.edges);
        }
        else {
          Lineage_classes.drawNewGraph(allVisjsData);
        }
        if (err) {

          return alert(err);
        }
      }
    );
  };

  return self;
})();
