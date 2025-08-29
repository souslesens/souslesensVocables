const KGbuilder_main = require("../../../../bin/KGbuilder/KGbuilder_main");
const { processResponse } = require("../utils");

module.exports = function () {
    let operations = {
        POST,
        DELETE,
    };

    function POST(req, res, next) {
        try {
            KGbuilder_main.importTriplesFromCsvOrTable(req.body.source, req.body.datasource, req.body.table, JSON.parse(req.body.options), function (err, result) {
                processResponse(res, err, result);
            });
        } catch (e) {
            next(e);
        }
    }

    POST.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Creates triples from csv file",
        description: "Takes a csv filename and directory and returns triples",
        operationId: "createTriplesFromCsvOrTable",
        parameters: [
            {
                name: "body",
                description: "subDirectory in /dataDir",
                in: "body",
                schema: {
                    type: "object",
                    properties: {
                        source: { type: "string" },
                        datasource: { type: "string" },
                        table: { type: "string" },
                        options: { type: "string" },
                    },
                },
                required: true,
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

    DELETE.apiDoc = {
        summary: "delete KGcreator triples",
        security: [{ restrictLoggedUser: [] }],
        operationId: "deleteKGcreatorTriples",

        parameters: [
            {
                name: "source",
                description: "source",
                type: "string",
                in: "query",
                required: false,
            },
            {
                name: "tables",
                description: "tables",
                type: "string",
                in: "query",
                required: false,
            },
            {
                name: "options",
                description: "options",
                type: "string",
                in: "query",
                required: false,
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
    async function DELETE(req, res, next) {
        try {
            if (!req.body.options) {
                req.body.options = "{}";
            }
            KGbuilder_main.deleteKGcreatorTriples(req.body.source, JSON.parse(req.body.tables), JSON.parse(req.body.options), function (err, result) {
                processResponse(res, err, result);
            });
        } catch (e) {
            next(e);
        }
    }

    return operations;
};
