import { processResponse } from "./utils.js";

var ontologyModelsCache = {};
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
        summary: "return ontology model",
        security: [{ restrictLoggedUser: [] }],
        operationId: "getOntologyModel",

        parameters: [
            {
                name: "source",
                description: "source",
                type: "string",
                in: "query",
                required: true,
            },
        ],
        responses: {
            200: {
                description: "Results",
                schema: {
                    type: "object",
                },
            },
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
        summary: "Write source model in memory cache",
        security: [{ restrictLoggedUser: [] }],
        operationId: "Write source model in memory cache",
        parameters: [
            {
                name: "body",
                description: "body",
                in: "body",
                schema: {
                    type: "object",
                    properties: {
                        source: {
                            type: "string",
                        },
                        model: {
                            type: "string",
                        },
                        key: {
                            type: "string",
                        },
                    },
                },
            },
        ],

        responses: {
            200: {
                description: "Results",
                schema: {
                    type: "object",
                },
            },
        },
        tags: ["Ontology"],
    };
    DELETE.apiDoc = {
        summary: "delete ontology model",
        security: [{ restrictLoggedUser: [] }],
        operationId: "deleteOntologyModel",

        parameters: [
            {
                name: "source",
                description: "source",
                type: "string",
                in: "query",
                required: false,
            },
        ],
        responses: {
            200: {
                description: "Results",
                schema: {
                    type: "object",
                },
            },
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
        summary: "update ontology model",
        security: [{ restrictLoggedUser: [] }],
        operationId: "updateOntologyModel",

        parameters: [
            {
                name: "body",
                description: "body",
                in: "body",
                schema: {
                    type: "object",
                    properties: {
                        source: {
                            type: "string",
                        },

                        data: {
                            type: "object",
                        },
                        options: {
                            type: "object",
                        },
                    },
                },
            },
        ],
        responses: {
            200: {
                description: "Results",
                schema: {
                    type: "object",
                },
            },
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
