import userManager from "../../../../../../bin/user.js";
import { publishVersion } from "../../../../../../bin/gitVersioning/gitVersioning.js";

export default function () {
    let operations = {
        POST,
    };

    async function POST(req, res, _next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            const publishedVersion = await publishVersion(userInfo.user, req.params.id, { token: req.body.token, userName: req.body.userName }, req.body.version, req.body.notes);
            res.status(200).json(publishedVersion);
        } catch (error) {
            res.status(error.status || 500).json({ message: error.message });
        }
    }

    POST.apiDoc = {
        summary: "Publish a version of a source in its git repository",
        description:
            "Commits `<source>/<source>.ttl` (sorted Turtle) and `<source>/<source>.source.json` on the main branch, " +
            "tags the commit `<source>/<version>` with `notes` as the message of the annotated tag, then writes `version` " +
            "as typed as `owl:versionInfo` of the graph. An existing version is refused. Requires `readwrite` access on the source.",
        security: [{ restrictLoggedUser: [], restrictVirtuosoLoad: [] }],
        operationId: "publishSourceGitVersion",
        parameters: [
            { in: "path", name: "id", type: "string", required: true, description: "Source name." },
            {
                in: "body",
                name: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["token", "version"],
                    properties: {
                        token: { type: "string", description: "Access token of the user on the git server." },
                        userName: { type: "string", description: "User name sent with the token, `oauth2` when absent; some git servers require the account user name." },
                        version: { type: "string", description: "Version name, any name git accepts in a tag.", example: "v2.0.0" },
                        notes: { type: "string", description: "Release notes." },
                    },
                },
            },
        ],
        responses: {
            200: {
                description: "Version pushed.",
                schema: {
                    properties: {
                        tagName: { type: "string" },
                        branch: { type: "string" },
                        commitId: { type: "string" },
                        warning: { type: "string", description: "Set when the version is pushed but owl:versionInfo could not be written in the graph." },
                    },
                },
            },
            400: { description: "No token, a source outside the platform's own triple store, an invalid version name, or the source is not linked to a repository." },
            403: { description: "The user does not have `readwrite` access to the source, or the git server refused the token or the user name given with it." },
            404: { description: "Source not found." },
            409: { description: "The version already exists." },
            500: { description: "Export or git error, the git server message is returned." },
        },
        tags: ["Sources"],
    };

    return operations;
}
