var express = require("express");
var router = express.Router();
var path = require("path");
var serverParams = { routesRootUrl: "" };

var elasticRestProxy = require("../bin/elasticRestProxy..js");
var authentication = require("../bin/authentication..js");
var logger = require("../bin/logger..js");
var httpProxy = require("../bin/httpProxy.");
var mediawikiTaggger = require("../bin/mediawiki/mediawikiTagger.");

var OneModelManager = require("../other/oneModel/OneModelManager.");
var KGcontroller = require("../bin/KG/KGcontroller.");
var DataController = require("../bin/dataController.");
var KGbuilder = require("../bin/KG/KGbuilder.");
var DirContentAnnotator = require("../bin/annotator/dirContentAnnotator.");
var configManager = require("../bin/configManager.");
var DictionariesManager = require("../bin/KG/dictionariesManager.");

const promiseFs = require("fs").promises;

/* GET home page. */
router.get("/", function (req, res, next) {
    res.redirect("vocables");
});

router.get("/users", function (req, res, next) {
    res.sendFile(path.join(__dirname, "/../config/users/users.json"));
});
router.put("/users", async function (req, res, next) {
    try {
        await promiseFs.writeFile(path.join(__dirname, "/../config/users/users.json"), JSON.stringify(req.body, null, 2));
        res.sendFile(path.join(__dirname, "/../config/users/users.json"));
    } catch (err) {
        res.sendStatus(500);
        console.log(err);
    }
});

router.get("/profiles", function (req, res, next) {
    res.sendFile(path.join(__dirname, "/../config/profiles.json"));
});

router.put("/profiles", async function (req, res, next) {
    try {
        await promiseFs.writeFile(path.join(__dirname, "/../config/profiles.json"), JSON.stringify(req.body, null, 2));
        res.sendFile(path.join(__dirname, "/../config/profiles.json"));
    } catch (err) {
        res.sendStatus(500);
        console.log(err);
    }
});

router.get("/sources", function (req, res, next) {
    res.sendFile(path.join(__dirname, "/../config/sources.json"));
});

router.put("/sources", async function (req, res, next) {
    try {
        await promiseFs.writeFile(path.join(__dirname, "/../config/sources.json"), JSON.stringify(req.body, null, 2));
        res.sendFile(path.join(__dirname, "/../config/sources.json"));
    } catch (err) {
        res.sendStatus(500);
        console.log(err);
    }
});

router.get("/", function (req, res, next) {
    res.render("index", { title: "Express" });
});

router.post("/upload", function (req, response) {
    let sampleFile;
    let uploadPath;

    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send("No files were uploaded.");
    }
    if (req.files.EvaluateToolZipFile) {
        var zipFile = req.files.EvaluateToolZipFile;
        DirContentAnnotator.uploadAndAnnotateCorpus(zipFile, req.body.corpusName, JSON.parse(req.body.sources), JSON.parse(req.body.options), function (err, result) {
            processResponse(response, err, result);
        });
    }
});

