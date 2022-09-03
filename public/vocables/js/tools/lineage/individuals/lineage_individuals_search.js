var Lineage_individuals_search = (function () {
    var self = {};
    Lineage_individuals.currentFilters = [];
    self.dataSources = {};

    self.onDataSourcesSelect = function (dataSourceKey) {
        self.currentDataSource = Lineage_individuals.currentDataSource;

        $("#LineageIndividualsQueryParams_searchIndexFilterPanel").css("display", "block");
        self.initIndividualsPanel(self.currentClassNode);
    };


    self.initIndividualsPanel = function (node) {
        self.currentClassNode = Lineage_individuals.currentClassNode;
        self.showClassIndividualsTree();
    };

    self.executeQuery = function () {
        if (self.currentDataSource.type.indexOf("sql") > -1) {
            self.sql.executeQuery();
        } else if (self.currentDataSource.type == "searchIndex") {
            self.executeQuery();
        }
    };

    self.addFilter = function () {
        var existingVisjsIds = visjsGraph.getExistingIdsMap();

        if (!self.currentClassNode.color) self.currentClassNode.color = Lineage_classes.getSourceColor(self.currentClassNode.data.id);

        var filterObj = null;
        if (self.currentDataSource.type.indexOf("sql") > -1) filterObj = self.sql.getFilter();
        else if (self.currentDataSource.type == "searchIndex") filterObj = self.getFilter();
        Lineage_individuals.currentFilters.push(filterObj);

        $("#LineageIndividualsQueryParams_value").val("");
    };

    self.drawIndividuals = function () {
        if (self.currentDataSource.type.indexOf("sql") > -1) {
            self.sql.drawSearchIndividuals();
        } else if (self.currentDataSource.type == "searchIndex") {
            self.drawIndividuals();
        }
    };

    self.getFilter = function () {
        var individuals = $("#LineageIndividuals_individualsTree").jstree().get_checked(true);
        if (individuals.length == 0) return alert("no indiviual selected");
        var obj = { classNode: self.currentClassNode, individuals: [] };

        var html = "<div class='LineageIndividualsQueryParams_QueryElt' id='LineageIndividualsQueryParams_Elt_" + Lineage_individuals.currentFilters.length + "'> ";
        html += "<b>" + self.currentClassNode.data.label + "</b>";
        var queryIndex = Lineage_individuals.currentFilters.length;
        if (individuals[0].id == "_ALL") {
            Lineage_individuals.currentFilters.push(obj);

            html += " ALL";
        } else {
            individuals.forEach(function (individual) {
                obj.individuals.push(individual.data.id);
            });
            Lineage_individuals.currentFilters.push(obj);

            if (individuals.length < 5) {
                individuals.forEach(function (individual) {
                    html += " " + individual.data.label;
                });
            }
        }
        html += "<button style='size: 10px' onclick='Lineage_individuals.removeQueryElement(" + queryIndex + ")'>X</button></div>";
        $("#LineageIndividualsQueryParams_QueryDiv").append(html);
        return obj;
    };

    self.executeFilterQuery = function (callback) {
        if (Lineage_individuals.currentFilters.length == 0) return alert("no query filter");
        var mustFilters = [];
        var shouldFilters = [];
        var terms = [];
        Lineage_individuals.currentFilters.forEach(function (filter, index) {
            if (filter.individuals.length == 0) {
                terms.push({ term: { ["Concepts." + filter.classNode.data.label + ".name.keyword"]: filter.classNode.data.label } });
            } else {
                var individuals = [];
                filter.individuals.forEach(function (individual) {
                    individuals.push(individual);
                });

                terms.push({ terms: { ["Concepts." + filter.classNode.data.label + ".instances.keyword"]: individuals } });
            }
            if (index == 0) {
                mustFilters = terms;
                terms = [];
            } else shouldFilters = terms;
        });

        var query = {
            query: {
                bool: {
                    must: mustFilters,

                    //  "boost": 1.0
                },
            },
        };
        if (shouldFilters.length > 0) {
            query.query.bool.filter = shouldFilters;
            //  query.query.bool.minimum_should_match = 1;
        }

        var payload = {
            query: query,
            url: "_search",
            indexes: self.currentDataSource.indexes,
        };
        $.ajax({
            type: "POST",
            url: Config.apiUrl + "/elasticsearch/query_gaia",
            data: JSON.stringify(payload),
            contentType: "application/json",
            dataType: "json",

            success: function (result, _textStatus, _jqXHR) {
                callback(null, result);
            },
            error: function (_err) {
                callback(err);
            },
        });
    };

    self.showClassIndividualsTree = function (output) {
        var query = {};

        query = {
            aggs: {
                [self.currentClassNode.data.label]: {
                    terms: {
                        field: "Concepts." + self.currentClassNode.data.label + ".instances.keyword",
                        size: 1000,
                        min_doc_count: 2,
                    },
                },
            },
        };

        if (!Array.isArray(self.currentDataSource.indexes)) self.currentDataSource.indexes = [self.currentDataSource.indexes];

        var payload = {
            query: query,
            url: "_search",
            indexes: self.currentDataSource.indexes,
        };
        $.ajax({
            type: "POST",
            url: Config.apiUrl + "/elasticsearch/query_gaia",
            data: JSON.stringify(payload),
            contentType: "application/json",
            dataType: "json",

            success: function (result, _textStatus, _jqXHR) {
                if (Object.keys(result.aggregations).length == 0) {
                    return;
                }
                for (var key in result.aggregations) {
                    var buckets = result.aggregations[key].buckets;
                    var jstreeData = [];

                    jstreeData.push({
                        id: "_ALL",
                        text: "ALL",
                        parent: "#",
                        data: {
                            id: "_ALL",
                            text: "ALL",
                            class: self.currentClassNode,
                        },
                    });
                    buckets.sort(function (a, b) {
                        if (a.key > b.key) return 1;
                        if (a.key < b.key) return -1;
                        return 0;
                    });
                    buckets.forEach(function (bucket) {
                        jstreeData.push({
                            id: bucket.key,
                            text: bucket.key + " " + bucket.doc_count,
                            parent: "#",
                            data: {
                                id: bucket.key,
                                label: bucket.key,
                                class: self.currentClassNode,
                            },
                        });
                    });
                    var options = {
                        openAll: false,
                        withCheckboxes: true,
                        contextMenu: function () {},
                        searchPlugin: {
                            case_insensitive: true,
                            fuzzy: false,
                            show_only_matches: true,
                        },
                    };
                    $("#LineageIndividuals_individualsTreeSearchInput").bind("keyup", null, Lineage_individuals_search.searchInIndividualsTree);
                    common.jstree.loadJsTree("LineageIndividuals_individualsTree", jstreeData, options);
                }
            },
            error: function (_err) {
                callback(err);
            },
        });
    };
    self.searchInIndividualsTree = function (event) {
        if (event.keyCode != 13) return;
        var value = $("#LineageIndividuals_individualsTreeSearchInput").val();
        $("#LineageIndividuals_individualsTree").jstree(true).search(value);
        $("#LineageIndividuals_individualsTreeSearchInput").val("");
    };
    self.drawIndividuals = function () {
        $("#LineageIndividualsQueryParams_message").html("searching...");
        self.executeFilterQuery(function (err, result) {
            if (err) return alert(err.responseText);
            var message = "" + result.hits.hits.length + " hits found";
            $("#LineageIndividualsQueryParams_message").html(message);

            var graphNodesMap = {};
            var graphEdgesMap = {};

            // aggregate individuals inside map of graph nodes map
            Lineage_individuals.currentFilters.forEach(function (filter) {
                var filterClassName = filter.classNode.data.label;
                var fitlerIndividuals = filter.individuals;
                if (!graphNodesMap[filter.classNode.data.id])
                    graphNodesMap[filter.classNode.data.id] = {
                        filter: filter,
                        individuals: {},
                    };

                result.hits.hits.forEach(function (hit) {
                    var hitConceptObj = hit._source.Concepts[filterClassName];
                    if (!hitConceptObj) return;
                    var hitConceptIndividuals = hitConceptObj.instances;
                    hitConceptIndividuals.forEach(function (hitIndividual) {
                        if (fitlerIndividuals.length == 0 || fitlerIndividuals.indexOf(hitIndividual) > -1) {
                            if (!graphNodesMap[filter.classNode.data.id].individuals[hitIndividual]) graphNodesMap[filter.classNode.data.id].individuals[hitIndividual] = 0;
                            graphNodesMap[filter.classNode.data.id].individuals[hitIndividual] += 1;

                            if (!graphEdgesMap[hit._source.ParagraphId]) graphEdgesMap[hit._source.ParagraphId] = [];
                            graphEdgesMap[hit._source.ParagraphId].push({
                                classId: filter.classNode.data.id,
                                individual: hitIndividual,
                            });
                        }
                    });
                });
            });

            visjsData = { nodes: [], edges: [] };

            var existingVisjsIds = visjsGraph.getExistingIdsMap();
            for (var graphNodeId in graphNodesMap) {
                var classNode = graphNodesMap[graphNodeId].filter.classNode;
                var color = classNode.color;

                if (false && !existingVisjsIds[graphNodeId]) {
                    existingVisjsIds[graphNodeId] = 1;

                    visjsData.nodes.push({
                        id: classNode.data.id,
                        label: classNode.data.label,
                        shape: Lineage_classes.defaultShape,
                        size: Lineage_classes.defaultShapeSize,
                        color: color,
                        data: {
                            id: classNode.data.id,
                            label: classNode.data.label,
                            source: classNode.data.source,
                        },
                    });
                } else {
                }

                for (var hitIndividual in graphNodesMap[graphNodeId].individuals) {
                    var id = "searchIndex_" + hitIndividual;
                    if (!existingVisjsIds[id]) {
                        existingVisjsIds[id] = 1;

                        visjsData.nodes.push({
                            id: id,
                            label: hitIndividual,
                            shape: Lineage_classes.namedIndividualShape,
                            color: color,
                            data: {
                                id: hitIndividual,
                                label: hitIndividual,
                                source: "linked_" + self.currentDataSource.name,
                                filter: graphNodesMap[graphNodeId].filter,
                            },
                        });
                    }
                    var edgeId = id + "_" + graphNodeId;
                    if (!existingVisjsIds[edgeId]) {
                        existingVisjsIds[edgeId] = 1;
                        visjsData.edges.push({
                            id: edgeId,
                            from: id,
                            to: graphNodeId,
                            data: {
                                source: "linked_" + self.currentDataSource.name,
                            },
                        });
                    }
                }
            }
            // draw edges between indiviudals
            var individualEdges = {};
            for (var paragraphId in graphEdgesMap) {
                var individuals = graphEdgesMap[paragraphId];
                individuals.forEach(function (item1) {
                    individuals.forEach(function (item2) {
                        if (item1.individual != item2.individual && item1.classId != item2.classId) {
                            var edgeId = item1.individual + "_" + item2.individual;
                            if (!individualEdges[edgeId]) individualEdges[edgeId] = [];
                            individualEdges[edgeId].push(paragraphId);
                        }
                    });
                });
            }
            for (var edgeId in individualEdges) {
                var array = edgeId.split("_");
                var inverseEdgeId = array[1] + "_" + array[0];
                if (!existingVisjsIds[edgeId] && !existingVisjsIds[inverseEdgeId]) {
                    existingVisjsIds[edgeId] = 1;

                    visjsData.edges.push({
                        id: edgeId,
                        from: "searchIndex_" + array[0],
                        to: "searchIndex_" + array[1],
                        color: "#0067bb",
                        data: {
                            from: array[0],
                            to: array[1],
                            source: "_searchIndex_paragraph",
                            paragraphs: individualEdges[edgeId],
                        },
                    });
                }
            }
            if (visjsGraph.isGraphNotEmpty()) {
                visjsGraph.data.nodes.add(visjsData.nodes);
                visjsGraph.data.edges.add(visjsData.edges);
            } else {
                Lineage_classes.drawNewGraph(visjsData);
            }
        });
    };
    self.listParagraphs = function () {
        self.executeFilterQuery(function (err, result) {
            if (err) return alert(err.responseText);
        });
    };

    self.getIndividualInfos=function(dataSource,node,callback){


        return callback(null,infos)
    }

    return self;
})();
