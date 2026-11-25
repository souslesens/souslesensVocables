import SocketManager from "../../../../../bin/socketManager.js";
import { findUserSource } from "../../../../../bin/AI/ontologyFromDb/ontology/ontologyRuns.js";
import { keyDetectionChannel } from "../../../../../bin/AI/aiMappingModeler/keyDetection.js";
import { guessMapping } from "../../../../../bin/AI/aiMappingModeler/mappingGuess.js";

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
                SocketManager.message(clientSocketId, keyDetectionChannel, { databaseId: databaseId, message: "Mapping: " + stepText });
            };
            const guessed = await guessMapping(source, databaseId, found.userInfo, found.userSources, tellStep);
            if (guessed.error) {
                return res.status(409).json({ error: guessed.error });
            }
            res.status(200).json({ mappingGuess: guessed.mappingGuess });
        } catch (error) {
            console.error("aiMappingWorkflow/mapping route error:", error);
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    POST.apiDoc = {
        security: [{ restrictQuota: [], restrictLoggedUser: [] }],
        summary: "Guess the mapping of the classes of a database, step 5 of the AI Mapping Workflow",
        description:
            "For each class of steps 1 to 3, how one row of its main table gives one instance (identifier, URI, label), then what each column becomes: an existing or new " +
            "datatype property on a resource of the row, a subclass or an individual per value, an implicit class, an instant of an event, an identifier class, a split value, " +
            "or left unmapped with its reason, each option with its probability and what the data shows of the column. Written in the mapping as aiKeys.mappingGuess.",
        operationId: "aiMappingWorkflowMapping",
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
                    "{ mappingGuess: { classMappings: [{ classLabel, table, otherTables, isImplicit, identifierColumns, rowResources: [{ classLabel, via }], instance: { identifierColumns, uriType, prefixURI, labelColumn, reason }, " +
                    "columnMappings: [{ columns, reason, evidences, options: [{ kind, propertyIri, propertyLabel, propertySource, newPropertyName, onClass, range, dateFormat, detail, probability, problem }], decision }], " +
                    "unmappedColumns: [{ column, reason, evidence }], decision, error }], classesWithoutTables, entriesGuessedFrom, model, guessedAt } }",
            },
            404: { description: "The source is unknown to the user." },
            409: { description: "The classes of steps 1 to 3 are not guessed, or the ontologies are not prepared." },
        },
        tags: ["AI"],
    };

    return operations;
}
