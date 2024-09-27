import DataManager from "./dataManager.js";
import FiltersWidget from "./filtersWidget.js";

var GroupsController = (function () {
    var self = {};

    self.filterGroupsLabelsMap = {
        Discipline: "Discipline",
        //  "FLOC": "FunctionalLocation",
        Activity: "WBS_activity_label",
        "Task Keyword": "TaskLabel",
        Unit: "unitName",
        System: "systemName",
        Sector: "sectorName",
        Resource: "TaskResource_ressourceName",
    };
    self.getCurrentGroupVarName = function () {
        var key = $("#Lifex_cost_SplitBySelect").val();
        if (Lifex_cost.groupByKey) {
            key = Lifex_cost.groupByKey;
        }
        var returnValue = self.filterGroupsLabelsMap[key];
        if (!self.filterGroupsLabelsMap[key].toLowerCase().includes("label")) {
            if (!self.filterGroupsLabelsMap[key].toLowerCase().includes("name")) {
                returnValue += "_label";
            }
        }
        return returnValue;
    };

    self.setJstreeGroupTypes = function (groupKeys) {
        var allNodes = JstreeWidget.getNodeDescendants(FiltersWidget.jstreeDiv, "#");
        allNodes.forEach(function (node) {
            $("#" + FiltersWidget)
                .jstree()
                .set_type(node.id, "default");
        });
        var types = {};
        groupKeys.forEach(function (nodeId) {
            var type = {
                nodeId: {
                    icon: "./icons/JstreeIcons/Default.png",
                },
            };

            $("#" + FiltersWidget)
                .jstree()
                .set_type("default");
        });
    };

    self.getGroups = function (groupKey, callback) {
        /*  var allNodes = JstreeWidget.getNodeDescendants(FiltersWidget.jstreeDiv, "#");
          allNodes.forEach(function(node) {
              $("#"+node.id).attr("background-color","color")
          });*/

        var dataGroups = {};
        if (!groupKey || groupKey == "Activity") {
            for (var groupId in self.phaseLabelsMap) {
                var label = self.phaseLabelsMap[groupId].label;
                dataGroups[groupId] = { id: groupId, content: label, data: {} };
            }
        } else if (groupKey == "FLOC") {
            var curentNodeid = "FLOC";
            DataManager.sparqlData.forEach(function (data) {
                var cleaned_fl = data.functionalLocationLabel.value.replace(/\s+/g, "");
                var splited_fl = data.functionalLocationLabel.value.split("/");
                splited_fl.pop();
                var group_fl = splited_fl.join("").replace(/\s+/g, "");
                var text_fl = splited_fl.join("/").replace(/\s+/g, "");
                var uri = "http://data.total/resource/tsf/dalia-lifex1/FL-" + group_fl;
                if (!dataGroups[uri]) {
                    dataGroups[uri] = { id: uri, content: text_fl, data: {} };
                }
            });

            /*
            var groupNodes = JstreeWidget.getNodeDescendants(FiltersWidget.jstreeDiv, curentNodeid);

            groupNodes.forEach(function(node) {
                dataGroups[node.data.id] = { id: node.data.id, content: node.text, data: {} };
             });*/
        } else if (groupKey == "Task Keyword") {
            var curentNodeid = FiltersWidget.currentNode.id;
            var groupNodes = JstreeWidget.getNodeDescendants(FiltersWidget.jstreeDiv, curentNodeid);
            groupNodes.forEach(function (node) {
                dataGroups[node.data.id] = { id: node.data.id, content: node.text, data: {} };
            });
        } else if (groupKey == "JobCard") {
        } else if (groupKey == "Tag") {
        } else if (groupKey == "Resource") {
            var curentNodeid = FiltersWidget.currentNode.id;
            var groupNodes = JstreeWidget.getNodeDescendants(FiltersWidget.jstreeDiv, "Resource");
            groupNodes.forEach(function (node) {
                dataGroups[node.data.id] = { id: node.data.id, content: node.text, data: {} };
            });
        } else {
            var groupNodes = JstreeWidget.getNodeDescendants(FiltersWidget.jstreeDiv, groupKey);
            groupNodes.forEach(function (node, index) {
                dataGroups[node.data.id] = { id: node.data.id, content: node.text, data: {} };
                /*   var id=  $("#Lifex_cost_jstreeFilterDiv").find("#"+node.id)
                     var color=self.graph2dLegendColors[index]
                     $(id).attr("background-color","color")*/
            });
        }

        return dataGroups;
    };

    self.getGroupFn = function (groupKey) {
        var belongsToGroupFn = function (groupValue, item) {
            var groupVarName = GroupsController.filterGroupsLabelsMap[groupKey];
            if (!groupKey || groupKey == "Activity") {
                if (item[groupVarName].value.startsWith(groupValue + "-")) {
                    return true;
                }
                return false;
            } else if (groupKey == "Discipline") {
                if (item[groupVarName].value == groupValue) {
                    return true;
                }
                return false;
            } else if (groupKey == "FLOC") {
                if (item[groupVarName].value.startsWith(groupValue)) {
                    return true;
                }
                return false;
            } else if (groupKey == "Task Keyword") {
                groupValue = groupValue.split("_")[1];
                if (item[groupVarName].value.includes(groupValue)) {
                    return true;
                }
                return false;
            } else if (groupKey == "Resource") {
                if (item[groupVarName].value.includes(groupValue)) {
                    return true;
                }
                return false;
            } else {
                if (item[groupVarName].value == groupValue) {
                    return true;
                }
                return false;
            }
        };
        return belongsToGroupFn;
    };

    self.phaseLabelsMap = {
        ENG: { label: "1-Detail Engineering", color: "#ddd" },
        PR: { label: "2-Procurement", color: "#ddd" },
        PF: { label: "3-Prefabrication ", color: "#ddd" },
        CNT: { label: "4-Offshore Construction", color: "#ddd" },
        PRECOM: { label: "5-Offshore Pre-Commissioning", color: "#ddd" },
        COM: { label: "6-Offshore Commissioning", color: "#ddd" },
    };
    self.generateRandomHexColor = function () {
        // Générer un nombre aléatoire entre 0 et 16777215 (0xFFFFFF)
        const randomInt = Math.floor(Math.random() * 16777215);

        // Convertir le nombre en une chaîne hexadécimale et le préfixer avec #
        const hexColor = `#${randomInt.toString(16).padStart(6, "0")}`;

        return hexColor;
    };

    self.legend = {
        getLegendClassesMap: function () {
            var legendItems = [];

            $(".vis-legend")
                .find(".vis-legend-text")
                .each(function () {
                    var str = $(this).html();
                    str = str.replace(/<br>/g, ",");
                    var items = str.split(",");
                    items.forEach(function (item) {
                        legendItems.push({ group: item, className: "" });
                    });
                });

            var index = 0;
            var styleSheetVisjsGroups = document.styleSheets[35];
            $(".vis-legend")
                .find("rect")
                .each(function () {
                    var cssClass = $(this).attr("class").split(" ")[0];
                    if ($(this).attr("height") == 11) {
                        if (cssClass.startsWith("vis-graph-group")) {
                            var color = self.legend.graph2dLegendClasses[cssClass];
                            $("." + cssClass).attr("background-color", color);
                            legendItems[index].className = cssClass + "-x";
                            if (parseInt(cssClass.split("vis-graph-group")[1]) > 13) {
                                //generate class css rule
                                var color = self.generateRandomHexColor();
                                styleSheetVisjsGroups.insertRule(
                                    `.${cssClass} {
                                        fill: ${color};
                                        color: white;
                                        background-color: ${color};
                                        opacity: .9;
                                        fill-opacity: 0;
                                        stroke-width: 2px;
                                        stroke: ${color}
                            }`,
                                    styleSheetVisjsGroups.cssRules.length
                                );
                            }
                            index++;
                        }
                    }
                });

            var map = {};
            legendItems.forEach(function (item) {
                map[item.group] = item.className;
            });

            return map;
        },

        graph2dLegendClasses: {
            "vis-graph-group0": "#4f81bd",
            "vis-graph-group1": "#f79646",
            "vis-graph-group2": "#8c51cf",
            "vis-graph-group3": "#75c841",
            "vis-graph-group4": "#ff0100",
            "vis-graph-group5": "#37d8e6",
            "vis-graph-group6": "#042662",
            "vis-graph-group7": "#00ff26",
            "vis-graph-group8": "#f0f",
            "vis-graph-group9": "#8f3938",
        },
    };

    self.graph2dLegendColors = ["#4f81bd", "#f79646", "#8c51cf", "#75c841", "#ff0100", "#37d8e6", "#042662", "#00ff26", "#f0f", "#8f3938"];

    self.groupsMap = {};

    return self;
})();

export default GroupsController;
window.GroupsController = GroupsController;
