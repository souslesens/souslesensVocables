import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import Lineage_whiteboard from "./lineage_whiteboard.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import Lineage_blend from "./lineage_blend.js";
import Lineage_combine from "./lineage_combine.js";

var Lineage_sets = (function () {
    var self = {};
    self.tripleSetsThesaurusSourceLabel = "tripleSets";

    self.init = function () {
        var namedTripleSetsSource = {
            editable: true,
            graphUri: Config.namedSetsThesaurusGraphUri,
            sparql_server: {
                url: "_default",
            },
            controller: "Sparql_OWL",
            schemaType: "OWL",
            group: "",
        };
        Config.sources[self.tripleSetsThesaurusSourceLabel] = namedTripleSetsSource;

        $("#LineageSetsTab").load("snippets/lineage/lineageSets.html", function () {
            self.loadSetsJsTree();
        });
    };

    self.loadSetsJsTree = function () {
        var query =
            " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX  skos:<http://www.w3.org/2004/02/skos/core#> " +
            " select  distinct ?id ?label from <" +
            Config.namedSetsThesaurusGraphUri +
            ">";

        query += "   WHERE { " + " ?id skos:member <" + Config.namedSetsThesaurusGraphUri + ">. " + "?id skos:prefLabel ?label.}limit 10000";

        var sparql_url = Config.sources[self.tripleSetsThesaurusSourceLabel].sparql_server.url;
        if ((sparql_url = "_default")) sparql_url = Config.default_sparql_url;
        var url = sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: self.tripleSetsThesaurusSourceLabel }, function (err, result) {
            if (err) return callbackSeries(err);
            var jstreeData = [];

            result.results.bindings.forEach(function (item) {
                jstreeData.push({
                    id: item.id.value,
                    text: item.label.value,
                    parent: "#",
                    data: {
                        id: item.id.value,
                        label: item.label.value,
                    },
                });
            });

            var options = {
                selectTreeNodeFn: function (/** @type {any} */ event, /** @type {any} */ propertiesMap) {
                    return Lineage_sets.selectTreeNodeFn(event, propertiesMap);
                },
                contextMenu: Lineage_sets.getJstreeSetsContextMenu(),
            };
            JstreeWidget.loadJsTree("LineageSets_mainTree", jstreeData, options);
        });
    };

    self.selectTreeNodeFn = function (event, obj) {
        self.currentTreeNode = obj.node;
    };
    self.getJstreeSetsContextMenu = function () {
        var items = {};

        items.graphSet = {
            label: "Graph set",
            action: function (_e) {
                // pb avec source
                Lineage_sets.graphSet(self.currentTreeNode);
            },
        };
        items.editSet = {
            label: "Edit set",
            action: function (_e) {
                // pb avec source
                Lineage_sets.graphSet(self.currentTreeNode);
            },
        };

        return items;
    };

    self.getSetContent = function (set, callback) {
        self.currentSetSource = set.data.label;

        Config.sources[self.currentSetSource] = {
            editable: true,
            graphUri: set.data.id,
            sparql_server: {
                url: "_default",
            },
            controller: Sparql_OWL,
            schemaType: "OWL",
            group: "",
        };
        Lineage_sources.activeSource = self.currentSetSource;
        Sparql_OWL.getItems(self.currentSetSource, {}, function (err, result) {
            return callback(err, result);
        });
    };

    self.graphSet = function (set) {
        self.getSetContent(set, function (err, result) {
            var visjsData = { nodes: [], edges: [] };
            var existingNodes = {};
            result.forEach(function (item) {
                if (!existingNodes[item.subject.value]) {
                    existingNodes[item.subject.value] = 1;
                    var node = {
                        id: item.subject.value,
                    };

                    if (item.p.value.indexOf("type") > -1) {
                        node.type = item.o.value;
                    }
                    if (item.p.value.indexOf("label") > -1) {
                        node.label = item.o.value;
                    }
                    node.data = {
                        source: self.currentSetSource,
                        id: node.id,
                        label: node.label,
                    };
                    visjsData.nodes.push(node);
                }
            });
            Lineage_whiteboard.drawNewGraph(visjsData);
        });
    };

    self.createNewSet = function () {
        var jstreeNodes = $("#lineage_selection_selectedNodesTreeDiv").jstree(true).get_checked(true);
        var setName = prompt("new set name");
        if (jstreeNodes.length == 0) return;
        if (!setName) return;

        var newSetGraphUri = Config.namedSetsThesaurusGraphUri + setName + "/";

        async.series(
            [
                // check if setName exists
                function (callbackSeries) {
                    if (Config.sources[setName]) alert(setName + "set already Exists");
                    return callbackSeries();
                },

                //create source
                function (callbackSeries) {
                    var newSetSource = {
                        editable: true,
                        graphUri: newSetGraphUri,
                        sparql_server: {
                            url: "_default",
                        },
                        controller: "Sparql_OWL",
                        schemaType: "OWL",
                        group: "GRAPH_SETS",
                    };
                    Config.sources[setName] = newSetSource;
                    return callbackSeries();
                },
                //create the new graph set
                function (callbackSeries) {
                    Lineage_combine.mergeNodes(jstreeNodes, "keepUri", "nodeOnly", true, null, setName, null, function (err, result) {
                        return callbackSeries(err);
                    });
                },

                //register the new graph set
                function (callbackSeries) {
                    var triples = Lineage_blend.getCommonMetaDataTriples(newSetGraphUri);
                    triples.push({
                        subject: newSetGraphUri,
                        predicate: "skos:member",
                        object: Config.namedSetsThesaurusGraphUri,
                    });
                    triples.push({
                        subject: newSetGraphUri,
                        predicate: "skos:prefLabel",
                        object: setName,
                    });

                    Sparql_generic.insertTriples(self.tripleSetsThesaurusSourceLabel, triples, null, function (err, result) {
                        return callbackSeries(err);
                    });
                },
            ],

            function (err) {
                if (err) return alert(err.responseText);
                return MainController.UI.message("ALL done : Set " + setName + " created", true);
            }
        );
    };

    return self;
})();

export default Lineage_sets;

window.Lineage_sets = Lineage_sets;
