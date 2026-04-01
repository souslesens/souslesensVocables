import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "@babel/parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiPathsDir = path.resolve(__dirname, "../api/v1/paths");

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

const scanApiDirectory = async (options = {}) => {
    const { includeMethods = false } = options;
    const results = [];

    const scanDirectory = async (dir, relativePath = "") => {
        const files = fs.readdirSync(dir);

        for (const file of files) {
            const filePath = path.join(dir, file);

            if (!isValidPath(apiPathsDir, filePath)) {
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
                        results.push({
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
    };

    await scanDirectory(apiPathsDir);

    if (includeMethods) {
        return results;
    }

    const routesWithQuotas = {};
    for (const { route, quotas } of results) {
        if (quotas.length > 0) {
            routesWithQuotas[route] = quotas;
        }
    }
    return routesWithQuotas;
};

const getApiRoutesWithQuotas = async () => {
    const routesInfo = await scanApiDirectory({ includeMethods: true });
    const routesWithQuotas = {};

    for (const { route, quotas } of routesInfo) {
        if (quotas.length > 0) {
            routesWithQuotas[route] = quotas;
        }
    }

    return routesWithQuotas;
};

export { isValidPath, extractMethodsFromAST, scanApiDirectory, getApiRoutesWithQuotas };
