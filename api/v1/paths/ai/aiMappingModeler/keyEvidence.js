import { getForeignKeyEvidence } from "../../../../../bin/AI/aiMappingModeler/keyEvidence.js";
import userManager from "../../../../../bin/user.js";

export default function () {
    let operations = {
        GET,
    };

    async function GET(req, res, _next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            const foreignKey = { table: req.query.table, column: req.query.column, referencedTable: req.query.referencedTable, referencedColumn: req.query.referencedColumn };
            const foreignKeyEvidence = await getForeignKeyEvidence(req.query.databaseId, userInfo, foreignKey);
            res.status(200).json(foreignKeyEvidence);
        } catch (error) {
            console.error(error);
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Read what decides a foreign key found by the AI: its values missing from the key column, their shapes and a sample of both tables",
        description:
            "Used by the AI Mapping Modeler before the class of a key is carried to its other columns. Values are compared as text. " +
            "The missing values are grouped by shape (letters as A, digits as 9, spaces left out), each shape with the closest shape of the key values; " +
            "a padded value whose trimmed text is a key value is told apart.",
        operationId: "getAiMappingModelerKeyEvidence",
        parameters: [
            { name: "databaseId", in: "query", type: "string", required: true },
            { name: "table", in: "query", type: "string", required: true, description: "the table of the referring column" },
            { name: "column", in: "query", type: "string", required: true },
            { name: "referencedTable", in: "query", type: "string", required: true },
            { name: "referencedColumn", in: "query", type: "string", required: true },
        ],
        responses: {
            200: {
                description:
                    "{ distinctCount, missingCount, shapeGroups: [{ kind: trimmed | keyShape | otherShape, shape, closestKeyShape, count, examples }], " +
                    "referringRows: [{ row, isMissing }], referencedRows }",
            },
            403: { description: "The user may not read this database." },
        },
        tags: ["AI"],
    };

    return operations;
}
