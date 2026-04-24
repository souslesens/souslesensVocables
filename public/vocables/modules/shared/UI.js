import common from "../../modules/shared/common.js";
import Lineage_sources from "../../modules/tools/lineage/lineage_sources.js";
import SourceSelectorWidget from "../../modules/uiWidgets/sourceSelectorWidget.js";
import Lineage_whiteboard from "../../modules/tools/lineage/lineage_whiteboard.js";
import MainController from "../../modules/shared/mainController.js";

var UI = (function () {
    var self = {};
    var pendingCreditsGif = null;

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
        var gif = $(`<img src="images/souslesensVocables.gif">`).on("load", function () {
            if (pendingCreditsGif !== gif) return;
            $("#graphAndCommandScreen").append(
                "<div id='slsv-credits-logo' style='position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:0;'>" + $(this).prop("outerHTML") + "</div>",
            );
            UI.resetWindowSize();
        });
        pendingCreditsGif = gif;
    };

    self.cancelCredits = function () {
        pendingCreditsGif = null;
    };
    self.cleanPage = function () {
        $("#graphDiv").empty();
        $("#slsv-credits-logo").remove();
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
        var query = Sparql_proxy.currentQuery;
        if (query) {
            var offsetIndex = query.lastIndexOf(" offset ");
            if (offsetIndex > -1) {
                query = query.substring(0, offsetIndex);
            }
        }
        common.copyTextToClipboard(query);
    };

    //Etablish the resizing, load select bar tools --> Keep here
    self.init = function () {
        self.oldRegisterSource = Lineage_sources.registerSource;

        const selector = document.getElementById("toolsSelect");
        if (selector !== null) {
            const tools = Config.tools_available || [];
            tools.forEach((tool) => {
                if (tool in Config.userTools) {
                    if (tool === "UserSettings") {
                        // UserSettings is not on the toolmenu, but on the usermenu
                        const selector = document.getElementById("user-menu-selector");
                        console.log("selector", selector);
                        const elem = document.createElement("option");
                        elem.setAttribute("value", "usersettings");
                        elem.append("UserSettings");
                        selector.appendChild(elem);
                    } else {
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
                }
            });
        }

        window.addEventListener(
            "resize",
            function (event) {
                self.resetWindowSize();
                self.repositionOpenDialogs();
                if (MainController.currentTool == "KGcreator") {
                    KGcreator.ResetRunMappingTabWidth();
                }
            },
            true,
        );

        $(document).on("dialogopen", function (event) {
            self.clampAndCenterDialog(event.target);
        });

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

    self.sourcePopupIsCompact = false;
    self.sourcePopupHideTimer = null;
    self.sourceContextMenuObserver = null;
    self.sourceListObserver = null;

    self.sourcePopupHideDelay = 150;
    self.sourcePopupEventsNamespace = ".sourcesPanel";
    //self.sourcePopupFirstLoad = true;
    self.sourcePopupSelectors = {
        panel: "#index_topContolPanel",
        bar: "#lineage_drawnSources",
        popup: "#lineage_sourcesPopup",
        addPanel: "#lineage_r_addPanel",
        sourceButtons: "#lineage_sourceButtons",
        compactIndicator: "#lineage_compactSourceIndicator",
        activeSource: "#lineage_r_addPanel .Lineage_selectedSourceDiv",
        contextMenu: "#popupMenuWidgetDiv",
    };

    self.isSourceContextMenuOpen = function () {
        /*if (self.sourcePopupFirstLoad) {
            // Avoid treating the context menu as part of the panel on first load when the popup is shown programmatically before any user interaction.
            self.sourcePopupFirstLoad = false;
            return false;
        }*/
        return $(self.sourcePopupSelectors.contextMenu).is(":visible");
    };

    self.sourcePopupOverflows = function () {
        var $popup = $(self.sourcePopupSelectors.popup);
        var $bar = $(self.sourcePopupSelectors.bar);
        if (!$popup.length || !$bar.length) {
            return false;
        }
        return $popup[0].getBoundingClientRect().right > $bar[0].getBoundingClientRect().right + 1;
    };

    self.refreshSourcePopupIndicator = function () {
        var $indicator = $(self.sourcePopupSelectors.compactIndicator);
        var $active = $(self.sourcePopupSelectors.activeSource).first();
        if ($active.length) {
            var arrowIcon = '<div class="arrow-icon slsv-invisible-button" style="height: 20px; width: 20px;"></div>';
            $indicator
                .html($active.prop("outerHTML") + arrowIcon)
                .css("display", "inline-flex")
                .css("align-items", "center");
        } else {
            $indicator.hide().empty();
        }
    };

    self.cancelSourcePopupHide = function () {
        if (self.sourcePopupHideTimer) {
            clearTimeout(self.sourcePopupHideTimer);
            self.sourcePopupHideTimer = null;
        }
    };

    self.disconnectSourceContextMenuObserver = function () {
        if (self.sourceContextMenuObserver) {
            self.sourceContextMenuObserver.disconnect();
            self.sourceContextMenuObserver = null;
        }
    };

    self.disconnectSourceListObserver = function () {
        if (self.sourceListObserver) {
            self.sourceListObserver.disconnect();
            self.sourceListObserver = null;
        }
    };

    self.hideSourcePopup = function () {
        self.cancelSourcePopupHide();
        self.disconnectSourceContextMenuObserver();
        $(self.sourcePopupSelectors.popup).hide();
        self.refreshSourcePopupIndicator();
    };

    self.scheduleSourcePopupHide = function () {
        if (self.sourcePopupHideTimer) {
            return;
        }
        self.sourcePopupHideTimer = setTimeout(function () {
            self.sourcePopupHideTimer = null;
            // Keep popup open while the source context menu is visible so the user can interact with it
            if (self.isSourceContextMenuOpen()) {
                return;
            }

            self.hideSourcePopup();
        }, self.sourcePopupHideDelay);
    };

    // Treat the visible per-source context menu as part of the panel so
    // hovering/clicking into it does not dismiss the popup.
    self.isTargetInsideSourcePanel = function (target) {
        var $panel = $(self.sourcePopupSelectors.panel);
        if ($panel.length && (target === $panel[0] || $.contains($panel[0], target))) {
            return true;
        }
        var $contextMenu = $(self.sourcePopupSelectors.contextMenu);
        if ($contextMenu.length && $contextMenu.is(":visible") && (target === $contextMenu[0] || $.contains($contextMenu[0], target))) {
            return true;
        }
        return false;
    };

    self.showSourcePopup = function () {
        self.cancelSourcePopupHide();
        var $panel = $(self.sourcePopupSelectors.panel);
        var $popup = $(self.sourcePopupSelectors.popup);
        var rect = $panel[0].getBoundingClientRect();
        $popup.css({
            position: "fixed",
            top: rect.bottom + "px",
            left: rect.left + "px",
            zIndex: 200,
            flexWrap: "wrap",
            padding: "6px",
        });
        $(self.sourcePopupSelectors.addPanel).css("flexDirection", "column");
        $(self.sourcePopupSelectors.sourceButtons).css("flexDirection", "column");
        $popup.addClass("sources-popup-panel").show();

        self.disconnectSourceContextMenuObserver();
        var contextMenuElement = $(self.sourcePopupSelectors.contextMenu)[0];
        if (contextMenuElement) {
            // When the source context menu closes, schedule (not force) a hide:
            // mousemove will cancel it if the pointer is still inside the panel.
            self.sourceContextMenuObserver = new MutationObserver(function () {
                if (!self.isSourceContextMenuOpen()) {
                    self.scheduleSourcePopupHide();
                }
            });
            self.sourceContextMenuObserver.observe(contextMenuElement, { attributes: true, attributeFilter: ["style"] });
        }
    };

    self.onSourcePanelMouseMove = function (event) {
        if (!$(self.sourcePopupSelectors.popup).is(":visible")) {
            return;
        }
        if (self.isTargetInsideSourcePanel(event.target)) {
            self.cancelSourcePopupHide();
        } else {
            self.scheduleSourcePopupHide();
        }
    };

    self.onSourcePanelMouseDown = function (event) {
        if (!$(self.sourcePopupSelectors.popup).is(":visible")) {
            return;
        }
        if (self.isTargetInsideSourcePanel(event.target)) {
            return;
        }
        self.hideSourcePopup();
    };

    self.bindSourcePanelHandlers = function () {
        var $panel = $(self.sourcePopupSelectors.panel);
        $panel.on("mouseenter" + self.sourcePopupEventsNamespace, self.showSourcePopup);
        $panel.on("mouseleave" + self.sourcePopupEventsNamespace, self.scheduleSourcePopupHide);
        $(document).on("mousemove" + self.sourcePopupEventsNamespace, self.onSourcePanelMouseMove);
        $(document).on("mousedown" + self.sourcePopupEventsNamespace, self.onSourcePanelMouseDown);
    };

    self.unbindSourcePanelHandlers = function () {
        $(self.sourcePopupSelectors.panel).off(self.sourcePopupEventsNamespace);
        $(document).off(self.sourcePopupEventsNamespace);
    };

    self.observeSourceList = function () {
        self.disconnectSourceListObserver();
        var addPanelElement = $(self.sourcePopupSelectors.addPanel)[0];
        if (!addPanelElement) {
            return;
        }
        self.sourceListObserver = new MutationObserver(self.refreshSourcePopupIndicator);
        self.sourceListObserver.observe(addPanelElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    };

    self.enterSourcePopupCompactMode = function () {
        self.sourcePopupIsCompact = true;
        $(self.sourcePopupSelectors.popup).hide();
        self.unbindSourcePanelHandlers();
        self.bindSourcePanelHandlers();
        self.observeSourceList();
        self.refreshSourcePopupIndicator();
    };

    self.exitSourcePopupCompactMode = function () {
        self.sourcePopupIsCompact = false;
        self.cancelSourcePopupHide();
        self.disconnectSourceContextMenuObserver();
        self.disconnectSourceListObserver();
        self.unbindSourcePanelHandlers();
        $(self.sourcePopupSelectors.compactIndicator).hide().empty();
        $(self.sourcePopupSelectors.popup).css({ position: "", visibility: "", flexWrap: "", padding: "" }).removeClass("sources-popup-panel");
        $(self.sourcePopupSelectors.addPanel).css("flexDirection", "row");
        $(self.sourcePopupSelectors.sourceButtons).css("flexDirection", "row");
    };

    // Restore popup inline but invisible to measure whether it would still overflow;
    // leaves it hidden if overflow persists so the caller can keep compact mode.
    self.sourcePopupInlineWouldOverflow = function () {
        $(self.sourcePopupSelectors.addPanel).css("flexDirection", "row");
        $(self.sourcePopupSelectors.sourceButtons).css("flexDirection", "row");
        var $popup = $(self.sourcePopupSelectors.popup);
        var $indicator = $(self.sourcePopupSelectors.compactIndicator);
        var prevIndicatorDisplay = $indicator.length ? $indicator[0].style.display : "";
        $indicator.hide();
        $popup.css({ position: "static", visibility: "hidden", display: "flex", flexWrap: "nowrap", padding: "" }).removeClass("sources-popup-panel");
        var overflows = self.sourcePopupOverflows();
        if (overflows) {
            $popup.css({ position: "", visibility: "" }).hide();
            $indicator.css("display", prevIndicatorDisplay);
        }
        return overflows;
    };

    self.checkSourcePopupLayout = function () {
        if (!$(self.sourcePopupSelectors.bar).length) {
            return;
        }
        if (!self.sourcePopupIsCompact) {
            // Inline mode: switch to compact only when the popup overflows its container.
            if (self.sourcePopupOverflows()) {
                self.enterSourcePopupCompactMode();
            }
            return;
        }
        // Compact mode: do not re-measure while the popup is open (it's positioned fixed).
        if ($(self.sourcePopupSelectors.popup).is(":visible")) {
            return;
        }
        if (!self.sourcePopupInlineWouldOverflow()) {
            self.exitSourcePopupCompactMode();
        }
    };

    self.checkSourcesPanelOverflow = function () {
        self.checkSourcePopupLayout();
    };

    // Keep Here
    self.resetWindowSize = function () {
        self.checkSourcesPanelOverflow();
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

        var baseHeight = $(window).height() - MenuBarHeight - 7;
        $("#graphAndCommandScreen").css("height", baseHeight);
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

    self.clampAndCenterDialog = function (dialogTarget) {
        try {
            if (typeof dialogTarget === "string" && !dialogTarget.startsWith("#")) {
                dialogTarget = "#" + dialogTarget;
            }
            var $contentDiv = $(dialogTarget);
            var maxDialogWidth = Math.floor(window.innerWidth * 0.95);
            var maxDialogHeight = Math.floor(window.innerHeight * 0.92);
            var $dialogElement = $contentDiv.closest(".ui-dialog");
            if ($dialogElement.outerWidth() > maxDialogWidth) {
                $contentDiv.dialog("option", "width", maxDialogWidth);
            }
            if ($dialogElement.outerHeight() > maxDialogHeight) {
                $contentDiv.dialog("option", "height", maxDialogHeight);
            }
            $contentDiv.dialog("option", "position", { my: "center", at: "center", of: window });
        } catch (e) {}
    };

    self.repositionOpenDialogs = function () {
        ["#mainDialogDiv", "#smallDialogDiv", "#botPanel", "#widgetGenericDialogDiv"].forEach(function (dialogId) {
            try {
                if ($(dialogId).dialog("isOpen")) {
                    self.clampAndCenterDialog(dialogId);
                }
            } catch (e) {}
        });
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

        // Re-read after resize: dialog "height" sets content height, wrapper is taller (titlebar + borders)
        const actualH = Math.max(existingWindowConvert.outerHeight(), newWindowConvert.outerHeight());

        const offL = existingWindowConvert.offset() || { left: gap, top: gap };
        const top = Math.min(Math.max(gap, offL.top), windowHeight - gap - actualH);
        $(newWindow).dialog("option", "position", {
            my: "right top",
            at: `right-${gap} top+${top}`,
            of: window,
        });
        $(existingWindow).dialog("option", "position", {
            my: "left top",
            at: `left+${gap} top+${top}`,
            of: window,
        });

        //  Prevent from going outside during drag/resize
        try {
            existingWindowConvert.draggable("option", "containment", "window");
        } catch (e) {}
        try {
            newWindowConvert.draggable("option", "containment", "window");
        } catch (e) {}

        $(newWindow).one("dialogclose", function () {
            self.clampAndCenterDialog(existingWindow);
        });
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
        try {
            if ($(divId).dialog("isOpen")) {
                $(divId).dialog("close");
            }
        } catch (e) {}
        var maxDialogWidth = Math.floor(window.innerWidth * 0.95);
        var maxDialogHeight = Math.floor(window.innerHeight * 0.92);
        $(divId).dialog("option", {
            width: "auto",
            height: "auto",
            position: { my: "center", at: "center", of: window },
        });
        var dialogOptions = {};
        if (options.width) {
            dialogOptions.width = options.width;
        } else {
            dialogOptions.width = "auto";
        }
        if (options.height) {
            dialogOptions.height = options.height;
        } else {
            dialogOptions.height = "auto";
        }
        $(divId).dialog("option", dialogOptions);
        $(divId).dialog("open");
        if (options.zIndex) {
            $(divId).closest(".ui-dialog").css("z-index", options.zIndex);
        }
        var $dialogElement = $(divId).closest(".ui-dialog");
        var renderedWidth = $dialogElement.outerWidth();
        var renderedHeight = $dialogElement.outerHeight();
        if (renderedWidth > maxDialogWidth) {
            $(divId).dialog("option", "width", maxDialogWidth);
        }
        if (renderedHeight > maxDialogHeight) {
            $(divId).dialog("option", "height", maxDialogHeight);
        }
        $(divId).dialog("option", "position", { my: "center", at: "center", of: window });
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
