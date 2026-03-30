import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function () {
    let operations = {
        GET,
    };

    async function GET(_req, res, _next) {
        try {
            const routesInfo = [];

            async function scanDirectory(dir, relativePath = "") {
                const files = fs.readdirSync(dir);

                for (const file of files) {
                    const filePath = path.join(dir, file);
                    const stat = fs.statSync(filePath);

                    if (stat.isDirectory()) {
                        await scanDirectory(filePath, path.join(relativePath, file));
                    } else if (file.endsWith(".js") && file !== "routesinfo.js") {
                        const relativeFilePath = path.join(relativePath, file);
                        const routePath = "/" + relativeFilePath.replace(/\\/g, "/").replace(/\.js$/, "");

                        try {
                            const module = await import(filePath);
                            const operations = module.default();

                            const methods = [];
                            const quotas = [];

                            const httpMethods = ["GET", "POST", "PUT", "DELETE", "PATCH"];

                            for (const method of httpMethods) {
                                const operation = operations[method];
                                if (operation && operation.apiDoc) {
                                    methods.push(method);

                                    const security = operation.apiDoc.security;
                                    if (security && Array.isArray(security)) {
                                        for (const securityEntry of security) {
                                            if (securityEntry && typeof securityEntry === "object" && "restrictQuota" in securityEntry) {
                                                quotas.push(method);
                                                break;
                                            }
                                        }
                                    }
                                }
                            }

                            if (methods.length > 0) {
                                routesInfo.push({
                                    route: "/api/v1" + routePath,
                                    methods: methods,
                                    quotas: quotas,
                                });
                            }
                        } catch (error) {
                            console.error(`Error processing ${filePath}: ${error.message}`);
                        }
                    }
                }
            }

            await scanDirectory(__dirname);

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
