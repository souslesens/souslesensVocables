/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var MainController = (function () {
    var self = {}

    self.currentTool = null
    self.currentSchemaType = null;
    self.currentSource = null;


    self.initConfig = function (callback) {

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/config",
            dataType: "json",
            success: function (serverConfig, textStatus, jqXHR) {
                //  Config.serverUrl = serverConfig.serverUrl
                Config.default_lang = serverConfig.default_lang
                Config.default_sparql_url = serverConfig.default_sparql_url
                Config.wiki = serverConfig.wiki

                // display version number
                $("#souslesensversion").html(serverConfig.version);

                return callback()
            },
            error: function (err) {
                return callback(err)
            }
        })


    }

    self.loadSources = function (callback) {
        var payload = {
            getSources: 1,
        }
        $.ajax({
            type: "POST",
            url: Config.serverUrl,
            data: payload,
            dataType: "json",
            success: function (data, textStatus, jqXHR) {
                for (var source in data) {
                    if (data[source].sparql_server && data[source].sparql_server.url == "_default") {
                        data[source].sparql_server.url = Config.default_sparql_url
                    }
                }
                Config.sources = data;
                if (callback)
                    return callback()
            },
            error: function (err) {
                alert("cannot load profiles")
                console.log(err);
                if (callback)
                    return callback()
            }
        })
        /*   $.getJSON("config/sources.json", function (json) {
               Config.sources = json;
              for(var sourceLabel in Config.sources){
                   if(Config.sources[sourceLabel].sparql_server && Config.sources[sourceLabel].sparql_server.url=="_default")
                       Config.sources[sourceLabel].sparql_server.url=Config.default_sparql_url
               }
               if (callback)
                   return callback()

           });*/
    }
    self.loadProfiles = function (callback) {

        var payload = {
            getProfiles: 1,
        }
        $.ajax({
            type: "POST",
            url: Config.serverUrl,
            data: payload,
            dataType: "json",
            success: function (data, textStatus, jqXHR) {
                Config.profiles = data;
                if (callback)
                    return callback()
            },
            error: function (err) {
                alert("cannot load profiles")
                console.log(err);
                if (callback)
                    return callback()
            }
        })

    }


    self.writeUserLog = function (user, tool, source) {
        var payload = {
            writeUserLog: 1,
            infos: user.identifiant + "," + tool + "," + source
        }
        $.ajax({
            type: "POST",
            url: Config.serverUrl,
            data: payload,
            dataType: "json",

            success: function (data, textStatus, jqXHR) {
                ;
            },
            error: function (err) {
                console.log(err);
            }
        })
    }


    self.onAfterLogin = function () {

        if (!authentication.currentUser)
            return alert(" no user identified")
        var groups = authentication.currentUser.groupes
        MainController.loadSources(function (err, result) {
            MainController.loadProfiles(function (err, result) {
                //  Config.currentProfile=Config.profiles["reader_all"]
                groups.forEach(function (group) {
                    if (Config.profiles[group])
                        return Config.currentProfile = Config.profiles[group]
                })


                    async.series([
                        function(callbackSeries) {
                        if(!Config.currentProfile.customPlugins)
                            return callbackSeries();
                            CustomPluginController.init(Config.currentProfile.customPlugins, function (err, result) {
                                callbackSeries()
                            })
                        },
                        function(callbackSeries) {
                            MainController.UI.showToolsList("toolsTreeDiv")
                            callbackSeries()
                        }

                    ],function(err){

                        MainController.UI.configureUI();
                    })

            })
        })


    }

    self.initControllers = function () {
        Object.keys(Config.sources).sort().forEach(function (sourceLabel, index) {
            if (!Config.sources[sourceLabel].controllerName) {
                Config.sources[sourceLabel].controllerName = "" + Config.sources[sourceLabel].controller
                Config.sources[sourceLabel].controller = eval(Config.sources[sourceLabel].controller)
            } else {
                Config.sources[sourceLabel].controller = eval(Config.sources[sourceLabel].controllerName)
            }
        })
    }

    self.UI = {
        initialGraphDivWitdh: 0,

        configureUI: function () {
            if (Config.currentProfile.forbiddenTools.indexOf("BLENDER") > -1)
                $("#showBlenderButton").css("display", "none")
            else
                $("#showBlenderButton").css("display", "block")
        },


        showSources: function (treeDiv, withCBX, sources, types, options, callback) {
            if (!options)
                options = {}
            var treeData = [];
            var distinctNodes = {}

            var distinctGroups = {}


            Config.currentProfile.allowedSourceSchemas.forEach(function (item) {

                if (!types || (types && types.indexOf(item) > -1))
                    treeData.push({id: item, text: item, parent: "#", type: item})
            })
            Object.keys(Config.sources).sort().forEach(function (sourceLabel, index) {

                self.initControllers()
                if (sources && sources.indexOf(sourceLabel) < 0)
                    return
                if (Config.sources[sourceLabel].isDraft)
                    return;
                if (Config.currentProfile.allowedSourceSchemas.indexOf(Config.sources[sourceLabel].schemaType) < 0)
                    return;
                if ((Config.currentProfile.allowedSources != "ALL" && Config.currentProfile.allowedSources.indexOf(sourceLabel) < 0) || Config.currentProfile.forbiddenSources.indexOf(sourceLabel) > -1)
                    return;


                Config.sources[sourceLabel].name = sourceLabel;

                var parent = Config.sources[sourceLabel].schemaType

                var othersGroup = "OTHERS"
                if (!types && !distinctGroups[othersGroup]) {
                    distinctGroups[othersGroup] = 1
                    treeData.push({
                        id: othersGroup + "_" + parent,
                        text: "OTHERS",
                        type: "group",
                        parent: "#",
                    })
                }


                var group = Config.sources[sourceLabel].group
                if (sourceLabel.indexOf("CFIHOS_READI-REMOTE") > -1)
                    var x = 3
                if (group) {
                    var subGroups = group.split("/")
                    subGroups.forEach(function (subGroup, index) {

                        if (index > 0)
                            parent = subGroups[index - 1]
                        if (!distinctGroups[subGroup]) {
                            distinctGroups[subGroup] = 1
                            treeData.push({
                                id: subGroup,
                                text: subGroup,
                                type: "group",
                                parent: parent,
                            })
                        }
                        group = subGroup
                    })

                } else {
                    group = othersGroup + "_" + parent
                    if (types)
                        group = Config.sources[sourceLabel].schemaType
                    else
                        group = Config.sources[sourceLabel].schemaType
                }

                if (!distinctNodes[sourceLabel]) {
                    distinctNodes[sourceLabel] = 1

                    if (!Config.sources[sourceLabel].color)
                        Config.sources[sourceLabel].color = common.palette[index % common.palette.length];
                    //  console.log(JSON.stringify(jstreeData,null,2))
                    if (!types || types.indexOf(Config.sources[sourceLabel].schemaType) > -1) {
                        treeData.push({
                            id: sourceLabel,
                            text: sourceLabel,
                            type: Config.sources[sourceLabel].schemaType,
                            parent: group,
                        })
                    }
                }


            })
            var jstreeOptions = options
            if (!jstreeOptions.contextMenu)
                jstreeOptions.contextMenu = MainController.UI.getJstreeConceptsContextMenu()
            if (withCBX)
                jstreeOptions.withCheckboxes = withCBX

            if (!jstreeOptions.selectTreeNodeFn)
                jstreeOptions.selectTreeNodeFn = function (evt, obj) {
                    if (!Config.sources[obj.node.id])
                        return;
                    $("#mainDialogDiv").dialog("close");
                    if (obj.node.parent == "#") {//first level group by schema type
                        if (Config.currentProfile.allowedSourceSchemas.indexOf(obj.node.id) > -1) {//schemaTypeNode
                            if (obj.node.id == "KNOWLEDGE_GRAPH")
                                MainController.currentSchemaType = "OWL"
                            else
                                MainController.currentSchemaType = obj.node.id;

                            if ($("#sourcesTreeDiv").children().length > 0)
                                $("#sourcesTreeDiv").jstree(true).open_node(obj.node.id)
                            return;
                        }
                    } else {
                        self.currentSource = obj.node.id;
                        MainController.UI.onSourceSelect()
                    }

                }
            if (!jstreeOptions.onOpenNodeFn)
                if (!jstreeOptions.onOpenNodeFn)
                    jstreeOptions.onOpenNodeFn = function (evt, obj) {
                        if (obj.node.parent == "#") {//first level group by schema type
                            if (Config.currentProfile.allowedSourceSchemas.indexOf(obj.node.id) > -1) {//schemaTypeNode
                                if (obj.node.id == "KNOWLEDGE_GRAPH")
                                    MainController.currentSchemaType = "OWL"
                                else
                                    MainController.currentSchemaType = obj.node.id;
                            }
                        }
                    },

                        common.jstree.loadJsTree(treeDiv, treeData, options, function () {
                            var openedTypes = Config.preferredSchemaType
                            if (types)
                                openedTypes = types
                            //  $("#" + treeDiv).jstree(true).open_all(openedTypes);
                            $("#" + treeDiv).jstree(true).open_node(openedTypes);
                            if (callback)
                                return callback()

                        })
        },


        showToolsList: function (treeDiv) {
            var x = $(window).height()
            $(".max-height").height($(window).height() - 300)
            var treeData = []
            for (var key in Config.tools) {
                if ((Config.currentProfile.allowedTools != "ALL" && Config.currentProfile.allowedTools.indexOf(key) < 0) || Config.currentProfile.forbiddenTools.indexOf(key) > -1)
                    ;
                else
                    treeData.push({
                        id: key,
                        text: Config.tools[key].label,
                        type: "tool",
                        parent: "#",
                        data: Config.tools[key]
                    })

            }
            //})
            common.jstree.loadJsTree(treeDiv, treeData, {

                selectTreeNodeFn: function (evt, obj) {

                    self.UI.initTool(obj.node.id)


                }
            })

        }
        , initTool: function (toolId) {
            self.currentTool = toolId
            var toolObj = Config.tools[toolId]
            self.currentSource = null;
            MainController.initControllers()
            MainController.writeUserLog(authentication.currentUser, self.currentTool, "")
            Clipboard.clear();
            $("#accordion").accordion("option", {active: 1});
            $("#mainDialogDiv").dialog("close");
            var controller = Config.tools[self.currentTool].controller
            $("#currentSourceTreeDiv").html("")
            $("#sourceDivControlPanelDiv").html("")
            $("#actionDivContolPanelDiv").html("")
            $("#rightPanelDiv").html("")

            self.UI.updateActionDivLabel();
            SourceBrowser.targetDiv = "currentSourceTreeDiv"
            if (toolObj.noSource) {
                MainController.currentSource = null;
                MainController.UI.onSourceSelect();

            } else {
                MainController.UI.showSources("sourcesTreeDiv", toolObj.multiSources);
                if (Config.tools[self.currentTool].multiSources) {
                    self.writeUserLog(authentication.currentUser, self.currentTool, "multiSources")
                    if (controller.onSourceSelect)
                        controller.onSourceSelect(self.currentSource)

                }
            }

            //   $("#GenericTools_searchAllDiv").load("./snippets/searchAll.html");


            if (controller.onLoaded)
                controller.onLoaded()
            if (Config.tools[self.currentTool].toolDescriptionImg) {
                $("#graphDiv").html("<img src='" + Config.tools[self.currentTool].toolDescriptionImg + "' width='600px' style='toolDescriptionImg'>")
            } else
                $("#graphDiv").html(self.currentTool);
        }

        , getJstreeConceptsContextMenu: function () {
            var controller = Config.tools[self.currentTool].controller
            if (controller.jstreeContextMenu)
                return controller.jstreeContextMenu()

        },

        onSourceSelect: function () {

            if (Config.tools[self.currentTool].multiSources) {

                return
            }
            OwlSchema.currentSourceSchema = null;
            Collection.currentCollectionFilter = null;
            self.UI.updateActionDivLabel();
            self.writeUserLog(authentication.currentUser, self.currentTool, self.currentSource)
            var controller = Config.tools[self.currentTool].controller
            if (controller.onSourceSelect)
                controller.onSourceSelect(self.currentSource)


        },


        message: function (message, stopWaitImg) {
            $("#messageDiv").html(message)
            if (stopWaitImg)
                $("#waitImg").css("display", "none")
        },

        toogleRightPanel: function (open) {
            var display = $("#rightPanelDiv").css("display")
            Lineage_common.currentSource = null;
            var currentCentralPanelWidth = $("#centralPanelDiv").width()

            if (!open && display == "flex") {//open->close
                var w2 = self.UI.initialGraphDivWitdh + rightPanelWidth
                $("#rightPanelDiv").css("display", "none")
                $("#centralPanelDiv").width(self.UI.initialGraphDivWitdh)
                $("#graphDiv").animate({width: self.UI.initialGraphDivWitdh})
                setTimeout(function () {
                  ;//  visjsGraph.redraw()
                }, 200)


            } else {//close->open (if not allready opened)
                if (currentCentralPanelWidth != self.UI.initialGraphDivWitdh) {

                    $("#rightPanelDiv").css("display", "flex")
                    $("#centralPanelDiv").width(self.UI.initialGraphDivWitdh - rightPanelWidth)
                    $("#graphDiv").animate({width: self.UI.initialGraphDivWitdh - rightPanelWidth})
                    setTimeout(function () {
                      ;//  visjsGraph.redraw()
                    }, 200)
                }


            }
        },


        setCredits: function () {

            var html = "<div>" +
                "  <img  src=\"images/souslesensVocables.png\" style='display: block; margin-left: auto; margin-right: auto width: 50%;margin: auto;'>" +
                "</div>"
            $("#graphDiv").html(html)


        },

        updateActionDivLabel: function (html) {
            if (html)
                $("#toolPanelLabel").html(html)
            if (self.currentSource)
                $("#toolPanelLabel").html(Config.tools[self.currentTool].label + " : " + self.currentSource)
            else
                $("#toolPanelLabel").html(Config.tools[self.currentTool].label);


        },

        showPopup: function (point, popupDiv) {
            if (!popupDiv)
                popupDiv = "popupDiv"
            $("#" + popupDiv).css("left", point.x + leftPanelWidth)
            $("#" + popupDiv).css("top", point.y)
            $("#" + popupDiv).css("display", "flex")
        },
        hidePopup: function (popupDiv) {
            if (self.UI.blockHidePopup)
                return self.UI.blockHidePopup = false;//one shot
            if (!popupDiv)
                popupDiv = "popupDiv"
            $("#" + popupDiv).css("display", "none")
        },


        onAccordionChangePanel: function (panelLabel) {


            if (self.previousPanelLabel && self.previousPanelLabel == "toolPanelDiv") {
                ;
            } else {
                //  $("#graphDiv").html("...");
            }
            self.previousPanelLabel = panelLabel

        },

        openRightPanel: function () {
            var w = $(window).width() - leftPanelWidth
            var h = $(window).height() - 30;
            // $("#centralPanel").width(w)
            $("#centralPanelDiv").width(w - rightPanelWidth)
            $("#graphDiv").width(w - rightPanelWidth)
            $("#rightPanelToogleButton").css("display", "block")
            $("#rightPanelDiv").width(rightPanelWidth)
            setTimeout(function () {
                    $("#graphDiv").hide().fadeIn('fast');
                }
                , 500)
        },
        showCurrentQuery: function () {
            $("#mainDialogDiv").html("<textarea style='width: 100%;height: 400px'>" + Sparql_proxy.currentQuery + "</textarea>")
            $("#mainDialogDiv").dialog("open")
        },
        copyCurrentQuery: function () {
            common.copyTextToClipboard(Sparql_proxy.currentQuery)

        },
        logout: function () {
            console.log("logout");
        }
    }

    self.test = function () {


    }


    return self;


})()
