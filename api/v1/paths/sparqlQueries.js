import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import userManager from "../../../bin/user.js";
import ConfigManager from "../../../bin/configManager.js";
import RemoteCodeRunner from "../../../bin/remoteCodeRunner.js";
import { profileModel } from "../../../model/profiles.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const requireJson = createRequire(import.meta.url);

// Registry is rebuilt by running: node bin/sparqlRegistryExtractor.js
function loadRegistry() {
    const registryPath = path.join(projectRoot, "bin", "sparqlRegistry.json");
    return requireJson(registryPath);
}

export default function () {
    async function GET(_req, res, _next) {
        try {
            const registry = loadRegistry();
            const exposedEntries = registry.filter((entry) => entry.expose === true);
            res.status(200).json(exposedEntries);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Failed to load SPARQL query registry" });
        }
    }

    async function POST(req, res, _next) {
        try {
            const { name, module: moduleName, params = {}, returnQueryStr = false } = req.body || {};

            if (!name || !moduleName) {
                return res.status(400).json({ message: "Body must include 'name' (function name) and 'module' (module name)" });
            }

            const registry = loadRegistry();
            const entry = registry.find((registryEntry) => registryEntry.name === name && registryEntry.module === moduleName);
            if (!entry) {
                return res.status(404).json({ message: `No registered function '${name}' in module '${moduleName}'` });
            }
            if (!entry.expose) {
                return res.status(403).json({ message: `Function '${name}' is not exposed via the API. Add @expose to its JSDoc to enable it.` });
            }

            const missingParams = entry.params.filter((param) => param.required && param.name !== "options" && !(param.name in params));
            if (missingParams.length > 0) {
                const missingParamNames = missingParams.map((param) => param.name);
                const missingParamNamesStr = missingParamNames.join(", ");
                return res.status(400).json({ message: `Missing required params: ${missingParamNamesStr}` });
            }

            // Build positional args from registry param order (callback handled internally)
            const paramsWithoutCallback = entry.params.filter((param) => param.name !== "callback");
            const positionalArgs = paramsWithoutCallback.map((param) => {
                if (param.name === "options") {
                    const optionsFromRequest = params.options || {};
                    return { ...optionsFromRequest, returnQueryStr };
                }
                return params[param.name];
            });

            const userInfo = await userManager.getUser(req.user);
            const userSources = await ConfigManager.getUserSources(req, res);
            const user = await ConfigManager.getUser(req, res);
            const userTools = await profileModel.getUserTools(userInfo.user);

            const userContext = { user, userSources, tools: userTools };

            RemoteCodeRunner.runVocablesFn({ moduleName, functionName: name, args: positionalArgs }, userContext, function (err, result) {
                if (err) {
                    return res.status(500).json({ message: err.message || String(err) });
                }
                res.status(200).json(result);
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "An error occurred on the server" });
        }
    }

    GET.apiDoc = {
        summary: "List exposed SPARQL query functions",
        description:
            "Returns all entries from the SPARQL function registry that have been marked with `@expose` in their JSDoc. " +
            "Each entry describes a callable SPARQL function: its name, module, parameter list, and response schema. " +
            "The registry is generated from static analysis of the frontend SPARQL proxy modules (`sparql_OWL.js`, `sparql_SKOS.js`, `sparql_generic.js`) " +
            "by running `node bin/sparqlRegistryExtractor.js`. To expose a new function, add `@expose` to its JSDoc and re-run the extractor.",
        operationId: "listSparqlQueries",
        parameters: [],
        responses: {
            200: {
                description: "List of exposed SPARQL query descriptors.",
                schema: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string", description: "Function name (e.g. `getNodeChildren`)" },
                            module: { type: "string", description: "Module name (e.g. `Sparql_OWL`)" },
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
        tags: ["Sparql"],
    };

    POST.apiDoc = {
        summary: "Execute an exposed SPARQL query function",
        description:
            "Executes one of the SPARQL query functions registered and exposed via `@expose`. " +
            "The function is identified by `name` + `module` and called with the provided `params`. " +
            "Set `returnQueryStr: true` to get back the constructed SPARQL string without executing it (useful for debugging). " +
            "Access control is applied: the caller's user/sources context is forwarded to the SPARQL request filter. " +
            "Use `GET /api/v1/sparqlQueries` to discover available functions and their parameter schemas.",
        operationId: "execSparqlQuery",
        parameters: [
            {
                in: "body",
                name: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["name", "module"],
                    properties: {
                        name: { type: "string", description: "Function name from the registry (e.g. `getNodeChildren`)" },
                        module: { type: "string", enum: ["Sparql_OWL", "Sparql_SKOS", "Sparql_generic"], description: "Module that owns the function" },
                        params: {
                            type: "object",
                            description: "Key-value map of function parameters. See GET /api/v1/sparqlQueries for the expected keys per function.",
                            additionalProperties: true,
                        },
                        returnQueryStr: {
                            type: "boolean",
                            default: false,
                            description: "When true, returns the SPARQL string that would be executed instead of running the query.",
                        },
                    },
                },
            },
        ],
        responses: {
            200: {
                description: "SPARQL execution result, or `{ query: string }` when `returnQueryStr` is true.",
                schema: { $ref: "#/definitions/SparqlQueryResponse" },
            },
            400: {
                description: "Missing required fields or params.",
                schema: { properties: { message: { type: "string" } } },
            },
            403: {
                description: "Function exists but is not exposed (missing `@expose` JSDoc tag).",
                schema: { properties: { message: { type: "string" } } },
            },
            404: {
                description: "No function with that name/module in the registry.",
                schema: { properties: { message: { type: "string" } } },
            },
            500: {
                description: "Execution error.",
                schema: { properties: { message: { type: "string" } } },
            },
        },
        security: [{ restrictLoggedUser: [] }],
        tags: ["Sparql"],
    };

    return { GET, POST };
}
