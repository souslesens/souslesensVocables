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
if (config.auth !== "disabled") {
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

module.exports = router;
