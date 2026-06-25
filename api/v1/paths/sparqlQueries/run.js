import { getSparqlQueryErrorResponses, getSparqlQueryRequestBodySchema, runRegisteredSparqlQuery } from "../../controllers/sparqlQueries.js";

export default function () {
    async function POST(req, res, _next) {
        return runRegisteredSparqlQuery(req, res, false);
    }

    POST.apiDoc = {
        summary: "Run an exposed SPARQL query function",
        description:
            "Runs a SPARQL query function shared from SousLeSens and returns its execution result. " +
            "The function is identified by `name` + `module` from the catalog and called with the provided `params`. " +
            "Access control is applied with the caller's user and source context before the SPARQL request is sent. " +
            "Use `GET /api/v1/sparqlQueries/catalog` to discover available functions and parameter schemas.",
        operationId: "runSparqlQuery",
        parameters: [
            {
                in: "body",
                name: "body",
                required: true,
                schema: getSparqlQueryRequestBodySchema(),
            },
        ],
        responses: {
            200: {
                description: "SPARQL execution result returned by the selected exposed function.",
                schema: { $ref: "#/definitions/SparqlQueryResponse" },
            },
            ...getSparqlQueryErrorResponses(),
        },
        security: [{ restrictLoggedUser: [] }],
        tags: ["Sparql queries"],
    };

    return { POST };
}
