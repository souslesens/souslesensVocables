import Lineage_whiteboard from "../lineage/lineage_whiteboard.js";
import Lineage_styles from "../lineage/lineage_styles.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import common from "../../shared/common.js";
import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";

self.lineageVisjsGraph;

var Lineage_containers = (function () {
    var self = {};

    self.containerStyle = { shape: "square", color: "#ecba4c" };
    self.nbOfancestors_tree_search = 0;
    self.ancestors_tree_search_areRunning = [false, false, false];
    self.flag_search = false;
    self.flag_search_launch_search = false;
    self.flag_function = function () {
        self.flag_search = false;
        if (self.flag_search_launch_search == true) {
            Lineage_containers.search();
            self.flag_search_launch_search = false;
        }
    };
    self.add_supplementary_layer_for_types_icon = null;

    self.getContextJstreeMenu = function () {
        var items = {};
        items["NodeInfos"] = {
            label: "Node infos",
            action: function (_e) {
                NodeInfosWidget.showNodeInfos(Lineage_sources.activeSource, self.currentContainer, "mainDialogDiv");
            },
        };
        items["GraphNode"] = {
            label: "Graph node",
            action: function (_e) {
                if (self.currentContainer.data.type == "container") {
                    Lineage_containers.graphResources(Lineage_sources.activeSource, self.currentContainer.data, { onlyOneLevel: true });
                } else {
                    Lineage_whiteboard.drawNodesAndParents(self.currentContainer, 0);
                }
            },
        };
        items["Open node"] = {
            label: "Open node",
            action: function (_e) {
                // $("#lineage_containers_containersJstree").jstree().open_all(self.currentContainer.id);
                Lineage_containers.listContainerResources(Lineage_sources.activeSource, self.currentContainer, { onlyOneLevel: true, leaves: true });
            },
        };
        items.copyNodes = {
            label: "Copy Node(s)",
            action: function (e) {
                // pb avec source
                Lineage_whiteboard.copyNode(e);
                var selectedNodes = $("#lineage_containers_containersJstree").jstree().get_selected(true);
                Lineage_common.copyNodeToClipboard(selectedNodes);
            },
        };
        items["AddGraphNode"] = {
            label: "Add selected node to container",
            action: function (_e) {
                var graphNodeData = Lineage_whiteboard.currentGraphNode.data;
                Lineage_containers.addResourcesToContainer(Lineage_sources.activeSource, self.currentContainer, graphNodeData);
            },
        };
        items["PasteNodesInContainer"] = {
            label: "Paste nodes in container",
            action: function (_e) {
                Lineage_containers.pasteNodesInContainer(Lineage_sources.activeSource, self.currentContainer);
            },
        };

        items["DeleteContainer"] = {
            label: "Delete container",
            action: function (_e) {
                Lineage_containers.deleteContainer(Lineage_sources.activeSource, self.currentContainer);
            },
        };

        items["GraphContainerDescendant"] = {
            label: "Graph  descendants",
            action: function (_e) {
                Lineage_containers.graphResources(Lineage_sources.activeSource, self.currentContainer.data, { descendants: true });
            },
        };
        items["GraphContainerDescendantAndLeaves"] = {
            label: "Graph  descendants + leaves",
            action: function (_e) {
                Lineage_containers.graphResources(Lineage_sources.activeSource, self.currentContainer.data, { leaves: true });
            },
        };

        /*  items["GraphContainerSetStyle"] = {
label: "Set Style",
action: function(_e) {
Lineage_styles.showDialog(self.currentContainer.data);
}
};*/

        return items;
    };

    self.search = function (memberType, callback) {
        if (!callback) {
            callback = function () {};
        }

        var term = $("#Lineage_containers_searchInput").val();
        var searchWhat = $("#Lineage_containers_searchWhatInput").val();
        var source = Lineage_sources.activeSource;

        if (!memberType) {
            memberType = "";
        }

        var filter = "";
        if (term) {
            filter = Sparql_common.setFilter("member", null, term);
        }

        var search_on_container = "";

        if (searchWhat == "current") {
            if (!self.currentContainer) {
                alert("no selected container");
                return;
            }
            search_on_container = self.currentContainer.data.id;
            if (!(self.currentContainer.data.type == "container" || self.currentContainer.data.type.includes("http://www.w3.org/1999/02/22-rdf-syntax-ns#Bag"))) {
                alert("not a bag");
                return;
            }
        }

        self.currentContainer = null;
        /*  self.listContainerResources(source, null, { filter:filter })


return;*/
        if ($("#lineage_containers_containersJstree").jstree) {
            $("#lineage_containers_containersJstree").empty();
        }
        if (self.flag_search == false) {
            self.drawContainerJstree(source, filter, "lineage_containers_containersJstree", search_on_container, memberType, {}, function (err, result) {
                if (err) {
                    return alert(err.responseText);
                }
                callback();
            });
        } else {
            self.flag_search_launch_search = true;
        }
    };

    self.reset_tree = function (source, filter, jstreeDiv, memberType, options, callback) {
        if (!options) {
            options = {};
        }

        var fromStr = Sparql_common.getFromStr(source, null, true);
        /*
var query =
    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
    "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
    "select distinct * " +
    fromStr +
    "where {?member rdfs:label ?memberLabel.?member rdf:type ?memberType." +
    memberType +
    " OPTIONAL {?member ^rdfs:member ?parentContainer.?parentContainer rdf:type ?type.filter (?type in (rdf:Bag,rdf:List)).?parentContainer rdfs:label ?parentContainerLabel}" +
    " " +
    filter +
    "}";
*/

        var query = `
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            select distinct *   ${fromStr} where {
              ?firstLevel rdfs:label ?firstLevelLabel.
              ?firstLevel rdf:type ?firstLevelType.
              FILTER NOT EXISTS{?firstLevel ^rdfs:member ?noAscendance.}
              filter(?firstLevelType in (rdf:Bag,rdf:List) ). 
              ?firstLevel rdfs:member{0, ${Config.Lineage.numberOfContainersLevel} } ?member.
              ?member rdfs:label ?memberLabel.
              ?member rdf:type ?memberType.
              filter (?memberType in (rdf:Bag,rdf:List)).
                OPTIONAL {
                ?member ^rdfs:member ?parentContainer.
                
                 
                ?parentContainer rdf:type ?type.
                filter (?type in (rdf:Bag,rdf:List)).
                ?parentContainer rdfs:label ?parentContainerLabel
                

                }
             
                
              
            }

            `;
        var sparql_url = Config.sources[source].sparql_server.url;
        var url = sparql_url + "?format=json&query=";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
            if (err) {
                return callback(err);
            }

            var nodesMap = {};

            result.results.bindings.forEach(function (item) {
                //  var nodeId=item.parent+"_"+item.member.value
                if (!nodesMap[item.member.value]) {
                    item.jstreeId = "_" + common.getRandomHexaId(5);
                    nodesMap[item.member.value] = item;
                } else {
                    if (item.parentContainer.value) {
                        if (Array.isArray(nodesMap[item.member.value].parentContainer.value)) {
                            nodesMap[item.member.value].parentContainer.value.push(item.parentContainer.value);
                        } else {
                            nodesMap[item.member.value].parentContainer.value = [nodesMap[item.member.value].parentContainer.value, item.parentContainer.value];
                        }
                    }
                }
            });

            var uniqueNodes = {};

            var jstreeData = [];
            var multiple_parents = [];
            for (var nodeId in nodesMap) {
                var item = nodesMap[nodeId];
                var parent = "#";

                var memberType = "container";
                var multiple_skip = false;
                if (item.parentContainer) {
                    if (Array.isArray(item.parentContainer.value)) {
                        multiple_parents.push(item);
                        multiple_skip = true;
                    }
                }

                if (!multiple_skip) {
                    parent = item.parentContainer && nodesMap[item.parentContainer.value] ? nodesMap[item.parentContainer.value].jstreeId : "#";
                    if (!uniqueNodes[item.jstreeId]) {
                        uniqueNodes[item.jstreeId] = 1;

                        var node = {
                            id: item.jstreeId,
                            text: item.memberLabel.value,
                            parent: parent,
                            type: memberType,
                            data: {
                                type: memberType,
                                source: source,
                                id: item.member.value,
                                label: item.memberLabel.value,
                                currentParent: parent,
                                tabId: options.tabId,
                            },
                        };
                        jstreeData.push(node);
                    }
                }
            }
            for (var nodeId in multiple_parents) {
                var item = multiple_parents[nodeId];

                for (var parentId in item.parentContainer.value) {
                    var parent = item.parentContainer.value[parentId];
                    if (nodesMap[parent]) {
                        var node = {
                            id: "_" + common.getRandomHexaId(5),
                            text: item.memberLabel.value,
                            parent: parent,
                            type: "container",
                            data: {
                                type: "container",
                                source: source,
                                id: item.member.value,
                                label: item.memberLabel.value,
                                currentParent: parent,
                                tabId: options.tabId,
                            },
                        };
                        jstreeData.push(node);
                    }
                }
            }

            var jstreeOptions;
            if (options.jstreeOptions) {
                jstreeOptions = options.jstreeOptions;
            } else {
                jstreeOptions = {
                    openAll: false,
                    contextMenu: Lineage_containers.getContextJstreeMenu(),
                    selectTreeNodeFn: Lineage_containers.onSelectedNodeTreeclick,
                    dnd: {
                        drag_stop: function (data, element, helper, event) {
                            //  self.onMoveContainer(data, element, helper, event);
                        },
                        drag_start: function (data, element, helper, event) {
                            var sourceNodeId = element.data.nodes[0];
                            self.currenDraggingNodeSourceParent = $("#lineage_containers_containersJstree").jstree().get_node(sourceNodeId).parent;
                        },
                    },
                };
            }

            JstreeWidget.loadJsTree(jstreeDiv, jstreeData, jstreeOptions, function () {
                $("#" + jstreeDiv)
                    .jstree()
                    .open_node("#");
                self.bindMoveNode(jstreeDiv);
                callback(null);
            });
        });
    };

    self.orderResults = function (results) {
        var new_results = [];
        results.forEach(function (item) {
            var current_child = item.member.value;
            var path_uri_order = [];
            var label_uri_order = [];
            var distinct_uris = [];
            var type_uri_order = [];

            if (item.all.value) {
                var all_results = item.all.value.split(";;");
                for (let i = 0; i < all_results.length; i++) {
                    var result = JSON.parse(all_results[i]);
                    all_results[i] = result;
                    if (!distinct_uris.includes(result.parentUri)) {
                        distinct_uris.push(result.parentUri);
                    }
                }
                distinct_uris.forEach(function (distinct) {
                    for (let i = 0; i < all_results.length; i++) {
                        if (all_results[i].parentChild == current_child) {
                            if (!path_uri_order.includes(all_results[i].parentUri)) {
                                path_uri_order.push(all_results[i].parentUri);
                                label_uri_order.push(all_results[i].parentLabel);
                                type_uri_order.push(all_results[i].parentType);
                                current_child = all_results[i].parentUri;
                            }
                        }
                    }
                });
                path_uri_order = path_uri_order.reverse();
                item.allparents = { value: "" };
                item.allparents.value = path_uri_order.toString().replaceAll(",", ";;");
                label_uri_order = label_uri_order.reverse();
                item.allparentslabel = { value: "" };
                item.allparentslabel.value = label_uri_order.toString().replaceAll(",", ";;");
                type_uri_order = type_uri_order.reverse();
                item.types = { value: "" };
                item.types.value = type_uri_order.toString().replaceAll(",", ";;");
                new_results.push(item);
            }
        });

        return new_results;
    };
    // filter is a clause SPARQL clause filter like FILTER (regex(?memberLabel, "flu", "i"))
    //search_container is an URI chracter chain to indicates the search focus on this container
    //membertype is a list like  in (rdf:Bag,rdf:List) to indicates where type are filtered on the search, he is prefixed at (rdf:Bag,rdf:List) for not filtered clauses
    self.drawContainerJstree = function (source, filter, jstreeDiv, search_on_container, memberType, options, callback) {
        if (!options) {
            options = {};
        }
        var fromStr = Sparql_common.getFromStr(source, null, true);

        var values = "";
        var descendants_clause = "";
        if (search_on_container != "") {
            var values = `VALUES (?o) {
                (<${search_on_container}>)
                
                
            }`;
            var descendants_clause = "?member ^rdfs:member*  ?o.";
        }

        var memberTypefilter = "";
        if (memberType) {
            if (memberType != "") {
                memberTypefilter = `filter(str(?memberType) ${memberType} ).`;
            }
        } else {
            if (filter == "") {
                memberTypefilter = `filter(?memberType in (rdf:Bag,rdf:List) ).`;
            }
        }

        if (filter == "") {
            self.reset_tree(source, filter, jstreeDiv, memberTypefilter, options, callback);
        } else {
            var query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        SELECT distinct ?member ?memberLabel ?memberType ?subclasstype (GROUP_CONCAT(distinct ?allprop ; separator=";;")  as ?all)  ${fromStr}
        WHERE{
        
        
                        ?member ^rdfs:member* ?parentContainer.
                        ?parentContainer rdfs:member ?child.
                        ?parentContainer rdfs:label ?parentContainerLabel.
                        ?parentContainer rdf:type ?type.
                        filter (?type in (rdf:Bag,rdf:List)).
                        BIND( concat('{','"parentUri":"',str(?parentContainer),'","parentType":"',str(?type),'","parentLabel":"',str(?parentContainerLabel),'","parentChild":"',str(?child),'"}')  AS ?allprop).
                        ${values}        
        
                            
          
          
                {
          
                          select distinct *   where {
        
                        
                        
                        ?member rdfs:label ?memberLabel.
                        ?member rdf:type ?memberType.
                        ${descendants_clause}
                       
                        ${filter}
                        OPTIONAL{?member rdfs:subClassOf ?subclasstype.}
                        ${memberTypefilter}
                            
                        }
                        
                        LIMIT 100
                        OFFSET 0
        
                }	
        }
        
        
        `;

            var offset = 0;
            var resultSize = 100;

            self.nbOfancestors_tree_search += 1;
            if (self.ancestors_tree_search_areRunning[self.nbOfancestors_tree_search] == true) {
                self.ancestors_tree_search_areRunning[self.nbOfancestors_tree_search] = false;
                self.nbOfancestors_tree_search -= 1;
            }
            if (self.nbOfancestors_tree_search > 1) {
                self.ancestors_tree_search_areRunning[self.nbOfancestors_tree_search - 1] = false;
            }
            self.ancestors_tree_search_areRunning[self.nbOfancestors_tree_search] = true;
            var search_number = self.nbOfancestors_tree_search;
            async.whilst(
                function (_test) {
                    return resultSize > 0 && self.ancestors_tree_search_areRunning[search_number];
                },

                function differ(callbackWhilst) {
                    self.flag_search = true;
                    //iterate
                    var sparql_url = Config.sources[source].sparql_server.url;
                    var url = sparql_url + "?format=json&query=";
                    var query_split = query.split("OFFSET");
                    var query2 = query_split[0] + " OFFSET " + query_split[1].replace(/(\d+)/, offset);

                    Sparql_proxy.querySPARQL_GET_proxy(url, query2, null, { source: source }, function (err, result) {
                        if (err) {
                            return callbackWhilst(err);
                        }

                        resultSize = result.results.bindings.length;
                        var nodesMap = {};

                        var ordered_results = self.orderResults(result.results.bindings);

                        result.results.bindings.forEach(function (item) {
                            var node_in_tree = false;

                            if (!nodesMap[item.member.value]) {
                                if (offset > 0) {
                                    var node_in_tree = JstreeWidget.getNodeByURI(jstreeDiv, item.member.value);
                                }
                                var jstreeId = "_" + common.getRandomHexaId(5);
                                if (node_in_tree != false) {
                                    jstreeId = node_in_tree.id;
                                }

                                var node = { id: item.member.value, jstreeid: jstreeId, label: item.memberLabel.value, types: [], subclass: [], parent: "#" };
                                if (item.memberType) {
                                    node.types.push(item.memberType.value);
                                }
                                if (item.subclasstype) {
                                    node.subclass.push(item.subclasstype.value);
                                }

                                nodesMap[item.member.value] = node;
                            } else {
                                if (item.memberType) {
                                    if (!nodesMap[item.member.value].types.includes(item.memberType.value)) {
                                        nodesMap[item.member.value].types.push(item.memberType.value);
                                    }
                                }
                                if (item.subclasstype) {
                                    if (!nodesMap[item.member.value].subclass.includes(item.subclasstype.value)) {
                                        nodesMap[item.member.value].subclass.push(item.subclasstype.value);
                                    }
                                }
                            }

                            if (item.allparents) {
                                var parents_iris = item.allparents.value.split(";;");
                                var parents_labels = item.allparentslabel.value.split(";;");
                                var parents_types = item.types.value.split(";;");

                                for (let i = parents_iris.length - 1; i >= 0; i--) {
                                    if (!nodesMap[parents_iris[i]]) {
                                        var jstreeId = "_" + common.getRandomHexaId(5);
                                        if (offset > 0) {
                                            var node_in_tree = JstreeWidget.getNodeByURI(jstreeDiv, parents_iris[i]);
                                        }
                                        if (node_in_tree != false) {
                                            jstreeId = node_in_tree.id;
                                        }

                                        var node = { id: parents_iris[i], jstreeid: jstreeId, label: parents_labels[i], types: [parents_types[i]], subclass: [], parent: "#" };
                                    } else {
                                        var node = nodesMap[parents_iris[i]];
                                        if (!node.types.includes(parents_types[i])) {
                                            node.types.push(parents_types[i]);
                                        }
                                    }

                                    if (i != 0) {
                                        if (node.id != parents_iris[i - 1]) {
                                            node["parent"] = parents_iris[i - 1];
                                        }
                                    }

                                    nodesMap[parents_iris[i]] = node;

                                    if (i == parents_iris.length - 1) {
                                        nodesMap[item.member.value].parent = parents_iris[i];
                                    }
                                }
                            }
                        });

                        var jstreeData = [];

                        for (var nodeId in nodesMap) {
                            var item = nodesMap[nodeId];
                            var parent = "#";
                            if (!(item.parent == "#")) {
                                var parent = nodesMap[item.parent].jstreeid;
                            }

                            var type_icon = JstreeWidget.selectTypeForIconsJstree(item.types, self.add_supplementary_layer_for_types_icon);

                            var node = {
                                id: item.jstreeid,
                                text: item.label,
                                parent: parent,
                                type: type_icon,
                                data: {
                                    type: item.types,
                                    source: source,
                                    id: item.id,
                                    label: item.label,
                                    currentParent: parent,
                                    tabId: options.tabId,
                                },
                            };

                            jstreeData.push(node);
                        }

                        var jstreeOptions;
                        if (options.jstreeOptions) {
                            jstreeOptions = options.jstreeOptions;
                        } else {
                            jstreeOptions = {
                                openAll: false,
                                contextMenu: Lineage_containers.getContextJstreeMenu(),
                                selectTreeNodeFn: Lineage_containers.onSelectedNodeTreeclick,
                                /*  dnd: {
  drag_stop: function(data, element, helper, event) {
    //  self.onMoveContainer(data, element, helper, event);
  },
  drag_start: function(data, element, helper, event) {
    var sourceNodeId = element.data.nodes[0];
    self.currenDraggingNodeSourceParent = $("#lineage_containers_containersJstree").jstree().get_node(sourceNodeId).parent;
  }
}*/
                            };
                        }

                        if (offset == 0) {
                            JstreeWidget.loadJsTree(jstreeDiv, jstreeData, jstreeOptions, function () {
                                $("#" + jstreeDiv)
                                    .jstree()
                                    .open_node("#");
                                $("#" + jstreeDiv).jstree("open_all");
                                self.flag_function();

                                self.bindMoveNode(jstreeDiv);
                            });
                        } else {
                            JstreeWidget.addNodesToJstree(jstreeDiv, null, jstreeData, jstreeOptions, self.flag_function);
                            callback(null);
                        }

                        offset += result.results.bindings.length;
                        callbackWhilst(null, result);
                    });
                },

                function (err, result) {
                    callback(null);
                    $("#" + jstreeDiv).jstree("open_all");
                    self.ancestors_tree_search_areRunning[search_number] = false;
                    if (!(self.ancestors_tree_search_areRunning[self.nbOfancestors_tree_search] == true && self.nbOfancestors_tree_search == 1)) {
                        self.nbOfancestors_tree_search -= 1;
                    }
                    if (offset == 0) {
                        $("#" + jstreeDiv).text("No matches");
                        self.flag_search = false;
                    }
                }
            );
        }
    };

    self.bindMoveNode = function (jstreeDiv) {
        $("#" + jstreeDiv).bind("move_node.jstree", function (e, data) {
            function getjstreeIdUri(id) {
                var node = $("#lineage_containers_containersJstree").jstree().get_node(id);
                var uri = node && node.data ? node.data.id : "x";
                return uri;
            }

            var movingInfos = {
                nodeId: getjstreeIdUri(data.node.id),
                newParent: getjstreeIdUri(data.parent),
                oldParent: getjstreeIdUri(data.old_parent),
                position: getjstreeIdUri(data.position),
            };
            self.writeMovedNodeNewParent(movingInfos);
            // console.log(movingInfos)
        });
    };

    self.addContainer = function (source) {
        if (!source) {
            source = Lineage_sources.activeSource;
        }

        var newContainerLabel = prompt("enter new container label)");
        if (!newContainerLabel) {
            return;
        }

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
            if (err) {
                return alert(err.responseText);
            }
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
        if (!(container.data.type.includes("http://www.w3.org/1999/02/22-rdf-syntax-ns#Bag") || container.data.type == "container")) {
            return alert("can only add resources to containers");
        }
        // self.currentContainer=null;
        if (!Array.isArray(nodesData)) {
            nodesData = [nodesData];
        }

        var otherSourcesNodes = [];
        var triples = [];
        nodesData.forEach(function (nodeData) {
            if (container.id == nodeData.id) {
                return alert("a  node cannot be member of itself");
            }

            if (!nodeData.source) {
                return console.log(" node without source");
            }
            if (true || nodeData.source == source) {
                triples.push({
                    subject: "<" + container.data.id + ">",
                    predicate: "<http://www.w3.org/2000/01/rdf-schema#member>",
                    object: "<" + nodeData.id + ">",
                });
            } else {
                otherSourcesNodes.push(node.id);
            }
        });

        Sparql_generic.insertTriples(source, triples, null, function (err, result) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                return alert(err.responseText);
            }
            UI.message("nodes added to container " + container.label);
            var jstreeData = [];
            nodesData.forEach(function (nodeData) {
                jstreeData.push({
                    id: nodeData.id + "_" + common.getRandomHexaId(5),
                    text: nodeData.label,
                    parent: container.id,
                    type: "class",
                    data: {
                        type: nodesData.type || "resource",
                        source: source,
                        id: nodeData.id,
                        label: nodeData.label,
                    },
                });
            });
            if ($("#lineage_containers_containersJstree").jstree) {
                if (callback) {
                    JstreeWidget.addNodesToJstree("lineage_containers_containersJstree", container.id, jstreeData, null, callback);
                } else {
                    JstreeWidget.addNodesToJstree("lineage_containers_containersJstree", container.id, jstreeData);
                }
            }

            if (drawMembershipEdge) {
                var existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
                var edges = [];
                nodesData.forEach(function (nodeData) {
                    var edgeId = container.id + "_" + "member" + "_" + nodeData.id;
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1;
                        edges.push({
                            id: edgeId,
                            from: container.id,
                            to: nodeData.id,
                            arrows: " middle",

                            data: { propertyId: "http://www.w3.org/2000/01/rdf-schema#member", source: source },
                            font: { multi: true, size: 10 },

                            //  dashes: true,
                            color: self.containerEdgeColor,
                        });
                    }
                });

                Lineage_whiteboard.lineageVisjsGraph.data.edges.add(edges);
            }
            if (callback) {
                return callback(null);
                if (jstreeData) {
                    callback(jstreeData);
                }
            }
        });
    };

    self.pasteNodesInContainer = function (source, container, node) {
        common.pasteTextFromClipboard(function (text) {
            // debugger
            if (!text) {
                return UI.message("no node copied");
            }
            try {
                var nodes = JSON.parse(text);
                var nodesData = [];
                nodes.forEach(function (node) {
                    if (node.data) {
                        nodesData.push(node.data);
                    }
                });

                self.addResourcesToContainer(source, container, nodesData);
            } catch (e) {
                console.log("wrong clipboard content");
            }
            return;
        });
    };

    self.deleteContainer = function (source, container) {
        if (!confirm("delete container)")) {
            return;
        }
        self.currentContainer = null;
        Sparql_generic.deleteTriples(source, container.data.id, null, null, function (err) {
            if (err) {
                return alert(err.responseText);
            }

            Sparql_generic.deleteTriples(source, null, null, container.data.id, function (err) {
                var node = $("#lineage_containers_containersJstree").jstree().get_node(container.id);
                if (node.children.length > 0) {
                    $("#lineage_containers_containersJstree").jstree().move_node(node.children, "#");
                }
                $("#lineage_containers_containersJstree").jstree().delete_node(container.id);
            });
        });
    };
    /**
     *
     *
     *
     *
     * @param source
     * @param containerIds
     * @param options
     *  allDescendants
     *  nodes | containers
     *  descendants
     *
     * @param callback
     */
    /*  self.getContainerResources = function(source, containerIds, options, callback) {
  var containers;
  var firstContainer;
  if (!Array.isArray(containerIds)) {
    containers = [containerIds];
    firstContainer = containerIds;
  }
  else {
    containers = containerIds;
    firstContainer = containerIds[0];
  }

  if (options.allDescendants) {
    //  $("#lineage_containers_containersJstree").jstree().open_all()
    var descendantObjs = JstreeWidget.getNodeDescendants("lineage_containers_containersJstree", firstContainer, null);
    var descendantIds = [];
    descendantObjs.forEach(function(item) {
      if (item.data.type == "container") {
        descendantIds.push(item.data.id);
      }
    });
    var containerObj = $("#lineage_containers_containersJstree").jstree().get_node(firstContainer);
    containers = containers.concat(descendantIds);
  }

  var subjects = containers;
  var objects = null;
  var propFilter = "";
  var objectTypeFilter;
  if (options.nodes) {
    objectTypeFilter = "filter(?objectType not in (rdf:Bag,rdf:List))";
  }
  else if (options.containers) {
    objectTypeFilter = "filter(?objectType in (rdf:Bag,rdf:List))";
  }
  else {
    objectTypeFilter = "";
  }

  if (options.descendants) {
    propFilter = "http://www.w3.org/2000/01/rdf-schema#member";
  }
  else if (options.ancestors) {
    var subjects = null;
    var objects = containers;
  }
  else {
    propFilter = "";
  }

  if (false && !propFilter && !objectTypeFilter) {
    return alert("no filter set");
  }

  Sparql_OWL.getFilteredTriples(source, subjects, propFilter, objects, { filter: objectTypeFilter }, function(err, result) {
    return callback(err, result);
  });
};*/
    self.listContainerResources = function (source, containerNode, options, callback, JstreeDiv) {
        var existingChildren = [];
        if (!JstreeDiv) {
            var JstreeDiv = "lineage_containers_containersJstree";
        }

        //Do not execute the descendants request if he already has children?
        if (containerNode.children.length > 1) {
            return;
        }

        self.sparql_queries.getContainerDescendants(source, containerNode ? containerNode.data.id : null, options, function (err, result) {
            if (err) {
                return alert(err.responseText);
            }

            var existingNodes = {};
            if (containerNode) {
                // existingNodes=$("#lineage_containers_containersJstree").jstree().get_node(containerNode.id).children;
                var jstreeChildren = JstreeWidget.getNodeDescendants(JstreeDiv, containerNode.id, 2);
                jstreeChildren.forEach(function (item) {
                    existingNodes[item.data.id] = 1;
                });
            }

            var jstreeData = [];
            var nodesMap = {};

            result.results.bindings.forEach(function (item) {
                //  var nodeId=item.parent+"_"+item.member.value
                item.jstreeId = "_" + common.getRandomHexaId(5);
                nodesMap[item.member.value] = item;
            });

            for (var key in nodesMap) {
                var item = nodesMap[key];

                var containerJstreeId = "#";
                var continerDataId = null;
                if (containerNode) {
                    containerJstreeId = containerNode.id;
                    continerDataId = containerNode.data.id;
                }

                var parent = item.parent.value == continerDataId ? containerJstreeId : nodesMap[item.parent.value] ? nodesMap[item.parent.value].jstreeId : "#";
                if (!existingNodes[item.member.value]) {
                    existingNodes[item.member.value] = 1;

                    var types = item.memberTypes.value.split(",");
                    var type_icon = JstreeWidget.selectTypeForIconsJstree(types, self.add_supplementary_layer_for_types_icon);

                    jstreeData.push({
                        id: item.jstreeId,
                        text: item.memberLabel.value,
                        parent: parent,
                        type: type_icon,
                        data: {
                            type: types,
                            source: source,
                            id: item.member.value,
                            label: item.memberLabel.value,
                        },
                    });
                }
            }
            if (jstreeData.length > 0) {
                JstreeWidget.addNodesToJstree(JstreeDiv, containerJstreeId, jstreeData);
                if (callback) {
                    callback(jstreeData);
                }
            }
        });
    };

    self.graphResources = function (source, containerData, options, callback) {
        if (!options) {
            options = {};
        }

        var data = [];
        var descendants = [];
        var stylesMap = {};
        var visjsData;
        async.series(
            [
                //getContainers descendants type container
                function (callbackSeries) {
                    //  options.descendants = true;
                    // options.leaves = true;
                    UI.message("searching...");
                    self.sparql_queries.getContainerDescendants(source, containerData.id, options, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        data = data.concat(result.results.bindings);
                        if (data.length > Lineage_whiteboard.showLimit * 8) {
                            return callbackSeries({ responseText: "too many nodes " + data.length + " cannot draw" });
                        }
                        return callbackSeries();
                    });
                    UI.message("drawing graph...");
                },

                //get containersStyles
                function (callbackSeries) {
                    return callbackSeries();
                },

                //draw
                function (callbackSeries) {
                    var color = Lineage_whiteboard.getSourceColor(source);
                    var opacity = 1.0;
                    var existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
                    visjsData = { nodes: [], edges: [] };
                    var objectProperties = [];

                    var shape = "dot";
                    var color2 = common.colorToRgba(color, opacity * 0.7);
                    var memberEdgeColor = common.colorToRgba(self.containerEdgeColor, opacity * 0.7);
                    var size = Lineage_whiteboard.defaultShapeSize;

                    if (!existingNodes[containerData.id]) {
                        existingNodes[containerData.id] = 1;

                        var type = "container";
                        visjsData.nodes.push({
                            id: containerData.id,
                            label: containerData.label,
                            shadow: self.nodeShadow,
                            shape: Containers_graph.containerStyle.shape,
                            size: size,
                            font: type == "container" ? { color: "#fdac00" } : null,
                            color: Containers_graph.containerStyle.color,
                            data: {
                                type: type,
                                source: source,
                                id: containerData.id,
                                label: containerData.label,
                            },
                        });
                    }

                    data.forEach(function (item) {
                        if (!existingNodes[item.parent.value]) {
                            var type = "container";
                            existingNodes[item.parent.value] = 1;
                            visjsData.nodes.push({
                                id: item.parent.value,
                                label: item.parentLabel.value,
                                shadow: self.nodeShadow,
                                shape: type == "container" ? Containers_graph.containerStyle.shape : shape,
                                size: size,
                                font: type == "container" ? { color: color2, size: 10 } : null,
                                color: Containers_graph.containerStyle.color,
                                data: {
                                    type: type,
                                    source: source,
                                    id: item.parent.value,
                                    label: item.parentLabel.value,
                                },
                            });
                        }

                        if (!existingNodes[item.member.value]) {
                            var type = "container";
                            if (item.memberTypes.value.indexOf("Bag") < 0) {
                                type = "class";
                            }

                            existingNodes[item.member.value] = 1;
                            visjsData.nodes.push({
                                id: item.member.value,
                                label: item.memberLabel.value,
                                shadow: self.nodeShadow,
                                shape: type == "container" ? "box" : Containers_graph.containerStyle.shape,
                                size: size,
                                font: type == "container" ? { color: color2, size: 10 } : null,
                                color: Containers_graph.containerStyle.color,

                                data: {
                                    type: type,
                                    source: source,
                                    id: item.member.value,
                                    label: item.memberLabel.value,
                                },
                            });
                        }

                        var edgeId = containerData.id + "_" + "member" + "_" + item.parent.value;
                        if (!existingNodes[edgeId]) {
                            existingNodes[edgeId] = 1;

                            visjsData.edges.push({
                                id: edgeId,
                                from: containerData.id,
                                to: item.parent.value,
                                arrows: {
                                    middle: {
                                        enabled: true,
                                        type: Lineage_whiteboard.defaultEdgeArrowType,
                                        scaleFactor: 0.5,
                                    },
                                },
                                data: {
                                    from: containerData.id,
                                    to: item.parent.value,
                                    source: source,
                                },
                                //  dashes: true,
                                width: 0.5,
                                color: memberEdgeColor,
                            });
                        }

                        var edgeId = item.parent.value + "_" + "member" + "_" + item.member.value;

                        if (!existingNodes[edgeId]) {
                            existingNodes[edgeId] = 1;
                            var type = "container";
                            if (item.memberTypes.value.indexOf("Bag") < 0) {
                                type = "class";
                            }
                            visjsData.edges.push({
                                id: edgeId,
                                from: item.parent.value,
                                to: item.member.value,
                                arrows: {
                                    enabled: true,
                                    type: Lineage_whiteboard.defaultEdgeArrowType,
                                    scaleFactor: 0.5,
                                },
                                data: {
                                    from: item.parent.value,
                                    to: item.member.value,
                                    source: source,
                                },
                                //  dashes: true,
                                width: type == "container" ? 1 : 0.5,
                                color: memberEdgeColor,
                            });
                        }
                    });

                    function setNodesLevel(visjsData) {
                        var nodelevels = {};

                        function recurse(from, level) {
                            visjsData.edges.forEach(function (edge) {
                                if (edge.from == edge.to) {
                                    return;
                                }
                                if (edge.from == from) {
                                    if (!nodelevels[edge.to]) {
                                        nodelevels[edge.to] = level + 1;
                                        recurse(edge.to, level + 1);
                                    }
                                }
                            });
                        }

                        recurse(containerData.id, 1);
                        var maxLevel = 0;
                        visjsData.nodes.forEach(function (node, index) {
                            var level = (nodelevels[node.id] || 0) - 1;
                            if (node.id == containerData.id) {
                                level = 0;
                            }

                            maxLevel = Math.max(maxLevel, level);
                            visjsData.nodes[index].level = level;
                        });

                        visjsData.nodes.forEach(function (node, index) {
                            if (node.level == -1) {
                                node.level = maxLevel;
                            } else {
                                node.level = node.level;
                            }
                        });
                    }

                    setNodesLevel(visjsData);

                    if (!Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                        Lineage_whiteboard.drawNewGraph(visjsData);
                    } else {
                        Lineage_whiteboard.addVisDataToGraph(visjsData);
                       
                    }
                    Lineage_whiteboard.lineageVisjsGraph.network.fit();
                    $("#waitImg").css("display", "none");
                    if (objectProperties.length > 0) {
                        source = Lineage_sources.activeSource;
                        var options = {
                            filter: Sparql_common.setFilter("prop", objectProperties),
                        };
                        options.allNodes = false;
                        Lineage_relations.drawRelations(null, null, "Properties", options);
                    }
                    return callbackSeries();
                },
            ],
            function (err) {
                UI.message("", true);
                if (err) {
                    return alert(err.responseText);
                    if (callback) {
                        return callback(err);
                    }
                }
                if (callback) {
                    return callback(null, visjsData);
                }
                return;
            }
        );
    };

    self.onSelectedNodeTreeclick = function (event, obj) {
        self.currentContainer = obj.node;
        console.log(obj.event);
        if (obj.event.button != 2) {
            self.listContainerResources(Lineage_sources.activeSource, self.currentContainer, { onlyOneLevel: true, leaves: true });
        }
    };

    self.writeMovedNodeNewParent = function (movedNodeInfos) {
        var graphUri = Config.sources[Lineage_sources.activeSource].graphUri;
        var query =
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "with <" +
            graphUri +
            "> delete {<" +
            movedNodeInfos.oldParent +
            "> rdfs:member <" +
            movedNodeInfos.nodeId +
            ">}" +
            "insert {<" +
            movedNodeInfos.newParent +
            "> rdfs:member <" +
            movedNodeInfos.nodeId +
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
            var fromStr = Sparql_common.getFromStr(source, false, false);
            var filterContainer0Str = "";
            if (containerId) {
                // needs options.useFilterKeyWord because VALUES dont work
                filterContainer0Str = Sparql_common.setFilter("parent0", containerId, null, { useFilterKeyWord: 1 });
            }

            //  var pathOperator = "+";
            var pathOperator = "+";
            if (options.onlyOneLevel) {
                pathOperator = "";
            }
            var query =
                "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
                "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
                "SELECT distinct ?member ?memberLabel ?parent ?parentLabel" +
                ' (GROUP_CONCAT( distinct ?memberType;separator=",") as ?memberTypes) ' +
                fromStr +
                " WHERE {\n" +
                "?parent0  rdfs:member" +
                pathOperator +
                " ?member. " +
                filterContainer0Str +
                "  ?member ^rdfs:member ?parent.\n" +
                "?parent0  rdfs:member* ?parent. \n" +
                "  ?member rdf:type ?memberType.\n" +
                "   ?member rdfs:label ?memberLabel.\n" +
                "   ?parent rdfs:label ?parentLabel.\n";
            if (!options.leaves) {
                query += " FILTER (?memberType in(rdf:Bag,rdf:List))";
            }

            if (options.filter) {
                query += options.filter;
            }
            query += "}  group by ?member ?memberLabel ?parent ?parentLabel";

            var url = Config.sources[source].sparql_server.url + "?format=json&query=";

            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
                if (err) {
                    return callback(err);
                }
                return callback(null, result);
            });
        },
    };

    self.applyContainerstyle = function (containerUrl) {};

    self.graphWhiteboardNodesContainers = function (source, ids, options, callback) {
        if (!options) {
            options = {};
        }
        if (!source) {
            source = Lineage_sources.activeSource;
        }
        var fromStr = Sparql_common.getFromStr(source, false, true);
        if (!ids) {
            ids = Lineage_whiteboard.lineageVisjsGraph.data.nodes.getIds();
        }
        var filter = Sparql_common.setFilter("node", ids);

        if (options.filter) filter += options.filter;

        var query =
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "select distinct *     " +
            fromStr +
            " WHERE {?container rdfs:member ?node.  ?container rdf:type ?type. filter (?type in(rdf:Bag,rdf:List)).  ?container rdfs:label ?containerLabel " +
            filter +
            "}";

        var url = Config.sources[source].sparql_server.url + "?format=json&query=";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                return alert(err);
            }
            var existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
            var visjsData = { nodes: [], edges: [] };

            result.results.bindings.forEach(function (item) {
                if (!existingNodes[item.container.value]) {
                    existingNodes[item.container.value] = 1;

                    var color2 = "#00afef";
                    visjsData.nodes.push({
                        id: item.container.value,
                        label: item.containerLabel.value,
                        shadow: self.nodeShadow,
                        shape: Containers_graph.containerStyle.shape,
                        size: Lineage_whiteboard.defaultShapeSize,
                        font: { color: color2 },
                        color: Containers_graph.containerStyle.color,
                        data: {
                            type: "container",
                            source: Lineage_sources.activeSource,
                            id: item.container.value,
                            label: item.containerLabel.value,
                        },
                    });
                }

                var edgeId = item.container.value + "_" + "member" + "_" + item.node.value;
                if (!existingNodes[edgeId]) {
                    existingNodes[edgeId] = 1;

                    visjsData.edges.push({
                        id: edgeId,
                        from: item.container.value,
                        to: item.node.value,
                        arrows: "middle",
                        data: { from: item.container.value, to: item.node.value, source: source },
                        font: { multi: true, size: 10 },

                        //  dashes: true,
                        color: self.containerEdgeColor,
                    });
                }
            });

            Lineage_whiteboard.addVisDataToGraph(visjsData);
           

            Lineage_whiteboard.lineageVisjsGraph.network.fit();
            $("#waitImg").css("display", "none");
            if (callback) {
                return callback(null, visjsData);
            }
        });
    };

    self.getContainerTypes = function (source, options, callback) {
        if (!options) {
            options = {};
        }
        var fromStr = Sparql_common.getFromStr(source, false, options.withoutImports);
        var query =
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
            "SELECT distinct ?type ?typeLabel " +
            fromStr +
            "  WHERE {\n" +
            " ?sub rdf:type rdf:Bag  .\n" +
            "  ?sub rdf:type  ?type . filter (!regex(str(?type),'owl') && ?type!='rdf:Bag')\n" +
            "  optional {?type rdfs:label ?typeLabel}" +
            "  }";

        var sparql_url = Config.sources[source].sparql_server.url;
        var url = sparql_url + "?format=json&query=";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
            if (err) {
                return callback(err);
            }
            var types = [];
            result.results.bindings.forEach(function (item) {
                var typeLabel = item.typeLabel ? item.typeLabel.value : Sparql_common.getLabelFromURI(item.type.value);
                types.push({ id: item.type.value, label: typeLabel });
            });
            return callback(null, types);
        });
    };

    return self;
})();

export default Lineage_containers;

window.Lineage_containers = Lineage_containers;
