import { processResponse } from "./utils.js";

// Exported so other endpoints (e.g. admin/snapshots) can read a source's cached classes without re-querying
// the triple store. ESM exports are live bindings, so the DELETE handler's reassignment is seen by importers.
export var ontologyModelsCache = {};
export default function () {
    let operations = {
        GET,
        POST,
        DELETE,
        PUT,
    };

    ///// GET api/v1/sources
    async function GET(req, res, _next) {
        const model = ontologyModelsCache[req.query.source];
        if (model) {
            return processResponse(res, null, model);
        }
        return processResponse(res, "no data", null);
    }

    GET.apiDoc = {
        summary: "Read the cached ontology model for a source",
        description:
            "Returns the in-memory ontology model previously POSTed for `source`. The cache is server-process " + "lifetime only (no disk persistence) — restart the server and the cache is empty.",
        security: [{ restrictLoggedUser: [] }],
        operationId: "getOntologyModel",
        parameters: [{ name: "source", in: "query", type: "string", required: true, description: "Source name. Example: `IOF_core`." }],
        responses: {
            200: {
                description: "Cached ontology model.",
                schema: {
                    type: "object",
                    additionalProperties: true,
                    description:
                        "Model object as previously POSTed for `source`. Full OWL model shape (e.g. BFO) includes: " +
                        "`graphUri` (string) — named graph URI; " +
                        "`classes` — URI-keyed map of `{ id, label, superClass, superClassLabel }`; " +
                        "`properties` — URI-keyed map of `{ id, label, inverseProp, superProp }`; " +
                        "`nonObjectProperties` — URI-keyed map of `{ id, label, domain, range }`; " +
                        "`constraints` — URI-keyed map of `{ domain, range, domainLabel, rangeLabel, label, superProp }`; " +
                        "`restrictions` — URI-keyed map of restriction arrays `[{ blankNodeId, ... }]`; " +
                        "`classesCount` (integer). Shape may differ when the client POSTed a partial or custom model.",
                    example: {
                        graphUri: "http://purl.obolibrary.org/obo/bfo.owl",
                        classesCount: 84,
                        classes: {
                            "http://purl.obolibrary.org/obo/BFO_0000001": { id: "http://purl.obolibrary.org/obo/BFO_0000001", label: "entity", superClass: null, superClassLabel: null },
                        },
                        properties: {
                            "http://purl.obolibrary.org/obo/BFO_0000115": {
                                id: "http://purl.obolibrary.org/obo/BFO_0000115",
                                label: "has member part",
                                inverseProp: "http://purl.obolibrary.org/obo/BFO_0000129",
                                superProp: "http://purl.obolibrary.org/obo/BFO_0000178",
                            },
                        },
                        nonObjectProperties: {
                            "http://www.w3.org/2004/02/skos/core#definition": { id: "http://www.w3.org/2004/02/skos/core#definition", label: "definition", domain: null, range: null },
                        },
                        constraints: {
                            "http://purl.obolibrary.org/obo/BFO_0000221": {
                                domain: "http://purl.obolibrary.org/obo/BFO_0000203",
                                range: "http://purl.obolibrary.org/obo/BFO_0000008",
                                domainLabel: "temporal instant",
                                rangeLabel: "temporal region",
                                label: "first instant of",
                                superProp: null,
                            },
                        },
                        restrictions: {},
                    },
                },
            },
            500: { description: "No cached model for this source." },
        },
        tags: ["Ontology"],
    };

    ///// POST api/v1/sources
    async function POST(req, res, _next) {
        if (req.body.key) {
            if (!ontologyModelsCache[req.body.source]) {
                ontologyModelsCache[req.body.source] = {};
            }
            ontologyModelsCache[req.body.source][req.body.key] = JSON.parse(req.body.model);
        } else {
            ontologyModelsCache[req.body.source] = req.body.model;
        }

        return processResponse(res, null, "done");
    }

    POST.apiDoc = {
        summary: "Cache an ontology model for a source",
        description:
            "Stores `model` under `source` in the in-memory `ontologyModelsCache`. " +
            "When `key` is provided, the model is stored under `cache[source][key]` (sub-key replacement); " +
            "without `key`, the entire `cache[source]` slot is replaced.",
        security: [{ restrictLoggedUser: [] }],
        operationId: "writeOntologyModel",
        parameters: [
            {
                name: "body",
                in: "body",
                required: false,
                schema: {
                    type: "object",
                    properties: {
                        source: { type: "string", example: "BFO" },
                        model: {
                            type: "string",
                            description:
                                "JSON-stringified sub-section when `key` is set (e.g. a URI-keyed map of class objects), " +
                                "else the raw full model object (`{ graphUri, classes, properties, nonObjectProperties, constraints, restrictions, classesCount }`).",
                            example: '{"http://purl.obolibrary.org/obo/BFO_0000001":{"id":"http://purl.obolibrary.org/obo/BFO_0000001","label":"entity","superClass":null,"superClassLabel":null}}',
                        },
                        key: {
                            type: "string",
                            description: "Optional sub-key: `classes`, `properties`, `nonObjectProperties`, `constraints`, `restrictions`, `classesCount`, or `graphUri`.",
                            example: "classes",
                        },
                    },
                    example: {
                        source: "BFO",
                        key: "classes",
                        model: '{"http://purl.obolibrary.org/obo/BFO_0000001":{"id":"http://purl.obolibrary.org/obo/BFO_0000001","label":"entity","superClass":null,"superClassLabel":null}}',
                    },
                },
            },
        ],
        responses: {
            200: { description: "Model cached." },
        },
        tags: ["Ontology"],
    };
    DELETE.apiDoc = {
        summary: "Evict cached ontology model(s)",
        description: 'Removes a single source from the in-memory cache when `source` is provided and not the literal `"null"`; ' + "otherwise wipes the entire cache.",
        security: [{ restrictLoggedUser: [] }],
        operationId: "deleteOntologyModel",
        parameters: [{ name: "source", in: "query", type: "string", required: false, description: 'Source to evict. Omit (or pass `"null"`) to clear the entire cache.' }],
        responses: {
            200: { description: "Cache evicted." },
        },
        tags: ["Ontology"],
    };

    ///// POST api/v1/sources
    async function DELETE(req, res, _next) {
        if (req.query.source && req.query.source != "null") {
            delete ontologyModelsCache[req.query.source];
        } else {
            ontologyModelsCache = {};
        }
        return processResponse(res, null, "done");
    }

    PUT.apiDoc = {
        summary: "Patch the cached ontology model with a delta",
        description:
            "Merges or removes entries inside `cache[source]`. `data` is shaped `{ entryType: { id: payload } }` with " +
            '`entryType` being `classes`, `properties`, `restrictions`, etc. When `options.remove === "true"`, the ' +
            "entries listed in `data` are deleted (special handling for `restrictions` matched by `blankNodeId`). " +
            "Otherwise entries are inserted or appended (concat for `restrictions`).",
        security: [{ restrictLoggedUser: [] }],
        operationId: "updateOntologyModel",
        parameters: [
            {
                name: "body",
                in: "body",
                required: false,
                schema: {
                    type: "object",
                    properties: {
                        source: { type: "string", example: "IOF_core" },
                        data: {
                            type: "object",
                            description:
                                "Delta keyed by entry type: `classes`, `properties`, `nonObjectProperties`, `constraints`, or `restrictions`. " +
                                "Each value is a URI-keyed map of model entries. For `restrictions`, values are arrays of restriction objects `[{ blankNodeId, ... }]` " +
                                "that are concatenated (insert) or filtered by `blankNodeId` (remove).",
                            example: {
                                classes: {
                                    "http://purl.obolibrary.org/obo/BFO_0000001": { id: "http://purl.obolibrary.org/obo/BFO_0000001", label: "entity", superClass: null, superClassLabel: null },
                                },
                            },
                        },
                        options: {
                            type: "object",
                            properties: {
                                remove: { type: "string", description: 'If `"true"`, entries in `data` are deleted from the cache. For `restrictions`, matched by `blankNodeId`.', example: "false" },
                            },
                            example: { remove: "false" },
                        },
                    },
                    example: {
                        source: "BFO",
                        data: {
                            classes: {
                                "http://purl.obolibrary.org/obo/BFO_0000001": { id: "http://purl.obolibrary.org/obo/BFO_0000001", label: "entity", superClass: null, superClassLabel: null },
                            },
                        },
                        options: { remove: "false" },
                    },
                },
            },
        ],
        responses: {
            200: { description: "Cache patched." },
        },
        tags: ["Ontology"],
    };

    async function PUT(req, res, _next) {
        if (!ontologyModelsCache[req.body.source]) {
            return processResponse(res, null, "source not exists in ontologyModelsCache");
        } else {
            if (!req.body.data || Object.keys(req.body.data).length === 0) {
                return processResponse(res, null, "no data provided");
            }

            for (var entryType in req.body.data) {
                if (!req.body.data[entryType] || Object.keys(req.body.data[entryType]).length === 0) {
                    continue;
                }
                for (var id in req.body.data[entryType]) {
                    if (req.body.options && req.body.options.remove == "true") {
                        if (!req.body.data[entryType][id]) {
                            continue;
                        }

                        if (entryType == "restrictions" && req.body.data[entryType][id].blankNodeId) {
                            if (!Array.isArray(req.body.data[entryType][id].blankNodeId)) {
                                req.body.data[entryType][id].blankNodeId = [req.body.data[entryType][id].blankNodeId];
                            }
                            if (req.body.data[entryType][id].blankNodeId.length == 0) {
                                return;
                            }
                            if (ontologyModelsCache[req.body.source][entryType] && ontologyModelsCache[req.body.source][entryType][id]) {
                                ontologyModelsCache[req.body.source][entryType][id] = ontologyModelsCache[req.body.source][entryType][id].filter(function (restriction) {
                                    return !req.body.data[entryType][id].blankNodeId.includes(restriction.blankNodeId);
                                });
                                if (ontologyModelsCache[req.body.source][entryType][id].length == 0) {
                                    delete ontologyModelsCache[req.body.source][entryType][id];
                                }
                            }
                        } else {
                            delete ontologyModelsCache[req.body.source][entryType][req.body.data[entryType][id]];
                        }
                    } else {
                        if (!ontologyModelsCache[req.body.source][entryType]) {
                            ontologyModelsCache[req.body.source][entryType] = {};
                        }
                        if (entryType == "restrictions") {
                            if (!req.body.data[entryType][id]) {
                                continue;
                            }
                            if (!ontologyModelsCache[req.body.source][entryType][id]) {
                                ontologyModelsCache[req.body.source][entryType][id] = [];
                            }
                            ontologyModelsCache[req.body.source][entryType][id] = ontologyModelsCache[req.body.source][entryType][id].concat(req.body.data[entryType][id]);
                        } else {
                            if (!req.body.data[entryType][id]) {
                                continue;
                            }

                            ontologyModelsCache[req.body.source][entryType][id] = req.body.data[entryType][id];
                        }
                    }
                }
            }
        }
        return processResponse(res, null, "done");
    }

    return operations;
}
