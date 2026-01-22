/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import async from "async";

import fs from "fs";
import httpProxy from "./httpProxy.js";
import util from "./util.js";
import path from "path";

//const { configPath } = require("../model/config.js");
import jsonFileStorage from "./jsonFileStorage.js";

import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

var ExportGraph = {
    execute: function (sparqlUrl, graphUri, filePath, callback) {
        var limit = 2000;
        var resultSize = 100;
        var offset = 0;
        var str = "";
        var query = "select * from <" + graphUri + "> where {?s ?p ?o} limit " + limit + " ";
        async.whilst(
            function (callbackTest) {
                //test
                var w = resultSize > 0;
                callbackTest(null, w);
            },

            function (callbackWhilst) {
                //iterate

                var query2 = query + " OFFSET " + offset;
                var body = {
                    url: sparqlUrl,
                    params: { query: query2 },
                    headers: {
                        Accept: "application/sparql-results+json",
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                };
                httpProxy.post(body.url, body.headers, body.params, function (err, result) {
                    if (err) return callbackWhilst(err);

                    if (typeof result === "string") result = JSON.parse(result);

                    offset += result.results.bindings.length;
                     resultSize = result.results.bindings.length;

                    result.results.bindings.forEach(function (item) {
                        var value;
                        if (item.o.type == "uri") value = "<" + item.o.value + ">";
                        else {
                            value = "'" + util.formatStringForTriple(item.o.value) + "'";
                            if (item.o["xml:lang"]) value += "@" + item.o["xml:lang"];
                        }

                        str += "<" + item.s.value + "> <" + item.p.value + "> " + value + " .\n";
                    });
                    callbackWhilst();
                });
            },

            function (err) {
                if (callback) {
                    return callback(err, str);
                }

                if (err) return console.log(err);
                fs.writeFileSync(filePath, str);
            },
        );
    },

    copyGraphToEndPoint: function (_source, toEndPointConfig, options, callback) {
        if (!options) {
            options = {};
        }

        var Config;
        var graphUri;
        var source;
        var totalResultSize = 0;
        async.series(
            [
                function (callbackSeries0) {
                    var sourcesPath = path.join(__dirname, "../" + "config" + "/sources.json");
                    jsonFileStorage.retrieve(path.resolve(sourcesPath), function (err, _sources) {
                         source = _sources[_source];
                         graphUri = source.graphUri;
                        var configPath = path.join(__dirname, "../" + "config" + "/mainConfig.json");
                        jsonFileStorage.retrieve(path.resolve(configPath), function (err, _config) {
                            Config = _config;

                            return callbackSeries0();
                        });
                    });
                },

                //clearEndpointGraph
                function (callbackSeries0) {
                    if (!options.clearEndpointGraph) return callbackSeries0();

                    var query = "clear GRAPH <" + (toEndPointConfig.graphUri || graphUri) + "> ";

                    var body = {
                        url: toEndPointConfig.sparql_server.url + "?query=",
                        params: { query: query },
                        headers: {
                            Accept: "application/sparql-results+json",
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                    };

                    httpProxy.post(body.url, body.headers, body.params, function (err, result) {
                        if (err) return callbackSeries0(err);

                        return callbackSeries0(null);
                    });
                },

                // iterate
                function (callbackSeries0) {
                    var filterStr = "";
                    if (options.filter) filterStr = options.filter;

                    var resultSize = 17;
                    var offset = 0;
                    var size = 50;

                    var triplesStr = "";
                    var prefixesStr = "";

                    var stop = false;
                    async.whilst(
                        function (_test) {
                             stop = resultSize < 16;
                            return _test(null, !stop); //resultSize < 16;
                        },

                        function (callbackWhilst) {
                            async.series(
                                [
                                    function (callbackSeries) {
                                        var fromStr = " FROM <" + graphUri + ">  ";
                                        var url = source.sparql_server.url;
                                        if (url == "_default") {
                                            url = Config.sparql_server.url;
                                        }

                                        var query = "DESCRIBE ?s ?p ?o  " + fromStr + "  WHERE {  ?s ?p ?o    } offset " + offset + " limit " + size + "";

                                        var body = {
                                            url: url + "?query=",
                                            params: { query: query },
                                            headers: {
                                                Accept: "text/turtle",
                                                "Content-Type": "application/x-www-form-urlencoded",
                                            },
                                        };

                                        httpProxy.post(body.url, body.headers, body.params, function (err, result) {
                                            if (err) return callbackSeries(err);

                                            if (result.indexOf(" Empty TURTLE") > -1) stop = true;
                                            offset += size;
                                             resultSize = result.length;
                                             totalResultSize = offset + size;
                                            console.log(totalResultSize);

                                             triplesStr = "";
                                             prefixesStr = "";

                                            var lines = result.split("\n");
                                            lines.forEach(function (line) {
                                                if (line.indexOf("@prefix") == 0) {
                                                    line = line.replace("/[\t\r]/g", "");
                                                    //  line = line.replace(/\./g, "") + "\n";
                                                    prefixesStr += line + "\n";
                                                } else {
                                                    triplesStr += line + "\n";
                                                }
                                            });

                                            callbackSeries(null);
                                        });
                                    },
                                    // write triples
                                    function (callbackSeries) {
                                        if (stop) {
                                            return callbackSeries();
                                        }
                                         prefixesStr = prefixesStr.replace(/@/g, "");
                                        prefixesStr = prefixesStr.replace(/\t/g, " ");
                                        prefixesStr = prefixesStr.replace(/\.\n/g, " ");

                                         triplesStr = triplesStr.replace(/\t/g, " ");
                                        triplesStr = triplesStr.replace(/\n/g, " ");
                                        //    triplesStr=triplesStr.replace(/\\/g,"")

                                        var query = prefixesStr + "\n";
                                        query += "insert data { GRAPH <" + (toEndPointConfig.graphUri || graphUri) + ">  {";
                                        query += triplesStr + "}}";

                                        var body = {
                                            url: toEndPointConfig.sparql_server.url + "?query=",
                                            params: { query: query },
                                            headers: {
                                                Accept: "application/sparql-results+json",
                                                "Content-Type": "application/x-www-form-urlencoded",
                                            },
                                        };

                                        httpProxy.post(body.url, body.headers, body.params, function (err, result) {
                                            if (err) return callbackSeries(err);

                                            return callbackSeries(null);
                                        });
                                    },
                                ],
                                function (err) {
                                    return callbackWhilst(err);
                                },
                            );
                        },
                        function (err) {
                            return callbackSeries0(err);
                        },
                    );
                },
            ],
            function (err) {
                return callback(err, { result: totalResultSize });
            },
        );
    },
};
export default ExportGraph;
