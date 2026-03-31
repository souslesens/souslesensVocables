import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "@babel/parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isValidPath = (baseDir, filePath) => {
    const resolvedPath = path.resolve(filePath);
    const resolvedBase = path.resolve(baseDir);
    return resolvedPath.startsWith(resolvedBase + path.sep) || resolvedPath === resolvedBase;
};

const extractMethodsFromAST = (ast) => {
    const methods = [];
    const quotas = [];
    const httpMethods = ["GET", "POST", "PUT", "DELETE", "PATCH"];

    let defaultFunctionBody = null;
    for (const node of ast.program.body) {
        if (node.type === "ExportDefaultDeclaration" && node.declaration?.type === "FunctionDeclaration") {
            defaultFunctionBody = node.declaration.body?.body;
            break;
        }
    }

    if (!defaultFunctionBody) return { methods, quotas };

    for (const node of defaultFunctionBody) {
        if (node.type === "FunctionDeclaration" && httpMethods.includes(node.id.name)) {
            const methodName = node.id.name;
            methods.push(methodName);

            for (const sibling of defaultFunctionBody) {
                if (
                    sibling.type === "ExpressionStatement" &&
                    sibling.expression.type === "AssignmentExpression" &&
                    sibling.expression.left.type === "MemberExpression" &&
                    sibling.expression.left.object?.name === methodName &&
                    sibling.expression.left.property?.name === "apiDoc"
                ) {
                    const apiDoc = sibling.expression.right;
                    if (apiDoc.type === "ObjectExpression") {
                        for (const prop of apiDoc.properties) {
                            if (prop.key?.name === "security" && prop.value?.type === "ArrayExpression") {
                                for (const secItem of prop.value.elements) {
                                    if (secItem?.type === "ObjectExpression" && secItem.properties.some((p) => p.key?.name === "restrictQuota")) {
                                        quotas.push(methodName);
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    break;
                }
            }
        }
    }

    return { methods, quotas };
};

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

                    if (!isValidPath(__dirname, filePath)) {
                        console.warn(`Skipping file outside base directory: ${filePath}`);
                        continue;
                    }

                    const stat = fs.statSync(filePath);

                    if (stat.isDirectory()) {
                        await scanDirectory(filePath, path.join(relativePath, file));
                    } else if (file.endsWith(".js") && file !== "routesinfo.js") {
                        const relativeFilePath = path.join(relativePath, file);
                        const routePath = "/" + relativeFilePath.replace(/\\/g, "/").replace(/\.js$/, "");

                        try {
                            const fileContent = fs.readFileSync(filePath, "utf-8");
                            const ast = parse(fileContent, {
                                sourceType: "module",
                                plugins: ["jsx"],
                            });

                            const { methods, quotas } = extractMethodsFromAST(ast);

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
