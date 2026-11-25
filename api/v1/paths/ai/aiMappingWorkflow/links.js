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
        summary: "Guess the links between the classes of a database, step 4 of the AI Mapping Workflow",
        description:
            "One link per foreign key between the tables of the classes of steps 1 to 3, and per row carrying an implicit event, each with the object properties " +
            "of the upper ontologies proposed for it; a link touching an undecided class gets options per superclass it may take. Written in the mapping as aiKeys.linksGuess.",
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
                    "{ linksGuess: { links: [{ id, fromClass, toClass, viaEvent, foreignKey, rowColumns, sameRowTable, propertyOptions: [{ propertyIri, propertyLabel, probability, inverse, reason, assumes }], cardinality, inverseCardinality, decision }], decisionsByClass, model, guessedAt } }",
            },
            404: { description: "The source is unknown to the user." },
            409: { description: "The classes of steps 1 to 3 are not guessed, the ontologies are not prepared, or the model failed." },
        },
        tags: ["AI"],
    };

    return operations;
}
