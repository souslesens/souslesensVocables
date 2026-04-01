import { scanApiDirectory } from "../../../model/apiRoutes.js";

export default function () {
    let operations = {
        GET,
    };

    async function GET(_req, res, _next) {
        try {
            const routesInfo = await scanApiDirectory({ includeMethods: true });
            routesInfo.sort((a, b) => a.route.localeCompare(b.route));
            res.status(200).json(routesInfo);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "An error occurs on the server" });
        }
    }

    GET.apiDoc = {
        summary: "Returns all API routes with their methods and quota restrictions",
        security: [{ restrictAdmin: [] }],
        operationId: "getRoutesInfo",
        parameters: [],
        responses: {
            200: {
                description: "List of API routes with methods and quota information",
                schema: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            route: {
                                type: "string",
                            },
                            methods: {
                                type: "array",
                                items: {
                                    type: "string",
                                },
                            },
                            quotas: {
                                type: "array",
                                items: {
                                    type: "string",
                                },
                            },
                        },
                    },
                },
            },
        },
        tags: ["Misc"],
    };

    return operations;
}
