import { findUserSource } from "../../../../../bin/AI/ontologyFromDb/ontology/ontologyRuns.js";
import { judgeImplicitObject } from "../../../../../bin/AI/aiMappingModeler/columnRestrictionSuggestion.js";

export default function () {
    let operations = {
        POST,
    };

    async function POST(req, res, _next) {
        try {
            const found = await findUserSource(req, req.body.source);
            if (found.error) {
                return res.status(found.status).json({ error: found.error });
            }
            // a judgement that ended, by a change of table for instance, cuts the connection: no one reads its answer
            const abortController = new AbortController();
            res.on("close", function () {
                if (!res.writableEnded) {
                    abortController.abort();
                }
            });
            const result = await judgeImplicitObject(req.body.judgementId, abortController.signal, found.userInfo);
            if (abortController.signal.aborted) {
                return;
            }
            if (result.error) {
                return res.status(result.status).json({ error: result.error });
            }
            res.status(200).json(result);
        } catch (error) {
            console.error(error);
            // the status of the provider stays out: its 401 would tell the browser that its own session expired
            res.status(502).json({ error: error.message });
        }
    }

    POST.apiDoc = {
        security: [{ restrictQuota: [], restrictAdmin: [] }],
        summary: "Judge the implicit objects that the restriction suggestion of a column proposed",
        description:
            "Called by the AI Mapping Modeler after a restriction suggestion answered an implicitJudgementId: some of its samples proposed an implicit object, such as a process no column identifies. " +
            "A model with a longer reasoning, in the same conversation, keeps the one that is legitimate or refuses them all, and says why. A judgement is asked once, by the user who got it, within 2 minutes. Writes nothing.",
        operationId: "judgeAiMappingModelerImplicitObject",
        parameters: [
            {
                name: "body",
                in: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["source", "judgementId"],
                    properties: {
                        source: { type: "string" },
                        judgementId: { type: "string", description: "the implicitJudgementId of the restriction suggestion" },
                    },
                },
            },
        ],
        responses: {
            200: { description: "{ implicitObject: { column, classSuggestion, restrictions, reason } or null, judgementMilliseconds }" },
            404: { description: "The source is unknown to the user, or the judgement is unknown, already asked or expired." },
            502: { description: "The model failed." },
        },
        tags: ["AI"],
    };

    return operations;
}
