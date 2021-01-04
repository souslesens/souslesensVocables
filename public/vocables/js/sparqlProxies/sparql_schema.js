var Sparql_schema = (function () {


    var self = {}
    self.skosUri = "http://www.w3.org/2004/02/skos/core/"
    self.npdOntologyUri = "http://sws.ifi.uio.no/vocab/npd-v2/"

    var slicesSize = 25

    self.getClasses = function (schema, classIds, callback) {
        var fromStr = "";
        if (schema.graphUri)
            fromStr = "FROM <" + schema.graphUri + "> ";
        var query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
            " select distinct *  " + fromStr + "  WHERE  {  ?class  rdf:type owl:Class. OPTIONAL {?class rdfs:label ?classLabel}"
        if (classIds)
            query += Sparql_common.setFilter("class", classIds)
        if (schema.allSubclasses)
            query += " OPTIONAL{?childClass rdfs:subClassOf* ?class. OPTIONAL{?childClass rdfs:label ?childClassLabel} } "

        query += " }order by ?classLabel ?childClassLabel limit 10000"

        var url = schema.sparql_url + "?format=json&query=";
        ;
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", null, function (err, result) {
            if (err) {
                return callback(err)
            }
            return callback(null, result.results.bindings)

        })


    }
    self.getClassProperties = function (schema, classIds, callback) {
        var fromStr = "";
        if (schema.graphUri)
            fromStr = "FROM <" + schema.graphUri + "> ";
        var classIdsFilter = Sparql_common.setFilter("classId", classIds)
        var query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            " select distinct *  " + fromStr + "  WHERE  {" +
            "{  ?property rdfs:range|rdfs:domain ?classId. OPTIONAL{?property rdfs:label ?propertyLabel.} " +
            classIdsFilter +
            " OPTIONAL{ ?subProperty rdfs:subPropertyOf* ?property. OPTIONAL{?subProperty rdfs:label ?subPropertyLabel}}" +
            "}" +

            "} limit 10000"

        var url = schema.sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", null, function (err, result) {
            if (err) {
                return callback(err)
            }
            return callback(null, result.results.bindings)

        })


    }
    self.getObjectAnnotations = function (schema, classIds, callback) {
        var fromStr = "";
        if (schema.graphUri)
            fromStr = "FROM <" + schema.graphUri + "> ";
        var classIdsFilter = Sparql_common.setFilter("classId", classIds)
        var query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            " select distinct * " + fromStr + "   WHERE  " +
            "{ ?annotation rdf:type <http://www.w3.org/2002/07/owl#AnnotationProperty>. OPTIONAL{?annotation rdfs:label ?annotationLabel} } " +
            "limit 10000"

        var url = schema.sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", null, function (err, result) {
            if (err) {
                return callback(err)
            }
            return callback(null, result.results.bindings)

        })


    }

    self.getPropertiesRangeAndDomain = function (schema, propertyIds, callback) {
        var fromStr = "";
        if (schema.graphUri)
            fromStr = "FROM <" + schema.graphUri + "> ";

        var filterStr = Sparql_common.setFilter("property", propertyIds)
        var query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            " select distinct *  " + fromStr + "  WHERE  {" +
            "?property rdfs:range ?range." +
            "OPTIONAL{?property rdfs:label ?propertyLabel.}" +
            " OPTIONAL{?range rdfs:label ?rangeLabel.} " +
            filterStr +
            "?property rdfs:domain ?domain." +
            " OPTIONAL{?domain rdfs:label ?domainLabel.} " +
            "} limit 10000"

        var url = schema.sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", null, function (err, result) {
            if (err) {
                return callback(err)
            }
            return callback(null, result.results.bindings)

        })


    }

    self.getObjectRangeProperties = function (schema, classId, callback) {
        var fromStr = "";
        if (schema.graphUri)
            fromStr = "FROM <" + schema.graphUri + "> ";

        fromStr = "FROM <" + schema.graphUri + "> ";
        var classIdsFilter = Sparql_common.setFilter("classId", classIds)
        var query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            " select distinct *  " + fromStr + "   WHERE  " +
            "{ ?prop rdfs:domain ?classId. " + classIdsFilter +
            " ?prop rdfs:range ?range. OPTIONAL{?range rdfs:label ?rangeLabel }} " +
            // cf member of in SKOS
            /*   "      UNION{" +
               "{ ?prop rdfs:domain <" + classId + ">. " +
               " ?prop rdfs:range  ?union. " +
               "filter (?property in  <" + classId + ">) "+
               " ?union owl:unionOf ?id . ?id ?z  ?range." +
               " OPTIONAL{?range rdfs:label ?rangeLabel.}"+
               "   }" +*/
            "limit 10000"

        var url = schema.sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", null, function (err, result) {
            if (err) {
                return callback(err)
            }
            return callback(null, result.results.bindings)

        })


    }
    self.getObjectDomainProperties = function (schema, classIds, callback) {
        var fromStr = "";
        if (schema.graphUri)
            fromStr = "FROM <" + schema.graphUri + "> ";
        var classIdsFilter = Sparql_common.setFilter("classId", classIds)

        var query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            " select distinct *  " + fromStr + "   WHERE  " +
            "{" +
            "{ ?prop rdfs:range ?classId. " + classIdsFilter +
            " ?prop rdfs:domain ?domain. OPTIONAL{?domain rdfs:label ?domainLabel } " +

            "}" +

            "UNION{" +
            " ?classId rdfs:subClassOf* ?overClass." + classIdsFilter +
            "  ?prop rdfs:range  ?overClass." +
            " ?prop rdfs:domain ?domain. OPTIONAL{?domain rdfs:label ?domainLabel } " +
            "  }" +
            "}limit 10000 "

        var url = schema.sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", null, function (err, result) {
            if (err) {
                return callback(err)
            }
            return callback(null, result.results.bindings)

        })


    }

    self.getClassPropertiesAndRanges = function (schema, classIds, callback) {
if(!Array.isArray(classIds))
    classIds=[classIds]
        var slices = common.sliceArray(classIds, slicesSize);
        var bulkResult = []
        async.eachSeries(slices, function (classIds, callbackEach) {


            var fromStr = "";
            if (schema.graphUri)
                fromStr = "FROM <" + schema.graphUri + "> ";
            var classIdsFilter = Sparql_common.setFilter("classId", classIds)

            var query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#>" +
                " PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
                " PREFIX owl:<http://www.w3.org/2002/07/owl#> " +
                " select distinct ?classId ?property ?range ?propertyLabel ?rangeLabel " + fromStr + " WHERE  { " +
                "{" +
                // " ?classId rdfs:subClassOf* ?overClass." +
                //  "  ?property rdf:type <http://www.w3.org/2002/07/owl#ObjectProperty>. " +
                "?property rdfs:domain  ?classId." +
                "  optional{?property rdfs:range ?range. OPTIONAL {?range rdfs:label ?rangeLabel.}}" +
                classIdsFilter +
                " OPTIONAL {?property rdfs:label ?propertyLabel}" +
                "  }" +

                "UNION{" +
                " ?classId  rdfs:subClassOf* ?anonymNode." +
                classIdsFilter +
                " ?anonymNode owl:onProperty ?property." +
                " OPTIONAL {?property rdfs:label ?property}" +
                " ?anonymNode owl:someValuesFrom ?range. OPTIONAL {?range rdfs:label ?range}" +


                "  }" +

                "}limit 10000 "


            /*    var query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#>" +
                    " PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
                    " PREFIX owl:<http://www.w3.org/2002/07/owl#> " +
                    " select distinct ?property ?rangeDataType ?rangeRestriction ?propertyLabel ?rangeDataTypeLabel ?rangeRestrictionLabel " + fromStr + " WHERE  { " +
                    "{" +
                   // " ?classId rdfs:subClassOf* ?overClass." +
                  //  "  ?property rdf:type <http://www.w3.org/2002/07/owl#ObjectProperty>. " +
                    "?property rdfs:domain  ?classId." +
                    "  optional{?property rdfs:range ?rangeDataType. OPTIONAL {?rangeDataType rdfs:label ?rangeDataTypeLabel.}}" +
                    classIdsFilter+
                    " OPTIONAL {?property rdfs:label ?propertyLabel}" +
                    "  }" +

                    "UNION{" +
                    " ?classId  rdfs:subClassOf* ?anonymNode." +
                    classIdsFilter+
                    " ?anonymNode owl:onProperty ?property." +
                    " OPTIONAL {?property rdfs:label ?propertyLabel}" +
                    " ?anonymNode owl:someValuesFrom ?rangeRestriction. OPTIONAL {?rangeRestriction rdfs:label ?rangeRestrictionLabel}" +


                    "  }" +

                    "}limit 10000 "*/

            self.executeQuery(schema, query, function (err, result) {
                if (err)
                    callbackEach(err);
                var bindings = Sparql_generic.setBindingsOptionalProperties(result, ["property","range"], {type: "Property"})


                bulkResult = bulkResult.concat(bindings)
                return callbackEach(null, bindings)
            });

        }, function (err) {
            return callback(err, bulkResult)
        })

    }


    self.executeQuery = function (schema, query, callback) {


        var url = schema.sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", null, function (err, result) {
            if (err) {
                return callback(err)
            }
            return callback(null, result.results.bindings)

        })
    }


    return self;

})()
