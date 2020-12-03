var MainController = (function () {
    var self = {}

    self.currentTool = null




    self.loadSources= function () {

        $.getJSON("config/sources.json", function(json) {
            Config.sources = json;

        });

    }




    self.UI = {

        showSources:function(treeDiv, withCBX){
            var treeData = [];
            Object.keys(Config.sources).sort().forEach(function (sourceLabel,index) {
                if(Config.currentProfile.allowedSourceSchemas.indexOf( Config.sources[sourceLabel].schemaType)<0)
                    return;
                Config.sources[sourceLabel].name=sourceLabel
                if(! Config.sources[sourceLabel].controllerName) {
                    Config.sources[sourceLabel].controllerName = ""+Config.sources[sourceLabel].controller
                    Config.sources[sourceLabel].controller = eval(Config.sources[sourceLabel].controller)
                }
                if (!Config.sources[sourceLabel].color)
                    Config.sources[sourceLabel].color = common.palette[index%common.palette.length];

                treeData.push({id: sourceLabel, text: sourceLabel, parent: "#", data: Config.sources[sourceLabel]})
            })
            common.loadJsTree(treeDiv, treeData, {
                withCheckboxes: withCBX,
                selectNodeFn: function (evt, obj) {
                    self.currentSource = obj.node.id;
                    MainController.UI.onSourceSelect()

                }
            })
        },

        showToolsList: function (treeDiv) {
            var x=$(window).height()
            $(".max-height").height($(window).height()-300)
            var treeData = []
            for (var key in Config.tools) {
                // Object.keys(Config.tools).forEach(function (toolLabel) {
                treeData.push({id: key, text: Config.tools[key].label, parent: "#", data: Config.tools[key]})

            }
            //})
            common.loadJsTree(treeDiv, treeData, {
                selectNodeFn: function (evt, obj) {
                    self.currentTool = obj.node.id;
                    self.currentSource = null;
                    MainController.UI.showSources("sourcesTreeDiv", obj.node.data.multiSources);
                    Clipboard.clear();
                    $("#accordion").accordion("option", {active: 1});
                    var controller = Config.tools[self.currentTool].controller
                    $("#actionDivContolPanelDiv").html("")
                    self.UI.updateActionDivLabel();
                  if (Config.tools[self.currentTool].multiSources)
                        controller.onSourceSelect(self.currentSource)
                    if(controller.onLoaded)
                        controller.onLoaded()
                    if(Config.tools[self.currentTool].toolDescriptionImg){
                        $("#graphDiv").html("<img src='"+Config.tools[self.currentTool].toolDescriptionImg+"' width='600px' style='toolDescriptionImg'>")
                    }else
                        $("#graphDiv").html(self.currentTool);

                }
            })

        },
        onSourceSelect: function () {
           // $("#actionDivContolPanelDiv").html("");
          //  $("#sourceDivControlPanelDiv").html("");

            if (Config.tools[self.currentTool].multiSources)
                return
         /*   if (!self.currentSource)
                return MainController.UI.message("select a source");*/

            self.UI.updateActionDivLabel()
            var controller = Config.tools[self.currentTool].controller
            controller.onSourceSelect(self.currentSource)

            /*    if (self.currentTool == 0) {
                    ThesaurusBrowser.showThesaurusTopConcepts(self.currentSource)
                }*/


        },

        message: function (message) {
            $("#messageDiv").html(message)
        },



        setCredits:function(){

            var html="<div><span class='topTitle'>SousLeSens Vocables</span><br>" +
                "  <img src=\"images/description.png\"></div>"
            $("#graphDiv").html(html)


        },

        updateActionDivLabel: function (html) {
            if(html)
                $("#sourcePanelLabel").html(html)
            if (self.currentSource)
                $("#sourcePanelLabel").html(Config.tools[self.currentTool].label + " : " + self.currentSource)
            else
                $("#sourcePanelLabel").html(Config.tools[self.currentTool].label);


        },

        showPopup: function (point,popupDiv) {
            if(!popupDiv)
                popupDiv="popupDiv"
            $("#"+popupDiv).css("left", point.x+leftPanelWidth)
            $("#"+popupDiv).css("top", point.y)
            $("#"+popupDiv).css("display", "flex")
        },
        hidePopup: function (popupDiv) {
            if(!popupDiv)
                popupDiv="popupDiv"
            $("#"+popupDiv).css("display", "none")
        },


        showInCentralPanelDiv:function(divId){
            if(divId=="graphDiv"){
                $("#graphDiv").css("display","block")
                $("#blendDiv").css("display","none")
            }
            else  if(divId="blendDiv" && Blender.displayMode=="centralPanel"){
                $("#graphDiv").css("display","none")
                $("#blendDiv").css("display","block")
            }

        }
    }


    return self;


})()