router.post(
    serverParams.routesRootUrl + "/slsv",
    function (req, response) {
        if (req.body.getGeneralConfig) {
            configManager.getGeneralConfig(function (err, result) {
                processResponse(response, err, result);
            });
        }

        if (req.body.elasticSearch) {
            elasticRestProxy.executePostQuery(req.body.url, JSON.parse(req.body.executeQuery), JSON.parse(req.body.indexes), function (err, result) {
                processResponse(response, err, result);
            });
        }

        if (req.body.tryLoginJSON) {
            authentication.authentify(req.body.login, req.body.password, function (err, result) {
                processResponse(response, err, result);
            });
        }

        if (req.body.getProfiles) {
            configManager.getProfiles({}, function (err, result) {
                processResponse(response, err, result);
            });
        }

        if (req.body.getSources) {
            configManager.getSources({}, function (err, result) {
                processResponse(response, err, result);
            });
        }
        if (req.body.getBlenderSources) {
            configManager.getBlenderSources({}, function (err, result) {
                processResponse(response, err, result);
            });
        }
        if (req.body.createNewResource) {
            configManager.createNewResource(req.body.sourceName, req.body.graphUri, req.body.targetSparqlServerUrl, JSON.parse(req.body.options), function (err, result) {
                processResponse(response, err, result);
            });
        }
        if (req.body.deleteResource) {
            configManager.deleteResource(req.body.sourceName, req.body.graphUri, req.body.sparqlServerUrl, function (err, result) {
                processResponse(response, err, result);
            });
        }

        if (req.body.KGmappingDictionary) {
            if (req.body.load)
                configManager.getDictionary(req.body.load, function (err, result) {
                    processResponse(response, err, result);
                });
        }

        if (req.body.httpProxy) {
            httpProxy.setProxyForServerDomain(req.headers.host);

            if (req.body.POST) {
                var body = JSON.parse(req.body.body);
                httpProxy.post(req.body.url, body.headers, body.params, function (err, result) {
                    processResponse(response, err, result);
                });
            } else {
                var options = {};
                if (req.body.options) {
                    if (typeof req.body.options == "string") options = JSON.parse(req.body.options);
                    else options = req.body.options;
                }
                options.host = req.headers.host;
                httpProxy.get(req.body.url, options, function (err, result) {
                    processResponse(response, err, result);
                });
            }
        }

        if (req.body.analyzeSentence) {
            elasticRestProxy.analyzeSentence(req.body.analyzeSentence, function (err, result) {
                processResponse(response, err, result);
            });
        }

        if (req.body.annotateLive) {
            var annotatorLive = require("../bin/annotatorLive.");
            var sources = JSON.parse(req.body.sources);
            annotatorLive.annotate(req.body.text, sources, function (err, result) {
                processResponse(response, err, result);
            });
        }

        if (req.body.getConceptsSubjectsTree) {
            DirContentAnnotator.getConceptsSubjectsTree(req.body.corpusName, function (err, result) {
                processResponse(response, err, result);
            });
        }

        if (req.body.annotateAndStoreCorpus) {
            DirContentAnnotator.annotateAndStoreCorpus(req.body.corpusPath, JSON.parse(req.body.sources), req.body.corpusName, JSON.parse(req.body.options), function (err, result) {
                processResponse(response, err, result);
            });
        }
        if (req.body.getAnnotatedCorpusList) {
            DirContentAnnotator.getAnnotatedCorpusList(req.body.group, function (err, result) {
                processResponse(response, err, result);
            });
        }

        if (req.body.writeUserLog) {
            var ip = req.header("x-forwarded-for") || req.connection.remoteAddress;
            req.body.infos += "," + ip;

            logger.info(req.body.infos);
            processResponse(response, null, { done: 1 });
        }
        if (req.body.KGquery) {
            KGcontroller.KGquery(req, function (err, result) {
                processResponse(response, err, result);
            });
        }
        if (req.body.buildKG) {
            var mappingFileNames = JSON.parse(req.body.mappingFileNames);
            KGbuilder.buidlKG(
                mappingFileNames,
                req.body.sparqlServerUrl,
                req.body.adlGraphUri,
                JSON.parse(req.body.replaceGraph),
                JSON.parse(req.body.dataSource),
                JSON.parse(req.body.options),
                function (err, result) {
                    processResponse(response, err, result);
                }
            );
        }
        if (req.body.KG_GetMappings) {
            KGcontroller.getMappings(req.body.KG_GetMappings, function (err, result) {
                processResponse(response, err, result);
            });
        }

        if (req.body.dictionaries_listIndexes) {
            DictionariesManager.listIndexes(function (err, result) {
                processResponse(response, err, result);
            });
        }

        if (req.body.dictionaries_indexSource) {
            DictionariesManager.indexSource(req.body.indexName, JSON.parse(req.body.data), JSON.parse(req.body.options), function (err, result) {
                processResponse(response, err, result);
            });
        }

        if (req.body.getAssetGlobalMappings) {
            KGcontroller.getAssetGlobalMappings(req.body.getAssetGlobalMappings, function (err, result) {
                processResponse(response, err, result);
            });
        }

        if (req.query.SPARQLquery) {
            var query = req.body.query;
            if (req.query.graphUri) query = query.replace(/where/gi, "from <" + req.query.graphUri + "> WHERE ");

            if (req.query.method == "POST") {
                var headers = {};
                headers["Accept"] = "application/sparql-results+json";
                headers["Content-Type"] = "application/x-www-form-urlencoded";

                httpProxy.post(req.query.url, headers, { query: query }, function (err, result) {
                    processResponse(response, err, result);
                });
            } else if (req.query.method == "GET") {
                var headers = {};
                headers["Accept"] = "application/sparql-results+json";
                headers["Content-Type"] = "application/x-www-form-urlencoded";

                var query2 = encodeURIComponent(query);
                query2 = query2.replace(/%2B/g, "+").trim();
                var url = req.query.url + "?format=json&query=" + query2;
                httpProxy.get(url, headers, function (err, result) {
                    if (result && typeof result === "string") result = JSON.parse(result.trim());
                    processResponse(response, err, result);
                });
            }
        }

        if (req.body.uploadOntologyFromOwlFile) {
            OneModelManager.uploadOntologyFromOwlFile(req.body.graphUri, req.body.filePath, function (err, result) {
                processResponse(response, err, result);
            });
        }
        if (req.body.KG_SaveMappings) {
            KGcontroller.saveMappings(req.body.KGsource, req.body.mappings, function (err, result) {
                processResponse(response, err, result);
            });
        }

        if (req.body.saveData) {
            DataController.saveDataToFile(req.body.dir, req.body.fileName, req.body.data, function (err, result) {
                processResponse(response, err, result);
            });
        }

        if (req.body.listDirFiles) {
            DataController.getFilesList(req.body.dir, function (err, result) {
                processResponse(response, err, result);
            });
        }
        if (req.body.readDataFile) {
            DataController.readfile(req.body.dir, req.body.fileName, function (err, result) {
                processResponse(response, err, result);
            });
        }
    },

    router.get("/heatMap", function (req, res, next) {
        var elasticQuery = JSON.parse(req.query.query);

        statistics.getEntitiesMatrix(null, elasticQuery, function (err, result) {
            processResponse(res, err, result);
        });
    }),

    router.get("/httpProxy", function (req, res, next) {
        httpProxy.get(req.query, function (err, result) {
            processResponse(res, err, result);
        });
    }),
    router.get("/ontology/*", function (req, res, next) {
        if (req.params.length == 0) return req.send("missing ontology label");
        var name = req.params[0];
        OneModelManager.getOntology(name, function (err, result) {
            //  res.setHeader('Content-type', "text:plain");
            // response.send(JSON.stringify(resultObj));
            res.send(result);
        });
    }),
    router.get("/15926/part14/", function (req, res, next) {
        OneModelManager.getOntology("http://standards.iso.org/iso/15926/part14/", function (err, result) {
            //  res.setHeader('Content-type', "text:plain");
            // response.send(JSON.stringify(resultObj));
            res.send(result);
        });
    })
);

