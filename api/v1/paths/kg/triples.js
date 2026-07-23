import KGbuilder_main from "../../../../bin/KGbuilder/KGbuilder_main.js";
import { processResponse } from "../utils.js";
import userManager from "../../../../bin/user.js";
import { profileModel } from "../../../../model/profiles.js";

function getNtExportFileName(source, table) {
    var sourceName = source || "source";
    var tableName = table || "table";
    return (sourceName + "_" + tableName + ".nt").replace(/[\\/:*?"<>|]+/g, "_");
}

export default function () {
    let operations = {
        POST,
        DELETE,
    };

    async function POST(req, res, next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            var options = JSON.parse(req.body.options);
            if (options.exportOnly && options.outputFormat == "nt") {
                options.maxNtExportTriples = await profileModel.getMaxNtExportTriplesForUser(userInfo.user);
                res.setHeader("Content-Type", "application/n-triples; charset=utf-8");
                res.setHeader("Content-Disposition", 'attachment; filename="' + getNtExportFileName(req.body.source, req.body.table) + '"');
                res.flushHeaders();
                return KGbuilder_main.streamTriplesFromCsvOrTableAsNt(userInfo.user, req.body.source, req.body.datasource, req.body.table, options, res, function (err) {
                    if (err) {
                        return res.destroy(err);
                    }
                    res.end();
                });
            }

            KGbuilder_main.importTriplesFromCsvOrTable(userInfo.user, req.body.source, req.body.datasource, req.body.table, options, function (err, result) {
                processResponse(res, err, result);
            });
        } catch (e) {
            res.status(e.status || 500).json(e);
            next(e);
        }
    }

    POST.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Generate KG triples from a CSV file or a SQL table",
        description:
            "Calls `KGbuilder_main.importTriplesFromCsvOrTable` to turn rows of `table` (either a SQL table inside `datasource` " +
            'or a CSV file path) into RDF triples loaded into `source`\'s named graph. With `exportOnly:true` and `outputFormat:"nt"`, ' +
            "the route streams generated N-Triples to the response without writing to the triplestore.",
        operationId: "kgCreateTriplesFromCsvOrTable",
        parameters: [
            {
                name: "body",
                in: "body",
                required: false,
                schema: {
                    type: "object",
                    properties: {
                        source: { type: "string", description: "Target SLSV source name.", example: "IOF_core" },
                        datasource: { type: "string", description: "Database id (from `databases.json`) or CSV directory.", example: "pg_assets" },
                        table: { type: "string", description: "Table name or CSV file name.", example: "assets" },
                        options: {
                            type: "string",
                            description:
                                'JSON-encoded options object. Use `sampleSize` for preview, or `exportOnly:true` with `outputFormat:"nt"` to return generated N-Triples without writing to the triplestore.',
                            example: '{"deleteOldGraph":false,"sampleSize":500,"clientSocketId":"abc-123"}',
                        },
                    },
                    example: {
                        source: "IOF_core",
                        datasource: "pg_assets",
                        table: "assets",
                        options: '{"deleteOldGraph":false,"sampleSize":500,"clientSocketId":"abc-123"}',
                    },
                },
                "x-examples": {
                    "Import maintenance CSV into IOF_core": {
                        source: "IOF_core",
                        datasource: "csv:maintenance",
                        table: "assets.csv",
                        options: '{"clientSocketId":"abc-123"}',
                    },
                },
            },
        ],
        responses: {
            200: {
                description: "Counts of triples generated and loaded.",
                schema: {
                    type: "object",
                    properties: {
                        sampleTriples: {
                            type: "array",
                            items: { type: "object", additionalProperties: true },
                            description: "Populated only when `options.sampleSize` is set: a preview slice of the generated triples (no DB write).",
                        },
                        totalTriplesCount: {
                            type: "object",
                            additionalProperties: { type: "integer" },
                            description: "Map `tableName → number of triples loaded` for the regular run. In export-only mode the response may return the total count as an integer.",
                        },
                    },
                    example: { sampleTriples: [], totalTriplesCount: { "assets.csv": 4321 } },
                },
            },
            500: { description: "Mapping or load error." },
        },
        tags: ["KG"],
    };

    DELETE.apiDoc = {
        summary: "Delete KGBuilder-generated triples for a source",
        description:
            "Removes triples previously generated by KGBuilder for `source`, optionally restricted to a subset of `tables`. " +
            "`tables` and `options` are JSON-encoded strings (the request body uses `application/x-www-form-urlencoded`).",
        security: [{ restrictLoggedUser: [] }],
        operationId: "kgDeleteTriples",
        parameters: [
            { name: "source", in: "query", type: "string", required: false, description: "Source name. Example: `IOF_core`." },
            { name: "tables", in: "query", type: "string", required: false, description: 'JSON array of table names (e.g. `["assets.csv"]`). Empty/omitted = all tables.' },
            { name: "options", in: "query", type: "string", required: false, description: "JSON-encoded options object." },
        ],
        responses: {
            200: {
                description: "SPARQL DELETE result.",
                schema: {
                    type: "object",
                    additionalProperties: true,
                    description:
                        "Raw response forwarded from the SPARQL endpoint after the `DELETE WHERE` query. Shape varies by " +
                        "triple store (Virtuoso typically returns a `{head, results}` envelope or a textual confirmation).",
                },
            },
            500: { description: "SPARQL DELETE error." },
        },
        tags: ["KG"],
    };
    async function DELETE(req, res, next) {
        try {
            if (!req.body.options) {
                req.body.options = "{}";
            }
            KGbuilder_main.deleteKGBuilderTriples(req.body.source, JSON.parse(req.body.tables), JSON.parse(req.body.options), function (err, result) {
                processResponse(res, err, result);
            });
        } catch (e) {
            res.status(e.status || 500).json(e);
            next(e);
        }
    }

    return operations;
}
