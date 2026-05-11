import path from "path";
import kGcontroller from "../../../../../bin/KG/KGcontroller.js";

export default function () {
    let operations = {
        GET,
    };

    function GET(req, res, _next) {
        kGcontroller.getMappings(req.params.name, function (err, result) {
            if (err) {
                return res.status(400).json({ error: err });
            }
            return res.status(200).json(result);
        });
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Read a saved mapping document by name",
        description: "Returns the mapping document previously saved via `POST /kg/mappings`, identified by its file name. " + "Loaded by `KGcontroller.getMappings`.",
        operationId: "kgGetMapping",
        parameters: [{ name: "name", in: "path", type: "string", required: true, description: "Mapping file name (without extension). Example: `iof_core_assets`." }],
        responses: {
            200: {
                description: "Mapping document.",
                schema: {
                    type: "object",
                    additionalProperties: true,
                    description:
                        "Full mapping JSON previously persisted via `POST /kg/mappings` (`columns → properties`, joins, " +
                        "named-individual rules, ...). Concrete keys depend on the MappingModeler version that wrote the file.",
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
            400: { description: "Mapping not found or read error." },
        },
        tags: ["KG"],
    };

    return operations;
}
