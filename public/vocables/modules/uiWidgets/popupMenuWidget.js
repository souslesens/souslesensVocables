var PopupMenuWidget = (function () {
    var self = {};
    self.initAndShow = function (html, popupDivId, options) {
        if (!options) {
            options = {};
        }
        var e = window.event;
        event.stopPropagation();

        $("#" + popupDivId).html(html);

        var point = { x: e.clientX, y: e.clientY };
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

            $("#" + popupDivId)
                .off("mouseleave.popupMenu")
                .on("mouseleave.popupMenu", function (event) {
                    var toEl = event.toElement || event.relatedTarget;
                    if (toEl && ($(toEl).is(clickedButton) || $(toEl).closest(clickedButton).length)) {
                        return;
                    }
                    PopupMenuWidget.hidePopup(popupDivId);
                    $("#" + popupDivId).off("mouseleave.popupMenu");
                });

            setTimeout(function () {
                $(document)
                    .off("mousedown.popupMenuDismiss")
                    .on("mousedown.popupMenuDismiss", function (evt) {
                        if (!$(evt.target).closest("#" + popupDivId).length) {
                            PopupMenuWidget.hidePopup(popupDivId);
                            $(document).off("mousedown.popupMenuDismiss");
                        }
                    });
            }, 0);
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
            var btnRect = options.Button.getBoundingClientRect ? options.Button.getBoundingClientRect() : $(options.Button)[0].getBoundingClientRect();
            point.x = btnRect.right + 13;
            point.y = btnRect.top - $(options.Button).height() - 13;
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
        $(document).off("mousedown.popupMenuDismiss");
        $("#" + popupDiv).off("mouseleave.popupMenu");
        $("#" + popupDiv).css("display", "none");
    };

    return self;
})();

export default PopupMenuWidget;
window.PopupMenuWidget = PopupMenuWidget;
