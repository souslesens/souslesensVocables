/**
 The MIT License
 The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
const request = require("request");

const ConfigManager = require("./configManager.");
const async = require("async");
// elasticdump       --input=cfihos_data_index.json --output=http://opeppa-updtlb03:9200/cfihos --type=data

var elasticRestProxy = {
    elasticUrl: null,
    getElasticUrl: function () {
        if (elasticRestProxy.elasticUrl) return elasticRestProxy.elasticUrl;
        else {
            var mainConfig = ConfigManager.getGeneralConfig();
            if (mainConfig) elasticRestProxy.elasticUrl = mainConfig.ElasticSearch.url;
            return elasticRestProxy.elasticUrl;
        }
    },

    executePostQuery: function (url, query, indexes, callback) {
        if (url.toLowerCase().trim().indexOf("http") < 0) var indexesStr = "";
        if (Array.isArray(indexes)) {
            indexes.forEach(function (index, p) {
                if (p > 0) indexesStr += ",";
                indexesStr += index;
            });
        } else indexesStr = indexes;
        if (indexesStr != "") indexesStr += "/";
        var elasticUrl = ConfigManager.config.ElasticSearch.url;
        url = elasticUrl + indexesStr + url;

        var options = {
            method: "POST",
            json: query,
            headers: {
                "content-type": "application/json",
            },
            url: url,
        };

        //   if (true) console.log(JSON.stringify(query, null, 2));
        request(options, function (error, response, body) {
            if (error) return callback(error);

            if (url.indexOf("_bulk") > -1) {
                checkBulkQueryResponse.checkBulkQueryResponse(body, function (err, result) {
                    if (err) return callback(err);
                    var message = "indexed " + result.length + " records ";
                    if (socket) socket.message(message);
                    return callback(null, result);
                });
            } else {
                callback(null, JSON.parse(body));
            }
        });
    },
    executeMsearch: function (ndjson, callback) {
        var elasticUrl = ConfigManager.config.ElasticSearch.url;
        var options = {
            method: "POST",
            body: ndjson,
            encoding: null,
            headers: {
                "content-type": "application/json",
            },
            url: elasticUrl + "/_msearch",
        };

        //   console.log(ndjson);
        request(options, function (error, response, _body) {
            if (error) {
                return callback(error, null);
            }
            var json = JSON.parse(response.body);
            if (json.error && json.error.reason) {
                return callback(json.error.reason, null);
            }
            var responses = json.responses;
            /*  responses.forEach(function (response, responseIndex) {

                  var hits = response.hits.hits;
                  hits.forEach(function (hit) {

                  })
              })*/
            return callback(null, responses);
        });
    },

    checkBulkQueryResponse: function (responseBody, callback) {
        var body;
        //  if (typeof responseBody != "object")
        if (Buffer.isBuffer(responseBody))
            try {
                body = JSON.parse(responseBody.toString());
            } catch (e) {
                return callback(e + " : " + responseBody.toString());
            }
        else body = responseBody;
        var errors = [];
        if (body.error) {
            if (body.error.reason) return callback(body.error.reason);
            return callback(body.error);
        }

        if (!body.items) return callback(null, "done");
        body.items.forEach(function (item) {
            if (item.index && item.index.error) errors.push(item.index.error);
            else if (item.update && item.update.error) errors.push(item.update.error);
            else if (item.delete && item.delete.error) errors.push(item.delete.error);
        });

        if (errors.length > 0) {
            errors = errors.slice(0, 20);
            return callback(errors);
        }
        return callback(null, body.items.length);
    },
    refreshIndex: function (config, callback) {
        var options = {
            method: "GET",
            encoding: null,
            timeout: 1000 * 3600 * 24 * 3, //3 days //Set your timeout value in milliseconds or 0 for unlimited
            headers: {
                "content-type": "application/json",
            },
            url: config.indexation.elasticUrl + config.general.indexName + "/_refresh",
        };

        request(options, function (error, _response, _body) {
            if (error) {
                return callback(error);
            }
            return callback();
        });
    },

    analyzeSentence: function (sentence, callback) {
        var elasticUrl = ConfigManager.config.ElasticSearch.url;
        var json = {
            tokenizer: "classic",
            text: sentence,
        };
        var options = {
            method: "POST",
            encoding: null,
            headers: {
                "content-type": "application/json",
            },
            json: json,
            url: elasticUrl + "_analyze",
        };

        request(options, function (error, response, body) {
            if (error) {
                return callback(error);
            }
            return callback(null, body);
        });
    },

    deleteIndex: function (elasticUrl, indexName, callback) {
        var elasticUrl = elasticUrl;
        var indexExists = false;
        async.series(
            [
                //******check if index exist*************
                function (callbackSeries) {
                    var options = {
                        method: "HEAD",
                        headers: {
                            "content-type": "application/json",
                        },
                        url: elasticUrl + indexName + "/",
                    };
                    request(options, function (error, response, _body) {
                        if (error) return callbackSeries(error);
                        if (response.statusCode == 200) indexExists = true;
                        callbackSeries();
                    });
                },

                //******deleteIndex*************
                function (callbackSeries) {
                    if (!indexExists) return callbackSeries();

                    var options = {
                        method: "DELETE",
                        headers: {
                            "content-type": "application/json",
                        },
                        url: elasticUrl + indexName,
                    };
                    request(options, function (error, _response, _body) {
                        if (error) return callbackSeries(error);
                        callbackSeries();
                    });
                },
            ],
            function (err) {
                callback(err);
            }
        );
    },
    listIndexes: function (elasticUrl, callback) {
        var options = {
            method: "GET",
            headers: {
                "content-type": "application/json",
            },
            url: elasticUrl + "_cat/indices?format=json",
        };

        request(options, function (error, response, body) {
            if (error) return callback(error);
            var json = JSON.parse(body);
            var indexes = [];
            json.forEach(function (item) {
                indexes.push(item.index);
            });
            callback(null, indexes);
        });
    },
};

module.exports = elasticRestProxy;

//elasticRestProxy.listIndexes("http://164.132.194.227:2009/");
