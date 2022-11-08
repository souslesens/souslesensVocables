var Lineage_linkedData_query = (function () {
    var self = {};

    self.init = function () {
        $("#LineageLinkedDataRelationsDiv").load("snippets/lineage/lineage_linkedData_queryRelations.html", function () {
            Lineage_linkedData_mappings.getSourceJoinsMappings(Lineage_sources.activeSource, {}, function (err, joinsMap) {
                if (err) return alert(err.responseText);
                var joins = [];
                self.joinsMap=joinsMap
                for (var join in joinsMap) {
                    var joinObj = joinsMap[join];
                    joins.push({ id: join, label: joinObj.fromLabel + "-" + joinObj.propLabel + "->" + joinObj.toLabel });
                }

                common.fillSelectOptions("lineage_linkedata_queryRelations_relationsSelect", joins, null, "label", "id");
            });
        });
    };

    self.showRelationFilterDialog=function(relation){
        $("#mainDialogDiv").dialog("open")
        $("#mainDialogDiv").load("snippets/lineage/lineageLinkedDataRelationFilter.html",function(){


            var databases={}

          for(var join in self.joinsMap){
              var joinObj= self.joinsMap[join]
              if(!databases[joinObj.database])
                  databases[joinObj.database]={}
              if(!databases[joinObj.database].from)
                  databases[joinObj.database].from={id:joinObj.from,label:joinObj.fromLabel}
            if(!databases[joinObj.database].to)
                databases[joinObj.database].to={id:joinObj.to,label:joinObj.toLabel}
            self.databasesMap=databases

        }
          common.fillSelectOptions("LineageLinkedDataQueryParams_database",Object.keys(databases))



        })
    }
    self.onDatabaseChange=function(database){
        var classes=[
          self.databasesMap[database].from,
            self.databasesMap[database].to,

        ]

        common.fillSelectOptions("LineageLinkedDataQueryParams_classes",classes, null,"label","id")


    }
    self.onColumnChange=function(database){

    }

    return self;
})();
