/**
 The MIT License
 The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import request from "request";

import ConfigManager from "./configManager.js";
import async from "async";
import { Client } from "@elastic/elasticsearch";
import util from "./util.js";
import path from "path";
import fs from "fs";
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
                    if (elasticVersion) {
                        return callbackSeries();
                    }
                    if (elasticVersion) {
                        return callbackSeries();
                    }
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
                            bulkStr += JSON.stringify({index: {_index: indexName, _type: indexName, _id: id}}) + "\r\n";
                            bulkStr += JSON.stringify({index: {_index: indexName, _type: indexName, _id: id}}) + "\r\n";
                        } else {
                            bulkStr += JSON.stringify({index: {_index: indexName, _id: id}}) + "\r\n";
                            bulkStr += JSON.stringify({index: {_index: indexName, _id: id}}) + "\r\n";
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
    indexDocuments: function (rootdir, index, callback) {


        var maxDocSize = 1000 * 1000 * 1000 * 20;


        var acceptedExtensions = ["doc", "docx", "docm", "xls", "xlsx", "pdf", "odt", "ods", "ppt", "pptx", "html", "htm", "txt", "csv"];
        var base64Extensions = ["doc", "docx", "docm", "xls", "xlsx", "pdf", "ppt", "pptx", "ods", "odt"];

        var filesToIndex = [];
        var indexedFilesCount = 0;
        var t0alldocs = new Date().getTime();
        var t0doc;


        async.series([

            // list all  candidate files to index
            function (callbackSeries) {

                function getFilesRecursive(dir) {
                    dir = path.normalize(dir);
                    if (!fs.existsSync(dir)) {
                        return callbackSeries("dir doesnt not exist :" + dir)
                    }
                    if (dir.charAt(dir.length - 1) != path.sep) {
                        dir += path.sep;
                    }

                    var files = fs.readdirSync(dir);
                    for (var i = 0; i < files.length; i++) {
                        var fileName = dir + files[i];
                        var stats = fs.statSync(fileName);
                        var infos = {lastModified: stats.mtimeMs};//fileInfos.getDirInfos(dir);

                        if (stats.isDirectory()) {
                            getFilesRecursive(fileName)
                        } else {
                            var p = fileName.lastIndexOf(".");
                            if (p < 0) {
                                continue;
                            }
                            var extension = fileName.substring(p + 1).toLowerCase();
                            if (acceptedExtensions.indexOf(extension) < 0) {
                                socket.message("!!!!!!  refusedExtension " + fileName);
                                continue;
                            }
                            if (stats.size > maxDocSize) {
                                socket.message("!!!!!! " + fileName + " file  too big " + Math.round(stats.size / 1000) + " Ko , not indexed ");
                                continue;
                            }
                            filesToIndex.push({fileName: fileName, infos: infos});
                        }
                    }
                }

                getFilesRecursive(rootdir)
                return callbackSeries();
            },


            // configure ingest attachement pipeline to remove binary data from index
            function (callbackSeries) {
                return callbackSeries()
                var requestOptions = {
                    method: 'PUT',
                    url: config.indexation.elasticUrl + "_ingest/pipeline/attachment",
                    json: {
                        "description": "Extract attachment information",
                        "processors": [
                            {
                                "attachment": {
                                    "field": "data"
                                },
                                "remove": {
                                    "field": "data"
                                }
                            }
                        ],
                        auth: {
                            user: "elastic",
                            password: "sls#209",
                        }
                    }
                }
                request(requestOptions, function (error, response, body) {

                    if (error) {
                        return callbackSeries(error)
                        // return callback(file+" : "+error);
                    }
                    if (body.error) {
                        if (body.error.reason) {
                            return callbackSeries(body.error.reason);
                        } else {
                            return callbackSeries(body.error);
                        }
                    }
                    return callbackSeries(null, body);
                });
            },


            //index filesToIndex
            function (callbackSeries) {

                async.eachSeries(filesToIndex, function (file, callbackEach) {
                        var filePath = file.fileName;
                        var p = filePath.lastIndexOf(".");
                        if (p < 0) {
                            return callback("no extension for file " + filePath);
                        }
                        var extension = filePath.substring(p + 1).toLowerCase();
                        if(extension!="pdf")
                            return callbackEach()
                        var base64 = false;
                        if (base64Extensions.indexOf(extension) > -1) {
                            base64 = true;


                        }
                        var options = {}// config;
                        options.file = filePath;
                        options.type = index;
                        options.index = index;
                        options.infos = file.infos;
                        options.base64 = base64;

                        t0doc = new Date().getTime();
                        elasticRestProxy.indexDocumentFile(options, function (err, result) {
                            if (err) {
                                return callbackSeries(err);
                            }
                            if(!result){
                                return callbackEach("error no result");
                            }
                            if (result.result && result.result.created) {
                                indexedFilesCount += 1;
                            }
                            if (indexedFilesCount % 10 == 0) {
                                var duration = new Date().getTime() - t0alldocs;
                                var message = "indexed " + indexedFilesCount + " documents in " + duration + " msec.";
                               // socket.message(message);
                            }

                            return callbackEach();

                        });


                    }, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        var duration = new Date().getTime() - t0alldocs;
                        var message = "indexation done " + indexedFilesCount + "/" + filesToIndex.length + " documents  in " + duration + " msec.";
                        //  socket.message(message)
                        return callbackSeries();

                    }
                );


            }


        ], function (err) {
            callback(err);
        })


    },


    indexDocumentFile: function (options, callback) {

        /*
        2) Créer un pipeline “PDF → texte”


        PUT /_ingest/pipeline/pdf_attachment
{
  "description": "Extract text/metadata from PDF using ingest-attachment",
  "processors": [
    {
      "attachment": {
        "field": "data",
        "target_field": "attachment",
        "remove_binary": true,
        "indexed_chars": 200000
      }
    }
  ]
}
         */

        /*
        3) Créer l’index (mapping recommandé)
PUT /pdf_docs
{
  "mappings": {
    "properties": {
      "filename": { "type": "keyword" },
      "attachment": {
        "properties": {
          "content": { "type": "text" },
          "content_type": { "type": "keyword" },
          "language": { "type": "keyword" }
        }
      }
    }
  }
}
         */


