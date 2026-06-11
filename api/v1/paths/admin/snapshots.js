import { chromium } from "playwright";
import JSZip from "jszip";
import { randomUUID } from "crypto";
import { ontologyModelsCache } from "../ontologyModels.js";
import SocketManager from "../../../../bin/socketManager.js";
import { mainConfigModel } from "../../../../model/mainConfig.js";

const SNAPSHOTS_PROGRESS_CHANNEL = "adminSnapshots";
const NODE_INFOS_RENDER_TIMEOUT_MS = 30000;
const MAX_SNAPSHOT_CLASSES = 500;
const DEFAULT_LISTEN_PORT = 3010;
// Unclaimed zips are purged after this delay to avoid unbounded memory growth.
const ZIP_DOWNLOAD_TTL_MS = 10 * 60 * 1000;

// jobId → { zipBuffer: Buffer, source: string }
const pendingZips = new Map();

// Browser-side: waits until the NodeInfosWidget (auto-opened via the nodeInfosURI URL param) has FULLY
// rendered — signalled by `window.nodeInfosSnapshotReady`, set in the showNodeInfos completion callback once
// all async sections (common infos, restrictions, class hierarchy...) are done — then builds the
// self-contained snapshot HTML and resolves with it plus the client-derived file name.
function buildSnapshotInPage(renderTimeoutMs) {
    return new Promise(function (resolve, reject) {
        var startTime = Date.now();
        (function waitForRender() {
            var infosDiv = document.getElementById("nodeInfosWidget_InfosTabDiv");
            if (window.nodeInfosSnapshotReady && infosDiv && infosDiv.children.length > 0 && window.NodeInfosWidget) {
                window.NodeInfosWidget.buildSnapshotHtml("nodeInfosWidget_InfosTabDiv", function (err, html) {
                    if (err || !html) {
                        return reject(new Error("buildSnapshotHtml failed: " + (err || "empty html")));
                    }
                    resolve({ html: html, fileName: window.NodeInfosWidget.getSnapshotFileName() });
                });
                return;
            }
            if (Date.now() - startTime > renderTimeoutMs) {
                return reject(new Error("timed out waiting for node infos to render"));
            }
            setTimeout(waitForRender, 300);
        })();
    });
}

async function _runSnapshotJob(jobId, source, classUris, baseUrl, sessionCookie, clientSocketId) {
    const total = classUris.length;
    const emitProgress = function (payload) {
        if (clientSocketId) {
            SocketManager.message(clientSocketId, SNAPSHOTS_PROGRESS_CHANNEL, payload);
        }
    };

    let browser;
    try {
        const systemChromiumPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
        browser = await chromium.launch({
            headless: true,
            executablePath: systemChromiumPath || undefined,
            args: systemChromiumPath ? ["--no-sandbox"] : [],
        });
        const context = await browser.newContext({
            extraHTTPHeaders: sessionCookie ? { Cookie: sessionCookie } : {},
            ignoreHTTPSErrors: true,
        });
        const page = await context.newPage();

        const zip = new JSZip();
        const failures = [];

        emitProgress({ operation: "start", source: source, processed: 0, total: total });

        let processed = 0;
        for (const classUri of classUris) {
            const pageUrl =
                baseUrl + "/vocables/?tool=lineage&source=" + encodeURIComponent(source) + "&nodeInfosURI=" + encodeURIComponent(classUri);
            try {
                await page.goto(pageUrl, { waitUntil: "load", timeout: NODE_INFOS_RENDER_TIMEOUT_MS });
                const snapshot = await page.evaluate(buildSnapshotInPage, NODE_INFOS_RENDER_TIMEOUT_MS);
                zip.file(snapshot.fileName, snapshot.html);
            } catch (classError) {
                failures.push({ classUri: classUri, error: classError.message || String(classError) });
            }
            processed++;
            emitProgress({ operation: "progress", source: source, processed: processed, total: total, classUri: classUri });
        }

        await context.close();
        await browser.close();
        browser = null;

        if (Object.keys(zip.files).length === 0) {
            emitProgress({ operation: "error", source: source, error: "no snapshot could be generated", failures: failures });
            return;
        }
        if (failures.length > 0) {
            zip.file("_failures.json", JSON.stringify(failures, null, 2));
        }

        const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
        pendingZips.set(jobId, { zipBuffer: zipBuffer, source: source });
        setTimeout(function () {
            pendingZips.delete(jobId);
        }, ZIP_DOWNLOAD_TTL_MS);

        emitProgress({
            operation: "finished",
            source: source,
            processed: processed,
            total: total,
            failures: failures.length,
            downloadUrl: "/api/v1/admin/snapshots?jobId=" + jobId,
        });
    } catch (error) {
        if (browser) {
            try {
                await browser.close();
            } catch (closeError) {
                console.error("snapshots: failed to close browser", closeError);
            }
        }
        console.error("snapshots job error", error);
        emitProgress({ operation: "error", source: source, error: error.message || String(error) });
    }
}

