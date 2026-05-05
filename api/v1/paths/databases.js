import { databaseModel } from "../../../model/databases.js";
import { resourceFetched, responseSchema } from "./utils.js";
import userManager from "../../../bin/user.js";

export default function () {
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
        operationId: "getUserDatabaseNames",
        summary: "List databases (id + name only) accessible to the current user",
        description:
            "Lightweight variant of `GET /admin/databases`. Returns only `{ id, name }` per database the caller can use, " +
            "with no host/credentials. Used by MappingModeler's database picker.",
        responses: responseSchema("DatabaseNames", "GET"),
        security: [{ restrictLoggedUser: [] }],
        tags: ["Databases"],
    };

    return operations;
}
