import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import userManager from "./user.js";
import ConfigManager from "./configManager.js";
import RemoteCodeRunner from "./remoteCodeRunner.js";
import { profileModel } from "../model/profiles.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requireJson = createRequire(import.meta.url);

function loadRegistry() {
    const registryPath = path.join(projectRoot, "bin", "sparqlRegistry.json");
    return requireJson(registryPath);
}

/**
 * The SPARQL layer reports a failure in three shapes: an `Error`, the raw triplestore body as a
 * string (`httpProxy` forwards it as-is when Virtuoso answers with an error instead of bindings),
 * and the server-side ajax shim's `{ responseText }`. Only the first carries `message`, so reading
 * `message` alone turned every triplestore syntax error into `[object Object]` and dropped the one
 * sentence that says what to correct, which is the sentence an agent needs to fix its own query.
 * @param {Error|string|object} executionError
 * @returns {string} Text safe to hand back to the caller.
 */
function describeExecutionError(executionError) {
    if (typeof executionError === "string") {
        return executionError;
    }
    if (executionError && typeof executionError.responseText === "string" && executionError.responseText.length > 0) {
        return executionError.responseText;
    }
    if (executionError && typeof executionError.message === "string" && executionError.message.length > 0) {
        return executionError.message;
    }
    try {
        return JSON.stringify(executionError);
    } catch (_circularStructureError) {
        return String(executionError);
    }
}

async function runRegisteredSparqlQuery(req, res, returnQueryStr) {
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

        // Deny up-front if the caller requests any source they are not allowed to access.
        // Every source-identifying param is named with "source" (e.g. sourceLabel,
        // fromSourceLabel, toSourceLabel); presence in userSources means at least read access.
        const sourceParamNameRegex = /source/i;
        const allowedSourceNames = Object.keys(userSources);
        const sourceParams = entry.params.filter((param) => sourceParamNameRegex.test(param.name));
        for (const sourceParam of sourceParams) {
            const requestedSource = params[sourceParam.name];
            if (typeof requestedSource !== "string" || requestedSource.length === 0) {
                continue;
            }
            if (!allowedSourceNames.includes(requestedSource)) {
                return res.status(403).json({ message: `Access denied: you are not allowed to access source '${requestedSource}'` });
            }
        }

        const userContext = { user, userSources, tools: userTools };

        RemoteCodeRunner.runVocablesFn({ moduleName, functionName: name, args: positionalArgs }, userContext, function (error, result) {
            if (error) {
                return res.status(500).json({ message: describeExecutionError(error) });
            }
            res.status(200).json(result);
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "An error occurred on the server" });
    }
}

export { runRegisteredSparqlQuery, describeExecutionError };
