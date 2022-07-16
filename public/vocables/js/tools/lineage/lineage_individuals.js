var Lineage_individuals = (function() {
  var self = {};
  self.currentQuery = [];


  self.init=function(){
    self.currentQuery = [];
    $("#LineageIndividualsTab").load("snippets/lineage/lineageIndividualsSearchDialog.html", function() {
    })
  }
  self.setClass = function(node) {
    $("#Lineage_Tabs").tabs("option", "active", 3);
      self.currentClassNode =node;

      $("#LineageIndividualsQueryParams_className").html(self.currentClassNode.data.label);





   $(".LineageIndividualsQueryParams_panel").css("display","none")
    var nodeSource = Config.sources[self.currentClassNode.data.source];
    self.currentDataSource=nodeSource.dataSource
    if (nodeSource.dataSource && nodeSource.dataSource.type.indexOf("sql") > -1) {
      $("#LineageIndividualsQueryParams_panelSQL").css("display","block")

      self.sql.initModel( self.currentDataSource,function(err){
        if(err)
          return alert(err);
        self.sql.showTables(nodeSource.dataSource);
      })

    }


    //  $("#LineagePopup").dialog("open");
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

    $("#LineageIndividualsQueryParams_QueryDiv").append(html);
  };

  self.removeQueryElement = function(index) {
    self.currentQuery.splice(index, 1);
    $("#LineageIndividualsQueryParams_Elt_" + index).remove();
  };


  self.executeQuery = function() {
   if(self.currentDataSource.type.indexOf("sql")>-1){
     self.sql.executeQuery()
   }


  };


  self.onQueryParamsDialogCancel = function() {
    $("#LineagePopup").dialog("close");
  };


  self.sql = {
    initModel:function(dataSource,callback){
      if(dataSource.model)
        return callback();
      const params = new URLSearchParams({
        name:  self.currentDataSource.dbName,
        type:  self.currentDataSource.type,
      });

      $.ajax({
        type: "GET",
        url: Config.apiUrl + "/kg/model?" + params.toString(),
        dataType: "json",

        success: function(data, _textStatus, _jqXHR) {
          self.currentDataSource.model=data
          callback()

        },
        error: function(_err) {
          callback(err)

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
     var tableColumns=self.currentDataSource.model[table]

          common.fillSelectOptions("LineageIndividualsQueryParams_SQL_columnsSelect", tableColumns, true);



    },
    fillValuesSelect:function(){
      var table=$("#LineageIndividualsQueryParams_SQL_tablesSelect").val();
      var column=$("#LineageIndividualsQueryParams_SQL_columnsSelect").val();
      if(!table || !column)
        return alert( "select a tbale and a column")
        var SampleSizelimit=1000
      var sqlQuery = " select distinct column from " + table + " limit " + SampleSizelimit;
      if (self.currentDataSource.type == "sql.sqlserver") sqlQuery = " select distinct  "+column+" from " + table;


      const params = new URLSearchParams({
        type: self.currentDataSource.type,
        dbName: self.currentDataSource.dbName,
        sqlQuery: sqlQuery,
      });

      $.ajax({
        type: "GET",
        url: Config.apiUrl + "/kg/data?" + params.toString(),
        dataType: "json",

        success: function (data, _textStatus, _jqXHR) {
          if( data.size>=SampleSizelimit)
           return alert("too many values")
          common.fillSelectOptions("LineageIndividualsQueryParams_valuesSelect", data, true,column,column);
        },
        error(err) {
          return alert(err.responseText);
        },
      });

    }
    ,onValuesSelectChange:function(){
      var value=$("#LineageIndividualsQueryParams_valuesSelect").val()
      $("#LineageIndividualsQueryParams_value").val(value)
    }
    ,executeQuery:function(output){
      var SampleSizelimit=5000
      var table=$("#LineageIndividualsQueryParams_SQL_tablesSelect").val();
      var column=$("#LineageIndividualsQueryParams_SQL_columnsSelect").val();
      var operator=$("#LineageIndividualsQueryParams_operator").val();
      var value=$("#LineageIndividualsQueryParams_value").val();

      var sqlQuery = " select  * from " + table + " limit " + SampleSizelimit;
      if (self.currentDataSource.type == "sql.sqlserver") sqlQuery = " select top  "+SampleSizelimit+" * from " + table;

      if( value){

        var value2="";
        if(operator=="contains")
          value2=" LIKE ('%"+value+"%')"
      }
      sqlQuery +=" where "+column +value2;


      const params = new URLSearchParams({
        type: self.currentDataSource.type,
        dbName: self.currentDataSource.dbName,
        sqlQuery: sqlQuery,
      });

      $.ajax({
        type: "GET",
        url: Config.apiUrl + "/kg/data?" + params.toString(),
        dataType: "json",

        success: function (data, _textStatus, _jqXHR) {
          if( data.size>=SampleSizelimit)
            return alert("too many values")
         if(output=="table"){

         }
        },
        error(err) {
          return alert(err.responseText);
        },
      });

    }


  };

  return self;
})();
