import common from "../shared/common.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";
import Sparql_proxy from "../sparqlProxies/sparql_proxy.js";
import Sparql_generic from "../sparqlProxies/sparql_generic.js";
import Export from "../shared/export.js";
import visjsGraph from "../graph/visjsGraph2.js";
import Lineage_whiteboard from "./lineage/lineage_whiteboard.js";
import Containers_graph from "./containers/containers_graph.js";

var KGpropertyFilter = (function () {
    var self = {};

    self.currentNewFilters = [];
    self.currentSavedFilters = [];
    self.currentNodeData = null;
    self.treeConfigTopUrisMap = {};

    self.treeConfigs = {
        dataContainers: {
            key: "dataContainers",
            source: "IDCP",
            topUris: ["http://datalenergies.total.com/resource/tsf/idcp/DataContainer"],
            options: { memberPredicate: 1 },
            levels: 3,
            jstreeDiv: "KGpropertyFilter_dataContainerTreeDiv",
            parentPredicate: "^rdfs:member",
        },
        templates: {
            key: "templates",
            source: "IDCP",
            topUris: ["http://datalenergies.total.com/resource/tsf/idcp/template"],
            options: { memberPredicate: 0, specificPredicates: ["rdf:type", "<http://datalenergies.total.com/resource/tsf/idcp/9fc7b10ede>"] },
            levels: 5,
            jstreeDiv: "KGpropertyFilter_templatesTree",
            color: "#bb8f00",
        },
        disciplines: {
            key: "disciplines",
            source: "IDCP",
            topUris: ["http://datalenergies.total.com/resource/tsf/idcp/Discipline"],
            options: { memberPredicate: 1 },
            levels: 3,
            jstreeDiv: "KGpropertyFilter_disciplinesTree",
            color: "#3a773a",
        },
        actors: {
            key: "actors",
            source: "IDCP",
            topUris: ["http://datalenergies.total.com/resource/tsf/idcp/role_IDCP"],
            options: { memberPredicate: 1 },
            jstreeDiv: "KGpropertyFilter_actorsTree",
            color: "#ea59d8",
        },
        systems: {
            key: "systems",
            source: "IDCP",
            topUris: ["http://datalenergies.total.com/resource/tsf/idcp/OGSystem"],
            options: { memberPredicate: 1 },
            levels: 3,
            jstreeDiv: "KGpropertyFilter_systemsTree",
            color: "#f5ef39",
        },
        businessObjects: {
            key: "businessObjects",
            editable: false,
            source: "GIDEA-RAW",
            topUris: ["http://datalenergies.total.com/resource/tsf/gidea-raw/LogicalEntity"],
            options: { specificPredicates: ["?p"] },
            levels: 5,
            jstreeDiv: "KGpropertyFilter_businessObjectsTree",
            color: "#cb6601",
        },
    };

    self.getTreeConfigByKey = function (key, value) {
        for (var entry in self.treeConfigs) {
            if (self.treeConfigs[entry][key] == value) {
                return self.treeConfigs[entry];
            }
        }
    };
    self.onLoaded = function () {
        for (var key in self.treeConfigs) {
            Config.sources[self.treeConfigs[key].source].editable = false;
        }

        $("#actionDivContolPanelDiv").load("snippets/KGpropertyFilter/leftPanel.html", function () {
            //  var sources = Config.KGpropertyFilter.sources;
            var sources = ["", "IDCP"];
            common.fillSelectOptions("KGpropertyFilter_sourceSelect", sources, true);
            $("#KGpropertyFilter_searchInPropertiesTreeInput").bind("keyup", null, KGpropertyFilter.searchInPropertiesTree);
            self.onChangeSourceSelect("IDCP");
        });

        //  UI.showHideRightPanel(true);
        $("#graphDiv").width(1000);

       

        $("#rightPanelDiv").load("snippets/KGpropertyFilter/rightPanel.html", function () {
            $("#KGpropertyFilter_rightPanelTabs").tabs({
                activate: function (_e, _ui) {
                    self.currentAspect = _ui.newTab[0].textContent;
                },
                create(event, ui) {
                    self.initRightPanel();

                    /*  $("#KGpropertyFilter_rightPanelTabs").tabs("option","active",1)
$("#KGpropertyFilter_rightPanelTabs").tabs("option","active",0)*/
                },
            });
        });
        // });

        $("#accordion").accordion("option", { active: 2 });
    };

    self.onChangeSourceSelect = function (source) {
        // self.resetMatrixPropertiesFilters();
        self.currentSource = source;
        // self.initFiltersSource(source);

        self.loadInJstree(self.treeConfigs["dataContainers"], function (err, result) {
            if (err) {
                $("#KGpropertyFilter_searchInPropertiesTreeInput").bind("keyup", null, KGpropertyFilter.searchInPropertiesTree);
                return alert(err.responseText);
            }
        });
    };

    self.initRightPanel = function () {
        async.series(
            [
                function (callbackSeries) {
                    self.loadInJstree(self.treeConfigs["disciplines"], function (err, result) {
                        callbackSeries(err);
                    });
                },
                function (callbackSeries) {
                    self.loadInJstree(self.treeConfigs["templates"], function (err, result) {
                        callbackSeries(err);
                    });
                },
                function (callbackSeries) {
                    $("#searchWidget_searchTermInput").bind("keyup", null, KGpropertyFilter.searchInPropertiesTree);

                    return callbackSeries();
                },
                function (callbackSeries) {
                    return callbackSeries();
                    self.loadInJstree(self.treeConfigs["systems"], function (err, result) {
                        callbackSeries(err);
                    });
                },
                function (callbackSeries) {
                    self.loadInJstree(self.treeConfigs["actors"], function (err, result) {
                        callbackSeries(err);
                    });
                },
                function (callbackSeries) {
                    callbackSeries();
                },
            ],
            function (err) {
                $("#KGpropertyFilter_rightPanelTabs").tabs("option", "active", 0);

                if (err) {
                    return alert(err.responseText);
                }

                setTimeout(function () {
                    for (var key in self.treeConfigs) {
                        if (self.treeConfigs[key].color) {
                            $("#KGpropertyFilter_" + key + "_accordionDiv").css("background-color", self.treeConfigs[key].color + " !important");
                        }
                        self.treeConfigs[key].topUris.forEach(function (uri) {
                            self.treeConfigTopUrisMap[uri] = key;
                        });
                    }
                }, 500);
            }
        );

        return;
    };
    self.onSelectFilter = function () {
        // pass
    };



    self.client = {};

    self.searchInPropertiesTree = function (event, inputDiv, jstreeDiv) {
        inputDiv = "KGpropertyFilter_searchInPropertiesTreeInput";
        jstreeDiv = self.treeConfigs["dataContainers"].jstreeDiv;

        if (event.keyCode != 13 && event.keyCode != 9) {
            return;
        }
        var value = $("#" + inputDiv).val();
        $("#" + jstreeDiv)
            .jstree(true)
            .search(value);
        $("#" + inputDiv).val("");
    };

    self.loadInJstree = function (treeConfig, callback) {
        var depth = 3;
        Sparql_generic.getNodeChildren(treeConfig.source, null, treeConfig.topUris, treeConfig.levels, treeConfig.options, function (err, result) {
            //    Sparql_generic.getNodeChildren(self.currentSource, null, ["http://data.totalenergies.com/resource/ontology/cfihos_1.5/TagClass/CFIHOS-30000311"], depth, {}, function (err, result) {
            if (err) {
                return callback(err);
            }

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
                            type: treeConfig.key,
                            source: self.currentSource,
                            label: item.subjectLabel.value,
                            id: item.subject.value,
                        },
                    });
                }

                for (var i = 1; i <= 10; i++) {
                    if (!item["child" + i]) {
                        break;
                    }
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
                                type: treeConfig.key,
                                source: self.currentSource,
                                label: label,
                                id: id,
                            },
                        });
                    }
                }
            });

            var jstreeOptions = {
                openAll: false,
                // withCheckboxes: true,
                selectTreeNodeFn: KGpropertyFilter.commonJstreeActions.onSelectTreeNode,
                // onAfterOpenNodeFn: KGpropertyFilter.onOpenClassesOrPropertyNode,
                //   onCheckNodeFn: null, //KGpropertyFilter.loadPropertiesFilters,
                //  tie_selection: false,
                contextMenu: KGpropertyFilter.commonJstreeActions.getJsTreeContextMenu(treeConfig.key),
                searchPlugin: {
                    case_insensitive: true,
                    fuzzy: false,
                    show_only_matches: true,
                },
            };
            JstreeWidget.loadJsTree(treeConfig.jstreeDiv, jstreeData, treeConfig.options.jstreeOptions || jstreeOptions);

            $("#waitImg").css("display", "none");
            callback();
        });
    };

    self.commonJstreeActions = {
        onSelectTreeNode: function (event, obj) {
            self.currentTreeNode = obj.node;
            self.currentTreeNode.treeDiv = event.currentTarget.id;

            if (self.currentTreeNode.data.type == "dataContainers") {
                self.currentDataContainer = obj.node;
                self.showDataContainerDetails(self.currentTreeNode);
            } else {
                self.currentRightpanelNode = obj.node;
            }
        },
        createChildNode: function () {
            var parent = self.currentTreeNode.data.id;
            var parentLabel = self.currentTreeNode.data.label;
            var label = prompt("New child label");
            if (!label) {
                return;
            }

            var treeConfig = self.getTreeConfigByKey("jstreeDiv", self.currentTreeNode.treeDiv);
            var parentPredicate = treeConfig.parentPredicate;
            if (!parentPredicate) {
                return alert("no parentPredicate in treeConfig");
            }
            var triples = [];
            let graphUri = Config.sources[treeConfig.source].graphUri;
            var newUri = graphUri + common.formatStringForTriple(parentLabel + "_" + label, true);

            triples.push({ subject: newUri, predicate: "rdfs:label", object: label });
            triples.push({ subject: newUri, predicate: "rdf:type", object: "owl:NamedIndividual" });
            triples.push({ subject: newUri, predicate: parentPredicate, object: parent });

            Sparql_generic.insertTriples(treeConfig.source, triples, {}, function (err, _result) {
                if (err) {
                    return alert(err.responseText);
                }

                UI.message("child Created");
                var newNode = {
                    id: newUri,
                    text: label,
                    parent: parent,
                    data: {
                        id: newUri,
                        label: label,
                        source: treeConfig.source,
                    },
                };
                $("#" + self.currentTreeNode.treeDiv)
                    .jstree()
                    .create_node(parent, newNode, "first", function (err, result) {
                        $("#" + self.currentTreeNode.treeDiv)
                            .jstree()
                            .open_node(parent);
                        self.currentTreeNode = newNode;
                    });
            });
        },
        deleteNode: function () {
            var treeConfig = self.getTreeConfigByKey("jstreeDiv", self.currentTreeNode.treeDiv);
            if (self.currentTreeNode.children && self.currentTreeNode.children.length > 0) {
                var parentPredicate = treeConfig.parentPredicate;
                if (!parentPredicate) {
                    return alert("no parentPredicate in treeConfig");
                }
                if (parentPredicate.indexOf("rdfs:member") < 0) {
                    return alert("cannot delete nnode with children");
                }
            }

            if (!confirm("delete node " + self.currentTreeNode.text)) {
                return;
            }
            Sparql_generic.deleteTriples(treeConfig.source, self.currentTreeNode.data.id, null, null, function (err, result) {
                if (err) {
                    return alert(message);
                }
                $("#" + self.currentTreeNode.treeDiv)
                    .jstree()
                    .delete_node(self.currentTreeNode.data.id);
                return UI.message("node deleted");
            });
        },

        searchBO: function (origin) {
            if (origin == "graph") {
                self.currentDataContainer = Lineage_whiteboard.currentGraphNode;
            }

            var term = self.currentDataContainer.data.label;
            $("#searchWidget_searchTermInput").val(term);
            $("#KGpropertyFilter_rightPanelTabs").tabs("option", "active", 4);
            KGpropertyFilter.rightPanelsActions.searchBusinessObjects();
        },

        associateNodeToDataContainer: function () {
            if (!self.currentDataContainer) {
                return alert("no data container selected");
            }
            if (!self.currentRightpanelNode) {
                return alert("no node selected in rightPanel");
            }

            var rightPanelNodeData = self.currentRightpanelNode.data;
            if (rightPanelNodeData.source == "GIDEA-RAW") {
                // create property
                if (self.currentRightpanelNode.parent.indexOf("Attribute") > 0) {
                    if (!self.currentRightpanelNode.parentLogicalEntity) {
                        return self.rightPanelsActions.showAttributesParentsDialog();
                    } else {
                        // create a new individual that is object of the dataContainer  and subject of gidea Attribute and Logical entity
                        var newUri = common.getUri("", self.currentDataContainer.data.source, "randomHexaNumber");
                        var triples = [
                            {
                                subject: newUri,
                                predicate: "rdf:type ",
                                object: "owl:NamedIndividual",
                            },
                            {
                                subject: newUri,
                                predicate: "rdf:type ",
                                object: "http://datalenergies.total.com/resource/tsf/idcp/gidea-attribute",
                            },
                            {
                                subject: newUri,
                                predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                                object: self.currentRightpanelNode.parentLogicalEntity.label + "." + self.currentTreeNode.data.label,
                            },

                            {
                                subject: self.currentDataContainer.data.id,
                                predicate: "http://datalenergies.total.com/resource/tsf/idcp/mapsWith",
                                object: newUri,
                            },
                            {
                                subject: newUri,
                                predicate: "http://datalenergies.total.com/resource/tsf/idcp/fromEntity",
                                object: self.currentRightpanelNode.parentLogicalEntity.id,
                            },
                            {
                                subject: newUri,
                                predicate: "http://datalenergies.total.com/resource/tsf/idcp/fromAttribute",
                                object: self.currentRightpanelNode.data.id,
                            },
                        ];

                        self.currentRightpanelNode.parentLogicalEntity = null;
                    }
                    triples = triples.concat(Lineage_createRelation.getCommonMetaDataTriples(newUri));
                } else if (self.currentRightpanelNode.parent.indexOf("LogicalEntity") > 0 || self.currentRightpanelNode.parent.indexOf("BusinessObject") > 0) {
                    var triples = [
                        {
                            subject: self.currentDataContainer.data.id,
                            predicate: "http://datalenergies.total.com/resource/tsf/idcp/mapsWith",
                            object: self.currentRightpanelNode.data.id,
                        },
                    ];
                }
            } else {
                // create member property
                if (self.currentDataContainer.parents.length != 2) {
                    return alert("only dataContainers can be associated ");
                }
                var triples = [
                    {
                        subject: rightPanelNodeData.id,
                        predicate: "http://www.w3.org/2000/01/rdf-schema#member",
                        object: self.currentDataContainer.data.id,
                    },
                ];
            }
            if (!triples) {
                return alert("no triples defined");
            }
            Sparql_generic.insertTriples(self.currentDataContainer.data.source, triples, {}, function (err, result) {
                if (err) {
                    return alert(err.responseText);
                }
            });
        },

        getJsTreeContextMenu: function (treeConfigKey) {
            var items = {};

            if (treeConfigKey != "businessObjects") {
                items.create = {
                    label: "create child",
                    action: function (_e) {
                        // pb avec source
                        KGpropertyFilter.commonJstreeActions.createChildNode();
                    },
                };
                items.delete = {
                    label: "delete node",
                    action: function (_e) {
                        // pb avec source
                        KGpropertyFilter.commonJstreeActions.deleteNode();
                    },
                };
            }
            if (true || treeConfigKey == "businessObjects") {
                items.nodeInfos = {
                    label: "Node infos",
                    action: function (_e) {
                        // pb avec source
                        $("#mainDialogDiv").dialog("open");
                        NodeInfosWidget.showNodeInfos(self.currentTreeNode.data.source, self.currentTreeNode, "mainDialogDiv");
                    },
                };
            }

            if (treeConfigKey == "dataContainers") {
                items.searchBO = {
                    label: "Search BO",
                    action: function (_e) {
                        // pb avec source
                        KGpropertyFilter.commonJstreeActions.searchBO();
                    },
                };
            }

            if (treeConfigKey != "dataContainers") {
                items.associate = {
                    label: "Associate",
                    action: function (_e) {
                        KGpropertyFilter.commonJstreeActions.associateNodeToDataContainer();
                    },
                };

                items.visualize = {
                    label: "Visualize",
                    action: function (_e) {
                        KGpropertyFilter.visualizeAspect();
                    },
                };

                items.expand = {
                    label: "expand",
                    action: function (_e) {
                        KGpropertyFilter.commonJstreeActions.expandCommonTreeNode();
                    },
                };
            }

            return items;
        },

        expandCommonTreeNode: function () {
            if (self.currentTreeNode.id) {
                var x = 3;
            }
        },
    };

    self.rightPanelsActions = {
        searchBusinessObjects: function (event) {
            if (event && event.keyCode != 13 && event.keyCode != 9) {
                return;
            }
            var options = {
                jstreeDiv: "KGpropertyFilter_businessObjectsTree",
                searchedSources: [self.treeConfigs["businessObjects"].source, "BUSINESS_OBJECTS_DATA_DOMAINS"],
                contextMenu: self.commonJstreeActions.getJsTreeContextMenu("businessObjects"),
                selectTreeNodeFn: function (event, obj) {
                    self.currentRightpanelNode = obj.node;
                    return;
                },
            };
            SearchWidget.searchTermInSources(options);
        },

        showAttributesParentsDialog: function () {
            self.currentRightpanelNode.parentLogicalEntity = null;
            var html = "Select a Logical Entity<br>";
            html += "<select size='20' onclick='KGpropertyFilter.rightPanelsActions.onValidateAttributesParentsDialog($(this).val())' id='KGpropertyFilter_logicalEntitySelect'></select>";

            $("#mainDialogDiv").html(html);
            $("#mainDialogDiv").dialog("open");
            var source = "GIDEA-RAW-2";
            var options = {
                distinct: "?object ?objectLabel",
            };
            Sparql_OWL.getFilteredTriples(source, self.currentRightpanelNode.data.id, "http://datalenergies.total.com/resource/tsf/gidea-raw/describes", null, options, function (err, result) {
                if (err) {
                    return alert(err.responseText);
                }

                var logicalEntities = [];
                result.forEach(function (item) {
                    logicalEntities.push({
                        id: item.object.value,
                        label: item.objectLabel.value,
                    });
                });
                common.fillSelectOptions("KGpropertyFilter_logicalEntitySelect", logicalEntities, false, "label", "id");
            });
        },
        onValidateAttributesParentsDialog: function (logicalEntity) {
            var label = $("#KGpropertyFilter_logicalEntitySelect option:selected").text();

            self.currentRightpanelNode.parentLogicalEntity = { id: logicalEntity, label: label };
            $("#mainDialogDiv").dialog("close");
            self.commonJstreeActions.associateNodeToDataContainer();
        },
    };
    self.showDataContainerDetails = function (node) {
        /* $("#KGpropertyFilter_nodeInfosDiv").load("snippets/KGpropertyFilter/dataContainer.html", function() {*/
        var level = self.currentTreeNode.parents.length - 1;
        var dataContainerId;
        if (!node) {
            node = self.currentTreeNode;
        }
        if (level == 1) {
            dataContainerId = node;
        } else {
            return;
            dataContainerId = node.parents[level - 1];
        }

        Sparql_common.includeImports = 1;
        /// $("#KGpropertyFilter_display_dataContainerDiv").html(self.currentTreeNode.text)
        var visjsNodes = [];
        var source = node.data.source;
        var rightPanelsNodeIds = [];
        async.series(
            [
                function (callbackSeries) {
                    visjsGraph.clearGraph();
                    var options = {
                        physics: {
                            forceAtlas2Based: {
                                centralGravity: 0.45,
                                springLength: 110,
                                damping: 0.15,
                            },
                            minVelocity: 0.75,
                        },
                    };
                    Lineage_whiteboard.drawNewGraph({ nodes: [], edges: [] }, null, options);
                    if (!self.graphButtonsInitialized) {
                        self.graphButtonsInitialized = 1;
                        var html =
                            "<div  style='position: absolute;top:30px;left:450px;'>" +
                            "<button  class=\"btn btn-sm my-1 py-0 btn-outline-primary\" onclick='visjsGraph.clearGraph()'> clear Graph</button>" +
                            "<button  class=\"btn btn-sm my-1 py-0 btn-outline-primary\" onclick='Export.exportGraphToDataTable()' > Export</button>" +
                            '<button class="btn btn-sm my-1 py-0 btn-outline-primary" onclick="Lineage_whiteboard.addNodesAndParentsToGraph()">Parents</button>' +
                            '<button class="btn btn-sm my-1 py-0 btn-outline-primary" onclick="Lineage_whiteboard.addChildrenToGraph()">Expand</button>' +
                            //   "<button class=\"btn btn-sm my-1 py-0 btn-outline-primary\" onClick='visjsGraph.showGraphConfig()'>Display</button>";
                            "</div>";
                        $("#centralPanelDiv").append(html);
                    }
                    return callbackSeries();
                },
                function (callbackSeries) {
                    Containers_graph.graphResources(source, self.currentTreeNode.id, { descendants: true }, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        var newNodes = [];
                        var level1Offset = 150;
                        var level2Offset = 250;
                        var level3Offset = 300;
                        result.nodes.forEach(function (node) {
                            visjsNodes.push(node.id);

                            if (node.level == 1) {
                                newNodes.push({ id: node.id, fixed: { y: true }, y: level1Offset });
                                level1Offset += 20;
                            }
                            if (node.level == 2) {
                                newNodes.push({ id: node.id, fixed: { y: true }, y: level2Offset });
                                level2Offset += 20;
                            }
                            /*  else{
                  newNodes.push({id:node.id, fixed:{y:true},y:level3Offset})
                  level3Offset+=20
                }*/
                        });
                        visjsGraph.data.nodes.update(newNodes);
                        return callbackSeries(err);
                    });
                },
                function (callbackSeries) {
                    Containers_graph.graphWhiteboardNodesContainers(source, [self.currentTreeNode.id], null, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }

                        var newNodes = [];
                        result.nodes.forEach(function (node) {
                            rightPanelsNodeIds.push(node.id);

                            newNodes.push({
                                id: node.id,
                                shape: "box",
                                color: "#bb8f00",
                            });
                        });
                        visjsGraph.data.nodes.update(newNodes);
                        var newEdges = [];
                        result.edges.forEach(function (edge) {
                            newEdges.push({
                                id: edge.id,
                                color: "#bb8f00",
                            });
                        });
                        visjsGraph.data.edges.update(newEdges);
                        return callbackSeries(err);
                    });
                },
                function (callbackSeries) {
                    if (rightPanelsNodeIds.length == 0) {
                        return callbackSeries();
                    }
                    var ancestorsDepth = 5;
                    Sparql_generic.getNodeParents(source, null, rightPanelsNodeIds, ancestorsDepth, { skipRestrictions: 1, memberPredicate: 1, excludeType: 1 }, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        var existingNodes = visjsGraph.getExistingIdsMap();
                        var newNodesMap = {};
                        var uniqueNodesMap = {};
                        result.forEach(function (item) {
                            var itemParents = [];
                            itemParents.push({ id: item.subject.value, label: item.subjectLabel.value });
                            var rootId = null;
                            for (var i = 1; i < ancestorsDepth; i++) {
                                var parent = item["broader" + i];
                                if (!parent) {
                                    break;
                                }
                                var parentId = parent.value;
                                if (true || !uniqueNodesMap[parentId]) {
                                    uniqueNodesMap[parentId] = 1;
                                    itemParents.push({ id: parentId, label: item["broader" + i + "Label"].value });
                                    if (self.treeConfigTopUrisMap[parentId]) {
                                        rootId = parentId;

                                        if (!newNodesMap[self.treeConfigTopUrisMap[rootId]]) {
                                            newNodesMap[self.treeConfigTopUrisMap[rootId]] = [];
                                        }
                                        newNodesMap[self.treeConfigTopUrisMap[rootId]].push(itemParents);
                                        break;
                                    }
                                }
                            }
                        });
                        var visjsData = { nodes: [], edges: [] };

                        /*  visjsData.nodes.push({
                id: "aspect",
                label: "Aspects",
                shape: "ellipse",
                color: "#8c8585",
                data: {
                  id: "aspect",
                  label: "Aspects",
                  source: source
                }
              });*/
                        var xOffset = -300;
                        var yOffset = -350;
                        var xStep = 250;
                        for (var key in newNodesMap) {
                            var color = self.treeConfigs[key].color;
                            var conceptNodeId = newNodesMap[key].subject;

                            var from;
                            newNodesMap[key].forEach(function (path, index) {
                                visjsGraph.data.nodes.update({ id: path[0].id, color: color });
                                path.forEach(function (item, indexPath) {
                                    if (!existingNodes[item.id]) {
                                        existingNodes[item.id] = 1;
                                        var node = {
                                            id: item.id,
                                            label: item.label,
                                            shape: "box",
                                            color: color,
                                            data: {
                                                id: item.id,
                                                label: item.label,
                                                source: source,
                                            },
                                        };
                                        if (indexPath == path.length - 1) {
                                            node.fixed = { x: true, y: true };
                                            node.x = xOffset;
                                            node.y = yOffset;
                                            xOffset += xStep;
                                        }
                                        visjsData.nodes.push(node);
                                    }
                                    if (indexPath == 0) {
                                        return;
                                    }
                                    from = item.id;
                                    var to = path[indexPath - 1].id;

                                    var edgeId = from + "_" + to;
                                    if (!existingNodes[edgeId]) {
                                        existingNodes[edgeId] = 1;
                                        visjsData.edges.push({
                                            id: edgeId,
                                            from: from,
                                            to: to,
                                            arrows: "middle",
                                            color: color,
                                            data: {
                                                id: edgeId,
                                                from: from,
                                                to: to,
                                                source: source,
                                            },
                                        });
                                    }
                                });
                            });
                        }

                        visjsGraph.data.nodes.add(visjsData.nodes);
                        visjsGraph.data.edges.add(visjsData.edges);
                        return callbackSeries();
                    });
                },

                function (callbackSeries) {
                    return callbackSeries();
                    var properties = ["rdfs:member"];
                    var options = { inversePredicate: 1 };
                    Lineage_whiteboard.drawPredicatesGraph(source, visjsNodes, properties, options, function (err, result) {
                        return callbackSeries(err);
                    });
                },
                function (callbackSeries) {
                    var properties = ["http://datalenergies.total.com/resource/tsf/idcp/mapsWith"];
                    var options = {};
                    Lineage_whiteboard.drawPredicatesGraph(source, visjsNodes, properties, options, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        var xOffset = 300;
                        var yOffset = 400;
                        var xStep = 250;
                        var newNodes = [];
                        result.nodes.forEach(function (node) {
                            var newNode = {
                                id: node.id,
                                fixed: { y: true },
                                y: yOffset,
                            };
                            if (true || node.id.indexOf("gidea") > -1) {
                                newNode.shape = "square";
                                newNode.color = "#70309f";
                            }

                            if (node.id.indexOf("business") > -1) {
                                newNode.shape = "star";
                                newNode.color = "#f90edd";
                            }
                            newNodes.push(newNode);
                        });
                        visjsGraph.data.nodes.update(newNodes);

                        return callbackSeries(err);
                    });
                },
                function (callbackSeries) {
                    //post processing vis

                    var nodes = visjsGraph.data.nodes.get();

                    var newNodes = [];
                    nodes.forEach(function (node) {
                        var shape = null;
                        var color = null;
                        if (node.level === 0) {
                            shape = "box";
                            color = "#70ac47";
                            node.data.graphPopupMenusFn = KGpropertyFilter.getGraphPopupMenuItem;
                        }
                        if (node.level === 1) {
                            shape = "box";
                            color = "#00afef";
                            node.data.graphPopupMenusFn = KGpropertyFilter.getGraphPopupMenuItem;
                        }
                        if (node.level === 2) {
                            node.data.graphPopupMenusFn = KGpropertyFilter.getGraphPopupMenuItem;
                        }

                        if (shape != null) {
                            newNodes.push({ id: node.id, shape: shape, color: color });
                        }
                    });
                    visjsGraph.data.nodes.update(newNodes);
                    return callbackSeries();
                },
            ],
            function (err) {
                if (err) {
                    return alert(err.responseText);
                }
            }
        );
    };

    self.visualizeAspect = function (node) {
        if (!node) {
            node = self.currentRightpanelNode;
        }

        return self.showDataContainerDetails(node);
    };

    self.getGraphPopupMenuItem = function () {
        var html =
            ' <span  class="popupMenuItem" onclick="Lineage_whiteboard.graphActions.showNodeInfos();"> Node infos</span>' +
            '<span  class="popupMenuItem" onclick="KGpropertyFilter.commonJstreeActions.searchBO(\'graph\');"> Search BO</span>';
        return html;
    };

    return self;
})();

export default KGpropertyFilter;

window.KGpropertyFilter = KGpropertyFilter;
