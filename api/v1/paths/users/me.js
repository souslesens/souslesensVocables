import { userModel } from "../../../../model/users.js";
import { mainConfigModel } from "../../../../model/mainConfig.js";

export default function () {
    let operations = {
        GET,
    };

    async function GET(req, res, _next) {
        try {
            const config = await mainConfigModel.getConfig();
            if (config.auth === "disabled") {
                res.status(200).json({
                    id: "0",
                    login: "admin",
                    groups: ["admin"],
                    allowSourceCreation: true,
                    maxNumberCreatedSource: 1000,
                });
                return;
            }
            const user = req.user;
            delete user.password;
            delete user.token;
            delete user.source;
            res.status(200).json(user);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "An error occurs on the server" });
        }
    }
    GET.apiDoc = {
        summary: "Return the public profile of the current user",
        description:
            "Returns the current user without any credential fields (`password`, `token`, `source` are stripped). " +
            'Special case: when `mainConfig.auth === "disabled"`, the endpoint returns a synthetic admin profile ' +
            '(`{ id: "0", login: "admin", groups: ["admin"], allowSourceCreation: true, maxNumberCreatedSource: 1000 }`).',
        security: [{ restrictLoggedUser: [] }],
        operationId: "getMe",
        // `GET /auth/whoami` looks like the natural identity route but carries no security block and
        // never reads the Authorization header, so a bearer-token client always gets logged:false.
        "x-mcp": {
            tools: [
                {
                    name: "sls_whoami",
                    access: "read",
                    description: "Identity and groups of the SLS account behind the bearer token of this session. Use it to explain to the user which rights are in play.",
                    params: {},
                },
            ],
        },
        parameters: [],
        responses: {
            200: {
                description: "Current user public profile.",
                schema: { $ref: "#/definitions/UserMe" },
                examples: {
                    "application/json": {
                        id: "42",
                        login: "alice",
                        groups: ["readers", "modelers"],
                        allowSourceCreation: true,
                        maxNumberCreatedSource: 5,
                    },
                },
            },
            500: { description: "Server error." },
        },
        tags: ["Users"],
    };

    return operations;
}
