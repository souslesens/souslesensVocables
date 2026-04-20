// Regression test for issue #1348: Lineage sources dupliquées
// Verifies that sources with imports are not displayed multiple times
// in the #lineage_drawnSources panel.

import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3011";

// Sources that exist in the test environment:
// plant_ontology imports BFO
// cido_coronavirus also imports BFO
const SOURCE_WITH_IMPORT = "plant_ontology";
const IMPORTED_SOURCE = "BFO";
const ANOTHER_SOURCE_WITH_IMPORT = "cido_coronavirus";

async function login(page) {
    await page.goto(`${BASE_URL}/vocables`);
    await page.waitForLoadState("load");
    const loginInput = page.locator('input[name="login"], input[id="login"], input[placeholder*="login"], input[placeholder*="Login"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    if (await loginInput.isVisible({ timeout: 5000 })) {
        await loginInput.fill("admin");
        await passwordInput.fill("admin");
        const submitBtn = page.locator('button[type="submit"], input[type="submit"]').first();
        await submitBtn.click();
        await page.waitForLoadState("load");
        await page.waitForTimeout(2000);
    }
}

async function openLineageTool(page) {
    await page.goto(`${BASE_URL}/vocables?tool=lineage`);
    await page.waitForLoadState("load");
    await page.waitForTimeout(2000);
}

async function selectSourceInDialog(page, sourceName) {
    const searchInput = page.locator("#sourceSelector_searchInput");
    if (await searchInput.isVisible({ timeout: 5000 })) {
        await searchInput.fill(sourceName);
        await searchInput.press("Enter");
        await page.waitForTimeout(500);
    }
    const sourceNode = page.locator(`#sourceSelector_jstreeDiv`).getByText(sourceName, { exact: true }).first();
    if (await sourceNode.isVisible({ timeout: 5000 })) {
        await sourceNode.click();
        await page.waitForTimeout(2000);
    }
}

async function getDrawnSourceLabels(page) {
    return await page.evaluate(() => {
        const divs = document.querySelectorAll("#lineage_drawnSources .Lineage_sourceLabelDiv");
        return Array.from(divs).map((div) => {
            const clone = div.cloneNode(true);
            clone.querySelectorAll("button").forEach((b) => b.remove());
            return clone.textContent.trim().replace(/\s+/g, " ").trim();
        });
    });
}

test.describe("Lineage sources deduplication (issue #1348)", () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
        await openLineageTool(page);
    });

    test("source with imports shows each source exactly once", async ({ page }) => {
        await page.waitForSelector("#sourceSelector_jstreeDiv", { timeout: 10000 });
        await selectSourceInDialog(page, SOURCE_WITH_IMPORT);
        await page.waitForTimeout(2000);

        const sourceLabels = await getDrawnSourceLabels(page);

        const mainCount = sourceLabels.filter((l) => l.includes(SOURCE_WITH_IMPORT)).length;
        expect(mainCount, `${SOURCE_WITH_IMPORT} should appear exactly once, found: ${JSON.stringify(sourceLabels)}`).toBe(1);

        const importedCount = sourceLabels.filter((l) => l.includes(IMPORTED_SOURCE)).length;
        expect(importedCount, `${IMPORTED_SOURCE} should appear exactly once, found: ${JSON.stringify(sourceLabels)}`).toBe(1);
    });

    test("Changing source does not produce duplicate source labels", async ({ page }) => {
        await page.waitForSelector("#sourceSelector_jstreeDiv", { timeout: 10000 });
        await selectSourceInDialog(page, SOURCE_WITH_IMPORT);
        await page.waitForTimeout(2000);

        const changeSourceBtn = page.locator("#ChangeSourceButton");
        if (await changeSourceBtn.isVisible({ timeout: 3000 })) {
            await changeSourceBtn.click();
            await page.waitForSelector("#sourceSelector_jstreeDiv", { timeout: 5000 });
            await selectSourceInDialog(page, ANOTHER_SOURCE_WITH_IMPORT);
            await page.waitForTimeout(2000);

            const sourceLabels = await getDrawnSourceLabels(page);
            const labelCounts = {};
            sourceLabels.forEach((label) => {
                labelCounts[label] = (labelCounts[label] || 0) + 1;
            });

            const duplicates = Object.entries(labelCounts)
                .filter(([, count]) => count > 1)
                .map(([label]) => label);

            expect(duplicates, `Duplicate source labels found: ${JSON.stringify(sourceLabels)}`).toHaveLength(0);
        }
    });

    test("Lineage_sources.clearRegistrations method exists", async ({ page }) => {
        const hasClearRegistrations = await page.evaluate(() => {
            return typeof window.Lineage_sources !== "undefined" && typeof window.Lineage_sources.clearRegistrations === "function";
        });
        expect(hasClearRegistrations, "Lineage_sources.clearRegistrations should be a function").toBe(true);
    });
});
