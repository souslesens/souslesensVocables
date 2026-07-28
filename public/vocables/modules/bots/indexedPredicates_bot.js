import BotEngineClass from "./_botEngineClass.js";
import OntologyModels from "../shared/ontologyModels.js";

/**
 * Pre-step of every manual indexation: first asks whether the default indexed predicates are enough
 * or extra ones should be picked. Only in the second case are the indexable predicates of the source
 * looked up (the lookup probes the data, too slow to impose on a user who only wants the defaults)
 * and shown in a tree, under a single "Other predicates" folder. The chosen values are indexed into
 * the `skoslabels` field.
 */
var IndexedPredicates_bot = (function () {
    var self = {};
    self.myBotEngine = new BotEngineClass();

    self.title = "Indexed predicates";

    self.workflow = {
        promptIndexationModeFn: {
            promptPredicatesSelectionFn: {},
        },
    };

    self.functionTitles = {
        promptIndexationModeFn: "predicates to index",
        promptPredicatesSelectionFn: "indexed predicates",
    };

    var otherPredicatesNodeId = "__otherPredicates__";
    var indexDefaultPredicatesChoiceId = "defaultPredicates";
    var pickOtherPredicatesChoiceId = "otherPredicates";

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
            return self.functions.promptIndexationModeFn();
        }
        runIndexation();
    }

    /**
     * First step, once per source: default predicates only, or pick extra ones. The indexable
     * predicates lookup probes the source data, so it only runs when the user asks for extra
     * predicates; answering "default" starts the indexation without any predicate query.
     */
    function promptIndexationMode() {
        var source = getCurrentSource();
        self.myBotEngine.insertBotMessage("Predicates to index for " + source, { isQuestion: true });
        var indexationModeChoices = [
            { id: indexDefaultPredicatesChoiceId, label: "Default predicates" },
            { id: pickOtherPredicatesChoiceId, label: "Default predicates + other indexable predicates" },
        ];
        self.myBotEngine.showList(indexationModeChoices, null, null, false, function (selectedChoiceId) {
            if (selectedChoiceId == pickOtherPredicatesChoiceId) {
                return self.functions.promptPredicatesSelectionFn();
            }
            moveToNextSourceOrRunIndexation();
        });
    }

    // the default indexed predicates are not shown: they are hard-coded in the indexation queries
    // and indexed whatever the user does, the tree only offers the extra ones
    function buildPredicatesJstreeData(indexablePredicates) {
        // a single folder whatever the declared property types: the user picks predicates by what
        // they contain, not by how the ontology declares them
        var jstreeData = [
            {
                id: otherPredicatesNodeId,
                text: "Other predicates",
                parent: "#",
                type: "Folder",
                data: { id: otherPredicatesNodeId },
            },
        ];
        indexablePredicates.forEach(function (predicate) {
            jstreeData.push({
                id: predicate.id,
                text: predicate.label,
                parent: otherPredicatesNodeId,
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
                // the indexation itself must not be cancelled because the predicates could not be listed
                MainController.errorAlert(err);
                return moveToNextSourceOrRunIndexation();
            }
            if (indexablePredicates.length == 0) {
                return moveToNextSourceOrRunIndexation();
            }

            var jstreeData = buildPredicatesJstreeData(indexablePredicates);
            var indexablePredicateIdsMap = {};
            indexablePredicates.forEach(function (indexablePredicate) {
                indexablePredicateIdsMap[indexablePredicate.id] = true;
            });
            self.myBotEngine.insertBotMessage("Indexed predicates for " + source, { isQuestion: true });

            self.myBotEngine.showTree(jstreeData, null, { withCheckboxes: true, openAll: true, allowEmptySelection: true }, null, function (checkedIds) {
                // keeps out the default predicates, hard coded in the indexation queries, and the
                // folder ids a whole-folder check would put among the checked nodes
                var selectedPredicates = checkedIds.filter(function (checkedId) {
                    return indexablePredicateIdsMap[checkedId];
                });

                if (selectedPredicates.length > 0) {
                    self.params.indexedPredicatesBySource[source] = selectedPredicates;
                }
                moveToNextSourceOrRunIndexation();
            });
        });
    }

    self.functions = {
        promptIndexationModeFn: promptIndexationMode,
        promptPredicatesSelectionFn: promptPredicatesSelection,
    };

    return self;
})();

export default IndexedPredicates_bot;
window.IndexedPredicates_bot = IndexedPredicates_bot;
