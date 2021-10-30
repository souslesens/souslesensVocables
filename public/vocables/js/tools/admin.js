var Admin=(function(){


    var self={}


    self.onLoaded = function () {
    var html="<button onclick='Admin.refreshIndexes()'>refreshIndexes </button>"+
       " <button onclick='Admin.exportNT()'>export NT </button>"
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

    self.exportNT=function(){

        //   var sources = $("#sourcesTreeDiv").jstree(true).get_checked();
        var sources = $('#sourcesTreeDiv').jstree(true).get_checked();
if(sources.length!=1)
    return alert("select a single source")

        $("#waitImg").css("display", "block");
        MainController.UI.message(sources[0]+" processing...")
        $.ajax({
            type: "GET",
            url: "/ontology/"+sources[0],
            dataType: "text/plain",
            success: function (data2, textStatus, jqXHR) {
               // no success see index.js

            }
            , error: function (err) {// bizarre !!!
                download(err.responseText, sources[0]+".txt", "text/plain");
               MainController.UI.message(sources[0]+" downloaded")


            }


        })







    }











    return self;





})()