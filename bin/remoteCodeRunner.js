import { register } from "node:module";
import async from "async";
import httpProxy from "./httpProxy.js";
import UserRequestFiltering from "./userRequestFiltering.js";

// Register custom loader to remap vocables paths
register("./remoteCodeRunnerLoader.js", import.meta.url);

// Global variable to store the active callback
// WARNING: This implementation is NOT safe for concurrent executions.
// If multiple runUserDataFunction calls overlap, they will share these globals.
// Consider refactoring to pass context through function parameters if concurrency is needed.
let activeCallback = null;

// Global variable to store the current user context for SPARQL filtering
let currentUserContext = null;

// Global handler to catch ALL unhandled rejections during module execution
process.on("unhandledRejection", (reason, _promise) => {
    console.error("[RemoteCodeRunner] Unhandled rejection caught:", reason);
    if (activeCallback) {
        const cb = activeCallback;
        activeCallback = null;
        cb(reason instanceof Error ? reason : new Error(String(reason)));
    }
});

/**
 * Format an error for jQuery ajax error callback
 * @param {Error|string} err - The error to format
 * @returns {object} Object with responseText property
 */
function formatAjaxError(err) {
    return { responseText: err.toString ? err.toString() : String(err) };
}

/**
 * Add authentication to params if using default SPARQL server
 * @param {string} sparqlUrl - The SPARQL endpoint URL
 * @param {object} params - The request params to modify
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
 * @param {object} data - The request data
 * @param {function} success - Success callback
 * @param {function} error - Error callback
 */
function handleSparqlPost(data, success, error) {
    const body = JSON.parse(data.body);
    const sparqlUrl = data.url;
    const headers = body.headers || {};
    const params = body.params || {};

    addSparqlAuth(sparqlUrl, params);

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

    if (currentUserContext && currentUserContext.user && currentUserContext.userSources) {
        // Filter SPARQL request based on user permissions
        UserRequestFiltering.filterSparqlRequest(params.query, currentUserContext.userSources, currentUserContext.user, function (parsingError, filteredQuery) {
            if (parsingError) {
                if (error) error({ responseText: "SPARQL filtering error: " + parsingError });
                return;
            }
            executeQuery(filteredQuery);
        });
    } else {
        // No user context, execute without filtering
        executeQuery(params.query);
    }
}

/**
 * Handle GET request through httpProxy
 * @param {object} data - The request data
 * @param {function} success - Success callback
 * @param {function} error - Error callback
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

    // jQuery mock with ajax support that routes to backend code directly
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
        topClassFilter: "?topConcept rdf:type  owl:Class ",
        schemaType: "OWL",
    };
    globalThis.Config.sources["_defaultSource"] = globalThis.Config._defaultSource;

    configLoaded = true;
}

// async from npm
globalThis.async = async;

const RemoteCodeRunner = {
    /**
     * Execute a user data function with optional user context for request filtering
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

        // Store user context for $.ajax filtering
        currentUserContext = userContext;

        const params = userData.data_content.params || {};

        let callbackCalled = false;
        const safeCallback = (err, result) => {
            if (callbackCalled) return;
            callbackCalled = true;
            activeCallback = null;
            // Clear user context after execution
            currentUserContext = null;
            callback(err, result);
        };

        // Activate global handler for this execution
        activeCallback = safeCallback;

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
    },
};

export default RemoteCodeRunner;
