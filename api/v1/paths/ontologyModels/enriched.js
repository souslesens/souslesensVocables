import userManager from "../../../../bin/user.js";
import { getEnrichedOntologyModel } from "../../../../bin/enrichedOntologyModel.js";
import { sourceModel } from "../../../../model/sources.js";

export default function () {
    let operations = {
        GET,
    };

    async function GET(req, res, _next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            const userSources = await sourceModel.getUserSources(userInfo.user);
            if (!userSources[req.query.source]) {
                return res.status(404).json({ error: req.query.source + " not found" });
            }
            const enrichedModel = await getEnrichedOntologyModel(req.query.source, { user: userInfo, userSources: userSources });
            if (!enrichedModel) {
                return res.status(404).json({ error: "no ontology model for " + req.query.source });
            }
            res.status(200).json(enrichedModel);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message || String(error) });
        }
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Ontology model of a source enriched with its restrictions, axioms, definitions and examples",
        description:
            "Starts from the ontology model of `source` (GET /ontologyModels), read from the server cache or built by OntologyModels.registerSourcesModel " +
            "when the cache holds none. Fills `restrictions` from the axioms of the source, as the Draw axioms command of Lineage extracts them, " +
            "adds to each class `axioms` ({ subClassOf, equivalentTo, disjointWith, disjointUnionOf }, Manchester expressions with bracketed IRIs) " +
            "and to each class and object property `definitions` and `examples` (English or untagged skos:definition, IOF naturalLanguageDefinition, skos:example). " +
            "The enriched model is cached in the server process and emptied whenever POST, PUT or DELETE /ontologyModels changes the model of the source.",
        operationId: "getEnrichedOntologyModel",
        parameters: [{ name: "source", in: "query", type: "string", required: true, description: "Source name. Example: `IOF-CORE-202401`." }],
        responses: {
            200: {
                description:
                    "The whole ontology model of GET /ontologyModels (classes, properties, nonObjectProperties, propertyTypes, " +
                    "constraints with the domains and ranges inherited through the property hierarchy, classesCount), with `restrictions` filled, " +
                    "`classes[<IRI>]` given `axioms`, `definitions` and `examples`, `properties[<IRI>]` given `definitions` and `examples`.",
                schema: {
                    type: "object",
                    additionalProperties: true,
                    example: {
                        graphUri: "https://spec.industrialontologies.org/ontology/202401/core/Core/",
                        classesCount: 83,
                        classes: {
                            "https://spec.industrialontologies.org/ontology/core/Core/RawMaterial": {
                                id: "https://spec.industrialontologies.org/ontology/core/Core/RawMaterial",
                                label: "raw material",
                                superClass: "http://purl.obolibrary.org/obo/BFO_0000040",
                                superClassLabel: "BFO_0000040",
                                definitions: ["material entity which has the raw material role"],
                                examples: ["rolls of aluminum a manufacturer purchases to be consumed on its bottling lines to produce aluminum cans to package its product"],
                                axioms: {
                                    subClassOf: ["<http://purl.obolibrary.org/obo/BFO_0000040>"],
                                    equivalentTo: [
                                        "<http://purl.obolibrary.org/obo/BFO_0000040> and (<https://spec.industrialontologies.org/ontology/core/Core/hasRole> some <https://spec.industrialontologies.org/ontology/core/Core/RawMaterialRole>)",
                                    ],
                                    disjointWith: [],
                                    disjointUnionOf: [],
                                },
                            },
                        },
                        properties: {
                            "https://spec.industrialontologies.org/ontology/core/Core/prescribedBy": {
                                id: "https://spec.industrialontologies.org/ontology/core/Core/prescribedBy",
                                label: "prescribed by",
                                inverseProp: "https://spec.industrialontologies.org/ontology/core/Core/prescribes",
                                superProp: "https://spec.industrialontologies.org/ontology/core/Core/isSubjectOf",
                                definitions: ["relation from an entity to an information content entity that the information content entity serves as a collection of rules or guide for"],
                                examples: ["some Artifact or Facility is modeled by a blueprint"],
                            },
                        },
                        nonObjectProperties: {
                            "https://spec.industrialontologies.org/ontology/core/Core/hasDateTimeInstantValue": {
                                id: "https://spec.industrialontologies.org/ontology/core/Core/hasDateTimeInstantValue",
                                label: "has date-time instant value",
                                domain: "https://spec.industrialontologies.org/ontology/core/Core/TemporalInstantValueExpression",
                                range: "http://www.w3.org/2001/XMLSchema#dateTime",
                            },
                        },
                        propertyTypes: { "https://spec.industrialontologies.org/ontology/core/Core/prescribedBy": { "http://www.w3.org/2002/07/owl#ObjectProperty": true } },
                        constraints: {
                            "https://spec.industrialontologies.org/ontology/core/Core/prescribedBy": {
                                domain: "http://purl.obolibrary.org/obo/BFO_0000001",
                                range: "https://spec.industrialontologies.org/ontology/core/Core/InformationContentEntity",
                                domainLabel: "BFO_0000001",
                                rangeLabel: "information content entity",
                                label: "prescribed by",
                                superProp: "https://spec.industrialontologies.org/ontology/core/Core/isSubjectOf",
                            },
                            "https://spec.industrialontologies.org/ontology/core/Core/after": {
                                domain: "http://purl.obolibrary.org/obo/BFO_0000003",
                                range: "http://purl.obolibrary.org/obo/BFO_0000003",
                                domainLabel: "BFO_0000003",
                                rangeLabel: "BFO_0000003",
                                domainParentProperty: "https://spec.industrialontologies.org/ontology/core/Core/after",
                                rangeParentProperty: "https://spec.industrialontologies.org/ontology/core/Core/after",
                                label: "after",
                                superProp: "http://purl.obolibrary.org/obo/BFO_0000062",
                            },
                        },
                        restrictions: {
                            "https://spec.industrialontologies.org/ontology/core/Core/functionOf": [
                                {
                                    domain: "https://spec.industrialontologies.org/ontology/core/Core/BusinessFunction",
                                    range: "https://spec.industrialontologies.org/ontology/core/Core/Organization",
                                    domainLabel: "business function",
                                    rangeLabel: "organization",
                                    constraintType: "http://www.w3.org/2002/07/owl#someValuesFrom",
                                    constraintTypeLabel: "someValuesFrom",
                                    blankNodeId: "nodeID://b1880679",
                                },
                            ],
                        },
                    },
                },
            },
            404: { description: "The source is unknown to the user, or has no graph to build a model from." },
        },
        tags: ["Ontology"],
    };

    return operations;
}
