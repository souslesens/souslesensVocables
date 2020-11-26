var httpProxy = require('../../httpProxy.')
var elasticRestProxy = require('../../elasticRestProxy.')
//var superagent = require('superagent')
var request = require('request');
var fs = require('fs')
var async = require('async')
var thesauriiConcepts = {};
var mediaWikiTagger = {
    sparqlUrl: "http://51.178.139.80:8890/sparql/",

    indexPage: function (wikiUri, pageName, elasticUrl, indexName, callback) {
        var rawPageText = "";
        var pageText = "";
        var pageCategories = [];

        var categoriesRdfTriples = "";
        async.series([

                //get Page content
                function (callbackSeries) {

                    httpProxy.get(wikiUri + pageName, {}, function (err, result) {
                        if (err)
                            return callbackSeries(err);
                        rawPageText = result;
                        return callbackSeries()
                    })
                },
                //get usefullTextcontent
                function (callbackSeries) {
                    var strartMark = "bodyContent"
                    var endMark = "printfooter";
                    var startIndex = rawPageText.indexOf(strartMark) + 10;
                    var endIndex = rawPageText.indexOf(endMark) + 10;
                    pageText = rawPageText.substring(startIndex, endIndex);
                    pageText = pageText.replace(/[\t]/g, "")
                    return callbackSeries()


                },
                //getPageCategories
                function (callbackSeries) {
                    pageCategories = []
                    var regex = /wgCategories":\[([^\].]*)/m
                    var regex = /href="\/Category:([^"]*)/gm
                    var regex = /<li><a href="\/Category:([^"^]*)/gm
                    //    var regex = /wgCategories":([^\]]*)/m
                    //  var strCats = regex.exec(rawPageText)
                    var array = []

                    while ((array = regex.exec(rawPageText)) != null) {
                        pageCategories.push(array[1])
                    }
                    ;


                    var regex2 = /<li><a href="\/index\.php\?title=Category:([^"^&]*)/gm
                    var array = []
                    while ((array = regex2.exec(rawPageText)) != null) {
                        pageCategories.push(array[1])
                    }
                    ;

                    var regex3 = /<li><a href="\/wiki\/Category:([^"^&]*)/gm
                    var array = []
                    while ((array = regex3.exec(rawPageText)) != null) {
                        pageCategories.push(array[1])
                    }
                    ;

                    console.log(JSON.stringify(pageCategories))
                    /*   if(array && array.length>0) {

                          var strCats = array[0].replace(/","/g, "|")
                           pageCategories = strCats.replace(/[\[\]]/g, "").replace(/"/g, "").split("|")
                       }*/
                    callbackSeries();
                },

                //indexPageAndCategories
                function (callbackSeries) {
                    var doc = {content: pageText, url: wikiUri + pageName, pageName: pageName.replace("/", ""), categories: pageCategories}
                    var bulkStr = "";
                    bulkStr += JSON.stringify({index: {_index: indexName, _type: "mediawiki-page", _id: doc.uri}}) + "\r"
                    bulkStr += JSON.stringify(doc) + "\r";


                    var options = {
                        method: 'POST',
                        body: bulkStr,
                        encoding: null,
                        headers: {
                            'content-type': 'application/json'
                        },
                        url: elasticUrl + "_bulk?refresh=wait_for"
                    };

                    request(options, function (error, response, body) {
                        if (error)
                            return callbackSeries(error)
                        elasticRestProxy.checkBulkQueryResponse(body, function (err, result) {
                            if (err)
                                return callbackSeries(err);
                        })

                        callbackSeries();
                    })
                }],

            function (err) {

                callback(err)

            }
        )


    },
    tagPages: function (thesaurusGraphUris, elasticUrl, indexName, wikiUri, callback) {

        var x = 3

        async.series([
                //getThesaurusTerms
                function (callbackSeries) {


                    //  var conceptsWords=["area","example","central","control","exploration","liner","center","development","effect","energy","interpretation","lateral","archean","block","coefficient","crust","displacement","distance","forward","fundamental","impact","information","intensity","interface","accuracy","acquisition","amplitude","attenuation","borehole","calculating","change","communication","comparison","computer","conference","convolution","correlation","cube","density","error","fracturing","frequency","impedance","interest","landsat","deformation","earth","activity","black","boundary","color","competition","distribution","evolution","float","history","kinematics","academic","africa","amorphous","application","asia","coast","constant","cretaceous","differential","drift","east","environment","extension","facies","faulting","four","friction","geometry","growth","human","ice","level","light","administration","anhydrite","anisotropy","anomaly","antarctica","anticline","array","astronomy","astrophysics","atlas","atmosphere","axial","azimuth","bahrain","basin","belt","bend","cap","carbon","carbonate","carboniferous","chart","circuit","cleavage","coal","collision","column","component","composition","compression","concentration","concrete","conservation","continent","continuous","convection","convergent","crest","crystal","current","cutting","cycle","damage","decrease","dependent","determining","devonian","diagenesis","diagram","dip","dipmeter","direction","dynamics","earthquake","eccentricity","efficiency","eocene","equator","equilibrium","erosion","europe","evaporite","fabric","factor","fluid","force","foreland","forming","geochemistry","geophysics","glossary","gondwanaland","graptolite","hazard","heat","heating","hook","horizontal","increase","india","input","insolation","integration","iron","island","japan","jurassic","laurasia","layer","lead","liquid","lithology","abandonment","absorption","acceleration","accretion","acoustics","actinolite","activation","air","alignment","alteration","analog","anatase","anchor","anchoring","apatite","applying","appraisal","approximation","aquifer","association","australia","averaging","bali","barite","barrier","battery","beach","bearing","bedding","bibliography","bid","biodegradation","biostratigraphy","bitumen","brazil","breakthrough","brine","brittleness","bubble","budget","buildings","buoy","buoyancy","buried","cable","calcium","calibration","california","caliper","canyon","capacity","carrier","cause","cement","cenozoic","chain","chalcedony","chalk","channel","characteristic","characterization","chemical","chemistry","chert","chlorine","chlorite","circumference","classification","clay","claystone","clinoform","collar","colombia","colorado","company","compound","compressibility","computing","condensate","conglomerate","connection","construction","contouring","contractor","conversion","copper","coring","correction","cost","cristobalite","croatia","crossover","database","decentralization","decollement","deconvolution","deepening","deflection","delta","demand","depletion","deposit","desert","design","detection","detector","device","dewatering","diameter","diatomite","digital","dipole","discriminator","document","domain","dome","downward","drawdown","drop","ductility","dynamite","education","egypt","electrode","electronics","elevation","elongation","embayment","engineer","engineering","entropy","equalizing","equation","equipment","evaluation","examination","explosion","explosive","exsolution","extrapolation","failure","fan","fiber","filling","film","filter","filtrate","fire","focusing","foraminifera","france","generator","geologist","geophone","glass","goethite","government","graben","gradient","granite","graph","gravity","greenland","guinea","gun","gypsum","handling","head","helicopter","hematite","heterogeneity","hinge","histogram","hydrogen","hydrology","hydrophone","identification","illite","imaging","inclination","indicator","industry","injection","inorganic","instrument","instrumentation","inter","interference","interpolation","ireland","isolation","isostasy","isotope","keyboard","laboratory","lake","laser","latitude","length","leon","lidar","lignite","limestone","limonite","linear","abundance","alaska","ambient","avulsion","bentonite","biogeography","bioturbation","borneo","boundstone","breccia","brunei","canada","capsule","cathodoluminescence","cave","cavern","cementing","chenier","china","climate","contamination","cooling","crystallization","decision","diffusion","dolomitization","drainage","dune","electron","flood","gold","grainstone","gravel","halite","indonesia","inlet","intercrystalline","ion","italy","karst","lagoon","lime"]
                    // thesauriiConcepts["test"]={conceptsWords:conceptsWords};

                    async.eachSeries(thesaurusGraphUris, function (graphUri, callbackEach) {
                        if (thesauriiConcepts[graphUri]) {
                            return callbackEach();
                        } else {
                            mediaWikiTagger.getThesaurusConcepts(graphUri, {withIds: true}, function (err, thesaurusConcepts) {
                                if (err) {
                                    return callbackEach(err)
                                }
                                thesauriiConcepts[graphUri] = {concepts: thesaurusConcepts};
                                callbackEach()


                            })

                        }
                    }, function (err) {
                        callbackSeries(err);


                    })


                },


                //extract TheasurusPageWords in    categoriesRdfTriples and store them
                function (callbackSeries) {

                    var bulkStr = "";
                    var synonyms;
                    //  thesauriiConcepts["test"].conceptsWords.forEach(function (conceptWord) {
                    async.eachSeries(thesaurusGraphUris, function (graphUri, callbackEach) {
                        bulkStr = "";
                        var thesaurusPagesMatchCount = []
                        var conceptsFound = 0
                        thesauriiConcepts[graphUri].concepts.forEach(function (concept) {

                            var queryString = "";
                            var shouldQuery = [];
                            concept.synonyms.forEach(function (synonym, indexSynonym) {


                                if (indexSynonym > 0)
                                    queryString += " OR "
                                queryString += "\\\\\"" + synonym + "\\\\\"";

                            })


                            var queryLine = {
                                "query": {
                                    "query_string": {
                                        "query": queryString,


                                    }
                                }


                                ,
                                "from": 0,
                                "size": 10000,
                                "_source": ["pageName", "categories"],

                            }
                            bulkStr += JSON.stringify(({index: indexName})) + "\r\n"
                            bulkStr += JSON.stringify(queryLine) + "\r\n"


                        })
                        var options = {
                            method: 'POST',
                            body: bulkStr,
                            headers: {
                                'content-type': 'application/json'
                            },

                            url: elasticUrl + "_msearch"
                        };


                        request(options, function (error, response, body) {
                            if (error)
                                return callbackSeries(error);
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
                                    if (thesaurusPagesMatchCount.indexOf(page) < 0)
                                        thesaurusPagesMatchCount.push(page);
                                    var concept = thesauriiConcepts[graphUri].concepts[responseIndex];
                                    var categories = response.hits.hits[0]._source.categories
                                    categories.forEach(function (category) {

                                        if (category == "")
                                            return;
                                        var categoryUri = category.replace(/[\r ]/g, "_")
                                        triples.push("<" + concept.id + "> <http://souslesens.org/vocab#wikimedia-category> <" + wikiUri + "Category:" + categoryUri + "> . ");
                                    })
                                    //  triples.push("<" + concept.id + "> <http://souslesens.org/vocab#wikimedia-page> <" + page + "> . ");


                                    if (triples.length > 1000) {
                                        splittedtTriples.push(triples);
                                        triples = [];
                                    }

                                }

                            })
                            splittedtTriples.push(triples);


                            console.log(graphUri + "pages " + thesaurusPagesMatchCount.length + " concepts" + conceptsFound)

                            async.eachSeries(splittedtTriples, function (triples, callbackResponse) {

                                mediaWikiTagger.storeTriples(graphUri, triples, function (err, result) {
                                    callbackResponse(err);

                                })
                            }, function (err) {
                                callbackEach(err);
                            })

                        })
                    })
                }


                , function (callbackSeries) {
                    callbackSeries();


                }


            ],

            function (err) {
                callback(err)
            })

    },


    getThesaurusConcepts: function (thesaurusGraphUri, options, callback) {
        if (!options)
            options = {}
        var limit = 10000;
        var thesaurusConcepts = [];
        var query = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX skos: <http://www.w3.org/2004/02/skos/core#>" +
            "select distinct * from <" + thesaurusGraphUri + "> where{" +
            "  " +
         //   "  ?concept  rdf:type skos:Concept." +
            "  ?concept skos:prefLabel ?conceptLabel filter(lang(?conceptLabel)='en') " +
            "  " +
            "}limit " + limit;

        var offset = 0
        var length = 1
        var result = []
        async.whilst(
            function (callbackTest) {//test
                return callbackTest(null, length > 0);
            },
            function iter(callbackWhilst) {
                var params = {query: (query + " offset " + offset)}
                offset += limit;

                httpProxy.post(mediaWikiTagger.sparqlUrl, null, params, function (err, result) {
                    if (err) {
                        console.log(params.query)
                        return callback(err);
                    }
                    length = result.results.bindings.length
                    result.results.bindings.forEach(function (item) {
                        var prefLabel = item.conceptLabel.value.toLowerCase()
                        if (options.withIds)
                            thesaurusConcepts.push({id: item.concept.value, prefLabel: prefLabel, synonyms: [prefLabel]})
                        else
                            thesaurusConcepts.push(prefLabel)

                    })
                    callbackWhilst()
                })

            },
            function (err, n) {
                if (err)
                    return callback(err);
                callback(null, thesaurusConcepts);

            })

    }

    ,

    storeTriples: function (graphUri, triples, callback) {

        var triplesStr = "";
        triples.forEach(function (triple) {
            if (triple.indexOf("https://wiki.aapg.org/") > -1)
                var x = 3
            triplesStr += triple
        })


        var query = "INSERT DATA" +
            "  { " +
            "    GRAPH <" + graphUri + "> " +
            "      { " + triplesStr + "}}"
        var params = {query: (query)}

        httpProxy.post(mediaWikiTagger.sparqlUrl, null, params, function (err, result) {
            if (err) {
                console.log(params.query)
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
            console.log(result.results.bindings[0]["callret-0"].value)
            return callback()
        })

    }
    ,

    createMediawikiIndex: function (elasticUrl, indexName, callback) {

        var mappings = {
            "mediawiki-pages": {
                "properties": {

                    "categories": {
                        "type": "keyword"
                    },
                    "uri": {
                        "type": "keyword"
                    },
                    "content": {
                        "type": "text",
                        "term_vector": "with_positions_offsets_payloads",
                        "store": false,
                        //  "analyzer": "lowercase_asciifolding",

                        "fielddata": true,
                        "fields": {
                            "raw": {
                                "type": "keyword",
                                "ignore_above": 256,
                                //  "search_analyzer": "case_insentisitive",
                            }
                        }
                    }


                }

            },


        }
        var json =
            {
                "settings": {
                    "number_of_shards": 1
                },
                "mappings": mappings
            }


        var options = {
            method: 'PUT',
            description: "create index",
            url: elasticUrl + indexName,
            json: json
        };

        request(options, function (error, response, body) {
            if (error)
                return callback(error);
            if (body.error)
                return callback(body.error);
            var message = "index " + index + " created"

            return callback();

        })

    }
    ,
    deleteTriples: function (graph) {
        var query = "DELETE WHERE  {" +
            "  GRAPH <http://souslesens.org/oil-gas/upstream/>" +
            "  { ?concept <http://souslesens.org/vocab#wikimedia-category> ?category} }"


    }
    ,


    generateCatWordsMatrix: function (categoryWord, thesaurusWord, callback) {

        var limit = 1000;
        var offset = 0;
        var length = 1;
        var catWordsMap = {};
        var Allconcepts = [];


        var filter = ""
        var catFilter = ""
        var thesaurusFilter = ""
        if (categoryWord)
            catFilter = " regex(str(?category),\"" + categoryWord + "\",\"i\")"

        if (thesaurusWord)
            thesaurusFilter = " regex(str(?a),\"" + thesaurusWord + "\",\"i\")"

        if (thesaurusWord && categoryWord)
            filter = "filter (" + catFilter + " && " + thesaurusFilter + ")"
        else if (categoryWord)
            filter = "filter (" + catFilter + ")"
        else if (thesaurusWord)
            filter = "filter (" + thesaurusFilter + ")"

        var query = "prefix skos: <http://www.w3.org/2004/02/skos/core#>" +
            "select ?concept ?category   where { GRAPH ?g {" +
            "    ?a <http://souslesens.org/vocab#wikimedia-category> ?category. " + filter + " ?a skos:prefLabel ?concept filter(lang(?concept)='en')" +
            "?a skos:broader ?broader. ?broader skos:prefLabel ?broaderLabel. filter(lang(?broaderLabel)='en')" +
            " " +
            "" +
            "}} order by ?concept limit " + limit;

        async.whilst(
            function (callbackTest) {//test
                return callbackTest(null, (length > 0 && offset < 10000));
            },
            function iter(callbackWhilst) {
                var params = {query: (query + " offset " + offset)}
                offset += limit;

                httpProxy.post(mediaWikiTagger.sparqlUrl, null, params, function (err, result) {
                    if (err) {
                        console.log(params.query)
                        return callback(err);
                    }
                    length = result.results.bindings.length
                    result.results.bindings.forEach(function (item) {
                        var concept = item.concept.value.toLowerCase();
                        var category = item.category.value.toLowerCase();
                        category = category.substring(category.lastIndexOf("/") + 1)
                        if (Allconcepts.indexOf(concept) < 0)
                            Allconcepts.push(concept)
                        if (!catWordsMap[category])
                            catWordsMap[category] = {concepts: [], occurences: []};
                        catWordsMap[category].concepts.push(concept);

                    })


                    callbackWhilst()
                })

            },
            function (err, n) {
                if (err)
                    return callback(err);

                Allconcepts.forEach(function (concept) {
                    for (var category in catWordsMap) {
                        if (catWordsMap[category].concepts.indexOf(concept) > -1) {
                            catWordsMap[category].occurences.push(1)
                        } else
                            catWordsMap[category].occurences.push(0)
                    }


                })

                var str = ""
                for (var category in catWordsMap) {
                    str += category + "\t";
                    catWordsMap[category].occurences.forEach(function (occurence, index) {
                        if (index > 0)
                            str += ","
                        str += occurence
                    })
                    str += ""
                }
                fs.writeFileSync("D:\\Total\\2020\\Stephanie\\catWordsMatrix.csv", str)

            })


    },

    indexWikiPages: function (wikiUrl, startMark, endMark, elasticUrl, indexName) {

        var letters = [];
        var totalPages = 0

        for (var i = 65; i < 91; i++) {
            letters.push(String.fromCharCode(i));

        }

        var indexLetter = 0;
        async.eachSeries(letters, function (letter, callbackEach) {
            if (indexLetter > letters.length - 1)
                callbackEach();
            // letters.forEach(function(letter,indexLetter){
            console.log("getting pages from " + letter)
            var categoryUrl = wikiUrl + "/index.php?title=Special%3AAllPages&from=" + letters[indexLetter] + "&to=" + letters[indexLetter + 1] + "&namespace=0"
            var categoryUrl = wikiUrl + "/wiki/Special:AllPages?from=" + letters[indexLetter] + "&to=" + letters[indexLetter + 1] + "&namespace=0"

            indexLetter++;
            var rawPageText = ""
            var pageText = "";
            var pages = [];
            async.series([

                    //get Page content
                    function (callbackSeries) {

                        httpProxy.get(categoryUrl, {}, function (err, result) {
                            if (err)
                                return callbackSeries(err);
                            rawPageText = result;
                            pageText = rawPageText;
                            return callbackSeries()
                        })
                    },
                    //get usefullTextcontent
                    function (callbackSeries) {
                        if (!startMark)
                            return callbackSeries()
                        var startIndex = rawPageText.indexOf(startMark) + 10;
                        var endIndex = rawPageText.indexOf(endMark, startIndex + 20) + 10;
                        if (startIndex < 0 || endIndex < 0) {
                            console.log("pb  with letter " + letter);
                            return callbackSeries("pb  with letter " + letter)
                        }
                        pageText = rawPageText.substring(startIndex, endIndex);
                        return callbackSeries()


                    },


                    function (callbackSeries) {
                        var regex = /href="([^".]*)"/gm;
                        //   var regex = /href="(\/Category:[^"]*)/gm
                        var array = [];
                        while ((array = regex.exec(pageText)) != null) {
                            pages.push(array[1])
                        }
                        var x = pages;
                        callbackSeries();
                    },
                    //getPageContent
                    function (callbackSeries) {

                        var excludedPages = ["/PetroWiki:Copyright", "/Help:Editing_a_page", "/PetroWiki:Disclaimer", "#mw-head", "#p-search"]
                        async.eachSeries(pages, function (page, callbackEach2) {

                            if (excludedPages.indexOf(page) > -1)
                                return callbackEach2();

                            totalPages += 1
                            mediaWikiTagger.indexPage(wikiUrl, page, elasticUrl, indexName, function (err, result) {
                                if (err)
                                    console.log(err)
                                else
                                    console.log(totalPages + " indexed page  " + page)


                                callbackEach2();
                            })
                        }, function (err) {
                            return callbackSeries(err)
                        })
                    }

                ],

                function (err) {

                    callbackEach(err)

                })

        })


    }

    ,
    listIndexCategories: function (elasticUrl, indexName, callback) {
        var query = {
            "_source": ["categories", "pageName"],
            "from": 0,
            "size": 10000
        }
        var options = {
            method: 'POST',
            json: query,
            headers: {
                'content-type': 'application/json'
            },

            url: elasticUrl + indexName + "/_search?q=*"
        };

        request(options, function (error, response, body) {
            if (error)
                return callback(error);

            var hits = body.hits.hits;
            var allCategories = []
            var categoriesAssociations = []
            hits.forEach(function (hit) {
                var categories = hit._source.categories
                var str = ""
                categories.forEach(function (category, index) {
                    allCategories.push(category)
                    if (index > 0)
                        str += "|"
                    str += category
                })
                categoriesAssociations.push(str)

            })
        })
    }
    , getCategoriesPagesRdf: function (elasticUrl, indexName, wikiUrl) {
        var query = {
            "query": {
                "match_all": {}
            },
            "_source": ["categories", "pageName"],
            "from": 0,
            "size": 10000
        }
        var options = {
            method: 'POST',
            json: query,
            headers: {
                'content-type': 'application/json'
            },

            url: elasticUrl + indexName + "/_search"
        };


        request(options, function (error, response, body) {
            if (error)
                return callbackSeries(error);

            var str = ""
            body.hits.hits.forEach(function (hit) {
                var pageName = hit._source.pageName;
                var categories = hit._source.categories
                categories.forEach(function (category) {
                    str += " <" + wikiUrl + "Category:" + category + "> <http://xmlns.com/foaf/0.1/page> <" + wikiUrl + pageName + ">."
                })


            })
            console.log(str)
        })
    }

    ,
    getWikimediaPageNonThesaurusWords: function (elasticUrl, indexNames, pageName, graphIri, pageCategoryThesaurusWords, callback) {

        var pageAllwords = [];
        var pageAllwordsMap = {};
        var wikiStopWords = ["navigation", "search", "reference", "chapter", "author", "web", "page", "choice", "type", "plan", "use", "figure", "majority", "today", "2b", "b", "3a", "ft", "3048160m", "need", "series", "div", "classprintfoote"];
        var pageThesaurusWords = []
        var pageSpecificWords = [];
        var pageNonThesaurusWords = []

        var rawPageContent = "";


        async.series([

                //get Page allwords
                function (callbackSeries) {
                    var query = {
                        "query": {
                            "match": {pageName: pageName}
                        },
                        "_source": ["content",],
                        "from": 0,
                        "size": 1
                    }

                    var options = {
                        method: 'POST',
                        json: query,
                        headers: {
                            'content-type': 'application/json'
                        },

                        url: elasticUrl + indexNames + "/_search"
                    };


                    request(options, function (error, response, body) {
                        if (error)
                            return callbackSeries(error);
                        var content = body.hits.hits[0]._source.content;

                        rawPageContent = content.replace(/<[^>]*>/gm, " ");
                        rawPageContent = rawPageContent.replace(/[^A-Za-z0-9 -]/gm, "");

                        callbackSeries();

                    })
                },


                /* query spacy to get nouns in page
                 */

                function (callbackSeries) {


                 /*   var spacyServerUrl = "http://vps475829.ovh.net:3020/nlp"
                    var json = {
                        "parse": 1,
                        "text": rawPageContent
                    }*/


                    var spacyServerUrl = "http://vps475829.ovh.net/spacy/pos"
                    var json = {
                        "text": rawPageContent
                    }
                    /*     var nlpServer = require('../spacy/nlpServer.')
                         nlpServer.parse(rawPageContent, function (err, result) {*/

                    httpProxy.post(spacyServerUrl, {'content-type': 'application/json'}, json, function (err, result) {
                        if (err) {
                            console.log(err)
                            return callbackSeries(err);
                        }

                        result.data.forEach(function (sentence) {
                            sentence.tags.forEach(function(item) {
                                if (item.tag == "NN") {//item.tag.indexOf("NN")>-1) {
                                    item.text = item.text.toLowerCase();
                                    //  console.log(item.text)
                                    //  item.text= item.text.replace(/[^A-Za-z0-9]/g, '');
                                    item.text = item.text.replace(/-/g, '').trim();
                                    if (!pageAllwordsMap[item.text])
                                        pageAllwordsMap[item.text] = 0;
                                    pageAllwordsMap[item.text] += 1;
                                }
                            })
                        })
                        callbackSeries()
                    })

                },


                /*  get words not in thesaurus*/
                function (callbackSeries) {
                    var wordsFilter = "";
                    for (var key in pageAllwordsMap) {
                        pageAllwords.push(key)
                    }
                    pageAllwords.forEach(function (word, index) {
                        if (index > 0)
                            wordsFilter += "|"
                        wordsFilter += "^" + word + "$";
                    })




                    var query = "prefix skos: <http://www.w3.org/2004/02/skos/core#>" +
                        "select distinct ?prefLabel   from <"+graphIri+"> "+
                        " where {?concept skos:prefLabel|skos:altLabel ?prefLabel  " +
                        "filter (lang(?prefLabel)=\"en\" && regex(?prefLabel,\" " + wordsFilter + "\", \"i\"))" +
                        "} limit 10000"

                    var params = {query: query}

                    httpProxy.post(mediaWikiTagger.sparqlUrl, null, params, function (err, result) {
                        if (err) {
                            console.log(params.query)
                            return callbackSeries(err);
                        }

                        result.results.bindings.forEach(function (item) {
                            pageThesaurusWords.push(item.prefLabel.value.toLowerCase());
                        })

                        callbackSeries()
                    })

                },


//filter words
                function (callbackSeries) {


                    pageAllwords.forEach(function (word) {
                        if (pageThesaurusWords.indexOf(word) < 0 && pageCategoryThesaurusWords.indexOf(word) < 0 && wikiStopWords.indexOf(word) < 0) {
                            if (word.length > 3)
                                pageNonThesaurusWords.push(word);
                        }
                    })
                    pageNonThesaurusWords.sort();
                    /*   pageNonThesaurusWords.forEach(function(word,index){
                           pageNonThesaurusWords[index]=word+" ("+pageAllwordsMap[word]+")"

                       })*/


                    callbackSeries()
                }
                //check altLabels in Virtuoso thesaurus NOT NECESSARY !!!
                , function (callbackSeries) {
                    return callbackSeries()


                    var wordsFilter = "";
                    pageNonThesaurusWords.forEach(function (word, index) {
                        if (index > 0)
                            wordsFilter += "|"
                        wordsFilter += "^" + word + "$";
                    })

                    var graphFilter = "";
                    if (graph) {
                        graphFilter = "  from <" + graph + "> "
                    }


                    var query = "prefix skos: <http://www.w3.org/2004/02/skos/core#>" +
                        "select distinct ?altLabel " + graphFilter + "" +
                        " where {?concept skos:altLabel ?altLabel  " +
                        "filter (lang(?altLabel)=\"en\" && regex(?altLabel,\" " + wordsFilter + "\", \"i\"))" +
                        "} limit 1000"

                    var params = {query: query}


                    httpProxy.post(mediaWikiTagger.sparqlUrl, null, params, function (err, result) {
                        if (err) {
                            console.log(params.query)
                            return callback(err);
                        }
                        result.results.bindings.forEach(function (item) {
                            console.log("!!!!!!!! altLabel word")
                        })
                        callbackSeries()


                    })
                }

            ],

            function (err) {
                return callback(err, pageNonThesaurusWords)
            }
        )


    },
    setTulsaSchemes: function (graphUri) {
        var schemes = [];
        var str = "";
        async.series([
            function (callbackSeries) {
                var query = "PREFIX terms:<http://purl.org/dc/terms/>" +
                    "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#>" +
                    "PREFIX rdfsyn:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                    "PREFIX skos:<http://www.w3.org/2004/02/skos/core#>" +
                    "PREFIX elements:<http://purl.org/dc/elements/1.1/>" +
                    "select distinct ?scheme ?schemeLabel " +
                    "from <" + graphUri + ">" +
                    "where{?scheme rdfsyn:type ?type. filter(?type in( <http://www.w3.org/2004/02/skos/core#ConceptScheme>,<http://www.w3.org/2004/02/skos/core#Collection>))?scheme skos:prefLabel|rdfs:label|elements:title ?schemeLabel.?concept skos:broader|skos:topConceptOf|rdfs:isDefinedBy|^terms:subject ?scheme.?concept skos:prefLabel|rdfs:label ?conceptLabel.  }ORDER BY ?conceptLabel limit 10000 "

                var params = {query: query}


                httpProxy.post(mediaWikiTagger.sparqlUrl, null, params, function (err, result) {
                    if (err) {
                        console.log(params.query)
                        console.log(err);
                    }
                    schemes = [];
                    result.results.bindings.forEach(function (item) {
                        schemes.push({id: item.scheme.value, label: item.schemeLabel.value})
                    })
                    callbackSeries();
                })


            },
            function (callbackSeries) {
                var iterator = []
                for (var i = 1; i < 2; i++) {
                    iterator.push(i)
                }
                async.eachSeries(iterator, function (i, callbackEachIterator) {
                    async.eachSeries(schemes, function (scheme, callbackEach) {

                            console.log("!!!!!!" + scheme.id)
                            var query = "prefix skos: <http://www.w3.org/2004/02/skos/core#>prefix foaf: <http://xmlns.com/foaf/0.1/>prefix schema: <http://schema.org/>" +
                                "with <http://souslesens.org/oil-gas/upstream/>" +
                                "insert {" +
                                "  ?concept" + i + " <http://www.w3.org/2004/02/skos/core#inScheme> <" + scheme.id + "> " +
                                "  " +
                                "}" +
                                ""
                            if (true) {
                                query += "WHERE{  ?concept1  skos:broader <" + scheme.id + ">.  " +
                                    "  optional {?concept2 skos:broader ?concept1. " +
                                    "optional {?concept2 ^skos:broader ?concept3. " +
                                    "optional {?concept3 ^skos:broader ?concept4. " +
                                    "optional {?concept4 ^skos:broader ?concept5.  " +
                                    "optional {?concept5 ^skos:broader ?concept6. " +
                                    "optional {?concept6 ^skos:broader ?concept7. " +
                                    "optional {?concept7 ^skos:broader ?concept8.  " +
                                    "}}}}}}}" +
                                    "  " +
                                    "       } "
                            } else if (false) {
                                query += "WHERE{  ?concept1 ^skos:narrower <" + scheme.id + ">.  " +
                                    "  optional {?concept2 ^skos:narrower ?concept1. " +
                                    "optional {?concept2 skos:narrower ?concept3. " +
                                    "optional {?concept3 skos:narrower ?concept4. " +
                                    "optional {?concept4 skos:narrower ?concept5.  " +
                                    "optional {?concept5 skos:narrower ?concept6. " +
                                    "optional {?concept6 skos:narrower ?concept7. " +
                                    "optional {?concept7 skos:narrower ?concept8.  " +
                                    "}}}}}}}" +
                                    "  " +
                                    "       } "
                            } else {
                                query = "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>" +
                                    "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                                    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                                    "SELECT (count(distinct ?concept) as ?Level1) (count(distinct ?concept2)as ?Level2) " +
                                    "(count(distinct ?concept3) as ?Level3) " +
                                    "(count( distinct ?concept4) as ?Level4) " +
                                    "(count(distinct ?concept5) as ?Level5) " +
                                    "(count(distinct ?concept6) as ?Level6) " +
                                    "(count(distinct ?concept7)  as ?Level7)" +
                                    /*   "(count(distinct ?concept9) as ?Level8) " +
                                       "  (count(distinct ?concept9)  as ?Leve9)" +*/

                                    "" +
                                    "WHERE{  ?concept  skos:broader <" + scheme.id + ">.  " +
                                    "  optional {?concept2 skos:broader|^skos:narrower ?concept. " +
                                    "optional {?concept2 ^skos:broader|skos:narrower ?concept3. " +
                                    "optional {?concept3 ^skos:broader|skos:narrower ?concept4. " +
                                    "optional {?concept4 ^skos:broader|skos:narrower ?concept5.  " +
                                    "optional {?concept5 ^skos:broader|skos:narrower ?concept6. " +
                                    "optional {?concept6 ^skos:broader|skos:narrower ?concept7. " +
                                    /* "optional {?concept7 ^skos:broader|skos:narrower ?concept8.  " +
                                     "optional {?concept8 ^skos:broader|skos:narrower ?concept9. " +
                                     "                }}" +*/
                                    "}}}}}}" +
                                    "  " +
                                    "       } "


                            }





                            var params = {query: query}


                            httpProxy.post(mediaWikiTagger.sparqlUrl, null, params, function (err, result) {
                                if (err) {
                                    console.log(params.query)
                                    return callbackEach(err);
                                }

                                var obj = result.results.bindings[0];

                                for (var i = 1; i < 8; i++) {
                                  ;//  str += scheme.label + "," + i + "," + obj["Level" + i].value + "\n"
                                }

                                // console.log(scheme.id+","+i+","+result.results.bindings[0]["callret-0"].value)
                                return callbackEach();
                            })
                        }
                        , function (err) {

                            return callbackEachIterator(err);
                        })

                }, function (err) {

                    return callbackSeries(err);
                })
            }

        ], function (err) {
            console.log(str)
            console.log(err);
        })
    }
    ,listWikiPages:function(elasticUrl, indexName, callback) {

        var query = {
            "_source": ["url"],
            "from": 0,
            "size": 10000
        }
        var options = {
            method: 'POST',
            json: query,
            headers: {
                'content-type': 'application/json'
            },

            url: elasticUrl + indexName + "/_search?q=*"
        };

        request(options, function (error, response, body) {
            if (error)
                return callback(error);

            var hits = body.hits.hits;
            var str = "";
            hits.forEach(function (hit) {
                str += hit._source.url + "\n";
            })
            fs.writeFileSync("D:\\Total\\2020\\Stephanie\\" + indexName + ".csv", str)
        })
    }

}


