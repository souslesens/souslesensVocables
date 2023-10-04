var JoinTablesWidget=(function(){
  var self={}


  self.showJoinTablesDialog=  function(dataSource,fromTable, toTable) {

    $("#smallDialogDiv").dialog("open");
    $("#smallDialogDiv").load("snippets/lineage/linkedData/lineage_linkedData_joinTablesDialog.html", function() {


      $("#lineage_linkedData_join_databaseId").html(relation.fromColumn.database);
      $("#lineage_linkedData_join_fromClassId").html(relation.fromColumn.subjectLabel);
      $("#lineage_linkedData_join_toClassId").html(relation.toColumn.subjectLabel);

      $("#lineage_linkedData_join_fromTableId").html(relation.fromColumn.table);
      $("#lineage_linkedData_join_toTableId").html(relation.toColumn.table);

    })
  }


  return self;
})()


export default JoinTablesWidget;
window.JoinTablesWidget=JoinTablesWidget