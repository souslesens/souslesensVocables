/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import fs from "fs";

import async from "async";
import request from "request";
import skosReader from "../backoffice/skosReader.js";
import indexer from "../backoffice/indexer.js";
import ndjson from "ndjson";

var elasticUrl = "http://localhost:9200/";

var skosToElastic = {
    load: function (thesaurusPaths, callback) {
        options = {
            outputLangage: "en",
            extractedLangages: "en",
            withSynonyms: true,
            // filterRegex: /corrosion/gi,
            withAncestors: true,
            output: "json",
        };

        async.eachSeries(
            thesaurusList,
            function (thesaurusPath, callbackEach) {
                var thesaurusName = thesaurusPath.substring(thesaurusPath.lastIndexOf("\\") + 1);
                thesaurusName = thesaurusName.substring(0, thesaurusName.indexOf("."));
                skosReader.rdfToFlat(thesaurusPath, options, function (err, json) {
                    var newJson = [];
                    json.forEach(function (item) {
                        var ancestors = "";
                        var ancestorsArray = item.ancestors.split(",");
                        var ancestorsIdsArray = item.ancestorsIds.split(",");
                        var ancestorsArray2 = [];
                        ancestorsArray.forEach(function (item) {
                            ancestorsArray2.splice(0, 0, item);
                        });
                        var ancestorsIdsArray2 = [];
                        ancestorsIdsArray.forEach(function (item) {
                            ancestorsIdsArray2.splice(0, 0, item);
                        });
                        ancestorsArray2.forEach(function (ancestor, index) {
                            var sep = "|";
                            for (var i = 0; i <= index; i++) {
                                sep += "_";
                            }
                            ancestors = ancestors + sep + ancestorsIdsArray2[index] + ";" + ancestor;
                        });
                        newJson.push({
                            id: item.id,
                            prefLabels: item.prefLabels,
                            altLabels: item.altLabels,
                            ancestors: ancestors,
                            thesaurus: thesaurusName,
                        });
                    });

                    skosToElastic.flatToElastic(newJson, 0, false, function (err, result) {
                        if (err) {
                            return callbackEach(err);
                        }
                        console.log("indexed" + thesaurusPath + " :  " + result);
                        callbackEach();
                    });
                });
            },
            function (err) {
                if (err) {
                    return callback(err);
                }
            },
        );
    },
    flatToElastic: function (flatJson, startIdValue, createIndex, callback) {
        // var indexName = "flat_thesaurus"
        var indexName = "flat_thesaurus2";
        var indexconfig = JSON.parse("" + fs.readFileSync("D:\\GitHub\\nlp2\\config\\elastic\\sources\\flat_thesaurus2.json"));
        var type = indexName;

        var countCreated = 0;
        async.series(
            [
                function (callbackSeries) {
                    if (!createIndex) return callbackSeries();
                    indexer.deleteIndex(indexconfig, function (_err, _result) {
                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    if (!createIndex) return callbackSeries();
                    //updateRecordId  used for incremental update
                    var json = {
                        mappings: indexconfig.schema.mappings,
                    };

                    var options = {
                        method: "PUT",
                        description: "create index",
                        url: elasticUrl + indexName,
                        json: json,
                    };

                    request(options, function (error, response, body) {
                        if (error) return callbackSeries(error);
                        if (body.error) return callbackSeries(body.error);
                        console.log("index  created");
                        return callbackSeries();
                    });
                },
                function (callbackSeries) {
                    var bulkStr = "";

                    flatJson.forEach(function (record, indexedLine) {
                        var id = record.thesaurus + "_" + (startIdValue + indexedLine);

                        bulkStr += JSON.stringify({ index: { _index: indexName, _type: type, _id: id } }) + "\r\n";
                        bulkStr += JSON.stringify(record) + "\r\n";
                    });

                    var options = {
                        method: "POST",
                        body: bulkStr,
                        encoding: null,
                        headers: {
                            "content-type": "application/json",
                        },
                        url: elasticUrl + "_bulk?refresh=wait_for",
                    };

                    request(options, function (error, response, body) {
                        if (error) {
                            return callbackSeries(error);
                        }

                        if (Buffer.isBuffer(body)) body = JSON.parse(body.toString());
                        var errors = [];
                        if (body.error) {
                            if (body.error.reason) return callbackSeries(body.error.reason);
                            return callbackSeries(body.error);
                        }

                        if (!body.items) return callbackSeries(null, "done");
                        body.items.forEach(function (item) {
                            if (item.index && item.index.error) errors.push(item.index.error);
                            else if (item.update && item.update.error) errors.push(item.update.error);
                            else if (item.delete && item.delete.error) errors.push(item.delete.error);
                        });

                        if (errors.length > 0) {
                            errors = errors.slice(0, 20);
                            return callback(errors);
                        }
                        countCreated = body.items.length;
                        return callbackSeries(null, body.items.length);
                    });
                },
            ],
            function (err) {
                if (err) return callback(err);
                callback(null, countCreated);
            },
        );
    },

    getCommonConcepts: function (hitsIndexSource, indexTarget, callback) {
        var commonConcepts = [];
        var hitsIndexTarget = [];
        async.series(
            [
                //query first thersaurus
                function (callbackSeries) {
                    var ndjsonStr = "";
                    var serialize = ndjson.serialize();
                    serialize.on("data", function (line) {
                        ndjsonStr += line; // line is a line of stringified JSON with a newline delimiter at the end
                    });

                    hitsIndexSource.forEach(function (item, _index) {
                        //   var label = item._source.subject;
                        var label = item._source.name;

                        var elasticQuery = {
                            query: {
                                bool: {
                                    must: [
                                        {
                                            query_string: {
                                                query: '\\"' + label + '\\"',
                                                default_operator: "AND",
                                                default_field: "prefLabel",
                                            },
                                        },
                                    ],
                                },
                            },
                            from: 0,
                            size: 25,
                        };
                        //console.log(JSON.stringify(elasticQuery,null,2))
                        serialize.write({ index: indexTarget });
                        serialize.write(elasticQuery);
                    });

                    serialize.end();
                    var options = {
                        method: "POST",
                        body: ndjsonStr,
                        headers: {
                            "content-type": "application/json",
                        },

                        url: "http://localhost:9200/" + "_msearch",
                    };

                    request(options, function (error, response, _body) {
                        if (error) return callbackSeries(error);
                        var json = JSON.parse(response.body);
                        if (json.error) {
                            return callbackSeries(json.error);
                        }
                        var responses = json.responses;

                        responses.forEach(function (response, _responseIndex) {
                            if (response.error) {
                                hitsIndexTarget.push({ _source: {} });
                                return; //  return callbackSeries(response.error.root_cause)
                            }
                            hitsIndexTarget.push(response.hits.hits);
                        });
                        callbackSeries();
                    });
                },

                //process common
                function (callbackSeries) {
                    // var targetHitsIds = [];
                    hitsIndexTarget.forEach(function (hits, index) {
                        if (hits.length > 0) {
                            commonConcepts.push({
                                source: hitsIndexSource[index],
                                target: hitsIndexTarget[index],
                            });
                            // var targetIds = [];
                            //    console.log(hitsIndexSource[index]._source.subject+"  "+hitsIndexTarget[index]._source.path)
                            /*    hits.forEach(function (hit) {
                                targetIds.push({
                                    source_name: hitsIndexSource[index]._source.subject,
                                    source_id: hitsIndexSource[index]._source.id,
                                    taregt_name: hit._source.prefLabel,
                                    target_id: hit._source.pathIds[0]
                                })
                            })
                            targetHitsIds.push(targetIds)*/
                        }
                    });
                    callbackSeries();
                },
            ],
            function (err) {
                if (err) return callback(err);
                return callback(null, commonConcepts);
            },
        );
    },

    compareThesaurus: function (indexSource, indexTarget, callback) {
        var hitsIndexSource = [];
        var commonConcepts = [];
        var totalHits = 0;
        var scroll_id = "";
        async.series(
            [
                //query first thersaurus
                function (callbackSeries) {
                    var payload = {
                        query: {
                            match_all: {},
                            //  "match":{"subject":"corrosion"}
                        },
                        // "from": 4800,
                        size: 5000,
                    };
                    var options = {
                        method: "POST",
                        json: payload,
                        headers: {
                            "content-type": "application/json",
                        },

                        url: "http://localhost:9200/" + indexSource + "/_search?scroll=1m",
                    };

                    request(options, function (error, response, body) {
                        if (error) return callbackSeries(error);
                        var json = response.body;
                        if (json.error) {
                            return callbackSeries(json.error);
                        }

                        hitsIndexSource = body.hits.hits;
                        scroll_id = body._scroll_id;

                        var scrollSize = 10000;

                        async.whilst(
                            function test(cb) {
                                cb(null, scrollSize > 0);
                            },
                            function iter(callbackWhilst) {
                                var options = {
                                    method: "POST",
                                    json: {
                                        scroll: "1m",
                                        scroll_id: scroll_id,
                                    },
                                    headers: {
                                        "content-type": "application/json",
                                    },

                                    url: "http://localhost:9200/_search/scroll",
                                };

                                request(options, function (error, response, body) {
                                    if (error) return callbackWhilst(error);
                                    var json = response.body;
                                    if (json.error) {
                                        return callbackWhilst(json.error);
                                    }
                                    scroll_id = body._scroll_id;
                                    scrollSize = body.hits.hits.length;
                                    hitsIndexSource = hitsIndexSource.concat(body.hits.hits);
                                    totalHits += body.hits.hits.length;
                                    skosToElastic.getCommonConcepts(hitsIndexSource, indexTarget, function (err, result) {
                                        if (err) return callbackWhilst(err);
                                        console.log(result.length + " /" + totalHits);
                                        commonConcepts = commonConcepts.concat(result);
                                        callbackWhilst();
                                    });
                                });
                            },
                            function (err, _n) {
                                if (err) return callbackSeries(err);
                                fs.writeFileSync("D:\\NLP\\LOC\\commonConcepts_" + indexTarget + ".json", JSON.stringify(commonConcepts, null, 2));
                                callbackSeries();
                            },
                        );
                    });
                },
                //search common
                function (callbackSeries) {
                    fs.writeFileSync("D:\\NLP\\commonConcepts_" + indexTarget + ".json", JSON.stringify(commonConcepts, null, 2));
                    callbackSeries();
                },
            ],

            function (err) {
                if (err) return callback(err);
                callback(null, commonConcepts);
            },
        );
    },
};

export default skosToElastic;
/*
function getThesaurusListFromNlp2App() {
    var listPath = "D:\\GitHub\\nlp2\\public\\skosEditor\\js\\theaususList.js";
    var str = "" + fs.readFileSync(listPath);

    var list = [];
    var lines = str.split("\n");
    lines.forEach(function (line) {
        if (line.indexOf("D:") > -1) {
            list.push(line.replace(",", "").replace(/"/g, "").trim());
        }
    });
    return list;
}


if (false) {
    var thesaurusList = getThesaurusListFromNlp2App();

    http://localhost:9200/flat_thesaurus2/_delete_by_query
    {
  "query": {
    "bool": {
      "must_not": [
        {
         "terms":{"thesaurus":["LOC","TS"]}
        }
      ]
    }
  }

}

    //   thesaursusList = ["D:\\NLP\\thesaurusCTG-02-20.rdf"]

    var thesaurusList = [
        "D:\\NLP\\rdfs\\thesaurusCTG-02-20.rdf",
        "D:\\NLP\\rdfs\\quantum_F_all.rdf",
        //   "D:\\NLP\\Tulsa_all.rdf",
        "D:\\NLP\\rdfs\\Tulsa_COMMON ATTRIBUTE.rdf",
        "D:\\NLP\\rdfs\\Tulsa_EARTH AND SPACE CONCEPTS.rdf",
        "D:\\NLP\\rdfs\\Tulsa_ECONOMIC FACTOR.rdf",
        "D:\\NLP\\rdfs\\Tulsa_EQUIPMENT.rdf",
        "D:\\NLP\\rdfs\\Tulsa_LIFE FORM.rdf",
        "D:\\NLP\\rdfs\\Tulsa_MATERIAL.rdf",
        "D:\\NLP\\rdfs\\Tulsa_OPERATING CONDITION.rdf",
        "D:\\NLP\\rdfs\\Tulsa_PHENOMENON.rdf",
        "D:\\NLP\\rdfs\\Tulsa_PROCESS.rdf",
        "D:\\NLP\\rdfs\\Tulsa_PROPERTY.rdf",
        "D:\\NLP\\rdfs\\unesco.rdf",
        "D:\\NLP\\rdfs\\thesaurusIngenieur.rdf",
    ];
    //  var thesaurusList = [ "D:\\NLP\\Tulsa_EARTH AND SPACE CONCEPTS.rdf"]
    //  var thesaurusList = ["D:\\NLP\\unesco.rdf"]
    //   var thesaurusList = [   "D:\\NLP\\rdfs\\Tulsa_MATERIAL.rdf",]
    skosToElastic.load(thesaurusList, function (err, _result) {
        if (err) return console.log(err);
        return console.log("done");
    });
}*/
/*
if (false) {
    skosToElastic.compareThesaurus("libraryofcongress", "flat_thesaurus", function (err, result) {
        //  skosToElastic.compareThesaurus("termscience_all", "flat_thesaurus", function (err, result) {
    });
}*/
