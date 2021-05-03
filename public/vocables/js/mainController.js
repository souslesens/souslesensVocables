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

    self.loadSources = function (callback) {

        $.getJSON("config/sources.json", function (json) {
            Config.sources = json;
           for(var sourceLabel in Config.sources){
                if(Config.sources[sourceLabel].sparql_server && Config.sources[sourceLabel].sparql_server.url=="_default")
                    Config.sources[sourceLabel].sparql_server.url=Config.default_sparql_url
            }
            if (callback)
                return callback()

        });

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


    self.onAfterLogin=function(){

        if(!authentication.currentUser)
            return alert(" no user identified")
        var groups=authentication.currentUser.groupes

        Config.currentProfile=Config.profiles["reader_all"]
        groups.forEach(function(group){
            if(Config.profiles[group])
                return  Config.currentProfile=Config.profiles[group]
        })
        MainController.UI.configureUI();
        MainController.UI.showToolsList("toolsTreeDiv")
        MainController.loadSources()


    }

    self.UI = {

        configureUI:function(){
            if(Config.currentProfile.forbiddenTools.indexOf("BLENDER")>-1)
                $("#showBlenderButton").css("display","none")
            else
                $("#showBlenderButton").css("display","block")
        },
        showSources: function (treeDiv, withCBX) {
            var treeData = [];
            var distinctNodes = {}

            Config.currentProfile.allowedSourceSchemas.forEach(function (item) {
                treeData.push({id: item, text: item, parent: "#"})
            })
            Object.keys(Config.sources).sort().forEach(function (sourceLabel, index) {
                if (!Config.sources[sourceLabel].controllerName) {
                    Config.sources[sourceLabel].controllerName = "" + Config.sources[sourceLabel].controller
                    Config.sources[sourceLabel].controller = eval(Config.sources[sourceLabel].controller)
                }

                if (Config.currentProfile.allowedSourceSchemas.indexOf(Config.sources[sourceLabel].schemaType) < 0)
                    return;
                if ( (Config.currentProfile.allowedSources!="ALL" && Config.currentProfile.allowedSources.indexOf(sourceLabel) < 0)  ||  Config.currentProfile.forbiddenSources.indexOf(sourceLabel) >-1)
                    return;


                Config.sources[sourceLabel].name = sourceLabel;

                if (!distinctNodes[sourceLabel]) {
                    distinctNodes[sourceLabel] = 1

                    if (!Config.sources[sourceLabel].color)
                        Config.sources[sourceLabel].color = common.palette[index % common.palette.length];
                    //  console.log(JSON.stringify(jstreeData,null,2))
                    treeData.push({id: sourceLabel, text: sourceLabel, parent: Config.sources[sourceLabel].schemaType,})// data: Config.sources[sourceLabel]})
                }
            })
            common.jstree.loadJsTree(treeDiv, treeData, {
                contextMenu: MainController.UI.getJstreeConceptsContextMenu(),
                withCheckboxes: withCBX,
                selectTreeNodeFn: function (evt, obj) {
                    if (obj.node.parent == "#") {//first level group by schema type
                        if (Config.currentProfile.allowedSourceSchemas.indexOf(obj.node.id) > -1) {//schemaTypeNode
                            if (obj.node.id == "INDIVIDUAL")
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

                },
                onOpenNodeFn: function (evt, obj) {
                    if (obj.node.parent == "#") {//first level group by schema type
                        if (Config.currentProfile.allowedSourceSchemas.indexOf(obj.node.id) > -1) {//schemaTypeNode
                            if (obj.node.id == "INDIVIDUAL")
                                MainController.currentSchemaType = "OWL"
                            else
                                MainController.currentSchemaType = obj.node.id;
                        }
                    }
                }
            }, function () {
                $("#" + treeDiv).jstree(true).open_node(Config.preferredSchemaType);

            })
        },


        showToolsList: function (treeDiv) {
            var x = $(window).height()
            $(".max-height").height($(window).height() - 300)
            var treeData = []
            for (var key in Config.tools) {
                if (( Config.currentProfile.allowedTools!="ALL" && Config.currentProfile.allowedTools.indexOf(key) < 0) ||  Config.currentProfile.forbiddenTools.indexOf(key) >-1)
                    ;
                else
                    treeData.push({id: key, text: Config.tools[key].label, parent: "#", data: Config.tools[key]})

            }
            //})
            common.jstree.loadJsTree(treeDiv, treeData, {

                selectTreeNodeFn: function (evt, obj) {



                    self.currentTool = obj.node.id;
                    self.currentSource = null;
                    Clipboard.clear();
                    $("#accordion").accordion("option", {active: 1});
                    var controller = Config.tools[self.currentTool].controller
                   $("#currentSourceTreeDiv").html("")

                    self.UI.updateActionDivLabel();

                    if (Config.tools[self.currentTool].noSource) {
                        MainController.currentSource = null;
                        MainController.UI.onSourceSelect();

                    } else {
                        MainController.UI.showSources("sourcesTreeDiv", obj.node.data.multiSources);
                        if (Config.tools[self.currentTool].multiSources) {
                            self.writeUserLog(authentication.currentUser, self.currentTool, "multiSources")
                            controller.onSourceSelect(self.currentSource)

                        }
                    }


                    if (controller.onLoaded)
                        controller.onLoaded()
                    if (Config.tools[self.currentTool].toolDescriptionImg) {
                        $("#graphDiv").html("<img src='" + Config.tools[self.currentTool].toolDescriptionImg + "' width='600px' style='toolDescriptionImg'>")
                    } else
                        $("#graphDiv").html(self.currentTool);

                }
            })

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
            controller.onSourceSelect(self.currentSource)


        },
        showNodeInfos: function (sourceLabel, nodeId, divId, callback) {

            Sparql_generic.getNodeInfos(sourceLabel, nodeId, null, function (err, result) {
                if (err) {
                    return MainController.UI.message(err);
                }
                if (divId.indexOf("Dialog") > -1) {
                    $("#" + divId).dialog("open");
                }
                SourceEditor.showNodeInfos(divId, "en", nodeId, result)

                if (callback)
                    return callback()
            })


        },

        message: function (message) {
            $("#messageDiv").html(message)
        },

        toogleRightPanel: function (open) {
            var display = $("#rightPanelDiv").css("display")

            if (!open && display == "flex") {//open->close
                var w2 = $("#graphDiv").width() + rightPanelWidth
                $("#rightPanelDiv").css("display", "none")
                $("#centralPanelDiv").width(w2)
                $("#graphDiv").animate({width: w2})
                setTimeout(function () {
                    visjsGraph.redraw()
                }, 200)


            } else {//close->open
                var w2 = $("#graphDiv").width() - rightPanelWidth
                $("#rightPanelDiv").css("display", "flex")
                $("#centralPanelDiv").width(w2)
                $("#graphDiv").animate({width: w2})
                setTimeout(function () {
                    visjsGraph.redraw()
                }, 200)


            }
        },


        setCredits: function () {

            var html = "<div><span class='topTitle'>SousLeSens Vocables</span><br>" +
                "  <img src=\"images/description.png\"></div>"
            $("#graphDiv").html(html)


        },

        updateActionDivLabel: function (html) {
            if (html)
                $("#sourcePanelLabel").html(html)
            if (self.currentSource)
                $("#sourcePanelLabel").html(Config.tools[self.currentTool].label + " : " + self.currentSource)
            else
                $("#sourcePanelLabel").html(Config.tools[self.currentTool].label);


        },

        showPopup: function (point, popupDiv) {
            if (!popupDiv)
                popupDiv = "popupDiv"
            $("#" + popupDiv).css("left", point.x + leftPanelWidth)
            $("#" + popupDiv).css("top", point.y)
            $("#" + popupDiv).css("display", "flex")
        },
        hidePopup: function (popupDiv) {
            if (!popupDiv)
                popupDiv = "popupDiv"
            $("#" + popupDiv).css("display", "none")
        },


        showInCentralPanelDiv: function (divId) {
            if (divId == "graphDiv") {
                $("#graphDiv").css("display", "block")
                $("#blendDiv").css("display", "none")
            } else if (divId = "blendDiv" && Blender.displayMode == "centralPanelDiv") {
                $("#graphDiv").css("display", "none")
                $("#blendDiv").css("display", "block")
            }

        },

        openRightPanel: function () {
            var w = $(window).width() - leftPanelWidth
            var h = $(window).height() - 30;
            // $("#centralPanel").width(w)
            $("#centralPanelDiv").width(w - rightPanelWidth)
            $("#graphDiv").width(w - rightPanelWidth)
            $("#rightPanelToogleButton").css("display", "block")
            $("#rightPanelDiv").width(rightPanelWidth)
            setTimeout(function() {
                $("#graphDiv").hide().fadeIn('fast');}
            ,500)
        },
        showCurrentQuery: function () {
            $("#mainDialogDiv").html("<textarea style='width: 100%;height: 400px'>" + Sparql_proxy.currentQuery + "</textarea>")
            $("#mainDialogDiv").dialog("open")
        },
        copyCurrentQuery: function () {
            common.copyTextToClipboard(Sparql_proxy.currentQuery)

        }
    }

    self.test = function () {

        /*    self.loadSources(function () {
                MainController.currentSource = "NPD"
                SourceBrowser.currentTreeNode = {data: {id: "http://sws.ifi.uio.no/vocab/npd-v2#Wellbore"}}
                ADLquery.showProperties()
            })*/

    }


    return self;


})()
