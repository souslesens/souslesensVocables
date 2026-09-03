import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const requireJson = createRequire(import.meta.url);

function loadRegistry() {
    const registryPath = path.join(projectRoot, "bin", "sparqlRegistry.json");
    return requireJson(registryPath);
}

const moduleListSeparatorRegex = /\s*,\s*/;

// Splits on a period followed by whitespace or end of text. `?` and `!` are deliberately not
// sentence terminators here: the descriptions are full of SPARQL variables (`?prop ?value`), and
// treating `?` as an end of sentence cuts them mid-pattern.
const firstSentenceRegex = /^.*?\.(?=\s|$)/s;

export default function () {
    async function GET(req, res, _next) {
        try {
            const registry = loadRegistry();
            const requestedModules = req.query.modules ? req.query.modules.split(moduleListSeparatorRegex) : null;
            const nameFilter = req.query.nameContains ? req.query.nameContains.toLowerCase() : null;

            const selectedEntries = [];
            for (const entry of registry) {
                if (entry.expose !== true) {
                    continue;
                }
                if (req.query.access && entry.access !== req.query.access) {
                    continue;
                }
                if (requestedModules && !requestedModules.includes(entry.module)) {
                    continue;
                }
                if (req.query.name && entry.name !== req.query.name) {
                    continue;
                }
                if (nameFilter && !entry.name.toLowerCase().includes(nameFilter)) {
                    continue;
                }
                selectedEntries.push(entry);
            }

            // An exact-name lookup is a "get one": it is asked precisely when the caller is about to
            // call the function and needs its parameter contract, so `compact` does not apply.
            if (req.query.compact !== "true" || req.query.name) {
                return res.status(200).json(selectedEntries);
            }

            // One sentence is what it takes to *choose* a function; the rest of the paragraph
            // describes how it queries, which only matters once the caller asks for the full entry.
            const compactEntries = selectedEntries.map((entry) => {
                const fullDescription = entry.summary || entry.description;
                const sentenceMatch = fullDescription.match(firstSentenceRegex);
                return {
                    name: entry.name,
                    module: entry.module,
                    access: entry.access,
                    description: sentenceMatch ? sentenceMatch[0] : fullDescription,
                };
            });
            res.status(200).json(compactEntries);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Failed to load SPARQL query registry" });
        }
    }

    GET.apiDoc = {
        summary: "List exposed SPARQL query functions",
        description:
            "Lists the SPARQL query functions shared from SousLeSens for reuse by external clients. " +
            "Only functions explicitly marked with `@expose` are returned. " +
            "Each catalog entry gives the function name, owning module, parameter contract, response schema, and example needed before calling `run` or `codeRequest`. " +
            "The query parameters narrow that list; `compact` trades the parameter contract for a one-sentence summary, which is what a client needs to *choose* a function before asking for its full entry.",
        operationId: "catalogSparqlQueries",
        // The MCP server derives its discovery tool from here. `access=read` is frozen so a write
        // operation can never be listed to an agent. Nothing else is filtered: which functions
        // exist at all is decided by `@expose` in the SPARQL modules, not here.
        "x-mcp": {
            tools: [
                {
                    name: "sls_list_query_functions",
                    access: "read",
                    description:
                        "Lists the SPARQL functions callable through sls_run_query_function, with their module and a one-sentence summary. " +
                        "Skips a function already reachable through its own dedicated tool: call that tool instead. " +
                        "Pass name to get a function's full documentation and parameter contract, which you need before calling it. " +
                        "Use it whenever the dedicated tools do not cover what you need: it reaches far more of the ontology API than they do.",
                    params: {
                        name: { type: "string", description: "Exact function name: returns its full documentation and parameter contract instead of the summary." },
                        nameContains: { type: "string", description: "Case-insensitive filter on the function name." },
                    },
                    query: { access: "read", compact: "true", name: "{name}", nameContains: "{nameContains}" },
                    // MCP-only: hides functions the registry already promotes to their own tool. The
                    // REST route below is untouched, so every other caller still gets the full registry.
                    excludePromotedFunctions: true,
                },
            ],
        },
        parameters: [
            { name: "name", in: "query", type: "string", required: false, description: "Return only the function with this exact name." },
            { name: "nameContains", in: "query", type: "string", required: false, description: "Case-insensitive substring filter on the function name." },
            { name: "modules", in: "query", type: "string", required: false, description: "Comma-separated module names to keep. Example: `Sparql_generic,Sparql_OWL`." },
            { name: "access", in: "query", type: "string", required: false, enum: ["read", "write"], description: "Keep only functions that read from, or write to, the triple store." },
            {
                name: "compact",
                in: "query",
                type: "string",
                required: false,
                enum: ["true"],
                description: "Return `{name, module, access, description}` only, the description being the first sentence of the function's documentation. Ignored when `name` is given.",
            },
        ],
        responses: {
            200: {
                description: "List of exposed SPARQL query descriptors.",
                schema: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string", description: "Function name. Example: `getNodeInfos`." },
                            module: { type: "string", description: "Module name. Example: `Sparql_OWL`." },
                            description: { type: "string" },
                            summary: { type: "string", description: "First paragraph of the description, present only when the description has more than one." },
                            access: { type: "string", enum: ["read", "write"], description: "What the function does to the triple store." },
                            mcpTool: { type: "string", description: "Name under which the MCP server promotes this function to a first-class agent tool, when it does." },
                            mcpFixed: { type: "object", additionalProperties: true, description: "Parameters that MCP promotion freezes, keyed by parameter name or `options.<key>`." },
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
