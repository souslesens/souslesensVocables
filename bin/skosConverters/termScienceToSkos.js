/**
 The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import fs from 'fs';

import { DOMParser } from 'xmldom';
import skoReader from '../backoffice/skosReader.js';
import async from 'async';
import request from 'request';

var termScienceToSkos = {
    xmlToSkosConcept: function (xmlStr) {
        var xml = new DOMParser().parseFromString(xmlStr, "text/xml");
        var doc = xml.documentElement;
        var obj = {
            id: "",
            prefLabels: [],
            altLabels: [],
            definitions: [],
            broaders: [],
            relateds: [],
            narrowers: [],
        };

        var features = doc.getElementsByTagName("feat");

        for (let i = 0; i < features.length; i++) {
            var feature = features.item(i);
            const type = feature.getAttribute("type");

            if (!feature.childNodes || feature.childNodes.length == 0) continue;
            var value = feature.childNodes[0].nodeValue;
            if (!value) continue;

            if (type == "conceptIdentifier") obj.id = value;

            if (type == "definition") obj.definitions.push(value);

            if (type == "broaderConceptGeneric") {
                var target = feature.getAttribute("target");
                obj.broaders.push(target.substring(1));
            }
            if (type == "specificConcept") {
                target = feature.getAttribute("target");
                obj.narrowers.push(target.substring(1));
            }
        }

        var structs = doc.getElementsByTagName("struct");
        for (let i = 0; i < structs.length; i++) {
            var struct = structs.item(i);
            const type = struct.getAttribute("type");

            if (type == "languageSection") {
                var lang = "";
                var childrenFeatures = struct.getElementsByTagName("feat");
                for (var j = 0; j < childrenFeatures.length; j++) {
                    var childFeature = childrenFeatures.item(j);
                    if (childFeature.childNodes && childFeature.childNodes.length > 0) {
                        var childValue = childFeature.childNodes[0].nodeValue;
                        var childType = childFeature.getAttribute("type");
                        if (childType == "languageIdentifier") {
                            lang = childValue;
                        }
                        if (childType == "term") {
                            if (obj.prefLabels.length == 0 || obj.prefLabels[0].lang != "en") obj.prefLabels.push({ lang: lang, value: childValue });
                            else obj.altLabels.push({ lang: lang, value: childValue });
                        }
                    }
                }
            }
        }

        return obj;
    },

    queryTermScience: function (conceptId, callback) {
        var url = "http://www.termsciences.fr/-/Fenetre/Fiche/XML/?idt=" + conceptId + "&lng=en";

        var options = {
            method: "GET",
            url: url,
            headers: {
                "Content-Type": "text/xml; charset=utf-8",
            },
        };

        function decodeXml(string) {
            var escaped_one_to_xml_special_map = {
                "&amp;": "&",
                "&quot;": '"',
                "&lt;": "<",
                "&gt;": ">",
            };
            return string.replace(/(&quot;|&lt;|&gt;|&amp;)/g, function (str, item) {
                return escaped_one_to_xml_special_map[item];
            });
        }

        request(options, function (error, response, body) {
            if (error) return callback(error);
            if (body.error) return callback(body.error);

            var p = body.indexOf("<textarea");
            p = body.indexOf(">", p);
            var q = body.indexOf("</textarea");
            var xml = body.substring(p + 1, q);
            xml = decodeXml(xml);
            xml = '<?xml version="1.0" encoding="utf-8"?>\n' + "<termSienceRoot>\n" + xml + "</termSienceRoot>\n";
            callback(null, xml);
        });
    },

    buildTreeToSkos: function (rootConceptId, maxLevel, rdfPath, callback) {
        function getConcept(conceptId, callback) {
            if (conceptId)
                termScienceToSkos.queryTermScience(conceptId, function (err, xmlStr) {
                    if (err) return callback(err);
                    var concept = termScienceToSkos.xmlToSkosConcept(xmlStr);
                    return callback(null, concept);
                });
        }

        var children1 = [];
        var children2 = [];
        var children3 = [];
        var children4 = [];
        var children5 = [];
        var children6 = [];

        var conceptsMap = {};

        var editorArray = [];

        var level3_exclude = ["Biochimie", "Chimie agricole", "Chimie pharmaceutique"];
        async.series(
            [
                function (callbackSeries) {
                    console.log("------------start level 1");
                    getConcept(rootConceptId, function (err, concept) {
                        if (err) return callbackSeries(err);
                        concept.parent = "#";
                        conceptsMap[concept.id] = concept;

                        concept.narrowers.forEach(function (child) {
                            children1.push(child);
                        });
                        console.log("children1 : " + children1.length);
                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    if (maxLevel < 2) return callbackSeries();
                    console.log("------------start level 2");
                    async.eachSeries(
                        children1,
                        function (item, callbackEach) {
                            getConcept(item, function (err, concept) {
                                if (err) return callbackEach(err);

                                conceptsMap[concept.id] = concept;
                                if (level3_exclude.indexOf(concept.name) > -1) return callbackEach();
                                concept.narrowers.forEach(function (child) {
                                    child.parent = concept.id;
                                    children2.push(child);
                                });

                                callbackEach();
                            });
                        },
                        function (err) {
                            if (err) return callbackSeries(err);
                            console.log("children2 : " + children2.length);
                            callbackSeries();
                        },
                    );
                },
                function (callbackSeries) {
                    if (maxLevel < 3) return callbackSeries();
                    console.log("------------start level 3");
                    async.eachSeries(
                        children2,
                        function (item, callbackEach) {
                            getConcept(item, function (err, concept) {
                                if (err) return callbackEach(err);

                                conceptsMap[concept.id] = concept;
                                concept.narrowers.forEach(function (child) {
                                    child.parent = concept.id;
                                    children3.push(child);
                                });

                                callbackEach();
                            });
                        },
                        function (err) {
                            if (err) return callbackSeries(err);
                            console.log("children3 : " + children3.length);
                            callbackSeries();
                        },
                    );
                },
                function (callbackSeries) {
                    if (maxLevel < 4) return callbackSeries();
                    console.log("------------start level 4");
                    async.eachSeries(
                        children3,
                        function (item, callbackEach) {
                            getConcept(item, function (err, concept) {
                                if (err) return callbackEach(err);

                                concept.narrowers.forEach(function (child) {
                                    child.parent = concept.id;
                                    children4.push(child);
                                });
                                conceptsMap[concept.id] = concept;
                                callbackEach();
                            });
                        },
                        function (err) {
                            if (err) return callbackSeries(err);
                            console.log("children4 : " + children4.length);
                            callbackSeries();
                        },
                    );
                },
                function (callbackSeries) {
                    if (maxLevel < 5) return callbackSeries();
                    console.log("------------start level 5");
                    async.eachSeries(
                        children4,
                        function (item, callbackEach) {
                            getConcept(item, function (err, concept) {
                                if (err) return callbackEach(err);

                                conceptsMap[concept.id] = concept;
                                concept.narrowers.forEach(function (child) {
                                    child.parent = concept.id;
                                    children5.push(child);
                                });
                                callbackEach();
                            });
                        },
                        function (err) {
                            if (err) return callbackSeries(err);
                            console.log("children5 : " + children5.length);
                            callbackSeries();
                        },
                    );
                },

                function (callbackSeries) {
                    if (maxLevel < 6) return callbackSeries();
                    console.log("------------start level 6");
                    async.eachSeries(
                        children5,
                        function (item, callbackEach) {
                            getConcept(item, function (err, concept) {
                                if (err) return callbackEach(err);
                                conceptsMap[concept.id] = concept;
                                concept.narrowers.forEach(function (child) {
                                    child.parent = concept.id;
                                    children6.push(child);
                                });
                                callbackEach();
                            });
                        },
                        function (err) {
                            if (err) return callbackSeries(err);
                            console.log("children6 : " + children6.length);
                            callbackSeries();
                        },
                    );
                },

                // *************************final treatment**********************
                function (callbackSeries) {
                    for (const key in conceptsMap) {
                        var concept = conceptsMap[key];
                        concept.narrowers.forEach(function (narrower) {
                            if (conceptsMap[narrower] && conceptsMap[narrower].broaders) conceptsMap[narrower].broaders.push(concept.id);
                        });
                    }

                    for (const key in conceptsMap) {
                        editorArray.push(conceptsMap[key]);
                    }

                    callbackSeries();
                },
            ],
            function (err) {
                if (err) return callback(err);

                skoReader.skosEditorToRdf(rdfPath, editorArray, {}, function (err, _result) {
                    if (err) {
                        return callback(err);
                    }
                    callback();
                });
            },
        );
    },
    treeToThesaurusEditor: function (tree) {
        var conceptsArray = [];

        function recurse(node, parentId) {
            if (!node.id) node.id = node.name;
            var obj = {
                id: node.id,
                prefLabels: [{ lang: "en", value: node.name }],
                altLabels: [],
                relateds: [],
                broaders: [parentId],
            };
            conceptsArray.push(obj);

            if (node.children) {
                node.children.forEach(function (child) {
                    var nodeId = node.id;
                    recurse(child, nodeId);
                });
            }
        }

        recurse(tree, "#");
        return conceptsArray;
    },

    commonConcepts: function (rdfPath, _callback) {
        var thesaurusTerms = [];
        async.series(
            [
                function (callbackSeries) {
                    var options = {
                        outputLangage: "en",
                        extractedLangages: "en",
                        withSynonyms: true,
                        printLemmas: true,
                        // filterRegex: /corrosion/gi,
                        withAncestors: true,
                    };
                    skoReader.thesaurusToCsv(rdfPath, options, function (err, result) {
                        if (err) return callbackSeries(err);
                        var lines = result.split("\n");
                        lines.forEach(function (line) {
                            var cols = line.split("\t");
                            var altLabels = "";
                            if (cols[3]) altLabels = cols[3].split(",");
                            thesaurusTerms.push({
                                id: cols[0],
                                ancestors: cols[1],
                                name: cols[2],
                                altLabels: altLabels,
                            });
                        });

                        callbackSeries();
                    });
                },

                function (callbackSeries) {
                    async.eachSeries(thesaurusTerms, function (_term, _callbackEach) {
                        termScienceToSkos.queryTermScience(conceptId, function (_err, _xmlStr) {
                            /*pass*/
                        });
                    });

                    callbackSeries();
                },

                function (callbackSeries) {
                    callbackSeries();
                },
            ],

            function (err) {
                if (err) return err;
                return "DONE";
            },
        );
    },

    listConcepts: function (_callback) {
        var pages = [];
        for (var i = 65; i <= 90; i++) {
            pages.push(String.fromCharCode(i));
        }

        pages = ["C"];
        // var pages = [["A", 1], ["A", 2]]

        var terms = [];
        var termIds = [];
        async.eachSeries(
            pages,
            function (page, callbackEachPageLetter) {
                var pageNums = [];
                for (var i = 1; i <= 500; i++) {
                    pageNums.push(i);
                }
                async.eachSeries(
                    pageNums,
                    function (pageNum, callbackEachPageNum) {
                        var url = "http://www.termsciences.fr/-/Index/Explorer/Alphabet/?lettre=" + page + "&page=" + pageNum + "&lng=en";
                        var options = {
                            method: "GET",
                            url: url,
                            headers: {
                                "Content-Type": "text/xml; charset=utf-8",
                            },
                        };
                        request(options, function (error, response, body) {
                            if (error) return callbackEachPageNum(error);
                            if (body.error) return callbackEachPageNum(body.error);

                            var regex1 = /<a([^>]*)>([^<]+)<\/a>/gm;

                            var array;
                            var pageItemsCount = 0;
                            while ((array = regex1.exec(body)) != null) {
                                var str = array[1];
                                var term = array[2].trim();
                                if (str.indexOf("idt=") > -1) {
                                    var regex2 = /idt=([^&]*)&/gm;
                                    var array2 = regex2.exec(str);
                                    if (array2 && array2.length == 2) {
                                        var id = array2[1];
                                        if (termIds.indexOf(page + "-" + id) < 0) {
                                            termIds.push(page + "-" + id);
                                            terms.push({ name: term, id: id });
                                            pageItemsCount += 1;
                                        } else {
                                            // on a fini les numero de pages
                                            return callbackEachPageNum("endLetter");
                                        }
                                    }
                                }
                            }
                            console.log(page[0] + "-" + pageNum + "   " + pageItemsCount);
                            return callbackEachPageNum();
                        });
                    },
                    function (err) {
                        if (err && err == "endLetter") return callbackEachPageLetter();

                        return callbackEachPageLetter();
                    },
                );
            },
            function (_err) {
                fs.writeFileSync("D:\\NLP\\termScience\\allTerms.csv", JSON.stringify(terms, null, 2));
            },
        );
    },
};
// if (false) {
//     termScienceToSkos.listConcepts(function (_err, _result) {
//         /*pass*/
// });
// }

