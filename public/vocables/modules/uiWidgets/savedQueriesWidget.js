import Sparql_OWL from "../sparqlProxies/sparql_OWL.js";
import common from "../shared/common.js";
import Lineage_createRelation from "../tools/lineage/lineage_createRelation.js";
import Sparql_generic from "../sparqlProxies/sparql_generic.js";
import UI from "../shared/UI.js";
import UserDataWidget from "./userDataWidget.js";


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
                self.list( slsvSource);
            }
        });
    };
    /*
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

    */
    self.list = function ( slsvSource, targetSelect, callback) {
        if (!targetSelect) {
            targetSelect = "SavedQueriesComponent_itemsSelect";
        }
        if (!slsvSource) {
            slsvSource = MainController.currentSource;

        }
        var data_group = "KGquery/savedQueries/";
        UserDataWidget.listUserData(null, function (err, result) {
            var storedQueries = [];
            result.forEach(function (item) {
                if (item.data_group == data_group) {
                    storedQueries.push({ label: item.data_label, id: item.id });
                }
            });
            if(storedQueries.length>0){
                common.fillSelectOptions(targetSelect, storedQueries, false, "label", "id");
            }
        });
    }
    self.loadItem = function (userDataId, options, callback) {
        UserDataWidget.loadUserDatabyId(userDataId, function (err, result) {
            if (err) {
                return alert(err);
            }
            if(result && result?.data_content?.sparqlQuery && self.loadQueryFn){
                self.loadQueryFn(null, result.data_content);
            }
          
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
            var data_group =  "KGquery/savedQueries/" ;
            UserDataWidget.saveMetadata(label, null, data,data_group, function (err, result) {
                if(err){
                    return alert(err);
                }
                console.log(result);
                $('#KGquery_messageDiv').text('saved query');
                $("#SavedQueriesComponent_itemsSelect").append("<option value='" + queryUri + "'>" + label + "</option>");
                //SavedQueriesWidget.showDialog("STORED_KGQUERY_QUERIES", "KGquery_myQueriesDiv", self.currentSource, null, KGquery_myQueries.save, KGquery_myQueries.load);

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

    self.delete = function (userDataId, callback) {
        if (!userDataId) {
            userDataId = $("#SavedQueriesComponent_itemsSelect").val();
            var userDataLabel= $("#SavedQueriesComponent_itemsSelect option:selected").text();
        }
        if (!userDataId) {
            return alert(" nothing to delete");
        }

         var node= {id: userDataId, data_label: userDataLabel};
        UserDataWidget.deleteItem(node, function (err, result) {
            if (err) {
                return alert(err.responseText || err);
            }
            $('#KGquery_messageDiv').text('deleted query');
            SavedQueriesWidget.showDialog("STORED_KGQUERY_QUERIES", "KGquery_myQueriesDiv", self.currentSource, null, KGquery_myQueries.save, KGquery_myQueries.load);
        });
    };

    return self;
})();

export default SavedQueriesWidget;
window.SavedQueriesWidget = SavedQueriesWidget;
