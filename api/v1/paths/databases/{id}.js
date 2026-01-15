import { databaseModel } from '../../../../model/databases';
import { responseSchema } from '../utils';
import userManager from '../../../../bin/user.';

module.exports = function () {
    let operations = { GET };

    async function GET(req, res, _next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            const database = await databaseModel.getUserDatabaseMinimal(userInfo.user, req.params.id);
            if (!database) {
                res.status(404).json({ message: `database with id ${req.params.id} not found` });
                return;
            }
            res.status(200).json(database);
        } catch (error) {
            res.status(500).json({ message: error.message, status: error.cause });
        }
    }

    GET.apiDoc = {
        operationId: "getMinimalDatabase",
        responses: responseSchema("DatabaseMinimal", "GET"),
        security: [{ restrictLoggedUser: [] }],
        summary: "Returns the table without insecure information",
        tags: ["Databases"],
    };

    return operations;
};
