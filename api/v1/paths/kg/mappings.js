import path from "path";
import kGcontroller from "../../../../bin/KG/KGcontroller.js";

export default function () {
    let operations = {
        POST,
    };

    function POST(req, res, _next) {
        kGcontroller.saveMappings(req.body.source, req.body.mappings, function (err, result) {
            if (err) {
                return res.status(400).json({ error: err });
            }
            return res.status(200).json(result);
        });
    }

    POST.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Persist a KG mapping document for a source",
        description:
            "Stores `mappings` (the full mapping JSON produced by MappingModeler) under the source's mapping folder " +
            "via `KGcontroller.saveMappings`. The same source may carry multiple named mappings; this endpoint replaces " +
            "(or creates) the document keyed by `mappings.id` / `mappings.label`.",
        operationId: "kgSaveMapping",
        parameters: [
            {
                name: "body",
                in: "body",
                required: false,
                schema: {
                    type: "object",
                    properties: {
                        source: { type: "string", description: "Source name. Example: `IOF_core`.", example: "IOF_core" },
                        mappings: {
                            type: "object",
                            description: "Full mapping document (`columns → properties`, joins, named-individual rules, ...).",
                            example: {
                                id: "assets_mapping",
                                label: "Assets",
                                dataSource: { id: "pg_assets", table: "assets" },
                                columns: [
                                    { name: "id", property: "http://example.org/id" },
                                    { name: "label", property: "http://www.w3.org/2000/01/rdf-schema#label" },
                                ],
                            },
                        },
                    },
                    example: {
                        source: "IOF_core",
                        mappings: {
                            id: "assets_mapping",
                            label: "Assets",
                            dataSource: { id: "pg_assets", table: "assets" },
                            columns: [
                                { name: "id", property: "http://example.org/id" },
                                { name: "label", property: "http://www.w3.org/2000/01/rdf-schema#label" },
                            ],
                        },
                    },
                },
            },
        ],
        responses: {
            200: { description: "Saved mapping document." },
            400: { description: "Persistence error.", schema: { properties: { error: { type: "object" } } } },
        },
        tags: ["KG"],
    };

    return operations;
}
