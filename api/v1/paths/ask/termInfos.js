import Ask from "../../../../bin/ask.js";

export default function () {
    function GET(req, res, _next) {
        const { sourceLabel, term } = req.query;

        Ask.getTermInfos(sourceLabel, term, function (err, termUrisMap) {
            if (err) {
                return res.status(500).json({ message: "" + err });
            }
            return res.status(200).json(termUrisMap);
        });
    }

    GET.apiDoc = {
        summary: "What does this term mean in this source",
        description:
            "Full description of every class matching a term: its predicates and its relations, keyed by class URI. " +
            "Use it to know what a word means in a source without knowing any URI. " +
            "Combines a label index search, a predicate query and a restriction query in one call.",
        operationId: "askTermInfos",
        "x-mcp": {
            tools: [
                {
                    name: "sls_term_infos",
                    access: "read",
                    description:
                        "Understands a term in depth: every class whose label matches it, with its predicates and the relations its restrictions declare, keyed by class URI. " +
                        "Start here when the user names a domain word and you want the whole picture in one call, rather than searching the label index and then querying each hit. " +
                        "It takes plain words, not a URI, so it is also the shortest way from a question to the URIs the other tools need.",
                    params: {
                        sourceLabel: { type: "string", required: true, description: "Source to look in. Its lowercase form is the label index name." },
                        term: { type: "string", required: true, description: "Term in plain words. Several words are combined with AND. For instance failure mode." },
                    },
                    query: { sourceLabel: "{sourceLabel}", term: "{term}" },
                },
            ],
        },
        parameters: [
            { name: "sourceLabel", in: "query", type: "string", required: true, description: "Source name. The ElasticSearch index searched is its lowercase form. Example: `ISO-14224-IOF`." },
            { name: "term", in: "query", type: "string", required: true, description: "Term searched in the `label` and `skoslabels` fields, words combined with AND. Example: `failure mode`." },
        ],
        responses: {
            200: {
                description: "Map `class URI → description of that class`. Empty when the term matches nothing in the index.",
                schema: {
                    type: "object",
                    description: "Keys are the URIs of the classes matching `term`.",
                    additionalProperties: {
                        type: "object",
                        properties: {
                            id: { type: "string", description: "Class URI." },
                            label: { type: "string", description: "rdfs:label of the class." },
                            ancestors: { type: "array", items: { type: "string", description: "Super class URI." }, description: "Super class URIs, as indexed in ElasticSearch." },
                            predicates: {
                                type: "array",
                                description: "Direct triples having the class as subject, restrictions excluded.",
                                items: {
                                    type: "object",
                                    properties: {
                                        predicate: { type: "string" },
                                        predicateLabel: { type: "string", description: "Falls back to the predicate URI when the predicate has no label." },
                                        object: { type: "string" },
                                        objectLabel: { type: "string", description: "Falls back to the object URI when the object has no label." },
                                    },
                                },
                            },
                            relations: {
                                type: "array",
                                description: "Relations coming from the OWL restrictions of the class and of its super classes, up to five levels up.",
                                items: {
                                    type: "object",
                                    properties: {
                                        predicate: { type: "string", description: "URI of the property carried by `owl:onProperty`." },
                                        predicateLabel: { type: "string" },
                                        object: { type: "string", description: "URI of the class reached through `owl:someValuesFrom`, `owl:allValuesFrom` or `owl:hasValue`." },
                                        objectLabel: { type: "string" },
                                    },
                                },
                            },
                        },
                    },
                    example: {
                        "http://standards.iso.org/iso/14224/FailureMode": {
                            id: "http://standards.iso.org/iso/14224/FailureMode",
                            label: "Failure mode",
                            ancestors: ["https://spec.industrialontologies.org/ontology/core/Core/Occurrence"],
                            predicates: [
                                {
                                    predicate: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                                    predicateLabel: "subClassOf",
                                    object: "https://spec.industrialontologies.org/ontology/core/Core/Occurrence",
                                    objectLabel: "Occurrence",
                                },
                            ],
                            relations: [
                                {
                                    predicate: "https://spec.industrialontologies.org/ontology/core/Core/occursIn",
                                    predicateLabel: "occurs in",
                                    object: "http://standards.iso.org/iso/14224/Equipment",
                                    objectLabel: "Equipment",
                                },
                            ],
                        },
                    },
                },
            },
            500: {
                description: "ElasticSearch or the SPARQL endpoint returned an error.",
                schema: { type: "object", properties: { message: { type: "string" } } },
            },
        },
        security: [{ restrictLoggedUser: [] }],
        tags: ["Ask"],
    };

    return { GET };
}
