import SocketManager from "../../../../../bin/socketManager.js";
import { findUserSource } from "../../../../../bin/AI/ontologyFromDb/ontology/ontologyRuns.js";
import { keyDetectionChannel } from "../../../../../bin/AI/aiMappingModeler/keyDetection.js";
import { guessEvents } from "../../../../../bin/AI/aiMappingModeler/linksGuess.js";

export default function () {
    let operations = {
        POST,
    };

    async function POST(req, res, _next) {
        try {
            const { source, databaseId, clientSocketId } = req.body;
            const found = await findUserSource(req, source);
            if (found.error) {
                return res.status(found.status).json({ error: found.error });
            }
            // the page shows the steps as it shows those of the key detection
            const tellStep = function (stepText) {
                SocketManager.message(clientSocketId, keyDetectionChannel, { databaseId: databaseId, message: "Associations: " + stepText });
            };
            const guessed = await guessEvents(source, databaseId, found.userInfo, tellStep);
            if (guessed.error) {
                return res.status(409).json({ error: guessed.error });
            }
            res.status(200).json({ eventsGuess: guessed.eventsGuess });
        } catch (error) {
            console.error("aiMappingWorkflow/events route error:", error);
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    POST.apiDoc = {
        security: [{ restrictQuota: [], restrictLoggedUser: [] }],
        summary: "Guess the association classes joining the classes of a database, step 3 of the AI Mapping Workflow",
        description:
            "The model names the tables holding each class of steps 1 and 2, then the associations of the business joining them (events, processes, relationships), " +
            "held by tables or implicit in columns, read and classified as the classes of steps 1 and 2. An undecided class is given with its alternatives. Written in the mapping as aiKeys.eventsGuess.",
        operationId: "aiMappingWorkflowEvents",
        parameters: [
            {
                name: "body",
                in: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["source", "databaseId"],
                    properties: {
                        source: { type: "string" },
                        databaseId: { type: "string" },
                        clientSocketId: { type: "string", description: "the socket of the page, told each step on the aiKeyDetection channel" },
                    },
                },
            },
        ],
        responses: {
            200: {
                description:
                    "{ eventsGuess: { eventClasses: [{ label, definition, reason, joins, tables, columns, readings, decision }], classTables: { class: [tables] }, classificationByClass, decisionsByClass, model, guessedAt } }",
            },
            404: { description: "The source is unknown to the user." },
            409: { description: "The master data or the important classes are not guessed, the ontologies are not prepared, or the model failed." },
        },
        tags: ["AI"],
    };

    return operations;
}
