import ManchesterSyntaxEngine from '../../../../bin/axioms/manchesterSyntaxEngine.js';

//import    ManchesterSyntaxEngine from  "../../../../bin/axioms/manchesterSyntaxEngine.js";

import httpProxy from '../../../../bin/httpProxy..js';

import { processResponse } from '../utils.js';
export default function () {
    let operations = {
        GET,
    };

    function GET(req, res, _next) {
        const callback = function (err, result) {
            if (err) {
                return res.status(400).json({ error: err });
            }
            return res.status(200).json(result);
        };
        var options = {};
        if (req.query.options) {
            options = JSON.parse(req.query.options);
        }
        if (true) {
            ManchesterSyntaxEngine.getSuggestion(req.query.lastToken, options, callback);
            return;
        }
        var url = "http://localhost:3000/getSuggestions";
        httpProxy.post(url, null, { owlInput: req.query.lastToken }, function (result) {
            try {
                var json = JSON.parse(result);
                processResponse(res, null, json);
            } catch (err) {
                processResponse(res, err + " " + result, null);
            }
        });
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Return a suggestion to build an axiom",
        description: "Return a suggestion to build an axiom",
        operationId: "Return a suggestion to build an axiom",
        parameters: [
            {
                name: "lastToken",
                description: "lastToken",
                in: "query",
                type: "string",
                required: true,
            },
            {
                name: "options",
                description: "options",
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
        tags: ["Axiom"],
    };

    return operations;
};
