import path from "path";
import { sourceModel } from "../../../../model/sources.js";
import { userModel } from "../../../../model/users.js";
import { responseSchema } from "./../utils.js";
import userManager from "../../../../bin/user.js";
import { successfullyFetched, successfullyCreated, fixBooleanInObject } from "./../utils.js";
export default function () {
    let operations = {
        GET,
        POST,
    };

    ///// GET api/v1/sources
    async function GET(req, res, next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            let localSourceModel = sourceModel;

            const userSources = await localSourceModel.getUserSources(userInfo.user);
            res.status(200).json(successfullyFetched(userSources));
        } catch (err) {
            res.status(err.status || 500).json(err);
            next(err);
        }
    }
    GET.apiDoc = {
        summary: "List every source visible to the caller (admin endpoint)",
        description:
            "Admin variant of `GET /sources`: returns the full list of sources accessible to the caller (`getUserSources`). " +
            "For an actual admin user, this corresponds to all sources defined in `sources.json`.",
        security: [{ restrictAdmin: [] }],
        operationId: "adminGetSources",
        responses: responseSchema("Sources", "GET"),
        parameters: [
            { name: "sourcesFile", in: "query", type: "string", required: false, description: "Optional override of the default sources file." },
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
        summary: "Create one or more sources (admin endpoint)",
        description:
            "Admin variant of `POST /sources` without quota enforcement. Body is a map `sourceName → Source descriptor`. " +
            "Returns the full sources catalog after insertion.",
        security: [{ restrictAdmin: [] }],
        operationId: "adminCreateSources",
        parameters: [
            {
                in: "body",
                name: "body",
                required: true,
                schema: { type: "object", additionalProperties: { $ref: "#/definitions/SourceCreate" } },
                "x-examples": {
                    "Add IOF_core": {
                        IOF_core: {
                            name: "IOF_core",
                            graphUri: "https://www.industrialontologies.org/core/",
                            sparql_server: { url: "_default" },
                            controller: "Sparql_OWL",
                            schemaType: "OWL",
                            group: "STANDARDS/ABSTRACT ONTOLOGIES",
                            imports: ["BFO", "iof-av"],
                            editable: false,
                        },
                    },
                },
            },
        ],
        responses: responseSchema("Sources", "POST"),
        tags: ["Sources"],
    };

    return operations;
}
