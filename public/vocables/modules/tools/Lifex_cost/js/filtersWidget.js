import DataManager from "./dataManager.js";
import GroupsController from "./groupsController.js";
import Time2dChart from "./time2dChart.js";
import time2dChart from "./time2dChart.js";

var FiltersWidget = (function () {
    var self = {};
    self.jstreeDiv = "Lifex_cost_jstreeFilterDiv";
    self.idsMap = {};

    self.loadTree = function (source) {
        self.currentSource = source;

        var options = {
            openAll: false,
            withCheckboxes: true,
            keep_selected_style: false,

            contextMenu: FiltersWidget.getContextJstreeMenu(),
            selectTreeNodeFn: FiltersWidget.onSelectedNodeTreeclick,
        };

        var jstreeData = [
            {
                id: "Activity",
                text: "Activity",
                parent: "#",
                data: {
                    id: "Activity",
                    label: "Activity",
                },
            },
            {
                id: "FLOC",
                text: "Functional Location",
                parent: "#",
                data: {
                    id: "FLOC",
                    label: "Functional Location",
                },
            },

            {
                id: "Discipline",
                text: "Discipline",
                parent: "#",
                data: {
                    id: "Discipline",
                    label: "Discipline",
                },
            },
            {
                id: "Keyword",
                text: "Keyword",
                parent: "#",
                data: {
                    id: "Keyword",
                    label: "Keyword",
                },
            },
            {
                id: "System",
                text: "System",
                parent: "#",
                data: {
                    id: "System",
                    label: "System",
                },
            },
            {
                id: "Unit",
                text: "Unit",
                parent: "#",
                data: {
                    id: "Unit",
                    label: "Unit",
                },
            },
            {
                id: "Sector",
                text: "Sector",
                parent: "#",
                data: {
                    id: "Sector",
                    label: "Sector",
                },
            },
            {
                id: "withoutJCNeededPost2029",
                text: "withoutJCNeededPost2029",
                parent: "#",
                data: {
                    id: "withoutJCNeededPost2029",
                    label: "withoutJCNeededPost2029",
                },
            },
        ];

        JstreeWidget.loadJsTree(self.jstreeDiv, jstreeData, options, function (err) {
            var topNodes = JstreeWidget.getNodeDescendants(FiltersWidget.jstreeDiv, "#");

            topNodes = [
                { id: "Activity", text: "Activity" },
                { id: "Discipline", text: "Discipline" },
                //  {id:"FLOC",text:"Functional Location"},
                { id: "Task Keyword", text: "Task Keyword" },
                { id: "System", text: "System" },
                { id: "Unit", text: "Unit" },
                { id: "Sector", text: "Sector" },
            ];

            common.fillSelectOptions("Lifex_cost_SplitBySelect", topNodes, false, "text", "id");
            $("#" + self.jstreeDiv)
                .jstree()
                .check_node("withoutJCNeededPost2029");
            $("#" + self.jstreeDiv).on("hover_node.jstree", function (e, data) {
                return;
                var node = $("#" + data.node.id);
                if (node.length > 0) {
                    var htmlNode = node[0];
                } else {
                    return;
                }
                var jstreeNode = $("#" + self.jstreeDiv)
                    .jstree()
                    .get_node(htmlNode);
                if (jstreeNode.parents.includes("FLOC")) {
                    var query = `PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> Select distinct *   FROM   <http://data.total/resource/tsf/dalia-lifex1/>  FROM   <http://rds.posccaesar.org/ontology/lis14/ont/core>  FROM   <http://data.total/resource/tsf/PRIMAVERA_DORIS_04_07_2024/>  where {
                    ?functionalLocation <http://www.w3.org/2000/01/rdf-schema#label> "${jstreeNode.data.label}".
                    ?functionalLocation <http://purl.org/dc/terms/title> ?functionalLocation_title.
                    ?functionalLocation rdf:type <http://data.total/resource/tsf/dalia-lifex1/FunctionalLocation>
                    } `;
                    var url = Config.sources[Lifex_cost.currentSource].sparql_server.url + "?format=json&query=";
                    Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: Lifex_cost.currentSource }, function (err, result) {
                        if (result.results.bindings.length > 0) {
                            var html = "<div>" + result.results.bindings[0].functionalLocation_title.value + "</div>";
                            var htmlNodearea = htmlNode.children[1];
                            PopupMenuWidget.initAndShow(html, "popupMenuWidgetDiv", { Button: htmlNodearea });
                        } else {
                            return;
                        }
                    });
                } else {
                    return;
                }
            });
        });

        // Containers_tree.search("Lifex_cost_jstreeFilterDiv", source, options);
    };

    self.sortJstreeData = function (data, options) {
        if (options?.inverse) {
            data.sort(function (a, b) {
                if (a.text > b.text) {
                    return 1;
                }
                if (a.text < b.text) {
                    return -1;
                }
                return 0;
            });
        } else {
            data.sort(function (a, b) {
                if (a.text < b.text) {
                    return 1;
                }
                if (a.text > b.text) {
                    return -1;
                }
                return 0;
            });
        }
    };

    self.onSelectedNodeTreeclick = function (event, obj, callback) {
        self.currentNode = obj.node;
        var jstreeData = [];
        var sparql_url = Config.sources[Lifex_cost.currentSource].sparql_server.url;
        if ((sparql_url = "_default")) {
            sparql_url = Config.sparql_server.url;
        }

        if (obj.node.parent != "#") {
            $("#" + self.jstreeDiv)
                .jstree()
                .check_node(obj.node.id);
        }

        var url = sparql_url + "?format=json&query=";
        if (self.currentNode.id == "Activity") {
            for (var phase in GroupsController.phaseLabelsMap) {
                jstreeData.push({
                    id: phase,
                    text: GroupsController.phaseLabelsMap[phase].label,
                    parent: self.currentNode.id,
                });
            }
            self.sortJstreeData(jstreeData, { inverse: true });

            JstreeWidget.addNodesToJstree(self.jstreeDiv, self.currentNode.id, jstreeData, null, function () {
                // $("#" + self.jstreeDiv) .jstree() .check_node(self.currentNode.id);
                if (callback) {
                    return callback();
                }
            });
        } else if (self.currentNode.id == "FLOC" || self?.currentNode?.parents?.indexOf("FLOC") > -1) {
            var options = {
                filter: " ?mem",
            };

            var containerId;
            if (self.currentNode.id == "FLOC") {
                containerId = "http://data.total/resource/tsf/dalia-lifex1/FL-DAL";
            } else {
                containerId = self.currentNode.data.id;
            }

            Containers_query.getContainerDescendants(self.currentSource, containerId, {}, function (err, result) {
                if (err) {
                    return alert(err.responsetext);
                }

                var jstreeData = [];

                var existingNodes = {};
                result.results.bindings.forEach(function (item) {
                    var id = item.descendant.value;
                    var label = item.descendantLabel ? item.descendantLabel.value : Sparql_common.getLabelFromURI(item.descendant.value);
                    var jstreeId = "_" + common.getRandomHexaId(5);

                    var parent = self.idsMap[item.descendantParent.value] || self.currentNode.id;

                    if (!self.idsMap[id]) {
                        self.idsMap[id] = jstreeId;
                    }

                    if (!existingNodes[jstreeId]) {
                        existingNodes[jstreeId] = 1;
                    }
                    var node = {
                        id: self.idsMap[id],
                        text: label,
                        parent: parent,
                        type: "Container",
                        data: {
                            type: "Container",
                            source: self.currentSource,
                            id: id,
                            label: label,
                            parent: parent,
                            data: {
                                id: self.idsMap[id],
                                label: label,
                            },
                            //tabId: options.tabId,
                        },
                    };
                    jstreeData.push(node);
                });

                JstreeWidget.addNodesToJstree(self.jstreeDiv, self.currentNode.id, jstreeData, null, function () {
                    //  $("#" + self.jstreeDiv).jstree().check_node(self.currentNode.id);
                    if (callback) {
                        return callback();
                    }
                });
            });
        } else if (self.currentNode.id == "Discipline") {
            var jstreeData = [];
            Sparql_OWL.getDistinctClassLabels(self.currentSource, ["http://data.total/resource/tsf/dalia-lifex1/Discipline"], {}, function (err, result) {
                if (err) {
                    return alert(err);
                }
                result.forEach(function (item) {
                    jstreeData.push({
                        id: item.id.value,
                        text: item.label.value,
                        parent: self.currentNode.id,
                        data: {
                            id: item.id.value,
                            label: item.label.value,
                        },
                    });
                });
                self.sortJstreeData(jstreeData);

                JstreeWidget.addNodesToJstree(self.jstreeDiv, self.currentNode.id, jstreeData, null, function () {
                    //   $("#" + self.jstreeDiv) .jstree() .check_node(self.currentNode.id);
                    if (callback) {
                        return callback();
                    }
                });
            });
        } else if (self.currentNode.id == "Keyword") {
            var jstreeData = [
                {
                    id: "FLOCKeyword",
                    text: "Functional Location Keyword",
                    parent: self.currentNode.id,
                    data: {
                        id: "FLOC",
                        label: "Functional Location Keyword",
                    },
                },

                {
                    id: "TaskKeyword",
                    text: "Task Keyword",
                    parent: self.currentNode.id,
                    data: {
                        id: "TaskKeyword",
                        label: "TaskKeyword",
                    },
                },
                {
                    id: "JobCard",
                    text: "Job Card keyword",
                    parent: self.currentNode.id,
                    data: {
                        id: "JobCard",
                        label: "Job Card keyword",
                    },
                },
                {
                    id: "Tag",
                    text: "Tag keyword",
                    parent: self.currentNode.id,
                    data: {
                        id: "Tag",
                        label: "Tag keyword",
                    },
                },
            ];
            JstreeWidget.addNodesToJstree(self.jstreeDiv, self.currentNode.id, jstreeData, null, function () {
                $("#" + self.jstreeDiv)
                    .jstree()
                    .check_node(self.currentNode.text + "_" + keyword);
                if (callback) {
                    return callback();
                }
            });
        } else if (self.currentNode.id == "TaskKeyword") {
            var keyword = prompt("enter keyword");
            if (!keyword) {
                return;
            }
            var jstreeData = [
                {
                    id: self.currentNode.text + "_" + keyword,
                    text: keyword,
                    parent: self.currentNode.id,
                    data: {
                        id: self.currentNode.text + "_" + keyword,
                        label: keyword,
                    },
                },
            ];
            JstreeWidget.addNodesToJstree(self.jstreeDiv, self.currentNode.id, jstreeData, null, function () {
                $("#" + self.jstreeDiv)
                    .jstree()
                    .check_node(self.currentNode.text + "_" + keyword);
                if (callback) {
                    return callback();
                }
            });
        } else if (self.currentNode.id == "JobCard") {
            var keyword = prompt("enter a string contained on JobCard label ");
            if (!keyword) {
                return;
            }
            var jstreeData = [
                {
                    id: self.currentNode.text + "_" + keyword,
                    text: keyword,
                    parent: self.currentNode.id,
                    data: {
                        id: keyword,
                        label: keyword,
                    },
                },
            ];
            if (
                $("#" + self.jstreeDiv)
                    .jstree()
                    .get_node("JobCard").children_d.length > 0
            ) {
                var descendants = $("#" + self.jstreeDiv)
                    .jstree()
                    .get_node("JobCard").children_d;
                $("#" + self.jstreeDiv)
                    .jstree()
                    .uncheck_node(descendants);
            }
            JstreeWidget.addNodesToJstree(self.jstreeDiv, self.currentNode.id, jstreeData, null, function () {
                $("#" + self.jstreeDiv)
                    .jstree()
                    .check_node(self.currentNode.text + "_" + keyword);
                if (callback) {
                    return callback();
                }
            });
        } else if (self.currentNode.id == "Tag") {
            var keyword = prompt("enter a string contained on Tag label ");
            if (!keyword) {
                return;
            }
            var jstreeData = [
                {
                    id: self.currentNode.text + "_" + keyword,
                    text: keyword,
                    parent: self.currentNode.id,
                    data: {
                        id: self.currentNode.text + "_" + keyword,
                        label: keyword,
                    },
                },
            ];
            if (
                $("#" + self.jstreeDiv)
                    .jstree()
                    .get_node("Tag").children_d.length > 0
            ) {
                var descendants = $("#" + self.jstreeDiv)
                    .jstree()
                    .get_node("Tag").children_d;
                $("#" + self.jstreeDiv)
                    .jstree()
                    .uncheck_node(descendants);
            }
            JstreeWidget.addNodesToJstree(self.jstreeDiv, self.currentNode.id, jstreeData, null, function () {
                $("#" + self.jstreeDiv)
                    .jstree()
                    .check_node(self.currentNode.text + "_" + keyword);
                if (callback) {
                    return callback();
                }
            });
        } else if (self.currentNode.id == "FLOCKeyword") {
            var jstreeData = [
                {
                    id: "FLOCKeyword_site",
                    text: "site",
                    parent: self.currentNode.id,
                    data: {
                        id: "FLOCKeyword_site",
                        label: "site",
                    },
                },
                {
                    id: "FLOCKeyword_sector",
                    text: "sector",
                    parent: self.currentNode.id,
                    data: {
                        id: "FLOCKeyword_sector",
                        label: "sector",
                    },
                },
                {
                    id: "FLOCKeyword_system",
                    text: "system",
                    parent: self.currentNode.id,
                    data: {
                        id: "FLOCKeyword_system",
                        label: "system",
                    },
                },
                {
                    id: "FLOCKeyword_unit",
                    text: "unit",
                    parent: self.currentNode.id,
                    data: {
                        id: "FLOCKeyword_unit",
                        label: "unit",
                    },
                },
                {
                    id: "FLOCKeyword_package",
                    text: "package",
                    parent: self.currentNode.id,
                    data: {
                        id: "FLOCKeyword_package",
                        label: "package",
                    },
                },
            ];
            JstreeWidget.addNodesToJstree(self.jstreeDiv, self.currentNode.id, jstreeData, null, function () {
                //$("#" + self.jstreeDiv).jstree().check_node(self.currentNode.text+'_'+keyword);
                if (callback) {
                    return callback();
                }
            });
        } else if (self.currentNode.id.includes("FLOCKeyword_")) {
            var keyword = prompt("enter a keyword");
            if (!keyword) {
                return;
            }
            var jstreeData = [
                {
                    id: self.currentNode.text + "_" + keyword,
                    text: keyword,
                    parent: self.currentNode.id,
                    data: {
                        id: self.currentNode.text + "_" + keyword,
                        label: keyword,
                    },
                },
            ];
            if (
                $("#" + self.jstreeDiv)
                    .jstree()
                    .get_node(self.currentNode.id).children_d.length > 0
            ) {
                var descendants = $("#" + self.jstreeDiv)
                    .jstree()
                    .get_node(self.currentNode.id).children_d;
                descendants.forEach(function (node) {
                    $("#" + self.jstreeDiv)
                        .jstree()
                        .delete_node(node);
                });
                //$("#" + self.jstreeDiv).jstree().uncheck_node(descendants);
            }
            JstreeWidget.addNodesToJstree(self.jstreeDiv, self.currentNode.id, jstreeData, null, function () {
                $("#" + self.jstreeDiv)
                    .jstree()
                    .check_node(self.currentNode.id);
                $("#" + self.jstreeDiv)
                    .jstree()
                    .check_node(self.currentNode.text + "_" + keyword);
                if (callback) {
                    return callback();
                }
            });
        } else if (self.currentNode.id == "Resource") {
            var query = `PREFIX owl: <http://www.w3.org/2002/07/owl#>
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> 
            Select distinct ?TaskResource_ressourceName   FROM   <http://data.total/resource/tsf/PRIMAVERA_REZA_17_07_2024/>  FROM   <http://rds.posccaesar.org/ontology/lis14/ont/core/3.0>  where {
            
            ?TaskResource  rdf:type <http://data.total/resource/tsf/PRIMAVERA_REZA_17_07_2024/TaskResource>.  
            ?TaskResource <http://data.total/resource/tsf/PRIMAVERA_REZA_17_07_2024/ressourceName> ?TaskResource_ressourceName.
            FILTER(!STRENDS(?TaskResource_ressourceName,'MH')).
            
           }  limit 10000`;
            var url = Config.sources[Lifex_cost.currentSource].sparql_server.url + "?format=json&query=";
            var jstreeData = [];
            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", null, function (err, result) {
                result.results.bindings.forEach(function (item) {
                    var resource = item.TaskResource_ressourceName.value;
                    resource = resource.split("_")[1];
                    jstreeData.push({
                        id: resource,
                        text: resource,
                        parent: "Resource",
                        data: {
                            id: resource,
                            label: resource,
                        },
                    });
                });
                JstreeWidget.addNodesToJstree(DataManager.jstreeDiv, "Resource", jstreeData, null, function () {
                    if (callback) {
                        return callback();
                    }
                });
            });
        } else if (["System", "Unit", "Sector"].indexOf(self.currentNode.id) > -1) {
            var jstreeData = [];
            var propsMap = {
                System: "http://data.total/resource/tsf/dalia-lifex1/systemName",
                Unit: "http://data.total/resource/tsf/dalia-lifex1/unitName",
                Sector: "http://data.total/resource/tsf/dalia-lifex1/sectorName",
            };

            Sparql_OWL.getDataTypePropertyValues(self.currentSource, propsMap[self.currentNode.id], function (err, result) {
                if (err) {
                    return alert(err);
                }
                result.forEach(function (item) {
                    jstreeData.push({
                        id: item.o.value,
                        text: item.o.value,
                        parent: self.currentNode.id,
                        data: {
                            id: item.o.value,
                            label: item.o.value,
                        },
                    });
                });
                self.sortJstreeData(jstreeData);
                JstreeWidget.addNodesToJstree(self.jstreeDiv, self.currentNode.id, jstreeData, null, function () {
                    //   $("#" + self.jstreeDiv) .jstree() .check_node(self.currentNode.id);
                    if (callback) {
                        return callback();
                    }
                });
            });
        } else {
        }

        /* if (callback) {
             return callback();
         }*/
    };

    self.getContextJstreeMenu = function () {
        var items = {};
        items["Group by"] = {
            label: "Group by",
            action: function (_e) {
                var node = $("#" + self.jstreeDiv)
                    .jstree()
                    .get_node($(_e.reference[0]).attr("id").replace("_anchor", ""));
                self.currentNode = node;
                var nodeParents = self?.currentNode?.parents;
                if (nodeParents.length > 1) {
                    var topNodeId = self.currentNode.parents[self.currentNode.parents.length - 2];
                } else {
                    var topNodeId = self.currentNode.id;
                }

                var topNode = $("#" + self.jstreeDiv)
                    .jstree()
                    .get_node(topNodeId);

                if (topNodeId != "TaskKeyword") {
                    self.onSelectedNodeTreeclick(null, { node: topNode }, function () {
                        self.draw2dChart(topNode.text);
                    });
                } else {
                    self.draw2dChart(topNode.text);
                }
            },
        };

        return items;
    };

    self.openTopNode = function (topNodeId, callback) {
        var topNode = $("#" + self.jstreeDiv)
            .jstree()
            .get_node(topNodeId);
        if (topNode?.children?.length == 0) {
            self.onSelectedNodeTreeclick(null, { node: topNode }, function () {
                if (callback) {
                    callback();
                }
            });
        }
    };

    self.getQueryFiltersFromUI = function (groupByKey, filter, callback) {
        if (!groupByKey) {
            // groupByKey="Activity"
            groupByKey = $("#Lifex_cost_SplitBySelect").val();
        }
        if (groupByKey == "Task Keyword") {
            var children = $("#" + self.jstreeDiv)
                .jstree()
                .get_node("TaskKeyword").children;
            if (children.length == 0) {
                return alert("no Task Keyword selected");
            }
        }
        self.openTopNode(groupByKey);
        Lifex_cost.groupByKey = groupByKey;
        var checkdNodes = JstreeWidget.getjsTreeCheckedNodes(self.jstreeDiv);
        var ids = [];

        var types = {};
        var filterText = "";
        var subQueries = [];

        checkdNodes.forEach(function (item) {
            if (!item) {
                return;
            }
            if (item.id == "withoutJCNeededPost2029") {
                var type = "withoutJCNeededPost2029";
                types[type] = { ids: [], labels: [] };
                types[type].ids.push(item.id);
                types[type].labels.push(item.text);
            }
            if (item.parent == "#") {
                return;
            }
            if (item.parents.includes("Keyword")) {
                item.parents.splice(item.parents.indexOf("Keyword"), 1);
            }
            var type = item.parents[item.parents.length - 2];

            if (!types[type]) {
                types[type] = { ids: [], labels: [] };
            }

            types[type].ids.push(item.id);
            types[type].labels.push(item.text);

            //  ids.push(item.id)
        });

        if (!filter) {
            filter = "";
        }
        if (types[undefined]) {
            delete types[undefined];
        }

        for (var type in types) {
            var subquery = "";
            if (type != "withoutJCNeededPost2029") {
                filterText += "&nbsp;<span class='chartTitle_filterType'>" + type + " : </span>";
            }
            if (type == "FLOC") {
                var higherLevelLength = types[type].labels[0].split("/").length;
            }
            types[type].labels.forEach(function (label) {
                if (type == "FLOC") {
                    if (label.split("/").length == higherLevelLength) {
                        filterText += "&nbsp;<span class='chartTitle_filterItem'>" + label + "</span>";
                    }
                } else if (type == "withoutJCNeededPost2029") {
                } else {
                    filterText += "&nbsp;<span class='chartTitle_filterItem'>" + label + "</span>";
                }
            });

            if (type == "Discipline") {
                filter += Sparql_common.setFilter("Discipline", types[type].ids);
                filter += ".";
            } else if (type == "Activity") {
                var phasesFilterStrList = [];
                //WBS activity like COM can be contained in other Label like PRCOM ,we search only Label that starting with COM
                types[type].ids.forEach(function (phase) {
                    phasesFilterStrList.push("^" + phase);
                });
                filter += Sparql_common.setFilter("WBS_activity", null, phasesFilterStrList).replace("WBS_activityLabel", "WBS_activity_label");
            } else if (type == "FLOC") {
                subquery =
                    " ?JobCardExecution <http://rds.posccaesar.org/ontology/lis14/rdl/hasPassiveParticipant>/\n" +
                    "<http://rds.posccaesar.org/ontology/lis14/rdl/residesIn> ?functionalLocation." +
                    " ?functionalLocation  rdf:type <http://data.total/resource/tsf/dalia-lifex1/FunctionalLocation>." +
                    "   ?functionalLocation <http://www.w3.org/2000/01/rdf-schema#label> ?functionalLocationLabel. ";

                subquery += Sparql_common.setFilter("functionalLocation", null, types[type].labels);
                subquery += ".";
                subQueries.push(subquery);
            } else if (type == "FLOCKeyword") {
                subquery =
                    "?JobCardExecution <http://rds.posccaesar.org/ontology/lis14/rdl/hasPassiveParticipant>/<http://rds.posccaesar.org/ontology/lis14/rdl/residesIn> ?functionalLocation.\n" +
                    "?functionalLocation  rdf:type <http://data.total/resource/tsf/dalia-lifex1/FunctionalLocation>." +
                    "?functionalLocation <http://www.w3.org/2000/01/rdf-schema#label> ?functionalLocationLabel.";

                for (let i = 0; i < types[type].ids.length; i++) {
                    var node_id = types[type].ids[i];

                    if (!node_id.includes("FLOCKeyword")) {
                        var prop_id = types[type].ids[i - 1];
                        var prop_text = types[type].labels[i - 1];
                        types[prop_text.charAt(0).toUpperCase() + prop_text.slice(1)] = true;
                        subquery += `OPTIONAL{ ?functionalLocation <http://data.total/resource/tsf/dalia-lifex1/${prop_text}Name> ?functionalLocation_${prop_text} }.`;
                        subquery += `FILTER(regex( ?functionalLocation_${prop_text},"${types[type].labels[i]}","i")).`;
                    }
                }

                subQueries.push(subquery);
            } else if (type == "TaskKeyword") {
                subquery =
                    "?JobCardExecution ^<http://rds.posccaesar.org/ontology/lis14/rdl/activityPartOf> ?Task. " +
                    "?Task  rdf:type <http://data.total/resource/tsf/dalia-lifex1/Task>. " +
                    "?Task <http://www.w3.org/2000/01/rdf-schema#label> ?TaskLabel. ";
                subquery += Sparql_common.setFilter("Task", null, types[type].labels);
                subquery += ".";
                subQueries.push(subquery);
            } else if (type == "JobCard") {
                filter += Sparql_common.setFilter("JobCardExecution_label", null, types[type].labels, { useFilterKeyWord: 1 });
                filter += ".";
                filter = filter.replace("Label", "");
            } else if (type == "Tag") {
                subquery =
                    " ?JobCardExecution <http://rds.posccaesar.org/ontology/lis14/rdl/hasPassiveParticipant> ?tag.\n" +
                    "?tag <http://www.w3.org/2000/01/rdf-schema#label> ?tagLabel." +
                    "?tag <http://www.w3.org/2000/01/rdf-schema#label> ?tagLabel." +
                    "OPTIONAL  {?tag <http://purl.org/dc/terms/title> ?tag_title.}";
                //filter += Sparql_common.setFilter("tag",null ,types[type].ids, { useFilterKeyWord: 1 });
                var joinedTagKeywords = types[type].labels.join("|");
                subquery += 'FILTER( regex(?tagLabel,"' + joinedTagKeywords + '","i")||regex(?tag_title,"' + joinedTagKeywords + '","i")).';
                subQueries.push(subquery);
            } else if (type == "Resource") {
                subquery = `?TaskResource <http://rds.posccaesar.org/ontology/lis14/rdl/hasActiveParticipant> ?WBS_activity.
                ?TaskResource  rdf:type <http://data.total/resource/tsf/PRIMAVERA_REZA_17_07_2024/TaskResource>.  
                ?WBS_activity  rdf:type <http://data.total/resource/tsf/PRIMAVERA_REZA_17_07_2024/WBS_activity>.
                ?TaskResource <http://data.total/resource/tsf/PRIMAVERA_REZA_17_07_2024/ressourceName> ?TaskResource_ressourceName.
                ?TaskResource <http://data.total/resource/tsf/PRIMAVERA_REZA_17_07_2024/manHours> ?TaskResource_manHours.
                OPTIONAL {?TaskResource <http://data.total/resource/tsf/PRIMAVERA_REZA_17_07_2024/budgetedUnits_110> ?TaskResource_budgetedUnits_110.}
                FILTER(?TaskResource_manHours>0).
            
                `;
                types[type].labels.forEach(function (item) {
                    item = "_" + item + "_";
                });
                subquery += Sparql_common.setFilter("TaskResource_ressourceName", null, types[type].labels);
                subquery = subquery.replace("TaskResource_ressourceNameLabel", "TaskResource_ressourceName");
                subquery += ".";
                subQueries.push(subquery);
            } else if (type == "Unit") {
                subquery +=
                    " ?JobCardExecution <http://rds.posccaesar.org/ontology/lis14/rdl/hasPassiveParticipant>/<http://rds.posccaesar.org/ontology/lis14/rdl/residesIn> / <http://data.total/resource/tsf/dalia-lifex1/unitName> ?unitName. ";
                subquery += Sparql_common.setFilter("unitName", null, types[type].labels).replace("Label", "");
                subQueries.push(subquery);
            } else if (type == "Sector") {
                subquery +=
                    " ?JobCardExecution <http://rds.posccaesar.org/ontology/lis14/rdl/hasPassiveParticipant>/<http://rds.posccaesar.org/ontology/lis14/rdl/residesIn> / <http://data.total/resource/tsf/dalia-lifex1/sectorName> ?sectorName. ";
                subquery += Sparql_common.setFilter("sectorName", null, types[type].labels).replace("Label", "");
                subQueries.push(subquery);
            } else if (type == "System") {
                subquery +=
                    " ?JobCardExecution <http://rds.posccaesar.org/ontology/lis14/rdl/hasPassiveParticipant>/<http://rds.posccaesar.org/ontology/lis14/rdl/residesIn> / <http://data.total/resource/tsf/dalia-lifex1/systemName> ?systemName. ";
                subquery += Sparql_common.setFilter("systemName", null, types[type].labels).replace("Label", "");
                subQueries.push(subquery);
            } else if (type == "withoutJCNeededPost2029") {
                filter += `OPTIONAL  {?JobCardExecution <http://data.total/resource/tsf/dalia-lifex1/p_projectNeededDate> ?JobCardExecution_p_projectNeededDate.}`;
                filter += 'FILTER (?JobCardExecution_p_projectNeededDate < "2029-12-31"^^xsd:dateTime).';
            }
        }
        if (groupByKey == "FLOC" && !types["FLOC"]) {
            subquery +=
                " ?JobCardExecution <http://rds.posccaesar.org/ontology/lis14/rdl/hasPassiveParticipant>/<http://rds.posccaesar.org/ontology/lis14/rdl/residesIn> / <http://www.w3.org/2000/01/rdf-schema#label> ?functionalLocationLabel. ";
            subQueries.push(subquery);
        }

        if (groupByKey == "Unit" && !types["Unit"]) {
            subquery +=
                " ?JobCardExecution <http://rds.posccaesar.org/ontology/lis14/rdl/hasPassiveParticipant>/<http://rds.posccaesar.org/ontology/lis14/rdl/residesIn> / <http://data.total/resource/tsf/dalia-lifex1/unitName> ?unitName. ";
            subQueries.push(subquery);
        }

        if (groupByKey == "Sector" && !types["Sector"]) {
            subquery +=
                " ?JobCardExecution <http://rds.posccaesar.org/ontology/lis14/rdl/hasPassiveParticipant>/<http://rds.posccaesar.org/ontology/lis14/rdl/residesIn> / <http://data.total/resource/tsf/dalia-lifex1/sectorName> ?sectorName. ";
            subQueries.push(subquery);
        }
        if (groupByKey == "System" && !types["System"]) {
            subquery +=
                " ?JobCardExecution <http://rds.posccaesar.org/ontology/lis14/rdl/hasPassiveParticipant>/<http://rds.posccaesar.org/ontology/lis14/rdl/residesIn> / <http://data.total/resource/tsf/dalia-lifex1/systemName> ?systemName. ";
            subQueries.push(subquery);
        }
        var yAxisVal = $("#Lifex_cost_quantityVarSelect").val();
        if (yAxisVal.indexOf("Ressource") > -1 && !types["Resource"]) {
            subquery = `?TaskResource <http://rds.posccaesar.org/ontology/lis14/rdl/hasActiveParticipant> ?WBS_activity.
            ?TaskResource  rdf:type <http://data.total/resource/tsf/PRIMAVERA_REZA_17_07_2024/TaskResource>.  
            ?WBS_activity  rdf:type <http://data.total/resource/tsf/PRIMAVERA_REZA_17_07_2024/WBS_activity>.
            ?TaskResource <http://data.total/resource/tsf/PRIMAVERA_REZA_17_07_2024/ressourceName> ?TaskResource_ressourceName.
            ?TaskResource <http://data.total/resource/tsf/PRIMAVERA_REZA_17_07_2024/manHours> ?TaskResource_manHours.
            OPTIONAL {?TaskResource <http://data.total/resource/tsf/PRIMAVERA_REZA_17_07_2024/budgetedUnits_110> ?TaskResource_budgetedUnits_110.}
            FILTER(?TaskResource_manHours>0).
            filter( !regex(?TaskResource_ressourceName,"MH"))
            `;
            //FILTER(!contains(?TaskResource_ressourceName,'MH')).
            subQueries.push(subquery);
        }

        var options = {
            filter: filter,
            subQueries: subQueries,
            filterText: filterText,
            groupByKey: groupByKey,
        };

        return callback(null, options);
    };

    self.draw2dChart = function (groupByKey, filter, options, callback) {
        if (!options) {
            options = {};
        }
        var sparqlData;
        var chartData;
        var filterParams;
        $("#waitImg").css("display", "block");
        async.series(
            [
                //get sparqlquery filters
                function (callbackSeries) {
                    if (options.simulatedDataMap) {
                        return callbackSeries();
                    }
                    self.getQueryFiltersFromUI(groupByKey, filter, function (err, result) {
                        filterParams = result;
                        groupByKey = result.groupByKey;
                        return callbackSeries(err);
                    });
                },
                //execute query
                function (callbackSeries) {
                    if (options.simulatedDataMap) {
                        return callbackSeries();
                    }
                    UI.message("executing query");
                    DataManager.getSparqlData(filterParams, function (err, result) {
                        sparqlData = result;
                        return callbackSeries(err);
                    });
                },

                //substitute simulatedDataMap values if any
                function (callbackSeries) {
                    if (!options.simulatedDataMap) {
                        return callbackSeries();
                    }
                    filterParams = "";
                    var itemsBeforeSimulation = [];
                    var firstTimeBeforeSimulation = {};
                    DataManager.sparqlData.forEach(function (item) {
                        for (var wbsId in options.simulatedDataMap) {
                            if (item["WBS_activity"].value == wbsId && !item.beforeSimulation) {
                                // Add deep copy of item to identify before simulation
                                //Care of duplication for multiple Moving of same JC
                                if (!GanttSimulation.WBSbeforeSimulation[wbsId]) {
                                    itemsBeforeSimulation.push(JSON.parse(JSON.stringify(item)));
                                    itemsBeforeSimulation[itemsBeforeSimulation.length - 1].beforeSimulation = true;
                                    // Duplicate all occurences of same item for the first simulation then block it
                                    // Did for multiple items wbsactivity in same SparqlData
                                    firstTimeBeforeSimulation[wbsId] = true;
                                }

                                for (var key in options.simulatedDataMap[wbsId]) {
                                    // var newValue = options.simulatedDataMap[wbsId][key].toISOString();
                                    var newValue = common.getSimpleDateStrFromDate(options.simulatedDataMap[wbsId][key]);
                                    //   console.log(key + "  " + item[key].value + "  " + newValue)
                                    item[key].value = newValue;
                                    item.simulation = true;
                                }
                            }
                        }
                    });

                    Object.keys(firstTimeBeforeSimulation).forEach(function (wbsId) {
                        GanttSimulation.WBSbeforeSimulation[wbsId] = true;
                    });
                    DataManager.sparqlData = DataManager.sparqlData.concat(itemsBeforeSimulation);

                    return callbackSeries();
                },
                //prepare time2dChart data
                function (callbackSeries) {
                    UI.message("prepare time2dChart data");
                    Time2dChart.prepareChartdata(groupByKey, function (err, result) {
                        chartData = result;
                        return callbackSeries(err);
                    });
                },
                //draw time2dChart
                function (callbackSeries) {
                    UI.message("draw time2dChart");
                    Time2dChart.draw2dChart(chartData, function () {
                        DataManager.legendClassesMap = GroupsController.legend.getLegendClassesMap();
                        return callbackSeries();
                    });
                },
                //set Title
                function (callbackSeries) {
                    if (filterParams.filterText) {
                        var yAxisVal = $("#Lifex_cost_quantityVarSelect").val();
                        Time2dChart.setChartTitle("<B>" + yAxisVal + "</B> / " + filterParams.filterText);
                    }
                    return callbackSeries();
                },
            ],
            function (err) {
                if (err) {
                    if (callback) {
                        return callback(err);
                    }
                    return alert(err.responseText || err);
                }
                if (callback) {
                    return callback();
                }
                UI.message("", true);
            }
        );
    };

    self.drawGanttChart = function (groupByKey, filter, callback) {
        var options;
        var sparqlData;
        $("#LifexPlanning_right_tabs").tabs("option", "active", 1);
        $("#waitImg").css("display", "block");
        async.series(
            [
                //get sparqlquery filters
                function (callbackSeries) {
                    self.getQueryFiltersFromUI(groupByKey, filter, function (err, result) {
                        options = result;
                        groupByKey = result.groupByKey;
                        return callbackSeries(err);
                    });
                },
                //execute query
                function (callbackSeries) {
                    UI.message("executing query");
                    DataManager.getSparqlData(options, function (err, result) {
                        sparqlData = result;

                        return callbackSeries(err);
                    });
                },
                //draw gannt Chart
                function (callbackSeries) {
                    Timeline.draw(sparqlData);
                    return callbackSeries();
                },
            ],
            function (err) {
                if (err) {
                    if (callback) {
                        return callback(err);
                    }
                    return alert(err.responseText || err);
                }
                if (callback) {
                    return callback();
                }
                UI.message("", true);
            }
        );
    };

    self.getTasksAtDate = function () {
        DateWidget.showDialog(null, "WBSstartDate", null, function (err, result) {});
    };

    return self;
})();

export default FiltersWidget;
window.FiltersWidget = FiltersWidget;
