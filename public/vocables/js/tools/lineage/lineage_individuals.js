var Lineage_individuals = (function() {
    var self = {};
    self.currentFilters = [];
    self.dataSources = {};


    self.init = function() {
      self.currentFilters = [];
      $("#LineageIndividualsTab").load("snippets/lineage/lineageIndividualsSearchDialog.html", function() {
        $("#LineageIndividualsQueryParams_dataSourcesSelect").children().remove().end();
        $("#LineageIndividualsQueryParams_filterPanel").css("display", "none");
        self.dataSources = Config.sources[Lineage_classes.mainSource].dataSources;
        if (!self.dataSources) {
          $("#LineageIndividualsQueryParams_showIndividualsTriples").css("display", "block");
        } else {
          var dataSourcesArray = Object.keys(self.dataSources);
          common.fillSelectOptions("LineageIndividualsQueryParams_dataSourcesSelect", dataSourcesArray, dataSourcesArray.length > 1);
          if (dataSourcesArray.length == 1)
            self.onDataSourcesSelect($("#LineageIndividualsQueryParams_dataSourcesSelect").val());
        }
      });

    };

    self.onDataSourcesSelect = function(dataSourceKey) {
      $("#LineageIndividualsQueryParams_filterPanel").css("display", "none");
      self.currentDataSource = self.dataSources[dataSourceKey];
      if (!self.currentDataSource)
        return;


      if (self.currentDataSource.type.indexOf("sql") > -1) {
        $("#LineageIndividualsQueryParams_SQLfilterPanel").css("display", "block");
        self.sql.initModel(self.currentDataSource, function(err) {
          if (err)
            return alert(err);
          self.sql.showTables(nodeSource.dataSource);
        });

      } else if (self.currentDataSource.type == "searchIndex") {
        $("#LineageIndividualsQueryParams_searchIndexFilterPanel").css("display", "block");


      }
    };


    self.setClass = function(node) {
      $("#Lineage_Tabs").tabs("option", "active", 3);
      self.currentClassNode = node;
      $("#LineageIndividualsQueryParams_className").html(self.currentClassNode.data.label);
      if (self.currentDataSource.type == "searchIndex")
        self.searchIndex.showClassIndividualsTree();
    };


    self.executeQuery = function() {
      if (self.currentDataSource.type.indexOf("sql") > -1) {
        self.sql.executeQuery();
      } else if (self.currentDataSource.type == "searchIndex") {
        self.searchIndex.executeQuery();
      }


    };


    self.onSearchDialogOperatorSelect = function(operator) {

    };

    self.showAll = function() {
      Lineage_classes.drawNamedIndividuals([self.currentClassNode.id]);
    };

    self.clearQuery = function() {
      self.currentFilters = [];
      $("#LineageIndividualsQueryParams_QueryDiv").html(html);
    };


    self.addToQuery = function() {
      var existingVisjsIds = visjsGraph.getExistingIdsMap();

      if (!self.currentClassNode.color)
        self.currentClassNode.color = Lineage_classes.getSourceColor(self.currentClassNode.data.id);


      if (self.currentDataSource.type.indexOf("sql") > -1) {

        var classId = self.currentClassNode.data.id;
        var classLabel = self.currentClassNode.data.label;


        var operator = $("#LineageIndividualsQueryParams_operator").val();
        var value = $("#LineageIndividualsQueryParams_value").val();
        var html = "<div class='LineageIndividualsQueryParams_QueryElt' id='LineageIndividualsQueryParams_Elt_" + self.currentFilters.length + "'> ";
        var obj = {
          classId: classId,
          classLabel: classLabel
        };

        html += classLabel + "&nbsp;";
        if (value) {
          obj.operator = operator;
          obj.value = value;
          html += operator + "&nbsp;" + value + "&nbsp;";
        } else {
          html += "ALL &nbsp;";
        }
        html += "<button style='size: 10px' onclick='Lineage_individuals.removeQueryElement(" + self.currentFilters.length + ")'>X</button></div>";
        self.currentFilters.push(obj);
      } else if (self.currentDataSource.type == "searchIndex") {
        var individuals = $("#LineageIndividuals_individualsTree").jstree().get_checked(true);
        if (individuals.length == 0)
          return alert("no indiviual selected");
        var obj = { classNode: self.currentClassNode, individuals: [] };

        var html = "<div class='LineageIndividualsQueryParams_QueryElt' id='LineageIndividualsQueryParams_Elt_" + self.currentFilters.length + "'> ";
        html += "<b>" + self.currentClassNode.data.label + "</b>";
        var queryIndex = self.currentFilters.length;
        if (individuals[0].id == "_ALL") {
          self.currentFilters.push(obj);

          html += " ALL";
        } else {
          individuals.forEach(function(individual) {
            obj.individuals.push(individual.data.id);
          });
          self.currentFilters.push(obj);


          if (individuals.length < 5) {
            individuals.forEach(function(individual) {
              html += " " + individual.data.label;
            });

          }

        }
        html += "<button style='size: 10px' onclick='Lineage_individuals.removeQueryElement(" + queryIndex + ")'>X</button></div>";
      }

      $("#LineageIndividualsQueryParams_QueryDiv").append(html);
    };

    self.removeQueryElement = function(index) {
      self.currentFilters.splice(index, 1);
      $("#LineageIndividualsQueryParams_Elt_" + index).remove();
    };


    self.onQueryParamsDialogCancel = function() {
      $("#LineagePopup").dialog("close");
    };


    self.sql = {
      initModel: function(dataSource, callback) {
        if (dataSource.model)
          return callback();


      async.series([
          //load Mappings
        function(callbackSeries){
          var payload = {
            dir: "SQL/",
            name:  dataSource.dbName+"_"+self.currentClassNode.data.label + ".json"
          };
          $.ajax({
            type: "GET",
            url: `${Config.apiUrl}/data/file`,
            data: payload,
            dataType: "json",
            success: function(result, _textStatus, _jqXHR) {

            },
            error(_err) {


            }
          });
      return callbackSeries()
      }
      ]
      ,function(err){

      })





   /*     $.ajax({
          type: "GET",
          url: Config.apiUrl + "/kg/mappings/" + dataSource.dbName,
          dataType: "json",
          success: function(data, _textStatus, _jqXHR) {
            if (!data.mappings) return;
            if (!data.model) {
              data.model = self.generateKGModel(data.mappings);
            }
            self.currentDataSource.model = data;
            callback();

          },
          error: function(_err) {
            callback(err);

          }
        });*/


        /*
           const params = new URLSearchParams({
      name: self.currentDataSource.dbName,
      type: self.currentDataSource.type
    });
    $.ajax({
           type: "GET",
           url: Config.apiUrl + "/kg/model?" + params.toString(),
           dataType: "json",

           success: function(data, _textStatus, _jqXHR) {
             self.currentDataSource.model = data;
             callback();

           },
           error: function(_err) {
             callback(err);

           }
         });*/

      },
      showTables: function(dataSource) {
        if (!dataSource.mappings[self.currentClassNode.data.id])
          return alert("node mappings for class " + self.currentClassNode.data.label);
        var tables = Object.keys(dataSource.mappings[self.currentClassNode.data.id]);
        common.fillSelectOptions("LineageIndividualsQueryParams_SQL_tablesSelect", tables, true);
      },
      showColumns: function(table) {
        var tableColumns = self.currentDataSource.model[table];

        common.fillSelectOptions("LineageIndividualsQueryParams_SQL_columnsSelect", tableColumns, true);


      },
      fillValuesSelect: function() {
        var table = $("#LineageIndividualsQueryParams_SQL_tablesSelect").val();
        var column = $("#LineageIndividualsQueryParams_SQL_columnsSelect").val();
        if (!table || !column)
          return alert("select a tbale and a column");
        var SampleSizelimit = 1000;
        var sqlQuery = " select distinct column from " + table + " limit " + SampleSizelimit;
        if (self.currentDataSource.type == "sql.sqlserver") sqlQuery = " select distinct  " + column + " from " + table;


        const params = new URLSearchParams({
          type: self.currentDataSource.type,
          dbName: self.currentDataSource.dbName,
          sqlQuery: sqlQuery
        });

        $.ajax({
          type: "GET",
          url: Config.apiUrl + "/kg/data?" + params.toString(),
          dataType: "json",

          success: function(data, _textStatus, _jqXHR) {
            if (data.size >= SampleSizelimit)
              return alert("too many values");
            common.fillSelectOptions("LineageIndividualsQueryParams_valuesSelect", data, true, column, column);
          },
          error(err) {
            return alert(err.responseText);
          }
        });

      }
      , onValuesSelectChange: function() {
        var value = $("#LineageIndividualsQueryParams_valuesSelect").val();
        $("#LineageIndividualsQueryParams_value").val(value);
      }
      , executeQuery: function(output) {
        var SampleSizelimit = 5000;
        var table = $("#LineageIndividualsQueryParams_SQL_tablesSelect").val();
        var column = $("#LineageIndividualsQueryParams_SQL_columnsSelect").val();
        var operator = $("#LineageIndividualsQueryParams_operator").val();
        var value = $("#LineageIndividualsQueryParams_value").val();

        var sqlQuery = " select  * from " + table + " limit " + SampleSizelimit;
        if (self.currentDataSource.type == "sql.sqlserver") sqlQuery = " select top  " + SampleSizelimit + " * from " + table;

        if (value) {

          var value2 = "";
          if (operator == "contains")
            value2 = " LIKE ('%" + value + "%')";
        }
        sqlQuery += " where " + column + value2;


        const params = new URLSearchParams({
          type: self.currentDataSource.type,
          dbName: self.currentDataSource.dbName,
          sqlQuery: sqlQuery
        });

        $.ajax({
          type: "GET",
          url: Config.apiUrl + "/kg/data?" + params.toString(),
          dataType: "json",

          success: function(data, _textStatus, _jqXHR) {
            if (data.size >= SampleSizelimit)
              return alert("too many values");
            if (output == "table") {

            }
          },
          error(err) {
            return alert(err.responseText);
          }
        });

      }


    };
    self.searchIndex = {
      executeFilterQuery: function(callback) {
        if (self.currentFilters.length == 0)
          return alert("no query filter");
        var mustFilters = [];
        var shouldFilters = [];
        var terms = [];
        self.currentFilters.forEach(function(filter, index) {


          if (filter.individuals.length == 0) {
            terms.push({ "term": { ["Concepts." + filter.classNode.data.label + ".name.keyword"]: filter.classNode.data.label } });

          } else {
            var individuals = [];
            filter.individuals.forEach(function(individual) {
              individuals.push(individual);
            });

            terms.push({ "terms": { ["Concepts." + filter.classNode.data.label + ".instances.keyword"]: individuals } });
          }
          if (index == 0) {
            mustFilters = terms;
            terms = [];
          }
        else
          shouldFilters = terms;

        });

        var query = {
          "query": {
            "bool": {
              "must": mustFilters

              //  "boost": 1.0
            }
          }
        };
        if (shouldFilters.length > 0) {

          query.query.bool.filter = shouldFilters;
          //  query.query.bool.minimum_should_match = 1;
        }


        var payload = {
          query: query,
          url: "_search",
          indexes: self.currentDataSource.indexes
        };
        $.ajax({
          type: "POST",
          url: Config.apiUrl + "/elasticsearch/query_gaia",
          data: JSON.stringify(payload),
          contentType: "application/json",
          dataType: "json",

          success: function(result, _textStatus, _jqXHR) {
            callback(null, result);
          }, error: function(_err) {
            callback(err);

          }
        });


      }
      , showClassIndividualsTree: function(output) {
        var query = {};

        query = {
          "aggs": {
            [self.currentClassNode.data.label]: {
              "terms": {
                "field": "Concepts." + self.currentClassNode.data.label + ".instances.keyword",
                "size": 1000,
                "min_doc_count": 2
              }

            }
          }
        };


        if (!Array.isArray(self.currentDataSource.indexes))
          self.currentDataSource.indexes = [self.currentDataSource.indexes];


        var payload = {
          query: query,
          url: "_search",
          indexes: self.currentDataSource.indexes
        };
        $.ajax({
          type: "POST",
          url: Config.apiUrl + "/elasticsearch/query_gaia",
          data: JSON.stringify(payload),
          contentType: "application/json",
          dataType: "json",

          success: function(result, _textStatus, _jqXHR) {

            if (Object.keys(result.aggregations).length == 0) {
              return;
            }
            for (var key in result.aggregations) {
              var buckets = result.aggregations[key].buckets;
              var jstreeData = [];


              jstreeData.push({
                id: "_ALL",
                text: "ALL",
                parent: "#",
                data: {
                  id: "_ALL",
                  text: "ALL",
                  class: self.currentClassNode
                }
              });
              buckets.sort(function(a, b) {
                if (a.key > b.key)
                  return 1;
                if (a.key < b.key)
                  return -1;
                return 0;

              });
              buckets.forEach(function(bucket) {
                jstreeData.push({
                  id: bucket.key,
                  text: bucket.key + " " + bucket.doc_count,
                  parent: "#",
                  data: {
                    id: bucket.key,
                    label: bucket.key,
                    class: self.currentClassNode
                  }
                });

              });
              var options = {
                openAll: false, withCheckboxes: true, contextMenu: function() {
                },
                searchPlugin: {
                  case_insensitive: true,
                  fuzzy: false,
                  show_only_matches: true
                }
              };
              $("#LineageIndividuals_individualsTreeSearchInput").bind("keyup", null, Lineage_individuals.searchIndex.searchInIndividualsTree);
              common.jstree.loadJsTree("LineageIndividuals_individualsTree", jstreeData, options);

            }

          },
          error: function(_err) {
            callback(err);

          }
        });
      },
      searchInIndividualsTree: function(event) {
        if (event.keyCode != 13) return;
        var value = $("#LineageIndividuals_individualsTreeSearchInput").val();
        $("#LineageIndividuals_individualsTree").jstree(true).search(value);
        $("#LineageIndividuals_individualsTreeSearchInput").val("");
      },

      drawIndividuals: function() {
        $("#LineageIndividualsQueryParams_message").html("searching...");
        self.searchIndex.executeFilterQuery(function(err, result) {
            if (err)
              return alert(err.responseText);
            var message = "" + result.hits.hits.length + " hits found";
            $("#LineageIndividualsQueryParams_message").html(message);

            var graphNodesMap = {};
            var graphEdgesMap = {};


            // aggregate individuals inside map of graph nodes map
            self.currentFilters.forEach(function(filter) {
              var filterClassName = filter.classNode.data.label;
              var fitlerIndividuals = filter.individuals;
              if (!graphNodesMap[filter.classNode.data.id])
                graphNodesMap[filter.classNode.data.id] = { filter: filter, individuals: {} };

              result.hits.hits.forEach(function(hit) {
                var hitConceptObj = hit._source.Concepts[filterClassName];
                if (!hitConceptObj)
                  return;
                var hitConceptIndividuals = hitConceptObj.instances;
                hitConceptIndividuals.forEach(function(hitIndividual) {
                  if (fitlerIndividuals.length == 0 || fitlerIndividuals.indexOf(hitIndividual) > -1) {
                    if (!graphNodesMap[filter.classNode.data.id].individuals[hitIndividual])
                      graphNodesMap[filter.classNode.data.id].individuals[hitIndividual] = 0;
                    graphNodesMap[filter.classNode.data.id].individuals[hitIndividual] += 1;


                    if (!graphEdgesMap[hit._source.ParagraphId])
                      graphEdgesMap[hit._source.ParagraphId] = [];
                    graphEdgesMap[hit._source.ParagraphId].push({
                      classId: filter.classNode.data.id,
                      individual: hitIndividual
                    });
                  }
                });

              });

            });


            visjsData = { nodes: [], edges: [] };

            var existingVisjsIds = visjsGraph.getExistingIdsMap();
            for (var graphNodeId in graphNodesMap) {
              var classNode = graphNodesMap[graphNodeId].filter.classNode;
              var color = classNode.color;


              if (false && !existingVisjsIds[graphNodeId]) {
                existingVisjsIds[graphNodeId] = 1;


                visjsData.nodes.push({
                  id: classNode.data.id,
                  label: classNode.data.label,
                  shape: Lineage_classes.defaultShape,
                  size: Lineage_classes.defaultShapeSize,
                  color: color,
                  data: {
                    id: classNode.data.id,
                    label: classNode.data.label,
                    source: classNode.data.source

                  }
                });
              } else {

              }


              for (var hitIndividual in graphNodesMap[graphNodeId].individuals) {
                var id = "searchIndex_" + hitIndividual;
                if (!existingVisjsIds[id]) {
                  existingVisjsIds[id] = 1;

                  visjsData.nodes.push({
                    id: id,
                    label: hitIndividual,
                    shape: Lineage_classes.namedIndividualShape,
                    color: color,
                    data: {
                      id: hitIndividual,
                      label: hitIndividual,
                      source: "_searchIndex",
                      filter: graphNodesMap[graphNodeId].filter
                    }
                  });
                }
                var edgeId = id + "_" + graphNodeId;
                if (!existingVisjsIds[edgeId]) {
                  existingVisjsIds[edgeId] = 1;
                  visjsData.edges.push({
                    id: edgeId,
                    from: id,
                    to: graphNodeId
                  });
                }
              }
            }
            // draw edges between indiviudals
            var individualEdges = {};
            for (var paragraphId in graphEdgesMap) {
              var individuals = graphEdgesMap[paragraphId];
              individuals.forEach(function(item1) {
                individuals.forEach(function(item2) {
                  if (item1.individual != item2.individual && item1.classId != item2.classId) {
                    var edgeId = item1.individual + "_" + item2.individual;
                    if (!individualEdges[edgeId])
                      individualEdges[edgeId] = [];
                    individualEdges[edgeId].push(paragraphId);
                  }
                });
              });
            }
            for (var edgeId in individualEdges) {
              var array = edgeId.split("_");
              var inverseEdgeId = array[1] + "_" + array[0];
              if (!existingVisjsIds[edgeId] && !existingVisjsIds[inverseEdgeId]) {
                existingVisjsIds[edgeId] = 1;

                visjsData.edges.push({
                  id: edgeId,
                  from: "searchIndex_" + array[0],
                  to: "searchIndex_" + array[1],
                  color: "#0067bb",
                  data: {
                    from: array[0],
                    to: array[1],
                    source: "_searchIndex_paragraph",
                    paragraphs: individualEdges[edgeId]
                  }
                });
              }
            }
            if (visjsGraph.isGraphNotEmpty()) {
              visjsGraph.data.nodes.add(visjsData.nodes);
              visjsGraph.data.edges.add(visjsData.edges);
            } else {
              Lineage_classes.drawNewGraph(visjsData);
            }
          }
        )
        ;
      }, listParagraphs: function() {
        self.searchIndex.executeFilterQuery(function(err, result) {
          if (err)
            return alert(err.responseText);
        });

      }
    };


    return self;
  }
)
();
