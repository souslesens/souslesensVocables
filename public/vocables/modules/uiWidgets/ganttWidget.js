import Authentification from "../shared/authentification.js";

var GanttWidget = (function () {
        var self = {};

        self.divId = "";

        self.callbackFn = null


        self.showDialog = function (divId, implicitModel, data, callback) {
            if (!divId) {
                divId = "mainDialogDiv";
            }
            self.divId = divId


            self.implicitModel = implicitModel
            self.data = data

            $("#" + divId).load("modules/uiWidgets/html/ganttWidget.html", function (err) {

                if (divId == "mainDialogDiv") {
                    $("#" + divId).dialog("open");
                }

                self.initWidget(implicitModel)

                if (callback) {
                    callback();
                }
            });
        };

        self.initWidget = function (implicitModel) {
            var dateVars = []
            var vars = {}

            var itemVars = []
            self.propertiesMap = {}
            implicitModel.nodes.forEach(function (item) {
                if (true || self.data.head.vars.indexOf(item.label)>-1) {
                    if (item.data.nonObjectProperties) {
                        item.data.nonObjectProperties.forEach(function (prop) {
                            self.propertiesMap[item.id] = prop
                            if (prop.datatype == "http://www.w3.org/2001/XMLSchema#dateTime" || item.type == "xsd:dateTime") {
                                dateVars.push({id: item.id, label: item.label})
                            } else {
                                itemVars.push({id: item.id, label: item.label})
                            }


                        })
                    }
                }


            })

            common.fillSelectOptions("ganttWidget_dateVarsSelect", dateVars, true, "id", "label")
            common.fillSelectOptions("ganttWidget_groupVarsSelect", itemVars, true, "id", "label")
            common.fillSelectOptions("ganttWidget_valueVarsSelect", itemVars, true, "id", "label")


        }

        self.runGantt = function () {

            var queryFilter = []
            var dateVar = $("#ganttWidget_dateVarsSelect").val()
            var groupVar = $("#ganttWidget_groupVarsSelect").val()
            var valueVar = $("#ganttWidget_valueVarsSelect").val()
            var data = []
            self.bindings.forEach(function (item) {
                data.push({
                    id: item[valueVar].value,
                    label: item[valueVar + "_label"].value,
                    start: item[dateVar].value
                })
            })

            var dataDataset = new vis.DataSet(data);
            var groupsDataset = new vis.DataSet();

            /** for (var key in groups) {
             groupsDataset.add({
             content: key,
             id: key,
             });
             // groups[key]= self.setItemsColorClass( groups[key],"POB")
             groups[key].forEach(function (item, index) {
             dataDataset.add(item);
             });
             }

             var groupsArray = [];
             for (var key in groups) {
             groupsArray.push({id: key, label: key});
             }


             var options = {
             //  min: timeBounds.start, // lower limit of visible range
             //  max: timeBounds.end,
             verticalScroll: true,
             maxHeight: "700px",
             margin: {item: {vertical: 1}},
             //  clickToUse:true,
             // selectable:true
             };*/

            var gantt = new vis.Timeline(self.divId, dataDataset, options);
            self.gantt = gantt;

            gantt.on("click", function (properties) {
                if (properties && properties.item) {
                    var item = self.gantt.itemsData.get(properties.item);
                    self.currrentganttItem = item;
                    var html = JSON.stringify(item.data) + " <button onclick='ganttWidget.showJCinfos()'>JC infos</button>";
                    $("#ganttWidget_messageDiv").html(html);
                } else {
                    self.currrentganttItem = null;
                }
            });
        }

        self.onDateVarsSelectChange = function () {

        }
        self.onGroupVarsSelectChange = function () {

        }
        self.onValueVarsSelectChange = function () {

        }


        return self;
    }
)
();

export default GanttWidget;
window.GanttWidget = GanttWidget;
