import SQLquery_run from "../KGquery/sql/SQLquery_run.js";

var KGcreator_joinTables = (function () {
    var self = {};

    self.showJoinTablesDialog = function (dataSourceConfig, fromTable, toTable, validateFn) {
        self.validateFn = validateFn;

        $("#smallDialogDiv").load("modules/tools/KGcreator/html/joinTablesDialog.html", function () {
            $("#smallDialogDiv").dialog("open");
            $("#joinTablesWidgetDialog_databaseId").html(dataSourceConfig.dbName);

            $("#joinTablesWidgetDialog_fromTableId").html(fromTable);
            $("#joinTablesWidgetDialog_toTableId").html(toTable);
            SQLquery_run.getDBmodel(dataSourceConfig, function (err, model) {
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

    self.viewTableSample = function () {};

    self.showJoinTableColumns = function (table) {
        common.fillSelectOptions("joinTablesWidgetDialog_joinColumnSelect", self.model[table], true);
    };

    self.joinTable = function (target) {
        var joinColumn = $("#joinTablesWidgetDialog_joinColumnSelect").val();
        if (target == "from") {
            self.joinFromColumn = joinColumn;
        } else {
            self.joinToColumn = joinColumn;
        }
    };

    self.testJoin = function () {
        var joinObj = self.getJoinObjectFromUI();
        var sql = "SELECT top 10 * from " + SQLquery_run.getFromSql(joinObj);
        alert("coming soon");
    };
    self.showJoin = function () {
        var joinObj = self.getJoinObjectFromUI();
        var sql = "SELECT top 10 * from " + SQLquery_run.getFromSql(joinObj);
        $("#joinTablesWidgetDialog_sqlJoinDiv").html(sql);
    };

    self.saveJoinMapping = function () {
        var sql = self.getJoinObjectFromUI();
        self.validateFn(null, sql);
        $("#smallDialogDiv").dialog("close");
    };

    self.getJoinObjectFromUI = function () {
        var joinObj = {
            fromTable: $("#joinTablesWidgetDialog_fromTableId").html(),
            toTable: $("#joinTablesWidgetDialog_toTableId").html(),
            joinTable: $("#joinTablesWidgetDialog_joinTableSelect").val(),
            fromColumn: $("#joinTablesWidgetDialog_fromColumnSelect").val(),
            toColumn: $("#joinTablesWidgetDialog_toColumnSelect").val(),
            joinFromColumn: self.joinFromColumn,
            joinToColumn: self.joinToColumn,
        };
        return joinObj;
    };

    return self;
})();

export default KGcreator_joinTables;
window.KGcreator_joinTables = KGcreator_joinTables;
