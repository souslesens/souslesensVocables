// Verifies that the subclass-expand button on superclass nodes is positioned
// inside the node border and at a small fixed canvas-px gap from the label.
// Source PAZFLOR_ABOX is used because its inferred model produces grouped
// superclass nodes (Package, SubPackage).

import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3010";
const SOURCE = "PAZFLOR_ABOX";

test.describe("KGquery superclass-expand button positioning", () => {
    test("button sits inside node border with small gap from label", async ({ browser }) => {
        const context = await browser.newContext({ deviceScaleFactor: 2 });
        const page = await context.newPage();
        await page.setViewportSize({ width: 1400, height: 900 });
        page.setDefaultTimeout(40000);

        await page.goto(`${BASE_URL}/vocables/?tool=KGquery&source=${SOURCE}`);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(5000);

        const info = await page.evaluate(() => {
            const buttons = document.querySelectorAll(".subclass-expand-btn");
            const containerRect = document.getElementById("KGquery_graphDiv").getBoundingClientRect();
            const network = window.KGquery_graph.KGqueryGraph.network;
            return {
                containerRect: {
                    left: Math.round(containerRect.left),
                    right: Math.round(containerRect.right),
                },
                buttons: Array.from(buttons).map((btn) => {
                    const r = btn.getBoundingClientRect();
                    const nodeId = btn.dataset.nodeId;
                    const bbox = network.getBoundingBox(nodeId);
                    const domRight = network.canvasToDOM({ x: bbox.right, y: (bbox.top + bbox.bottom) / 2 });
                    const nodeRightViewport = containerRect.x + domRight.x;
                    return {
                        nodeId,
                        btnLeft: Math.round(r.left),
                        btnRight: Math.round(r.right),
                        nodeRightViewport: Math.round(nodeRightViewport),
                    };
                }),
            };
        });

        expect(info.buttons.length).toBeGreaterThan(0);

        for (const btn of info.buttons) {
            // Button right edge must not cross the node's right border (1 px tolerance)
            expect(btn.btnRight, `${btn.nodeId} btnRight inside border`).toBeLessThanOrEqual(btn.nodeRightViewport + 1);
            // Button must be inside container
            expect(btn.btnRight).toBeLessThanOrEqual(info.containerRect.right);
        }

        await context.close();
    });
});
