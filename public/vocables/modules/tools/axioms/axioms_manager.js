import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";


/**
 * one graph for each axiom , uri=[Source graphUri]/  »concepts »/[classUri.lastpart]/[axiomType]/[id]/
 *
 *
 * @type {{}}
 */
var Axioms_manager = (function() {
    var self = {};
    const conceptStr = "concept";


    self.saveAxiom = function(source, axiomType, nodeUri, triples, callback) {

        var sourceGraphUri = Config.sources[source].graphUri;
        if (!sourceGraphUri) {
            return alert(" no graphUri for source " + source);
        }
        if (!sourceGraphUri.endsWith("/") && !sourceGraphUri.endsWith("#")) {
            sourceGraphUri += "/";
        }
        var classIdentifier = "";
        var p = nodeUri.lastIndexOf("#");
        if (p < 0) {
            p = nodeUri.lastIndexOf("/");
        }
        if (p == nodeUri.length - 1) {
            p = nodeUri.substring(0, p).lastIndexOf("/");
        }
        classIdentifier = nodeUri.substring(p + 1);

        var axiomId = common.getRandomHexaId(5);
        var axiomGraphUri = sourceGraphUri + conceptStr + "/" + classIdentifier + "/" + axiomType + "/" + axiomId;


        Sparql_generic.insertTriples(null, triples, { graphUri: axiomGraphUri }, function(err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result);

        });


    };

    self.loadAxiomsSubgraphsMap = function(sourceLabel, callback) {
        if (sourceLabel) {
            sourceLabel = Axiom_editor.currentSource;
        }
        if (!sourceLabel) {
            return alert("no source selected");
        }

        var sourceGraphUri = Config.sources[sourceLabel].graphUri;
        if (!sourceGraphUri) {
            return alert(" no graphUri for source " + sourceLabel);
        }
        var subGraphsMap = {};


        var graphUriRoot = sourceGraphUri;
        if (!graphUriRoot.endsWith("/") && !graphUriRoot.endsWith("#")) {
            graphUriRoot += "/";
        }

        var sourceAxiomsMap = {};
        async.series([
            // get all subGraphs
            function(callbackSeries) {

                Sparql_OWL.getGraphsWithSameClasses(sourceLabel, function(err, result) {
                    result.forEach(function(item) {
                        if (item.g.value.startsWith(graphUriRoot+  conceptStr)) {
                            subGraphsMap[item.g.value] = [];

                        }
                    });
                    callbackSeries();
                });
            },
            // get each axioms content   from its subGraph
            function(callbackSeries) {

                async.eachSeries(Object.keys(subGraphsMap), function(subGraph, callbackEach) {
                    Sparql_OWL.getTriples(null, { graphUri: subGraph }, function(err, result) {
                        result.forEach(function(item) {
                            subGraphsMap[subGraph].push(item);
                        });
                        callbackEach();
                    });

                }, function(err) {
                    return callbackSeries();
                });

            },
            function(callbackSeries) {

                for (var key in subGraphsMap) {
                    var triples = [];
                    subGraphsMap[key].forEach(function(item) {
                        triples.push({
                            subject: item.s.value,
                            predicate: item.p.value,
                            object: item.o.value
                        });
                    });

                    var array = key.replace(graphUriRoot , "").split("/");
                    var className = array[1];

                    var axiomType = array[2];
                    var axiomId = array[3];
                    if (!sourceAxiomsMap[className]) {
                        sourceAxiomsMap[className] = {};
                    }
                    if (!sourceAxiomsMap[className][axiomType]) {
                        sourceAxiomsMap[className][axiomType] = [];
                    }
                    sourceAxiomsMap[className][axiomType].push({id:axiomId,triples:triples})
                }

                return callbackSeries();
            }
        ], function(err) {
            return callback(err, sourceAxiomsMap);
        });

    };


    return self;


})();

export default Axioms_manager;
window.Axiom_manager = Axioms_manager;