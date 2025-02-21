import common from "../shared/common.js";
import MainController from "../shared/mainController.js";
import authentication from "../shared/authentification.js";

/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
var Sparql_proxy = (function () {
    var self = {};
    self.queriesHistory = {};

    /**
     * @param {string} url - URL of the sparql endpoint to query
     * @param {string} query - SPARQL query to execute
     * @param {string} queryOptions - appended to the url
     * @param {Object} options - options.source is the name of the source being queried
     * @param {Function} callback - Function called to process the result of the query
     */
    self.querySPARQL_GET_proxy = function (url, query, queryOptions, options, callback) {
        if (!options) {
            options = {};
        }

        // query=query.replace(/[\n\r]/g," ")
        if (false) {
            query = self.addFromLabelsGraphToQuery(query);
        }

        if (url.indexOf("_default") == 0) {
            url = Config.sparql_server.url;
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
                payload.options = JSON.stringify({headers: sourceParams.sparql_server.headers, useProxy: useProxy});
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
                },
            });
        } else {
            //POST
            payload.POST = true;

            if (sourceParams && sourceParams.sparql_server.headers) {
                body = JSON.stringify({headers: sourceParams.sparql_server.headers});
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
                headers = {"Content-Type": "text/turtle; charset=UTF-8"};
            }

            query = Sparql_common.addBasicVocabulariesPrefixes(query);

            var body = {
                params: {query: query, useProxy: useProxy},
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
                console.log(query)
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
                    return callback(null, {results: {bindings: []}});
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
                    alert(err.responseText.substring(0, err.responseText.indexOf(".")) + "\n select more detailed data");
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

    self.exportGraph = function (source) {
        var graphUri = Config.sources[source].graphUri;
        var graphUriStr = "";
        if (graphUri) {
            graphUriStr = " from <" + graphUri + "> ";
        }

        //var query = "select ?s ?p ?o "+graphUriStr+"  where  {?s ?p ?o} limit 10000";

        var query = "CONSTRUCT { ?s ?p ?o } WHERE { GRAPH <" + graphUri + "> { ?s ?p ?o } . }";

        var headers = {};
        headers["Accept"] = "application/x-nice-turtle";
        //  headers["Content-Type"] = "application/x-nice-turtle; charset=UTF-8";

        var serverUrl = Config.sources[source].sparql_server.url;
        if (serverUrl.indexOf("_default") == 0) {
            serverUrl = Config.sparql_server.url;
        }

        var body = {
            params: {query: query, useProxy: false},
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
                    return alert(err.responseText);
                }
            },
        });
    };

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
