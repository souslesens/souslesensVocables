import path from "path";
import fsSync from "fs";
import fs from "fs/promises";
import { ulid } from "ulid";
import os from "node:os";
import { sanitizeFileName } from "./utils.js";

const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB
const UPLOAD_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const activeUploads = new Map();

function cleanupExpiredUploads() {
    const now = Date.now();
    for (const [uploadId, uploadInfo] of activeUploads.entries()) {
        if (now - uploadInfo.lastActivity > UPLOAD_TIMEOUT) {
            cleanupUpload(uploadId);
        }
    }
}

async function cleanupUpload(uploadId, reason = "timeout") {
    const uploadInfo = activeUploads.get(uploadId);
    if (!uploadInfo) return;

    try {
        if (uploadInfo.tempDir && fsSync.existsSync(uploadInfo.tempDir)) {
            await fs.rm(uploadInfo.tempDir, { recursive: true, force: true });
        }
        console.log(`[UPLOAD] Cleanup upload session: uploadId=${uploadId}, reason=${reason}`);
    } catch (error) {
        console.error(`[UPLOAD ERROR] Error cleaning up upload ${uploadId}:`, error);
    }

    activeUploads.delete(uploadId);
}

export default function () {
    let operations = {
        POST,
        DELETE,
        GET,
    };

    async function POST(req, res, next) {
        try {
            const isChunked = req.body.chunked === "true";

            if (!isChunked) {
                const outputPath = path.join("data/CSV", req.body.path);
                for (const file of Object.values(req.files)) {
                    const sanitizedFileName = sanitizeFileName(file.name);
                    const filePath = path.join(outputPath, sanitizedFileName);
                    if (!filePath.startsWith("data/CSV/") && !filePath.startsWith("data\\CSV\\")) {
                        return res.status(403).json({ done: false, message: "forbidden path" });
                    }
                    if (!fsSync.existsSync(outputPath)) {
                        await fs.mkdir(outputPath, { recursive: true });
                    }
                    console.log(`[UPLOAD] Legacy upload: ${filePath}`);
                    await file.mv(filePath);
                }
                return res.status(201).json({ done: true });
            }

            const uploadId = req.body.uploadId;
            const chunkIndex = parseInt(req.body.chunkIndex, 10);
            const totalChunks = parseInt(req.body.totalChunks, 10);
            const filename = req.body.filename ? sanitizeFileName(req.body.filename) : req.body.filename;
            const outputPath = path.join("data/CSV", req.body.path);
            const isLastChunk = req.body.last === "true";

            if (!uploadId || chunkIndex === undefined || !filename) {
                return res.status(400).json({ done: false, message: "Missing required parameters: uploadId, chunkIndex, filename" });
            }

            const file = req.files.chunk;
            if (!file) {
                return res.status(400).json({ done: false, message: "No chunk file uploaded" });
            }

            let uploadInfo = activeUploads.get(uploadId);

            if (chunkIndex === 0) {
                const tempDir = path.resolve(os.tmpdir(), `uploads_${uploadId}`);
                if (!fsSync.existsSync(tempDir)) {
                    await fs.mkdir(tempDir, { recursive: true });
                }

                uploadInfo = {
                    tempDir,
                    filename,
                    outputPath,
                    totalChunks,
                    uploadedChunks: new Set(),
                    lastActivity: Date.now(),
                };

                activeUploads.set(uploadId, uploadInfo);

                setTimeout(() => cleanupUpload(uploadId, "timeout"), UPLOAD_TIMEOUT);

                console.log(`[UPLOAD] New upload session: uploadId=${uploadId}, filename=${filename}, totalChunks=${totalChunks}`);
            }

            if (!uploadInfo) {
                return res.status(400).json({ done: false, message: "Upload session not found. Please restart the upload." });
            }

            if (uploadInfo.uploadedChunks.has(chunkIndex)) {
                return res.status(200).json({ done: true, message: "Chunk already received", uploadId, chunkIndex });
            }

            uploadInfo.lastActivity = Date.now();

            const chunkPath = path.join(uploadInfo.tempDir, `chunk_${chunkIndex}`);
            await file.mv(chunkPath);

            uploadInfo.uploadedChunks.add(chunkIndex);

            console.log(`[UPLOAD] Chunk ${chunkIndex + 1}/${totalChunks} received for uploadId=${uploadId}`);

            if (!isLastChunk) {
                return res.status(200).json({ done: true, uploadId, chunkIndex, receivedChunks: uploadInfo.uploadedChunks.size, totalChunks });
            }

            if (uploadInfo.uploadedChunks.size !== uploadInfo.totalChunks) {
                const missingChunks = [];
                for (let i = 0; i < uploadInfo.totalChunks; i++) {
                    if (!uploadInfo.uploadedChunks.has(i)) {
                        missingChunks.push(i);
                    }
                }
                return res.status(400).json({
                    done: false,
                    message: `Not all chunks received. Missing: ${missingChunks.join(", ")}`,
                    uploadId,
                    receivedChunks: uploadInfo.uploadedChunks.size,
                    totalChunks: uploadInfo.totalChunks,
                });
            }

            if (!fsSync.existsSync(outputPath)) {
                await fs.mkdir(outputPath, { recursive: true });
            }

            const finalPath = path.join(outputPath, filename);
            const writeStream = fsSync.createWriteStream(finalPath);

            console.log(`[UPLOAD] Merging ${uploadInfo.totalChunks} chunks for uploadId=${uploadId}`);

            for (let i = 0; i < uploadInfo.totalChunks; i++) {
                const chunkPath = path.join(uploadInfo.tempDir, `chunk_${i}`);
                const chunkData = await fs.readFile(chunkPath);
                writeStream.write(chunkData);
            }

            writeStream.end();

            await new Promise((resolve, reject) => {
                writeStream.on("finish", resolve);
                writeStream.on("error", reject);
            });

            await cleanupUpload(uploadId, "completed");

            console.log(`[UPLOAD] Upload completed: filename=${filename}, path=${finalPath}`);
            return res.status(201).json({ done: true, path: finalPath });
        } catch (err) {
            console.error(`[UPLOAD ERROR] Upload failed:`, err.message);
            next(err);
            return res.status(500).json({ done: false, message: err.message });
        }
    }

    async function GET(req, res, next) {
        try {
            const uploadId = req.query.uploadId;

            if (!uploadId) {
                return res.status(400).json({ done: false, message: "Missing uploadId parameter" });
            }

            const uploadInfo = activeUploads.get(uploadId);

            if (!uploadInfo) {
                return res.status(404).json({ done: false, message: "Upload session not found" });
            }

            const missingChunks = [];
            for (let i = 0; i < uploadInfo.totalChunks; i++) {
                if (!uploadInfo.uploadedChunks.has(i)) {
                    missingChunks.push(i);
                }
            }

            return res.status(200).json({
                done: true,
                uploadId,
                totalChunks: uploadInfo.totalChunks,
                receivedChunks: uploadInfo.uploadedChunks.size,
                missingChunks,
            });
        } catch (err) {
            console.error(`[UPLOAD ERROR] Status check failed:`, err.message);
            next(err);
            return res.status(500).json({ done: false, message: err.message });
        }
    }

    async function DELETE(req, res, next) {
        try {
            const uploadId = req.query.uploadId;

            if (!uploadId) {
                return res.status(400).json({ done: false, message: "Missing uploadId parameter" });
            }

            await cleanupUpload(uploadId, "cancelled");

            console.log(`[UPLOAD] Upload cancelled: uploadId=${uploadId}`);

            return res.status(200).json({ done: true, message: "Upload cancelled" });
        } catch (err) {
            console.error(`[UPLOAD ERROR] Cancel failed:`, err.message);
            next(err);
            return res.status(500).json({ done: false, message: err.message });
        }
    }

    POST.apiDoc = {
        summary: "Upload one or more CSV files into `data/CSV/<path>` (supports chunked upload)",
        description:
            "Multipart upload. Supports both single-file and chunked upload for large files. " +
            "For chunked upload: send chunks sequentially with `chunked=true`, `uploadId`, `chunkIndex`, `totalChunks`, `filename`, and `last=true` for the final chunk. " +
            "Chunks are stored temporarily and merged on the server. Paths escaping `data/CSV/` are rejected with `403`. " +
            "Returns `201 { done: true }` on success.",
        security: [{ restrictLoggedUser: [] }],
        operationId: "uploadCsvFiles",
        consumes: ["multipart/form-data"],
        parameters: [
            { name: "path", in: "formData", required: false, type: "string", description: "Sub-path under `data/CSV/`. Example: `maintenance`. Required for non-chunked upload." },
            { name: "files", in: "formData", required: false, type: "file", description: "One or more CSV files to upload. For non-chunked upload only." },
            { name: "chunked", in: "formData", required: false, type: "string", description: "Set to 'true' for chunked upload mode." },
            { name: "uploadId", in: "formData", required: false, type: "string", description: "Unique upload session ID (generated by client). Required for chunked upload." },
            { name: "chunkIndex", in: "formData", required: false, type: "string", description: "Index of this chunk (0-based). Required for chunked upload." },
            { name: "totalChunks", in: "formData", required: false, type: "string", description: "Total number of chunks. Required for chunked upload." },
            { name: "filename", in: "formData", required: false, type: "string", description: "Original filename. Required for chunked upload." },
            { name: "last", in: "formData", required: false, type: "string", description: "Set to 'true' for the last chunk. Required for chunked upload." },
            { name: "chunk", in: "formData", required: false, type: "file", description: "The chunk file data. Required for chunked upload." },
        ],
        responses: {
            201: {
                description: "Files uploaded successfully.",
                schema: { properties: { done: { type: "boolean" }, path: { type: "string" } } },
                examples: { "application/json": { done: true, path: "data/CSV/maintenance/file.csv" } },
            },
            200: {
                description: "Chunk received successfully (chunked upload).",
                schema: {
                    properties: { done: { type: "boolean" }, uploadId: { type: "string" }, chunkIndex: { type: "integer" }, receivedChunks: { type: "integer" }, totalChunks: { type: "integer" } },
                },
            },
            400: {
                description: "Bad request - missing parameters or incomplete upload.",
                schema: { properties: { done: { type: "boolean" }, message: { type: "string" } } },
            },
            403: {
                description: "Forbidden path (directory traversal attempt).",
                schema: { properties: { done: { type: "boolean" }, message: { type: "string" } } },
            },
            404: {
                description: "Upload session not found.",
                schema: { properties: { done: { type: "boolean" }, message: { type: "string" } } },
            },
            500: { description: "Upload error." },
        },
        tags: ["Data"],
    };

    GET.apiDoc = {
        summary: "Get upload session status",
        description: "Returns the status of a chunked upload session, including which chunks have been received.",
        operationId: "getUploadStatus",
        security: [{ restrictLoggedUser: [] }],
        parameters: [{ name: "uploadId", in: "query", required: true, type: "string", description: "Upload session ID." }],
        responses: {
            200: {
                description: "Upload status.",
                schema: {
                    properties: {
                        done: { type: "boolean" },
                        uploadId: { type: "string" },
                        totalChunks: { type: "integer" },
                        receivedChunks: { type: "integer" },
                        missingChunks: { type: "array", items: { type: "integer" } },
                    },
                },
            },
            404: { description: "Upload session not found." },
            500: { description: "Error checking status." },
        },
        tags: ["Data"],
    };

    DELETE.apiDoc = {
        summary: "Cancel an upload session",
        description: "Cancels an ongoing chunked upload and cleans up temporary files.",
        operationId: "cancelUpload",
        security: [{ restrictLoggedUser: [] }],
        parameters: [{ name: "uploadId", in: "query", required: true, type: "string", description: "Upload session ID to cancel." }],
        responses: {
            200: {
                description: "Upload cancelled.",
                schema: { properties: { done: { type: "boolean" }, message: { type: "string" } } },
            },
            500: { description: "Error cancelling upload." },
        },
        tags: ["Data"],
    };

    return operations;
}
