/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var SPARQL_endpoint = (function () {
    var self = {};

    self.currentSource;

    self.onLoaded = function () {
        //  self.currentSource = sourceLabel;
        // self.currentSparql_server = Config.sources[sourceLabel].sparql_server;
        //  self.currentSparql_server = Config.sparql_server.urlsparql_server;
        //localStorage.clear();

        $("#mainDialogDiv").dialog("option", "title", "SPARQL endpoint");
        //$("#mainDialogDiv").parent().css("left", "100px");
        $("#mainDialogDiv").css("width", "1000px");
        $("#graphDiv").html("");
        $("#mainDialogDiv").load("modules/tools/SPARQL/SPARQLendpoint.html", function () {
            
            $("#mainDialogDiv").dialog("open");
            self.initYasGui();
        });
    };

    self.initYasGui = function () {
        /*  var sourceObj = Config.sources[SPARQL_endpoint.currentSource];
        var url = sourceObj.sparql_server.url;
        var method = sourceObj.sparql_server.method;
        var graphUri = sourceObj.graphUri;*/

        var url = Config.sparql_server.url;
        var method = "POST";
        var graphUri = "";

        if (!method) method = "POST";
        var url2 = `${Config.apiUrl}/yasguiQuery?url=${url}&graphUri=${graphUri}&method=${method}&t=${new Date().getTime()}`;

        var yasgui = new Yasgui(document.getElementById("yasgui"), {
            requestConfig: { endpoint: url2 },
            copyEndpointOnNewTab: false,
        });

        yasgui.on("queryResponse", (Yasgui, tab) => {
            $(".yasr").css("overflow", "scroll");
            $(".yasr").css("height", "500px");
        });
    };

    return self;
})();

export default SPARQL_endpoint;

window.SPARQL_endpoint = SPARQL_endpoint;
