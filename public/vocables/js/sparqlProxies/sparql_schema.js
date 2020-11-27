var Sparql_schema = (function () {


    var self = {}
    self.skosUri = "http://www.w3.org/2004/02/skos/core/"
    self.npdOntologyUri = "http://sws.ifi.uio.no/vocab/npd-v2/"

    self.getClasses = function (sourceSchema, callback) {
        var fromStr = "";
        if (sourceSchema.graphUri)
            fromStr = "FROM <" + sourceSchema.graphUri + "> ";

        var query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "select distinct *  " + fromStr + "  WHERE  {  ?class  rdf:type owl:Class. OPTIONAL {?class rdfs:label ?classLabel}"
        if (sourceSchema.allSubclasses)
            query += " OPTIONAL{?childClass rdfs:subClassOf* ?class. ?childClass rdfs:label ?childClassLabel } "

        query += " }order by ?classLabel ?childClassLabel limit 1000"

        var url = sourceSchema.sparql_url + "?query=&format=json";
        ;
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", null, function (err, result) {
            if (err) {
                return callback(err)
            }
            return callback(null, result.results.bindings)

        })


    }
    self.getClassProperties = function (sourceSchema, classId, callback) {
        var fromStr = "";
        if (sourceSchema.graphUri)
            fromStr = "FROM <" + sourceSchema.graphUri + "> ";

        var query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            " select distinct *  " + fromStr + "  WHERE  {" +
            "{  ?property rdfs:range|rdfs:domain <" + classId + "> . OPTIONAL{?property rdfs:label ?propertyLabel.}" +
            " OPTIONAL{ ?subProperty rdfs:subPropertyOf* ?property. OPTIONAL{?subProperty rdfs:label ?subPropertyLabel}}" +
            "}" +

            "} limit 1000"

        var url = sourceSchema.sparql_url + "?query=&format=json";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", null, function (err, result) {
            if (err) {
                return callback(err)
            }
            return callback(null, result.results.bindings)

        })


    }
    self.getObjectAnnotations = function (sourceSchema, classId, callback) {
        var fromStr = "";
        if (sourceSchema.graphUri)
            fromStr = "FROM <" + sourceSchema.graphUri + "> ";

        var query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            " select distinct * " + fromStr + "   WHERE  " +
            "{ ?annotation rdf:type <http://www.w3.org/2002/07/owl#AnnotationProperty>. OPTIONAL{?annotation rdfs:label ?annotationLabel} } " +
            "limit 1000"

        var url = sourceSchema.sparql_url + "?query=&format=json";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", null, function (err, result) {
            if (err) {
                return callback(err)
            }
            return callback(null, result.results.bindings)

        })


    }

    self.getObjectRangeProperties = function (sourceSchema, classId, callback) {
        var fromStr = "";
        if (sourceSchema.graphUri)
            fromStr = "FROM <" + sourceSchema.graphUri + "> ";
        var query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            " select distinct *  " + fromStr + "   WHERE  " +
            "{ ?prop rdfs:domain <" + classId + ">. " +
            "?prop rdfs:range ?range. OPTIONAL{?range rdfs:label ?rangeLabel }} " +
            // cf member of in SKOS
         /*   "      UNION{" +
            "{ ?prop rdfs:domain <" + classId + ">. " +
            " ?prop rdfs:range  ?union. " +
            "filter (?property in  <" + classId + ">) "+
            " ?union owl:unionOf ?id . ?id ?z  ?range." +
            " OPTIONAL{?range rdfs:label ?rangeLabel.}"+
            "   }" +*/
            "limit 1000"

        var url = sourceSchema.sparql_url + "?query=&format=json";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", null, function (err, result) {
            if (err) {
                return callback(err)
            }
            return callback(null, result.results.bindings)

        })


    }
    self.getObjectDomainProperties = function (sourceSchema, classId, callback) {
        var fromStr = "";
        if (sourceSchema.graphUri)
            fromStr = "FROM <" + sourceSchema.graphUri + "> ";
        var query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            " select distinct *  " + fromStr + "   WHERE  " +
            "{" +
            "{ ?prop rdfs:range <" + classId + ">. " +
            "?prop rdfs:domain ?domain. OPTIONAL{?domain rdfs:label ?domainLabel } " +

            "}" +

            "UNION{" +
            "      <" + classId + "> rdfs:subClassOf* ?overClass." +
            "        ?prop rdfs:range  ?overClass." +
            "?prop rdfs:domain ?domain. OPTIONAL{?domain rdfs:label ?domainLabel } " +
            "  }" +
            "}limit 1000 "

        var url = sourceSchema.sparql_url + "?query=&format=json";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", null, function (err, result) {
            if (err) {
                return callback(err)
            }
            return callback(null, result.results.bindings)

        })


    }

    self.getDataTypeProperties = function (sourceSchema, classId, callback) {
        var fromStr = "";
        if (sourceSchema.graphUri)
            fromStr = "FROM <" + sourceSchema.graphUri + "> ";

        var query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#>" +
            " PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX owl:<http://www.w3.org/2002/07/owl#> " +
            "select distinct ?property ?range  " + fromStr + " WHERE  { " +
            /*   "{" +
               "    ?property rdf:type owl:DatatypeProperty>." +
            " ?property rdfs:domain  <"+classId+">." +
               "  optional{?property rdfs:range ?range}" +
               "}" +

               "UNION*/"{" +
            "      <" + classId + "> rdfs:subClassOf* ?overClass." +
            "     ?property rdf:type <http://www.w3.org/2002/07/owl#DatatypeProperty>. ?property rdfs:domain  ?overClass." +
            "     optional{?property rdfs:range ?range}" +
            "  }" +

            "UNION{" +
            "      <" + classId + ">     rdfs:subClassOf* ?anonymNode." +
            " ?anonymNode owl:onProperty ?property." +
            "?anonymNode owl:someValuesFrom ?range." +
            " OPTIONAL {?property  owl:onProperty  ?anonymNode .}" +

            "  }" +

            "}limit 1000 "

        self.executeQuery(sourceSchema, query, callback);

    }


    self.executeQuery = function (sourceSchema, query, callback) {


        var url = sourceSchema.sparql_url + "?query=&format=json";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", null, function (err, result) {
            if (err) {
                return callback(err)
            }
            return callback(null, result.results.bindings)

        })
    }


    return self;

})()