function processResponse(response, error, result) {
    if (response && !response.finished) {
        /*   res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE'); // If needed
            res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,contenttype'); // If needed
            res.setHeader('Access-Control-Allow-Credentials', true); // If needed.setHeader('Content-Type', 'application/json');*/

        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE"); // If needed
        response.setHeader("Access-Control-Allow-Headers", "X-Requested-With,contenttype"); // If needed
        response.setHeader("Access-Control-Allow-Credentials", true); // If needed*/

        if (error) {
            if (typeof error == "object") {
                if (error.message) error = error.message;
                else error = JSON.stringify(error, null, 2);
            }
            console.log("ERROR !!" + error);
            //   socket.message("ERROR !!" + error);
            return response.status(404).send({ ERROR: error });
        } else if (!result) {
            return response.send({ done: true });
        } else {
            if (typeof result == "string") {
                resultObj = { result: result };
                //  socket.message(resultObj);
                response.send(JSON.stringify(resultObj));
            } else {
                if (result.contentType && result.data) {
                    response.setHeader("Content-type", result.contentType);
                    if (typeof result.data == "object") response.send(JSON.stringify(result.data));
                    else response.send(result.data);
                } else {
                    var resultObj = result;
                    response.setHeader("Content-type", "application/json");
                    // response.send(JSON.stringify(resultObj));
                    response.send(resultObj);
                }
            }
        }
    }
}

module.exports = router;
