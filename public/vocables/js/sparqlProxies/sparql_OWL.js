/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var Sparql_OWL = (function () {

        var self = {};

        var filterCollectionsGenealogyDepth = 4
        self.ancestorsDepth = 6

        var elasticUrl = Config.serverUrl;

        self.getTopConcepts = function (sourceLabel, options, callback) {
            if (!options)
                options = {}
            var fromStr = ""


            var strFilterTopConcept;
            var topClassFilter = Config.sources[sourceLabel].topClassFilter
            if (topClassFilter && topClassFilter != "" && topClassFilter != "_default")
                strFilterTopConcept = topClassFilter;
            else
                strFilterTopConcept = "?topConcept rdf:type  owl:Class. filter(NOT EXISTS {?topConcept rdfs:subClassOf ?z}) "

            self.graphUri = Config.sources[sourceLabel].graphUri;
            self.sparql_url = Config.sources[sourceLabel].sparql_server.url;


            fromStr = Sparql_common.getFromStr(sourceLabel, false, options.withoutImports)

            if (Config.sources[sourceLabel].topClass)
                self.topClass = Config.sources[sourceLabel].topClass;

            var query = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                "prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                "prefix owl: <http://www.w3.org/2002/07/owl#>" +
                "select   distinct ?topConcept  ?topConceptLabel  " + fromStr + "  where {?topConcept rdf:type owl:Class." +
                strFilterTopConcept +
                " OPTIONAL{?topConcept rdfs:label ?topConceptLabel.}"
            if (options.filterCollections)
                query += "?collection skos:member ?aConcept. ?aConcept rdfs:subClassOf+ ?topConcept." + Sparql_common.setFilter("collection", options.filterCollections)
            query += "}order by ?topConceptLabel "
            " }"
            var limit = options.limit || Config.queryLimit;
            query += " limit " + limit
            var url = self.sparql_url + "?format=json&query=";
            self.no_params = Config.sources[sourceLabel].sparql_server.no_params
            if (self.no_params)
                url = self.sparql_url

            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: sourceLabel}, function (err, result) {
                if (err) {
                    return callback(err)
                }
                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, "topConcept", {type: "http://www.w3.org/2002/07/owl#Class"})

                return callback(null, result.results.bindings);
            })
        }


        self.getNodeChildren = function (sourceLabel, words, ids, descendantsDepth, options, callback) {
            if (!options)
                options = {}

            var fromStr = ""


            self.graphUri = Config.sources[sourceLabel].graphUri;
            self.sparql_url = Config.sources[sourceLabel].sparql_server.url;
            var strFilter = "";
            if (words) {
                strFilter = Sparql_common.setFilter("concept", null, words, options)
            } else if (ids) {
                strFilter = Sparql_common.setFilter("concept", ids, null)
            }

            fromStr = Sparql_common.getFromStr(sourceLabel)
            var owlPredicate = "subClassOf";
            if (options.owlType)
                owlPredicate = options.owlType
            var query = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                "prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                "select   distinct * " + fromStr + " where {" +
                "?child1   rdfs:" + owlPredicate + " ?concept.  FILTER (!isBlank(?concept)) " + strFilter +
                "OPTIONAL {?child1 rdfs:label ?child1Label.}"
            if (false && options.skipRestrictions) {
                query += " filter ( NOT EXISTS {?child1 rdfs:subClassOf ?superClass.?superClass rdf:type owl:Restriction}) "
            }

            for (var i = 1; i < descendantsDepth; i++) {

                query += "OPTIONAL { ?child" + (i + 1) + " rdfs:" + owlPredicate + " ?child" + i + "." +
                    "OPTIONAL {?child" + (i + 1) + " rdfs:label  ?child" + (i + 1) + "Label.}"


            }
            for (var i = 1; i < descendantsDepth; i++) {
                query += "} "
            }
            query += "} ";
            " }"


            if (options.filterCollections) {
                var fromStr = Sparql_common.getFromStr(sourceLabel)


                query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
                    "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
                    "PREFIX  skos:<http://www.w3.org/2004/02/skos/core#> " +
                    " select  distinct * " + fromStr + "   WHERE { " +
                    "  ?child1 rdfs:" + owlPredicate + " ?concept.   " + strFilter +
                    "   ?collection skos:member* ?acollection. " + Sparql_generic.Sparql_common.getUriFilter("collection", options.filterCollections) +
                    //"?acollection rdf:type skos:Collection.    ?acollection skos:member/(^rdfs:subClassOf+|rdfs:subClassOf*) ?child1.  " +
                    "?acollection rdf:type skos:Collection.    ?acollection skos:member/(rdfs:" + owlPredicate + "*) ?child1.  " +
                    "  " +
                    "   ?collection skos:prefLabel ?collectionLabel." +
                    "   ?acollection skos:prefLabel ?acollectionLabel." +
                    "   optional{?concept rdfs:label ?conceptLabel.}" +
                    "   ?child1 rdfs:label ?child1Label." +
                    "   ?child1 rdf:type ?child1Type." +

                    "}"
            }
            if (options.sort)
                query += " order by ?" + options.sort + " "
            var limit = options.limit || Config.queryLimit;
            query += " limit " + limit


            var url = self.sparql_url + "?format=json&query=";
            self.no_params = Config.sources[sourceLabel].sparql_server.no_params
            if (self.no_params)
                url = self.sparql_url

            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: sourceLabel}, function (err, result) {
                if (err) {
                    return callback(err)
                }
                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["concept", "child"])
                return callback(null, result.results.bindings)

            })

        }

        self.getNodeInfos = function (sourceLabel, conceptId, options, callback) {
            if (!options)
                options = {}
            var fromStr = ""

            self.graphUri = Config.sources[sourceLabel].graphUri;
            self.sparql_url = Config.sources[sourceLabel].sparql_server.url;

            fromStr = Sparql_common.getFromStr(sourceLabel, options.selectGraph)


            var query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
                "select * " + fromStr +
                " where {"
            if (options.selectGraph)
                query += "graph ?g "
            query += "{<" + conceptId + "> ?prop ?value.  ";
            if (options.getValuesLabels)
                query += "  Optional {?value rdfs:label ?valueLabel}  Optional {?prop rdfs:label ?propLabel} "
            if(true){
                query += "    filter( !isBlank(?value))"
            }
            query += "}"

            if (options.inverseProperties) {
                query += "UNION {?value  ?prop <" + conceptId + "> .  ";
                if (options.getValuesLabels)
                    query += "  Optional {?value rdfs:label ?valueLabel}  Optional {?prop rdfs:label ?propLabel} "
                query += "}"
            }

            query += " }"
            var limit = options.limit || Config.queryLimit;
            query += " limit " + limit

            var url = self.sparql_url + "?format=json&query=";
            self.no_params = Config.sources[sourceLabel].sparql_server.no_params
            if (self.no_params)
                url = self.sparql_url
            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: sourceLabel}, function (err, result) {
                if (err) {
                    return callback(err);
                }
                return callback(null, result.results.bindings)


            })
        }
        /**
         *
         * limit at 4 ancestorsDepth when imports
         *
         * */
        self.getNodeParents = function (sourceLabel, words, ids, ancestorsDepth, options, callback) {

            if (Config.sources[sourceLabel].imports && Config.sources[sourceLabel].imports.length > 0) { //limit at 4 ancestorsDepth when imports
                ancestorsDepth = 4
            }


            self.graphUri = Config.sources[sourceLabel].graphUri;
            self.sparql_url = Config.sources[sourceLabel].sparql_server.url;
            if (!options)
                options = {}
            var strFilter = "";
            if (words) {
                strFilter = Sparql_common.setFilter("concept", null, words, options)
            } else if (ids) {
                strFilter = Sparql_common.setFilter("concept", ids, null)
            }

            var fromStr = Sparql_common.getFromStr(sourceLabel)

            var owlPredicate = "subClassOf";
            if (options.owlType)
                owlPredicate = options.owlType

            var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                "PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
                " select distinct *  " + fromStr + "  WHERE {{"


            //   query += "?concept rdf:type ?type. "
            query += "?concept rdf:type owl:Class. "
            if (words) {
                query += " ?concept rdfs:label ?conceptLabel."
            } else {
                query += " OPTIONAL { ?concept rdfs:label ?conceptLabel.}"
            }


            ancestorsDepth = Math.min(ancestorsDepth, self.ancestorsDepth);

            for (var i = 1; i <= ancestorsDepth; i++) {
                if (i == 1) {

                    query += "  OPTIONAL{?concept rdfs:" + owlPredicate + "  ?broader" + i + "."

                    if (true || options.skipRestrictions) {
                        //  query += " OPTIONAL {?broader1 rdf:type ?broaderType. filter(?broaderType !=owl:Restriction)} "
                        //if  !broader 1 ok  if broader1 it has to be not a restriction
                        query += " ?broader1 rdf:type ?broaderType. filter(?broaderType !=owl:Restriction) "
                    }
                    query += " OPTIONAL{?broader" + (i) + " rdfs:label ?broader" + (i) + "Label.}"


                } else {

                    query += "OPTIONAL { ?broader" + (i - 1) + " rdfs:" + owlPredicate + " ?broader" + i + "."
                    //   "?broader" + i + " rdf:type owl:Class."
                    if (true || options.skipRestrictions) {
                        query += " ?broader" + (i) + " rdf:type ?broaderType" + (i) + ". filter(?broaderType" + (i) + " !=owl:Restriction) "
                    }
                    query += "OPTIONAL{?broader" + (i) + " rdfs:label ?broader" + (i) + "Label.}"

                }


            }


            for (var i = 0; i < ancestorsDepth; i++) {
                query += "} "

            }
            query += " FILTER (!isBlank(?concept))" + strFilter;
            query += "  }}";

            if (options.filterCollections) {
                query += "MINUS {?collection skos:member* ?aCollection.?acollection skos:member ?broader" + Sparql_common.getUriFilter("collection", options.filterCollections)
            }

            var limit = options.limit || Config.queryLimit;
            query += " limit " + limit


            var url = self.sparql_url + "?format=json&query=";
            self.no_params = Config.sources[sourceLabel].sparql_server.no_params
            if (self.no_params)
                url = self.sparql_url
            var method = Config.sources[sourceLabel].server_method;

            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: sourceLabel}, function (err, result) {
                if (err) {
                    return callback(err)
                }
                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["concept", "broader"])
                return callback(null, result.results.bindings)

            })
        }

        self.getItemsOld = function (sourceLabel, options, callback) {

            if (!options) {
                options = {}
            }
            self.graphUri = Config.sources[sourceLabel].graphUri;
            self.sparql_url = Config.sources[sourceLabel].sparql_server.url;


            var fromStr = Sparql_common.getFromStr(sourceLabel, options.selectGraph)


            var query = "";
            query += "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                "PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                "PREFIX owl: <http://www.w3.org/2002/07/owl#>"


            query += " select distinct * " + fromStr + "  WHERE {"
            if (options.selectGraph)
                query += " graph ?g"
            query += "{ ?concept ?x ?y. FILTER (!isBlank(?concept))"
            query += "OPTIONAL {?concept rdfs:label ?conceptLabel.}";
            query += "OPTIONAL {?concept rdf:type ?conceptType.}";

            if (options.filter)
                query += options.filter;
            if (options.lang)
                query += "filter(lang(?conceptLabel )='" + lang + "')"

            query += "  }} ";

            var limit = options.limit || Config.queryLimit;
            query += " limit " + limit

            var url = self.sparql_url + "?format=json&query=";
            self.no_params = Config.sources[sourceLabel].sparql_server.no_params
            if (self.no_params)
                url = self.sparql_url
            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: sourceLabel}, function (err, result) {


                if (err) {
                    return callback(err)
                }

                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, "concept")
                return callback(null, result.results.bindings)

            })
        }
        self.getIndividualProperties = function (sourceLabel, subjectIds, propertyIds, objectIds, options, callback) {
            if (!options)
                options = {}

            function query(subjectIds, propertyIds, objectIds, callbackQuery) {
                var filterStr = ""
                if (subjectIds)
                    filterStr += Sparql_common.setFilter("subject", subjectIds);
                if (objectIds)
                    filterStr += Sparql_common.setFilter("object", objectIds);
                if (propertyIds)
                    filterStr += Sparql_common.setFilter("property", propertyIds);
                self.graphUri = Config.sources[sourceLabel].graphUri;
                self.sparql_url = Config.sources[sourceLabel].sparql_server.url;

                var fromStr = Sparql_common.getFromStr(sourceLabel)


                var query =
                    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                    "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
                    "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>";
                if (options.distinct)
                    query += "select distinct ?" + options.distinct + " "
                else
                    query += "select distinct ?subject ?property ?object "
                query += fromStr +
                    " WHERE {?subject ?property ?object. " + filterStr + " " +

                    "OPTIONAL{?property rdfs:label ?propertyLabel.}  " +
                    " OPTIONAL{?subject rdfs:label ?subjectLabel.}  " +
                    " OPTIONAL{?object rdfs:label ?objectLabel.}  " +

                    " } order by ?propertyLabel "
                var limit = options.limit || Config.queryLimit;
                query += " limit " + limit


                var url = self.sparql_url + "?format=json&query=";
                self.no_params = Config.sources[sourceLabel].sparql_server.no_params
                if (self.no_params)
                    url = self.sparql_url
                Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: sourceLabel}, function (err, result) {


                    if (err) {
                        return callbackQuery(err)
                    }
                    result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["object", "property", "subject"])
                    return callbackQuery(null, result.results.bindings)

                })
            }


            var slicedSubjectIds = null;
            var slicedObjectIds = null;

            var allResults = []
            if (subjectIds) {
                slicedSubjectIds = common.array.slice(subjectIds, Sparql_generic.slicesSize)
                async.eachSeries(slicedSubjectIds, function (subjectIds, callbackEach) {
                    query(subjectIds, propertyIds, objectIds, function (err, result) {
                        if (err)
                            return callback(err)
                        allResults = allResults.concat(result);
                        callbackEach()
                    })
                }, function (err) {
                    return callback(err, allResults)
                })


            } else if (objectIds) {
                slicedObjectIds = common.array.slice(slicedObjectIds, Sparql_generic.slicesSize)

                async.eachSeries(slicedObjectIds, function (objectIds, callbackEach) {
                    query(subjectIds, propertyIds, objectIds, function (err, result) {
                        if (err)
                            return callback(err)
                        allResults = allResults.concat(result);
                        callbackEach()
                    })
                }, function (err) {
                    return callback(err, allResults)
                })


            } else {
                query(subjectIds, propertyIds, objectIds, function (err, result) {
                    return callback(err, result)

                })
            }


        }

        self.getItems = function (sourceLabel, options, callback) {

            if (!options) {
                options = {}
            }
            self.graphUri = Config.sources[sourceLabel].graphUri;
            self.sparql_url = Config.sources[sourceLabel].sparql_server.url;


            var fromStr = Sparql_common.getFromStr(sourceLabel, options.selectGraph, options.withoutImports)


            var query = "";
            query += "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                "PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                "PREFIX owl: <http://www.w3.org/2002/07/owl#>"


            query += " select distinct * " + fromStr + "  WHERE {"

            if (options.selectGraph)
                query += " graph ?g "
            query += "{ ?concept ?p ?o.";
            if (!options.includeBlankNodes)
                query += "FILTER (!isBlank(?concept))"
            query += "OPTIONAL {?concept rdfs:label ?conceptLabel.}";
            query += "OPTIONAL {?concept rdf:type ?conceptType.}";
            query += "OPTIONAL {?concept rdfs:subClassOf ?superClass. }";

            if (options.filter)
                query += options.filter;
            if (options.lang)
                query += "filter(lang(?conceptLabel )='" + lang + "')"

            query += "  }} ";

            var limit = options.limit || Config.queryLimit;
            query += " limit " + limit

            var url = self.sparql_url + "?format=json&query=";
            self.no_params = Config.sources[sourceLabel].sparql_server.no_params
            if (self.no_params)
                url = self.sparql_url
            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: sourceLabel}, function (err, result) {


                if (err) {
                    return callback(err)
                }

                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, "concept")
                return callback(null, result.results.bindings)

            })
        }
        self.getObjectProperties = function (sourceLabel, ids, options, callback) {

            if (!options) {
                options = {}
            }
            var filterStr = "";
            if (ids)
                filterStr = Sparql_common.setFilter("domain", ids);
            if (options.inverseRestriction)
                filterStr = Sparql_common.setFilter("range", ids);
            if (options.propIds)
                filterStr = Sparql_common.setFilter("prop", options.propIds);
            if (options.subPropIds)
                filterStr = Sparql_common.setFilter("subProp", options.subPropIds);
            if (options.filter)
                filterStr = options.filter;
            self.graphUri = Config.sources[sourceLabel].graphUri;
            self.sparql_url = Config.sources[sourceLabel].sparql_server.url;

            var fromStr = Sparql_common.getFromStr(sourceLabel, options.selectGraph)


            var query = "PREFIX type: <http://info.deepcarbon.net/schema/type#>" +
                "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
                "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                "select distinct ?domain ?prop ?range ?domainLabel ?propLabel ?rangeLabel ?subProp ?subPropLabel" + fromStr +
                " WHERE {"
            if (options.selectGraph)
                query += " graph ?g "
            if (options.inheritedProperties)
                query += "  { ?prop rdfs:subPropertyOf*/rdf:type owl:ObjectProperty "

            else
                query += "   {?prop rdf:type owl:ObjectProperty "

            query += "OPTIONAL{?prop rdfs:label ?propLabel.}  " +
                "OPTIONAL {?prop rdfs:range ?range. ?range rdf:type ?rangeType. OPTIONAL{?range rdfs:label ?rangeLabel.} } " +
                "OPTIONAL { ?prop rdfs:domain ?domain.  ?domain rdf:type ?domainType. " + "OPTIONAL{?domain rdfs:label ?domainLabel.}} " +
                " OPTIONAL {?prop rdfs:subPropertyOf ?subProp. {?subProp rdfs:label ?subPropLabel.}} " + filterStr

                /* " WHERE { ?domain ?prop ?range ." + filterStr +
                 "?prop rdfs:subProperty* ?superProp.    ?superProp rdf:type owl:ObjectProperty"+
             " OPTIONAL {?domain rdfs:label ?domainLabel}"+
                 " OPTIONAL {?prop rdfs:label ?propLabel}"+
                 " OPTIONAL {?range rdfs:label ?rangeLabel}"+*/
                + " }}"
            var limit = options.limit || Config.queryLimit;
            query += "  limit " + limit


            var url = self.sparql_url + "?format=json&query=";
            self.no_params = Config.sources[sourceLabel].sparql_server.no_params
            if (self.no_params)
                url = self.sparql_url
            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: sourceLabel}, function (err, result) {


                if (err) {
                    return callback(err)
                }
                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["prop", "domain", "range"])
                if (options.addInverseRestrictions) {
                    delete options.addInverseRestrictions
                    options.inverseRestriction = true
                    self.getObjectProperties(sourceLabel, ids, options, function (err, resultInverse) {
                        result = result.results.bindings.concat(resultInverse)
                        return callback(null, result)
                    })

                } else {

                    return callback(null, result.results.bindings)
                }

                return callback(null, result.results.bindings)

            })
        }
        self.getObjectRestrictions = function (sourceLabel, ids, options, callback) {

            if (!options) {
                options = {}
            }

            var filterStr

            if (options.inverseRestriction)
                filterStr = Sparql_common.setFilter("value", ids);
            else
                filterStr = Sparql_common.setFilter("concept", ids);


            var fromStr = ""
            if (sourceLabel) {
                self.graphUri = Config.sources[sourceLabel].graphUri;
                self.sparql_url = Config.sources[sourceLabel].sparql_server.url;


                options.selectGraph=false //!!!!!!!!!!!!!!PB cannot have graph when concept ands value are not in the same graph

             //   fromStr = Sparql_common.getFromStr(sourceLabel, options.selectGraph, options.withoutImports)
                fromStr = Sparql_common.getFromStr(sourceLabel, options.selectGraph, options.withoutImports)
            } else {
                fromStr = ""

            }

            var query = "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
                "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>"
            if (options.listPropertiesOnly)
                query += " SELECT distinct ?prop ?propLabel "
              else  if(options.withoutBlankNodes)
                    query += " SELECT distinct ?concept  ?prop ?propLabel ?conceptLabel  ?value ?valueLabel "
            else
                query += "SELECT * "
            query += "" + fromStr + " WHERE {"
            if (options.selectGraph)
                query += " graph ?g "
            query += "{ ?concept rdfs:subClassOf ?node.  ?node rdf:type owl:Restriction." + filterStr +
                " ?node owl:onProperty ?prop ." +
                " OPTIONAL {?prop rdfs:label ?propLabel}" +
                " OPTIONAL {?concept rdfs:label ?conceptLabel}"

            if (options.someValuesFrom) {
                query += "?node owl:someValuesFrom ?value. OPTIONAL {?value rdfs:label ?valueLabel}"
            } else if (options.allValuesFrom) {
                query += "?node owl:allValuesFrom ?value. OPTIONAL {?value rdfs:label ?valueLabel}"
            } else if (options.aValueFrom) {
                query += "?node owl:aValueFrom ?value. OPTIONAL {?value rdfs:label ?valueLabel}"
            } else {
                query += "  OPTIONAL {?node owl:allValuesFrom ?value. OPTIONAL {?value rdfs:label ?valueLabel}}" +
                    "   OPTIONAL {?node owl:someValuesFrom ?value. OPTIONAL {?value rdfs:label ?valueLabel}}" +
                    "   OPTIONAL {?node owl:aValueFrom ?value. OPTIONAL {?value rdfs:label ?valueLabel}}"
            }


            if (options.filter) {
                query += " " + options.filter + " "
            }

            query += "} }"
            var limit = options.limit || Config.queryLimit;
            query += " limit " + limit


            var url = self.sparql_url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: sourceLabel}, function (err, result) {


                if (err) {
                    return callback(err)
                }
                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["prop", "concept", "value"])

                return callback(null, result.results.bindings)


            })
        }

        self.getInverseRestriction = function (sourceLabel, restrictionId, callback) {
            var query = "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
                "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>"
            query += "SELECT distinct * where "

            query += "{ graph ?g {?subject owl:inverseOf <" + restrictionId + ">." +
                "?subject ?predicate ?object.}}"
            self.sparql_url = Config.sources[sourceLabel].sparql_server.url;
            var url = self.sparql_url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: sourceLabel}, function (err, result) {
                if (err) {
                    return callback(err)
                }
                return callback(null, result.results.bindings)
            })
        }


        self.getNamedIndividuals = function (sourceLabel, ids, options, callback) {

            if (!options) {
                options = {}
            }

            var filterStr = Sparql_common.setFilter("node", ids);
            self.graphUri = Config.sources[sourceLabel].graphUri;
            self.sparql_url = Config.sources[sourceLabel].sparql_server.url;

            var fromStr = Sparql_common.getFromStr(sourceLabel, options.selectGraph)


            var query = "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
                "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                "SELECT * " + fromStr + " WHERE "
            if (options.selectGraph)
                query += " graph ?g "
            query += "{ ?concept rdf:type ?node. " + filterStr +
                " ?concept rdf:type owl:NamedIndividual ." +
                " OPTIONAL {?concept rdfs:label ?conceptLabel}" +
                " OPTIONAL {?node rdfs:label ?nodeLabel}" +

                " }"
            var limit = options.limit || Config.queryLimit;
            query += " limit " + limit


            var url = self.sparql_url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: sourceLabel}, function (err, result) {


                if (err) {
                    return callback(err)
                }
                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["node", "concept"])
                return callback(null, result.results.bindings)

            })
        }

        self.getCollectionNodes = function (sourceLabel, collection, options, callback) {
            $("#waitImg").css("display", "block");


            var sourceVariables = Sparql_generic.getSourceVariables(sourceLabel);
            var filterStr = ""
            if (options && options.filter) {

                if (options.filter.predicates) {
                    filterStr = Sparql_common.setFilter("predicate", options.filter.predicates)
                }


            }

            var query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
                "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
                "PREFIX  skos:<http://www.w3.org/2004/02/skos/core#> " +
                " select  distinct * " + sourceVariables.fromStr + "   WHERE { " +
                " ?subject ?predicate ?object. " + filterStr +
                "?subject rdf:type ?type. filter( not exists {?subject rdf:type skos:Collection})"


            if (!collection || collection == "") {

                query += "}";

            } else {

                query += "   ?collection skos:member* ?acollection. " + Sparql_common.getUriFilter("collection", collection) +
                    "?acollection rdf:type skos:Collection.    ?acollection skos:member/(^skos:broader+|skos:broader*) ?subject.  " +
                    "   ?collection skos:prefLabel ?collectionLabel." +
                    "   ?acollection skos:prefLabel ?acollectionLabel." +
                    "   ?subject skos:prefLabel ?subjectLabel." + "filter(lang(?subjectLabel)='en')" +
                    "}"
            }

            query += " limit " + sourceVariables.limit + " ";

            Sparql_proxy.querySPARQL_GET_proxy(sourceVariables.url, query, sourceVariables.queryOptions, {source: sourceLabel}, function (err, result) {


                if (err) {
                    return callback(err)
                }
                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["subject", "predicate"])
                return callback(null, result.results.bindings);
            })
        }


        self.getNodesTypes = function (source, ids, callback) {
            var slices = common.array.slice(ids, 200)
            var allData = []
            async.eachSeries(slices, function (slice, callbackEach) {

                var fromStr = Sparql_common.getFromStr(source, false, false)
                var filterStr = Sparql_common.setFilter("concept", slice)
                var query =
                    " select  distinct *   WHERE { GRAPH ?g{ " +
                    " ?concept rdf:type ?type. " +
                    filterStr +
                    " }}"

                query += " limit " + 10000 + " ";
                self.sparql_url = Config.sources[source].sparql_server.url;
                var url = self.sparql_url + "?format=json&query=";
                Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {source: source}, function (err, result) {


                    if (err) {
                        return callbackEach(err)
                    }
                    allData = allData.concat(result.results.bindings)
                    callbackEach()
                })

            }, function (err) {
                return callback(err, allData)
            })
        }


        self.getPropertyClasses = function (sourceLabel, propIds, options, callback) {

            if (!options) {
                options = {}
            }
            var filterStr = "";
            filterStr = Sparql_common.setFilter("prop", propIds);
            if (options.subPropIds)
                filterStr = Sparql_common.setFilter("subProp", options.subPropIds);
            if (options.filter)
                filterStr = options.filter;
            self.graphUri = Config.sources[sourceLabel].graphUri;
            self.sparql_url = Config.sources[sourceLabel].sparql_server.url;

            var fromStr = Sparql_common.getFromStr(sourceLabel, options.selectGraph)


            var query = "PREFIX type: <http://info.deepcarbon.net/schema/type#>" +
                "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
                "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                "select distinct * " + fromStr +
                " WHERE {"

            query += " ?restriction <http://www.w3.org/2002/07/owl#onProperty> ?prop."
                + filterStr +
                "  ?sourceClass rdfs:subClassOf ?restriction." +
                "   OPTIONAL {?restriction  owl:someValuesFrom ?targetClass.   OPTIONAL {?targetClass rdfs:label ?targetClassLabel}}" +
                "  OPTIONAL {?sourceClass rdfs:label ?sourceClassLabel}"
            var limit = options.limit || Config.queryLimit;
            query += " }"
            query += "  limit " + limit

            self.sparql_url = Config.sources[sourceLabel].sparql_server.url;
            var url = self.sparql_url + "?format=json&query=";
            self.no_params = Config.sources[sourceLabel].sparql_server.no_params
            if (self.no_params)
                url = self.sparql_url
            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: sourceLabel}, function (err, result) {


                if (err) {
                    return callback(err)
                }
                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["prop", "domain", "range"])
                return callback(null, result.results.bindings)

            })
        }



        self.getDictionary = function (sourceLabel, options, processor, callback) {
            if (!options)
                options = {}
            var fromStr = Sparql_common.getFromStr(sourceLabel)
            var filterStr = ""
            var query = "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
                "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                "SELECT distinct * " + fromStr + " WHERE "
            if (options.selectGraph)
                query += " graph ?g "
            query += "{ ?id rdf:type <http://www.w3.org/2002/07/owl#Class>. " +
                " OPTIONAL {?id rdfs:label ?label}" +

                " }"

            var allData = []
            var resultSize = 1
            var limitSize = 2000
            var offset = 0
            async.whilst(function (test) {
                return resultSize > 0

            }, function (callbackWhilst) {

                var query2 = "" + query;
                var limit = options.limit || Config.queryLimit;
                query2 += " limit " + limitSize + " offset " + offset

                self.sparql_url = Config.sources[sourceLabel].sparql_server.url;
                var url = self.sparql_url + "?format=json&query=";
                Sparql_proxy.querySPARQL_GET_proxy(url, query2, "", {source: sourceLabel}, function (err, result) {
                    if (err)
                        return callbackWhilst(err);
                    result = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["prop", "domain", "range"])
                    resultSize = result.length
                    offset += limit
                    if (processor) {
                        processor(result, function (err, result) {
                            if (err)
                                return callbackWhilst(err)
                            callbackWhilst()
                        })
                    } else {

                        allData = allData.concat(result);
                        callbackWhilst()
                    }

                })
            }, function (err) {
                callback(err, allData)
            })
        }


        self.schema = {
            getOwlChildrenClasses: function (callback) {
                var query = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \n" +
                    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
                    "SELECT *  from <http://data.total.com/resource/one-model/rdfsOwlSimplified/> WHERE {\n" +
                    "  ?sub rdf:type rdfs:Class .\n" +
                    "} LIMIT 500"

                var url = OwlSchema.currentSourceSchema.sparql_url
                Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: Blender.currentSource}, function (err, result) {
                    if (err) {
                        return callback(err)
                    }

                    return callback(null, result.results.bindings)

                })
            },

            getObjectProperties: function (classId, callback) {
                var query = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \n" +
                    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
                    "SELECT *  from <http://data.total.com/resource/one-model/rdfsOwlSimplified/> WHERE {\n" +
                    "  ?sub rdf:type rdf:Property .\n" +
                    "} LIMIT 500"

                var url = OwlSchema.currentSourceSchema.sparql_url
                Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: Blender.currentSource}, function (err, result) {
                    if (err) {
                        return callback(err)
                    }

                    return callback(null, result.results.bindings)

                })


            }
        }


        self.getSourceAllObjectProperties = function (sourceLabel, options, callback) {
            var from = Sparql_common.getFromStr(sourceLabel)

            var query =
                "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
                "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                "select distinct * " + from + "   WHERE {{ ?domain rdfs:label ?domainLabel.  ?range rdfs:label ?rangeLabel. ?prop ?p ?x OPTIONAL{?prop rdfs:label ?propLabel.} \n" +
                "    ?prop rdfs:range ?range. OPTIONAL{?range rdfs:label ?rangeLabel.} ?prop rdfs:domain ?domain.   OPTIONAL{?domain rdfs:label ?domainLabel.}   }" +
                //  " GRAPH ?g { ?domain rdfs:label ?domainLabel.?range rdfs:label ?domainLabel. }" +
                "}  limit 10000"

            var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, {source: sourceLabel}, null, function (err, result) {
                if (err)
                    return alert(err)
                return callback(null, result)

            })
        }


        self.getGraphsByRegex = function (pattern, callback) {
            var query = "SELECT * " +
                "WHERE {" +
                "  ?s <http://www.w3.org/2002/07/owl#versionIRI> ?graph. filter (regex(str(?graph),\"" + pattern + "\"))" +
                " ?graph ?p ?value." +
                "}"

            self.sparql_url = Config.default_sparql_url;
            var url = self.sparql_url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {}, function (err, result) {
                if (err)
                    return callback(err);
                return callback(null, result.results.bindings)

            })
        }


        self.generateInverseRestrictions = function (source, propId, inversePropId, callback) {
            var filter = "filter (?prop=<" + propId + ">)"
            self.getObjectRestrictions(source, null, {filter: filter}, function (err, result) {
                if (err)
                    return callback(err);
                var triples = []
                result.forEach(function (item) {
                    if (item.value && item.concept)
                        triples = triples.concat(Lineage_blend.getRestrictionTriples(item.value.value, item.concept.value, inversePropId))

                })
                var totalItems = 0
                var sliceSize = 200
                var slices = common.array.slice(triples, sliceSize)
                async.eachSeries(slices, function (slice, callbackEach) {
                    Sparql_generic.insertTriples(source, slice, null, function (err, result) {
                        if (err)
                            return callbackEach(err);
                        MainController.UI.message((totalItems+=slice.length) + " done ")
                        callbackEach()
                    })

                }, function (err) {
                    if (err)
                        return callback(err);
                    callback(err, totalItems)
                })


            })


        }



        /* self.getLabels = function (sourceLabel,ids, callback) {
             var from = Sparql_common.getFromStr(sourceLabel)
             var query =
                 "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                 "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
                 "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                 "select distinct * " + from + " WHERE {   {?prop ?p ?x OPTIONAL{?prop rdfs:label ?propLabel.} \n" +
                 "    ?prop rdfs:range ?range. OPTIONAL{?range rdfs:label ?rangeLabel.} ?prop rdfs:domain ?domain.   OPTIONAL{?domain rdfs:label ?domainLabel.}   }}  limit 10000"

             var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
             Sparql_proxy.querySPARQL_GET_proxy(url, query, {source:sourceLabel}, null,function (err, result) {
                 if (err)
                     return alert(err)
                 return  callback(null,result)
         })
         }*/
        return self;


    }

)
()
