import { successfullyFetched } from './utils.js';
import { profileModel } from '../../../model/profiles.js';
import userManager from '../../../bin/user.js';

module.exports = function () {
    let operations = {
        GET,
    };

    async function GET(req, res, next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            const userTools = await profileModel.getUserTools(userInfo.user);
            res.status(200).json(successfullyFetched(userTools));
        } catch (err) {
            console.log(err);
            next(err);
        }
    }
    GET.apiDoc = {
        summary: "Returns user tools",
        security: [{ restrictLoggedUser: [] }],
        operationId: "getTools",
        responses: {
            200: {
                description: "",
                schema: {
                    properties: {
                        message: { type: "string" },
                        resources: {
                            type: "array",
                        },
                    },
                },
            },
        },
        tags: ["Tools"],
    };
    return operations;
};
