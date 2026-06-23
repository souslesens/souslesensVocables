import { register } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AsyncLocalStorage } from "node:async_hooks";
import async from "async";
import httpProxy from "./httpProxy.js";
import UserRequestFiltering from "./userRequestFiltering.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Register custom loader to remap vocables paths
register("./remoteCodeRunnerLoader.js", import.meta.url);

// Per-call context stored here; replaces the old module-level globals.
// AsyncLocalStorage propagates through the async call chain of a single
// invocation without leaking into concurrent calls.
const callContextStorage = new AsyncLocalStorage();

// Global handler for unhandled rejections during module execution.
// callContextStorage lets us find the right callback even under concurrency.
process.on("unhandledRejection", (reason, _promise) => {
    console.error("[RemoteCodeRunner] Unhandled rejection caught:", reason);
    const context = callContextStorage.getStore();
    if (context && context.resolve) {
        context.resolve(reason instanceof Error ? reason : new Error(String(reason)), null);
    }
});

/**
 * Format an error for jQuery ajax error callback
 * @param {Error|string} err
 * @returns {object}
 */
function formatAjaxError(err) {
    return { responseText: err.toString ? err.toString() : String(err) };
}

/**
 * Add authentication to params if using default SPARQL server
 * @param {string} sparqlUrl
 * @param {object} params
 */
function addSparqlAuth(sparqlUrl, params) {
    if (!globalThis.Config || !globalThis.Config.sparql_server) {
        return;
    }
    if (sparqlUrl.indexOf(globalThis.Config.sparql_server.url) === 0) {
        if (globalThis.Config.sparql_server.user) {
            params.auth = {
                user: globalThis.Config.sparql_server.user,
                pass: globalThis.Config.sparql_server.password,
                sendImmediately: false,
            };
        }
    }
}

/**
 * Handle SPARQL POST request through httpProxy
 * @param {object} data
 * @param {function} success
 * @param {function} error
 */
function handleSparqlPost(data, success, error) {
    const body = JSON.parse(data.body);
    const sparqlUrl = data.url;
    const headers = body.headers || {};
    const params = body.params || {};

    addSparqlAuth(sparqlUrl, params);

    const context = callContextStorage.getStore();
    const userContext = context && context.userContext;

    const executeQuery = function (filteredQuery) {
        params.query = filteredQuery;
        httpProxy.post(sparqlUrl, headers, params, function (err, result) {
            if (err) {
                if (error) error(formatAjaxError(err));
            } else {
                if (success) success(result, "success", {});
            }
        });
    };

    if (userContext && userContext.user && userContext.userSources) {
        UserRequestFiltering.filterSparqlRequest(params.query, userContext.userSources, userContext.user, function (parsingError, filteredQuery) {
            if (parsingError) {
                if (error) error({ responseText: "SPARQL filtering error: " + parsingError });
                return;
            }
            executeQuery(filteredQuery);
        });
    } else {
        executeQuery(params.query);
    }
}

/**
 * Handle GET request through httpProxy
 * @param {object} data
 * @param {function} success
 * @param {function} error
 */
function handleGetRequest(data, success, error) {
    const getUrl = data.url;
    const getOptions = data.options ? JSON.parse(data.options) : {};

    httpProxy.get(getUrl, getOptions, function (err, result) {
        if (err) {
            if (error) error(formatAjaxError(err));
        } else {
            if (success) success(result, "success", {});
        }
    });
}

