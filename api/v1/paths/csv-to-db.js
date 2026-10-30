import { databaseModel } from "../../../model/databases.js";
import { loadCsvToDatabase } from "../../../model/csvToDb.js";

export default function () {
    let operations = { POST };

    async function POST(req, res, _next) {
        try {
            const file = req.files?.data;
            const database = req.body.database;
            const table = req.body.table;
            const delimiter = req.body.delimiter || ",";

            if (!file) {
                res.status(400).json({ message: "Missing required field: data" });
                return;
            }
            if (!database || !table) {
                res.status(400).json({ message: "Missing required fields: database and table" });
                return;
            }

            const descriptor = await databaseModel.getDatabase(database);
            const client = databaseModel.getClientDriver(descriptor.driver);
            if (!client) {
                res.status(400).json({ message: `Unsupported database driver: ${descriptor.driver}` });
                return;
            }

            const connection = await databaseModel.getAdminRestrictedConnection(database);
            await loadCsvToDatabase({ connection, client, table, csvPath: file.tempFilePath, delimiter });

            res.status(200).json({ database, table, status: "loaded" });
        } catch (error) {
            const status = error.status || (typeof error.cause === "number" ? error.cause : 500);
            res.status(status).json({ message: error.message });
        }
    }

    POST.apiDoc = {
        operationId: "csvToDatabase",
        summary: "Load a CSV file into a Postgres or SQLServer table (admin only)",
        description:
            "Multipart upload of a single CSV file into the table `table` of database `database`. Local fallback for the sls-py-api " +
            "`POST /api/v1/csv-to-db` route, limited to the `postgres` and `sqlserver` drivers. The table is created with inferred column " +
            "types when missing, truncated and reloaded when it exists with the same columns, and the request is rejected (400) on column drift.",
        security: [{ restrictAdmin: [] }],
        consumes: ["multipart/form-data"],
        parameters: [
            { name: "data", in: "formData", required: false, type: "file", description: "The CSV file to load." },
            { name: "database", in: "formData", required: false, type: "string", description: "Database id." },
            { name: "table", in: "formData", required: false, type: "string", description: "Target table name." },
            { name: "delimiter", in: "formData", required: false, type: "string", description: "CSV delimiter. Defaults to `,`." },
        ],
        responses: {
            200: {
                description: "CSV loaded.",
                schema: { properties: { database: { type: "string" }, table: { type: "string" }, status: { type: "string" } } },
                examples: { "application/json": { database: "my-db", table: "my_table", status: "loaded" } },
            },
            400: { description: "Missing field, unsupported driver or schema drift." },
            404: { description: "Database not found." },
            500: { description: "Connection or loading error." },
        },
        tags: ["Databases"],
    };

    return operations;
}
