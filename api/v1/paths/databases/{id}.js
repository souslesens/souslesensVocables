import { databaseModel } from "../../../../model/databases.js";
import { responseSchema } from "../utils.js";
import userManager from "../../../../bin/user.js";

export default function () {
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
        operationId: "getUserDatabaseMinimal",
        summary: "Get a database descriptor stripped of credentials",
        description:
            "Returns `id`, `name`, `driver`, `database` for the database `id` the caller is allowed to use. " +
            "Sensitive fields (`host`, `port`, `user`, `password`) are redacted (`databaseModel.getUserDatabaseMinimal`).",
        parameters: [{ in: "path", name: "id", type: "string", required: true, description: "Database id." }],
        responses: {
            200: { description: "Minimal database descriptor.", schema: { $ref: "#/definitions/DatabaseMinimal" } },
            404: { description: "Database not found or not accessible." },
            500: { description: "Server error." },
        },
        security: [{ restrictLoggedUser: [] }],
        tags: ["Databases"],
    };

    return operations;
}
