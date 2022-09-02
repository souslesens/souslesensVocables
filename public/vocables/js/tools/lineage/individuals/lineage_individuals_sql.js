var Lineage_individuals_sql = (function() {
  var self = {};

  self.onDataSourcesSelect = function(dataSourceKey) {
    self.currentDataSource = Lineage_individuals.currentDataSource;

    $("#LineageIndividualsQueryParams_SQLfilterPanel").css("display", "block");
    self.initIndividualsPanel();
  };





  self.initIndividualsPanel = function(node) {
    self.currentClassNode = Lineage_individuals.currentClassNode;
    self.getModel(self.currentDataSource, function(err, model) {
      if (err) return alert(err);
      Lineage_individuals.getNodeLinkedData(self.currentClassNode, function(err, result) {
        if (err)
          return callback(err);
        if (result.length == 0)
          return alert("No mapping for Class " + self.currentClassNode.data.label + " in data source " + self.currentDataSource.name);

        self.currentDataSource.currentClassNodeMappingKey = result[0];
        self.showTables(result[0]);
      });

    });


  };

  self.executeQuery = function() {
    if (self.currentDataSource.type.indexOf("sql") > -1) {
      self.executeQuery();
    } else if (self.currentDataSource.type == "searchIndex") {
      self.searchIndex.executeQuery();
    }
  };

  self.addFilter = function() {
    var existingVisjsIds = visjsGraph.getExistingIdsMap();

    if (!self.currentClassNode.color) self.currentClassNode.color = Lineage_classes.getSourceColor(self.currentClassNode.data.id);

    var filterObj = null;
    if (self.currentDataSource.type.indexOf("sql") > -1) filterObj = self.getFilter();
    else if (self.currentDataSource.type == "searchIndex") filterObj = self.searchIndex.getFilter();
    Lineage_individuals.currentFilters.push(filterObj);

    $("#LineageIndividualsQueryParams_value").val("");
  };

  self.drawIndividuals = function() {
    if (self.currentDataSource.type.indexOf("sql") > -1) {
      self.drawSearchIndividuals();
    } else if (self.currentDataSource.type == "searchIndex") {
      self.searchIndex.drawIndividuals();
    }
  };

  self.getModel = function(dataSource, callback) {
    if (dataSource.model) return callback(null, dataSource.model);

    if (self.currentDataSource.model) return self.currentDataSource.model;

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
  };
  self.showTables = function(mappingKey) {
     if (!self.currentDataSource.classMappings[mappingKey]) return alert("node mappings for class " + self.currentClassNode.data.label);
  var tables = Object.keys(self.currentDataSource.classMappings[mappingKey]);
    common.fillSelectOptions("LineageIndividualsQueryParams_SQL_tablesSelect", tables, true);
  };
  self.showColumns = function(table) {
    var schema = self.currentDataSource.table_schema;
    if(table.indexOf(schema)<0)
      table=schema + "." + table
    var tableColumns = self.currentDataSource.model[table];

    common.fillSelectOptions("LineageIndividualsQueryParams_SQL_columnsSelect", tableColumns, true);
  };
  self.onColumnChange = function(column) {
    $("#LineageIndividualsQueryParams_value").val("");
    if (true) {
      self.fillValuesSelect();
    }
  };
  self.fillValuesSelect = function() {
    var table = $("#LineageIndividualsQueryParams_SQL_tablesSelect").val();
    var column = $("#LineageIndividualsQueryParams_SQL_columnsSelect").val();
    if (!table || !column) return alert("select a tbale and a column");
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
        if (data.size >= SampleSizelimit) return alert("too many values");
        common.fillSelectOptions("LineageIndividualsQueryParams_valuesSelect", data, true, column, column);
        $("#LineageIndividualsQueryParams_operator").val("=");
      },
      error(err) {
        return alert(err.responseText);
      }
    });
  };
  self.getFilter = function() {
    var classId = self.currentClassNode.data.id;
    var classLabel = self.currentClassNode.data.label;

    var table = $("#LineageIndividualsQueryParams_SQL_tablesSelect").val();
    var column = $("#LineageIndividualsQueryParams_SQL_columnsSelect").val();
    var operator = $("#LineageIndividualsQueryParams_operator").val();
    var value = $("#LineageIndividualsQueryParams_value").val();
    var html = "<div class='LineageIndividualsQueryParams_QueryElt' id='LineageIndividualsQueryParams_Elt_" + Lineage_individuals.currentFilters.length + "'> ";
    var obj = {
      classId: classId,
      classLabel: classLabel,
      table: table
    };

    html += classLabel + "&nbsp;";
    if (value) {
      obj.column = column;
      obj.operator = operator;
      obj.value = value;
      html += table + "." + column + " " + operator + "&nbsp;" + value + "&nbsp;";
    } else {
      html += "ALL &nbsp;";
      obj.column = column;
    }
    html += "<button style='size: 10px' onclick='Lineage_individuals.removeQueryElement(" + Lineage_individuals.currentFilters.length + ")'>X</button></div>";
    $("#LineageIndividualsQueryParams_QueryDiv").append(html);
    return obj;
  };

  self.drawSearchIndividuals = function() {
    var tables = [];

    Lineage_individuals.currentFilters.forEach(function(filter) {
      if (tables.indexOf(filter.table) < 0) tables.push(filter.table);
    });
    var from = "";
    var tablesCount = tables.length;
    if (tablesCount > 1) {
      return alert("no join between table");
    } else tablesCount == 1;
    fromStr = tables[0];

    var SampleSizelimit = 5000;

    var whereArray = [];
    var columnsStr = "";
    var columnToClassMap = {};

    Lineage_individuals.currentFilters.forEach(function(filter, index) {
      if(columnsStr==""){
        var currentClassNodeMappingKey = self.currentDataSource.currentClassNodeMappingKey;
        var searchedColumn=self.currentDataSource.classMappings[currentClassNodeMappingKey][filter.table]
        columnToClassMap[searchedColumn] = self.currentClassNode.id;
        columnsStr +=  filter.table + "." +searchedColumn;
      }
      if (columnsStr!="") columnsStr += ",";
      columnsStr += filter.table + "." + filter.column;
      columnToClassMap[filter.column] = filter.classId;
      if (filter.value) {
        var opValue = "";
        if (filter.operator == "contains") {
          opValue = " LIKE ('%" + filter.value + "%')";
        } else {
          if (common.isNumber(filter.value)) {
            opValue = filter.operator + filter.value;
          } else {
            opValue = filter.operator + "'" + filter.value + "'";
          }
        }
        whereArray.push(filter.column + " " + opValue);
      }
    });
    var whereStr = "";
    whereArray.forEach(function(whereItem, index) {
      if (index > 0) whereStr += " AND ";
      whereStr += whereItem;
    });



   /* for (var table in  self.currentDataSource.classMappings[currentClassNodeMappingKey]) {
      if (tables.indexOf(table) > -1)
      columnToClassMap[currentClassNodeMapping[table]] = self.currentClassNode.id;
    }*/

    var sqlQuery = " select  " + columnsStr + " from " + fromStr + " limit " + SampleSizelimit;
    if (self.currentDataSource.type == "sql.sqlserver") sqlQuery = " select top  " + SampleSizelimit + " " + columnsStr + "  from " + fromStr;

    if (whereStr != "") sqlQuery += " WHERE " + whereStr;

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
        if (data.size >= SampleSizelimit) alert("too many values");
        var visjsData = { nodes: [], edges: [] };
        var existingVisjsIds = visjsGraph.getExistingIdsMap();

        data.forEach(function(item) {
          for (var column in columnToClassMap) {
            var classNodeId = columnToClassMap[column];

            var individual = item[column];

            if (individual) {
              if (visjsGraph.isGraphNotEmpty()) {
                var classNodeObj = visjsGraph.data.nodes.get(classNodeId);
                if (existingVisjsIds[classNodeId]) {
                  var color = classNodeObj.color;
                  var edgeId = individual + "_" + classNodeId;
                  if (!existingVisjsIds[edgeId]) {
                    existingVisjsIds[edgeId] = 1;

                    visjsData.edges.push({
                      id: edgeId,
                      from: individual,
                      to: classNodeId,
                      color: color
                    });
                  }
                }
              }

              if (!existingVisjsIds[individual]) {
                existingVisjsIds[individual] = 1;

                visjsData.nodes.push({
                  id: individual,
                  label: individual,
                  shape: Lineage_classes.namedIndividualShape,

                  color: color,
                  data: {
                    id: individual,
                    label: individual,
                    source: "linked_" + self.currentDataSource.name
                  }
                });
              }
            }
          }
          var array = Object.keys(columnToClassMap);
          for (var i = 0; i < array.length; i++) {
            for (var j = 0; j < array.length; j++) {
              if (i == j) continue;
              var from = item[array[i]];
              var to = item[array[j]];
              var edgeId = from + "_" + to;
              var inverseEdgeId = to + "_" + from;
              if (!existingVisjsIds[edgeId] && !existingVisjsIds[inverseEdgeId]) {
                existingVisjsIds[edgeId] = 1;

                visjsData.edges.push({
                  id: edgeId,
                  from: from,
                  to: to,
                  color: "#0067bb",
                  data: {
                    from: from,
                    to: to,
                    source: "linked_" + self.currentDataSource.name
                  }
                });
              }
            }
          }
        });
        if (false) {
          // draw edges between indiviudals
          var individualEdges = {};
          for (var paragraphId in graphEdgesMap) {
            var individuals = graphEdgesMap[paragraphId];
            individuals.forEach(function(item1) {
              individuals.forEach(function(item2) {
                if (item1.individual != item2.individual && item1.classId != item2.classId) {
                  var edgeId = item1.individual + "_" + item2.individual;
                  if (!individualEdges[edgeId]) individualEdges[edgeId] = [];
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
        }
        if (visjsGraph.isGraphNotEmpty()) {
          visjsGraph.data.nodes.add(visjsData.nodes);
          visjsGraph.data.edges.add(visjsData.edges);
        } else {
          Lineage_classes.drawNewGraph(visjsData);
        }
      },
      error(err) {
        return alert(err.responseText);
      }
    });
  };
  self.onValuesSelectChange = function() {
    var value = $("#LineageIndividualsQueryParams_valuesSelect").val();
    $("#LineageIndividualsQueryParams_value").val(value);
  };

  self.executeQuery = function(output) {
    var SampleSizelimit = 500;
    var table = $("#LineageIndividualsQueryParams_SQL_tablesSelect").val();
    var column = $("#LineageIndividualsQueryParams_SQL_columnsSelect").val();
    var operator = $("#LineageIndividualsQueryParams_operator").val();
    var value = $("#LineageIndividualsQueryParams_value").val();

    var sqlQuery = " select  * from " + table + " limit " + SampleSizelimit;
    if (self.currentDataSource.type == "sql.sqlserver") sqlQuery = " select top  " + SampleSizelimit + " * from " + table;

    if (value) {
      var value2 = "";
      if (operator == "contains") value2 = " LIKE ('%" + value + "%')";
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
        if (data.size >= SampleSizelimit) return alert("too many values");
        if (output == "table") {
        }
      },
      error(err) {
        return alert(err.responseText);
      }
    });
  };

  return self;
})();
