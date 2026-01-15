import { processResponse } from '../utils.js';
import request from 'request';
import ConfigManager from '../../../../bin/configManager.js';

//https://jena.apache.org/documentation/inference/

export default function () {
    let operations = {
        GET,
    };

    function GET(req, res, _next) {
        const jowlServerConfig = ConfigManager.config.jowlServer;
        if (!jowlServerConfig.enabled) {
            res.status(500).json({ message: "Jowl Server is disable" });
        }

        let jowlConfigUrl = jowlServerConfig.url;
        if (!jowlConfigUrl.endsWith("/")) {
            jowlConfigUrl += "/";
        }

        jowlConfigUrl = "http://localhost:9170/";
        jowlConfigUrl += "axioms/listClassesWithAxioms";

        const payload = {
            graphName: req.query.graphName,
        };

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
        summary: "get  classes with axioms from owl API",
        description: "get  classes with axioms from owl API",
        operationId: "get  classes with axioms from owl API",
        parameters: [
            {
                name: "graphName",
                description: "ontologyGraphUri",
                type: "string",
                in: "query",
                required: true,
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
        tags: ["JOWL"],
    };

    return operations;
};
