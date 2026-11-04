import { findUserSource, runningGenerations } from "../../../../../bin/AI/ontologyFromDb/ontology/ontologyRuns.js";

export default function () {
    let operations = {
        POST,
    };

    async function POST(req, res, _next) {
        try {
            const source = req.body.source;
            const found = await findUserSource(req, source);
            if (found.error) {
                return res.status(found.status).json({ error: found.error });
            }
            const runningGeneration = runningGenerations[source];
            if (!runningGeneration) {
                return res.status(409).json({ error: "no generation is running for " + source });
            }
            runningGeneration.stop();
            res.status(200).json({ isStopping: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }

    POST.apiDoc = {
        security: [{ restrictAdmin: [] }],
        summary: "Stop the generation running for a source",
        description:
            "The call to the model is cut at once, the database queries under way end first, 30 seconds at most each. POST /ai/ontologyFromDb tells the end of the run on its stream, GET /ai/ontologyFromDb/runs answers isStopping until then. " +
            "Before the answer of the model is whole, the draft stays as it is. Once the load of the answer has started, the load ends and the steps after it are skipped.",
        operationId: "stopOntologyFromDbGeneration",
        parameters: [
            {
                name: "body",
                in: "body",
                required: true,
                schema: { type: "object", required: ["source"], properties: { source: { type: "string" } } },
            },
        ],
        responses: {
            200: { description: "{ isStopping: true }, the stop is under way" },
            404: { description: "The source is unknown to the user." },
            409: { description: "No generation is running for the source." },
        },
        tags: ["AI"],
    };

    return operations;
}
