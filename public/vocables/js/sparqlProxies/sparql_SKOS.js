//biblio
//https://www.iro.umontreal.ca/~lapalme/ift6281/sparql-1_1-cheat-sheet.pdf
/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var Sparql_SKOS = (function () {


        self.getTopConcepts = function (sourceLabel, options, callback) {
            setVariables(sourceLabel);
            var query = "";
            query += prefixesStr
            query += " select distinct ?topConcept ?topConceptLabel " + fromStr + "  WHERE {"
            query += topConceptFilter;
            query += "?topConcept " + prefLabelPredicate + " ?topConceptLabel.";
            if (lang && !options.noLang)
                query += "filter(lang(?topConceptLabel )='" + lang + "')"

            if (options.filterCollections)
                query += "?collection skos:member ?aconcept. ?aConcept skos:broader* ?topConcept." + Sparql_common.getUriFilter("collection", options.filterCollections)

            query += "  } ORDER BY ?topConceptLabel ";
            query += "limit " + limit + " ";

            Sparql_proxy.querySPARQL_GET_proxy(url, query, queryOptions, {source: sourceLabel}, function (err, result) {
                if (err) {
                    return callback(err)
                }
                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, "topConcept")
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
            $("#waitImg").css("display", "block");

            setVariables(sourceLabel);

            var filterStr = Sparql_common.setFilter("concept", ids, words, options)
            if (filterStr == "")
                return alert("no parent specified for getNodeChildren ")
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


            if (options.filterCollections) {

                query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
                    "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
                    "PREFIX  skos:<http://www.w3.org/2004/02/skos/core#> " +
                    " select  distinct * " + fromStr + "   WHERE { " +
                    "  ?child1 skos:broader ?concept.   " + filterStr +
                    "   ?collection skos:member* ?acollection. " + Sparql_common.getUriFilter("collection", options.filterCollections) +
                    "?acollection rdf:type skos:Collection.    ?acollection skos:member/(^skos:broader+|skos:broader*) ?child1.  " +
                    "  " +
                    "   ?collection skos:prefLabel ?collectionLabel." +
                    "   ?acollection skos:prefLabel ?acollectionLabel." +
                    "   ?concept skos:prefLabel ?conceptLabel." +
                    "   ?child1 skos:prefLabel ?child1Label." +
                    "   ?child1 rdf:type ?child1Type." +
                    "}order by ?concept"
                query += "} limit " + limit + " ";
            }


            Sparql_proxy.querySPARQL_GET_proxy(url, query, queryOptions, {source: sourceLabel}, function (err, result) {


                if (err) {
                    return callback(err)
                }
                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["concept", "child"])
                return callback(null, result.results.bindings);
            })
        }


        self.getCollectionNodes = function (sourceLabel, collection, options, callback) {
            $("#waitImg").css("display", "block");

            setVariables(sourceLabel);
            var filterStr = ""
            if (options && options.filter) {

                if (options.filter.predicates) {
                    filterStr = Sparql_common.setFilter("predicate", options.filter.predicates)
                }


            }

            var query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
                "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
                "PREFIX  skos:<http://www.w3.org/2004/02/skos/core#> " +
                " select  distinct * " + fromStr + "   WHERE { " +
                " ?subject ?predicate ?object. " + filterStr+
                "?subject rdf:type ?type. filter( not exists {?subject rdf:type skos:Collection})"

            if (!collection || collection == "") {

                query += "}";

            } else {

                query += "   ?collection skos:member* ?acollection. " + Sparql_common.getUriFilter("collection", collection) +
                    "?acollection rdf:type skos:Collection.    ?acollection skos:member/(^skos:broader+|skos:broader*) ?subject.  " +
                    "   ?collection skos:prefLabel ?collectionLabel." +
                    "   ?acollection skos:prefLabel ?acollectionLabel." +
                    "   ?subject skos:prefLabel ?subjectLabel." +

                    "}"
            }

            query += " limit " + limit + " ";

            Sparql_proxy.querySPARQL_GET_proxy(url, query, queryOptions, {source: sourceLabel}, function (err, result) {


                if (err) {
                    return callback(err)
                }
                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["concept", "child"])
                return callback(null, result.results.bindings);
            })
        }

        self.getNodeParents = function (sourceLabel, words, ids, ancestorsDepth, options, callback) {
            $("#waitImg").css("display", "block");

            if (!options) {
                options = {depth: 0}
            }
            options.source = sourceLabel
            setVariables(sourceLabel);

            var filterStr = Sparql_common.setFilter("concept", ids, words, options)
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
                query += "MINUS {?collection skos:member* ?aCollection.?acollection skos:member ?broader" + Sparql_common.getUriFilter("collection", options.filterCollections)
            }
            var limit = options.limit || Config.queryLimit;
            query += "}limit " + limit + " ";


            Sparql_proxy.querySPARQL_GET_proxy(url, query, queryOptions, options, function (err, result) {

                if (err) {
                    return callback(err)
                }
                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["concept", "broader"])
                return callback(null, result.results.bindings);
            })
        }


        self.getNodeInfos = function (sourceLabel, conceptId, options, callback) {
            $("#waitImg").css("display", "block");
            if (!options)
                options = {}
            options.source = sourceLabel;
            if (Config.sources[sourceLabel].controllerName != "Sparql_SKOS") {
                Config.sources[sourceLabel].controller.getNodeInfos(sourceLabel, conceptId, options, function (err, result) {
                    callback(err, result);
                })
                return;
            }

            setVariables(sourceLabel);
            var filter = Sparql_common.getUriFilter("id", conceptId);
            if (options.propertyFilter) {
                filter += Sparql_common.getUriFilter("prop", options.propertyFilter);
            }

            var query = " select distinct * " + fromStr + "  WHERE {" +
                " ?id ?prop ?value. " + filter + "} limit 10000";


            Sparql_proxy.querySPARQL_GET_proxy(url, query, queryOptions, options, function (err, result) {


                if (err) {
                    return callback(err);
                }
                return callback(null, result.results.bindings)


            })
        }


        self.getItems = function (sourceLabel, options, callback) {

            $("#waitImg").css("display", "block");
            if (!options) {
                options = {}
            }

            if (Config.sources[sourceLabel].controllerName != "Sparql_SKOS") {

                Config.sources[sourceLabel].controller.getItems(sourceLabel, options, function (err, result) {
                    callback(err, result);
                })
                return;
            }


            setVariables(sourceLabel);

            var query = "";
            query += prefixesStr
            query += " select distinct * " + fromStr + "  WHERE {  ?concept ?x ?y. "
            query += "OPTIONAL {?concept " + prefLabelPredicate + " ?conceptLabel.}";

            if (options.filter)
                query += options.filter;


            if (options.lang)
                query += "filter(lang(?conceptLabel )='" + lang + "')"

            if (options.filterCollections)
                query += "?collection skos:member ?concept. " + Sparql_common.getUriFilter("collection", options.filterCollections)

            query += "  } ";
            query += "limit " + limit + " ";


            Sparql_proxy.querySPARQL_GET_proxy(url, query, queryOptions, {source: sourceLabel}, function (err, result) {


                if (err) {
                    return callback(err)
                }
                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, "concept")
                return callback(null, result.results.bindings)

            })
        }


        /*******************************************end basic requests (mode read) **************************************************************/

        self.getSingleNodeAllGenealogy = function (sourceLabel, id, callback) {
            if (Config.sources[sourceLabel].controllerName != "Sparql_SKOS") {
                Config.sources[sourceLabel].controller.getTopConcepts(sourceLabel, {source: sourceLabel}, function (err, result) {
                    callback(err, result);
                })
                return;
            }
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


            Sparql_proxy.querySPARQL_GET_proxy(url, query, queryOptions, {source: sourceLabel}, function (err, result) {
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


            Sparql_proxy.querySPARQL_GET_proxy(url, query, queryOptions, {source: sourceLabel}, function (err, result) {
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


            Sparql_proxy.querySPARQL_GET_proxy(url, query, queryOptions, {source: sourceLabel}, function (err, result) {
                if (err) {
                    return callback(err)
                }
                return callback(null, result.results.bindings);
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
                Sparql_proxy.querySPARQL_GET_proxy(url, query, queryOptions, {source: sourceLabel}, function (err, result) {
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
                filterStr += Sparql_common.getUriFilter("s", subjectUri)
            if (predicateUri)
                filterStr += Sparql_common.getUriFilter("p", predicateUri)
            if (objectUri)
                filterStr += Sparql_common.getUriFilter("o", objectUri)

            var query = "with <" + Config.sources[sourceLabel].graphUri + "> " +
                " DELETE {?s ?p ?o} WHERE{ ?s ?p ?o " + filterStr + "}"

            url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, queryOptions, {source: sourceLabel}, function (err, result) {
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
            url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {source: sourceLabel}, function (err, result) {
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
            url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {source: sourceLabel}, function (err, result) {
                return callback(err);
            })
        }

        self.deleteGraph = function (sourceLabel, callback) {
            graphUri = Config.sources[sourceLabel].graphUri


            var query = " WITH <" + graphUri + "> DELETE {?s ?p ?o}"
            url = Config.sources[sourceLabel].serverUrl + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {source: sourceLabel}, function (err, result) {
                return callback(err);
            })
        }

        self.copyGraph = function (fromSourceLabel, toGraphUri, callback) {
            var fromGraphUri = Config.sources[fromSourceLabel].graphUri;
            var query = " COPY <" + fromGraphUri + "> TO <" + toGraphUri + ">;"
            url = Config.sources[fromSourceLabel].sparql_server.url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {source: fromSourceLabel}, function (err, result) {
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
                        var subject, prop, object;
                        var valueStr = ""
                        result.forEach(function (item) {

                            if (options.setSubjectFn)
                                options.setSubjectFn(item)

                            if (options.setPredicateFn)
                                options.setPredicateFn(item)


                            if (options.setObjectFn)
                                options.setObjectFn(item)

                            subject = item.id.value
                            prop = item.prop.value
                            if (!options.properties || options.properties.indexOf(item.prop.value) > -1) {


                                if (item.value.type == "uri")
                                    valueStr = "<" + item.value.value + ">"
                                else {
                                    var langStr = "";
                                    if (item.value["xml:lang"])
                                        langStr = "@" + item.value["xml:lang"]
                                    valueStr = "'" + Sparql_common.formatString(item.value.value) + "'" + langStr
                                }
                                var triple = "<" + subject + "> <" + prop + "> " + valueStr + "."
                                newTriples.push(triple)


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
                // add additionalTriplesNt
                function (callbackSeries) {
                    if (options.additionalTriplesNt) {
                        options.additionalTriplesNt.forEach(function (triple) {
                            if (newTriples.indexOf(triple) < 0)
                                newTriples.push(triple)
                        })

                    }
                    return callbackSeries();
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

                        url = Config.sources[fromSourceLabel].sparql_server.url + "?format=json&query=";
                        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {source: fromSourceLabel}, function (err, result) {
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

        self.setBindingsOptionalProperties = function (bindings, _field, options) {
            if (!options)
                options = {}
            bindings.forEach(function (item) {

                for (var i = 0; i < 20; i++) {
                    var iStr = "" + i;
                    if (i == 0)
                        iStr = ""
                    var field = _field + "" + iStr;
                    if (!item[field]) {
                        break;
                    }
                    if (!item[field + "Type"]) {
                        if (options.type)
                            item[field + "Type"] = {value: options.type}
                        else
                            item[field + "Type"] = {value: "http://www.w3.org/2004/02/skos/core#Concept"}
                    }
                    var id = item[field].value
                    if (!item[field + "Label"]) {
                        var p = id.lastIndexOf("#")
                        if (p > -1)
                            item[field + "Label"] = {value: id.substring(p + 1)}
                        else {
                            p = id.lastIndexOf("/")
                            item[field + "Label"] = {value: id.substring(p + 1)}
                        }


                    }

                }

                //   item.child1Label={value:id.substring(id.lastIndexOf("#")+1)}
            })
            return bindings;


        }


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
            limit: 10000,
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
        var queryOptions = "";//"&should-sponge=&format=application%2Fsparql-results%2Bjson&timeout=20000&debug=off"


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

            fromStr = Sparql_common.getFromGraphStr(graphUri)


            topConceptFilter = predicates.topConceptFilter || defaultPredicates.topConceptFilter;
            broaderPredicate = predicates.broaderPredicate || defaultPredicates.broaderPredicate;
            narrowerPredicate = predicates.narrowerPredicate || defaultPredicates.narrowerPredicate;
            prefLabelPredicate = predicates.prefLabel || defaultPredicates.prefLabel;
            lang = predicates.lang;
            limit = predicates.limit || defaultPredicates.limit;
            optionalDepth = predicates.optionalDepth || defaultPredicates.optionalDepth;
            url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
        }


        return self;
    }
)
()
