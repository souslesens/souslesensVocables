import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import Lineage_whiteboard from "../lineage/lineage_whiteboard.js";
import VisjsGraphClass from "../../graph/VisjsGraphClass.js";

var AxiomExtractor = (function () {
    var self = {}
    self.basicAxioms={}
    self.prefixes = "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
        " PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
        "  PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>"
    self.getFromStr = function (source) {
        return Sparql_common.getFromStr(source)
    }

    var extractFns = [
        function getSubClasses   (source, callback) {
            var query = self.prefixes + "SELECT distinct *  " + self.getFromStr(source) + "\n" +
                "WHERE { ?s rdfs:subClassOf ?o  }"
            self.execQuery(query, function (err, result) {
                if (err) {
                    return callback(err);
                }
                return callback(null, result)
            })

        },
        function getRestrictions(source, callback) {
            var query = self.prefixes + "SELECT distinct *  " + self.getFromStr(source) + "\n" +
                "WHERE { ?subject rdf:type owl:Restriction." +
                "  ?subject owl:onProperty ?prop .\n" +
                "   ?subject ?constraintType ?object." +
                " ?object rdf:type ?objectType." +
                "optional {?subject ?cardinalityType ?cardinalityValue " +
                " FILTER (?cardinalityType in (owl:maxCardinality,owl:minCardinality,owl:cardinality ))}  filter (?constraintType in (owl:someValuesFrom, owl:allValuesFrom,owl:hasValue,owl:onClass))  } "
            self.execQuery(query, function (err, result) {
                if (err) {
                    return callback(err);
                }


                var restrictions = []

                result.forEach(function (item) {
                    restrictions.push({s: item.subject, p: item.prop, o: item.object})

                })
                return callback(null, restrictions)
            })
        },
       function getIntesections(source, callback) {
            var query = self.prefixes + "SELECT distinct *  " + self.getFromStr(source) + "\n" +
                "WHERE { ?s owl:intersectionOf  ?o } "
            self.execQuery(query, function (err, result) {
                if (err) {
                    return callback(err);
                }
                return callback(null, result)
            })

        },
        function getUnions   (source, callback) {
            var query = self.prefixes + "SELECT distinct *  " + self.getFromStr(source) + "\n" +
                "WHERE { ?s owl:unionOf  ?o } "
            self.execQuery(query, function (err, result) {
                if (err) {
                    return callback(err);
                }
                return callback(null, result)
            })
        },
        function getFirsts   (source, callback) {
            var query = self.prefixes + "SELECT distinct *  " + self.getFromStr(source) + "\n" +
                "WHERE { ?s rdf:first  ?o }"
            self.execQuery(query, function (err, result) {
                if (err) {
                    return callback(err);
                }
                return callback(null, result)
            })

        },
        function getRests   (source, callback) {
            var query = self.prefixes + "SELECT distinct *  " + self.getFromStr(source) + "\n" +
                "WHERE { ?s rdf:rest  ?o filter (?o !=rdf:nil) }"
            self.execQuery(query, function (err, result) {
                if (err) {
                    return callback(err);
                }
                return callback(null, result)
            })

        }
    ]


    self.loadBasicAxioms=function(source,callback){
        var basicAxioms = {}
        async.eachSeries(extractFns, function (fn, callbackEach) {
            fn(source, function (err, result) {
                if (err) {
                    return callbackEach(err)
                }
                result.forEach(function (item) {
                    if (!basicAxioms[item.s]) {
                        basicAxioms[item.s] = []
                    }
                    basicAxioms[item.s].push(item)
                })

                callbackEach()

            })


        }, function (err) {
            if (err) {
                return callback ? callback(err) : alert(err)
            }
            return callback ? callback(null, basicAxioms) : "done"

        })
    }


    self.extractAllAxioms = function (source, callback) {
        if (!source) {
            source = "IOF-CORE-202401"
        }

        self.loadBasicAxioms(source, function(err, basicAxioms){
            if (err) {
                return callback ? callback(err) : alert(err)
                }
            self.basicAxioms[source]=basicAxioms
           var axioms= self.getClassAxioms(source,"https://spec.industrialontologies.org/ontology/core/Core/PlannedProcess")




        })

    }



    self.getClassAxioms=function(source, classUri){
      var sourceBasicAxioms=self.basicAxioms[source];
      if(!sourceBasicAxioms){
          return alert ("source axioms not loaded")
      }
      var rootNode=sourceBasicAxioms[classUri]
        if(!rootNode){
            return (alert ("classUri not found in axioms "+ classUri))
        }

        var visjsData={nodes:[],edges:[]}
        var distinctNodes={}
        function recurse(object){
            if(!distinctNodes[object]){
                distinctNodes[object]=1
                visjsData.nodes.push({
                    id:object,
                    label:Sparql_common.getLabelFromURI(object),
                    shape:"dot"
                })
                if(sourceBasicAxioms[object]){
                    if(!object.startsWith("http")){//stop on classes and properties
                        var children=sourceBasicAxioms[object]
                        children.forEach(function(child){
                            var label="";
                            if(child.o.startsWith("http"))
                                label=Sparql_common.getLabelFromURI(child.o)
                            visjsData.edges.push({
                                from: object,
                                to: child.o,
                                label:label
                            })
                        })

                    }
                }




            }

        }

        recurse(rootNode)

        var x=visjsData


    }


    function getDisjointQuery(graphUri, filter, subject) {
        var from = Sparql_common.getFromStr(source)

        if (!filter) {
            filter = ""
        }

        return "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            " PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            " SELECT distinct * " + from + " \n" +
            "WHERE {\n" +
            "\n" +
            "  { <" + subject + "> (owl:intersectionOf | owl:unionOf |owl:disjointWith)?disjoint. ?disjoint (rdf:first|rdf:rest)+ ?object." +
            "optional{?object rdf:type ?objectType}" +
            "  }\n" +
            filter +
            "} " +
            "limit 10000"
    }


    var nodes = []
    var nodesArray = []
    var distinctNodes = {}
    var edges = []


    self.execQuery = function (query, callback) {
        var url = Config.sparql_server.url
        Sparql_proxy.querySPARQL_GET_proxy(
            url,
            query,
            "",
            {},
            function (err, result) {
                if (err) {
                    return callback(err);
                }
                result.results.bindings.forEach(function (item) {
                    for (var key in item) {
                        item[key] = item[key].value
                    }

                })

                return callback(null, result.results.bindings);
            },
        );
    }


    return self;


})
()

export default AxiomExtractor
window.AxiomExtractor = AxiomExtractor