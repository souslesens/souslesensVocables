// What a full Elasticsearch refresh produces, source content shape by source content shape: classes
// only, classes with individuals, individuals without a single class, and an empty source. Each test
// drives SearchUtil.generateElasticIndex in the application itself, then reads the index back through
// the application API and compares it with the triple store.
//
// Two defects are under test. A source holding no owl:Class never carried replaceIndex, so its index
// was neither deleted nor created and kept whatever a previous run had left. And the indexsource route
// indexed the same payload two or three times per request, so every slice after the first landed as
// two or three documents under the same URI with a different random _id.
//
// Data: the dev triple store and the dev Elasticsearch, through the server on SLS_URL. An index is
// derived data: these tests rebuild the indexes of the sources listed in indexationCases from the
// triple store, they destroy nothing that the triple store does not hold.
//
//   npx playwright test tests/e2e/tools/search/indexRefreshContentShapes.spec.js --workers=1 --reporter=line

/* global window, SearchUtil, Config */
import { test, expect, request as playwrightRequest } from "@playwright/test";
import fs from "fs";
import path from "path";

const localhostUrlRegex = /^http:\/\/localhost(:\d+)?$/;
const baseUrl = process.env.SLS_URL || process.env.TEST_BASE_URL || "http://localhost:3010";

// the Playwright of the repo expects a headless shell revision that is not the one installed here
const localChromiumPath = process.env.SLS_CHROMIUM_PATH || path.join(process.env.LOCALAPPDATA || "", "ms-playwright/chromium-1223/chrome-win64/chrome.exe");
const launchOptions = fs.existsSync(localChromiumPath) ? { executablePath: localChromiumPath } : {};

// a timing-out query takes a shared Virtuoso down
if (!localhostUrlRegex.test(baseUrl)) {
    throw new Error("indexRefreshContentShapes.spec.js only runs against a local server, not " + baseUrl);
}

test.use({ baseURL: baseUrl, launchOptions });
test.describe.configure({ timeout: 600000, mode: "serial" });

// every shape the refresh has to handle, on sources of the dev store. A source holding only
// properties and no class exists in none of them, that shape is left uncovered here.
const indexationCases = [
    { shape: "classes only", sourceName: "test_source_BFO", expectsDocuments: true },
    { shape: "classes and object properties, no individual", sourceName: "PAZFLOR_TBOX", expectsDocuments: true },
    { shape: "classes, individuals and object properties", sourceName: "IDCP", expectsDocuments: true },
    { shape: "individuals only, not a single class", sourceName: "DALIA_DASHBOARD_ABOX", expectsDocuments: true },
    { shape: "empty source", sourceName: "testOntocreator2", expectsDocuments: false },
];

const indexationOptions = { indexProperties: 1, indexNamedIndividuals: 1 };

// ---------- measures taken through the application API ----------

async function elasticSearch(apiContext, indexName, query) {
    const response = await apiContext.post("/api/v1/elasticsearch/query", {
        data: { url: "_search", indexes: [indexName], query: query },
    });
    return response.json();
}

async function indexDocumentCounts(apiContext, sourceName) {
    const indexName = sourceName.toLowerCase();
    const idKeywordPayload = await elasticSearch(apiContext, indexName, {
        size: 0,
        track_total_hits: true,
        aggs: { uniqueIds: { cardinality: { field: "id.keyword", precision_threshold: 40000 } } },
    });
    // the id field is text in the older index mappings and keyword in the newer ones
    const payload = idKeywordPayload.error
        ? await elasticSearch(apiContext, indexName, {
              size: 0,
              track_total_hits: true,
              aggs: { uniqueIds: { cardinality: { field: "id", precision_threshold: 40000 } } },
          })
        : idKeywordPayload;
    if (payload.error) {
        return { indexExists: false, documentCount: 0, distinctUriCount: 0 };
    }
    return { indexExists: true, documentCount: payload.hits.total.value, distinctUriCount: payload.aggregations.uniqueIds.value };
}

