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
    var tables = Object.keys(self.currentDataSource.classMappings[mappingKey].tables);
    common.fillSelectOptions("LineageIndividualsQueryParams_SQL_tablesSelect", tables, true);
  };
  self.showColumns = function(table) {
    var schema = self.currentDataSource.table_schema;
    if (table.indexOf(schema) < 0)
      table = schema + "." + table;
    var tableColumns = self.currentDataSource.model[table];

    common.fillSelectOptions("LineageIndividualsQueryParams_SQL_columnsSelect", tableColumns, true);
   self.setDefaultFilter()
  };
  self.onColumnChange = function(column) {
    $("#LineageIndividualsQueryParams_value").val("");
    if (true) {
      self.fillValuesSelect();
    }
  };
  /**
   * initialize UI column,operator and value with the mapping filter if anay
   *
   *
   *
   */
  self.setDefaultFilter=function(){
    var mappingKey=self.currentDataSource.currentClassNodeMappingKey
   var defaultFilter= self.currentDataSource.classMappings[mappingKey].defaultFilter;
    if(!defaultFilter)
      return;
    var table = $("#LineageIndividualsQueryParams_SQL_tablesSelect").val();
    var column=self.currentDataSource.classMappings[mappingKey].tables[table][defaultFilter.column]
    $("#LineageIndividualsQueryParams_SQL_columnsSelect").val(column);
    var operator = $("#LineageIndividualsQueryParams_operator").val(defaultFilter.operator);
    var value =""
    if(defaultFilter.value=="classLabel")
       value =Lineage_individuals.currentClassNode.data.label
    if(defaultFilter.value=="classId")
      value =Lineage_individuals.currentClassNode.data.id
     $("#LineageIndividualsQueryParams_value").val(value);



  }
  self.fillValuesSelect = function() {
    var table = $("#LineageIndividualsQueryParams_SQL_tablesSelect").val();
    var column = $("#LineageIndividualsQueryParams_SQL_columnsSelect").val();
    if (!table || !column) return alert("select a table and a column");
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
    var classUri = self.currentClassNode.data.id;
    var classLabel = self.currentClassNode.data.label;

    var table = $("#LineageIndividualsQueryParams_SQL_tablesSelect").val();
    var column = $("#LineageIndividualsQueryParams_SQL_columnsSelect").val();
    var operator = $("#LineageIndividualsQueryParams_operator").val();
    var value = $("#LineageIndividualsQueryParams_value").val();
    var html = "<div class='LineageIndividualsQueryParams_QueryElt' id='LineageIndividualsQueryParams_Elt_" + Lineage_individuals.currentFilters.length + "'> ";
    var obj = {
      classUri: classUri,
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

    var currentMapping;
    Lineage_individuals.currentFilters.forEach(function(filter, index) {
      if (columnsStr == "") {
        var currentClassNodeMappingKey = self.currentDataSource.currentClassNodeMappingKey;
        currentMapping = self.currentDataSource.classMappings[currentClassNodeMappingKey].tables[filter.table];
        currentMapping.table = filter.table;
        currentMapping.classUri = currentClassNodeMappingKey;
        columnsStr += filter.table + "." + currentMapping.individualIdColumn + "," + filter.table + "." + currentMapping.individualLabelColumn;

       // columnsStr += filter.table + "." + currentMapping.classUriColumn + "," + filter.table + "." + currentMapping.classLabelColumn;

      }


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

          currentMapping;


         // var classUri = currentMapping.classUri;
          var classUri= Lineage_individuals.currentNode.id
          var individualId = item[currentMapping.individualIdColumn];
          var individualLabel = individualId;
          if (currentMapping.classLabelColumn)
            individualLabel = item[currentMapping.individualLabelColumn];


          if (individualId) {
            if (visjsGraph.isGraphNotEmpty()) {
              var classNodeObj = visjsGraph.data.nodes.get(classUri);
              if (existingVisjsIds[classUri]) {
                var color = classNodeObj.color;
                var edgeId = individualId + "_" + classUri;
                if (!existingVisjsIds[edgeId]) {
                  existingVisjsIds[edgeId] = 1;

                  visjsData.edges.push({
                    id: edgeId,
                    from: individualId,
                    to: classUri,
                    color: color
                  });
                }
              }
            }

            if (!existingVisjsIds[individualId]) {
              existingVisjsIds[individualId] = 1;

              visjsData.nodes.push({
                id: individualId,
                label: individualLabel,
                shape: Lineage_classes.namedIndividualShape,
                size: Lineage_classes.defaultShapeSize,
                color: color,
                data: {
                  id: individualId,
                  label: individualLabel,
                  source: "linked_" + self.currentDataSource.name,
                  type: "NamedIndividual",
                  dataSource: self.currentDataSource.name,
                  classUri: currentMapping.classUri,
                  classUriColumn: currentMapping.classUriColumn,
                  individualIdColumn:currentMapping.individualIdColumn,
                  table: currentMapping.table


                }
              });
            } else {

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
                if (item1.individual != item2.individual && item1.classUri != item2.classUri) {
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

  self.getIndividualInfos = function(dataSource, node, callback) {
    var individualIdColumn = node.data.individualIdColumn;
    var table = node.data.table;

    var individualId = node.data.id;
    var sqlQuery = "select * from " + table + " where " + individualIdColumn + "='" + individualId + "'";

    const params = new URLSearchParams({
      type: dataSource.type,
      dbName: dataSource.dbName,
      sqlQuery: sqlQuery
    });

    $.ajax({
      type: "GET",
      url: Config.apiUrl + "/kg/data?" + params.toString(),
      dataType: "json",

      success: function(data, _textStatus, _jqXHR) {
        var str = "<div style='max-height:800px;overflow: auto'>" + "<table class='infosTable'>";

        str += "<tr><td>&nbsp;</td><td>&nbsp;</td></tr>";

        data.forEach(function(item) {
          str += "<tr class='infos_table'><td class='detailsCellName' style='font-weight: bold'>" + item[individualIdColumn] + "</td><td></td></tr>";
          for (var key in item) {
            str += "<tr class='infos_table'>";
            str += "<td class='detailsCellName'>" + key + "</td>";
            str += "<td class='detailsCellValue'>" + item[key] + "</td>";
            str += "</tr>";
          }
        });
        str += "</table>";
        return callback(null, str);
      }
      ,
      error(err) {
        return callback(err.responseText);
      }
    });

  };

  return self;
})();