// Mock browser globals for frontend modules running in Node.js
if (typeof globalThis.window === "undefined") {
    globalThis.window = globalThis;
    globalThis.self = globalThis;
    globalThis.document = {
        getElementById: () => null,
        createElement: () => ({}),
        querySelector: () => null,
        querySelectorAll: () => [],
    };

    // jQuery mock with ajax support that routes to backend code directly (only for sparqlProxy calls)
    const jQueryMock = function (_selector) {
        return { remove: () => {}, html: () => {}, css: () => {}, on: () => {}, off: () => {}, prop: () => {} };
    };

    // $.ajax implementation that calls backend code directly (only for sparqlProxy calls)
    jQueryMock.ajax = function (options) {
        const { url, data, success, error } = options;

        if (url && url.includes("/sparqlProxy")) {
            try {
                if (data.POST) {
                    handleSparqlPost(data, success, error);
                } else {
                    handleGetRequest(data, success, error);
                }
            } catch (e) {
                console.error("[$.ajax] Error:", e);
                if (error) error({ responseText: e.message });
            }
        } else {
            console.warn("[$.ajax] Unhandled URL:", url);
            if (error) error({ responseText: "Unhandled ajax URL in server context: " + url });
        }
    };

    globalThis.$ = jQueryMock;
    globalThis.UI = { message: (msg) => console.log("[UI]", msg) };
    globalThis.alert = (msg) => console.log("[alert]", msg);
    globalThis.vis = {
        DataSet: class {
            add() {}
        },
    };
    globalThis.MainController = { errorAlert: (err) => console.error("[MainController]", err) };
    globalThis.Sparql_common = { getLabelFromURI: (uri) => uri };

}

// Load Config lazily
// Simplification of index.html load of configuration and sources/profiles
let configLoaded = false;
async function loadConfig() {
    if (configLoaded) return;

    // Load mainConfig
    const { mainConfigModel } = await import("../model/mainConfig.js");
    globalThis.Config = await mainConfigModel.getConfig();

    // Load sources
    const { sourceModel } = await import("../model/sources.js");
    const allSources = await sourceModel.getAllSources();
    // Apply _default sparql_server like frontend does
    for (const source in allSources) {
        if (allSources[source].sparql_server && allSources[source].sparql_server.url === "_default") {
            allSources[source].sparql_server.url = globalThis.Config.sparql_server.url;
        }
    }
    globalThis.Config.sources = allSources;

    // Load profiles
    const { profileModel } = await import("../model/profiles.js");
    globalThis.Config.profiles = await profileModel.getAllProfiles();

    // Initialize ontologiesVocabularyModels from basicVocabularies (like frontend app_config.js)
    const basicVocabularies = {
        rdf: { graphUri: "https://www.w3.org/1999/02/22-rdf-syntax-ns" },
        rdfs: { graphUri: "https://www.w3.org/2000/01/rdf-schema" },
        owl: { graphUri: "https://www.w3.org/2002/07/owl" },
        "iof-av": { graphUri: "https://spec.industrialontologies.org/ontology/core/meta/AnnotationVocabulary/" },
        skos: { graphUri: "http://www.w3.org/2004/02/skos/core/" },
        dcterms: { graphUri: "http://purl.org/dc/terms/" },
        dc: { graphUri: "http://purl.org/dc/elements/1.1/" },
    };
    globalThis.Config.ontologiesVocabularyModels = JSON.parse(JSON.stringify(basicVocabularies));

    // Add sources with graphUri to ontologiesVocabularyModels
    for (const sourceName in allSources) {
        if (allSources[sourceName].graphUri) {
            globalThis.Config.ontologiesVocabularyModels[sourceName] = {
                graphUri: allSources[sourceName].graphUri,
            };
        }
    }

    // Set default source
    globalThis.Config._defaultSource = {
        graphUri: null,
        sparql_server: { url: "_default" },
        imports: [],
        controller: "Sparql_OWL",
        topClassFilter: "?topConcept rdf:type owl:Class . ?topConcept rdfs:subClassOf ?superClass filter (isUri(?superClass) && not exists{?superClass rdf:type owl:Class })",
        schemaType: "OWL",
    };
    globalThis.Config.sources["_defaultSource"] = globalThis.Config._defaultSource;

    configLoaded = true;
}

// async from npm
globalThis.async = async;

// Mapping from public module name to its file path relative to projectRoot
const VOCABLES_MODULE_PATHS = {
    Sparql_OWL: "public/vocables/modules/sparqlProxies/sparql_OWL.js",
    Sparql_SKOS: "public/vocables/modules/sparqlProxies/sparql_SKOS.js",
    Sparql_generic: "public/vocables/modules/sparqlProxies/sparql_generic.js",
};

