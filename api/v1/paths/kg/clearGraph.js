import KGtripleBuilder from "../../../../bin/KGtripleBuilder.js";
import { processResponse } from "../utils.js";
import userManager from "../../../../bin/user.js";
import { sourceModel } from "../../../../model/sources.js";
import { tripleQuotaModel } from "../../../../model/tripleQuota.js";

export default function () {
    let operations = {
        POST,
    };

    async function POST(req, res, next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            if (!(await sourceModel.canWrite(userInfo.user, { graphUri: req.body.graphUri }))) {
                return res.status(403).json({ message: `You are not allowed to clear ${req.body.graphUri}.` });
            }

            KGtripleBuilder.clearGraph(req.body.graphUri, undefined, async function (err, result) {
                if (err) {
                    return processResponse(res, err, result);
                }
                /* The graph is empty, so every share recorded against it is void,
                 * whoever wrote them. */
                try {
                    await tripleQuotaModel.resetGraph(req.body.graphUri);
                } catch (quotaError) {
                    console.error("Could not clear the quota shares of the cleared graph", quotaError);
                }
                processResponse(res, err, result);
            });
        } catch (e) {
            res.status(e.status || 500).json(e);
            next(e);
        }
    }

    POST.apiDoc = {
        security: [{ restrictLoggedUser: [], restrictQuota: [] }],
        summary: "Drop all triples from a KG named graph",
        description:
            "Wipes the entire content of `graphUri` via `KGtripleBuilder.clearGraph` (SPARQL `CLEAR GRAPH`). " + "Used before a full KG rebuild; does not remove the source descriptor itself.",
        operationId: "kgClearGraph",
        parameters: [
            {
                name: "body",
                in: "body",
                required: false,
                schema: {
                    type: "object",
                    properties: {
                        graphUri: {
                            type: "string",
                            description: "Named graph URI to clear.",
                            example: "https://www.industrialontologies.org/core/",
                        },
                    },
                    example: { graphUri: "https://www.industrialontologies.org/core/" },
                },
                "x-examples": {
                    "Clear IOF_core graph": { graphUri: "https://www.industrialontologies.org/core/" },
                },
            },
        ],
        responses: {
            200: { description: "Graph cleared." },
            500: { description: "SPARQL CLEAR error." },
        },
        tags: ["KG"],
    };

    return operations;
}
