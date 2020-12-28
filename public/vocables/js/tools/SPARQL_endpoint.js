var SPARQL_endpoint = (function () {


    var self = {}

    self.currentSource

    self.onSourceSelect = function (sourceLabel) {
        self.currentSource=sourceLabel
        self.currentSparql_server=Config.sources[sourceLabel].sparql_server
   localStorage.clear()
     //   var html = "<iframe id='sparql_iframe' style='width:100%;height:100%' src='snippets/SPARQLendpoint.html?"+new Date()/1+"'></iframe>"
      //  $("#graphDiv").html(html);
        $("#graphDiv").html("")
        $("#graphDiv").load('snippets/SPARQLendpoint.html')
        setTimeout(function(){
            self.initYasGuy();
        },1000)


    }

    self.initYasGuy=function(){
        var sourceObj=Config.sources[SPARQL_endpoint.currentSource]
        var url=sourceObj.sparql_server.url
        var method=sourceObj.sparql_server.method;
        var graphUri=sourceObj.graphUri;

        if(!method)
            method="POST"
        var url2= "/elastic?SPARQLquery=1&url="+url+"&graphUri="+graphUri+"&method="+method+"&t="+new Date()/1;

        const yasgui = new Yasgui(document.getElementById("yasgui"), {
            requestConfig: { endpoint:url2},
            copyEndpointOnNewTab: false
        });

    }

    return self;


})()
