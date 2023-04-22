const { processResponse } = require("../utils");
const SourceIntegrator = require("../../../../bin/sourceIntegrator.");
const ConfigManager = require("../../../../bin/configManager.");
const GraphStore=require("../../../../bin/graphStore.")


module.exports = function () {
    let operations = {
        GET,
        POST,
    };

    function GET(req, res, next) {

        GraphStore.importGraphFromUrl(req.query.graphUri, function (err, result) {
            if (err) {
                next(err);
            } else {
                return res.status(200).json(result);
            }
        });


    }

    GET.apiDoc = {
        security: [{ loginScheme: [] }],
        summary: "get turtle  from triples",
        description: "get turtle  from triples",
        operationId: "get turtle  from triples",
        parameters: [
            {
                name: "graphUri",
                description: "graph uri in SLSV graph store",
                type: "string",
                in: "query",
                required: true,
            }

        ],

        responses: {
            200: {
                description: "Results",
                schema: {
                    type: "object",
                },
            },
        },
    };

    function POST(req, res, next) {
        ConfigManager.getUser(req, res, function (err, userInfo) {
            if (err) {
                return res.status(400).json({ error: err });
            }
            if (userInfo.user.groups.indexOf("admin") < 0)
                return res.status(403);


            GraphStore.importGraphFromUrl(req.body.url, req.body.graphUri, function(err, result) {
                if (err) {
                    next(err);
                }
                else {
                    return res.status(200).json(result);
                }
            });
        })

    }

    POST.apiDoc = {
        security: [{ loginScheme: [] }],
        summary: "Save rdf url to SLSV graph store",
        description:  "Save rdf file or url to SLSV graph store",
        operationId:  "Save rdf file or url to SLSV graph store",
        parameters: [
            {
                name: "body",
                description: "body",
                in: "body",
                schema: {
                    type: "object",
                    properties: {
                        url: {
                            type: "string",
                        },
                        graphUri: {
                            type: "string",
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
    };

    return operations;
};
