var PopupMenuWidget = (function () {
    var self = {};
    self.initAndShow = function (html, popupDivId, options) {
        if (!options) {
            options = {};
        }
        var e = window.event;
        event.stopPropagation();

        $("#" + popupDivId).html(html);

        var point = { x: e.pageX, y: e.pageY };
        if (options.position && options.position == "Bottom") {
            point.y += 200;
        }
        //  var point={x:100,y:100}
        if (options.Button) {
            PopupMenuWidget.showPopup(point, popupDivId, options);
            $(options.Button).on("mouseleave", function () {
                PopupMenuWidget.hidePopup(popupDivId);
            });
        } else {
            PopupMenuWidget.showPopup(point, popupDivId);
            var clickedButton = $(e.currentTarget);
            var clickedButtonId = $(e.currentTarget).attr("id");

            $(e.currentTarget).on("mouseleave", function (event) {
                if ($(event.toElement).attr("id") != popupDivId) {
                    PopupMenuWidget.hidePopup(popupDivId);
                    $(clickedButton).off("mouseleave");
                }
            });

            $("#" + popupDivId).on("mouseleave", function (event) {
                if ($(event.toElement).attr("id") != clickedButtonId) {
                    PopupMenuWidget.hidePopup(popupDivId, "popupMenuWidgetDiv");
                    $("#" + popupDivId).off("mouseleave");
                }
            });
        }
    };

    self.showPopup = function (point, popupDiv, options) {
        if (!options) {
            options = {};
        }
        if (!popupDiv) {
            popupDiv = "popupDiv";
        }
        if (options.Button) {
            point.x = $(options.Button).offset().left + $(options.Button).width() + 13;
            point.y = $(options.Button).offset().top - $(options.Button).height() - 13;
        }
        $("#" + popupDiv).addClass("popupMenuWidgetDiv");
        $("#" + popupDiv).css("display", "flex");
        var popupH = Math.min(300, $("#" + popupDiv).height());
        var popupW = Math.min(200, $("#" + popupDiv).width());
        var screenHeight = $(window).height();
        var screenWidth = $(window).width();
        var distanceToWindowH = screenHeight - point.y;
        var distanceToWindowW = screenWidth - point.x;
        if (distanceToWindowH >= popupH) {
            $("#" + popupDiv).css("top", point.y);
        } else {
            $("#" + popupDiv).css("top", point.y - popupH);
        }
        if (distanceToWindowW >= popupW) {
            $("#" + popupDiv).css("left", point.x);
        } else {
            $("#" + popupDiv).css("left", point.x - popupW);
        }
    };
    self.hidePopup = function (popupDiv) {
        if (self.blockHidePopup) {
            return (self.blockHidePopup = false);
        } //one shot
        if (!popupDiv) {
            popupDiv = "popupMenuWidgetDiv";
        }
        $("#" + popupDiv).css("display", "none");
    };

    return self;
})();

export default PopupMenuWidget;
window.PopupMenuWidget = PopupMenuWidget;
