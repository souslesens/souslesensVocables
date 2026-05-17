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
        summary: "Upload one or more CSV files into `data/CSV/<path>`",
        description:
            "Multipart upload. Each file in `req.files` is moved under `data/CSV/<path>/<file.name>`. " +
            "Paths escaping `data/CSV/` are rejected with `403 forbidden path`. The target directory is created on demand. " +
            "Returns `201 { done: true }` on success.",
        security: [{ restrictLoggedUser: [] }],
        operationId: "uploadCsvFiles",
        consumes: ["multipart/form-data"],
        parameters: [
            { name: "path", in: "formData", required: true, type: "string", description: "Sub-path under `data/CSV/`. Example: `maintenance`." },
            { name: "files", in: "formData", required: true, type: "file", description: "One or more CSV files to upload." },
        ],
        responses: {
            201: {
                description: "Files uploaded.",
                schema: { properties: { done: { type: "boolean" } } },
                examples: { "application/json": { done: true } },
            },
            403: {
                description: "Forbidden path (directory traversal attempt).",
                schema: { properties: { done: { type: "boolean" }, message: { type: "string" } } },
            },
            500: { description: "Upload error." },
        },
        tags: ["Data"],
    };

    return operations;
}
