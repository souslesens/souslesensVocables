import path from "path";
import { sourceModel } from "../../../model/sources.js";
import { userModel } from "../../../model/users.js";

import { responseSchema, successfullyFetched, successfullyCreated, fixBooleanInObject } from "./utils.js";
import userManager from "../../../bin/user.js";

export default function () {
    let operations = {
        GET,
        POST,
    };

    ///// GET api/v1/sources
    async function GET(req, res, _next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            let localSourceModel = sourceModel;

            let userSources;
            if (req.query.ownedOnly === "true") {
                userSources = await localSourceModel.getOwnedSources(userInfo.user);
            } else {
                userSources = await localSourceModel.getUserSources(userInfo.user);
            }

            res.status(200).json(successfullyFetched(userSources));
        } catch (err) {
            res.status(500).json({ message: err });
        }
    }
    GET.apiDoc = {
        summary: "List sources accessible to the current user",
        description:
            "Returns the sources the caller is allowed to read, computed from their profile (`allowedSourceSchemas` + `sourcesAccessControl`). " +
            "When `ownedOnly=true`, the result is restricted to sources where the caller is the `owner`. " +
            "Each source descriptor includes `graphUri`, `controller` (`Sparql_OWL` / `Sparql_SKOS`), `schemaType`, `imports`, etc. — " +
            "see the `Source` definition.",
        security: [{ restrictLoggedUser: [] }],
        operationId: "getUserSources",
        responses: {
            200: {
                description: "Accessible sources, indexed by source name.",
                schema: {
                    properties: {
                        message: { type: "string" },
                        resources: { $ref: "#/definitions/Sources" },
                    },
                },
                examples: {
                    "application/json": {
                        message: "resource successfully fetched",
                        resources: {
                            BFO: {
                                name: "BFO",
                                graphUri: "http://purl.obolibrary.org/obo/bfo.owl",
                                controller: "Sparql_OWL",
                                schemaType: "OWL",
                                group: "STANDARDS/TOP_ONTOLOGIES",
                                imports: [],
                            },
                            IOF_core: {
                                name: "IOF_core",
                                graphUri: "https://www.industrialontologies.org/core/",
                                controller: "Sparql_OWL",
                                schemaType: "OWL",
                                group: "STANDARDS/ABSTRACT ONTOLOGIES",
                                imports: ["BFO", "iof-av"],
                            },
                        },
                    },
                },
            },
            default: { description: "Server error.", schema: { additionalProperties: true } },
        },
        parameters: [
            { name: "ownedOnly", in: "query", type: "string", required: false, description: "If `true`, restrict the result to sources owned by the caller." },
            { name: "sourcesFile", in: "query", type: "string", required: false, description: "Optional override of the default sources file (admin debugging)." },
        ],
        tags: ["Sources"],
    };
    ///// POST api/v1/sources
    async function POST(req, res, next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            const userLogin = userInfo.user.login;
            const isAdmin = await userModel.isAdmin(userLogin);
            if (!isAdmin && !userInfo.allowSourceCreation) {
                res.status(401).json({ message: "Not allowed to create source" });
                return;
            }

            const userOwnedSources = await sourceModel.getOwnedSources(userInfo.user);
            if (!isAdmin && Object.keys(userOwnedSources).length >= userInfo.maxNumberCreatedSource) {
                res.status(401).json({ message: "Cannot create another source, the maximal limit was reached." });
                return;
            }

            let newSource = req.body;

            newSource = fixBooleanInObject(newSource);

            await Promise.all(
                Object.entries(newSource).map(async ([_key, value]) => {
                    // if user is not admin, set owner=me and published=false
                    if (!isAdmin) {
                        value.owner = userLogin;
                        value.published = false;
                    }
                    await sourceModel.addSource(value);
                }),
            );
            const sources = await sourceModel.getAllSources();
            res.status(200).json(successfullyCreated(sources));
        } catch (err) {
            res.status(err.status || 500).json(err);
            next(err);
        }
    }
    POST.apiDoc = {
        summary: "Create one or more sources for the current user",
        description:
            "Creates one or more source entries in `sources.json`. Body is an object whose values are full `Source` descriptors. " +
            "Non-admin callers must have `allowSourceCreation = true` (set on their profile) and stay below `maxNumberCreatedSource`. " +
            "For non-admins, server overrides `owner = caller.login` and `published = false`. Returns the refreshed full sources catalog.",
        security: [{ restrictLoggedUser: [] }],
        operationId: "createUserSources",
        parameters: [
            {
                in: "body",
                name: "body",
                required: false,
                description: "Map of `sourceName → Source descriptor`.",
                schema: {
                    type: "object",
                    additionalProperties: { $ref: "#/definitions/SourceCreate" },
                    example: {
                        my_new_ontology: {
                            name: "my_new_ontology",
                            _type: "source",
                            graphUri: "http://example.org/ontologies/my_new_ontology",
                            sparql_server: { url: "_default" },
                            controller: "Sparql_OWL",
                            schemaType: "OWL",
                            group: "DRAFTS",
                            imports: ["BFO"],
                            editable: true,
                            isDraft: true,
                            color: "#1f77b4",
                            predicates: { broaderPredicate: "", lang: "en" },
                        },
                    },
                },
                "x-examples": {
                    "Create a draft OWL source importing BFO": {
                        my_new_ontology: {
                            name: "my_new_ontology",
                            _type: "source",
                            graphUri: "http://example.org/ontologies/my_new_ontology",
                            sparql_server: { url: "_default" },
                            controller: "Sparql_OWL",
                            schemaType: "OWL",
                            group: "DRAFTS",
                            imports: ["BFO"],
                            editable: true,
                            isDraft: true,
                            color: "#1f77b4",
                            predicates: { broaderPredicate: "", lang: "en" },
                        },
                    },
                },
            },
        ],
        responses: {
            200: {
                description: "Sources created. Returns the full sources catalog.",
                schema: {
                    properties: {
                        message: { type: "string" },
                        resources: { $ref: "#/definitions/Sources" },
                    },
                },
            },
            401: { description: "User not allowed to create sources, or quota reached." },
            default: { description: "Server error.", schema: { additionalProperties: true } },
        },
        tags: ["Sources"],
    };

    return operations;
}
