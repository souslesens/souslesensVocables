// eslint-disable-next-line no-global-assign
Lineage_relations = (function() {
  var self = {};
  self.showDrawRelationsDialog = function(caller) {

    self.drawRelationCurrentCaller = caller;
    $("#mainDialogDiv").dialog("open");
    $("#mainDialogDiv").load("snippets/lineage/relationsDialog.html", function() {

      $("#LineageRelations_searchJsTreeInput").keypress(function(e) {
        if (e.which == 13 || e.which == 9) {
          $("#lineageRelations_propertiesJstreeDiv").jstree(true).uncheck_all();
          $("#lineageRelations_propertiesJstreeDiv").jstree(true).settings.checkbox.cascade = "";
          var term = $("#LineageRelations_searchJsTreeInput").val();

          $("#lineageRelations_propertiesJstreeDiv").jstree(true).search(term);
          $("#LineageRelations_searchJsTreeInput").val("");
        }
      });

      common.fillSelectWithColorPalette("lineageRelations_colorsSelect");

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
          if (Config.sources[Lineage_sources.activeSource].imports) {
            vocabularies = vocabularies.concat(Config.sources[Lineage_sources.activeSource].imports);
          }
          vocabularies = vocabularies.concat(Object.keys(Config.ontologiesVocabularyModels));

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
              else if (Config.ontologiesVocabularyModels[vocabulary]) {
                properties = Config.ontologiesVocabularyModels[vocabulary].properties;
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
            // contextMenu: Lineage_query.getPropertiesJstreeMenu(),
            selectTreeNodeFn: Lineage_query.onSelectPropertyTreeNode,
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


  self.onFilterObjectTypeSelect = function(role, type) {
    var valueStr = "";
    if (type == "String") {
      valueStr = " <div class=\"lineageQuery_objectTypeSelect\" id=\"lineageQuery_valueDiv\">\n" +
        "          <select id=\"lineageQuery_operator\"> </select>\n" +
        "          <input id=\"lineageQuery_value\" size=\"20\" value=\"\" />\n" +
        "        </div>";

    }
    domainValue = valueStr;

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

      options.edgesColor = $("#lineageRelations_colorsSelect").val();


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
        if (!visjsGraph.isGraphNotEmpty()) {
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
          filterProp = Sparql_common.setFilter("prop", properties);
        }

        options.filter = filterProp;
        if (self.filter) {
          options.filter += self.filter;
        }
      }
      if (type == "both") {
        type = null;
      }
      if (direction == "both") {
        direction = null;
      }

      self.drawRelations(direction, type, caller, options);
    }
    $("#mainDialogDiv").dialog("close");
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
            if (options.filter) {
              options.filter = options.filter.replace(/subject/g, "value");
            }
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
            if (options.filter) {
              options.filter = options.filter.replace(/subject/g, "value");
            }
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
            if (options.filter) {
              options.filter = options.filter.replace(/value/g, "object");
            }
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
            if (options.filter) {
              options.filter = options.filter.replace(/value/g, "object");
            }
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


  self.registerSourcesModel = function(sources, callback) {

    if (!Array.isArray(sources)) {
      sources = [sources];
    }

    let url = Config.default_sparql_url + "?format=json&query=";


    var queryP = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
      "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
      "PREFIX owl: <http://www.w3.org/2002/07/owl#>";

    async.eachSeries(sources, function(source, callbackEach) {
      var graphUri;
      if (!Config.ontologiesVocabularyModels[source]) {
        graphUri = Config.sources[source].graphUri;
        if (!graphUri) {
          return callback();
        }
        Config.ontologiesVocabularyModels[source] = { graphUri: graphUri };
      }
      graphUri = Config.ontologiesVocabularyModels[source].graphUri;

      Config.ontologiesVocabularyModels[source].constraints = {};//range and domain
      Config.ontologiesVocabularyModels[source].restrictions = {};
      Config.ontologiesVocabularyModels[source].classes = {};
      Config.ontologiesVocabularyModels[source].properties = [];

      var uniqueProperties = {};
      var propsWithoutDomain=[]
      var propsWithoutRange=[]
      async.series([
// set propertie
          function(callbackSeries) {

            var query = queryP + " SELECT distinct ?prop ?propLabel from <" + graphUri + ">  WHERE {\n" +
              "  ?prop ?p ?o optional{?prop rdfs:label ?propLabel} VALUES ?o {rdf:Property owl:ObjectProperty owl:OntologyProperty } }";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {}, function(err, result) {
              if (err) {
                return callbackSeries(err);
              }
              result.results.bindings.forEach(function(item) {
                if (!uniqueProperties[item.prop.value]) {
                  uniqueProperties[item.prop.value] = 1;
                  Config.ontologiesVocabularyModels[source].properties.push({
                    id: item.prop.value,
                    label: (item.propLabel ? item.propLabel.value : Sparql_common.getLabelFromURI(item.prop.value))
                  });
                }
              });

              callbackSeries();
            });
          },
          // set model classes (if source not  declared in sources.json)
          function(callbackSeries) {
            if (Config.sources[source]) {// dont take relations  declared in sources.json
              return callbackSeries();
            }
            var query = queryP + " select distinct ?sub ?subLabel FROM <" + graphUri + "> where{" +
              " ?sub rdf:type ?class. OPTIONAL{ ?sub rdfs:label ?subLabel} VALUES ?Class {owl:Class rdf:class rdfs:Class} }";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {}, function(err, result) {
              if (err) {
                return callbackSeries(err);
              }
              result.results.bindings.forEach(function(item) {
                if(!Config.ontologiesVocabularyModels[source].classes[item.sub.value]) {
                  Config.ontologiesVocabularyModels[source].classes[item.sub.value] = {
                    id: item.sub.value,
                    label: (item.subLabel ? item.subLabel.value : Sparql_common.getLabelFromURI(item.sub.value))
                  };
                }
              });
              callbackSeries();
            });
          }

          //set domain constraints
          , function(callbackSeries) {
            var query = queryP + " select distinct ?prop ?domain FROM <" + graphUri + "> where{" +
              " ?prop rdfs:domain ?domain.OPTIONAL{ ?domain rdfs:label ?domainLabel} }";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {}, function(err, result) {
              if (err) {
                return callbackSeries(err);
              }
              result.results.bindings.forEach(function(item) {
                if (!Config.ontologiesVocabularyModels[source].constraints[item.prop.value]) {
                  Config.ontologiesVocabularyModels[source].constraints[item.prop.value] = { domain: "", range: "", domainLabel: "", rangeLabel: "" };
                }
                Config.ontologiesVocabularyModels[source].constraints[item.prop.value].domain = item.domain.value;
                Config.ontologiesVocabularyModels[source].constraints[item.prop.value].domainLabel = item.domainLabel ? item.domainLabel.value : Sparql_common.getLabelFromURI(item.domain.value);

              });
              callbackSeries();
            });
          }
          //set range constraints
          , function(callbackSeries) {
            var query = queryP + " select distinct ?prop ?range FROM <" + graphUri + "> where{" +
              " ?prop rdfs:range ?range.OPTIONAL{ ?range rdfs:label ?rangeLabel} }";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {}, function(err, result) {
              if (err) {
                return callbackSeries(err);
              }
              result.results.bindings.forEach(function(item) {
                if (!Config.ontologiesVocabularyModels[source].constraints[item.prop.value]) {
                  Config.ontologiesVocabularyModels[source].constraints[item.prop.value] = { domain: "", range: "", domainLabel: "", rangeLabel: "" };
                }
                Config.ontologiesVocabularyModels[source].constraints[item.prop.value].range = item.range.value;
                Config.ontologiesVocabularyModels[source].constraints[item.prop.value].rangeLabel = item.rangeLabel ? item.rangeLabel.value : Sparql_common.getLabelFromURI(item.range.value);

              });
              callbackSeries();
            });
          },

        // set retrictions constraints
          function(callbackSeries) {
            // only relations  declared in sources.json
            if (!Config.sources[source]) {
              return callbackSeries();
            }
            Sparql_OWL.getObjectRestrictions(source, null, { withoutBlankNodes: 1, withoutImports: 1 }, function(err, result) {

              result.forEach(function(item) {
                var propLabel = item.propLabel ? item.propLabel.value : Sparql_common.getLabelFromURI(item.prop.value);
                var domainLabel = item.subjectLabel ? item.subjectLabel.value : Sparql_common.getLabelFromURI(item.subject.value);
                var rangeLabel = item.valueLabel ? item.valueLabel.value : Sparql_common.getLabelFromURI(item.value.value);
                var propLabel = item.propLabel ? item.propLabel.value : Sparql_common.getLabelFromURI(item.prop.value);

                if (!uniqueProperties[item.prop.value]) {
                  uniqueProperties[item.prop.value] = 1;
                  Config.ontologiesVocabularyModels[source].properties.push({
                    id: item.prop.value,
                    label: propLabel
                  });
                }
                Config.ontologiesVocabularyModels[source].restrictions[item.prop.value] = {
                  domain: item.subject.value,
                  range: item.value.value,
                  domainLabel: domainLabel,
                  rangeLabel: rangeLabel
                };



              });

              callbackSeries();
            });
          },


        //set inherited Constraints
        function(callbackSeries) {
          if (!Config.sources[source]) {
            return callbackSeries();
          }
          var constraints = Config.ontologiesVocabularyModels[source].constraints
          Config.ontologiesVocabularyModels[source].properties.forEach(function(prop) {
            if (!constraints[prop.id]) {
              propsWithoutDomain.push(prop.id)
              propsWithoutRange.push(prop.id)
            }
            else {
              if (!constraints[prop.id].domain)
                propsWithoutDomain.push(prop.id)
              if (!constraints[prop.id].range)
                propsWithoutRange.push(prop.id)
            }

          })
          callbackSeries();
        },

          //set inherited domains
          function(callbackSeries) {
        if(propsWithoutDomain.length==0)
          return callbackSeries()
            var props=propsWithoutDomain.concat(propsWithoutRange)
          Sparql_OWL.getPropertiesInheritedConstraints(source,props,{},function(err, propsMap){
            if(err)
              return callbackSeries(err)

            for(var propId in propsMap) {
              var constraint = propsMap[propId]
              if (!Config.ontologiesVocabularyModels[source].constraints[propId])
                Config.ontologiesVocabularyModels[source].constraints[propId] = { domain: "", range: "" }

              if (constraint.domain && !Config.ontologiesVocabularyModels[source].constraints[propId].domain) {
                Config.ontologiesVocabularyModels[source].constraints[propId].domain = constraint.domain
                Config.ontologiesVocabularyModels[source].constraints[propId].domainLabel = constraint.domainLabel
                Config.ontologiesVocabularyModels[source].constraints[propId].domainParentProperty = constraint.parentProp
              }


              if (constraint.range && !Config.ontologiesVocabularyModels[source].constraints[propId].range) {
                Config.ontologiesVocabularyModels[source].constraints[propId].range = constraint.range
                Config.ontologiesVocabularyModels[source].constraints[propId].rangeLabel = constraint.rangeLabel
                Config.ontologiesVocabularyModels[source].constraints[propId].rangeParentProperty = constraint.parentProp
              }


            }

            return callbackSeries()
          })


        }


        ],
        function(err) {
          callbackEach(err);
        });


    }, function(err) {
      if (callback) {
        return callback(err);
      }
    });
  };

  return self;
})
();
