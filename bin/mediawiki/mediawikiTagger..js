/**
 The MIT License
 The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import httpProxy from '../httpProxy.js';

import elasticRestProxy from '../elasticRestProxy.js';

//var superagent = require('superagent')
import request from 'request';

import fs from 'fs';
import async from 'async';
var thesauriiConcepts = {};
var mediaWikiTagger = {
    sparqlUrl: "",

    indexPage: function (wikiUri, pageName, elasticUrl, indexName, callback) {
        var rawPageText = "";
        var pageText = "";
        var pageCategories = [];

        async.series(
            [
                //get Page content
                function (callbackSeries) {
                    httpProxy.get(wikiUri + pageName, {}, function (err, result) {
                        if (err) return callbackSeries(err);
                        rawPageText = result;
                        return callbackSeries();
                    });
                },
                //get usefullTextcontent
                function (callbackSeries) {
                    var strartMark = "bodyContent";
                    var endMark = "printfooter";
                    var startIndex = rawPageText.indexOf(strartMark) + 10;
                    var endIndex = rawPageText.indexOf(endMark) + 10;
                    pageText = rawPageText.substring(startIndex, endIndex);
                    pageText = pageText.replace(/[\t]/g, "");
                    return callbackSeries();
                },
                //getPageCategories
                function (callbackSeries) {
                    pageCategories = [];
                    // var regex = /wgCategories":\[([^\].]*)/m;
                    // var regex = /href="\/Category:([^"]*)/gm;
                    var regex = /<li><a href="\/Category:([^"^]*)/gm;
                    let array = [];

                    while ((array = regex.exec(rawPageText)) != null) {
                        pageCategories.push(array[1]);
                    }
                    var regex2 = /<li><a href="\/index\.php\?title=Category:([^"^&]*)/gm;
                    array = [];
                    while ((array = regex2.exec(rawPageText)) != null) {
                        pageCategories.push(array[1]);
                    }
                    var regex3 = /<li><a href="\/wiki\/Category:([^"^&]*)/gm;
                    array = [];
                    while ((array = regex3.exec(rawPageText)) != null) {
                        pageCategories.push(array[1]);
                    }
                    console.log(JSON.stringify(pageCategories));
                    callbackSeries();
                },

                //indexPageAndCategories
                function (callbackSeries) {
                    var doc = {
                        content: pageText,
                        url: wikiUri + pageName,
                        pageName: pageName.replace("/", ""),
                        categories: pageCategories,
                    };
                    var bulkStr = "";
                    bulkStr +=
                        JSON.stringify({
                            index: { _index: indexName, _type: "mediawiki-page", _id: doc.uri },
                        }) + "\r";
                    bulkStr += JSON.stringify(doc) + "\r";

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
                        if (error) return callbackSeries(error);
                        elasticRestProxy.checkBulkQueryResponse(body, function (err, _result) {
                            if (err) return callbackSeries(err);
                        });

                        callbackSeries();
                    });
                },
            ],

            function (err) {
                callback(err);
            },
        );
    },
    tagPages: function (thesaurusGraphUris, elasticUrl, indexName, wikiUri, callback) {
        async.series(
            [
                //getThesaurusTerms
                function (callbackSeries) {
                    //  var conceptsWords=["area","example","central","control","exploration","liner","center","development","effect","energy","interpretation","lateral","archean","block","coefficient","crust","displacement","distance","forward","fundamental","impact","information","intensity","interface","accuracy","acquisition","amplitude","attenuation","borehole","calculating","change","communication","comparison","computer","conference","convolution","correlation","cube","density","error","fracturing","frequency","impedance","interest","landsat","deformation","earth","activity","black","boundary","color","competition","distribution","evolution","float","history","kinematics","academic","africa","amorphous","application","asia","coast","constant","cretaceous","differential","drift","east","environment","extension","facies","faulting","four","friction","geometry","growth","human","ice","level","light","administration","anhydrite","anisotropy","anomaly","antarctica","anticline","array","astronomy","astrophysics","atlas","atmosphere","axial","azimuth","bahrain","basin","belt","bend","cap","carbon","carbonate","carboniferous","chart","circuit","cleavage","coal","collision","column","component","composition","compression","concentration","concrete","conservation","continent","continuous","convection","convergent","crest","crystal","current","cutting","cycle","damage","decrease","dependent","determining","devonian","diagenesis","diagram","dip","dipmeter","direction","dynamics","earthquake","eccentricity","efficiency","eocene","equator","equilibrium","erosion","europe","evaporite","fabric","factor","fluid","force","foreland","forming","geochemistry","geophysics","glossary","gondwanaland","graptolite","hazard","heat","heating","hook","horizontal","increase","india","input","insolation","integration","iron","island","japan","jurassic","laurasia","layer","lead","liquid","lithology","abandonment","absorption","acceleration","accretion","acoustics","actinolite","activation","air","alignment","alteration","analog","anatase","anchor","anchoring","apatite","applying","appraisal","approximation","aquifer","association","australia","averaging","bali","barite","barrier","battery","beach","bearing","bedding","bibliography","bid","biodegradation","biostratigraphy","bitumen","brazil","breakthrough","brine","brittleness","bubble","budget","buildings","buoy","buoyancy","buried","cable","calcium","calibration","california","caliper","canyon","capacity","carrier","cause","cement","cenozoic","chain","chalcedony","chalk","channel","characteristic","characterization","chemical","chemistry","chert","chlorine","chlorite","circumference","classification","clay","claystone","clinoform","collar","colombia","colorado","company","compound","compressibility","computing","condensate","conglomerate","connection","construction","contouring","contractor","conversion","copper","coring","correction","cost","cristobalite","croatia","crossover","database","decentralization","decollement","deconvolution","deepening","deflection","delta","demand","depletion","deposit","desert","design","detection","detector","device","dewatering","diameter","diatomite","digital","dipole","discriminator","document","domain","dome","downward","drawdown","drop","ductility","dynamite","education","egypt","electrode","electronics","elevation","elongation","embayment","engineer","engineering","entropy","equalizing","equation","equipment","evaluation","examination","explosion","explosive","exsolution","extrapolation","failure","fan","fiber","filling","film","filter","filtrate","fire","focusing","foraminifera","france","generator","geologist","geophone","glass","goethite","government","graben","gradient","granite","graph","gravity","greenland","guinea","gun","gypsum","handling","head","helicopter","hematite","heterogeneity","hinge","histogram","hydrogen","hydrology","hydrophone","identification","illite","imaging","inclination","indicator","industry","injection","inorganic","instrument","instrumentation","inter","interference","interpolation","ireland","isolation","isostasy","isotope","keyboard","laboratory","lake","laser","latitude","length","leon","lidar","lignite","limestone","limonite","linear","abundance","alaska","ambient","avulsion","bentonite","biogeography","bioturbation","borneo","boundstone","breccia","brunei","canada","capsule","cathodoluminescence","cave","cavern","cementing","chenier","china","climate","contamination","cooling","crystallization","decision","diffusion","dolomitization","drainage","dune","electron","flood","gold","grainstone","gravel","halite","indonesia","inlet","intercrystalline","ion","italy","karst","lagoon","lime"]
                    // thesauriiConcepts["test"]={conceptsWords:conceptsWords};

                    async.eachSeries(
                        thesaurusGraphUris,
                        function (graphUri, callbackEach) {
                            if (thesauriiConcepts[graphUri]) {
                                return callbackEach();
                            } else {
                                mediaWikiTagger.getThesaurusConcepts(graphUri, { withIds: true }, function (err, thesaurusConcepts) {
                                    if (err) {
                                        return callbackEach(err);
                                    }
                                    thesauriiConcepts[graphUri] = {
                                        concepts: thesaurusConcepts,
                                    };
                                    callbackEach();
                                });
                            }
                        },
                        function (err) {
                            callbackSeries(err);
                        },
                    );
                },

                //extract TheasurusPageWords in    categoriesRdfTriples and store them
                function (callbackSeries) {
                    var bulkStr = "";
                    //  thesauriiConcepts["test"].subjectsWords.forEach(function (conceptWord) {
                    async.eachSeries(thesaurusGraphUris, function (graphUri, callbackEach) {
                        bulkStr = "";
                        var thesaurusPagesMatchCount = [];
                        var conceptsFound = 0;
                        thesauriiConcepts[graphUri].subjects.forEach(function (concept) {
                            var queryString = "";
                            concept.synonyms.forEach(function (synonym, indexSynonym) {
                                if (indexSynonym > 0) queryString += " OR ";
                                queryString += '\\\\"' + synonym + '\\\\"';
                            });

                            var queryLine = {
                                query: {
                                    query_string: {
                                        query: queryString,
                                    },
                                },

                                from: 0,
                                size: 10000,
                                _source: ["pageName", "categories"],
                            };
                            bulkStr += JSON.stringify({ index: indexName }) + "\r\n";
                            bulkStr += JSON.stringify(queryLine) + "\r\n";
                        });
                        var options = {
                            method: "POST",
                            body: bulkStr,
                            headers: {
                                "content-type": "application/json",
                            },

                            url: elasticUrl + "_msearch",
                        };

                        request(options, function (error, response, _body) {
                            if (error) return callbackSeries(error);
                            var json = JSON.parse(response.body);
                            if (json.error) {
                                return callback(json.error);
                            }
                            var responses = json.responses;

                            var splittedtTriples = [];
                            var triples = [];

                            responses.forEach(function (response, responseIndex) {
                                if (response && response.hits && response.hits.hits.length > 0) {
                                    conceptsFound += 1;
                                    var page = response.hits.hits[0]._source.pageName;
                                    if (thesaurusPagesMatchCount.indexOf(page) < 0) thesaurusPagesMatchCount.push(page);
                                    var concept = thesauriiConcepts[graphUri].subjects[responseIndex];
                                    var categories = response.hits.hits[0]._source.categories;
                                    categories.forEach(function (category) {
                                        if (category == "") return;
                                        var categoryUri = category.replace(/[\r ]/g, "_");
                                        triples.push("<" + concept.id + "> <http://souslesens.org/vocab#wikimedia-category> <" + wikiUri + "Category:" + categoryUri + "> . ");
                                    });
                                    //  triples.push("<" + concept.id + "> <http://souslesens.org/vocab#wikimedia-page> <" + page + "> . ");

                                    if (triples.length > 1000) {
                                        splittedtTriples.push(triples);
                                        triples = [];
                                    }
                                }
                            });
                            splittedtTriples.push(triples);

                            console.log(graphUri + "pages " + thesaurusPagesMatchCount.length + " concepts" + conceptsFound);

                            async.eachSeries(
                                splittedtTriples,
                                function (triples, callbackResponse) {
                                    mediaWikiTagger.storeTriples(graphUri, triples, function (err, _result) {
                                        callbackResponse(err);
                                    });
                                },
                                function (err) {
                                    callbackEach(err);
                                },
                            );
                        });
                    });
                },

                function (callbackSeries) {
                    callbackSeries();
                },
            ],

            function (err) {
                callback(err);
            },
        );
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
            //   "  ?subject  rdf:type skos:Concept." +
            "  ?subject skos:prefLabel ?subjectLabel filter(lang(?subjectLabel)='en') " +
            "  " +
            "}limit " +
            limit;

        var offset = 0;
        var length = 1;
        async.whilst(
            function (callbackTest) {
                //test
                return callbackTest(null, length > 0);
            },
            function iter(callbackWhilst) {
                var params = { query: query + " offset " + offset };
                offset += limit;

                httpProxy.post(mediaWikiTagger.sparqlUrl, null, params, function (err, result) {
                    if (err) {
                        console.log(params.query);
                        return callback(err);
                    }
                    length = result.results.bindings.length;
                    result.results.bindings.forEach(function (item) {
                        var prefLabel = item.subjectLabel.value.toLowerCase();
                        if (options.withIds)
                            thesaurusConcepts.push({
                                id: item.subject.value,
                                prefLabel: prefLabel,
                                synonyms: [prefLabel],
                            });
                        else thesaurusConcepts.push(prefLabel);
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

    storeTriples: function (graphUri, triples, callback) {
        var triplesStr = "";
        triples.forEach(function (triple) {
            triplesStr += triple;
        });

        var query = "INSERT DATA" + "  { " + "    GRAPH <" + graphUri + "> " + "      { " + triplesStr + "}}";
        var params = { query: query };

        httpProxy.post(mediaWikiTagger.sparqlUrl, null, params, function (err, result) {
            if (err) {
                console.log(params.query);
                return callback(err);
            }

            /*
            {
    "head": {
    "link": [],
    "vars": [
      "callret-0"
    ]
    },
    "results": {
    "distinct": false,
    "ordered": true,
    "bindings": [
      {
        "callret-0": {
          "type": "literal",
          "value": "Insert into <http://www.eionet.europa.eu/gemet/>, 328 (or less) triples -- done"
        }
      }
    ]
    }
    }
             */
            console.log(result.results.bindings[0]["callret-0"].value);
            return callback();
        });
    },
    createMediawikiIndex: function (elasticUrl, indexName, callback) {
        var mappings = {
            "mediawiki-pages": {
                properties: {
                    categories: {
                        type: "keyword",
                    },
                    uri: {
                        type: "keyword",
                    },
                    content: {
                        type: "text",
                        term_vector: "with_positions_offsets_payloads",
                        store: false,
                        //  "analyzer": "lowercase_asciifolding",

                        fielddata: true,
                        fields: {
                            raw: {
                                type: "keyword",
                                ignore_above: 256,
                                //  "search_analyzer": "case_insentisitive",
                            },
                        },
                    },
                },
            },
        };
        var json = {
            settings: {
                number_of_shards: 1,
            },
            mappings: mappings,
        };

        var options = {
            method: "PUT",
            description: "create index",
            url: elasticUrl + indexName,
            json: json,
        };

        request(options, function (error, response, body) {
            if (error) return callback(error);
            if (body.error) return callback(body.error);

            return callback();
        });
    },
    deleteTriples: function (_graph) {
        // var query = "DELETE WHERE  {" + "  GRAPH <http://souslesens.org/oil-gas/upstream/>" + "  { ?subject <http://souslesens.org/vocab#wikimedia-category> ?category} }";
    },
    generateCatWordsMatrix: function (categoryWord, thesaurusWord, callback) {
        var limit = 10000;
        var offset = 0;
        var length = 1;
        var catWordsMap = {};
        var Allconcepts = [];

        var filter = "";
        var catFilter = "";
        var thesaurusFilter = "";
        if (categoryWord) catFilter = ' regex(str(?category),"' + categoryWord + '","i")';

        if (thesaurusWord) thesaurusFilter = ' regex(str(?a),"' + thesaurusWord + '","i")';

        if (thesaurusWord && categoryWord) filter = "filter (" + catFilter + " && " + thesaurusFilter + ")";
        else if (categoryWord) filter = "filter (" + catFilter + ")";
        else if (thesaurusWord) filter = "filter (" + thesaurusFilter + ")";

        var query =
            "prefix skos: <http://www.w3.org/2004/02/skos/core#>" +
            "select ?subject ?category   where { GRAPH ?g {" +
            "    ?a <http://souslesens.org/vocab#wikimedia-category> ?category. " +
            filter +
            " ?a skos:prefLabel ?subject filter(lang(?subject)='en')" +
            "?a skos:broader ?broader. ?broader skos:prefLabel ?broaderLabel. filter(lang(?broaderLabel)='en')" +
            " " +
            "" +
            "}} order by ?subject limit " +
            limit;

        async.whilst(
            function (callbackTest) {
                //test
                return callbackTest(null, length > 0 && offset < 10000);
            },
            function iter(callbackWhilst) {
                var params = { query: query + " offset " + offset };
                offset += limit;

                httpProxy.post(mediaWikiTagger.sparqlUrl, null, params, function (err, result) {
                    if (err) {
                        console.log(params.query);
                        return callback(err);
                    }
                    length = result.results.bindings.length;
                    result.results.bindings.forEach(function (item) {
                        var concept = item.subject.value.toLowerCase();
                        var category = item.category.value.toLowerCase();
                        category = category.substring(category.lastIndexOf("/") + 1);
                        if (Allconcepts.indexOf(concept) < 0) Allconcepts.push(concept);
                        if (!catWordsMap[category]) catWordsMap[category] = { concepts: [], occurences: [] };
                        catWordsMap[category].subjects.push(concept);
                    });

                    callbackWhilst();
                });
            },
            function (err, _n) {
                if (err) return callback(err);

                Allconcepts.forEach(function (concept) {
                    for (var category in catWordsMap) {
                        if (catWordsMap[category].subjects.indexOf(concept) > -1) {
                            catWordsMap[category].occurences.push(1);
                        } else catWordsMap[category].occurences.push(0);
                    }
                });

                var str = "";
                for (var category in catWordsMap) {
                    str += category + "\t";
                    catWordsMap[category].occurences.forEach(function (occurence, index) {
                        if (index > 0) str += ",";
                        str += occurence;
                    });
                    str += "";
                }
                fs.writeFileSync("D:\\Total\\2020\\Stephanie\\catWordsMatrix.csv", str);
            },
        );
    },

    indexWikiPages: function (wikiUrl, startMark, endMark, elasticUrl, indexName) {
        var letters = [];
        var totalPages = 0;

        for (var i = 65; i < 91; i++) {
            letters.push(String.fromCharCode(i));
        }

        var indexLetter = 0;
        async.eachSeries(letters, function (letter, callbackEach) {
            if (indexLetter > letters.length - 1) callbackEach();
            // letters.forEach(function(letter,indexLetter){
            console.log("getting pages from " + letter);
            var categoryUrl = wikiUrl + "/index.php?title=Special%3AAllPages&from=" + letters[indexLetter] + "&to=" + letters[indexLetter + 1] + "&namespace=0";
            categoryUrl = wikiUrl + "/wiki/Special:AllPages?from=" + letters[indexLetter] + "&to=" + letters[indexLetter + 1] + "&namespace=0";

            indexLetter++;
            var rawPageText = "";
            var pageText = "";
            var pages = [];
            async.series(
                [
                    //get Page content
                    function (callbackSeries) {
                        httpProxy.get(categoryUrl, {}, function (err, result) {
                            if (err) return callbackSeries(err);
                            rawPageText = result;
                            pageText = rawPageText;
                            return callbackSeries();
                        });
                    },
                    //get usefullTextcontent
                    function (callbackSeries) {
                        if (!startMark) return callbackSeries();
                        var startIndex = rawPageText.indexOf(startMark) + 10;
                        var endIndex = rawPageText.indexOf(endMark, startIndex + 20) + 10;
                        if (startIndex < 0 || endIndex < 0) {
                            console.log("pb  with letter " + letter);
                            return callbackSeries("pb  with letter " + letter);
                        }
                        pageText = rawPageText.substring(startIndex, endIndex);
                        return callbackSeries();
                    },

                    function (callbackSeries) {
                        var regex = /href="([^".]*)"/gm;
                        //   var regex = /href="(\/Category:[^"]*)/gm
                        var array = [];
                        while ((array = regex.exec(pageText)) != null) {
                            pages.push(array[1]);
                        }
                        callbackSeries();
                    },
                    //getPageContent
                    function (callbackSeries) {
                        var excludedPages = ["/PetroWiki:Copyright", "/Help:Editing_a_page", "/PetroWiki:Disclaimer", "#mw-head", "#p-search"];
                        async.eachSeries(
                            pages,
                            function (page, callbackEach2) {
                                if (excludedPages.indexOf(page) > -1) return callbackEach2();

                                totalPages += 1;
                                mediaWikiTagger.indexPage(wikiUrl, page, elasticUrl, indexName, function (err, _result) {
                                    if (err) console.log(err);
                                    else console.log(totalPages + " indexed page  " + page);

                                    callbackEach2();
                                });
                            },
                            function (err) {
                                return callbackSeries(err);
                            },
                        );
                    },
                ],

                function (err) {
                    callbackEach(err);
                },
            );
        });
    },

    listIndexCategories: function (elasticUrl, indexName, callback) {
        var query = {
            _source: ["categories", "pageName"],
            from: 0,
            size: 10000,
        };
        var options = {
            method: "POST",
            json: query,
            headers: {
                "content-type": "application/json",
            },

            url: elasticUrl + indexName + "/_search?q=*",
        };

        request(options, function (error, response, body) {
            if (error) return callback(error);

            var hits = body.hits.hits;
            var allCategories = [];
            var categoriesAssociations = [];
            hits.forEach(function (hit) {
                var categories = hit._source.categories;
                var str = "";
                categories.forEach(function (category, index) {
                    allCategories.push(category);
                    if (index > 0) str += "|";
                    str += category;
                });
                categoriesAssociations.push(str);
            });
        });
    },
    getCategoriesPagesRdf: function (elasticUrl, indexName, wikiUrl) {
        var query = {
            query: {
                match_all: {},
            },
            _source: ["categories", "pageName"],
            from: 0,
            size: 10000,
        };
        var options = {
            method: "POST",
            json: query,
            headers: {
                "content-type": "application/json",
            },

            url: elasticUrl + indexName + "/_search",
        };

        request(options, function (_error, _response, body) {
            var str = "";
            body.hits.hits.forEach(function (hit) {
                var pageName = hit._source.pageName;
                var categories = hit._source.categories;
                categories.forEach(function (category) {
                    str += " <" + wikiUrl + "Category:" + category + "> <http://xmlns.com/foaf/0.1/page> <" + wikiUrl + pageName + ">.";
                });
            });
            console.log(str);
        });
    },

    getWikimediaPageNonThesaurusWords: function (elasticUrl, indexNames, pageName, graphIri, pageCategoryThesaurusWords, callback) {
        var pageAllwords = [];
        var pageAllwordsMap = {};
        var wikiStopWords = [
            "navigation",
            "search",
            "reference",
            "chapter",
            "author",
            "web",
            "page",
            "choice",
            "type",
            "plan",
            "use",
            "figure",
            "majority",
            "today",
            "2b",
            "b",
            "3a",
            "ft",
            "3048160m",
            "need",
            "series",
            "div",
            "classprintfoote",
        ];
        var pageThesaurusWords = [];
        var pageNonThesaurusWords = [];

        var rawPageContent = "";

        async.series(
            [
                //get Page allwords
                function (callbackSeries) {
                    var query = {
                        query: {
                            match: { pageName: pageName },
                        },
                        _source: ["content"],
                        from: 0,
                        size: 1,
                    };

                    var options = {
                        method: "POST",
                        json: query,
                        headers: {
                            "content-type": "application/json",
                        },

                        url: elasticUrl + indexNames + "/_search",
                    };

                    request(options, function (error, response, body) {
                        if (error) return callbackSeries(error);
                        var content = body.hits.hits[0]._source.content;

                        rawPageContent = content.replace(/<[^>]*>/gm, " ");
                        rawPageContent = rawPageContent.replace(/[^A-Za-z0-9 -]/gm, "");

                        callbackSeries();
                    });
                },

                /* query spacy to get nouns in page
                 */

                function (callbackSeries) {
                    var spacyServerUrl = "http://vps475829.ovh.net/spacy/pos";
                    var json = {
                        text: rawPageContent,
                    };

                    httpProxy.post(spacyServerUrl, { "content-type": "application/json" }, json, function (err, result) {
                        if (err) {
                            console.log(err);
                            return callbackSeries(err);
                        }

                        result.data.forEach(function (sentence) {
                            sentence.tags.forEach(function (item) {
                                if (item.tag == "NN") {
                                    item.text = item.text.toLowerCase();
                                    item.text = item.text.replace(/-/g, "").trim();
                                    if (!pageAllwordsMap[item.text]) pageAllwordsMap[item.text] = 0;
                                    pageAllwordsMap[item.text] += 1;
                                }
                            });
                        });
                        callbackSeries();
                    });
                },

                /*  get words not in thesaurus*/
                function (callbackSeries) {
                    var wordsFilter = "";
                    for (var key in pageAllwordsMap) {
                        pageAllwords.push(key);
                    }
                    pageAllwords.forEach(function (word, index) {
                        if (index > 0) wordsFilter += "|";
                        wordsFilter += "^" + word + "$";
                    });

                    var query =
                        "prefix skos: <http://www.w3.org/2004/02/skos/core#>" +
                        "select distinct ?prefLabel   from <" +
                        graphIri +
                        "> " +
                        " where {?subject skos:prefLabel|skos:altLabel ?prefLabel  " +
                        'filter (lang(?prefLabel)="en" && regex(?prefLabel," ' +
                        wordsFilter +
                        '", "i"))' +
                        "} limit 10000";

                    var params = { query: query };

                    httpProxy.post(mediaWikiTagger.sparqlUrl, null, params, function (err, result) {
                        if (err) {
                            console.log(params.query);
                            return callbackSeries(err);
                        }

                        result.results.bindings.forEach(function (item) {
                            pageThesaurusWords.push(item.prefLabel.value.toLowerCase());
                        });

                        callbackSeries();
                    });
                },

                //filter words
                function (callbackSeries) {
                    pageAllwords.forEach(function (word) {
                        if (pageThesaurusWords.indexOf(word) < 0 && pageCategoryThesaurusWords.indexOf(word) < 0 && wikiStopWords.indexOf(word) < 0) {
                            if (word.length > 3) pageNonThesaurusWords.push(word);
                        }
                    });
                    pageNonThesaurusWords.sort();
                    /*   pageNonThesaurusWords.forEach(function(word,index){
                           pageNonThesaurusWords[index]=word+" ("+pageAllwordsMap[word]+")"

                       })*/

                    callbackSeries();
                },
                //check altLabels in Virtuoso thesaurus NOT NECESSARY !!!
                function (callbackSeries) {
                    return callbackSeries();
                    /*
                    var wordsFilter = "";
                    pageNonThesaurusWords.forEach(function (word, index) {
                        if (index > 0) wordsFilter += "|";
                        wordsFilter += "^" + word + "$";
                    });

                    var graphFilter = "";
                    if (graph) {
                        graphFilter = "  from <" + graph + "> ";
                    }

                    var query =
                        "prefix skos: <http://www.w3.org/2004/02/skos/core#>" +
                        "select distinct ?altLabel " +
                        graphFilter +
                        "" +
                        " where {?subject skos:altLabel ?altLabel  " +
                        'filter (lang(?altLabel)="en" && regex(?altLabel," ' +
                        wordsFilter +
                        '", "i"))' +
                        "} limit 1000";

                    var params = { query: query };

                    httpProxy.post(mediaWikiTagger.sparqlUrl, null, params, function (err, result) {
                        if (err) {
                            console.log(params.query);
                            return callback(err);
                        }
                        result.results.bindings.forEach(function (_item) {
                            console.log("!!!!!!!! altLabel word");
                        });
                        callbackSeries();
                    });
                    */
                },
            ],

            function (err) {
                return callback(err, pageNonThesaurusWords);
            },
        );
    },
    setTulsaSchemes: function (graphUri) {
        var schemes = [];
        var str = "";
        async.series(
            [
                function (callbackSeries) {
                    var query =
                        "PREFIX terms:<http://purl.org/dc/terms/>" +
                        "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#>" +
                        "PREFIX rdfsyn:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                        "PREFIX skos:<http://www.w3.org/2004/02/skos/core#>" +
                        "PREFIX elements:<http://purl.org/dc/elements/1.1/>" +
                        "select distinct ?scheme ?schemeLabel " +
                        "from <" +
                        graphUri +
                        ">" +
                        "where{?scheme rdfsyn:type ?type. filter(?type in( <http://www.w3.org/2004/02/skos/core#ConceptScheme>,<http://www.w3.org/2004/02/skos/core#Collection>))?scheme skos:prefLabel|rdfs:label|elements:title ?schemeLabel.?subject skos:broader|skos:topConceptOf|rdfs:isDefinedBy|^terms:subject ?scheme.?subject skos:prefLabel|rdfs:label ?subjectLabel.  }ORDER BY ?subjectLabel limit 10000 ";

                    var params = { query: query };

                    httpProxy.post(mediaWikiTagger.sparqlUrl, null, params, function (err, result) {
                        if (err) {
                            console.log(params.query);
                            console.log(err);
                        }
                        schemes = [];
                        result.results.bindings.forEach(function (item) {
                            schemes.push({ id: item.scheme.value, label: item.schemeLabel.value });
                        });
                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    var iterator = [];
                    for (var i = 1; i < 2; i++) {
                        iterator.push(i);
                    }
                    async.eachSeries(
                        iterator,
                        function (i, callbackEachIterator) {
                            async.eachSeries(
                                schemes,
                                function (scheme, callbackEach) {
                                    console.log("!!!!!!" + scheme.id);
                                    var query =
                                        "prefix skos: <http://www.w3.org/2004/02/skos/core#>prefix foaf: <http://xmlns.com/foaf/0.1/>prefix schema: <http://schema.org/>" +
                                        "with <http://souslesens.org/oil-gas/upstream/>" +
                                        "insert {" +
                                        "  ?subject" +
                                        i +
                                        " <http://www.w3.org/2004/02/skos/core#inScheme> <" +
                                        scheme.id +
                                        "> " +
                                        "  " +
                                        "}" +
                                        "";
                                    query +=
                                        "WHERE{  ?subject1  skos:broader <" +
                                        scheme.id +
                                        ">.  " +
                                        "  optional {?subject2 skos:broader ?subject1. " +
                                        "optional {?subject2 ^skos:broader ?subject3. " +
                                        "optional {?subject3 ^skos:broader ?subject4. " +
                                        "optional {?subject4 ^skos:broader ?subject5.  " +
                                        "optional {?subject5 ^skos:broader ?subject6. " +
                                        "optional {?subject6 ^skos:broader ?subject7. " +
                                        "optional {?subject7 ^skos:broader ?subject8.  " +
                                        "}}}}}}}" +
                                        "  " +
                                        "       } ";
                                    /*
                                        query +=
                                            "WHERE{  ?subject1 ^skos:narrower <" +
                                            scheme.id +
                                            ">.  " +
                                            "  optional {?subject2 ^skos:narrower ?subject1. " +
                                            "optional {?subject2 skos:narrower ?subject3. " +
                                            "optional {?subject3 skos:narrower ?subject4. " +
                                            "optional {?subject4 skos:narrower ?subject5.  " +
                                            "optional {?subject5 skos:narrower ?subject6. " +
                                            "optional {?subject6 skos:narrower ?subject7. " +
                                            "optional {?subject7 skos:narrower ?subject8.  " +
                                            "}}}}}}}" +
                                            "  " +
                                            "       } ";
                                            */
                                    /*
                                        query =
                                            "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>" +
                                            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                                            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                                            "SELECT (count(distinct ?subject) as ?Level1) (count(distinct ?subject2)as ?Level2) " +
                                            "(count(distinct ?subject3) as ?Level3) " +
                                            "(count( distinct ?subject4) as ?Level4) " +
                                            "(count(distinct ?subject5) as ?Level5) " +
                                            "(count(distinct ?subject6) as ?Level6) " +
                                            "(count(distinct ?subject7)  as ?Level7)" +
                                            // "(count(distinct ?subject9) as ?Level8) " +
                                            // "  (count(distinct ?subject9)  as ?Leve9)" +

                                            "" +
                                            "WHERE{  ?subject  skos:broader <" +
                                            scheme.id +
                                            ">.  " +
                                            "  optional {?subject2 skos:broader|^skos:narrower ?subject. " +
                                            "optional {?subject2 ^skos:broader|skos:narrower ?subject3. " +
                                            "optional {?subject3 ^skos:broader|skos:narrower ?subject4. " +
                                            "optional {?subject4 ^skos:broader|skos:narrower ?subject5.  " +
                                            "optional {?subject5 ^skos:broader|skos:narrower ?subject6. " +
                                            "optional {?subject6 ^skos:broader|skos:narrower ?subject7. " +
                                            // "optional {?subject7 ^skos:broader|skos:narrower ?subject8.  " +
                                            // "optional {?subject8 ^skos:broader|skos:narrower ?subject9. " +
                                            // "                }}" +
                                            "}}}}}}" +
                                            "  " +
                                            "       } ";
                                   */

                                    var params = { query: query };

                                    httpProxy.post(mediaWikiTagger.sparqlUrl, null, params, function (err, _result) {
                                        if (err) {
                                            console.log(params.query);
                                            return callbackEach(err);
                                        }
                                        return callbackEach();
                                    });
                                },
                                function (err) {
                                    return callbackEachIterator(err);
                                },
                            );
                        },
                        function (err) {
                            return callbackSeries(err);
                        },
                    );
                },
            ],
            function (err) {
                console.log(str);
                console.log(err);
            },
        );
    },
    listWikiPages: function (elasticUrl, indexName, callback) {
        var query = {
            _source: ["url"],
            from: 0,
            size: 10000,
        };
        var options = {
            method: "POST",
            json: query,
            headers: {
                "content-type": "application/json",
            },

            url: elasticUrl + indexName + "/_search?q=*",
        };

        request(options, function (error, response, body) {
            if (error) return callback(error);

            var hits = body.hits.hits;
            var str = "";
            hits.forEach(function (hit) {
                str += hit._source.url + "\n";
            });
            fs.writeFileSync("D:\\Total\\2020\\Stephanie\\" + indexName + ".csv", str);
        });
    },
};

module.exports = mediaWikiTagger;

//mediaWikiTagger.createMediawikiIndex()

/*
 * var thesaurusGraphUris = [
    "http://souslesens.org/oil-gas/upstream/",
    "http://www.eionet.europa.eu/gemet/",
    "http://data.total.com/resource/thesaurus/ctg/",
    "https://www2.usgs.gov/science/USGSThesaurus/",
];
*/
//var thesaurusGraphUris = ["http://data.total.com/resource/thesaurus/ctg/", "https://www2.usgs.gov/science/USGSThesaurus/"]

//var thesaurusGraphUris = [ "http://www.eionet.europa.eu/gemet/"]
/*
if (false) {
    if (false) {
        wikiUrl = "https://wiki.aapg.org";
        startMark = '<table class="mw-allpages-table-chunk"';
        endMark = "</table>";
        elasticUrl = "xxxx";
        indexName = "mediawiki-pages-aapg";
    }
    if (false) {
        wikiUrl = "https://petrowiki.spe.org";
        startMark = null;
        endMark = null;
        elasticUrl = "xxxx";
        indexName = "mediawiki-pages-spe";
    }

    if (true) {
        wikiUrl = "https://wiki.seg.org";
        startMark = null;
        endMark = null;
        elasticUrl = "xxxx";
        indexName = "mediawiki-pages-seg";
    }
    mediaWikiTagger.indexWikiPages(wikiUrl, startMark, endMark, elasticUrl, indexName);
}

if (false) {
    wikiUrl = "https://wiki.seg.org/wiki/";
    indexName = "mediawiki-pages-seg";

    wikiUrl = "https://wiki.aapg.org/";
    indexName = "mediawiki-pages-aapg";

    wikiUrl = "https://wiki.aapg.org/";
    indexName = "mediawiki-pages-aapg";

    wikiUrl = "https://wiki.aapg.org/";
    indexName = "mediawiki-pages-aapg";

    wikiUrl = "https://petrowiki.spe.org/";
    indexName = "mediawiki-pages-spe";

    elasticUrl = "xxxx";
    thesaurusGraphUris = ["http://souslesens.org/oil-gas/upstream/"]; //, "http://www.eionet.europa.eu/gemet/", "http://data.total.com/resource/thesaurus/ctg/", "https://www2.usgs.gov/science/USGSThesaurus/"]

    //  thesaurusGraphUris = ["http://data.total.com/resource/dictionary/gaia/"];
    thesaurusGraphUris = ["http://www.eionet.europa.eu/gemet/", "http://data.total.com/resource/thesaurus/ctg/", "https://www2.usgs.gov/science/USGSThesaurus/"];
    thesaurusGraphUris = ["https://www2.usgs.gov/science/USGSThesaurus/"];

    thesaurusGraphUris = ["http://data.total.com/resource/acronyms/"];

    thesaurusGraphUris = ["http://resource.geosciml.org/"];

    mediaWikiTagger.tagPages(thesaurusGraphUris, elasticUrl, indexName, wikiUrl, function (err, _result) {
        if (err) console.log(err);
        console.log("Done ");
    });
}

if (false) {
    //mediaWikiTagger.generateCatWordsMatrix("aapg", "gemet", function (err, result) {
    mediaWikiTagger.generateCatWordsMatrix("aapg", null, function (err, _result) {
        if (err) console.log(err);
        console.log("Done ");
    });
}

if (false) {
    elasticUrl = "xxxx";
    indexName = "mediawiki-pages-aapg";
    mediaWikiTagger.listIndexCategories(elasticUrl, indexName);
}
if (false) {
    elasticUrl = "xxxx";
    indexName = "mediawiki-pages-aapg";
    wikiUrl = "https://wiki.aapg.org/";

    wikiUrl = "https://petrowiki.spe.org/";
    indexName = "mediawiki-pages-spe";

    mediaWikiTagger.getCategoriesPagesRdf(elasticUrl, indexName, wikiUrl);
}
//mediaWikiTagger.createMediawikiIndex(elasticUrl,"mediawiki");
if (false) {
    graphUri = "http://data.total.com/resource/thesaurus/ctg/";
    graphUri = "http://www.eionet.europa.eu/gemet/";
    graphUri = "http://souslesens.org/oil-gas/upstream/";
    mediaWikiTagger.setTulsaSchemes(graphUri);
}
if (false) {
    elasticUrl = "xxxx";
    indexName = "mediawiki-pages-aapg";
    indexName = "mediawiki-pages-spe";
    indexName = "mediawiki-pages-seg";
    mediaWikiTagger.listWikiPages(elasticUrl, indexName);
}*/
