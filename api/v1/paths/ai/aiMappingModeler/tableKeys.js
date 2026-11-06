import { getSchemaDescription } from "../../../../../bin/databases/dbConnector.js";
import { databaseModel } from "../../../../../model/databases.js";
import userManager from "../../../../../bin/user.js";

export default function () {
    let operations = {
        GET,
    };

    async function GET(req, res, _next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            const database = await databaseModel.getDatabase(req.query.databaseId);
            const connection = await databaseModel.getUserConnection(userInfo.user, req.query.databaseId);
            const schema = await getSchemaDescription(connection, database.driver);
            res.status(200).json({ primaryKeys: schema.primaryKeys, foreignKeys: schema.foreignKeys });
        } catch (error) {
            console.error(error);
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Read the primary and foreign keys of a database",
        description: "Used by the AI Mapping Modeler to show which columns of a table are primary keys, foreign keys, or both.",
        operationId: "getAiMappingModelerTableKeys",
        parameters: [{ name: "databaseId", in: "query", type: "string", required: true }],
        responses: {
            200: { description: "{ primaryKeys: [{ table_name, column_name }], foreignKeys: [{ constraint_name, table_name, column_name, referenced_table, referenced_column }] }" },
            403: { description: "The user may not read this database." },
        },
        tags: ["AI"],
    };

    return operations;
}
