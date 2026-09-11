import Ask from "../../../../bin/ask.js";

export default function () {
    function GET(req, res, _next) {
        const { sourceLabel, uri1, uri2 } = req.query;

        Ask.getLinkedClasses(sourceLabel, uri1, uri2, function (err, linkedClassesMap) {
            if (err) {
                return res.status(500).json({ message: "" + err });
            }
            return res.status(200).json(linkedClassesMap);
        });
    }

    GET.apiDoc = {
        summary: "What can this class be attached to",
        description:
            "The relations a class, given by its URI, can have: the properties carried by its OWL restrictions and the classes they point to. " +
            "Covers the restrictions carried by the class itself and by its subclasses. A restriction declared on one of its super classes is not returned. " +
            "With `uri2`, keeps only the relations reaching that class or its subclasses, and adds the ones going from `uri2` back to `uri1`, flagged `inverseRelation`. " +
            "Use it before writing a query or a mapping, to know which relations the ontology allows for a class already identified.",
        operationId: "askLinkedClasses",
        "x-mcp": {
            tools: [
                {
                    name: "sls_linked_classes",
                    access: "read",
                    description:
                        "Lists the relations the ontology allows for one class given by its URI: the properties of its OWL restrictions and the classes they point to. " +
                        "Give a second class URI to keep only the relations between the two, read in both directions. Takes URIs only: from plain words, use sls_terms_linked_classes. " +
                        "Call it before writing a query or a mapping, instead of guessing a predicate. Restrictions declared on the subclasses of the given class are included, so it finds relations a lookup on that single class misses. " +
                        "It reads downwards only: a restriction declared on a super class does not come back, so pass that super class URI when you want it.",
                    params: {
                        sourceLabel: { type: "string", required: true, description: "Source to look in." },
                        uri1: { type: "string", required: true, description: "URI of the class the relations start from. Its subclasses are covered too." },
                        uri2: { type: "string", required: false, description: "URI of the class at the other end. Leave it out to list every relation of uri1." },
                    },
                    query: { sourceLabel: "{sourceLabel}", uri1: "{uri1}", uri2: "{uri2}" },
                },
            ],
        },
        parameters: [
            { name: "sourceLabel", in: "query", type: "string", required: true, description: "Source name. Example: `ISO-14224-IOF`." },
            {
                name: "uri1",
                in: "query",
                type: "string",
                required: true,
                description: "URI of the class the relations start from, its subclasses included. Example: `http://standards.iso.org/iso/14224/FailureMode`.",
            },
            {
                name: "uri2",
                in: "query",
                type: "string",
                required: false,
                description:
                    "URI of the class the relations end at, its subclasses included. Without it, every relation of `uri1` is returned. Example: `http://standards.iso.org/iso/14224/CentrifugalPump`.",
            },
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
