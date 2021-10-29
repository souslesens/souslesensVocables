var Admin=(function(){


    var self={}


    self.onLoaded = function () {
    var html="<button onclick='Admin.refreshIndexes()'>refreshIndexes </button>"
        $("#sourceDivControlPanelDiv").html(html)
    }

    self.onSourceSelect=function(){

    }
    self.refreshIndexes=function(){
        if(!confirm("refresh selected indexes"))
            return;
         //   var sources = $("#sourcesTreeDiv").jstree(true).get_checked();
            var sources = $('#sourcesTreeDiv').jstree(true).get_checked();

       async.eachSeries(sources,function(source,callbackEach){
          if (!Config.sources[source] || !Config.sources[source].schemaType)
             return callbackEach();
           $("#waitImg").css("display", "block");
           Standardizer.generateElasticIndex(source, function(err,result){

               MainController.UI.message("DONE " + source, true)
               callbackEach(err,)
           })


        },function(err){
           if(err)
              return MainController.UI.message(err, true)
           MainController.UI.message("ALL DONE", true)

       })




    }











    return self;





})()