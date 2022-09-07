var Lineage_linkedData_search = (function () {
    var self = {};
    Lineage_linkedData.currentFilters = [];
    self.dataSources = {};

    self.onDataSourcesSelect = function (dataSourceKey) {
        self.currentDataSource = Lineage_linkedData.currentDataSource;

        $("#LineageLineage_linkedDataQueryParams_searchIndexFilterPanel").css("display", "block");
        self.initLineage_linkedDataPanel(self.currentClassNode);
    };


    self.initLineage_linkedDataPanel = function (node) {
        self.currentClassNode = Lineage_linkedData.currentClassNode;
        self.showClassLineage_linkedDataTree();
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
        Lineage_linkedData.currentFilters.push(filterObj);

        $("#LineageLineage_linkedDataQueryParams_value").val("");
    };

    self.drawLineage_linkedData = function () {
        if (self.currentDataSource.type.indexOf("sql") > -1) {
            self.sql.drawSearchLineage_linkedData();
        } else if (self.currentDataSource.type == "searchIndex") {
            self.drawLineage_linkedData();
        }
    };

    self.getFilter = function () {
        var Lineage_linkedData = $("#LineageLineage_linkedData_Lineage_linkedDataTree").jstree().get_checked(true);
        if (Lineage_linkedData.length == 0) return alert("no indiviual selected");
        var obj = { classNode: self.currentClassNode, Lineage_linkedData: [] };

        var html = "<div class='LineageLineage_linkedDataQueryParams_QueryElt' id='LineageLineage_linkedDataQueryParams_Elt_" + Lineage_linkedData.currentFilters.length + "'> ";
        html += "<b>" + self.currentClassNode.data.label + "</b>";
        var queryIndex = Lineage_linkedData.currentFilters.length;
        if (Lineage_linkedData[0].id == "_ALL") {
            Lineage_linkedData.currentFilters.push(obj);

            html += " ALL";
        } else {
            Lineage_linkedData.forEach(function (individual) {
                obj.Lineage_linkedData.push(individual.data.id);
            });
            Lineage_linkedData.currentFilters.push(obj);

            if (Lineage_linkedData.length < 5) {
                Lineage_linkedData.forEach(function (individual) {
                    html += " " + individual.data.label;
                });
            }
        }
        html += "<button style='size: 10px' onclick='Lineage_linkedData.removeQueryElement(" + queryIndex + ")'>X</button></div>";
        $("#LineageLineage_linkedDataQueryParams_QueryDiv").append(html);
        return obj;
    };

    self.executeFilterQuery = function (callback) {
        if (Lineage_linkedData.currentFilters.length == 0) return alert("no query filter");
        var mustFilters = [];
        var shouldFilters = [];
        var terms = [];
        Lineage_linkedData.currentFilters.forEach(function (filter, index) {
            if (filter.Lineage_linkedData.length == 0) {
                terms.push({ term: { ["Concepts." + filter.classNode.data.label + ".name.keyword"]: filter.classNode.data.label } });
            } else {
                var Lineage_linkedData = [];
                filter.Lineage_linkedData.forEach(function (individual) {
                    Lineage_linkedData.push(individual);
                });

                terms.push({ terms: { ["Concepts." + filter.classNode.data.label + ".instances.keyword"]: Lineage_linkedData } });
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

    self.showClassLineage_linkedDataTree = function (output) {
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
                    $("#LineageLineage_linkedData_Lineage_linkedDataTreeSearchInput").bind("keyup", null, Lineage_linkedData_search.searchInLineage_linkedDataTree);
                    common.jstree.loadJsTree("LineageLineage_linkedData_Lineage_linkedDataTree", jstreeData, options);
                }
            },
            error: function (_err) {
                callback(err);
            },
        });
    };
    self.searchInLineage_linkedDataTree = function (event) {
        if (event.keyCode != 13 && event.keyCode != 9 ) return;
        var value = $("#LineageLineage_linkedData_Lineage_linkedDataTreeSearchInput").val();
        $("#LineageLineage_linkedData_Lineage_linkedDataTree").jstree(true).search(value);
        $("#LineageLineage_linkedData_Lineage_linkedDataTreeSearchInput").val("");
    };
    self.drawLineage_linkedData = function () {
        $("#LineageLineage_linkedDataQueryParams_message").html("searching...");
        self.executeFilterQuery(function (err, result) {
            if (err) return alert(err.responseText);
            var message = "" + result.hits.hits.length + " hits found";
            $("#LineageLineage_linkedDataQueryParams_message").html(message);

            var graphNodesMap = {};
            var graphEdgesMap = {};

            // aggregate Lineage_linkedData inside map of graph nodes map
            Lineage_linkedData.currentFilters.forEach(function (filter) {
                var filterClassName = filter.classNode.data.label;
                var fitlerLineage_linkedData = filter.Lineage_linkedData;
                if (!graphNodesMap[filter.classNode.data.id])
                    graphNodesMap[filter.classNode.data.id] = {
                        filter: filter,
                        Lineage_linkedData: {},
                    };

                result.hits.hits.forEach(function (hit) {
                    var hitConceptObj = hit._source.Concepts[filterClassName];
                    if (!hitConceptObj) return;
                    var hitConceptLineage_linkedData = hitConceptObj.instances;
                    hitConceptLineage_linkedData.forEach(function (hitIndividual) {
                        if (fitlerLineage_linkedData.length == 0 || fitlerLineage_linkedData.indexOf(hitIndividual) > -1) {
                            if (!graphNodesMap[filter.classNode.data.id].Lineage_linkedData[hitIndividual]) graphNodesMap[filter.classNode.data.id].Lineage_linkedData[hitIndividual] = 0;
                            graphNodesMap[filter.classNode.data.id].Lineage_linkedData[hitIndividual] += 1;

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

                for (var hitIndividual in graphNodesMap[graphNodeId].Lineage_linkedData) {
                    var id = "searchIndex_" + hitIndividual;
                    if (!existingVisjsIds[id]) {
                        existingVisjsIds[id] = 1;

                        visjsData.nodes.push({
                            id: id,
                            label: hitIndividual,
                            shape: Lineage_classes.namedLineage_linkedDatahape,
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
                var Lineage_linkedData = graphEdgesMap[paragraphId];
                Lineage_linkedData.forEach(function (item1) {
                    Lineage_linkedData.forEach(function (item2) {
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
