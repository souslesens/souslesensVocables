import BotEngine from "./botEngine.js";
import KGcreator from "../tools/KGcreator/KGcreator.js";
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
        sources = sources.concat(Config.sources[sourceLabel].imports);
        async.eachSeries(
            sources,
            function (source, callbackEach) {
                OntologyModels.registerSourcesModel(source, function (err, result) {
                    callbackEach(err);
                });
            },
            function (err) {
                return callback(err);
            }
        );
    };

    self.listVocabsFn = function (sourceLabel, varToFill, includBasicVocabs) {
        var vocabs = [{ id: sourceLabel, label: sourceLabel }];
        var imports = Config.sources[sourceLabel].imports;
        if (!imports) return vocabs;
        imports.forEach(function (importSource) {
            vocabs.push({ id: importSource, label: importSource });
        });
        if (includBasicVocabs) {
            for (var key in Config.basicVocabularies) {
                vocabs.push({ id: key, label: key });
            }
        }
        if (vocabs.length == 0) {
            return BotEngine.previousStep("no values found, try another option");
        }

        BotEngine.showList(vocabs, varToFill);
    };

    self.listVocabClasses = function (vocab, varToFill, includeOwlThing) {
        OntologyModels.registerSourcesModel(vocab, function (err, result) {
            if (err) {
                return alert(err.responseText);
            }
            var classes = [];

            for (var key in Config.ontologiesVocabularyModels[vocab].classes) {
                var classId = Config.ontologiesVocabularyModels[vocab].classes[key];
                classes.push({ id: classId.id, label: classId.label });
            }

            if (classes.length == 0) {
                return BotEngine.previousStep("no values found, try another option");
            }

            self.sortList(classes);
            if (includeOwlThing) {
                classes.splice(0, 0, { id: "owl:Thing", label: "owl:Thing" });
            }

            BotEngine.showList(classes, varToFill);
        });
    };

    self.listVocabPropertiesFn = function (vocab, varToFill) {
        OntologyModels.registerSourcesModel(vocab, function (err, result) {
            var props = [];
            for (var key in Config.ontologiesVocabularyModels[vocab].properties) {
                var prop = Config.ontologiesVocabularyModels[vocab].properties[key];
                props.push({ id: prop.id, label: prop.label });
            }
            if (props.length == 0) {
                return BotEngine.previousStep("no values found, try another option");
            }
            self.sortList(props);
            BotEngine.showList(props, varToFill);
        });
    };

    self.getColumnClass = function (tripleModels, columnName) {
        var columnClass = null;
        tripleModels.forEach(function (item) {
            if ((item.s == columnName || item.s == "$_" + columnName) && item.p == "rdf:type") {
                if (item.o.indexOf("owl:") < 0) {
                    columnClass = item.o;
                }
            }
        });
        return columnClass;
    };

    return self;
})();
export default CommonBotFunctions;
