import Ask from "../../../../bin/ask.js";

export default function () {
    function GET(req, res, _next) {
        const { sourceLabel, term1, term2 } = req.query;

        Ask.getTermsLinkedClasses(sourceLabel, term1, term2, function (err, linkedClassesMap) {
            if (err) {
                return res.status(500).json({ message: "" + err });
            }
            return res.status(200).json(linkedClassesMap);
        });
    }

    GET.apiDoc = {
        summary: "What can this term be attached to",
        description:
            "Same relations as `/ask/linkedClasses`, starting from plain words instead of class URIs. " +
            "Each term is resolved to the classes whose label matches it, then the OWL restrictions between the two families of classes are collected in both directions, those carried by their subclasses included. " +
            "A restriction declared on a super class of a matched class is not returned. " +
            "Use it before writing a query or a mapping, to know which relations the ontology allows between two terms. " +
            "Both terms are required: without a second one the traversal is unbounded and does not return.",
        operationId: "askTermsLinkedClasses",
        "x-mcp": {
            tools: [
                {
                    name: "sls_terms_linked_classes",
                    access: "read",
                    description:
                        "Lists the relations the ontology allows between two terms given in plain words: the classes they link and the properties linking them. " +
                        "Each term is matched against class labels, so every class it names is covered without a prior search. When you already hold class URIs, use sls_linked_classes instead. " +
                        "Call it before writing a query or a mapping, instead of guessing a predicate. It reads the OWL restrictions in both directions, those carried by the subclasses of the matched classes included, so it finds relations a direct triple lookup misses. " +
                        "It reads downwards only: a restriction declared on a super class of a matched class does not come back, so name that broader class in the term when you want it.",
                    params: {
                        sourceLabel: { type: "string", required: true, description: "Source to look in. Its lowercase form is the label index name." },
                        term1: {
                            type: "string",
                            required: true,
                            description: "Words naming the classes the relations start from, matched against their labels, not a URI. For instance failure mode.",
                        },
                        term2: {
                            type: "string",
                            required: true,
                            description: "Words naming the classes at the other end of the relations, matched against their labels, not a URI. For instance centrifugal pump.",
                        },
                    },
                    query: { sourceLabel: "{sourceLabel}", term1: "{term1}", term2: "{term2}" },
                },
            ],
        },
        parameters: [
            { name: "sourceLabel", in: "query", type: "string", required: true, description: "Source name. Its lowercase form names the ElasticSearch index. Example: `ISO-14224-IOF`." },
            { name: "term1", in: "query", type: "string", required: true, description: "Words matched against class labels, naming the classes the relations start from. Example: `failure mode`." },
            { name: "term2", in: "query", type: "string", required: false, description: "Words matched against class labels, naming the classes the relations end at. Example: `centrifugal pump`." },
        ],
        responses: {
            200: {
                description: "Map `class URI → relations carried by that class`. Empty when no term matches or when the classes carry no restriction.",
                schema: {
                    type: "object",
                    description: "Keys are the URIs of the classes found at either end of a restriction.",
                    additionalProperties: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                predicate: { type: "string", description: "URI of the property carried by `owl:onProperty`." },
                                predicateLabel: { type: "string", description: "Falls back to the property URI when it has no label." },
                                object: { type: "string", description: "URI of the class at the other end of the restriction." },
                                objectLabel: { type: "string", description: "Falls back to the class URI when it has no label." },
                            },
                        },
                    },
                    example: {
                        "http://standards.iso.org/iso/14224/FailureMode": [
                            {
                                predicate: "https://spec.industrialontologies.org/ontology/core/Core/occursIn",
                                predicateLabel: "occurs in",
                                object: "http://standards.iso.org/iso/14224/CentrifugalPump",
                                objectLabel: "Centrifugal pump",
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
                description: "ElasticSearch or the SPARQL endpoint returned an error.",
                schema: { type: "object", properties: { message: { type: "string" } } },
            },
        },
        security: [{ restrictLoggedUser: [] }],
        tags: ["Ask"],
    };

    return { GET };
}
