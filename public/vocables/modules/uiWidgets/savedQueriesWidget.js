import Sparql_OWL from "../sparqlProxies/sparql_OWL.js";
import common from "../shared/common.js";
import Lineage_createRelation from "../tools/lineage/lineage_createRelation.js";
import Sparql_generic from "../sparqlProxies/sparql_generic.js";
import UI from "../shared/UI.js";
import UserDataWidget from "./userDataWidget.js";
import MainController from "../shared/mainController.js";

var SavedQueriesWidget = (function () {
    var self = {};

    self.contentPredicate = "hasContent";
    self.scopePredicate = "hasScope";
    self.sourcePredicate = "hasSource";
    /*
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
    */
    self.showDialog = function (targetDiv, slsvSource, saveQueryFn, loadQueryFn, path) {
        //self.init(CRUDsource);
        self.saveQueryFn = saveQueryFn;
        self.loadQueryFn = loadQueryFn;
        self.slsvSource = slsvSource;
        self.path = path;
        $("#" + targetDiv).load("./modules/uiWidgets/html/savedQueriesWidget.html", function () {
            if (targetDiv.indexOf("Dialog") > -1) {
                $("#" + targetDiv).dialog("open");
            }
            /*if (slsvSource) {
                self.list(slsvSource, null, path);
            }*/
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
                return MainController.errorAlert(err);
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

    self.list = function (slsvSource, targetSelect, path, callback) {
        if (!targetSelect) {
            targetSelect = "SavedQueriesComponent_itemsSelect";
        }

        UserDataWidget.showListDialog(null, { filter: { data_type: "savedQueries", data_tool: "KGquery", data_source: MainController.currentSource }, removeSaveDiv: true }, function (err, result) {
            if (result.id) {
                UserDataWidget.loadUserDatabyId(result.id, function (err, result) {
                    self.loadItem(result.id);
                });
            }
        });
    };
    self.loadItem = function (userDataId, options, callback) {
        UserDataWidget.loadUserDatabyId(userDataId, function (err, result) {
            if (err) {
                return MainController.errorAlert(err);
            }
            if (result && result?.data_content?.sparqlQuery && self.loadQueryFn) {
                self.loadQueryFn(null, result.data_content);
            }
        });
    };

    self.save = function (slsvSource, scope, callback) {
        self.saveQueryFn(function (err, result) {
            if (err) {
                return MainController.errorAlert(err);
            }
            var data = result;
            if (!data) {
                return alert(" nothing to save");
            }

            if (!slsvSource) {
                if (!self.slsvSource) {
                    return alert("no source");
                }
                slsvSource = self.slsvSource;
            }

            //UserDataWidget.currentTreeNode = null;
            UserDataWidget.showSaveDialog("savedQueries", data, null, function (err, result) {
                if (err) {
                    return MainController.errorAlert(err);
                }
                //console.log(result);
                $("#KGquery_messageDiv").text("saved query");
                /*if (result?.id) {
                    var groups = result.data_group.split("/");
                    var group_parent = "#";
                    if (groups.length > 0) {
                        groups.forEach(function (group) {
                            if (!UserDataWidget.uniqueJstreeNodes[group]) {
                                //add node
                                var node = { id: group, text: group, parent: group_parent };
                                $("#userDataWidget_jstree").jstree(true).create_node(group_parent, node);
                            }
                            group_parent = group;
                        });
                    }
                    result.id = result.id;
                    result.data_label = result.label;
                    var node = { id: result.id, text: result.label, parent: group_parent, data: result };
                    $("#userDataWidget_jstree").jstree(true).create_node(group_parent, node);

                    //$("#SavedQueriesComponent_itemsSelect").append("<option value='" + result.insertedId[0].id + "'>" + result.label + "</option>");
                    //SavedQueriesWidget.showDialog("tabs_myQueries",self.currentSource,KGquery_myQueries.save, KGquery_myQueries.load,"KGquery/savedQueries/");
                }*/
            });
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
                    return MainController.errorAlert(err);
                }
                if (callback) {
                    callback(null, { id: queryUri, label: label });
                }
                $("#SavedQueriesComponent_itemsSelect").append("<option value='" + queryUri + "'>" + label + "</option>");
            });
            */
    };

    self.delete = function (userDataId, callback) {
        if (!userDataId) {
            userDataId = $("#SavedQueriesComponent_itemsSelect").val();
            var userDataLabel = $("#SavedQueriesComponent_itemsSelect option:selected").text();
        }
        if (!userDataId) {
            return alert(" nothing to delete");
        }

        var node = { id: userDataId, data_label: userDataLabel };
        UserDataWidget.deleteItem(node, function (err, result) {
            if (err) {
                return MainController.errorAlert(err);
            }
            $("#KGquery_messageDiv").text("deleted query");
            $("#SavedQueriesComponent_itemsSelect")
                .find("option[value='" + userDataId + "']")
                .remove();
        });
    };
    return self;
})();

export default SavedQueriesWidget;
window.SavedQueriesWidget = SavedQueriesWidget;
