/**
 The MIT License
 The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import request from 'request';

import ConfigManager from './configManager.js';
import async from 'async';
import { Client } from '@elastic/elasticsearch';
import util from './util.js';

// elasticdump       --input=cfihos_data_index.json --output=http://opeppa-updtlb03:9200/cfihos --type=data

var elasticRestProxy = {
    elasticUrl: null,
    auth: null,
    getElasticUrl: function () {
        if (elasticRestProxy.elasticUrl) {
            return elasticRestProxy.elasticUrl;
        } else {
            var mainConfig = ConfigManager.getGeneralConfig();
            if (mainConfig) {
                elasticRestProxy.elasticUrl = mainConfig.ElasticSearch.url;
                if (mainConfig.ElasticSearch.user) {
                    elasticRestProxy.auth = {
                        user: mainConfig.ElasticSearch.user,
                        password: mainConfig.ElasticSearch.password,
                    };
                }
            }
            return elasticRestProxy.elasticUrl;
        }
    },

    forwardRequest: function (options, callback) {
        const elasticConf = ConfigManager.config.ElasticSearch;
        if (elasticConf && elasticConf.user && elasticConf.password) {
            options.auth = {
                user: ConfigManager.config.ElasticSearch.user,
                password: ConfigManager.config.ElasticSearch.password,
            };
        }
        process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
        //  console.log("DEBUG:bin/elasticRestProxy:forwardRequest" + JSON.stringify(options));
        request(options, function (error, response, body) {
            //  console.log("DEBUG:bin/elasticRestProxy:forwardRequest\n  error=" + error + "\n  reponse=" + response + "\n  body " + body);
            return callback(error, response, body);
        });
    },

    executePostQuery: function (urlPath, query, indexes, callback) {
        if (urlPath.toLowerCase().trim().indexOf("http") < 0) {
            var indexesStr = "";
        }
        if (Array.isArray(indexes)) {
            indexes.forEach(function (index, p) {
                if (p > 0) {
                    indexesStr += ",";
                }
                indexesStr += index;
            });
        } else {
            indexesStr = indexes;
        }
        if (indexesStr != "") {
            indexesStr += "/";
        }
        var elasticUrl = ConfigManager.config.ElasticSearch.url;
        var url = elasticUrl + indexesStr + urlPath;
        var method = "POST";
        /* if(urlPath.indexOf("_delete_by_query")>-1){
            method="DELETE"
            
         }*/

        var options = {
            method: method,
            json: query,
            headers: {
                "content-type": "application/json",
            },
            url: url,
        };

        elasticRestProxy.forwardRequest(options, function (error, response, body) {
            if (error) {
                return callback(error);
            }

            if (url.indexOf("_bulk") > -1) {
                elasticRestProxy.checkBulkQueryResponse.checkBulkQueryResponse(body, function (err, result) {
                    if (err) {
                        return callback(err);
                    }
                    var message = "indexed " + result.length + " records ";
                    if (elasticRestProxy.socket) {
                        elasticRestProxy.socket.message(message);
                    }
                    return callback(null, result);
                });
            } else {
                if (typeof body == "object") {
                    return callback(null, body);
                }
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
        elasticRestProxy.forwardRequest(options, function (error, response, _body) {
            if (error) {
                return callback(error, null);
            }
            var json = JSON.parse(response.body);
            if (json.error && json.error.reason) {
                return callback(json.error.reason, null);
            }
            return callback(null, json.responses);
        });
    },

    checkBulkQueryResponse: function (responseBody, callback) {
        var body;
        //  if (typeof responseBody != "object")
        if (Buffer.isBuffer(responseBody)) {
            try {
                body = JSON.parse(responseBody.toString());
            } catch (e) {
                return callback(e + " : " + responseBody.toString());
            }
        } else {
            body = responseBody;
        }
        var errors = [];
        if (body.error) {
            if (body.error.reason) {
                return callback(body.error.reason);
            }
            return callback(body.error);
        }

        if (!body.items) {
            return callback(null, "done");
        }
        body.items.forEach(function (item) {
            if (item.index && item.index.error) {
                errors.push(item.index.error);
            } else if (item.update && item.update.error) {
                errors.push(item.update.error);
            } else if (item.delete && item.delete.error) {
                errors.push(item.delete.error);
            }
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
        elasticRestProxy.forwardRequest(options, function (error, _response, _body) {
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
        elasticRestProxy.forwardRequest(options, function (error, response, body) {
            if (error) {
                return callback(error);
            }
            return callback(null, body);
        });
    },

    deleteIndex: function (elasticUrl, indexName, callback) {
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
                    elasticRestProxy.forwardRequest(options, function (error, response, _body) {
                        if (error) {
                            return callbackSeries(error);
                        }
                        if (response.statusCode == 200) {
                            indexExists = true;
                        }
                        callbackSeries();
                    });
                },

                //******deleteIndex*************
                function (callbackSeries) {
                    if (!indexExists) {
                        return callbackSeries();
                    }

                    var options = {
                        method: "DELETE",
                        headers: {
                            "content-type": "application/json",
                        },
                        url: elasticUrl + indexName,
                    };
                    elasticRestProxy.forwardRequest(options, function (error, _response, _body) {
                        if (error) {
                            return callbackSeries(error);
                        }
                        // var message = "delete index :" + indexName;
                        callbackSeries();
                    });
                },
            ],
            function (err) {
                callback(err);
            },
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
        console.log("DEBUG:bin/elasticRestProxy:listIndexes");
        elasticRestProxy.forwardRequest(options, function (error, response, body) {
            if (error) {
                console.log("ERROR:bin/elasticRestProxy:listIndexes/SendAuthRequestError " + error);
                return callback(error);
            }
            console.log("DEBUG:bin/elasticRestProxy:listIndexes tryParseBody");
            var json = JSON.parse(body);
            var indexes = [];
            json.forEach(function (item) {
                indexes.push(item.index);
            });
            callback(null, indexes);
        });
    },

    indexSource: function (indexName, data, options, callback) {
        if (!options) {
            options = {};
        }
        var elasticUrl;
        var elasticVersion;
        async.series(
            [
                //prepare payload
                function (callbackSeries) {
                    ConfigManager.getGeneralConfig(function (err, config) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        elasticUrl = config.ElasticSearch.url;
                        callbackSeries();
                    });
                },

                //delete index
                function (callbackSeries) {
                    if (!options.replaceIndex) {
                        return callbackSeries();
                    }
                    elasticRestProxy.deleteIndex(elasticUrl, indexName, function (err, _result) {
                        callbackSeries(err);
                    });
                },

                //set mappings
                function (callbackSeries) {
                    if (!options.replaceIndex) {
                        return callbackSeries();
                    }

                    var mappings = {
                        settings: {
                            analysis: {
                                normalizer: {
                                    lowercase_normalizer: {
                                        type: "custom",
                                        char_filter: [],
                                        filter: ["lowercase", "asciifolding"],
                                    },
                                },
                            },
                        },
                        mappings: {
                            [indexName]: {
                                properties: {
                                    label: {
                                        type: "text",
                                        fielddata: true,
                                        fields: {
                                            keyword: {
                                                type: "keyword",
                                                ignore_above: 256,
                                                normalizer: "lowercase_normalizer",
                                            },
                                        },
                                    },
                                    skoslabels: {
                                        type: "text",
                                        fielddata: true,
                                        fields: {
                                            keyword: {
                                                type: "keyword",
                                                ignore_above: 256,
                                                normalizer: "lowercase_normalizer",
                                            },
                                        },
                                    },

                                    id: {
                                        type: "text",
                                        fielddata: true,
                                        fields: {
                                            keyword: {
                                                type: "keyword",
                                                ignore_above: 256,
                                            },
                                        },
                                    },
                                    parents: {
                                        type: "text",
                                        fields: {
                                            keyword: {
                                                type: "keyword",
                                                ignore_above: 256,
                                            },
                                        },
                                    },
                                    owlType: {
                                        type: "keyword",
                                    },
                                },
                            },
                        },
                    };
                    var requestOptions = {
                        method: "PUT",
                        json: mappings,
                        encoding: null,
                        timeout: 1000 * 3600 * 24 * 3, //3 days //Set your timeout value in milliseconds or 0 for unlimited
                        headers: {
                            "content-type": "application/json",
                        },
                        url: elasticUrl + indexName,
                    };
                    elasticRestProxy.forwardRequest(requestOptions, function (error, _response, _body) {
                        if (error) {
                            return callbackSeries(error);
                        }
                        return callbackSeries();
                    });
                },

                //check version
                function (callbackSeries) {
                    if (elasticVersion) return callbackSeries();
                    var requestOptions = {
                        method: "GET",
                        headers: {
                            "content-type": "application/json",
                        },
                        url: elasticUrl,
                    };
                    elasticRestProxy.forwardRequest(requestOptions, function (error, _response, _body) {
                        if (error) {
                            return callbackSeries(error);
                        }
                        var json = JSON.parse(_body);
                        var versionStr = json.version.number;
                        elasticVersion = parseInt(versionStr.split(".")[0]);
                        return callbackSeries();
                    });
                },

                function (callbackSeries) {
                    var bulkStr = "";

                    data.forEach(function (item, _indexedLine) {
                        if (options.owlType) {
                            item.owlType = options.owlType;
                        }
                        var id = "R" + util.getRandomHexaId(10);
                        if (elasticVersion < 8) {
                            bulkStr += JSON.stringify({ index: { _index: indexName, _type: indexName, _id: id } }) + "\r\n";
                        } else {
                            bulkStr += JSON.stringify({ index: { _index: indexName, _id: id } }) + "\r\n";
                        }

                        bulkStr += JSON.stringify(item) + "\r\n";
                    });

                    const requestOptions = {
                        method: "POST",
                        body: bulkStr,
                        encoding: null,
                        timeout: 1000 * 3600 * 24 * 3, //3 days //Set your timeout value in milliseconds or 0 for unlimited
                        headers: {
                            "content-type": "application/json",
                        },
                        url: elasticUrl + "_bulk?refresh=wait_for",
                    };
                    elasticRestProxy.forwardRequest(requestOptions, function (error, response, body) {
                        if (error) {
                            return callbackSeries(error);
                        }
                        elasticRestProxy.checkBulkQueryResponse(body, function (err, _result) {
                            if (err) {
                                return callbackSeries(err);
                            }
                            callbackSeries();
                        });
                    });
                },
            ],

            function (err) {
                if (err) {
                    return callback(err);
                }
                callback(null, "done");
            },
        );
    },
};

export default elasticRestProxy;
//elasticRestProxy.listIndexes("http://164.132.194.227:2009/");
