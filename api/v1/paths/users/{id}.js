import { userModel } from "../../../../model/users.js";

export default function () {
    let operations = {
        GET,
        DELETE,
    };

    async function GET(req, res, _next) {
        try {
            const userId = req.params.id;
            const user = await userModel.getUserAccount(userId);
            if (user !== undefined) {
                res.status(200).json(user);
            } else {
                res.status(404).json({ message: `User ${userId} not found` });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "An error occurs on the server" });
        }
    }
    GET.apiDoc = {
        summary: "Get a user account by id (admin only)",
        description: "Admin endpoint: returns the full `User` record (including hashed password and token).",
        security: [{ restrictAdmin: [] }],
        operationId: "getOneUser",
        parameters: [{ in: "path", name: "id", type: "string", required: true, description: "User id (login)." }],
        responses: {
            200: { description: "User record.", schema: { $ref: "#/definitions/User" } },
            404: { description: "User not found." },
            500: { description: "Server error." },
        },
        tags: ["Users"],
    };

    async function DELETE(req, res, _next) {
        try {
            const userId = req.params.id;
            const wasDeleted = await userModel.deleteUserAccount(userId);
            if (wasDeleted) {
                const users = await userModel.getUserAccounts();
                res.status(200).json({
                    message: `${req.params.id} successfully deleted`,
                    resources: users,
                });
            } else {
                res.status(404).json({ message: `User ${userId} not found` });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "An error occurs on the server" });
        }
    }
    DELETE.apiDoc = {
        summary: "Delete a user account (admin only)",
        description: "Removes user `id` and returns the refreshed user catalog.",
        security: [{ restrictAdmin: [] }],
        operationId: "deleteOneUser",
        parameters: [{ in: "path", name: "id", type: "string", required: true, description: "User id (login) to delete." }],
        responses: {
            200: {
                description: "User deleted.",
                schema: {
                    properties: {
                        message: { type: "string" },
                        resources: { $ref: "#/definitions/Users" },
                    },
                },
            },
            404: { description: "User not found." },
            500: { description: "Server error." },
        },
        tags: ["Users"],
    };

    return operations;
}
