import common from "../modules/shared/common.js";
import authentication from "../modules/shared/authentification.js";
import Clipboard from "../modules/shared/clipboard.js";
import Lineage_sources from "../modules/tools/lineage/lineage_sources.js";
import SourceSelectorWidget from "../modules/uiWidgets/sourceSelectorWidget.js";
import Lineage_whiteboard from "../modules/tools/lineage/lineage_whiteboard.js";
import MainController from "../modules/shared/mainController.js";


var ResponsiveUI = (function () {
    var self = {};
    self.source = null;
    self.menuBarShowed = true;
    self.LateralPannelShowed = true;
    self.currentTool = null;
    self.toolsNeedSource = ["lineage", "KGquery", "KGcreator", "TimeLine"];
    self.smartPhoneScreen = null;
    //Etablish the resizing, load select bar tools --> Keep here
    self.init = function () {
        self.oldRegisterSource = Lineage_sources.registerSource;

        // Config.userTools.forEach((item, index) => {
        for (var item in Config.userTools) {
            var logoTool = `<div style='height:35px;width:37px;' class='${item}-logo' ></div>`;
            var strTool = `<div class='Lineage_PopUpStyleDiv' style='display:flex;flex-direction:row;align-items:center;' >${logoTool}<div  value="${item}">${item}</div></div>`;

            $("#toolsSelect").append(strTool);
        }

        window.addEventListener(
            "resize",
            function (event) {
                self.resetWindowHeight();
                if (self.currentTool == "KGcreator") {
                    KGcreator.ResetRunMappingTabWidth();
                }
            },
            true
        );

        self.themeList();
        //self.replaceFile(BotEngine, BotEngineResponsive);
        ResponsiveUI.resetWindowHeight();
    };
    // keep here
    self.initMenuBar = function (fn) {
        $("#Lineage_changeSourceButton").show();
        $("#index_topContolPanel").show();
        //Loading
        $("#index_topContolPanel").load("./modules/tools/lineage/html/Lineage_sourcesDiv.html", function () {
            if (self.currentTool != "lineage") {
                $("#Lineage_addSourceButton").remove();
                $("#Lineage_allSourceButton").remove();
            }
            fn();
        });
    };
    // Keep Here
    self.resetWindowHeight = function () {
        var MenuBarHeight = $("#MenuBar").height();
        var LateralPannelWidth = $("#lateralPanelDiv").width();
        // Mobile format graph div reset
        if ($(window).width() <= 500) {
            $("#graphDiv").css("width", $(window).width());
            $("#lateralPanelDiv").css("width", $(window).width());
            self.smartPhoneScreen = true;
        } else {
            if (self.smartPhoneScreen) {
                LateralPannelWidth = 435;
            }
            self.smartPhoneScreen = false;

            $("#graphDiv").css("width", $(window).width() - LateralPannelWidth - 10);
            $("#lateralPanelDiv").css("width", LateralPannelWidth);
        }

        $("#graphAndCommandScreen").css("height", $(window).height() - MenuBarHeight - 7);
        //$("#graphDiv").css("height", $(window).height() - MenuBarHeight - 1);
        //Lineage_whiteboard.lineageVisjsGraph.network.startSimulation();
    };

    //  MainController --> onToolSelect.initTool   when click on a button of a tool
    // Manage when we click on a tool with parameter event
    // Or when we choose a tool with the url with toolId parameter
    self.onToolSelect = function (toolId, event,callback) {
        if (event) {
            var clickedElement = event.target;
            // if class
            if (clickedElement.className == "Lineage_PopUpStyleDiv") {
                var toolId = $(clickedElement).children()[1].innerHTML;
            } else {
                if (clickedElement.id == "toolsSelect") {
                    return;
                } else if (clickedElement.innerHTML) {
                    var toolId = clickedElement.innerHTML;
                } else {
                    var toolId = clickedElement.nextSibling.innerHTML;
                }
            }
        }

        if (self.currentTool != null) {
            if (Config.userTools[self.currentTool].controller.unload) {
                Config.userTools[self.currentTool].controller.unload();
            }
        }
        self.currentTool = toolId;

        if (toolId != "lineage" && self.toolsNeedSource.includes(toolId)) {
            Lineage_sources.registerSource = Lineage_sources.registerSourceWithoutDisplayingImports;
        }

        $("#currentToolTitle").html(toolId);
        if (self.currentTheme["@" + toolId + "-logo"]) {
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
        if(callback){
            callback()
        }
    };
    //MainController.onSourceSelect
    // onSourceSelect is an event click functions when we choose a source she attribute the correct source corresponding to the click then execute source select which is the 
    // the real execution of what we do when we choosed a source 
    self.onSourceSelect = function (evt, obj) {
        //  if (!MainController.currentTool) return self.alert("select a tool first");
        var p = obj.node.parents.indexOf("PRIVATE");
        if (p > 0) {
            Config.sourceOwner = obj.node.parents[p - 1];
        }

        if (!obj.node.data || obj.node.data.type != "source") {
            $(obj.event.currentTarget).siblings().click();
            return;
        }

        var source = obj.node.data.id;
        self.sourceSelect(source);
    };
    //To MainController too
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
    // MainController 
    self.onSourceSelect_AddSource = function (evt, obj) {
        //  if (!MainController.currentTool) return self.alert("select a tool first");
        if (!obj.node.data || obj.node.data.type != "source") {
            return self.alert("select a tool");
        }

        MainController.currentSource = obj.node.data.id;
        $("#selectedSource").html(MainController.currentSource);
        $("#mainDialogDiv").parent().hide();
        Lineage_whiteboard.init();
    };
    // MainController
    //Giving a tool in parameter and the function launch it
    self.initTool = function (toolId, callback) {
        var toolObj = Config.userTools[toolId];
        MainController.initControllers();
        MainController.writeUserLog(authentication.currentUser, MainController.currentTool, "");
        Clipboard.clear();
        Lineage_sources.loadedSources = {};

        if (Config.userTools[toolId].controller.onLoaded) {
            MainController.writeUserLog(authentication.currentUser, toolId, "");
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
   
    //Keep
    self.ApplySelectedTabCSS = function (buttonClicked, tabGroup) {
        var x = $("#" + tabGroup + "-buttons").children();
        if (x.length > 0) {
            x.removeClass("slsv-selectedTabDiv");
            x.children().removeClass("slsv-tabButtonSelected");
        }

        $(buttonClicked).addClass("slsv-tabButtonSelected");
        $(buttonClicked).parent().addClass("slsv-selectedTabDiv");
    };
    //Keep
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
    // Keep
    self.showSourceDialog = function (resetAll) {
        //self.openDialogDiv("mainDialogDiv");
        $("#" + "mainDialogDiv")
            .parent()
            .show();
        $("#sourceSelector_searchInput").focus();
        var onSourceSelect;
        if (resetAll) {
            Lineage_sources.loadedSources = {};
            onSourceSelect = ResponsiveUI.onSourceSelect;
        } else {
            onSourceSelect = ResponsiveUI.onSourceSelect_AddSource;
        }
        SourceSelectorWidget.initWidget(null, "mainDialogDiv", true, onSourceSelect, null, null, function () {
            $("#" + $("#mainDialogDiv").parent().attr("aria-labelledby")).html("Source Selector");
        });
    };
    //keep
    /*
    self.openDialogDiv = function (div) {
        
        $("#" + div).empty();
        $("#" + div).dialog();
    };*/
    //keep
    self.setSlsvCssClasses = function (callback) {
        less.pageLoadFinished.then(async function () {
            //setTimeout(() => {}, "500");
            // fetch theme from api
            const response = await fetch("/api/v1/users/theme");
            if (response.status == 400) {
                ResponsiveUI.changeTheme(Config.theme.defaultTheme);
                return callback();
            }

            const data = await response.json();
            ResponsiveUI.changeTheme(data.theme);

            if (Config.theme.selector) {
                $("#theme-selector-btn").show();
            }

            callback();
        });
    };
    //Keep
    self.themeList = function () {
        //less.modifyVars({'@button1-color': '#000'});
        var allThemesNames = Object.keys(Config.slsvColorThemes);
        common.fillSelectOptions("themeSelect", allThemesNames, false);
    };
    //Keep
    self.changeTheme = function (themeName) {
        if (!themeName) return;
        var themeSelected = Config.slsvColorThemes[themeName];
        self.currentTheme = themeSelected;
        if (themeSelected["@logoInstance-icon"] == undefined || themeSelected["@logoInstance-icon"] == "") {
            $("#externalLogoDiv").hide();
        } else {
            $("#externalLogoDiv").show();
        }
        less.modifyVars(themeSelected);
        ResponsiveUI.darkThemeParams(themeSelected);
    };
    //Keep
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
    //Keep
    self.hideShowLateralPannel = function (button) {
        if (self.smartPhoneScreen) {
            return;
        }
        if (self.LateralPannelShowed) {
            $("#lineage-tab-buttons").hide();
            $(button).parent().hide();
            $("#lateralPanelDiv").css("width", "21px");
            $("#lateralPanelDiv").removeClass("ui-resizable");
            ResponsiveUI.resetWindowHeight();
            self.LateralPannelShowed = false;
            var buttonclone = button.cloneNode(true);
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
            var currentTabId = "#tabs_" + $(".slsv-selectedTabDiv").attr("popupcomment").toLowerCase();
            $(currentTabId).children().show();

            /*$(button).parent().show();
            //$(button).parent().find("#ArrowLateralPannel").attr("src", "./icons/CommonIcons/ArrowLateralPannel.png");*/
            $("#lateralPanelDiv").addClass("ui-resizable");
        }
    };
    //Lineage.sources
    self.registerSourceWithoutDisplayingImports = function (sourceLabel, callback) {
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
                $("#Lineage_sourcesDiv").append(html);

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
    //keep
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
    //keep
    self.darkThemeParams = function (theme) {
        if (theme) {
            if (theme["@isDarkTheme"]) {
                Lineage_whiteboard.defaultNodeFontColor = "white";

                if (Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                    Lineage_whiteboard.lineageVisjsGraph.options.visjsOptions.nodes.font.color = "white";
                    Lineage_whiteboard.lineageVisjsGraph.network.setOptions(Lineage_whiteboard.lineageVisjsGraph.options.visjsOptions);
                    Lineage_sources.showHideEditButtons(self.source);
                }
            } else {
                Lineage_whiteboard.defaultNodeFontColor = "#343434";
                if (Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                    Lineage_whiteboard.lineageVisjsGraph.options.visjsOptions.nodes.font.color = "#343434";
                    Lineage_whiteboard.lineageVisjsGraph.network.setOptions(Lineage_whiteboard.lineageVisjsGraph.options.visjsOptions);
                    Lineage_sources.showHideEditButtons(self.source);
                }
            }
            ResponsiveUI.resetWindowHeight();
        }
    };

    return self;
})();
export default ResponsiveUI;
window.ResponsiveUI = ResponsiveUI;
