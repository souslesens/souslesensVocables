import Ask from "../../../../bin/ask.js";

export default function () {
    function GET(req, res, _next) {
        const { sourceLabel } = req.query;

        Ask.getKnowledgeModelGraph(sourceLabel, function (err, graph) {
            if (err) {
                return res.status(500).json({ message: "" + err });
            }
            return res.status(200).json(graph);
        });
    }

    GET.apiDoc = {
        summary: "What is this source about",
        description:
            "The main concepts of a source and their relations, as a `{nodes, edges}` graph small enough to be read whole. " +
            "Use it to see what a source models before querying it. " +
            "Read from the whiteboard saved for the source, not crawled from the class hierarchy, which is why it stays short.",
        operationId: "askKnowledgeModelGraph",
        "x-mcp": {
            tools: [
                {
                    name: "sls_knowledge_model_graph",
                    access: "read",
                    description:
                        "The map of a source: its main concepts and the relations between them, as a `{nodes, edges}` graph small enough to read whole. " +
                        "Call it first when you do not know a source yet, before searching labels or writing SPARQL: it shows what the source is about and hands you real class URIs. " +
                        "It is the curated view saved on the source's whiteboard, not a full crawl of the class hierarchy, so a source without one returns an error rather than a large answer.",
                    params: {
                        sourceLabel: { type: "string", required: true, description: "Source whose model graph to read." },
                    },
                    query: { sourceLabel: "{sourceLabel}" },
                },
            ],
        },
        parameters: [{ name: "sourceLabel", in: "query", type: "string", required: true, description: "Source name, matching a saved whiteboard file. Example: `ISO-14224-IOF`." }],
        responses: {
            200: {
                description: "Top concepts of the source and the relations between them.",
                schema: {
                    type: "object",
                    properties: {
                        nodes: {
                            type: "array",
                            description: "One entry per top concept, carrying the `data` payload stored on the whiteboard node.",
                            items: {
                                type: "object",
                                additionalProperties: true,
                                description: "Whiteboard node payload. `id` and `label` are always present, the other keys depend on what the tool that saved the whiteboard stored.",
                            },
                        },
                        edges: {
                            type: "array",
                            description: "One entry per relation, carrying the whiteboard edge `data` payload plus the URIs it links.",
                            items: {
                                type: "object",
                                additionalProperties: true,
                                properties: {
                                    from: { type: "string", description: "URI of the source node." },
                                    to: { type: "string", description: "URI of the target node." },
                                    propertyId: { type: "string", description: "URI of the property carrying the relation." },
                                    propertyLabel: { type: "string" },
                                },
                            },
                        },
                    },
                    example: {
                        nodes: [{ id: "http://standards.iso.org/iso/14224/Equipment", label: "Equipment" }],
                        edges: [
                            {
                                from: "http://standards.iso.org/iso/14224/Equipment",
                                to: "http://standards.iso.org/iso/14224/FailureMode",
                                propertyId: "https://spec.industrialontologies.org/ontology/core/Core/hasOccurrence",
                                propertyLabel: "has occurrence",
                            },
                        ],
                    },
                },
            },
            400: {
                description: "A required query parameter is missing.",
                schema: { type: "object", properties: { message: { type: "string" } } },
            },
            500: {
                description: "No whiteboard saved for that source, or the file could not be parsed.",
                schema: { type: "object", properties: { message: { type: "string" } } },
            },
        },
        security: [{ restrictLoggedUser: [] }],
        tags: ["Ask"],
    };

    return { GET };
}
