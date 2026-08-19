import { runRegisteredSparqlQuery } from "../../../../bin/sparqlQueriesRunner.js";

const RETURN_QUERY_STRING = false;

function getSparqlQueryRequestBodySchema() {
    return {
        type: "object",
        required: ["name", "module"],
        properties: {
            name: { type: "string", description: "Function name from the catalog. Example: `getNodeInfos`." },
            module: { type: "string", enum: ["Sparql_OWL", "Sparql_SKOS", "Sparql_generic"], description: "Module that owns the function." },
            params: {
                type: "object",
                description: "Key-value map of function parameters. See `GET /api/v1/sparqlQueries/catalog` for the expected keys per function.",
                additionalProperties: true,
            },
        },
        example: {
            name: "getNodeInfos",
            module: "Sparql_OWL",
            params: {
                sourceLabel: "BFO",
                conceptId: "http://purl.obolibrary.org/obo/BFO_0000001",
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
            description: "Function exists but is not exposed (missing `@expose` JSDoc tag), or the caller is not allowed to access a requested source.",
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
        // This route legitimately runs write functions for other clients. `registryFunctionGuard`
        // tells the MCP server that `name` and `module` designate a catalog entry, so it can refuse
        // anything that is not `@expose read` before forwarding — the read-only rule is the MCP's,
        // not this route's.
        "x-mcp": {
            tools: [
                {
                    name: "sls_run_query_function",
                    access: "read",
                    description:
                        "Runs any read function of the SPARQL catalog by name and module, with a params object keyed by parameter name. " +
                        "Discover names and parameter contracts with sls_list_query_functions. " +
                        "This is how you reach the rest of the ontology API: property domains and ranges, inferred constraints, individuals, dictionaries, distinct predicates.",
                    params: {
                        name: { type: "string", required: true, description: "Function name, copied from a sls_list_query_functions entry. For instance getNodeChildren." },
                        module: {
                            type: "string",
                            required: true,
                            enum: ["Sparql_generic", "Sparql_OWL"],
                            description:
                                "Owning module, copied from the same sls_list_query_functions entry as `name`, never guessed. " +
                                "Fourteen names exist in more than one module and several exist in only one, so only the listed pairing is callable: " +
                                "getNodeChildren is in both Sparql_generic and Sparql_OWL, getDictionary is in Sparql_OWL alone. " +
                                "Sparql_generic dispatches to the source controller and works on OWL and SKOS alike.",
                        },
                        params: { type: "Object", required: true, description: "Parameters keyed by name, including an `options` object when the function accepts one." },
                    },
                    body: { name: "{name}", module: "{module}", params: "{params}" },
                    registryFunctionGuard: { nameParam: "name", moduleParam: "module", requireAccess: "read", allowedModules: ["Sparql_generic", "Sparql_OWL"] },
                },
            ],
        },
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
