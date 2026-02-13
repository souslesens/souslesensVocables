import OntologyModels from "../shared/ontologyModels.js";
import SearchUtil from "../search/searchUtil.js";

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
            var parentIdsLabelsMap = result.parentIdsLabelsMap || {};
            var items = [];
            result.forEach(function (classItem) {
                var matches = classItem.matches;
                for (var source in matches) {
                    matches[source].forEach(function (match) {
                        items.push({
                            id: match.id,
                            label: match.label + " (" + source + ")",
                            source: source,
                            parents: match.parents || [],
                        });
                    });
                }
            });
            items.parentIdsLabelsMap = parentIdsLabelsMap;
            callback(null, items);
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
