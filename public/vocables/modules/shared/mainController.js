import Sparql_common from "../sparqlProxies/sparql_common.js";
import common from "./common.js";
import OntologyModels from "./ontologyModels.js";
import authentication from "./authentification.js";
import Clipboard from "./clipboard.js";
import Lineage_sources from "../tools/lineage/lineage_sources.js";
import Sparql_OWL from "../sparqlProxies/sparql_OWL.js";
import Sparql_SKOS from "../sparqlProxies/sparql_SKOS.js";
import SourceSelectorWidget from "../uiWidgets/sourceSelectorWidget.js";
import GraphLoader from "./graphLoader.js";
import UI from "../../modules/shared/UI.js";

/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var MainController = (function () {
    var self = {};

    self.currentTool = null;
    self.currentSchemaType = null;
    self.currentSource = null;
    //self.toolsNeedSource = ["lineage", "KGquery", "KGcreator", "TimeLine"];

    self.initConfig = function (callback) {
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/config",
            dataType: "json",
            success: function (serverConfig, _textStatus, _jqXHR) {
                Config.default_lang = serverConfig.default_lang || "en";
                Config.sparql_server = serverConfig.sparql_server;
                Config.wiki = serverConfig.wiki;
                Config.sentryDsnJsFront = serverConfig.sentryDsnJsFront;
                Config.currentTopLevelOntology = serverConfig.currentTopLevelOntology;
                Config.tools_available = serverConfig.tools_available;
                Config.theme = serverConfig.theme;
                //  Config.userTools = serverConfig.tools_available;

                // display version number
                $("#souslesensversion").html(serverConfig.version);

                return callback();
            },
            error: function (err) {
                return callback(err);
            },
        });
    };

    self.loadSources = function (sourcesFile, callback) {
        var _payload = {
            getSources: 1,
        };

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/sources",
            dataType: "json",
            success: function (data_, _textStatus, _jqXHR) {
                const data = data_.resources;
                for (var source in data) {
                    if (data[source].sparql_server && data[source].sparql_server.url == "_default") {
                        data[source].sparql_server.url = Config.sparql_server.url;
                    }
                }
                Config.sources = data;

                Config.sources["_defaultSource"] = Config._defaultSource;
                if (callback) {
                    return callback();
                }
            },
            error: function (err) {
                alert("cannot load sources");
                // eslint-disable-next-line no-console
                console.log(err);
                if (callback) {
                    return callback();
                }
            },
        });
    };
    self.loadProfiles = function (callback) {
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/profiles",
            dataType: "json",
            success: function (data, _textStatus, _jqXHR) {
                Config.profiles = data.resources;
                if (callback) {
                    return callback();
                }
            },
            error: function (err) {
                alert("cannot load profiles");
                // eslint-disable-next-line no-console
                console.log(err);
                if (callback) {
                    return callback();
                }
            },
        });
    };
    self.writeUserLog = function (user, tool, source, action = "") {
        var payload = {
            infos: `${user.identifiant},${tool},${source},${action}`,
        };
        $.ajax({
            type: "POST",
            url: Config.apiUrl + "/logs",
            data: payload,
            dataType: "json",

            success: function (_data, _textStatus, _jqXHR) {
                // Pass
            },
            error: function (err) {
                // eslint-disable-next-line no-console
                console.log(err);
            },
        });
    };
    function groupWithinCurrentProfile(valueCheckedAgainst) {
        return Object.entries(Config.profiles).filter(([_key, val]) => val.name === valueCheckedAgainst);
    }
    self.onAfterLogin = function (callback) {
        if (!authentication.currentUser) {
            return alert(" no user identified");
        }
        Config.clientCache = {};
        var groups = authentication.currentUser.groupes;

        MainController.loadProfiles(function (_err, _result) {
            //  Config.currentProfile=Config.profiles["reader_all"]
            groups.forEach(function (group) {
                if (groupWithinCurrentProfile(group).length) {
                    return (Config.currentProfile = groupWithinCurrentProfile(group)[0][1]);
                }
            });

            async.series(
                [
                    function (callbackSeries) {
                        var paramsMap = common.getUrlParamsMap();
                        if (paramsMap.sourcesFile) {
                            Config.currentProfile.sourcesFile = paramsMap.sourcesFile;
                        }
                        if (paramsMap.tool && paramsMap.source) {
                            Config.userTools[paramsMap.tool].urlParam_source = paramsMap.source;
                        }
                        callbackSeries();
                    },

                    function (callbackSeries) {
                        MainController.loadSources(null, function (_err, _result) {
                            callbackSeries(_err);
                        });
                    },
                    function (callbackSeries) {
                        MainController.initControllers();
                        callbackSeries(_err);
                    },

                    function (callbackSeries) {
                        var sources = Object.keys(Config.ontologiesVocabularyModels);
                        // return callbackSeries();

                        OntologyModels.registerSourcesModel(sources, null,function (err) {
                            callbackSeries(err);
                        });
                    },

                    function (callbackSeries) {
                        MainController.parseUrlParam(function () {
                            callbackSeries();
                        });
                    },
                ],
                function (_err) {}
            );
            callback(_err);
        });
    };
    self.initControllers = function () {
        Object.keys(Config.sources)
            .sort()
            .forEach(function (sourceLabel) {
                if (!Config.sources[sourceLabel].controllerName) {
                    var controllerName = Config.sources[sourceLabel].controller;
                    Config.sources[sourceLabel].controllerName = controllerName;
                    Config.sources[sourceLabel].controller = window[controllerName];
                }
            });
    };
    self.initTool = function (toolId, callback) {
        MainController.writeUserLog(authentication.currentUser, self.currentTool, self.currentSource || "");
        var toolObj = Config.userTools[toolId];
        self.initControllers();
        Clipboard.clear();
        Lineage_sources.loadedSources = {};
      /*  if(!Config.userTools[toolId].controller)
            Config.userTools[toolId].controller= window[toolId]*/
        if (Config.userTools[toolId].controller.onLoaded) {
            Config.userTools[toolId].controller.onLoaded();
        } else {
            if (true) {
                var url = window.location.href;
                var p = url.indexOf("?");
                if (p > -1) {
                    url = url.substring(0, p);
                }
                url = url.replace("index_r.html", "");
                url += "?tool=" + toolId;
                window.location.href = url;
            }
        }
    };
    self.onToolSelect = function (toolId, event, callback) {
        if (event) {
            var clickedElement = event.target;
            // if class
            if (clickedElement.className == "Lineage_PopUpStyleDiv") {
                var toolId = $(clickedElement).children()[1].innerHTML;
            } else {
                if (clickedElement.id == "toolsSelect") {
                    return;
                } else if (clickedElement.innerHTML) {
                     toolId = clickedElement.innerHTML;
                } else {
                     toolId = clickedElement.nextSibling.innerHTML;
                }
            }
        }

        if (self.currentTool != null) {
            if (Config.userTools[self.currentTool].controller.unload) {
                try {
                    Config.userTools[self.currentTool].controller.unload();
                } catch (e) {
                    console.log(e);
                }
            }
        }
        self.currentTool = toolId;

        if (toolId != "lineage" && !Config.userTools[toolId].noSource) {
            Lineage_sources.registerSource = Lineage_sources.registerSourceWithoutDisplayingImports;
            $('#Lineage_graphEditionButtons').hide();
        }
        $("#currentToolTitle").html('');
        if (UI.currentTheme["@" + toolId + "-logo"]) {
            $("#currentToolTitle").prepend(`<button class="${toolId}-logo slsv-invisible-button" style="height:41px;width:41px;">`);
        }else{
            $("#currentToolTitle").html(toolId);
        }
        MainController.currentTool = toolId;

        if (!Config.userTools[toolId].noSource) {
            if (self.currentSource == null) {
                SourceSelectorWidget.showSourceDialog(true);
            } else {
                SourceSelectorWidget.initSource(self.currentSource);
            }
        } else {
            UI.cleanPage();
            self.initTool(toolId);
            $("#mainDialogDiv").dialog({
                close: function () {
                    UI.homePage();
                }
            });
            //Config.userTools[self.currentTool].controller.unload=UI.homePage;
            self.currentSource = null;
        }

        // set or replace tool in url params
        const params = new URLSearchParams(document.location.search);
        if (toolId != "ConfigEditor") {
            params.delete("tab");
        }
        params.set("tool", toolId);
        if (self.currentSource) {
            params.set("source", self.currentSource);
        } else {
            params.delete("source");
        }

        window.history.replaceState(null, "", `?${params.toString()}`);

        if (callback) {
            callback();
        }
    };

    self.test = function () {
        //   bc.postMessage("bc")
    };
    self.parseUrlParam = function (callback) {
        var paramsMap = common.getUrlParamsMap();

        // old or new url
        if (paramsMap.tool) {
            var tool = paramsMap["tool"];

            if (tool) {
                var source = paramsMap["source"];

                var url = window.location.href;

                // if tool available load it in responsive
                if (source) {
                    self.currentSource = source;
                }
                MainController.onToolSelect(tool);
                /*
                if (window.history.pushState && url.indexOf("localhost") < 0) {
                    var url = url.substring(0, url.indexOf("?"));
                    window.history.pushState({}, "SLS", url);
                }*/
            }
        } else {
            callback();
        }
    };

    return self;
})();

export default MainController;
window.MainController = MainController;
