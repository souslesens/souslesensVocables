/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import UserDataWidget from "../../uiWidgets/userDataWidget.js";
import MainController from "../../shared/mainController.js";
import common from "../../shared/common.js";

var SPARQL_endpoint = (function () {
    var self = {};

    self.currentSource;

    self.onLoaded = function () {
        //  self.currentSource = sourceLabel;
        // self.currentSparql_server = Config.sources[sourceLabel].sparql_server;
        //  self.currentSparql_server = Config.sparql_server.urlsparql_server;
        //localStorage.clear();

        //$("#mainDialogDiv").parent().css("left", "100px");
        $("#mainDialogDiv").css("width", "1000px");
        $("#graphDiv").html("");
        $("#mainDialogDiv").load("modules/tools/SPARQL/SPARQLendpoint.html", function () {
            UI.openDialog("mainDialogDiv", { title: "SPARQL endpoint" });
            UI.clampAndCenterDialog("mainDialogDiv");
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

        self.yasgui = new Yasgui(document.getElementById("yasgui"), {
            requestConfig: { endpoint: url2 },
            copyEndpointOnNewTab: false,
        });

        self.yasgui.on("queryResponse", (Yasgui, tab) => {
            $(".yasr").css("overflow", "scroll");
            $(".yasr").css("height", "500px");
        });
        self.yasgui.on("queryError", (Yasgui, tab, err) => {
            MainController.errorAlert(err);
        });
    };
    self.saveQuery = function () {
        if (!self.yasgui) {
            return alert("SPARQL editor not initialized");
        }
        var queryText = self.yasgui.getTab().getYasqe().getValue();
        if (!queryText || !queryText.trim()) {
            return alert("Nothing to save");
        }
        var data = { sparqlQuery: queryText };
        UserDataWidget.showSaveDialog("sparqlQuery", data, null, { title: "Save SPARQL Query" ,zIndex: 100}, function (err, result) {
            if (err) {
                return MainController.errorAlert(err);
            }
            alert("Query saved — id: " + result.id + ", name: " + result.label);
        });
    };

    self.getLinkSPARQLAPI = function (userDataId) {
        var url = Config.apiUrl + "/users/data/{id}/exec";
        var baseUrl = window.location.origin;
        url = url.replace("{id}", userDataId);
        return baseUrl + url;
    };

    self.loadQuery = function () {
        if (!self.yasgui) {
            return alert("SPARQL editor not initialized");
        }
        var additionalContextMenu = [
            {
                label: "Get API link",
                action: function (node) {
                    var link = self.getLinkSPARQLAPI(node.id);
                    common.copyTextToClipboard(link, function (err) {
                        if (err) {
                            return MainController.errorAlert(err);
                        }
                        alert("Link copied to clipboard: " + link);
                    });
                },
            },
        ];
        UserDataWidget.showListDialog(
            null,
            {
                filter: { data_type: "sparqlQuery", data_tool: "SPARQL" },
                removeSaveDiv: true,
                title: "Load SPARQL Query",
                additionalContextMenu: additionalContextMenu,
                zIndex: 100,
            },
            function (err, result) {
                if (err) {
                    return MainController.errorAlert(err);
                }
                if (!result || !result.id) {
                    return;
                }
                UserDataWidget.loadUserDatabyId(result.id, function (err, userData) {
                    if (err) {
                        return MainController.errorAlert(err);
                    }
                    var queryText = userData.data_content && userData.data_content.sparqlQuery;
                    if (!queryText) {
                        return alert("No SPARQL query found in saved data");
                    }
                    self.yasgui.addTab(true, {
                        yasqe: { value: queryText },
                        name: userData.data_label || "Loaded query",
                    });
                });
            },
        );
    };

    return self;
})();

export default SPARQL_endpoint;

window.SPARQL_endpoint = SPARQL_endpoint;
