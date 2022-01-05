//biblio
//https://www.iro.umontreal.ca/~lapalme/ift6281/sparql-1_1-cheat-sheet.pdf

/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */





var Sparql_generic = (function () {
        var self = {};
        self.slicesSize = 25;
        sourcesVariables = {}


        self.getSourceVariables = function (sourceLabel) {


            source = Config.sources[sourceLabel]
            if (!sourcesVariables[sourceLabel]) {
                var defaultPredicates;
                if (source.schemaType == "SKOS") {
                    defaultPredicates = Sparql_SKOS.defaultPredicates;

                }

                var source = ""
                var graphUri = ""
                var predicates = ""
                var prefixesStr = ""
                var fromStr = "";
                var topConceptFilter = ""
                var broaderPredicate = ""
                var prefLabelPredicate = ""
                var limit = "";
                var url = ""

                var obj = {}
                var source = Config.sources[sourceLabel]
                obj.graphUri = source.graphUri;
                predicates = defaultPredicates;
                if (source.predicates)
                    predicates = source.predicates

                var prefixes = predicates.prefixes || defaultPredicates.prefixes
                obj.prefixesStr = ""
                prefixes.forEach(function (item) {
                    obj.prefixesStr += "PREFIX " + item + " "
                })
                obj.fromStr = Sparql_common.getFromStr(sourceLabel)
                obj.topConceptFilter = predicates.topConceptFilter || defaultPredicates.topConceptFilter;
                obj.broaderPredicate = predicates.broaderPredicate || defaultPredicates.broaderPredicate;
                obj.narrowerPredicate = predicates.narrowerPredicate || defaultPredicates.narrowerPredicate;
                obj.prefLabelPredicate = predicates.prefLabel || defaultPredicates.prefLabel;
                obj.lang = predicates.lang;
                obj.limit = predicates.limit || defaultPredicates.limit;
                obj.optionalDepth = predicates.optionalDepth || defaultPredicates.optionalDepth;
                obj.url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
                obj.queryOptions = ""
                sourcesVariables[sourceLabel] = obj


            }
            return sourcesVariables[sourceLabel]
        }
        /**********************************************************************************************************************************/
        /**********************************************************************************************************************************/

        self.getTopConcepts = function (sourceLabel, options, callback) {
            $("#waitImg").css("display", "block");
            if (!options) {
                options = {}
            }
            Config.sources[sourceLabel].controller.getTopConcepts(sourceLabel, options, function (err, result) {
                callback(err, result);
            })
        }


        self.getNodeInfos = function (sourceLabel, conceptId, options, callback) {

            $("#waitImg").css("display", "block");
            if (!options)
                options = {}
            Config.sources[sourceLabel].controller.getNodeInfos(sourceLabel, conceptId, options, function (err, result) {
                callback(err, result);
            })

        }

        self.getItems = function (sourceLabel, options, callback) {
            $("#waitImg").css("display", "block");
            if (!options) {
                options = {}
            }
            Config.sources[sourceLabel].controller.getItems(sourceLabel, options, function (err, result) {
                callback(err, result);
            })

        }
        self.getCollectionNodes = function (sourceLabel, collection, options, callback) {
            $("#waitImg").css("display", "block");
            if (!options) {
                options = {}
            }
            Config.sources[sourceLabel].controller.getCollectionNodes(sourceLabel, collection, options, function (err, result) {
                callback(err, result);
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
            if (!options) {
                options = {depth: 0}
            }
            options.source = sourceLabel
            var fitlerType;
            var slices;
            if (ids) {
                if (!Array.isArray(ids))
                    ids = [ids];
                fitlerType = "ids"
                slices = common.array.slice(ids, self.slicesSize)
            }
            if (words && !Array.isArray(words)) {
                words = [words]
                fitlerType = "words"
                slices = common.array.slice(words, self.slicesSize)
            }

            var bulkResult = [];
            async.eachSeries(slices, function (slice, callbackEach) {
                var words = null;
                var ids = null;
                if (fitlerType == "ids")
                    ids = slice;
                else if (fitlerType == "words")
                    words = slice;
                Config.sources[sourceLabel].controller.getNodeChildren(sourceLabel, words, ids, descendantsDepth, options, function (err, result) {
                    if (err)
                        return callbackEach(err);
                    bulkResult = bulkResult.concat(result)
                    callbackEach(null, result);
                })
            }, function (err) {
                return callback(err, bulkResult)
            })
        }


        self.getNodeParents = function (sourceLabel, words, ids, ancestorsDepth, options, callback) {
            if (!Config.sources[sourceLabel] || !Config.sources[sourceLabel].controller)
                return callback(null, [])
            $("#waitImg").css("display", "block");
            if (!options) {
                options = {depth: 0}
            }
            options.source = sourceLabel

            var fitlerType;
            var slices;
            if (ids) {
                if (!Array.isArray(ids))
                    ids = [ids];
                fitlerType = "ids"
                slices = common.array.slice(ids, self.slicesSize)
            }
            if (words) {
                if (!Array.isArray(words))
                    words = [words]
                fitlerType = "words"
                slices = common.array.slice(words, self.slicesSize)
            }

            var bulkResult = [];
            async.eachSeries(slices, function (slice, callbackEach) {
                var words = null;
                var ids = null;
                if (fitlerType == "ids")
                    ids = slice;
                else if (fitlerType == "words")
                    words = slice;
                Config.sources[sourceLabel].controller.getNodeParents(sourceLabel, words, ids, ancestorsDepth, options, function (err, result) {
                    if (err)
                        return callbackEach(err);
                    bulkResult = bulkResult.concat(result)
                    callbackEach(null, result);
                })
            }, function (err) {
                return callback(err, bulkResult)
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
            var sourceVariables = Sparql_generic.getSourceVariables(sourceLabel);
            var query = "";
            query += sourceVariables.prefixesStr;
            query += " select distinct * " + sourceVariables.fromStr + "  WHERE {"
            query += "  ?concept " + sourceVariables.broaderPredicate + "* ?broader." +
                "filter (?concept=<" + id + ">) " +
                "?broader " + sourceVariables.prefLabelPredicate + " ?broaderLabel." +
                "?broader rdf:type ?type."
            if (false && lang)
                query += "filter( lang(?broaderLabel)=\"" + lang + "\")"
            query += "  }";
            query += "limit " + sourceVariables.limit + " ";

            var url = sourceVariables.url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, sourceVariables.queryOptions, {source: sourceLabel}, function (err, result) {
                if (err) {
                    return callback(err)
                }
                return callback(null, result.results.bindings);
            })

        }

        self.getSingleNodeAllDescendants = function (sourceLabel, id, callback) {

            var sourceVariables = Sparql_generic.getSourceVariables(sourceLabel);
            var query = "";
            query += sourceVariables.prefixesStr;
            query += " select distinct * " + sourceVariables.fromStr + "  WHERE {"
            query += "  ?concept ^" + sourceVariables.broaderPredicate + "*|" + sourceVariables.narrowerPredicate + "* ?narrower." +
                "filter (?concept=<" + id + ">) " +
                "?narrower " + sourceVariables.prefLabelPredicate + " ?narrowerLabel." +
                "?narrower rdf:type ?type."
            if (false && sourceVariables.lang)
                query += "filter( lang(?narrowerLabel)=\"" + lang + "\")"
            query += "  }";
            query += "limit " + sourceVariables.limit + " ";

            var url = sourceVariables.url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, sourceVariables.queryOptions, {source: sourceLabel}, function (err, result) {
                if (err) {
                    return callback(err)
                }
                return callback(null, result.results.bindings);
            })

        }

        self.getNodeLabel = function (sourceLabel, id, callback) {
            var sourceVariables = Sparql_generic.getSourceVariables(sourceLabel);
            var query = "";
            query += sourceVariables.prefixesStr;
            query += " select distinct * " + sourceVariables.fromStr + "  WHERE {" +
                "?concept   rdf:type   ?type." +
                "?concept " + sourceVariables.prefLabelPredicate + " ?conceptLabel." +
                "filter (?concept=<" + id + ">) "
            if (lang)
                query += "filter( lang(?conceptLabel)=\"" + lang + "\")"

            query += "}limit " + sourceVariables.limit + " ";


            Sparql_proxy.querySPARQL_GET_proxy(url, query, {}, {source: sourceLabel}, function (err, result) {
                if (err) {
                    return callback(err)
                }
                return callback(null, result.results.bindings);
            })
        }


        self.getNodesAllTriples = function (sourceLabel, subjectIds, callback) {
            var sourceVariables = Sparql_generic.getSourceVariables(sourceLabel);
            var sliceSize = 2000;
            var slices = common.array.slice(subjectIds, sliceSize);
            var triples = [];
            async.eachSeries(slices, function (slice, callbackEach) {
                var filterStr = "(";
                slice.forEach(function (item, index) {
                    if (index > 0)
                        filterStr += ","
                    filterStr += "<" + item + ">"
                })
                filterStr += ")"


                var query = " select    distinct * " + sourceVariables.fromStr + "  WHERE {" +
                    "?subject ?prop ?value. FILTER (?subject in" + filterStr + ")} limit " + sliceSize + 1;
                url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
                Sparql_proxy.querySPARQL_GET_proxy(url, query, sourceVariables.queryOptions, {source: sourceLabel}, function (err, result) {
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
                return callback("no subject predicate and object filter : cannot delete")


            var filterStr = "";
            if (subjectUri)
                filterStr += Sparql_common.getUriFilter("s", subjectUri)
            if (predicateUri)
                filterStr += Sparql_common.getUriFilter("p", predicateUri)
            if (objectUri)
                filterStr += Sparql_common.getUriFilter("o", objectUri)
            var graphUri = Config.sources[sourceLabel].graphUri
            if (Array.isArray(graphUri))
                graphUri = graphUri[0]
            var query = "with <" + graphUri + "> " +
                " DELETE {?s ?p ?o} WHERE{ ?s ?p ?o " + filterStr + "}"
            var queryOptions = ""
            url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, queryOptions, {source: sourceLabel}, function (err, result) {
                if (err) {
                    return callback(err);
                }
                return callback(null, result.results.bindings)

            })

        }

        self.triplesObjectToString = function (item) {
            var subjectStr = ""
            if (item.subject.indexOf("_:b") == 0)
                subjectStr = "<" + item.subject + ">"
            else
                subjectStr = "<" + item.subject + ">"


            var objectStr = ""
            var p;
            if (item.object.indexOf("_:b") == 0)
                objectStr = "<" + item.object + ">"
            else if (item.object.indexOf('http') == 0 || item.valueType == "uri")
                objectStr = "<" + item.object + ">"
            else if ((p = item.object.indexOf("^")) > 0) {//types
                objectStr ="\"'" + item.object.substring(0, p) + "'" + item.object.substring(p)+"\""
            } else {
                var langStr = "";
                if (item.lang)
                    langStr = "@" + item.lang
                objectStr = "'" + item.object + "'" + langStr
            }

            var p = item.predicate.indexOf("^")
            if (p == 0) {
                var predicate = item.predicate.substring(1)
                return objectStr + ' <' + predicate + '> <' + item.subject + '>. ';
            } else
                return subjectStr + ' <' + item.predicate + '> ' + objectStr + '. ';


            /*   if (typeof item === "string")
                   return item


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
                   return "<" + item.subject + '> <' + item.predicate + '> ' + valueStr + '. ';*/
        }

        self.insertTriples = function (sourceLabel, triples,options, callback) {
            var graphUri = Config.sources[sourceLabel].graphUri
            if (Array.isArray(graphUri))
                graphUri = graphUri[0]
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
                return callback(err, triples.length);
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
            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: sourceLabel}, function (err, result) {
                return callback(err);
            })
        }

        self.deleteGraph = function (sourceLabel, callback) {
            graphUri = Config.sources[sourceLabel].graphUri


            var query = " WITH <" + graphUri + "> DELETE {?s ?p ?o}"

            url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
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
        self.getDistinctPredicates = function (sourceLabel, options, callback) {
            $("#waitImg").css("display", "block");
            if (!options) {
                options = {}
            }
            var fromStr = Sparql_common.getFromStr(sourceLabel)
            var query = "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
                "PREFIX  skos:<http://www.w3.org/2004/02/skos/core#> " +
                "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                "select distinct ?p  ?pLabel" + fromStr + " WHERE {?s ?p ?o. optional{?p ?x ?pLabel. filter(?x in (skos:prefLabel,rdfs:label))}}"
            var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {source: sourceLabel}, function (err, result) {
                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["p"])
                return callback(null, result.results.bindings)
            })

        }


        self.copyNodes = function (fromSourceLabel, toGraphUri, sourceIds, options, callback) {
            if (!options) {
                options = {}
            }
            var newTriplesSets = [];
            var newTriples = [];

            var setSize = 100

            if (toGraphUri.charAt(toGraphUri.length - 1) != "/")
                toGraphUri += "/"
            var targetSchemaType = Config.sources[fromSourceLabel].schemaType;
            var urisMap = {}

            function getTargetUri(sourceUri, sourceItem) {
                var targetUri = urisMap[sourceUri]
                if (!targetUri) {

                    if (!options.keepOriginalUris) {
                        var targetUri = " <" + toGraphUri + common.getRandomHexaId(10) + ">"
                        urisMap[sourceUri] = targetUri
                        if (options.addExactMatchPredicate) {
                            var exactMatchPredicate
                            if (targetSchemaType == "SKOS")
                                exactMatchPredicate = "http://www.w3.org/2004/02/skos/core#exactMatch";
                            else
                                exactMatchPredicate = "http://www.w3.org/2000/01/rdf-schema#sameAs";
                            var triple = targetUri + " <" + exactMatchPredicate + "> <" + sourceUri + "> ."
                            newTriples.push(triple)
                        }
                        if (options.setParentNode && options.setParentNode.sourceUri == sourceUri) {
                            var parentPredicate
                            if (targetSchemaType == "SKOS")
                                parentPredicate = "http://www.w3.org/2004/02/skos/core#broader";
                            else
                                parentPredicate = "http://www.w3.org/2000/01/rdf-schema#subClassOf";
                            var triple = targetUri + " <" + parentPredicate + "> <" + options.setParentNode.targetUri + "> ."
                            newTriples.push(triple)

                        }
                        var newTargetType = null;
                        if (targetSchemaType == "SKOS") {
                            newTargetType = "http://www.w3.org/2004/02/skos/core#Concept"
                        } else if (targetSchemaType == "OWL") {
                            newTargetType = "http://www.w3.org/2002/07/owl#Class"
                        }
                        if (newTargetType) {
                            var triple = targetUri + " <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <" + newTargetType + "> ."
                            newTriples.push(triple)
                        }


                    } else {
                        urisMap[sourceUri] = targetUri = "<" + sourceUri + ">"
                    }
                }
                return targetUri;
            }


            async.series([

                // get sources nodes properties
                function (callbackSeries) {
                    self.getNodeInfos(fromSourceLabel, sourceIds, null, function (err, result) {
                        if (err)
                            return callbackSeries(err);
                        var subject, prop, object;
                        var valueStr = "";

                        result.forEach(function (item) {

                            if (options.setSubjectFn)
                                options.setSubjectFn(item)
                            if (options.setPredicateFn)
                                options.setPredicateFn(item)

                            if (options.setObjectFn)
                                options.setObjectFn(item)


                            subject = getTargetUri(item.id.value, item)
                            prop = item.prop.value
                            if (options.excludedProperties && options.excludedProperties.indexOf(prop) > -1)
                                return;
                            if (!options.properties || options.properties.indexOf(item.prop.value) > -1) {

                                var valueStr = null;
                                if (item.prop.value == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
                                    valueStr = "<" + item.value.value + ">"
                                } else if (item.value.type == "uri") {
                                    valueStr = getTargetUri(item.value.value, item)
                                } else {
                                    var langStr = "";
                                    if (item.value["xml:lang"])
                                        langStr = "@" + item.value["xml:lang"]
                                    valueStr = "'" + Sparql_common.formatStringForTriple(item.value.value) + "'" + langStr
                                }


                                var triple = "" + subject + " <" + prop + "> " + valueStr + "."
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

                        var url = Config.sources[fromSourceLabel].sparql_server.url + "?format=json&query=";
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

        self.sortBindings = function (bindings, field, options) {
            bindings.sort(function (a, b) {
                var aValue = (a[field] ? a[field].value : "")
                var bValue = (b[field] ? b[field].value : "")
                if (aValue > bValue)
                    return 1
                if (aValue < bValue)
                    return -1
                return 0;
            })
            return bindings
        }

        self.setBindingsOptionalProperties = function (bindings, _fields, options) {
            if (!options)
                options = {}
            if (!Array.isArray(_fields))
                _fields = [_fields];
            _fields.forEach(function (_field) {
                bindings.forEach(function (item) {


                    for (var i = 0; i < 20; i++) {
                        if (i == 5)
                            var x = 9
                        var iStr = "" + i;
                        if (i == 0)
                            iStr = ""
                        var field = _field + "" + iStr;
                        if (!item[field]) {
                            continue;
                        }
                        if (!options.noType && !item[field + "Type"]) {
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
            })
            return bindings;


        }


        /**
         * Obsolete
         * replaced by getSourceTaxonomy
         * taxonomy is not used
         *
         *
         *
         *
         */
        self.getSourceTaxonomyFromTop = function (sourceLabel, options, callback) {
            var rawData = []
            var topClasses = []
            var taxonomy = {}

            var allClassesMap = {}
            async.series([
                function (callbackSeries) {//get topClasse
                    Sparql_OWL.getTopConcepts(sourceLabel, {}, function (err, result) {
                        if (err)
                            return callbackSeries(err)
                        if (result.length == 0)
                            return callbackSeries("no top classes found  in source" + sourceLabel + ". cannot organize classes lineage")
                        topClasses = result;
                        callbackSeries()
                    })
                },

                function (callbackSeries) {//get raw data subclasses
                    if (!options)
                        options = {}
                    var totalCount = 0
                    var resultSize = 1
                    var limitSize = 2000
                    var offset = 0
                    var fromStr = Sparql_common.getFromStr(sourceLabel)
                    var filterStr = ""
                    var query = "PREFIX owl: <http://www.w3.org/2002/07/owl#>\n" +
                        "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
                        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
                        "SELECT distinct * " + fromStr + " WHERE {\n" +
                        " ?sub rdfs:subClassOf+ ?obj .\n" +
                        "   ?sub rdfs:label ?subLabel .\n" +
                        "   ?obj rdfs:label ?objLabel .\n" +
                        "   ?sub rdf:type owl:Class.\n" +
                        " ?obj rdf:type owl:Class.\n" +
                        "} "
                    async.whilst(function (test) {
                        return resultSize > 0

                    }, function (callbackWhilst) {

                        var query2 = "" + query;
                        query2 += " limit " + limitSize + " offset " + offset

                        self.sparql_url = Config.sources[sourceLabel].sparql_server.url;
                        var url = self.sparql_url + "?format=json&query=";
                        Sparql_proxy.querySPARQL_GET_proxy(url, query2, "", {source: sourceLabel}, function (err, result) {
                            if (err)
                                return callbackWhilst(err);
                            result = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["prop", "domain", "range"])
                            rawData = rawData.concat(result)
                            resultSize = result.length
                            totalCount += result.length
                            MainController.UI.message(sourceLabel + "retreived triples :" + totalCount)
                            offset += resultSize
                            callbackWhilst()
                        })
                    }, function (err) {
                        console.log(totalCount)
                        callbackSeries()
                    })

                },


                function (callbackSeries) {//set each class parent

                    if (true) {


                        var parentChildrenMap = {}
                        rawData.forEach(function (item) {
                            if (!allClassesMap[item.sub.value]) {
                                allClassesMap[item.sub.value] = {
                                    id: item.sub.value,
                                    label: item.subLabel.value,
                                    children: [],
                                    parents: ""
                                }
                            }
                            if (!parentChildrenMap[item.obj.value])
                                parentChildrenMap[item.obj.value] = []
                            parentChildrenMap[item.obj.value].push(item.sub.value)


                        })


                        var x = Object.keys(allClassesMap).length
                        var y = Object.keys(parentChildrenMap).length


                        taxonomy = {
                            id: sourceLabel,
                            label: sourceLabel,
                            children: []
                        }

                        parentChildrenMap[sourceLabel] = []

                        topClasses.forEach(function (item) {
                            parentChildrenMap[sourceLabel].push(item.topConcept.value)


                        })


                        if (true) {
                            var count = 0

                            function recurseChildren(str, classId) {

                                if (parentChildrenMap[classId]) {
                                    str += classId + "|"
                                    parentChildrenMap[classId].forEach(function (childId) {
                                        if (allClassesMap[childId]) {

                                            allClassesMap[childId].parents = str
                                        }
                                        recurseChildren(str, childId)

                                    })


                                } else {

                                }
                            }

                            recurseChildren("", sourceLabel)


                            //  recurseChildren("", "http://w3id.org/readi/rdl/CFIHOS-30000311")


                        }
                    }


                    var x = allClassesMap

                    callbackSeries()
                }

            ], function (err) {

                return callback(err, {tree: taxonomy, classesMap: allClassesMap})

            })


        }

        self.getSourceTaxonomy = function (sourceLabel, options, callback) {
            if (!options)
                options = {}
            var parentType = "rdfs:subClassOf"
            var conceptType = "owl:Class"
            if (Config.sources[sourceLabel].schemaType == "SKOS") {
                parentType == "skos:broader"
                conceptType:"skos:Concept"
            } else if (options.parentType) {
                parentType = options.parentType
                if (parentType == "rdfs:subPropertyOf")
                    conceptType:"owl:ObjectProperty"
            }

            var allClassesMap = {}
            var allData = []


            async.series([


                function (callbackSeries) {//get raw data subclasses
                    if (!options)
                        options = {}
                    var totalCount = 0
                    var resultSize = 1
                    var limitSize = 500
                    var offset = 0

                    var fromStr = Sparql_common.getFromStr(sourceLabel,false,true)

                    var query = "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
                        "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                        "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>" +
                        "SELECT distinct * " +
                        fromStr +
                        " WHERE {" +
                     //   "  ?concept " + parentType + "+ ?parent.OPTIONAL{?concept rdfs:label ?conceptLabel}.OPTIONAL{?parent rdfs:label ?parentLabel.?parent rdf:type " + conceptType + ". } " +
                        "  ?concept " + parentType + "+ ?parent.OPTIONAL{?concept rdfs:label ?conceptLabel}." +
                        "OPTIONAL{?concept skos:prefLabel ?skosLabel}. " +

                        "?concept rdf:type " + conceptType + ". "
                 //   query += "  FILTER (!isBlank(?parent)) "
                    query += "?parent rdf:type owl:Class."
                    if (options.filter)
                        query += " " + options.filter + " "

                    query += "}"

                    async.whilst(function (test) {
                        return resultSize > 0

                    }, function (callbackWhilst) {
                        var query2 = "" + query;
                        query2 += " limit " + limitSize + " offset " + offset

                        self.sparql_url = Config.sources[sourceLabel].sparql_server.url;
                        var url = self.sparql_url + "?format=json&query=";
                        Sparql_proxy.querySPARQL_GET_proxy(url, query2, "", {source: sourceLabel}, function (err, result) {
                            if (err)
                                return callbackWhilst(err);
                            result = result.results.bindings;
                            allData = allData.concat(result)
                            resultSize = result.length
                            totalCount += result.length
                            MainController.UI.message(sourceLabel + "retreived triples :" + totalCount)
                            offset += resultSize
                            callbackWhilst()
                        })
                    }, function (err) {
                        callbackSeries()
                    })


                },
                //format result
                function (callbackSeries) {

                    allData.forEach(function (item) {
                        if(item.concept.value="http://data.total.com/resource/tsf/iso_14224/VA_GA")
                            var x=3
                        if (!allClassesMap[item.concept.value]) {
                            allClassesMap[item.concept.value] = {
                                id: item.concept.value,
                                label: item.conceptLabel ? item.conceptLabel.value : null,
                                skoslabels:item.skosLabel ? item.skosLabel.value:null,
                                parent: item.parent.value,
                                parents: [],
                                type: conceptType,
                            }
                        }
                    })

                    function recurse(nodeId, parents) {
                        var obj = allClassesMap[nodeId]
                        if (!obj)
                            return;
                        if (obj.parent && parents.indexOf(obj.parent) < 0) {
                            parents.push(obj.parent)
                            recurse(obj.parent, parents)

                        }


                    }

                    // chain parents
                    for (var key in allClassesMap) {
                        recurse(key, allClassesMap[key].parents)
                    }
                    var x = allClassesMap
                    //format parents
                    for (var key in allClassesMap) {
                        var obj = allClassesMap[key]
                        var parentArray = obj.parents;
                        parentArray.push(sourceLabel)
                        parentArray = parentArray.reverse()
                        var str = ""
                        parentArray.forEach(function (parent, index) {
                            if (index > 0)
                                str += "|"
                            str += parent;
                        })
                        delete allClassesMap[key].parent
                        allClassesMap[key].parents = str;
                    }
                    callbackSeries()
                }
            ], function (err) {
                return callback(err, {classesMap: allClassesMap})
            })


        }

        return self;
    }
)
()
