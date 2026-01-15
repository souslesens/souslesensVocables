import { userModel } from '../../../../model/users.js';

import {
    sortObjectByKey,
    responseSchema,
    successfullyUpdated,
    successfullyCreated,
    successfullyFetched,
} from '../utils.js';

module.exports = function () {
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
        summary: "Return a list of all User Accounts",
        security: [{ restrictAdmin: [] }],
        operationId: "getAllUsers",
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
        summary: "Update a User Account",
        security: [{ restrictAdmin: [] }],
        operationId: "updateUsers",
        parameters: [],
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
        summary: "Create a new user",
        security: [{ restrictAdmin: [] }],
        operationId: "createUser",
        parameters: [],
        responses: responseSchema("Users", "POST"),
        tags: ["Users"],
    };

    return {
        GET,
        POST,
        PUT,
    };
};
