var Lineage_individuals = (function() {
  var self = {};
  self.currentQuery = [];
  self.dataSources = {};

  self.init = function() {
    self.currentQuery = [];
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
    self.currentQuery = [];
    $("#LineageIndividualsQueryParams_QueryDiv").html(html);
  };
  self.addToQuery = function() {
    if (self.currentDataSource.type.indexOf("sql") > -1) {

      var classId = self.currentClassNode.data.id;
      var classLabel = self.currentClassNode.data.label;
      var operator = $("#LineageIndividualsQueryParams_operator").val();
      var value = $("#LineageIndividualsQueryParams_value").val();
      var html = "<div class='LineageIndividualsQueryParams_QueryElt' id='LineageIndividualsQueryParams_Elt_" + self.currentQuery.length + "'> ";
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
      html += "<button style='size: 10px' onclick='Lineage_individuals.removeQueryElement(" + self.currentQuery.length + ")'>X</button></div>";
      self.currentQuery.push(obj);
    } else if (self.currentDataSource.type == "searchIndex") {
      var individuals = $("#LineageIndividuals_individualsTree").jstree().get_checked(true);
      var obj = { classNode: self.currentClassNode, individuals: [] };
      individuals.forEach(function(individual) {
        obj.individuals.push(individual.data.id);
      });
      self.currentQuery.push(obj);

      var html = "<div class='LineageIndividualsQueryParams_QueryElt' id='LineageIndividualsQueryParams_Elt_" + self.currentQuery.length + "'> ";
      html += "<b>" + self.currentClassNode.data.label + "</b>";
      if (individuals.length < 5) {
        individuals.forEach(function(individual) {
          html += " " + individual.data.label;
        });

      }
      html += "<button style='size: 10px' onclick='Lineage_individuals.removeQueryElement(" + self.currentQuery.length + ")'>X</button></div>";

    }

    $("#LineageIndividualsQueryParams_QueryDiv").append(html);
  };

  self.removeQueryElement = function(index) {
    self.currentQuery.splice(index, 1);
    $("#LineageIndividualsQueryParams_Elt_" + index).remove();
  };


  self.onQueryParamsDialogCancel = function() {
    $("#LineagePopup").dialog("close");
  };


  self.sql = {
    initModel: function(dataSource, callback) {
      if (dataSource.model)
        return callback();
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
      });

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
    executeFilterQuery: function( callback) {
      if (self.currentQuery.length == 0)
        return alert("no query filter");
      var mustFilters = [];
      var shouldFilters = [];
      self.currentQuery.forEach(function(filter, index) {
        var individuals = [];
        var terms;
        if (filter.individuals.indexOf("_ALL") > -1) {
          terms = {
            "match": {
              ["Concepts." + filter.classNode.data.label]: "*"

            }
          };
        } else {
          filter.individuals.forEach(function(individual) {
            individuals.push(individual);
          });
          var terms = { "terms": { ["Concepts." + filter.classNode.data.label + ".instances.keyword"]: individuals } };
        }
        if (index == 0)
          mustFilters.push(terms);
        else
          shouldFilters.push(terms);

      });

      var query = {
        "query": {
          "bool": {
            "must": mustFilters,
           // "minimum_should_match": 1,
            "boost": 1.0
          }
        }
      };
      if(shouldFilters.length>0)
        query.query.bool.should=  shouldFilters;


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
      if (!self.currentClassNode) {
        query = {
          "aggs": {
            "Basin": {
              "terms": { "field": "Concepts.Basin.instances.keyword", "size": 1000, "min_doc_count": 2 }

            },

            "Fluid": {
              "terms": { "field": "Concepts.Fluid.instances.keyword", "size": 1000, "min_doc_count": 2 }

            }
          }
        };
      } else {
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
      }

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
      self.searchIndex.executeFilterQuery(function(err, result) {
        if (err)
          return alert(err.responseText);
        var visjsNodes = visjsGraph.getExistingIdsMap();

        result.hits.hits.forEach(function(hit) {
          for (var concept in hit.Concepts) {


          }


        });
      });

    },
    listParagraphs: function() {
      self.searchIndex.executeFilterQuery(function(err, result) {
        if (err)
          return alert(err.responseText);
      });

    }

  };

  return self;
})();
