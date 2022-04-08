/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
var Sparql_schema = (function () {
    var self = {};
    self.skosUri = "http://www.w3.org/2004/02/skos/core/";
    self.npdOntologyUri = "http://sws.ifi.uio.no/vocab/npd-v2/";
    self.queryLimit = 10000;

    var slicesSize = 25;

    self.getClasses = function (schema, classIds, callback) {
        var fromStr = self.getFromGraphStr(schema.graphUri);

        var query =
            " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
            " select distinct *  " +
            fromStr +
            "  WHERE  {  ?class  rdf:type owl:Class. OPTIONAL {?class rdfs:label ?classLabel}";
        if (classIds) query += Sparql_common.setFilter("class", classIds);
        if (schema.allSubclasses) query += " OPTIONAL{?childClass rdfs:subClassOf* ?class. OPTIONAL{?childClass rdfs:label ?childClassLabel} } ";

        query += " }order by ?classLabel ?childClassLabel limit " + self.queryLimit;

        if (schema.sparql_url == "_default") schema.sparql_url = Config.default_sparql_url;
        var url = schema.sparql_url + "?format=json&query=";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: schema.source }, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result.results.bindings);
        });
    };
    self.getClassProperties = function (schema, classIds, callback) {
        var fromStr = self.getFromGraphStr(schema.graphUri);
        var classIdsFilter = Sparql_common.setFilter("classId", classIds);
        var query =
            " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            " select distinct *  " +
            fromStr +
            "  WHERE  {" +
            "{  ?property rdfs:range|rdfs:domain ?classId. OPTIONAL{?property rdfs:label ?propertyLabel.} " +
            classIdsFilter +
            " OPTIONAL{ ?subProperty rdfs:subPropertyOf* ?property. OPTIONAL{?subProperty rdfs:label ?subPropertyLabel}}" +
            "}" +
            "} limit " +
            self.queryLimit;

        if (schema.sparql_url == "_default") schema.sparql_url = Config.default_sparql_url;
        var url = schema.sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: schema.source }, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result.results.bindings);
        });
    };
    self.getObjectAnnotations = function (schema, classIds, callback) {
        var fromStr = self.getFromGraphStr(schema.graphUri);
        var classIdsFilter = Sparql_common.setFilter("classId", classIds);
        var query =
            " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            " select distinct * " +
            fromStr +
            "   WHERE  " +
            "{ ?annotation rdf:type <http://www.w3.org/2002/07/owl#AnnotationProperty>. OPTIONAL{?annotation rdfs:label ?annotationLabel} } " +
            "limit " +
            self.queryLimit;

        if (schema.sparql_url == "_default") schema.sparql_url = Config.default_sparql_url;
        var url = schema.sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: schema.source }, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result.results.bindings);
        });
    };

    self.getRestrictions = function (schema, options, callback) {
        var fromStr = self.getFromGraphStr(schema.graphUri);
        var query =
            " PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX owl: <http://www.w3.org/2002/07/owl#> select distinct *" +
            fromStr +
            "where {" +
            "  ?domain rdfs:subClassOf ?x." +
            "  ?x rdf:type owl:Restriction." +
            "  ?x owl:onProperty ?prop." +
            "  ?x owl:someValuesFrom ?range." +
            "  optional {?domain rdfs:label ?domainLabel}" +
            "    optional {?prop rdfs:label ?propLabel}" +
            "    optional {?range rdfs:label ?rangeLabel}" +
            "}";
        if (schema.sparql_url == "_default") schema.sparql_url = Config.default_sparql_url;
        var url = schema.sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: schema.source }, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["prop", "range", "domain"], { noType: 1 });
            return callback(null, result.results.bindings);
        });
    };

    self.getPropertiesRangeAndDomain = function (schema, propertyIds, words, options, callback) {
        var fromStr = self.getFromGraphStr(schema.graphUri);

        if (!options) options = {};
        var filterStr;
        if (words) {
            if (options.exactMatch) filterStr = "FILTER ( regex(str(?property),'^" + words + "$','i') || regex(?propertyLabel,'^" + words + "$','i') )";
            else filterStr = "FILTER ( regex(str(?property),'" + words + "','i') || regex(?propertyLabel,'" + words + "','i') )";
            // filterStr = "FILTER ( regex(str(?property),'" + words + "','i') ||regex(str(?subProperty),'" + words + "','i') || regex(?propertyLabel,'" + words + "','i')  || regex(?subPropertyLabel,'" + words + "','i') )"
        } else filterStr = Sparql_common.setFilter("property", propertyIds);
        if (options.filter) filterStr += options.filter;
        var query;
        if (options.mandatoryDomain) {
            query =
                " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> PREFIX owl:<http://www.w3.org/2002/07/owl#>" +
                "  select distinct * " +
                fromStr +
                " WHERE  {    ?property   rdfs:subPropertyOf* ?superProperty.?superProperty rdf:type owl:ObjectProperty " +
                filterStr;
            if (words) query += " ?property rdfs:label ?propertyLabel. ";
            else query += "  OPTIONAL{?property rdfs:label ?propertyLabel.} ";

            query +=
                "  ?superProperty rdfs:domain ?domain.  ?domain rdf:type ?domainType. OPTIONAL{?domain rdfs:label ?domainLabel.}" +
                "     OPTIONAL{ ?superProperty rdfs:range ?range.  ?range rdf:type ?rangeType. OPTIONAL{?range rdfs:label ?rangeLabel.}}" +
                "} order by ?propertyLabel limit " +
                self.queryLimit;
        } else {
            query =
                " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
                "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                " PREFIX owl:<http://www.w3.org/2002/07/owl#> " +
                " select distinct *  " +
                fromStr +
                " WHERE  {" +
                "    ?property rdf:type owl:ObjectProperty OPTIONAL" +
                "{?property rdfs:label ?propertyLabel.}" +
                filterStr +
                "  OPTIONAL {?property rdfs:range ?range. ?range rdf:type ?rangeType. OPTIONAL{?range rdfs:label ?rangeLabel.} }" +
                "  OPTIONAL {?property rdfs:domain ?domain.  ?domain rdf:type ?domainType. OPTIONAL{?domain rdfs:label ?domainLabel.}}" +
                "} order by ?propertyLabel limit " +
                self.queryLimit;

            /* query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
                 "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                 " PREFIX owl:<http://www.w3.org/2002/07/owl#> " +
                 " select distinct *  " + fromStr + " WHERE  {" +
                 "    ?property rdf:type owl:ObjectProperty OPTIONAL" +
                 "{?property rdfs:label ?propertyLabel.}" +
                 filterStr +
                 "  OPTIONAL {?property rdfs:range ?range. ?range rdf:type ?rangeType. OPTIONAL{?range rdfs:label ?rangeLabel.} }" +
                 "  OPTIONAL {?property rdfs:domain ?domain.  ?domain rdf:type ?domainType. OPTIONAL{?domain rdfs:label ?domainLabel.}}" +
                 "  OPTIONAL {?subProperty rdfs:subPropertyOf ?property. {?subProperty rdfs:label ?subPropertyLabel.}} } order by ?propertyLabel limit " + self.queryLimit*/
        }
        if (schema.sparql_url == "_default") schema.sparql_url = Config.default_sparql_url;
        var url = schema.sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: schema.source }, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["property", "range", "domain", "subProperty"], { noType: 1 });
            return callback(null, result.results.bindings);
        });
    };

    self.getObjectRangeProperties = function (schema, classId, callback) {
        var fromStr = self.getFromGraphStr(schema.graphUri);

        var classIdsFilter = Sparql_common.setFilter("classId", classId);
        var query =
            " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            " select distinct *  " +
            fromStr +
            "   WHERE  " +
            "{ ?prop rdfs:domain ?classId. " +
            classIdsFilter +
            " ?prop rdfs:range ?range. OPTIONAL{?range rdfs:label ?rangeLabel }} " +
            // cf member of in SKOS
            /*   "      UNION{" +
               "{ ?prop rdfs:domain <" + classId + ">. " +
               " ?prop rdfs:range  ?union. " +
               "filter (?property in  <" + classId + ">) "+
               " ?union owl:unionOf ?id . ?id ?z  ?range." +
               " OPTIONAL{?range rdfs:label ?rangeLabel.}"+
               "   }" +*/
            " order by ?propertyLabel limit " +
            self.queryLimit;

        if (schema.sparql_url == "_default") schema.sparql_url = Config.default_sparql_url;
        var url = schema.sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: schema.source }, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result.results.bindings);
        });
    };
    self.getObjectDomainProperties = function (schema, classIds, callback) {
        var fromStr = self.getFromGraphStr(schema.graphUri);
        var classIdsFilter = Sparql_common.setFilter("classId", classIds);

        var query =
            " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            " select distinct *  " +
            fromStr +
            "   WHERE  " +
            "{" +
            "{ ?prop rdfs:range ?classId. " +
            classIdsFilter +
            " ?prop rdfs:domain ?domain. OPTIONAL{?domain rdfs:label ?domainLabel } " +
            "}" +
            "UNION{" +
            " ?classId rdfs:subClassOf* ?overClass." +
            classIdsFilter +
            "  ?prop rdfs:range  ?overClass." +
            " ?prop rdfs:domain ?domain. OPTIONAL{?domain rdfs:label ?domainLabel } " +
            "  }" +
            "}limit " +
            self.queryLimit;

        if (schema.sparql_url == "_default") schema.sparql_url = Config.default_sparql_url;
        var url = schema.sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: schema.source }, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result.results.bindings);
        });
    };

    self.getClassPropertiesAndRanges = function (schema, classIds, callback) {
        if (!Array.isArray(classIds)) classIds = [classIds];
        var slices = common.array.slice(classIds, slicesSize);
        var bulkResult = [];
        async.eachSeries(
            slices,
            function (classIds, callbackEach) {
                var fromStr = self.getFromGraphStr(schema.graphUri);
                var classIdsFilter = Sparql_common.setFilter("classId", classIds);

                var query =
                    " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#>" +
                    " PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
                    " PREFIX owl:<http://www.w3.org/2002/07/owl#> " +
                    " select distinct ?classId ?property ?range ?propertyLabel ?rangeLabel " +
                    fromStr +
                    " WHERE  { " +
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
                    "}limit " +
                    self.queryLimit;

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

                    "}limit "+self.queryLimit */
                if (schema.sparql_url == "_default") schema.sparql_url = Config.default_sparql_url;
                var url = schema.sparql_url + "?format=json&query=";
                Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: schema.source }, function (err, result) {
                    if (err) return callbackEach(err);
                    var bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["property", "range"], { type: "Property" });

                    bulkResult = bulkResult.concat(bindings);
                    return callbackEach(null, bindings);
                });
            },
            function (err) {
                return callback(err, bulkResult);
            }
        );
    };

    self.getAllTypes = function (sourceLabel, callback) {
        var graphUri = Config.sources[sourceLabel].graphUri;
        var fromStr = self.getFromGraphStr(graphUri);

        var query =
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
            "SELECT ?type ?typeLabel (count(distinct ?s) as ?count) " +
            fromStr +
            " WHERE {" +
            "" +
            " ?s rdf:type ?type " +
            "optional{?type rdfs:label ?typeLabel.} " +
            "} group by ?type ?typeLabel order by desc (?count)";

        var server = Config.sources[sourceLabel].sparql_server;
        var url = server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, "type");
            return callback(null, result.results.bindings);
        });
    };
    self.getFromGraphStr = function (graphUris, named) {
        var from = " FROM ";
        if (named) from += " NAMED";

        if (!graphUris || graphUris == "") return "";
        if (Array.isArray(graphUris)) {
            var fromStr = "";
            graphUris.forEach(function (item) {
                fromStr += from + "  <" + item + "> ";
            });
            return fromStr;
        } else {
            return from + "  <" + graphUris + ">";
        }
    };

    /*  self.executeQuery = function (schema, query, callback) {


          var url = schema.sparql_url + "?format=json&query=";
          Sparql_proxy.querySPARQL_GET_proxy(url, query, "", null, function (err, result) {
              if (err) {
                  return callback(err)
              }
              return callback(null, result.results.bindings)

          })
      }*/

    return self;
})();
