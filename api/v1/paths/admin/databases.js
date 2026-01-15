import { databaseModel } from '../../../../model/databases.js';
import { resourceFetched, responseSchema } from '../utils.js';

export default function () {
    let operations = { GET, POST };

    // GET /api/v1/databases
    async function GET(req, res, next) {
        try {
            const databases = await databaseModel.getAllDatabases();
            resourceFetched(res, databases);
        } catch (error) {
            res.status(error.status || 500).json(error);
            next(error);
        }
    }

    GET.apiDoc = {
        operationId: "getDatabases",
        responses: responseSchema("Databases", "GET"),
        security: [{ restrictAdmin: [] }],
        summary: "Returns all the databases from the configuration",
        tags: ["Databases"],
    };

    // POST /api/v1/databases
    async function POST(req, res, next) {
        if (!req.body.database) {
            res.status(400).json({
                message: "The database object is missing from this request",
            });
        } else {
            try {
                await databaseModel.addDatabase(req.body.database);

                const databases = await databaseModel.getAllDatabases();
                resourceFetched(res, databases);
            } catch (error) {
                res.status(error.status || 500).json(error);
                next(error);
            }
        }
    }

    POST.apiDoc = {
        operationId: "addDatabase",
        responses: responseSchema("Databases", "POST"),
        security: [{ restrictAdmin: [] }],
        summary: "Add a new database in the configuration",
        tags: ["Databases"],
    };

    return operations;
};
