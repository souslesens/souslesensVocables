var httpProxy = require("../../bin/httpProxy.");
var csvCrawler = require("../../bin/_csvCrawler.");
var elasticRestProxy = require("../../bin/elasticRestProxy.");
var fs = require("fs");
var async = require("async");
var dictionaryMatcher = {
    getSimilars: function (filePath, index, fileField, indexLabelField, indexIdField, callback) {
        var elasticServerUrl = "http://vps254642.ovh.net:2009/";
        var data = [];
        var matchesMap = {};
        var orphans = [];
        var headers = [];
        var count = 0;
        async.series(
            [
                // read csv
                function (callbackseries) {
                    csvCrawler.readCsv({ filePath: filePath }, 500000, function (err, result) {
                        if (err) return callbackseries(err);
                        data = result.data;
                        headers = result.headers;
                        return callbackseries();
                    });
                },
                function (callbackSeries) {
                    async.eachSeries(
                        data[0],
                        function (line, callbackEach) {
                            if (count++ % 100 == 0) console.log(count);

                            var query = {
                                query: {
                                    bool: {
                                        must: [
                                            {
                                                query_string: {
                                                    query: '"' + line[fileField] + '"',
                                                    default_field: "attachment.content",
                                                    default_operator: "AND",
                                                },
                                            },
                                        ],
                                    },
                                },
                                from: 0,
                                // "size": 25,
                                _source: {
                                    excludes: ["attachment.content"],
                                },
                            };
                            (query = {
                                query: {
                                    bool: {
                                        must: [
                                            {
                                                query_string: {
                                                    query: '"_' + line[fileField] + '_"',
                                                    default_field: "attachment.content",
                                                    default_operator: "O",
                                                    phrase_slop: "1",
                                                },
                                            },
                                        ],
                                    },
                                },
                            }),
                                //for tags
                                (query = {
                                    query: {
                                        bool: {
                                            must: [
                                                {
                                                    query_string: {
                                                        query: " " + line[fileField] + " ",

                                                        default_operator: "OR",
                                                    },
                                                },
                                            ],
                                        },
                                    },
                                });

                            /*    query={
                                "query": {
                                    "match": {
                                        "equipmentDescription": {query_string: "\""+line.label+"\"",  fuzziness:"auto"}

                                    },

                                }
                            }

                            query={
                                "query": {
                                    "fuzzy": {
                                        "equipmentDescription": {
                                            "value": line.label
                                        }
                                    }
                                }
                            }*/
                            elasticRestProxy.executePostQuery(
                                "_search",
                                query,
                                index,
                                function (err, result) {
                                    if (err) return callbackEach(err);
                                    if (result.error) return callbackEach(result.error);
                                    if (result && result.hits) {
                                        var data = result.hits.hits;
                                        if (data.length == 0) orphans.push(line);
                                        else {
                                            matchesMap[line[fileField]] = [];
                                            //  matchesMap[line.subject] = {label: line.label, matches: data}
                                            data.forEach(function (hit) {
                                                //  matchesMap[line.subject].matches.push(match)
                                                matchesMap[line[fileField]].push({
                                                    score: hit._score,
                                                    term: hit._source[indexLabelField],
                                                    id: hit._source[indexIdField],
                                                });
                                            });
                                        }
                                    } else {
                                        var x = 3;
                                    }
                                    callbackEach();
                                }
                            );
                        },
                        function (err) {
                            callbackSeries();
                        }
                    );
                },
            ],
            function (err) {
                fs.writeFileSync(
                    filePath + "_" + index + "_orphans.json",
                    JSON.stringify(orphans, null, 2)
                );
                fs.writeFileSync(
                    filePath + "_" + index + "_matches.json",
                    JSON.stringify(matchesMap, null, 2)
                );
                if (callback) return callback(null, matchesMap);
            }
        );
    },

    merge: function (files, index, dir) {
        var str = "";
        var strOrphans = "";
        var bigMatchesMap = {};
        var sep = "\t";
        var indexFile = 0;
        for (var file in files) {
            var fileObj = files[file];
            var matches = JSON.parse(fs.readFileSync(dir + file + "_" + index + "_matches.json"));
            bigMatchesMap[fileObj.id] = matches;
            var orphans = JSON.parse(fs.readFileSync(dir + file + "_" + index + "_orphans.json"));
            var indexMatch = 0;
            for (var match in matches) {
                var id = indexFile * 100000 + indexMatch++;
                var obj = matches[match];
                var strbase = fileObj.label + sep + fileObj.id + sep + id + sep + match;
                obj.forEach(function (item) {
                    str += strbase + sep + item.score + sep + item.id + sep + item.term + "\n";
                });
            }
            indexFile++;

            var strbase2 = fileObj.label + sep + fileObj.id;
            orphans.forEach(function (orphan) {
                strOrphans += strbase2 + sep + orphan.iD + sep + orphan.name + "\n";
            });
        }

        fs.writeFileSync(dir + "QuantumReadiDictionary_" + index + ".csv", str);
        fs.writeFileSync(dir + "QuantumReadiDictionary_" + index + "orphans.csv", strOrphans);
        fs.writeFileSync(
            dir + "Dictionary_" + index + ".json",
            JSON.stringify(bigMatchesMap, null, 2)
        );
    },
};

