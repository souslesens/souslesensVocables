import path from "path";
import kGbuilder from "../../../bin/KG/KGbuilder.js";

// Route POST /kg: not used client-side (no calls found in public/).
// Likely deprecated — active routes are sub-paths /kg/data, /kg/model, /kg/triples, /kg/mappings, /kg/clearGraph.
export default function () {
    let operations = {
        POST,
    };

    function POST(req, res, _next) {
        kGbuilder.buidlKG(req.body.mappingFileNames, req.body.sparqlServerUrl, req.body.adlGraphUri, req.body.replaceGraph, req.body.dataSource, req.body.options, function (err, result) {
            if (err) {
                return res.status(400).json({ error: err });
            }
            return res.status(200).json(result);
        });
    }

    POST.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Build a KG Mapping",
        description: "Build a KG Mapping",
        operationId: "Build a KG Mapping",
        parameters: [
            {
                name: "body",
                description: "body",
                in: "body",
                schema: {
                    type: "object",
                    properties: {
                        mappingFileNames: {
                            type: "array",
                            items: {
                                type: "string",
                            },
                        },
                        sparqlServerUrl: {
                            type: "string",
                        },
                        adlGraphUri: {
                            type: "string",
                        },
                        replaceGraph: {
                            type: "boolean",
                        },
                        dataSource: {
                            $ref: "#/definitions/SourceUpdate",
                        },
                        options: {
                            type: "object",
                            properties: {
                                skipOneModelOrphans: {
                                    type: "boolean",
                                },
                                skipLocalDictionaryOrphans: {
                                    type: "boolean",
                                },
                            },
                        },
                    },
                },
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
        tags: ["KG"],
    };

    return operations;
}
