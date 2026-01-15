/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import httpProxy from './httpProxy.js';

import async from 'async';
import util from './util.js';
var exportRDF = {
    export: function (sparql_url, graphUri, stream, callback) {
        var fromStr = "";
        if (graphUri) fromStr = " FROM <" + graphUri + "> ";
        var query = "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> select distinct * " + fromStr + " where { ?subject ?predicate ?object.}";

        stream.write("with <" + graphUri + "> insert{\n");
        exportRDF.POST_cursor(sparql_url, query, stream, function (err, _result) {
            if (err) return console.log(err);

            callback(null);
        });
    },
    appendToFileStream(stream, data, callback) {
        var str = "";

        data.sort(function (a, b) {
            if (a.subject.value > b.subject.value) return 1;
            if (a.subject.value < b.subject.value) return -1;
            return 0;
        });

        data.forEach(function (item) {
            var objectStr = "";
            if (item.object.type != "uri") {
                // if (item.object.value.indexOf("every part in every performance of the system") > -1) var x = 3;
                objectStr = "'" + util.formatStringForTriple(item.object.value) + "'";
                if (item.object.lang) objectStr += "@" + item.object.lang;
            } else {
                objectStr = "<" + item.object.value + ">";
            }

            str += "<" + item.subject.value + "> <" + item.predicate.value + "> " + objectStr + ".\n";
        });
        stream.write(str);
        callback(null);
    },
    POST_cursor: function (url, query, stream, callback) {
        var offset = 0;
        var limit = 10000;
        var resultSize = 1;
        var allData = [];
        var maxLinesExport = 900000;

        var p = query.toLowerCase().indexOf("limit");
        if (p > -1) query = query.substring(0, p);
        query += " LIMIT " + limit;

        async.whilst(
            function (callbackTest) {
                //test
                return callbackTest(null, resultSize > 0 || offset >= maxLinesExport);
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
                httpProxy.post(url, body.headers, body.params, function (err, data) {
                    console.log("processed " + offset + " lines");
                    if (err) return callbackWhilst(err);
                    resultSize = data.results.bindings.length;
                    allData = data.results.bindings;
                    offset += limit;
                    exportRDF.appendToFileStream(stream, allData, function (err, _result) {
                        if (err) return callbackWhilst(err);
                        callbackWhilst(null);
                    });
                });
            },
            function (err) {
                stream.write("}\n");
                stream.end();
                callback(err);
            },
        );
    },
};
module.exports = exportRDF;
/*
 * var graphUri = "http://data.total.com/quantum/vocab/";

var filePath = "D:\\NLP\\ontologies\\quantum\\export.nt";
*/
/*
 * var map = {
    "ISO_15926-part-14": "http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/",
    "ONE-MODEL": "http://data.total.com/resource/one-model/ontology/0.2/",
    CFIHOS_READI: "http://w3id.org/readi/rdl/",
    "RDL-QUANTUM-MIN": "http://data.total.com/resource/one-model/quantum-rdl/",
    "SIL-ONTOLOGY": "http://data.total.com/resource/sil/ontology/0.1/",
    "ISO_15926-part-12": "http://standards.iso.org/iso/15926/-12/tech/ontology/v-4/",
    "ISO_15926-part-4": "http://standards.iso.org/iso/15926/part4/",
    CFIHOS_equipment: "http://w3id.org/readi/ontology/CFIHOS-equipment/0.1/",
    "NPD-MODEL": "http://sws.ifi.uio.no/vocab/npd-v2/",

    "ISO_15926-part-13": "http://standards.iso.org/iso/15926/part13/",
    QUANTUM: "http://data.total.com/resource/quantum/",
    "NPD-DATA": "http://sws.ifi.uio.no/data/npd-v2/",
};*/
/*
if (false) {

    async.eachSeries(
        Object.keys(map),
        function (source, callbackEach) {
            console.log("exporting " + source);
            var graphUri = map[source];

            var filePath = "D:\\NLP\\ontologies\\exports\\" + source + ".nt";
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            //   var filePath = "/var/lib/nodejs/souslesensVocables/public/exports/" + source + ".nt"
            var stream = fs.createWriteStream(filePath, { flags: "a" });

            exportRDF.export(sparql_url, graphUri, stream, function (_err, _result) {
                callbackEach();
            });
        },
        function (_err) {}
    );
}
if (true) {
    for (var source in map) {
        var graphUri = map[source];
        var fileName = graphUri.substring(graphUri.lastIndexOf("/") + 1) + "000001.ttl.gz";
        console.log("ld_dir ('/appli_RD/opt/souslesens/dumpsRDF/owl/', '" + fileName + "', '" + graphUri + "');");
    }
}
if (false) {
    for (var source in map) {
        console.log("with <" + map[source] + ">" + "delete {" + "  ?sub ?pred ?obj ." + "} " + "where { ?sub ?pred ?obj .}");
    }
}
if (false) {
    for (var source in map) {
        var str = "dump_one_graph ('" + map[source] + "', '/etc/virtuoso-data/exportOwl/" + source + "', 1000000000); ";
        console.log(str);
    }
}

if (false) {
    for (var source in map) {
        var str = "ld_dir ('/appli_RD/opt/souslesens/dumpsRDF/owl/', '" + map[source].substring(map[source].lastIndexOf("/")) + ".ttl000001.ttl.gz', 'http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/');\n";
        console.log(str);
    }
}*/
