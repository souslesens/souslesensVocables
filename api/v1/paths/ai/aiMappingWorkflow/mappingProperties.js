import { findUserSource } from "../../../../../bin/AI/ontologyFromDb/ontology/ontologyRuns.js";
import { readAvailableProperties } from "../../../../../bin/AI/aiMappingModeler/mappingGuess.js";
import { getPreparedSource, getNotPreparedError } from "../../../../../bin/AI/aiMappingModeler/sourcePreparation.js";

export default function () {
    let operations = {
        GET,
    };

    // the properties a column may take on the mapping card, the same the model was given in step 5
    async function GET(req, res, _next) {
        try {
            const source = req.query.source;
            const found = await findUserSource(req, source);
            if (found.error) {
                return res.status(found.status).json({ error: found.error });
            }
            const preparedSource = await getPreparedSource(source);
            if (!preparedSource) {
                return res.status(409).json({ error: getNotPreparedError(source) });
            }
            const propertyByIri = await readAvailableProperties(preparedSource, { user: found.userInfo, userSources: found.userSources });
            res.status(200).json({ propertyByIri: propertyByIri });
        } catch (error) {
            console.error("aiMappingWorkflow/mappingProperties route error:", error);
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "The datatype and annotation properties a column may take in step 5 of the AI Mapping Workflow",
        description: "The non object properties of the ontologies the source imports and of the vocabularies of base, as the model of step 5 reads them.",
        operationId: "aiMappingWorkflowMappingProperties",
        parameters: [{ name: "source", in: "query", type: "string", required: true }],
        responses: {
            200: { description: "{ propertyByIri: { iri: { label, range, source } } }" },
            404: { description: "The source is unknown to the user." },
            409: { description: "The source is not prepared for the workflow." },
        },
        tags: ["AI"],
    };

    return operations;
}
