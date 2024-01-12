import common from "../modules/shared/common.js";
import authentication from "../modules/shared/authentification.js";
import Clipboard from "../modules/shared/clipboard.js";
import Lineage_sources from "../modules/tools/lineage/lineage_sources.js";
import SourceSelectorWidget from "../modules/uiWidgets/sourceSelectorWidget.js";
import Lineage_r from "./lineage/lineage_r.js";
import KGquery from "../modules/tools/KGquery/KGquery.js";
import KGquery_r from "./KGquery/KGquery_r.js";

var ResponsiveUI = (function () {
    var self = {};
    self.source=null;
    self.mainDialogDiv = null;
    self.menuBarShowed=true;
    self.LateralPannelShowed=true;
    self.currentTool=null;
    self.alert = function (message) {};
    self.init = function () {
        
        self.setSlsvCssClasses();
        var tools = Config.tools_available;
       

        
        common.fillSelectOptions("toolsSelect", tools, false);
        tools.forEach((item,index)=>{
            if(Config.toolsLogo[item]){
                $(`#toolsSelect option[value="${item}"]`).html(item);
                $(`#toolsSelect option[value="${item}"]`).addClass(item+'-logo');
                //`<input type="image" src="${Config.toolsLogo[item]}">`
            }
            
        });
        
        
       
        window.addEventListener('resize',function(event) {
            self.resetWindowHeight();
        }, true);
        self.themeList();
    };
    self.initMenuBar=function(callback){
        $("#ChangeSourceButton").show();
        $("#index_topContolPanel").show();
        //Loading
        $("#index_topContolPanel").load("./responsive/lineage/html/topMenu.html", function () {
            callback();
                
        });
    }

    self.resetWindowHeight=function(){
        var MenuBarHeight=$('#MenuBar').height();
        var LateralPannelWidth=$('#lateralPanelDiv').width();
        $('#graphAndCommandScreen').css("height",$(window).height()-MenuBarHeight-1);
        $('#graphDiv').css("height",$(window).height()-MenuBarHeight-1);
        $('#graphDiv').css("width",$(window).width()-LateralPannelWidth-1);
       
        //Lineage_whiteboard.lineageVisjsGraph.network.startSimulation();

    }
    self.replaceFile = function (file1, file2) {
        Object.keys(file1).forEach((key) => {
            if (file2[key]) {
                file1[key] = file2[key];
            }
        });
    };

    self.onToolSelect = function (toolId) {
        if(self.currentTool!='lineage' && self.currentTool!=null){
            window[self.currentTool+'_r'].quit();
        }

        if(self.currentTool==toolId){
            return;
        }
        else{
            self.currentTool=toolId;
        }

       
        
       
        $("#currentToolTitle").html(toolId);
        if(Config.toolsLogo[toolId]){
            $("#currentToolTitle").html(`<button class="${toolId}-logo slsv-invisible-button" style="height:41px;width:41px;">`);
        }
        MainController.currentTool = toolId;
        if(self.source==null){
            ResponsiveUI.showSourceDialog(true);
        }
        else{
           
            self.sourceSelect(self.source);
        }   
        
    };

    self.onSourceSelect = function (evt, obj) {
        //  if (!MainController.currentTool) return self.alert("select a tool first");
        if (!obj.node.data || obj.node.data.type != "source") {
            return self.alert("select a tool");
        }
       
        var source=obj.node.data.id;
        self.sourceSelect(source);
    };
    self.sourceSelect=function(source){
        MainController.currentSource = source;
        ResponsiveUI.source=source;
        $("#selectedSource").html(MainController.currentSource);

        $("#mainDialogDiv").parent().hide();

        self.initTool(MainController.currentTool, function (err, result) {
            if (err) {
                return self.alert(err.responseText);
            }
            self.resetWindowHeight();
        });
    }
    self.onSourceSelectForAddSource = function (evt, obj) {
        //  if (!MainController.currentTool) return self.alert("select a tool first");
        if (!obj.node.data || obj.node.data.type != "source") {
            return self.alert("select a tool");
        }

        MainController.currentSource = obj.node.data.id;
        $("#selectedSource").html(MainController.currentSource);
        $("#mainDialogDiv").parent().hide();
        Lineage_r.loadSources();
    };

    self.initTool = function (toolId, callback) {
        var toolObj = Config.tools[toolId];
        MainController.initControllers();
        MainController.writeUserLog(authentication.currentUser, MainController.currentTool, "");
        Clipboard.clear();
        Lineage_sources.loadedSources={};
        /*  $("#currentSourceTreeDiv").html("");
      $("#sourceDivControlPanelDiv").html("");
      $("#actionDivContolPanelDiv").html("");
      $("#rightPanelDivInner").html("");*/

        if (toolId == "lineage") {
            return Lineage_r.init();
        } else if (toolId == "KGquery") {
            return KGquery_r.init();
            //  $("#accordion").accordion("option", { active: 2 });
        }

        self.UI.updateActionDivLabel();
        SearchWidget.targetDiv = "currentSourceTreeDiv";
        if (toolObj.noSource) {
            MainController.UI.onSourceSelect();
        } else {
            var options = {
                withCheckboxes: toolObj.multiSources,
            };
            SourceSelectorWidget.initWidget(null, "sourcesTreeDiv", false, null, null, options);

            // MainController.UI.showSources("sourcesTreeDiv", toolObj.multiSources);
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
    };

    self.showDiv = function (modalDiv) {
        $("#" + modalDiv).css("display", "block");
    };

    self.hideDiv = function (modalDiv) {
        $("#" + modalDiv).css("display", "none");
    };
    self.ApplySelectedTabCSS = function (buttonClicked, tabGroup) {
        var x = $("#" + tabGroup + "-buttons").children();
        if (x.length > 0) {
            x.removeClass("slsv-selectedTabDiv");
            x.children().removeClass("slsv-tabButtonSelected");
        }

        $(buttonClicked).addClass("slsv-tabButtonSelected");
        $(buttonClicked).parent().addClass("slsv-selectedTabDiv");
    };
    self.openTab = function (tabGroup, tabId, actionFn, buttonClicked) {
        var i;
        var x = document.getElementsByClassName(tabGroup);
        for (i = 0; i < x.length; i++) {
            x[i].style.display = "none";
        }
        if (tabId) {
            document.getElementById(tabId).style.display = "block";
        }
        if (actionFn) {
            actionFn();
        }
        self.ApplySelectedTabCSS(buttonClicked, tabGroup);
    };

    self.showSourceDialog = function (resetAll) {
        self.openDialogDiv("mainDialogDiv");

        self.showDiv("mainDialogDiv");
        $("#mainDialogDiv").css("display", "block");
        $("#sourceSelector_searchInput").focus();

        $("#mainDialogDiv").load("./responsive/lineage/html/SourceDiv.html", function () {
            $("#" + $("#mainDialogDiv").parent().attr("aria-labelledby")).html("Source Selector");

            if (resetAll) {
                Lineage_sources.loadedSources = {};
                var onSourceSelect = ResponsiveUI.onSourceSelect;
            } else {
                var onSourceSelect = ResponsiveUI.onSourceSelectForAddSource;
            }
            SourceSelectorWidget.loadSourcesTreeDiv("sourcesSelectorDiv", { selectTreeNodeFn: onSourceSelect }, function (err, result) {});
        });
    };
    self.openDialogDiv = function (div) {
        //$("#mainDialogDiv").css('width', 'auto');

        $("#" + div).empty();
        $("#" + div).dialog();
        $("#" + div)
            .parent()
            .show();
        $("#" + div)
            .parent()
            .css("top", "20%");
        $("#" + div)
            .parent()
            .css("left", "30%");
    };
    self.setSlsvCssClasses = function () {
        async.series(
            [
                
                function (callbackSeries) {
                    $.getScript("./responsive/less.min.js")
                        .done(function (script, textStatus) {
                            callbackSeries();
                            //your remaining code
                        })
                        .fail(function (jqxhr, settings, exception) {
                            callbackSeries(err);
                        });
                },
            ],
            function (err) {
                if (err) return alert(err);
            }
        );
   
    };
    self.themeList=function(){
        //less.modifyVars({'@button1-color': '#000'});
        var allThemesNames=Object.keys(Config.slsvColorThemes);
        common.fillSelectOptions("themeSelect", allThemesNames, false);


    };

    self.changeTheme=function(ThemeName){
        var themeSelected=Config.slsvColorThemes[ThemeName];
        less.modifyVars(themeSelected);
    }
    self.hideShowMenuBar=function(button){
        if(self.menuBarShowed){
            $('#MenuBarFooter').hide();
            $('#MenuBar').css('height','21px');
            ResponsiveUI.resetWindowHeight();
            self.menuBarShowed=false;
            $(button).children().attr('src','./icons/ArrowMenuBarShow.png');
        }
        else{
            $('#MenuBarFooter').show();
            $('#MenuBar').css('height','90px');
            ResponsiveUI.resetWindowHeight();
            self.menuBarShowed=true;
            $(button).children().attr('src','./icons/ArrowMenuBar.png');
        }
       
    }
    self.hideShowLateralPannel=function(button){
        if(self.LateralPannelShowed){
            $('#lineage-tab-buttons').hide();
            $('#WhiteboardContent').hide();
            $('#lateralPanelDiv').css('width','21px');
            $('#lateralPanelDiv').removeClass('ui-resizable');
            ResponsiveUI.resetWindowHeight();
            self.LateralPannelShowed=false;
            $('#lateralPanelDiv').append(button);
            $('#lateralPanelDiv button img').attr('src','./icons/CommonIcons/ArrowLateralPannelShow.png');
            
            
        }
        else{
            $('#lineage-tab-buttons').show();
            $('#WhiteboardContent').show();
            $('#lateralPanelDiv').css('width','395px');
            ResponsiveUI.resetWindowHeight();
            self.LateralPannelShowed=true;
            $(button).children().attr('src','./icons/CommonIcons/ArrowLateralPannel.png');
            $('#lateralPanelDiv').addClass('ui-resizable');
        }
    }

    return self;
})();
export default ResponsiveUI;
window.ResponsiveUI = ResponsiveUI;
