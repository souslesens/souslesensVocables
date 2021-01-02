var Sparql_ISO_15926_part4 = (function () {
        var self = {};
        self.ancestorsDepth = 6

        var elasticUrl=Config.serverUrl

        function prefixLabelWithScheme(id, label) {
            var array = id.split("/")
            if (array.length != 5)
                return label;
            return array[3] + "_" + label


        }

        self.getTopConcepts = function (sourceLabel, options, callback) {

          /*  if( !self.sparql_url ) {
                self.sparql_url = Config.sources[sourceLabel].sparql_server.url;
                return self.selectGraphDialog()
            }*/
            self.graphUri =  Config.sources[sourceLabel].graphUri ;
            self.sparql_url =  Config.sources[sourceLabel].sparql_server.url;


            var query = "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>"
            query += "select distinct ?topConcept  from <"+self.graphUri+"> where{" +
               "?topConcept rdfs:subClassOf <http://standards.iso.org/iso/15926/part14#class>." +
                "}order by ?conceptLabel limit 5000"

            self.execute_GET_query(query, function (err, result) {
                if (err) {
                    return callback(err)
                }
                result.results.bindings.forEach(function(item){
                    item.topConceptType = {value: "http://www.w3.org/2004/02/skos/core#Concept"}
                    var id=item.topConcept.value
                    item.topConceptLabel={value:id.substring(id.lastIndexOf("#")+1)}
                })
                return callback(null, result.results.bindings);
            })

        }


        self.getNodeChildren = function (sourceLabel, words, ids, descendantsDepth, options, callback) {

            self.graphUri = Config.sources[sourceLabel].graphUri;
            self.sparql_url = Config.sources[sourceLabel].sparql_server.url;
            var strFilter;
            if (words) {
                strFilter = Sparql_common.setFilter("concept", null, words, options)
            } else if (ids) {
                strFilter = Sparql_common.setFilter("concept", ids,null, options)
            }

            var query = "PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>"+
                "select distinct *  from <"+self.graphUri+"> where { ?child1 rdfs:subClassOf|rdf:type ?concept. " + strFilter ;



            for (var i = 1; i < descendantsDepth; i++) {
                query += "OPTIONAL { ?child" + (i + 1) + " rdfs:subClassOf ?child" + i + "." +
                  "OPTIONAL{?child" + (i + 1) + " rdfs:label  ?child" + (i + 1) + "Label.}"

            }
            for (var i = 1; i < descendantsDepth; i++) {
                query += "} "
            }


            query += "}" +
                "LIMIT 10000"

            self.execute_GET_query( query, function (err, result) {
                if (err) {
                    return callback(err)
                }
                result.results.bindings=Sparql_generic.setBindingsOptionalProperties(result.results.bindings,"child")
                return callback(null, result.results.bindings)

            })

        }

        self.getNodeInfos = function (sourceLabel, conceptId, options, callback) {
            self.graphUri = Config.sources[sourceLabel].graphUri;
            self.sparql_url = Config.sources[sourceLabel].sparql_server.url;

            var query = "select *  from <"+self.graphUri+">" +
                " where {<" + conceptId + "> ?prop ?value. } limit 500";
            self.execute_GET_query(query, function (err, result) {
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
            var strFilter;
            if (words) {
                strFilter = Sparql_common.setFilter("concept", null, words, options)
            } else if (ids) {
                strFilter = Sparql_common.setFilter("concept", ids, null)
            }
            var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>"+
                "PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +

                " select distinct *  from <"+self.graphUri+">  WHERE {{"

            query += "?concept rdfs:label ?conceptLabel. " + strFilter;


            ancestorsDepth = self.ancestorsDepth
            for (var i = 1; i <= ancestorsDepth; i++) {
                if (i == 1) {
                    query += "  ?concept rdfs:subClassOf  ?broader" + i + "."



                } else {

                    query += "OPTIONAL { ?broader" + (i - 1) + " rdfs:subClassOf ?broader" + i + "."+
                    "OPTIONAL { ?broader" + (i ) + " rdfs:subClassOf ?broader" + i + "."



                }


            }


            for (var i = 1; i < ancestorsDepth; i++) {
                query += "} "

            }

            query += "  }";

            if (options.filterCollections) {
                query += "MINUS {?collection skos:member* ?aCollection.?acollection skos:member ?broader" + Sparql_common.getUriFilter("collection", options.filterCollections)
            }
            query += "}limit 1000 ";


            self.execute_GET_query( query,  function (err, result) {
                if (err) {
                    return callback(err)
                }
                var bindings = []
                result.results.bindings.forEach(function (item) {
                    item.broader1Type = {value: "http://www.w3.org/2004/02/skos/core#Concept"}


                for (var i = 1; i < 20; i++) {
                        if (item["broader" + i]){
                            var id=item["broader" + i].value;
                                item["broader" + i + "Label"]={value:id.substring(id.lastIndexOf("#")+1)}
                        }
                           // item["broader" + i + "Label"].value = prefixLabelWithScheme(item["broader" + i].value, item["broader" + i + "Label"].value)
                    }
                 //   item.conceptLabel.value = prefixLabelWithScheme(item.concept.value, item.conceptLabel.value)

                })
                return callback(null, result.results.bindings)

            })
        }


        self.execute_GET_query = function (query, callback) {

            var query2 = encodeURIComponent(query);
            query2 = query2.replace(/%2B/g, "+").trim()

            var url = self.sparql_url + "?output=json&format=json&query=" + query2;
//
            var body = {
                headers: {
                    "Accept": "application/sparql-results+json",
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Referer":""// "<" + self.graphUri + ">",
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
                    var xx=data
                    if(typeof data==="string")
                        data=JSON.parse(data)
                   else if (data.result && typeof data.result != "object")//cas GEMET
                        data = JSON.parse(data.result.trim())

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

        self.selectGraphDialog = function (callback) {
            var query = "select distinct ?g WHERE{ GRAPH ?g{?a ?b ?c}} order by ?g"
            Sparql_ISO_15926.execute_GET_query(query, function (err, result) {
                if (err)
                    return MainController.UI.message(err);
                var sparql_urls=[]
                result.results.bindings.forEach(function (item) {
                    sparql_urls.push(item.g.value)

                })

                $("#mainDialogDiv").dialog("open");
var html="select a endPoint<br> <select size='20' id='Sparql_ISO_15926_sparql_urlSelect'onclick='Sparql_ISO_15926.setCurrentSparql_url($(this).val())'></select>"
                sparql_urls.sort();
                sparql_urls.splice(0,0,"ALL")
                $("#mainDialogDiv").html(html);
                setTimeout(function(){
                    common.fillSelectOptions("Sparql_ISO_15926_sparql_urlSelect",sparql_urls)
                },200)
            })


        }

        self.setCurrentSparql_url=function(sparql_url){

            if(graphUri="ALL")
           ;
            else
                self.sparql_url=sparql_url;
            $("#mainDialogDiv").dialog("close");

        }


        return self;


    }
)()
