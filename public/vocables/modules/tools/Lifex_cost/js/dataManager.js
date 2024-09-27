//import SavedQueriesWidget from "../../../../public/vocables/modules/uiWidgets/savedQueriesWidget.js";

//import Sparql_proxy from "../../../../public/vocables/modules/sparqlProxies/sparql_proxy.js";
//import Lifex_cost from "./main.js";

import TimelineAnimation from "./timelineAnimation.js";
import GroupsController from "./groupsController.js";
import Timeline from "./timeline.js";
import Time2dChart from "./time2dChart.js";
import FiltersWidget from "./filtersWidget.js";
import SparqlQueries from "./sparqlQueries.js";
import CustomNodeInfos from "./customNodeInfos.js";
import Lifex_cost from "./main.js";

var DataManager = (function () {
    var self = {};
    self.data = [];
    self.currentWBStasksMap = {};

    self.quantityVarNamesMap = {
        "Total POB 1.10": { fn: "sum", varName: "WBS_activity_sumManHours", isCumulatedQuantityVar: true },
        "Ressource POB 1.10": { fn: "sum", varName: "TaskResource_manHours", isCumulatedQuantityVar: false },
        "Total Budgeted Units 1.10": {
            fn: "sum",
            varName: "WBS_activity_sumManHours",
            isCumulatedQuantityVar: true,
        },

        "Ressource Budgeted Units 1.10": {
            fn: "sum",
            varName: "TaskResource_manHours",
            isCumulatedQuantityVar: false,
        },

        "Total Budgeted Units": { fn: "sum", varName: "WBS_activity_sumManHours", isCumulatedQuantityVar: true },

        "Ressource Budgeted Units": { fn: "sum", varName: "TaskResource_manHours", isCumulatedQuantityVar: false },
        "Total POB": { fn: "sum", varName: "WBS_activity_sumManHours", isCumulatedQuantityVar: true },

        "Ressource POB": { fn: "sum", varName: "TaskResource_manHours", isCumulatedQuantityVar: false },
        "Count Tasks": { fn: "count", varName: "WBS_activity", isCumulatedQuantityVar: true },
        "Daily Hours": { fn: "sum", varName: "WBS_activity_durationInHours", isCumulatedQuantityVar: true },
    };
    //"Onshore manHours": { fn: "sum", varName: "JobCardExecution_sumOnshoreManHours" },
    //"Offshore POB": { fn: "sum", varName: "JobCardExecution_sumOffshorePOB" },

    self.getCurrentQuantityVarName = function () {
        var key = $("#Lifex_cost_quantityVarSelect").val();
        return self.quantityVarNamesMap[key];
    };

    self.getTagsMap = function (callback) {
        if (self.wbsTagsMap) {
            return callback(null, self.wbsTagsMap);
        } else {
            self.wbsTagsMap = {};
            SparqlQueries.getTagsSparqlData(null, function (err, result) {
                if (err) {
                    return callback(err);
                }
                self.wbsTagsMap = {};
                result.forEach(function (item) {
                    if (!self.wbsTagsMap[item.WBS_activity.value]) {
                        self.wbsTagsMap[item.WBS_activity.value] = [];
                    }
                    self.wbsTagsMap[item.WBS_activity.value].push(item.tag_label.value);
                });

                return callback(null, self.wbsTagsMap);
            });
        }
    };

    self.getSparqlData = function (options, callback) {
        if (!options) {
            options = {};
        }

        SparqlQueries.executeGraph2DQuery(options, function (err, result) {
            DataManager.sparqlData = result.results.bindings;
            DataManager.currentWBStasksMap = {};

            DataManager.sparqlData.forEach(function (item) {
                DataManager.currentWBStasksMap[item.WBS_activity.value] = item;
                //each ressource contributes as  a percentage of totalmanHours
                if (item.TaskResource_manHours) {
                    item.resource_perc_total_manHours = item.TaskResource_manHours.value / item.WBS_activity_sumManHours.value;
                }
            });

            DataManager.getTagsMap(function (err, tagsMap) {
                if (err) {
                    callback(err);
                }

                DataManager.sparqlData.forEach(function (item) {
                    item.tags = tagsMap[item.WBS_activity.value];
                });
            });

            callback(null, DataManager.sparqlData);
        });
    };

    self.getCumulatedValuesBydate = function (quantityVarName, cumulOperator, isCumulatedQuantityVar, groupByKey, afterDate, beforeDate) {
        var dataGroups = GroupsController.getGroups(groupByKey);
        if (GanttSimulation.isSimulationOn) {
            dataGroups["beforeSimulation"] = { id: "beforeSimulation", content: "beforeSimulation", data: {} };
            dataGroups["Simulation"] = { id: "Simulation", content: "Simulation", data: {} };
        }
        var startDateVarName = "WBS_activity_startDate"; //$("#tagsCalendar_startDateSelect").val();
        var endDateVarName = "WBS_activity_endDate"; // $("#tagsCalendar_endDateSelect").val();

        var WBSActivityCount = {};

        var maxItemsTime = new Date(1900, 0, 1).getTime();

        var minRangeTime = null;
        if (afterDate) {
            minRangeTime = afterDate.getTime();
        } else {
            minRangeTime = new Date(2100, 31, 31).getTime();
        }
        var maxRangeTime = null;
        if (beforeDate) {
            maxRangeTime = beforeDate.getTime();
        }
        maxRangeTime = new Date(1900, 0, 1).getTime();

        var itemsInDatesRange = [];
        var sumManhours = {};
        self.sparqlData.forEach(function (item) {
            if (!item[startDateVarName]) {
                return;
            }
            if (!item[endDateVarName]) {
                return;
            }
            if (!item[quantityVarName]) {
                return;
            }

            if (!item["WBS_activity"]) {
                return;
            }
            if (!item[startDateVarName] || !item[startDateVarName].value) {
                return;
            }

            var startDate;
            if (false && typeof item[startDateVarName].value.indexOf("date") > -1) {
                startDate = item[startDateVarName].value;
            } else {
                var startDate = item[startDateVarName].value.substring(0, 10).replace(/-/g, ".");
                try {
                    startDate = new Date(startDate);
                } catch (e) {
                    return;
                }
            }

            item.startTime = startDate.getTime();
            if (false && minRangeTime && minRangeTime > item.startTime) {
                return;
            } else {
                minRangeTime = Math.min(item.startTime, minRangeTime);
            }

            if (!item[endDateVarName] || !item[endDateVarName].value) {
                return;
            }
            var endDate;
            if (false && typeof item[endDateVarName].value.indexOf("date") > -1) {
                endDate = item[endDateVarName].value;
            } else {
                endDate = item[endDateVarName].value.substring(0, 10).replace(/-/g, ".");
                try {
                    endDate = new Date(endDate);
                } catch (e) {
                    return;
                }
            }

            item.endTime = endDate.getTime();
            if (false && maxRangeTime && maxRangeTime > item.endTime) {
                return;
            } else {
                maxRangeTime = Math.max(item.endTime, maxRangeTime);
            }

            itemsInDatesRange.push(item);
            var WBS_id = item["WBS_activity"].value;
            if (!item.beforeSimulation) {
                if (WBSActivityCount[WBS_id]) {
                    WBSActivityCount[WBS_id] += 1;
                } else {
                    WBSActivityCount[WBS_id] = 1;
                }
            }
        });

        self.periodTicks = {};
        self.dayPeriodActivities = {};
        self.periodTicksIndexes = {};
        var periodTicksIndex = 0;
        var step = 1000 * 60 * 60 * 24; //*7;

        var time = minRangeTime - 1;
        if (!self.animationStartId) {
            self.animationStartId = time;
        }
        do {
            var obj = {
                id: time,
                content: "",
                start: new Date(time),
                cumul: 0,
                activities: [],
            };
            self.periodTicksIndexes[time] = periodTicksIndex;
            self.periodTicks[time] = obj;

            time += step;
            periodTicksIndex += 1;
        } while (time <= maxRangeTime);

        var milliSecondsInDay = 1000 * 60 * 60 * 24;

        var belongsToGroupFn = GroupsController.getGroupFn(groupByKey);
        var periodTicksKeys = Object.keys(self.periodTicks);

        for (let index = 0; index < itemsInDatesRange.length; index++) {
            var item = itemsInDatesRange[index];

            if (index > 9999) {
                break;
            }
            var group = "";
            if (item.simulation && GanttSimulation.isSimulationOn) {
                var x = 3;
                group = "Simulation";
            } else if (item.beforeSimulation && GanttSimulation.isSimulationOn) {
                group = "beforeSimulation";
            } else {
                for (var datagroup in dataGroups) {
                    if (belongsToGroupFn(datagroup, item)) {
                        group = datagroup;
                        if (groupByKey != "FLOC") {
                            break;
                        }
                    }
                }
            }
            if (group) {
                var n;
                var datatype = item[quantityVarName].datatype;
                var quantity = item[quantityVarName].value;

                if (cumulOperator == "count") {
                    n = 1;
                } else if (datatype == "http://www.w3.org/2001/XMLSchema#integer") {
                    n = parseInt(quantity);
                } else if (datatype == "http://www.w3.org/2001/XMLSchema#int") {
                    n = parseInt(quantity);
                } else if (datatype == "http://www.w3.org/2001/XMLSchema#float") {
                    n = parseFloat(quantity);
                } else {
                    return;
                }

                if (isCumulatedQuantityVar) {
                    n = n / WBSActivityCount[item["WBS_activity"].value];
                }
                var yAxisVal = $("#Lifex_cost_quantityVarSelect").val();

                if (yAxisVal.indexOf("1.") > -1) {
                    n = DataManager.getManhoursCoeff(n);
                }
                if ($("#Lifex_cost_quantityVarSelect").val().indexOf("POB") > -1) {
                    n = self.getPOBfromManHours(n);
                }

                //each ressource contributes as  a percentage of totalmanHours
                if (item.resource_perc_total_manHours) {
                    //  n*=item.resource_perc_total_manHours
                }

                var ItemStartDate = new Date(item.startTime);
                ItemStartDate.setHours(22, 59, 59);

                var startDateInt = ItemStartDate.getTime() + 999;
                var correspondingStartDate = self.periodTicks[startDateInt];
                if (correspondingStartDate == undefined) {
                    ItemStartDate.setHours(23, 59, 59);
                    startDateInt = ItemStartDate.getTime() + 999;
                    correspondingStartDate = self.periodTicks[startDateInt];
                }

                var days = (item.endTime - item.startTime) / milliSecondsInDay;
                if (days == 0) {
                    days = 1;
                    //if day==0 the end date need to add 1 day then the data day can be taked in account by the planning
                    item.endTime += milliSecondsInDay;
                }

                var startIndex = self.periodTicksIndexes[startDateInt];
                if (!startIndex) {
                    startIndex = 0;
                }

                for (let i = startIndex; i < periodTicksKeys.length; i++) {
                    var time = periodTicksKeys[i];

                    time = parseInt(time);
                    if (time >= item.startTime) {
                        // console.log((time + step) +"__"+ item.endTime)
                        //time + step with optimisation make the 1day taks not displayed on the graph
                        //if ((time + step) <= item.endTime) {
                        if (time <= item.endTime) {
                            //  console.log(""+new Date(time)+"----"+item.WBS_activity_startDate.value+"----"+item.WBS_activity_endDate.value)

                            //   if (!self.periodTicks[time].activities.indexOf(item.WBS_activity.value) < 1) {

                            var hours = parseInt(item[quantityVarName].value);

                            var date = new Date(time);
                            var dateStr = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
                            var value = (n || 1) / days; //nbre d'heures moyen par jours

                            if (!self.dayPeriodActivities[dateStr]) {
                                self.dayPeriodActivities[dateStr] = {
                                    activities: [],
                                    activitiesMap: {},
                                    tags: [],
                                    cumul: 0,
                                };
                            }
                            if (value > 0) {
                                self.dayPeriodActivities[dateStr].activities.push(item.WBS_activity.value);

                                if (!self.dayPeriodActivities[dateStr].activitiesMap[item.WBS_activity.value]) {
                                    self.dayPeriodActivities[dateStr].activitiesMap[item.WBS_activity.value] = {
                                        days: days,
                                        yValue: n,
                                    };
                                }
                            }
                            if (item.tags) {
                                self.dayPeriodActivities[dateStr].tags = self.dayPeriodActivities[dateStr].tags.concat(item.tags);
                            }

                            if (!dataGroups[group].cumul) {
                                dataGroups[group].cumul = 0;
                            }

                            if (!dataGroups[group].data[time]) {
                                dataGroups[group].data[time] = { cumul: 0, activities: [] };
                            }
                            if (cumulOperator == "sum") {
                                dataGroups[group].data[time].cumul += value;
                                self.dayPeriodActivities[dateStr].cumul += value;
                                dataGroups[group].cumul += value;
                            } else if (cumulOperator == "count") {
                                dataGroups[group].data[time].cumul += 1;
                                self.dayPeriodActivities[dateStr].cumul += 1;
                                dataGroups[group].cumul += 1;
                            }
                        } else {
                            break;
                        }
                    }
                }
            }
        }
        var items = [];

        for (var group in dataGroups) {
            for (var time in dataGroups[group].data) {
                var date = common.getSimpleDateStrFromDate(new Date(parseInt(time)));
                //  var date = new Date(parseInt(time)).toISOString().replace("T", " ").substring(0, 10);

                var item = dataGroups[group].data[time];
                var obj = {};
                obj.group = group;
                obj.x = date;
                obj.y = item.cumul;
                obj.data = { activities: item.activities, date: date };
                items.push(obj);
            }
        }
        return { items: items, groups: dataGroups };
    };

    self.showWBSactivitiesOfJC = function (JCnumber) {
        if (!self.sparqlData) {
            return;
        }
        var listItems = [];
        var selection = [];
        self.sparqlData.forEach(function (item) {
            //  console.log(item.WBS_activity_label.value)
            if (item.WBS_activity_label.value.indexOf(JCnumber) > -1) {
                listItems.push({
                    id: item.WBS_activity.value,
                    label: item.WBS_activity_label.value,
                    startDate: item.WBS_activity_startDate.value,
                });
                selection.push(item);
            }
        });

        common.array.sort(listItems, "label");
        self.showWBSactivitiesOnGraph2D(listItems);
        $("#Lifex_cost_left_tabs").tabs("option", "active", 2);

        DataManager.showWBStasksList(selection, "");
        //   common.fillSelectOptions("tagsCalendarItemsSelect", listItems, null, "label", "id");
    };

    self.addOtherActivitiesToTimeLine = function (uri) {
        var p = uri.indexOf("DAL-");
        if (p < 0) {
            return;
        }
        var JClabel = uri.substring(p);
        var filter = "FILTER( ?JobCardExecution_label ='" + JClabel + "')";

        self.executerQuery({ filter: filter }, function (err, result) {
            if (err) {
                return alert(err.responseText);
            }
            var data = result.results.bindings;
            if (data.length == 0) {
                return;
            }
            var timeLinesItem = [];
            data.forEach(function (item) {
                var startDate = item.WBS_activity_startDate.value.substring(0, 10).replace(/-/g, ".");
                var endDate = item.WBS_activity_endDate ? item.WBS_activity_endDate.value.substring(0, 10).replace(/-/g, ".") : null;
                var obj = {
                    id: item.WBS_activity.value,
                    content: item.WBS_activity_label.value,
                    start: startDate,
                    end: endDate,
                    group: "_",
                    className: "vis-item-JC",
                };
                timeLinesItem.push(obj);
            });
            // Lifex_cost.drawTimeLine(timeLinesItem, null)
            Lifex_cost.drawTimeLine(timeLinesItem, null, "JCtimeLineDiv");
        });

        //   setItems(items)
    };

    self.searchJC = function () {
        //var word = prompt("enter expresssion");
        var word = $("#Lifex_cost_searchJC").val();
        if (!word) {
            return;
        }

        var filter = "FILTER (regex(?WBS_activity_label,'" + word + "','i'))";
        SparqlQueries.executeGraph2DQuery({ filter: filter }, function (err, result) {
            if (err) {
                return alert(err.responseText);
            }
            var listItems = result.results.bindings;
            DataManager.showWBStasksList(listItems);
        });
        return;
    };

    self.exportWBSlist = function () {
        if (!self.currentWBStaskSelection) {
            return alert("no day selected");
        }
        var cols_name = Object.keys(self.currentWBStaskSelection[0]);
        var cols = [];
        cols_name.forEach(function (col_name) {
            cols.push({ title: col_name, defaultContent: "" });
        });
        var Dataset = [];
        self.currentWBStaskSelection.forEach(function (raw, index) {
            Dataset.push([]);
            for (var name in cols_name) {
                if (raw[cols_name[name]]?.value) {
                    Dataset[index].push(raw[cols_name[name]]?.value);
                } else if (raw[cols_name[name]]) {
                    Dataset[index].push(raw[cols_name[name]]);
                } else {
                    Dataset[index].push("");
                }
            }
        });
        Export.showDataTable(null, cols, Dataset, null, {}, function (err, result) {
            $("#mainDialogDiv").parent().css("z-index", 10);
        });
    };
    self.drawCumulTable = function () {
        var groupsChartData = Time2dChart.chartData.groups;
        var totalCumul = 0;
        var str = "";
        str += "<table class='infosTable' style='margin-top:20px;'>";
        str += "<thead><tr class='infos_table'>";
        str += "<th class='detailsCellName' style='padding: 4px 4px'>" + "" + "</th>";
        str += "<th class='detailsCellName' style='padding: 4px 4px'>" + "Yaxis" + "</th>";
        str += "<th class='detailsCellName' style='padding: 4px 4px'>" + "WBStasks" + "</th>";
        str += "<th class='detailsCellName' style='padding: 4px 4px'>" + "JobCards" + "</th></tr><tbody>";

        var groupCounts = {};
        var WBStasksSeen = { global: {} };
        var JCSeen = { global: {} };
        //var total={WBStasks:0,JC:0};
        var totalUnique = { WBStasks: 0, JC: 0 };
        self.sparqlData.forEach(function (item) {
            var groupKey = Lifex_cost.groupByKey;
            var belongsToGroupFn = GroupsController.getGroupFn(groupKey);
            if (!JCSeen.global[item.JobCardExecution_label.value]) {
                totalUnique.JC += 1;
                JCSeen.global[item.JobCardExecution_label.value] = true;
            }
            if (!WBStasksSeen.global[item.WBS_activity_label.value]) {
                totalUnique.WBStasks += 1;
                WBStasksSeen.global[item.WBS_activity_label.value] = true;
            }
            for (var group in groupsChartData) {
                if (!groupCounts[group]) {
                    groupCounts[group] = { JCcount: 0, WBStasksCount: 0 };
                }
                if (!JCSeen[group]) {
                    JCSeen[group] = {};
                }
                if (!WBStasksSeen[group]) {
                    WBStasksSeen[group] = {};
                }

                if (belongsToGroupFn(group, item)) {
                    if (!JCSeen[group][item.JobCardExecution_label.value]) {
                        groupCounts[group].JCcount += 1;
                        //total.JC+=1;
                        JCSeen[group][item.JobCardExecution_label.value] = true;
                    }
                    if (!WBStasksSeen[group][item.WBS_activity_label.value]) {
                        groupCounts[group].WBStasksCount += 1;
                        //total.WBStasks+=1;
                        WBStasksSeen[group][item.WBS_activity_label.value] = true;
                    }
                }
            }
        });

        for (var group in groupsChartData) {
            var value = Math.round(groupsChartData[group].cumul);
            if (!value) {
                value = 0;
            }
            str += "<tr class='infos_table'>";
            str += "<td class='detailsCellName' style='padding: 4px 4px'>" + groupsChartData[group].content;
            +"</td>";
            str += "<td class='detailsCellValue' style='padding: 4px 4px'>" + value.toString() + "</td>";
            str += "<td class='detailsCellValue' style='padding: 4px 4px'>" + groupCounts[group].WBStasksCount + "</td>";
            str += "<td class='detailsCellValue' style='padding: 4px 4px'>" + groupCounts[group].JCcount + "</td>";
            str += "</tr>";
            totalCumul += value;
        }
        str += "<tr class='infos_table'>";
        str += "<td class='detailsCellName' style='padding: 4px 4px'>" + "Total (Total Unique for Counts)";
        +"</td>";
        str += "<td class='detailsCellValue' style='padding: 4px 4px'>" + Math.round(totalCumul).toString() + "</td>";
        str += "<td class='detailsCellValue' style='padding: 4px 4px'>" + totalUnique.WBStasks + "</td>";
        str += "<td class='detailsCellValue' style='padding: 4px 4px'>" + totalUnique.JC + "</td>";

        str += "</tr>";
        //str += CustomNodeInfos.generateRawInfosStr("<B>Total</B>", "<B>" + Math.round(totalCumul).toLocaleString() + "</B>");
        str += "</tbody><table>";
        $("#Lifex_cost_Cumultab").html(str);
        return;
    };

    self.drawChartFromTags = function (tagsData) {
        var groupByKey = $("#Lifex_cost_SplitBySelect").val();
        var jobcardIds = [];
        tagsData.forEach(function (item) {
            if (item.number) {
                jobcardIds.push(item.number);
            }
        });
        var filter = Sparql_common.setFilter("JobCardExecution_label", null, jobcardIds, { exactMatch: true });
        filter = filter.replace("Label", "");

        FiltersWidget.draw2dChart(null, filter, null, function (err, sparqlData) {
            if (err) {
                alert(err.responseText);
            }
            var selection = [];
            var listItems = [];
            sparqlData.forEach(function (item) {
                if (item["JobCardExecution_label"] && jobcardIds.indexOf(item["JobCardExecution_label"].value) > -1) {
                    selection.push(item);
                }
            });

            Timeline.draw(selection, null);
            $("#Lifex_cost_right_tabs").tabs("option", "active", "1");
            DataManager.showWBStasksList(selection);
        });
    };

    self.showWBStasksList = function (items, date) {
        self.currentWBStaskSelection = items;
        $("#Lifex_cost_left_tabs").tabs("option", "active", 1);

        var transformManhours = false;
        var yAxisVal = $("#Lifex_cost_quantityVarSelect").val();
        if (yAxisVal.indexOf("1.") > -1) {
            transformManhours = true;
        }
        var transformToPOB = false;
        if (yAxisVal.indexOf("POB") > -1) {
            transformToPOB = true;
        }
        var cols = [];
        cols.push({ title: "WBStask", defaultContent: "" });
        cols.push({ title: "yValue", defaultContent: "" });
        cols.push({ title: "countTasks", defaultContent: "" });

        //dedoublonner les WBS
        var WBSseen = {};
        var DropDuplicatesItems = [];
        items.forEach(function (item, index) {
            if (!WBSseen[item["WBS_activity"].value] && !item.beforeSimulation) {
                WBSseen[item["WBS_activity"].value] = 1;
                DropDuplicatesItems.push(item);
            }
        });

        var html = "<B>Total " + DropDuplicatesItems.length + "" + (date ? "<br>on " + date : "") + "<br>yAxis:" + yAxisVal + "</B>" + "<br><table style='width: 400px;'>";
        html += "<tr>";
        html += "<td>WBStask</td>";
        html += "<td>duration</td>";
        html += "<td>" + "yAxis" + "</td>";
        html += "<td>" + "DailyYValue" + "</td>";

        html += "</tr>";
        DropDuplicatesItems.forEach(function (item, index) {
            if (!item.dailyYvalue) {
                try {
                    var manHours = item["WBS_activity_sumManHours"].value;
                    if (transformManhours) {
                        manHours = self.getManhoursCoeff(item["WBS_activity_sumManHours"].value);
                    }

                    item.dailyYvalue = manHours / item.WBS_activity_durationInDays.value;
                } catch (e) {
                    item.dailyYvalue = "#";
                }
            }
        });

        DropDuplicatesItems.sort(function (a, b) {
            var aValue = a.dailyYvalue;
            var bValue = b.dailyYvalue;
            if (aValue > bValue) {
                return -1;
            }
            if (aValue < bValue) {
                return 1;
            }
            return 0;
        });
        // Ajouter de facon barée les Tasks de simulation étant précédemment dans le jour mais n'en faisant plus partie

        DropDuplicatesItems.forEach(function (item, index) {
            var colorDuration = "";
            var colorJC = "";
            var yValue = "#";
            var isInPeriod = "";
            if (item["WBS_activity_sumManHours"]) {
                var manHours = item["WBS_activity_sumManHours"].value;
                if (transformManhours) {
                    manHours = self.getManhoursCoeff(item["WBS_activity_sumManHours"].value);
                }
                if (transformToPOB) {
                    manHours = self.getPOBfromManHours(manHours);
                }
                yValue = Math.round(manHours * 10) / 10;
            }
            var duration;
            if (item.WBS_activity_durationInDays) {
                duration = item.WBS_activity_durationInDays.value;
            }

            var rowColorClass = index % 2 == 1 ? "" : " rowColor";
            if (item.simulation) {
                colorJC = "red";
                var newDuration = parseInt((item.endTime - item.startTime) / (1000 * 60 * 60 * 24));
                if (newDuration != duration) {
                    duration = newDuration;
                    var colorDuration = "red";
                }
                var currentDateWithoutHours = new Date(Timeline.currentTimelineDate.time).setHours(0, 0, 0, 0);

                if (!(currentDateWithoutHours >= new Date(item.startTime).setHours(0, 0, 0, 0) && currentDateWithoutHours <= new Date(item.endTime).setHours(0, 0, 0, 0))) {
                    isInPeriod = "line-through";
                }
            }

            html += "<tr WBS_URI='" + item["WBS_activity"].value + "' class='Lifex_cost_WBSlistTR" + rowColorClass + "' style='text-decoration:" + isInPeriod + "'>";
            html +=
                "<td style='text-decoration: underline;color:" +
                colorJC +
                `' onclick=' Simulator.initSimulatorWidget("http://data.total/resource/tsf/dalia-lifex1/"+this.innerHTML);'>` +
                item["WBS_activity_label"].value +
                "</td>";
            html += "<td style='color:" + colorDuration + "'>" + duration + "</td>";
            html += "<td>" + yValue + "</td>";
            html += "<td style='color:" + colorDuration + "'>" + Math.round((item.dailyYvalue * 10) / 10) + "</td>";

            html += "</tr>";
        });
        html += "</table>";

        $("#Lifex_cost_WBSlistDiv").html(html);
        $(".Lifex_cost_WBSlistTR").on("click", function (evt, x) {
            var WBSid = $(this).attr("WBS_URI");
            if (evt.ctrlKey) {
                CustomNodeInfos.showNodeInfos(WBSid);
            } else if (evt.altKey) {
                Simulator.initSimulatorWidget(WBSid);
            } else {
                TagsGeometry.highlightTags([WBSid]);
            }
        });
    };

    self.exportAllWBS_JC_Tags = function () {
        var query = "";
    };
    self.getPOBfromManHours = function (manHours) {
        var coef = 1.15;
        coef = 1;
        return ((manHours / 12) * coef).toFixed(2);
    };

    self.getManhoursCoeff = function (manHours) {
        var coeff = 1.1;
        return (manHours / 1.54) * coeff;
    };
    return self;
})();

export default DataManager;
window.DataManager = DataManager;
