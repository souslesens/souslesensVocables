import OntologyModels from "../shared/ontologyModels.js";
import SearchUtil from "../search/searchUtil.js";
import Sparql_proxy from "../sparqlProxies/sparql_proxy.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";
import JstreeWidget from "../uiWidgets/jstreeWidget.js";

var CommonBotFunctions = (function () {
    var self = {};

    self.sortList = function (list) {
        list.sort(function (a, b) {
            if (a.label > b.label) {
                return 1;
            }
            if (a.label < b.label) {
                return -1;
            }
            return 0;
        });
    };

    function escapeHtml(str) {
        return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function toSafeTransportText(str) {
        var s = String(str);

        s = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

        s = s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

        s = s.replace(/\n/g, "\\n");
        return s;
    }
    self.escapeHtml = escapeHtml;
    self.toSafeTransportText = toSafeTransportText;
    self.loadSourceOntologyModel = function (sourceLabel, callback) {
        var sources = [sourceLabel];
        if (!Config.sources[sourceLabel]) {
            return callback("Source not recognized");
        }
        if (Config.sources[sourceLabel].imports) {
            sources = sources.concat(Config.sources[sourceLabel].imports);
        }
        async.eachSeries(
            sources,
            function (source, callbackEach) {
                OntologyModels.registerSourcesModel(source, null, function (err, result) {
                    callbackEach(err);
                });
            },
            function (err) {
                return callback(err);
            },
        );
    };

    self.listVocabsFn = function (sourceLabel, includeBasicVocabs, callback) {
        var vocabs = [{ id: sourceLabel, label: sourceLabel }];
        var imports = Config.sources[sourceLabel].imports;
        if (imports) {
            imports.forEach(function (importSource) {
                vocabs.push({ id: importSource, label: importSource });
            });
        }
        if (includeBasicVocabs) {
            for (var key in Config.basicVocabularies) {
                vocabs.push({ id: key, label: key });
            }
        }
        return callback(null, vocabs);
    };

    self.listVocabClasses = function (vocab, includeOwlThing, classes, callback) {
        OntologyModels.registerSourcesModel(vocab, null, function (err, result) {
            if (err) {
                return callback(err);
            }
            if (!classes) {
                classes = [];
            }

            for (var key in Config.ontologiesVocabularyModels[vocab].classes) {
                var obj = Config.ontologiesVocabularyModels[vocab].classes[key];
                if (obj && obj.id.indexOf("http") == 0) classes.push({ id: obj.id, label: obj.label, source: vocab });
            }

            self.sortList(classes);
            if (includeOwlThing || classes.length == 0) {
                classes.splice(0, 0, { id: "owl:Thing", label: "owl:Thing" });
            }
            return callback(null, classes);
        });
    };

    self.listVocabPropertiesFn = function (vocab, props, callback) {
        OntologyModels.registerSourcesModel(vocab, null, function (err, result) {
            if (err) {
                return callback(err);
            }
            if (!props) {
                props = [];
            }
            for (var key in Config.ontologiesVocabularyModels[vocab].properties) {
                var prop = Config.ontologiesVocabularyModels[vocab].properties[key];
                props.push({ id: prop.id, label: prop.label, source: vocab });
            }

            self.sortList(props);
            return callback(null, props);
        });
    };

    self.listNonObjectPropertiesFn = function (vocabs, domain, callback) {
        if (!vocabs) {
            vocabs = Object.keys(Config.ontologiesVocabularyModels);
        }
        if (!Array.isArray(vocabs)) {
            vocabs = [vocabs];
        }
        var props = [];
        async.eachSeries(
            vocabs,
            function (vocab, callbackEach) {
                OntologyModels.registerSourcesModel(vocab, null, function (err, result) {
                    if (err) {
                        return callbackEach(err);
                    }
                    var props2 = Config.ontologiesVocabularyModels[vocab].nonObjectProperties;
                    for (var key in props2) {
                        var prop = props2[key];
                        if (!domain || !prop.domain || domain == prop.domain || prop.domain == "http://www.w3.org/2000/01/rdf-schema#Resource") {
                            props.push({ id: prop.id, label: vocab + ":" + prop.label, domain: prop.domain, range: prop.range, source: vocab });
                        }
                    }
                    callbackEach();
                });
            },
            function (err) {
                if (err) {
                    return callback(err);
                }
                self.sortList(props);
                return callback(null, props);
            },
        );
    };

    self.listSourceAllClasses = function (source, includeOwlThing, classes, callback) {
        var sources = self.getSourceAndImports(source);
        var allClasses = [];
        async.eachSeries(
            sources,
            function (source, callbackEach) {
                self.listVocabClasses(source, includeOwlThing, classes, function (err, classes) {
                    if (err) {
                        return callbackEach(err);
                    }
                    allClasses = allClasses.concat(classes);
                    callbackEach();
                });
            },
            function (err) {
                return callback(err, allClasses);
            },
        );
    };
    self.listSourceAllObjectProperties = function (source, props, callback) {
        var sources = self.getSourceAndImports(source);
        var allProps = [];
        async.eachSeries(
            sources,
            function (source, callbackEach) {
                self.listVocabPropertiesFn(source, props, function (err, props) {
                    if (err) {
                        return callbackEach(err);
                    }
                    allProps = allProps.concat(props);
                    callbackEach();
                });
            },
            function (err) {
                return callback(err, allProps);
            },
        );
    };
    self.listSourceAllObjectPropertiesConstraints = function (source, callback) {
        var sources = self.getSourceAndImports(source);
        var allConstraints = {};
        async.eachSeries(
            sources,
            function (source, callbackEach) {
                var constraints = Config.ontologiesVocabularyModels[source].constraints;
                if (err) {
                    return callbackEach(err);
                }
                for (var prop in constraints) {
                    allConstraints[prop] = constraints[prop];
                }

                callbackEach();
            },

            function (err) {
                return callback(err, allConstraints);
            },
        );
    };

    /**
     * @function
     * @name searchClassesInSources
     * @memberof module:CommonBotFunctions
     * Searches for classes matching a term across multiple sources using ElasticSearch.
     * Delegates to SearchUtil.getSimilarLabelsInSources with fuzzyMatch mode and flattens
     * the results into a simple array of {id, label, source} objects.
     * @param {Array<string>} sources - The list of source names to search in.
     * @param {string} term - The search term. A wildcard (*) is appended if not already present.
     * @param {Function} callback - Error-first callback: callback(err, items) where items is an array of {id: string, label: string, source: string}.
     * @returns {void}
     */
    self.searchClassesInSources = function (sources, term, callback) {
        term = term.toLowerCase();
        if (term.indexOf("*") < 0) {
            term += "*";
        }
        SearchUtil.getSimilarLabelsInSources(null, sources, [term], null, "fuzzyMatch", { parentlabels: true, skosLabels: 1 }, function (err, result) {
            if (err || !result || result.length === 0) {
                return callback(null, []);
            }
            var items = [];
            result.forEach(function (classItem) {
                var matches = classItem.matches;
                for (var source in matches) {
                    matches[source].forEach(function (match) {
                        items.push({
                            id: match.id,
                            label: match.label + " (" + source + ")",
                            source: source,
                        });
                    });
                }
            });
            callback(null, items);
        });
    };

    /**
     * @function
     * @name showParentsDialog
     * @memberof module:CommonBotFunctions
     * Fetches all ancestor classes of a given class via a SPARQL property path
     * query (rdfs:subClassOf*) and displays them as a hierarchical JsTree in a dialog.
     * @param {string} classId - The URI of the class to get parents for.
     * @param {string} classLabel - The label of the class.
     * @param {Array} currentList - The current list of classes with {id, source} to resolve the source.
     * @param {string} defaultSource - Fallback source if classId is not found in currentList.
     * @returns {void}
     */
    self.showParentsDialog = function (classId, classLabel, currentList, defaultSource) {
        var classSource = null;
        if (currentList) {
            for (var i = 0; i < currentList.length; i++) {
                if (currentList[i].id === classId) {
                    classSource = currentList[i].source;
                    break;
                }
            }
        }
        if (!classSource) {
            classSource = defaultSource;
        }

        var fromStr = Sparql_common.getFromStr(classSource);
        var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
            "SELECT DISTINCT ?child ?childLabel ?parent ?parentLabel " +
            fromStr +
            " WHERE { " +
            "  <" + classId + "> rdfs:subClassOf* ?child . " +
            "  ?child rdfs:subClassOf ?parent . " +
            "  ?parent rdf:type ?type . FILTER(?type != owl:Restriction) " +
            "  FILTER(!isBlank(?child)) " +
            "  FILTER(!isBlank(?parent)) " +
            "  OPTIONAL { ?child rdfs:label ?childLabel } " +
            "  OPTIONAL { ?parent rdfs:label ?parentLabel } " +
            "} LIMIT 500";

        var url = Config.sources[classSource].sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: classSource }, function (err, result) {
            if (err) {
                return alert("Error loading parents: " + err);
            }
            var bindings = result.results.bindings;
            if (bindings.length === 0) {
                return alert("No parents found for " + classLabel);
            }

            var nodesMap = {};
            var childParentMap = {};
            bindings.forEach(function (item) {
                var childUri = item.child.value;
                var parentUri = item.parent.value;
                var childLbl = item.childLabel ? item.childLabel.value : Sparql_common.getLabelFromURI(childUri);
                var parentLbl = item.parentLabel ? item.parentLabel.value : Sparql_common.getLabelFromURI(parentUri);

                nodesMap[childUri] = childLbl;
                nodesMap[parentUri] = parentLbl;

                if (!childParentMap[childUri]) {
                    childParentMap[childUri] = [];
                }
                childParentMap[childUri].push(parentUri);
            });

            var jstreeData = [];
            for (var nodeUri in nodesMap) {
                var parentUri = childParentMap[nodeUri] ? childParentMap[nodeUri][0] : null;
                var isRoot = !parentUri || !nodesMap[parentUri];
                jstreeData.push({
                    id: nodeUri,
                    text: nodesMap[nodeUri],
                    parent: isRoot ? "#" : parentUri,
                    data: { id: nodeUri, label: nodesMap[nodeUri], source: classSource },
                });
            }

            $("#mainDialogDiv").html("<div id='showParentsJstreeDiv' style='overflow:auto; max-height:400px'></div>");
            UI.openDialog("mainDialogDiv", { title: "Parents of " + classLabel });
            $("#mainDialogDiv").parent().css("z-index", 10000);
            JstreeWidget.loadJsTree("showParentsJstreeDiv", jstreeData, { openAll: true });
        });
    };

    self.getSourceAndImports = function (source) {
        var sources = [source];
        var imports = Config.sources[source].imports;
        if (imports) {
            imports.forEach(function (importSource) {
                sources.push(importSource);
            });
        }
        return sources;
    };

    return self;
})();
export default CommonBotFunctions;