module.exports = dictionaryMatcher;
if (false) {
    var file = "D:\\NLP\\ontologies\\dictionaries\\bomaftwinequip2.csv_orphans.json";
    var csvFile = "label\t";
    var data = JSON.parse(fs.readFileSync(file));
    data.forEach(function (line) {
        var matches = JSON.parse(fs.readFileSync(dir + file));

        matches.forEach(function (match) {});
    });
    csvFile += "";
}

//dictionaryMatcher.getSimilars("D:\\NLP\\ontologies\\dictionaries\\readiLabel.csv", "bomaftwin","label","equipmentDescription","materialNumber ")
if (true) {
    dictionaryMatcher.getSimilars(
        "D:\\NLP\\ontologies\\TEPDK\\tblCodification.csv",
        "tepdk_tags",
        "assetTagCode",
        "Functional_Location_code",
        "tagName",
        function (err, result) {
            var str = "";
            for (var code in result) {
                result[code].forEach(function (tag) {
                    str += tag.id + "\t" + code + "\n";
                });
            }
            fs.writeFileSync("D:\\NLP\\ontologies\\TEPDK\\" + "tagsCodes.csv", str);
        }
    );
}

if (false) {
    var file = "bomaftwinequip2.csv";
    var file = "Quantum_physicalClasses.txt";
    // var file = "Quantum_discipline.txt"
    //  var file = "Quantum_attribute.txt"
    //    var file = "Quantum_attributePickListValue.txt"
    //  var file = "Quantum_attributePickListValueGrouping.txt"
    //  var file = "Quantum_documentType.txt"
    //  var file = "Quantum_functionalClasses.txt"
    // var file = "Quantum_UOM.txt"
    //  var file = "Quantum_UOMdimension.txt"

    dictionaryMatcher.getSimilars(
        "D:\\NLP\\ontologies\\dictionaries\\" + file,
        "pca",
        "name",
        "label",
        "subject"
    );
}
if (false) {
    var files = {
        "Quantum_functionalClasses.txt": {
            id: "http://w3id.org/readi/rdl/D101001053",
            label: "Artefact",
        },
        "Quantum_physicalClasses.txt": {
            id: "http://w3id.org/readi/rdl/D101001053",
            label: "Artefact",
        },
        "Quantum_discipline.txt": {
            id: "http://w3id.org/readi/z018-rdl/Discipline",
            label: "Discipline",
        },
        "Quantum_attribute.txt": {
            id: "http://standards.iso.org/iso/15926/part14/Quality",
            label: "Quality",
        },
        "Quantum_attributePickListValue.txt": {
            id: "http://standards.iso.org/iso/15926/part14/Quality",
            label: "Quality",
        },
        "Quantum_attributePickListValueGrouping.txt": {
            id: "http://standards.iso.org/iso/15926/part14/Quality",
            label: "Quality",
        },
        "Quantum_documentType.txt": {
            id: "http://w3id.org/readi/rdl/D101001188",
            label: "Document",
        },

        "Quantum_UOM.txt": {
            id: "http://w3id.org/readi/rdl/D101001519",
            label: "CFIHOS unit of measure",
        },
        "Quantum_UOMdimension.txt": {
            id: "http://w3id.org/readi/rdl/CFIHOS-50000112",
            label: "http://data.15926.org/dm/PropertyQuantification",
        },
    };

    var dir = "D:\\NLP\\ontologies\\dictionaries\\";
    dictionaryMatcher.merge(files, "pca", dir);
}
