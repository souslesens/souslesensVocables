import fs from 'fs';
import Util from '../util..js';
import tripleBuilder from '../KGtripleBuilder.';
import util from '../util.';
import async from 'async';

var clusterQuery =
    "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
    'SELECT distinct ?relation (GROUP_CONCAT(?predLabel;SEPARATOR=",") AS ?gptProp) from <http://data.total.com/resource/tsf/ontology/ontogaia/gpt/> WHERE {\n' +
    "  ?sub rdfs:subClassOf ?x .\n" +
    "  ?x owl:someValuesFrom ?obj .\n" +
    "   ?x owl:onProperty ?pred .\n" +
    "  ?sub rdfs:label ?subLabel .\n" +
    "  ?obj rdfs:label ?objLabel .\n" +
    "  ?pred rdfs:label ?predLabel .\n" +
    '  BIND(concat(?subLabel," -> ",?objLabel) AS ?relation)\n' +
    "} \n" +
    "group by ?relation\n" +
    "\n" +
    "LIMIT 1000";

/*
PREFIX owl: <http://www.w3.org/2002/07/owl#>
 PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT distinct ?relationLabel count (distinct ?fact) from <http://data.total.com/resource/tsf/ontology/ontogaia/gpt2/> WHERE {
      ?fact owl:onProperty ?relation .
?relation rdfs:label ?relationLabel.


    }
group by ?relationLabel order by desc (count (distinct ?fact))

    LIMIT 10000




 */

