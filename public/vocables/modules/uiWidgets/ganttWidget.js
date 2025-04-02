import Authentification from "../shared/authentification.js";

var GanttWidget = (function () {
    var self = {};

    self.data_dir = "";
    self.jsonContent = "";
    self.callbackFn = null




    self.showDialog = function (divId, mode, callback) {
        if (!divId) {
            divId = "smallDialogDiv";
        }
        self.divId = divId;
        $("#" + divId).load("modules/uiWidgets/html/gantt.html", function () {
            if (mode == "save") {
                $("#userDataWidget_saveDiv").css("display", "block");
            } else if (mode == "list") {
                $("#userDataWidget_listDiv").css("display", "block");
            }

            if (self.currentTreeNode) {
                $("#userDataWidget_updateButton").css("display", "block");
                $("#userDataWidget_label").val(self.currentTreeNode.data.data_label);
            }

            if (divId == "smallDialogDiv") {
                $("#" + divId).dialog("open");
            }

            if (callback) {
                callback();
            }
        });
    };



    self.runTimeLine=function(container,dataDataset,groupsDataset) {
        var options = {
          //  min: timeBounds.start, // lower limit of visible range
          //  max: timeBounds.end,
            verticalScroll: true,
            maxHeight: "700px",
            margin: {item: {vertical: 1}},
            //  clickToUse:true,
            // selectable:true
        };

        var timeline = new vis.Timeline(container, dataDataset, groupsDataset, options);
        self.timeline = timeline;

        timeline.on("click", function (properties) {
            if (properties && properties.item) {
                var item = self.timeline.itemsData.get(properties.item);
                self.currrentTimelineItem = item;
                var html = JSON.stringify(item.data) + " <button onclick='TimeLineWidget.showJCinfos()'>JC infos</button>";
                $("#timeLineWidget_messageDiv").html(html);
            } else {
                self.currrentTimelineItem = null;
            }
        });
    }


    return self;
})();

export default GanttWidget;
window.GanttWidget = GanttWidget;
