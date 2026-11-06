import { findUserSource } from "../../../../../bin/AI/ontologyFromDb/ontology/ontologyRuns.js";
import { suggestColumnRestrictions } from "../../../../../bin/AI/aiMappingModeler/columnRestrictionSuggestion.js";

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
            const result = await suggestColumnRestrictions(req.body, abortController.signal, { user: found.userInfo, userSources: found.userSources });
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
        summary: "Suggest the restrictions that link a column just mapped to the other mapped columns of its table",
        description:
            "Called when a column of the AI Mapping Modeler gets its class, after the source was prepared. POST the column and its class, the other mapped columns of the table and their classes, " +
            "the table with its columns and sample rows. The properties allowed between each pair of classes, in each direction, are read as the ontology generation checks its restrictions, " +
            "the model chooses among them, and a restriction whose property is not allowed is refused. Several answers are merged: a pair is kept when at least two of them link it. Answers at most 3 restrictions. When some answers propose an implicit object that no column identifies, such as a process, to create as a virtual column, whose class exists or is a new local class and which allowed properties link to at least two mapped columns, an implicitJudgementId is answered: the page asks implicitObjectJudgement with it. Writes nothing.",
        operationId: "suggestColumnRestrictions",
        parameters: [
            {
                name: "body",
                in: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["source", "table", "columns", "sampleRows", "localClasses", "mappedClassIds", "mappedColumn", "otherColumns"],
                    properties: {
                        source: { type: "string" },
                        databaseId: { type: "string" },
                        dataSourceName: { type: "string" },
                        table: { type: "string" },
                        columns: { type: "array", items: { type: "string" } },
                        sampleRows: { type: "array", items: { type: "object" } },
                        localClasses: { type: "array", items: { type: "object" } },
                        mappedClassIds: { type: "array", items: { type: "string" }, description: "the classes of the mapped columns of every table" },
                        mappedColumn: { type: "object", description: "{ column, classId, classLabel, isVirtual }" },
                        otherColumns: { type: "array", items: { type: "object" }, description: "[{ column, classId, classLabel, isVirtual }]" },
                    },
                },
            },
        ],
        responses: {
            200: {
                description: "{ restrictions: [{ fromColumn, toColumn, property: { id, label }, restrictionType, cardinality }], implicitJudgementId or null, allowedMilliseconds, llmMilliseconds }",
            },
            404: { description: "The source is unknown to the user." },
            409: { description: "The source was not prepared." },
            502: { description: "The model failed." },
        },
        tags: ["AI"],
    };

    return operations;
}
