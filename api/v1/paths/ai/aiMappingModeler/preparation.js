import { findUserSource } from "../../../../../bin/AI/ontologyFromDb/ontology/ontologyRuns.js";
import { prepareSource } from "../../../../../bin/AI/aiMappingModeler/sourcePreparation.js";

export default function () {
    let operations = {
        POST,
    };

    async function POST(req, res, _next) {
        try {
            const source = req.body.source;
            const upperOntologies = req.body.upperOntologies || [];
            const databaseIds = req.body.databaseIds || [];
            const found = await findUserSource(req, source);
            if (found.error) {
                return res.status(found.status).json({ error: found.error });
            }
            const unknownSources = upperOntologies.filter((upperOntology) => !found.userSources[upperOntology]);
            if (unknownSources.length > 0) {
                return res.status(404).json({ error: "sources not found: " + unknownSources.join(", ") });
            }
            const preparedSource = await prepareSource(source, upperOntologies, databaseIds, { user: found.userInfo, userSources: found.userSources });
            res.status(200).json({ databaseErrors: preparedSource.databaseErrors });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }

    POST.apiDoc = {
        security: [{ restrictAdmin: [] }],
        summary: "Prepare the column class suggestions of a source",
        description:
            "Reads the classes of the upper ontologies and the schemas of the databases once, when the AI Mapping Modeler opens, " +
            "so that a suggestion pays only the call to the model. POST a source, its upper ontologies, most abstract first, and its database ids.",
        operationId: "prepareColumnClassSuggestion",
        parameters: [
            {
                name: "body",
                in: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["source"],
                    properties: {
                        source: { type: "string" },
                        upperOntologies: { type: "array", items: { type: "string" } },
                        databaseIds: { type: "array", items: { type: "string" } },
                    },
                },
            },
        ],
        responses: {
            200: { description: "{ databaseErrors }, the databases whose schema could not be read" },
            404: { description: "The source or an upper ontology is unknown to the user." },
        },
        tags: ["AI"],
    };

    return operations;
}
