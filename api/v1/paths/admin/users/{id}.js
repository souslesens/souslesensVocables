import fs from 'fs';
import { userModel } from '../../../../../model/users.js';

module.exports = function () {
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
        summary: "Returns a specific user",
        security: [{ restrictAdmin: [] }],
        operationId: "getOneUser",
        parameters: [],
        responses: {
            200: {
                description: "User",
                schema: {
                    $ref: "#/definitions/User",
                },
            },
        },
        tags: ["Users"],
    };

    async function DELETE(req, res, next) {
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
        summary: "Delete a specific user",
        security: [{ restrictAdmin: [] }],
        operationId: "DeleteOneUser",
        parameters: [],
        responses: {
            200: {
                description: "Users",
                schema: {
                    $ref: "#/definitions/User",
                },
            },
        },
        tags: ["Users"],
    };

    return operations;
};
