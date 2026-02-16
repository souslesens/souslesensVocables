import CommonBotFunctions from "../../bots/_commonBotFunctions.js";
import NodeInfosAxioms from "./nodeInfosAxioms.js";

var Axioms_manager = (function () {
    var self = {};
    const conceptStr = "concept";

    self.initResourcesMap = function (source, callback) {
        self.allResourcesMap = {};
        self.allClasses = null;
        self.allProperties = null;

        self.getAllClasses(source, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.forEach(function (item) {
                self.allResourcesMap[item.id] = item;
            });
        });
        self.getAllProperties(source, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.forEach(function (item) {
                self.allResourcesMap[item.id] = item;
            });
            if (callback) return callback(err, result);
        });
    };
    self.getAllClasses = function (source, callback) {
        if (!source) {
            source = self.currentSource;
        }
        if (!self.allClasses) {
            CommonBotFunctions.listSourceAllClasses(source, false, [], function (err, result) {
                if (err) {
                    return callback(err.responseText);
                }
                self.allClasses = [];
                var uniqueIds = {};
                result.forEach(function (item) {
                    if (!uniqueIds[item.id]) {
                        uniqueIds[item.id] = 1;
                        item.label = item.label; //.replace(/ /g, "_");
                        item.resourceType = "Class";
                        self.allClasses.push(item);
                    }
                });
                common.array.sort(self.allClasses, "label");
                if (callback) {
                    return callback(null, self.allClasses);
                }
                return self.allClasses;
            });
        } else {
            if (callback) {
                return callback(null, self.allClasses);
            }
            return self.allClasses;
        }
    };
    self.getAllProperties = function (source, callback) {
        if (!source) source = self.currentSource;

        if (!self.allProperties) {
            CommonBotFunctions.listSourceAllObjectProperties(source, null, function (err, result) {
                if (err) {
                    return callback(err.responseText);
                }
                self.allProperties = [];
                var uniqueIds = {};
                result.forEach(function (item) {
                    if (!uniqueIds[item.id]) {
                        uniqueIds[item.id] = item.label;

                        item.label = item.label; //,.replace(/ /g, "_");
                        item.resourceType = "ObjectProperty";
                        self.allProperties.push(item);
                    }else{
                        // in case there label is different from label calculated from uri, we keep the true label get from rdfs:label
                        var labelFromUri = Sparql_common.getLabelFromURI(item.id);
                        if(labelFromUri != item.label && labelFromUri == uniqueIds[item.id]){ 
                            self.allProperties.find(function(prop){
                                return prop.id == item.id;
                            }).label = item.label;
                        }
                    }
                });
                common.array.sort(self.allProperties, "label");
                if (callback) {
                    return callback(null, self.allProperties);
                }
                return self.allProperties;
            });
        } else {
            if (callback) {
                return callback(null, self.allProperties);
            }
            return self.allProperties;
        }
    };

    self.getManchesterAxiomsFromTriples = function (source, triples, callback) {
        if (!source) {
            source = NodeInfosAxioms.currentSource;
        }
        var rawManchesterStr = "";

        const params = new URLSearchParams({
            triples: JSON.stringify(triples),
        });
        UI.message("generating manchester syntax ");
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/axioms/manchester?" + params.toString(),
            dataType: "json",

            success: function (data, _textStatus, _jqXHR) {
                if (data.result && data.result.indexOf("Error") > -1) {
                    return callback(data.result);
                }
                rawManchesterStr = data.result;
                UI.message("", true);
                callback(null, data.result);
            },
            error(err) {
                UI.message("", true);
                callback(err.responseText);
            },
        });
    };

    self.getClassAxioms = function (sourceLabel, classUri, options, callback) {
        var graphUri = Config.sources[sourceLabel].graphUri;
        if (!graphUri) {
            return callback("no graphUri found");
        }
        var payload = {
            graphUri: graphUri,
            classUri: classUri,
        };
        if (options.axiomType) {
            payload.axiomType = 1;
        }
        if (options.getManchesterExpression) {
            payload.getManchesterExpression = 1;
        }
        if (options.getTriples) {
            payload.getTriples = 1;
        }

        const params = new URLSearchParams(payload);
        UI.message("getting Class axioms");
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/jowl/classAxioms?" + params.toString(),
            dataType: "json",

            success: function (data, _textStatus, _jqXHR) {
                if (data.result && data.result.indexOf("Error") > -1) {
                    return callback(data.result);
                }
                callback(null, data);
                //  callback(null, data);
            },
            error(err) {
                callback(err.responseText);
            },
        });
    };

    self.listClassesWithAxioms = function (sourceLabel, callback) {
        if (!sourceLabel) {
            sourceLabel = Lineage_sources.activeSource;
        }
        var graphUri = Config.sources[sourceLabel].graphUri;
        if (!graphUri) {
            return callback("no graphUri found");
        }
        var payload = {
            graphName: graphUri,
        };

        const params = new URLSearchParams(payload);
        UI.message("getting Class axioms");
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/jowl/listClassesWithAxioms?" + params.toString(),
            dataType: "json",

            success: function (data, _textStatus, _jqXHR) {
                if (data.result && data.result.indexOf("Error") > -1) {
                    return callback(data.result);
                }
                callback(null, data);
                //  callback(null, data);
            },
            error(err) {
                callback(err.responseText);
            },
        });
    };
    self.parseManchesterClassAxioms = function (manchesterRawStr) {
        var result = manchesterRawStr.replace(/<([^>]+)>/gm, function (expr, value) {
            if (Axioms_manager.allResourcesMap[value]) return Axioms_manager.allResourcesMap[value].label;
            return Sparql_common.getLabelFromURI(value);
        });
        result = result.replace(/\n( *)/g, function (match, spaces) {
            return "<br>" + spaces.replace(/ /g, "&nbsp;");
        });
        return result;
    };

    return self;
})();
//Axioms_manager.test();

export default Axioms_manager;
window.Axiom_manager = Axioms_manager;
