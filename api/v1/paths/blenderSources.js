import { blenderSources } from "../../../model/blenderSources.js";
import configManager from "../../../bin/configManager.js";
import { responseSchema, processResponse, successfullyFetched } from "./utils.js";
export default function () {
    let operations = {
        GET,
        POST,
        DELETE,
    };
    async function GET(req, res, next) {
        try {
            const blenderSourcesData = await blenderSources.get();
            res.status(200).json(successfullyFetched(blenderSourcesData));
        } catch (error) {
            res.status(error.status || 500).json(error);
            next(error);
        }
    }
    GET.apiDoc = {
        summary: "Returns blender sources",
        security: [{ restrictLoggedUser: [] }],
        operationId: "getAllBlenderSources",
        parameters: [],
        responses: responseSchema("BlenderSources", "GET"),
        tags: ["Sources"],
    };
    function POST(req, res, next) {
        try {
            configManager.createNewResource(req.body.sourceName, req.body.graphUri, req.body.targetSparqlServerUrl, JSON.parse(req.body.options), function (err, result) {
                processResponse(res, err, result);
            });
        } catch (error) {
            res.status(error.status || 500).json(error);
            next(error);
        }
    }
    POST.apiDoc = {
        summary: "Create a new blender source",
        security: [{ restrictAdmin: [] }],
        operationId: "createBlenderSource",
        parameters: [
            {
                in: "body",
                name: "body",
                schema: {
                    type: "object",
                    properties: {
                        sourceName: { type: "string" },
                        graphUri: { type: "string" },
                        targetSparqlServerUrl: { type: "string" },
                        options: { type: "string" },
                    },
                },
            },
        ],
        responses: responseSchema("BlenderSources", "POST"),
        tags: ["Sources"],
    };
    async function DELETE(req, res, next) {
        try {
            configManager.deleteResource(req.body.sourceName, req.body.graphUri, req.body.sparqlServerUrl, function (err, result) {
                processResponse(res, err, result);
            });
        } catch (error) {
            res.status(error.status || 500).json(error);
            next(error);
        }
    }
    DELETE.apiDoc = {
        summary: "Delete blender source",
        security: [{ restrictAdmin: [] }],
        operationId: "deleteBlenderSource",
        parameters: [
            {
                in: "body",
                name: "body",
                schema: {
                    type: "object",
                    properties: {
                        sourceName: { type: "string" },
                        graphUri: { type: "string" },
                        sparqlServerUrl: { type: "string" },
                    },
                },
            },
        ],
        responses: responseSchema("BlenderSources", "DELETE"),
        tags: ["Sources"],
    };
    return operations;
}
