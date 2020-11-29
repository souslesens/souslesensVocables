var Sparql_WORDNET = (function () {
    var self = {};
    self.sparql_url = "http://wordnet.rkbexplorer.com/sparql/";
    self.ancestorsDepth =3
    self.getTopConcepts = function (sourceLabel, options, callback) {

        var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "SELECT * WHERE { ?topConcept rdfs:label ?topConceptLabel. filter (?topConcept=<http://wordnet.rkbexplorer.com/id/synset-entity-noun-1>) } LIMIT 10"

        var url = self.sparql_url + "?format=json&query=";// + query + queryOptions
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", null, function (err, result) {
            if (err) {
                return callback(err)
            }
            result.results.bindings.forEach(function (item) {

            })
            return callback(null, result.results.bindings)

        })


    }

    self.getNodeChildren = function (sourceLabel, words, ids, descendantsDepth, options, callback) {


        var strFilter;
        if (words) {
            strFilter = Sparql_generic.setFilter("concept", null, words, null)
        } else if (ids) {
            strFilter = Sparql_generic.setFilter("concept", ids, null)
        }
        var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "  PREFIX wordnet: <http://www.w3.org/2006/03/wn/wn20/schema/>" +
            "PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            " SELECT distinct * WHERE { ?concept rdfs:label ?conceptLabel." + strFilter +
            "?child1 wordnet:hyponymOf  ?concept." +
            "?child1 rdfs:label ?child1Label." +
            // " filter (?child1 rdf:type <http://www.w3.org/2006/03/wn/wn20/schema/NounSynset>"+
            "}" +
            "LIMIT 10000"

        var url = self.sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", null, function (err, result) {
            if (err) {
                return callback(err)
            }
            var bindings = []
            result.results.bindings.forEach(function (item) {
                item.child1Type = {value: "http://www.w3.org/2004/02/skos/core#Concept"}

            })
            return callback(null, result.results.bindings)

        })
    }

    self.getNodeInfos = function (sourceLabel, conceptId, options, callback) {
        if (!options)
            options = {}
        var filter = Sparql_generic.getUriFilter("id", conceptId);
        if (options.propertyFilter) {
            filter += Sparql_generic.getUriFilter("prop", options.propertyFilter);
        }

        var query = " select distinct *   WHERE {" +
            " ?id ?prop ?value. " + filter + "} limit 10000";

        var url = self.sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, {}, null, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result.results.bindings)


        })
    }
    self.getNodeParents = function (sourceLabel, words, ids, ancestorsDepth, options, callback) {
        if (!options)
            options = {}
        var strFilter;
        if (words) {
            strFilter = Sparql_generic.setFilter("concept", null, words, {exactMatch:true})
        } else if (ids) {
            strFilter = Sparql_generic.setFilter("concept", ids, null)
        }
        var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "  PREFIX wordnet: <http://www.w3.org/2006/03/wn/wn20/schema/>" +
            "PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +

            " select distinct *   WHERE {{"

        query += "?concept rdfs:label ?conceptLabel. " + strFilter+
        "?broader rdf:type wordnet:NounSynset "


        ancestorsDepth = self.ancestorsDepth
        for (var i = 1; i <= ancestorsDepth; i++) {
            if (i == 1) {
                query += "  ?concept wordnet:hyponymOf ?broader" + i + "." +
                    "?broader rdf:type wordnet:NounSynset "+
                    "?broader" + (i) + " rdfs:label ?broader" + (i) + "Label."


            } else {
                if( i <ancestorsDepth)
                query += "  ?broader" + (i - 1) + " wordnet:hyponymOf ?broader" + i + "."
                else
                    query += "OPTIONAL { ?broader" + (i - 1) + " wordnet:hyponymOf ?broader" + i + "."


                query += "?broader" + (i) + " rdfs:label ?broader" + (i) + "Label."

            }


        }


      //  for (var i = 1; i < ancestorsDepth; i++) {
            query += "} "
      //  }


        query += "  }";

        if (options.filterCollections) {
            query += "MINUS {?collection skos:member* ?aCollection.?acollection skos:member ?broader" + getUriFilter("collection", options.filterCollections)
        }
        query += "}limit 1000 ";


        var url = self.sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", null, function (err, result) {
            if (err) {
                return callback(err)
            }
            var bindings = []
            result.results.bindings.forEach(function (item) {
                item.child1Type = {value: "http://www.w3.org/2004/02/skos/core#Concept"}

            })
            return callback(null, result.results.bindings)

        })
    }


    self.getAncestors = function (source, id, options, callback) {
        var url = source.sparql_url + "?default-graph-uri=" + encodeURIComponent(source.graphIRI) + "&query=";// + query + queryOptions


        var query = "PREFIX rdf:<http://www.w3.org/2000/01/rdf-schema#> PREFIX wordnet: <http://www.w3.org/2006/03/wn/wn20/schema/>" +
            "select distinct * where {";

        query += "  ?id rdf:label ?prefLabel . filter( ?id=<" + id + ">)";

        var depth = 4// erreur sparql si plus d'un optional
        for (var i = 1; i <= depth; i++) {
            if (i == 1) {
                query += "  ?id" + " wordnet:hyponymOf ?broaderId" + i + "." +
                    "?broaderId" + (i) + " rdf:label ?broader" + (i) + ".";

            } else {
                if (i == depth - 1)// erreur sparql si plus d'un optional
                    query += "OPTIONAL { ?broaderId" + (i - 1) + "  wordnet:hyponymOf ?broaderId" + i + ".";
                else
                    query += "  ?broaderId" + (i - 1) + "  wordnet:hyponymOf ?broaderId" + i + ".";

                query += "?broaderId" + (i) + " rdf:label ?broader" + (i) + ".";

            }
        }
        for (var i = 1; i < 2; i++) {
            query += "}"
        }
        query += "} LIMIT 1000"


        var queryOptions = "&format=json";

        sparql_abstract.querySPARQL_GET_proxy(url, query, queryOptions, null, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings.forEach(function (item) {

                for (var i = 1; i <= depth; i++) {
                    if (typeof item["broaderId" + i] != "undefined") {
                        var parts = item["broaderId" + i].value.split("/");
                        var part = parts[parts.length - 2];
                        item["broader" + i].value = part + "." + item["broader" + i].value
                    }
                }

            })

            var json = sparql_abstract.processData_SKOS(source, id, result.results.bindings)
            callback(null, json)

        })
    }


    self.getDetails = function (source, id, options, callback) {
        var url = source.sparql_url + "?default-graph-uri=" + encodeURIComponent(source.graphIRI) + "&query=";// + query + queryOptions

        var query = "PREFIX rdf:<http://www.w3.org/2000/01/rdf-schema#>" +
            "" +
            "select distinct *" +
            "" +
            "where {" +
            "?id ?prop ?value . filter(?id= <" + id + ">)" +
            "" +
            " optional{\n" +
            "?prop rdf:label ?propLabel .\n" +
            "}\n" +
            " optional{\n" +
            "?value rdf:label ?valueLabel .\n" +
            "}\n" +
            "\n" +
            "}"
        "" +
        "}" +
        "limit 100"
        var queryOptions = "&format=json";
        sparql_abstract.querySPARQL_GET_proxy(url, query, queryOptions, null, function (err, result) {
            if (err) {
                return callback(err);
            }
            var bindings = []
            var obj = {label: options.label, id: id, properties: {}};
            result.results.bindings.forEach(function (item) {
                var propName = item.prop.value
                var p = propName.lastIndexOf("#")
                if (p == -1)
                    var p = propName.lastIndexOf("/")
                if (p > -1)
                    var propName = item.prop.value.substring(p + 1)
                obj.properties[item.prop.value] = {name: propName, value: item.value.value}

            })
            obj.properties[id] = {name: "UUID", value: obj.id}
            callback(null, obj)
        })
    }


    return self;

})
()
