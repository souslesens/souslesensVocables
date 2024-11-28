const { processResponse } = require("../utils");
const request = require("request");
const async = require("async");
const ConfigManager = require("../../../../bin/configManager.");

//https://jena.apache.org/documentation/inference/

module.exports = function () {
    let operations = {
        GET,
    };

    function GET(req, res, next) {
        const jowlServerConfig = ConfigManager.config.jowlServer;
        if (!jowlServerConfig.enabled) {
            res.status(500).json({ message: "Jowl Server is disable"});
        }

        let jowlConfigUrl = jowlServerConfig.url;
        if (!jowlConfigUrl.endsWith("/")) {
            jowlConfigUrl += "/";
        }
        jowlConfigUrl += "axioms/manchester2triples";

        const payload = {
            input: req.query.manchesterContent,
            graphName: req.query.graphUri,
            "classUri": req.query.classUri,
            "axiomType":  req.query.axiomType,
            "saveTriples": (req.query.saveTriples=="true") ? true : false,
            "checkConsistency": (req.query.checkConsistency=="true") ? true : false,
        }
        const options = {
            method: "POST",
            json: payload,
            headers: {
                "content-type": "application/json",
            },
            url: jowlConfigUrl,
        };
        request(options, function (error, response, body) {
            return processResponse(res, error, body);
        });
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "generates axioms triples from manchester syntax",
        description: "generates axioms triples from manchester syntax",
        operationId: "generates axioms triples from manchester syntax",
        parameters: [
            {
                name: "manchesterContent",
                description: "manchesterContent",
                type: "string",
                in: "query",
                required: true,
            },
            {
                name: "graphUri",
                description: "ontology graphUri",
                in: "query",
                type: "string",
                required: true,
            },


            {
                name: "classUri",
                description: "JSON ",
                in: "query",
                type: "string",
                required: false,
            },
            {
                name: "axiomType",
                description: "JSON ",
                in: "query",
                type: "string",
                required: false,
            },
            {
                name: "saveTriples",
                description: "JSON ",
                in: "query",
                type: "string",
                required: false,
            },
            {
                name: "checkConsistency",
                description: "JSON ",
                in: "query",
                type: "string",
                required: false,
            },
        ],

        responses: {
            200: {
                description: "Results",
                schema: {
                    type: "object",
                },
            },
        },
    };

    return operations;
};
