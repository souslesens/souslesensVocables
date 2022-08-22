var Lineage_combine = (function () {
    var self = {};
    self.currentSources = [];
    self.showSourcesDialog = function () {
        SourceBrowser.showSearchableSourcesTreeDialog(["OWL", "SKOS"], Lineage_combine.addSelectedSourcesToGraph);
    };

    self.init = function () {
        self.currentSources = [];
        $("#Lineage_combine_actiosDiv").css("display", "none");
        $("#Lineage_combine_mergeNodesDialogButton").css("display", "none");
    };

    self.addSelectedSourcesToGraph = function () {
        $("#sourcesSelectionDialogdiv").dialog("close");

        var term = $("#GenericTools_searchAllSourcesTermInput").val();
        var selectedSources = [];
        if ($("#searchAll_sourcesTree").jstree(true)) {
            selectedSources = $("#searchAll_sourcesTree").jstree(true).get_checked();
        }
        if (selectedSources.length == 0) return;

        async.eachSeries(
            selectedSources,
            function (source, callbackEach) {
                if (!Config.sources[source]) callbackEach();
                Lineage_classes.registerSource(source);
                self.currentSources.push(source);
                Lineage_classes.drawTopConcepts(source, function (err) {
                    if (err) return callbackEach();
                    self.menuActions.groupSource(source);

                    callbackEach();

                    //  SourceBrowser.showThesaurusTopConcepts(sourceLabel, { targetDiv: "LineagejsTreeDiv" });
                });
            },
            function (err) {
                if (err) return MainController.UI.message(err);
                if (self.currentSources.length > 0) {
                    $("#GenericTools_searchScope").val("graphSources");
                    $("#Lineage_combine_actiosDiv").css("display", "block");
                }
                Lineage_classes.setCurrentSource(Lineage_classes.mainSource);
            }
        );
    };

    self.setGraphPopupMenus = function () {
        var html =
            '    <span  class="popupMenuItem" onclick="Lineage_combine.menuActions.hideSource();"> Hide Source</span>' +
            ' <span  class="popupMenuItem" onclick="Lineage_combine.menuActions.showSource();"> Show Source</span>' +
            ' <span  class="popupMenuItem" onclick="Lineage_combine.menuActions.groupSource();"> Group Source</span>' +
            ' <span  class="popupMenuItem" onclick="Lineage_combine.menuActions.ungroupSource();"> ungroup Source</span>';
        $("#graphPopupDiv").html(html);
    };

    self.menuActions = {
        hideSource: function () {
            MainController.UI.hidePopup("graphPopupDiv");
            Lineage_classes.showHideCurrentSourceNodes(true);
        },
        showSource: function () {
            MainController.UI.hidePopup("graphPopupDiv");
            Lineage_classes.showHideCurrentSourceNodes(false);
        },
        groupSource: function (source) {
            MainController.UI.hidePopup("graphPopupDiv");

            if (!source) source = Lineage_common.currentSource;
            var color = Lineage_classes.getSourceColor(source);
            var visjsData = { nodes: [], edges: [] };
            var existingNodes = visjsGraph.getExistingIdsMap();

            for (var nodeId in existingNodes) {
                var node = visjsGraph.data.nodes.get(nodeId);
                if (node && node.id != source && node.data && node.data.source == source) {
                    var edgeId = nodeId + "_" + source;
                    if (!existingNodes[edgeId]) {
                        existingNodes[nodeId] = 1;
                        var edge = {
                            id: edgeId,
                            from: nodeId,
                            to: source,
                            arrows: " middle",
                            color: color,
                            width: 1,
                        };
                        visjsData.edges.push(edge);
                    }
                }
            }
            if (!existingNodes[source]) {
                existingNodes[source] = 1;
                var sourceNode = {
                    id: source,
                    label: source,
                    shadow: Lineage_classes.nodeShadow,
                    shape: "box",
                    level: 1,
                    size: Lineage_classes.defaultShapeSize,
                    data: { source: source },
                    color: color,
                };
                visjsData.nodes.push(sourceNode);
            }
            visjsGraph.data.nodes.update(visjsData.nodes);
            visjsGraph.data.edges.update(visjsData.edges);
        },
        ungroupSource: function () {
            MainController.UI.hidePopup("graphPopupDiv");
            var source = Lineage_common.currentSource;
            visjsGraph.data.nodes.remove(source);
        },
    };

    self.getSimilars = function (output) {
        /* var source = Lineage_common.currentSource;
       var color=Lineage_classes.getSourceColor(source)*/

        var commonNodes = [];
        var existingNodes = visjsGraph.getExistingIdsMap();
        var nodes = visjsGraph.data.nodes.get();
        nodes.forEach(function (node1) {
            if (!node1.data) return;
            nodes.forEach(function (node2) {
                if (!node2.data) return;
                if (node1.data.id == node2.data.id) return;
                if (node1.data.label == node2.data.label) commonNodes.push({ fromNode: node1, toNode: node2 });
            });
        });

        if (output == "graph") {
            var visjsData = { nodes: [], edges: [] };
            commonNodes.forEach(function (item) {
                var edgeId = item.fromNode.id + "_" + item.toNode.id;
                if (!existingNodes[edgeId]) {
                    existingNodes[edgeId] = 1;
                    visjsData.edges.push({
                        id: edgeId,
                        from: item.fromNode.id,
                        to: item.toNode.id,
                        length: 50,
                        width: 3,
                        color: "#ccc",
                    });
                }
            });
            visjsGraph.data.edges.update(visjsData.edges);
        }
    };

    self.showMergeNodesDialog = function () {
        if (Lineage_classes.nodesSelection.length == 0) return alert("no nodes selected");
        $("#mainDialogDiv").load("snippets/lineage/lineageAggregateMergeNodesDialog.html", function () {
            common.fillSelectOptions("LineageMerge_targetSourceSelect", [Lineage_classes.mainSource]);
            var jstreeData = Lineage_classes.selection.getSelectedNodesTree();

            var options = {
                withCheckboxes: true,
                openAll: true,
            };
            common.jstree.loadJsTree("LineageMerge_nodesJsTreeDiv", jstreeData, options, function (err, result) {
                $("#LineageMerge_nodesJsTreeDiv").jstree().check_all();
            });
        });
        $("#mainDialogDiv").dialog("open");
    };

    self.mergeNodes = function (testObj) {
        var maxDepth = 10;

        var targetSource = $("#LineageMerge_targetSourceSelect").val();
        var mergeMode = $("#LineageMerge_aggregateModeSelect").val();
        var mergeDepth = $("#LineageMerge_aggregateDepthSelect").val();
        var mergeRestrictions = $("#LineageMerge_aggregateRelationsCBX").prop("checked");
        var jstreeNodes;
        if ($("#LineageMerge_nodesJsTreeDiv").jstree(true)) jstreeNodes = $("#LineageMerge_nodesJsTreeDiv").jstree(true).get_checked(true);

        if (testObj) {
            targetSource = testObj.targetSource;
            mergeMode = testObj.mergeMode;
            mergeDepth = testObj.mergeDepth;
            mergeRestrictions = testObj.mergeRestrictions;
            jstreeNodes = testObj.jstreeNodes;
        }

        var nodesToMerge = {};
        jstreeNodes.forEach(function (node) {
            if (node.parent == "#") return;
            if (!nodesToMerge[node.parent]) nodesToMerge[node.parent] = { ids: [] };
            nodesToMerge[node.parent].ids.push(node.data.id);
        });
        /* var oldTriples = [];
       var newTriples = [];*/
        var message = "";

        var sources = Object.keys(nodesToMerge);
        async.eachSeries(sources, function (source, callbackEachSource) {
            var ids = nodesToMerge[source].ids;
            var oldToNewUrisMap = {};
            var targetGraphUri = Config.sources[targetSource].graphUri;
            var editable = Config.sources[targetSource].editable;
            if (!targetGraphUri || !editable) return alert("targetSource must have  graphUri and must be editable");

            var sourceMessage = "";

            function getDescendantsMap(nodes) {
                var descendants = {};
                nodes.forEach(function (item, index) {
                    for (var i = 1; i <= maxDepth; i++) {
                        if (item["child" + i]) {
                            var parent;
                            if (i == 1) item["child" + i].parent = item.concept.value;
                            else item["child" + i].parent = item["child" + (i - 1)].value;
                        }
                        descendants["child" + i] = item["child" + i];
                    }
                });
                return descendants;
            }

            async.series(
                [
                    //getNodes descendants by depth and add them to ids
                    function (callbackSeries) {
                        if (mergeDepth == "nodeOnly") {
                            return callbackSeries();
                        } else {
                            var depth;
                            if (mergeDepth == "nodeAndDirectChildren") depth = 1;
                            else depth = maxDepth;
                            Sparql_generic.getNodeChildren(source, null, ids, depth, { selectGraph: false }, function (err, result) {
                                if (err) return callbackSeries(err);
                                var descendantsMap = getDescendantsMap(result);
                                var descendantIds = Object.keys(descendantsMap);
                                ids = ids.concat(descendantIds);
                                return callbackSeries();
                            });
                        }
                    },

                    //get all node ids subject triple including descendants
                    function (callbackSeries) {
                        Sparql_OWL.getAllTriples(source, "subject", ids, {}, function (err, result) {
                            if (err) return callbackSeries(err);
                            nodesToMerge[source].subjectTriples = result;
                            callbackSeries();
                        });
                    },
                    //get all node ids object triple includin descendants
                    /*     function(callbackSeries) {
                 Sparql_OWL.getAllTriples(source, "object", ids, {}, function(err, result) {
                   if (err)
                     return callbackSeries(err);
                   nodesToMerge[source].objectTriples = result;
                   callbackSeries();
                 });
               },
               //get restrictions triple including descendants
               function(callbackSeries) {
                 if (!mergeRestrictions)
                   return callbackSeries();

                 Sparql_OWL.getObjectRestrictions(source, ids, {}, function(err, result) {
                   if (err)
                     return callbackSeries(err);
                   nodesToMerge[source].restrictions = result;
                   callbackSeries();
                 });
               },
               //get inverse restrictions triple including descendants
               function(callbackSeries) {
                 if (!mergeRestrictions)
                   return callbackSeries();
                 Sparql_OWL.getObjectRestrictions(source, ids, { inverseRestriction: true }, function(err, result) {
                   if (err)
                     return callbackSeries(err);
                   nodesToMerge[source].inverseRestrictions = result;
                   callbackSeries();
                 });
               },*/

                    //create newTriples
                    function (callbackSeries) {
                        if (mergeMode == "keepUri") {
                            var newTriples = [];
                            nodesToMerge[source].subjectTriples.forEach(function (item) {
                                var value = item.object.value;
                                if (item.object.datatype == "http://www.w3.org/2001/XMLSchema#dateTime") value += "^^xsd:dateTime";

                                newTriples.push({
                                    subject: item.subject.value,
                                    predicate: item.predicate.value,
                                    object: value,
                                });
                            });

                            /*  nodesToMerge[source].objectTriples.forEach(function(item) {
                  newTriples.push({
                    subject: item.subject.value,
                    predicate: item.predicate.value,
                    object: item.predicate.value
                  });
                });*/

                            /*     nodesToMerge[source].restrictions.forEach(function(item) {
                     newTriples.push({
                       subject: item.subject.value,
                       predicate: item.predicate.value,
                       object: item.predicate.value
                     });
                   });

                   nodesToMerge[source].inverseRestrictions.forEach(function(item) {
                     newTriples.push({
                       subject: item.subject.value,
                       predicate: item.predicate.value,
                       object: item.predicate.value
                     });
                   });*/
                            Sparql_generic.insertTriples(targetSource, newTriples, {}, function (err, result) {
                                if (err) return callbackSeries(err);
                                sourceMessage = result + " inserted from source " + source + "  to source " + targetSource;

                                message += sourceMessage + "\n";
                                return callbackSeries();
                            });
                        }

                        /* /NOT IMPLEMENTED YET too much complexity
             else if(mergeMode=="newUri") {
                   // set new subjectUri
                   var newTriples = [];


                   nodesToMerge[source].subjectTriples.forEach(function(item) {
                     if (!oldToNewUrisMap[item.id.value]) {
                       var newUri = targetGraphUri + common.getRandomHexaId(10);
                       oldToNewUrisMap[item.id.value] = newUri;
                     }
                   })

                   for (var oldUri in oldToNewUrisMap[item.id.value]) {
                     nodesToMerge[source].subjectTriples.forEach(function(item) {
                       if (item.id.value == oldUri) {

                       }
                       triples.push({})
                     })
                   }
                 }*/
                    },
                ],
                function (err) {
                    if (err) return callbackEachSource(err);
                    MainController.UI.message(sourceMessage + " indexing data ...  ");
                    SearchUtil.generateElasticIndex(targetSource, null, function (err, _result) {
                        MainController.UI.message("DONE " + source, true);
                        callbackEachSource();
                    });
                },
                function (err) {
                    if (err) return alert(err.responseText);
                    alert(message);
                    return MainController.UI.message("ALL DONE", true);
                }
            );
        });
    };

    self.testMerge = function () {
        var jstreeNodes = [
            /*    {
            "id": "HUMAN_RESOURCES",
            "text": "HUMAN_RESOURCES",
            "icon": "../icons/default.png",
            "parent": "#",
            "parents": [
              "#"
            ],
            "children": [
              "http://data.total.com/resource/tsf/ontology/data-domains/human-resources/87c1a9255a"
            ],
            "children_d": [
              "http://data.total.com/resource/tsf/ontology/data-domains/human-resources/87c1a9255a"
            ],
            "state": {
              "loaded": true,
              "opened": true,
              "selected": true,
              "disabled": false
            },
            "li_attr": {
              "id": "HUMAN_RESOURCES"
            },
            "a_attr": {
              "href": "#",
              "id": "HUMAN_RESOURCES_anchor"
            },
            "original": {
              "id": "HUMAN_RESOURCES",
              "text": "HUMAN_RESOURCES",
              "parent": "#",
              "state": {}
            },
            "type": "default"
          },
          {
            "id": "http://data.total.com/resource/tsf/ontology/data-domains/human-resources/87c1a9255a",
            "text": "HR Job description",
            "icon": "../icons/default.png",
            "parent": "HUMAN_RESOURCES",
            "parents": [
              "HUMAN_RESOURCES",
              "#"
            ],
            "children": [],
            "children_d": [],
            "data": {
              "source": "HUMAN_RESOURCES",
              "label": "HR Job description",
              "id": "http://data.total.com/resource/tsf/ontology/data-domains/human-resources/87c1a9255a"
            },
            "state": {
              "loaded": true,
              "opened": false,
              "selected": true,
              "disabled": false
            },
            "li_attr": {
              "id": "http://data.total.com/resource/tsf/ontology/data-domains/human-resources/87c1a9255a"
            },
            "a_attr": {
              "href": "#",
              "id": "http://data.total.com/resource/tsf/ontology/data-domains/human-resources/87c1a9255a_anchor"
            },
            "original": {
              "id": "http://data.total.com/resource/tsf/ontology/data-domains/human-resources/87c1a9255a",
              "text": "HR Job description",
              "parent": "HUMAN_RESOURCES",
              "state": {}
            },
            "type": "default"
          },
        {
            "id": "INDUSTRIAL_LOGISTICS",
            "text": "INDUSTRIAL_LOGISTICS",
            "icon": "../icons/default.png",
            "parent": "#",
            "parents": [
              "#"
            ],
            "children": [
              "http://data.total.com/resource/tsf/ontology/data-domains/industrial-logistics/52b2e5025c",
              "http://data.total.com/resource/tsf/ontology/data-domains/industrial-logistics/c340778c87"
            ],
            "children_d": [
              "http://data.total.com/resource/tsf/ontology/data-domains/industrial-logistics/52b2e5025c",
              "http://data.total.com/resource/tsf/ontology/data-domains/industrial-logistics/c340778c87"
            ],
            "state": {
              "loaded": true,
              "opened": true,
              "selected": true,
              "disabled": false
            },
            "li_attr": {
              "id": "INDUSTRIAL_LOGISTICS"
            },
            "a_attr": {
              "href": "#",
              "id": "INDUSTRIAL_LOGISTICS_anchor"
            },
            "original": {
              "id": "INDUSTRIAL_LOGISTICS",
              "text": "INDUSTRIAL_LOGISTICS",
              "parent": "#",
              "state": {}
            },
            "type": "default"
          },
          {
            "id": "http://data.total.com/resource/tsf/ontology/data-domains/industrial-logistics/52b2e5025c",
            "text": "Personnel On Board (POB)",
            "icon": "../icons/default.png",
            "parent": "INDUSTRIAL_LOGISTICS",
            "parents": [
              "INDUSTRIAL_LOGISTICS",
              "#"
            ],
            "children": [],
            "children_d": [],
            "data": {
              "source": "INDUSTRIAL_LOGISTICS",
              "label": "Personnel On Board (POB)",
              "id": "http://data.total.com/resource/tsf/ontology/data-domains/industrial-logistics/52b2e5025c"
            },
            "state": {
              "loaded": true,
              "opened": false,
              "selected": true,
              "disabled": false
            },
            "li_attr": {
              "id": "http://data.total.com/resource/tsf/ontology/data-domains/industrial-logistics/52b2e5025c"
            },
            "a_attr": {
              "href": "#",
              "id": "http://data.total.com/resource/tsf/ontology/data-domains/industrial-logistics/52b2e5025c_anchor"
            },
            "original": {
              "id": "http://data.total.com/resource/tsf/ontology/data-domains/industrial-logistics/52b2e5025c",
              "text": "Personnel On Board (POB)",
              "parent": "INDUSTRIAL_LOGISTICS",
              "state": {}
            },
            "type": "default"
          },
          {
            "id": "http://data.total.com/resource/tsf/ontology/data-domains/industrial-logistics/c340778c87",
            "text": "Shipment",
            "icon": "../icons/default.png",
            "parent": "INDUSTRIAL_LOGISTICS",
            "parents": [
              "INDUSTRIAL_LOGISTICS",
              "#"
            ],
            "children": [],
            "children_d": [],
            "data": {
              "source": "INDUSTRIAL_LOGISTICS",
              "label": "Shipment",
              "id": "http://data.total.com/resource/tsf/ontology/data-domains/industrial-logistics/c340778c87"
            },
            "state": {
              "loaded": true,
              "opened": false,
              "selected": true,
              "disabled": false
            },
            "li_attr": {
              "id": "http://data.total.com/resource/tsf/ontology/data-domains/industrial-logistics/c340778c87"
            },
            "a_attr": {
              "href": "#",
              "id": "http://data.total.com/resource/tsf/ontology/data-domains/industrial-logistics/c340778c87_anchor"
            },
            "original": {
              "id": "http://data.total.com/resource/tsf/ontology/data-domains/industrial-logistics/c340778c87",
              "text": "Shipment",
              "parent": "INDUSTRIAL_LOGISTICS",
              "state": {}
            },
            "type": "default"
          },*/
            {
                id: "TSF_GAIA_TEST",
                text: "TSF_GAIA_TEST",
                icon: "../icons/default.png",
                parent: "#",
                parents: ["#"],
                children: ["http://data.total.com/resource/tsf/ontology/gaia-test/de62adbf1d"],
                children_d: ["http://data.total.com/resource/tsf/ontology/gaia-test/de62adbf1d"],
                state: {
                    loaded: true,
                    opened: true,
                    selected: true,
                    disabled: false,
                },
                li_attr: {
                    id: "TSF_GAIA_TEST",
                },
                a_attr: {
                    href: "#",
                    id: "TSF_GAIA_TEST_anchor",
                },
                original: {
                    id: "TSF_GAIA_TEST",
                    text: "TSF_GAIA_TEST",
                    parent: "#",
                    state: {},
                },
                type: "default",
            },
            {
                id: "http://data.total.com/resource/tsf/ontology/gaia-test/de62adbf1d",
                text: "Wellbore",
                icon: "../icons/default.png",
                parent: "TSF_GAIA_TEST",
                parents: ["TSF_GAIA_TEST", "#"],
                children: [],
                children_d: [],
                data: {
                    source: "TSF_GAIA_TEST",
                    label: "Wellbore",
                    id: "http://data.total.com/resource/tsf/ontology/gaia-test/de62adbf1d",
                },
                state: {
                    loaded: true,
                    opened: false,
                    selected: true,
                    disabled: false,
                },
                li_attr: {
                    id: "http://data.total.com/resource/tsf/ontology/gaia-test/de62adbf1d",
                },
                a_attr: {
                    href: "#",
                    id: "http://data.total.com/resource/tsf/ontology/gaia-test/de62adbf1d_anchor",
                },
                original: {
                    id: "http://data.total.com/resource/tsf/ontology/gaia-test/de62adbf1d",
                    text: "Wellbore",
                    parent: "TSF_GAIA_TEST",
                    state: {},
                },
                type: "default",
            },
        ];
        var obj = {
            mergeDepth: "nodeAndAllDescendants",
            mergeMode: "keepUri",
            mergeRestrictions: true,
            jstreeNodes: jstreeNodes,
            targetSource: "0_ALL_TE_DATA_DOMAINS",
        };

        MainController.initControllers();
        self.mergeNodes(obj);
    };
    return self;
})();
