import path from "path";
import fsSync from "fs";
import fs from "fs/promises";

export default function () {
    let operations = {
        POST,
    };

    async function POST(req, res, next) {
        try {
            const outputPath = path.join("data/CSV", req.body.path);
            for (const file of Object.values(req.files)) {
                const filePath = path.join(outputPath, file.name);
                if (!filePath.startsWith("data/CSV/") && !filePath.startsWith("data\\CSV\\")) {
                    return res.status(403).json({ done: false, message: "forbidden path" });
                }
                if (!fsSync.existsSync(outputPath)) {
                    await fs.mkdir(outputPath);
                }
                console.log(filePath);
                await file.mv(filePath);
                return res.status(201).json({ done: true });
            }
        } catch (err) {
            next(err);
            return res.status(500).json({ done: false });
        }
    }
    POST.apiDoc = {
        summary: "Upload files",
        security: [{ restrictLoggedUser: [] }],
        operationId: "upload",
        parameters: [],
        responses: {
            200: {
                description: "Response",
                schema: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            user: {
                                type: "string",
                            },
                            tool: {
                                type: "string",
                            },
                            timestamp: {
                                type: "string",
                            },
                        },
                    },
                },
            },
        },
        tags: ["Data"],
    };

    return operations;
}
