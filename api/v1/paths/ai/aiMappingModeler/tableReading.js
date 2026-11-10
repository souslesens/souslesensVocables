import { findUserSource } from "../../../../../bin/AI/ontologyFromDb/ontology/ontologyRuns.js";
import { getTableReading } from "../../../../../bin/AI/aiMappingModeler/tableReading.js";

export default function () {
    let operations = {
        POST,
    };

    async function POST(req, res, _next) {
        try {
            const found = await findUserSource(req, req.body.source);
            if (found.error) {
                return res.status(found.status).json({ error: found.error });
            }
            const tableReading = await getTableReading(req.body, Boolean(req.body.isReadAgain));
            res.status(200).json(tableReading);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }

    POST.apiDoc = {
        security: [{ restrictQuota: [], restrictAdmin: [] }],
        summary: "Read a table once, as the context of the class suggestions of its columns",
        description:
            "Called by the AI Mapping Modeler when a table is opened, after the source was prepared. A reasoning model says what one row of the table is, " +
            "what its dates mean for this object, the upper ontology class of each of its objects and which columns are easy to misread, without classifying the columns one by one. " +
            "The reading runs in the background, once per table, and is written in the mapping of the source beside the AI keys; " +
            "the class suggestions of the columns of the table get it once it is there. POST the table again to follow the run, with isReadAgain to read it again.",
        operationId: "readAiMappingModelerTable",
        parameters: [
            {
                name: "body",
                in: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["source", "table", "columns", "sampleRows"],
                    properties: {
                        source: { type: "string" },
                        databaseId: { type: "string", description: "the database of the table, none for a csv file" },
                        dataSourceName: { type: "string", description: "the name of the data source, which keys a csv file in the mapping" },
                        table: { type: "string" },
                        columns: { type: "array", items: { type: "string" } },
                        sampleRows: { type: "array", items: { type: "object" } },
                        isReadAgain: { type: "boolean", description: "drops the reading known for the table and reads it again" },
                    },
                },
            },
        ],
        responses: {
            200: { description: '{ status: "done" | "running" | "failed", reading: { text, model, readAt } or null, error }' },
            404: { description: "The source is unknown to the user." },
        },
        tags: ["AI"],
    };

    return operations;
}
