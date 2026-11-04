import { writeFile } from "fs/promises";
import { findSourceRun, getDraftGraphUri, runningGenerations, updateGraphTriples } from "../../../../../bin/AI/ontologyFromDb/ontology/ontologyRuns.js";
import { readDraftTriples, updateGraphCheck } from "../../../../../bin/AI/ontologyFromDb/ontology/draftGraph.js";

export default function () {
    let operations = {
        POST,
    };

    async function POST(req, res, _next) {
        try {
            const source = req.body.source;
            const found = await findSourceRun(req, source);
            if (found.error) {
                return res.status(found.status).json({ error: found.error });
            }
            if (runningGenerations[source]) {
                return res.status(409).json({ error: "a generation is running for " + source });
            }
            const savedRun = found.run.savedRun;
            const chatbotChanges = savedRun.chatbotChanges ?? [];
            if (chatbotChanges.length == 0) {
                return res.status(409).json({ error: "no chatbot change to undo for " + source });
            }
            const undoneChange = chatbotChanges.pop();
            const graphUri = getDraftGraphUri(found.sourceConfig.graphUri);
            await updateGraphTriples(graphUri, undoneChange.insertedTriples, undoneChange.deletedTriples);
            savedRun.report = undoneChange.previousReport;
            await updateGraphCheck(found, source, await readDraftTriples(graphUri));
            await writeFile(found.run.jsonPath, JSON.stringify(savedRun, null, 2));
            res.status(200).json({ undone: undoneChange.summary });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }

    POST.apiDoc = {
        security: [{ restrictAdmin: [] }],
        summary: "Take back the last change the chatbot made to the draft",
        description:
            "Each change of POST /ai/ontologyFromDb/revise keeps the triples it deleted and inserted in the run file. The last one is applied in reverse on the draft, what was edited in the whiteboard since stays. Called again, it takes back the change before. " +
            "A new generation empties the list.",
        operationId: "undoOntologyFromDbChange",
        parameters: [
            {
                name: "body",
                in: "body",
                required: true,
                schema: { type: "object", required: ["source"], properties: { source: { type: "string" } } },
            },
        ],
        responses: {
            200: { description: "{ undone: summary of the change taken back }" },
            404: { description: "The source is unknown, or it has no ontology." },
            409: { description: "No change to take back, or a generation is running." },
        },
        tags: ["AI"],
    };

    return operations;
}
