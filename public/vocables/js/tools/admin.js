var Admin=(function(){


    var self={}


    self.onLoaded = function () {

    var html="<button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='Admin.refreshIndexes()'>refreshIndexes </button>"+
       " <button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='Admin.exportNT()'>export NT </button>"+
        " <button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='Admin.getClassesLineage()'>getLineage </button>"+
        " <br><button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='Admin.showUserSources()'>showUserSources </button>" + 
        " <br><button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='Admin.generateInverseRestrictionsDialog()'>generateInverseRestrictions </button>"

        $("#sourceDivControlPanelDiv").html(html)
    }

    self.onSourceSelect=function(){

    }
    self.refreshIndexes=function(){
        var sources = $('#sourcesTreeDiv').jstree(true).get_checked();
        if(!sources || sources.length==0)
            return alert(" no source selected")
        if(!confirm("refresh selected indexes"))
            return;
         //   var sources = $("#sourcesTreeDiv").jstree(true).get_checked();


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
    self.getClassesLineage=function(){
        //   var sources = $("#sourcesTreeDiv").jstree(true).get_checked();
        var sources = $('#sourcesTreeDiv').jstree(true).get_checked();
        if(sources.length!=1)
            return alert("select a single source")

        Sparql_OWL.getSourceTaxonomyAnClasses(sources[0],null,function(err, result){

        })
    }



    self.getUserAllowedSources=function(sourcesSelection) {
        var sources=[]
        Object.keys(Config.sources).sort().forEach(function (sourceLabel, index) {
            MainController.initControllers()
            if (sourcesSelection && sourcesSelection.indexOf(sourceLabel) < 0)
                return
            if (Config.sources[sourceLabel].isDraft)
                return;
            if (Config.currentProfile.allowedSourceSchemas.indexOf(Config.sources[sourceLabel].schemaType) < 0)
                return;
            if ((Config.currentProfile.allowedSources != "ALL" && Config.currentProfile.allowedSources.indexOf(sourceLabel) < 0) || Config.currentProfile.forbiddenSources.indexOf(sourceLabel) > -1)
                return;
            sources.push(sourceLabel)
        })
        return sources;

    }
    self.ShowProfilesSourcesMatrix=function(){


    }

    self.ShowUsersSourcesMatrix=function(){

    }

    self.showUserSources=function(callback) {
        var str = "";
var sources=[]
        Object.keys(Config.sources).sort().forEach(function (sourceLabel, index) {

            if (false &&  Config.sources[sourceLabel].isDraft)
                return;
            if (Config.currentProfile.allowedSourceSchemas.indexOf(Config.sources[sourceLabel].schemaType) < 0)
                return;
            if ((Config.currentProfile.allowedSources != "ALL" && Config.currentProfile.allowedSources.indexOf(sourceLabel) < 0) || Config.currentProfile.forbiddenSources.indexOf(sourceLabel) > -1)
                return;
            str += "<tr><td>"+sourceLabel + "</td><td>" + Config.sources[sourceLabel].group + "</td><td>" + Config.sources[sourceLabel].schemaType + "</td><td>" + Config.sources[sourceLabel].sparql_server.url +"</td><td>" + Config.sources[sourceLabel].graphUri + "</td></tr>"
            sources.push(sourceLabel)


        })

        if(callback)
            return callback(sources)
        var html="<div style='width: 800px;height: 800px ; overflow: auto'><table>"+str+"</table></div>"
        $("#graphDiv").html(html)

    }

    self.generateInverseRestrictionsDialog=function(){
        var sources = $('#sourcesTreeDiv').jstree(true).get_checked();
        if(sources.length!=1)
            return alert("select a single source")
        var html="<table>"
        html+="<tr><td>propId</td><td><input id='admin_propId' style='width:400px'></td></tr>"
        html+="<tr><td>inverse propId</td><td><input id='admin_inversePropId'  style='width:400px'></td></tr>"
       html+="</table>"
        html+="<button onclick='Admin.generateInverseRestrictions()'>Generate</button>"


        $("#mainDialogDiv").html(html)
        $("#mainDialogDiv").dialog("open")
    }


    self.generateInverseRestrictions=function(){
        var sources = $('#sourcesTreeDiv').jstree(true).get_checked();
        if(sources.length!=1)
            return alert("select a single source")
        var source=sources[0]
        var propId=$("#admin_propId").val()
        var inversePropId=$("#admin_inversePropId").val()
        if( propId && inversePropId){
            Sparql_OWL.generateInverseRestrictions(source,propId,inversePropId,function(err, result){
                if(err)
                    return alert(err)
                MainController.UI.message(result+" restrictions created")
            })

        }else
            alert( "missing propId or inversePropId")

    }









    return self;





})()