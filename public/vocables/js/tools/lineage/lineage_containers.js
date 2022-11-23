var Lineage_containers = (function () {
    var self = {};

    self.getContextJstreeMenu = function () {
        var items = {};
        items["NodeInfos"] = {
            label: "Node infos",
            action: function (_e) {
                SourceBrowser.showNodeInfos(Lineage_sources.activeSource, self.currentContainer, "mainDialogDiv");
            },
        };
        items["AddGraphNode"] = {
            label: "Add selected node to container",
            action: function (_e) {
                var graphNodeData = Lineage_classes.currentGraphNode.data;
                Lineage_containers.addResourcesToContainer(Lineage_sources.activeSource, self.currentContainer.data, graphNodeData);
            },
        };

        items["DeleteContainer"] = {
            label: "Delete container",
            action: function (_e) {
                Lineage_containers.deleteContainer(Lineage_sources.activeSource, self.currentContainer.data.id);
            },
        };

        items["ListMembers"] = {
            label: "List members",
            action: function (_e) {
                Lineage_containers.listContainerResources(Lineage_sources.activeSource, self.currentContainer.data.id);
            },
        };

        items["GraphResources"] = {
            label: "Graph resources",
            action: function (_e) {
                Lineage_containers.graphResources(Lineage_sources.activeSource, self.currentContainer.data.id);
            },
        };
        items["GraphResourcesDescendants"] = {
            label: "Graph resources descendants",
            action: function (_e) {
                Lineage_containers.graphResources(Lineage_sources.activeSource, self.currentContainer.data.id, { allDescendants: true });
            },
        };

        return items;
    };
    self.search = function () {
        if ($("#lineage_containers_containersJstree").jstree) $("#lineage_containers_containersJstree").empty();

        self.currentContainer = null;
        var term = $("#Lineage_containers_searchInput").val();
        var source = Lineage_sources.activeSource;

        var filter = "";
        if (term) filter = Sparql_common.setFilter("container", null, term);

        var fromStr = Sparql_common.getFromStr(source);
        var query =
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "select distinct * " +
            fromStr +
            "where {?container rdfs:label ?containerLabel.?container rdf:type rdf:Bag " +
            filter +
            " OPTIONAL {?container ^rdfs:member ?parentContainer.?parentContainer rdf:type rdf:Bag.?parentContainer rdfs:label ?parentContainerLabel}}";
        var sparql_url = Config.sources[source].sparql_server.url;
        var url = sparql_url + "?format=json&query=";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
            if (err) return alert(err.responseText);

            var jstreeData = [];
            result.results.bindings.forEach(function (item) {
                var parent = "#";
                if (item.parentContainer) parent = item.parentContainer.value;
                var node = {
                    id: item.container.value,
                    text: item.containerLabel.value,
                    parent: parent,
                    data: {
                        type: "container",
                        source: source,
                        id: item.container.value,
                        label: item.containerLabel.value,
                    },
                };
                jstreeData.push(node);
                self.currentContainer = node;
            });
            var options = {
                openAll: true,
                contextMenu: Lineage_containers.getContextJstreeMenu(),
                selectTreeNodeFn: Lineage_containers.onSelectedNodeTreeclick,
                dnd: {
                    drag_stop: function (data, element, helper, event) {
                        self.onMoveContainer(data, element, helper, event);
                    },
                },
            };

            common.jstree.loadJsTree("lineage_containers_containersJstree", jstreeData, options);
        });
    };

    self.addContainer = function (source) {
        if (!source) source = Lineage_sources.activeSource;

        var newContainerLabel = prompt("enter new container label)");
        if (!newContainerLabel) return;

        var containerUri = Config.sources[source].graphUri + "bag/" + common.formatStringForTriple(newContainerLabel, true);

        var triples = [];

        if (self.currentContainer && self.currentContainer.id != containerUri) {
            triples.push({
                subject: "<" + self.currentContainer.data.id + ">",
                predicate: " rdfs:member",
                object: "<" + containerUri + ">",
            });
        }

        triples.push({
            subject: "<" + containerUri + ">",
            predicate: " rdf:type",
            object: "<http://www.w3.org/1999/02/22-rdf-syntax-ns#Bag>",
        });
        triples.push({
            subject: containerUri,
            predicate: " rdfs:label",
            object: newContainerLabel,
        });
        Sparql_generic.insertTriples(source, triples, null, function (err, result) {
            if (err) return alert(err.responseText);
            var parent = self.currentContainer || "#";
            var newNode = {
                id: containerUri,
                text: newContainerLabel,
                parent: parent,
                data: {
                    type: "container",
                    source: source,
                    id: containerUri,
                    label: newContainerLabel,
                },
            };

            if (!$("#lineage_containers_containersJstree").jstree) {
                // initialize jstree
                self.search(function (err, result) {
                    $("#lineage_containers_containersJstree")
                        .jstree()
                        .create_node(parent, newNode, "first", function (err, result) {
                            $("#lineage_containers_containersJstree").jstree().open_node(parent);
                        });
                });
            } else {
                $("#lineage_containers_containersJstree")
                    .jstree()
                    .create_node(parent, newNode, "first", function (err, result) {
                        $("#lineage_containers_containersJstree").jstree().open_node(parent);
                    });
            }

            self.currentContainer = null;
        });
    };

    /**
     *
     * add nodes to a container(owl:bag)
     *
     *
     * @param source
     * @param container
     * @param nodesData
     * @param drawMembershipEdge add the edge (and the node) on the vizGraph
     */
    self.addResourcesToContainer = function (source, container, nodesData, drawMembershipEdge, callback) {
        if (container.type != "container") return alert("can only add resources to containers");
        // self.currentContainer=null;
        if (!Array.isArray(nodesData)) nodesData = [nodesData];

        var otherSourcesNodes = [];
        var triples = [];
        nodesData.forEach(function (nodeData) {
            if (container.id == nodeData.id) return alert("a  node cannot be member of itself");

            if (!nodeData.source) return console.log(" node without source");
            if (nodeData.source == source) {
                triples.push({
                    subject: "<" + container.id + ">",
                    predicate: "<http://www.w3.org/2000/01/rdf-schema#member>",
                    object: "<" + nodeData.id + ">",
                });
            } else {
                otherSourcesNodes.push(node.id);
            }
        });

        Sparql_generic.insertTriples(source, triples, null, function (err, result) {
            if (err) {
                if (callback) return callback(err);
                return alert(err.responseText);
            }
            MainController.UI.message("nodes added to container " + container.label);
            var jstreeData = [];
            nodesData.forEach(function (nodeData) {
                jstreeData.push({
                    id: nodeData.id,
                    text: nodeData.label,
                    parent: container.id,
                    type: "class",
                    data: {
                        type: "resource",
                        source: source,
                        id: nodeData.id,
                        label: nodeData.label,
                    },
                });
            });
            if ($("#lineage_containers_containersJstree").jstree) common.jstree.addNodesToJstree("lineage_containers_containersJstree", container.id, jstreeData);

            if (drawMembershipEdge) {
                var existingNodes = visjsGraph.getExistingIdsMap();
                var edges = [];
                nodesData.forEach(function (nodeData) {
                    var edgeId = container.id + "_" + "member" + "_" + nodeData.id;
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1;
                        edges.push({
                            id: edgeId,
                            from: container.id,
                            to: nodeData.id,

                            data: { propertyId: "http://www.w3.org/2000/01/rdf-schema#member", source: source },
                            font: { multi: true, size: 10 },

                            //  dashes: true,
                            color: "#8528c9",
                        });
                    }
                });

                visjsGraph.data.edges.add(edges);
            }
            if (callback) return callback(null);
        });
    };

    self.deleteContainer = function (source, containerId) {
        self.currentContainer = null;
        Sparql_generic.deleteTriples(source, containerId, null, null, function (err) {
            if (err) return alert(err.responseText);

            Sparql_generic.deleteTriples(source, null, null, containerId, function (err) {
                var node = $("#lineage_containers_containersJstree").jstree().get_node(containerId);
                if (node.children.length > 0) $("#lineage_containers_containersJstree").jstree().move_node(node.children, "#");
                $("#lineage_containers_containersJstree").jstree().delete_node(containerId);
            });
        });
    };

    self.getContainerResources = function (source, containerIds, options, callback) {
        var containers;
        var firstContainer;
        if (!Array.isArray(containerIds)) {
            containers = [containerIds];
            firstContainer = containerIds;
        } else {
            containers = containerIds;
            firstContainer = containerIds[0];
        }

        if (options.allDescendants) {
            var descendantObjs = common.jstree.getNodeDescendants("lineage_containers_containersJstree", firstContainer, null);
            var descendantIds = [];
            descendantObjs.forEach(function (item) {
                if (item.data.type == "container") descendantIds.push(item.data.id);
            });
            var containerObj = $("#lineage_containers_containersJstree").jstree().get_node(firstContainer);
            containers = containers.concat(descendantIds);
        }
        var filter;
        if (!options.allMemberTypes) var filter = "filter(?objectType !=rdf:Bag)";
        Sparql_OWL.getFilteredTriples(source, containers, "http://www.w3.org/2000/01/rdf-schema#member", null, { filter: filter }, function (err, result) {
            return callback(err, result);
        });
    };
    self.listContainerResources = function (source, containerId) {
        var existingChildren = common.jstree.getjsTreeNodes("lineage_containers_containersJstree", true, containerId);
        var filter = "filter(?objectType !=rdf:Bag)";
        self.getContainerResources(source, containerId, {}, function (err, result) {
            if (err) return alert(err.responseText);
            var jstreeData = [];
            result.forEach(function (item) {
                if (existingChildren.indexOf(item.object.value) < 0) {
                    jstreeData.push({
                        id: item.object.value,
                        text: item.objectLabel.value,
                        parent: item.subject.value,
                        type: "class",
                        data: {
                            type: "resource",
                            source: source,
                            id: item.object.value,
                            label: item.objectLabel.value,
                        },
                    });
                }
            });
            common.jstree.addNodesToJstree("lineage_containers_containersJstree", containerId, jstreeData);
        });
    };

    self.graphResources = function (source, containerId, options) {
        if (!options) options = {};
        if (options.allDescendants) options.allMemberTypes = true;
        var existingChildren = common.jstree.getjsTreeNodes("lineage_containers_containersJstree", true, containerId);
        // var filter = "filter(?objectType !=rdf:Bag)";
        self.getContainerResources(source, containerId, options, function (err, result) {
            if (err) return alert(err.responseText);

            var color = Lineage_classes.getSourceColor(source);
            var existingNodes = visjsGraph.getExistingIdsMap();
            var visjsData = { nodes: [], edges: [] };
            result.forEach(function (item) {
                if (!existingNodes[item.subject.value]) {
                    existingNodes[item.subject.value] = 1;
                    var type;
                    if (item.subjectType && item.subjectType.value == "http://www.w3.org/1999/02/22-rdf-syntax-ns#Bag") {
                        type = "container";
                    } else type = "resource";

                    visjsData.nodes.push({
                        id: item.subject.value,
                        label: item.subjectLabel.value,
                        shadow: self.nodeShadow,
                        shape: type == "container" ? "ellipse" : "dot",
                        size: Lineage_classes.defaultShapeSize,
                        font: type == "container" ? { color: "#eee" } : null,
                        color: color,
                        data: {
                            type: type,
                            source: source,
                            id: item.subject.value,
                            label: item.subjectLabel.value,
                        },
                    });
                }

                if (!existingNodes[item.object.value]) {
                    existingNodes[item.object.value] = 1;
                    var type;
                    if (item.objectType && item.objectType.value == "http://www.w3.org/1999/02/22-rdf-syntax-ns#Bag") {
                        type = "container";
                    } else type = "resource";
                    visjsData.nodes.push({
                        id: item.object.value,
                        label: item.objectLabel.value,

                        shadow: self.nodeShadow,
                        shape: type == "container" ? "ellipse" : "dot",
                        size: Lineage_classes.defaultShapeSize,
                        font: type == "container" ? { color: "#eee" } : null,
                        color: color,
                        data: {
                            type: "container",
                            source: source,
                            id: item.object.value,
                            label: item.objectLabel.value,
                        },
                    });
                }

                var edgeId = item.subject.value + "_" + "member" + "_" + item.object.value;
                if (!existingNodes[edgeId]) {
                    existingNodes[edgeId] = 1;

                    visjsData.edges.push({
                        id: edgeId,
                        from: item.subject.value,
                        to: item.object.value,
                        //label: "<i>" + item.propertyLabel.value + "</i>",
                        data: { propertyId: item.property.value, source: source },
                        font: { multi: true, size: 10 },

                        //  dashes: true,
                        color: "#8528c9",
                    });
                }
            });
            if (!visjsGraph.data || !visjsGraph.data.nodes) {
                Lineage_classes.drawNewGraph(visjsData);
            } else {
                visjsGraph.data.nodes.add(visjsData.nodes);
                visjsGraph.data.edges.add(visjsData.edges);
            }
            visjsGraph.network.fit();
            $("#waitImg").css("display", "none");
        });
    };

    self.onSelectedNodeTreeclick = function (event, obj) {
        self.currentContainer = obj.node;
    };

    self.onMoveContainer = function (data, element, helper, event) {
        var sourceNodeId = element.data.nodes[0];
        var targetNodeAnchor = element.event.target.id;
        var targetNodeId = targetNodeAnchor.substring(0, targetNodeAnchor.indexOf("_anchor"));

        var graphUri = Config.sources[Lineage_sources.activeSource].graphUri;
        var query =
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "with <" +
            graphUri +
            ">" +
            "delete {?s rdfs:member <" +
            sourceNodeId +
            ">}" +
            "insert {<" +
            targetNodeId +
            "> rdfs:member <" +
            sourceNodeId +
            ">}";

        var url = Config.sources[Lineage_sources.activeSource].sparql_server.url + "?format=json&query=";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: Lineage_sources.activeSource }, function (err, result) {
            if (err) {
                return callback(err);
            }
        });
    };
    return self;
})();
