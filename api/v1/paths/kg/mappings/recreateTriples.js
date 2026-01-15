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
            var table = body.table;

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
                table: table,
                body: body,
            });

            return res.status(200).json({
                message: "Triples successfully regenerated",
                source: source,
                table: out.table,
                deleteResult: out.deleteResult,
                result: out.result,
                mode: out.mode,
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
  description: `
Deletes existing KGbuilder triples then regenerates them from mappings.

Behavior:
- If "table" is NOT provided: deletes ALL triples for the source, then recreates triples for ALL mapped tables (one by one).
- If "table" IS provided: deletes triples for this table only, then recreates triples for this table.

Notes:
- "options" is a JSON string. It is optional. It can include "clientSocketId" for progress messages (optional).
- "skipDelete" can be used to skip the delete phase (useful if you manage deletion separately).
`,
  tags: ["KG"],
  consumes: ["application/json"],
  produces: ["application/json"],
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
            description:
              "SLS source name (must exist in server sources config). Example: 'NEW_PRODOM_IOF'.",
            example: "NEW_PRODOM_IOF",
          },

          table: {
            type: "string",
            description:
              "Optional. If provided: delete + recreate triples ONLY for this table. If omitted: delete + recreate ALL tables of the source.",
            example: "document_step_period",
          },

          options: {
            type: "string",
            description: `Optional. JSON string passed to the KGbuilder import flow.
Common fields:
- clientSocketId (string): enables progress messages through socket (optional).
Other fields may be supported depending on KGbuilder implementation.

Example: '{"clientSocketId":"abc123"}'`,
            example: '{"clientSocketId":"abc123"}',
          },

          skipDelete: {
            type: "boolean",
            description:
              "Optional. Default false. If true, the API will NOT delete existing triples and will only run the recreate/import phase.",
            example: false,
          },
        },
        additionalProperties: false,
      },
    },
  ],

  responses: {
    200: {
      description: "Triples regenerated",
      schema: {
        type: "object",
        properties: {
          message: { type: "string" },
          source: { type: "string" },
          table: { type: "string", description: "Returned as 'ALL' or the table name." },
          mode: {
            type: "string",
            description: "ONE_TABLE or ALL_TABLES",
            enum: ["ONE_TABLE", "ALL_TABLES"],
          },
          deleteResult: {
            description:
              "Result returned by delete phase (can be null if skipDelete=true).",
          },
          result: {
            description:
              "Import result. For ONE_TABLE: result object. For ALL_TABLES: map of table->result.",
          },
        },
      },
    },

    400: { description: "Bad request (missing source)" },
    404: { description: "Source not found" },
    500: { description: "Server error" },
  },
};


    return operations;
};
