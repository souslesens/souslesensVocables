var Simulator = (function () {
    var self = {};

    self.WBSsimulationMap = {};

    self.getTasksOveriddingLimit = function () {
        if (!DataManager.dayPeriodActivities) {
            return alert("draw 2Dtimeline first");
        }

        var limit = prompt("enter limit");
        if (!limit) {
            return;
        }
        limit = parseInt(limit);

        var overRiddingdates = [];
        var jstreeData = [];
        for (var date in DataManager.dayPeriodActivities) {
            var obj = DataManager.dayPeriodActivities[date];
            var cumul = Math.round(obj.cumul);
            if (cumul > limit) {
                overRiddingdates.push(obj);

                jstreeData.push({
                    id: date,
                    text: "<b>" + date + "</b>_<i>" + Math.round(obj.cumul) + "</i>_" + obj.activities.length,
                    parent: "#",
                    data: { type: "date" },
                });
                /*  obj.activities.forEach(function(activity){
                          var label=Sparql_common.getLabelFromURI(activity)
                          jstreeData.push({
                              id:date+="_"+label,
                              text:label,
                              parent:date
                          })
                      })*/
            }
        }

        var options = {
            selectTreeNodeFn: function (event, obj) {
                var parentDate = obj.node.id;
                obj = DataManager.dayPeriodActivities[parentDate];

                var jstreeData = [];
                var selection = {};
                obj.activities.forEach(function (activity) {
                    selection[activity] = 1;
                });
                var WBSActivities = [];
                DataManager.sparqlData.forEach(function (item) {
                    if (selection[item["WBS_activity"].value]) {
                        WBSActivities.push(item);
                    }
                });

                self.currentWBactivityItems = WBSActivities;
                DataManager.showWBStasksList(WBSActivities, parentDate);
            },
            contextMenu: function (obj) {
                var items = {};
                items.SimulateSelection = {
                    label: "SimulateSelection",
                    action: function (_e) {
                        // pb avec source
                        Simulator.showSelectionSimulatorDialog(obj, "SimulateSetDuration");
                    },
                };
                /*     items.SimulateSetMaxY = {
                             label: "SimulateSetMaxY",
                             action: function (_e) {
                                 // pb avec source
                                 Simulator.showSelectionSimulatorDialog(obj, "SimulateSetMaxY");
                             },
                         };*/
                return items;
            },
        };

        JstreeWidget.loadJsTree("simulator_jstreeDiv", jstreeData, options);
    };

    self.initSimulatorWidget = function (wbsTaskUri, divId) {
        self.currentWbsTaskUri = wbsTaskUri;

        if (!divId) {
            divId = "simulator_rigthDiv";
            $("#LifexPlanning_right_tabs").tabs("option", "active", 2);
        }
        if (divId.indexOf("Dialog") > -1) {
            $("#" + divId).dialog("open");
        }
        $("#" + divId).load("/plugins/Lifex_cost/html/simulateIndividualWBS.html", function () {
            // Verifier si la simulation est ouverte ou non

            if (!GanttSimulation.isSimulationOn) {
                GanttSimulation.startSimulation();
            } //  return;

            // Get corresponding Task on gant (gant don't move with simulations so more covenient)
            var split_URI = wbsTaskUri.split("/");
            var WBS_name = split_URI[split_URI.length - 1];
            var Timeline_data = Timeline.timeline.itemsData.get();
            var result_Timeline_tasks = Timeline_data.filter((item) => item.content == WBS_name);
            if (result_Timeline_tasks?.length == 0) {
                return;
            }
            if (result_Timeline_tasks?.length > 0) {
                var selected_result;
                var timeline_value;
                var max_timeline_value;
                result_Timeline_tasks.forEach(function (result) {
                    timeline_value = parseInt(result.className.split("_")[2]);
                    if (!selected_result) {
                        selected_result = result;
                        max_timeline_value = timeline_value;
                    }
                    if (timeline_value > max_timeline_value) {
                        selected_result = result;
                        max_timeline_value = timeline_value;
                    }
                });
                if (selected_result) {
                    //  selected date
                    $("#WBSnodeInfos_simulation_Task").html(WBS_name);
                    self.currentGantItem = selected_result;
                    $("#WBSnodeInfos_simulation_startDateInput").val(common.getSimpleDateStrFromDate(selected_result.start));
                    $("#WBSnodeInfos_simulation_endDateInput").val(common.getSimpleDateStrFromDate(selected_result.end));
                    var newDuration = parseInt((selected_result.end - selected_result.start) / (1000 * 60 * 60 * 24));
                    $("#WBSnodeInfos_simulation_durationInput").val(newDuration);
                    Timeline.currentSelectedItem = DataManager.currentWBStasksMap[self.currentWbsTaskUri];
                    if (!Timeline.currentSelectedItem.initialDates) {
                        Timeline.currentSelectedItem.initialDates = {
                            start: Timeline.currentSelectedItem.WBS_activity_startDate.value.substring(0, 10),
                            end: Timeline.currentSelectedItem.WBS_activity_endDate.value.substring(0, 10),
                        };
                    }
                    $("#WBSnodeInfos_simulation_startDateInput").datepicker({
                        dateFormat: "yy-mm-dd",
                        changeMonth: true,
                        changeYear: true,
                        yearRange: "2000:2100",
                        showButtonPanel: true,
                        onSelect: function (dateTxt, inst) {
                            var newStartDate = new Date($("#WBSnodeInfos_simulation_startDateInput").val());
                            newStartDate.setHours(0, 0, 0);
                            self.currentGantItem.start = newStartDate;
                            if (self.currentGantItem.end < self.currentGantItem.start) {
                                self.currentGantItem.end = newStartDate;
                            }
                            GanttSimulation.timeLineOptions.onMove(self.currentGantItem, function (item) {
                                Simulator.initSimulatorWidget(self.currentWbsTaskUri);
                            });
                        },
                    });
                    $("#WBSnodeInfos_simulation_endDateInput").datepicker({
                        dateFormat: "yy-mm-dd",
                        changeMonth: true,
                        changeYear: true,
                        yearRange: "2000:2100",
                        showButtonPanel: true,
                        onSelect: function (dateTxt, inst) {
                            var newEndDate = new Date($("#WBSnodeInfos_simulation_endDateInput").val());
                            newEndDate.setHours(0, 0, 0);
                            console.log(newEndDate);
                            self.currentGantItem.end = newEndDate;
                            if (self.currentGantItem.end < self.currentGantItem.start) {
                                self.currentGantItem.start = newEndDate;
                            }
                            GanttSimulation.timeLineOptions.onMove(self.currentGantItem, function (item) {
                                Simulator.initSimulatorWidget(self.currentWbsTaskUri);
                            });
                        },
                    });
                }
            }

            GanttSimulation.showSimulationTable();
            /*
                self.getWBSactivityInfos(wbsTaskUri, function (err, result) {
                    self.currentTask = {};
                    if (err) {
                        return alert(err.responseText);
                    }
                    if (result.length == 0) {
                        return alert("no data found");
                    }
                    var isYcoef1_1 = $("#Lifex_cost_quantityVarSelect").val().indexOf("1.10") > -1;

                    var obj = result[0];

                    var manHours = obj.WBS_activity_sumManHours.value
                    if (isYcoef1_1) {
                        manHours = manHours = obj["WBS_activity_sumManHours_110"].value
                    }

                    self.currentTask.duration = obj.WBS_activity_durationInDays.value;
                    self.currentTask.startDate = obj.WBS_activity_startDate.value.substring(0, 10);
                    self.currentTask.endDate = obj.WBS_activity_endDate.value.substring(0, 10);

                    $("#WBSnodeInfos_simulation_durationInput").val(self.currentTask.duration);
                    $("#WBSnodeInfos_simulation_startDateInput").val(self.currentTask.startDate);


                    self.currentTask.manHours = manHours;
                    self.currentTask.wbsLabel = obj.WBS_activity_label.value;

                    $("#WBSnodeInfos_simulation_durationSpan").html(self.currentTask.duration);
                    $("#WBSnodeInfos_simulation_startDateSpan").html(self.currentTask.startDate);
                    $("#WBSnodeInfos_simulation_endDateSpan").html(self.currentTask.startDate);
                    $("#WBSnodeInfos_simulation_WBSactivitySpan").html(self.currentTask.wbsLabel);
                    $("#WBSnodeInfos_simulation_manHoursSpan").html(self.currentTask.manHours);
                });
                */
        });
    };

    self.showWBSchangesImpactOnChart2D = function () {
        var newDurationStr = $("#WBSnodeInfos_simulation_durationInput").val();
        var newStartDateStr = $("#WBSnodeInfos_simulation_startDateInput").val();

        var newDuration = parseInt(newDurationStr);
        var startDate = new Date(newStartDateStr);
        var endDate = startDate.getTime();
        //  endDate = new Date(endDate + newDuration * 24 * 60 * 60 * 1000).toISOString();
        endDate = common.getSimpleDateStrFromDate(new Date(endDate + newDuration * 24 * 60 * 60 * 1000));
        // startDate = startDate.toISOString();
        startDate = common.getSimpleDateStrFromDate(startDate);

        var simulatedDataMap = {
            [self.currentWbsTaskUri]: {
                WBS_activity_startDate: startDate,
                WBS_activity_endDate: endDate,
                //  WBS_activity_startDate:startDate,
            },
        };

        FiltersWidget.draw2dChart(null, null, { simulatedDataMap: simulatedDataMap }, function (err, resul) {});
    };

    self.validateTaskSimulation = function () {
        var newDurationStr = $("#WBSnodeInfos_simulation_durationInput").val();
        var newStartDateStr = $("#WBSnodeInfos_simulation_startDateInput").val();
        self.currentTask.newDuration = parseInt(newDurationStr);
        self.currentTask.newStartDate = new Date(newStartDateStr);
        self.currentTask.newEndDate = self.currentTask.newStartDate.getTime();
        self.currentTask.newEndDate = new Date(self.currentTask.newEndDate.getTime() + self.currentTask.newDuration * 24 * 60 * 60 * 1000);

        var newDailyDuration = Math.round((self.currentTask.manHours / self.currentTask.newDuration) * 10) / 10;
        var newRow = [
            self.currentTask.wbsLabel,
            self.currentTask.manHours,

            self.currentTask.startDate,
            // self.currentTask.newStartDate.toISOString().substring(0, 10),
            common.getSimpleDateStrFromDate(self.currentTask.newStartDate),
            self.currentTask.endDate,
            //  self.currentTask.newEndDate.toISOString().substring(0, 10),
            common.getSimpleDateStrFromDate(self.currentTask.newEndDate),
            self.currentTask.duration,
            self.currentTask.newDuration,
            newDailyDuration,
            Math.round((self.currentTask.manHours / self.currentTask.duration) * 10) / 10,
        ];

        $("[WBS_URI='" + self.currentWbsTaskUri + "']").addClass("rowColorSimulated");
        $("[WBS_URI='" + self.currentWbsTaskUri + "']").append("<td>" + newDailyDuration + "</td>");

        self.simulationData.push(newRow);
        self.simulationDataTable.row.add(newRow).draw();
    };

    self.getWBSactivityInfos = function (wbsUri, callback) {
        var JCvar = "<JobCardExecution>";
        var WBSqueryVars = `
                <${wbsUri}> <http://rds.posccaesar.org/ontology/lis14/rdl/occursRelativeTo> ?JobCardExecution.
                  {<${wbsUri}> rdfs:label ?WBS_activity_label.}
                  {<${wbsUri}> <${Lifex_cost.planningSourceUri}startDate> ?WBS_activity_startDate.}
                  {<${wbsUri}> <${Lifex_cost.planningSourceUri}endDate> ?WBS_activity_endDate.}
                  {<${wbsUri}> <${Lifex_cost.planningSourceUri}durationInDays> ?WBS_activity_durationInDays.}
                OPTIONAL  {<${wbsUri}> <${Lifex_cost.planningSourceUri}treePath> ?WBS_activity_treePath.}
             
                  {<${wbsUri}> <${Lifex_cost.planningSourceUri}sumManHours> ?WBS_activity_sumManHours.}
                     {<${wbsUri}> <${Lifex_cost.planningSourceUri}sumManHours_110> ?WBS_activity_sumManHours_110.}
                
                `;

        var query = `PREFIX owl: <http://www.w3.org/2002/07/owl#>
                    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
                    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> 
                    Select distinct *   FROM   <${Lifex_cost.lifexUri}> 
                    FROM   <http://rds.posccaesar.org/ontology/lis14/ont/core>  
                    FROM   <${Lifex_cost.planningSourceUri}>  
                    
                    where {
                    ${WBSqueryVars}
                    OPTIONAL  {${JCvar} <http://www.w3.org/2000/01/rdf-schema#label> ?JobCardExecution_label.}
                    OPTIONAL  {${JCvar} <http://purl.org/dc/terms/title> ?JobCardExecution_title.}
                    OPTIONAL  {${JCvar} <http://data.total/resource/tsf/dalia-lifex1/scafoldingVolume> ?JobCardExecution_scafoldingVolume.}
                    OPTIONAL  {${JCvar} <http://data.total/resource/tsf/dalia-lifex1/scafoldingComments> ?JobCardExecution_scafoldingComments.}
                    OPTIONAL  {${JCvar} <http://purl.org/dc/terms/description> ?JobCardExecution_description.}
                    OPTIONAL  {${JCvar} <http://data.total/resource/tsf/dalia-lifex1/maximumPOB> ?JobCardExecution_maximumPOB.}

                    }`;
        var sparql_url = Config.sources[Lifex_cost.currentSource].sparql_server.url;
        if ((sparql_url = "_default")) {
            sparql_url = Config.sparql_server.url;
        }
        var url = sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: Lifex_cost.currentSource }, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result.results.bindings);
        });
    };

    self.initSimulationDataTable = function (data) {
        if (data) {
        } else if (self.simulationData) {
            data = self.simulationData;
        } else {
            data = [[]];
            self.simulationData = [];
        }

        if (true || !self.simulationDataTable) {
            /*   self.SimulationDataTable.destroy();
                   $("#simulator_wbs_dataTable").html("");*/

            var yVar = $("#Lifex_cost_quantityVarSelect").val();
            var colNames = ["taskLabel", "manHours", "startDate", "initial startDate", "initial endDate", "new endDate", " duration", "new duration", yVar, "new " + yVar];

            var cols = [];
            colNames.forEach(function (item) {
                cols.push({ title: item, defaultContent: "" });
            });

            var params = {
                data: data,
                columns: cols,
                fixedColumns: true,
                pageLength: 200,
                dom: "BfrtipB",
                buttons: [
                    {
                        extend: "csvHtml5",
                        text: "Export CSV",
                        fieldBoundary: "",
                        fieldSeparator: ";",
                    },
                    "copy",
                ],

                paging: false,
            };

            self.simulationDataTable = $("#simulator_wbs_dataTable").DataTable(params);
        } else {
        }
    };

    self.clearAll = function () {
        self.WBSsimulationMap = {};
        self.simulationDataTable.clear().draw();
        for (var key in self.WBSsimulationMap) {
            $("#WBS_" + key).removeClass("rowColorSimulated");
        }
        self.simulationData = {};
        GanttSimulation.WBSbeforeSimulation = {};
        GanttSimulation.simulationData = {};
        GanttSimulation.stopSimulation();
        Time2dChart.initialSparqlData = JSON.stringify(DataManager.sparqlData);
        Time2dChart.onChart2DselectDate(Timeline.currentTimelineDate, { notDrawGant: true });
    };

    self.showSelectionSimulatorDialog = function (node, simulationType, divId) {
        if (!divId) {
            divId = "simulator_rigthDiv";
            $("#LifexPlanning_right_tabs").tabs("option", "active", 2);
        }
        $("#" + divId).load("/plugins/Lifex_cost/html/simulateWBSselection.html", function () {
            var parentDateStr = node.id;
            self.currentSelectionDate = new Date(parentDateStr);

            /*
                  if (simulationType == "SimulateSetDuration") {

                  } else if (simulationType == "SimulateSetMaxY") {
                      var maxYStr = prompt("enter maxYValue");
                      if (!maxYStr) {
                          return;
                      }
                      var maxY = parseInt(maxYStr)
                      var date = new Date(parentDateStr)
                      self.simulateSetDuration(date, maxY)
        */
        });
    };

    self.simulateMaxY = function (date, maxY) {
        // var items=JSON.parse(JSON.stringify(self.currentWBactivityItems))
        if (!date) {
            date = self.currentSelectionDate;
        }
        if (!maxY) {
            maxY = self.currentSelectionDate;
        }

        var simulatedDataMap = {};

        function recurse(nDays) {
            var currentYtotal = 0;
            self.currentWBactivityItems.forEach(function (item, index) {
                var startDate = new Date(item.WBS_activity_startDate.value);
                var endDate = new Date(item.WBS_activity_endDate.value);
                var offsetdays = index * nDays;
                if (index > 0) {
                    startDate = new Date(startDate.getTime() + offsetdays * 24 * 60 * 60 * 1000);
                    endDate = new Date(endDate.getTime() + offsetdays * 24 * 60 * 60 * 1000);
                }

                simulatedDataMap[item.WBS_activity.value] = {
                    WBS_activity_startDate: startDate,
                    WBS_activity_endDate: endDate,
                };
                var time = date.getTime();
                var startTime = startDate.getTime();
                var endTime = endDate.getTime();
                if (startTime <= time && time <= endTime) {
                    currentYtotal += item.dailyYvalue;
                }
            });
            if (currentYtotal > maxY || nDays < 10) {
                /*  console.log(nDays)
                          console.log(currentYtotal)*/
                recurse(nDays + 1);
            } else {
                /* console.log("+++"+nDays)
                     console.log("+++"+currentYtotal)*/
            }
        }

        recurse(1);

        self.simulationData = [];
        self.currentWBactivityItems.forEach(function (item, index) {
            var itemSimulation = simulatedDataMap[item.WBS_activity.value];
            var dailyDuration = Math.round((item.sumManHours_110 / item.WBS_activity_durationInDays) * 10) / 10;
            var newDuration = -item.WBS_activity_durationInDays.value;
            var newDailyDuration = -dailyDuration;

            var newRow = [
                item.WBS_activity_label.value,
                item.WBS_activity_sumManHours_110.value,
                item.WBS_activity_durationInDays.value,
                dailyDuration,
                item.WBS_activity_startDate.value,
                item.WBS_activity_endDate.value,
                newDuration,
                newDailyDuration,
                //  itemSimulation.WBS_activity_startDate.toISOString().substring(0, 10),
                common.getSimpleDateStrFromDate(itemSimulation.WBS_activity_startDate),
                //  itemSimulation.WBS_activity_endDate.toISOString().substring(0, 10)
                common.getSimpleDateStrFromDate(itemSimulation.WBS_activity_endDate),
            ];

            self.simulationData.push(newRow);
        });

        FiltersWidget.draw2dChart(null, null, { simulatedDataMap: simulatedDataMap }, function (err, resul) {});
    };

    self.simulateSetDuration = function (node) {
        var mintime = 0;
        var maxtime = 100000000000000;
        self.currentWBactivityItems.forEach(function (item) {
            mintime = Math.min(mintime, new Date(item.WBS_activity_startDate.value.getTime()));
            maxtime = Math.min(mintime, new Date(item.WBS_activity_endDate.value.getTime()));
        });
    };

    self.ManageDateChangementOnTask = function (html) {
        var htmlId = $(html).attr("id");
        if (!htmlId) {
            return;
        }
        if (htmlId == "WBSnodeInfos_simulation_durationInput") {
            //change end date

            var newEndDate = new Date(self.currentGantItem.start.getTime() + parseInt($("#WBSnodeInfos_simulation_durationInput").val()) * (1000 * 60 * 60 * 24));
            console.log(newEndDate);
            self.currentGantItem.end = newEndDate;
            if (self.currentGantItem.end > self.currentGantItem.start) {
                GanttSimulation.timeLineOptions.onMove(self.currentGantItem, function (item) {
                    Simulator.initSimulatorWidget(self.currentWbsTaskUri);
                });
            }
        }
    };

    return self;
})();

export default Simulator;
window.Simulator = Simulator;