module.exports = mediaWikiTagger


//mediaWikiTagger.createMediawikiIndex()


var thesaurusGraphUris = ["http://souslesens.org/oil-gas/upstream/", "http://www.eionet.europa.eu/gemet/", "http://data.total.com/resource/thesaurus/ctg/", "https://www2.usgs.gov/science/USGSThesaurus/"]
//var thesaurusGraphUris = ["http://data.total.com/resource/thesaurus/ctg/", "https://www2.usgs.gov/science/USGSThesaurus/"]

//var thesaurusGraphUris = [ "http://www.eionet.europa.eu/gemet/"]

if (false) {
    if (false) {
        var wikiUrl = "https://wiki.aapg.org"
        var startMark = '<table class=\"mw-allpages-table-chunk"'
        var endMark = "</table>";
        var elasticUrl = "http://vps254642.ovh.net:2009/"
        var indexName = "mediawiki-pages-aapg"
    }
    if (false) {
        var wikiUrl = "https://petrowiki.spe.org"
        var startMark = null;
        var endMark = null;
        var elasticUrl = "http://vps254642.ovh.net:2009/"
        var indexName = "mediawiki-pages-spe"
    }

    if (true) {
        var wikiUrl = "https://wiki.seg.org"
        var startMark = null;
        var endMark = null;
        var elasticUrl = "http://vps254642.ovh.net:2009/"
        var indexName = "mediawiki-pages-seg"
    }
    mediaWikiTagger.indexWikiPages(wikiUrl, startMark, endMark, elasticUrl, indexName);

}


