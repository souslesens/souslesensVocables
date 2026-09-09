import Ask from "../../../../bin/ask.js";

export default function () {
    function GET(req, res, _next) {
        const { sourceLabel, term1, term2 } = req.query;

        Ask.getTwoTermsShortestPath(sourceLabel, term1, term2, function (err, pathSteps) {
            if (err) {
                return res.status(500).json({ message: "" + err });
            }
            return res.status(200).json(pathSteps);
        });
    }

    GET.apiDoc = {
        summary: "How are these two terms connected",
        description:
            "The chains of properties joining two terms, as `[subject, property, object]` steps. " +
            "Use it to see how two things relate in a source without knowing any URI. " +
            "Resolves both terms in the label index, lifts them to their main concept, then walks the model graph undirected, capped at twenty paths, so the answer is a sample and not an exhaustive enumeration.",
        operationId: "askTwoTermsShortestPath",
        "x-mcp": {
            tools: [
                {
                    name: "sls_two_terms_paths",
                    access: "read",
                    description:
                        "Shows how two terms are connected: the chains of properties joining them, each step returned as subject, property and object. " +
                        "Ask it whenever a question is about a relation rather than a definition, for instance how a failure relates to an equipment: it answers from plain words, with no URI needed. " +
                        "The walk is undirected over the source's model graph and stops at twenty paths, so treat the answer as the ways they connect, not as an exhaustive list.",
                    params: {
                        sourceLabel: { type: "string", required: true, description: "Source to walk. A model graph must be saved for it." },
                        term1: { type: "string", required: true, description: "Term the paths start from, in plain words." },
                        term2: { type: "string", required: true, description: "Term the paths end at, in plain words." },
                    },
                    query: { sourceLabel: "{sourceLabel}", term1: "{term1}", term2: "{term2}" },
                },
            ],
        },
        parameters: [
            {
                name: "sourceLabel",
                in: "query",
                type: "string",
                required: true,
                description: "Source name. Its lowercase form names the ElasticSearch index, and a whiteboard must be saved for it. Example: `ISO-14224-IOF`.",
            },
            { name: "term1", in: "query", type: "string", required: true, description: "Term the path starts from. Example: `failure mode`." },
            { name: "term2", in: "query", type: "string", required: true, description: "Term the path ends at. Example: `centrifugal pump`." },
        ],
        responses: {
            200: {
                description: "Steps of the paths found, each step being a `[subject, property, object]` triple.",
                schema: {
                    type: "array",
                    items: {
                        type: "array",
                        description: "Exactly three entries: subject node, property, object node.",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string", description: "URI of the node or of the property." },
                                label: { type: "string" },
                            },
                        },
                    },
                    example: [
                        [
                            { id: "http://standards.iso.org/iso/14224/FailureMode", label: "Failure mode" },
                            { id: "https://spec.industrialontologies.org/ontology/core/Core/occursIn", label: "occurs in" },
                            { id: "http://standards.iso.org/iso/14224/Equipment", label: "Equipment" },
                        ],
                    ],
                },
            },
            400: {
                description: "A required query parameter is missing.",
                schema: { type: "object", properties: { message: { type: "string" } } },
            },
            500: {
                description: "ElasticSearch returned an error, or no whiteboard is saved for that source.",
                schema: { type: "object", properties: { message: { type: "string" } } },
            },
        },
        security: [{ restrictLoggedUser: [] }],
        tags: ["Ask"],
    };

    return { GET };
}
