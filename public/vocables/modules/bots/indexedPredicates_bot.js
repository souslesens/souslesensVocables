import BotEngineClass from "./_botEngineClass.js";
import OntologyModels from "../shared/ontologyModels.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";

/**
 * Pre-step of every manual indexation: lets the user pick extra datatype and annotation
 * properties that have string values in the source graph. The chosen values are indexed into the
 * `skoslabels` field.
 */
var IndexedPredicates_bot = (function () {
    var self = {};
    self.myBotEngine = new BotEngineClass();

    self.title = "Indexed predicates";

    self.workflow = {
        promptPredicatesSelectionFn: {},
    };

    self.functionTitles = {
        promptPredicatesSelectionFn: "indexed predicates",
    };

    var defaultIndexedPredicatesNodeId = "__defaultIndexedPredicates__";

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
                currentSourceIndex: 0,
                indexedPredicatesBySource: {},
                indexationCallback: indexationCallback,
            };
            self.myBotEngine.nextStep();
        });
    };

    function getCurrentSource() {
        return self.params.sources[self.params.currentSourceIndex];
    }

    function moveToNextSourceOrRunIndexation() {
        self.params.currentSourceIndex += 1;
        if (self.params.currentSourceIndex < self.params.sources.length) {
            return self.functions.promptPredicatesSelectionFn();
        }
        runIndexation();
    }

    function getDefaultIndexedPredicateIdsMap() {
        var defaultIndexedPredicateIdsMap = {};
        Sparql_common.getDefaultIndexedPredicates().forEach(function (predicate) {
            if (!predicate.id) {
                return;
            }
            defaultIndexedPredicateIdsMap[predicate.id] = true;
        });
        return defaultIndexedPredicateIdsMap;
    }

    function buildPredicatesJstreeData(source, indexablePredicates) {
        var jstreeData = [
            {
                id: defaultIndexedPredicatesNodeId,
                text: "Default indexed properties",
                parent: "#",
                type: "Folder",
                data: { id: defaultIndexedPredicatesNodeId },
            },
        ];
        var predicateTypeNodeIds = {};

        Sparql_common.getDefaultIndexedPredicates().forEach(function (predicate) {
            if (!predicate.id) {
                return;
            }
            jstreeData.push({
                id: predicate.id,
                text: predicate.label,
                parent: defaultIndexedPredicatesNodeId,
                type: "Property",
                data: { id: predicate.id, isDefaultIndexedPredicate: true },
                state: { checked: true, disabled: true },
            });
        });

        indexablePredicates.forEach(function (predicate) {
            var predicateTypeNodeId = "__propertyType__" + encodeURIComponent(predicate.typeUri || predicate.typeLabel);
            if (!predicateTypeNodeIds[predicateTypeNodeId]) {
                predicateTypeNodeIds[predicateTypeNodeId] = true;
                jstreeData.push({
                    id: predicateTypeNodeId,
                    text: predicate.typeLabel,
                    parent: "#",
                    type: "Folder",
                    data: { id: predicateTypeNodeId },
                });
            }
            jstreeData.push({
                id: predicate.id,
                text: predicate.label,
                parent: predicateTypeNodeId,
                type: "Property",
                data: { id: predicate.id },
                // `checked` and not `selected`: JstreeWidget mounts the checkbox plugin with tie_selection false
                state: { checked: false },
            });
        });
        return jstreeData;
    }

    function runIndexation() {
        self.myBotEngine.closeDialog();
        if (self.params.indexationCallback) {
            self.params.indexationCallback(self.params.indexedPredicatesBySource);
        }
    }

    function promptPredicatesSelection() {
        var source = getCurrentSource();

        OntologyModels.getIndexablePredicates(source, null, function (err, indexablePredicates) {
            if (err) {
                return MainController.errorAlert(err);
            }

            var jstreeData = buildPredicatesJstreeData(source, indexablePredicates);
            var defaultIndexedPredicateIdsMap = getDefaultIndexedPredicateIdsMap();

            self.myBotEngine.showTree(jstreeData, null, { withCheckboxes: true, openAll: true }, null, function (checkedIds) {
                var selectedPredicates = checkedIds.filter(function (checkedId) {
                    return !defaultIndexedPredicateIdsMap[checkedId];
                });

                if (selectedPredicates.length > 0) {
                    self.params.indexedPredicatesBySource[source] = selectedPredicates;
                }
                moveToNextSourceOrRunIndexation();
            });
        });
    }

    self.functions = {
        promptPredicatesSelectionFn: promptPredicatesSelection,
    };

    return self;
})();

export default IndexedPredicates_bot;
window.IndexedPredicates_bot = IndexedPredicates_bot;
