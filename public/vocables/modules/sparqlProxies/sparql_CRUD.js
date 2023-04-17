import common from "./../common.js"
import Sparql_OWL from "./sparql_OWL.js"
import Sparql_generic from "./sparql_generic.js"
import Lineage_blend from "./../tools/lineage/lineage_blend.js"



var Sparql_CRUD = (function () {
    var self = {};

    self.contentPredicate = "hasContent";
    self.scopePredicate = "hasScope";
    self.sourcePredicate = "hasSource";

    self.initCRUDsource = function (CRUDsource) {
        self.currentSourceLabel = CRUDsource;
        self.currentSourceObj = Config.CRUDsources[CRUDsource];

        if (!self.currentSourceObj) {
            return alert("CRUD source " + CRUDsource + " is not registered");
        }
        Config.sources[CRUDsource] = self.currentSourceObj;
    };

    self.showDialog = function (CRUDsource, target, source, scope, loadItemCallback) {
        self.loadItemCallback = loadItemCallback;

        if (target.indexOf("Dialog") > -1) {
            $("#" + target).dialog("open");
        }
        $("#" + target).load("snippets/sparql_CRUD.html", function () {
            if (source) {
                self.list(CRUDsource, source, scope);
            }
        });
    };

    self.list = function (CRUDsource, dataSource, scope, target) {
        CRUDsource = CRUDsource || self.currentSourceLabel;
        self.initCRUDsource(CRUDsource);
        if (!target) {
            target = "sparql_CRUD_itemsSelect";
        }
        if (!scope) {
            scope = $("#sparql_CRUD_scope").val();
        }
        if (scope == "private") {
            scope = authentication.currentUser.login;
        }
        if (!dataSource) {
            dataSource = Lineage_sources.activeSource;
        }
        var filter = "";
        if (scope) {
            filter += "?s <" + self.currentSourceObj.graphUri + self.scopePredicate + "> '" + scope + "'.";
        }
        filter += "?s <" + self.currentSourceObj.graphUri + self.sourcePredicate + "> '" + dataSource + "'.";
        filter += "?s rdfs:label ?o";
        var options = {
            selectVars: "distinct ?s ?o",
            filter: filter,
            orderBy: "?o",
        };
        Sparql_OWL.getTriples(CRUDsource, options, function (err, result) {
            if (err) {
                return alert(err.responseText);
            }
            var data = [];
            result.forEach(function (item) {
                data.push({ label: item.o.value, id: item.s.value });
            });
            common.fillSelectOptions(target, data, false, "label", "id");
        });
    };

    self.loadItem = function (uri, options, callback) {
        var filter = "FILTER (?s =<" + uri + ">) ";
        var options = {
            filter: filter,
        };
        Sparql_OWL.getTriples(self.currentSourceLabel, options, function (err, result) {
            if (err) {
                return callback(err.responseText);
            }

            var contentPredicate = self.currentSourceObj.graphUri + self.contentPredicate;

            result.forEach(function (triple) {
                var predicate = triple.p.value;
                if (predicate == contentPredicate) {
                    var content = JSON.parse(atob(triple.o.value));
                    return callback(null, content);
                }
            });
        });
    };

    self.save = function (CRUDsource, dataSource, data, scope, callback) {
        self.initCRUDsource(CRUDsource);
        var triples = [];

        var label = prompt("query name");
        if (!label) {
            return;
        }
        if (!scope) {
            scope = $("#sparql_CRUD_scope").val();
        }
        if (!dataSource) {
            dataSource = Lineage_sources.activeSource;
        }

        if (!confirm("save query " + label + "with scope " + scope + " in source " + CRUDsource + " ?")) {
            return;
        }

        if (scope == "private") {
            scope = authentication.currentUser.login;
        }
        var queryUri = self.currentSourceObj.graphUri + common.getRandomHexaId(10);
        var content64 = btoa(JSON.stringify(data));
        triples.push({
            subject: queryUri,
            predicate: "rdfs:label",
            object: label,
        });
        triples.push({
            subject: queryUri,
            predicate: "rdf:type",
            object: self.currentSourceObj.type,
        });
        triples.push({
            subject: queryUri,
            predicate: "slsv:" + self.contentPredicate,
            object: content64,
        });
        triples.push({
            subject: queryUri,
            predicate: "slsv:" + self.sourcePredicate,
            object: dataSource,
        });
        triples.push({
            subject: queryUri,
            predicate: "slsv:" + self.scopePredicate,
            object: scope,
        });
        triples = triples.concat(Lineage_blend.getCommonMetaDataTriples(queryUri, self.currentSourceLabel));
        var options = {
            sparqlPrefixes: { slsv: self.currentSourceObj.graphUri },
        };
        Sparql_generic.insertTriples(CRUDsource, triples, options, function (err, result) {
            if (err) {
                if (callback) return callback(err);
                return alert(err.responseText);
            }
            if (callback) return callback(null, { id: queryUri, label: label });
            // $("#sparql_CRUD_itemsSelect").append("<option value='" + queryUri + "'>" + label + "</option>");
        });
    };

    self.delete = function (CRUDsource, uri, callback) {
        CRUDsource = CRUDsource || self.currentSourceLabel;
        self.initCRUDsource(CRUDsource);
        Sparql_generic.deleteTriples(CRUDsource, uri, null, null, callback);
    };

    return self;
})();



export default Sparql_CRUD
