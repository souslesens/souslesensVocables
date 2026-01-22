/**
 The MIT License
 The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import fs from "fs";

import async from "async";

var tulsaToSkos = {
    topConcepts: ["COMMON ATTRIBUTE", "EARTH AND SPACE CONCEPTS", "ECONOMIC FACTOR", "EQUIPMENT", "LIFE FORM", "OPERATING CONDITION", "PHENOMENON", "PROCESS", "PROPERTY", "WORLD", "MATERIAL"],
    parseTxt: function () {
        var jsonArray = [];

        var filePath = "D:\\NLP\\importedResources\\Tulsa.txt";

        var str = "" + fs.readFileSync(filePath);
        var lines = str.split("\n");
        var types = {};
        lines.forEach(function (line, index) {
            var offset1 = 32;
            var offset2 = 41;
            if (line.length > 40) {
                offset1 = line.length - 8;
                offset2 = line.length;
            }

            if (index > 20000000) return;
            var obj;
            var type = line.substring(0, 6).trim();
            if (type.indexOf("SN") != 0) {
                if (!types[type]) types[type] = 0;
                types[type] += 1;
            }
            if (type == "DS") {
                obj = {
                    type: type,
                    term: line.substring(6, offset1).trim(),
                    num: line.substring(offset1, offset2).trim(),
                    scheme: line.substring(offset1, offset1 + 1),
                    line: index,
                };
            } else {
                obj = {
                    type: type,
                    term: line.substring(6).trim(),
                    line: index,
                };
            }

            jsonArray.push(obj);
        });
        console.log(JSON.stringify(types, null, 2));
        console.log(JSON.stringify(jsonArray.slice(0, 1000), null, 2));
        return jsonArray;
    },

    listItems: function (jsonArray) {
        jsonArray.sort(function (a, b) {
            if (a.scheme > b.scheme) return 1;
            if (a.scheme < b.scheme) return -1;
            return 0;
        });

        var str = "";
        jsonArray.forEach(function (item, i) {
            if ((i > 0 && item.scheme != jsonArray[i - 1].scheme) || i == jsonArray.length - 1) {
                fs.writeFileSync("D:\\NLP\\Tulsa_" + jsonArray[i - 1].scheme + ".txt", str, null, 2);
                str = "";
            } else str += item.type + "\t" + item.term + "\t" + item.num + "\t" + item.scheme + "\t" + item.line + "\n";
        });
    },

    setEntitiesByBroaders: function (jsonArray) {
        var entity = null;
        var entitiesMap = {};
        function padWithLeadingZeros(string) {
            return new Array(5 - string.length).join("0") + string;
        }

        function unicodeCharEscape(charCode) {
            return "\\u" + padWithLeadingZeros(charCode.toString(16));
        }

        function unicodeEscape(string) {
            return string
                .split("")
                .map(function (char) {
                    var charCode = char.charCodeAt(0);
                    return charCode > 127 ? unicodeCharEscape(charCode) : char;
                })
                .join("");
        }

        jsonArray.forEach(function (item, _indexItem) {
            /*   if (item.term && item.term.indexOf("ADDED") > -1)
                   return;*/
            item.term = unicodeEscape(item.term).replace(/&/g, " ").replace(/'/g, " ");
            // remove dates and annotations  see Format of PA Thesauri USE...
            item.term = item.term.replace(/.*\(\d+-*\d*\)\s*/g, "");
            item.term = item.term.replace("/", " ");

            if (item.type == "DS") {
                if (entity != null) {
                    //   entitiesArray.push(entity);
                    entitiesMap[entity.prefLabel] = entity;
                }

                // var scheme = schemes[parseInt(item.scheme) - 1]

                var entity = {
                    prefLabel: item.term,
                    id: item.line,
                    relateds: [],
                    altLabels: [],
                    num: item.num,
                    broaders: [],
                    narrowers: [],
                };
            }

            if (item.type == "BT") {
                if (entity.broaders.indexOf(item.term) < 0) entity.broaders.push(item.term);
                entity.broader = item.term;
            } else if (item.type == "SA") {
                if (entity.relateds.indexOf(item.term) < 0) entity.relateds.push(item.term);
            } else if (item.type == "UF") {
                /*else if (false && item.type.indexOf("US") == 0) {
                if (entity.altLabels.indexOf(item.term) < 0)
                    entity.altLabels.push(item.term)


            }*/
                if (entity.altLabels.indexOf(item.term) < 0) entity.altLabels.push(item.term);
            } else if (item.type == "NT") {
                if (entity.narrowers.indexOf(item.term) < 0) entity.narrowers.push(item.term);
            } /*else if (item.type.indexOf("SN") == 0) {
                if (item.term.indexOf("NT ")<0 && item.term.indexOf("BT ") < 0 && item.term.indexOf("USED ") <0 && item.term.indexOf("ADDED ") <0) {
                    if (entity.altLabels.indexOf(item.term) < 0)
                        entity.altLabels.push(item.term)
                }

            }*/

            /*  if( entity.broaders.length==0 && entity.narrowers.length==0) {
                if( orphanEntities.indexOf(entity.prefLabel)<0)
                orphanEntities.push(entity.prefLabel)
            }*/
        });
        if (entity.broaders) return entitiesMap;
    },
    // setDSMap: function (jsonArray) {},

    setEntitiesNarrowersScheme: function (entitiesMap) {
        function recurse(parent, currentScheme) {
            if (!entitiesMap[parent] || !entitiesMap[parent].narrowers) return;
            entitiesMap[parent].narrowers.forEach(function (narrower) {
                entitiesMap[narrower].inScheme = currentScheme;
                recurse(narrower, currentScheme);
            });
        }

        tulsaToSkos.topConcepts.forEach(function (topConcept) {
            entitiesMap[topConcept].inScheme = topConcept;
            recurse(topConcept, topConcept);
        });
        return entitiesMap;
    },

    setEntitiesBoadersScheme: function (entitiesMap) {
        function recurseParent(node) {
            if (node.inScheme) return node.inScheme;
            if (tulsaToSkos.topConcepts.indexOf(node.broader) > -1) return node.broader;
            else {
                if (node.broader) {
                    return recurseParent(entitiesMap[node.broader]);
                } else return null;
            }
        }

        for (var key in entitiesMap) {
            var entity = entitiesMap[key];
            var scheme = recurseParent(entity);
            if (scheme) entity.inScheme = scheme;
        }

        function recurse(parent, currentScheme) {
            if (!entitiesMap[parent] || !entitiesMap[parent].narrowers) return;
            entitiesMap[parent].narrowers.forEach(function (narrower) {
                entitiesMap[narrower].inScheme = currentScheme;
                recurse(narrower, currentScheme);
            });
        }

        tulsaToSkos.topConcepts.forEach(function (topConcept) {
            entitiesMap[topConcept].inScheme = topConcept;
            recurse(topConcept, topConcept);
        });
        return entitiesMap;
    },

    getRootConcepts: function (entitiesArray) {
        entitiesArray.forEach(function (entity) {
            if (!entity.broader && entity.narrowers.length > 2) rootConcepts.push(entity.prefLabel);
        });
        return rootConcepts;
    },

    generateRdf: function (entitiesMap) {
        var entitiesArray = [];
        for (var key in entitiesMap) {
            entitiesArray.push(entitiesMap[key]);
        }
        console.log(entitiesArray.length);
        var stats = {};
        async.eachSeries(
            ["all"],
            function (scheme, callbackSeries) {
                //   async.eachSeries(tulsaToSkos.topConcepts, function (scheme, callbackSeries) {

                //  var scheme = "all"
                var str = "";
                str += '<?xml version="1.0" encoding="utf-8"?>\n' + '<rdf:RDF xmlns:skos="http://www.w3.org/2004/02/skos/core#"  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">';

                str += "<skos:ConceptScheme rdf:about='http://PetroleumAbstractsThesaurus/" + scheme.replace(/ /g, "_") + "'>";
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

                    /*   if (scheme == "all") {
                    if (!entity.inScheme)
                        return;
                } else {

                    if (entity.inScheme != scheme)
                        return;
                }*/

                    str += "<skos:Concept rdf:about='http://PetroleumAbstractsThesaurus/" + entity.prefLabel.replace(/ /g, "_") + "'>\n";
                    //   str += "  <skos:inScheme rdf:resource='http://PetroleumAbstractsThesaurus/" + entity.inScheme.replace(/ /g, '_') + "'/>\n"

                    str += "  <skos:prefLabel xml:lang='en'>" + entity.prefLabel + "</skos:prefLabel>\n";

                    entity.altLabels.forEach(function (altLabel) {
                        str += "  <skos:altLabel xml:lang='en'>" + altLabel.replace(/&/g, " ") + "</skos:altLabel>\n";
                    });

                    entity.broaders.forEach(function (broader) {
                        str += "  <skos:broader rdf:resource='http://PetroleumAbstractsThesaurus/" + broader.replace(/ /g, "_") + "'/>\n";
                    });
                    entity.narrowers.forEach(function (narrower) {
                        str += "  <skos:narrower rdf:resource='http://PetroleumAbstractsThesaurus/" + narrower.replace(/ /g, "_") + "'/>\n";
                    });
                    entity.relateds.forEach(function (related) {
                        str += "  <skos:related rdf:resource='http://PetroleumAbstractsThesaurus/" + related.replace(/ /g, "_") + "'/>\n";
                    });
                    str += "</skos:Concept>\n";
                });
                str += "</rdf:RDF>";

                fs.writeFileSync("D:\\NLP\\Tulsa_" + scheme + ".rdf", str);
                return callbackSeries();
            },
            function (_err) {
                console.log("done");
                console.log(JSON.stringify(stats, null, 2));
            },
        );
    },

    generateSNtriples: function (entitiesMap) {
        var entitiesArray = [];
        for (var key in entitiesMap) {
            entitiesArray.push(entitiesMap[key]);
        }
        var str = "";
        entitiesArray.forEach(function (entity) {
            var conceptUri = "<http://PetroleumAbstractsThesaurus/" + entity.prefLabel.replace(/ /g, "_") + ">";

            //     str += conceptUri + " <http://www.w3.org/2004/02/skos/core#prefLabel> '" + entity.prefLabel.replace(/&/g, " ") + "'@en.\n"

            entity.altLabels.forEach(function (altLabel) {
                str += conceptUri + " <http://www.w3.org/2004/02/skos/core#altLabel> '" + altLabel.replace(/&/g, " ") + "'@en.\n";
            });
            /*     entity.narrowers.forEach(function (narrower) {
                var narrowerUri = "<http://PetroleumAbstractsThesaurus/" +narrower.replace(/ /g, '_') + ">"
                str += conceptUri + " <http://www.w3.org/2004/02/skos/core#narrower> " + narrowerUri+".\n"
            })

            entity.broaders.forEach(function (broader) {
                var broaderUri = "<http://PetroleumAbstractsThesaurus/" +broader.replace(/ /g, '_') + ">"
                str += conceptUri + " <http://www.w3.org/2004/02/skos/core#broader> " + broaderUri+".\n"
            })

            entity.relateds.forEach(function (related) {
                var relatedUri = "<http://PetroleumAbstractsThesaurus/" +related.replace(/ /g, '_') + ">"
                str += conceptUri + " <http//://www.w3.org/2004/02/skos/core#related> " + relatedUri+".\n"
            })*/
        });
        //  console.log(str)
        fs.writeFileSync("D:\\NLP\\Tulsa_08_20.rdf.nt", str);
    },

    // checkOrphans: function () {},
};

