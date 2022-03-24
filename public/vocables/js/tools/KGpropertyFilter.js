var KGpropertyFilter = (function () {
    var self = {};
    self.currentSource = "CFIHOS_1_5_PLUS";
    self.propertyFilteringSource = "TSF-PROPERTY-FILTERING";
    self.loadedFilters = {};

    self.onLoaded = function () {
        Config.sources[self.propertyFilteringSource] = {
            isDictionary: true,
            editable: true,
            graphUri: "http://data.total.com/resource/tsf/property-filtering/",
            imports: [],
            sparql_server: {
                url: "_default",
            },
            controller: "Sparql_OWL",
            schemaType: "OWL",
        };
        var graphUri = Config.sources[self.propertyFilteringSource].graphUri;
        self.aspectMap = {
            Discipline: graphUri + "appliesToDiscipline",
            LifeCycle: graphUri + "appliesToLifeCycleStatus",
            Organization: graphUri + "appliesToOrganizationFilter",
        };
        $("#actionDivContolPanelDiv").load("snippets/KGpropertyFilter/leftPanel.html", function () {
            self.loadClassesProperties();
        });

        $("#graphDiv").load("snippets/KGpropertyFilter/centralPanel.html", function () {
            $("#KGcreator_centralPanelTabs").tabs({
                activate: function (e, ui) {
                    self.currentOwlType = "Class";
                    var divId = ui.newPanel.selector;
                    if (divId == "#LineageTypesTab") {
                    }
                },
            });
        });
        MainController.UI.toogleRightPanel(true);
        $("#rightPanelDiv").load("snippets/KGpropertyFilter/rightPanel.html", function () {
            $("#KGpropertyFilter_rightPanelTabs").tabs({
                activate: function (e, ui) {},
            });
            self.initRightPanel();
        });

        $("#accordion").accordion("option", { active: 2 });
    };

    self.loadClassesProperties = function () {
        var classIds = ["http://data.totalenergies.com/resource/ontology/cfihos_1.5/EquipmentClass/CFIHOS-30000521"];
        // classIds = null

        var options = { filter: "  FILTER (?prop=<http://standards.iso.org/iso/15926/part14/hasQuality>)" };
        Sparql_OWL.getObjectRestrictions(self.currentSource, classIds, options, function (err, result) {
            if (err) {
                return MainController.UI.message(err.responseText);
            }

            var jstreeData = [];
            var existingNodes = {};
            var restrictionIds = [];
            result.forEach(function (item) {
                if (!existingNodes[item.concept.value]) {
                    existingNodes[item.concept.value] = 1;
                    jstreeData.push({
                        id: item.concept.value,
                        text: item.conceptLabel.value,
                        parent: "#",
                        data: {
                            type: "class",
                            id: item.concept.value,
                            label: item.conceptLabel.value,
                        },
                    });
                }

                var id = item.concept.value + "_" + item.node.value;
                if (!existingNodes[id]) {
                    restrictionIds.push(id);
                    existingNodes[id] = 1;
                    jstreeData.push({
                        id: id,
                        text: item.valueLabel.value,
                        parent: item.concept.value,
                        data: {
                            type: "property",
                            propId: item.value.value,
                            propLabel: item.valueLabel.value,
                            retrictionId: item.node.value,
                        },
                    });
                }
            });

            common.array.sort(jstreeData, "text");
            var options = {
                openAll: true,
                withCheckboxes: true,
                selectTreeNodeFn: KGpropertyFilter.onPropertyNodeClicked,
                tie_selection: true,
                contextMenu: KGpropertyFilter.getPropertyTreeContextMenu(),
            };
            common.jstree.loadJsTree("KGpropertyFilter_propertiesTreeDiv", jstreeData, options);

            /*  self.loadPropertiesFilters(restrictionIds, function (err, result) {




                  });*/
        });
    };

    self.onPropertyNodeClicked = function (event, obj) {
        self.currentPropertyNode = obj.node;
        if (self.currentPropertyNode.parents.length > 1) self.currentClassId = self.currentPropertyNode.parents[1];
        else self.currentClassId = self.currentPropertyNode.id;
        $("#KGpropertyFilter_currentPropertyDiv").css("display", "block");
        $("#KGpropertyFilter_currentPropertySpan").html(obj.node.text);
        $("#KGpropertyFilter_currentPropertySpan2").html(obj.node.text);

        self.client.filterProperties(self.currentClassId);
    };
    self.getPropertyTreeContextMenu = function () {};

    self.getAssociatedProperties = function (selectId) {};

    self.associateFiltersToPropertyRestriction = function () {
        var existingNodesArray = common.jstree.getjsTreeNodes("KGpropertyFilter_propertiesTreeDiv", true, "#");
        var existingNodes = {};
        var dataset = [];
        existingNodesArray.forEach(function (item) {
            existingNodes[item] = 1;
        });

        var propertyObjs = $("#KGpropertyFilter_propertiesTreeDiv").jstree().get_checked(true);

        var filters = [];
        function execute(filterType, selectId) {
            var classId;
            var classObj;
            var classLabel;
            var classId;

            propertyObjs.forEach(function (propertyObj) {
                if (!propertyObj || propertyObj.parents.length < 2) return; //alert(" Select a property")
                //   var props=$("#KGpropertyFilter_propertiesTreeDiv").jstree().get_selected(true)
                //   props.forEach(function(prop) {
                classId = propertyObj.parent;
                classObj = $("#KGpropertyFilter_propertiesTreeDiv").jstree().get_node(classId);
                classLabel = classObj.data.label;
                classId = propertyObj.data.id;

                var aspectId = propertyObj.id + "_" + filterType;
                var items = $("#" + selectId)
                    .jstree()
                    .get_checked(true);
                items.forEach(function (item) {
                    // $("#" + selectId + " option:selected").each(function () {
                    var label = item.data.label;
                    var id = item.data.id;
                    var filterId = aspectId + "_" + id;
                    if (!existingNodes[filterId]) {
                        existingNodes[filterId] = 1;
                        filters.push({
                            type: "filterClass",
                            class: classLabel,
                            property: propertyObj.data.propLabel,
                            propertyId: propertyObj.data.propId,
                            classId: classId,
                            retrictionId: propertyObj.data.retrictionId,
                            aspect: filterType,
                            aspectClassId: id,
                            aspectClassLabel: label,
                        });
                    }
                });
            });
        }

        execute("LifeCycle", "KGpropertyFilter_lifeCycleTree");
        execute("Discipline", "KGpropertyFilter_disciplinesTree");
        execute("Organization", "KGpropertyFilter_organizationsTree");

        var columns = [
            { title: "Class", defaultContent: "" },
            { title: "Property", defaultContent: "" },
            { title: "Aspect", defaultContent: "" },
            { title: "Filter", defaultContent: "" },
        ];
        filters.forEach(function (item) {
            dataset.push([item.class, item.property, item.aspect, item.aspectClassLabel]);
        });
        Export.showDataTable("KGpropertyFilter_filteringResult", columns, dataset);
    };

    self.associateFiltersToPropertyRestrictionOld = function () {
        var existingNodesArray = common.jstree.getjsTreeNodes("KGpropertyFilter_propertiesTreeDiv", true, "#");
        var existingNodes = {};
        existingNodesArray.forEach(function (item) {
            existingNodes[item] = 1;
        });

        var propertyObjs = $("#KGpropertyFilter_propertiesTreeDiv").jstree().get_selected(true);
        propertyObjs.forEach(function (propertyObj) {
            if (!propertyObj || propertyObj.parents.length < 2) return alert(" Select a property");
            var classId = propertyObj.parent;

            function execute(filterType, selectId) {
                var items = $("#" + selectId).val();
                var jstreedata = [];
                var jstreedata2 = [];
                var aspectId = propertyObj.id + "_" + filterType;
                if (!existingNodes[aspectId]) {
                    existingNodes[aspectId] = 1;
                    jstreedata.push({
                        id: aspectId,
                        text: filterType,
                        parent: propertyObj.id,
                        data: {
                            type: "aspect",
                            value: filterType,
                        },
                    });
                }

                $("#" + selectId + " option:selected").each(function () {
                    var label = $(this).text();
                    var id = $(this).val();
                    var filterId = aspectId + "_" + id;
                    if (!existingNodes[filterId]) {
                        existingNodes[filterId] = 1;
                        jstreedata2.push({
                            id: filterId,
                            text: label,
                            parent: aspectId,
                            data: {
                                type: "filterClass",
                                retrictionId: propertyObj.data.retrictionId,
                                aspectKey: filterType,
                                aspectClassId: id,
                            },
                        });
                    }
                });
                if (jstreedata.length > 0) common.jstree.addNodesToJstree("KGpropertyFilter_propertiesTreeDiv", propertyObj.id, jstreedata);
                common.jstree.addNodesToJstree("KGpropertyFilter_propertiesTreeDiv", aspectId, jstreedata2);
            }

            execute("LifeCycle", "KGpropertyFilter_lifeCycleSelect");
            execute("Discipline", "KGpropertyFilter_disciplineSelect");
            execute("Organization", "KGpropertyFilter_organizationSelect");
        });
    };

    self.loadPropertiesFilters = function (ids, callback) {
        var existingNodesArray = []; //common.jstree.getjsTreeNodes("KGpropertyFilter_propertiesTreeDiv", false, "#")
        var ids = [];
        existingNodesArray.forEach(function (node) {
            if (node.data.type == "filterClass") {
                ids.push(node.data.retrictionId);
            }
        });
        var filter = Sparql_common.setFilter("concept", ids);
        Sparql_OWL.getItems(self.propertyFilteringSource, { filter, filter }, function (err, result) {
            callback(err);

            var filtersMap = {};
            result.forEach(function (item) {
                filtersMap[item];
            });
        });
    };

    self.generateRestrictionFilterTriples = function () {
        var existingNodesArray = common.jstree.getjsTreeNodes("KGpropertyFilter_propertiesTreeDiv", false, "#");
        var triples = [];
        existingNodesArray.forEach(function (node) {
            if (node.data.type == "filterClass") {
                triples.push({
                    subject: node.data.retrictionId,
                    predicate: self.aspectMap[node.data.aspectKey],
                    object: node.data.aspectClassId,
                });
            }
        });

        Sparql_generic.insertTriples(self.propertyFilteringSource, triples, { getSparqlOnly: false }, function (err, result) {
            if (err) return alert(err.responseText);
            MainController.UI.message(result + " filters created ");
        });

        //  existingNodesArray.
    };
    self.initRightPanel = function () {
        async.series(
            [
                function (callbackSeries) {
                    self.loadLifeCycleTree(function (err, result) {
                        callbackSeries(err);
                    });
                },
                function (callbackSeries) {
                    self.loadDisciplinesTree(function (err, result) {
                        callbackSeries(err);
                    });
                },
                function (callbackSeries) {
                    self.loadOrganizationsTree(function (err, result) {
                        callbackSeries(err);
                    });
                },
            ],
            function (err) {
                if (err) return alert(err.response.text);
            }
        );

        return;
    };
    self.onSelectFilter = function () {};

    self.loadLifeCycleTree = function (callback) {
        Sparql_OWL.getNodeChildren("ISO-15663", null, null, 2, {}, function (err, result) {
            if (err) return callback(err.responseText);
            var jstreeData = [];
            var existingNodes = {};
            result.forEach(function (item) {
                if (!existingNodes[item.concept.value]) {
                    existingNodes[item.concept.value] = 1;
                    jstreeData.push({
                        id: item.concept.value,
                        text: item.conceptLabel.value,
                        parent: "#",
                        data: {
                            id: item.concept.value,
                            label: item.conceptLabel.value,
                            source: "ISO-15663",
                        },
                    });
                }
                if (!existingNodes[item.child1.value]) {
                    existingNodes[item.child1.value] = 1;
                    jstreeData.push({
                        id: item.child1.value,
                        text: item.child1Label.value,
                        parent: item.concept.value,
                        data: {
                            id: item.child1.value,
                            label: item.child1Label.value,
                            source: "ISO-15663",
                        },
                    });
                }
            });
            common.array.sort(jstreeData, "text");
            var options = { openAll: false, withCheckboxes: true };
            common.jstree.loadJsTree("KGpropertyFilter_lifeCycleTree", jstreeData, options, function () {
                $("#KGpropertyFilter_lifeCycleTree").jstree().open_node("http://standards.iso.org/iso/15926/part14/Activity");
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
                if (!existingNodes[item.concept.value]) {
                    existingNodes[item.concept.value] = 1;
                    jstreeData.push({
                        id: item.concept.value,
                        text: item.conceptLabel.value,
                        parent: "#",
                        data: {
                            id: item.concept.value,
                            label: item.conceptLabel.value,
                            source: "ISO-15663",
                        },
                    });
                }
                if (!existingNodes[item.child1.value]) {
                    existingNodes[item.child1.value] = 1;
                    jstreeData.push({
                        id: item.child1.value,
                        text: item.child1Label.value,
                        parent: item.concept.value,
                        data: {
                            id: item.child1.value,
                            label: item.child1Label.value,
                            source: "ISO-15663",
                        },
                    });
                }
            });
            var options = { openAll: true, withCheckboxes: true };
            common.array.sort(jstreeData, "text");
            common.jstree.loadJsTree("KGpropertyFilter_disciplinesTree", jstreeData, options);
            callback();
        });
    };
    self.loadOrganizationsTree = function (callback) {
        Sparql_OWL.getNodeChildren("ISO_15926-org", null, ["http://data.15926.org/lci/Organization"], 2, {}, function (err, result) {
            if (err) return callback(err.responseText);
            var jstreeData = [];
            var existingNodes = {};
            result.forEach(function (item) {
                if (!existingNodes[item.concept.value]) {
                    existingNodes[item.concept.value] = 1;
                    jstreeData.push({
                        id: item.concept.value,
                        text: item.conceptLabel.value,
                        parent: "#",
                        data: {
                            id: item.concept.value,
                            label: item.conceptLabel.value,
                            source: "ISO-15663",
                        },
                    });
                }
                if (!existingNodes[item.child1.value]) {
                    existingNodes[item.child1.value] = 1;
                    jstreeData.push({
                        id: item.child1.value,
                        text: item.child1Label.value,
                        parent: item.concept.value,
                        data: {
                            id: item.child1.value,
                            label: item.child1Label.value,
                            source: "ISO-15663",
                        },
                    });
                }
            });
            common.array.sort(jstreeData, "text");
            var options = { openAll: true, withCheckboxes: true };
            common.jstree.loadJsTree("KGpropertyFilter_organizationsTree", jstreeData, options);
            callback();
        });
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
            " ?restriction owl:onProperty <http://standards.iso.org/iso/15926/part14/hasQuality>.\n" +
            " ?restriction owl:someValuesFrom ?property.\n" +
            "   ?property rdfs:label ?propertyLabel.\n";

        if (classIds) sparql += Sparql_common.setFilter("class", classIds);

        function addFilters(aspect, selectId) {
            var filterId = $("#" + selectId).val();
            if (!filterId) return;
            var predicate = self.aspectMap[aspect];
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

    self.client = {
        filterProperties: function (allClasses) {
            return;
            var classId = null;
            if (!allClasses) classId = self.currentClassId;

            self.execSparqlFilterQuery(classId, function (err, result) {
                if (err) return MainController.UI.message(err.responseText);
                var columns = [
                    { title: "Class", defaultContent: "" },
                    { title: "Property", defaultContent: "" },
                    { title: "ClassUri", defaultContent: "" },
                    { title: "PropertyUri", defaultContent: "" },
                ];
                var dataset = [];
                result.forEach(function (item) {
                    dataset.push([item.classLabel, item.propertyLabel, item.class, item.property]);
                });
                Export.showDataTable("KGpropertyFilter_filteringResult", columns, dataset);
            });
        },
    };

    return self;
})();
