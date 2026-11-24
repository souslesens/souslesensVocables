import SocketManager from "../../../../../bin/socketManager.js";
import { findUserSource } from "../../../../../bin/AI/ontologyFromDb/ontology/ontologyRuns.js";
import { keyDetectionChannel } from "../../../../../bin/AI/aiMappingModeler/keyDetection.js";
import { guessLinks } from "../../../../../bin/AI/aiMappingModeler/linksGuess.js";

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
                SocketManager.message(clientSocketId, keyDetectionChannel, { databaseId: databaseId, message: "Links: " + stepText });
            };
            const guessed = await guessLinks(source, databaseId, found.userInfo, tellStep);
            if (guessed.error) {
                return res.status(409).json({ error: guessed.error });
            }
            res.status(200).json({ linksGuess: guessed.linksGuess });
        } catch (error) {
            console.error("aiMappingWorkflow/links route error:", error);
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    POST.apiDoc = {
        security: [{ restrictQuota: [], restrictLoggedUser: [] }],
        summary: "Guess the event classes and the links between the decided classes of a database, step 3 of the AI Mapping Workflow",
        description:
            "Runs once every class of steps 1 and 2 is decided. The model names the tables holding each class, guesses the event classes of the business " +
            "around them, then the object properties of the upper ontologies carrying every foreign key between their classes. Written in the mapping as aiKeys.linksGuess.",
        operationId: "aiMappingWorkflowLinks",
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
                    "{ linksGuess: { eventClasses: [{ label, definition, reason, tables, readings }], classTables: { class: [tables] }, links: [{ id, fromClass, toClass, viaEvent, foreignKey, propertyOptions, cardinality, decision }], decisionsByClass, model, guessedAt } }",
            },
            404: { description: "The source is unknown to the user." },
            409: { description: "The master data or the important classes are still to decide, the ontologies are not prepared, or the model failed." },
        },
        tags: ["AI"],
    };

    return operations;
}
