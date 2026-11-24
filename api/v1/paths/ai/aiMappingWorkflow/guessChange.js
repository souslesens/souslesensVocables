import { findUserSource } from "../../../../../bin/AI/ontologyFromDb/ontology/ontologyRuns.js";
import { changeGuess } from "../../../../../bin/AI/aiMappingModeler/masterData.js";

export default function () {
    let operations = {
        POST,
    };

    // the changes the chat makes with change_guess, made by the user on a card: same names, same inputs, same log
    async function POST(req, res, _next) {
        try {
            const { source, databaseId, change, changeInput } = req.body;
            const found = await findUserSource(req, source);
            if (found.error) {
                return res.status(found.status).json({ error: found.error });
            }
            const cardInput = changeInput || {};
            cardInput.rationale = "changed by the user on the card";
            const changed = await changeGuess(source, databaseId, change, cardInput, { userRequest: null, queries: [] });
            if (changed.error) {
                return res.status(409).json({ error: changed.error });
            }
            res.status(200).json({ summary: changed.summary, guessKey: changed.guessKey, guess: changed.guess });
        } catch (error) {
            console.error("aiMappingWorkflow/guessChange route error:", error);
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    POST.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Change a guess of the AI Mapping Workflow from a card, as the change_guess tool of the chat does",
        description:
            "Removes or renames an entry, takes another class of the upper ontologies, undoes a decision, and the same on the links. The change is logged in the changeLog of the guess and written in the mapping.",
        operationId: "aiMappingWorkflowGuessChange",
        parameters: [
            {
                name: "body",
                in: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["source", "databaseId", "change"],
                    properties: {
                        source: { type: "string" },
                        databaseId: { type: "string" },
                        change: { type: "string", description: "a change name of the change_guess tool: remove_entry, update_class, undo_decision, add_superclass_option, undo_link_decision..." },
                        changeInput: { type: "object", description: "the inputs of the change_guess tool, step included: entry, reading, newLabel, existingClassIri, superClassIri, link, propertyIri..." },
                    },
                },
            },
        ],
        responses: {
            200: { description: "{ summary, guessKey, guess }: the guess changed, as saved" },
            404: { description: "The source is unknown to the user." },
            409: { description: "The change does not apply to the guess, its message says why." },
        },
        tags: ["AI"],
    };

    return operations;
}
