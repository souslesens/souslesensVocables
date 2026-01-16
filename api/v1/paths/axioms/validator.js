import ManchesterSyntaxEngine from '../../../../bin/axioms/manchesterSyntaxEngine.js';

//import    ManchesterSyntaxEngine from  "../../../../bin/axioms/manchesterSyntaxEngine.js";

import httpProxy from '../../../../bin/httpProxy.js';

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
        if (req.query.options) {
            options = JSON.parse(req.query.options);
        }
        if (true) {
            ManchesterSyntaxEngine.validateAxiom(req.query.axiom, callback);
            return;
        }
        var url = "http://localhost:3000/parse";
        httpProxy.post(url, null, { owlInput: req.query.axiom }, function (result) {
            try {
                processResponse(res, null, result);
            } catch (err) {
                processResponse(res, err + " " + result, null);
            }
        });
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Return axiom validation",
        description: "Return axiom validation",
        operationId: "Return axiom validation",
        parameters: [
            {
                name: "source",
                description: "type",
                in: "query",
                type: "string",
                required: true,
            },
            {
                name: "axiom",
                description: "axiom",
                in: "query",
                type: "string",
                required: true,
            },
            {
                name: "options",
                description: "option",
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
