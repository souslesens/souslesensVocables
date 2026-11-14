import userManager from "../../../../../../bin/user.js";
import { pushBranch } from "../../../../../../bin/gitVersioning/gitVersioning.js";

export default function () {
    const branchBodyParameter = {
        in: "body",
        name: "body",
        required: true,
        schema: {
            type: "object",
            required: ["token", "branch", "message"],
            properties: {
                token: { type: "string", description: "Access token of the user on the git server." },
                userName: { type: "string", description: "User name sent with the token, `oauth2` when absent; some git servers require the account user name." },
                branch: { type: "string", description: "Branch name without the source folder.", example: "pump-classes" },
                message: { type: "string", minLength: 1, description: "Commit message." },
            },
        },
    };
    const branchResponseSchema = { properties: { branch: { type: "string" }, commitId: { type: "string", description: "Null when nothing changed." } } };

    let operations = {
        POST,
        PUT,
    };

    async function POST(req, res, _next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            const createdBranch = await pushBranch(userInfo.user, req.params.id, { token: req.body.token, userName: req.body.userName }, req.body.branch, req.body.message, false);
            res.status(200).json(createdBranch);
        } catch (error) {
            res.status(error.status || 500).json({ message: error.message });
        }
    }

    async function PUT(req, res, _next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            const updatedBranch = await pushBranch(userInfo.user, req.params.id, { token: req.body.token, userName: req.body.userName }, req.body.branch, req.body.message, true);
            res.status(200).json(updatedBranch);
        } catch (error) {
            res.status(error.status || 500).json({ message: error.message });
        }
    }

    POST.apiDoc = {
        summary: "Create a git branch holding the source as SLS holds it",
        description: "Creates `<source>/<branch>` from the main branch of the repository and commits the source files on it. An existing branch is refused. Requires `readwrite` access on the source.",
        security: [{ restrictLoggedUser: [], restrictVirtuosoLoad: [] }],
        operationId: "createSourceGitBranch",
        parameters: [{ in: "path", name: "id", type: "string", required: true, description: "Source name." }, branchBodyParameter],
        responses: {
            200: { description: "Branch pushed.", schema: branchResponseSchema },
            400: { description: "No token, a source outside the platform's own triple store, an invalid branch name, or the source is not linked to a repository." },
            403: { description: "The user does not have `readwrite` access to the source, or the git server refused the token or the user name given with it." },
            404: { description: "Source not found." },
            409: { description: "The branch already exists." },
            500: { description: "Export or git error, the git server message is returned." },
        },
        tags: ["Sources"],
    };

    PUT.apiDoc = {
        summary: "Commit the source as SLS holds it on an existing git branch",
        description:
            "Clones `<source>/<branch>` at request time and commits the source files on it. Nothing is pushed when the branch already holds them. " +
            "A push refused because the branch moved meanwhile is retried once on a fresh clone. Requires `readwrite` access on the source.",
        security: [{ restrictLoggedUser: [], restrictVirtuosoLoad: [] }],
        operationId: "updateSourceGitBranch",
        parameters: [{ in: "path", name: "id", type: "string", required: true, description: "Source name." }, branchBodyParameter],
        responses: {
            200: { description: "Branch updated, or already up to date.", schema: branchResponseSchema },
            400: { description: "No token, a source outside the platform's own triple store, an invalid branch name, or the source is not linked to a repository." },
            403: { description: "The user does not have `readwrite` access to the source, or the git server refused the token or the user name given with it." },
            404: { description: "Source not found, or the branch no longer exists." },
            500: { description: "Export or git error, the git server message is returned." },
        },
        tags: ["Sources"],
    };

    return operations;
}
