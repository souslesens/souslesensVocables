import path from "path";
import KGbuilder_main from "../../../../../bin/KGbuilder/KGbuilder_main.js";

export default function () {
    let operations = {
        GET,
    };

    function GET(req, res, _next) {
        KGbuilder_main.getSourceMappingsFiles(req.query.source, function (err, result) {
            if (err) {
                return res.status(400).json({ error: err });
            }
            return res.status(200).json(result);
        });
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "List mapping files that produced triples for a source",
        description:
            "Returns the set of mapping files (`KGbuilder_main.getSourceMappingsFiles`) that have already been used " +
            "to generate triples in `source`'s graph. Used by the UI to offer 'recreate triples' / 'delete triples' actions.",
        operationId: "kgListMappingFiles",
        parameters: [{ name: "source", in: "query", type: "string", required: true, description: "Source name. Example: `IOF_core`." }],
        responses: {
            200: {
                description: "Array of mapping file names.",
                schema: { type: "array", items: { type: "string" } },
            },
            400: { description: "Source not found or read error." },
        },
        tags: ["KG"],
    };

    return operations;
}
