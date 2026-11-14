import userManager from "../../../../../../bin/user.js";
import { previewChanges } from "../../../../../../bin/gitVersioning/gitVersioning.js";

export default function () {
    let operations = {
        POST,
    };

    async function POST(req, res, _next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            const preview = await previewChanges(userInfo.user, req.params.id, { token: req.body.token, userName: req.body.userName }, req.body.branch);
            res.status(200).json(preview);
        } catch (error) {
            res.status(error.status || 500).json({ message: error.message });
        }
    }

    POST.apiDoc = {
        summary: "Compare the source in SLS with a branch of its git repository",
        description:
            "Exports the source as SLS holds it and compares its triples with the file `<source>/<source>.ttl` of `branch`, " +
            "or of the main branch when `branch` is absent. The branch is cloned at request time, so the comparison is against its latest state. " +
            "Returns the counts and the first changed triples. Requires `readwrite` access on the source.",
        security: [{ restrictLoggedUser: [], restrictVirtuosoLoad: [] }],
        operationId: "previewSourceGitChanges",
        parameters: [
            { in: "path", name: "id", type: "string", required: true, description: "Source name." },
            {
                in: "body",
                name: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["token"],
                    properties: {
                        token: { type: "string", description: "Access token of the user on the git server." },
                        userName: { type: "string", description: "User name sent with the token, `oauth2` when absent; some git servers require the account user name." },
                        branch: { type: "string", description: "Branch name without the source folder. Example: `pump-classes` for `<source>/pump-classes`." },
                    },
                },
            },
        ],
        responses: {
            200: {
                description: "Changes of SLS against the branch.",
                schema: {
                    properties: {
                        comparedBranch: { type: "string", description: "Null on an empty repository." },
                        branchTripleCount: { type: "integer" },
                        sourceTripleCount: { type: "integer" },
                        addedCount: { type: "integer" },
                        removedCount: { type: "integer" },
                        previewLines: { type: "array", items: { type: "string" }, description: "First changed triples, `+ ` added in SLS, `- ` absent from SLS." },
                    },
                },
            },
            400: { description: "No token, a source outside the platform's own triple store, or the source is not linked to a repository." },
            403: { description: "The user does not have `readwrite` access to the source, or the git server refused the token or the user name given with it." },
            404: { description: "Source or branch not found." },
            500: { description: "Export or git error, its message is returned." },
        },
        tags: ["Sources"],
    };

    return operations;
}