// if (false) {
//     const rdfPath = "D:\\NLP\\thesaurus_CTG_Product.rdf";
//     termScienceToSkos.commonConcepts(rdfPath, function (_err, _result) {
//         /*pass*/
//     });
// }

// if (false) {
//     const xmlPath = "D:\\NLP\\termScience\\termScienceRoot.xml";
//     const rdfPath = "D:\\NLP\\termScience\\termScience.rdf";

//     var xmlStr = "" + fs.readFileSync(xmlPath);
//     var depth = 0;
//     var rootConcept;

//     termScienceToSkos.xmlToTree(xmlStr, {}, function (err, concept) {
//         if (depth == 0) rootConcept = concept;

//         async.eachSeries(
//             concept.children,
//             function (childConcept, _callbackEach) {
//                 termScienceToSkos.recurseChildren(childConcept, 0, 2);
//             },
//             function (err) {
//                 if (err) console.log(err);
//                 fs.writeFileSync(rdfPath, JSON.stringify(rootConcept, null, 2));
//                 console.log("Done ");
//             }
//         );
//     });
// }
// if (false) {
//     var selectedSubjects = [{ name: "Elements_Chimiques", id: "TE.173836" }];

//     async.eachSeries(
//         selectedSubjects,
//         function (subject, callbackEachSubject) {
//             var rdfPath = "D:\\NLP\\termScience\\termScience_" + subject.name + ".rdf";
//             termScienceToSkos.buildTreeToSkos(subject.id, 6, rdfPath, function (err, _result) {
//                 if (err) {
//                     return callbackEachSubject(err);
//                 }

