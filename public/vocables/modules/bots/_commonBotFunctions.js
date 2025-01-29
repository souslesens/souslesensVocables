import _botEngine from "./_botEngine.js";
import OntologyModels from "../shared/ontologyModels.js";

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

    self.loadSourceOntologyModel = function (sourceLabel, withImports, callback) {
        var sources = [sourceLabel];
        if (!Config.sources[sourceLabel]) {
            alert("Source not recognized");
            return _botEngine.end();
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

    self.listVocabsFn = function (sourceLabel, varToFill, includeBasicVocabs, callback) {
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
        if (vocabs.length == 0) {
            return _botEngine.previousStep("no values found, try another option");
        }
        if (callback) {
            return callback(null, vocabs);
        }
        _botEngine.showList(vocabs, varToFill);
    };

    self.listVocabClasses = function (vocab, varToFill, includeOwlThing, classes, callback) {
        OntologyModels.registerSourcesModel(vocab, null, function (err, result) {
            if (err) {
                return alert(err.responseText);
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
            if (callback) {
                return callback(null, classes);
            }
            _botEngine.showList(classes, varToFill);
        });
    };

    self.listVocabPropertiesFn = function (vocab, varToFill, props, callback) {
        OntologyModels.registerSourcesModel(vocab, null, function (err, result) {
            if (!props) {
                props = [];
            }
            for (var key in Config.ontologiesVocabularyModels[vocab].properties) {
                var prop = Config.ontologiesVocabularyModels[vocab].properties[key];
                props.push({ id: prop.id, label: prop.label, source: vocab });
            }
            if (props.length == 0) {
                if (callback) {
                    return callback(null, props);
                }
                return _botEngine.previousStep("no values found, try another option");
            }

            self.sortList(props);
            if (callback) {
                return callback(null, props);
            }
            _botEngine.showList(props, varToFill);
        });
    };

    self.listNonObjectPropertiesFn = function (vocabs, varToFill, domain, callback) {
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
                if (props.length == 0) {
                    if (callback) {
                        return callback(null, props);
                    }
                    return _botEngine.previousStep("no values found, try another option");
                }
                self.sortList(props);
                if (callback) {
                    return callback(null, props);
                }
                _botEngine.showList(props, varToFill);
            },
        );
    };

    self.listSourceAllClasses = function (source, varToFill, includeOwlThing, classes, callback) {
        var sources = self.getSourceAndImports(source);
        var allClasses = [];
        async.eachSeries(
            sources,
            function (source, callbackEach) {
                self.listVocabClasses(source, varToFill, includeOwlThing, classes, function (err, classes) {
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
    self.listSourceAllObjectProperties = function (source, varToFill, props, callback) {
        var sources = self.getSourceAndImports(source);
        var allProps = [];
        async.eachSeries(
            sources,
            function (source, callbackEach) {
                self.listVocabPropertiesFn(source, varToFill, props, function (err, props) {
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
    self.listSourceAllObjectPropertiesConstraints = function (source, varToFill, callback) {
        var sources = self.getSourceAndImports(source);
        var allConstraints = {};
        async.eachSeries(
            sources,
            function (source, callbackEach) {
                var constraints = Config.ontologiesVocabularyModels[vocab].constraints;
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
