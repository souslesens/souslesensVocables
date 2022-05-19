/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
var Sparql_NPD = (function () {
    var self = {};

    self.ancestorsDepth = 6;
    self.sparql_url = "http://51.178.139.80:8890/sparql";

    self.getTopConcepts = function (sourceLabel, options, callback) {
        self.graphUri = Config.sources[sourceLabel].graphUri;
        self.sparql_url = Config.sources[sourceLabel].sparql_server.url;

        var query =
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "prefix owl: <http://www.w3.org/2002/07/owl#>" +
            "" +
            "select   distinct *  from <" +
            self.graphUri +
            ">  where {";
        /*   "?topConcept   rdfs:label ?topConceptLabel." +
                " filter( not EXISTS {?topConcept rdfs:subClassOf ?d})" +
                "}limit 1000" */

        // query+="  ?prop   rdf:type owl:DatatypeProperty.  ?prop rdfs:domain ?topConcept.   ?prop rdfs:range ?range.   }limit 1000"
        query +=
            "   ?topConcept   rdfs:subClassOf ?class. filter (?class in(<http://www.ifomis.org/bfo/1.1/snap#Continuant> ,<http://www.ifomis.org/bfo/1.1/snap#IndependentContinuant>,<thttp://www.ifomis.org/bfo/1.1/snap#IndependentContinuant>))}order by ?topConcept limit 1000";
        //  query+="   ?topConcept   rdfs:subClassOf ?d}order by ?topConcept limit 1000"
        self.execute_GET_query(query, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings.forEach(function (item) {
                var id = item.topConcept.value;
                item.topConceptLabel = { value: id.substring(id.lastIndexOf("#") + 1) };
                item.topConceptType = { value: "http://www.w3.org/2004/02/skos/core#Concept" };
            });

            return callback(null, result.results.bindings);
        });
    };

    self.getNodeChildren = function (sourceLabel, words, ids, descendantsDepth, options, callback) {
        self.graphUri = Config.sources[sourceLabel].graphUri;
        self.sparql_url = Config.sources[sourceLabel].sparql_server.url;
        var strFilter = "";
        if (words) {
            strFilter = Sparql_common.setFilter("concept", null, words, null);
        } else if (ids) {
            strFilter = Sparql_common.setFilter("concept", ids, null);
        }

        var query =
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "select   distinct * from <" +
            self.graphUri +
            ">  where {" +
            "?child1   rdfs:subClassOf ?concept. " +
            strFilter +
            "} order by ?child1 limit 10000";

        var url = self.sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", null, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings.forEach(function (item) {
                item.child1Type = { value: "http://www.w3.org/2004/02/skos/core#Concept" };
                var id = item.child1.value;
                item.child1Label = { value: id.substring(id.lastIndexOf("#") + 1) };
            });
            return callback(null, result.results.bindings);
        });
    };

    self.getNodeInfos = function (sourceLabel, conceptId, options, callback) {
        self.graphUri = Config.sources[sourceLabel].graphUri;
        self.sparql_url = Config.sources[sourceLabel].sparql_server.url;

        var query = "select *" + " where {<" + conceptId + "> ?prop ?value. } limit 500";
        self.execute_GET_query(query, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result.results.bindings);
        });
    };
    self.getNodeParents = function (sourceLabel, words, ids, ancestorsDepth, options, callback) {
        if (!options) options = {};
        var strFilter = "";
        if (words) {
            strFilter = Sparql_common.setFilter("concept", null, words, { exactMatch: true });
        } else if (ids) {
            strFilter = Sparql_common.setFilter("concept", ids, null);
        }
        var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" + "PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" + " select distinct *   WHERE {{";

        query += "?concept rdfs:label ?conceptLabel. " + strFilter;

        ancestorsDepth = self.ancestorsDepth;
        for (var i = 1; i <= ancestorsDepth; i++) {
            if (i == 1) {
                query += "  ?concept rdfs:subClassOf  ?broader" + i + "." + "?broader" + i + " rdfs:label ?broader" + i + "Label.";
            } else {
                query += "OPTIONAL { ?broader" + (i - 1) + " rdfs:subClassOf ?broader" + i + ".";

                query += "?broader" + i + " rdfs:label ?broader" + i + "Label.";
            }
        }

        for (i = 1; i < ancestorsDepth; i++) {
            query += "} ";
        }

        query += "  }";

        if (options.filterCollections) {
            query += "MINUS {?collection skos:member* ?aCollection.?acollection skos:member ?broader" + Sparql_common.getUriFilter("collection", options.filterCollections);
        }
        query += "}limit 1000 ";

        var url = self.sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", null, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings.forEach(function (item) {
                item.child1Type = { value: "http://www.w3.org/2004/02/skos/core#Concept" };
            });
            return callback(null, result.results.bindings);
        });
    };

    self.execute_GET_query = function (query, callback) {
        var query2 = encodeURIComponent(query);
        query2 = query2.replace(/%2B/g, "+").trim();

        var url = self.sparql_url + "?output=json&query=" + query2;

        var body = {
            headers: {
                Accept: "application/sparql-results+json",
                "Content-Type": "application/x-www-form-urlencoded",
                Referer: self.graphUri,
            },
        };
        var payload = {
            url: url,
            body: body,
            options: { a: 1 },
            GET: true,
        };

        $.ajax({
            type: "POST",
            url: `${Config.apiUrl}/httpProxy`,
            data: payload,
            dataType: "json",
            /* beforeSend: function(request) {
                     request.setRequestHeader('Age', '10000');
                 },*/

            success: function (data, _textStatus, _jqXHR) {
                if (data.result && typeof data.result != "object")
                    //cas GEMET
                    data = JSON.parse(data.result);

                callback(null, data);
            },
            error: function (err) {
                $("#messageDiv").html(err.responseText);

                $("#waitImg").css("display", "none");
                // eslint-disable-next-line no-console
                console.log(JSON.stringify(err));
                // eslint-disable-next-line no-console
                console.log(JSON.stringify(query));
                if (callback) {
                    return callback(err);
                }
                return err;
            },
        });
    };

    return self;
})();
