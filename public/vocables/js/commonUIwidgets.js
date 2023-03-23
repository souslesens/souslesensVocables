CommonUIwidgets = (function () {
    var self = {};

    self.fillObjectTypeOptionsOnPromptFilter = function (type, selectId, source) {
        var term = prompt("Individual contains...");
        if (term === null) {
            return;
        }
        var options = {
            selectGraph: true,
            lang: Config.default_lang,
            type: type,
            filter: term ? " FILTER ( regex(?label,'" + term + "','i'))" : "",
            limit: Config.maxSelectListSize,
        };
        if (!source) {
            source = Lineage_sources.activeSource || KGcreator.currentSlsvSource;
        }
        Sparql_OWL.getDictionary(source, options, null, function (err, result) {
            if (err) {
                alert(err.responseText);
            }

            if (result.length >= Config.maxSelectListSize) {
                if (confirm(" too many values; list truncated to  " + Config.maxSelectListSize + " values") === null) {
                    return;
                }
            }
            var objs = [];
            result.forEach(function (item) {
                objs.push({
                    id: item.id.value,
                    label: item.label ? item.label.value : Sparql_common.getLabelFromURI(item.id.value),
                });
            });
            objs.sort(function (a, b) {
                if (a.label > b.label) {
                    return 1;
                }
                if (a.label < b.label) {
                    return -1;
                }
                return 0;
            });
            common.fillSelectOptions(selectId, objs, true, "label", "id");
        });
    };

    self.predicatesSelectorWidget = {
        predicatesIdsMap: {},

        init: function (source, configureFn) {
            $("#sourceBrowser_addPropertyDiv").css("display", "flex");

            $("#editPredicate_currentVocabPredicateSelect").prop("disabled", false);
            $("#editPredicate_vocabularySelect").prop("disabled", false);
            $("#editPredicate_propertyValue").prop("disabled", false);

            CommonUIwidgets.predicatesSelectorWidget.setVocabulariesSelect(source);
            CommonUIwidgets.predicatesSelectorWidget.setCurrentVocabClassesSelect("usual", "editPredicate_objectSelect");
            CommonUIwidgets.predicatesSelectorWidget.setCurrentVocabPropertiesSelect("usual", "editPredicate_currentVocabPredicateSelect");

            // var properties = Config.Lineage.basicObjectProperties;

            CommonUIwidgets.predicatesSelectorWidget.configure(configureFn);
        },

        configure: function (configureFn) {
            self.predicatesSelectorWidget.onSelectPropertyFn = null;
            self.predicatesSelectorWidget.onSelectObjectFn = null;
            $("#editPredicate_vocabularySelect").val("usual");
            $("#editPredicate_vocabularySelect2").val("usual");
            if (configureFn) {
                configureFn();
            }
        },

        setVocabulariesSelect: function (source, filter) {
            var vocabularies = [];
            if (!filter || filter == "_all") {
                vocabularies = ["usual", source];
                vocabularies = vocabularies.concat(Config.sources[source].imports);
                vocabularies = vocabularies.concat(Object.keys(Config.ontologiesVocabularyModels));
            } else if (filter == "_loadedSources") {
                vocabularies = Lineage_sources.loadedSources;
                vocabularies = vocabularies.concat(Config.sources[source].imports);
            } else if (filter == "_basicVocabularies") {
                vocabularies = Object.keys(Config.basicVocabularies);
            } else if (filter == "_curentSourceAndImports") {
                vocabularies = [source];
                vocabularies = vocabularies.concat(Config.sources[source].imports);
            } else {
                if (!Array.isArray(filter)) filter = [filter];
                vocabularies = filter;
            }
            common.fillSelectOptions("editPredicate_vocabularySelect", vocabularies, true);
            common.fillSelectOptions("editPredicate_vocabularySelect2", vocabularies, true);
        },
        setCurrentVocabPropertiesSelect: function (vocabulary, selectId) {
            var properties = [];

            if (vocabulary == "usual") {
                KGcreator.usualProperties.forEach(function (item) {
                    properties.push({ label: item, id: item });
                });
                properties.push({ label: "-------", id: "" });
                common.fillSelectOptions(selectId, properties, true, "label", "id");
            } else if (Config.ontologiesVocabularyModels[vocabulary]) {
                properties = Config.ontologiesVocabularyModels[vocabulary].properties;
                common.fillSelectOptions(selectId, properties, true, "label", "id");
            } else {
            }
        },
        onSelectPredicateProperty: function (value) {
            $("#editPredicate_propertyValue").val(value);
            if (self.predicatesSelectorWidget.onSelectPropertyFn) {
                self.predicatesSelectorWidget.onSelectPropertyFn(value);
            }
        },

        onSelectCurrentVocabObject: function (value) {
            if (value == "_search") {
                return CommonUIwidgets.fillObjectTypeOptionsOnPromptFilter(null, "editPredicate_objectSelect", self.predicatesSelectorWidget.currentVocabulary);
            }
            $("#editPredicate_objectValue").val(value);
            if (self.predicatesSelectorWidget.onSelectObjectFn) {
                self.predicatesSelectorWidget.onSelectObjectFn(value);
            }
        },

        setCurrentVocabClassesSelect: function (vocabulary, selectId) {
            self.predicatesSelectorWidget.currentVocabulary = vocabulary;
            var classes = [];

            if (vocabulary == "usual") {
                KGcreator.usualObjectClasses.forEach(function (item) {
                    classes.push({
                        id: item,
                        label: item,
                    });
                });
                common.fillSelectOptions(selectId, classes, true, "label", "id");
            } else if (Config.ontologiesVocabularyModels[vocabulary]) {
                var classes = [{ id: "_search", label: "search..." }];

                var uniqueClasses = {};
                for (var key in Config.ontologiesVocabularyModels[vocabulary].classes) {
                    if (!uniqueClasses[key]) {
                        uniqueClasses[key] = 1;
                        classes.push(Config.ontologiesVocabularyModels[vocabulary].classes[key]);
                    }
                }

                var restrictionsRanges = [];

                for (var key in Config.ontologiesVocabularyModels[vocabulary].restrictions) {
                    var restrictions = Config.ontologiesVocabularyModels[vocabulary].restrictions[key];
                    restrictions.forEach(function (restriction) {
                        if (!uniqueClasses[restriction.range]) {
                            uniqueClasses[restriction.range] = 1;
                            restrictionsRanges.push({
                                id: restriction.range,
                                label: restriction.rangeLabel,
                            });
                        }
                    });
                }

                classes = classes.concat(restrictionsRanges);
                classes = common.array.sort(classes, "label");
                common.fillSelectOptions(selectId, classes, true, "label", "id");
            } else {
                return CommonUIwidgets.fillObjectTypeOptionsOnPromptFilter(null, "editPredicate_objectSelect", vocabulary);
            }
        },
    };

    return self;
})();
