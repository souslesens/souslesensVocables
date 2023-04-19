import Sparql_common from "./sparqlProxies/sparql_common.js";
import common from "./common.js";
import OntologyModels from "./ontologyModels.js";
import authentication from "./authentification.js";
import Clipboard from "./clipboard.js";
import Lineage_sources from "./tools/lineage/lineage_sources.js";
import Sparql_OWL from "./sparqlProxies/sparql_OWL.js";
import Sparql_SKOS from "./sparqlProxies/sparql_SKOS.js";

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
                Config.default_lang = serverConfig.default_lang;
                Config.default_sparql_url = serverConfig.default_sparql_url;
                Config.wiki = serverConfig.wiki;
                Config.sentryDsnJsFront = serverConfig.sentryDsnJsFront;
                Config.currentTopLevelOntology = serverConfig.currentTopLevelOntology;
                Config.tools_available = serverConfig.tools_available;

                // display version number
                $("#souslesensversion").html(serverConfig.version);

                return callback();
            },
            error: function (err) {
                return callback(err);
            },
        });
    };

    /* self.loadSourcesMappings = function (callback) {
      $.ajax({
          type: "GET",
          url: `${Config.apiUrl}/data/file?dir=mappings&name=sourcesLinkedMappings.json`,
          dataType: "json",

          success: function (data_, _textStatus, _jqXHR) {
              try {
                  var json = JSON.parse(data_);
              } catch (e) {
                  callback(e);
              }
              callback(null, json);
          },
          error(err) {
              callback(err);
          },
      });
  };*/

    self.loadSources = function (sourcesFile, callback) {
        var _payload = {
            getSources: 1,
        };

        var sourcesFileParam = "";
        if (sourcesFile) {
            sourcesFileParam = "?sourcesFile=" + sourcesFile;
        } else if (Config.currentProfile.sourcesFile) {
            sourcesFileParam = "?sourcesFile=" + Config.currentProfile.sourcesFile;
        }
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/sources" + sourcesFileParam,
            dataType: "json",
            success: function (data_, _textStatus, _jqXHR) {
                const data = data_.resources;
                for (var source in data) {
                    if (data[source].sparql_server && data[source].sparql_server.url == "_default") {
                        data[source].sparql_server.url = Config.default_sparql_url;
                    }
                    //manage imports that are not declared as sources in sources.json : create in memory sources

                    if (false) {
                        if (data[source].imports) {
                            var imports2 = [];
                            data[source].imports.forEach(function (item) {
                                if (item.graphUri) {
                                    var importSourceName = Sparql_common.getLabelFromURI(item.graphUri);
                                    if (!item.sparql_server) {
                                        item.sparql_server = data[source].sparql_server;
                                    } else if (item.sparql_server.url == "_default") {
                                        item.sparql_server.url = Config.default_sparql_url;
                                    }

                                    item.controller = data[source].controller;
                                    if (!item.topClassFilter) {
                                        item.topClassFilter = data[source].topClassFilter;
                                    }
                                    data[importSourceName] = item;
                                    imports2.push(importSourceName);
                                }
                            });
                            if (imports2.length > 0) {
                                data[source].imports = imports2;
                            }
                        }
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
        /*   $.getJSON("config/sources.json", function (json) {
       Config.sources = json;
      for(var sourceLabel in Config.sources){
           if(Config.sources[sourceLabel].sparql_server && Config.sources[sourceLabel].sparql_server.url=="_default")
               Config.sources[sourceLabel].sparql_server.url=Config.default_sparql_url
       }
       if (callback)
           return callback()

   });*/
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

    self.onAfterLogin = function () {
        if (!authentication.currentUser) {
            return alert(" no user identified");
        }
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
                        if (!Config.currentProfile.customPlugins) {
                            return callbackSeries();
                        }
                        CustomPluginController.init(Config.currentProfile.customPlugins, function (_err, _result) {
                            callbackSeries();
                        });
                    },
                    function (callbackSeries) {
                        MainController.UI.showToolsList("toolsTreeDiv");
                        callbackSeries();
                    },
                    function (callbackSeries) {
                        MainController.parseUrlParam(function () {
                            callbackSeries();
                        });
                    },
                    function (callbackSeries) {
                        var sources = Object.keys(Config.ontologiesVocabularyModels);

                        OntologyModels.registerSourcesModel(sources, function (err) {
                            callbackSeries(err);
                        });
                    },
                ],
                function (_err) {
                    MainController.UI.configureUI();
                }
            );
        });
    };

    self.initControllers = function () {
        Object.keys(Config.sources)
            .sort()
            .forEach(function (sourceLabel, _index) {
                if (!Config.sources[sourceLabel].controllerName) {
                    Config.sources[sourceLabel].controllerName = "" + Config.sources[sourceLabel].controller;
                    try {
                        Config.sources[sourceLabel].controller = eval(Config.sources[sourceLabel].controller);
                    } catch (e) {
                        console.log("cannot parse " + Config.sources[sourceLabel].controller);
                    }
                } else {
                    Config.sources[sourceLabel].controller = eval(Config.sources[sourceLabel].controllerName);
                }
            });
    };

    self.UI = {
        test: function () {
            Lineage_combine.testMerge();
            //  Orchestrator.createTab()
            // broadcastChannel.postMessage("eeee")
            /*   broadcastChannel.postMessage({ from: MainController.currentTool, to: "Lineage" });
return;*/
        },

        initialGraphDivWitdh: 0,

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
                        self.initControllers();
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

            common.jstree.loadJsTree(treeDiv, treeData, options, function () {
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
            for (var key in Config.tools) {
                if (Config.tools_available.indexOf(key) > -1) {
                    if ((Config.tools[key].label == "ConfigEditor" || Config.tools[key].label == "Admin") && authentication.currentUser.groupes.indexOf("admin") === -1) {
                        continue;
                    }
                    if ((Config.currentProfile.allowedTools != "ALL" && Config.currentProfile.allowedTools.indexOf(key) < 0) || Config.currentProfile.forbiddenTools.indexOf(key) > -1) {
                    } else {
                        treeData.push({
                            id: key,
                            text: Config.tools[key].label,
                            type: "tool",
                            parent: "#",
                            data: Config.tools[key],
                        });
                    }
                }
            }
            //})
            common.jstree.loadJsTree(treeDiv, treeData, {
                selectTreeNodeFn: function (evt, obj) {
                    self.UI.initTool(obj.node.id);
                },
            });
        },
        initTool: function (toolId, callback) {
            self.currentTool = toolId;
            var toolObj = Config.tools[toolId];
            self.currentSource = null;
            MainController.initControllers();
            MainController.writeUserLog(authentication.currentUser, self.currentTool, "");
            Clipboard.clear();
            $("#accordion").accordion("option", { active: 1 });
            $("#mainDialogDiv").dialog("close");
            var controller = Config.tools[self.currentTool].controller;
            $("#currentSourceTreeDiv").html("");
            $("#sourceDivControlPanelDiv").html("");
            $("#actionDivContolPanelDiv").html("");
            $("#rightPanelDivInner").html("");

            Lineage_sources.setAllWhiteBoardSources(true);

            if (toolId == "lineage") {
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
            SourceBrowser.targetDiv = "currentSourceTreeDiv";
            if (toolObj.noSource) {
                MainController.currentSource = null;
                MainController.UI.onSourceSelect();
            } else {
                MainController.UI.showSources("sourcesTreeDiv", toolObj.multiSources);
                if (Config.tools[self.currentTool].multiSources) {
                    self.writeUserLog(authentication.currentUser, self.currentTool, "multiSources");
                    if (controller.onSourceSelect) {
                        controller.onSourceSelect(self.currentSource);
                    }
                }
            }
            if (Config.tools[self.currentTool].toolDescriptionImg) {
                $("#graphDiv").html("<img src='" + Config.tools[self.currentTool].toolDescriptionImg + "' width='600px' style='toolDescriptionImg'>");
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

        getJstreeConceptsContextMenu: function () {
            var controller = Config.tools[self.currentTool].controller;
            if (controller.jstreeContextMenu) {
                return controller.jstreeContextMenu();
            }
        },

        onSourceSelect: function (event) {
            if (Config.tools[self.currentTool].multiSources) {
                return;
            }
            //  OwlSchema.currentSourceSchema = null;
            //   Collection.currentCollectionFilter = null;
            self.UI.updateActionDivLabel();
            self.writeUserLog(authentication.currentUser, self.currentTool, self.currentSource);
            var controller = Config.tools[self.currentTool].controller;
            if (controller.onSourceSelect) {
                controller.onSourceSelect(self.currentSource, event);
            }
        },

        message: function (message, stopWaitImg) {
            $("#messageDiv").html(message);
            if (stopWaitImg) {
                $("#waitImg").css("display", "none");
            }
        },

        setCredits: function () {
            var html = "<div>" + " " + " <img  src=\"images/souslesensVocables.png\" style='display: block; margin-left: auto; margin-right: auto width: 50%;margin: auto;'>" + "</div>";
            $("#graphDiv").html(html);
        },

        updateActionDivLabel: function (html) {
            if (html) {
                $("#toolPanelLabel").html(html);
            }
            if (self.currentSource) {
                $("#toolPanelLabel").html(Config.tools[self.currentTool].label + " : " + self.currentSource);
            } else {
                $("#toolPanelLabel").html(Config.tools[self.currentTool].label);
            }
        },

        showPopup: function (point, popupDiv, absolutePosition) {
            $("#" + popupDiv).css("display", "flex");
            var popupH = Math.min(300, $("#" + popupDiv).height());
            var popupW = Math.min(200, $("#" + popupDiv).width());
            var divHeight = $("#graphDiv").height();
            var divMaxWidth = $("#graphDiv").width();
            var popupBottom = point.y + popupH;
            var popupRight = point.x + popupW;
            var popupTop = point.y + popupH;
            var popupLeft = point.x + popupW;

            var horOverlap = 0;
            if (popupRight > divMaxWidth) {
                horOverlap = popupRight - divMaxWidth;
            } else if (popupLeft < 0) {
                horOverlap = -popupLeft;
            }

            var vertOverlap = 0;
            if (popupBottom > divHeight) {
                vertOverlap = divHeight - popupBottom;
            } else if (popupTop < 0) {
                vertOverlap = -popupTop;
            }

            if (!popupDiv) {
                popupDiv = "popupDiv";
            }
            $("#" + popupDiv).css("left", point.x + (absolutePosition ? 0 : leftPanelWidth) + horOverlap);
            $("#" + popupDiv).css("top", point.y + vertOverlap);
        },
        hidePopup: function (popupDiv) {
            if (self.UI.blockHidePopup) {
                return (self.UI.blockHidePopup = false);
            } //one shot
            if (!popupDiv) {
                popupDiv = "popupDiv";
            }
            $("#" + popupDiv).css("display", "none");
        },

        onAccordionChangePanel: function (panelLabel) {
            if (self.previousPanelLabel && self.previousPanelLabel == "toolPanelDiv") {
                // Pass
            } else {
                //  $("#graphDiv").html("...");
            }
            self.previousPanelLabel = panelLabel;
        },

        showHideRightPanel: function (show) {
            var left = $("#rightPanelDiv").position().left;
            var w = $(window).width();

            if (show || w - left < 100) {
                var lw = $("#rightPanelDiv").width();
                if (lw < 100) {
                    return;
                }
                var newLeft = "" + (w - lw) + "px";
                $("#rightPanelDiv").css("position", "absolute");
                $("#rightPanelDiv").css("left", newLeft);
                $("#graphDiv").css("zIndex", 19);
                $("#rightPanelDiv_searchIconInput").attr("src", "./icons/slideRight.png");
            } else {
                var newLeft = "" + w + "px";
                $("#rightPanelDiv").css("left", newLeft);
                $("#rightPanelDiv_searchIconInput").attr("src", "./icons/search.png");
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
        },
    };

    self.test = function () {
        //   bc.postMessage("bc")
    };

    self.showPart14AxiomsImage = function () {
        $("#mainDialogDiv").html("ISO-15926 part14 axioms<br><img  src=\"images/part14Axioms.png\" style='display: block; margin-left: auto; margin-right: auto width:400px;margin: auto;'>");
        $("#mainDialogDiv").dialog("open");
    };

    self.parseUrlParam = function (callback) {
        var paramsMap = common.getUrlParamsMap();

        if (paramsMap.tool) {
            var tool = paramsMap["tool"];

            if (tool) {
                var source = paramsMap["source"];
                if (source) {
                    Config.tools[tool].urlParam_source = source;
                }
                self.UI.initTool(tool, function () {
                    callback();
                });
            }
        } else {
            callback();
        }
    };

    return self;
})();

export default MainController;
window.MainController = MainController;
window.MainController = MainController;
window.MainController = MainController;
