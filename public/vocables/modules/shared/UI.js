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
        var messageDiv = $("#messageDiv");
        var waitImgDiv = $("#waitImg");
        if (messageDiv.length == 0 || waitImgDiv.length == 0) {
            messageDiv = $("#KGquery_messageDiv");
            waitImgDiv = $("#KGquery_waitImg");
        }
        if (message.length > 200) {
            alert(message);
        } else {
            messageDiv.html(message);
        }
        if (stopWaitImg) {
            waitImgDiv.css("display", "none");
        }
        if (startWaitImg) {
            waitImgDiv.css("display", "block");
        }
    };

    self.setCredits = function () {
        var LateralPanelWidth = $("#lateralPanelDiv").width();
        var gifStart = $(window).width() / 2 - LateralPanelWidth + 100;
        // Load image only when it is ready to has useful resetWindowSize
        /*"<img>", {
            src: "images/souslesensVocables.gif",
            css: {
                
                display: "block"
            }
        }*/

        var gif = $(`<img  src=\"images/souslesensVocables.gif\" >`).on("load", function () {
            $("#graphDiv").html("<div style='position:absolute;left:" + gifStart + "px'>" + $(this).prop("outerHTML") + "</div>");
            UI.resetWindowSize();
        });
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

        const selector = document.getElementById("toolsSelect");
        if (selector !== null) {
            const tools = Config.tools_available || [];
            tools.forEach((tool) => {
                if (tool in Config.userTools) {
                    let rowLogo = document.createElement("div");
                    rowLogo.setAttribute("class", `${tool}-logo`);
                    let rowText = document.createElement("div");
                    rowText.appendChild(document.createTextNode(tool));
                    rowText.setAttribute("value", tool);

                    let row = document.createElement("div");
                    row.setAttribute("class", "Lineage_PopUpStyleDiv");
                    row.appendChild(rowLogo);
                    row.appendChild(rowText);
                    selector.appendChild(row);
                }
            });
        }

        window.addEventListener(
            "resize",
            function (event) {
                self.resetWindowSize();
                if (MainController.currentTool == "KGcreator") {
                    KGcreator.ResetRunMappingTabWidth();
                }
            },
            true,
        );

        self.themeList();

        UI.resetWindowSize();
    };
    // keep

    // keep here
    self.initMenuBar = function (callback) {
        $("#index_topContolPanel").parent().show();
        $("#ChangeSourceButton").show();
        $("#index_topContolPanel").show();
        //Loading
        $("#index_topContolPanel").load("./modules/tools/lineage/html/sourcesDiv.html", function () {
            if (MainController.currentTool != "lineage") {
                $("#AddSourceButton").remove();
                $("#AllSourceButton").remove();
            }
            if (callback) {
                callback();
            }
        });
    };

    // Keep Here
    self.resetWindowSize = function () {
        var MenuBarHeight = $("#MenuBar").height();
        var LateralPanelWidth = $("#lateralPanelDiv").width();
        var rightControlPanelWidth = $("#rightControlPanelDiv").width();
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
            $("#graphDivContainer").css("width", $(window).width() - LateralPanelWidth - 25);
            $("#graphDiv").css("width", $(window).width() - LateralPanelWidth - rightControlPanelWidth - 25);
            $("#lateralPanelDiv").css("width", LateralPanelWidth);
        }

        $("#graphAndCommandScreen").css("height", $(window).height() - MenuBarHeight - 7);
        if ($("#lateralPanelDiv").data("ui-resizable") != undefined) {
            $("#lateralPanelDiv").resizable("destroy");
            $("#lateralPanelDiv").resizable({
                maxWidth: $(window).width() - 100,
                minWidth: 150,
                stop: function (event, ui) {
                    UI.resetWindowSize();
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

    self.sideBySideTwoWindows = function (existingWindow, newWindow) {
        const gap = 12;
        const windowWidth = $(window).width();
        const windowHeight = $(window).height();

        $(existingWindow).dialog({ modal: false, draggable: true, resizable: true, appendTo: "body" });
        $(newWindow).dialog({ modal: false, draggable: true, resizable: true, appendTo: "body" });

        const existingWindowConvert = $(existingWindow).closest(".ui-dialog");
        const newWindowConvert = $(newWindow).closest(".ui-dialog");
        let widthexistingWindow = existingWindowConvert.outerWidth(),
            heightExistingWindow = existingWindowConvert.outerHeight();
        let widthNewWindow = newWindowConvert.outerWidth(),
            hR = newWindowConvert.outerHeight();

        const maxEachW = Math.max(200, Math.floor((windowWidth - 3 * gap) / 2));
        widthexistingWindow = Math.min(widthexistingWindow, maxEachW);
        widthNewWindow = Math.min(widthNewWindow, maxEachW);
        const maxH = windowHeight - 2 * gap;
        const targetH = Math.min(Math.max(200, Math.min(heightExistingWindow, hR)), maxH);

        $(existingWindow).dialog("option", { width: widthexistingWindow, height: targetH });
        $(newWindow).dialog("option", { width: widthNewWindow, height: targetH });

        const offL = existingWindowConvert.offset() || { left: gap, top: gap };
        const top = Math.min(Math.max(gap, offL.top), windowHeight - gap - targetH);
        $(newWindow).dialog("option", "position", {
            my: "right top",
            at: `right+${gap} top+${top}`,
            of: window,
        });
        $(existingWindow).dialog("option", "position", {
            my: "left top",
            at: `left-${gap} top+${top}`,
            of: window,
        });

        //  Prevent from going outside during drag/resize
        try {
            existingWindowConvert.draggable("option", "containment", "window");
        } catch (e) {}
        try {
            newWindowConvert.draggable("option", "containment", "window");
        } catch (e) {}
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
            UI.resetWindowSize();
            self.menuBarShowed = false;
            $(button).children().attr("src", "./icons/CommonIcons/ArrowMenuBarShow.png");
        } else {
            $("#MenuBarFooter").show();
            $("#MenuBar").css("height", "90px");
            UI.resetWindowSize();
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
            UI.resetWindowSize();
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
            UI.resetWindowSize();
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
            UI.resetWindowSize();
        }
    };
    //keep
    self.homePage = function (options) {
        if (options?.notRefresh) {
            window.history.replaceState({}, "", window.document.location.origin + "/vocables/");
            $("#mainDialogDiv").dialog({ close: function () {} });
            return;
        }
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
        var selectList;
        if (selectListDivId instanceof jQuery) {
            selectList = selectListDivId;
        } else {
            selectList = $("#" + selectListDivId);
        }
        var numberOfOptions = selectList.find("option").length;
        if (numberOfOptions < maxSize) {
            // Si le nombre d'éléments est inférieur à 10, on ajuste la taille
            selectList.attr("size", numberOfOptions);
            if (numberOfOptions == 1) {
                selectList.attr("size", 2);
            }
        } else {
            // Sinon, on fixe à 10
            selectList.attr("size", maxSize);
        }
        // Hide scrollbar if size <10
        if (numberOfOptions < maxSize) {
            selectList.addClass("hideScrollBar");
        } else {
            selectList.removeClass("hideScrollBar");
        }
        // Force size with height because some time browser don't resize correctly
        if (numberOfOptions < maxSize) {
            var optionHeight = selectList.find("option").first().outerHeight();
            selectList.height(optionHeight * numberOfOptions);
        } else {
            var optionHeight = selectList.find("option").first().outerHeight();
            selectList.height(optionHeight * maxSize);
        }
    };
    self.setDialogTitle = function (div, title) {
        // accept "" title
        if (!div || title === undefined || title === null) {
            return;
        }
        if (!div.startsWith("#")) {
            div = "#" + div;
        }
        $(div).dialog("option", "title", title);
    };
    self.openDialog = function (divId, options) {
        if (!divId) {
            return;
        }
        if (!options) {
            options = {};
        }
        if (!divId.startsWith("#")) {
            divId = "#" + divId;
        }
        $("#" + divId).dialog("open");
        var title = "";
        if (options.title) {
            title = options.title;
        }
        self.setDialogTitle(divId, title);
    };
    return self;
})();
export default UI;
window.UI = UI;
