import Ask from "../../../../bin/ask.js";
import { sourceModel } from "../../../../model/sources.js";
import userManager from "../../../../bin/user.js";

export default function () {
    async function GET(req, res, _next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            const userSources = await sourceModel.getUserSources(userInfo.user);

            Ask.getOntologySummary(userSources, function (err, summaries) {
                if (err) {
                    return res.status(500).json({ message: "" + err });
                }
                return res.status(200).json(summaries);
            });
        } catch (err) {
            return res.status(500).json({ message: "" + err });
        }
    }

    GET.apiDoc = {
        summary: "What ontologies does the caller have, and what is each one about",
        description:
            "One entry per source the caller may read whose graph describes itself: `source`, `graphUri`, `imports` and the description its `owl:Ontology` or `skos:ConceptScheme` node declares. " +
            "A source carrying no description is absent from the answer. " +
            "Sources served by their own SPARQL endpoint are never described, since the default endpoint credentials are not sent elsewhere.",
        operationId: "askOntologySummary",
        "x-mcp": {
            tools: [
                {
                    name: "sls_ontology_summary",
                    access: "read",
                    description:
                        "Every ontology the caller can read that describes itself: its description, taken from the `owl:Ontology` or `skos:ConceptScheme` node of the graph, next to the source name, graphUri and imports. " +
                        "Call it first when you must pick which source answers a question: it is the only tool that says what a source is about without querying it. " +
                        "It takes no parameter and answers for every readable source at once. " +
                        "Only described ontologies come back, so a source missing from the answer declares no description, not that it is unreadable: list every readable source with sls_list_sources.",
                    params: {},
                },
            ],
        },
        parameters: [],
        responses: {
            200: {
                description: "One entry per described source. Empty when no readable source carries a description.",
                schema: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            source: { type: "string", description: "Source name, as used by every other tool." },
                            graphUri: { type: "string", description: "Named graph the description was read from." },
                            imports: { type: "array", items: { type: "string" }, description: "Names of the sources whose triples are loaded with this one." },
                            description: {
                                type: "string",
                                description: "Description of the graph, read in order: `dct:description`, `dc:description`, `dct:abstract`, `rdfs:comment`, `skos:definition`.",
                            },
                        },
                    },
                    example: [
                        {
                            source: "BFO",
                            graphUri: "http://purl.obolibrary.org/obo/bfo.owl",
                            imports: [],
                            description: "The upper level ontology upon which OBO Foundry ontologies are built.",
                        },
                    ],
                },
            },
            500: {
                description: "The SPARQL endpoint returned an error, or the sources of the caller could not be read.",
                schema: { type: "object", properties: { message: { type: "string" } } },
            },
        },
        security: [{ restrictLoggedUser: [] }],
        tags: ["Ask"],
    };

    return { GET };
}
