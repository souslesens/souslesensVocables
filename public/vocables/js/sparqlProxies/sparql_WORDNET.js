var Sparql_WORDNET = (function () {
    var self = {};
    var sourceLabel="WORDNET"



    self.sparql_url = "http://wordnet.rkbexplorer.com/sparql/";
    self.ancestorsDepth =3
    self.getTopConcepts = function (sourceLabel, options, callback) {
        self.graphUri =  Config.sources[sourceLabel].graphUri ;
        self.sparql_url =  Config.sources[sourceLabel].sparql_server.url;
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
        self.graphUri =  Config.sources[sourceLabel].graphUri ;
        self.sparql_url =  Config.sources[sourceLabel].sparql_server.url;

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
        self.graphUri =  Config.sources[sourceLabel].graphUri ;
        self.sparql_url =  Config.sources[sourceLabel].sparql_server.url;
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
        self.graphUri =  Config.sources[sourceLabel].graphUri ;
        self.sparql_url =  Config.sources[sourceLabel].sparql_server.url;
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








    return self;

})
()
