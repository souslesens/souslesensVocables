const path = require("path");

const kGSqlConnector = require(path.resolve("bin/KG/KGSqlConnector."));
const sQLserverConnector = require(path.resolve("bin/KG/SQLserverConnector."));

module.exports = function () {
    let operations = {
        GET,
    };

    function GET(req, res, next) {
        const callback = function (err, result) {
            if (err) {
                return res.status(400).json({ error: err });
            }
            return res.status(200).json(result);
        };

        if (req.query.type == "sql.sqlserver") {
            sQLserverConnector.getData(req.query.dbName, req.query.sqlQuery, callback);
        } else {
            kGSqlConnector.getData(req.query.dbName, req.query.sqlQuery, callback);
        }
    }

    GET.apiDoc = {
        security: [{ loginScheme: [] }],
        summary: "Execute SQL query",
        description: "Execute SQL query",
        operationId: "Execute SQL query",
        parameters: [
            {
                name: "type",
                description: "type",
                in: "query",
                type: "string",
                required: true,
            },
            {
                name: "dbName",
                description: "database name",
                in: "query",
                type: "string",
                required: true,
            },
            {
                name: "sqlQuery",
                description: "SQL query to execute",
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
