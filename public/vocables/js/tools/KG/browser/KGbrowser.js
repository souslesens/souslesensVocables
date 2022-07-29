var KGbrowser = (function () {
    var self = {};
    var typeColors = {};
    var sourceShape = {};
    self.aspectsChildrenDepth = 8;
    self.OneModelDictionary = {};
    self.oneModelClasses = {};
    self.queryTypesArray = [];
    self.defaultNodeSize = 10;

    self.getPropertyColor = function (type, palette) {
        //  return KGbrowserCustom.superClassesMap(type);
        // eslint-disable-next-line no-unreachable
        if (!palette) palette = "paletteIntense";
        if (!typeColors[type]) typeColors[type] = common[palette][Object.keys(typeColors).length];
        return typeColors[type];
    };

    var shapesPalette = ["dot", "square", "triangle", "triangleDown", "hexagon", "star", "diamond"];
    self.getSourceShape = function (source) {
        if (!sourceShape[source]) sourceShape[source] = shapesPalette[Object.keys(sourceShape).length];
        return sourceShape[source];
    };

    self.onLoaded = function (callback) {
        $("#sourceDivControlPanelDiv").html("");
        MainController.UI.message("");
        KGbrowserCustom.initsuperClassesPalette();

        $("#accordion").accordion("option", { active: 1 });
        MainController.UI.openRightPanel();
        $("#rightPanelDiv").load("snippets/KG/KGbrowserRightPanel.html", function () {
            $("#KGbrowser_accordion").accordion();
            $("#KGbrowser_accordion").accordion("option", { active: 0 });
            $("#KGbrowser_accordion").on("accordionbeforeactivate", function (event, ui) {
                if (!KGmappings.checkMappingEditionSave()) return false;
            });
            $("#KGbrowser_accordion").on("accordionactivate", function (event, ui) {
                if (ui.newPanel[0].id == "KGbrowser_GraphTab") {
                    KGbrowserGraph.initGraphTab();
                }
            });

            SourceBrowser.currentTargetDiv = "KGbrowserItemsjsTreeDiv";
            $("#GenericTools_searchSchemaType").val("INDIVIDUAL");
            $("#sourcesTreeDiv").load("snippets/KG/KGbrowser.html", function () {
                self.jstree.load.loadAdlsList();
            });
            if (callback) callback();
        });
    };

    self.initOneModelDictionary = function () {
        var schema;
        async.series(
            [
                function (callbackSeries) {
                    OwlSchema.initSourceSchema(Config.KG.OneModelSource, function (err, _schema) {
                        schema = _schema;
                        if (err) return callbackSeries(err);
                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    Sparql_schema.getPropertiesRangeAndDomain(schema, null, null, null, function (err, result) {
                        if (err) callbackSeries(err);
                        result.forEach(function (item) {
                            if (item.propertyLabel) self.OneModelDictionary[item.property.value] = item.propertyLabel.value;
                            else self.OneModelDictionary[item.property.value] = item.property.value.substring(item.propertyLabel.value.lastIndexOf("/") + 1);

                            if (item.subProperty) {
                                if (item.subPropertyLabel) self.OneModelDictionary[item.subProperty.value] = item.subPropertyLabel.value;
                                else self.OneModelDictionary[item.subProperty.value] = item.property.value.substring(item.subProperty.value.lastIndexOf("/") + 1);
                            }
                        });
                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    Sparql_schema.getClasses(schema, null, function (_err, result) {
                        result.forEach(function (item) {
                            var classLabel = null;
                            if (item.classLabel) classLabel = item.classLabel.value;
                            else classLabel = item.class.value.substring(item.class.value.lastIndexOf("/") + 1);
                            self.oneModelClasses[item.class.value] = classLabel;

                            self.OneModelDictionary[item.class.value] = classLabel;
                        });
                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    Sparql_schema.getRestrictions(schema, null, function (_err, result) {
                        result.forEach(function (item) {
                            self.OneModelDictionary[item.domain.value] = item.domainLabel.value;
                            self.OneModelDictionary[item.prop.value] = item.propLabel.value;
                            self.OneModelDictionary[item.range.value] = item.range.value;
                        });
                        callbackSeries();
                    });
                },
            ],
            function (err) {
                if (err) return MainController.UI.message(err);
            }
        );
    };

    self.searchAllSourcesTerm = function () {
        MainController.UI.message("searching...");
        $("#waitImg").css("display", "flex");

        $("#KGbrowserItemsjsTreeDiv").jstree(true).delete_node($("#KGbrowserItemsjsTreeDiv").jstree(true).get_node(self.currentSource).children);

        var words = $("#KGbrowser_searchAllSourcesTermInput").val();
        var exactMatch = $("#KGbrowser_allExactMatchSearchCBX").prop("checked");
        var type = $("#KGbrowser_searchAllSourcestypeSelect").val();
        Sparql_INDIVIDUALS.findByWords(
            self.currentSource,
            words,
            {
                exactMatch: exactMatch,
                type: type,
            },
            function (err, result) {
                if (err) return MainController.UI.message(err);

                if (result.length == 0) {
                    MainController.UI.message("no  data found");
                    return $("#waitImg").css("display", "none");
                }

                MainController.UI.message("displaying nodes...");
                var existingNodes = {};
                var jstreeData = [];
                result.forEach(function (item) {
                    if (!existingNodes[item.sub.value]) {
                        existingNodes[item.sub.value] = 1;
                        jstreeData.push({
                            id: item.sub.value,
                            text: item.objLabel.value,
                            parent: self.currentSource, // item.type.value, // type makes query execution longer
                            data: {
                                sourceType: "adl",
                                role: "sub|obj",
                                id: item.sub.value,
                                label: item.objLabel.value,
                                source: self.currentSource,
                            },
                        });
                    }
                });

                common.jstree.addNodesToJstree("KGbrowserItemsjsTreeDiv", self.currentSource, jstreeData);
                MainController.UI.message("");
                $("#waitImg").css("display", "none");
            }
        );
    };

    self.showNodeInfos = function (node) {
        if (!node) node = self.currentJstreeNode;
        source = self.currentSource;
        SourceBrowser.showNodeInfos(source, node, "mainDialogDiv");
    };

    self.getRdlJstreeData = function (parent, parentType, callback) {
        var fromStr = Sparql_common.getFromStr(Config.KG.RDLsource);
        var query =
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "SELECT distinct * " +
            fromStr +
            " WHERE {" +
            "  ?id rdf:type ?type ." +
            "   ?id rdfs:label ?label ." +
            "  ?id rdfs:subClassOf  <" +
            parent +
            ">";

        var limit = Config.queryLimit;
        query += " } limit " + limit;

        var url = Config.sources[Config.KG.RDLsource].sparql_server.url + "?format=json&query=";
        MainController.UI.message("searching...");
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: Config.KG.RDLsource }, function (err, result) {
            if (err) {
                return callback(err);
            }

            var jstreeData = [];

            result.results.bindings.forEach(function (item) {
                jstreeData.push({
                    id: item.id.value,
                    text: item.label.value,
                    parent: parent,
                    data: {
                        sourceType: "rdl",
                        role: "sub",
                        id: item.id.value,
                        label: item.label.value,
                        source: Config.KG.RDLsource,
                        type: parentType,
                    },
                });
            });
            MainController.UI.message("");
            return callback(null, jstreeData);
        });
    };

    self.jstree = {
        events: {
            onSelectNodeRdl: function (_event, obj) {
                //   KGbrowser.currentJstreeNode = obj.node;
                if (obj.node.children.length == 0)
                    KGbrowser.getRdlJstreeData(obj.node.data.id, obj.node.data.type, function (err, result) {
                        if (err) return MainController.UI.message(err);
                        common.jstree.addNodesToJstree("KGbrowser_rdlJstreeDiv", obj.node.data.id, result);
                    });
                $("#KGbrowser_rdlJstreeDiv").jstree(true).settings.contextmenu.items = self.jstree.getJstreeConceptsContextMenu("KGbrowser_rdlJstreeDiv");
            },
            onSelectNodeAdlList: function (_event, data) {
                self.currentJstreeNode = data.node;
                $("#KGbrowserItemsjsTreeDiv").jstree(true).settings.contextmenu.items = self.jstree.getJstreeConceptsContextMenu("KGbrowserItemsjsTreeDiv");
                if (data.node.parent != "#") {
                    // after search
                    KGbrowserQuery.setFilterFromSearchedTerm(data.node);
                } else {
                    MainController.writeUserLog(authentication.currentUser, "KGbrowser", data.node.id);

                    if (self.currentSource != data.node.id) self.adlJstreeData = null;
                    self.currentSource = data.node.id;
                    self.jstree.load.loadAdl();
                }

                self.adlModelCache = {};
                self.queryTypesArray = [];
            },
            onSelectNodeOneModel: function (_e, obj) {
                KGbrowser.currentJstreeNode = obj.node;
                //   KGbrowser.currentJstreeNode = obj.node;
                $("#KGbrowser_oneModelJstreeDiv").jstree(true).settings.contextmenu.items = self.jstree.getJstreeConceptsContextMenu("KGbrowser_oneModelJstreeDiv");
            },
            onSelectNodeAdl: function (_e, obj) {
                KGbrowser.currentJstreeNode = obj.node;
                self.queryMode = "graph";
                self.query.showQueryParamsDialog({ x: w - 100, y: h / 3 });
                $("#KGbrowser_adlJstreeDiv").jstree(true).settings.contextmenu.items = self.jstree.getJstreeConceptsContextMenu("KGbrowser_adlJstreeDiv");
            },

            onSelectNodeQuery: function (_e, obj) {
                KGbrowser.currentJstreeQueryNode = obj.node;
                $("#KGbrowser_adlJstreeDiv").jstree(true).settings.contextmenu.items = self.jstree.getJstreeQueryContextMenu();
            },
        },

        load: {
            loadAdlsList: function () {
                var jstreeData = [];
                for (var source in Config.sources) {
                    if (Config.sources[source].schemaType == "KNOWLEDGE_GRAPH")
                        jstreeData.push({
                            id: source,
                            text: source,
                            type: "class",
                            parent: "#",
                        });
                }
                var options = {
                    selectTreeNodeFn: self.jstree.events.onSelectNodeAdlList,
                    contextMenu: self.jstree.getJstreeConceptsContextMenu("KGbrowserItemsjsTreeDiv"),
                };
                common.jstree.loadJsTree("KGbrowserItemsjsTreeDiv", jstreeData, options, function (_err, _result) {
                    // Pass
                });
            },
            loadOneModel: function () {
                var jstreeData = [
                    {
                        id: "http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/Location",
                        text: "<span class='aspect_Location'>Location</span>",
                        type: "Location",
                        parent: "#",
                    },

                    {
                        id: "http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/FunctionalObject",
                        text: "<span class='aspect_Function'>Function</span>",
                        type: "Function",
                        parent: "#",
                    },
                    {
                        id: "http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/Aspect",
                        text: "<span class='aspect_Function'>Aspect</span>",
                        type: "Function",
                        parent: "http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/FunctionalObject",
                    },
                    {
                        id: "http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/PhysicalObject",
                        text: "<span class='aspect_Product'>Product</span>",
                        type: "Product",
                        parent: "#",
                    },
                    {
                        id: "http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/Activity",
                        text: "<span class='aspect_LifeCycle'>LifeCycle</span>",
                        type: "LifeCycle",
                        parent: "#",
                    },
                ];

                async.eachSeries(
                    jstreeData,
                    function (topAspect, callbackEach) {
                        Sparql_generic.getNodeChildren(Config.KG.OneModelSource, null, topAspect.id, self.aspectsChildrenDepth, null, function (err, result) {
                            if (err) return callbackEach(err);
                            result.forEach(function (item) {
                                for (var i = 1; i < self.aspectsChildrenDepth; i++) {
                                    if (item["child" + i]) {
                                        var parent;
                                        self.OneModelDictionary[item.concept.value] = item.conceptLabel.value;
                                        parent = topAspect.id;

                                        if (item["child" + i] && !item["child" + (i + 1)]) {
                                            self.OneModelDictionary[item["child" + i].value] = item["child" + i + "Label"].value;
                                            jstreeData.push({
                                                id: item["child" + i].value,
                                                text: item["child" + i + "Label"].value,
                                                parent: parent,
                                                data: {
                                                    sourceType: "oneModel",
                                                    source: Config.KG.OneModelSource,
                                                    id: item["child" + i].value,
                                                    label: item["child" + i + "Label"].value,
                                                },
                                            });
                                        }
                                    } else break;
                                }
                            });

                            callbackEach();
                        });
                    },
                    function (err) {
                        if (err) MainController.UI.message(err);
                        var options = {
                            selectTreeNodeFn: self.jstree.events.onSelectNodeOneModel,
                            contextMenu: self.jstree.getJstreeConceptsContextMenu("KGbrowser_oneModelJstreeDiv"),

                            openAll: true,
                        };
                        common.jstree.loadJsTree("KGbrowser_oneModelJstreeDiv", jstreeData, options, function (_err, _result) {
                            // Pass
                        });
                    }
                );
            },
            loadRdl: function (_aspectNode) {
                var topObjects = {
                    "http://data.total.com/resource/one-model/quantum-rdl/TOTAL-F0000000801": {
                        label: "Functional Objects",
                        type: "http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/FunctionalObject",
                    },
                    "http://data.total.com/resource/one-model/quantum-rdl/TOTAL-P0000001723": {
                        label: "Physical Objects",
                        type: "http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/PhysicalObject",
                    },
                    "http://data.total.com/resource/one-model/quantum-rdl/TOTAL-B0000000000": {
                        label: "Disciplines",
                        type: "http://w3id.org/readi/z018-rdl/Discipline",
                    },
                    "http://data.total.com/resource/one-model/quantum-rdl/TOTAL-A0000000000": {
                        label: "Attributes",
                        type: "http://data.total.com/resource/one-model/ontology#TOTAL-Attribute",
                    },
                    // "https://w3id.org/requirement-ontology/rdl/REQ_0011": {label: "Attributes", type: "http://data.total.com/resource/one-model/ontology#TOTAL-Attribute"}
                };
                var topIds = Object.keys(topObjects);
                var jstreeData = [];
                async.eachSeries(
                    topIds,
                    function (parentId, callbackEach) {
                        var parentType = Config.KG.topRdlObjects[parentId].type;
                        self.getRdlJstreeData(parentId, parentType, function (err, result) {
                            if (err) return MainController.UI.message(err);
                            jstreeData.push({
                                id: parentId,
                                text: topObjects[parentId].label,
                                parent: "#",

                                data: {
                                    sourceType: "rdl",
                                    role: "sub",
                                    id: parentId,
                                    label: Config.KG.topRdlObjects[parentId].label,
                                    type: parentType,
                                    source: Config.KG.RDLsource,
                                },
                            });
                            result.forEach(function (item) {
                                jstreeData.push(item);
                            });
                            callbackEach();
                        });
                    },
                    function (_err) {
                        var options = {
                            selectTreeNodeFn: self.jstree.events.onSelectNodeRdl,
                            contextMenu: self.jstree.getJstreeConceptsContextMenu("KGbrowser_rdlJstreeDiv"),
                        };
                        common.jstree.loadJsTree("KGbrowser_rdlJstreeDiv", jstreeData, options);
                    }
                );
            },
            loadAdl: function (node) {
                return KGbrowserQuery.loadAdl(node);
            },
        },
        updateAdlTree: function (node) {
            self.query.getAdlModel(node.data.id, self.currentSource, "subjectOrObject", function (_err, result) {
                var jstreeData = [];

                var existingNodes = {};

                var isNewTree = self.queryTypesArray.length < 2;
                if (!isNewTree) {
                    var existingNodesArray = common.jstree.getjsTreeNodes("KGbrowser_adlJstreeDiv", true, "#");
                    existingNodesArray.forEach(function (item) {
                        existingNodes[item] = 1;
                    });
                }

                result.forEach(function (item) {
                    var targetNode;

                    if (node.data.id != item.subType.value) {
                        targetNode = item.subType;
                    } else {
                        targetNode = item.objType;
                    }
                    if (!existingNodes[node.data.id]) {
                        existingNodes[node.data.id] = 1;
                        jstreeData.push({
                            id: node.data.id,
                            text: "<span class='adlNode' style='color: " + self.getPropertyColor(node.data.id) + "'>" + node.data.label + "</span>",
                            parent: "#",
                            data: node.data,
                        });
                    }
                    var propValueId = item.prop.value + "_" + targetNode.value;
                    if (!existingNodes[propValueId]) {
                        existingNodes[propValueId] = 1;
                        var label;
                        if (self.oneModelDescription.allObjectsMap[targetNode.value]) label = self.oneModelDescription.allObjectsMap[targetNode.value].label;
                        else label = self.OneModelDictionary[targetNode.value];
                        var propsLabel = "(" + self.OneModelDictionary[item.prop.value] + ")";
                        if (!self.oneModelDescription.allObjectsMap[targetNode.value]) self.oneModelDescription.allObjectsMap[targetNode.value] = { label: targetNode.value };
                        jstreeData.push({
                            id: propValueId,
                            text: "<span class='adlNode' style='color: " + self.getPropertyColor(propValueId) + "'>" + label + "</span> " + propsLabel,
                            parent: node.data.id,
                            data: {
                                role: "sub|obj",
                                property: item.prop.value,
                                id: targetNode.value,
                                label: self.oneModelDescription.allObjectsMap[targetNode.value].label,
                                source: self.currentSource,
                            },
                        });
                    }
                });

                if (isNewTree) {
                    var options = {
                        selectTreeNodeFn: self.jstree.events.onSelectNodeAdl,
                        openAll: true,
                        doNotAdjustDimensions: true,
                        contextMenu: self.jstree.getJstreeConceptsContextMenu("KGbrowser_adlJstreeDiv"),
                    };
                    //  common.fillSelectOptions("KGbrowser_searchAllSourcestypeSelect", typesArray, true)
                    common.jstree.loadJsTree("KGbrowser_adlJstreeDiv", jstreeData, options);
                } else {
                    common.jstree.addNodesToJstree("KGbrowser_adlJstreeDiv", "#", jstreeData);
                }
            });
        },
        getJstreeConceptsContextMenu: function (_jstreeDivId) {
            var items = {};
            $("#waitImg").css("display", "none");
            MainController.UI.message("");
            items.addFilteredNodesToQuery = {
                label: "add to query",
                action: function (_e, _xx) {
                    // pb avec source
                    if (!self.currentSource) return alert("select a source");
                    self.queryMode = "query";
                    self.query.addNodeToQueryTree(self.currentJstreeNode);
                },
            };
            items.addFilteredNodesToGraph = {
                label: "graph filtered nodes",
                action: function (e, _xx) {
                    // pb avec source
                    if (!self.currentSource) return alert("select a source");
                    self.queryMode = "graph";
                    self.query.showQueryParamsDialog(e.position);
                },
            };
            items.nodeInfos = {
                label: "node infos",
                action: function (_e, _xx) {
                    // pb avec source
                    self.showNodeInfos();
                },
            };

            items.removeNodesFromGraph = {
                label: "remove nodes from graph",
                action: function (_e) {
                    // pb avec source
                    self.jstree.menuActions.removeNodesFromGraph(self.currentJstreeNode);
                },
            };

            return items;
        },

        getJstreeQueryContextMenu: function (_jstreeDivId) {
            var items = {};

            $("#waitImg").css("display", "none");
            MainController.UI.message("");

            (items.addFilter = {
                label: "add filter",
                action: function (e) {
                    // pb avec source
                    self.jstree.menuActions.addQueryFilter(e.position);
                },
            }),
                (items.removeFilter = {
                    label: "remove filter",
                    action: function (_e) {
                        // pb avec source
                        self.jstree.menuActions.removeQueryFilter();
                    },
                });

            return items;
        },
        menuActions: {
            addAllNodesToGraph: function (node) {
                MainController.UI.message("searching...");
                $("#waitImg").css("display", "flex");
                if (node) {
                    KGbrowserGraph.drawGraph(node);
                }
            },
            removeNodesFromGraph: function (_node) {
                // Path
            },
            addQueryFilter: function (position) {
                var properties = [KGbrowser.currentJstreeQueryNode.data];
                common.fillSelectOptions("KGbrowserQueryParams_property", properties, false, "label", "id");
                $("#KGbrowserQueryParamsDialog").css("left", position.x);
                $("#KGbrowserQueryParamsDialog").css("top", position.y);
                $("#KGbrowserQueryParamsDialog").css("display", "block");
            },
            removeQueryFilter: function () {
                $("#KGbrowser_queryTreeDiv").jstree(true).delete_node(KGbrowser.currentJstreeQueryNode.id);
            },
        },
    };

    self.query = {
        getOneModelDescription: function (callback) {
            KGcommon.Ontology.load(Config.KG.OneModelSource, function (err, result) {
                if (err) {
                    callback(err);
                }
                self.oneModelDescription = result;
                callback(null, result);
            });
        },

        getKGclassesList: function (source, callback) {
            var fromStr = Sparql_common.getFromStr(self.currentSource);

            var query =
                "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX owl: <http://www.w3.org/2002/07/owl#> select distinct ?type" +
                fromStr +
                "WHERE {?sub rdf:type ?type}";

            var url = Config.sources[source].sparql_server.url + "?format=json&query=";

            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
                if (err) {
                    return callback(err);
                }
                var array = [];
                result.results.bindings.forEach(function (item) {
                    array.push(item.type.value);
                });
                return callback(null, array);
            });
        },

        getAdlModel: function (subjectType, source, mode, callback) {
            if (!source) source = self.currentSource;
            if (!self.adlModelCache) self.adlModelCache = {};

            if (self.adlModelCache[subjectType + "_" + mode]) {
                return callback(null, self.adlModelCache[subjectType + "_" + mode]);
            }
            var model = [];
            async.series(
                [
                    function (callbackSeries) {
                        var fromStr = Sparql_common.getFromStr(self.currentSource);
                        var filterStr = "";

                        var query =
                            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX owl: <http://www.w3.org/2002/07/owl#> select distinct ?prop ?subType ?objType" +
                            fromStr;
                        if (subjectType == "all") {
                            query +=
                                "WHERE {?sub ?prop ?obj.filter (?prop !=<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>) {?sub rdf:type  ?subType. " +
                                filterStr +
                                "}  optional{?obj rdf:type ?objType}";
                        } else if (mode == "subject") {
                            filterStr = "filter (?subType=<" + subjectType + "> ) ";
                            query +=
                                "WHERE {?sub ?prop ?obj.filter (?prop !=<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>) {?sub rdf:type  ?subType. " +
                                filterStr +
                                "}  optional{?obj rdf:type ?objType}";
                        } else if (mode == "subjectOrObject") {
                            filterStr = "filter (?subType=<" + subjectType + ">  || ?objType=<" + subjectType + "> ) ";
                            query +=
                                "WHERE {   ?sub ?prop ?obj. ?sub rdf:type ?subType. ?obj rdf:type ?objType." + filterStr + " optional {?sub rdfs:label ?subLabel} optional{?obj rdfs:label ?objLabel}";
                        }
                        query += "}";
                        var url = Config.sources[source].sparql_server.url + "?format=json&query=";
                        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
                            if (err) {
                                return callbackSeries(err);
                            }
                            //   result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["prop", "subType", "objType"])
                            self.adlModelCache[subjectType + "_" + mode] = result.results.bindings;
                            model = result.results.bindings;
                            return callbackSeries();
                        });
                    },
                    function (callbackSeries) {
                        var model2 = [];
                        model.forEach(function (item) {
                            if (self.oneModelClasses[item.subType.value]) model2.push(item);
                        });
                        model = model2;

                        return callbackSeries();
                    },
                ],
                function (err) {
                    if (err) return callback(err);
                    return callback(null, model);
                }
            );
        },

        getNodeProperties: function (node, callback) {
            if (node.data.role == "pred") return [node.data.id];

            self.query.getAdlModel(node.data.type || node.data.id, null, "subject", function (err, result) {
                if (err) {
                    return callback(err);
                }
                var properties = [];
                result.forEach(function (item) {
                    var objectType = "any";
                    if (item.objType) objectType = item.objType.value;
                    properties.push({
                        property: item.prop.value,
                        objectType: objectType,
                        propertyLabel: self.OneModelDictionary[item.prop.value] || item.prop.value,
                        objectTypeLabel: self.OneModelDictionary[objectType] || objectType,
                    });
                });
                return callback(null, properties);
            });
        },
        showQueryParamsDialog: function (position) {
            self.currentQueryDialogField = self.currentJstreeNode.data.id;
            self.query.showNodeProperties(self.currentJstreeNode);
            $("#KGbrowserQueryParams_typeSelect").css("display", "none");

            $("#KGbrowserQueryParamsDialog").css("left", position.x - 200);
            $("#KGbrowserQueryParamsDialog").css("top", position.y);
            $("#KGbrowserQueryParamsDialog").css("display", "block");
            setTimeout(function () {
                $("#KGbrowserQueryParams_operator").val("=");
                $("#KGbrowserQueryParams_value").val("");
                $("#KGbrowserQueryParams_valuesSelect").val("");
                common.fillSelectOptions("KGbrowserQueryParams_valuesSelect", [""]);
            }, 500);
        },

        showNodeProperties: function (node) {
            self.query.getNodeProperties(node, function (_err, properties) {
                var withBlankOption = false;
                if (properties.length > 1) withBlankOption = true;
                $("#KGbrowserQueryParams_type").html(node.data.label);
                common.fillSelectOptions("KGbrowserQueryParams_property", properties, withBlankOption, "propertyLabel", "property", "http://www.w3.org/2000/01/rdf-schema#label");
            });
        },
        onSelectDialogField: function (type) {
            self.currentQueryDialogField = type;
            self.query.showNodeProperties({ data: { type: type, id: type, label: self.OneModelDictionary[type] } });
        },

        onQueryParamsDialogValidate: function (logicalMode) {
            var property = $("#KGbrowserQueryParams_property").val();
            var operator = $("#KGbrowserQueryParams_operator").val();
            var value = $("#KGbrowserQueryParams_value").val();
            $("#KGbrowserQueryParamsDialog").css("display", "none");
            var filterStr = "";
            var numberOperators = ("<", ">", "<=", ">=");
            var typeVarName;
            if (logicalMode == "union")
                //self.queryTypesArray.length == 0)
                typeVarName = "?sub";
            else typeVarName = "?obj";

            if (property && property != "") {
                if (value && value != "") {
                    if (operator == "contains") filterStr = typeVarName + " <" + property + "> ?x. filter ( regex(?x,'" + value + "','i')) ";
                    else if (operator == "not contains") filterStr = typeVarName + " <" + property + "> ?x. filter regex(?x, '^((?!" + value + ").)*$','i') ";
                    else if ($("#KGbrowserQueryParams_valuesSelect").val() != "") {
                        if (value.indexOf("http") > -1) filterStr = typeVarName + " <" + property + "> ?x. filter (?x =<" + value + ">) ";
                        else filterStr = typeVarName + " <" + property + "> ?x. filter (?x " + operator + "'" + value + "') ";
                    } else if (numberOperators.indexOf(operator) > -1) filterStr = typeVarName + " <" + property + "> ?x. filter ( xsd:float(?x)" + operator + value + ") ";
                    else filterStr = typeVarName + " <" + property + "> ?x. filter (?x " + operator + value + ") ";
                } else {
                    filterStr = typeVarName + " <" + property + "> ?x. ";
                }
            }
            var filterLabel = property + " " + operator + " " + value;

            if (self.queryMode == "graph") {
                var options = { filter: filterStr, logicalMode: logicalMode };
                KGbrowserGraph.drawGraph(self.currentJstreeNode, options, function (err, result) {
                    $("#waitImg").css("display", "none");
                    if (err) return MainController.UI.message(err);
                    if (result == 0) return alert("no data found");
                    // self.jstree.updateAdlTree(self.currentJstreeNode)
                });
            } else if (self.queryMode == "query") {
                self.query.addFilterToQueryTree({ label: filterLabel, content: filterStr }, function (err, result) {
                    $("#waitImg").css("display", "none");
                    if (err || result == 0) return;
                    //  self.jstree.updateAdlTree(self.currentJstreeNode)
                });
            }
        },

        onQueryParamsDialogCancel: function () {
            $("#KGbrowserQueryParamsDialog").css("display", "none");
        },
        addNodeToQueryTree: function (node, _prop) {
            self.query.getAdlModel(node.data.type || node.data.id, null, "subject", function (err, result) {
                var isNewTree = $("#KGbrowser_queryTreeDiv").is(":empty");
                var existingNodes = [];
                if (!isNewTree) existingNodes = common.jstree.getjsTreeNodes("KGbrowser_queryTreeDiv", true);
                var jstreeData = [];
                var typeId = "type" + common.getRandomHexaId(5);
                if (existingNodes.indexOf(node.data.id) < 0) {
                    jstreeData.push({
                        id: typeId,
                        text: Sparql_common.getLabelFromURI(node.data.label),
                        parent: "#",
                        data: {
                            type: "type",
                            id: node.data.id,
                            label: node.data.label,
                            role: node.data.role,
                            sourceType: node.data.sourceType,
                        },
                    });
                    if (!isNewTree) {
                        var options = {};

                        common.jstree.addNodesToJstree("KGbrowser_queryTreeDiv", "#", jstreeData);
                        jstreeData = [];
                    }
                    setTimeout(function () {
                        $("#KGbrowser_queryTreeDiv").jstree(true).select_node(node.data.id);
                    }, 200);
                }

                if (err) {
                    return callback(err);
                }
                result.forEach(function (item) {
                    if (existingNodes.indexOf(item.prop.id) < 0) {
                        jstreeData.push({
                            id: "prop" + common.getRandomHexaId(5),
                            text: item.propLabel.value,
                            parent: typeId,
                            data: {
                                label: item.propLabel.value,
                                id: item.prop.value,
                                type: "property",
                                parent: node.data.id,
                                range: node.data.subType,
                                role: node.data.role,
                                sourceType: node.data.sourceType,
                            },
                        });
                    }
                });

                if (isNewTree) {
                    options = {
                        selectTreeNodeFn: self.jstree.events.onSelectNodeQuery,
                        contextMenu: self.jstree.getJstreeQueryContextMenu("KGbrowser_queryTreeDiv"),

                        openAll: true,
                        withCheckboxes: true,
                    };
                    common.jstree.loadJsTree("KGbrowser_queryTreeDiv", jstreeData, options);
                } else {
                    common.jstree.addNodesToJstree("KGbrowser_queryTreeDiv", node.data.id, jstreeData);
                }
            });
        },
        addFilterToQueryTree: function (_filterObj) {
            return;
        },
        listQueryParamsDialogFieldValues() {
            var field = self.currentJstreeNode.data.id;
            var property = $("#KGbrowserQueryParams_property").val();
            var value = $("#KGbrowserQueryParams_value").val();

            var filter = "";
            if (value != "") filter = 'FILTER (regex(?obj, "^' + value + '", "i") || regex(?objLabelLabel, "^' + value + '", "i") )';

            var filterGraphStr = "";
            /*   if( KGbrowser.currentGraphNodeSelection)
                   filterGraphStr = Sparql_common.setFilter("sub",KGbrowser.currentGraphNodeSelection.id)*/

            if (!property || property == "") return alert("select a property");
            var fromStr = Sparql_common.getFromStr(self.currentSource);
            var query =
                " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> PREFIX owl:<http://www.w3.org/2002/07/owl#> " +
                "Select  distinct ?obj ?objLabel " +
                fromStr +
                " where {" +
                " ?sub <" +
                property +
                "> ?obj . ?sub rdf:type <" +
                field +
                ">. optional {?obj rdfs:label ?objLabel}" +
                filter +
                filterGraphStr +
                "} order by ?objLabel  ?obj limit " +
                Config.KG.queryLimit;
            var url = Config.sources[self.currentSource].sparql_server.url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, {}, { source: self.currentSource }, function (err, result) {
                if (err) return MainController.UI.message(err);
                if (result.results.bindings.length > Config.KG.queryLimit) return alert("Too many values found : > " + result.results.bindings.length);
                var data = [];
                result.results.bindings.forEach(function (item) {
                    var label;
                    if (!item.objLabel) label = item.obj.value;
                    else label = item.objLabel.value;
                    data.push({ id: item.obj.value, label: label });
                });
                common.fillSelectOptions("KGbrowserQueryParams_valuesSelect", data, true, "label", "id");
            });
        },
        onQueryParamsListChange: function () {
            var value = $("#KGbrowserQueryParams_valuesSelect").val();
            if (value == "List...") {
                KGbrowser.query.listQueryParamsDialogFieldValues();
            } else {
                $("#KGbrowserQueryParams_value").val(value);
            }
        },
        clear() {
            self.jstree.load.loadAdl();
            self.queryTypesArray = [];
            $("#KGbrowser_queryTreeDiv").jstree("destroy").empty();
        },
        showQuery: function () {
            self.query.execute(true);
        },
        execute: function (showQueryOnly) {
            if (Config.KG.adlQueryMode == "SPARQL") {
                self.query.executeSparqlQuery(showQueryOnly);
            } else if (Config.KG.adlQueryMode == "SQL") {
                self.query.executeSqlQuery(showQueryOnly, function (err, result) {
                    $("#waitImg").css("display", "none");
                    if (err) return MainController.UI.message(err);
                    if (result == 0) return alert("no data found");
                    //  self.jstree.updateAdlTree(self.currentJstreeNode)
                });
            }
        },
        executeSparqlQuery: function (showQueryOnly, callback) {
            //   var checkedNodes = $("#KGbrowser_queryTreeDiv").jstree(true).get_checked(false)
            var allNodes = common.jstree.getjsTreeNodes("KGbrowser_queryTreeDiv");
            var nodesMap = {};
            allNodes.forEach(function (item) {
                if ($("#KGbrowser_queryTreeDiv").jstree(true).is_checked(item.id)) item.inResult = true;
                nodesMap[item.data.id] = item;
            });

            var selectStr = "";
            var queryStr = "";
            var varNames = {};
            var previousType = 0;
            var previousTypeLabel = "";
            var currentProp = 0;
            var processedTypes = [];
            var sources = [self.currentSource];

            function getVarName(str) {
                // eslint-disable-next-line no-control-regex
                return "?" + str.replace(/[^\x00-\x7F]/g, "_").replace("-", "_");
            }

            allNodes.forEach(function (node, index) {
                if (node.data.type == "type") {
                    //type
                    previousTypeLabel = node.data.label;
                    varNames[node.id] = getVarName(node.data.label);
                    queryStr += varNames[node.id] + " rdf:type <" + node.data.id + "> . \n";
                    processedTypes.push(node.data.id);
                    if (index > 0) {
                        //relation anonyme avec le precedent type
                        if (node.data.sourceType == "rdl") {
                            if (sources.indexOf(Config.KG.RDLsource) < 0) sources.push(Config.KG.RDLsource);
                        }
                        if (node.data.role.indexOf("sub") > -1) queryStr += varNames[node.id] + " ?P" + index + " " + varNames[previousType] + " .\n ";
                        else queryStr += varNames[previousType] + " ?P" + index + " " + varNames[node.id] + " .\n ";
                    }

                    previousType = node.id;
                    selectStr += " " + varNames[node.id];
                }
                if (node.data.type == "property") {
                    //property
                    currentProp = previousType + "_" + node.id;
                    varNames[currentProp] = getVarName(previousTypeLabel + "_" + node.data.label);
                    if (index < allNodes.length - 1 && allNodes[index + 1].data.type == "propertyFilter") return;
                    var prop = nodesMap[node.data.id];

                    if (prop.inResult || node.children) {
                        selectStr += " " + varNames[currentProp];

                        queryStr += " OPTIONAL{" + varNames[node.parent] + " <" + node.data.id + "> " + varNames[currentProp] + " .} \n ";
                    }
                }
                if (node.data.type == "propertyFilter") {
                    //filter
                    var clause = node.data.content;
                    selectStr += " " + varNames[currentProp] + "_value";
                    var parentProp = previousType + "_" + node.parent;
                    clause = clause.replace("?obj", varNames[previousType]);
                    clause = clause.replace("?sub", varNames[previousType]);
                    clause = clause.replace(/\?x/g, varNames[parentProp] + "_value");
                    queryStr += clause;
                }
            });

            var fromStr = Sparql_common.getFromStr(sources);
            var query =
                " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> PREFIX owl:<http://www.w3.org/2002/07/owl#> " +
                "Select " +
                selectStr +
                " " +
                fromStr +
                " where {" +
                queryStr +
                "} limit " +
                Config.KG.queryLimit;

            if (showQueryOnly) {
                return common.copyTextToClipboard(query);
            }

            var url = Config.sources[self.currentSource].sparql_server.url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, {}, { source: self.currentSource }, function (err, result) {
                if (err) return callback(err);
                if (result.results.bindings.length >= self.queryLimit) return callback("result too long >" + self.queryLimit + " lines ");
                if (result.results.bindings.length == 0) return callback(null, 0);

                var dataSet = [];
                var cols = [];
                result.head.vars.forEach(function (item) {
                    cols.push({ title: item });
                });
                result.results.bindings.forEach(function (item, _indexRow) {
                    var line = [];
                    result.head.vars.forEach(function (col, _indexCol) {
                        if (item[col]) line.push(item[col].value);
                        else line.push("");
                    });
                    dataSet.push(line);
                });
                self.query.showQueryResultInDataTable(dataSet, cols);
                return callback(null, result.results.bindings.length);
            });
        },
        executeSqlQuery: function () {
            // Pass
        },
        showQueryResultInDataTable: function (dataSet, cols) {
            $("#mainDialogDiv").dialog("open");

            $("#mainDialogDiv").html("<table id='dataTableDiv'></table>");
            setTimeout(function () {
                $("#dataTableDiv").DataTable({
                    data: dataSet,
                    columns: cols,
                    // async: false,
                    pageLength: 15,
                    dom: "Bfrtip",
                    buttons: ["copy", "csv", "excel", "pdf", "print"],
                }),
                    500;
            });
        },
    };

    return self;
})();
