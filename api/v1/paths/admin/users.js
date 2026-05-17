import { userModel } from "../../../../model/users.js";

import { sortObjectByKey, responseSchema, successfullyUpdated, successfullyCreated, successfullyFetched } from "../utils.js";

export default function () {
    ///// GET api/v1/admin/users
    async function GET(req, res, next) {
        try {
            const users = await userModel.getUserAccounts();
            res.status(200).json(successfullyFetched(sortObjectByKey(users)));
        } catch (error) {
            res.status(error.status || 500).json(error);
            next(error);
        }
    }
    GET.apiDoc = {
        summary: "List every user account (admin only)",
        description: "Admin-only. Returns the full user catalog from `users.json`, sorted by login. Includes hashed passwords and tokens.",
        security: [{ restrictAdmin: [] }],
        operationId: "adminGetAllUsers",
        parameters: [],
        responses: responseSchema("Users", "GET"),
        tags: ["Users"],
    };

    ///// PUT api/v1/users
    async function PUT(req, res, next) {
        try {
            await Promise.all(
                Object.entries(req.body).map(async function ([_key, value]) {
                    if ("password" in value && !value.password) {
                        return res.status(400).json({ message: "Password cannot be empty" });
                    }
                    await userModel.updateUserAccount(value);
                }),
            );
            const users = await userModel.getUserAccounts();
            res.status(200).json(successfullyUpdated(users));
        } catch (error) {
            res.status(error.status || 500).json(error);
            next(error);
        }
    }
    PUT.apiDoc = {
        summary: "Update one or more user accounts (admin only)",
        description:
            "Body is a map `userId → User`. Each entry is passed to `userModel.updateUserAccount`. " +
            "If a `password` field is present and empty, the request is rejected with `400 Password cannot be empty`. " +
            "Returns the refreshed user catalog.",
        security: [{ restrictAdmin: [] }],
        operationId: "adminUpdateUsers",
        parameters: [
            {
                in: "body",
                name: "body",
                required: true,
                schema: { type: "object", additionalProperties: { $ref: "#/definitions/User" } },
            },
        ],
        responses: responseSchema("Users", "PUT"),
        tags: ["Users"],
    };

    ///// POST api/v1/users
    async function POST(req, res, _next) {
        try {
            await Promise.all(
                Object.entries(req.body).map(async function ([_key, value]) {
                    if ("password" in value && !value.password) {
                        return res.status(400).json({ message: "Password cannot be empty" });
                    }
                    userModel.addUserAccount(value);
                }),
            );
            const users = await userModel.getUserAccounts();
            res.status(200).json(successfullyCreated(users));
        } catch (error) {
            res.status(403).json({ message: error.toString() });
        }
    }
    POST.apiDoc = {
        summary: "Create one or more user accounts (admin only)",
        description: "Body is a map `userId → User`. Each entry is added via `userModel.addUserAccount`. " + "Empty `password` is rejected with `400`. Returns the refreshed user catalog.",
        security: [{ restrictAdmin: [] }],
        operationId: "adminCreateUsers",
        parameters: [
            {
                in: "body",
                name: "body",
                required: true,
                schema: { type: "object", additionalProperties: { $ref: "#/definitions/User" } },
                "x-examples": {
                    "Add user alice": {
                        alice: {
                            id: "alice",
                            login: "alice",
                            password: "<hashed>",
                            groups: ["modelers"],
                            _type: "user",
                        },
                    },
                },
            },
        ],
        responses: responseSchema("Users", "POST"),
        tags: ["Users"],
    };

    return {
        GET,
        POST,
        PUT,
    };
}
