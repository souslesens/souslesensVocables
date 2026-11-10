import { getSchemaDescription } from "../../../../../bin/KG/dbConnector.js";
import { databaseModel } from "../../../../../model/databases.js";
import userManager from "../../../../../bin/user.js";
import { followKeyDetection, getKeyDetection } from "../../../../../bin/AI/aiMappingModeler/keyDetection.js";
import { findUserSource } from "../../../../../bin/AI/ontologyFromDb/ontology/ontologyRuns.js";

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
            let keyDetection = { status: "none", aiKeys: null };
            // a page that names no source shows the declared keys only
            if (req.query.source) {
                const found = await findUserSource(req, req.query.source);
                if (found.error) {
                    return res.status(found.status).json({ error: found.error });
                }
                followKeyDetection(req.query.databaseId, req.query.clientSocketId);
                keyDetection = await getKeyDetection(req.query.source, req.query.databaseId);
            }
            res.status(200).json({ primaryKeys: schema.primaryKeys, foreignKeys: schema.foreignKeys, aiKeys: keyDetection.aiKeys, aiKeysStatus: keyDetection.status, aiKeysError: keyDetection.error });
        } catch (error) {
            console.error(error);
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Read the primary and foreign keys of a database, declared and detected by the AI",
        description:
            "Used by the AI Mapping Modeler to show which columns of a table are primary keys, foreign keys, or both, declared by the schema or detected by the AI from the data. " +
            "The detection runs once per database, in the background, started when the tool prepares the source; aiKeysStatus tells whether it is running, done, failed, or not started.",
        operationId: "getAiMappingModelerTableKeys",
        parameters: [
            { name: "databaseId", in: "query", type: "string", required: true },
            { name: "source", in: "query", type: "string", required: false, description: "the source whose mapping holds the detected keys" },
            { name: "clientSocketId", in: "query", type: "string", required: false, description: "the socket of the page, told each step of a running detection on the aiKeyDetection channel" },
        ],
        responses: {
            200: {
                description:
                    "{ primaryKeys: [{ table_name, column_name }], foreignKeys: [{ constraint_name, table_name, column_name, referenced_table, referenced_column }], " +
                    "aiKeys: { primaryKeys: [{ table, columns, reason }], foreignKeys: [{ table, column, referencedTable, referencedColumn, reason }] } or null, aiKeysStatus, aiKeysError }",
            },
            403: { description: "The user may not read this database." },
            404: { description: "The source is unknown to the user." },
        },
        tags: ["AI"],
    };

    return operations;
}
