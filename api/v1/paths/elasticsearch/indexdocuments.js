import elasticRestProxy from "../../../../bin/elasticRestProxy.js";

export default function () {
    let operations = {
        POST,
    };

    function POST(req, res, _next) {
        elasticRestProxy.indexDocuments(req.body.rootDir, req.body.indexName, function (err, result) {
            if (err) {
                return res.status(400).json({ error: err });
            }
            return res.status(200).json(result);
        });
    }

    POST.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Elasticsearch index documents in dir",
        description: "Elasticsearch index documents in dir",
        operationId: "Elasticsearch index documents in dir",
        parameters: [
            {
                name: "body",
                description: "body",
                in: "body",
                schema: {
                    type: "object",
                    properties: {
                        indexName: {
                            type: "string",
                        },
                        rootDir: {
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
        tags: ["ElasticSearch"],
    };

    return operations;
}
