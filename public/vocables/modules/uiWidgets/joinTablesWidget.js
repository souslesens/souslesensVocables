var JoinTablesWidget = (function() {
  var self = {};


  self.showJoinTablesDialog = function(dataSourceConfig, fromTable, toTable, validateFn) {
    self.validateFn = validateFn;

    $("#smallDialogDiv").dialog("open");
    $("#smallDialogDiv").load("snippets/joinTablesWidgetDialog.html", function() {


      $("#joinTablesWidgetDialog_databaseId").html(dataSourceConfig.dbName);


      $("#joinTablesWidgetDialog_fromTableId").html(fromTable);
      $("#joinTablesWidgetDialog_toTableId").html(toTable);
      self.getDBmodel(dataSourceConfig, function(err, model) {
        if (err) {
          return alert(err);
        }
        self.model = model;

        var tables = Object.keys(model);
        common.fillSelectOptions("joinTablesWidgetDialog_joinTableSelect", tables, true);
        common.fillSelectOptions("joinTablesWidgetDialog_fromColumnSelect", model[fromTable], true);
        common.fillSelectOptions("joinTablesWidgetDialog_toColumnSelect", model[toTable], true);


      });

    });
  };


  self.getDBmodel = function(dataSourceConfig, callback) {
    const params = new URLSearchParams({
      name: dataSourceConfig.dbName,
      type: dataSourceConfig.type
    });
    $.ajax({
      type: "GET",
      url: Config.apiUrl + "/kg/model?" + params.toString(),
      dataType: "json",
      success: function(data, _textStatus, _jqXHR) {
        return callback(null, data);
      },
      error: function(err) {
        if (callback) {
          return callback(err);
        }
        alert(err.responseText);
      }
    });
  };

  self.viewTableSample = function() {

  };

  self.showJoinTableColumns = function(table) {
    common.fillSelectOptions("joinTablesWidgetDialog_joinColumnSelect", self.model[table], true);
  };


  self.joinTable = function(target) {
    var joinColumn = $("#joinTablesWidgetDialog_joinColumnSelect").val();
    if (target == "from") {
      self.joinFromColumn = joinColumn;
    }
    else {
      self.joinToColumn = joinColumn;
    }
  };

  self.testJoin = function() {
    var sql = self.getJoinSql();
    alert("coming soon");

  };
  self.showJoin = function() {
    var sql = self.getJoinSql();
    $("#joinTablesWidgetDialog_sqlJoinDiv").html(sql);
  };

  self.saveJoinMapping = function() {
    var sql = self.getJoinObjectFromUI();
    self.validateFn(null, sql);
    $("#smallDialogDiv").dialog("close");
  };


  self.getJoinObjectFromUI = function() {
    var joinObj = {
      fromTable: $("#joinTablesWidgetDialog_fromTableId").html(),
      toTable: $("#joinTablesWidgetDialog_toTableId").html(),
      joinTable: $("#joinTablesWidgetDialog_joinTableSelect").val(),
      fromColumn: $("#joinTablesWidgetDialog_fromColumnSelect").val(),
      toColumn: $("#joinTablesWidgetDialog_toColumnSelect").val(),
      joinFromColumn: self.joinFromColumn,
      joinToColumn: self.joinToColumn

    };
    return joinObj;
  };

  self.getJoinSql = function() {
    var joinObj = self.getJoinObjectFromUI();
    var sql = "SELECT top 10 * from ";
    sql += joinObj.fromTable + " ";

    if (joinObj.joinTable) {
      sql += " LEFT OUTER JOIN " + joinObj.joinTable + " ON " + joinObj.fromTable + "." + joinObj.fromColumn + "=" + joinObj.joinTable + "." + joinObj.joinFromColumn;
      sql += " LEFT OUTER JOIN " + joinObj.toTable + " ON " + joinObj.joinTable + "." + joinObj.joinFromColumn + "=" + joinObj.toTable + "." + joinObj.toColumn;
    }
    else {
      sql += " LEFT OUTER JOIN " + joinObj.toTable + " ON " + joinObj.fromTable + "." + joinObj.fromColumn + "=" + joinObj.toTable + "." + joinObj.toColumn;

    }

    return sql;


  };


  return self;
})();


export default JoinTablesWidget;
window.JoinTablesWidget = JoinTablesWidget;