const path = require("path");

const kGSqlConnector = require(path.resolve("bin/KG/KGSqlConnector."));
const sQLserverConnector = require(path.resolve("bin/KG/SQLserverConnector."));

module.exports = function () {
    let operations = {
        GET,
    };

    function GET(req, res, _next) {
        const callback = function (err, result) {
            if (err) {
                return res.status(400).json({ error: err });
            }
            return res.status(200).json(result);
        };

        if (req.query.type == "sql.sqlserver") {
            sQLserverConnector.getKGmodel(req.query.name, callback);
        } else {
            kGSqlConnector.getKGmodel(req.query.name, callback);
        }
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Retrieve SQL model",
        description: "Retrieve SQL model",
        operationId: "Retrieve SQL model",
        parameters: [
            {
                name: "name",
                description: "name",
                in: "query",
                type: "string",
                required: true,
            },
            {
                name: "type",
                description: "type",
                in: "query",
                type: "string",
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
    };

    return operations;
};
