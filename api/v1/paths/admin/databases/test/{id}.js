import { databaseModel } from "../../../../../../model/databases.js";

export default function () {
    let operations = { GET };

    async function GET(req, res, _next) {
        try {
            const connection = await databaseModel.getAdminRestrictedConnection(req.params.id);
            await databaseModel.query(connection, "SELECT 1");
            res.status(200).json({ message: "The remote database server is running" });
        } catch (err) {
            if (err.code === "EHOSTUNREACH") {
                res.status(403).json({ message: err.message });
            } else {
                res.status(500).json({ message: err.message });
            }
        }
    }

    GET.apiDoc = {
        operationId: "adminTestDatabase",
        summary: "Probe the connection to a configured database (admin only)",
        description:
            "Opens an admin-restricted connection (`databaseModel.getAdminRestrictedConnection`) and runs `SELECT 1`. " +
            "Returns `200` if the round-trip succeeds, `403` if the host is unreachable (`EHOSTUNREACH`), `500` otherwise.",
        parameters: [{ in: "path", name: "id", type: "string", required: true, description: "Database id to test." }],
        responses: {
            200: {
                description: "Connection OK.",
                schema: { properties: { message: { type: "string" } } },
                examples: { "application/json": { message: "The remote database server is running" } },
            },
            403: { description: "Host unreachable." },
            500: { description: "Connection or auth failure." },
        },
        security: [{ restrictAdmin: [] }],
        tags: ["Databases"],
    };

    return operations;
}
