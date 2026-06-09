import { chromium } from "playwright";
import JSZip from "jszip";
import { ontologyModelsCache } from "../ontologyModels.js";
import SocketManager from "../../../../bin/socketManager.js";

// Socket.io channel the client listens on to drive the snapshots progress bar.
const SNAPSHOTS_PROGRESS_CHANNEL = "adminSnapshots";

// How long (ms) to wait, per class, for the lineage page to auto-open the NodeInfosWidget
// (driven by the `nodeInfosURI` URL param) and render its content before giving up on that class.
const NODE_INFOS_RENDER_TIMEOUT_MS = 30000;

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

export default function () {
    let operations = {
        POST,
    };

    ///// POST api/v1/admin/snapshots
    // Generates one node-infos snapshot HTML per class of a source (headless, via Playwright),
    // then returns them bundled in a single zip download.
    async function POST(req, res, _next) {
        const source = req.body && req.body.source;
        if (!source) {
            return res.status(400).send({ ERROR: "missing source" });
        }

        const ontologyModel = ontologyModelsCache[source];
        if (!ontologyModel || !ontologyModel.classes) {
            return res.status(404).send({ ERROR: "no cached ontology model for source '" + source + "'. Open the source in the app first so its model is registered." });
        }

        const classUris = Object.keys(ontologyModel.classes);
        if (classUris.length === 0) {
            return res.status(404).send({ ERROR: "no classes in cached ontology model for source '" + source + "'" });
        }

        // Same-origin base URL the admin's browser used; Playwright loads pages from here.
        const baseUrl = req.protocol + "://" + req.get("host");
        // Forward the admin's own session cookie so the headless browser is authenticated as them.
        // Scoped to the throw-away browser context below and discarded when that context closes.
        const sessionCookie = req.headers.cookie || "";
        // The client's socket.io id (sent in the body) so progress can be pushed to that browser tab only.
        const clientSocketId = req.body && req.body.clientSocketId;
        const total = classUris.length;
        const emitProgress = function (payload) {
            if (clientSocketId) {
                SocketManager.message(clientSocketId, SNAPSHOTS_PROGRESS_CHANNEL, payload);
            }
        };

        let browser;
        try {
            browser = await chromium.launch({ headless: true });
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
                const pageUrl = baseUrl + "/vocables/?tool=lineage&source=" + encodeURIComponent(source) + "&nodeInfosURI=" + encodeURIComponent(classUri);
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

            emitProgress({ operation: "finished", source: source, processed: processed, total: total, failures: failures.length });

            // Closing the context discards the forwarded session cookie; close the browser too.
            await context.close();
            await browser.close();
            browser = null;

            if (Object.keys(zip.files).length === 0) {
                return res.status(500).send({ ERROR: "no snapshot could be generated", failures: failures });
            }
            if (failures.length > 0) {
                zip.file("_failures.json", JSON.stringify(failures, null, 2));
            }

            const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
            res.setHeader("Content-Type", "application/zip");
            res.setHeader("Content-Disposition", 'attachment; filename="' + source + "_snapshots.zip" + '"');
            return res.status(200).send(zipBuffer);
        } catch (error) {
            if (browser) {
                try {
                    await browser.close();
                } catch (closeError) {
                    console.error("snapshots: failed to close browser", closeError);
                }
            }
            console.error("snapshots export error", error);
            return res.status(500).send({ ERROR: error.message || String(error) });
        }
    }

    POST.apiDoc = {
        summary: "Export node-infos snapshots for all classes of a source as a zip",
        description:
            "For each class of `source` (read from the server's in-memory ontology model cache), a headless browser " +
            "(Playwright) loads the lineage page with `nodeInfosURI=<class uri>`, lets the app render the NodeInfosWidget, " +
            "builds a self-contained snapshot HTML, and adds it to a zip under the client-derived node file name. The admin's session " +
            "cookie is forwarded to the headless browser for authentication and discarded once the export completes. " +
            "Returns the zip as a download. The source must have been opened in the app at least once so its model is cached.",
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
                        clientSocketId: { type: "string", description: "Optional socket.io client id to receive per-class progress on the `adminSnapshots` channel." },
                    },
                },
            },
        ],
        produces: ["application/zip"],
        responses: {
            200: { description: "Zip archive of per-class snapshot HTML files." },
            400: { description: "Missing source." },
            404: { description: "No cached ontology model / classes for the source." },
            500: { description: "Snapshot generation failed." },
        },
        tags: ["Admin"],
    };

    return operations;
}
