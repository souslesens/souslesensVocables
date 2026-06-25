import { getSparqlQueryCatalog } from "../../controllers/sparqlQueries.js";

export default function () {
    async function GET(req, res, _next) {
        return getSparqlQueryCatalog(req, res, _next);
    }

    GET.apiDoc = {
        summary: "List exposed SPARQL query functions",
        description:
            "Lists the SPARQL query functions shared from SousLeSens for reuse by external clients. " +
            "Only functions explicitly marked with `@expose` are returned. " +
            "Each catalog entry gives the function name, owning module, parameter contract, response schema, and example needed before calling `run` or `codeRequest`.",
        operationId: "catalogSparqlQueries",
        parameters: [],
        responses: {
            200: {
                description: "List of exposed SPARQL query descriptors.",
                schema: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string", description: "Function name. Example: `getNodeChildren`." },
                            module: { type: "string", description: "Module name. Example: `Sparql_OWL`." },
                            description: { type: "string" },
                            params: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        name: { type: "string" },
                                        type: { type: "string" },
                                        required: { type: "boolean" },
                                        description: { type: "string" },
                                        properties: {
                                            type: "array",
                                            description: "For object params, the accepted sub-fields and their descriptions.",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    name: { type: "string" },
                                                    type: { type: "string" },
                                                    required: { type: "boolean" },
                                                    description: { type: "string" },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                            responseSchema: { type: "string" },
                            example: { type: "string" },
                        },
                    },
                },
            },
            500: {
                description: "Registry file could not be loaded.",
                schema: { properties: { message: { type: "string" } } },
            },
        },
        security: [{ restrictLoggedUser: [] }],
        tags: ["Sparql queries"],
    };

    return { GET };
}
