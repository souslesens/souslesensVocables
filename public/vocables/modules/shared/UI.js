import common from "../../modules/shared/common.js";
import Lineage_sources from "../../modules/tools/lineage/lineage_sources.js";
import SourceSelectorWidget from "../../modules/uiWidgets/sourceSelectorWidget.js";
import Lineage_whiteboard from "../../modules/tools/lineage/lineage_whiteboard.js";
import MainController from "../../modules/shared/mainController.js";

var UI = (function () {
    var self = {};

    self.menuBarShowed = true;
    self.LateralPanelShowed = true;
    self.smartPhoneScreen = null;

    self.message = function (message, stopWaitImg, startWaitImg) {
        if (message.length > 200) {
            alert(message);
        } else {
            $("#messageDiv").html(message);
        }
        if (stopWaitImg) {
            $("#waitImg").css("display", "none");
        }
        if (startWaitImg) {
            $("#waitImg").css("display", "block");
        }
    };

    self.setCredits = function () {
        var LateralPanelWidth = $("#lateralPanelDiv").width();
        var gifStart = $(window).width() / 2 - LateralPanelWidth + 100;
        var html =
            "<div style='position:absolute;left:" +
            gifStart +
            "px'>" +
            " " +
            " <img  src=\"images/souslesensVocables.gif\" style='background:url('images/circulargraph.png');background-repeat: no-repeat;display: block; '>" +
            "</div>";
        $("#graphDiv").html(html);
    };
    self.cleanPage = function () {
        $("#graphDiv").empty();
        $("#Lineage_graphEditionButtons").hide();
        $("#lateralPanelDiv").empty();
        $("#index_topContolPanel").hide();
        self.setCredits();
    };
    /*

        check if used ??
         */
    self.showHideRightPanel = function (showOrHide) {
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
    };

    self.copyCurrentQuery = function () {
        common.copyTextToClipboard(Sparql_proxy.currentQuery);
    };

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

        UI.resetWindowHeight();
    };
    // keep

    // keep here
    self.initMenuBar = function (fn) {
        $("#index_topContolPanel").parent().show();
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
                    UI.resetWindowHeight();
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
        var colorVars = Config.slsvColorThemes[themeName];
        var iconsPathsVars = self.getIconsVarsPaths(themeName);
        var themeSelected = { ...colorVars, ...iconsPathsVars };
        self.currentTheme = themeSelected;
        if (themeSelected["@logoInstance-icon"] == undefined || themeSelected["@logoInstance-icon"] == "") {
            $("#externalLogoDiv").hide();
        } else {
            $("#externalLogoDiv").show();
        }
        less.modifyVars(themeSelected);
        UI.darkThemeParams(themeSelected);
    };
    self.getIconsVarsPaths = function (themeName) {
        var iconsVarPaths = {};
        Object.keys(Config.lessIconsFileNames).forEach(function (iconVar) {
            var fileName = Config.lessIconsFileNames[iconVar];
            var path = `../../icons/${themeName.replaceAll(" ", "")}/${fileName}-${themeName.replaceAll(" ", "")}.png`;
            iconsVarPaths[iconVar] = path;
        });
        return iconsVarPaths;
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
    self.hideShowLateralPanel = function (button) {
        if (self.smartPhoneScreen) {
            return;
        }
        if (self.LateralPanelShowed) {
            $("#lineage-tab-buttons").hide();
            $(button).parent().hide();
            $("#lateralPanelDiv").css("width", "21px");
            $("#lateralPanelDiv").removeClass("ui-resizable");
            UI.resetWindowHeight();
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
            UI.resetWindowHeight();
            self.LateralPanelShowed = true;
            var currentTabId = $(".slsv-selectedTabDiv").attr("title").toLowerCase() + "Tab";
            $("#" + currentTabId)
                .children()
                .show();

            /*$(button).parent().show();
            //$(button).parent().find("#ArrowLateralPanel").attr("src", "./icons/CommonIcons/ArrowLateralPanel.png");*/
            $("#lateralPanelDiv").addClass("ui-resizable");
        }
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
            UI.resetWindowHeight();
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
    self.adjustSelectListSize = function (selectListDivId, maxSize) {
        var numberOfOptions = $("#" + selectListDivId).find("option").length;
        if (numberOfOptions < maxSize) {
            // Si le nombre d'éléments est inférieur à 10, on ajuste la taille
            $("#" + selectListDivId).attr("size", numberOfOptions);
            if (numberOfOptions == 1) {
                $("#" + selectListDivId).attr("size", 2);
            }
        } else {
            // Sinon, on fixe à 10
            $("#" + selectListDivId).attr("size", maxSize);
        }
    };
    return self;
})();
export default UI;
window.UI = UI;
