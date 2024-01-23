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
        //  var point={x:100,y:100}
        if (options.Button) {
            PopupMenuWidget.showPopup(point, popupDivId, options);
            $(options.Button).on("mouseleave", function () {
                PopupMenuWidget.hidePopup(popupDivId);
            });
        } else {
            PopupMenuWidget.showPopup(point, popupDivId);
            $("#" + popupDivId).on("mouseleave", function () {
                PopupMenuWidget.hidePopup(popupDivId);
            });
        }
    };

    self.showPopup = function (point, popupDiv, options) {
        /*
        $("#" + popupDiv).addClass("popupMenuWidgetDiv");
        $("#" + popupDiv).css("display", "flex");
        var popupH = Math.min(300, $("#" + popupDiv).height());
        var popupW = Math.min(200, $("#" + popupDiv).width());
        var divHeight = $("#graphDiv").height();
        var divMaxWidth = $("#graphDiv").width();
        var popupBottom = point.y + popupH;
        var popupRight = point.x + popupW;
        var popupTop = point.y + popupH;
        var popupLeft = point.x + popupW;

        var horOverlap = 0;
        if (popupRight > divMaxWidth) {
            horOverlap = popupRight - divMaxWidth;
        } else if (popupLeft < 0) {
            horOverlap = -popupLeft;
        }

        var vertOverlap = 0;
        if (popupBottom > divHeight) {
            vertOverlap = divHeight - popupBottom;
        } else if (popupTop < 0) {
            vertOverlap = -popupTop;
        }

        if (!popupDiv) {
            popupDiv = "popupDiv";
        }
        
        $("#" + popupDiv).css("left", point.x + (absolutePosition ? 0 : leftPanelWidth) + horOverlap);
        $("#" + popupDiv).css("top", point.y + vertOverlap);
        */
        if(!options){
            options={};
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