/*
b) Envoyer à Elasticsearch
PUT /pdf_docs/_doc/1?pipeline=pdf_attachment
{
  "filename": "monfichier.pdf",
  "data": "JVBERi0xLjQKJc..."
}
 */


        var file = options.file;
        var index = options.index;
        var type = options.type;
        var infos = options.infos;
        var base64 = options.base64;
        var elasticUrl ="https://51.178.139.80:9200/"// options.indexation.elasticUrl;


        var fileContent;
        var file = path.resolve(file);
        var p = file.lastIndexOf(path.sep);
        var title = file;
        if (p > -1) {
            title = file.substring(p + 1);
        }
        var requestOptions;
        var incrementRecordId;
        if ( base64) {

            fileContent = util.base64_encodeFile(file);
            incrementRecordId = util.getStringHash(fileContent);
         //   var id = "D" + incrementRecordId;
            var id = "D" + util.getRandomHexaId(10);
            requestOptions = {
                method: 'PUT',

              //  url:"https://51.178.139.80:9200/pdf_docs/_doc/1?pipeline=pdf_attachment",
                url:elasticUrl + index + "/_doc/"+id +"?pipeline=pdf_attachment",
            //  url: elasticUrl + index + "/_doc" + id + "?pipeline=pdf_attachment",
                json: {
                    "data": fileContent,
                   fileName:title
                }

            }

            elasticRestProxy.forwardRequest(requestOptions, function (error, _response, _body) {
                if (error) {
                    return callback(error);
                }
                return callback(null,_body);
            });
        }


    }

};

export default elasticRestProxy;
//elasticRestProxy.listIndexes("http://164.132.194.227:2009/");
