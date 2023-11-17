import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import Lineage_sources from "../lineage/lineage_sources.js";
import NodeInfosWidget from "../../uiWidgets/nodeInfosWidget.js";

var TimeLineWidget = (function () {
    var self = {};

    self.init = function () {
        self.source = Lineage_sources.activeSource;
        $("#mainDialogDiv").dialog("open");
        $("#mainDialogDiv").load("snippets/timeLineWidget.html", function () {
            var editable = true;
            self.drawVisTimeLineData(editable);

            /* var items = new vis.DataSet([
         { id: 1, content: "item 1", start: "2014-04-20" },
         { id: 2, content: "item 2", start: "2014-04-14" },
         { id: 3, content: "item 3", start: "2014-04-18" },
         { id: 4, content: "item 4", start: "2014-04-16", end: "2014-04-19" },
         { id: 5, content: "item 5", start: "2014-04-25" },
         { id: 6, content: "item 6", start: "2014-04-27", type: "point" }
       ]);

       // Configuration for the Timeline
       var options = {};

       // Create a Timeline
       var container = document.getElementById("timeLineDiv");
       var timeline = new vis.Timeline(container, items, options);*/
        });

        self.drawVisTimeLineData = function (editable) {
            self.getTestData(function (err, result) {
                if (err) {
                    return alert(err.responseText);
                }
                var groups = {};
                var timeBounds = { start: new Date("2000-01-01"), end: new Date("2100-01-01") };

                result.results.bindings.forEach(function (item, index) {
                    var id = index;
                    var POB = item.OffshorePOBValue.value;
                    var discipline = item.DisciplineLabel.value;
                    var jobCardLabel = item.Job_CardLabel.value;
                    var jobCard = item.Job_Card.value;
                    var startDate = new Date(item.StartDateValue.value.substring(0, 10));
                    var endDate = new Date(item.EndDateValue.value.substring(0, 10));
                    timeBounds.start = timeBounds.start < startDate ? startDate : timeBounds.start;
                    timeBounds.end = timeBounds.end > endDate ? endDate : timeBounds.end;

                    var groupKey = discipline;
                    if (!groups[groupKey]) {
                        groups[groupKey] = [];
                    }
                    groups[groupKey].push({
                        id: "period_" + id,
                        // type: "box",
                        group: groupKey,
                        // content: POB,
                        title: jobCardLabel + " POB" + POB,
                        className: "green",
                        start: startDate,
                        end: endDate,
                        editable: editable,
                        data: {
                            POB: POB,
                            jobCard: jobCard,
                            jobCardLabel: jobCardLabel,
                            discipline: discipline,
                        },
                        //  style :"background-color:#22A784;height:"+Math.log(parseInt(POB))+"px"
                        style: "background-color:#22A784;height:" + POB + "px",
                        visible: false,
                    });
                });

                var dataDataset = new vis.DataSet();
                var groupsDataset = new vis.DataSet();

                for (var key in groups) {
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
                    groupsArray.push({ id: key, label: key });
                }
                common.fillSelectOptions("timeLineWidget_groupSelect", groupsArray, false, "label", "id");

                var x = dataDataset.get();
                var container = document.getElementById("timeLineDiv");

                if (timeBounds.start > timeBounds.end) {
                    var end = timeBounds.end;
                    timeBounds.end = timeBounds.start;
                    timeBounds.start = end;
                }

                var options = {
                    min: timeBounds.start, // lower limit of visible range
                    max: timeBounds.end,
                    verticalScroll: true,
                    maxHeight: "700px",
                    margin: { item: { vertical: 1 } },
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

                /*    timeline.on("select", function(properties) {
           //var item= self.timeline.getSelection()
         });

         timeline.on("contextmenu", function(properties) {
         //  var x = properties;
         });

      timeline.on("mouseOver", function(properties) {
           if( properties && properties.item) {
             var item= self.timeline.itemsData.get(properties.item)
             $("#timeLineWidget_messageDiv").html(JSON.stringify(item.data))
           }
         });*/
            });
        };

        self.showJCinfos = function () {
            var obj = { data: { id: self.currrentTimelineItem.data.jobCard } };
            $("#timeLineWidget_popupDiv").css("display", "block");
            NodeInfosWidget.showNodeInfos(self.source, obj, "timeLineWidget_infosDiv", { noDialog: true });
        };

        self.hidePopup = function () {
            $("#timeLineWidget_popupDiv").css("display", "none");
        };

        self.onGroupSelectChange = function (group) {
            var groupObj = self.timeline.groupsData.get(group);
            self.timeline.setGroups([groupObj]);
            // var item= self.timeline.groupsData.update({ id:group,visible: !item.visible})
        };
        self.setItemsColorClass = function (items, varName) {
            var palette = {
                "New Color": {
                    50: "#51dcff",
                    100: "#34d6ff",
                    200: "#19cffd",
                    300: "#07c2f1",
                    400: "#07abd5",
                    500: "#0b9bc0",
                    600: "#0e8cab",
                    700: "#107c97",
                    800: "#126e85",
                    900: "#135f72",
                },
            };

            var valueBounds = { min: 0, max: 100000000 };
            items.forEach(function (item, index) {
                var value = parseInt(item.data[varName]);
                valueBounds.min = Math.max(value, valueBounds.min);
                valueBounds.max = Math.min(value, valueBounds.max);
            });

            valueBounds.min = 0;
            valueBounds.max = 200;
            var palette = ["#440154", "#404387", "#29788E", "#22A784", "#79D151", "#FDE724"];
            var classes = [];
            var extent = valueBounds.max - valueBounds.min;
            var steps = 5;
            for (var i = 0; i < steps; i++) {
                classes.push({ start: valueBounds.min + i * (extent / steps), color: palette[i] });
            }

            items.forEach(function (item, index) {
                for (var i = 0; i < classes.length; i++) {
                    if (parseInt(item.data[varName]) >= classes[i].start) {
                        items[index].style = "background-color:" + classes[i].color + ";height:5px";
                    }
                }
            });
            return items;
        };

        self.getTestData = function (callback) {
            var query =
                "PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>Select distinct *   FROM   <http://data.total/resource/tsf/dalia-lifex/>  FROM   <http://rds.posccaesar.org/ontology/lis14/ont/core>  from <http://souslesens.org/vocables/resource/labels/> where { ?StartDate  ^<http://rds.posccaesar.org/ontology/lis14/rdl/after> ?Offshore_Construction_or_Installation.  ?Offshore_Construction_or_Installation  ^<http://rds.posccaesar.org/ontology/lis14/rdl/hasTemporalExtent> ?Job_Card.  ?Job_Card  ^<http://rds.posccaesar.org/ontology/lis14/rdl/realizes> ?Discipline.  ?Job_Card  ^<http://rds.posccaesar.org/ontology/lis14/rdl/realizedIn>/<http://rds.posccaesar.org/ontology/lis14/rdl/hasPart> ?OffshorePOB.  ?Offshore_Construction_or_Installation  <http://rds.posccaesar.org/ontology/lis14/rdl/before> ?EndDate. \n" +
                " OPTIONAL {?StartDate owl:hasValue ?StartDateValue}\n" +
                " OPTIONAL {?Offshore_Construction_or_Installation owl:hasValue ?Offshore_Construction_or_InstallationValue}\n" +
                " OPTIONAL {?StartDate rdfs:label ?StartDateLabel}\n" +
                " OPTIONAL {?Offshore_Construction_or_Installation rdfs:label ?Offshore_Construction_or_InstallationLabel}\n" +
                " OPTIONAL {?Job_Card owl:hasValue ?Job_CardValue}\n" +
                " OPTIONAL {?Job_Card rdfs:label ?Job_CardLabel}\n" +
                " OPTIONAL {?Discipline owl:hasValue ?DisciplineValue}\n" +
                " OPTIONAL {?Discipline rdfs:label ?DisciplineLabel}\n" +
                " OPTIONAL {?OffshorePOB owl:hasValue ?OffshorePOBValue}\n" +
                " OPTIONAL {?OffshorePOB rdfs:label ?OffshorePOBLabel}\n" +
                " OPTIONAL {?EndDate owl:hasValue ?EndDateValue}\n" +
                " OPTIONAL {?EndDate rdfs:label ?EndDateLabel}\n" +
                "\n" +
                " ?StartDate  rdf:type <http://data.total/resource/tsf/dalia-lifex/StartDate>. " +
                " ?Offshore_Construction_or_Installation  rdf:type <http://data.total/resource/tsf/dalia-lifex/Offshore_Construction_or_Installation>. " +
                "?Job_Card  rdf:type <http://data.total/resource/tsf/dalia-lifex/Job_Card>. ?" +
                "Discipline  rdf:type <http://data.total/resource/tsf/dalia-lifex/Discipline>." +
                " ?OffshorePOB  rdf:type <http://data.total/resource/tsf/dalia-lifex/OffshorePOB>. " +
                "?EndDate  rdf:type <http://data.total/resource/tsf/dalia-lifex/EndDate>." +
                "Filter(?OffshorePOBValue >0)" +
                "}  limit 10000";

            var url = Config.sources[self.source].sparql_server.url + "?format=json&query=";

            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: self.source, caller: "getObjectRestrictions" }, function (err, result) {
                if (err) {
                    return callback(err);
                }

                callback(null, result);
            });
        };
    };

    return self;
})();

export default TimeLineWidget;
window.TimeLineWidget = TimeLineWidget;
