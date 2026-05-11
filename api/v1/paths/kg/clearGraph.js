import KGtripleBuilder from "../../../../bin/KGtripleBuilder.js";
import { processResponse } from "../utils.js";

export default function () {
    let operations = {
        POST,
    };

    function POST(req, res, next) {
        try {
            KGtripleBuilder.clearGraph(req.body.graphUri, undefined, function (err, result) {
                processResponse(res, err, result);
            });
        } catch (e) {
            res.status(e.status || 500).json(e);
            next(e);
        }
    }

    POST.apiDoc = {
        security: [{ restrictLoggedUser: [], restrictQuota: [] }],
        summary: "Drop all triples from a KG named graph",
        description:
            "Wipes the entire content of `graphUri` via `KGtripleBuilder.clearGraph` (SPARQL `CLEAR GRAPH`). " + "Used before a full KG rebuild; does not remove the source descriptor itself.",
        operationId: "kgClearGraph",
        parameters: [
            {
                name: "body",
                in: "body",
                required: false,
                schema: {
                    type: "object",
                    properties: {
                        graphUri: {
                            type: "string",
                            description: "Named graph URI to clear.",
                            example: "https://www.industrialontologies.org/core/",
                        },
                    },
                    example: { graphUri: "https://www.industrialontologies.org/core/" },
                },
                "x-examples": {
                    "Clear IOF_core graph": { graphUri: "https://www.industrialontologies.org/core/" },
                },
            },
        ],
        responses: {
            200: { description: "Graph cleared." },
            500: { description: "SPARQL CLEAR error." },
        },
        tags: ["KG"],
    };

    return operations;
}
