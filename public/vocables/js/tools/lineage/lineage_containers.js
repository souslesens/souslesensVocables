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
        items["GraphNode"] = {
            label: "graphNode",
            action: function (_e) {
                if (self.currentContainer.data.type == "container") Lineage_containers.graphResources(Lineage_sources.activeSource, self.currentContainer.id, { onlyChildren: true });
                else Lineage_classes.drawNodeAndParents(self.currentContainer.data, 3);
            },
        };

        items["GraphContainerDescendantContainers"] = {
            label: "Graph  descendants containers",
            action: function (_e) {
                Lineage_containers.graphResources(Lineage_sources.activeSource, self.currentContainer.data.id, { bags: true });
            },
        };
        /*    items["GraphResources"] = {
            label: "Graph container resources",
            action: function (_e) {
                Lineage_containers.graphResources(Lineage_sources.activeSource, self.currentContainer.data.id, { nodes: true });
            },
        };*/

        items["GraphContainerDescendantResources"] = {
            label: "Graph  descendants resources",
            action: function (_e) {
                Lineage_containers.graphResources(Lineage_sources.activeSource, self.currentContainer.data.id, { nodes: true });
            },
        };
        /*  items["GraphContainerAncestors"] = {
  label: "Graph container ancestors",
  action: function(_e) {
    Lineage_containers.graphResources(Lineage_sources.activeSource, self.currentContainer.data.id, { containers:true,ancestors: true });
  }
};*/

        /*  items["GraphResourcesDescendants"] = {
  label: "Graph container and all resources",
  action: function(_e) {
    Lineage_containers.graphResources(Lineage_sources.activeSource, self.currentContainer.data.id, { nodes:true,descendants:true});
  }
};*/

        return items;
    };
    self.search = function () {
        if ($("#lineage_containers_containersJstree").jstree) $("#lineage_containers_containersJstree").empty();

        self.currentContainer = null;
        var term = $("#Lineage_containers_searchInput").val();
        var searchWhat = $("#Lineage_containers_searchWhatInput").val();
        var source = Lineage_sources.activeSource;

        /*  var options={}
      var filter = "";
      if (term)
        options.filter = Sparql_common.setFilter(["member","container"], null, term);
      if(searchWhat=="bags")
        options.bags=true;
      else
        options.nodes=true

      self.sparql_queries.getContainerDescendants(Lineage_sources.activeSource,null,{filter:filter},function(err,result){

      })

  return;*/
        var filter = "";
        if (term) filter = Sparql_common.setFilter("member", null, term);
        var memberType;
        if (searchWhat == "bags") memberType = "=rdf:Bag";
        if (searchWhat == "classes") memberType = "=owl:Class";
        if (searchWhat == "individuals") memberType = "=owl:NamedIndividual";
        else if (searchWhat == "nodes") memberType = " in (owl:Class,owl:NamedIndividual)";

        if (searchWhat != "bags" && !term) return alert("enter a term to search for");

        var fromStr = Sparql_common.getFromStr(source, null, true);
        var query =
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "select distinct * " +
            fromStr +
            "where {?member rdfs:label ?memberLabel.?member rdf:type ?memberType  filter(?memberType" +
            memberType +
            ")" +
            " OPTIONAL {?member ^rdfs:member ?parentContainer.?parentContainer rdf:type rdf:Bag.?parentContainer rdfs:label ?parentContainerLabel}" +
            filter +
            "}";
        var sparql_url = Config.sources[source].sparql_server.url;
        var url = sparql_url + "?format=json&query=";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
            if (err) return alert(err.responseText);

            var nodesMap = {};
            result.results.bindings.forEach(function (item) {
                //  var nodeId=item.parent+"_"+item.member.value

                nodesMap[item.member.value] = item;
            });

            var jstreeData = [];

            for (var nodeId in nodesMap) {
                if (nodeId == "http://datalenergies.total.com/resource/tsf/iso-14224-bags/bag/ISO-142224") var x = 3;
                var item = nodesMap[nodeId];
                var parent = "#";
                if (item.parentContainer) {
                    parent = item.parentContainer.value;
                    if (item.parentContainer.value == nodeId) parent = "#";
                    if (!nodesMap[item.parentContainer.value]) {
                        var parentNode = {
                            id: parent,
                            text: item.parentContainerLabel.value,
                            parent: "#",
                            data: {
                                type: "rdf:Bag",
                                source: source,
                                id: parent,
                                text: item.parentContainer.value,
                                currentParent: "#",
                            },
                        };
                        jstreeData.push(parentNode);
                    }
                }

                var node = {
                    id: nodeId,
                    text: item.memberLabel.value,
                    parent: parent,
                    data: {
                        type: memberType,
                        source: source,
                        id: item.member.value,
                        text: item.memberLabel.value,
                        currentParent: parent,
                    },
                };
                jstreeData.push(node);
            }

            var options = {
                openAll: false,
                contextMenu: Lineage_containers.getContextJstreeMenu(),
                selectTreeNodeFn: Lineage_containers.onSelectedNodeTreeclick,
                dnd: {
                    drag_stop: function (data, element, helper, event) {
                        self.onMoveContainer(data, element, helper, event);
                    },
                    drag_start: function (data, element, helper, event) {
                        var sourceNodeId = element.data.nodes[0];
                        self.currenDraggingNodeSourceParent = $("#lineage_containers_containersJstree").jstree().get_node(sourceNodeId).parent;
                    },
                },
            };

            common.jstree.loadJsTree("lineage_containers_containersJstree", jstreeData, options, function () {
                $("#lineage_containers_containersJstree").jstree().open_node("#");
            });
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
        if (!confirm("delete container)")) return;
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
            //  $("#lineage_containers_containersJstree").jstree().open_all()
            var descendantObjs = common.jstree.getNodeDescendants("lineage_containers_containersJstree", firstContainer, null);
            var descendantIds = [];
            descendantObjs.forEach(function (item) {
                if (item.data.type == "container") descendantIds.push(item.data.id);
            });
            var containerObj = $("#lineage_containers_containersJstree").jstree().get_node(firstContainer);
            containers = containers.concat(descendantIds);
        }

        var subjects = containers;
        var objects = null;
        var propFilter = "";
        var objectTypeFilter;
        if (options.nodes) {
            objectTypeFilter = "filter(?objectType !=rdf:Bag)";
        } else if (options.containers) {
            objectTypeFilter = "filter(?objectType =rdf:Bag)";
        } else {
            objectTypeFilter = "";
        }

        if (options.descendants) {
            propFilter = "http://www.w3.org/2000/01/rdf-schema#member";
        } else if (options.ancestors) {
            var subjects = null;
            var objects = containers;
        } else {
            propFilter = "";
        }

        if (!propFilter && !objectTypeFilter) return alert("no filter set");

        Sparql_OWL.getFilteredTriples(source, subjects, propFilter, objects, { filter: objectTypeFilter }, function (err, result) {
            return callback(err, result);
        });
    };
    self.listContainerResources = function (source, containerId) {
        var existingChildren = common.jstree.getjsTreeNodes("lineage_containers_containersJstree", true, containerId);
        var filter = "filter(?objectType !=rdf:Bag)";
        self.getContainerResources(source, containerId, { nodes: true, descendants: true }, function (err, result) {
            if (err) return alert(err.responseText);
            var jstreeData = [];
            result.forEach(function (item) {
                if (existingChildren.indexOf(item.object.value) < 0) {
                    existingChildren.push(item.object.value);

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
        var existingChildren = common.jstree.getjsTreeNodes("lineage_containers_containersJstree", true, containerId);
        // var filter = "filter(?objectType !=rdf:Bag)";

        var data = [];
        var descendants = [];
        async.series(
            [
                //getContainers descendants type container
                function (callbackSeries) {
                    if (options.nodes) return callbackSeries();
                    options.nodes = false;
                    options.bags = true;
                    self.sparql_queries.getContainerDescendants(Lineage_sources.activeSource, containerId, options, function (err, result) {
                        if (err) return callbackSeries(err);
                        data = data.concat(result.results.bindings);
                        return callbackSeries();
                    });
                },
                //getContainers descendants type node
                function (callbackSeries) {
                    if (options.bags) return callbackSeries();
                    options.nodes = true;
                    options.bags = false;
                    self.sparql_queries.getContainerDescendants(Lineage_sources.activeSource, containerId, options, function (err, result) {
                        if (err) return callbackSeries(err);
                        data = data.concat(result.results.bindings);
                        return callbackSeries();
                    });
                },
                function (callbackSeries) {
                    var color = Lineage_classes.getSourceColor(source);
                    var opacity = 1.0;
                    var existingNodes = visjsGraph.getExistingIdsMap();
                    var visjsData = { nodes: [], edges: [] };
                    data.forEach(function (item) {
                        if (!existingNodes[item.container0.value]) {
                            existingNodes[item.container0.value] = 1;
                            var type = "container";
                            var color2 = common.colorToRgba(color, opacity * 1);
                            visjsData.nodes.push({
                                id: item.container0.value,
                                label: item.container0Label.value,
                                shadow: self.nodeShadow,
                                shape: type == "container" ? "box" : "dot",
                                size: Lineage_classes.defaultShapeSize,
                                font: type == "container" ? { color: "#eee" } : null,
                                color: color2,
                                data: {
                                    type: type,
                                    source: source,
                                    id: item.container0.value,
                                    label: item.container0Label.value,
                                },
                            });
                        }

                        if (item.container && !existingNodes[item.container.value]) {
                            existingNodes[item.container.value] = 1;
                            var type;
                            var color2 = color;
                            if (item.containerType && item.containerType.value == "http://www.w3.org/1999/02/22-rdf-syntax-ns#Bag") {
                                type = "container";
                                color2 = common.colorToRgba(color, opacity * 0.75);
                            } else type = "resource";

                            if (!item.containerLabel) var x = 3;
                            visjsData.nodes.push({
                                id: item.container.value,
                                label: item.containerLabel.value,
                                shadow: self.nodeShadow,
                                shape: type == "container" ? "box" : "dot",
                                size: Lineage_classes.defaultShapeSize,
                                font: type == "container" ? { color: "#fff", size: 12 } : null,
                                color: color2,
                                data: {
                                    type: type,
                                    source: source,
                                    id: item.container.value,
                                    label: item.containerLabel.value,
                                },
                            });
                        }
                        if (item.container) {
                            var edgeId = item.container0.value + "_" + "member" + "_" + item.container.value;
                            if (item.container && !existingNodes[edgeId]) {
                                existingNodes[edgeId] = 1;

                                visjsData.edges.push({
                                    id: edgeId,
                                    from: item.container0.value,
                                    to: item.container.value,
                                    //label: "<i>" + item.propertyLabel.value + "</i>",
                                    data: { from: item.container0.value, to: item.container.value, source: source },
                                    font: { multi: true, size: 10 },

                                    //  dashes: true,
                                    color: "#8528c9",
                                });
                            }
                        }

                        if (item.member && !existingNodes[item.member.value]) {
                            existingNodes[item.member.value] = 1;
                            var type;
                            var color2 = color;
                            if (item.memberType && item.memberType.value == "http://www.w3.org/1999/02/22-rdf-syntax-ns#Bag") {
                                type = "container";
                                color2 = common.colorToRgba(color, opacity * 0.6);
                            } else type = "resource";
                            visjsData.nodes.push({
                                id: item.member.value,
                                label: item.memberLabel.value,

                                shadow: self.nodeShadow,
                                shape: type == "container" ? "box" : "dot",
                                size: Lineage_classes.defaultShapeSize,
                                font: type == "container" ? { color: "#fff", size: 10 } : null,
                                color: color2,
                                data: {
                                    type: "container",
                                    source: source,
                                    id: item.member.value,
                                    label: item.memberLabel.value,
                                },
                            });
                        }
                        if (item.member) {
                            var edgeId = item.container.value + "_" + "member" + "_" + item.member.value;
                            if (item.member && !existingNodes[edgeId]) {
                                existingNodes[edgeId] = 1;

                                visjsData.edges.push({
                                    id: edgeId,
                                    from: item.container.value,
                                    to: item.member.value,
                                    //label: "<i>" + item.propertyLabel.value + "</i>",
                                    data: {
                                        from: item.container.value,
                                        to: item.member.value,
                                        source: source,
                                    },
                                    font: { multi: true, size: 10 },

                                    //  dashes: true,
                                    color: "#8528c9",
                                });
                            }
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

                    return callbackSeries();
                },
            ],
            function (err) {
                return;
            }
        );
    };

    self.onSelectedNodeTreeclick = function (event, obj) {
        self.currentContainer = obj.node;
        if (obj.event.button != 2) self.listContainerResources(Lineage_sources.activeSource, self.currentContainer.data.id);
    };

    self.onMoveContainer = function (data, element, helper, event) {
        var sourceNodeId = element.data.nodes[0];
        var oldParent = self.currenDraggingNodeSourceParent;
        var targetNodeAnchor = element.event.target.id;
        var newParent = targetNodeAnchor.substring(0, targetNodeAnchor.indexOf("_anchor"));

        var graphUri = Config.sources[Lineage_sources.activeSource].graphUri;
        var query =
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "with <" +
            graphUri +
            "> delete {<" +
            oldParent +
            "> rdfs:member <" +
            sourceNodeId +
            ">}" +
            "insert {<" +
            newParent +
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

    self.sparql_queries = {
        getContainerDescendants: function (source, containerId, options, callback) {
            var fromStr = Sparql_common.getFromStr(source, false, true);
            var query =
                "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
                "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                "select distinct *     " +
                fromStr +
                " WHERE { ?container0  rdf:type rdf:Bag. ?container0 <http://www.w3.org/2000/01/rdf-schema#member> ?container. " +
                " OPTIONAL {?container0 rdfs:label ?container0Label.}" +
                " OPTIONAL {?container rdfs:label ?containerLabel.}";

            query += " ?container rdf:type ?containerType. ";
            if (options.bags) query += " filter( ?containerType = rdf:Bag)\n";
            if (options.classes) query += "filter( ?containerType =owl:Class)\n";
            if (options.individuals) query += "   filter( ?containerType = owl:NamedIndividual)\n";
            if (options.nodes) query += " filter( ?containerType in (owl:Class,owl:NamedIndividual)) \n";

            if (!options.onlyChildren) {
                query += " OPTIONAL { ?container <http://www.w3.org/2000/01/rdf-schema#member>+ ?member. optional{?member rdfs:label ?memberLabel.}";
                if (options.bags) query += "   ?member rdf:type ?memberType. filter(?memberType=rdf:Bag)\n";
                if (options.classes) query += "  ?member rdf:type?memberType. filter(?memberType=owl:Class).\n";
                if (options.individuals) query += " ?member rdf:type ?memberType. filter(?memberType=owl:NamedIndividual).\n";
                if (options.nodes) query += "  ?member rdf:type ?memberType. filter( ?memberType in (owl:Class,owl:NamedIndividual)) \n";
                query += "}";
            }
            if (options.filter) query += " " + options.filter;

            if (containerId) {
                var filterContainerFrom = "";
                filterContainerFrom = Sparql_common.setFilter("container0", containerId);
                query += filterContainerFrom;
            }

            query += "} limit 10000";

            var url = Config.sources[source].sparql_server.url + "?format=json&query=";

            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
                if (err) return callback(err);
                return callback(null, result);
            });
        },
    };

    return self;
})();