// A URI legitimately holds two documents when the data declares it under two types, an owl:Class
// that is also an owl:NamedIndividual for instance: the index then describes each role, with its own
// label and its own parents. What no correct run produces is the same URI twice under the same type,
// which is what a payload indexed two or three times leaves behind.
async function worstSameTypeDuplication(apiContext, sourceName) {
    const payload = await elasticSearch(apiContext, sourceName.toLowerCase(), {
        size: 0,
        aggs: {
            duplicatedIds: {
                terms: { field: "id.keyword", size: 2000, min_doc_count: 2 },
                aggs: { byType: { terms: { field: "type.keyword", size: 10 } } },
            },
        },
    });
    if (payload.error) {
        return { documentCount: 0, example: "the index holds no aggregatable id" };
    }
    let documentCount = 1;
    let example = null;
    for (const idBucket of payload.aggregations.duplicatedIds.buckets) {
        for (const typeBucket of idBucket.byType.buckets) {
            if (typeBucket.doc_count > documentCount) {
                documentCount = typeBucket.doc_count;
                example = idBucket.key + " indexed " + typeBucket.doc_count + " times as " + typeBucket.key;
            }
        }
    }
    return { documentCount: documentCount, example: example };
}

async function indexNames(apiContext) {
    const response = await apiContext.get("/api/v1/elasticsearch/indices");
    return response.json();
}

async function sparqlCount(apiContext, sourceName, whereClause) {
    const response = await apiContext.post("/api/v1/sparql/select", {
        data: {
            source: sourceName,
            query: "SELECT (COUNT(DISTINCT ?subject) AS ?total) WHERE { " + whereClause + " }",
            withImports: false,
        },
    });
    const payload = await response.json();
    return Number(payload.results.bindings[0].total.value);
}

// ---------- the refresh, driven in the application ----------

// the application reloads itself when the url names no source, so the source is named and the
// reloads are over before anything is driven from the page
async function openApplication(page, sourceName) {
    await page.goto("/vocables/?tool=lineage&source=" + encodeURIComponent(sourceName));
    await page.waitForFunction(() => window.Lineage_sources && window.Lineage_sources.activeSource && window.SearchUtil && window.Config && Config.sources, null, { timeout: 180000 });
}

// the indexsource requests the refresh sends, in order, with the replaceIndex each one carries
function recordIndexationRequests(page) {
    const sentRequests = [];
    page.on("request", (request) => {
        if (!request.url().includes("/elasticsearch/indexsource")) {
            return;
        }
        const requestBody = request.postDataJSON();
        sentRequests.push({
            indexName: requestBody.indexName,
            documentCount: (requestBody.data || []).length,
            replaceIndex: Boolean(requestBody.options && requestBody.options.replaceIndex),
        });
    });
    return sentRequests;
}

async function refreshIndex(page, sourceName, options) {
    return page.evaluate(
        ([refreshedSource, refreshOptions]) => {
            return new Promise((resolve) => {
                SearchUtil.generateElasticIndex(refreshedSource, refreshOptions, function (err) {
                    resolve(err ? String(err.responseText || err.message || err) : null);
                });
            });
        },
        [sourceName, options],
    );
}

// ---------- tests ----------

