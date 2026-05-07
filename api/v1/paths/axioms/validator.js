import ManchesterSyntaxEngine from "../../../../bin/axioms/manchesterSyntaxEngine.js";

//import    ManchesterSyntaxEngine from  "../../../../bin/axioms/manchesterSyntaxEngine.js";

import httpProxy from "../../../../bin/httpProxy.js";

import { processResponse } from "../utils.js";
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
            var options = JSON.parse(req.query.options);
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
        summary: "Validate a Manchester-syntax axiom",
        description:
            "Parses `axiom` with `ManchesterSyntaxEngine.validateAxiom`. Returns the parse tree on success or the error " +
            "position on failure. Used by the editor to display inline syntax errors before sending the axiom to JOWL.",
        operationId: "axiomsValidate",
        parameters: [
            { name: "source", in: "query", type: "string", required: true, description: "Source name where the axiom will land. Example: `IOF_core`." },
            { name: "axiom", in: "query", type: "string", required: true, description: "Manchester-syntax axiom body." },
            { name: "options", in: "query", type: "string", required: false, description: "JSON-encoded options (vocabularies, prefix maps, ...)." },
        ],
        responses: {
            200: {
                description: "Parse result.",
                schema: {
                    type: "object",
                    additionalProperties: true,
                    description:
                        "ANTLR parse tree produced by `OWL2ManchesterParser` for the supplied `axiom`. " +
                        "Tree shape mirrors the Manchester-syntax grammar (rules, tokens, child nodes). " +
                        "Parse errors surface as a `400` with `{ error }`.",
                },
            },
            400: { description: "Parse error.", schema: { properties: { error: { type: "string" } } } },
        },
        tags: ["Axiom"],
    };

    return operations;
}
