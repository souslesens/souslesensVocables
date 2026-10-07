// Regression test: sources missing from the MappingModeler Class tree.
// The tree lists the classes of the source and of its imports from Config.ontologiesVocabularyModels.
// A model read while being rebuilt, or a server cache read while being rewritten, used to drop sources
// from the tree until the refresh icon was clicked.

/* global window, Config, MappingModeler, MappingColumnsGraph, OntologyModels */
import { test, expect } from "@playwright/test";

// has a mapping file on the dev data, and imports three sources that all have classes
const mappedSource = "PAZFLOR_ABOX";
const classesKeyRegex = /(^|&)key=classes(&|$)/;
const localhostUrlRegex = /^http:\/\/localhost(:\d+)?$/;
const baseUrl = process.env.SLS_URL || "http://localhost:3010";

// the tests delete a shared server cache and rebuild models: a timing-out query takes a shared Virtuoso down
if (!localhostUrlRegex.test(baseUrl)) {
    throw new Error("classesTreeSources.spec.js only runs against a local server, not " + baseUrl);
}

test.use({ baseURL: baseUrl });
test.describe.configure({ timeout: 180000 });

async function openMappingModeler(page, source) {
    page.on("dialog", (dialog) => dialog.accept());
    await page.goto(`/vocables/?tool=MappingModeler&source=${source}`);
    await page.waitForFunction(
        (expectedSource) =>
            window.MappingModeler && MappingModeler.currentSLSsource == expectedSource && MappingModeler.allClasses && MappingColumnsGraph.visjsGraph && MappingColumnsGraph.visjsGraph.data,
        source,
        { timeout: 120000 },
    );
    // the tree div is out of the DOM until a table is selected: record the sources the tree is built from
    await page.evaluate(() => {
        window.classesTreeSources = [];
        var originalLoad = MappingModeler.loadSuggestionSelectJstree;
        MappingModeler.loadSuggestionSelectJstree = function (objects, parentName, callback) {
            if (parentName == "Classes") {
                var treeSources = [];
                objects.forEach(function (treeObject) {
                    if (treeObject.source && treeSources.indexOf(treeObject.source) < 0) {
                        treeSources.push(treeObject.source);
                    }
                });
                window.classesTreeSources.push(treeSources.sort());
            }
            return originalLoad.call(MappingModeler, objects, parentName, callback);
        };
    });
}

async function readSourcesWithClasses(page, source) {
    return page.evaluate((mainSource) => {
        var scopeSources = [mainSource].concat(Config.sources[mainSource].imports || []);
        var sourcesWithClasses = scopeSources.filter(function (scopeSource) {
            var model = Config.ontologiesVocabularyModels[scopeSource];
            return model && Object.keys(model.classes).length > 0;
        });
        return sourcesWithClasses.sort();
    }, source);
}

async function countClassesTrees(page) {
    return page.evaluate(() => window.classesTreeSources.length);
}

async function waitForClassesTrees(page, expectedCount) {
    await page.waitForFunction((count) => window.classesTreeSources.length >= count, expectedCount, { timeout: 120000 });
    return page.evaluate(() => window.classesTreeSources);
}

// what a click on the Class node of the legend runs
async function clickClassLegend(page) {
    const treeCount = await countClassesTrees(page);
    await page.evaluate(() => MappingModeler.onLegendNodeClick({ id: "Class" }));
    const classesTrees = await waitForClassesTrees(page, treeCount + 1);
    return classesTrees[classesTrees.length - 1];
}

test("a model rebuilt after a triples change keeps the source in the Class tree", async ({ page }) => {
    await openMappingModeler(page, mappedSource);
    const expectedSources = await readSourcesWithClasses(page, mappedSource);
    expect(await clickClassLegend(page)).toEqual(expectedSources);

    // what the success handler of "delete current file triples" runs, without deleting any triple
    const cacheDeleted = page.waitForResponse((response) => response.url().includes("/api/v1/ontologyModels") && response.request().method() == "DELETE");
    const rebuildDone = page.evaluate((source) => new Promise((resolve) => MappingModeler.clearSourceClasses(source, () => resolve())), mappedSource);
    await cacheDeleted;
    expect(await clickClassLegend(page)).toEqual(expectedSources);

    await rebuildDone;
    expect(await clickClassLegend(page)).toEqual(expectedSources);
});

test("a Class click during a refresh lists every source", async ({ page }) => {
    await openMappingModeler(page, mappedSource);
    const expectedSources = await readSourcesWithClasses(page, mappedSource);
    // a big model takes seconds to come back from the server cache
    let signalCacheReadHeld;
    const cacheReadHeld = new Promise((resolve) => (signalCacheReadHeld = resolve));
    await page.route("**/api/v1/ontologyModels?**", async (route) => {
        if (route.request().method() == "GET") {
            signalCacheReadHeld();
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        return route.continue();
    });

    const treeCount = await countClassesTrees(page);
    await page.evaluate(() => MappingModeler.refreshColumnsClassesTree());
    await cacheReadHeld;
    await page.evaluate(() => MappingModeler.onLegendNodeClick({ id: "Class" }));

    // the tree of the click and the redraw that ends the refresh
    const classesTrees = await waitForClassesTrees(page, treeCount + 2);
    expect(classesTrees.slice(treeCount)).toEqual([expectedSources, expectedSources]);
});

test("two refreshes started together both list every source", async ({ page }) => {
    await openMappingModeler(page, mappedSource);
    const expectedSources = await readSourcesWithClasses(page, mappedSource);

    const treeCount = await countClassesTrees(page);
    await page.evaluate(() => {
        MappingModeler.refreshColumnsClassesTree();
        MappingModeler.refreshColumnsClassesTree();
    });

    const classesTrees = await waitForClassesTrees(page, treeCount + 2);
    expect(classesTrees.slice(treeCount)).toEqual([expectedSources, expectedSources]);
});

test("a session opening a source while another rewrites its server cache reads a complete model", async ({ browser }) => {
    const writerPage = await browser.newPage();
    await writerPage.goto("/vocables/");
    await writerPage.waitForFunction(() => window.OntologyModels && window.Config && Config.sources && Object.keys(Config.sources).length > 0, null, { timeout: 60000 });

    // the classes key of the rewrite stays in flight until the reader has read the cache
    let signalClassesPostHeld;
    const classesPostHeld = new Promise((resolve) => (signalClassesPostHeld = resolve));
    let releaseClassesPost;
    const classesPostReleased = new Promise((resolve) => (releaseClassesPost = resolve));
    await writerPage.route("**/api/v1/ontologyModels", async (route) => {
        if (route.request().method() == "POST" && classesKeyRegex.test(route.request().postData() || "")) {
            signalClassesPostHeld();
            await classesPostReleased;
        }
        return route.continue();
    });
    await writerPage.evaluate((source) => {
        OntologyModels.clearOntologyModelCache(source, function () {
            window.isRebuildDone = true;
        });
    }, mappedSource);
    await classesPostHeld;

    const readerPage = await browser.newPage();
    await openMappingModeler(readerPage, mappedSource);
    const expectedSources = await readSourcesWithClasses(readerPage, mappedSource);
    expect(expectedSources).toContain(mappedSource);
    expect(await clickClassLegend(readerPage)).toEqual(expectedSources);

    releaseClassesPost();
    await writerPage.waitForFunction(() => window.isRebuildDone, null, { timeout: 120000 });
    expect(await clickClassLegend(readerPage)).toEqual(expectedSources);

    await readerPage.close();
    await writerPage.close();
});
