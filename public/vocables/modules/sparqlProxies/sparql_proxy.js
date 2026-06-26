import common from "../shared/common.js";
import MainController from "../shared/mainController.js";
import authentication from "../shared/authentification.js";
import Sparql_common from "./sparql_common.js";

/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * Sparql_proxy Module
 * Low-level execution layer for SPARQL queries. Wraps every query in an AJAX call
 * to the backend `/sparqlProxy` endpoint (which forwards it to the triple store),
 * handling GET/POST method selection, custom headers, CONSTRUCT vs SELECT response
 * formats and query history logging. This is the single entry point used by all
 * higher-level modules (Sparql_OWL, Sparql_SKOS, Sparql_generic) to talk to an endpoint.
 * @module Sparql_proxy
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
var Sparql_proxy = (function () {
    var self = {};
    self.queriesHistory = {};

    /**
     * Executes a SPARQL query against an endpoint through the backend `/sparqlProxy`.
     * Resolves the effective endpoint URL (`_default` → main Virtuoso), picks the HTTP
     * method from the source config (`sparql_server.method`), sets the `Accept` header
     * (`application/sparql-results+json` for SELECT/ASK, `text/turtle` for CONSTRUCT),
     * prepends basic vocabulary prefixes and posts the query. The query itself is passed
     * in by the caller; this function does not build SPARQL, only transports it.
     * @function
     * @name querySPARQL_GET_proxy
     * @memberof module:Sparql_proxy
     * @param {string} url - URL of the SPARQL endpoint to query (`_default` resolves to `Config.sparql_server.url`)
     * @param {string} query - SPARQL query string to execute (SELECT, ASK, CONSTRUCT, INSERT, DELETE)
     * @param {string} queryOptions - Extra URL parameters appended to the endpoint URL
     * @param {Object} options - Execution options
     * @param {string} [options.source] - Source name used to look up `Config.sources[source]` (endpoint, method, headers)
     * @param {string} [options.acceptHeader] - Overrides the `Accept` header sent to the endpoint
     * @param {boolean} [options.dontCacheCurrentQuery] - When true, does not store the query in `self.currentQuery`
     * @param {string} [options.caller] - Key under which the query body is pushed into `self.queriesHistory`
     * @param {Function} callback - Error-first callback `(err, result)`; `result` is the parsed JSON (`result.results.bindings`) or raw turtle for CONSTRUCT
     * @returns {void}
     */
    self.querySPARQL_GET_proxy = function (url, query, queryOptions, options, callback) {
        if (!options) {
            options = {};
        }

        // Short-circuit: return the built query string without executing it.
        if (options.returnQueryStr === true) {
            return callback(null, { query: query });
        }

        // query=query.replace(/[\n\r]/g," ")
        if (false) {
            query = self.addFromLabelsGraphToQuery(query);
        }

        if (url.indexOf("_default") == 0) {
            url = Config.sparql_server.url;
        }
        if (query.toUpperCase().indexOf("CONSTRUCT ") > -1) {
            url = url.replace("json", "text%2Fturtle");
        }

        var sourceParams;
        var headers = {};
        if (options.source) {
            sourceParams = Config.sources[options.source];
        } else if (MainController.currentSource) {
            sourceParams = Config.sources[MainController.currentSource || Config._defaultSource];
        }

        /*    if(!sourceParams.graphUri){// cas des sources sans graphe
query=query.replace(/GRAPH ?[a-zA-Z0-9]+\{/,"{")
}*/

        if (!options) {
            options = {};
        }

        $("#waitImg").css("display", "block");

        if (!options.dontCacheCurrentQuery) {
            self.currentQuery = query;
        }

        var payload = {
            options: {},
        };
        if (!queryOptions) {
            queryOptions = "";
        }

        var useProxy = false;
        if (url.indexOf(Config.sparql_server.url) == 0) {
            useProxy = true;
        }

        var getMethod = sourceParams && sourceParams.sparql_server.method && sourceParams.sparql_server.method == "GET";
        if (getMethod) {
            payload.GET = true;
            var query2 = encodeURIComponent(query);
            query2 = query2.replace(/%2B/g, "+").trim();
            payload.url = url + query2 + queryOptions;
            if (sourceParams && sourceParams.sparql_server.headers) {
                payload.options = JSON.stringify({ headers: sourceParams.sparql_server.headers, useProxy: useProxy });
            }
            return $.ajax({
                type: "GET",
                url: `${Config.apiUrl}/sparqlProxy`,
                data: payload,
                dataType: "json",
                success: function (data, _textStatus, _jqXHR) {
                    if (headers["Accept"] && headers["Accept"].indexOf("json") < 0) {
                        return callback(null, data);
                    }
                },
                error: function (data) {
                    if (callback) {
                        return callback(data);
                    }
                    alert(data.responseText);
                },
            });
        } else {
            //POST
            payload.POST = true;

            if (sourceParams && sourceParams.sparql_server.headers) {
                body = JSON.stringify({ headers: sourceParams.sparql_server.headers });
            }
            if (sourceParams && sourceParams.sparql_server.type == "fuseki") {
                url = url.replace("&query=", "");
            } else if (options.acceptHeader) {
                headers["Accept"] = options.acceptHeader;
            } else {
                headers["Accept"] = "application/sparql-results+json";
            }
            headers["Content-Type"] = "application/x-www-form-urlencoded";

            if (query.toUpperCase().indexOf("CONSTRUCT ") > -1) {
                headers = { "Content-Type": "text/turtle; charset=UTF-8" };
            }

            query = Sparql_common.addBasicVocabulariesPrefixes(query);
            var body = {
                params: { query: query, useProxy: useProxy },
                headers: headers,
                user: authentication.currentUser,
            };

            payload.body = JSON.stringify(body);
            payload.url = url + queryOptions;

            if (Config.logQueries) {
                console.log(query);
                Config.logQueries = false;
            }
            if ($("#developerControls_logQueriesCBX").prop("checked")) {
                console.log(query);
            }

            if (options.caller) {
                if (!self.queriesHistory[options.caller]) {
                    self.queriesHistory[options.caller] = [];
                }
                self.queriesHistory[options.caller].push(body);
            }
        }

        $.ajax({
            type: "POST",
            url: `${Config.apiUrl}/sparqlProxy`,
            data: payload,
            dataType: "json",
            success: function (data, _textStatus, _jqXHR) {
                if (headers["Accept"] && headers["Accept"].indexOf("json") < 0) {
                    return callback(null, data);
                }

                if (headers["Content-Type"] && headers["Content-Type"].indexOf("text") > -1) {
                    return callback(null, data);
                }

                if (data.result && typeof data.result != "object") {
                    data = JSON.parse(data.result.trim());
                }

                if (!data.results) {
                    return callback(null, { results: { bindings: [] } });
                }

                if (data.results.bindings.length > 500) {
                    console.log(data.results.bindings.length);
                }
                if (data.results.bindings.length == 0) {
                } // UI.message("No data found", true);

                callback(null, data);
            },
            error: function (err) {
                console.error(err);
                if (Config.logSparqlQueries) {
                    console.error("------QUERY ERROR--------");
                    console.error(query);
                    console.error("------END QUERY ERROR--------");
                }
                if (err.responseText.indexOf("Virtuoso 42000") > -1) {
                    //Virtuoso 42000 The estimated execution time
                    MainController.errorAlert(err.responseText.substring(0, err.responseText.indexOf(".")) + "\n select more detailed data");
                } else {
                    console.log(err.responseText);
                    UI.message("error in sparql query");
                }

                $("#waitImg").css("display", "none");
                // eslint-disable-next-line no-console
                console.log(JSON.stringify(err));
                // eslint-disable-next-line no-console
                console.log(JSON.stringify(query));
                UI.message(err.responseText);
                if (callback) {
                    return callback(err);
                }
                return err;
            },
        });
    };

    /**
     * Exports the full content of a source's named graph as Turtle and copies it to the clipboard.
     * Runs `CONSTRUCT { ?s ?p ?o } WHERE { GRAPH <graphUri> { ?s ?p ?o } }` against the source
     * endpoint with an `application/x-nice-turtle` Accept header, then writes the returned turtle
     * to the clipboard via {@link module:common}.
     * @function
     * @name exportGraph
     * @memberof module:Sparql_proxy
     * @param {string} sourceLabel - Source name whose `graphUri` and `sparql_server.url` are read from `Config.sources`
     * @returns {void}
     */
    self.exportGraph = function (sourceLabel) {
        var graphUri = Config.sources[sourceLabel].graphUri;
        var graphUriStr = "";
        if (graphUri) {
            graphUriStr = " from <" + graphUri + "> ";
        }

        //var query = "select ?s ?p ?o "+graphUriStr+"  where  {?s ?p ?o} limit 10000";

        var query = "CONSTRUCT { ?s ?p ?o } WHERE { GRAPH <" + graphUri + "> { ?s ?p ?o } . }";

        var headers = {};
        headers["Accept"] = "application/x-nice-turtle";
        //  headers["Content-Type"] = "application/x-nice-turtle; charset=UTF-8";

        var serverUrl = Config.sources[sourceLabel].sparql_server.url;
        if (serverUrl.indexOf("_default") == 0) {
            serverUrl = Config.sparql_server.url;
        }

        var body = {
            params: { query: query, useProxy: false },
            headers: headers,
        };
        var payload = {};
        payload.body = JSON.stringify(body);

        var query2 = encodeURIComponent(query);
        query2 = query2.replace(/%2B/g, "+").trim();

        payload.url = serverUrl + "?format=text/turtle";
        payload.url += "&query=" + query2;
        payload.POST = "true";

        $.ajax({
            type: "POST",
            url: `${Config.apiUrl}/sparqlProxy`,
            data: payload,
            dataType: "json",
            success: function (data, _textStatus, _jqXHR) {
                var str = data.result;
                common.copyTextToClipboard(str);
            },
            error(err) {
                if (err) {
                    return MainController.errorAlert(err);
                }
            },
        });
    };

    /**
     * Promise-based wrapper around {@link module:Sparql_proxy.querySPARQL_GET_proxy} for
     * callers using async/await instead of error-first callbacks. Resolves with the query
     * result, rejects with the error.
     * @function
     * @name executeAsyncQuery
     * @memberof module:Sparql_proxy
     * @param {string} url - URL of the SPARQL endpoint to query
     * @param {string} query - SPARQL query string to execute
     * @param {string} queryOptions - Extra URL parameters appended to the endpoint URL
     * @param {Object} options - Execution options (see {@link module:Sparql_proxy.querySPARQL_GET_proxy})
     * @returns {Promise<Object>} Resolves with the parsed query result, rejects with the error
     */
    self.executeAsyncQuery = async function (url, query, queryOptions, options) {
        let promise = new Promise(function (resolve, reject) {
            self.querySPARQL_GET_proxy(url, query, queryOptions, options, function (err, result) {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });

        return promise;
    };

    /**
     * Injects a `FROM <labelsGraphUri>` clause into a query when it references any
     * `?xxxLabel` variable, so the dedicated labels graph is searched alongside the data.
     * Returns the query unchanged if it has no `WHERE` keyword or no `?...Label` variables.
     * @function
     * @name addFromLabelsGraphToQuery
     * @memberof module:Sparql_proxy
     * @param {string} query - SPARQL query to augment
     * @returns {string} The query with a `FROM <Config.labelsGraphUri>` clause inserted before `WHERE`, or the original query if not applicable
     */
    self.addFromLabelsGraphToQuery = function (query) {
        var p = query.toLowerCase().indexOf("where");
        if (p < 0) {
            return query;
        }

        var regex = /\?[A-z]+Label/gi;
        var array = [];
        var varNames = [];
        while ((array = regex.exec(query)) != null) {
            array.forEach(function (item) {
                if (varNames.indexOf(item) < 0) {
                    varNames.push(item);
                }
            });
        }
        if (varNames.length == 0) {
            return query;
        }

        var query2 = query.substring(0, p) + "from <" + Config.labelsGraphUri + "> " + query.substring(p);
        return query2;
    };

    return self;
})();

export default Sparql_proxy;

window.Sparql_proxy = Sparql_proxy;
