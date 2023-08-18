var PopupMenuWidget = (function() {
  var self = {};
  self.initAndShow = function(html) {
    var e = window.event;
    event.stopPropagation();

    $("#popupMenuWidgetDiv").html(html);

    var point = { x: e.pageX, y: e.pageY };
    //  var point={x:100,y:100}
    PopupMenuWidget.showPopup(point, "popupMenuWidgetDiv", true);
    $("#popupMenuWidgetDiv").on("mouseleave", function() {
      PopupMenuWidget.hidePopup("popupMenuWidgetDiv");
    });
  };

  self.showPopup = function(point, popupDiv, absolutePosition) {
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
    }
    else if (popupLeft < 0) {
      horOverlap = -popupLeft;
    }

    var vertOverlap = 0;
    if (popupBottom > divHeight) {
      vertOverlap = divHeight - popupBottom;
    }
    else if (popupTop < 0) {
      vertOverlap = -popupTop;
    }

    if (!popupDiv) {
      popupDiv = "popupDiv";
    }
    $("#" + popupDiv).css("left", point.x + (absolutePosition ? 0 : leftPanelWidth) + horOverlap);
    $("#" + popupDiv).css("top", point.y + vertOverlap);
  };
  self.hidePopup = function(popupDiv) {
    if (self.blockHidePopup) {
      return (self.blockHidePopup = false);
    } //one shot
    if (!popupDiv) {
      popupDiv = "popupDiv";
    }
    $("#" + popupDiv).css("display", "none");
  };


  return self;


})();

export default PopupMenuWidget;
window.PopupMenuWidget = PopupMenuWidget;