test.describe("a full index refresh, content shape by content shape", () => {
    for (const indexationCase of indexationCases) {
        test(`${indexationCase.shape} (${indexationCase.sourceName}): one document per URI, index recreated once`, async ({ page }) => {
            const apiContext = await playwrightRequest.newContext({ baseURL: baseUrl });
            await openApplication(page, indexationCase.sourceName);
            const sentRequests = recordIndexationRequests(page);

            const refreshError = await refreshIndex(page, indexationCase.sourceName, { ...indexationOptions });
            expect(refreshError, "the refresh reported an error").toBeNull();

            const counts = await indexDocumentCounts(apiContext, indexationCase.sourceName);
            expect(counts.indexExists, "the index exists after the refresh").toBe(true);

            const duplication = await worstSameTypeDuplication(apiContext, indexationCase.sourceName);
            expect(duplication.documentCount, "no URI indexed twice under the same type: " + (duplication.example || "none")).toBe(1);

            if (indexationCase.expectsDocuments) {
                expect(counts.documentCount, "the index holds the nodes of the source").toBeGreaterThan(0);
            } else {
                expect(counts.documentCount, "an empty source produces an empty index, not a stale one").toBe(0);
            }

            const ownRequests = sentRequests.filter((sentRequest) => sentRequest.indexName === indexationCase.sourceName.toLowerCase());
            const recreateRequests = ownRequests.filter((sentRequest) => sentRequest.replaceIndex);
            expect(recreateRequests.length, "the index is deleted and recreated exactly once").toBe(1);
            expect(ownRequests[0].replaceIndex, "the recreation comes before any data").toBe(true);
            expect(ownRequests[0].documentCount, "the recreation carries no data of its own").toBe(0);

            await apiContext.dispose();
        });
    }

    test("a source holding no class gets an index, so it is not refreshed again at every open", async ({ page }) => {
        const apiContext = await playwrightRequest.newContext({ baseURL: baseUrl });
        const emptySourceName = "testOntocreator2";

        await openApplication(page, emptySourceName);
        await refreshIndex(page, emptySourceName, { ...indexationOptions });

        const existingIndexNames = await indexNames(apiContext);
        expect(existingIndexNames, "the index appears in the indices list Lineage reads to decide whether to index").toContain(emptySourceName.toLowerCase());

        await apiContext.dispose();
    });

    test("a second consecutive refresh does not stack a second copy of the nodes", async ({ page }) => {
        const apiContext = await playwrightRequest.newContext({ baseURL: baseUrl });
        const sourceName = "test_source_BFO";

        await openApplication(page, sourceName);
        await refreshIndex(page, sourceName, { ...indexationOptions });
        const countsAfterFirstRefresh = await indexDocumentCounts(apiContext, sourceName);
        await refreshIndex(page, sourceName, { ...indexationOptions });
        const countsAfterSecondRefresh = await indexDocumentCounts(apiContext, sourceName);

        expect(countsAfterSecondRefresh.documentCount, "the second refresh replaces the documents instead of adding to them").toBe(countsAfterFirstRefresh.documentCount);

        const duplication = await worstSameTypeDuplication(apiContext, sourceName);
        expect(duplication.documentCount, "still no URI indexed twice under the same type: " + (duplication.example || "none")).toBe(1);

        await apiContext.dispose();
    });

    test("a partial reindex of one node never recreates the index", async ({ page }) => {
        const apiContext = await playwrightRequest.newContext({ baseURL: baseUrl });
        const sourceName = "test_source_BFO";
        await openApplication(page, sourceName);
        const sentRequests = recordIndexationRequests(page);
        await refreshIndex(page, sourceName, { ...indexationOptions });
        const countsBeforePartialReindex = await indexDocumentCounts(apiContext, sourceName);

        const oneClassUri = await page.evaluate(
            ([partialSource]) => {
                return new Promise((resolve) => {
                    window.Sparql_generic.getSourceTaxonomy(partialSource, { withoutImports: true }, function (err, result) {
                        if (err || !result || !result.classesMap) {
                            return resolve(null);
                        }
                        resolve(Object.keys(result.classesMap)[0] || null);
                    });
                });
            },
            [sourceName],
        );
        expect(oneClassUri, "the source exposes a class to reindex on its own").not.toBeNull();

        sentRequests.length = 0;
        const partialReindexError = await refreshIndex(page, sourceName, { ids: [oneClassUri] });
        expect(partialReindexError, "the partial reindex reported an error").toBeNull();

        const recreateRequests = sentRequests.filter((sentRequest) => sentRequest.replaceIndex);
        expect(recreateRequests.length, "a partial reindex must not wipe the whole index").toBe(0);

        const countsAfterPartialReindex = await indexDocumentCounts(apiContext, sourceName);
        expect(countsAfterPartialReindex.documentCount, "the index keeps the nodes it already held").toBeGreaterThanOrEqual(countsBeforePartialReindex.documentCount);

        await apiContext.dispose();
    });

    test("the indexed nodes cover the classes and the individuals the triple store holds", async ({ page }) => {
        const apiContext = await playwrightRequest.newContext({ baseURL: baseUrl });
        const sourceName = "IDCP";

        await openApplication(page, sourceName);
        const refreshError = await refreshIndex(page, sourceName, { ...indexationOptions });
        expect(refreshError, "the refresh reported an error").toBeNull();

        const classCount = await sparqlCount(apiContext, sourceName, "?subject a owl:Class");
        const individualCount = await sparqlCount(apiContext, sourceName, "?subject a owl:NamedIndividual");
        const counts = await indexDocumentCounts(apiContext, sourceName);

        expect(counts.distinctUriCount, "classes and individuals are both indexed").toBeGreaterThanOrEqual(classCount + individualCount);

        const duplication = await worstSameTypeDuplication(apiContext, sourceName);
        expect(duplication.documentCount, "no URI indexed twice under the same type: " + (duplication.example || "none")).toBe(1);

        await apiContext.dispose();
    });
});
