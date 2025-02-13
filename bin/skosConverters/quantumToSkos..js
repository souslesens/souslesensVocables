/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
var fs = require("fs");
var async = require("async");

var generateRdf = function (entitiesArray) {
    console.log(entitiesArray.length);
    var stats = {};
    async.eachSeries(
        ["all"],
        function (scheme, callbackSeries) {
            //   async.eachSeries(tulsaToSkos.topConcepts, function (scheme, callbackSeries) {

            //  var scheme = "all"
            var str = "";
            str += '<?xml version="1.0" encoding="utf-8"?>\n' + '<rdf:RDF xmlns:skos="http://www.w3.org/2004/02/skos/core#"  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">';

            str += "<skos:ConceptScheme rdf:about='http://PetroleumAbstractsThesaurus/" + scheme + "'>";
            str += "  <skos:prefLabel xml:lang='en'>" + scheme + "</skos:prefLabel>";
            str += "</skos:ConceptScheme>";

            entitiesArray.forEach(function (entity, _index) {
                if (!entity.inScheme) {
                    if (!stats["noScheme"]) stats["noScheme"] = 0;
                    stats["noScheme"] += 1;
                } else {
                    if (!stats[entity.inScheme]) stats[entity.inScheme] = 0;
                    stats[entity.inScheme] += 1;
                }

                if (scheme == "all") {
                    if (!entity.inScheme) return;
                } else {
                    if (entity.inScheme != scheme) return;
                }

                str += "<skos:Concept rdf:about='http://PetroleumAbstractsThesaurus/" + entity.prefLabel + "'>\n";
                str += "  <skos:inScheme rdf:resource='http://PetroleumAbstractsThesaurus/" + entity.inScheme + "'/>\n";

                str += "  <skos:prefLabel xml:lang='en'>" + entity.prefLabel + "</skos:prefLabel>\n";

                entity.altLabels.forEach(function (altLabel) {
                    str += "  <skos:altLabel xml:lang='en'>" + altLabel.replace(/&/g, " ") + "</skos:altLabel>\n";
                });

                if (entity.broader) str += "  <skos:broader rdf:resource='http://PetroleumAbstractsThesaurus/" + entity.broader + "'/>\n";

                if (entity.relateds) {
                    entity.relateds.forEach(function (related) {
                        str += "  <skos:related rdf:resource='http://PetroleumAbstractsThesaurus/" + related + "'/>\n";
                    });
                }
                str += "</skos:Concept>\n";
            });
            str += "</rdf:RDF>";

            fs.writeFileSync("D:\\NLP\\quantum_F_" + scheme + ".rdf", str);
            return callbackSeries();
        },
        function (_err) {
            console.log("done");

            console.log(JSON.stringify(stats, null, 2));
        },
    );
};

var quantumPath = "D:\\NLP\\quantum\\quantum_functional.txt";

var data = "" + fs.readFileSync(quantumPath);
var lines = data.split("\n");
//ID	Name	FunctionalClass_Hierarchy_Output	synonyms	Definition

var entities = [];
lines.forEach(function (line, index) {
    line = xmlEncode(line);
    if (index == 0) return;

    var cols = line.split("\t");
    if (cols.length != 5) return;
    var ancestors = cols[2].split("|");

    var parent = ancestors[ancestors.length - 2];
    var grandparent = ancestors[ancestors.length - 3];
    if (!grandparent || grandparent == "")
        if (parent) {
            // return;
            if (parent == "") return;
            if (parent == "Root") parent = null;
            else parent = parent.trim();
        }

    var scheme = null;
    // if (ancestors[1])
    scheme = "quantum_F";

    var synsArray = cols[3].split("|");
    var syns = [];
    synsArray.forEach(function (syn) {
        if (syn == "") return;
        if (syns.indexOf(syn) < 0) syns.push(syn);
    });

    function xmlEncode(str) {
        str = str.replace(/[',&/<>=()]/g, " ");
        return str;
    }

    var entity = {
        prefLabel: cols[1],
        id: cols[0],
        altLabels: syns,
        broader: parent,
        inScheme: scheme,
    };
    entities.push(entity);
});

/*
 * if (false) {
    var dir = "D:\\\\NLP\\\\cgi\\\\";
    //   var dir="D:\\\\NLP\\\\";
    var dirs = fs.readdirSync(dir);
    dirs.forEach(function (file) {
        if (file.indexOf(".rdf") > -1) console.log('"' + dir + file + '",');
    });
}*/
generateRdf(entities);
