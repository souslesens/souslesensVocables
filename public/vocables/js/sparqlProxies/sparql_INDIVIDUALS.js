var Sparql_INDIVIDUALS = (function () {

        var self = {};

        var filterCollectionsAncestorsDepth = 4
        self.ancestorsDepth = 6

        var elasticUrl = Config.serverUrl;

        self.getTopConcepts = function (sourceLabel, options, callback) {
            if (!options)
                options = {}
            var fromStr = ""

            var strFilterTopConcept;
            var topClassFilter = Config.sources[sourceLabel].topClassFilter
            if (topClassFilter)
                strFilterTopConcept = topClassFilter;
            else
                strFilterTopConcept = "?topConcept ?x ?y. filter(NOT EXISTS {?topConcept rdfs:subClassOf ?z}) "

            self.graphUri = Config.sources[sourceLabel].graphUri;
            self.sparql_url = Config.sources[sourceLabel].sparql_server.url;
            if (self.graphUri && self.graphUri != "")
                fromStr = " FROM <" + self.graphUri + ">"


            if (Config.sources[sourceLabel].topClass)
                self.topClass = Config.sources[sourceLabel].topClass;

            var query = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                "prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                "prefix owl: <http://www.w3.org/2002/07/owl#>" +
                "select   distinct ?topConcept  ?topConceptLabel  " + fromStr + "  where {" +
                strFilterTopConcept +
                " OPTIONAL{?topConcept rdfs:label ?topConceptLabel.}"
            if (options.filterCollections)
                query += "?collection skos:member ?aConcept. ?aConcept rdfs:subClassOf+ ?topConcept." + Sparql_common.setFilter("collection", options.filterCollections)
            query += "}order by ?topConceptLabel "
            " }"
            var limit = options.limit || Config.queryLimit;
            query += " limit " + limit
            var url = self.sparql_url + "?format=json&query=";

            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: sourceLabel}, function (err, result) {
                if (err) {
                    return callback(err)
                }
                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, "topConcept", {type: "http://www.w3.org/2002/07/owl#Class"})
                return callback(null, result.results.bindings);
            })
        }


        self.getNodeChildren = function (sourceLabel, words, ids, descendantsDepth, options, callback) {



                return callback(null, [])



        }

        self.getNodeInfos = function (sourceLabel, conceptId, options, callback) {
            if (!options)
                options = {}
            var fromStr = ""

            self.graphUri = Config.sources[sourceLabel].graphUri;
            self.sparql_url = Config.sources[sourceLabel].sparql_server.url;

            if (self.graphUri && self.graphUri != "") {
                if (!Array.isArray(self.graphUri))
                    self.graphUri = [self.graphUri]
                self.graphUri.forEach(function (graphUri) {
                    fromStr = " FROM <" + graphUri + "> "
                })
            }


            var query = "select * " + fromStr +
                " where {<" + conceptId + "> ?prop ?value. } ";
            " }"
            var limit = options.limit || Config.queryLimit;
            query += " limit " + limit

            var url = self.sparql_url + "?format=json&query=";

            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: sourceLabel}, function (err, result) {
                if (err) {
                    return callback(err);
                }
                return callback(null, result.results.bindings)


            })
        }
        self.getNodeParents = function (sourceLabel, words, ids, ancestorsDepth, options, callback) {
            self.graphUri = Config.sources[sourceLabel].graphUri;
            self.sparql_url = Config.sources[sourceLabel].sparql_server.url;
            if (!options)
                options = {}
            var strFilter="";
            if (words) {
                strFilter = Sparql_common.setFilter("concept", null, words, options)
            } else if (ids) {
                strFilter = Sparql_common.setFilter("concept", ids, null)
            }

            var fromStr = ""
            if (self.graphUri && self.graphUri != "") {
                if (!Array.isArray(self.graphUri))
                    self.graphUri = [self.graphUri]
                self.graphUri.forEach(function (graphUri) {
                    fromStr = " FROM <" + graphUri + "> "
                })
            }
            var owlPredicate = "subClassOf";
            if (options.owlType)
                owlPredicate = options.owlType

            var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                "PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
                " select distinct *  " + fromStr + "  WHERE {"

            query += "?concept rdfs:label ?conceptLabel. " +
                "?concept rdf:type ?broader1." +
                "FILTER (!isBlank(?concept))" + strFilter;




            query += "  }";

            if (options.filterCollections) {
                query += "MINUS {?collection skos:member* ?aCollection.?acollection skos:member ?broader" + Sparql_common.getUriFilter("collection", options.filterCollections)
            }

            var limit = options.limit || Config.queryLimit;
            query += " limit " + limit


            var url = self.sparql_url + "?format=json&query=";
            var method = Config.sources[sourceLabel].server_method;
            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: sourceLabel}, function (err, result) {
                if (err) {
                    return callback(err)
                }
                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["concept","broader"])
                return callback(null, result.results.bindings)

            })
        }

        self.getItems = function (sourceLabel, options, callback) {

            if (!options) {
                options = {}
            }
            self.graphUri = Config.sources[sourceLabel].graphUri;
            self.sparql_url = Config.sources[sourceLabel].sparql_server.url;


            var fromStr = ""
            if (self.graphUri && self.graphUri != "") {
                if (!Array.isArray(self.graphUri))
                    self.graphUri = [self.graphUri]
                self.graphUri.forEach(function (graphUri) {
                    fromStr = " FROM <" + graphUri + "> "
                })
            }


            var query = "";
            query += "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                "PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                "PREFIX owl: <http://www.w3.org/2002/07/owl#>"


            query += " select distinct * " + fromStr + "  WHERE { ?concept ?x ?y. FILTER (!isBlank(?concept))"
            query += "OPTIONAL {?concept rdfs:label ?conceptLabel.}";
            query += "OPTIONAL {?concept rdf:type ?conceptType.}";

            if (options.filter)
                query += options.filter;
            if (options.lang)
                query += "filter(lang(?conceptLabel )='" + lang + "')"

            query += "  } ";
            " }"
            var limit = options.limit || Config.queryLimit;
            query += " limit " + limit

            var url = self.sparql_url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: sourceLabel}, function (err, result) {


                if (err) {
                    return callback(err)
                }

                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings,"concept")
                return callback(null, result.results.bindings)

            })
        }
        self.getIndividualProperties = function (sourceLabel, subjectIds,propertyIds,  objectIds, options, callback) {
            if (!options)
                options = {}

            function query(subjectIds,propertyIds,objectIds,callbackQuery) {
                var filterStr = ""
                if (subjectIds)
                    filterStr+= Sparql_common.setFilter("subject", subjectIds);
                if (objectIds)
                    filterStr+= Sparql_common.setFilter("object", objectIds);
                if (propertyIds)
                    filterStr+= Sparql_common.setFilter("property", propertyIds);
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
                Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: sourceLabel}, function (err, result) {


                    if (err) {
                        return callbackQuery(err)
                    }
                    result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["object", "property", "subject"])
                    return callbackQuery(null, result.results.bindings)

                })
            }






            var slicedSubjectIds=null;
            var  slicedObjectIds=null;

            var allResults=[]
            if(subjectIds){
                slicedSubjectIds=common.sliceArray(subjectIds,Sparql_generic.slicesSize)
                async.eachSeries(slicedSubjectIds,function(subjectIds,callbackEach){
                    query(subjectIds,propertyIds,objectIds,function(err,result){
                        if(err)
                            return callback(err)
                        allResults=allResults.concat(result);
                        callbackEach()
                    })
                },function(err){
                    return callback(err,allResults)
                })


            }
            else if(objectIds){
                slicedObjectIds=common.sliceArray(slicedObjectIds,Sparql_generic.slicesSize)

                    async.eachSeries(slicedObjectIds,function(objectIds,callbackEach){
                        query(subjectIds,propertyIds,objectIds,function(err,result){
                            if(err)
                                return callback(err)
                            allResults=allResults.concat(result);
                            callbackEach()
                        })
                    },function(err){
                        return callback(err,allResults)
                    })


                }

           else {
                query(subjectIds,propertyIds,objectIds,function(err,result){
                        return callback(err,result)

                })
            }


        }


        self.getObjectProperties = function (sourceLabel, ids, options, callback) {

            if (!options) {
                options = {}
            }


          //  var filterStr = "FILTER (?domain in (<"+ids[0]+">) || ?range in (<"+ids[0]+">))"
          var filterStr = Sparql_common.setFilter("domain", ids);
            var filterStr2 = Sparql_common.setFilter("range", ids);
            self.graphUri = Config.sources[sourceLabel].graphUri;
            self.sparql_url = Config.sources[sourceLabel].sparql_server.url;

            var fromStr = ""
            if (self.graphUri && self.graphUri != "") {
                if (!Array.isArray(self.graphUri))
                    self.graphUri = [self.graphUri]
                self.graphUri.forEach(function (graphUri) {
                    fromStr = " FROM <" + graphUri + "> "
                })
            }


            var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
                "select distinct *   FROM <"+ self.graphUri+">   WHERE {{" +
                "   ?domain ?prop ?range. ?domain rdfs:label ?domainLabel.  ?range rdfs:label ?rangeLabel. filter(regex(str(?prop),\"part14\")) "+filterStr+"}" +
                "UNION "+
                "  {?range  ?prop ?domain. ?domain rdfs:label ?domainLabel.  ?range rdfs:label ?rangeLabel. filter(regex(str(?prop),\"part14\")) "+filterStr+"}"



            var limit = options.limit || Config.queryLimit;
            query += "} limit " + limit


            var url = self.sparql_url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: sourceLabel}, function (err, result) {


                if (err) {
                    return callback(err)
                }
                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["prop", "domain", "range"])
                return callback(null, result.results.bindings)

            })
        }
        self.getObjectRestrictions = function (sourceLabel, ids, options, callback) {

            if (!options) {
                options = {}
            }

            var filterStr = Sparql_common.setFilter("id", ids);
            self.graphUri = Config.sources[sourceLabel].graphUri;
            self.sparql_url = Config.sources[sourceLabel].sparql_server.url;

            var fromStr = ""
            if (self.graphUri && self.graphUri != "") {
                if (!Array.isArray(self.graphUri))
                    self.graphUri = [self.graphUri]
                self.graphUri.forEach(function (graphUri) {
                    fromStr = " FROM <" + graphUri + "> "
                })
            }


            var query = "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
                "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                "SELECT * " + fromStr + " WHERE {" +
                "  ?id rdfs:subClassOf ?node. " + filterStr +
                " ?node owl:onProperty ?prop ." +
                " OPTIONAL {?prop rdfs:label ?propLabel}" +
                "  OPTIONAL {?node owl:allValuesFrom ?value}. " +
                "   OPTIONAL {?node owl:someValuesFrom ?value}. " +
                "   OPTIONAL {?node owl:aValueFrom ?value}. " +
                "} "
            var limit = options.limit || Config.queryLimit;
            query += " limit " + limit


            var url = self.sparql_url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: sourceLabel}, function (err, result) {


                if (err) {
                    return callback(err)
                }
                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["prop", "value"])
                return callback(null, result.results.bindings)

            })
        }


        return self;


    }
)()
