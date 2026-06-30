import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import userManager from "../../../bin/user.js";
import ConfigManager from "../../../bin/configManager.js";
import RemoteCodeRunner from "../../../bin/remoteCodeRunner.js";
import { profileModel } from "../../../model/profiles.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const requireJson = createRequire(import.meta.url);

function loadRegistry() {
    const registryPath = path.join(projectRoot, "bin", "sparqlRegistry.json");
    return requireJson(registryPath);
}

export async function getSparqlQueryCatalog(_req, res, _next) {
    try {
        const registry = loadRegistry();
        const exposedEntries = registry.filter((entry) => entry.expose === true);
        res.status(200).json(exposedEntries);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to load SPARQL query registry" });
    }
}

export async function runRegisteredSparqlQuery(req, res, returnQueryStr) {
    try {
        const { name, module: moduleName, params = {} } = req.body || {};

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

        RemoteCodeRunner.runVocablesFn({ moduleName, functionName: name, args: positionalArgs }, userContext, function (error, result) {
            if (error) {
                return res.status(500).json({ message: error.message || String(error) });
            }
            res.status(200).json(result);
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "An error occurred on the server" });
    }
}

export function getSparqlQueryRequestBodySchema() {
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

export function getSparqlQueryErrorResponses() {
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
