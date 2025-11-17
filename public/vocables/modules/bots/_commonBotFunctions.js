import _botEngine from "./_botEngine.js";
import CommonBotFunctions_class from "./_commonBotFunctions_class.js";

var CommonBotFunctions = (function () {
    var self = {};

    self.sortList = CommonBotFunctions_class.sortList;

    self.loadSourceOntologyModel = function (sourceLabel, withImports, callback) {
        CommonBotFunctions_class.loadSourceOntologyModel(sourceLabel, function (err) {
            if (err) {
                if (!callback) {
                    alert(err);
                    return _botEngine.end();
                }
            }
            return callback(err);
        });
    };

    self.listVocabsFn = function (sourceLabel, varToFill, includeBasicVocabs, callback) {
        CommonBotFunctions_class.listVocabsFn(sourceLabel, includeBasicVocabs, function (err, vocabs) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                return _botEngine.previousStep(err);
            }
            if (vocabs.length == 0) {
                if (callback) {
                    return callback(null, vocabs);
                }
                return _botEngine.previousStep("no values found, try another option");
            }
            if (callback) {
                return callback(null, vocabs);
            }
            _botEngine.showList(vocabs, varToFill);
        });
    };

    self.listVocabClasses = function (vocab, varToFill, includeOwlThing, classes, callback) {
        CommonBotFunctions_class.listVocabClasses(vocab, includeOwlThing, classes, function (err, result) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                return MainController.errorAlert(err);
            }
            if (callback) {
                return callback(null, result);
            }
            _botEngine.showList(result, varToFill);
        });
    };

    self.listVocabPropertiesFn = function (vocab, varToFill, props, callback) {
        CommonBotFunctions_class.listVocabPropertiesFn(vocab, props, function (err, result) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                return MainController.errorAlert(err);
            }
            if (result.length == 0) {
                if (callback) {
                    return callback(null, result);
                }
                return _botEngine.previousStep("no values found, try another option");
            }
            if (callback) {
                return callback(null, result);
            }
            _botEngine.showList(result, varToFill);
        });
    };

    self.listNonObjectPropertiesFn = function (vocabs, varToFill, domain, callback) {
        CommonBotFunctions_class.listNonObjectPropertiesFn(vocabs, domain, function (err, result) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                return MainController.errorAlert(err);
            }
            if (result.length == 0) {
                if (callback) {
                    return callback(null, result);
                }
                return _botEngine.previousStep("no values found, try another option");
            }
            if (callback) {
                return callback(null, result);
            }
            _botEngine.showList(result, varToFill);
        });
    };

    self.listSourceAllClasses = function (source, varToFill, includeOwlThing, classes, callback) {
        CommonBotFunctions_class.listSourceAllClasses(source, includeOwlThing, classes, function (err, result) {
            return callback(err, result);
        });
    };
    self.listSourceAllObjectProperties = function (source, varToFill, props, callback) {
        CommonBotFunctions_class.listSourceAllObjectProperties(source, props, function (err, result) {
            return callback(err, result);
        });
    };
    self.listSourceAllObjectPropertiesConstraints = function (source, varToFill, callback) {
        CommonBotFunctions_class.listSourceAllObjectPropertiesConstraints(source, function (err, result) {
            return callback(err, result);
        });
    };

    self.getSourceAndImports = CommonBotFunctions_class.getSourceAndImports;

    return self;
})();
export default CommonBotFunctions;
