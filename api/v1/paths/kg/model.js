import * as dbConnector from "../../../../bin/KG/dbConnector.js";
import { databaseModel } from "../../../../model/databases.js";

export default function () {
    let operations = {
        GET,
    };

    async function GET(req, res, _next) {
        try {
            const database = await databaseModel.getDatabase(req.query.name);
            const driver = await databaseModel.getClientDriver(database.driver);

            const connection = dbConnector.getConnection(database, driver);
            dbConnector.getKGModel(
                connection,
                database.database,
                database.driver,
                (data) => {
                    let tables = {};
                    data.forEach((d) => {
                        if (!Object.keys(tables).includes(d.table_name)) {
                            tables[d.table_name] = [];
                        }
                        tables[d.table_name].push(d.column_name);
                    });
                    res.status(200).json(tables);
                },
                (error) => {
                    console.error(error);
                    res.status(503).json({
                        message: "The connection to the database was refused",
                    });
                },
            );
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: error });
        }
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Introspect the schema of a configured database",
        description:
            "Returns the table-to-columns map of database `name` by calling `dbConnector.getKGModel`. " +
            "Used by MappingModeler to populate column pickers when designing a mapping.",
        operationId: "kgGetModel",
        parameters: [
            { name: "type", in: "query", type: "string", required: true, description: "Datasource type (e.g. `sql`, `csv`)." },
            { name: "name", in: "query", type: "string", required: true, description: "Database id from `databases.json`." },
        ],
        responses: {
            200: {
                description: "Table → columns map.",
                schema: {
                    type: "object",
                    additionalProperties: { type: "array", items: { type: "string" } },
                },
                examples: {
                    "application/json": {
                        assets: ["asset_id", "name", "manufacturer", "install_date"],
                        maintenance_events: ["event_id", "asset_id", "type", "date"],
                    },
                },
            },
            500: { description: "Database connection failure." },
            503: { description: "Connection refused by the database." },
        },
        tags: ["KG"],
    };

    return operations;
}
