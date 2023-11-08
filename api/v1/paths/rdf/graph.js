const { rdfDataModel } = require("../../../../model/rdfData");
const { ulid } = require("ulid");
const fs = require("fs");

module.exports = function () {
    let operations = {
        GET,
        POST,
    };

    async function GET(req, res, next) {
        try {
            const graphUri = req.query.graph;
            const limit = req.query.limit;
            const offset = req.query.offset;
            const data = await rdfDataModel.getGraphPartNt(graphUri, limit, offset);
            res.status(200).send(data);
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: error });
        }
    }

    async function POST(req, res, next) {
        try {
            const first = JSON.parse(req.body.first);
            const last = JSON.parse(req.body.last);
            const id = JSON.parse(req.body.id);
            const clean = JSON.parse(req.body.clean);
            const file = req.files.data;

            if (clean) {
                fs.rmSync(`/tmp/${id}.nt`);
                res.status(200).send({ id: id });
                return;
            }

            // first chunk, create a file
            if (first) {
                // generate random id
                const id = ulid();
                file.mv(`/tmp/${id}.nt`);
                res.status(200).send({ id: id });
                return;
            }

            // middle or last chunk, append data
            fs.appendFileSync(`/tmp/${id}.nt`, file.data);

            // last chunk, upload file to endpoint
            // TODO:

            res.status(200).send({ id: id });
        } catch (error) {
            return res.status(500).json({ error: error });
        }
    }

    POST.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Post a RDF graph",
        description: "Post a RDF graph",
        parameters: [
            {
                name: "body",
                description: "body",
                in: "body",
                schema: {
                    type: "object",
                    properties: {
                        first: { type: "string" },
                        last: { type: "string" },
                        id: { type: "string" },
                        clean: { type: "string" },
                    },
                },
            },
        ],
        responses: {
            200: {
                description: "Upload ok",
                schema: {
                    type: "object",
                },
            },
        },
    };

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Get a RDF graph",
        description: "Get a RDF graph in several serialization format",
        operationId: "RDF get graph",
        parameters: [
            {
                name: "graph",
                description: "URI of the graph to retrieve",
                in: "query",
                type: "string",
                required: true,
            },
            {
                name: "limit",
                description: "SPARQL LIMIT",
                in: "query",
                type: "string",
                required: true,
            },
            {
                name: "offset",
                description: "SPARQL OFFSET",
                in: "query",
                type: "string",
                required: true,
            },
        ],
        responses: {
            200: {
                description: "The RDF data",
                schema: {
                    type: "object",
                },
            },
        },
    };

    return operations;
};
