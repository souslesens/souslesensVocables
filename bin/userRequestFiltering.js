/*
const rootPath="D:\\webstorm\\souslesensVocables\\"

const ConfigManager = require(rootPath+"bin\\configManager.");
//const Sources = require(rootPath+"api\\v1\\path\\sources");
const { userModel } = require(rootPath+"model\\users");

 */

import ConfigManager from "../bin/configManager.js";

import async from "async";
import { Parser as SparqlParser } from "sparqljs";
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
            dcterms: { graphUri: "http://purl.org/dc/terms/" },
            dc: { graphUri: "http://purl.org/dc/elements/1.1/" },
        };

        var userGraphUrisMap = {};

        for (var key in basicVocabularies) {
            var source = basicVocabularies[key];
            userGraphUrisMap[source.graphUri] = { source: key, acl: "r" };
        }

        // add slsvLabels (readonly) for everyone
        userGraphUrisMap["http://souslesens.org/vocables/resource/labels/"] = { source: "slsvLabels", acl: "r" };
        userGraphUrisMap["http://souslesens.org/resource/stored-timeline-queries/"] = {
            source: "slsvMyQueriesTimeLine",
            acl: "w",
        };
        userGraphUrisMap["http://souslesens.org/resource/stored-lineage-queries/"] = {
            source: "slsvMyQueriesLineage",
            acl: "w",
        };
        userGraphUrisMap["http://souslesens.org/resource/stored-kgqueries-queries/"] = {
            source: "slsvMyQueriesKGCreator",
            acl: "w",
        };
        userGraphUrisMap["http://souslesens.org/resource/stored-visjs-graphs/"] = {
            source: "slsvMyQueriesVisJsGraph",
            acl: "w",
        };

        for (var key in userSourcesMap) {
            source = userSourcesMap[key];
            if ((source.sparql_server.url == "_default" || source.sparql_server.url == ConfigManager.config.sparql_server.url) && source.graphUri) {
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
        var operationMatch = /(DELETE|INSERT|CLEAR|LOAD|CREATE|DROP|COPY|MOVE|ADD)/gim.exec(query);
        if (!operationMatch) {
            return callback("DATA PROTECTION : no operation");
        }
        var operation = operationMatch[1].trim();

        var graphUris = [];
        var match;

        var graphRegex = /(INTO|GRAPH|WITH)\s+<([^>]+)/gim;
        /* while for multi clauses GRAPH request like : INSERT DATA {
        GRAPH <http://fghghf/> {
            <http://ex/A> <http://ex/p> "1"
        }
        GRAPH <http://testClasses/> {
            <http://ex/B> <http://ex/p> "2"
        }
        }*/

        while ((match = graphRegex.exec(query)) !== null) {
            graphUris.push(match[2].trim());
        }

        // COPY/MOVE/ADD use: <src> TO <dest> without GRAPH/INTO/WITH keyword
        var transferRegex = /(?:COPY|MOVE|ADD)\s+<([^>]+)>\s+TO\s+<([^>]+)>/gim;
        while ((match = transferRegex.exec(query)) !== null) {
            graphUris.push(match[1].trim());
            graphUris.push(match[2].trim());
        }

        if (graphUris.length === 0) {
            return callback("DATA PROTECTION : operation " + operation + " needs explicit graph declaration");
        }

        var error = "";
        graphUris.forEach(function (graphUri) {
            if (!userGraphUrisMap[graphUri]) {
                error += "DATA PROTECTION : graphUri not allowed for user " + graphUri + "\n";
            } else if (userGraphUrisMap[graphUri].acl != "w") {
                // to be fixed PB with PRIVATE sources
                error += "DATA PROTECTION : current user cannot execute " + operation + " on graph " + graphUri + "\n";
            }
        });

        return callback(error || null, query);
    },
    checkSelectQuery: function (query, userGraphUrisMap, callback) {
        var regex = /\{\s*[0-9]\s*,\s*[1-9]*\s*\}/gm;

        if (query.match(/<>\|!<>/)) {
            return callback(null, query);
        } else {
            var query2 = query;
            try {
                query2 = query.replace(regex, ""); // bug in  parser remove property path cardinality for parsing
                var query3 = query2.replace(/<_:.[^>]*>/gm, "?replacementCitedBlankNodeToParse"); // cited blank nodes on queries don't pass the parser
                var query4 = query3.replace(/<1>,/gm, ""); // ones for pathes
                // replace aggregates variables as (count,sum,avg,min,max) because parser don't handle them
                var query5 = query4.replace(/\b(count|sum|concat|avg|min|max|group_concat)\s*\([^)]*\)(?!\s+as\s+\?\w+)/gi, "");

                var json = parser.parse(query5);
            } catch (e) {
                return callback(e);
            }
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

    stripSparqlComments: function (query) {
        return query.replace(/^#[^\n]*/gm, "").trim();
    },

    filterSparqlRequest: function (query, userSourcesMap, userInfo, callback) {
        // no filtering for admin
        if (userInfo.user.groups.indexOf("admin") > -1) {
            return callback(null, query);
        }

        // strip comments before any regex matching to avoid false positives and SPARQL injection attempts in comments
        var strippedQuery = UserRequestFiltering.stripSparqlComments(query);
        var userGraphUrisMap = UserRequestFiltering.getUserGraphUrisMap(userSourcesMap);

        // SELECT queries are validated by the SPARQL parser (checkSelectQuery)
        // Known limitation: SELECT inside a string literal (e.g. INSERT DATA { ... "SELECT ..." })
        // triggers this branch and causes a parser error instead of a proper ACL error.
        // Not a security hole (query is still blocked), but produces a misleading error message.
        // Fix: use /^\s*SELECT/im to anchor to start of line and avoid matching inside literals.
        var selectRegex = /(SELECT)/gim;
        var selectArray = selectRegex.exec(strippedQuery);
        if (selectArray && selectArray.length > 0) {
            UserRequestFiltering.checkSelectQuery(strippedQuery, userGraphUrisMap, function (err, result) {
                if (err) {
                    return callback(err);
                }
                callback(null, result);
            });
        } else {
            // UPDATE queries: split on ; between operations, check each one independently
            // SPARQL 1.1 Update allows chaining multiple operations with ;
            // e.g. DELETE DATA { GRAPH <g1> { ... } } ; INSERT DATA { GRAPH <g2> { ... } }
            // Without the split, only the first operation would be ACL-checked.
            // The lookahead (?=DELETE|INSERT|...) avoids splitting on ; inside literals or subexpressions.
            var updateOperations = strippedQuery.split(/;\s*(?=DELETE|INSERT|CLEAR|LOAD|CREATE|DROP|COPY|MOVE|ADD)/i);
            var errors = [];

            async.eachSeries(
                updateOperations,
                function (updateOperation, callbackEach) {
                    UserRequestFiltering.checkQueryByRegex(updateOperation.trim(), userGraphUrisMap, function (err) {
                        if (err) {
                            errors.push(err);
                        }
                        callbackEach();
                    });
                },
                function () {
                    callback(errors.length > 0 ? errors.join("") : null, query);
                }
            );
        }
    },
    filterSparqlRequestAsync: async function (query, userSourcesMap, userInfo) {
        return new Promise((resolve, reject) => {
            UserRequestFiltering.filterSparqlRequest(query, userSourcesMap, userInfo, function (err, result) {
                if (err) return reject(err);

                resolve(result);
            });
        });
    },
    validateElasticSearchIndices: function (userInfo, indices, userSourcesMap, acl, callback) {
        var indicesMap = {};
        for (var source in userSourcesMap) {
            indicesMap[source.toLowerCase()] = { source: source, acl: source.accessControl == "readwrite" ? "w" : "r" };
        }

        var error = null;
        if (!indices) {
            var indices = [];
            for (var source in userSourcesMap) {
                indices.push(source.toLowerCase());
            }
            return callback(error, indices);
        }

        // ajout provisoire CF
        var isWhiteboard_Index = false;
        indices.forEach(function (indexName) {
            if (indexName.startsWith("whiteboard_")) {
                isWhiteboard_Index = true;
            }
        });
        if (isWhiteboard_Index) {
            return callback(null, indices);
        }

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
export default UserRequestFiltering;