if (true) {

    var wikiUrl = "https://wiki.seg.org/wiki/"
    var indexName = "mediawiki-pages-seg"

    var wikiUrl = "https://wiki.aapg.org/"
    var indexName = "mediawiki-pages-aapg"


    var wikiUrl = "https://wiki.aapg.org/"
    var indexName = "mediawiki-pages-aapg"








    var wikiUrl = "https://wiki.aapg.org/"
    var indexName = "mediawiki-pages-aapg"

    var wikiUrl = "https://petrowiki.spe.org/"
    var indexName = "mediawiki-pages-spe"

    var elasticUrl = "http://vps254642.ovh.net:2009/"
    thesaurusGraphUris = ["http://souslesens.org/oil-gas/upstream/"]//, "http://www.eionet.europa.eu/gemet/", "http://data.total.com/resource/thesaurus/ctg/", "https://www2.usgs.gov/science/USGSThesaurus/"]





    //  thesaurusGraphUris = ["http://data.total.com/resource/dictionary/gaia/"];
    thesaurusGraphUris = ["http://www.eionet.europa.eu/gemet/", "http://data.total.com/resource/thesaurus/ctg/", "https://www2.usgs.gov/science/USGSThesaurus/"]
    thesaurusGraphUris = ["https://www2.usgs.gov/science/USGSThesaurus/"]

    thesaurusGraphUris = ["http://data.total.com/resource/acronyms/"]

    thesaurusGraphUris = ["http://resource.geosciml.org/"]

    mediaWikiTagger.tagPages(thesaurusGraphUris, elasticUrl, indexName, wikiUrl, function (err, result) {
        if (err)
            console.log(err);
        console.log("Done ");


    })
}