//                 callbackEachSubject();
//             });
//         },
//         function (err) {
//             if (err) {
//                 return console.log(err);
//             }
//             return console.log("ALL DONE");
//         }
//     );
// }

// if (false) {
//     var rdfPath = "D:\\NLP\\termScience\\termSciences_Physics.rdf";

//     skoReader.skosEditorToRdf(rdfPath, conceptsArray, {});
// }
/*
if (false) {
    var conceptsMap = JSON.parse("" + fs.readFileSync("d:\\NLP\\conceptsMap.json"));

    var editorArray = [];
    for (var key in conceptsMap) {
        var node = conceptsMap[key];
        console.log(key);

        const recurseChildren = function (node) {
            var obj = {
                id: node.id,
                prefLabels: [{ lang: "en", value: node.name }],

                altLabels: [],
            };
            if (node.parent) {
                obj.broaders = [node.parent];
                editorArray.push(obj);
            }

            if (node.children) {
                node.children.forEach(function (child) {
                    editorArray.push({
                        id: child.id,
                        prefLabels: [{ lang: "en", value: child.name }],
                        broaders: [node.id],
                        altLabels: [],
                        relateds: [],
                    });
                    if (conceptsMap[child.id]) recurseChildren(conceptsMap[child.id]);
                });
            }
        };

        recurseChildren(node);
    }

    var rdfPath = "D:\\NLP\\termScience\\termScience_" + "Chemistry" + ".rdf";
    skoReader.skosEditorToRdf(rdfPath, editorArray, {}, function (err, result) {});
}*/
/*
if (false) {
    var conceptId = "TE.182846";
    termScienceToSkos.queryTermScience(conceptId, function (err, _xmlStr) {
        if (err) return console.log(err);
    });
}
*/
/*
if (false) {
    var items = JSON.parse("" + fs.readFileSync("d:\\NLP\\commonConcepts_TERM_SCIENCE_CTG.json"));
    var concepts = [];
    async.eachSeries(
        items,
        function (item, callbackEach) {
            var conceptId = item.source._source.id;
            termScienceToSkos.queryTermScience(conceptId, function (err, xmlStr) {
                if (err) return console.log(err);
                var concept = termScienceToSkos.xmlToSkosConcept(xmlStr);
                concept.relatedCTG = [];

                item.target.forEach(function (target) {
                    concept.relatedCTG.push(target._source.pathIds);
                });

                concepts.push(concept);
                setTimeout(function () {
                    callbackEach();
                }, 200);
            });
        },
        function (err) {
            if (err) console.log(err);
            fs.writeFileSync("d:\\NLP\\commonConcepts_TERM_SCIENCE_CTG.rdf", JSON.stringify(concepts, null, 2));
        }
    );
}
*/
/*
if (false) {
    //   var data = JSON.parse("" + fs.readFileSync("d:\\NLP\\commonConcepts_TERM_SCIENCE_CTG.rdf"));
    var data = JSON.parse("" + fs.readFileSync("d:\\NLP\\temp.json"));
    // var rdfPath = "D:\\NLP\\commonConcepts_TERM_SCIENCE_CTG2.rdf";
    const rdfPath = "D:\\NLP\\temp.rdf";
    skoReader.skosEditorToRdf(rdfPath, data, {}, function (_err, _result) {
        //pass
    });
}
*/
//get Parents
/*
if (false) {
    var data = JSON.parse("" + fs.readFileSync("d:\\NLP\\commonConcepts_TERM_SCIENCE_CTG.rdf"));
    var concepts = [];
    var conceptIds = [];
    var allBroaders = [];
    var newBroaders = [];
    data.forEach(function (item) {
        if (conceptIds.indexOf(item.id) < 0) conceptIds.push(item.id);
    });
    data.forEach(function (item) {
        item.broaders.forEach(function (broader) {
            if (conceptIds.indexOf(broader) < 0) {
                conceptIds.push(broader);
                allBroaders.push(broader);
            }
        });
    });

    async.eachSeries(
        allBroaders,
        function (conceptId, callbackEach) {
            termScienceToSkos.queryTermScience(conceptId, function (err, xmlStr) {
                if (err) return console.log(err);
                var concept = termScienceToSkos.xmlToSkosConcept(xmlStr);

                newBroaders.push(concept);

                setTimeout(function () {
                    callbackEach();
                }, 200);
            });
        },
        function (err) {
            if (err) console.log(err);
            const data = data.concat(newBroaders);
            fs.writeFileSync("d:\\NLP\\commonConcepts_TERM_SCIENCE_CTG.rdf", JSON.stringify(data, null, 2));
        }
    );
}
*/
// getChildren
/*
if (false) {
    skoReader.rdfToEditor("D:\\NLP\\commonConcepts_TERM_SCIENCE_CTGshort.rdf", {}, function (err, result) {
        var dataShort = result;
        var shortIds = [];
        dataShort.skos.forEach(function (item) {
            shortIds.push(item.id);
        });

        var dataLong = JSON.parse("" + fs.readFileSync("d:\\NLP\\commonConcepts_TERM_SCIENCE_CTG.rdf"));

        var data = [];
        dataLong.forEach(function (item) {
            if (shortIds.indexOf(item.id) > -1) data.push(item);
        });

        var conceptIds = [];
        var allNarrowers = [];

        data.forEach(function (item) {
            if (conceptIds.indexOf(item.id) < 0) conceptIds.push(item.id);
        });
        data.forEach(function (item) {
            item.narrowers.forEach(function (narrower) {
                if (conceptIds.indexOf(narrower) < 0) {
                    conceptIds.push(narrower);
                    allNarrowers.push(narrower);
                }
            });
        });

        var newNarrowers = [];
        // var newNarrowersIds = [];

        async.eachSeries(
            allNarrowers,
            function (conceptId, callbackEach) {
                termScienceToSkos.queryTermScience(conceptId, function (err, xmlStr) {
                    if (err) return console.log(err);
                    var concept = termScienceToSkos.xmlToSkosConcept(xmlStr);

                    newNarrowers.push(concept);
                    if (newNarrowers.length % 100 == 0) {
                        console.log(newNarrowers.length);
                    }

                    setTimeout(function () {
                        callbackEach();
                    }, 50);
                });
            },
            function (err) {
                if (err) console.log(err);
                data = data.concat(newNarrowers);
                fs.writeFileSync("d:\\NLP\\commonConcepts_TERM_SCIENCE_CTG.rdf", JSON.stringify(data, null, 2));
            }
        );
    });
}

*/
//var commonEnums=xsdToSkos.getCommonEnumeration();
