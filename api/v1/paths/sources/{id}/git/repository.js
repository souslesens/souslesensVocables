import userManager from "../../../../../../bin/user.js";
import { openRepository } from "../../../../../../bin/gitVersioning/gitVersioning.js";

export default function () {
    let operations = {
        POST,
    };

    async function POST(req, res, _next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            const repositoryState = await openRepository(userInfo.user, req.params.id, { token: req.body.token, userName: req.body.userName }, req.body.url);
            res.status(200).json(repositoryState);
        } catch (error) {
            res.status(error.status || 500).json({ message: error.message });
        }
    }

    POST.apiDoc = {
        summary: "Check the git repository of a source, or link the source to a new one",
        description:
            "Checks that `token` can read and write the repository (a dry-run push writes nothing), then lists what it holds of the source: " +
            "its main branch, the versions (tags `<source>/<version>`) and the branches (`<source>/<branch>`). " +
            "With `url`, the source is linked to that repository in `sources.json` once the check passes; without it, the repository already linked is read. " +
            "The token is used for this request only and never stored. Requires `readwrite` access on the source.",
        security: [{ restrictLoggedUser: [] }],
        operationId: "openSourceGitRepository",
        parameters: [
            { in: "path", name: "id", type: "string", required: true, description: "Source name. Example: `ISO_15926-part-14_PCA`." },
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
                        url: { type: "string", description: "HTTPS URL of the repository to link the source to.", example: "https://gitlab.com/my-team/ontologies.git" },
                    },
                },
            },
        ],
        responses: {
            200: {
                description: "Repository readable and writable with the token.",
                schema: {
                    properties: {
                        repositoryUrl: { type: "string" },
                        mainBranch: { type: "string" },
                        isMainBranchCreated: { type: "boolean", description: "False on an empty repository." },
                        versions: { type: "array", items: { type: "string" } },
                        branches: { type: "array", items: { type: "string" } },
                    },
                },
            },
            400: { description: "No token, a source outside the platform's own triple store, no HTTPS URL, or a source not linked yet." },
            403: { description: "The user does not have `readwrite` access to the source, or the git server refused the token or the user name given with it." },
            404: { description: "Source not found." },
            500: { description: "The git server refused the repository or the push, its message is returned." },
        },
        tags: ["Sources"],
    };

    return operations;
}
