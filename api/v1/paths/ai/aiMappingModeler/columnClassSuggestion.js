import { findUserSource } from "../../../../../bin/AI/ontologyFromDb/ontology/ontologyRuns.js";
import { suggestColumnClass } from "../../../../../bin/AI/aiMappingModeler/columnClassSuggestion.js";

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
            // a suggestion that ended, by a change of table for instance, cuts the connection: no one reads its answer
            const abortController = new AbortController();
            res.on("close", function () {
                if (!res.writableEnded) {
                    abortController.abort();
                }
            });
            const result = await suggestColumnClass(req.body, abortController.signal, found.userInfo);
            if (abortController.signal.aborted) {
                return;
            }
            if (result.error) {
                return res.status(result.status).json({ error: result.error });
            }
            res.status(200).json(result);
        } catch (error) {
            console.error(error);
            // the status of the provider stays out: its 401 would tell the browser that its own session expired
            res.status(502).json({ error: error.message });
        }
    }

    POST.apiDoc = {
        security: [{ restrictQuota: [], restrictAdmin: [] }],
        summary: "Suggest what a column maps to in the application ontology",
        description:
            "Called when a column is added in the AI Mapping Modeler, after the source was prepared. POST the column, its table with its columns and sample rows, " +
            "the local classes so far and the columns already mapped. Answers one to three readings of the column, most probable first, each with its probability, the mean over several answers of the model, brought back to a total of 100: " +
            "a new class with its superclass and its definition, an existing class, or a value that maps to no class. Writes nothing.",
        operationId: "suggestColumnClass",
        parameters: [
            {
                name: "body",
                in: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["source", "table", "column", "columns", "sampleRows", "localClasses", "mappedColumns"],
                    properties: {
                        source: { type: "string" },
                        databaseId: { type: "string" },
                        dataSourceName: { type: "string" },
                        table: { type: "string" },
                        column: { type: "string" },
                        columns: { type: "array", items: { type: "string" } },
                        sampleRows: { type: "array", items: { type: "object" } },
                        localClasses: { type: "array", items: { type: "object" } },
                        mappedColumns: { type: "array", items: { type: "object" } },
                    },
                },
            },
        ],
        responses: {
            200: { description: "{ suggestions: [{ columnKind, classId, label, parentId, parentLabel, definition, probability }], llmMilliseconds }" },
            404: { description: "The source is unknown to the user." },
            409: { description: "The source was not prepared." },
            502: { description: "The model failed, or named a class that does not exist." },
        },
        tags: ["AI"],
    };

    return operations;
}
