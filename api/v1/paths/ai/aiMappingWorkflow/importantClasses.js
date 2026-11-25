import SocketManager from "../../../../../bin/socketManager.js";
import { findUserSource } from "../../../../../bin/AI/ontologyFromDb/ontology/ontologyRuns.js";
import { keyDetectionChannel } from "../../../../../bin/AI/aiMappingModeler/keyDetection.js";
import { guessImportantClasses } from "../../../../../bin/AI/aiMappingModeler/masterData.js";

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
                SocketManager.message(clientSocketId, keyDetectionChannel, { databaseId: databaseId, message: "Important classes: " + stepText });
            };
            const guessed = await guessImportantClasses(source, databaseId, found.userInfo, tellStep);
            if (guessed.error) {
                return res.status(409).json({ error: guessed.error });
            }
            res.status(200).json({ importantClassesGuess: guessed.importantClassesGuess });
        } catch (error) {
            console.error("aiMappingWorkflow/importantClasses route error:", error);
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    POST.apiDoc = {
        security: [{ restrictQuota: [], restrictLoggedUser: [] }],
        summary: "Guess the important classes of the business around the master data of a database, step 2 of the AI Mapping Workflow",
        description:
            "The model reads the schema and the master data, an undecided one with its alternatives, keeps the classes the business revolves around, " +
            "reads what one of their rows denotes and classifies them under the upper ontologies, as step 1 does for the master data. Written in the mapping as aiKeys.importantClassesGuess.",
        operationId: "aiMappingWorkflowImportantClasses",
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
                    "{ importantClassesGuess: { importantClasses: [{ label, definition, reason, aboutMasterData, evidence, readings }], classificationByClass, decisionsByMasterData, model, guessedAt } }",
            },
            404: { description: "The source is unknown to the user." },
            409: { description: "The master data are not guessed, the ontologies are not prepared, or the model failed." },
        },
        tags: ["AI"],
    };

    return operations;
}
