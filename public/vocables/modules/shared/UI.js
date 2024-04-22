/*import Lineage_sources from "../../tools/lineage/lineage_sources.js";
import SourceSelectorWidget from "../../uiWidgets/sourceSelectorWidget.js";
import Lineage_whiteboard from "../../tools/lineage/lineage_whiteboard.js";*/
import common from "./common.js";
import authentication from "./authentification.js";
import Clipboard from "./clipboard.js";
import MainController from "./mainController.js";


var UI = (function () {
    var self = {};
    self.source = null;
    self.menuBarShowed = true;
    self.LateralPannelShowed = true;
    self.currentTool = null;
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
        UI.resetWindowHeight();
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
            onSourceSelect = MainController.onSourceSelect;
        } else {
            onSourceSelect = MainController.onSourceSelect_AddSource;
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
                UI.changeTheme(Config.theme.defaultTheme);
                return callback();
            }

            const data = await response.json();
            UI.changeTheme(data.theme);

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
        UI.darkThemeParams(themeSelected);
    };
    //Keep
    self.hideShowMenuBar = function (button) {
        if (self.menuBarShowed) {
            $("#MenuBarFooter").hide();
            $("#MenuBar").css("height", "21px");
            UI.resetWindowHeight();
            self.menuBarShowed = false;
            $(button).children().attr("src", "./icons/CommonIcons/ArrowMenuBarShow.png");
        } else {
            $("#MenuBarFooter").show();
            $("#MenuBar").css("height", "90px");
            UI.resetWindowHeight();
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
            UI.resetWindowHeight();
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
            UI.resetWindowHeight();
            self.LateralPannelShowed = true;
            var currentTabId = "#tabs_" + $(".slsv-selectedTabDiv").attr("popupcomment").toLowerCase();
            $(currentTabId).children().show();

            /*$(button).parent().show();
            //$(button).parent().find("#ArrowLateralPannel").attr("src", "./icons/CommonIcons/ArrowLateralPannel.png");*/
            $("#lateralPanelDiv").addClass("ui-resizable");
        }
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
    self.message= function (message, stopWaitImg,startWaitImg) {
        $("#messageDiv").html(message);
        if (stopWaitImg) {
            $("#waitImg").css("display", "none");
        }
        if (startWaitImg) {
            $("#waitImg").css("display", "block");
        }
    },
    self.getJstreeConceptsContextMenu= function () {
        if (!self.currentTool || !Config.userTools[self.currentTool]) {
            return;
        }
        var controller = Config.userTools[self.currentTool].controller;
        if (controller.jstreeContextMenu) {
            return controller.jstreeContextMenu();
        }
    },
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
            UI.resetWindowHeight();
        }
    };
    

    return self;
})();
export default UI;
window.UI = UI;
