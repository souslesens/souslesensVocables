const { userModel } = require("../../../model/users");
const { sortObjectByKey, responseSchema, successfullyUpdated, successfullyCreated, successfullyFetched } = require("./utils");

module.exports = function () {
    let operations = {
        GET,
        POST,
        PUT,
    };

    ///// GET api/v1/users
    async function GET(req, res, next) {
        try {
            const users = await userModel.getUserAccounts();
            res.status(200).json(successfullyFetched(sortObjectByKey(users)));
        } catch (error) {
            next(error);
        }
    }
    GET.apiDoc = {
        summary: "Return a list of all User Accounts",
        security: [{ restrictAdmin: [] }],
        operationId: "getAllUsers",
        parameters: [],
        responses: responseSchema("Users", "GET"),
    };

    ///// PUT api/v1/users
    async function PUT(req, res, next) {
        try {
            await Promise.all(
                Object.entries(req.body).map(async function ([_key, value]) {
                    delete value.password;
                    await userModel.updateUserAccount(value);
                })
            );
            const users = await userModel.getUserAccounts();
            res.status(200).json(successfullyUpdated(users));
        } catch (error) {
            next(error);
        }
    }
    PUT.apiDoc = {
        summary: "Update a User Account",
        security: [{ restrictAdmin: [] }],
        operationId: "updateUsers",
        parameters: [],
        responses: responseSchema("Users", "PUT"),
    };

    ///// POST api/v1/users
    async function POST(req, res, next) {
        try {
            await Promise.all(
                Object.entries(req.body).map(async function ([_key, value]) {
                    await userModel.addUserAccount(value); // XXX what about password ?
                })
            );
            const users = await userModel.getUserAccounts();
            res.status(200).json(successfullyCreated(users));
        } catch (error) {
            next(error);
        }
    }
    POST.apiDoc = {
        summary: "Create a new user",
        security: [{ restrictAdmin: [] }],
        operationId: "createUser",
        parameters: [
            // {
            //     in: 'body',
            //     name: "user",
            //     type: 'object',
            //     required: true
            // }
        ],

        responses: responseSchema("Users", "POST"),
    };

    return operations;
};
