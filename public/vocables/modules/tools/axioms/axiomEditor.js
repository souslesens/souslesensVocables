

const AxiomEditor=(function(){
    var self={}

    self.init=function(divId){
        $("#smallDialogDiv").dialog("open")
       $("#smallDialogDiv").load("modules/tools/axioms/axiomEditor.html",function(x,y){


       })




    }

    self.onInputChar=function(text){
       if(text.length>2){
          self.showSuggestions(text,function(err,result){
              if(err)
                  alert(err)
          })
       }


    }


    self.showSuggestions=function(text,callback){
        var options={}
        const params = new URLSearchParams({
            source: Lineage_sources.activeSource,
            lastToken: text,
            options: JSON.stringify(options),
        });

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/axioms/suggestion?" + params.toString(),
            dataType: "json",

            success: function (data, _textStatus, _jqXHR) {
                callback(null, data);
            },
            error(err) {
                callback(err.responseText);
            },
        });

    }






    return self;


})()

export default AxiomEditor;
window.AxiomEditor=AxiomEditor