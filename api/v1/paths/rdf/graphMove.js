import { rdfDataModel } from "../../../../model/rdfData.js";

export default function () {
    let operations = {
        POST,
    };

    async function POST(req, res, _next) {
        const { sourceGraphUri, targetGraphUri } = req.body;

        if (!sourceGraphUri || !targetGraphUri) {
            return res.status(400).json({ error: "sourceGraphUri and targetGraphUri are required" });
        }

        try {
            await rdfDataModel.moveGraph(sourceGraphUri, targetGraphUri);
            res.status(200).send({ message: "Graph moved successfully" });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: error.message });
        }
    }

    POST.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Move a RDF graph to another URI",
        parameters: [
            {
                name: "body",
                in: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["sourceGraphUri", "targetGraphUri"],
                    properties: {
                        sourceGraphUri: { type: "string" },
                        targetGraphUri: { type: "string" },
                    },
                },
            },
        ],
        responses: {
            200: { description: "Move OK", schema: { type: "object" } },
        },
        tags: ["RDF"],
    };

    return operations;
}
