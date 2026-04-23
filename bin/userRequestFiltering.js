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

// Splits a SPARQL update query at the first WHERE keyword found at brace depth 0.
// Returns [updateClause, whereClause] where whereClause is null when no top-level WHERE exists.
// Handles string literals so that { } inside "..." or '...' do not affect brace depth counting.
function splitAtTopLevelWhere(query) {
    var curlyBraceDepth = 0;
    var isInsideDoubleQuotedString = false;
    var isInsideSingleQuotedString = false;

    for (var charIndex = 0; charIndex < query.length; charIndex++) {
        var currentChar = query[charIndex];

        if (isInsideDoubleQuotedString) {
            if (currentChar === "\\") {
                charIndex++;
                continue;
            }
            if (currentChar === '"') isInsideDoubleQuotedString = false;
            continue;
        }
        if (isInsideSingleQuotedString) {
            if (currentChar === "\\") {
                charIndex++;
                continue;
            }
            if (currentChar === "'") isInsideSingleQuotedString = false;
            continue;
        }

        if (currentChar === '"') {
            isInsideDoubleQuotedString = true;
            continue;
        }
        if (currentChar === "'") {
            isInsideSingleQuotedString = true;
            continue;
        }
        if (currentChar === "{") {
            curlyBraceDepth++;
            continue;
        }
        if (currentChar === "}") {
            curlyBraceDepth--;
            continue;
        }

        if (curlyBraceDepth === 0 && /w/i.test(currentChar) && /^WHERE\b/i.test(query.slice(charIndex))) {
            return [query.slice(0, charIndex), query.slice(charIndex)];
        }
    }

    return [query, null];
}

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

        var parts = splitAtTopLevelWhere(query);
        var updateClause = parts[0];
        var whereClause = parts[1];

        var writeGraphUris = [];
        var readGraphUris = [];
        var match;

        // Graphs in the update clause (INSERT/DELETE body, WITH, CLEAR, etc.) require WRITE access.
        var writeGraphRegex = /(INTO|GRAPH|WITH)\s+<([^>]+)/gim;
        while ((match = writeGraphRegex.exec(updateClause)) !== null) {
            writeGraphUris.push(match[2].trim());
        }

        // COPY/MOVE/ADD use: <src> TO <dest> without GRAPH/INTO/WITH keyword
        var transferRegex = /(?:COPY|MOVE|ADD)\s+<([^>]+)>\s+TO\s+<([^>]+)>/gim;
        while ((match = transferRegex.exec(updateClause)) !== null) {
            writeGraphUris.push(match[1].trim());
            writeGraphUris.push(match[2].trim());
        }

        if (whereClause) {
            // DELETE WHERE (short form): no { } block before WHERE means the WHERE patterns
            // are the deletion targets and their graphs need WRITE access.
            // INSERT/DELETE ... WHERE: graphs in WHERE are read-only sources, they only
            // need to be accessible (any acl level is sufficient).
            var isDeleteWhere = updateClause.indexOf("{") === -1;
            var whereGraphRegex = /(INTO|GRAPH|WITH)\s+<([^>]+)/gim;
            while ((match = whereGraphRegex.exec(whereClause)) !== null) {
                if (isDeleteWhere) {
                    writeGraphUris.push(match[2].trim());
                } else {
                    readGraphUris.push(match[2].trim());
                }
            }
        }

        if (writeGraphUris.length === 0) {
            return callback("DATA PROTECTION : operation " + operation + " needs explicit graph declaration");
        }

        var error = "";
        writeGraphUris.forEach(function (graphUri) {
            if (!userGraphUrisMap[graphUri]) {
                error += "DATA PROTECTION : graphUri not allowed for user " + graphUri + "\n";
            } else if (userGraphUrisMap[graphUri].acl !== "w") {
                error += "DATA PROTECTION : current user cannot execute " + operation + " on graph " + graphUri + "\n";
            }
        });

        readGraphUris.forEach(function (graphUri) {
            if (!userGraphUrisMap[graphUri]) {
                error += "DATA PROTECTION : graphUri not allowed for user " + graphUri + "\n";
            }
        });

        return callback(error || null, query);
    },
    checkSelectQuery: function (query, userGraphUrisMap, callback) {
        var regex = /\{\s*[0-9]\s*,\s*[1-9]*\s*\}/gm;

        if (query.match(/<>\|!<>/)) {
            return callback(null, query);
        }

        // FROM/FROM NAMED inside sub-SELECTs are stripped before parsing (parser rejects them),
        // so they must be captured via regex before any preprocessing.
        var allFromUris = [];
        var fromScanRegex = /\bFROM\s+(?:NAMED\s+)?<([^>]+)>/gi;
        var fromScanMatch;
        while ((fromScanMatch = fromScanRegex.exec(query)) !== null) {
            allFromUris.push(fromScanMatch[1]);
        }

        var json;
        try {
            var q = query.replace(regex, "");// bug in  parser remove property path cardinality for parsing
            q = q.replace(/<_:.[^>]*>/gm, "?replacementCitedBlankNodeToParse");// cited blank nodes on queries don't pass the parser
            q = q.replace(/<1>,/gm, "");// ones for pathes
            q = q.replace(/\b(count|sum|concat|avg|min|max|group_concat)\s*\([^)]*\)(?!\s+as\s+\?\w+)/gi, "");// replace aggregates variables as (count,sum,avg,min,max) because parser don't handle them

            // SPARQL 1.1 parsers reject FROM/FROM NAMED inside inline sub-SELECTs.
            // Strip those clauses from the WHERE body before parsing.
            var firstWhereIdx = q.search(/\bWHERE\b/i);
            if (firstWhereIdx !== -1) {
                var head = q.slice(0, firstWhereIdx);
                var tail = q.slice(firstWhereIdx).replace(/\bFROM\s+(?:NAMED\s+)?<[^>]*>\s*/gi, "");
                q = head + tail;
            }

            json = parser.parse(q);
        } catch (e) {
            var msg = e.message || String(e);
            var unknownPrefix = /Unknown prefix:\s*(\S+)/i.exec(msg);
            if (unknownPrefix) {
                return callback("SPARQL parse error: prefix '" + unknownPrefix[1] + "' is not declared — add PREFIX " + unknownPrefix[1] + " <uri> at the top of your query");
            }
            return callback(e);
        }

        var allGraphUris = UserRequestFiltering.collectGraphUris(json.where);

        // A SELECT query must declare its dataset explicitly — either via FROM/FROM NAMED
        // at the outer level or via explicit GRAPH patterns in WHERE.
        var hasOuterFrom = json.from && (json.from.default.length > 0 || json.from.named.length > 0);
        if (!hasOuterFrom && allGraphUris.length === 0) {
            return callback("DATA PROTECTION : missing from  <graph> clause ");
        }

        // Without FROM, bare triple patterns (not inside a GRAPH block) would access the
        // endpoint's default graph — on Virtuoso the union of ALL named graphs.
        // This is a bypass vector: one authorized GRAPH + bare triples = unrestricted read.
        if (!hasOuterFrom && UserRequestFiltering.hasBareTriples(json.where, false)) {
            return callback("DATA PROTECTION : bare triple patterns outside GRAPH blocks require FROM <graph> declaration");
        }

        var error = "";
        allFromUris.forEach(function (graphUri) {
            if (!userGraphUrisMap[graphUri]) {
                error += "DATA PROTECTION: graphUri " + graphUri + " not allowed for current user ";
            }
        });

        allGraphUris.forEach(function (graphUri) {
            if (!userGraphUrisMap[graphUri]) {
                error += "DATA PROTECTION: graphUri " + graphUri + " not allowed for current user ";
            }
        });

        callback(error || null, query);
    },

    collectGraphUris: function (patterns) {
        var uris = [];
        if (!patterns) return uris;
        (Array.isArray(patterns) ? patterns : [patterns]).forEach(function (p) {
            if (!p) return;
            if (p.type === "graph") {
                if (p.name && p.name.termType === "NamedNode") {
                    uris.push(p.name.value);
                }
                uris = uris.concat(UserRequestFiltering.collectGraphUris(p.patterns));
            } else if (p.type === "query") {
                uris = uris.concat(UserRequestFiltering.collectGraphUris(p.where));
            } else if (p.patterns) {
                uris = uris.concat(UserRequestFiltering.collectGraphUris(p.patterns));
            }
        });
        return uris;
    },

    hasBareTriples: function (patterns, insideGraph) {
        if (!patterns) return false;
        var ps = Array.isArray(patterns) ? patterns : [patterns];
        for (var i = 0; i < ps.length; i++) {
            var p = ps[i];
            if (!p) continue;
            if (p.type === "bgp" && !insideGraph && p.triples && p.triples.length > 0) {
                return true;
            }
            if (p.type === "graph") {
                if (UserRequestFiltering.hasBareTriples(p.patterns, true)) return true;
            } else if (p.type === "query") {
                if (UserRequestFiltering.hasBareTriples(p.where, false)) return true;
            } else if (p.patterns) {
                if (UserRequestFiltering.hasBareTriples(p.patterns, insideGraph)) return true;
            }
        }
        return false;
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

        // Route to checkSelectQuery only when SELECT/ASK/CONSTRUCT/DESCRIBE is the main operation.
        // Strip leading PREFIX declarations first so a sub-SELECT inside an INSERT/DELETE WHERE clause
        // does not trigger the SELECT branch (e.g. INSERT { ... } WHERE { { SELECT ... } }).
        var queryCore = strippedQuery.replace(/^(\s*PREFIX\s+\S+\s*<[^>]*>\s*\n?)+/i, "").trim();
        if (/^SELECT\b/i.test(queryCore)) {
            UserRequestFiltering.checkSelectQuery(strippedQuery, userGraphUrisMap, function (err) {
                if (err) {
                    return callback(err);
                }
                callback(null, query);
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
                },
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
