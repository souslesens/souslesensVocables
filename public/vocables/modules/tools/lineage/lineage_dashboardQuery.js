
import JstreeWidget from "../../uiWidgets/jstreeWidget.js";

var Lineage_dashboardQuery = (function () {

    var self = {}


    self.init=function(){
        self.isBuildingPath = false
        self.currentPath = []

        $("#lineage_visualQueryDiv").load("./modules/tools/lineage/html/lineage_dashboardQuery.html", function (s) {

        })
    }



    self.startPath = function () {
        self.currentPath = []
        self.isBuildingPath = true;
        var jstreeData = [{
            text: "edges"
            , id: "edges",
            parent: "#"
        }]
        var options = {withCheckboxes: true}
        JstreeWidget.loadJsTree("lineage_dashboardQuery_jstree",jstreeData,options)
    }

    self.executePathQuery = function () {
        self.isBuildingPath = false
    }

    self.onClickEdge = function (edge) {

    }
    self.onClickNode = function (edge) {

    }


    return self;


})()

export default Lineage_dashboardQuery
window.Lineage_dashboardQuery  = Lineage_dashboardQuery