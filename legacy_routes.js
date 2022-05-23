var express = require("express");
var fs = require("fs");
var path = require("path");
var passport = require("passport");
require("./bin/authentication.");
var httpProxy = require("./bin/httpProxy.");
var RDF_IO = require("./bin/RDF_IO.");
var DataController = require("./bin/dataController.");
var DirContentAnnotator = require("./bin/annotator/dirContentAnnotator.");
var configManager = require("./bin/configManager.");
var CsvTripleBuilder = require("./bin/KG/CsvTripleBuilder.");
const { processResponse } = require("./api/v1/paths/utils");

const { config } = require(path.resolve("model/config"));

var router = express.Router();
var serverParams = { routesRootUrl: "" };

// ensureLoggedIn function
// TODO: Remove this when the API is moved to OpenAPI as OpenApi uses securityHandlers
// see : https://github.com/kogosoftwarellc/open-api/tree/master/packages/express-openapi#argssecurityhandlers
let ensureLoggedIn;
if (!config.disableAuth) {
    ensureLoggedIn = function ensureLoggedIn(_options) {
        config.auth == "keycloak" ? passport.authenticate("keycloak", { failureRedirect: "/login" }) : null;
        return function (req, res, next) {
            if (!req.isAuthenticated || !req.isAuthenticated()) {
                return res.redirect(401, "/login");
            }
            next();
        };
    };
} else {
    ensureLoggedIn = function ensureLoggedIn(_options) {
        return function (req, res, next) {
            next();
        };
    };
}

// Home (redirect to /vocables)
router.get("/", function (req, res, _next) {
    res.redirect("vocables");
});

// Login routes
if (!config.disableAuth) {
    if (config.auth == "keycloak") {
        router.get("/login", passport.authenticate("provider", { scope: ["openid", "email", "profile"] }));
        router.get("/login/callback", passport.authenticate("provider", { successRedirect: "/", failureRedirect: "/login" }));
    } else {
        router.get("/login", function (req, res, _next) {
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
    router.get("/login", function (req, res, _next) {
        res.redirect("vocables");
    });
}

// XXX move to api/v1/paths/upload
router.post("/upload", ensureLoggedIn(), function (req, response) {
    if (!req.files || Object.keys(req.files).length === 0) {
        return response.status(400).send("No files were uploaded.");
    }
    if (req.files.EvaluateToolZipFile) {
        const zipFile = req.files.EvaluateToolZipFile;
        DirContentAnnotator.uploadAndAnnotateCorpus(zipFile, req.body.corpusName, JSON.parse(req.body.sources), JSON.parse(req.body.options), function (err, result) {
            processResponse(response, err, result);
        });
    }
});

router.post(serverParams.routesRootUrl + "/slsv", ensureLoggedIn(), function (req, response) {
    // XXX refactor to PUT api/v1/paths/blenderSource/{id}
    if (req.body.addImportToSource) {
        configManager.addImportToSource(req.body.parentSource, req.body.importedSource, function (err, result) {
            processResponse(response, err, result);
        });
    }
    // XXX refactor to GET api/v1/paths/createTriplesFromCsv
    if (req.body.createTriplesFromCsv) {
        CsvTripleBuilder.createTriplesFromCsv(req.body.dir, req.body.fileName, JSON.parse(req.body.options), function (err, result) {
            processResponse(response, err, result);
        });
    }
    // XXX refactor to POST api/v1/paths/clearGraph
    if (req.body.clearGraph) {
        CsvTripleBuilder.clearGraph(req.body.clearGraph, req.body.sparqlServerUrl || null, function (err, result) {
            processResponse(response, err, result);
        });
    }
});

// XXX refactor to GET api/v1/paths/httpProxy
router.get("/httpProxy", ensureLoggedIn(), function (req, res, _next) {
    httpProxy.get(req.query, function (err, result) {
        processResponse(res, err, result);
    });
});

// XXX refactor to GET api/v1/paths/ontology
router.get("/ontology/*", ensureLoggedIn(), function (req, res, _next) {
    if (req.params.length == 0) return req.send("missing ontology label");
    var name = req.params[0];
    RDF_IO.getOntology(name, function (err, result) {
        res.contentType("text/plain");
        res.status(200).send(result);
    });
});

// XXX refactor to models/plugins and GET api/v1/paths/plugins
router.get("/getJsonFile", ensureLoggedIn(), function (req, res, _next) {
    var filePath = req.query.filePath;
    var realPath = path.join(__dirname, "../public/vocables/" + filePath);
    var data = "" + fs.readFileSync(realPath);
    var json = JSON.parse(data);
    processResponse(res, null, json);
});

module.exports = router;
