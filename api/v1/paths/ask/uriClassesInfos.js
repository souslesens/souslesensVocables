import Ask from "../../../../bin/ask.js";

export default function () {
    function GET(req, res, _next) {
        const { sourceLabel, uri } = req.query;

        Ask.getUriClassesInfos(sourceLabel, uri, function (err, uriInfosMap) {
            if (err) {
                return res.status(500).json({ message: "" + err });
            }
            return res.status(200).json(uriInfosMap);
        });
    }

    GET.apiDoc = {
        summary: "What does this URI mean in this source",
        description:
            "Full description of one class given by its URI: its label, super classes, predicates and relations, keyed by class URI. " +
            "Same answer as `/ask/termClassesInfos`, starting from a URI instead of a term. " +
            "Combines a label and super class query, a predicate query and a restriction query in one call.",
        operationId: "askUriClassesInfos",
        "x-mcp": {
            tools: [
                {
                    name: "sls_uri_infos",
                    access: "read",
                    description:
                        "Understands one class given by its URI: its label, its super classes, its predicates and the relations its restrictions declare, keyed by class URI. " +
                        "Takes a URI only: from plain words, use sls_term_infos, which returns the same description for every class matching the words, so never call this one on a URI sls_term_infos already described. " +
                        "Reads the graph of the source alone, not its imports.",
                    params: {
                        sourceLabel: { type: "string", required: true, description: "Source to look in." },
                        uri: { type: "string", required: true, description: "URI of the class to describe." },
                    },
                    query: { sourceLabel: "{sourceLabel}", uri: "{uri}" },
                },
            ],
        },
        parameters: [
            { name: "sourceLabel", in: "query", type: "string", required: true, description: "Source name. Example: `ISO-14224-IOF`." },
            {
                name: "uri",
                in: "query",
                type: "string",
                required: true,
                description: "URI of the class to describe. Example: `http://datalenergies.total.com/resource/tsf/iso-14224-iof/FailureMode`.",
            },
        ],
        responses: {
            200: {
                description: "Map `class URI → description of that class`, holding the requested URI only. Its fields are empty when the URI is absent from the source graph.",
                schema: {
                    type: "object",
                    description: "The one key is the requested URI.",
                    additionalProperties: {
                        type: "object",
                        properties: {
                            id: { type: "string", description: "Class URI." },
                            label: { type: "string", description: "rdfs:label of the class, the first in alphabetical order when it has several. Null when it has none." },
                            ancestors: { type: "array", items: { type: "string", description: "Super class URI." }, description: "Every named super class, direct or not, in no particular order." },
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
                                description: "Relations coming from the OWL restrictions of the class and of its super classes.",
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
                        "http://datalenergies.total.com/resource/tsf/iso-14224-iof/FailureMode": {
                            id: "http://datalenergies.total.com/resource/tsf/iso-14224-iof/FailureMode",
                            label: "FailureMode",
                            ancestors: ["https://spec.industrialontologies.org/ontology/construct/MaterialState"],
                            predicates: [
                                {
                                    predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                                    predicateLabel: "type",
                                    object: "http://www.w3.org/2002/07/owl#Class",
                                    objectLabel: "Class",
                                },
                                {
                                    predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                                    predicateLabel: "label",
                                    object: "FailureMode",
                                    objectLabel: "FailureMode",
                                },
                                {
                                    predicate: "http://www.w3.org/2000/01/rdf-schema#isDefinedBy",
                                    predicateLabel: "isDefinedBy",
                                    object: "manner in which failure occurs",
                                    objectLabel: "manner in which failure occurs",
                                },
                            ],
                            relations: [
                                {
                                    predicate: "http://purl.obolibrary.org/obo/BFO_0000066",
                                    predicateLabel: "BFO_0000066",
                                    object: "http://datalenergies.total.com/resource/tsf/iso-14224-iof/EquipmentClass-6",
                                    objectLabel: "EquipmentClass-6",
                                },
                            ],
                        },
                    },
                },
            },
            400: {
                description: "A required query parameter is missing.",
                schema: { type: "object", properties: { message: { type: "string" } } },
            },
            500: {
                description: "`uri` holds a character an IRI cannot contain, or the SPARQL endpoint returned an error.",
                schema: { type: "object", properties: { message: { type: "string" } } },
            },
        },
        security: [{ restrictLoggedUser: [] }],
        tags: ["Ask"],
    };

    return { GET };
}
