//biblio
//https://www.iro.umontreal.ca/~lapalme/ift6281/sparql-1_1-cheat-sheet.pdf
var Sparql_generic = (function () {
        var self = {};
        var defaultPredicates = {
            prefixes: [" terms:<http://purl.org/dc/terms/>",
                " rdfs:<http://www.w3.org/2000/01/rdf-schema#>",
                " rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>",
                " skos:<http://www.w3.org/2004/02/skos/core#>",
                " elements:<http://purl.org/dc/elements/1.1/>"

            ],
            //  topConceptFilter: "?topConcept rdf:type ?type. filter(?type in( <http://www.w3.org/2004/02/skos/core#ConceptScheme>,<http://www.w3.org/2004/02/skos/core#Collection>))"

            topConceptFilter: "?topConcept rdf:type ?topConceptType. filter(?topConceptType in( <http://www.w3.org/2004/02/skos/core#ConceptScheme>))"

            , broaderPredicate: "skos:broader"
            , narrowerPredicate: "skos:narrower"
            , broader: "skos:broader"
            , prefLabel: "skos:prefLabel"
            , altLabel: "skos:altLabel",
            limit: 1000,
            optionalDepth: 5


        }
        self.defaultPredicates = defaultPredicates;

        var source = "";
        var graphUri = "";
        var predicates = "";
        var prefixesStr = "";
        var fromStr = "";
        var topConceptFilter = "";
        var broaderPredicate = "";
        var narrowerPredicate = "";
        var prefLabelPredicate = "";
        var topConceptLangFilter = "";
        var conceptLangFilter = "";
        var limit = "";
        var optionalDepth = 0
        var lang = "";
        var url = "";
        var queryOptions = "&should-sponge=&format=application%2Fsparql-results%2Bjson&timeout=20000&debug=off"


        setVariables = function (sourceLabel) {
            source = ""
            graphUri = ""
            predicates = ""
            prefixesStr = ""
            fromStr = "";
            topConceptFilter = ""
            broaderPredicate = ""
            prefLabelPredicate = ""
            limit = "";
            url = ""
            source = Config.sources[sourceLabel]
            graphUri = source.graphUri;
            predicates = defaultPredicates;
            if (source.predicates)
                predicates = source.predicates


            var prefixes = predicates.prefixes || defaultPredicates.prefixes
            prefixes.forEach(function (item) {
                prefixesStr += "PREFIX " + item + " "
            })

            if (graphUri && graphUri != "") {
                if (!Array.isArray(graphUri))
                    graphUri = [graphUri];
                graphUri.forEach(function (item) {
                    fromStr += " FROM <" + item + "> "
                })
            }


            topConceptFilter = predicates.topConceptFilter || defaultPredicates.topConceptFilter;
            broaderPredicate = predicates.broaderPredicate || defaultPredicates.broaderPredicate;
            narrowerPredicate = predicates.narrowerPredicate || defaultPredicates.narrowerPredicate;
            prefLabelPredicate = predicates.prefLabel || defaultPredicates.prefLabel;
            lang = predicates.lang;
            limit = predicates.limit || defaultPredicates.limit;
            optionalDepth = predicates.optionalDepth || defaultPredicates.optionalDepth;
            url = Config.sources[sourceLabel].sparql_url + "?query=&format=json";
        }


        setFilter = function (varName, ids, words, options) {
            var filter = ";"
            if (words) {
                if (Array.isArray(words)) {
                    var conceptWordStr = ""
                    words.forEach(function (word, index) {
                        if (index > 0)
                            conceptWordStr += "|"
                        if (options.exactMatch)
                            conceptWordStr += "  \"^" + word + "$\"";
                        else
                            conceptWordStr += "  \"" + word + "\"";
                    })
                    filter = " filter( regex(?" + varName + "Label in( " + conceptWordStr + "))) ";
                } else {
                    var filter = "  filter( regex(?" + varName + "Label, \"^" + words + "$\", \"i\"))";
                    if (!options.exactMatch) {
                        filter = " filter( regex(?" + varName + "Label, \"" + words + "\", \"i\"))";

                    }
                }
            } else if (ids) {
                if (Array.isArray(ids)) {
                    var conceptIdsStr = ""
                    ids.forEach(function (id, index) {
                        if (index > 0)
                            conceptIdsStr += ","
                        conceptIdsStr += "<" + id + ">"
                    })
                    filter = "filter(  ?" + varName + " in( " + conceptIdsStr + "))";
                } else {
                    filter = " filter( ?" + varName + " =<" + ids + ">)";
                }

            } else {
                return "";
            }
            return filter;
        }

        function getUriFilter(varName, uri) {
            var filterStr = ""
            if (Array.isArray(uri)) {
                var str = ""
                uri.forEach(function (item, index) {
                    if (index > 0)
                        str += ","
                    str += "<" + item + ">"
                })
                filterStr = "filter (?" + varName + " in (" + str + "))"

            } else {
                filterStr += "filter( ?" + varName + "=<" + uri + ">)."
            }
            return filterStr;
        }


        self.formatString = function (str, forUri) {
            if (!str || !str.replace)
                return null;

            str = str.replace(/&/gm, "and")
            str = str.replace(/'/gm, " ")
            str = str.replace(/\\/gm, "")
            //  str = str.replace(//gm, ".")
            //  str = str.replace(/\r/gm, "")
            //  str = str.replace(/\t/gm, " ")
            // str = str.replace(/\(/gm, "-")
            //  str = str.replace(/\)/gm, "-")
            str = str.replace(/\\xa0/gm, " ")


            return unescape(encodeURIComponent(str));


            if (forUri)
                str = str.replace(/ /gm, "_")


            return str;
        }
        formatUrl = function (str) {
            str = str.replace(/%\d*/gm, "_")
            return str;
        }


        self.getTopConcepts = function (sourceLabel, options, callback) {
            if (!options) {
                options = {}
            }

            setVariables(sourceLabel);


            var query = "";
            query += prefixesStr
            query += " select distinct ?topConcept ?topConceptLabel ?topConceptType " + fromStr + "  WHERE {"
            query += topConceptFilter;
            query += "?topConcept " + prefLabelPredicate + " ?topConceptLabel.";
            if (lang && !options.noLang)
                query += "filter(lang(?topConceptLabel )='" + lang + "')"
            //  query += "?topConcept rdf:type ?topConceptType.  filter( ?topConceptType in (skos:Concept,skos:ConceptScheme))."
            if (false) {
                query += "?concept " + broaderPredicate + " ?topConcept." +
                    "?concept " + prefLabelPredicate + " ?conceptLabel."
                if (lang)
                    query += "filter(lang(?conceptLabel )='" + lang + "')"
            }
            if (options.filterCollections)
            // query+="?collection skos:member+ ?aCollection.?acollection skos:member ?aConcept.?aConcept skos:broader* ?topConcept." + getUriFilter("collection", options.filterCollections)
                query += "?collection skos:member ?aconcept. ?aConcept skos:broader* ?topConcept." + getUriFilter("collection", options.filterCollections)

            query += "  } ORDER BY ?topConceptLabel ";
            query += "limit " + limit + " ";


            Sparql_proxy.querySPARQL_GET_proxy(url, query, queryOptions, null, function (err, result) {
                if (err) {
                    return callback(err)
                }

                return callback(null, result.results.bindings)

            })
        }

        /**
         *
         * request example with collection filtering
         PREFIX  terms:<http://purl.org/dc/terms/> PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> PREFIX  skos:<http://www.w3.org/2004/02/skos/core#> PREFIX  elements:<http://purl.org/dc/elements/1.1/>  select distinct ?child1,?child1Label, ?conceptLabel,?collLabel  FROM <http://souslesens/thesaurus/TEST/>   WHERE {?child1 skos:broader ?concept.

  ?concept skos:prefLabel ?conceptLabel.

  OPTIONAL{ ?child1 skos:prefLabel ?child1Label. } .filter( ?concept =<http://souslesens/thesaurus/TEST/9d53e3925c>)OPTIONAL{?child1 rdf:type ?child1Type.}

  ?collection skos:member* ?acollection. ?acollection rdf:type skos:Collection.   ?collection skos:prefLabel ?collLabel.  ?acollection skos:prefLabel ?acollLabel.filter (?collection= <http://souslesens/thesaurus/TEST/5d97abb964> )
   ?acollection skos:member ?aconcept. ?aconcept rdf:type skos:Concept.?aconcept skos:prefLabel ?aconceptLabel.
  ?childX skos:broader ?aconcept.?childX skos:prefLabel ?childLabel.  ?childX skos:broader* ?child1

}ORDER BY ?child1Label limit 1000

         *
         * @param
            sourceLabel
         * @param
            words
         * @param
            ids
         * @param
            descendantsDepth
         * @param
            options
         * @param
            callback
         */


         self.getNodeChildren = function (sourceLabel, words, ids, descendantsDepth, options, callback) {
            setVariables(sourceLabel);


            var filterStr = setFilter("concept", ids, words, options)

            if (!options) {
                options = {depth: 0}
            }

            var query = "";
            query += prefixesStr;
            query += " select distinct * " + fromStr + "  WHERE {"

            query += "?child1 " + broaderPredicate + " ?concept." +
                "OPTIONAL{ ?child1 " + prefLabelPredicate + " ?child1Label. ";
            if (lang && !options.noLang)
                query += "filter( lang(?child1Label)=\"" + lang + "\")"
            query += "}"
            query += filterStr;
            query += "OPTIONAL{?child1 rdf:type ?child1Type.}"


            descendantsDepth = Math.min(descendantsDepth, optionalDepth);
            for (var i = 1; i < descendantsDepth; i++) {

                query += "OPTIONAL { ?child" + (i + 1) + " " + broaderPredicate + " ?child" + i + "." +
                    "OPTIONAL{?child" + (i + 1) + " " + prefLabelPredicate + "  ?child" + (i + 1) + "Label."
                if (lang && !options.noLang)
                    query += "filter( lang(?child" + (i + 1) + "Label)=\"" + lang + "\")"
                query += "}"
                query += "OPTIONAL {?child" + (i + 1) + " rdf:type ?child" + (i + 1) + "Type.}"
            }
            for (var i = 1; i < descendantsDepth; i++) {
                query += "} "
            }


                
                
                
                
                
                

            query += "}ORDER BY ?child1Label ";
            query += "limit " + limit + " ";


             if ( options.filterCollections) {
                 query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
                     "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
                     "PREFIX  skos:<http://www.w3.org/2004/02/skos/core#> " +
                     " select  distinct * FROM <http://souslesens/thesaurus/TEST/>   WHERE { " +
                     "  ?child1 skos:broader ?concept.   "  + filterStr  +
                     "   ?collection skos:member* ?acollection. "+ getUriFilter("collection", options.filterCollections) +
                     "?acollection rdf:type skos:Collection.    ?acollection skos:member/(^skos:broader+|skos:broader*) ?child1.  " +
                     "  " +
                     "   ?collection skos:prefLabel ?collectionLabel." +
                     "   ?acollection skos:prefLabel ?acollectionLabel." +
                     "   ?concept skos:prefLabel ?conceptLabel." +
                     "   ?child1 skos:prefLabel ?child1Label." +
                     "   ?child1 rdf:type ?child1Type." +
                     "}order by ?concept"
             }


             Sparql_proxy.querySPARQL_GET_proxy(url, query, queryOptions, null, function (err, result) {
                if (err) {
                    return callback(err)
                }
                return callback(null, result.results.bindings);
            })
        }

         self.getNodeParents = function (sourceLabel, words, ids, ancestorsDepth, options, callback) {
            if (!options) {
                options = {depth: 0}
            }
            setVariables(sourceLabel);
            var filterStr = setFilter("concept", ids, words, options)

            var query = "";
            query += prefixesStr;
            query += " select distinct * " + fromStr + "  WHERE {{"

            query += "?concept " + prefLabelPredicate + " ?conceptLabel. ";
            if (lang && !options.noLang)
                query += "filter( lang(?conceptLabel)=\"" + lang + "\")"
            query += filterStr;
            query += "OPTIONAL{?concept rdf:type ?type.}"


            ancestorsDepth = Math.min(ancestorsDepth, optionalDepth);
            for (var i = 1; i <= ancestorsDepth; i++) {
                if (i == 1) {
                    query += "  ?concept " + broaderPredicate + " ?broader" + i + "." +
                        "?broader" + (i) + " " + prefLabelPredicate + " ?broader" + (i) + "Label."
                    if (lang)
                        query += "filter( lang(?broader" + (i) + "Label)=\"" + lang + "\")"

                } else {
                    query += "OPTIONAL { ?broader" + (i - 1) + " " + broaderPredicate + " ?broader" + i + "." +
                        "?broader" + (i) + " " + prefLabelPredicate + " ?broader" + (i) + "Label."
                    if (lang && !options.noLang)
                        query += "filter( lang(?broader" + (i) + "Label)=\"" + lang + "\")"

                }
                query += "?broader" + (i) + " rdf:type ?type."

            }


            for (var i = 1; i < ancestorsDepth; i++) {
                query += "} "
            }


            query += "  }";

            if (options.filterCollections) {
                query += "MINUS {?collection skos:member* ?aCollection.?acollection skos:member ?broader" + getUriFilter("collection", options.filterCollections)
            }
            query += "}limit " + limit + " ";


            Sparql_proxy.querySPARQL_GET_proxy(url, query, queryOptions, null, function (err, result) {
                if (err) {
                    return callback(err)
                }
                return callback(null, result.results.bindings);
            })
        }

        self.getSingleNodeAllAncestors = function (sourceLabel, id, callback) {
            setVariables(sourceLabel);
            var query = "";
            query += prefixesStr;
            query += " select distinct * " + fromStr + "  WHERE {"
            query += "  ?concept " + broaderPredicate + "* ?broader." +
                "filter (?concept=<" + id + ">) " +
                "?broader " + prefLabelPredicate + " ?broaderLabel." +
                "?broader rdf:type ?type."
            if (false && lang)
                query += "filter( lang(?broaderLabel)=\"" + lang + "\")"
            query += "  }";
            query += "limit " + limit + " ";


            Sparql_proxy.querySPARQL_GET_proxy(url, query, queryOptions, null, function (err, result) {
                if (err) {
                    return callback(err)
                }
                return callback(null, result.results.bindings);
            })

        }

        self.getSingleNodeAllDescendants = function (sourceLabel, id, callback) {
            setVariables(sourceLabel);
            var query = "";
            query += prefixesStr;
            query += " select distinct * " + fromStr + "  WHERE {"
            query += "  ?concept ^" + broaderPredicate + "*|" + narrowerPredicate + "* ?narrower." +
                "filter (?concept=<" + id + ">) " +
                "?narrower " + prefLabelPredicate + " ?narrowerLabel." +
                "?narrower rdf:type ?type."
            if (false && lang)
                query += "filter( lang(?narrowerLabel)=\"" + lang + "\")"
            query += "  }";
            query += "limit " + limit + " ";


            Sparql_proxy.querySPARQL_GET_proxy(url, query, queryOptions, null, function (err, result) {
                if (err) {
                    return callback(err)
                }
                return callback(null, result.results.bindings);
            })

        }

        self.getNodeLabel = function (sourceLabel, id, callback) {
            setVariables(sourceLabel);

            var query = "";
            query += prefixesStr;
            query += " select distinct * " + fromStr + "  WHERE {" +
                "?concept   rdf:type   ?type." +
                "?concept " + prefLabelPredicate + " ?conceptLabel." +
                "filter (?concept=<" + id + ">) "
            if (lang)
                query += "filter( lang(?conceptLabel)=\"" + lang + "\")"

            query += "}limit " + limit + " ";


            Sparql_proxy.querySPARQL_GET_proxy(url, query, queryOptions, null, function (err, result) {
                if (err) {
                    return callback(err)
                }
                return callback(null, result.results.bindings);
            })
        }


        self.getNodeInfos = function (sourceLabel, conceptId, options, callback) {
            if (!options)
                options = {}
            setVariables(sourceLabel);
            var filter = getUriFilter("id", conceptId);
            if (options.propertyFilter) {
                filter += getUriFilter("prop", options.propertyFilter);
            }

            var query = " select distinct * " + fromStr + "  WHERE {" +
                " ?id ?prop ?value. " + filter + "} limit 10000";


            Sparql_proxy.querySPARQL_GET_proxy(url, query, queryOptions, null, function (err, result) {
                if (err) {
                    return callback(err);
                }
                return callback(null, result.results.bindings)


            })
        }


        self.getNodesAllTriples = function (sourceLabel, subjectIds, callback) {
            setVariables(sourceLabel);
            var sliceSize = 2000;
            var slices = common.sliceArray(subjectIds, sliceSize);
            var triples = [];
            async.eachSeries(slices, function (slice, callbackEach) {
                var filterStr = "(";
                slice.forEach(function (item, index) {
                    if (index > 0)
                        filterStr += ","
                    filterStr += "<" + item + ">"
                })
                filterStr += ")"

                var query = " select    distinct * " + fromStr + "  WHERE {" +
                    "?subject ?prop ?value. FILTER (?subject in" + filterStr + ")} limit " + sliceSize + 1;
                Sparql_proxy.querySPARQL_GET_proxy(url, query, queryOptions, null, function (err, result) {
                    if (err) {
                        return callbackEach(err);
                    }
                    triples = triples.concat(result.results.bindings)
                    return callbackEach()


                })

            }, function (err) {
                return callback(err, triples)
            })
        }


        self.deleteTriples = function (sourceLabel, subjectUri, predicateUri, objectUri, callback) {
            if (!subjectUri && !subjectUri && !subjectUri)
                return call("no subject predicate and object filter : cannot delete")


            var filterStr = "";
            if (subjectUri)
                filterStr += getUriFilter("s", subjectUri)
            if (predicateUri)
                filterStr += getUriFilter("p", predicateUri)
            if (objectUri)
                filterStr += getUriFilter("o", objectUri)

            var query = "with <" + Config.sources[sourceLabel].graphUri + "> " +
                " DELETE {?s ?p ?o} WHERE{ ?s ?p ?o " + filterStr + "}"

            url = Config.sources[sourceLabel].sparql_url + "?query=&format=json";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, queryOptions, null, function (err, result) {
                if (err) {
                    return callback(err);
                }
                return callback(null, result.results.bindings)

            })

        }

        self.triplesObjectToString = function (item) {
            var valueStr = ""
            if (item.valueType == "uri")
                valueStr = "<" + item.object + ">"
            else {
                var langStr = "";
                if (item.lang)
                    langStr = "@" + item.lang
                valueStr = "'" + item.object + "'" + langStr
            }

            var p = item.predicate.indexOf("^")
            if (p == 0) {
                var predicate = item.predicate.substring(1)
                return valueStr + ' <' + predicate + '> <' + item.subject + '>. ';
            } else
                return "<" + item.subject + '> <' + item.predicate + '> ' + valueStr + '. ';
        }

        self.insertTriples = function (sourceLabel, triples, callback) {
            var graphUri = Config.sources[sourceLabel].graphUri
            var insertTriplesStr = "";
            triples.forEach(function (item, index) {

                insertTriplesStr += self.triplesObjectToString(item);

            })

            var query = " WITH GRAPH  <" + graphUri + ">  " +
                "INSERT DATA" +
                "  {" +
                insertTriplesStr +
                "  }"


            // console.log(query)
            url = Config.sources[sourceLabel].sparql_url + "?query=&format=json";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, null, null, function (err, result) {
                return callback(err);
            })
        }


        self.update = function (sourceLabel, triples, callback) {
            var graphUri = Config.sources[sourceLabel].graphUri
            var deleteTriplesStr = "";
            var insertTriplesStr = "";
            var subject;
            triples.forEach(function (item, index) {

                if (!subject)
                    subject = item.subject;
                insertTriplesStr += self.triplesObjectToString(item);

            })
            deleteTriplesStr += "<?s ?p ?o.";
            var query = " WITH GRAPH  <" + graphUri + ">  " +
                "DELETE" +
                "{  " +
                "?s ?p ?o." +
                "  }" +
                "WHERE" +
                "  {" +
                "?s ?p ?o. filter (?s=<" + subject + ">)" +
                "  };" +
                "" +
                "INSERT DATA" +
                "  {" +
                insertTriplesStr +
                "  }"


            // console.log(query)
            url = Config.sources[sourceLabel].sparql_url + "?query=&format=json";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, null, null, function (err, result) {
                return callback(err);
            })
        }

        self.deleteGraph = function (sourceLabel, callback) {
            graphUri = Config.sources[sourceLabel].graphUri


            var query = " WITH <" + graphUri + "> DELETE {?s ?p ?o}"
            url = Config.sources[sourceLabel].serverUrl + "?query=&format=json";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, null, null, function (err, result) {
                return callback(err);
            })
        }

        self.copyGraph = function (fromSourceLabel, toGraphUri, callback) {
            var fromGraphUri = Config.sources[fromSourceLabel].graphUri;
            var query = " COPY <" + fromGraphUri + "> TO <" + toGraphUri + ">;"
            url = Config.sources[fromSourceLabel].sparql_url + "?query=&format=json";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, null, null, function (err, result) {
                return callback(err);
            })

        }
        /**
         *
         *
         * @param fromSourceLabel
         * @param toGraphUri
         * @param sourceIds
         * @param options :
            * setSubjectFn : function to transform target subjects
         * setPredicateFn : function to transform target predicates
         * setObjectFn : function to transform target objects
         * properties :  optional properties to copy
         *
         * @param callback
         */




        self.copyNodes = function (fromSourceLabel, toGraphUri, sourceIds, options, callback) {
            if (!options) {
                options = {}
            }
            var newTriplesSets = [];
            var newTriples = [];
            var setSize = 100
            async.series([
                // get sources nodes properties
                function (callbackSeries) {
                    self.getNodeInfos(fromSourceLabel, sourceIds, null, function (err, result) {
                        if (err)
                            return callbackSeries(err);
                        result.forEach(function (item) {
                            var subject = item.id.value
                            if (options.setSubjectFn)
                                subject = options.setSubjectFn(item)
                            var prop = item.prop.value;
                            if (options.setPredicateFn)
                                prop = options.setPredicateFn(item)
                            if (options.setObjectFn)
                                valueStr = options.setObjectFn(item)
                            if (!options.properties || options.properties.indexOf(item.prop.value) > -1) {


                                var valueStr = ""
                                if (item.value.type == "uri")
                                    valueStr = "<" + formatUrl(item.value.value) + ">"
                                else {
                                    var langStr = "";
                                    if (item.lang)
                                        langStr = "@" + item.value.lang
                                    valueStr = "'" + self.formatString(item.value.value) + "'" + langStr
                                }

                                newTriples.push("<" + formatUrl(subject) + "> <" + formatUrl(prop) + "> " + valueStr + ".")
                                if (newTriples.length >= setSize) {
                                    newTriplesSets.push(newTriples)
                                    newTriples = []
                                }
                            }

                        })
                        newTriplesSets.push(newTriples)
                        return callbackSeries()
                    })


                },

                //write new triples
                function (callbackSeries) {
                    async.eachSeries(newTriplesSets, function (newTriples, callbackEach) {
                        var insertTriplesStr = "";
                        newTriples.forEach(function (item) {
                            insertTriplesStr += item
                        })
                        var query = " WITH GRAPH  <" + toGraphUri + ">  " +
                            "INSERT DATA" +
                            "  {" +
                            insertTriplesStr +
                            "  }"

                        url = Config.sources[fromSourceLabel].sparql_url + "?query=&format=json";
                        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, null, function (err, result) {
                            return callbackEach(err);
                        })
                    }, function (err) {
                        callbackSeries(err)
                    })
                }

            ], function (err) {
                return callback(err, newTriples.length)

            })

        }

        return self;
    }
)
()
