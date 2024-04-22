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
import UI from "./UI.js";

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

    self.writeUserLog = function (user, tool, source) {
        var payload = {
            infos: user.identifiant + "," + tool + "," + source,
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

                        OntologyModels.registerSourcesModel(sources, function (err) {
                            callbackSeries(err);
                        });
                    },
                    
                    function (callbackSeries) {
                        MainController.parseUrlParam(function () {
                            callbackSeries();
                        });
                    },
                ],
                function (_err) {
                    //MainController.UI.configureUI();
                }
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
    
    self.UI = {
        initialGraphDivWitdh: 0,
        /*
        configureUI: function () {
            if (Config.currentProfile.forbiddenTools.indexOf("BLENDER") > -1) {
                $("#showBlenderButton").css("display", "none");
            } else {
                $("#showBlenderButton").css("display", "block");
            }
        },

        showSources: function (treeDiv, withCBX, sources, types, options, callback) {
            if (!options) {
                options = {};
            }
            var treeData = [];

            if (self.currentSourcesTree) {
                treeData = self.currentSourcesTree;
            } else {
                var distinctNodes = {};

                var distinctGroups = {};

                if (Config.currentProfile.allowedSourceSchemas.length == 0) {
                    return alert(Config.currentProfile.name + " has no schema type allowed. Contact administrator");
                }
                Config.currentProfile.allowedSourceSchemas.sort().forEach(function (item) {
                    if (!types || (types && types.indexOf(item) > -1)) {
                        treeData.push({
                            id: item,
                            text: item,
                            parent: "#",
                            type: item,
                        });
                    }
                });
                Object.keys(Config.sources)
                    .sort()
                    .forEach(function (sourceLabel, index) {
                        // self.initControllers();
                        if (sources && sources.indexOf(sourceLabel) < 0) {
                            return;
                        }
                        if (Config.sources[sourceLabel].isDraft) {
                            return;
                        }
                        if (Config.currentProfile.allowedSourceSchemas.indexOf(Config.sources[sourceLabel].schemaType) < 0) {
                            return;
                        }
                        Config.sources[sourceLabel].name = sourceLabel;

                        var parent = Config.sources[sourceLabel].schemaType;

                        var othersGroup = "OTHERS";

                        if (!types && !distinctGroups[othersGroup]) {
                            distinctGroups[othersGroup] = 1;
                            treeData.push({
                                id: othersGroup + "_" + parent,
                                text: "OTHERS",
                                type: "group",
                                parent: "#",
                            });
                        }

                        var group = Config.sources[sourceLabel].group;
                        if (group) {
                            var subGroups = group.split("/");
                            subGroups.forEach(function (subGroup, index) {
                                if (index > 0) {
                                    parent = subGroups[index - 1];
                                }
                                if (!distinctGroups[subGroup]) {
                                    distinctGroups[subGroup] = 1;
                                    treeData.push({
                                        id: subGroup,
                                        text: subGroup,
                                        type: "group",
                                        parent: parent,
                                    });
                                }
                                group = subGroup;
                            });
                        } else {
                            group = othersGroup + "_" + parent;
                            if (types) {
                                group = Config.sources[sourceLabel].schemaType;
                            } else {
                                group = Config.sources[sourceLabel].schemaType;
                            }
                        }

                        if (!distinctNodes[sourceLabel]) {
                            distinctNodes[sourceLabel] = 1;

                            if (!Config.sources[sourceLabel].color) {
                                Config.sources[sourceLabel].color = common.palette[index % common.palette.length];
                            }
                            //  console.log(JSON.stringify(jstreeData,null,2))
                            if (!types || types.indexOf(Config.sources[sourceLabel].schemaType) > -1) {
                                treeData.push({
                                    id: sourceLabel,
                                    text: sourceLabel,
                                    type: Config.sources[sourceLabel].schemaType,
                                    parent: group,
                                });
                            }
                        }
                    });
                self.currentSourcesTree = treeData;
            }
            var jstreeOptions = options;
            if (!jstreeOptions.contextMenu) {
                jstreeOptions.contextMenu = MainController.UI.getJstreeConceptsContextMenu();
            }
            if (withCBX) {
                jstreeOptions.withCheckboxes = withCBX;
            }

            if (!withCBX && !jstreeOptions.selectTreeNodeFn) {
                jstreeOptions.selectTreeNodeFn = function (evt, obj) {
                    if (!Config.sources[obj.node.id]) {
                        return;
                    }
                    $("#mainDialogDiv").dialog("close");
                    if (obj.node.parent == "#") {
                        //first level group by schema type
                        if (Config.currentProfile.allowedSourceSchemas.indexOf(obj.node.id) > -1) {
                            //schemaTypeNode
                            if (obj.node.id == "KNOWLEDGE_GRAPH") {
                                MainController.currentSchemaType = "OWL";
                            } else {
                                MainController.currentSchemaType = obj.node.id;
                            }

                            if ($("#sourcesTreeDiv").children().length > 0) {
                                $("#sourcesTreeDiv").jstree(true).open_node(obj.node.id);
                            }
                            return;
                        }
                    } else {
                        self.currentSource = obj.node.id;
                        MainController.UI.onSourceSelect(obj.event);
                    }
                };
            }

            if (!jstreeOptions.onOpenNodeFn) {
                jstreeOptions.onOpenNodeFn = function (evt, obj) {
                    if (obj.node.parent == "#") {
                        //first level group by schema type
                        if (Config.currentProfile.allowedSourceSchemas.indexOf(obj.node.id) > -1) {
                            //schemaTypeNode
                            if (obj.node.id == "KNOWLEDGE_GRAPH") {
                                MainController.currentSchemaType = "OWL";
                            } else {
                                MainController.currentSchemaType = obj.node.id;
                            }
                        }
                    }
                };
            }

            $("#Lineage_SearchSourceInput").bind("keydown", null, MainController.UI.searchInSourcesTree);
            options.searchPlugin = {
                case_insensitive: true,
                fuzzy: false,
                show_only_matches: true,
            };

            JstreeWidget.loadJsTree(treeDiv, treeData, options, function () {
                var openedTypes = Config.preferredSchemaType;
                //    if (types) openedTypes = types;
                //  $("#" + treeDiv).jstree(true).open_all(openedTypes);
                $("#" + treeDiv)
                    .jstree(true)
                    .open_node(openedTypes);
                if (callback) {
                    return callback();
                }
            });
        },

        searchInSourcesTree: function () {
            if (event.keyCode != 13 && event.keyCode != 9) {
                return;
            }
            var value = $("#Lineage_SearchSourceInput").val();
            $("#sourcesTreeDiv").jstree(true).search(value);
            //$("#Lineage_SearchSourceInput").val("");
        },
        showToolsList: function (treeDiv) {
            $(".max-height").height($(window).height() - 300);
            var treeData = [];
            for (var key in Config.userTools) {
                if (Config.userTools[key]) {
                    treeData.push({
                        id: key,
                        text: Config.userTools[key].label,
                        type: "tool",
                        parent: "#",
                        data: Config.userTools[key],
                    });
                }
            }
            //})
            JstreeWidget.loadJsTree(treeDiv, treeData, {
                selectTreeNodeFn: function (evt, obj) {
                    self.UI.initTool(obj.node.id);
                },
            });
        },

        initTool: function (toolId, callback) {
            self.currentTool = toolId;
            var toolObj = Config.userTools[toolId];
            self.currentSource = null;
            // MainController.initControllers();
            MainController.writeUserLog(authentication.currentUser, self.currentTool, "");
            Clipboard.clear();
            $("#accordion").accordion("option", { active: 1 });
            $("#mainDialogDiv").dialog("close");
            MainController.initControllers();
            var controller = Config.userTools[self.currentTool].controller;
            $("#currentSourceTreeDiv").html("");
            $("#sourceDivControlPanelDiv").html("");
            $("#actionDivContolPanelDiv").html("");
            $("#rightPanelDivInner").html("");

            if (true || toolId == "lineage" || toolId == "KGquery") {
                Lineage_sources.setAllWhiteBoardSources(true);
                $("#accordion").accordion("option", { active: 2 });
                MainController.currentSource = null;

                controller.onLoaded(function (err, result) {
                    if (callback) {
                        callback(err, result);
                    }
                });
                return;
            }

            self.UI.updateActionDivLabel();
            SearchWidget.targetDiv = "currentSourceTreeDiv";
            if (toolObj.noSource) {
                MainController.currentSource = null;
                MainController.UI.onSourceSelect();
            } else {
                var options = {
                    withCheckboxes: toolObj.multiSources,
                };
                SourceSelectorWidget.initWidget(null, "sourcesTreeDiv", false, null, null, options);

                if (Config.userTools[self.currentTool].multiSources) {
                    self.writeUserLog(authentication.currentUser, self.currentTool, "multiSources");
                    if (controller.onSourceSelect) {
                        controller.onSourceSelect(self.currentSource);
                    }
                }
            }
            if (Config.userTools[self.currentTool].toolDescriptionImg) {
                $("#graphDiv").html("<img src='" + Config.userTools[self.currentTool].toolDescriptionImg + "' width='600px' style='toolDescriptionImg'>");
            } else {
                $("#graphDiv").html(self.currentTool);
            }

            if (controller.onLoaded) {
                controller.onLoaded(function (err, result) {
                    if (callback) {
                        callback(err, result);
                    }
                });
            }
        },
        */
        getJstreeConceptsContextMenu: function () {
            if (!self.currentTool || !Config.userTools[self.currentTool]) {
                return;
            }
            var controller = Config.userTools[self.currentTool].controller;
            if (controller.jstreeContextMenu) {
                return controller.jstreeContextMenu();
            }
        },
        /*
        onSourceSelect: function (event) {
            if (Config.userTools[self.currentTool].multiSources) {
                return;
            }
            //  OwlSchema.currentSourceSchema = null;
            //   Collection.currentCollectionFilter = null;
            self.UI.updateActionDivLabel();
            self.writeUserLog(authentication.currentUser, self.currentTool, self.currentSource);
            var controller = Config.userTools[self.currentTool].controller;
            if (controller.onSourceSelect) {
                controller.onSourceSelect(self.currentSource, event);
            }
        },
        */
        message: function (message, stopWaitImg) {
            $("#messageDiv").html(message);
            if (stopWaitImg) {
                $("#waitImg").css("display", "none");
            }
            if (startWaitImg) {
                $("#waitImg").css("display", "block");
            }
        },
        /*
        setCredits: function () {
            var LateralPannelWidth = $("#lateralPanelDiv").width();
            var gifStart = $(window).width() / 2 - LateralPannelWidth + 100;
            var html =
                "<div style='position:absolute;left:" +
                gifStart +
                "px'>" +
                " " +
                " <img  src=\"images/souslesensVocables.gif\" style='background:url(images/circulargraph.png);background-repeat: no-repeat;display: block; '>" +
                "</div>";
            $("#graphDiv").html(html);
        },
P
        updateActionDivLabel: function (html) {
            if (html) {
                $("#toolPanelLabel").html(html);
            }
            if (self.currentSource) {
                $("#toolPanelLabel").html(Config.userTools[self.currentTool].label + " : " + self.currentSource);
            } else {
                $("#toolPanelLabel").html(Config.userTools[self.currentTool].label);
            }
        },

        onAccordionChangePanel: function (panelLabel) {
            if (self.previousPanelLabel && self.previousPanelLabel == "toolPanelDiv") {
                // Pass
            } else {
                //  $("#graphDiv").html("...");
            }
            self.previousPanelLabel = panelLabel;
        },

        showHideRightPanel: function (showOrHide) {
            var w = $(window).width();
            var show = false;
            if (!showOrHide) {
                var displayed = $("#rightPanelDivInner").css("display");
                if (displayed == "none") {
                    show = true;
                } else {
                    show = false;
                }
            } else if (showOrHide == "show") {
                show = true;
            } else if (showOrHide == "hide") {
                show = false;
            }
            if (show) {
                var lw = $("#rightPanelDivInner").width();
                if (false && lw < 100) {
                    return;
                }
                var newLeft = "" + (w - lw) + "px";
                $("#rightPanelDiv").css("position", "absolute");
                $("#rightPanelDivInner").css("display", "block");
                $("#rightPanelDiv").css("left", newLeft);
                $("#graphDiv").css("zIndex", 19);
                // $("#rightPanelDiv_searchIconInput").css("display", "block");
                $("#rightPanelDiv_searchIconInput").attr("src", "./icons/oldIcons/slideRight.png");
            } else {
                //hide panel
                $("#rightPanelDiv").css("position", "absolute");
                $("#rightPanelDivInner").css("display", "none");
                var newLeft = "" + w + "px";
                $("#rightPanelDiv").css("left", newLeft);
                // $("#rightPanelDiv_searchIconInput").css("display", "none");
                $("#rightPanelDiv_searchIconInput").attr("src", "./icons/oldIcons/search.png");
            }
        },
        showCurrentQuery: function () {
            $("#mainDialogDiv").html("<textarea style='width: 100%;height: 400px'>" + Sparql_proxy.currentQuery + "</textarea>");
            $("#mainDialogDiv").dialog("open");
        },
        copyCurrentQuery: function () {
            common.copyTextToClipboard(Sparql_proxy.currentQuery);
        },
        logout: function () {
            // eslint-disable-next-line no-console
            console.log("logout");
        },*/
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
                        UI.source = source;
                    }
                    UI.onToolSelect(tool);

                if (window.history.pushState && url.indexOf("localhost") < 0) {
                    var url = url.substring(0, url.indexOf("?"));
                    window.history.pushState({}, "SLS", url);
                }
            }
        } else {
            callback();
        }
    };

    return self;
})();

export default MainController;
window.MainController = MainController;
