var express = require('express');
var router = express.Router();
var serverParams = {routesRootUrl: ""}


var elasticRestProxy = require('../bin/elasticRestProxy..js');
var authentication = require('../bin/authentication..js');
var configLoader = require('../bin/configLoader..js');
var logger = require("../bin/logger..js");
//var indexer = require("../bin/backoffice/indexer..js")
//var imapMailExtractor = require("../bin/backoffice/imapMailExtractor.");
//var jobScheduler = require("../bin/backoffice/jobScheduler.")
//var statistics = require("../bin/backoffice/statistics.")
//var questionAnswering = require("../bin/questionAnswering.");
//var annotator_skos = require("../bin/backoffice/annotator_skos.");
//var skosReader = require("../bin/backoffice/skosReader..js");
var httpProxy = require("../bin/httpProxy.")
var mediawikiTaggger = require("../bin/mediawiki/mediawikiTagger.")

var OneModelManager = require('../other/oneModel/OneModelManager.');
var ADLcontroller = require('../bin/ADL/ADLcontroller.')
var DataController=require('../bin/dataController.')
var ADLbuilder = require("../bin/ADL/ADLbuilder.")
/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', {title: 'Express'});
});


router.post(serverParams.routesRootUrl + '/elastic', function (req, response) {
    //  console.log(JSON.stringify(req.body,null,2))

    if (req.body.executeQuery) {
        var queryObj = JSON.parse(req.body.executeQuery);
        var indexesStr = "";
        if (req.body.indexes) {
            var indexes = JSON.parse(req.body.indexes);
            if (Array.isArray(indexes)) {
                indexes.forEach(function (index, p) {
                    if (p > 0)
                        indexesStr += ","
                    indexesStr += index;
                })
            } else
                indexesStr = indexes
        }
        var url = "";
        if (req.body.url)
            url = req.body.url

        elasticRestProxy.executePostQuery(url + indexesStr + "/_search", queryObj, function (error, result) {
            //   logger.info("QUERY :" + JSON.stringify(queryObj.query.bool) + "\n indexes :" + req.body.indexes)
            processResponse(response, error, result);

        });

    }

    if (req.body.getUserIndexConfigs) {
        configLoader.getUserIndexConfigs(JSON.parse(req.body.userGroups), function (error, result) {
            processResponse(response, error, result)
        });

    }

    if (req.body.saveIndexConfig) {
        configLoader.saveIndexConfig(req.body.index, req.body.jsonStr, function (error, result) {
            processResponse(response, error, result)
        });

    }

    if (req.body.deleteIndexConfig) {
        var config = JSON.parse(req.body.config);
        if (req.body.deleteIndexContent) {
            indexer.deleteIndex(config, function (err, result) {
                if (err)
                    return processResponse(response, error, result)

                configLoader.deleteIndexConfig(config.general.indexName, function (error, result) {
                    processResponse(response, error, result)
                });
            })

        } else {
            configLoader.deleteIndexConfig(req.body.config.general.indexName, function (error, result) {
                processResponse(response, error, result)
            });
        }
    }


    if (req.body.executeMsearch) {
        elasticProxy.executeMsearch(req.body.ndjson, function (error, result) {
            processResponse(response, error, result)
        });

    }

    if (req.body && req.body.getTemplates) {
        configLoader.getTemplates(function (error, result) {
            processResponse(response, error, result)
        });
    }
    if (req.body && req.body.generateDefaultMappingFields) {

        configLoader.generateDefaultMappingFields(JSON.parse(req.body.connector), function (error, result) {
            processResponse(response, error, result);

        })

    }
    if (req.body && req.body.runIndexation) {

        indexer.runIndexation(JSON.parse(req.body.config), function (error, result) {
            processResponse(response, error, result);

        })

    }
    if (req.body && req.body.getAllProfiles) {
        configLoader.getAllProfiles(function (error, result) {
            processResponse(response, error, result);
        })
    }
    if (req.body && req.body.writeAllProfiles) {
        configLoader.writeAllProfiles(req.body.profiles, function (error, result) {
            processResponse(response, error, result);
        })
    }

    if (req.body && req.body.getAllJobs) {
        configLoader.getAllJobs(function (error, result) {
            processResponse(response, error, result);
        })
    }
    if (req.body && req.body.saveAllJobs) {
        configLoader.saveAllJobs(req.body.jobsStr, function (error, result) {
            processResponse(response, error, result);
        })
    }


    if (req.body && req.body.getAllThesaurusConfig) {
        configLoader.getAllThesaurusConfig(function (error, result) {
            processResponse(response, error, result);
        })
    }

    if (req.body && req.body.saveThesaurusConfig) {
        configLoader.saveThesaurusConfig(req.body.name, req.body.content, function (error, result) {
            processResponse(response, error, result);
        })
    }
    if (req.body && req.body.getUserThesauri) {
        configLoader.getUserThesaurus(JSON.parse(req.body.userGroups), function (error, result) {
            return processResponse(response, error, result);
        })
    }


    if (req.body && req.body.jobScheduler) {
        if (req.body.run) {
            jobScheduler.run(function (error, result) {
                processResponse(response, error, result);
            })
        }
        if (req.body.stop) {
            jobScheduler.stop(function (error, result) {
                processResponse(response, error, result);
            })
        }
    }
    if (req.body.tryLogin) {
        authentication.loginInDB(req.body.login, req.body.password, function (err, result) {
            processResponse(response, err, result)

        })

    }
    if (req.body.annotateCorpusFromRDFfile) {
        annotator_skos.annotateCorpusFromRDFfile(JSON.parse(req.body.thesaurusConfig), req.body.index, req.body.elasticUrl, function (err, result) {
            processResponse(response, err, result)

        })

    }


    if (req.body.answerQuestion) {
        questionAnswering.processQuestion(req.body.question, JSON.parse(req.body.options), function (err, result) {
            processResponse(response, err, result)

        })

    }


    if (req.body.rdfToEditor) {
        skosReader.rdfToEditor(req.body.rdfPath, JSON.parse(req.body.options), function (err, result) {
            processResponse(response, err, result)
        })
    }
    if (req.body.skosEditorToRdf) {
        skosReader.skosEditorToRdf(req.body.rdfPath, JSON.parse(req.body.data), JSON.parse(req.body.options), function (err, result) {
            processResponse(response, err, result)
        })
    }
    if (req.body.rdfToFlat) {
        skosReader.rdfToFlat(req.body.rdfPath, JSON.parse(req.body.options), function (err, result) {
            processResponse(response, err, result)
        })
    }

    if (req.body.rdfToVisjsGraph) {
        skosReader.rdfToVisjsGraph(req.body.rdfPath, JSON.parse(req.body.options), function (err, result) {
            processResponse(response, err, result)
        })
    }

    if (req.body.compareThesaurus) {
        skosReader.compareThesaurus(req.body.rdfPath1, req.body.rdfPath2, JSON.parse(req.body.options), function (err, result) {
            processResponse(response, err, result)
        })
    }


    if (req.body.getLOCchildren) {
        var lockskos = require('../bin/others/locskos.')
        lockskos.getLOCchildren(req.body.conceptId, req.body.maxLevels, function (err, result) {
            processResponse(response, err, result)
        })
    }
    if (req.body.tryLoginJSON) {

        authentication.authentify(req.body.login, req.body.password, function (err, result) {
            processResponse(response, err, result)
        })
    }
    if (req.body.httpProxy) {
        if (req.body.POST) {
            var body = JSON.parse(req.body.body)
            httpProxy.post(req.body.url, body.headers, body.params, function (err, result) {
                processResponse(response, err, result)
            })
        } else {
            var options = {};
            if (req.body.options) {
                if (typeof req.body.options == "string")
                    options = JSON.parse(req.body.options);
                else
                    options = req.body.options

            }
            httpProxy.get(req.body.url, options, function (err, result) {
                processResponse(response, err, result)
            })
        }
    }

    if (req.body.analyzeSentence) {

        elasticRestProxy.analyzeSentence(req.body.analyzeSentence, function (err, result) {
            processResponse(response, err, result)
        })
    }
    if (req.body.getWikimediaPageNonThesaurusWords) {

        mediawikiTaggger.getWikimediaPageNonThesaurusWords(req.body.elasticUrl, req.body.indexName, req.body.pageName, req.body.graphIri, req.body.pageCategoryThesaurusWords, function (err, result) {
            processResponse(response, err, result)

        })
    }

    if (req.body.annotateLive) {
        var annotatorLive = require("../bin/annotatorLive.")
        var sources = JSON.parse(req.body.sources)
        annotatorLive.annotate(req.body.text, sources, function (err, result) {
            processResponse(response, err, result)

        })
    }
        if (req.body.annotateDocumentsTree) {
            var DirContentAnnotator=require("../bin/annotator/dirContentAnnotator.")
            DirContentAnnotator.parseDocumentsDir(req.body.rootDirPath,req.body.name,JSON.parse(req.body.options), function (err, result) {
                processResponse(response, err, result)

            })
        }

    if (req.body.writeUserLog) {
        var ip = req.header('x-forwarded-for') || req.connection.remoteAddress;
        req.body.infos += "," + ip

        logger.info(req.body.infos)
        processResponse(response, null, {done: 1})


    }
    if (req.body.ADLquery) {
        var ADLSqlConnector = require("../bin/ADL/ADLSqlConnector.")
        var SQLserverConnector = require("../bin/ADL/SQLserverConnector.")
        if (req.body.getFromSparql) {

            ADLSqlConnector.getFromSparql(req.body.assetType, JSON.parse(req.body.quantumObjs), function (err, result) {
                processResponse(response, err, result)

            })
        }

        if (req.body.getModel) {
            req.body.getModel = JSON.parse(req.body.getModel)
            if (req.body.getModel.type == "sql.sqlserver") {
                SQLserverConnector.getADLmodel(req.body.getModel.dbName, function (err, result) {
                    processResponse(response, err, result)

                })
            } else {
                ADLSqlConnector.getADLmodel(req.body.getModel.dbName, function (err, result) {
                    processResponse(response, err, result)

                })
            }
        }


        if (req.body.getData) {
            req.body.dataSource = JSON.parse(req.body.dataSource)
            if (req.body.dataSource.type == "sql.sqlserver") {
                SQLserverConnector.getData(req.body.dataSource.dbName, req.body.sqlQuery, function (err, result) {
                    processResponse(response, err, result)

                })
            } else {
                ADLSqlConnector.getData(req.body.dataSource.dbName, req.body.sqlQuery, function (err, result) {
                    processResponse(response, err, result)

                })
            }
        }

    }
    if (req.body.buildADL) {


        var mappingFileNames=JSON.parse(req.body.mappingFileNames)
        ADLbuilder.buidlADL(mappingFileNames, req.body.sparqlServerUrl, req.body.adlGraphUri, req.body.rdlGraphUri, req.body.oneModelGraphUri, JSON.parse(req.body.replaceGraph), function (err, result) {
                processResponse(response, err, result)

            })
        }


                if (req.query.SPARQLquery) {

                    var query = req.body.query;
                    if (req.query.graphUri)
                        query = query.replace(/where/gi, 'from <' + req.query.graphUri + '> WHERE ')

                    if (req.query.method == "POST") {
                        var headers = {}
                        headers["Accept"] = "application/sparql-results+json";
                        headers["Content-Type"] = "application/x-www-form-urlencoded";


                        httpProxy.post(req.query.url, headers, {query: query}, function (err, result) {
                            processResponse(response, err, result)

                        })
                    } else if (req.query.method == "GET") {
                        var headers = {}
                        headers["Accept"] = "application/sparql-results+json";
                        headers["Content-Type"] = "application/x-www-form-urlencoded"

                        var query2 = encodeURIComponent(query);
                        query2 = query2.replace(/%2B/g, "+").trim()
                        var url = req.query.url + "?format=json&query=" + query2;
                        httpProxy.get(url, headers, function (err, result) {
                            if (result && typeof result === 'string')
                                result = JSON.parse(result.trim());
                            processResponse(response, err, result)

                        })
                    }
                }



                if (req.body.uploadOntologyFromOwlFile) {

                    OneModelManager.uploadOntologyFromOwlFile(req.body.graphUri, req.body.filePath, function (err, result) {
                        processResponse(response, err, result)

                    })
                }
                if (req.body.ADL_SaveMappings) {
                    ADLcontroller.saveMappings(req.body.ADLsource, req.body.mappings, function (err, result) {
                        processResponse(response, err, result)

                    })
                }
                if (req.body.ADL_GetMappings) {
                    ADLcontroller.getMappings(req.body.ADL_GetMappings, function (err, result) {
                        processResponse(response, err, result)

                    })
                }
                if (req.body.getAssetGlobalMappings) {
                    ADLcontroller.getAssetGlobalMappings(req.body.getAssetGlobalMappings, function (err, result) {
                        processResponse(response, err, result)

                    })
                }

        if (req.body.saveData) {
            DataController.saveDataToFile(req.body.dir, req.body.fileName, req.body.data, function (err, result) {
                processResponse(response, err, result)

            })
        }

        if (req.body.listDirFiles) {
            DataController.getFilesList(req.body.dir, function (err, result) {
                processResponse(response, err, result)

            })
        }
        if (req.body.readDataFile) {
            DataController.readfile(req.body.dir,req.body.fileName, function (err, result) {
                processResponse(response, err, result)

            })
        }



    },


            router.get('/heatMap', function (req, res, next) {
                var elasticQuery = JSON.parse(req.query.query);

                statistics.getEntitiesMatrix(null, elasticQuery, function (err, result) {
                    processResponse(res, err, result)
                })
            }),

            router.get('/httpProxy', function (req, res, next) {


                httpProxy.get(req.query, function (err, result) {
                    processResponse(res, err, result)
                })
            })
            ,
            router.get('/ontology/*', function (req, res, next) {
                if (req.params.length == 0)
                    return req.send("missing ontology label")
                var name = req.params[0]
                OneModelManager.getOntology(name, function (err, result) {
                    //  res.setHeader('Content-type', "text:plain");
                    // response.send(JSON.stringify(resultObj));
                    res.send(result);
                })
            })
            , router.get('/15926/part14/', function (req, res, next) {

                OneModelManager.getOntology("http://standards.iso.org/iso/15926/part14/", function (err, result) {
                    //  res.setHeader('Content-type', "text:plain");
                    // response.send(JSON.stringify(resultObj));
                    res.send(result);
                })
            })
        )


        function processResponse(response, error, result) {
            if (response && !response.finished) {
                /*   res.setHeader('Access-Control-Allow-Origin', '*');
                    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE'); // If needed
                    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,contenttype'); // If needed
                    res.setHeader('Access-Control-Allow-Credentials', true); // If needed.setHeader('Content-Type', 'application/json');*/

                response.setHeader('Access-Control-Allow-Origin', '*');
                response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE'); // If needed
                response.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,contenttype'); // If needed
                response.setHeader('Access-Control-Allow-Credentials', true); // If needed*/


                if (error) {

                    if (typeof error == "object") {
                        if (error.message)
                            error = error.message
                        else
                            error = JSON.stringify(error, null, 2);
                    }
                    console.log("ERROR !!" + error);
                    //   socket.message("ERROR !!" + error);
                    return response.status(404).send({ERROR: error});

                } else if (!result) {
                    return response.send({done: true});
                } else {

                    if (typeof result == "string") {
                        resultObj = {result: result};
                        //  socket.message(resultObj);
                        response.send(JSON.stringify(resultObj));
                    } else {
                        if (result.contentType && result.data) {
                            response.setHeader('Content-type', result.contentType);
                            if (typeof result.data == "object")
                                response.send(JSON.stringify(result.data));
                            else
                                response.send(result.data);
                        } else {
                            var resultObj = result;
                            response.setHeader('Content-type', "application/json");
                            // response.send(JSON.stringify(resultObj));
                            response.send(resultObj);
                        }
                    }
                }


            }
        }

        module.exports = router;
