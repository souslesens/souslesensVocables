Lineage_constraints=(function(){

    var self={}


    self.listAll=function(){

        Sparql_OWL.getObjectRestrictions(Lineage_common.currentSource,null,{},function(err,result){
            if(err)
                return alert(err)

        })
    }

    self.graphAll=function(){

       Lineage_classes.drawRestrictions(Lineage_common.currentSource,"all")



    }

    self.export=function(){

    }



    return self;
})()