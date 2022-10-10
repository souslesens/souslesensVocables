/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
var Sparql_INDIVIDUALS = (function () {
    var self = {};

    self.ancestorsDepth = 6;

    self.getTopConcepts = function (sourceLabel, options, callback) {
        if (!options) options = {};
        var fromStr = "";

        var strFilterTopConcept;
        var topClassFilter = Config.sources[sourceLabel].topClassFilter;
        if (topClassFilter) strFilterTopConcept = topClassFilter;
        else strFilterTopConcept = "?topConcept ?x ?y. filter(NOT EXISTS {?topConcept rdfs:subClassOf ?z}) ";

        self.graphUri = Config.sources[sourceLabel].graphUri;
        self.sparql_url = Config.sources[sourceLabel].sparql_server.url;
        fromStr = Sparql_common.getFromStr(sourceLabel);

        if (Config.sources[sourceLabel].topClass) self.topClass = Config.sources[sourceLabel].topClass;

        var query =
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "prefix owl: <http://www.w3.org/2002/07/owl#>" +
            "select   distinct ?topConcept  ?topConceptLabel  " +
            fromStr +
            "  where {" +
            strFilterTopConcept +
            " OPTIONAL{?topConcept rdfs:label ?topConceptLabel.}";
        if (options.filterCollections) query += "?collection skos:member ?aConcept. ?aConcept rdfs:subClassOf+ ?topConcept." + Sparql_common.setFilter("collection", options.filterCollections);
        query += "}order by ?topConceptLabel ";
        (" }");
        var limit = options.limit || Config.queryLimit;
        query += " limit " + limit;
        var url = self.sparql_url + "?format=json&query=";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, "topConcept", { type: "http://www.w3.org/2002/07/owl#Class" });
            return callback(null, result.results.bindings);
        });
    };

    self.getNodeChildren = function (sourceLabel, words, ids, descendantsDepth, options, callback) {
        return callback(null, []);
    };

    self.getNodeInfos = function (sourceLabel, conceptId, options, callback) {
        if (!options) options = {};
        var fromStr = "";

        self.graphUri = Config.sources[sourceLabel].graphUri;
        self.sparql_url = Config.sources[sourceLabel].sparql_server.url;

        fromStr = Sparql_common.getFromStr(sourceLabel);

        var query = "select * " + fromStr + " where {<" + conceptId + "> ?prop ?value. } ";
        (" }");
        var limit = options.limit || Config.queryLimit;
        query += " limit " + limit;

        var url = self.sparql_url + "?format=json&query=";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result.results.bindings);
        });
    };
    self.getNodeParents = function (sourceLabel, words, ids, ancestorsDepth, options, callback) {
        self.graphUri = Config.sources[sourceLabel].graphUri;
        self.sparql_url = Config.sources[sourceLabel].sparql_server.url;
        if (!options) options = {};
        var strFilter = "";
        if (words) {
            strFilter = Sparql_common.setFilter("concept", null, words, options);
        } else if (ids) {
            strFilter = Sparql_common.setFilter("concept", ids, null);
        }

        var fromStr = Sparql_common.getFromStr(sourceLabel);
        var _owlPredicate = "subClassOf";

        var query =
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            " select distinct *  " +
            fromStr +
            "  WHERE {";

        query += "?concept rdfs:label ?conceptLabel. " + "?concept rdf:type ?broader1." + "FILTER (!isBlank(?concept))" + strFilter;

        query += "  }";

        if (options.filterCollections) {
            query += "MINUS {?collection skos:member* ?aCollection.?acollection skos:member ?broader" + Sparql_common.getUriFilter("collection", options.filterCollections);
        }

        var limit = options.limit || Config.queryLimit;
        query += " limit " + limit;

        var url = self.sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["concept", "broader"]);
            return callback(null, result.results.bindings);
        });
    };

    self.getItems = function (sourceLabel, options, callback) {
        if (!options) {
            options = {};
        }
        self.graphUri = Config.sources[sourceLabel].graphUri;
        self.sparql_url = Config.sources[sourceLabel].sparql_server.url;

        var fromStr = Sparql_common.getFromStr(sourceLabel);

        var query = "";
        query += "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" + "PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" + "PREFIX owl: <http://www.w3.org/2002/07/owl#>";

        query += " select distinct * " + fromStr + "  WHERE { ?sub ?pred ?obj. FILTER (!isBlank(?sub))";
        query += "OPTIONAL {?sub rdfs:label ?subLabel.}";
        query += "OPTIONAL {?obj rdfs:label ?objLabel.}";
        query += "OPTIONAL {?sub rdf:type ?subType.}";
        query += "OPTIONAL {?obj rdf:type ?objType.}";

        if (options.filter) query += options.filter;
        if (options.lang) query += "filter(lang(?subLabel )='" + options.lang + "')";

        query += "  } ";
        (" }");
        var limit = options.limit || Config.queryLimit;
        query += " limit " + limit;

        var url = self.sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }

            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["sub", "pred", "obj"]);
            return callback(null, result.results.bindings);
        });
    };

    self.findByWords = function (source, words, options, callback) {
        if (!options) options = {};
        var filterTypeStr = "";
        if (options.type) filterTypeStr = " ?sub rdf:type  <" + options.type + "> ";

        var fromStr = Sparql_common.getFromStr(source);
        var filterStr = Sparql_common.setFilter("obj", null, words, options);
        var query =
            " PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "        SELECT distinct * " +
            fromStr +
            " WHERE {" +
            "        ?sub ?pred ?objLabel " +
            filterStr +
            filterTypeStr;
        //  +"        ?sub rdf:type  ?type"  // type makes query execution longer

        var limit = options.limit || Config.queryLimit;
        query += "} order by ?sub limit " + limit;

        var url = Config.sources[source].sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result.results.bindings);
        });
    };

    self.getObjectProperties = function (sourceLabel, ids, options, callback) {
        if (!options) {
            options = {};
        }

        //  var filterStr = "FILTER (?domain in (<"+ids[0]+">) || ?range in (<"+ids[0]+">))"
        var filterStr = Sparql_common.setFilter(["domain", "range"], ids);

        self.graphUri = Config.sources[sourceLabel].graphUri;
        self.sparql_url = Config.sources[sourceLabel].sparql_server.url;

        var fromStr = Sparql_common.getFromStr(sourceLabel);

        var selectStr = " distinct * ";
        var groupByStr = "";
        if (options.propertiesStats) {
            selectStr = "  ?prop ?rangeType ?domainType  (count(?range) as ?nRanges) (count(?domain) as ?nDomains)  ";
            groupByStr = " GROUP BY  ?prop ?rangeType ?domainType  ";
        }
        fromStr = Sparql_common.getFromStr(sourceLabel);
        var uriPattern = Config.topLevelOntologies[Config.currentTopLevelOntology].uriPattern;
        var query =
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
            "select " +
            selectStr +
            "  " +
            fromStr +
            "  WHERE {{" +
            "   ?domain ?prop ?range. ?domain rdfs:label ?domainLabel.  ?range rdfs:label ?rangeLabel. " +
            " ?range rdf:type ?rangeType. ?domain rdf:type ?domainType. filter(regex(str(?prop)," +
            uriPattern +
            ")) " +
            filterStr +
            "}";
        /*   +
                "UNION "+
                "  {?range  ?prop ?domain. ?domain rdfs:label ?domainLabel.  ?range rdfs:label ?rangeLabel. " +
                " ?range rdf:type ?rangeType. ?domain rdf:type ?domainType. filter(regex(str(?prop),\"part14\")) "+filterStr+"}"*/

        var limit = options.limit || Config.queryLimit;
        query += "}" + groupByStr + " limit " + limit;

        var url = self.sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["prop", "domain", "range", "rangeType", "domainType"]);
            return callback(null, result.results.bindings);
        });
    };

    return self;
})();
