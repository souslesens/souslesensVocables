// eslint-disable-next-line no-global-assign
Lineage_relations = (function() {
  var self = {};
  self.showDrawRelationsDialog = function(caller) {
    self.drawRelationCurrentCaller = caller;
    $("#LineagePopup").dialog("open");
    $("#LineagePopup").load("snippets/lineage/relationsDialog.html", function() {
      if (caller == "Graph" || caller == "Tree") {
        $("input[name='lineageRelations_selection'][value='selected']").prop("checked", true);
      }
      else {
        $("input[name='lineageRelations_selection'][value='visible']").prop("checked", true);
      }

      Sparql_OWL.getObjectProperties(Lineage_sources.activeSource, { withGraph: true }, function(err, result) {
        var jstreeData = [];
        var uniqueNodes = {};
        result.forEach(function(item) {
          if (!uniqueNodes[item.g.value]) {
            uniqueNodes[item.g.value] = 1;
            var label = Sparql_common.getSourceFromGraphUri(item.g.value);
            jstreeData.push({
              id: item.g.value,
              text: label,
              parent: "#"
            });
          }
          if (!uniqueNodes[item.property.value]) {
            uniqueNodes[item.property.value] = 1;
            var label = item.propertyLabel ? item.propertyLabel.value : Sparql_common.getLabelFromURI(item.property.value);
            jstreeData.push({
              id: item.property.value,
              text: label,
              parent: item.g.value
            });
          }
        });
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
          withCheckboxes: true
        };
        common.jstree.loadJsTree("lineageRelations_propertiesJstreeDiv", jstreeData, options, function() {
          var sourceNodeId = Config.sources[Lineage_sources.activeSource].graphUri;
          $("#lineageRelations_propertiesJstreeDiv").jstree().check_node(sourceNodeId);
        });
      });
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
        options.data = visjsGraph.data.nodes.getIds();
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
    if (!options.data ) {
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
            Lineage_classes.drawRestrictions(source, data, null, null, options, callbackSeries);
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
            Lineage_classes.drawRestrictions(source, data, null, null, options, callbackSeries);
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
            Lineage_properties.drawPredicatesGraph(source, data, null, options, function(err, result) {
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
            Lineage_properties.drawPredicatesGraph(source, data, null, options, function(err, result) {
              return callbackSeries(err);
            });
          }
          else {
            return callbackSeries();
          }
        }
      ],

      function(err) {
        if (err) {
          return alert(err);
        }
      }
    );
  };

  return self;
})();
