/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import async from "async";

import httpProxy from "../httpProxy.js";
import elasticRestProxy from "../elasticRestProxy.js";
import fs from "fs";
var onTheFlyTagger = {
    mediawikistopWords: [
        "wikitable",
        "04b3eb47",
        "1.5em",
        "1.5x",
        "120px",
        "16px",
        "180px",
        "22em",
        "240px",
        "300px",
        "302px",
        "450px",
        "48px",
        "600px",
        "72px",
        "96px",
        "__mirage2",
        "aapg",
        "about",
        "action",
        "ajax.cloudflare.com",
        "align",
        "align:center",
        "also",
        "alt",
        "amp",
        "archives.datapages.com",
        "argument",
        "author",
        "available",
        "backlink",
        "basic",
        "beaumont",
        "bold",
        "book",
        "button.png",
        "bytes",
        "cache",
        "called",
        "can",
        "cdata",
        "cdn",
        "cellspacing",
        "cfsrc",
        "cgi",
        "chapter",
        "cite",
        "cite_note",
        "cite_ref",
        "class",
        "clip.png",
        "cloudflare",
        "code",
        "colspan",
        "common",
        "components",
        "composed",
        "content",
        "contents",
        "contentsub",
        "converted",
        "count",
        "courtesy",
        "cpu",
        "data",
        "datapages",
        "datapages_button.png",
        "decimal",
        "definition",
        "depth",
        "detail.aspx",
        "dir",
        "display:none",
        "div",
        "does",
        "edit",
        "elements",
        "enlarge",
        "examples",
        "exist",
        "expand",
        "expansion",
        "expensive",
        "exploring",
        "external",
        "external_links",
        "figure",
        "find",
        "float:right",
        "font",
        "for",
        "from",
        "fulltext",
        "function",
        "gas",
        "generated",
        "geology",
        "geoscienceworld",
        "geoscienceworld_button.png",
        "google",
        "google_button.png",
        "group",
        "gsw",
        "headline",
        "height",
        "high",
        "highest",
        "href",
        "htm",
        "http",
        "https",
        "image",
        "images",
        "img",
        "include",
        "index.php",
        "infobox",
        "internal",
        "interpreting",
        "javascript",
        "jump",
        "key",
        "land",
        "lang",
        "left",
        "limit",
        "line",
        "link",
        "links",
        "list",
        "literature",
        "ltr",
        "magnify",
        "marine",
        "may",
        "min.js",
        "mirage2",
        "nav",
        "navigation",
        "neither",
        "new",
        "newpp",
        "node",
        "nofollow",
        "nomobile",
        "noscript",
        "occurrence",
        "oil",
        "onepetro",
        "onepetro_button.png",
        "only",
        "original",
        "page",
        "parser",
        "part",
        "petok",
        "petroleum",
        "png",
        "position:relative",
        "post",
        "preprocessor",
        "printfoote",
        "quality",
        "rarely",
        "real",
        "redirect",
        "redlink",
        "reference",
        "references",
        "reflist",
        "rel",
        "report",
        "right",
        "saved",
        "scholar",
        "scholar.google.ca",
        "script",
        "scripts",
        "search",
        "search.html",
        "seconds",
        "section",
        "sections",
        "see",
        "see_also",
        "series",
        "several",
        "shows",
        "sitesub",
        "size",
        "skins",
        "sp.fulldoc",
        "span",
        "specpubs",
        "src",
        "srcset",
        "static",
        "store",
        "store.aapg.org",
        "style",
        "submit",
        "sup",
        "table",
        "template",
        "text",
        "the",
        "through",
        "thumb",
        "thumbcaption",
        "thumbimage",
        "thumbinner",
        "time",
        "timestamp",
        "title",
        "toc",
        "toclevel",
        "tocnumber",
        "tocsection",
        "toctext",
        "toctitle",
        "traps",
        "traps.png",
        "treatise",
        "tright",
        "type",
        "uniform",
        "usage",
        "visibility:hidden",
        "visited",
        "web",
        "weight",
        "width",
        "wiki",
        "wikidb:pcache:idhash",
        "window",
        "www.geoscienceworld.org",
        "www.onepetro.org",
        "yes",
    ],
    sparqlUrl: "",
    pageWordsMap: {},
    getPageWords: function (pageUri, callback) {
        var pageText = "";
        var pageWords = [];

        async.series(
            [
                //ask cache
                function (callbackSeries) {
                    if (onTheFlyTagger.pageWordsMap[pageUri] != null) {
                         pageWords = onTheFlyTagger.pageWordsMap[pageUri];
                        return callback(null, pageWords);
                    } else {
                        return callbackSeries();
                    }
                },
                //getPage
                function (callbackSeries) {
                    httpProxy.get(pageUri, {}, function (err, result) {
                        if (err) return callbackSeries(err);
                         pageText = result;
                        return callbackSeries();
                    });
                },

                //lemmatize pagecontent
                function (callbackSeries) {
                    var strartMark = "bodyContent";
                    var endMark = "printfooter";
                    var startIndex = pageText.indexOf(strartMark) + 10;
                    var endIndex = pageText.indexOf(endMark) + 10;
                     pageText = pageText.substring(startIndex, endIndex);

                    var json = {
                        tokenizer: "standard",
                        filter: ["stop"],
                        text: pageText,
                    };

                    elasticRestProxy.executePostQuery("http://localhost:9200/_analyze", json, function (err, result) {
                        if (err) return callbackSeries(err);
                        var wordsMap = {};
                        result.tokens.forEach(function (item) {
                            var word = "" + item.token;

                            if (word.length > 2 && isNaN(word)) {
                                word = word.toLowerCase();
                                if (!wordsMap[word] && onTheFlyTagger.mediawikistopWords.indexOf(word) < 0) {
                                    wordsMap[word] = 0;
                                    wordsMap[word] += 1;
                                    if (pageWords.indexOf(word) < 0) pageWords.push(word);
                                }
                            }
                        });
                        return callbackSeries();
                    });
                },
            ],

            function (err) {
                onTheFlyTagger.pageWordsMap[pageUri] = pageWords;
                return callback(err, pageWords);
            },
        );
    },

    intersection_destructive: function (a, b) {
        a.sort();
        b.sort();
        var result = [];
        var resultMap = {};
        while (a.length > 0 && b.length > 0) {
            if (a[0] < b[0]) {
                a.shift();
            } else if (a[0] > b[0]) {
                b.shift();
            } /* they're equal */ else {
                if (!resultMap[a[0]]) resultMap[a[0]] = 0;
                resultMap[a[0]] += 1;
                result.push(a[0]);
                // result.push(a.shift());
                a.shift();
                b.shift();
            }
        }

        return result;
    },
    intersectArrays: function (a, b) {
        a.sort();
        b.sort();
        var out = [],
            ai = 0,
            bi = 0,
            acurr,
            bcurr,
            last = Number.MIN_SAFE_INTEGER;
        while ((acurr = a[ai]) !== undefined && (bcurr = b[bi]) !== undefined) {
            if (acurr < bcurr) {
                if (last === acurr) {
                    out.push(acurr);
                }
                last = acurr;
                ai++;
            } else if (acurr > bcurr) {
                if (last === bcurr) {
                    out.push(bcurr);
                }
                last = bcurr;
                bi++;
            } else {
                out.push(acurr);
                last = acurr;
                ai++;
                bi++;
            }
        }
        return out;
    },
    getThesaurusConcepts: function (thesaurusGraphUri, options, callback) {
        if (!options) options = {};
        var limit = 10000;
        var thesaurusConcepts = [];
        var query =
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX skos: <http://www.w3.org/2004/02/skos/core#>" +
            "select distinct * from <" +
            thesaurusGraphUri +
            "> where{" +
            "  " +
            "  ?subject  rdf:type skos:Concept." +
            "  ?subject skos:prefLabel ?subjectLabel filter(lang(?subjectLabel)='en') " +
            "  " +
            "}limit " +
            limit;

        var offset = 0;
        var length = 1;
        async.whilst(
            function test(cb) {
                return cb(null, length > 0);
            },
            function iter(callbackWhilst) {
                //  query=query+" offset "+(""+offset);
                var params = { query: query + " offset " + offset };
                offset += limit;
                httpProxy.post(onTheFlyTagger.sparqlUrl, null, params, function (err, result) {
                    if (err) {
                        console.log(params.query);
                        return callbackWhilst(err);
                    }
                    length = result.results.bindings.length;
                    result.results.bindings.forEach(function (item) {
                        if (options.withIds)
                            thesaurusConcepts.push({
                                id: item.subject.value,
                                label: item.subjectLabel.value.toLowerCase(),
                            });
                        else thesaurusConcepts.push(item.subjectLabel.value.toLowerCase());
                    });
                    callbackWhilst();
                });
            },
            function (err, _n) {
                if (err) return callback(err);
                callback(null, thesaurusConcepts);
            },
        );
    },

    csvToJson: function (filePath) {
        var str = "" + fs.readFileSync(filePath);
        str = str.replace(/[\u{0080}-\u{FFFF}]/gu, ""); //charactrese vides
        var lines = str.split("\n");
        var pagesJson = [];
        var cols = [];

        lines[0].split("\t").forEach(function (cell) {
            cols.push(cell);
        });

        lines.forEach(function (line, lineIndex) {
            var cells = line.trim().split("\t");
            var obj = {};
            cells.forEach(function (cell, index) {
                if (lineIndex == 0) cols.push(cell);
                else {
                    obj[cols[index]] = cell;
                }
            });
            pagesJson.push(obj);
        });
        return pagesJson;
    },

    setWikiCategoriesToThesaurus: function (options, thesaurusGraphUris, callback) {
        var categories = [];
        var pages = [];
        var thesaurusConceptsMap = {};

        async.series(
            [
                //getCategories
                function (callbackSeries) {
                    if (options.pages) {
                         pages = options.pages;
                        return callbackSeries();
                    }
                    if (options.categories) {
                         categories = options.categories;
                        return callbackSeries();
                    } else if (options.subjects) {
                        var pagesData = onTheFlyTagger.csvToJson("D:\\Total\\2020\\Stephanie\\AAPG-Pages.txt");
                        pagesData.forEach(function (item) {
                            if (options.subjects.length == 0 || options.subjects.indexOf(item.subject) > -1) categories.push(item.uri);
                        });

                        return callbackSeries();
                    }
                },

                //getWikiPages
                function (callbackSeries) {
                    if (options.pages) {
                        return callbackSeries();
                    }
                    //  async.eachSeries(categories,function (category,callbackEach){
                    var filter = "";
                    categories.forEach(function (category, index) {
                        if (index > 0) filter += ",";
                        filter += "<" + category + ">";
                    });

                    var query =
                        "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                        "SELECT distinct * from <http://wiki.aapg.org/data/> WHERE {" +
                        "?page  ?x ?category. filter (?category in (" +
                        filter +
                        ")) ?page rdfs:label ?pageLabel} order by ?category limit 5000";

                    var params = { query: query };
                    httpProxy.post(onTheFlyTagger.sparqlUrl, null, params, function (err, result) {
                        if (err) return callbackSeries(err);
                        result.results.bindings.forEach(function (item) {
                            var uri = item.page.value.replace("Special:URIResolver", "");
                            // if (uri.indexOf(",") < 0)
                            pages.push({
                                id: item.page.value,
                                uri: uri,
                                label: item.pageLabel.value,
                                category: item.category.value,
                            });
                        });
                        callbackSeries();
                    });
                },
                //get thesaurus terms map
                function (callbackSeries) {
                    async.eachSeries(
                        thesaurusGraphUris,
                        function (thesaurusGraphUri, callbackEach) {
                            if (thesaurusConceptsMap[thesaurusGraphUri]) {
                                return callbackSeries();
                            }
                            console.log("loading thesaurus " + thesaurusGraphUri);
                            onTheFlyTagger.getThesaurusConcepts(thesaurusGraphUri, { withIds: true }, function (err, result) {
                                thesaurusConceptsMap[thesaurusGraphUri] = {
                                    concepts: result,
                                    commonPagesTerms: {},
                                };
                                console.log(" thesaurus loaded" + thesaurusGraphUri + "  : " + result.length + " concepts");
                                callbackEach();
                            });
                        },
                        function (err) {
                            return callbackSeries(err);
                        },
                    );
                },
                //get commonWords
                function (callbackSeries) {
                    var graphs = Object.keys(thesaurusConceptsMap);

                    //   graphs.forEach(function(graph){
                    async.eachSeries(
                        pages,
                        function (page, callbackEach1) {
                            console.log("-----------------processing page----------- " + page.uri);
                            onTheFlyTagger.getPageWords(page.uri, function (err, result) {
                                if (err) {
                                    console.log("ERROR on " + page.uri + " : " + err);
                                    return callbackEach1();
                                }
                                var currentpageWords = result;
                                async.eachSeries(
                                    graphs,
                                    function (graph, callbackEach2) {
                                        console.log(" on graph " + graph);

                                        var conceptLabels = [];
                                        thesaurusConceptsMap[graph].subjects.forEach(function (item) {
                                            conceptLabels.push(item.label);
                                        });
                                        var commonWords = onTheFlyTagger.intersection_destructive(JSON.parse(JSON.stringify(currentpageWords)), conceptLabels);
                                        //   var intersection = onTheFlyTagger.intersectArrays(pageWords, thesaurusConcepts);

                                        var clonedPage = JSON.parse(JSON.stringify(page));
                                        clonedPage.commonTerms = [];
                                        thesaurusConceptsMap[graph].subjects.forEach(function (item) {
                                            var p;
                                            if ((p = commonWords.indexOf(item.label)) > -1)
                                                clonedPage.commonTerms.push({
                                                    label: commonWords[p],
                                                    id: item.id,
                                                });
                                        });
                                        // clonedPage.commonTerms = result;
                                        thesaurusConceptsMap[graph].commonPagesTerms[page.uri] = clonedPage;

                                        callbackEach2();
                                    },
                                    function (_err) {
                                        return callbackEach1();
                                    },
                                );
                            });
                        },
                        function (_err) {
                            return callbackSeries();
                        },
                    );
                }, //synthetise data
                function (callbackSeries) {
                    var catStats = {};
                    var thesaurusTermsMap = {};
                    for (var graph in thesaurusConceptsMap) {
                        thesaurusTermsMap[graph] = {};
                        for (var page in thesaurusConceptsMap[graph].commonPagesTerms) {
                            var data = thesaurusConceptsMap[graph].commonPagesTerms[page];
                            data.commonTerms.forEach(function (term) {
                                if (!thesaurusTermsMap[graph][term.label])
                                    thesaurusTermsMap[graph][term.label] = {
                                        pages: [],
                                        categories: [],
                                    };
                                thesaurusTermsMap[graph][term.label].pages.push(page);

                                if (thesaurusTermsMap[graph][term.label].categories.indexOf(data.category) < 0) thesaurusTermsMap[graph][term.label].categories.push(data.category);

                                if (!catStats[data.category]) catStats[data.category] = {};
                                if (!catStats[data.category][graph]) catStats[data.category][graph] = { terms: [] };
                                catStats[data.category][graph].terms.push(term);
                            });
                        }
                    }
                    fs.writeFileSync("D:\\Total\\2020\\Stephanie\\pagesWords.json", JSON.stringify(onTheFlyTagger.pageWordsMap, null, 2));
                    fs.writeFileSync("D:\\Total\\2020\\Stephanie\\" + options.subjects.toString() + "_termsCategories.json", JSON.stringify(thesaurusTermsMap, null, 2));
                    fs.writeFileSync("D:\\Total\\2020\\Stephanie\\" + options.subjects.toString() + "_categoriesStats.json", JSON.stringify(catStats, null, 2));
                    return callbackSeries();
                },
            ],

            function (err) {
                callback(err, {});
            },
        );
    },
    printCategoriesTriples: function (categoriesStatsFilePath) {
        var json = JSON.parse("" + fs.readFileSync(categoriesStatsFilePath));
        onTheFlyTagger.maxInsertCategories = 5000;
        var graphCategoriesTriplesMap = {};
        for (var category in json) {
            for (var graph in json[category]) {
                if (!graphCategoriesTriplesMap[graph]) graphCategoriesTriplesMap[graph] = [];

                var terms = json[category][graph].terms;
                var strs = [];

                terms.forEach(function (term, _index) {
                    var category2 = category.replace("Special:URIResolver/Category-3A", "Category:");

                    strs.push("<" + term.id + "> <http://souslesens.org/vocab#wikimedia-category> <" + category2 + ">. ");
                    if (strs.length >= onTheFlyTagger.maxInsertCategories) {
                        graphCategoriesTriplesMap[graph].push(strs);
                        strs = [];
                    }
                });
                graphCategoriesTriplesMap[graph].push(strs);
            }
        }
        return graphCategoriesTriplesMap;
    },

    insertGraphCategories: function (graphCategoriesTriplesMap, callback) {
        var graphs = Object.keys(graphCategoriesTriplesMap);

        async.eachSeries(
            graphs,
            function (graph, callbackEach) {
                var query = "WITH <" + graphs + ">" + "DELETE { ?a ?property ?b } " + "WHERE " + "{ ?a ?property ?b. filter(?property=<http://souslesens.org/vocab#wikimedia-category>) } ";
                var params = { query: query };

                httpProxy.post(onTheFlyTagger.sparqlUrl, null, params, function (err, _result) {
                    if (err) {
                        console.log(err);
                        return callbackEach(err);
                    }

                    var queries = graphCategoriesTriplesMap[graph];
                    async.eachSeries(
                        queries,
                        function (queryArray, callbackEach2) {
                            var query = "";
                            queryArray.forEach(function (item) {
                                query += item;
                            });
                            query = "INSERT DATA" + "  { " + "    GRAPH <" + graph + "> " + "      { " + query + "}}";
                            var params = { query: query };

                            httpProxy.post(onTheFlyTagger.sparqlUrl, null, params, function (err, _result) {
                                if (err) {
                                    console.log(params.query);
                                    return callbackEach2(err);
                                }
                                return callbackEach2();
                            });
                        },
                        function (_err) {
                            return callbackEach();
                        },
                    );
                });
            },
            function (err) {
                return callback(err);
            },
        );
    },
    getCategoriesSignificantWords: function () {
        var wordsByCategory = {};
        var wordsStatsMap = {};
        var allCategoriesLabels = [];
        var allWordsLabels = [];
        var wordsTotalFreq = [];
        var thesauriiMap = {};
        var catThemes = {};
        var allThemesLabels = [];

        var printCategories = false;
        async.series(
            [
                //get unique words and frequency in each category
                function (callbackSeries) {
                    var pageWords = JSON.parse("" + fs.readFileSync("D:\\Total\\2020\\Stephanie\\pagesWords.json"));
                    var pagesCategories = onTheFlyTagger.csvToJson("D:\\Total\\2020\\Stephanie\\pagesCategories.txt");

                    var pagesCatsMap = {};
                    pagesCategories.forEach(function (item) {
                        if (item.category) {
                            var page = item.page.substring(item.page.lastIndexOf("/") + 1);
                            var category = item.category.substring(item.category.lastIndexOf("/") + 11); //2
                            pagesCatsMap[page] = category;
                            if (allCategoriesLabels.indexOf(category) < 0) allCategoriesLabels.push(category);
                        }
                    });

                    for (var page in pageWords) {
                        var page2 = page.substring(page.lastIndexOf("/") + 1);
                        var category = pagesCatsMap[page2];
                        if (category) {
                            if (!wordsByCategory[category]) wordsByCategory[category] = { words: {} };
                            pageWords[page].forEach(function (word) {
                                if (!wordsByCategory[category].words[word]) wordsByCategory[category].words[word] = 0;
                                wordsByCategory[category].words[word] += 1;
                            });
                        }
                    }
                    callbackSeries();
                },

                // get number of categories forEachword (uniqueness)
                function (callbackSeries) {
                    for (var category in wordsByCategory) {
                        for (var word in wordsByCategory[category].words) {
                            if (!wordsStatsMap[word]) wordsStatsMap[word] = { word: word, totalFreq: 0, catFreq: {} };
                            wordsStatsMap[word].totalFreq += wordsByCategory[category].words[word];
                            wordsStatsMap[word].catFreq[category] = wordsByCategory[category].words[word];
                        }
                    }
                    callbackSeries();
                },
                // get number of categories forEachword (uniqueness)
                function (callbackSeries) {
                    for (var word in wordsStatsMap) {
                        if (allWordsLabels.indexOf(word) < 0) allWordsLabels.push(word);
                        var obj = wordsStatsMap[word];
                        obj.nCats = Object.keys(obj.catFreq).length;
                        wordsTotalFreq.push(obj);
                    }
                    wordsTotalFreq.sort(function (a, b) {
                        if (a.nCats > b.nCats) return -1;
                        if (a.nCats < b.nCats) return 1;
                        return 0;
                    });
                    callbackSeries();
                },

                //map organisation theme
                function (callbackSeries) {
                    var catsOrgJson = onTheFlyTagger.csvToJson("D:\\Total\\2020\\Stephanie\\AAPGcats-org.txt");

                    catsOrgJson.forEach(function (line) {
                        if (line.category) {
                            catThemes[line.category] = line;
                            if (allThemesLabels.indexOf(line.theme) < 0) allThemesLabels.push(line.theme);
                        }
                    });

                    wordsTotalFreq.forEach(function (item, _wordIndex) {
                        for (var cat in item.catFreq) {
                            var cat2 = cat.substring(1).replace(/_/g, " ").trim();
                            var theme = catThemes[cat2];
                            if (theme) {
                                if (!item.themes) item.themes = {};
                                if (!item.themes[theme.theme]) item.themes[theme.theme] = 0;
                                item.themes[theme.theme] += item.catFreq[cat];
                            }
                        }
                    });
                    callbackSeries();
                },

                //print csv
                function (callbackSeries) {
                    var str = "";
                    /* thesauriiLabels.forEach(function (thesaurus){
                         str+=thesaurus+"\t";
                     })*/
                    str += "word\ttotalFreq\tnCats\t";
                    if (printCategories) {
                        allCategoriesLabels.forEach(function (cat) {
                            str += cat + "\t";
                        });
                    }

                    allThemesLabels.forEach(function (theme) {
                        str += theme + "\t";
                    });

                    str += "\n";
                    wordsTotalFreq.forEach(function (item, _wordIndex) {
                        /*   {//print thesaurus presence


                                   thesauriiLabels.forEach(function (thesaurus) {
                                     if( thesauriiMap[thesaurus].indexOf(wordIndex)>-1)
                                       str += "X"+ "\t";
                                     else
                                         str += "no"+ "\t";
                                   })
                               }*/

                        str += item.word + "\t" + item.totalFreq + "\t" + item.nCats + "\t";

                        if (printCategories) {
                            //print cat freqs
                            var catStrs = [];
                            allCategoriesLabels.forEach(function (_cat) {
                                catStrs.push(0);
                            });
                            for (var cat in item.catFreq) {
                                var index = allCategoriesLabels.indexOf(cat);
                                catStrs[index] = item.catFreq[cat];
                            }
                            catStrs.forEach(function (cat) {
                                str += cat + "\t";
                            });
                        }

                        {
                            //print cat themes
                            allThemesLabels.forEach(function (theme) {
                                if (item.themes) {
                                    var themeFreq = item.themes[theme];
                                    if (themeFreq) str += themeFreq + "\t";
                                    else str += "0" + "\t";
                                }
                            });
                        }

                        str += "\n";
                    });
                    fs.writeFileSync("D:\\Total\\2020\\Stephanie\\wordsCategoriesMatrix.csv", str);
                    callbackSeries();
                },

                // set word presence in each thesaurus
                function (callbackSeries) {
                    var thesaurusGraphUris = ["http://souslesens.org/oil-gas/upstream/", "http://www.eionet.europa.eu/gemet/", "https://www2.usgs.gov/science/USGSThesaurus/"];

                    async.eachSeries(
                        thesaurusGraphUris,
                        function (graph, callbackEach) {
                            onTheFlyTagger.getThesaurusConcepts(graph, {}, function (err, thesaurusWords) {
                                if (err) return callbackEach(err);

                                var commonWords = onTheFlyTagger.intersection_destructive(thesaurusWords, JSON.parse(JSON.stringify(allWordsLabels)));

                                thesauriiMap[graph] = [];
                                commonWords.forEach(function (word) {
                                    var p = allWordsLabels.indexOf(word);
                                    if (p > -1) thesauriiMap[graph].push(p);
                                });

                                callbackEach();
                            });
                        },

                        function (err) {
                            if (err) return callbackSeries(err);
                            var str = "";
                            var thesauriiLabels = Object.keys(thesauriiMap);
                            thesauriiLabels.forEach(function (thesaurus) {
                                str += thesaurus + "\t";
                            });
                            str += "\t";

                            allWordsLabels.forEach(function (word, wordIndex) {
                                str += word + "\t";
                                thesauriiLabels.forEach(function (thesaurus) {
                                    if (thesauriiMap[thesaurus].indexOf(wordIndex) > -1) str += "X" + "\t";
                                    else str += "no" + "\t";
                                });
                                str += "\n";
                            });
                            console.log(str);
                            callbackSeries();
                        },
                    );
                },
            ],

            function (err) {
                return console.log(err);
            },
        );
    },

    getCommonWords: function (thesaurus, words, callback) {
        onTheFlyTagger.getThesaurusConcepts(thesaurus, {}, function (err, thesaurusWords) {
            if (err) return callback(err);

            var commonWords = onTheFlyTagger.intersection_destructive(thesaurusWords, words);
            return callback(commonWords);
        });
    },
    setThesaursusConceptsOrganisation: function () {
        var catsOrgJson = onTheFlyTagger.csvToJson("D:\\Total\\2020\\Stephanie\\AAPGcats-org.txt");
        var wordsMatrix = onTheFlyTagger.csvToJson("D:\\Total\\2020\\Stephanie\\wordsCategoriesMatrix.csv");

        var catsOrgJsonMap = {};
        catsOrgJson.forEach(function (line) {
            catsOrgJsonMap[line.category] = line;
        });

        wordsMatrix.forEach(function (line) {
            var theme = catsOrgJsonMap[line.word];
            line.theme = theme;
        });
    },
};
export default onTheFlyTagger;
/*
if (false) {
    var wikiPageUri = "https://wiki.aapg.org/3-D_seismic_data_views";
    var thesaurusGraphUri = "http://souslesens.org/oil-gas/upstream/";
    var thesaurusGraphUri = "http://www.eionet.europa.eu/gemet/";

    var wikiPageUri = "https://wiki.aapg.org/Kerogen";
    onTheFlyTagger.tagWebPage(wikiPageUri, thesaurusGraphUri, function (_err, _result) {});
}

if (false) {
    var text = "";

    var regex = /Category:([^;.]*)&amp;[^>.]*>(.*)<\/a>/gm;
    var array = [];
    var str = "";
    while ((array = regex.exec(text)) != null) {
        str += array[1] + "\t" + array[2] + "";
    }
    console.log(str);
}

if (false) {
    var thesaurusGraphUris = ["http://souslesens.org/oil-gas/upstream/", "http://www.eionet.europa.eu/gemet/", "https://www2.usgs.gov/science/USGSThesaurus/"];
    //  var thesaurusGraphUris = [ "https://www2.usgs.gov/science/USGSThesaurus/"]

    var errorPages1 = [
        " https://wiki.aapg.org/Borehole_gravity_applications:_examples",
        " https://wiki.aapg.org/Borehole_gravity:_uses,_advantages,_and_disadvantages",
        " https://wiki.aapg.org/Ellesmerian(-21)_petroleum_system",
        " https://wiki.aapg.org/Gravity_applications:_examples",
        " https://wiki.aapg.org/Log_analysis:_lithology",
        " https://wiki.aapg.org/Magnetic_field:_local_variations",
        " https://wiki.aapg.org/Magnetics:_interpreting_residual_maps",
        " https://wiki.aapg.org/Magnetics:_petroleum_exploration_applications",
        " https://wiki.aapg.org/Magnetics:_total_intensity_and_residual_magnetic_maps",
        " https://wiki.aapg.org/Magnetotelluric_survey_case_history:_volcanic_terrain_(Columbia_River_Plateau)",
        " https://wiki.aapg.org/Magnetotellurics_case_history:_frontier_basin_analysis_(Amazon_Basin,_Colombia)",
        " https://wiki.aapg.org/Magnetotellurics_case_history:_Precambrian_overthrust_(Northwestern_Colorado)",
        " https://wiki.aapg.org/Magnetotellurics_case_history:_rugged_carbonate_terrain_(Highlands_of_Papua_New_Guinea)",
        " https://wiki.aapg.org/Mandal-2DEkofisk(-21)_petroleum_system",
        " https://wiki.aapg.org/Mudlogging:_the_mudlog",
        " https://wiki.aapg.org/Petroleum_system_concept:_examples_of_application",
        " https://wiki.aapg.org/Petroleum_system:_geographic,_stratigraphic,_and_temporal_extent",
        " https://wiki.aapg.org/Procedure_for_basin-2Dfill_analysis",
        " https://wiki.aapg.org/Quick-2Dlook_lithology_from_logs",
        " https://wiki.aapg.org/Seismic_data_-2D_creating_an_integrated_structure_map",
        " https://wiki.aapg.org/Seismic_data_interpretation_-2D_recurring_themes",
        " https://wiki.aapg.org/Seismic_data:_building_a_stratigraphic_model",
        " https://wiki.aapg.org/Seismic_data:_identifying_reflectors",
        " https://wiki.aapg.org/Synthetic_seismograms:_correlation_to_other_data",
        " https://wiki.aapg.org/Tight_gas_reservoirs:_evaluation",
    ];
    var options = {
        // subjects: ["structural geology"],
        subjects: [],
        //  pages: errorPages1
    };

    onTheFlyTagger.setWikiCategoriesToThesaurus(options, thesaurusGraphUris, function (_err, _result) {});
}

if (false) {
    var graphCategoriesTriplesMap = onTheFlyTagger.printCategoriesTriples("D:\\Total\\2020\\Stephanie\\_categoriesStats.json");
    onTheFlyTagger.insertGraphCategories(graphCategoriesTriplesMap, function (err, _result) {
        if (err) return console.log(err);
        console.log("DONE !!!");
    });
}

if (true) {
    onTheFlyTagger.getCategoriesSignificantWords();
}
if (false) {
    onTheFlyTagger.setThesaursusConceptsOrganisation();
}*/
