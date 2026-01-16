"use strict";

const path = require("path");

const { sourceModel } = require(path.resolve("model/sources"));
const userManager = require(path.resolve("bin/user."));
const recreateGraph = require(path.resolve("bin/KGbuilder/recreateGraph.js"));

module.exports = function () {
    let operations = { POST: POST };

    async function POST(req, res, next) {
        try {
            var body = req.body || {};
            var source = body.source;

            if (!source) {
                return res.status(400).json({ error: "Parameter 'source' is required" });
            }

            const userInfo = await userManager.getUser(req.user);

            const allSources = await sourceModel.getAllSources();
            const sourceConfig = allSources[source];
            if (!sourceConfig) {
                return res.status(404).json({ error: "Unknown source '" + source + "'" });
            }

            const out = await recreateGraph.recreateGraphTriples({
                user: userInfo.user,
                source: source,
                body: body,
            });

            return res.status(200).json({
                message: "Triples successfully regenerated",
                source: source,
                table: out.table,
                deleteResult: out.deleteResult,
                result: out.result,
                mode: out.mode,
                tablesProcessed: out.tablesProcessed,
            });
        } catch (e) {
            return res.status(500).json({
                error: e && e.message ? e.message : String(e),
            });
        }
    }

    POST.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "delete and recreate triples",
        description:
            "Delete and recreate KGBuilder triples.\n\n" +
            "- If body.table is omitted or []: deletes ALL triples created by KGBuilder for this source, then recreates triples for every table of the source.\n" +
            "- If body.table is an array of tables: deletes triples for these tables only, then recreates triples for these tables only.\n\n" +
            "options is optional; clientSocketId is optional (API works in Postman without it).",
        tags: ["KG"],
        consumes: ["application/json"],

        parameters: [
            {
                name: "body",
                in: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["source"],
                    properties: {
                        source: {
                            type: "string",
                            description: "Source identifier (ex: NEW_PRODOM_IOF).",
                        },
                        table: {
                            type: "array",
                            items: { type: "string" },
                            description: "Array of tables.\n" + "- [] or omitted => ALL tables\n" + '- ["t1"] => only t1\n' + '- ["t1","t2"] => only t1 and t2',
                        },
                        options: {
                            type: "string",
                            description: 'Optional JSON string. Example: {"clientSocketId":"..."}.\n' + "If not provided, the API still works.",
                        },
                        skipDelete: {
                            type: "boolean",
                            description: "If true, skip deletion step (debug). Default false.",
                        },
                    },
                },
            },
        ],

        responses: {
            200: {
                description: "Triples deleted (unless skipDelete) then recreated.",
                schema: {
                    type: "object",
                    properties: {
                        message: { type: "string" },
                        source: { type: "string" },
                        table: {
                            description: '"ALL" or array of tables processed.',
                            type: "object",
                        },
                        mode: { type: "string" },
                        deleteResult: { type: "object" },
                        result: { type: "object" },
                        tablesProcessed: {
                            type: "array",
                            items: { type: "string" },
                        },
                    },
                },
            },
            400: { description: "Bad request" },
            404: { description: "Source not found" },
            500: { description: "Server error" },
        },
    };

    return operations;
};