export default tulsaToSkos;
/*
if (false) {
    var jsonArray = tulsaToSkos.parseTxt();

    var entitiesMap = tulsaToSkos.setEntitiesByBroaders(jsonArray);

    tulsaToSkos.generateSNtriples(entitiesMap);

    //  var entitiesMap = tulsaToSkos.setEntitiesNarrowersScheme(entitiesMap);

    //  var entitiesMap = tulsaToSkos.setEntitiesBoadersScheme(entitiesMap);
}
*/
//tulsaToSkos.generateRdf(entitiesMap)
//!!!!!!!!!  ATTENTION!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
/*Post import
    insert into <http://souslesens.org/oil-gas/upstream/>
{?c  <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/2004/02/skos/core#ConceptScheme>}

    where {?a skos:broader ?c filter( NOT EXISTS{ ?c skos:broader ?d.})}*/
/*
if (false) {
    var filePath = "D:\\NLP\\importedResources\\Tulsa.txt";

    var str = "" + fs.readFileSync(filePath);
    var lines = str.split("\n");
    var str2 = "";
    var sns = [];
    lines.forEach(function (line, index) {
        var prefix = line.substring(0, 5);
        if (prefix.indexOf("SN") == 0) {
            if (sns.indexOf(prefix) < 0) sns.push(prefix);
            var str3 = line.substring(6, 26).trim() + "\t" + index + "\n";
            if (str3.indexOf("NT ") != 0 && str3.indexOf("BT ") != 0 && str3.indexOf("USED ") != 0 && str3.indexOf("ADDED ") != 0) str2 += str3;
        }
    });
    console.log(sns.toString());
    fs.writeFileSync("D:\\NLP\\importedResources\\TulsaSN.txt", str2);
}
if (false) {
    var filePath = "D:\\NLP\\importedResources\\TulsaSelection.txt";
    var json = common.csvToJson(filePath);
    var str = "";
    json.forEach(function (item) {
        if (item.term)
            str +=
                "<http://PetroleumAbstractsThesaurus/" +
                item.term.replace(/ /g, "_") +
                "> <http://www.w3.org/2004/02/skos/core#member> <http://souslesens.org/data/total/ep/collection/" +
                item.domain +
                ">. \n";
    });
    fs.writeFileSync(filePath.replace(".txt", "rdf.nt"), str);
}*/
