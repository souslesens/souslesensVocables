var CustomNodeInfos = (function () {
    var self = {};
    self.nodeInfosRelatedTags = {};

    self.generateRawInfosStr = function (prop, value, notTr) {
        var str = "<tr class='infos_table'>";
        str += "<td class='detailsCellName'>" + prop + "</td>";
        str += "<td class='detailsCellValue'><div class='content'>" + value + "</div></td>";
        if (notTr) {
        } else {
            str += "</tr>";
        }

        return str;
    };
    self.TasksTabDiv = function () {
        //Tasks

        var str = "<div class='NodesInfos_tableDiv'style='display:inline-grid;width:" + 3 * self.widthWBSTable + "px;overflow:unset'>" + "<table class='infosTable'>";

        str += "<thead><tr class='infos_table'>";
        str += "<th class='detailsCellName' style='width:20px;'>" + "Task Sequence" + "</th>";
        str += "<th class='detailsCellName'>" + "Task" + "</th></thead>";
        var query = `
            PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> 
            Select distinct *   FROM   <${Lifex_cost.lifexUri}>  FROM   <http://rds.posccaesar.org/ontology/lis14/ont/core>  FROM   <${Lifex_cost.planningSourceUri}>  where 
           
            {<${self.linked_JobCard.uri}> ^<http://rds.posccaesar.org/ontology/lis14/rdl/activityPartOf> ?Task.

            ?Task  rdf:type <http://data.total/resource/tsf/dalia-lifex1/Task>.
        OPTIONAL  {?Task <http://www.w3.org/2000/01/rdf-schema#label> ?Task_label.}
        OPTIONAL  {?Task <http://data.total/resource/tsf/dalia-lifex1/sequenceNumber> ?Task_sequenceNumber.}
        }  
        `;
        Sparql_proxy.querySPARQL_GET_proxy(self.url, query, "", { source: Lifex_cost.currentSource }, function (err, result) {
            var tasksStr = "";
            result.results.bindings = result.results.bindings.sort((a, b) => a.Task_sequenceNumber.value - b.Task_sequenceNumber.value);
            result.results.bindings.forEach((row, index) => {
                var style = "";
                str += "<tr class='infos_table'>";
                str += "<td class='detailsCellValue' style='width:20px;'>" + row.Task_sequenceNumber.value + "</td>";
                str += "<td class='detailsCellValue'><div class='content'>" + row.Task_label.value + "</div></td>";
                str += "</tr>";
            });
            //tasksStr=tasksStr.slice(0, -1);

            str += "</tbody><table>";
            str += "</div>";
            $("#nodeInfosWidget_ObjectDiv").html(str);
        });
    };
    self.TagsTabDiv = function (isEquipement) {
        var strTagTable = "";
        var tagsResults = {};
        //Tags
        async.series(
            [
                //Tags
                function (callbackSeries) {
                    strTagTable =
                        "<div class='NodesInfos_tableDiv'style='display:inline-grid;width:" +
                        3 * self.widthWBSTable +
                        "px;overflow:unset;max-height:unset'> <table class='infosTable' style='margin-top:20px;'>";
                    strTagTable += "<thead><tr class='infos_table'>";
                    strTagTable += "<th class='detailsCellName'>" + "TagLabel" + "</th>";

                    strTagTable += "<th class='detailsCellName'>" + "Tag Title" + "</th>";
                    if (!isEquipement) {
                        strTagTable += "<th class='detailsCellName'>" + "Package" + "</th>";
                        strTagTable += "<th class='detailsCellName'>" + "Functional Location" + "</th>";
                    }
                    if (isEquipement) {
                        strTagTable += "<th class='detailsCellName'>" + "Equipement Label" + "</th>";
                        strTagTable += "<th class='detailsCellName'>" + "Equipement Cost" + "</th>";
                        strTagTable += "<th class='detailsCellName'>" + "Equipement Weight" + "</th>";
                    }
                    strTagTable += "</thead></tr>";
                    var query = `
                    PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> 
                    Select distinct *   FROM   <${Lifex_cost.lifexUri}>  FROM   <http://rds.posccaesar.org/ontology/lis14/ont/core>  FROM   <${Lifex_cost.planningSourceUri}>  where 
                    
                    {<${self.linked_JobCard.uri}> <http://rds.posccaesar.org/ontology/lis14/rdl/hasPassiveParticipant> ?tag.

                    ?tag  rdf:type <http://data.total/resource/tsf/dalia-lifex1/tag>.
                    OPTIONAL  {?tag <http://www.w3.org/2000/01/rdf-schema#label> ?tag_label.}
                     OPTIONAL  {?tag <http://purl.org/dc/terms/title> ?tag_title.}
                      OPTIONAL  {?tag <http://data.total/resource/tsf/dalia-lifex1/tagHyperlink> ?tag_tagHyperlink.}
                    }  
                    `;
                    Sparql_proxy.querySPARQL_GET_proxy(self.url, query, "", { source: Lifex_cost.currentSource }, function (err, result) {
                        result.results.bindings.forEach((row, index) => {
                            self.nodeInfosRelatedTags[row.tag.value] = { label: row.tag_label.value };
                            self.nodeInfosRelatedTags[row.tag.value]["title"] = row.tag_title.value;
                            if (row.tag_tagHyperlink) {
                                self.nodeInfosRelatedTags[row.tag.value]["hyperlink"] = row.tag_tagHyperlink.value;
                            }
                        });

                        callbackSeries();
                    });
                },
                //Packages and tag titles
                function (callbackSeries) {
                    if (isEquipement) {
                        return callbackSeries();
                    }
                    var tagsUri = Object.keys(CustomNodeInfos.nodeInfosRelatedTags);
                    var tagUriStr = tagsUri.map((item) => `<${item}>`).join(",");
                    if (!tagUriStr) {
                        return callbackSeries();
                    }
                    var query = `PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> Select distinct *   FROM   <${Lifex_cost.lifexUri}>  FROM   <http://rds.posccaesar.org/ontology/lis14/ont/core>  FROM   <${Lifex_cost.planningSourceUri}>  where {?tag <http://rds.posccaesar.org/ontology/lis14/rdl/locatedRelativeTo> ?Package.
              

                ?tag  rdf:type <http://data.total/resource/tsf/dalia-lifex1/tag>.  ?Package  rdf:type <http://data.total/resource/tsf/dalia-lifex1/Package>.
                FILTER(?tag in (${tagUriStr})).
                OPTIONAL  {?tag <http://www.w3.org/2000/01/rdf-schema#label> ?tag_label.}
               
                OPTIONAL  {?Package <http://www.w3.org/2000/01/rdf-schema#label> ?Package_label.}
            }  `;
                    Sparql_proxy.querySPARQL_GET_proxy(self.url, query, "", { source: Lifex_cost.currentSource }, function (err, result) {
                        result.results.bindings.forEach((row, index) => {
                            self.nodeInfosRelatedTags[row.tag.value]["package"] = row.Package_label.value;
                        });
                        callbackSeries();
                    });
                },
                //FL
                function (callbackSeries) {
                    if (isEquipement) {
                        return callbackSeries();
                    }
                    var tagsUri = Object.keys(CustomNodeInfos.nodeInfosRelatedTags);
                    var tagUriStr = tagsUri.map((item) => `<${item}>`).join(",");
                    if (!tagUriStr) {
                        return callbackSeries();
                    }

                    var query = `PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> Select distinct *   FROM   <${Lifex_cost.lifexUri}>  FROM   <http://rds.posccaesar.org/ontology/lis14/ont/core>  FROM   <${Lifex_cost.planningSourceUri}>  where 
                {?tag <http://rds.posccaesar.org/ontology/lis14/rdl/residesIn> ?functionalLocation.


                ?tag  rdf:type <http://data.total/resource/tsf/dalia-lifex1/tag>.  ?functionalLocation  rdf:type <http://data.total/resource/tsf/dalia-lifex1/FunctionalLocation>.
                FILTER(?tag in (${tagUriStr})).
                OPTIONAL  {?tag <http://www.w3.org/2000/01/rdf-schema#label> ?tag_label.}
                OPTIONAL  {?tag <http://purl.org/dc/terms/title> ?tag_title.}
                OPTIONAL  {?functionalLocation <http://www.w3.org/2000/01/rdf-schema#label> ?functionalLocation_label.}
            }  `;
                    Sparql_proxy.querySPARQL_GET_proxy(self.url, query, "", { source: Lifex_cost.currentSource }, function (err, result) {
                        result.results.bindings.forEach((row, index) => {
                            self.nodeInfosRelatedTags[row.tag.value]["fLLabel"] = row.functionalLocation_label.value;
                        });

                        callbackSeries();
                    });
                },
                //Equipements
                function (callbackSeries) {
                    if (!isEquipement) {
                        return callbackSeries();
                    }
                    var tagsUri = Object.keys(CustomNodeInfos.nodeInfosRelatedTags);
                    var tagUriStr = tagsUri.map((item) => `<${item}>`).join(",");
                    if (!tagUriStr) {
                        return callbackSeries();
                    }
                    var query = `PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> 
                Select distinct *   FROM   <${Lifex_cost.lifexUri}>  FROM   <http://rds.posccaesar.org/ontology/lis14/ont/core>  FROM   <${Lifex_cost.planningSourceUri}>  where 
                
                {?tag <http://rds.posccaesar.org/ontology/lis14/rdl/locatedRelativeTo> ?EquipmentItem.


                ?tag  rdf:type <http://data.total/resource/tsf/dalia-lifex1/tag>.  ?EquipmentItem  rdf:type <http://data.total/resource/tsf/dalia-lifex1/EquipmentItem>.
                FILTER(?tag in (${tagUriStr})).
                OPTIONAL  {?tag <http://www.w3.org/2000/01/rdf-schema#label> ?tag_label.}
              
                OPTIONAL  {?EquipmentItem <http://www.w3.org/2000/01/rdf-schema#label> ?EquipmentItem_label.}
                
                OPTIONAL  {?EquipmentItem <http://data.total/resource/tsf/dalia-lifex1/hasWeight> ?Weight.
                ?Weight <http://www.w3.org/1999/02/22-rdf-syntax-ns#value> ?Weight_value.}
                OPTIONAL  {
                ?Cost ^<http://data.total/resource/tsf/dalia-lifex1/hasCost> ?EquipmentItem.
                ?Cost <http://www.w3.org/1999/02/22-rdf-syntax-ns#value> ?Cost_value.}
                }
                `;

                    Sparql_proxy.querySPARQL_GET_proxy(self.url, query, "", { source: Lifex_cost.currentSource }, function (err, result) {
                        result.results.bindings.forEach((row, index) => {
                            var cost = "";
                            var weight = "";
                            if (row.Cost_value) {
                                cost = row.Cost_value.value;
                            }
                            if (row.Weight_value) {
                                weight = row.Weight_value.value;
                            }
                            var EquipmentItem = { label: row.EquipmentItem_label.value, Cost: cost, Weight: weight };
                            if (!self.nodeInfosRelatedTags[row.tag.value]["Equipement"]) {
                                self.nodeInfosRelatedTags[row.tag.value]["Equipement"] = [EquipmentItem];
                            } else {
                                self.nodeInfosRelatedTags[row.tag.value]["Equipement"].push(EquipmentItem);
                            }
                        });
                        callbackSeries();
                    });
                },
            ],
            function (err) {
                for (let tag in self.nodeInfosRelatedTags) {
                    strTagTable += '<tr class="infos_table">';
                    if (self.nodeInfosRelatedTags[tag].hyperlink) {
                        strTagTable +=
                            '<td class="detailsCellValue"><div class="content"><a target="_blank" href="' +
                            self.nodeInfosRelatedTags[tag].hyperlink +
                            '">' +
                            self.nodeInfosRelatedTags[tag].label +
                            "</a></div></td>";
                    } else {
                        strTagTable += '<td class="detailsCellValue"><div class="content">' + self.nodeInfosRelatedTags[tag].label + "</div></td>";
                    }

                    strTagTable += '<td class="detailsCellValue"><div class="content">' + self.nodeInfosRelatedTags[tag].title + "</div></td>";
                    if (!isEquipement) {
                        strTagTable += '<td class="detailsCellValue"><div class="content">' + self.nodeInfosRelatedTags[tag].package + "</div></td>";
                        strTagTable += '<td class="detailsCellValue"><div class="content">' + self.nodeInfosRelatedTags[tag].fLLabel + "</div></td>";
                    }
                    if (isEquipement) {
                        if (self.nodeInfosRelatedTags[tag].Equipement) {
                            var labelStr = "";
                            var CostStr = "";
                            var WeightStr = "";
                            self.nodeInfosRelatedTags[tag].Equipement.forEach((equip, index) => {
                                var style = "height:25px;";
                                if (index != self.nodeInfosRelatedTags[tag].Equipement.length - 1) {
                                    style += "border-bottom:#8757de solid 1px;";
                                }

                                labelStr += `<div style="${style}" >` + equip.label + "</div>";
                                CostStr += `<div style="${style}" >` + equip.Cost + "</div>";
                                WeightStr += `<div style="${style}">` + equip.Weight + "</div>";
                            });
                            strTagTable += '<td class="detailsCellValue">';
                            strTagTable += labelStr;
                            strTagTable += "</td>";
                            strTagTable += '<td class="detailsCellValue">';
                            strTagTable += CostStr;
                            strTagTable += "</td>";
                            strTagTable += '<td class="detailsCellValue">';
                            strTagTable += WeightStr;
                            strTagTable += "</td>";
                        } else {
                            strTagTable += '<td class="detailsCellValue">' + "" + "</td>";
                            strTagTable += '<td class="detailsCellValue">' + "" + "</td>";
                            strTagTable += '<td class="detailsCellValue">' + "" + "</td>";
                        }
                    }

                    strTagTable += "</tr>";
                }

                strTagTable += "<table>";
                strTagTable += "</div>";
                $("#nodeInfosWidget_ObjectDiv").html(strTagTable);
            }
        );
    };
    self.WBSJobCardTabDiv = function (uri, callback) {
        if (!uri) {
            return;
        }
        var label = uri.split("/")[uri.split("/").length - 1];
        var isJobCard = false;

        var str = "<div class='NodesInfos_tableDiv'style='display:inline-grid;width:" + 2 * self.widthWBSTable + "px;overflow:unset;'>" + "<table class='infosTable'>";
        var sparql_url = Config.sources[Lifex_cost.currentSource].sparql_server.url;
        if ((sparql_url = "_default")) {
            sparql_url = Config.sparql_server.url;
        }
        var url = sparql_url + "?format=json&query=";
        self.url = url;
        self.linked_JobCard = {};
        var strTagTable = "";
        if (label.startsWith("DAL")) {
            isJobCard = true;
        }
        if (isJobCard) {
            var WBSqueryVars = "";
            var JCvar = "<" + uri + ">";
            self.linked_JobCard.uri = uri;
        } else {
            var yAxisVal = $("#Lifex_cost_quantityVarSelect").val();
            var manHoursToTransform = false;
            if (yAxisVal.indexOf("1.") > -1) {
                manHoursToTransform = true;
            }
            var WBSqueryVars = `
                    <${uri}> <http://rds.posccaesar.org/ontology/lis14/rdl/occursRelativeTo> ?JobCardExecution.
                    OPTIONAL  {<${uri}> <http://www.w3.org/2000/01/rdf-schema#label> ?WBS_activity_label.}
                    OPTIONAL  {<${uri}> <http://purl.org/dc/terms/title> ?WBS_activity_title.}
                    OPTIONAL  {<${uri}> <${Lifex_cost.planningSourceUri}startDate> ?WBS_activity_startDate.}
                    OPTIONAL  {<${uri}> <${Lifex_cost.planningSourceUri}endDate> ?WBS_activity_endDate.}
                    OPTIONAL  {<${uri}> <${Lifex_cost.planningSourceUri}durationInDays> ?WBS_activity_durationInDays.}
                    OPTIONAL  {<${uri}> <${Lifex_cost.planningSourceUri}treePath> ?WBS_activity_treePath.}
                    
                    OPTIONAL  {<${uri}> <${Lifex_cost.planningSourceUri}sumManHours> ?WBS_activity_sumManHours.}
                    
                    `;
            var JCvar = "?JobCardExecution";
        }
        async.series(
            [
                //get WBS properties and related JC with properties
                function (callbackSeries) {
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

                    Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: Lifex_cost.currentSource }, function (err, result) {
                        //console.log(result);
                        $("[aria-selected='true']").addClass("nodesInfos-selectedTab");
                        str +=
                            "<tr><td class='NodesInfos_CardId'>Label</td><td>" +
                            label +
                            "&nbsp;<button class='w3-button nodesInfos-iconsButtons ' style='font-size: 10px;margin-left:7px;' onclick=' NodeInfosWidget.copyUri(\"" +
                            label +
                            "\",$(this))'><input type='image' src='./icons/CommonIcons/CopyIcon.png' ></button>";
                        ("</td></tr>");

                        str += "<tr><td>&nbsp;</td><td>&nbsp;</td></tr>";
                        if (!isJobCard) {
                            str += self.generateRawInfosStr("WBS Activity title", result.results.bindings[0]?.WBS_activity_title?.value);
                            str += self.generateRawInfosStr("TreePath", result.results.bindings[0]?.WBS_activity_treePath?.value);

                            str += "</table>";
                            str += "</br><table class='infosTable'>";

                            str += "<thead><tr class='infos_table'>";
                            str += "<th class='detailsCellName' >" + "Start Date" + "</th>";
                            str += "<th class='detailsCellName' >" + "End Date" + "</th>";
                            str += "<th class='detailsCellName' >" + "Duration (days)" + "</th>";
                            str += "<th class='detailsCellName' >" + "ManHours" + "</th>";
                            str += "<th class='detailsCellName' >" + "Average daily hours" + "</th>";
                            str += "<th class='detailsCellName' >" + "Average daily WBS POB" + "</th>";
                            str += "<th class='detailsCellName' >" + "Declared JC max POB" + "</th></thead>";

                            /*var endDate=new Date(result.results.bindings[0].WBS_activity_endDate.value)
                            var startDate=new Date(result.results.bindings[0].WBS_activity_startDate.value)*/
                            var durationDays = result.results.bindings[0]?.WBS_activity_durationInDays?.value;
                            /*var durationDays=(endDate-startDate)/ (1000 * 3600 * 24);
                            durationDays=Math.round(durationDays * 2) / 2*/
                            var avgDailyHours = "";
                            if (manHoursToTransform) {
                                var manHours = DataManager.getManhoursCoeff(result.results.bindings[0]?.WBS_activity_sumManHours?.value).toFixed(2);
                            } else {
                                var manHours = result.results.bindings[0]?.WBS_activity_sumManHours?.value;
                            }
                            var avgDailyHours = manHours / durationDays;
                            var averagePOB = DataManager.getPOBfromManHours(avgDailyHours);
                            var theoricalPOB = result.results.bindings[0].JobCardExecution_maximumPOB != undefined ? result.results.bindings[0].JobCardExecution_maximumPOB.value : "";
                            avgDailyHours = avgDailyHours.toFixed(2);

                            str += "<td class='detailsCellValue'><div class='content'>" + result.results.bindings[0].WBS_activity_startDate.value.split("T")[0] + "</div></td>";
                            str += "<td class='detailsCellValue'><div class='content'>" + result.results.bindings[0].WBS_activity_endDate.value.split("T")[0] + "</div></td>";
                            str += "<td class='detailsCellValue'><div class='content'>" + durationDays + "</div></td>";
                            str += "<td class='detailsCellValue'><div class='content'>" + manHours + "</div></td>";
                            str += "<td class='detailsCellValue'><div class='content'>" + avgDailyHours + "</div></td>";
                            str += "<td class='detailsCellValue'><div class='content'>" + averagePOB + "</div></td>";
                            str += "<td class='detailsCellValue'><div class='content'>" + theoricalPOB + "</div></td>";

                            str += "</table>";
                        }
                        if (!self.linked_JobCard.uri) {
                            self.linked_JobCard.uri = result.results.bindings[0].JobCardExecution.value;
                        }
                        self.linked_JobCard.label = result.results.bindings[0].JobCardExecution_label.value;
                        self.linked_JobCard.title = result.results.bindings[0].JobCardExecution_title.value;
                        self.linked_JobCard.scafoldingVolume =
                            result.results.bindings[0].JobCardExecution_scafoldingVolume != undefined ? result.results.bindings[0].JobCardExecution_scafoldingVolume.value : "";
                        self.linked_JobCard.scafoldingComments =
                            result.results.bindings[0].JobCardExecution_scafoldingComments != undefined ? result.results.bindings[0].JobCardExecution_scafoldingComments.value : "";
                        self.linked_JobCard.description = result.results.bindings[0].JobCardExecution_description.value;
                        self.linked_JobCard.maximumPOB = result.results.bindings[0].JobCardExecution_maximumPOB != undefined ? result.results.bindings[0].JobCardExecution_maximumPOB.value : "";

                        if (result.results.bindings[0]?.WBS_activity_sumManHours?.value) self.TotalOffshoreManHours = manHours;

                        //tasksStr=tasksStr.slice(0, -1);

                        callbackSeries();
                    });
                },

                // Discipline
                function (callbackSeries) {
                    var query = `
                        PREFIX owl: <http://www.w3.org/2002/07/owl#>
                        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
                        PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> Select distinct *   FROM   <${Lifex_cost.lifexUri}>  FROM   <http://rds.posccaesar.org/ontology/lis14/ont/core>  FROM   <${Lifex_cost.planningSourceUri}>  
                        
                        where {
                        <${self.linked_JobCard.uri}> ^<http://rds.posccaesar.org/ontology/lis14/rdl/realizedIn> ?Discipline.
                    
                    
                        ?Discipline  rdf:type <http://data.total/resource/tsf/dalia-lifex1/Discipline>.
                        OPTIONAL  {?Discipline <http://www.w3.org/2000/01/rdf-schema#label> ?Discipline_label.}
                        } 
                    `;
                    Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: Lifex_cost.currentSource }, function (err, result) {
                        str += "<table class='infosTable' style='margin-top:20px;'><tbody><tr><td class='NodesInfos_CardId'>Job Card</td></tr>";
                        str += self.generateRawInfosStr("Discipline", result.results.bindings[0].Discipline_label.value);
                        str += self.generateRawInfosStr("Job Card Label", self.linked_JobCard.label);
                        str += self.generateRawInfosStr("Job Card title", self.linked_JobCard.title);
                        str += self.generateRawInfosStr("Job Card description", self.linked_JobCard.description);
                        str += self.generateRawInfosStr("Job Card Scafolding Volume", self.linked_JobCard.scafoldingVolume);
                        str += self.generateRawInfosStr("Job Card Scafolding Comments", self.linked_JobCard.scafoldingComments);
                        //str+=self.generateRawInfosStr('Maximum POB',self.linked_JobCard.maximumPOB);
                        callbackSeries();
                    });
                },
            ],

            function (err) {
                str += "</tbody><table>";
                str += "</div>";
                $("#nodeInfosWidget_InfosTabDiv").prepend(str);
                if (callback) {
                    callback();
                }

                //$("#nodeInfosWidget_InfosTabDiv").html(str);
            }
        );
    };

    self.DocumentTabDiv = function (uri, callback) {
        var str = "<div class='NodesInfos_tableDiv'style='display:inline-grid;width:" + 3 * self.widthWBSTable + "px;overflow:unset;'>" + "<table class='infosTable'>";

        str += "<thead><tr class='infos_table'>";
        str += "<th class='detailsCellName' style='width:20px;'>" + "Document" + "</th>";
        str += "<th class='detailsCellName'>" + "Document title" + "</th></thead>";
        async.series(
            [
                //get WBS properties and related JC with properties
                function (callbackSeries) {
                    var query = `
                        PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> 
                        Select distinct *   FROM   <${Lifex_cost.lifexUri}>  FROM   <http://rds.posccaesar.org/ontology/lis14/ont/core>  FROM   <${Lifex_cost.planningSourceUri}>  where 
                        
                        {<${self.linked_JobCard.uri}> ^<http://rds.posccaesar.org/ontology/lis14/rdl/isAbout> ?JC_Document.

                      <${self.linked_JobCard.uri}>  rdf:type <http://data.total/resource/tsf/dalia-lifex1/JobCardExecution>.   ?JC_Document rdf:type <http://data.total/resource/tsf/dalia-lifex1/JC_Document>.

                    OPTIONAL  {?JC_Document <http://www.w3.org/2000/01/rdf-schema#label> ?JC_Document_label.}
                    }  
                    `;

                    Sparql_proxy.querySPARQL_GET_proxy(self.url, query, "", { source: Lifex_cost.currentSource }, function (err, result) {
                        var tasksStr = "";
                        result.results.bindings.forEach((row, index) => {
                            var style = "";
                            var docUri = row.JC_Document.value;
                            var docLabel = docUri.split("/")[docUri.split("/").length - 1];
                            var docUrl = "https://europe.newprodom.totalenergies.com/dcs-documents-details?Domain=40008&DocID=" + docLabel;
                            str += "<tr class='infos_table'>";
                            str += "<td class='detailsCellValue' style='width:20px;'><a target='_blank' href='" + docUrl + "'>" + docLabel + "</a></td>";
                            str += "<td class='detailsCellValue'><div class='content'>" + row.JC_Document_label.value + "</div></td>";
                            str += "</tr>";
                        });
                        //tasksStr=tasksStr.slice(0, -1);

                        callbackSeries();
                    });
                },

                function (callbackSeries) {
                    callbackSeries();
                },
            ],

            function (err) {
                str += "</tbody><table>";
                str += "</div>";
                $("#nodeInfosWidget_ObjectDiv").html(str);
                if (callback) {
                    callback();
                }

                //$("#nodeInfosWidget_InfosTabDiv").html(str);
            }
        );
    };
    self.ManningTabDiv = function (uri, callback) {
        var str = "<div class='NodesInfos_tableDiv'style='display:inline-grid;width:" + 3 * self.widthWBSTable + "px;overflow:unset;'>" + "<table class='infosTable'>";

        str += "<thead><tr class='infos_table'>";
        str += "<th class='detailsCellName' style='width:20px;'>" + "Construction Discipline" + "</th>";
        str += "<th class='detailsCellName' style='width:20px;'>" + "Offshore Manhour" + "</th>";
        str += "<th class='detailsCellName' style='width:20px;'>" + "Offshore POB" + "</th>";
        str += "<th class='detailsCellName'>" + "Onshore ManHours" + "</th></thead>";
        async.series(
            [
                //get WBS properties and related JC with properties
                function (callbackSeries) {
                    var query = `
                        PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> 
                        Select distinct *   FROM   <${Lifex_cost.lifexUri}>  FROM   <http://rds.posccaesar.org/ontology/lis14/ont/core>  FROM   <${Lifex_cost.planningSourceUri}>  where 
                        
                        {<${self.linked_JobCard.uri}> ^<http://rds.posccaesar.org/ontology/lis14/rdl/activeParticipantIn> ?manning.


                      <${self.linked_JobCard.uri}>  rdf:type <http://data.total/resource/tsf/dalia-lifex1/JobCardExecution>.   ?manning  rdf:type <http://data.total/resource/tsf/dalia-lifex1/manning>.

                    
                    OPTIONAL  {?manning <http://data.total/resource/tsf/dalia-lifex1/OffshorePOB> ?manning_OffshorePOB.}
                    OPTIONAL  {?manning <http://data.total/resource/tsf/dalia-lifex1/OffshoreManhour> ?manning_OffshoreManhour.}
                    OPTIONAL  {?manning <http://data.total/resource/tsf/dalia-lifex1/OnshoreManhour> ?manning_OnshoreManhour.}
                    OPTIONAL  {?manning <http://data.total/resource/tsf/dalia-lifex1/constructionDiscipline> ?manning_constructionDiscipline.}
                    }  
                    `;

                    Sparql_proxy.querySPARQL_GET_proxy(self.url, query, "", { source: Lifex_cost.currentSource }, function (err, result) {
                        var tasksStr = "";
                        result.results.bindings.forEach((row, index) => {
                            var style = "";

                            str += "<tr class='infos_table'>";
                            str += "<td class='detailsCellValue' style='width:20px;'>" + row.manning_constructionDiscipline.value;
                            +"</td>";
                            if (row.manning_OffshoreManhour) {
                                str += "<td class='detailsCellValue' style='width:20px;'>" + row.manning_OffshoreManhour.value;
                                +"</td>";
                            } else {
                                str += "<td class='detailsCellValue' style='width:20px;'>" + "";
                                +"</td>";
                            }
                            if (row.manning_OffshorePOB) {
                                str += "<td class='detailsCellValue' style='width:20px;'>" + row.manning_OffshorePOB.value;
                                +"</td>";
                            } else {
                                str += "<td class='detailsCellValue' style='width:20px;'>" + "";
                                +"</td>";
                            }
                            if (row.manning_OnshoreManhour) {
                                str += "<td class='detailsCellValue' style='width:20px;'>" + row.manning_OnshoreManhour.value;
                                +"</td>";
                            } else {
                                str += "<td class='detailsCellValue' style='width:20px;'>" + "";
                                +"</td>";
                            }

                            str += "</tr>";
                        });

                        callbackSeries();
                    });
                },

                function (callbackSeries) {
                    callbackSeries();
                },
            ],

            function (err) {
                str += "</tbody><table>";
                str += "</div>";
                $("#nodeInfosWidget_ObjectDiv").html(str);
                if (callback) {
                    callback();
                }

                //$("#nodeInfosWidget_InfosTabDiv").html(str);
            }
        );
    };
    self.TaskRessourceTabDiv = function (uri, callback) {
        var str = "<div class='NodesInfos_tableDiv'style='display:inline-grid;width:" + 3 * self.widthWBSTable + "px;overflow:unset;'>" + "<table class='infosTable'>";

        str += "<thead><tr class='infos_table'>";
        str += "<th class='detailsCellName' style='width:20px;'>" + "Ressource Name" + "</th>";
        str += "<th class='detailsCellName' style='width:20px;'>" + "ManHours" + "</th>";
        str += "<th class='detailsCellName' style='width:20px;'>" + "Daily manHours" + "</th>";
        str += "<th class='detailsCellName' style='width:20px;'>" + "daily POB" + "</th>";
        /*str +=
        "<th class='detailsCellName' style='width:20px;'>" +
        'Remain Quantity Per Hour'+
        "</th></thead>";*/
        async.series(
            [
                //get WBS properties and related JC with properties
                function (callbackSeries) {
                    var manHoursToTransform = false;
                    var yAxisVal = $("#Lifex_cost_quantityVarSelect").val();
                    if (yAxisVal.indexOf("1.") > -1) {
                        manHoursToTransform = true;
                    }
                    var query = `
                        PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> 
                        Select distinct *   FROM   <${Lifex_cost.lifexUri}>  FROM   <http://rds.posccaesar.org/ontology/lis14/ont/core>  FROM   <${Lifex_cost.planningSourceUri}>  where 
                        { ?TaskResource <http://rds.posccaesar.org/ontology/lis14/rdl/hasActiveParticipant>  <${uri}> .
                        OPTIONAL  {<${uri}> <${Lifex_cost.planningSourceUri}durationInDays> ?WBS_activity_durationInDays.}
                        OPTIONAL  {?TaskResource <${Lifex_cost.planningSourceUri}ressourceName> ?TaskResource_ressourceName.}
                        OPTIONAL  {?TaskResource <${Lifex_cost.planningSourceUri}manHours> ?TaskResource_manHours.}
                        
                      
                    }  ORDER BY DESC(?TaskResource_manHours)
                    `;

                    Sparql_proxy.querySPARQL_GET_proxy(self.url, query, "", { source: Lifex_cost.currentSource }, function (err, result) {
                        var tasksStr = "";
                        result.results.bindings.forEach((row, index) => {
                            var style = "";

                            str += "<tr class='infos_table'>";
                            if (row.TaskResource_ressourceName) {
                                str += "<td class='detailsCellValue' style='width:20px;'>" + row.TaskResource_ressourceName.value;
                                +"</td>";
                            } else {
                                str += "<td class='detailsCellValue' style='width:20px;'>" + "";
                                +"</td>";
                            }

                            if (row.TaskResource_manHours) {
                                if (manHoursToTransform) {
                                    var manHours = DataManager.getManhoursCoeff(row.TaskResource_manHours.value).toFixed(2);
                                } else {
                                    var manHours = row.TaskResource_manHours.value;
                                }

                                str += "<td class='detailsCellValue' style='width:20px;'>" + parseFloat(manHours).toFixed(2);
                                +"</td>";

                                if (self.TotalOffshoreManHours) {
                                    var resourceDailyManHours = parseFloat(manHours / row.WBS_activity_durationInDays.value).toFixed(2);
                                    str += "<td class='detailsCellValue' style='width:20px;'>" + resourceDailyManHours + "</td>";

                                    str += "<td class='detailsCellValue' style='width:20px;'>" + DataManager.getPOBfromManHours(resourceDailyManHours);
                                    +"</td>";
                                }
                            } else {
                                str += "<td class='detailsCellValue' style='width:20px;'>" + "";
                                +"</td>";
                            }

                            /*
                            if(row.TaskResource_remainQuantityPerHour){
                                str += "<td class='detailsCellValue' style='width:20px;'>" +
                                parseFloat(row.TaskResource_remainQuantityPerHour.value).toFixed(2);
                                +"</td>";
                            }
                            else{
                                str+="<td class='detailsCellValue' style='width:20px;'>" +
                                '';
                                +"</td>";
                            }
                                */

                            str += "</tr>";
                        });
                        //tasksStr=tasksStr.slice(0, -1);

                        callbackSeries();
                    });
                },

                function (callbackSeries) {
                    callbackSeries();
                },
            ],

            function (err) {
                str += "</tbody><table>";
                str += "</div>";
                $("#nodeInfosWidget_ObjectDiv").html(str);
                if (callback) {
                    callback();
                }

                //$("#nodeInfosWidget_InfosTabDiv").html(str);
            }
        );
    };
    self.showNodeInfos = function (uri) {
        //Test:    CustomNodeInfos.showNodeInfos('http://data.total/resource/tsf/dalia-lifex1/CNT-DAL-PVV-001422')

        self.nodeInfosRelatedTags = {};
        var dialog = "mainDialogDiv";
        $("#" + dialog).dialog("open");
        var label = uri.split("/")[uri.split("/").length - 1];
        $("#" + dialog).dialog("option", "title", "Infos : " + label);
        $(".nodeInfosWidget_tabDiv").css("margin", "0px");
        $("#" + dialog)
            .parent()
            .css("z-index", 15);
        self.widthWBSTable = ($(window).width() * 0.9) / 5;
        $("#" + dialog).load("/plugins/Lifex_cost/html/CustomNodeInfos.html", function () {
            $("#nodeInfosWidget_ObjectTabDiv").tabs({
                //  active: options.showAxioms ? 1 : 0,

                load: function (event, ui) {},
                activate: function (event, ui) {
                    $(".nodeInfosWidget_tabDiv").removeClass("nodesInfos-selectedTab");

                    setTimeout(function () {
                        $("[aria-selected='true']").addClass("nodesInfos-selectedTab");
                        if ($(ui.newTab).text() == "Infos") {
                            self.WBSJobCardTabDiv(uri);
                        }
                        if ($(ui.newTab).text() == "Tags") {
                            self.TagsTabDiv();
                        }
                        if ($(ui.newTab).text() == "Tasks") {
                            self.TasksTabDiv();
                        }
                        if ($(ui.newTab).text() == "Equipement") {
                            self.TagsTabDiv(true);
                        }
                        if ($(ui.newTab).text() == "Document") {
                            self.DocumentTabDiv();
                        }
                        if ($(ui.newTab).text() == "Manning") {
                            self.ManningTabDiv();
                        }
                        if ($(ui.newTab).text() == "Task Ressources") {
                            self.TaskRessourceTabDiv(uri);
                        }
                        if ($(ui.newTab).text() == "Task Ressources") {
                            self.TaskRessourceTabDiv(uri);
                        }
                    }, 100);
                },
            });

            self.WBSJobCardTabDiv(uri, function () {
                self.TagsTabDiv();
            });
        });
    };

    return self;
})();

export default CustomNodeInfos;
window.CustomNodeInfos = CustomNodeInfos;
