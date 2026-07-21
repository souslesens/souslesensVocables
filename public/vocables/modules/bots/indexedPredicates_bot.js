import BotEngineClass from "./_botEngineClass.js";

/**
 * Pre-step of every manual indexation: lets the user either keep the predicates already configured
 * for the source, or pick extra datatype properties whose values are indexed into the `skoslabels`
 * field of the Elasticsearch documents, on top of the built-in rdfs:label / skos:prefLabel /
 * skos:altLabel. The selection is stored in `sources.json` as `indexedPredicates` and consumed at
 * indexation time by `Sparql_common.getIndexedPredicatesClauses`.
 */
var IndexedPredicates_bot = (function () {
    var self = {};
    self.myBotEngine = new BotEngineClass();

    self.title = "Indexed predicates";

    self.workflow = {
        chooseIndexationModeFn: {},
    };

    self.functionTitles = {
        chooseIndexationModeFn: "indexed predicates",
    };

    // Full URIs are stored because the indexation queries only declare the owl/rdf/rdfs/skos
    // prefixes: a prefixed name from another vocabulary would break the generated SPARQL.
    var indexablePredicates = [
        { id: "http://www.w3.org/2004/02/skos/core#notation", label: "skos:notation", vocabulary: "skos" },
        { id: "http://www.w3.org/2004/02/skos/core#hiddenLabel", label: "skos:hiddenLabel", vocabulary: "skos" },
        { id: "http://www.w3.org/2004/02/skos/core#definition", label: "skos:definition", vocabulary: "skos" },
        { id: "http://www.w3.org/2004/02/skos/core#example", label: "skos:example", vocabulary: "skos" },
        { id: "http://www.w3.org/2000/01/rdf-schema#notation", label: "rdfs:notation", vocabulary: "rdfs" },
        { id: "http://www.w3.org/2000/01/rdf-schema#comment", label: "rdfs:comment", vocabulary: "rdfs" },
        { id: "http://purl.org/dc/terms/identifier", label: "dcterms:identifier", vocabulary: "dcterms" },
        { id: "http://purl.org/dc/terms/title", label: "dcterms:title", vocabulary: "dcterms" },
        { id: "http://purl.org/dc/terms/description", label: "dcterms:description", vocabulary: "dcterms" },
        { id: "http://purl.org/dc/elements/1.1/identifier", label: "dc:identifier", vocabulary: "dc" },
        { id: "http://purl.org/dc/elements/1.1/title", label: "dc:title", vocabulary: "dc" },
    ];

    var keepConfiguredModeId = "keepConfigured";
    var customizeModeId = "customize";
    // showTree ignores a validation with nothing checked, so emptying the list needs its own leaf
    var clearSelectionNodeId = "__clearIndexedPredicates__";

    /**
     * @function start
     * @name start
     * @memberof IndexedPredicates_bot
     * Opens the indexed predicates step, then hands over to the indexation itself.
     * @param {string|string[]} sources - Source name, or the list of sources about to be indexed;
     * the selection is applied to all of them
     * @param {Function} indexationCallback - Called once the predicates are settled, to run the indexation
     */
    self.start = function (sources, indexationCallback) {
        var sourcesToIndex = Array.isArray(sources) ? sources : [sources];
        self.myBotEngine.init(IndexedPredicates_bot, self.workflow, null, function () {
            self.params = {
                sources: sourcesToIndex,
                indexationCallback: indexationCallback,
            };
            self.myBotEngine.nextStep();
        });
    };

    function getConfiguredPredicates(source) {
        return (Config.sources[source] && Config.sources[source].indexedPredicates) || [];
    }

    function buildPredicatesJstreeData(source) {
        var configuredPredicates = getConfiguredPredicates(source);
        var jstreeData = [{ id: clearSelectionNodeId, text: "none (index labels only)", parent: "#", data: { id: clearSelectionNodeId } }];
        var vocabularyNodeIds = {};

        indexablePredicates.forEach(function (predicate) {
            var vocabularyNodeId = "__vocabulary__" + predicate.vocabulary;
            if (!vocabularyNodeIds[vocabularyNodeId]) {
                vocabularyNodeIds[vocabularyNodeId] = true;
                jstreeData.push({ id: vocabularyNodeId, text: predicate.vocabulary, parent: "#", type: "Folder", data: { id: vocabularyNodeId } });
            }
            jstreeData.push({
                id: predicate.id,
                text: predicate.label,
                parent: vocabularyNodeId,
                type: "Property",
                data: { id: predicate.id },
                // `checked` and not `selected`: JstreeWidget mounts the checkbox plugin with tie_selection false
                state: { checked: configuredPredicates.indexOf(predicate.id) > -1 },
            });
        });
        return jstreeData;
    }

    /**
     * Writes the selection back to sources.json for every source about to be indexed. Descriptors
     * are re-fetched from the API instead of reusing `Config.sources`, whose `sparql_server.url` has
     * been resolved from `_default` to the actual endpoint on load and must not be persisted that way.
     */
    function saveIndexedPredicates(sources, selectedPredicates, callback) {
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/sources",
            dataType: "json",
            success: function (data) {
                async.eachSeries(
                    sources,
                    function (source, callbackEachSource) {
                        var sourceDescriptor = data.resources ? data.resources[source] : null;
                        if (!sourceDescriptor) {
                            return callbackEachSource("source " + source + " not found");
                        }
                        sourceDescriptor.name = sourceDescriptor.name || source;
                        sourceDescriptor.indexedPredicates = selectedPredicates;

                        $.ajax({
                            type: "PUT",
                            url: Config.apiUrl + "/sources/" + encodeURIComponent(source),
                            data: JSON.stringify(sourceDescriptor),
                            contentType: "application/json",
                            dataType: "json",
                            success: function () {
                                Config.sources[source].indexedPredicates = selectedPredicates;
                                callbackEachSource();
                            },
                            error: function (err) {
                                callbackEachSource(err.responseText || err);
                            },
                        });
                    },
                    function (err) {
                        callback(err);
                    },
                );
            },
            error: function (err) {
                callback(err.responseText || err);
            },
        });
    }

    function runIndexation() {
        self.myBotEngine.closeDialog();
        if (self.params.indexationCallback) {
            self.params.indexationCallback();
        }
    }

    function promptPredicatesSelection() {
        var jstreeData = buildPredicatesJstreeData(self.params.sources[0]);

        self.myBotEngine.showTree(jstreeData, null, { withCheckboxes: true, openAll: true }, null, function (checkedIds) {
            var selectedPredicates = checkedIds.filter(function (checkedId) {
                return checkedId != clearSelectionNodeId;
            });
            if (checkedIds.indexOf(clearSelectionNodeId) > -1) {
                selectedPredicates = [];
            }

            saveIndexedPredicates(self.params.sources, selectedPredicates, function (err) {
                if (err) {
                    return MainController.errorAlert(err);
                }
                runIndexation();
            });
        });
    }

    self.functions = {
        chooseIndexationModeFn: function () {
            var configuredPredicates = getConfiguredPredicates(self.params.sources[0]);
            var configuredCount = configuredPredicates.length;
            var choices = [
                { id: keepConfiguredModeId, label: "index with the configured predicates (" + configuredCount + ")" },
                { id: customizeModeId, label: "choose the predicates to index" },
            ];

            self.myBotEngine.showList(choices, null, null, null, function (chosenMode) {
                if (chosenMode == keepConfiguredModeId) {
                    return runIndexation();
                }
                promptPredicatesSelection();
            });
        },
    };

    return self;
})();

export default IndexedPredicates_bot;
window.IndexedPredicates_bot = IndexedPredicates_bot;