var EntityLinking_gaia = {
    readData: function (filePath, callback) {
        var json;
        if (Array.isArray(filePath)) {
            json = filePath;
        } else {
            var str = "" + fs.readFileSync(filePath);
            json = JSON.parse(str);
        }

        var entitiesMap = {};
        var relationsMap = {};
        var docsMap = {};

        var lineEntities = {};
        json.forEach(function (line, index) {
            var docId = line.Id;
            docsMap[docId] = { text: line.text };
            line.Entities.forEach(function (item) {
                var label = item.labels[0].substring(4);

                if (!entitiesMap[label]) {
                    entitiesMap[label] = [];
                }
                entitiesMap[label].push({ id: item.id, line: index, text: item.text, term: item.text, docId: docId });
                lineEntities[item.id] = { entity: label, term: item.text };
            });

            line.annotation_relations.forEach(function (item) {
                if (!relationsMap[item.type]) {
                    relationsMap[item.type] = {};
                }
                if (!relationsMap[item.type][docId]) {
                    relationsMap[item.type][docId] = [];
                }
                if (!lineEntities[item.from]) {
                    return console.log("error from  in line" + line);
                }
                if (!lineEntities[item.to]) {
                    return console.log("error to  in line" + line);
                }

                relationsMap[item.type][docId].push({
                    from: lineEntities[item.from].entity,
                    to: lineEntities[item.to].entity,
                    commonDocIds: [],
                    fromTerm: lineEntities[item.from].term,
                    toTerm: lineEntities[item.to].term,
                });
            });
        });

        /* var relationsDoIdsMap={}

     for (var key in relationsMap) {
       var relations = relationsMap[key];
       for (var docId in relations) {
         relations[docId].forEach(function(relation, index) {
           if (docsMap[relation.from] && docsMap[relation.to]) {
             if (docsMap[relation.from].indexOf(docId) > -1 && docsMap[relation.to].indexOf(docId) > -1)
               relationsMap[key][docId][index].commonDocIds.push(docId)
             else
               var x=3
           }

         })
       }

       }*/

        callback(null, { entitiesMap: entitiesMap, relationsMap: relationsMap, docsMap: docsMap });
    },

    insertTriples: function (relationsMap, entitiesMap, docsMap, callback) {
        var modelGraphUri = "http://data.total.com/resource/tsf/ontology/ontogaia/gpt2/model/";
        var dataGraphUri = "http://data.total.com/resource/tsf/ontology/ontogaia/gpt2/";

        var modelTriples = [];

        function addClassTriples(name, superClass) {
            var uri = "<" + modelGraphUri + name + ">";
            modelTriples.push({
                s: uri,
                p: "rdf:type",
                o: "owl:Class",
            });
            modelTriples.push({
                s: uri,
                p: "rdfs:subClassOf",
                o: superClass,
            });
            modelTriples.push({
                s: uri,
                p: "rdfs:label",
                o: "'" + Util.formatStringForTriple(name) + "'",
            });
            return uri;
        }

        function addPropertyTriples(name, superProp) {
            var uri = "<" + modelGraphUri + name + ">";
            modelTriples.push({
                s: uri,
                p: "rdf:type",
                o: "owl:ObjectProperty",
            });
            modelTriples.push({
                s: uri,
                p: "rdfs:subPropertyOf",
                o: superProp,
            });
            modelTriples.push({
                s: uri,
                p: "rdfs:label",
                o: "'" + Util.formatStringForTriple(name) + "'",
            });
            return uri;
        }

        function addRestriction(domainUri, propUri, rangeUri) {
            var blankNode = "<_:b" + util.getRandomHexaId(10) + ">";

            modelTriples.push({
                s: blankNode,
                p: "rdf:type",
                o: "owl:Restriction",
            });
            modelTriples.push({
                s: blankNode,
                p: "owl:onProperty",
                o: propUri,
            });
            if (rangeUri) {
                modelTriples.push({
                    s: blankNode,
                    p: "owl:someValuesFrom",
                    o: rangeUri,
                });
            }
            modelTriples.push({
                s: domainUri,
                p: "rdfs:subClassOf",
                o: blankNode,
            });
        }

        var uniqueEntities = {};

        // setModel
        {
            var factClassUri = addClassTriples("Fact", "<http://rds.posccaesar.org/ontology/lis14/rdl/InformationObject>");
            var documentClassUri = addClassTriples("Document", "<http://rds.posccaesar.org/ontology/lis14/rdl/InformationObject>");
            var entityClassUri = addClassTriples("Entity", "skos:Concept");
            var termClassUri = addClassTriples("term", "skos:Concept");

            var gptRelationUri = addPropertyTriples("gptRelation", "<http://rds.posccaesar.org/ontology/lis14/rdl/connectedTo>");
            var inDocumentPropUri = addPropertyTriples("inDocument", "<http://rds.posccaesar.org/ontology/lis14/rdl/representedIn>");
            var documentHasTextUri = addPropertyTriples("documentHasText", "<http://rds.posccaesar.org/ontology/lis14/rdl/contains>");
            var factHasTermPropUri = addPropertyTriples("factContainsTerm", "<http://rds.posccaesar.org/ontology/lis14/rdl/contains>");
            var factHasEntityUri = addPropertyTriples("factContainsEntity", "<http://rds.posccaesar.org/ontology/lis14/rdl/contains>");
            var termInEntityUri = addPropertyTriples("termInEntity", "<http://rds.posccaesar.org/ontology/lis14/rdl/containedBy>");

            addRestriction(entityClassUri, gptRelationUri, entityClassUri);

            addRestriction(entityClassUri, inDocumentPropUri, documentClassUri);

            addRestriction(factClassUri, factHasTermPropUri, termClassUri);
            addRestriction(factClassUri, factHasTermPropUri, null);
            addRestriction(factClassUri, inDocumentPropUri, documentClassUri);
            addRestriction(factClassUri, "<http://rds.posccaesar.org/ontology/lis14/rdl/isAbout>", entityClassUri);
            addRestriction(termClassUri, termInEntityUri, entityClassUri);

            modelTriples.push({
                s: factClassUri,
                p: "rdfs:comment",
                o: " 'a couple of terms  inside a document linked by a GptRelation, each term belonging to an Entity'",
            });

            modelTriples.push({
                s: entityClassUri,
                p: "rdfs:comment",
                o: " 'Class (Entity)  conceptually predefined in Ontogaia Ontology  uses to extract entities from texts'",
            });

            modelTriples.push({
                s: termClassUri,
                p: "rdfs:comment",
                o: " 'Class of terms  extracted   from texts using Proxem studio matching Entities'",
            });

            modelTriples.push({
                s: documentClassUri,
                p: "rdfs:comment",
                o: " 'a Paragraph of text used for term, entity and entity linking extraction'",
            });

            /*   modelTriples.push({
        s: gptRelationUri,
        p: "rdfs:domain",
        o: entityClassUri
      });
      modelTriples.push({
        s: gptRelationUri,
        p: "rdfs:range",
        o: entityClassUri
      });

      modelTriples.push({
        s: inDocumentPropUri,
        p: "rdfs:domain",
        o: entityClassUri
      });
      modelTriples.push({
        s: inDocumentPropUri,
        p: "rdfs:range",
        o: documentClassUri
      });


      modelTriples.push({
        s: factHasTermPropUri,
        p: "rdfs:domain",
        o: entityClassUri
      });
      modelTriples.push({
        s: factHasTermPropUri,
        p: "rdfs:range",
        o: termClassUri
      });



      modelTriples.push({
        s: documentHasTextUri,
        p: "rdfs:domain",
        o: documentClassUri
      });*/
        }

        var dataTriples = [];
        if (true) {
            for (var key in relationsMap) {
                var relations = relationsMap[key];
                for (var docId in relations) {
                    var relation = relations[docId];

                    {
                        //documentNode
                        var docUri = "<" + dataGraphUri + Util.formatStringForTriple(docId, true) + ">";
                        dataTriples.push({
                            s: docUri,
                            p: "rdf:type",
                            o: "owl:Namedindividual",
                        });
                        dataTriples.push({
                            s: docUri,
                            p: "rdf:type",
                            o: documentClassUri,
                        });
                        dataTriples.push({
                            s: docUri,
                            p: "rdfs:label",
                            o: "'" + Util.formatStringForTriple(docId) + "'",
                        });
                    }

                    relation.forEach(function (item) {
                        var propUri = "<" + dataGraphUri + Util.formatStringForTriple(item.from + "_" + key + "_" + item.to, true) + ">";
                        var fromUri = "<" + dataGraphUri + Util.formatStringForTriple(item.from, true) + ">";
                        var toUri = "<" + dataGraphUri + Util.formatStringForTriple(item.to, true) + ">";
                        var fromTermUri = "<" + dataGraphUri + Util.formatStringForTriple(item.fromTerm, true) + ">";
                        var toTermUri = "<" + dataGraphUri + Util.formatStringForTriple(item.toTerm, true) + ">";
                        var factUri = "<" + dataGraphUri + util.getRandomHexaId(10) + ">";

                        if (true) {
                            var blankNode = "<_:b" + util.getRandomHexaId(10) + ">";
                            // GptProp
                            if (!uniqueEntities[propUri]) {
                                uniqueEntities[propUri] = 1;

                                dataTriples.push({
                                    s: propUri,
                                    p: "rdfs:label",
                                    o: "'" + Util.formatStringForTriple(item.from + "-" + key + "-" + item.to) + "'",
                                });
                                dataTriples.push({
                                    s: propUri,
                                    p: "rdf:type",
                                    o: "owl:ObjectProperty",
                                });
                                dataTriples.push({
                                    s: propUri,
                                    p: "rdfs:subPropertyOf",
                                    o: gptRelationUri,
                                });
                            }

                            //entityFrom Class
                            if (!uniqueEntities[item.from]) {
                                uniqueEntities[item.from] = 1;
                                dataTriples.push({
                                    s: fromUri,
                                    p: "rdf:type",
                                    o: "owl:Class",
                                });
                                dataTriples.push({
                                    s: fromUri,
                                    p: "rdfs:subClassOf",
                                    o: entityClassUri,
                                });
                                dataTriples.push({
                                    s: fromUri,
                                    p: "rdfs:label",
                                    o: "'" + Util.formatStringForTriple(item.from) + "'",
                                });
                            }

                            //entityTo Class
                            if (!uniqueEntities[item.to]) {
                                uniqueEntities[item.to] = 1;
                                dataTriples.push({
                                    s: toUri,
                                    p: "rdf:type",
                                    o: "owl:Class",
                                });
                                dataTriples.push({
                                    s: toUri,
                                    p: "rdfs:label",
                                    o: "'" + Util.formatStringForTriple(item.to) + "'",
                                });
                                dataTriples.push({
                                    s: toUri,
                                    p: "rdfs:subClassOf",
                                    o: entityClassUri,
                                });
                            }

                            //term
                            if (!uniqueEntities[item.fromTerm]) {
                                uniqueEntities[item.fromTerm] = 1;
                                dataTriples.push({
                                    s: fromTermUri,
                                    p: "rdf:type",
                                    o: termClassUri,
                                });
                                dataTriples.push({
                                    s: fromTermUri,
                                    p: "rdf:type",
                                    o: "owl:NameIndividual",
                                });
                                dataTriples.push({
                                    s: fromTermUri,
                                    p: "rdfs:label",
                                    o: "'" + Util.formatStringForTriple(item.fromTerm) + "'",
                                });
                                dataTriples.push({
                                    s: fromTermUri,
                                    p: termInEntityUri,
                                    o: fromUri,
                                });
                            }
                            if (!uniqueEntities[item.toTerm]) {
                                uniqueEntities[item.toTerm] = 1;
                                dataTriples.push({
                                    s: toTermUri,
                                    p: "rdf:type",
                                    o: termClassUri,
                                });
                                dataTriples.push({
                                    s: toTermUri,
                                    p: "rdf:type",
                                    o: "owl:NameIndividual",
                                });
                                dataTriples.push({
                                    s: toTermUri,
                                    p: "rdfs:label",
                                    o: "'" + Util.formatStringForTriple(item.toTerm) + "'",
                                });

                                dataTriples.push({
                                    s: toTermUri,
                                    p: termInEntityUri,
                                    o: toUri,
                                });
                            }

                            //fact
                            if (!uniqueEntities[factUri]) {
                                uniqueEntities[factUri] = 1;
                                dataTriples.push({
                                    s: factUri,
                                    p: "rdf:type",
                                    o: factClassUri,
                                });
                                dataTriples.push({
                                    s: factUri,
                                    p: "rdf:type",
                                    o: "owl:NamedIndividual",
                                });
                                dataTriples.push({
                                    s: factUri,
                                    p: "rdfs:label",
                                    o: "'" + Util.formatStringForTriple(item.fromTerm + "_" + key + "_" + item.toTerm) + "'",
                                });

                                /*  dataTriples.push({
                  s: factUri,
                  p: propUri,
                  o: "'" + Util.formatStringForTriple(item.fromTerm + "_" + key + "_" + item.toTerm) + "'"
                });*/

                                dataTriples.push({
                                    s: factUri,
                                    p: "<http://www.w3.org/2002/07/owl#onProperty>",
                                    o: propUri,
                                });

                                dataTriples.push({
                                    s: factUri,
                                    p: factHasEntityUri,
                                    o: fromUri,
                                });
                                dataTriples.push({
                                    s: factUri,
                                    p: "rdfs:label",
                                    o: fromUri,
                                });

                                dataTriples.push({
                                    s: factUri,
                                    p: factHasTermPropUri,
                                    o: fromTermUri,
                                });

                                dataTriples.push({
                                    s: factUri,
                                    p: factHasEntityUri,
                                    o: toUri,
                                });

                                dataTriples.push({
                                    s: factUri,
                                    p: factHasTermPropUri,
                                    o: toTermUri,
                                });

                                dataTriples.push({
                                    s: factUri,
                                    p: inDocumentPropUri,
                                    o: docUri,
                                });
                            }

                            if (true) {
                                dataTriples.push({
                                    s: docUri,
                                    p: documentHasTextUri,
                                    o: "'" + Util.formatStringForTriple(docsMap[docId].text) + "'",
                                });
                            }
                        }
                    });
                }
            }
        }
        var sparqlServerUrl = "";
        var slices = util.sliceArray(dataTriples, 200);
        console.log("-- data triples length :" + dataTriples.length);

        // slices = slices.slice(0, 30);

        var sliceIndex = 0;

        var totalTriples = 0;
        async.series(
            [
                function (callbackSeries) {
                    //model
                    tripleBuilder.clearGraph(modelGraphUri, sparqlServerUrl, function (err, result) {
                        callbackSeries();
                    });
                },

                function (callbackSeries) {
                    //model
                    var modelSlices = util.sliceArray(modelTriples, 200);
                    async.eachSeries(
                        modelSlices,
                        function (slice, callbackEach) {
                            tripleBuilder.writeTriples(slice, modelGraphUri, sparqlServerUrl, function (err, result) {
                                if (err) {
                                    return callbackSeries(err);
                                }
                                console.log("-- model triples saved :" + modelTriples.length);

                                callbackEach();
                            });
                        },
                        function (err) {
                            callbackSeries(err);
                        },
                    );
                },
                function (callbackSeries) {
                    //data
                    tripleBuilder.clearGraph(dataGraphUri, sparqlServerUrl, function (err, result) {
                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    //data
                    async.eachSeries(
                        slices,
                        function (slice, callbackEach) {
                            tripleBuilder.writeTriples(slice, dataGraphUri, sparqlServerUrl, function (err, result) {
                                if (err) {
                                    return callbackEach(err);
                                }
                                totalTriples += slice.length;
                                console.log("-- triples saved :" + totalTriples);

                                callbackEach();
                            });
                        },
                        function (err) {
                            callbackSeries(err);
                        },
                    );
                },
            ],

            function (err) {
                if (err) {
                    return console.log(err);
                }
                return console.log("DONE");
            },
        );
    },

    concatDir: function (dir, filePath) {
        var json = [];
        var files = fs.readdirSync(dir);
        for (var i = 0; i < files.length; i++) {
            var str = "" + fs.readFileSync(dirPath + files[i]);
            json.push(JSON.parse(str));
        }

        return json;
    },
};

module.exports = EntityLinking_gaia;

var filePath = "D:\\NLP\\ontologies\\OntoGaia\\label_studio_relation_relations_samples.json";
var dirPath = "D:\\NLP\\ontologies\\OntoGaia\\20230323\\";

var json = EntityLinking_gaia.concatDir(dirPath);

EntityLinking_gaia.readData(json, function (err, result) {
    EntityLinking_gaia.insertTriples(result.relationsMap, result.entitiesMap, result.docsMap);
});
