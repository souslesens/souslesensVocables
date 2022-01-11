var express = require("express");
const bcrypt = require("bcrypt");
var fs = require("fs");
const promiseFs = require("fs").promises;
var path = require("path");
var passport = require("passport");

var elasticRestProxy = require(path.resolve("bin/elasticRestProxy..js"));
var authentication = require(path.resolve("bin/authentication..js"));
var logger = require(path.resolve("bin/logger..js"));
var httpProxy = require(path.resolve("bin/httpProxy."));
var mediawikiTaggger = require(path.resolve("bin/mediawiki/mediawikiTagger."));
var RDF_IO = require(path.resolve("bin/RDF_IO."));
var KGcontroller = require(path.resolve("bin/KG/KGcontroller."));
var DataController = require(path.resolve("bin/dataController."));
var KGbuilder = require(path.resolve("bin/KG/KGbuilder."));
var DirContentAnnotator = require(path.resolve("bin/annotator/dirContentAnnotator."));
var configManager = require(path.resolve("bin/configManager."));
var DictionariesManager = require(path.resolve("bin/KG/dictionariesManager."));

const config = require(path.resolve("config/mainConfig.json"));
const users = require(path.resolve("config/users/users.json"));

var router = express.Router();
var serverParams = { routesRootUrl: "" };

// ensureLoggedIn function
// TODO: Remove this when the API is moved to OpenAPI as OpenApi uses securityHandlers
// see : https://github.com/kogosoftwarellc/open-api/tree/master/packages/express-openapi#argssecurityhandlers
if (!config.disableAuth) {
    ensureLoggedIn = function ensureLoggedIn(options) {
        config.auth == "keycloak" ? passport.authenticate("keycloak", { failureRedirect: "/login" }) : null;
        return function (req, res, next) {
            if (!req.isAuthenticated || !req.isAuthenticated()) {
                return res.redirect(401, "/login");
            }
            next();
        };
    };
} else {
    ensureLoggedIn = function ensureLoggedIn(options) {
        return function (req, res, next) {
            next();
        };
    };
}

// Home (redirect to /vocables)
router.get("/", function (req, res, next) {
    res.redirect("vocables");
});

// Login routes
if (!config.disableAuth) {
    if (config.auth == "keycloak") {
        router.get("/login", passport.authenticate("provider", { scope: ["openid", "email", "profile"] }));
        router.get("/login/callback", passport.authenticate("provider", { successRedirect: "/", failureRedirect: "/login" }));
    } else {
        router.get("/login", function (req, res, next) {
            res.render("login", { title: "souslesensVocables - Login" });
        });
        router.post(
            "/auth/login",
            passport.authenticate("local", {
                successRedirect: "/vocables",
                failureRedirect: "/login",
                failureMessage: true,
            })
        );
    }
} else {
    router.get("/login", function (req, res, next) {
        res.redirect("vocables");
    });
}

// Users/profile/sources routes
// TODO: move this routes to OpenApi
router.get("/users", ensureLoggedIn(), function (req, res, next) {
    res.sendFile(path.join(__dirname, "/../config/users/users.json"));
});
router.put("/users", ensureLoggedIn(), async function (req, res, next) {
    // Hash password that are not hashed yet
    Object.keys(req.body).forEach(function (key, index) {
        if (req.body[key].password && !req.body[key].password.startsWith("$2b$")) {
            req.body[key].password = bcrypt.hashSync(req.body[key].password, 10);
        }
    });
    // Write the file
    try {
        await promiseFs.writeFile(path.join(__dirname, "/../config/users/users.json"), JSON.stringify(req.body, null, 2));
        res.sendFile(path.join(__dirname, "/../config/users/users.json"));
    } catch (err) {
        res.sendStatus(500);
        console.log(err);
    }
});

router.get("/profiles", ensureLoggedIn(), function (req, res, next) {
    res.sendFile(path.join(__dirname, "/../config/profiles.json"));
});

router.put("/profiles", ensureLoggedIn(), async function (req, res, next) {
    try {
        await promiseFs.writeFile(path.join(__dirname, "/../config/profiles.json"), JSON.stringify(req.body, null, 2));
        res.sendFile(path.join(__dirname, "/../config/profiles.json"));
    } catch (err) {
        res.sendStatus(500);
        console.log(err);
    }
});

router.get("/sources", ensureLoggedIn(), function (req, res, next) {
    res.sendFile(path.join(__dirname, "/../config/sources.json"));
});

router.put("/sources", ensureLoggedIn(), async function (req, res, next) {
    try {
        await promiseFs.writeFile(path.join(__dirname, "/../config/sources.json"), JSON.stringify(req.body, null, 2));
        res.sendFile(path.join(__dirname, "/../config/sources.json"));
    } catch (err) {
        res.sendStatus(500);
        console.log(err);
    }
});

router.post("/upload", ensureLoggedIn(), function (req, response) {
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
    ensureLoggedIn(),
    function (req, response) {
        if (req.body.elasticSearch) {
            elasticRestProxy.executePostQuery(req.body.url, JSON.parse(req.body.executeQuery), JSON.parse(req.body.indexes), function (err, result) {
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
        if (req.body.addImportToSource) {
            configManager.addImportToSource(req.body.parentSource, req.body.importedSource, function (err, result) {
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
            RDF_IO.uploadOntologyFromOwlFile(req.body.graphUri, req.body.filePath, function (err, result) {
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
    router.get("/heatMap", ensureLoggedIn(), function (req, res, next) {
        var elasticQuery = JSON.parse(req.query.query);

        statistics.getEntitiesMatrix(null, elasticQuery, function (err, result) {
            processResponse(res, err, result);
        });
    }),

    router.get("/httpProxy", ensureLoggedIn(), function (req, res, next) {
        httpProxy.get(req.query, function (err, result) {
            processResponse(res, err, result);
        });
    }),
    router.get("/ontology/*", ensureLoggedIn(), function (req, res, next) {
        if (req.params.length == 0) return req.send("missing ontology label");
        var name = req.params[0];
        RDF_IO.getOntology(name, function (err, result) {
            res.contentType("text/plain");
            res.status(200).send(result);
        });
    }),
    router.get("/getJsonFile", ensureLoggedIn(), function (req, res, next) {
        //  if (req.body.filePath){}
        var filePath = req.query.filePath;
        var realPath = path.join(__dirname, "../public/vocables/" + filePath);
        var data = "" + fs.readFileSync(realPath);
        var json = JSON.parse(data);
        processResponse(res, null, json);
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

            return response.status(404).send({ ERROR: error });
        } else if (!result) {
            return response.send({ done: true });
        } else {
            if (typeof result == "string") {
                resultObj = { result: result };

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
