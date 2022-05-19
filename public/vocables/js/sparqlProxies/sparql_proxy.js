/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
var Sparql_proxy = (function () {
    var self = {};

    /**
     * @param {string} url - URL of the sparql endpoint to query
     * @param {string} query - SPARQL query to execute
     * @param {string} queryOptions - NOT USED
     * @param {Object} options - NOT USED
     * @param {Function} callback - Function called to process the result of the query
     */
    self.querySPARQL_GET_proxy_cursor = function (url, query, queryOptions, options, callback) {
        var offset = 0;
        var limit = Config.queryLimit;
        var resultSize = 1;
        var allData = {
            results: { bindings: [] },
        };

        var p = query.toLowerCase().indexOf("limit");
        if (p > -1) query = query.substring(0, p);
        query += " LIMIT " + limit;

        // XXX rewrite this data generator with fetch + async + await
        async.whilst(
            function (_callbackTest) {
                return resultSize > 0;
            },
            function (callbackWhilst) {
                //iterate
                var queryCursor = query + " OFFSET " + offset;

                var body = {
                    params: { query: queryCursor },
                    headers: {
                        Accept: "application/sparql-results+json",
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                };

                $("#waitImg").css("display", "block");

                var payload = {
                    url: url,
                    body: body,
                    POST: true,
                };
                $.ajax({
                    type: "POST",
                    url: `${Config.apiUrl}/httpProxy`,
                    data: payload,
                    dataType: "json",
                    success: function (data, _textStatus, _jqXHR) {
                        callbackWhilst(null, data);
                        resultSize = data.results.bindings.length;
                        allData.results.bindings = allData.results.bindings.concat(data.results.bindings);
                        offset += limit;
                    },
                    error: function (err) {
                        $("#messageDiv").html(err.responseText);
                        $("#waitImg").css("display", "none");
                        // eslint-disable-next-line no-console
                        console.log(JSON.stringify(err));
                        // eslint-disable-next-line no-console
                        console.log(JSON.stringify(query));
                        return callbackWhilst(err);
                    },
                });
            },
            function (err) {
                callback(err, allData);
            }
        );
    };

    /**
     * @param {string} url - URL of the sparql endpoint to query
     * @param {string} query - SPARQL query to execute
     * @param {string} queryOptions - appended to the url
     * @param {Object} options - options.source is the name of the source being queried
     * @param {Function} callback - Function called to process the result of the query
     */
    self.querySPARQL_GET_proxy = function (url, query, queryOptions, options, callback) {
        if (url.indexOf("_default") == 0) url = Config.default_sparql_url;

        self.currentQuery = query;
        if (!options) options = {};

        $("#waitImg").css("display", "block");

        var payload = {
            options: {},
        };
        if (!queryOptions) queryOptions = "";

        var sourceParams;
        if (options.source) sourceParams = Config.sources[options.source];
        else sourceParams = Config.sources[MainController.currentSource];

        var useProxy = false;
        if (url.indexOf(Config.default_sparql_url) == 0) useProxy = true;

        if (sourceParams && sourceParams.sparql_server.method && sourceParams.sparql_server.method == "GET") {
            payload.GET = true;
            var query2 = encodeURIComponent(query);
            query2 = query2.replace(/%2B/g, "+").trim();
            payload.url = url + query2 + queryOptions;
            if (sourceParams.sparql_server.headers) {
                payload.options = JSON.stringify({ headers: sourceParams.sparql_server.headers, useProxy: useProxy });
            }
        } else {
            //POST
            payload.POST = true;
            var headers = {};
            if (sourceParams.sparql_server.headers) {
                body = JSON.stringify({ headers: sourceParams.server.headers });
            }
            if (sourceParams.sparql_server.type == "fuseki") url = url.replace("&query=", "");

            headers["Accept"] = "application/sparql-results+json";
            headers["Content-Type"] = "application/x-www-form-urlencoded";
            var body = {
                params: { query: query, useProxy: useProxy },
                headers: headers,
            };

            payload.body = JSON.stringify(body);
            payload.url = url + queryOptions;
        }
        $.ajax({
            type: "POST",
            url: `${Config.apiUrl}/httpProxy`,
            data: payload,
            dataType: "json",
            success: function (data, _textStatus, _jqXHR) {
                if (data.result && typeof data.result != "object") data = JSON.parse(data.result.trim());

                if (!data.results) return callback(null, { results: { bindings: [] } });

                callback(null, data);
            },
            error: function (err) {
                if (err.responseText.indexOf("Virtuoso 42000") > -1) {
                    //Virtuoso 42000 The estimated execution time
                    alert(err.responseText.substring(0, err.responseText.indexOf(".")) + "\n select more detailed data");
                } else MainController.UI.message(err.responseText);

                $("#waitImg").css("display", "none");
                // eslint-disable-next-line no-console
                console.log(JSON.stringify(err));
                // eslint-disable-next-line no-console
                console.log(JSON.stringify(query));
                MainController.UI.message(err.responseText);
                if (callback) {
                    return callback(err);
                }
                return err;
            },
        });
    };

    return self;
})();
