var Sparql_ISO_15926 = (function () {
        var self = {};
        self.graphUri="<http://data.15926.org/rdl>"
        self.graphUri=null;//"<http://data.15926.org/rdl>"
    self.ancestorsDepth=6
        self.sparql_url = "http://192.236.179.169/sparql";
        var elasticUrl = "/elastic";
        if (window.location.href.indexOf("https") > -1)
            elasticUrl = "../elastic";




        function prefixLabelWithScheme(id,label){
          var array=id.split("/")
            if(array.length!=5)
                return label;
            return array[3]+"_"+label


        }
        self.getTopConcepts = function (sourceLabel, options, callback) {


            var query = "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> "
            query += "select * where{?topConcept rdfs:subClassOf <http://data.15926.org/dm/Thing>."+
                "?topConcept rdfs:label ?topConceptLabel." +
                "}order by ?conceptLabel limit 5000"

            self.execute_GET_query(query, function (err, result) {
                if (err) {
                    return callback(err)
                }
                return callback(null, result.results.bindings);
            })

        }


        self.getNodeChildren = function (sourceLabel, words, ids, descendantsDepth, options, callback) {
            var strFilter;
            if (words) {
                strFilter = Sparql_generic.setFilter("concept", null, words, null)
            } else if (ids) {
                strFilter = Sparql_generic.setFilter("concept", ids, null)
            }

            var query = "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
                "select distinct *  where { ?child1 rdfs:subClassOf ?concept. "+strFilter+
            "?child1 rdfs:label ?child1Label."


         //   descendantsDepth = Math.min(descendantsDepth, optionalDepth);
            for (var i = 1; i < descendantsDepth; i++) {

                query += "OPTIONAL { ?child" + (i + 1) + " rdfs:subClassOf ?child" + i + "." +
                    "?child" + (i + 1) + " rdfs:label  ?child" + (i + 1) + "Label."

            }
            for (var i = 1; i < descendantsDepth; i++) {
                query += "} "
            }


           query+= "}" +
            "LIMIT 10000"

            var url = self.sparql_url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", null, function (err, result) {
                if (err) {
                    return callback(err)
                }
                var bindings=[]
                result.results.bindings.forEach(function (item) {
                    item.child1Type={value:"http://www.w3.org/2004/02/skos/core#Concept"}
                    item.child1Label.value=prefixLabelWithScheme(item.child1.value,item.child1Label.value)

                })
                return callback(null, result.results.bindings)

            })

        }

        self.getNodeInfos = function (sourceLabel,conceptId,options, callback) {

            var query = "select *" +
                " where {<" + conceptId + "> ?prop ?value. } limit 500";
            self.execute_GET_query(query, function (err, result) {
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
                "PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +

                " select distinct *   WHERE {{"

            query += "?concept rdfs:label ?conceptLabel. " + strFilter;


            ancestorsDepth = self.ancestorsDepth
            for (var i = 1; i <= ancestorsDepth; i++) {
                if (i == 1) {
                    query += "  ?concept rdfs:subClassOf  ?broader" + i + "." +
                        "?broader" + (i) + " rdfs:label ?broader" + (i) + "Label."


                } else {

                        query += "OPTIONAL { ?broader" + (i - 1) + " rdfs:subClassOf ?broader" + i + "."


                    query += "?broader" + (i) + " rdfs:label ?broader" + (i) + "Label."

                }


            }


             for (var i = 1; i < ancestorsDepth; i++) {
                 query += "} "

             }

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
                    item.broader1Type = {value: "http://www.w3.org/2004/02/skos/core#Concept"}
                    for(var i=1;i<20;i++) {
                        if( item["broader"+i])
                        item["broader"+i+"Label"].value = prefixLabelWithScheme(item["broader"+i].value, item["broader"+i+"Label"].value)
                    }
                    item.conceptLabel.value=prefixLabelWithScheme(item.concept.value,item.conceptLabel.value)

                })
                return callback(null, result.results.bindings)

            })
        }




        self.execute_GET_query = function (query, callback) {
            var query2 = encodeURIComponent(query);
            query2 = query2.replace(/%2B/g, "+").trim()

            var url =  self.sparql_url+ "?output=json&query=" + query2;

            var body = {
                headers: {
                    "Accept": "application/sparql-results+json",
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Referer": self.graphUri,
                }
            }
            var payload = {
                httpProxy: 1,
                url: url,
                body: body,
                options: {a: 1},
                GET: true


            }

            $.ajax({
                type: "POST",
                url: elasticUrl,
                data: payload,
                dataType: "json",
                /* beforeSend: function(request) {
                     request.setRequestHeader('Age', '10000');
                 },*/

                success: function (data, textStatus, jqXHR) {
                    if (data.result && typeof data.result != "object")//cas GEMET
                        data = JSON.parse(data.result)
                    //  $("#messageDiv").html("found : " + data.results.bindings.length);
                    $("#waitImg").css("display", "none");
                    /*  if (data.results.bindings.length == 0)
                          return callback({data.results.bindings:},[])*/
                    callback(null, data)

                }
                , error: function (err) {
                    $("#messageDiv").html(err.responseText);

                    $("#waitImg").css("display", "none");
                    console.log(JSON.stringify(err))
                    console.log(JSON.stringify(query))
                    if (callback) {
                        return callback(err)
                    }
                    return (err);
                }

            });
        }


        return self;


    }
)()
