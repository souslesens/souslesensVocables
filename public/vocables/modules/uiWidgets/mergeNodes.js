var MergeNodes = (function () {
    var self = {};

    self.mergeNodes = {
        showDialog: function () {
            $("#lineage_selection_rightPanel").load("snippets/lineage/selection/lineage_selection_mergeNodesDialog.html", function () {
                var sources = [];
                for (var key in Config.sources) {
                    if (Config.sources[key].editable) {
                        sources.push(key);
                    }
                }
                sources.sort();
                common.fillSelectOptions("LineageMerge_targetSourceSelect", sources, null);
            });
        },
        mergeNodesUI: function () {
            var targetNode = null;
            var targetSource = $("#LineageMerge_targetSourceSelect").val();
            var mergeMode = $("#LineageMerge_aggregateModeSelect").val();
            var mergeDepth = $("#LineageMerge_aggregateDepthSelect").val();
            var mergeRestrictions = $("#LineageMerge_aggregateRelationsCBX").prop("checked");
            var targetNode = $("#LineageMerge_targetNodeUriSelect").val();
            var mergedNodesType = $("#LineageMerge_mergedNodesTypeSelect").val();
            var jstreeNodes = $("#lineage_selection_selectedNodesTreeDiv").jstree(true).get_checked(true);

            if (!mergedNodesType) {
                if (!confirm("confirm that no Type is added to merged nodes")) {
                    return;
                }
            }

            self.mergeNodes.mergeNodes(jstreeNodes, mergeMode, mergeDepth, mergeRestrictions, mergedNodesType, targetSource, targetNode);
        },

        mergeNodes: function (jstreeNodes, mergeMode, mergeDepth, mergeRestrictions, mergedNodesType, targetSource, targetNode, callback) {
            var maxDepth = 10;

            var newUriPrefix = Config.sources[targetSource].graphUri;
            if (!newUriPrefix) {
                newUriPrefix = prompt("enter new uri prefix");
            }
            if (!newUriPrefix) {
                return;
            }
            var nodesToMerge = {};
            var descendantsMap = {};
            var newTriples = [];
            var message = "";
            jstreeNodes.forEach(function (node) {
                if (node.parent == "#") {
                    return;
                }
                if (!nodesToMerge[node.parent]) {
                    nodesToMerge[node.parent] = {};
                }
                nodesToMerge[node.parent][node.data.id] = [];
            });

            var sources = Object.keys(nodesToMerge);

            async.eachSeries(sources, function (source, callbackEachSource) {
                var nodesToCopyMap = {};
                var selectedNodeIds = Object.keys(nodesToMerge[source]);
                var sourceGraphUri = Config.sources[source].graphUri;
                var targetGraphUri = Config.sources[targetSource].graphUri;
                var editable = Config.sources[targetSource].editable;
                if (!targetGraphUri || !editable) {
                    alert("targetSource must have  graphUri and must be editable");
                }
                callbackEachSource();

                var sourceMessage = "";

                async.eachSeries(
                    selectedNodeIds,
                    function (selectedNodeId, callbackEachNodeToMerge) {
                        var nodesToCopy = [selectedNodeId];
                        async.series(
                            [
                                //getNodes descendants by depth and add them to ids
                                function (callbackSeries) {
                                    if (mergeDepth == "nodeOnly") {
                                        return callbackSeries();
                                    } else {
                                        var depth;
                                        if (mergeDepth == "nodeAndDirectChildren") {
                                            depth = 1;
                                        } else {
                                            depth = maxDepth;
                                        }
                                        Sparql_generic.getNodeChildren(source, null, selectedNodeId, depth, { selectGraph: false }, function (err, result) {
                                            if (err) {
                                                return callbackSeries(err);
                                            }

                                            result.forEach(function (item, index) {
                                                for (var i = 1; i <= maxDepth; i++) {
                                                    if (item["child" + i]) {
                                                        var parent;
                                                        if (i == 1) {
                                                            var parent = item.subject.value;
                                                            if (mergeDepth == "nodeDescendantsOnly") {
                                                                parent = targetNode;
                                                            }
                                                            item["child" + i].parent = parent;
                                                        } else {
                                                            item["child" + i].parent = item["child" + (i - 1)].value;
                                                        }

                                                        descendantsMap[item["child" + i].value] = item["child" + i];
                                                    }
                                                }
                                            });

                                            var descendantIds = Object.keys(descendantsMap);
                                            nodesToCopy = nodesToCopy.concat(descendantIds);
                                            return callbackSeries();
                                        });
                                    }
                                },

                                //set nodesMap for change URI later
                                function (callbackSeries) {
                                    nodesToCopy.forEach(function (nodeId) {
                                        nodesToCopyMap[nodeId] = {};
                                    });

                                    return callbackSeries();
                                },

                                //create hierarchy if needed (when targetNode  and mergedNodesType)
                                function (callbackSeries) {
                                    if (!targetNode) {
                                        return callbackSeries();
                                    }

                                    var mergedNodesParentProperty = null;
                                    if (mergedNodesType == "owl:NamedIndividual") {
                                        mergedNodesParentProperty = "rdf:type";
                                    } else if (mergedNodesType == "owl:Class") {
                                        mergedNodesParentProperty = "rdfs:subClassOf";
                                    } else {
                                        return callbackSeries();
                                    }

                                    if (mergeDepth != "nodeDescendantsOnly") {
                                        newTriples.push({
                                            subject: selectedNodeId,
                                            predicate: "rdf:type",
                                            object: mergedNodesType,
                                        });

                                        newTriples.push({
                                            subject: selectedNodeId,
                                            predicate: mergedNodesParentProperty,
                                            object: targetNode,
                                        });
                                    }

                                    var descendantIds = Object.keys(descendantsMap);
                                    descendantIds.forEach(function (item) {
                                        newTriples.push({
                                            subject: item,
                                            predicate: "rdf:type",
                                            object: mergedNodesType,
                                        });
                                        newTriples.push({
                                            subject: item,
                                            predicate: mergedNodesParentProperty,
                                            object: descendantsMap[item].parent,
                                        });
                                    });

                                    callbackSeries();
                                },

                                //get all node ids subject triple including descendants
                                function (callbackSeries) {
                                    Sparql_OWL.getAllTriples(source, "subject", nodesToCopy, { removeBlankNodesObjects: true }, function (err, result) {
                                        if (err) {
                                            return callbackSeries(err);
                                        }
                                        result.forEach(function (item) {
                                            if (nodesToMerge[source][selectedNodeId]) {
                                                nodesToMerge[source][selectedNodeId].push(item);
                                            }
                                        });
                                        callbackSeries();
                                    });
                                },
                            ],
                            function (err) {
                                callbackEachNodeToMerge();
                            },
                        );
                    },
                    // end for each node to merge

                    function (err) {
                        async.series(
                            [
                                //get restrictions triple including descendants
                                function (callbackSeries) {
                                    if (!mergeRestrictions) {
                                        return callbackSeries();
                                    }

                                    var ids = Object.keys(nodesToMerge[source]);

                                    var fromStr = sourceGraphUri ? " FROM " + sourceGraphUri : "";
                                    var filterStr = Sparql_common.setFilter("class", ids);
                                    var query =
                                        "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
                                        "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                                        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>";
                                    query +=
                                        "SELECT   ?s ?p ?o from <http://data.total.com/resource/tsf/ontology/gaia-test/> WHERE {?s ?p ?o." +
                                        "filter (exists {?class rdfs:subClassOf ?s.  ?s rdf:type owl:Restriction." +
                                        filterStr +
                                        "})} LIMIT 10000";
                                    var sparql_url = Config.sources[source].sparql_server.url;
                                    if ((sparql_url = "_default")) {
                                        sparql_url = Config.sparql_server.url;
                                    }
                                    var url = sparql_url + "?format=json&query=";
                                    Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
                                        if (err) {
                                            return callbackSeries(err);
                                        }

                                        result.results.bindings.forEach(function (item) {
                                            var value = item.o.value;
                                            if (item.o.datatype == "http://www.w3.org/2001/XMLSchema#dateTime") {
                                                value += "^^xsd:dateTime";
                                            }
                                            if (item.o.type == "literal") {
                                                value = common.formatStringForTriple(value);
                                            }

                                            newTriples.push({
                                                subject: item.s.value,
                                                predicate: item.p.value,
                                                object: value,
                                            });
                                        });
                                        return callbackSeries();
                                    });
                                },

                                //create newTriples
                                function (callbackSeries) {
                                    if (true) {
                                        function getTripleNewUris(triple) {
                                            if (mergeMode == "keepUri") {
                                                return triple;
                                            }

                                            var p = Math.max(triple.subject.value.lastIndexOf("/"), triple.subject.value.lastIndexOf("#"));
                                            var subjectPrefix = null;
                                            if (p > 0) {
                                                subjectPrefix = triple.subject.value.substring(0, p);
                                                var subjectSuffix = triple.subject.value.substring(p + 1);
                                                triple.subject.value = newUriPrefix + subjectSuffix;
                                            }
                                            if (triple.object.type == "uri") {
                                                p = Math.max(triple.object.value.lastIndexOf("/"), triple.object.value.lastIndexOf("#"));
                                                var objectPrefix = null;
                                                if (p > 0) {
                                                    objectPrefix = triple.object.value.substring(0, p);
                                                    var objectSuffix = triple.object.value.substring(p + 1);
                                                    if (objectPrefix == subjectPrefix) {
                                                        triple.subject.value = newUriPrefix + objectSuffix;
                                                    }
                                                }
                                            }

                                            return triple;
                                        }

                                        for (var selectedNodeId in nodesToMerge[source]) {
                                            nodesToMerge[source][selectedNodeId].forEach(function (item) {
                                                var value = item.object.value;
                                                if (item.object.datatype == "http://www.w3.org/2001/XMLSchema#dateTime") {
                                                    value += "^^xsd:dateTime";
                                                }
                                                if (item.object.type == "literal") {
                                                    value = common.formatStringForTriple(value);
                                                }
                                                if (item.object.type == "literal") {
                                                    value = common.formatStringForTriple(value);
                                                }

                                                item = getTripleNewUris(item);

                                                newTriples.push({
                                                    subject: item.subject.value,
                                                    predicate: item.predicate.value,
                                                    object: value,
                                                });
                                            });
                                        }
                                        Sparql_generic.insertTriples(targetSource, newTriples, {}, function (err, result) {
                                            if (err) {
                                                return callbackSeries(err);
                                            }
                                            sourceMessage = result + " inserted from source " + source + "  to source " + targetSource;

                                            message += sourceMessage + "\n";
                                            return callbackSeries();
                                        });
                                    }
                                },

                                //create newTriples
                                function (callbackSeries) {
                                    UI.message(sourceMessage + " indexing data ...  ");
                                    SearchUtil.generateElasticIndex(targetSource, { ids: nodesToCopy }, function (err, _result) {
                                        return callbackSeries(err);
                                    });
                                },
                            ],
                            function (err) {
                                if (err) {
                                    return callbackEachNodeToMerge(err);
                                }

                                callbackEachNodeToMerge();
                            },
                            function (err) {
                                callbackEachSource(err);
                            },
                        );
                    },

                    //end eachSource
                    function (err) {
                        if (callback) {
                            return callback(err, sourceMessage);
                        }
                        if (err) {
                            return MainController.errorAlert(err);
                        }
                        alert(message);
                        return UI.message("ALL DONE", true);
                    },
                );
            });
        },
    };
})();
export default MergeNodes;
window.MergeNodes = MergeNodes;
