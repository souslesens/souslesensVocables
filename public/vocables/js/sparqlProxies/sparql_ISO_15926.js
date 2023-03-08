/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var Sparql_ISO_15926 = (function () {
    var self = {};
    self.ancestorsDepth = 6;

    self.getTopConcepts = function (sourceLabel, _options, callback) {
        self.sparql_url = Config.sources[sourceLabel].sparql_server.url;
        /*  if( !self.sparql_url ) {
                self.sparql_url = Config.sources[sourceLabel].sparql_server.url;
                return self.selectGraphDialog()
            }*/

        var query = "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>";
        query +=
            "select * where{" +
            // "?topConcept rdfs:subClassOf <http://data.15926.org/dm/Thing>." +
            "?topConcept rdfs:subClassOf <http://data.posccaesar.org/dm/Thing>." +
            "?topConcept rdfs:label ?topConceptLabel." +
            "?topConcept rdf:type ?topConceptType." +
            "}order by ?subjectLabel limit 5000";

        self.execute_GET_query(query, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result.results.bindings);
        });
    };

    self.getNodeChildren = function (sourceLabel, words, ids, descendantsDepth, options, callback) {
        self.graphUri = Config.sources[sourceLabel].graphUri;
        self.sparql_url = Config.sources[sourceLabel].sparql_server.url;
        var strFilter = "";
        if (words) {
            strFilter = Sparql_common.setFilter("subject", null, words, options);
        } else if (ids) {
            strFilter = Sparql_common.setFilter("subject", ids, null, options);
        }

        var query =
            "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "select distinct *  where { ?child1 rdfs:subClassOf ?subject. " +
            strFilter +
            "?child1 rdfs:label ?child1Label." +
            "?child1 rdf:type ?child1Type.";

        for (let i = 1; i < descendantsDepth; i++) {
            query += "OPTIONAL { ?child" + (i + 1) + " rdfs:subClassOf ?child" + i + "." + "OPTIONAL {?child" + (i + 1) + " rdfs:label  ?child" + (i + 1) + "Label.}";
        }
        for (let i = 1; i < descendantsDepth; i++) {
            query += "} ";
        }

        query += "}" + "LIMIT 10000";

        self.execute_GET_query(query, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result.results.bindings);
        });
    };

    self.getNodeInfos = function (sourceLabel, conceptId, _options, callback) {
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
        self.graphUri = Config.sources[sourceLabel].graphUri;
        self.sparql_url = Config.sources[sourceLabel].sparql_server.url;

        if (!options) options = {};
        var strFilter = "";
        if (words) {
            strFilter = Sparql_common.setFilter("subject", null, words, options);
        } else if (ids) {
            strFilter = Sparql_common.setFilter("subject", ids, null);
        }
        var query =
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            " select distinct *   WHERE {{";

        query += "?subject rdfs:label ?subjectLabel. " + strFilter;

        ancestorsDepth = self.ancestorsDepth;
        for (let i = 1; i <= ancestorsDepth; i++) {
            if (i == 1) {
                query += "  ?subject rdfs:subClassOf  ?broader" + i + "." + "?broader" + i + " rdfs:label ?broader" + i + "Label.";
            } else {
                query += "OPTIONAL { ?broader" + (i - 1) + " rdfs:subClassOf ?broader" + i + ".";

                query += "?broader" + i + " rdfs:label ?broader" + i + "Label.";
            }
        }

        for (let i = 1; i < ancestorsDepth; i++) {
            query += "} ";
        }

        query += "  }";

        if (options.filterCollections) {
            query += "MINUS {?collection skos:member* ?aCollection.?acollection skos:member ?broader" + Sparql_common.getUriFilter("collection", options.filterCollections);
        }
        query += "}limit 1000 ";

        self.execute_GET_query(query, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings.forEach(function (item) {
                item.broader1Type = { value: "http://www.w3.org/2004/02/skos/core#Concept" };
            });
            return callback(null, result.results.bindings);
        });
    };

    self.execute_GET_query = function (query, callback) {
        var query2 = encodeURIComponent(query);
        query2 = query2.replace(/%2B/g, "+").trim();

        var url = self.sparql_url + "?output=json&format=json&query=" + query2;
        //
        var body = {
            headers: {
                Accept: "application/sparql-results+json",
                "Content-Type": "application/x-www-form-urlencoded",
                Referer: "", // "<" + self.graphUri + ">",
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
            url: Config.apiUrl,
            data: payload,
            dataType: "json",
            success: function (data, _textStatus, _jqXHR) {
                if (typeof data === "string") data = JSON.parse(data);
                else if (data.result && typeof data.result != "object")
                    //cas GEMET
                    data = JSON.parse(data.result.trim());

                callback(null, data);
            },
            error: function (err) {
                $("#messageDiv").html(err.responseText);

                $("#waitImg").css("display", "none");
                console.error(JSON.stringify(err));
                console.error(JSON.stringify(query));
                if (callback) {
                    return callback(err);
                }
                return err;
            },
        });
    };

    self.selectGraphDialog = function (_callback) {
        var query = "select distinct ?g WHERE{ GRAPH ?g{?a ?b ?c}} order by ?g";
        Sparql_ISO_15926.execute_GET_query(query, function (err, result) {
            if (err) return MainController.UI.message(err);
            var sparql_urls = [];
            result.results.bindings.forEach(function (item) {
                sparql_urls.push(item.g.value);
            });

            $("#mainDialogDiv").dialog("open");
            var html = "select a endPoint<br> <select size='20' id='Sparql_ISO_15926_sparql_urlSelect'onclick='Sparql_ISO_15926.setCurrentSparql_url($(this).val())'></select>";
            sparql_urls.sort();
            sparql_urls = ["ALL", ...sparql_urls];
            $("#mainDialogDiv").html(html);
            setTimeout(function () {
                common.fillSelectOptions("Sparql_ISO_15926_sparql_urlSelect", sparql_urls);
            }, 200);
        });
    };

    self.setCurrentSparql_url = function (sparql_url) {
        if (sparql_url !== "ALL") self.sparql_url = sparql_url;
        $("#mainDialogDiv").dialog("close");
    };

    return self;
})();