export default function () {
    let operations = {
        GET,
        POST,
    };

    ///// GET api/v1/admin/snapshots?jobId=<uuid>
    // Serves a previously generated zip (stored in-memory by a background snapshot job) and removes it
    // from the pending map so it cannot be downloaded twice.
    async function GET(req, res, _next) {
        const jobId = req.query && req.query.jobId;
        if (!jobId) {
            return res.status(400).send({ ERROR: "missing jobId" });
        }
        const entry = pendingZips.get(jobId);
        if (!entry) {
            return res.status(404).send({ ERROR: "zip not found or already downloaded" });
        }
        pendingZips.delete(jobId);
        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", 'attachment; filename="' + entry.source + '_snapshots.zip"');
        return res.status(200).send(entry.zipBuffer);
    }

    ///// POST api/v1/admin/snapshots
    // Starts a background snapshot job (headless Playwright per class of source) and returns 202 + jobId
    // immediately so nginx does not time out. Progress is pushed via socket.io (adminSnapshots channel).
    // When done, emits a `finished` event with `downloadUrl` pointing to the GET endpoint above.
    async function POST(req, res, _next) {
        const source = req.body && req.body.source;
        if (!source) {
            return res.status(400).send({ ERROR: "missing source" });
        }

        const ontologyModel = ontologyModelsCache[source];
        if (!ontologyModel || !ontologyModel.classes) {
            return res
                .status(404)
                .send({ ERROR: "no cached ontology model for source '" + source + "'. Open the source in the app first so its model is registered." });
        }

        const classUris = Object.keys(ontologyModel.classes);
        if (classUris.length === 0) {
            return res.status(404).send({ ERROR: "no classes in cached ontology model for source '" + source + "'" });
        }
        if (classUris.length > MAX_SNAPSHOT_CLASSES) {
            return res.status(413).send({
                ERROR: "source '" + source + "' has " + classUris.length + " classes; snapshot export is limited to " + MAX_SNAPSHOT_CLASSES + " classes",
            });
        }

        // Server-controlled base URL the headless browser loads pages from. It runs inside this same
        // container/process host, so loopback is always reachable. Deliberately NOT derived from the
        // request Host header (which the client controls) to avoid SSRF / forwarding the admin cookie
        // to an attacker-chosen host. Override with SNAPSHOTS_BASE_URL only if Playwright runs elsewhere.
        const mainConfig = await mainConfigModel.getConfig();
        const listenPort = process.env.PORT || (mainConfig && mainConfig.listenPort) || DEFAULT_LISTEN_PORT;
        const baseUrl = process.env.SNAPSHOTS_BASE_URL || "http://127.0.0.1:" + listenPort;
        const sessionCookie = req.headers.cookie || "";
        const clientSocketId = req.body && req.body.clientSocketId;
        const jobId = randomUUID();

        res.status(202).send({ jobId: jobId });

        _runSnapshotJob(jobId, source, classUris, baseUrl, sessionCookie, clientSocketId).catch(function (error) {
            console.error("snapshots: unhandled job error", error);
        });
    }

    GET.apiDoc = {
        summary: "Download a previously generated snapshots zip",
        description: "Serves the zip produced by a background snapshot job (started via POST) and removes it from the server. One-time download.",
        operationId: "downloadSourceSnapshots",
        security: [{ restrictAdmin: [] }],
        parameters: [
            {
                name: "jobId",
                in: "query",
                required: true,
                type: "string",
                description: "Job id returned by POST /admin/snapshots.",
            },
        ],
        produces: ["application/zip"],
        responses: {
            200: { description: "Zip archive of per-class snapshot HTML files." },
            400: { description: "Missing jobId." },
            404: { description: "Zip not found or already downloaded." },
        },
        tags: ["Admin"],
    };

    POST.apiDoc = {
        summary: "Start a background export of node-infos snapshots for all classes of a source",
        description:
            "Validates the source, then immediately returns 202 with a `jobId`. A background job drives a headless browser " +
            "(Playwright) over `?tool=lineage&source=...&nodeInfosURI=<class uri>` for each class and pushes per-class progress " +
            "on the `adminSnapshots` socket channel. When all classes are processed the channel receives a `finished` event " +
            "containing a `downloadUrl` for GET /admin/snapshots?jobId=<jobId>. The source must have been opened in the app " +
            "at least once so its model is cached.",
        operationId: "exportSourceSnapshots",
        security: [{ restrictAdmin: [] }],
        parameters: [
            {
                name: "body",
                in: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["source"],
                    properties: {
                        source: { type: "string", description: "Source name. Example: `LIFEX_FPSO`.", example: "LIFEX_FPSO" },
                        clientSocketId: {
                            type: "string",
                            description: "Optional socket.io client id to receive per-class progress on the `adminSnapshots` channel.",
                        },
                    },
                },
            },
        ],
        responses: {
            202: { description: "Job started. Body: `{ jobId: string }`." },
            400: { description: "Missing source." },
            404: { description: "No cached ontology model / classes for the source." },
            413: { description: "Source has more classes than the export limit (" + MAX_SNAPSHOT_CLASSES + ")." },
        },
        tags: ["Admin"],
    };

    return operations;
}