const RemoteCodeRunner = {
    /**
     * Execute a user data function with optional user context for request filtering.
     * @param {object} userData - The user data containing modulePath and params
     * @param {object} userContext - Optional user context with user and userSources for SPARQL filtering
     * @param {function} callback - Callback function (err, result)
     */
    runUserDataFunction: function (userData, userContext, callback) {
        // Handle optional userContext parameter (backward compatibility)
        if (typeof userContext === "function") {
            callback = userContext;
            userContext = null;
        }

        const modulePath = userData.data_content.modulePath;
        const resolvedPath = path.resolve(projectRoot, modulePath).replace(/\\/g, "/");

        const projectRootFwd = projectRoot.replace(/\\/g, "/");
        const trustedPluginsDirs = [projectRootFwd + "/plugins", path.dirname(projectRoot).replace(/\\/g, "/") + "/plugins"];

        const pathParts = resolvedPath.split("/");
        const pluginsIdx = pathParts.lastIndexOf("plugins");
        const actualPluginsDir = pluginsIdx !== -1 ? pathParts.slice(0, pluginsIdx + 1).join("/") : null;

        if (!actualPluginsDir || !trustedPluginsDirs.includes(actualPluginsDir) || pluginsIdx >= pathParts.length - 2) {
            return callback(new Error("Access denied: module path must be within the project's plugins/<PluginName>/ directory"));
        }

        const pluginName = pathParts[pluginsIdx + 1];

        const userGroups = (userContext && userContext.user && userContext.user.user && userContext.user.user.groups) || [];
        const userTools = (userContext && userContext.tools) || [];
        const hasAccess = userGroups.includes("admin") || userTools.some((t) => t.type === "plugin" && t.name.toLowerCase() === pluginName.toLowerCase());

        if (!hasAccess) {
            return callback(new Error(`Access denied: user does not have rights on plugin '${pluginName}'`));
        }

        const params = userData.data_content.params || {};

        let callbackCalled = false;
        const safeCallback = (err, result) => {
            if (callbackCalled) return;
            callbackCalled = true;
            callback(err, result);
        };

        callContextStorage.run({ userContext, resolve: safeCallback }, () => {
            // Load Config then the user module
            loadConfig()
                .then(() => import(userData.data_content.modulePath))
                .then((mod) => {
                    try {
                        const maybePromise = mod.run(params, function (err, result) {
                            safeCallback(err, result);
                        });
                        // If run() returns a Promise, catch any rejection
                        if (maybePromise && typeof maybePromise.then === "function") {
                            maybePromise.catch((e) => safeCallback(e));
                        }
                    } catch (e) {
                        safeCallback(e);
                    }
                })
                .catch((e) => safeCallback(e));
        });
    },

    /**
     * Execute a vocables SPARQL function by name, bypassing the plugins-only restriction.
     * The function is looked up on the module's default export (the IIFE self object).
     * User context is propagated via AsyncLocalStorage for concurrent-safe SPARQL filtering.
     * @param {object} request - { moduleName, functionName, args }
     * @param {object} userContext - { user, userSources } for SPARQL access filtering
     * @param {function} callback - Error-first callback (err, result)
     */
    runVocablesFn: function (request, userContext, callback) {
        const { moduleName, functionName, args = [] } = request;

        const modulePath = VOCABLES_MODULE_PATHS[moduleName];
        if (!modulePath) {
            return callback(new Error(`Unknown vocables module: ${moduleName}. Allowed: ${Object.keys(VOCABLES_MODULE_PATHS).join(", ")}`));
        }

        let callbackCalled = false;
        const safeCallback = (err, result) => {
            if (callbackCalled) return;
            callbackCalled = true;
            callback(err, result);
        };

        callContextStorage.run({ userContext, resolve: safeCallback }, () => {
            loadConfig()
                .then(() => import(modulePath))
                .then((mod) => {
                    const moduleExport = mod.default || globalThis[moduleName];
                    if (!moduleExport) {
                        return safeCallback(new Error(`Module ${moduleName} did not export a default value`));
                    }

                    const targetFn = moduleExport[functionName];
                    if (typeof targetFn !== "function") {
                        return safeCallback(new Error(`${moduleName}.${functionName} is not a function`));
                    }

                    try {
                        targetFn(...args, safeCallback);
                    } catch (e) {
                        safeCallback(e);
                    }
                })
                .catch((e) => safeCallback(e));
        });
    },
};

export default RemoteCodeRunner;
