import common from "../../modules/shared/common.js";
import authentication from "../../modules/shared/authentification.js";
import Clipboard from "../../modules/shared/clipboard.js";
import Lineage_sources from "../../modules/tools/lineage/lineage_sources.js";
import SourceSelectorWidget from "../../modules/uiWidgets/sourceSelectorWidget.js";

import Lineage_whiteboard from "../../modules/tools/lineage/lineage_whiteboard.js";

import MainController from "../../modules/shared/mainController.js";

var ResponsiveUI = (function () {
    var self = {};

    self.menuBarShowed = true;
    self.LateralPanelShowed = true;
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
                if (MainController.currentTool == "KGcreator") {
                    KGcreator.ResetRunMappingTabWidth();
                }
            },
            true
        );

        self.themeList();

        ResponsiveUI.resetWindowHeight();
    };
    // keep
    self.showSourceDialog = function (resetAll) {
        self.openDialogDiv("mainDialogDiv");
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
    // keep here
    self.initMenuBar = function (fn) {
        $("#ChangeSourceButton").show();
        $("#index_topContolPanel").show();
        //Loading
        $("#index_topContolPanel").load("./modules/tools/lineage/html/sourcesDiv.html", function () {
            if (MainController.currentTool != "lineage") {
                $("#AddSourceButton").remove();
                $("#AllSourceButton").remove();
            }
            fn();
        });
    };

    // Keep Here
    self.resetWindowHeight = function () {
        var MenuBarHeight = $("#MenuBar").height();
        var LateralPanelWidth = $("#lateralPanelDiv").width();
        // Mobile format graph div reset
        if ($(window).width() <= 500) {
            $("#graphDiv").css("width", $(window).width());
            $("#lateralPanelDiv").css("width", $(window).width());
            self.smartPhoneScreen = true;
        } else {
            if (self.smartPhoneScreen) {
                LateralPanelWidth = 435;
            }
            self.smartPhoneScreen = false;

            $("#graphDiv").css("width", $(window).width() - LateralPanelWidth - 10);
            $("#lateralPanelDiv").css("width", LateralPanelWidth);
        }

        $("#graphAndCommandScreen").css("height", $(window).height() - MenuBarHeight - 7);
        if ($("#lateralPanelDiv").data("ui-resizable") != undefined) {
            $("#lateralPanelDiv").resizable("destroy");
            $("#lateralPanelDiv").resizable({
                maxWidth: $(window).width() - 100,
                minWidth: 150,
                stop: function (event, ui) {
                    ResponsiveUI.resetWindowHeight();
                },
            });
        }
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
    //keep
    self.openDialogDiv = function (div) {
        $("#" + div).empty();
        $("#" + div).dialog();
    };
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
    self.hideShowLateralPanel = function (button) {
        if (self.smartPhoneScreen) {
            return;
        }
        if (self.LateralPanelShowed) {
            $("#lineage-tab-buttons").hide();
            $(button).parent().hide();
            $("#lateralPanelDiv").css("width", "21px");
            $("#lateralPanelDiv").removeClass("ui-resizable");
            ResponsiveUI.resetWindowHeight();
            self.LateralPanelShowed = false;
            var buttonclone = button.cloneNode(true);
            $("#lateralPanelDiv").append(buttonclone);
            $(buttonclone).find("#ArrowLateralPanel").attr("src", "./icons/CommonIcons/ArrowLateralPanelShow.png");
            //$("#lateralPanelDiv").find("#ArrowLateralPanel");
        } else {
            $(button).remove();
            $("#lineage-tab-buttons").show();
            $("#WhiteboardContent").show();
            $("#lateralPanelDiv").css("width", "435px");
            ResponsiveUI.resetWindowHeight();
            self.LateralPanelShowed = true;
            var currentTabId = "#tabs_" + $(".slsv-selectedTabDiv").attr("popupcomment").toLowerCase();
            $(currentTabId).children().show();

            /*$(button).parent().show();
            //$(button).parent().find("#ArrowLateralPanel").attr("src", "./icons/CommonIcons/ArrowLateralPanel.png");*/
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
    //keep
    self.darkThemeParams = function (theme) {
        if (theme) {
            if (theme["@isDarkTheme"]) {
                Lineage_whiteboard.defaultNodeFontColor = "white";

                if (Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                    Lineage_whiteboard.lineageVisjsGraph.options.visjsOptions.nodes.font.color = "white";
                    Lineage_whiteboard.lineageVisjsGraph.network.setOptions(Lineage_whiteboard.lineageVisjsGraph.options.visjsOptions);
                    Lineage_sources.showHideEditButtons(MainController.currentSource);
                }
            } else {
                Lineage_whiteboard.defaultNodeFontColor = "#343434";
                if (Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                    Lineage_whiteboard.lineageVisjsGraph.options.visjsOptions.nodes.font.color = "#343434";
                    Lineage_whiteboard.lineageVisjsGraph.network.setOptions(Lineage_whiteboard.lineageVisjsGraph.options.visjsOptions);
                    Lineage_sources.showHideEditButtons(MainController.currentSource);
                }
            }
            ResponsiveUI.resetWindowHeight();
        }
    };
    //keep
    self.homePage = function () {
        window.document.location.href = window.document.location.origin + "/vocables/";
    };
    //keep
    self.disableEditButtons = function (source, hide) {
        $("#Lineage_graphEditionButtons").hide();
        if (!Lineage_whiteboard.lineageVisjsGraph.network) {
            return;
        }

        Lineage_whiteboard.lineageVisjsGraph.network.disableEditMode();
        $(".vis-edit-mode").css("display", "none");
    };
    return self;
})();
export default ResponsiveUI;
window.ResponsiveUI = ResponsiveUI;
