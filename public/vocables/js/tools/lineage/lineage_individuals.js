
var Lineage_individuals=(function(){

 var self={}


  self.showSearchDialog=function(){
    $("#LineagePopup").load("snippets/lineage/lineageIndividualsSearchDialog.html",function(){

$("#LineageIndividualsQueryParamsDialog").css("display","none")

    })
    $("#LineagePopup").dialog("open")
  }




return self;


})()