var Lineage_linkedData_query = (function() {
  var self = {};
  self.databasesMap = {};
  self.sqlContext = {};

  self.init = function() {
    $("#LineageLinkedDataRelationsDiv").load("snippets/lineage/lineage_linkedData_queryRelations.html", function() {
      Lineage_linkedData_mappings.getSourceJoinsMappings(Lineage_sources.activeSource, {}, function(err, joinsMap) {
        if (err) return alert(err.responseText);
        var joins = [];
        self.joinsMap = joinsMap;
        for (var join in joinsMap) {
          var joinObj = joinsMap[join];
          joins.push({
            id: join,
            label: joinObj.from.classLabel + "-" + joinObj.propLabel + "->" + joinObj.to.classLabel
          });
        }

        common.fillSelectOptions("lineage_linkedata_queryRelations_relationsSelect", joins, null, "label", "id");
      });
    });
  };

  self.showRelationFilterDialog = function(relation) {
    $("#mainDialogDiv").dialog("open");
    $("#mainDialogDiv").load("snippets/lineage/lineageLinkedDataQueryDialog.html", function() {


      var databases = {};

      for (var join in self.joinsMap) {
        var joinObj = self.joinsMap[join];
        if (!databases[joinObj.database])
          databases[joinObj.database] = {};
        if (!databases[joinObj.database].from)
          databases[joinObj.database].from = joinObj.from;
        if (!databases[joinObj.database].to)
          databases[joinObj.database].to = joinObj.to;
        self.databasesMap = databases;

      }
      common.fillSelectOptions("LineageLinkedDataQueryParams_database", Object.keys(databases));


    });
  };
  self.onDatabaseChange = function(database) {
    self.sqlContext = {tables:{}};
    self.currentDatabase = database;
    self.sqlContext.currentDataSource = { type: "sql.sqlserver", dbName: self.currentDatabase };
    var classes = [
      { label: self.databasesMap[database].from.classLabel, id: "from" },
      { label: self.databasesMap[database].to.classLabel, id: "to" }

    ];
    common.fillSelectOptions("LineageLinkedDataQueryParams_classes", classes, null, "label", "id");

    if (!self.databasesMap[database].model) {
      KGcreator.listTables(self.currentDatabase, function(err, model) {
        if (err)
          return alert(err.responseText);
        self.databasesMap[database].model = model;
      });

    }


  };
  self.onClassChange = function(classRole) {

    if (self.currentTable) {

      if (!self.sqlContext.tables[self.currentTable])
        self.sqlContext.tables[self.currentTable] = {};
      var columns = $("#LineageLinkedDataQueryParams_SQL_columnsTree").jstree().get_selected();
      self.sqlContext.tables[self.currentTable].selectColumns = columns;


    }

    var currentsqlObj = self.databasesMap[self.currentDatabase][classRole];
    self.currentTable = currentsqlObj.table;
    var columns = self.databasesMap[self.currentDatabase].model[self.currentTable];


    $("#LineageLinkedDataQueryParams_currentTable").val(self.currentTable);
    var jstreeData = [];
    columns.forEach(function(item) {
      jstreeData.push({
        id: item,
        text: item,
        parent: "#"

      });
    });
    var options = {
      withCheckboxes: true,
      selectTreeNodeFn: Lineage_linkedData_query.onColumnChange
    };
    common.jstree.loadJsTree("LineageLinkedDataQueryParams_SQL_columnsTree", jstreeData, options);


  };

  self.fillColumnValuesSelect = function() {

    self.getColumnValues(self.currentTable, self.currentColumn, function(err, data) {

      if (data.size >= self.dataSizeLimit) return alert("too many values");

      common.fillSelectOptions("LineageLinkedDataQueryParams_valuesSelect", data, true, column, column);
      $("#LineageLinkedDataQueryParams_operator").val("=");

    });
  };
  self.onColumnChange = function() {
    var column = $("#LineageLinkedDataQueryParams_SQL_columnsTree").jstree().get_selected()[0];
    self.currentColumn = column;


  };
  self.getColumnValues = function(table, column, callback) {

    self.dataSizeLimit = 1000;
    var sqlQuery = " select distinct column from " + table + " limit " + self.dataSizeLimit;
    if (self.currentDataSource.type == "sql.sqlserver") sqlQuery = " select distinct  " + column + " from " + table;

    const params = new URLSearchParams({
      type: self.sqlContext.currentDataSource.type,
      dbName: self.sqlContext.currentDataSource.dbName,
      sqlQuery: sqlQuery
    });

    $.ajax({
      type: "GET",
      url: Config.apiUrl + "/kg/data?" + params.toString(),
      dataType: "json",

      success: function(data, _textStatus, _jqXHR) {
        if (callback)
          return callback(null, data);


      },
      error(err) {
        if (callback)
          return callback(null);

      }
    });
  };

  self.addFilter = function() {

    var filterId = "filter_" + common.getRandomHexaId(5);
    var table = self.currentTable;
    var column = self.currentColumn;
    var operator = $("#LineageLinkedDataQueryParams_operator").val();
    var value = $("#LineageLinkedDataQueryParams_value").val();
    $("#LineageLinkedDataQueryParams_value").val("");
    var html = "<div class='LineageLinkedDataQueryParams_QueryElt' id='" + filterId + "'> ";
    var obj = {

      table: table
    };

    //   html += classLabel + "&nbsp;";

    if (value) {
      obj.table = self.currentTable;
      obj.column = column;
      obj.operator = operator;
      obj.value = value;
      html += table + "." + column + " " + operator + "&nbsp;" + value + "&nbsp;";
    } else {
      html += "ALL &nbsp;";
      obj.column = column;
    }
    if (!self.sqlContext.tables[self.currentTable])
      self.sqlContext.tables[self.currentTable] = { filters: {} };
    self.sqlContext.tables[self.currentTable].filters[filterId] = obj;

    html += "<button style='size: 10px' onclick='Lineage_linkedData_query.removeQueryElement(\"" + self.currentTable + "\",\"" + filterId + "\")'>X</button></div>";
    $("#LineageLinkedDataQueryParams_Filters").append(html);
    return obj;
  };


  self.removeQueryElement = function(table, filterId) {
    self.sqlContext.tables[table].filters[filterId];
    self.currentFilters.splice(index, 1);
    $("#" + index).remove();
  };


  self.executeQuery = function(output) {

    var columns = $("#LineageLinkedDataQueryParams_SQL_columnsTree").jstree().get_selected();
    if (!self.sqlContext.tables[self.currentTable])
      self.sqlContext.tables[self.currentTable] = {};
    self.sqlContext.tables[self.currentTable].selectColumns = columns;

    if (!output)
      output = "table";
    var selectStr = "";
    var fromStr = "";
    var whereStr = "";
    var joinStr = "";
var allSelectColumns=[]

    for (var table in self.sqlContext.tables) {
      if (fromStr != "")
        fromStr += ",";
      fromStr += table;

      if(self.sqlContext.tables[table].selectColumns) {
        self.sqlContext.tables[table].selectColumns.forEach(function(column) {
          if(allSelectColumns.indexOf(column)<0) {
            allSelectColumns.push(column)
            if (selectStr != "")
              selectStr += ",";
            selectStr += table + "." + column;
          }


        });
      }

      for (var filterId in self.sqlContext.tables[table].filters) {
        var filter = self.sqlContext.tables[table].filters[filterId];
        var filterStr = "";
        if (filter.operator == "contains") {
          filterStr = table + "." + filter.column + " like ('%" + filter.value + "')";
        } else if (filter.operator == "not contains") {
          filterStr = table + "." + filter.column + " not like ('%" + filter.value + "')";
        } else if (common.isNumber(filter.value)) {
          filterStr = table + "." + filter.column + " " + filter.operator + " " + filter.value;
        } else
          filterStr = table + "." + filter.column + " " + filter.operator + " '" + filter.value + "'";


        if (whereStr != "")
          whereStr += " AND ";
        whereStr += filterStr;

      }
      ;
    }
    if(selectStr=="")
      return alert ("you must select columns")

    var joinObj = self.databasesMap[self.currentDatabase];

    joinStr = joinObj.from.column.replace("_", ".") + "=" + joinObj.to.column.replace("_", ".") + " ";


    if (whereStr != "")
      whereStr += " AND ";
    whereStr += joinStr;

    var sqlQuery = "SELECT " + selectStr + " FROM " + fromStr + " WHERE " + whereStr;

    $("#LineageLinkedDataQueryParams_SqlDiv").html(sqlQuery);

    const params = new URLSearchParams({
      type: self.sqlContext.currentDataSource.type,
      dbName: self.sqlContext.currentDataSource.dbName,
      sqlQuery: sqlQuery
    });

    $.ajax({
      type: "GET",
      url: Config.apiUrl + "/kg/data?" + params.toString(),
      dataType: "json",

      success: function(data, _textStatus, _jqXHR) {
        if (data.size >= self.dataSizeLimit) return alert("too many values");
        if (output == "table") {


          var dataSet=[]
          var cols=[]
          allSelectColumns.forEach(function(column){
            cols.push({ title: column, defaultContent: "" });
          })



          data.forEach(function(item) {
            var line=[]
            allSelectColumns.forEach(function(column){
              line.push(item[column] || "")
            })
            dataSet.push(line)

          });
          $("#LineageLinkedDataQuery_tabs").tabs("option",{"active":1})
          Export.showDataTable  ( "LineageLinkedDataQuery_tableResult", cols, dataSet, null)


        }
      },
      error(err) {
        return alert(err.responseText);
      }

    });

  };

  return self;
})();
