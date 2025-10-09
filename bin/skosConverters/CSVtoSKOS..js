/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
const async = require("async");
const util = require("../util.");
const fs = require("fs");
const csv = require("csv-parser");

var CSVtoSKOS = {
    getCSVColumns: function (filePath, callback) {
        CSVtoSKOS.readCsv({ filePath: filePath }, 50000, function (err, result) {
            if (err) return callback(err);
            else return callback(null, result.headers);
        });
    },

    importFunctions: {
        uri: function (field, data, lineIndex) {
            var id = data[lineIndex][field];
            if (!id) return null;
            return "<" + config.graphUri + util.formatStringForTriple(id, true) + ">";
        },
        /*  distinctUri: function (field, data,lineIndex) {
              var id=data[lineIndex][field];
              if(!id)
                  return null;
              var uri="<"+config.graphUri+util.formatStringForTriple(id,true)+">"
              if (!distinctUris[uri]) {
                  distinctUris[uri]=1
                  return uri;
              }
              return null;
          },*/

        concat: function (fieldsStr, data, lineIndex, lang) {
            var fields = fieldsStr.split(",");
            var str = "";
            fields.forEach(function (field, _index) {
                if (str != "") str += "   ";

                if (field.indexOf("$") >= 0) {
                    field = field.trim();
                    field = field.substring(1);
                    if (data[lineIndex][field]) {
                        str += data[lineIndex][field];
                    }
                } else {
                    str += field;
                }
            });
            var langStr = "";
            if (lang) langStr = "@" + lang;
            str = "'" + util.formatStringForTriple(str) + "'" + langStr;
            return str;
        },
    },

    generatTriples: function (config, callback) {
        var data = [];
        var triples = "";
        async.series(
            [
                // read csv
                function (callbackseries) {
                    CSVtoSKOS.readCsv(config, config.maxLines, function (err, result) {
                        if (err) return callbackseries(err);
                        data = result.data;
                        return callbackseries();
                    });
                },
                //generate triples
                function (callbackseries) {
                    var mappings = config.mappings;
                    var slicedData = util.sliceArray(data[0], 100);
                    async.eachSeries(
                        slicedData,
                        function (data, callbackEach) {
                            data.forEach(function (line, lineIndex) {
                                if (lineIndex == 0) return;
                                mappings.forEach(function (mapping) {
                                    var subject, object, fn, fields;
                                    if (typeof mapping.subject === "object") {
                                        fn = mapping.subject.fn;

                                        fields = mapping.subject.params;
                                        subject = fn(fields, data, lineIndex);
                                    } else {
                                        subject = line[mapping.subject];
                                    }

                                    if (typeof mapping.object === "object") {
                                        fn = mapping.object.fn;
                                        if (typeof fn !== "function") console.log(fn);
                                        fields = mapping.object.params;
                                        object = fn(fields, data, lineIndex, mapping.object.lang);
                                    } else {
                                        if (mapping.object.indexOf("$") == 0) {
                                            // colName variable
                                            var langStr = "";
                                            if (mapping.lang) langStr = "@" + mapping.lang;
                                            object = "'" + util.formatStringForTriple(line[mapping.object.substring(1)]) + "'" + langStr;
                                        } else {
                                            object = mapping.object;
                                        }
                                    }

                                    var predicate = "<" + mapping.predicate + ">";

                                    if (subject && predicate && object) {
                                        var triple = subject + " " + predicate + " " + object + ".\n";
                                        var tripleHash = util.getStringHash(triple);

                                        if (!(mapping.distinctTriple && distinctTriples[tripleHash])) {
                                            distinctTriples[tripleHash] = 1;
                                            triples += triple;
                                        }
                                    }
                                });
                            });
                            callbackEach();
                        },
                        function (err) {
                            if (err) return callbackseries(err);
                            return callbackseries();
                        },
                    );
                },
            ],
            function (err) {
                if (err) return callback(err);

                callback(null, triples);
            },
        );
    },

    generateDefaultMappingFields: function (connector, callback) {
        csvCrawler.readCsv(connector, 1000000, function (err, result) {
            if (err) return callback(err);
            var fields = {};
            result.headers.forEach(function (header) {
                if (header != "")
                    if (!fields[header]) {
                        result.data.forEach(function (line) {
                            if (util.isFloat(line[header])) fields[header] = { type: "float" };
                            else if (util.isInt(line[header])) fields[header] = { type: "integer" };
                            else fields[header] = { type: "text" };
                        });
                    }
            });

            return callback(null, fields);
        });
    },

    readCsv: function (connector, lines, callback) {
        util.getCsvFileSeparator(connector.filePath, function (separator) {
            if(!separator)
                return callback("unable to determine column separator")
            var headers = [];
            var jsonData = [];
            var jsonDataFetch = [];
            fs.createReadStream(connector.filePath).pipe(
                csv({
                    separator: separator,
                })
                    .on("header", function (header) {
                        headers.push(header);
                    })

                    .on("data", function (data) {
                        jsonDataFetch.push(data);

                        if (lines && jsonDataFetch.length >= lines) {
                            jsonData.push(jsonDataFetch);
                            jsonDataFetch = [];
                        }
                    })
                    .on("end", function () {
                        jsonData.push(jsonDataFetch);
                        return callback(null, { headers: headers, data: jsonData });
                    }),
            );
        });
    },
};
module.exports = CSVtoSKOS;
/*
if (false) {
    CSVtoSKOS.getCSVColumns("D:\\NLP\\importedResources\\iec.csv", function (_err, _result) {
        // do nothing
    });
}
*/
var mappings = [
    {
        subject: { fn: CSVtoSKOS.importFunctions.uri, params: "Id" },
        predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
        object: "<http://www.w3.org/2004/02/skos/core#Concept>",
    },
    {
        subject: { fn: CSVtoSKOS.importFunctions.uri, params: "Id" },
        predicate: "http://www.w3.org/2004/02/skos/core#prefLabel",
        object: "$Term_name_EN",
        lang: "en",
    },
    {
        subject: { fn: CSVtoSKOS.importFunctions.uri, params: "Id" },
        predicate: "http://www.w3.org/2004/02/skos/core#prefLabel",
        object: "$Term_name_FR",
        lang: "fr",
    },
    {
        subject: { fn: CSVtoSKOS.importFunctions.uri, params: "Id" },
        predicate: "http://www.w3.org/2004/02/skos/core#definition",
        object: "$Definition_EN",
        lang: "en",
    },
    {
        subject: { fn: CSVtoSKOS.importFunctions.uri, params: "Id" },
        predicate: "http://www.w3.org/2004/02/skos/core#definition",
        object: "$Definition_FR",
        lang: "fr",
    },
    {
        subject: { fn: CSVtoSKOS.importFunctions.uri, params: "Id" },
        predicate: "http://www.w3.org/2004/02/skos/core#note",
        object: {
            fn: CSVtoSKOS.importFunctions.concat,
            params: "source :,$Source_EN,pubDate:,$PubDate_EN",
        },
        lang: "en",
    },
    {
        subject: { fn: CSVtoSKOS.importFunctions.uri, params: "Id" },
        predicate: "http://www.w3.org/2004/02/skos/core#note",
        object: {
            fn: CSVtoSKOS.importFunctions.concat,
            params: "source :,$Source_FR,pubDate:,$PubDate_FR",
        },
        lang: "fr",
    },

    {
        distinctTriple: true,
        subject: { fn: CSVtoSKOS.importFunctions.uri, params: "Category_Id" },
        predicate: "http://www.w3.org/2004/02/skos/core#prefLabel",
        object: "$Category",
        lang: "en",
    },
    {
        distinctTriple: true,
        subject: { fn: CSVtoSKOS.importFunctions.uri, params: "Category_Id" },
        predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
        object: "<http://www.w3.org/2004/02/skos/core#Concept>",
    },
    {
        distinctTriple: true,
        subject: { fn: CSVtoSKOS.importFunctions.uri, params: "Category_Id" },
        predicate: "http://www.w3.org/2004/02/skos/core#broader",
        object: "<http://souslesens.org/vocabulary/iec/IEC>",
    },
    {
        subject: { fn: CSVtoSKOS.importFunctions.uri, params: "Id" },
        predicate: "http://www.w3.org/2004/02/skos/core#broader",
        object: { fn: CSVtoSKOS.importFunctions.uri, params: "Category_Id" },
    },
];

var config = {
    //filePath: "D:\\NLP\\importedResources\\iec.csv",
    filePath: "D:\\NLP\\importedResources\\iec_60050_v2.txt",

    graphUri: "http://souslesens.org/vocabulary/iec/",
    mappings: mappings,
    maxLines: 1000000,
};
CSVtoSKOS.generatTriples(config, function (err, result) {
    if (err) return console.log(err);
    result +=
        "<http://souslesens.org/vocabulary/iec/IEC> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/2004/02/skos/core#ConceptScheme>.\n" +
        "<http://souslesens.org/vocabulary/iec/IEC>  <http://www.w3.org/2004/02/skos/core#prefLabel> 'IEC'@en." +
        " <http://souslesens.org/vocabulary/iec/IEC>  <http://www.w3.org/2004/02/skos/core#prefLabel> 'IEC'@fr.";
    fs.writeFileSync(config.filePath.replace(".txt", ".nt"), result);
});
