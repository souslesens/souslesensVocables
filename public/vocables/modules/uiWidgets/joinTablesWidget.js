var JoinTablesWidget = (function() {
  var self = {};


  self.showJoinTablesDialog = function(dataSourceConfig, fromTable, toTable) {

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
    common.fillSelectOptions("joinTablesWidgetDialog_fromColumnSelect", self.model[table], true);
  };
  self.testJoin = function() {

  };
  self.saveJoinMapping = function() {

  };


  return self;
})();


export default JoinTablesWidget;
window.JoinTablesWidget = JoinTablesWidget