import common from "../modules/shared/common.js";
import authentication from "../modules/shared/authentification.js";
import Clipboard from "../modules/shared/clipboard.js";
import Lineage_sources from "../modules/tools/lineage/lineage_sources.js";
import SourceSelectorWidget from "../modules/uiWidgets/sourceSelectorWidget.js";
import Lineage_r from "./lineage/lineage_r.js";

import Lineage_whiteboard from "../modules/tools/lineage/lineage_whiteboard.js";

var ResponsiveUI = (function () {
    var self = {};
    self.source = null;
    self.mainDialogDiv = null;
    self.menuBarShowed = true;
    self.LateralPannelShowed = true;
    self.currentTool = null;
    self.toolsNeedSource = ["lineage", "KGquery", "KGcreator"];
    self.init = function () {
        self.oldRegisterSource = Lineage_sources.registerSource;
        //self.setSlsvCssClasses();
        //your remaining code

        var tools = [];

        for (var key in Config.tools) {
            if (Config.tools_available.indexOf(key) > -1) {
                if ((Config.tools[key].label == "ConfigEditor" || Config.tools[key].label == "Admin") && authentication.currentUser.groupes.indexOf("admin") === -1) {
                    continue;
                }
                if ((Config.currentProfile.allowedTools != "ALL" && Config.currentProfile.allowedTools.indexOf(key) < 0) || Config.currentProfile.forbiddenTools.indexOf(key) > -1) {
                } else {
                    tools.push(key);
                }
            }
        }
        tools.forEach((item, index) => {
            var logoTool=`<div style='height:35px;width:37px;' class='${item}-logo' ></div>`;

            var strTool=`<div class='Lineage_PopUpStyleDiv' style='display:flex;flex-direction:row;align-items:center;' >${logoTool}<div  value="${item}">${item}</div></div>`;

            $('#toolsSelect').append(strTool);

        });

        window.addEventListener(
            "resize",
            function (event) {
                self.resetWindowHeight();
            },
            true
        );


        self.themeList();
        self.replaceFile(BotEngine, BotEngineResponsive);
    };
    self.initMenuBar = function (callback) {
        $("#ChangeSourceButton").show();
        $("#index_topContolPanel").show();
        //Loading
        $("#index_topContolPanel").load("./responsive/lineage/html/topMenu.html", function () {
            if (self.currentTool != "lineage") {
                $("#AddSourceButton").remove();
                $("#AllSourceButton").remove();
            }
            callback();
        });
    };

    self.resetWindowHeight = function () {
        var MenuBarHeight = $("#MenuBar").height();
        var LateralPannelWidth = $("#lateralPanelDiv").width();
        $("#graphAndCommandScreen").css("height", $(window).height() - MenuBarHeight - 1);
        $("#graphDiv").css("height", $(window).height() - MenuBarHeight - 1);
        $("#graphDiv").css("width", $(window).width() - LateralPannelWidth - 1);

        //Lineage_whiteboard.lineageVisjsGraph.network.startSimulation();
    };
    self.replaceFile = function (file1, file2) {
        Object.keys(file1).forEach((key) => {
            if (file2[key]) {
                file1[key] = file2[key];
            }
        });
    };

    self.onToolSelect = function (toolId,event) {
        if(event){


            var clickedElement = event.target;
            // if class
            if(clickedElement.className=='Lineage_PopUpStyleDiv'){
                var toolId=$(clickedElement).children()[1].innerHTML;
            }
            else {
                if(clickedElement.innerHTML){
                    var toolId=clickedElement.innerHTML;
                }else{

                    var toolId=clickedElement.nextSibling.innerHTML;
                }


            }

        }

        if (self.currentTool != null) {
            if (Config.tools[self.currentTool].controller.unload) {
                Config.tools[self.currentTool].controller.unload();
            }
        }
        self.currentTool = toolId;

        if (toolId != "lineage") {
            Lineage_sources.registerSource = self.registerSourceWithoutImports;
        }

        $("#currentToolTitle").html(toolId);
        if (self.currentTheme['@'+toolId+'-logo']) {
            $("#currentToolTitle").html(`<button class="${toolId}-logo slsv-invisible-button" style="height:41px;width:41px;">`);
        }
        MainController.currentTool = toolId;
        if (self.toolsNeedSource.includes(toolId)) {
            if (self.source == null) {
                ResponsiveUI.showSourceDialog(true);
            } else {
                self.sourceSelect(self.source);
            }
        } else {
            self.initTool(toolId);
        }
    };

    self.onSourceSelect = function (evt, obj) {
        //  if (!MainController.currentTool) return self.alert("select a tool first");
        var p= obj.node.parents.indexOf("PRIVATE")
        if(p>0){
            Config.sourceOwner= obj.node.parents[p-1]

        }



        if (!obj.node.data || obj.node.data.type != "source") {
            $(obj.event.currentTarget).siblings().click();
            return;
        }

        var source = obj.node.data.id;
        self.sourceSelect(source);
    };
    self.sourceSelect = function (source) {
        MainController.currentSource = source;
        ResponsiveUI.source = source;
        $("#selectedSource").html(MainController.currentSource);

        $("#mainDialogDiv").parent().hide();

        self.initTool(MainController.currentTool, function (err, result) {
            if (err) {
                return self.alert(err.responseText);
            }
            self.resetWindowHeight();
        });
    };
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
        Lineage_sources.loadedSources = {};



        if (Config.tools[toolId].controller.onLoaded) {
            MainController.writeUserLog(authentication.currentUser, toolId, "");
            Config.tools[toolId].controller.onLoaded();
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
        /*
        self.showDiv("mainDialogDiv");
        $("#mainDialogDiv").css("display", "block");*/
        $("#" + "mainDialogDiv")
            .parent()
            .show();
        $("#sourceSelector_searchInput").focus();

        $("#mainDialogDiv").load("./responsive/lineage/html/SourceDiv.html", function () {
            $("#" + $("#mainDialogDiv").parent().attr("aria-labelledby")).html("Source Selector");
            $("#mainDialogDiv")
                .parent()
                .find(".ui-dialog-titlebar-close")
                .on("click", function () {
                    $("#mainDialogDiv").parent().hide();
                });

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

    self.setSlsvCssClasses = function (callback) {

        less.pageLoadFinished.then(function () {
            //setTimeout(() => {}, "500");
            ResponsiveUI.changeTheme(Config.theme.defaultTheme);

            if (Config.theme.selector) {
                $("#theme-selector-btn").show();
            }

            callback();
        });

    };

    self.themeList = function () {
        //less.modifyVars({'@button1-color': '#000'});
        var allThemesNames = Object.keys(Config.slsvColorThemes);
        common.fillSelectOptions("themeSelect", allThemesNames, false);
    };

    self.changeTheme = function (ThemeName) {
        var themeSelected = Config.slsvColorThemes[ThemeName];
        self.currentTheme=themeSelected;
        if (themeSelected["@logoInstance-icon"] == undefined || themeSelected["@logoInstance-icon"] == "") {
            $("#externalLogoDiv").hide();
        } else {
            $("#externalLogoDiv").show();
        }
        less.modifyVars(themeSelected);
        ResponsiveUI.darkThemeParams(themeSelected);
    };
    self.hideShowMenuBar = function (button) {
        if (self.menuBarShowed) {
            $("#MenuBarFooter").hide();
            $("#MenuBar").css("height", "21px");
            ResponsiveUI.resetWindowHeight();
            self.menuBarShowed = false;
            $(button).children().attr("src", "./icons/CommonIcons/ArrowMenuBarShow.png");
        } else {
            $("#MenuBarFooter").show();
            $("#MenuBar").css("height", "90px");
            ResponsiveUI.resetWindowHeight();
            self.menuBarShowed = true;
            $(button).children().attr("src", "./icons/CommonIcons/ArrowMenuBar.png");
        }
    };
    self.hideShowLateralPannel = function (button) {
        if (self.LateralPannelShowed) {
            $("#lineage-tab-buttons").hide();
            $(button).parent().hide();
            $("#lateralPanelDiv").css("width", "21px");
            $("#lateralPanelDiv").removeClass("ui-resizable");
            ResponsiveUI.resetWindowHeight();
            self.LateralPannelShowed = false;
            var buttonclone=button.cloneNode(true);
            $("#lateralPanelDiv").append(buttonclone);
            $(buttonclone).find("#ArrowLateralPannel").attr("src", "./icons/CommonIcons/ArrowLateralPannelShow.png");
            //$("#lateralPanelDiv").find("#ArrowLateralPannel");
        } else {
            $(button).remove();
            $("#lineage-tab-buttons").show();
            $("#WhiteboardContent").show();
            $("#lateralPanelDiv").css("width", "435px");
            ResponsiveUI.resetWindowHeight();
            self.LateralPannelShowed = true;
            var currentTabId='#tabs_'+$(".slsv-selectedTabDiv").attr('popupcomment').toLowerCase();
            $(currentTabId).children().show();

            /*$(button).parent().show();
            //$(button).parent().find("#ArrowLateralPannel").attr("src", "./icons/CommonIcons/ArrowLateralPannel.png");*/
            $("#lateralPanelDiv").addClass("ui-resizable");

        }
    };
    self.registerSourceWithoutImports = function (sourceLabel, callback) {
        if (!callback) {
            callback = function () {};
        }

        if (Lineage_sources.loadedSources[sourceLabel]) {
            return callback();
        }

        OntologyModels.registerSourcesModel(sourceLabel, function (err, result) {
            if (err) {
                return callback(err);
            }
            if (sourceLabel == self.source) {
                var sourceDivId = "source_" + common.getRandomHexaId(5);
                Lineage_sources.loadedSources[sourceLabel] = { sourceDivId: sourceDivId };
                Lineage_sources.sourceDivsMap[sourceDivId] = sourceLabel;
                var html =
                    "<div  id='" +
                    sourceDivId +
                    "' style='color: " +
                    Lineage_whiteboard.getSourceColor(sourceLabel) +
                    ";display:inline-flex;align-items:end;'" +
                    " class='Lineage_sourceLabelDiv'  " +
                    ">" +
                    sourceLabel +
                    "&nbsp;" +
                    /*   "<i class='lineage_sources_menuIcon' onclick='Lineage_sources.showSourceDivPopupMenu(\"" +
    sourceDivId +
    "\")'>[-]</i>";*/
                    "<button class='arrow-icon slsv-invisible-button'  style=' width: 20px;height:20px;}' onclick='Lineage_sources.showSourceDivPopupMenu(\"" +
                    sourceDivId +
                    "\")'/> </button></div>";
                $("#lineage_drawnSources").append(html);

                $("#" + sourceDivId).bind("click", function (e) {
                    var sourceDivId = $(this).attr("id");
                    var source = self.sourceDivsMap[sourceDivId];
                    Lineage_sources.setCurrentSource(source);
                });
                return callback();
            } else {
                return callback();
            }
        });
    };
    self.PopUpOnHoverButtons = function () {
        $(".w3-button").off();
        $(".w3-bar-item").off();
        $(".w3-button").on("mouseenter", function () {
            var comment = $(this).attr("popupcomment");
            if (comment) {
                var html = "<div>" + comment + "</div>";
                PopupMenuWidget.initAndShow(html, "popupMenuWidgetDiv", { Button: this });
            }
        });

        $(".w3-bar-item").on("mouseenter", function () {
            var comment = $(this).attr("popupcomment");
            if (comment) {
                var html = "<div>" + comment + "</div>";
                PopupMenuWidget.initAndShow(html, "popupMenuWidgetDiv", { Button: this });
            }
        });
    };
    self.darkThemeParams=function(theme){
        // pas suffisant mettre  a jour graph
        if(theme){
            if(theme['@isDarkTheme']){
                Lineage_whiteboard.defaultNodeFontColor='white';

            }
            else{
                Lineage_whiteboard.defaultNodeFontColor="#343434";
            }
        }
    }

    return self;
})();
export default ResponsiveUI;
window.ResponsiveUI = ResponsiveUI;
