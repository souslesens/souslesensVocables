Lineage_constraints=(function(){

    var self={}


    self.listAllRestrictions=function(){

        Sparql_OWL.getObjectRestrictions(Lineage_common.currentSource,null,{},function(err,result){
            if(err)
                return alert(err)

        })
    }

    self.graphAllRestrictions=function(){

       Lineage_classes.drawRestrictions(Lineage_common.currentSource,"all")



    }

    self.exportRestrictions=function(){

    }

    self.listAllProperties=function(){
Sparql_OWL.getSourceAllObjectProperties(Lineage_common.currentSource,function(err, result){
    if(err)
        return alert(err)
    result.results.bindings.forEach(function(item){


    })


})

    }

    self.graphAllProperties=function(){

        Lineage_classes.drawObjectProperties(Lineage_common.currentSource,"all")



    }

    self.exportProperties=function(){

    }



    return self;
})()