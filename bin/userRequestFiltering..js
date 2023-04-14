/*
const rootPath="D:\\webstorm\\souslesensVocables\\"

const ConfigManager = require(rootPath+"bin\\configManager.");
//const Sources = require(rootPath+"api\\v1\\path\\sources");
const { userModel } = require(rootPath+"model\\users");

 */

const ConfigManager = require("../bin/configManager.");
const { userModel } = require("../model/users");

const async = require("async");
const SparqlParser = require("sparqljs").Parser;
const parser = new SparqlParser({ skipValidation: true });

var UserRequestFiltering = {
    existingSources: null,

    getUserGraphUrisMap: function (userSourcesMap) {
        var basicVocabularies = {
            rdf: { graphUri: "https://www.w3.org/1999/02/22-rdf-syntax-ns" },
            rdfs: { graphUri: "https://www.w3.org/2000/01/rdf-schema" },
            owl: { graphUri: "https://www.w3.org/2002/07/owl" },
            "iof-av": { graphUri: "https://spec.industrialontologies.org/ontology/core/meta/AnnotationVocabulary/" },
            skos: { graphUri: "http://www.w3.org/2004/02/skos/core/" },
        };

        var userGraphUrisMap = {};

        for (var key in basicVocabularies) {
            var source = basicVocabularies[key];
            userGraphUrisMap[source.graphUri] = { source: key, acl: "r" };
        }

        for (var key in userSourcesMap) {
            var source = userSourcesMap[key];
            if ((source.sparql_server.url == "_default" || source.sparql_server.url == ConfigManager.config.default_sparql_url) && source.graphUri) {
                userGraphUrisMap[source.graphUri] = { source: key, acl: source.accessControl == "readwrite" ? "w" : "r" };
            }
        }

        return userGraphUrisMap;
    },



    /**
     *
     *
     *
     *
     *
     * @param query
     * @param userSourcesMap
     * @param callback
     * @returns {string|*}
     */
    /*
     3.1.1 INSERT DATA
          3.1.2 DELETE DATA
          3.1.3 DELETE/INSERT
              3.1.3.1 DELETE (Informative)
              3.1.3.2 INSERT (Informative)
              3.1.3.3 DELETE WHERE
          3.1.4 LOAD
          3.1.5 CLEAR
      3.2 Graph Management
          3.2.1 CREATE
          3.2.2 DROP
          3.2.3 COPY
          3.2.4 MOVE
          3.2.5 ADD
   */

    checkQueryByRegex: function (query, userGraphUrisMap, callback) {
        var error = "";
        var operation = null;
        var modifyRegex = /(DELETE|INSERT|CLEAR|LOAD|CREATE|DROP|COPY|MOVE|ADD)/gim;
        var array = modifyRegex.exec(query);
        if (array.length == 2) {
            operation = array[1].trim();
        }

        if (!operation) {
            error = "DATA PROTECTION : no operation";
        } else {
            var graphUri = null;
            var graphRegex = /(INTO|GRAPH) +<(.*)>/gim;
            var array = graphRegex.exec(query);
            if (array && array.length == 3) {
                graphUri = array[2].trim();
            }
            if (!graphUri) {
                error = "DATA PROTECTION : operation " + operation + " needs explicit graph declaration";
            } else {
                if (!userGraphUrisMap[graphUri]) {
                    error = " DATA PROTECTION : graphUri not allowed for user  " + graphUri + "\n";
                } else {
                    if (userGraphUrisMap[graphUri].acl != "w") error = " DATA PROTECTION : current  user cannot execute " + operation + " on graph " + graphUri + "\n";
                }
            }
        }

        return callback(error, query);
    },
    checkSelectQuery: function (query, userGraphUrisMap, callback) {
        try {
            var json = parser.parse(query);
        } catch (e) {
            return callback(e);
        }

        var error = "";
        if (!json.from) {
            error += "DATA PROTECTION : missing from  <graph> clause ";
        }
        // check no from graph
        else {
            if (json.from.default.length == 0 && json.from.named.length == 0) {
                error += "DATA PROTECTION : missing from  <graph> clause \n";
            }

            //check graphuris authorized for user
            var fromError = "";
            json.from.default.forEach(function (fromGraphUri) {
                if (!userGraphUrisMap[fromGraphUri.value]) {
                    fromError += "DATA PROTECTION: graphUri " + fromGraphUri.value + " not allowed for current user ";
                }
            });

            json.from.named.forEach(function (fromGraphUri) {
                if (!userGraphUrisMap[fromGraphUri.value]) {
                    fromError += "DATA PROTECTION : graphUri  " + fromGraphUri.value + " not allowed for current user";
                }
            });
            error += fromError;
        }

        callback(error, query);
    },

    filterSparqlRequest: function (query, userSourcesMap, callback) {
        var error = "";
        var filteredQuery = query;
        var userGraphUrisMap = UserRequestFiltering.getUserGraphUrisMap(userSourcesMap);

        selectRegex = /(SELECT)/gim;
        var array = selectRegex.exec(query);
        if (array && array.length > 0) {
            UserRequestFiltering.checkSelectQuery(query, userGraphUrisMap, function (err, result) {
                if (err) return callback(err);
                callback(null, result);
            });
        } else {
            UserRequestFiltering.checkQueryByRegex(query, userGraphUrisMap, function (err, result) {
                if (err) return callback(err);
                callback(null, result);
            });
        }
    },

    validateElasticSearchIndices: function (userGroups, indices, userSourcesMap, acl, callback) {
        if (userGroups && userGroups.indexOf("admin") > -1) return callback(null, indices);

        var indicesMap = {};
        for (var source in userSourcesMap) {
            indicesMap[source.toLowerCase()] = { source: source, acl: source.accessControl == "readwrite" ? "w" : "r" };
        }
        var error = null;
        indices.forEach(function (indexName) {
            if (!indicesMap[indexName]) {
                error = "DATA PROTECTION : index  " + indexName + " not allowed to current user";
            } else {
                if (acl == "w" && indicesMap[indexName].acl != acl) {
                    error = "DATA PROTECTION : user cannot write to index  " + indexName;
                }
            }
        });
        return callback(error, indices);
    },
};
module.exports = UserRequestFiltering;
