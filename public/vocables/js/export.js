var Export=(function(){



    var self={}

    self.showExportDatDialog=function(source,options,callback){

$("#mainDialogDiv").load("snippets/exportToTableDialog.html")
        $("#mainDialogDiv").dialog("open")
        setTimeout(function(){
            var jstreeData=[];
            Sparql_generic.getDistinctPredicates(source,{},function(err, result){
                result.forEach(function(item){
                    jstreeData.push({
                        id:item.p.value,
                        text:item.pLabel.value,
                        parent:"#"
                    })
                })
                var options={withCheckboxes:true};
                common.jstree.loadJsTree("exportTable_jstreeDiv",jstreeData,options);
            })





        },200)





    }



    self.cancelExportDialog=function(){

    }











    return self;





})()