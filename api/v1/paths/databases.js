import { databaseModel } from '../../../model/databases';
import { resourceFetched, responseSchema } from './utils';
import userManager from '../../../bin/user.';

module.exports = function () {
    let operations = { GET };

    // GET /api/v1/databases
    async function GET(req, res, next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            const databases = await databaseModel.getUserDatabasesName(userInfo.user);
            resourceFetched(res, databases);
        } catch (error) {
            res.status(error.status || 500).json(error);
            next(error);
        }
    }

    GET.apiDoc = {
        operationId: "getDatabasesName",
        responses: responseSchema("DatabaseNames", "GET"),
        security: [{ restrictLoggedUser: [] }],
        summary: "Returns all databases name",
        tags: ["Databases"],
    };

    return operations;
};
