import { runRegisteredSparqlQuery } from "../../../../bin/sparqlQueriesRunner.js";

const RETURN_QUERY_STRING = false;

function getSparqlQueryRequestBodySchema() {
    return {
        type: "object",
        required: ["name", "module"],
        properties: {
            name: { type: "string", description: "Function name from the catalog. Example: `getNodeChildren`." },
            module: { type: "string", enum: ["Sparql_OWL", "Sparql_SKOS", "Sparql_generic"], description: "Module that owns the function." },
            params: {
                type: "object",
                description: "Key-value map of function parameters. See `GET /api/v1/sparqlQueries/catalog` for the expected keys per function.",
                additionalProperties: true,
            },
        },
        example: {
            name: "getNodeChildren",
            module: "Sparql_OWL",
            params: {
                source: "BFO",
                id: "http://purl.obolibrary.org/obo/BFO_0000001",
                options: { limit: 50 },
            },
        },
    };
}

function getSparqlQueryErrorResponses() {
    return {
        400: {
            description: "Missing required fields or params.",
            schema: { properties: { message: { type: "string" } } },
        },
        403: {
            description: "Function exists but is not exposed (missing `@expose` JSDoc tag).",
            schema: { properties: { message: { type: "string" } } },
        },
        404: {
            description: "No function with that name/module in the catalog.",
            schema: { properties: { message: { type: "string" } } },
        },
        500: {
            description: "Execution error.",
            schema: { properties: { message: { type: "string" } } },
        },
    };
}

export default function () {
    async function POST(req, res, _next) {
        return runRegisteredSparqlQuery(req, res, RETURN_QUERY_STRING);
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