if (false) {

    //mediaWikiTagger.generateCatWordsMatrix("aapg", "gemet", function (err, result) {
    mediaWikiTagger.generateCatWordsMatrix("aapg", null, function (err, result) {
        if (err)
            console.log(err);
        console.log("Done ");

    })


}


if (false) {
    var elasticUrl = "http://vps254642.ovh.net:2009/"
    var indexName = "mediawiki-pages-aapg"
    mediaWikiTagger.listIndexCategories(elasticUrl, indexName)

}
if (false) {
    var elasticUrl = "http://vps254642.ovh.net:2009/"
    var indexName = "mediawiki-pages-aapg"
    var wikiUrl = "https://wiki.aapg.org/"

    var wikiUrl = "https://petrowiki.spe.org/"
    var indexName = "mediawiki-pages-spe"

    mediaWikiTagger.getCategoriesPagesRdf(elasticUrl, indexName, wikiUrl)
}
//mediaWikiTagger.createMediawikiIndex(elasticUrl,"mediawiki");
if (false) {
    var graphUri = "http://data.total.com/resource/thesaurus/ctg/"
    var graphUri = "http://www.eionet.europa.eu/gemet/"
    var graphUri = "http://souslesens.org/oil-gas/upstream/"
    mediaWikiTagger.setTulsaSchemes(graphUri);
}
if(false){
    var elasticUrl = "http://vps254642.ovh.net:2009/"
    var indexName = "mediawiki-pages-aapg"
    var indexName = "mediawiki-pages-spe"
    var indexName = "mediawiki-pages-seg"
mediaWikiTagger.listWikiPages(elasticUrl, indexName)

}
