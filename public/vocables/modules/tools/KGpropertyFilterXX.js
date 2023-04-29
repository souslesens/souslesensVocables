import Sparql_generic from "../sparqlProxies/sparql_generic.js";
import SourceBrowser from "./sourceBrowser.js";
import Sparql_proxy from "../sparqlProxies/sparql_proxy.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";
import Sparql_OWL from "../sparqlProxies/sparql_OWL.js";

var KGpropertyFilter = (function () {
    var self = {};

    self.currentNewFilters = [];
    self.currentSavedFilters = [];
    self.onLoaded = function () {
        var tsfPropertyFilterPrefix = Config.KGpropertyFilter.tsfPropertyFilterPrefix;
        self.aspectsMap = {
            MDMentities: {
                predicate: tsfPropertyFilterPrefix + "appliesToMDMentityFilter",
                treeDiv: "KGpropertyFilter_MDMentitiesTree",
            },
            Disciplines: {
                predicate: tsfPropertyFilterPrefix + "appliesToDiscipline",
                treeDiv: "KGpropertyFilter_disciplinesTree",
            },
            LifeCycle: {
                predicate: tsfPropertyFilterPrefix + "appliesToLifeCycleStatus",
                treeDiv: "KGpropertyFilter_lifeCycleTree",
            },
            Organizations: {
                predicate: tsfPropertyFilterPrefix + "appliesToOrganizationFilter",
                treeDiv: "KGpropertyFilter_organizationsTree",
            },
        };

        $("#actionDivContolPanelDiv").load("snippets/KGpropertyFilter/leftPanel.html", function () {
            var sources = Config.KGpropertyFilter.sources;

            common.fillSelectOptions("KGpropertyFilter_sourceSelect", sources, true);
            $("#KGpropertyFilter_searchInPropertiesTreeInput").bind("keyup", null, KGpropertyFilter.searchInPropertiesTree);
        });

        //  MainController.UI.showHideRightPanel(true);
        $("#graphDiv").width(1000);
        $("#graphDiv").load("snippets/KGpropertyFilter/centralPanel.html", function () {
            $("#KGpropertyFilter_filteringResult").height($("#graphDiv").height() - 200);
            $("#KGpropertyFilter_filteringResult").width($("#graphDiv").width());

            $("#KGpropertyFilter_centralPanelTabs").tabs({
                activate: function (e, ui) {
                    self.currentOwlType = "Class";
                    var divId = ui.newPanel.selector;
                    if (divId == "#LineageTypesTab") {
                        // pass
                    }
                },
            });

            $("#rightPanelDiv").load("snippets/KGpropertyFilter/rightPanel.html", function () {
                $("#KGpropertyFilter_rightPanelTabs").tabs({
                    activate: function (_e, _ui) {
                        self.currentAspect = _ui.newTab[0].textContent;
                    },
                    create(event, ui) {
                        self.initRightPanel();
                        self.currentAspect = Object.keys(self.aspectsMap)[0];

                        /*  $("#KGpropertyFilter_rightPanelTabs").tabs("option","active",1)
$("#KGpropertyFilter_rightPanelTabs").tabs("option","active",0)*/
                    },
                });
            });
        });

        $("#accordion").accordion("option", { active: 2 });
    };

    self.initFiltersSource = function (source) {
        self.propertyFilteringSource = source + "_TSF-PROPERTY-FILTERING";
        var filtersSourceGraphUri = Config.sources[source].graphUri + "property-filtering/";
        Config.sources[self.propertyFilteringSource] = {
            isDictionary: true,
            editable: true,
            graphUri: filtersSourceGraphUri,
            imports: [],
            sparql_server: {
                url: "_default",
            },
            controller: "Sparql_OWL",
            schemaType: "OWL",
        };

        self.loadedFilters = {};
    };

    self.onChangeSourceSelect = function (source) {
        self.resetMatrixPropertiesFilters();
        self.currentSource = source;
        self.initFiltersSource(source);
        self.loadClassesTree(source);
    };

    self.resetMatrixPropertiesFilters = function () {
        if (self.currentNewFilters.length == 0) return;
        if (confirm("reset filters without saving them")) {
            self.currentNewFilters = [];
            $("#KGpropertyFilter_filteringResult").html("");
        }
    };

    self.loadClassesTree = function (source) {
        function drawTree(result) {
            var jstreeData = [];
            var existingNodes = {};

            result.forEach(function (item) {
                if (!existingNodes[item.subject.value]) {
                    existingNodes[item.subject.value] = 1;
                    jstreeData.push({
                        parent: "#",
                        id: item.subject.value,
                        text: item.subjectLabel.value,
                        type: "Class",
                        data: {
                            type: "Class",
                            source: self.currentSource,
                            label: item.subjectLabel.value,
                            id: item.subject.value,
                        },
                    });
                }

                for (var i = 1; i <= 10; i++) {
                    if (!item["child" + i]) break;
                    var parent = i == 1 ? item.subject.value : item["child" + (i - 1)].value;

                    var id = item["child" + i].value;
                    var label = item["child" + i + "Label"].value;
                    if (!existingNodes[id]) {
                        existingNodes[id] = 1;
                        jstreeData.push({
                            parent: parent,
                            id: id,
                            text: label,
                            type: "Class",
                            data: {
                                type: "Class",
                                source: self.currentSource,
                                label: label,
                                id: id,
                            },
                        });
                    }
                }
            });

            var options = {
                openAll: false,
                withCheckboxes: true,
                selectTreeNodeFn: KGpropertyFilter.onClassOrPropertyNodeClicked,
                onAfterOpenNodeFn: KGpropertyFilter.onOpenClassesOrPropertyNode,
                onCheckNodeFn: null, //KGpropertyFilter.loadPropertiesFilters,
                tie_selection: false,
                contextMenu: KGpropertyFilter.getJstreePropertiesContextMenu(),
                searchPlugin: {
                    case_insensitive: true,
                    fuzzy: false,
                    show_only_matches: true,
                },
            };
            JstreeWidget.loadJsTree("KGpropertyFilter_propertiesTreeDiv", jstreeData, options);

            $("#waitImg").css("display", "none");
        }

        if (source == "CFIHOS_1_5_PLUS") {
            var depth = 3;
            Sparql_generic.getNodeChildren(
                self.currentSource,
                null,
                ["http://data.total.com/resource/tsf/ontology/tepdk/phusion/TOTAL-P0000001723", "http://data.total.com/resource/tsf/ontology/tepdk/phusion/TOTAL-F0000000801"],
                3,
                {},
                function (err, result) {
                    //    Sparql_generic.getNodeChildren(self.currentSource, null, ["http://data.totalenergies.com/resource/ontology/cfihos_1.5/TagClass/CFIHOS-30000311"], depth, {}, function (err, result) {
                    if (err) {
                        return MainController.UI.message(err);
                    }
                    drawTree(result);
                }
            );
        } else if (source == "CFIHOS_1_5_PLUS") {
            var depth = 3;
            Sparql_generic.getNodeChildren(
                self.currentSource,
                null,
                ["http://data.total.com/resource/tsf/ontology/tepdk/phusion/TOTAL-P0000001723", "http://data.total.com/resource/tsf/ontology/tepdk/phusion/TOTAL-F0000000801"],
                3,
                {},
                function (err, result) {
                    //    Sparql_generic.getNodeChildren(self.currentSource, null, ["http://data.totalenergies.com/resource/ontology/cfihos_1.5/TagClass/CFIHOS-30000311"], depth, {}, function (err, result) {
                    if (err) {
                        return MainController.UI.message(err);
                    }
                    drawTree(result);
                }
            );
        } else if (source == "TSF_TEPDK_TEST") {
            var depth = 1;
            Sparql_generic.getNodeChildren(self.currentSource, null, ["http://rds.posccaesar.org/ontology/lis14/rdl/FunctionalObject"], depth, {}, function (err, result) {
                if (err) {
                    return MainController.UI.message(err);
                }

                result.sort(function (a, b) {
                    if (a.child1.value > b.child1.value) return 1;
                    if (a.child1.value < b.child1.value) return -1;
                    return 0;
                });

                drawTree(result);
            });
        } else if (source == "TSF_TEPDK_PHUSION") {
            var depth = 1;
            Sparql_generic.getNodeChildren(
                self.currentSource,
                null,
                ["http://data.total.com/resource/tsf/ontology/tepdk/phusion/TOTAL-P0000001723", "http://data.total.com/resource/tsf/ontology/tepdk/phusion/TOTAL-F0000000801"],
                3,
                {},
                function (err, result) {
                    if (err) {
                        return MainController.UI.message(err);
                    }

                    result.sort(function (a, b) {
                        if (a.child1.value > b.child1.value) return 1;
                        if (a.child1.value < b.child1.value) return -1;
                        return 0;
                    });

                    drawTree(result);
                }
            );
        }
    };

    self.getJstreePropertiesContextMenu = function () {
        var items = {};
        items.nodeInfos = {
            label: "Node infos",
            action: function (_e) {
                // pb avec source
               NodeInfosWidget.showNodeInfos(self.currentSource, self.currentClassOrPropertyNode, "mainDialogDiv");
            },
        };
        items.viewFilters = {
            label: "View filters",
            action: function (_e) {
                KGpropertyFilter.loadPropertiesFilters();
            },
        };
        items.associate = {
            label: "Associate",
            action: function (_e) {
                KGpropertyFilter.associateFiltersToPropertyRestriction();
                // KGpropertyFilter.showAssociateDialog();
            },
        };
        return items;
    };

    self.getJstreeAspectsContextMenu = function () {
        var items = {};

        items.associate = {
            label: "Associate",
            action: function (_e) {
                KGpropertyFilter.associateFiltersToPropertyRestriction();
                // KGpropertyFilter.showAssociateDialog();
            },
        };
        return items;
    };

    self.showGraphPopupMenu = function () {};
    /*  self.showAssociateDialog = function () {
  var selectedProperties = JstreeWidget.getjsTreeNodes("KGpropertyFilter_propertiesTreeDiv", true, "#");

  for (var key in self.aspectsMap)
      var items = $("#" + selectId)
          .jstree()
          .get_checked(true);
  items.forEach(function (item) {});
};*/

    self.onOpenClassesOrPropertyNode = function (evt, obj) {
        //  var classIds=$("#KGpropertyFilter_propertiesTreeDiv").jstree().get_checked();
        var classIds = obj.node.children;
        self.loadClassesPropertiesTree(classIds);
    };

    self.onClassOrPropertyNodeClicked = function (event, obj) {
        self.currentClassOrPropertyNode = obj.node;
        if (obj.node.data.type == "Class") {
            var propertyFilterTabIndex = $("#KGpropertyFilter_rightPanelTabs").tabs("option", "active");
            if (self.currentClassOrPropertyNode.parents.length > 1) self.currentClassId = self.currentClassOrPropertyNode.parents[1];
            else self.currentClassId = self.currentClassOrPropertyNode.id;
            $("#KGpropertyFilter_currentPropertyDiv").css("display", "block");
            $("#KGpropertyFilter_currentPropertySpan").html(obj.node.text);
            $("#KGpropertyFilter_currentPropertySpan2").html(obj.node.text);

            // self.client.filterProperties(self.currentClassId);

            if (true || obj.node.children.length == 0) {
                self.loadClassesPropertiesTree(obj.node.id);
                //  self.addPropertiestoClassesTree(obj.node.id);
            }
        } else {
        }
    };

    self.associateFiltersToPropertyRestriction = function () {
        var leftObjs = $("#KGpropertyFilter_propertiesTreeDiv").jstree().get_checked(true);
        var selectedProperties = [];
        leftObjs.forEach(function (item) {
            if (item.data.type != "Property")
                // filter selected Properties Only
                return;
            selectedProperties.push(item.data);
        });
        if (selectedProperties.length == 0) return alert("no property is selected");

        var aspectObjs = $("#" + self.aspectsMap[self.currentAspect].treeDiv)
            .jstree()
            .get_checked(true);
        if (aspectObjs.length == 0) return alert("no aspect value  is selected");

        if (true);
        // !confirm("Associate " + selectedProperties.length + "properties to  aspect selected  values of aspect" + self.currentAspect)) return;

        var classId;
        var classObj;
        var classLabel;
        self.currentNewFilters.currentAspect = self.currentAspect;
        selectedProperties.forEach(function (propertyObj) {
            aspectObjs.forEach(function (aspectObj) {
                // $("#" + selectId + " option:selected").each(function () {
                var filterId = propertyObj.retrictionId + "|" + aspectObj.data.id;
                var newFilter = {
                    type: "filterClass",
                    classLabel: classLabel,
                    propertyLabel: propertyObj.propLabel,
                    propertyId: propertyObj.propId,
                    classId: propertyObj.classId,
                    classLabel: propertyObj.classLabel,
                    propertyRetrictionId: propertyObj.retrictionId,
                    aspect: self.currentAspect,
                    aspectId: self.currentAspect,
                    aspectLabel: aspectObj.data.label,
                    filterId: aspectObj.data.id,
                    filterLabel: aspectObj.data.label,
                    status: "new",
                };

                self.currentNewFilters.push(newFilter);
            });
        });
        $("#KGpropertyFilter_propertiesTreeDiv").jstree().uncheck_all();
        for (var key in self.aspectsMap) {
            $("#" + self.aspectsMap[key].treeDiv)
                .jstree()
                .uncheck_all();
        }
        self.showFilters(self.currentNewFilters);
        return;
    };

    self.showFilters = function () {
        var filters = self.currentNewFilters.concat(self.currentSavedFilters);
        var displayType = $("#KGpropertyFilter_filtersDisplayTypeSelect").val();
        if (displayType == "matrix") {
            self.matrix.showFiltersMatrix(filters);
        } else {
            self.showFiltersDataTable(filters);
        }
    };

    self.showFiltersDataTable = function (filters) {
        var cols = [
            {
                title: "Selection",
                className: "select-checkbox",
                render: function (datum, type, row) {
                    return "";
                },
            },
            { title: "Class", defaultContent: "" },
            { title: "Property", defaultContent: "" },
            { title: "Aspect", defaultContent: "" },
            { title: "Filter", defaultContent: "" },
        ];
        var dataset = [];
        filters.forEach(function (item) {
            dataset.push([item.propertyRetrictionId + "|" + item.filterId, item.classLabel, item.propertyLabel, item.aspectLabel, item.filterLabel]);
        });
        $("#KGpropertyFilter_filteringResult").html("<table id='dataTableDivExport'></table>");

        setTimeout(function () {
            self.dictionaryDataTable = $("#dataTableDivExport").DataTable({
                data: dataset,
                columns: cols,
                pageLength: 200,
                dom: "Bfrtip",
                /* "columnDefs": [
  { "width": "20px", "targets": 0 },
  { "width": "50px", "targets": 1 },
  { "width": "50px", "targets": 2 },
  { "width": "50px", "targets": 3 },
  { "width": "50px", "targets": 4 },
  ],*/
                // columnDefs: [{ className: "select-checkbox", targets: [0] }],
                select: {
                    style: "multi",
                    selector: "td:first-child",
                },
                buttons: [
                    {
                        extend: "csvHtml5",
                        text: "Export CSV",
                        fieldBoundary: "",
                        fieldSeparator: ";",
                    },
                    {
                        text: "Select All",
                        action: function (e, dt, node, config) {
                            KGpropertyFilter.dictionaryDataTable.rows().select();
                        },
                    },
                    {
                        text: "UnSelect All",
                        action: function (e, dt, node, config) {
                            KGpropertyFilter.dictionaryDataTable.rows().deselect();
                        },
                    },

                    {
                        text: "Delete",
                        action: function (e, dt, node, config) {
                            return alert("in construction");
                            var data = KGpropertyFilter.dictionaryDataTable.rows({ selected: true }).data();
                            KGpropertyFilter.deleteFilters(data);
                        },
                    },
                ],
            });
        }, 1000);
    };

    self.deleteFilters = function (dataTableData) {
        if (dataTableData.length == 0) return alert("no row is selected");
        if (!confirm(" remove  permanently " + dataTableData.length + " filters ?")) return;
        var subjects = [];
        var objects = [];
        var query = "DELETE DATA FROM   <" + Config.sources[self.propertyFilteringSource].graphUri + "> {\n";
        for (var i = 0; i < data.length; i++) {
            var array = data[i][0].split("|");
            query += "<" + array[0] + "> ?p <" + array[1] + ">.\n";
        }
        query += "}";
        let url = Config.sources[self.propertyFilteringSource].sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, {}, { source: self.propertyFilteringSource }, function (err, result) {
            if (err) {
                return alert(err.responseText);
            }

            return MainController.UI.message("Deleted " + data.length + " filters", true);
        });
    };

    self.saveNewRestrictionFilterTriples = function () {
        newFilters = self.currentNewFilters;
        var triples = [];
        newFilters.forEach(function (filter) {
            triples.push({
                subject: filter.propertyRetrictionId,
                predicate: self.aspectsMap[self.currentNewFilters.currentAspect].predicate,
                object: filter.filterId,
            });
        });

        Sparql_generic.insertTriples(self.propertyFilteringSource, triples, { getSparqlOnly: false }, function (err, result) {
            if (err) return alert(err.responseText);
            MainController.UI.message(result + " filters created ");
        });
    };

    self.loadPropertiesFilters = function (callback) {
        var nodes = $("#KGpropertyFilter_propertiesTreeDiv").jstree().get_checked(true);

        var restrictionIds = [];
        nodes.forEach(function (item) {
            if (item.data.retrictionId) restrictionIds.push(item.data.retrictionId);
        });

        var filterStr = Sparql_common.setFilter("restriction", restrictionIds);
        var fromStr = "FROM <" + Config.sources[self.propertyFilteringSource].graphUri + ">";
        fromStr += " FROM <" + Config.sources[self.currentSource].graphUri + ">";

        var sparql =
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
            "SELECT * " +
            fromStr +
            " WHERE {\n" +
            "  ?classId rdfs:subClassOf ?restriction .\n" +
            "  ?restriction <http://www.w3.org/2002/07/owl#someValuesFrom> ?propertyId.\n" +
            "  ?propertyId rdfs:label ?propertyLabel.\n" +
            "  ?classId rdfs:label ?classLabel.\n" +
            "  ?restriction ?aspect ?filter. filter (regex(str(?aspect),'http://data.total.com/resource/tsf/property-filtering/'))\n";
        sparql += filterStr;
        sparql += "} LIMIT 10000";
        var url = Config.sources[self.propertyFilteringSource].sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, sparql, "", { source: self.propertyFilteringSource }, function (err, result) {
            if (err) {
                return callback(err);
            }

            var filters = Sparql_common.getBindingsValues(result.results.bindings);
            filters.forEach(function (item) {
                item.filterLabel = Sparql_common.getLabelFromURI(item.filter);
                item.aspectLabel = Sparql_common.getLabelFromURI(item.aspect);
                item.status = "saved";
            });
            self.currentSavedFilters = filters;

            self.showFilters();
        });
    };

    self.initRightPanel = function () {
        async.series(
            [
                function (callbackSeries) {
                    return callbackSeries();
                    self.loadMDMentitiesTree(function (err, _result) {
                        callbackSeries(err);
                    });
                },
                function (callbackSeries) {
                    return callbackSeries();
                    self.loadLifeCycleTree(function (err, _result) {
                        callbackSeries(err);
                    });
                },
                function (callbackSeries) {
                    return callbackSeries();
                    self.loadDisciplinesTree(function (err, _result) {
                        callbackSeries(err);
                    });
                },
                function (callbackSeries) {
                    return callbackSeries();
                    self.loadOrganizationsTree(function (err, _result) {
                        callbackSeries(err);
                    });
                },
            ],
            function (err) {
                $("#KGpropertyFilter_rightPanelTabs").tabs("option", "active", 0);
                if (err) return alert(err.responseText);
            }
        );

        return;
    };
    self.onSelectFilter = function () {
        // pass
    };

    self.loadClassesPropertiesTree = function (classId) {
        //  var classIds = ["http://data.totalenergies.com/resource/ontology/cfihos_1.5/EquipmentClass/CFIHOS-30000521"];
        // classIds = null

        var options = { filter: "  FILTER (?prop in(<http://rds.posccaesar.org/ontology/lis14/rdl/hasQuality> ,<http://standards.iso.org/iso/15926/part14/rdl/hasQuality>))" };
        Sparql_OWL.getObjectRestrictions(self.currentSource, classId, options, function (err, result) {
            if (err) {
                return MainController.UI.message(err.responseText);
            }
            var jstreeData = [];
            var existingNodes = JstreeWidget.getjsTreeNodes("KGpropertyFilter_propertiesTreeDiv", true, "#");
            var restrictionIds = [];
            result.forEach(function (item) {
                var id = item.subject.value + "_" + item.value.value;
                if (!existingNodes[id]) {
                    existingNodes[id] = 1;
                    restrictionIds.push(id);
                    existingNodes[id] = 1;
                    jstreeData.push({
                        id: id,
                        text: "<span class='KGpropertyFilter_property' >" + item.valueLabel.value + "</span>",
                        parent: item.subject.value,
                        type: "Property",
                        data: {
                            type: "Property",
                            propId: item.value.value,
                            propLabel: item.valueLabel.value,
                            retrictionId: item.node.value,
                            classId: item.subject.value,
                            classLabel: item.subjectLabel.value,
                        },
                    });
                }
            });
            var options = {
                selectTreeNodeFn: function (/** @type {any} */ event, /** @type {any} */ obj) {
                    return (self.currentClassNode = obj.node);
                },
            };
            if (jstreeData.length > 0) {
                common.array.sort(jstreeData, "text");
                JstreeWidget.addNodesToJstree("KGpropertyFilter_propertiesTreeDiv", classId, jstreeData, options);
            }
        });
    };

    self.loadLifeCycleTree = function (callback) {
        Sparql_OWL.getNodeChildren("ISO-15663", null, null, 2, {}, function (err, result) {
            if (err) return callback(err.responseText);
            var jstreeData = [];
            var existingNodes = {};
            result.forEach(function (item) {
                if (!existingNodes[item.subject.value]) {
                    existingNodes[item.subject.value] = 1;
                    jstreeData.push({
                        id: item.subject.value,
                        text: item.subjectLabel.value,
                        parent: "#",
                        data: {
                            id: item.subject.value,
                            label: item.subjectLabel.value,
                            source: "ISO-15663",
                        },
                    });
                }
                if (!existingNodes[item.child1.value]) {
                    existingNodes[item.child1.value] = 1;
                    jstreeData.push({
                        id: item.child1.value,
                        text: item.child1Label.value,
                        parent: item.subject.value,
                        data: {
                            id: item.child1.value,
                            label: item.child1Label.value,
                            source: "ISO-15663",
                        },
                    });
                }
            });
            common.array.sort(jstreeData, "text");
            var options = { openAll: false, withCheckboxes: true, contextMenu: KGpropertyFilter.getJstreeAspectsContextMenu() };
            JstreeWidget.loadJsTree("KGpropertyFilter_lifeCycleTree", jstreeData, options, function () {
                $("#KGpropertyFilter_lifeCycleTree").jstree().open_node("http://rds.posccaesar.org/ontology/lis14/rdl/Activity");
            });

            callback();
        });
    };

    self.loadDisciplinesTree = function (callback) {
        Sparql_OWL.getNodeChildren("ISO_15926-org", null, ["http://data.15926.org/cfihos/15926200"], 2, {}, function (err, result) {
            if (err) return callback(err.responseText);
            var jstreeData = [];
            var existingNodes = {};
            result.forEach(function (item) {
                if (!existingNodes[item.subject.value]) {
                    existingNodes[item.subject.value] = 1;
                    jstreeData.push({
                        id: item.subject.value,
                        text: item.subjectLabel.value,
                        parent: "#",
                        data: {
                            id: item.subject.value,
                            label: item.subjectLabel.value,
                            source: "ISO-15663",
                        },
                    });
                }
                if (!existingNodes[item.child1.value]) {
                    existingNodes[item.child1.value] = 1;
                    jstreeData.push({
                        id: item.child1.value,
                        text: item.child1Label.value,
                        parent: item.subject.value,
                        data: {
                            id: item.child1.value,
                            label: item.child1Label.value,
                            source: "ISO-15663",
                        },
                    });
                }
            });
            var options = { openAll: true, withCheckboxes: true, contextMenu: KGpropertyFilter.getJstreeAspectsContextMenu() };
            common.array.sort(jstreeData, "text");
            JstreeWidget.loadJsTree("KGpropertyFilter_disciplinesTree", jstreeData, options);
            callback();
        });
    };
    self.loadOrganizationsTree = function (callback) {
        Sparql_OWL.getNodeChildren("ISO_15926-org", null, ["http://data.15926.org/lci/Organization"], 2, {}, function (err, result) {
            if (err) return callback(err.responseText);
            var jstreeData = [];
            var existingNodes = {};
            result.forEach(function (item) {
                if (!existingNodes[item.subject.value]) {
                    existingNodes[item.subject.value] = 1;
                    jstreeData.push({
                        id: item.subject.value,
                        text: item.subjectLabel.value,
                        parent: "#",
                        data: {
                            id: item.subject.value,
                            label: item.subjectLabel.value,
                            source: "ISO-15663",
                        },
                    });
                }
                if (!existingNodes[item.child1.value]) {
                    existingNodes[item.child1.value] = 1;
                    jstreeData.push({
                        id: item.child1.value,
                        text: item.child1Label.value,
                        parent: item.subject.value,
                        data: {
                            id: item.child1.value,
                            label: item.child1Label.value,
                            source: "ISO-15663",
                        },
                    });
                }
            });
            common.array.sort(jstreeData, "text");
            var options = { openAll: true, withCheckboxes: true, contextMenu: KGpropertyFilter.getJstreeAspectsContextMenu() };
            JstreeWidget.loadJsTree("KGpropertyFilter_organizationsTree", jstreeData, options);
            callback();
        });
    };

    /* self.loadDisciplinesTree = function(callback) {
    Sparql_OWL.getNodeChildren("ISO_15926-org", null, ["http://data.15926.org/cfihos/15926200"], 2, {}, function(err, result) {
      if (err) return callback(err.responseText);
      var jstreeData = [];
      var existingNodes = {};
      result.forEach(function(item) {
        if (!existingNodes[item.subject.value]) {
          existingNodes[item.subject.value] = 1;
          jstreeData.push({
            id: item.subject.value,
            text: item.subjectLabel.value,
            parent: "#",
            data: {
              id: item.subject.value,
              label: item.subjectLabel.value,
              source: "ISO-15663"
            }
          });
        }
        if (!existingNodes[item.child1.value]) {
          existingNodes[item.child1.value] = 1;
          jstreeData.push({
            id: item.child1.value,
            text: item.child1Label.value,
            parent: item.subject.value,
            data: {
              id: item.child1.value,
              label: item.child1Label.value,
              source: "ISO-15663"
            }
          });
        }
      });
      var options = { openAll: true, withCheckboxes: true };
      common.array.sort(jstreeData, "text");
      JstreeWidget.loadJsTree("KGpropertyFilter_disciplinesTree", jstreeData, options);
      callback();
    });
  };*/
    self.loadMDMentitiesTree = function (callback) {
        var jstreeData = [];

        jstreeData.push({
            id: "http://data.total.com/resource/tsf/mdm/Tag",
            text: "1-Tag",
            parent: "#",
            data: {
                id: "http://data.total.com/resource/tsf/mdm/Tag",
                label: "Tag",
                source: "http://data.total.com/resource/tsf/mdm/",
            },
        });

        jstreeData.push({
            id: "http://data.total.com/resource/tsf/mdm/FunctionalClass",
            text: "2-FunctionalClass",
            parent: "#",
            data: {
                id: "http://data.total.com/resource/tsf/mdm/FunctionalClass",
                label: "FunctionalClass",
                source: "http://data.total.com/resource/tsf/mdm/",
            },
        });
        jstreeData.push({
            id: "http://data.total.com/resource/tsf/mdm/PhysicalClass",
            text: "3-PhysicalClass",
            parent: "#",
            data: {
                id: "http://data.total.com/resource/tsf/mdm/PhysicalClass",
                label: "PhysicalClass",
                source: "http://data.total.com/resource/tsf/mdm/",
            },
        });
        jstreeData.push({
            id: "http://data.total.com/resource/tsf/mdm/Model",
            text: "4-Model",
            parent: "#",
            data: {
                id: "http://data.total.com/resource/tsf/mdm/Model",
                label: "Model",
                source: "http://data.total.com/resource/tsf/mdm/",
            },
        });

        jstreeData.push({
            id: "http://data.total.com/resource/tsf/mdm/ModelItem",
            text: "5-ModelItem",
            parent: "#",
            data: {
                id: "http://data.total.com/resource/tsf/mdm/ModelItem",
                label: "ModelItem",
                source: "http://data.total.com/resource/tsf/mdm/",
            },
        });
        jstreeData.push({
            id: "http://data.total.com/resource/tsf/mdm/SparePart",
            text: "6-SparePart",
            parent: "#",
            data: {
                id: "http://data.total.com/resource/tsf/mdm/SparePart",
                label: "SparePart",
                source: "http://data.total.com/resource/tsf/mdm/",
            },
        });

        var options = { openAll: true, withCheckboxes: true, contextMenu: KGpropertyFilter.getJstreeAspectsContextMenu() };
        common.array.sort(jstreeData, "text");
        JstreeWidget.loadJsTree("KGpropertyFilter_MDMentitiesTree", jstreeData, options);
        callback();
    };

    self.execSparqlFilterQuery = function (classIds, callback) {
        var sparql =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>\n" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
            "SELECT * from <http://data.total.com/resource/tsf/property-filtering/> from <http://data.totalenergies.com/resource/ontology/cfihos_1.5/> WHERE {\n" +
            "  ?class rdfs:subClassOf ?restriction .\n" +
            "  ?class rdfs:label ?classLabel.\n" +
            "  ?restriction rdf:type owl:Restriction.\n" +
            "  ?restriction ?aspect ?filterId.\n" +
            " ?restriction owl:onProperty <http://rds.posccaesar.org/ontology/lis14/rdl/hasQuality>.\n" +
            " ?restriction owl:someValuesFrom ?property.\n" +
            "   ?property rdfs:label ?propertyLabel.\n";

        if (classIds) sparql += Sparql_common.setFilter("class", classIds);

        function addFilters(aspect, selectId) {
            var filterId = $("#" + selectId).val();
            if (!filterId) return;
            var predicate = self.aspectsMap[aspect];
            sparql += " filter ( ?aspect=<" + predicate + "> &&  ?filterId=<" + filterId + ">  )";
        }

        addFilters("LifeCycle", "KGpropertyFilter_lifeCycleSelect2");
        addFilters("Discipline", "KGpropertyFilter_disciplineSelect2");
        addFilters("Organization", "KGpropertyFilter_organizationSelect2");

        sparql += "} limit 10000";
        var url = Config.sources[self.propertyFilteringSource].sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, sparql, "", { source: self.currentSource }, function (err, result) {
            if (err) {
                return callback(err);
            }
            var data = [];
            result.results.bindings.forEach(function (item) {
                var obj = {};
                for (var key in item) {
                    obj[key] = item[key].value;
                }
                data.push(obj);
            });
            return callback(null, data);
        });
    };

    self.client = {};

    self.matrix = {
        showFiltersMatrix: function (filters, aspect) {
            let html = "<div class='matrix'>";

            self.matrixDivsMap = {};
            var currentMatrixPropsMap = {};
            var fitlersArray = [];

            filters.forEach(function (item) {
                if (fitlersArray.indexOf(item.filterLabel) < 0) fitlersArray.push(item.filterLabel);
            });

            filters.forEach(function (filter) {
                let propId = filter.classId + "|" + filter.propertyId;
                if (!currentMatrixPropsMap[propId]) currentMatrixPropsMap[propId] = filter;
                if (!currentMatrixPropsMap[propId].propFilters) currentMatrixPropsMap[propId].propFilters = {};
                fitlersArray.forEach(function (filterLabel) {
                    var value = 0;
                    if (filter.filterLabel == filterLabel) value = 1;
                    currentMatrixPropsMap[propId].propFilters[filterLabel] |= value;
                });
            });
            {
                // draw first row with col titles
                let rowHtml = "<div  class='matrixRow " + "" + "'>";
                rowHtml += "<div class='matrixRowTitle' >" + "" + "</div>";
                fitlersArray.forEach(function (aspect) {
                    rowHtml += "<div class='matrixColTitle'>" + aspect + "</div>";
                });
                html += rowHtml + "</div>";
            }

            for (var propId in currentMatrixPropsMap) {
                var prop = currentMatrixPropsMap[propId];
                let matrixFilterClass = "matrixFilterClass";
                let rowDivId = "r" + common.getRandomHexaId(8);
                self.matrixDivsMap[rowDivId] = prop;
                let rowHtml = "";
                rowHtml += "<div id='" + rowDivId + "' class='matrixRow " + "" + "'>";
                var statusClass = "matrixPropTitle_" + prop.status;
                let propDivId = "r" + common.getRandomHexaId(8);
                self.matrixDivsMap[propDivId] = { rowDivId: rowDivId, propId: propId };
                rowHtml += "<div id='" + propDivId + "' class='matrixRowTitle " + statusClass + "'>" + prop.classLabel + "." + prop.propertyLabel + "</div>";

                fitlersArray.forEach(function (propFilter) {
                    let cellDivId = "C" + common.getRandomHexaId(8);
                    self.matrixDivsMap[cellDivId] = { rowDivId: rowDivId, propId: propId, filterLabel: prop.filterLabel };
                    let cellHtml = "";
                    var cellClass = "";
                    cellClass = prop.propFilters[propFilter] == 1 ? "matrixCellMatch" : "";
                    cellHtml = "<div id='" + cellDivId + "' class='matrixCell " + cellClass + "' >&nbsp;</div>";
                    rowHtml += cellHtml;
                });

                html += rowHtml + "</div>";
            }

            $("#KGpropertyFilter_filteringResult").html(html);
            $("#KGpropertyFilter_filteringResult").animate({ zoom: 1.2 }, 400);
            $(".matrixRowTitle ").bind("click", KGpropertyFilter.matrix.onClickPropTitleDiv);
            $(".matrixCell ").bind("click", KGpropertyFilter.matrix.onClickPropCellDiv);
        },

        onClickPropTitleDiv: function (e) {
            var divId = $(this).attr("id");
            var prop = self.matrixDivsMap[divId];
            self.selectedMatrixProp = prop;
            var menuhtml = '    <span  class="popupMenuItem" onclick="KGpropertyFilter.matrix.removePropAllfilters();">remove prop</span>';
            $("#graphPopupDiv").html(menuhtml);
            var point = { x: e.clientX, y: e.clientY };
            MainController.UI.showPopup(point, "graphPopupDiv", true);
        },

        onClickPropCellDiv: function (e) {
            var divId = $(this).attr("id");
            var filter = self.matrixDivsMap[divId];
            self.selectedMatrixFilter = filter;
            var menuhtml = '    <span  class="popupMenuItem" onclick="KGpropertyFilter.matrix.removePropfilter();">remove prop</span>';
            $("#graphPopupDiv").html(menuhtml);
            var point = { x: e.clientX, y: e.clientY };
            MainController.UI.showPopup(point, "graphPopupDiv", true);
        },
        removePropAllfilters: function () {
            var prop = self.selectedMatrixProp;
            alert("coming soon");
        },
        removePropfilter: function () {
            var filter = (self.selectedMatrixFilter = filter);
            alert("coming soon");
        },

        exportMatrix: function () {
            return alert("coming soon");
        },
        copyMatrix: function () {
            return alert("coming soon");
            var html = $(".matrix").html();
            common.copyTextToClipboard(html);
        },
    };

    self.searchInPropertiesTree = function (event) {
        if (event.keyCode != 13 && event.keyCode != 9) return;
        var value = $("#KGpropertyFilter_searchInPropertiesTreeInput").val();
        $("#KGpropertyFilter_propertiesTreeDiv").jstree(true).search(value);
        $("#KGpropertyFilter_searchInPropertiesTreeInput").val("");
    };

    return self;
})();

export default KGpropertyFilter;

window.KGpropertyFilter = KGpropertyFilter;
