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
        summary: "Suggest the next valid token while editing a Manchester axiom",
        description:
            "Powers the Manchester-syntax editor's autocomplete. Given the last token typed by the user (`lastToken`) " +
            "and the current editor state (`options` JSON), `ManchesterSyntaxEngine.getSuggestion` returns the list of " +
            "valid follow-up tokens (keywords, class URIs, property URIs, ...).",
        operationId: "axiomsGetSuggestion",
        parameters: [
            { name: "lastToken", in: "query", type: "string", required: true, description: "Last token typed by the user. Example: `SubClassOf`." },
            { name: "options", in: "query", type: "string", required: false, description: "JSON-encoded editor state (current class URI, allowed vocabularies, ...)." },
        ],
        responses: {
            200: {
                description: "Suggested completions.",
                schema: {
                    type: "array",
                    items: { type: "string", description: "Candidate token text (OWL Manchester keyword, class URI, or property URI)." },
                    description: "Ordered list of valid follow-up token strings at the current `OWL2ManchesterParser` state, produced by `antlr4-autosuggest`.",
                    example: ["SubClassOf", "EquivalentClasses", "DisjointClasses"],
                },
            },
            400: { description: "Engine error.", schema: { properties: { error: { type: "string" } } } },
        },
        tags: ["Axiom"],
    };

    return operations;
}
