import Sparql_OWL from "../sparqlProxies/sparql_OWL.js";
import common from "../shared/common.js";
import Lineage_createRelation from "../tools/lineage/lineage_createRelation.js";
import Sparql_generic from "../sparqlProxies/sparql_generic.js";
import UI from "../shared/UI.js";


var SavedQueriesWidget = (function () {
    var self = {};

    self.contentPredicate = "hasContent";
    self.scopePredicate = "hasScope";
    self.sourcePredicate = "hasSource";

    self.init = function (CRUDsource) {
        if (false && self.currentCRUDsourceLabel) {
            return;
        }
        self.currentCRUDsourceLabel = CRUDsource;
        self.currentCRUDsourceObject = Config.CRUDsources[CRUDsource];
        if (!self.currentCRUDsourceObject) {
            return alert("CRUD source " + CRUDsource + " is not registered");
        }
        Config.sources[CRUDsource] = self.currentCRUDsourceObject;
    };

    self.showDialog = function (CRUDsource, targetDiv, slsvSource, scope, saveQueryFn, loadQueryFn) {
        self.init(CRUDsource);
        self.saveQueryFn = saveQueryFn;
        self.loadQueryFn = loadQueryFn;
        self.slsvSource = slsvSource;

        $("#" + targetDiv).load("./modules/uiWidgets/html/savedQueriesWidget.html", function () {
            if (targetDiv.indexOf("Dialog") > -1) {
                $("#" + targetDiv).dialog("open");
            }
            if (slsvSource) {
                self.list(CRUDsource, slsvSource, scope);
            }
        });
    };

    self.list = function (CRUDsource, slsvSource, scope, targetSelect, callback) {
        self.init(CRUDsource);
        self.currentCRUDsourceLabel;

        if (!targetSelect) {
            targetSelect = "SavedQueriesComponent_itemsSelect";
        }
        if (!scope) {
            scope = $("#SavedQueriesComponent_scope").val();
        }
        if (scope == "private") {
            scope = authentication.currentUser.login;
        }
        if (!slsvSource) {
            slsvSource = Lineage_sources.activeSource;
        }
        var filter = "";
        if (scope) {
            filter += "?s <" + self.currentCRUDsourceObject.graphUri + self.scopePredicate + "> ?scope. filter (?scope in ('" + scope + "','public'))\n";
        }
        if (slsvSource) {
            filter += "?s <" + self.currentCRUDsourceObject.graphUri + self.sourcePredicate + "> '" + slsvSource + "'.";
        }

        filter += "?s rdfs:label ?o";
        var options = {
            selectVars: "distinct ?s ?o",
            filter: filter,
            orderBy: "?o",
        };
        Sparql_OWL.getTriples(CRUDsource, options, function (err, result) {
            if (err) {
                if (callback) {
                    callback(err);
                }
                return alert(err.responseText);
            }
            var data = [];

            result.forEach(function (item) {
                data.push({ label: item.o.value, id: item.s.value });
            });
            common.fillSelectOptions(targetSelect, data, false, "label", "id");
            if (callback) {
                callback(null, result);
            }
        });
    };

    self.loadItem = function (uri, options, callback) {
        var filter = "FILTER (?s =<" + uri + ">) ";
        var options = {
            filter: filter,
        };
        Sparql_OWL.getTriples(self.currentCRUDsourceLabel, options, function (err, result) {
            if (err) {
                return self.loadQueryFn(err.responseText);
            }

            var contentPredicate = self.currentCRUDsourceObject.graphUri + self.contentPredicate;

            result.forEach(function (triple) {
                var predicate = triple.p.value;
                if (predicate.indexOf(self.contentPredicate) > -1) {
                    var content = JSON.parse(atob(triple.o.value));
                    if (callback) {
                        return callback(null, content);
                    }
                    return self.loadQueryFn(null, content);
                }
            });
        });
    };

    self.save = function (slsvSource, scope, callback) {
        self.saveQueryFn(function (err, result) {
            if (err) {
                return alert(err.responseText);
            }
            var data = result;
            if (!data) {
                return alert(" nothing to save");
            }

            var label = prompt("query name");
            if (!label) {
                return;
            }
            if (!scope) {
                scope = $("#SavedQueriesComponent_scope").val();
            }
            if (!slsvSource) {
                slsvSource = self.slsvSource;
            }
            if (!confirm("save query " + label + "with scope " + scope + " in source " + self.currentCRUDsourceLabel + " ?")) {
                return;
            }
            if (scope == "private") {
                scope = authentication.currentUser.login;
            }
            var queryUri = self.currentCRUDsourceObject.graphUri + common.getRandomHexaId(10);
            const getCircularReplacer = () => {
                return (key, value) => {
                    if (key == "queryElement") {
                        value = value["divId"];
                    }
                    return value;
                };
            };

            //var content64 = btoa(JSON.stringify(data, getCircularReplacer()));
            var data_path =  "KGquery/savedQueries/" ;
            UserDataWidget.saveMetadata(label, data_path, data,null, function (err, result) {
                if(err){
                    return alert(err);
                }
                console.log(result);
                $('#KGquery_messageDiv').text('saved query');


            });
            /*
            var triples = [];
            triples.push({
                subject: queryUri,
                predicate: "rdfs:label",
                object: label,
            });
            triples.push({
                subject: queryUri,
                predicate: "rdf:type",
                object: self.currentCRUDsourceObject.type,
            });
            triples.push({
                subject: queryUri,
                predicate: "slsv:" + self.contentPredicate,
                object: content64,
            });
            triples.push({
                subject: queryUri,
                predicate: "slsv:" + self.sourcePredicate,
                object: slsvSource,
            });
            triples.push({
                subject: queryUri,
                predicate: "slsv:" + self.scopePredicate,
                object: scope,
            });
            triples = triples.concat(Lineage_createRelation.getCommonMetaDataTriples(queryUri, self.currentCRUDsourceLabel));
            var options = {
                sparqlPrefixes: { slsv: self.currentCRUDsourceObject.graphUri },
            };
            Sparql_generic.insertTriples(self.currentCRUDsourceLabel, triples, options, function (err, result) {
                if (err) {
                    if (callback) {
                        return callback(err);
                    }
                    return alert(err.responseText);
                }
                if (callback) {
                    callback(null, { id: queryUri, label: label });
                }
                $("#SavedQueriesComponent_itemsSelect").append("<option value='" + queryUri + "'>" + label + "</option>");
            });
            */
        });
    };

    self.delete = function (uri, callback) {
        if (!uri) {
            uri = $("#SavedQueriesComponent_itemsSelect").val();
        }
        if (!uri) {
            return alert(" nothing to delete");
        }
        if (confirm("delete selected query")) {
            var CRUDsource = self.currentCRUDsourceLabel;
            Sparql_generic.deleteTriples(CRUDsource, uri, null, null, function (err, result) {
                $("#SavedQueriesComponent_itemsSelect option[value='" + uri + "']").remove();
                if (callback) {
                    return callback();
                }
            });
        }
    };

    return self;
})();

export default SavedQueriesWidget;
window.SavedQueriesWidget = SavedQueriesWidget;
