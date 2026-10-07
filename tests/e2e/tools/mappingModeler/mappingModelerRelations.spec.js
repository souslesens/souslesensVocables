// Which relations the MappingModeler offers between two class columns of the current table, read from the
// restrictions of the model: the Relations tab (R4) and the Ctrl+click between two columns (R5). A
// restriction set on a superclass applies to the subclasses, on both sides. Each test tells its case as a
// story, situation, action, result, with the screenshots and the data it captured attached in that order.
//
// Data: the PBS source of the dev triple store, read only. No mapping of PBS has class columns on these
// classes, so each test serves its own table, relations_test.csv, through page.route: the mapping file and
// the CSV are answered by the test, every save of the mapping is captured and answered by the test, so
// nothing is written on the server nor in the triple store.
//
//   SLS_TEST_TICKET=2220-relation-heritee-sous-classes \
//     PLAYWRIGHT_JSON_OUTPUT_NAME=test-results/2220-relation-heritee-sous-classes/results.json \
//     npx playwright test tests/e2e/tools/mappingModeler/mappingModelerRelations.spec.js --workers=1 --reporter=line,json
// SLS_URL (or TEST_BASE_URL) points the same spec at the old code served on another port.

/* global window, document, $, getComputedStyle, MappingModeler, MappingColumnsGraph, Config, Sparql_proxy, Sparql_common */
import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const localhostUrlRegex = /^http:\/\/localhost(:\d+)?$/;
const baseUrl = process.env.SLS_URL || process.env.TEST_BASE_URL || "http://localhost:3010";

// the restriction queries of PBS are large: a timing-out query takes a shared Virtuoso down
if (!localhostUrlRegex.test(baseUrl)) {
    throw new Error("mappingModelerRelations.spec.js only runs against a local server, not " + baseUrl);
}

const appSourcesUrlPrefix = baseUrl + "/vocables/";
// the Playwright of the repo expects a headless shell that is not installed on this machine
const localChromiumPath = process.env.SLS_CHROMIUM_PATH || path.join(process.env.LOCALAPPDATA || "", "ms-playwright/chromium-1234/chrome-win64/chrome.exe");
const launchOptions = fs.existsSync(localChromiumPath) ? { executablePath: localChromiumPath } : {};

// screenshots at twice the screen resolution, so that a cropped graph label stays readable
test.use({ baseURL: baseUrl, viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2, launchOptions });
test.describe.configure({ timeout: 300000 });

// ---------- model and test table ----------

const activeSource = "PBS";
const pbsNamespace = "http://totalenergies/resources/tsf/ontology/pbs/";
const owlNamespace = "http://www.w3.org/2002/07/owl#";
const classUris = {
    module: pbsNamespace + "Module",
    subProduct: pbsNamespace + "Sub-Product",
    accommodation: pbsNamespace + "Accommodation",
    topsides: pbsNamespace + "Topsides",
    mooring: pbsNamespace + "Mooring",
    fpso: pbsNamespace + "FPSO",
    product: pbsNamespace + "Product",
    materialProduct: "https://spec.industrialontologies.org/ontology/construct/MaterialProduct",
};
// the rules page calls it "continuant part of", BFO labels it "member part of at all times"
const memberPartOfAtAllTimes = "http://purl.obolibrary.org/obo/BFO_0000173";
const someValuesFrom = owlNamespace + "someValuesFrom";

const testTableName = "relations_test.csv";
const mappingFileName = `mappings_${activeSource}_ALL.json`;
const relationsTreeSelector = "#mappingModelerRelations_jstreeDiv";
const propertiesTreeSelector = "#suggestionsSelectJstreeDiv";
const relationsTabSelector = "a[href='#MappingModeler_RelationsTab']";
const columnsTabSelector = "a[href='#MappingModeler_columnsTab']";
const applyRelationsButtonSelector = "button[title='applyColumnRelations']";
// the dialog the Ctrl+click opens when it does not know the restriction type of the chosen property
const restrictionTypeDialogText = "choose cardinality type";
const highlightColor = "rgb(255, 255, 0)";

// one class column per class, named after the class label as a user would name it
const columnsByName = {
    Module: { classUri: classUris.module, classSource: activeSource, classPrefix: "pbs" },
    "Sub-Product": { classUri: classUris.subProduct, classSource: activeSource, classPrefix: "pbs" },
    Accommodation: { classUri: classUris.accommodation, classSource: activeSource, classPrefix: "pbs" },
    Topsides: { classUri: classUris.topsides, classSource: activeSource, classPrefix: "pbs" },
    Mooring: { classUri: classUris.mooring, classSource: activeSource, classPrefix: "pbs" },
    FPSO: { classUri: classUris.fpso, classSource: activeSource, classPrefix: "pbs" },
    Product: { classUri: classUris.product, classSource: activeSource, classPrefix: "pbs" },
    MaterialProduct: { classUri: classUris.materialProduct, classSource: "IOF-CORE-2026", classPrefix: "iof" },
};

function columnNodeId(columnName) {
    return "column_" + columnName;
}

// the mapping file MappingModeler loads, in the shape it saves: a CSV table, its class columns, each
// column tied to its class by subClassOf
function testMapping(columnNames) {
    const nodes = [{ id: testTableName, label: testTableName, shape: "box", color: "#d8cacd", level: 1, data: { id: testTableName, label: testTableName, type: "Table", dataTable: testTableName, datasource: testTableName } }];
    const edges = [];
    for (const [columnIndex, columnName] of columnNames.entries()) {
        const column = columnsByName[columnName];
        nodes.push({
            id: columnNodeId(columnName),
            label: columnName,
            shape: "box",
            color: "#cb9801",
            level: 2,
            data: { id: columnName, label: columnName, type: "Column", dataTable: testTableName, datasource: testTableName, uriType: "fromLabel", rdfType: "owl:Class", isMainColumn: columnIndex === 0 },
        });
        const classLabel = `${column.classPrefix}:${localName(column.classUri)}`;
        nodes.push({ id: column.classUri, label: classLabel, shape: "box", color: "#00afef", level: 3, data: { id: column.classUri, label: classLabel, type: "Class", source: column.classSource } });
        edges.push({ id: "tableEdge_" + columnName, from: testTableName, to: columnNodeId(columnName), color: "#8f8a8c", width: 3 });
        edges.push({
            id: "classEdge_" + columnName,
            from: columnNodeId(columnName),
            to: column.classUri,
            label: "subClassOf",
            width: 3,
            data: { type: "rdfs:subClassOf" },
            arrows: { to: { enabled: true, type: "arrow" } },
            color: "#00afef",
        });
    }
    const layout = { hierarchical: { direction: "DU", sortMethod: "hubsize", levelSeparation: 300, nodeSpacing: 200 } };
    return {
        nodes,
        edges,
        context: { divId: "mappingModeler_graphDiv", options: { keepNodePositionOnDrag: true, physics: { enabled: false }, visjsOptions: { layout, physics: { enabled: false } } } },
        positions: {},
        options: { config: { sparqlServerUrl: "_default", graphUri: pbsNamespace, prefixes: {}, lookups: {}, databaseSources: {}, csvSources: { [testTableName]: {} }, isConfigInMappingGraph: true } },
    };
}

// the server only sees reads of the model: the test answers the mapping file, the CSV and every save
async function serveTestTable(page, columnNames) {
    const savedMappings = [];
    await page.route("**/api/v1/data/file**", async (route) => {
        const request = route.request();
        if (request.method() === "GET" && new URL(request.url()).searchParams.get("fileName") === mappingFileName) {
            // the endpoint answers the file text as a JSON string
            return route.fulfill({ contentType: "application/json", body: JSON.stringify(JSON.stringify(testMapping(columnNames))) });
        }
        if (request.method() === "POST") {
            const postParameters = new URLSearchParams(request.postData() || "");
            savedMappings.push({ fileName: postParameters.get("fileName"), mapping: JSON.parse(postParameters.get("data")) });
            return route.fulfill({ contentType: "application/json", body: "{}" });
        }
        return route.continue();
    });
    await page.route("**/api/v1/data/csv**", (route) => {
        const sampleRow = {};
        for (const columnName of columnNames) {
            sampleRow[columnName] = columnName + "_1";
        }
        return route.fulfill({ contentType: "application/json", body: JSON.stringify({ headers: columnNames, data: [[sampleRow]] }) });
    });
    return savedMappings;
}

// ---------- browser state ----------

const quietPeriodMs = 2000;
const pollIntervalMs = 250;
const quietTimeoutMs = 180000;

// the SPARQL requests of the page, with what each response holds, to wait for the page to settle and to
// show what the application read
function trackSparqlTraffic(page) {
    const traffic = { pendingCount: 0, lastActivity: Date.now(), exchanges: [] };
    page.on("request", (request) => {
        if (request.url().includes("sparqlProxy")) {
            traffic.pendingCount++;
            traffic.lastActivity = Date.now();
        }
    });
    const onRequestDone = (request) => {
        if (request.url().includes("sparqlProxy")) {
            traffic.pendingCount--;
            traffic.lastActivity = Date.now();
        }
    };
    page.on("requestfinished", onRequestDone);
    page.on("requestfailed", onRequestDone);
    page.on("response", async (response) => {
        if (!response.url().includes("sparqlProxy")) {
            return;
        }
        try {
            const proxyBody = JSON.parse(new URLSearchParams(response.request().postData() || "").get("body"));
            const sparqlResult = await response.json();
            traffic.exchanges.push({ query: proxyBody.params.query, bindings: sparqlResult.results ? sparqlResult.results.bindings : [] });
        } catch (error) {
            traffic.exchanges.push({ query: null, bindings: [], error: String(error) });
        }
    });
    return traffic;
}

async function waitForQuietNetwork(page, traffic) {
    const start = Date.now();
    while (Date.now() - start < quietTimeoutMs) {
        if (traffic.pendingCount <= 0 && Date.now() - traffic.lastActivity > quietPeriodMs) {
            return;
        }
        await page.waitForTimeout(pollIntervalMs);
    }
    throw new Error("the SPARQL requests of the page never settled");
}

// an alert closed without anyone reading it would hide a failure
function recordDialogs(page) {
    const dialogMessages = [];
    page.on("dialog", (dialog) => {
        dialogMessages.push(dialog.message());
        dialog.dismiss();
    });
    return dialogMessages;
}

async function nodeScreenBox(page, nodeIds) {
    return page.evaluate((nodeIds) => {
        var network = MappingColumnsGraph.visjsGraph.network;
        var containerBox = network.body.container.getBoundingClientRect();
        var corners = [];
        nodeIds.forEach(function (nodeId) {
            var canvasBox = network.getBoundingBox(nodeId);
            corners.push(network.canvasToDOM({ x: canvasBox.left, y: canvasBox.top }));
            corners.push(network.canvasToDOM({ x: canvasBox.right, y: canvasBox.bottom }));
        });
        var horizontals = corners.map((corner) => corner.x);
        var verticals = corners.map((corner) => corner.y);
        return { left: containerBox.left + Math.min(...horizontals), top: containerBox.top + Math.min(...verticals), right: containerBox.left + Math.max(...horizontals), bottom: containerBox.top + Math.max(...verticals) };
    }, nodeIds);
}

async function clickGraphNode(page, nodeId, modifiers) {
    const box = await nodeScreenBox(page, [nodeId]);
    await page.mouse.move((box.left + box.right) / 2, (box.top + box.bottom) / 2);
    for (const modifier of modifiers) {
        await page.keyboard.down(modifier);
    }
    await page.mouse.down();
    await page.mouse.up();
    for (const modifier of modifiers) {
        await page.keyboard.up(modifier);
    }
}

// MappingModeler on PBS, the test table selected as a user does, by a click on its node
async function openTestTable(page, columnNames) {
    const dialogMessages = recordDialogs(page);
    const savedMappings = await serveTestTable(page, columnNames);
    const traffic = trackSparqlTraffic(page);
    await page.goto(`/vocables/?tool=MappingModeler&source=${activeSource}`);
    await page.waitForFunction(
        ([source, tableName]) => window.MappingModeler && MappingModeler.currentSLSsource == source && MappingColumnsGraph.visjsGraph && MappingColumnsGraph.visjsGraph.data && MappingColumnsGraph.visjsGraph.data.nodes.get(tableName),
        [activeSource, testTableName],
        { timeout: 120000 },
    );
    await waitForQuietNetwork(page, traffic);
    await clickGraphNode(page, testTableName, []);
    await page.waitForFunction((tableName) => MappingModeler.currentTable && MappingModeler.currentTable.name == tableName, testTableName, { timeout: 60000 });
    await waitForQuietNetwork(page, traffic);
    return { dialogMessages, savedMappings, traffic };
}

// the possible relations of the Relations tab, one entry per line of its Restrictions tree
async function readRelationLines(page) {
    return page.evaluate((treeSelector) => {
        var tree = $(treeSelector).jstree(true);
        if (!tree) {
            return [];
        }
        var treeNodes = tree.get_json("#", { flat: true });
        var lineNodes = treeNodes.filter((treeNode) => treeNode.data && treeNode.data.property);
        return lineNodes.map((lineNode) => ({
            id: lineNode.id,
            text: lineNode.text,
            fromColumnId: lineNode.data.fromColumn.id,
            fromColumnLabel: lineNode.data.fromColumn.label,
            toColumnId: lineNode.data.toColumn.id,
            toColumnLabel: lineNode.data.toColumn.label,
            propertyId: lineNode.data.property.id,
            propertyLabel: lineNode.data.property.label,
            restrictionType: lineNode.data.restrictionType,
            cardinality: lineNode.data.cardinality,
            isAlreadyExisting: Boolean(lineNode.data.isAlreadyExisting),
            isDisabled: Boolean(lineNode.state && lineNode.state.disabled),
        }));
    }, relationsTreeSelector);
}

async function openRelationsTab(page, traffic) {
    await page.click(relationsTabSelector);
    await waitForQuietNetwork(page, traffic);
    return readRelationLines(page);
}

function linesBetween(relationLines, fromColumnName, toColumnName, propertyUri) {
    return relationLines.filter(
        (relationLine) => relationLine.fromColumnId === columnNodeId(fromColumnName) && relationLine.toColumnId === columnNodeId(toColumnName) && relationLine.propertyId === propertyUri,
    );
}

async function checkRelationLine(page, lineId) {
    await page.click(`[id="${lineId}_anchor"] .jstree-checkbox`);
    return page.evaluate(([treeSelector, lineId]) => $(treeSelector).jstree(true).get_checked().indexOf(lineId) > -1, [relationsTreeSelector, lineId]);
}

// waits for a save of the mapping after the action, the last one being the state left on disk
async function lastSaveAfter(page, savedMappings, traffic, action) {
    const saveCountBefore = savedMappings.length;
    await action();
    await expect.poll(() => savedMappings.length, { timeout: 60000 }).toBeGreaterThan(saveCountBefore);
    await waitForQuietNetwork(page, traffic);
    return savedMappings[savedMappings.length - 1];
}

function storedRelationEdges(savedMapping, fromColumnName, toColumnName) {
    return savedMapping.mapping.edges.filter((edge) => edge.from === columnNodeId(fromColumnName) && edge.to === columnNodeId(toColumnName) && edge.data && edge.data.restrictionType !== undefined);
}

// Ctrl+click on one column then on the other, as a user draws a relation
async function ctrlClickColumns(page, traffic, fromColumnName, toColumnName) {
    await clickGraphNode(page, columnNodeId(fromColumnName), ["Control"]);
    await clickGraphNode(page, columnNodeId(toColumnName), ["Control"]);
    await waitForQuietNetwork(page, traffic);
    await page.waitForFunction((treeSelector) => $(treeSelector).jstree(true) && $(treeSelector).jstree(true).get_node("Properties"), propertiesTreeSelector, { timeout: 60000 });
}

// the properties the Ctrl+click lists, with the group they are listed under and whether they are highlighted
async function readListedProperties(page) {
    return page.evaluate(
        ([treeSelector, highlightColor]) => {
            var tree = $(treeSelector).jstree(true);
            var treeNodes = tree.get_json("#", { flat: true });
            return treeNodes.map((treeNode) => {
                var anchor = document.getElementById(treeNode.id + "_anchor");
                var paintedElements = anchor ? [anchor].concat(Array.from(anchor.querySelectorAll("*"))) : [];
                var isHighlighted = paintedElements.some((paintedElement) => getComputedStyle(paintedElement).backgroundColor === highlightColor);
                return { id: treeNode.id, label: anchor ? anchor.innerText.trim() : treeNode.text, group: treeNode.parent, isHighlighted: isHighlighted };
            });
        },
        [propertiesTreeSelector, highlightColor],
    );
}

async function visibleDialogTexts(page) {
    return page.evaluate(() => {
        var dialogs = Array.from(document.querySelectorAll(".ui-dialog"));
        var shownDialogs = dialogs.filter((dialog) => dialog.offsetParent);
        return shownDialogs.map((dialog) => dialog.innerText.trim());
    });
}

// the subclass links among the given classes and the restrictions of a property they bear, as the
// triple store holds them in the active source and its imports
async function readModelFacts(page, classUriList, propertyUri) {
    const valuesList = classUriList.map((classUri) => `<${classUri}>`).join(" ");
    return page.evaluate(
        ([source, valuesList, propertyUri]) =>
            new Promise((resolve, reject) => {
                var url = Config.sources[source].sparql_server.url + "?format=json&query=";
                var fromStr = Sparql_common.getFromStr(source);
                var prefixes = "PREFIX owl: <http://www.w3.org/2002/07/owl#> PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> ";
                var subClassQuery = prefixes + "SELECT DISTINCT ?class ?parent " + fromStr + " WHERE { VALUES ?class { " + valuesList + " } VALUES ?parent { " + valuesList + " } ?class rdfs:subClassOf ?parent }";
                var restrictionQuery =
                    prefixes +
                    "SELECT DISTINCT ?bearer ?constraintType ?target ?cardinalityType ?cardinalityValue " +
                    fromStr +
                    " WHERE { VALUES ?bearer { " +
                    valuesList +
                    " } VALUES ?target { " +
                    valuesList +
                    " } ?bearer rdfs:subClassOf ?restriction . ?restriction owl:onProperty <" +
                    propertyUri +
                    "> ; ?constraintType ?target . FILTER(?constraintType IN (owl:someValuesFrom, owl:allValuesFrom, owl:onClass)) OPTIONAL { ?restriction ?cardinalityType ?cardinalityValue FILTER(?cardinalityType IN (owl:qualifiedCardinality, owl:minQualifiedCardinality, owl:maxQualifiedCardinality, owl:cardinality, owl:minCardinality, owl:maxCardinality)) } }";
                var labelQuery = prefixes + "SELECT DISTINCT ?class ?classLabel " + fromStr + " WHERE { VALUES ?class { " + valuesList + " } ?class rdfs:label ?classLabel }";
                var answers = {};
                var queries = { subClass: subClassQuery, restriction: restrictionQuery, label: labelQuery };
                var queryNames = Object.keys(queries);
                var remainingCount = queryNames.length;
                queryNames.forEach(function (queryName) {
                    Sparql_proxy.querySPARQL_GET_proxy(url, queries[queryName], "", { source: source }, function (error, result) {
                        if (error) {
                            return reject(String(error));
                        }
                        answers[queryName] = { query: queries[queryName], bindings: result.results.bindings };
                        remainingCount--;
                        if (remainingCount === 0) {
                            resolve(answers);
                        }
                    });
                });
            }),
        [activeSource, valuesList, propertyUri],
    );
}

function bindingValue(binding, variableName) {
    return binding[variableName] ? binding[variableName].value : null;
}

function labelsByClass(modelFacts) {
    const classLabels = {};
    for (const binding of modelFacts.label.bindings) {
        classLabels[bindingValue(binding, "class")] = bindingValue(binding, "classLabel");
    }
    return classLabels;
}

function modelRestrictions(modelFacts) {
    return modelFacts.restriction.bindings.map((binding) => ({
        bearer: bindingValue(binding, "bearer"),
        constraintType: bindingValue(binding, "constraintType"),
        target: bindingValue(binding, "target"),
        cardinalityType: bindingValue(binding, "cardinalityType"),
        cardinalityValue: bindingValue(binding, "cardinalityValue"),
    }));
}

function modelSubClassLinks(modelFacts) {
    return modelFacts.subClass.bindings.map((binding) => ({ subClass: bindingValue(binding, "class"), superClass: bindingValue(binding, "parent") }));
}

// whether a restriction between two classes is among the rows the page received while computing,
// so that an absence cannot come from a truncated answer
function isRestrictionReceived(traffic, bearerUri, targetUri) {
    return traffic.exchanges.some((exchange) =>
        exchange.bindings.some((binding) => {
            const boundValues = Object.values(binding).map((boundTerm) => boundTerm.value);
            return boundValues.includes(bearerUri) && boundValues.includes(targetUri);
        }),
    );
}

// each query shown from its WHERE on, with its LIMIT: an answer as long as its limit is truncated
function sparqlRowCounts(traffic) {
    return traffic.exchanges.map((exchange) => {
        const queryText = String(exchange.query);
        const whereMatch = queryText.match(whereKeywordRegex);
        const limitMatch = queryText.match(limitClauseRegex);
        const wherePart = whereMatch ? queryText.slice(whereMatch.index) : queryText;
        return { wherePart: wherePart.slice(0, 160), rowLimit: limitMatch ? Number(limitMatch[1]) : null, rowCount: exchange.bindings.length };
    });
}

// ---------- proofs ----------

const proofMarginPixels = 8;
const graphMarginPixels = 40;
const propertyShotLinesAround = 4;
const mermaidUnsafeCharRegex = /["<>]/g;
// mermaid entity codes, a raw quote or angle bracket breaks the box label
const mermaidEntityByChar = { '"': "#quot;", "<": "#lt;", ">": "#gt;" };
const uriLocalNameRegex = /[^/#]+$/;
const whereKeywordRegex = /where\s*\{/i;
const limitClauseRegex = /limit\s+(\d+)/i;

// line coverage of the client code, read by the coverage script of rdd-preuves
test.beforeEach(async ({ page }) => {
    await page.coverage.startJSCoverage({ resetOnNavigation: false });
});

test.afterEach(async ({ page }, testInfo) => {
    const coverageEntries = await page.coverage.stopJSCoverage();
    const appCoverageEntries = coverageEntries.filter((coverageEntry) => coverageEntry.url.startsWith(appSourcesUrlPrefix));
    const coveragePath = testInfo.outputPath("couverture.json");
    fs.writeFileSync(coveragePath, JSON.stringify(appCoverageEntries));
    await testInfo.attach("couverture.json", { path: coveragePath, contentType: "application/json" });
    await page.unrouteAll({ behavior: "ignoreErrors" });
});

function localName(uri) {
    const nameMatch = String(uri).match(uriLocalNameRegex);
    return nameMatch ? nameMatch[0] : String(uri);
}

async function attachClip(testInfo, page, fileName, box) {
    const filePath = testInfo.outputPath(fileName);
    await page.screenshot({ path: filePath, clip: { x: box.left, y: box.top, width: box.right - box.left, height: box.bottom - box.top } });
    await testInfo.attach(fileName, { path: filePath, contentType: "image/png" });
}

async function locatorsBox(locators, marginPixels) {
    const boxes = [];
    for (const locator of locators) {
        boxes.push(await locator.boundingBox());
    }
    const lefts = boxes.map((box) => box.x);
    const tops = boxes.map((box) => box.y);
    const rights = boxes.map((box) => box.x + box.width);
    const bottoms = boxes.map((box) => box.y + box.height);
    return { left: Math.max(Math.min(...lefts) - marginPixels, 0), top: Math.max(Math.min(...tops) - marginPixels, 0), right: Math.max(...rights) + marginPixels, bottom: Math.max(...bottoms) + marginPixels };
}

// the source bar and the current table: PBS active, relations_test.csv selected
async function attachSourceShot(testInfo, page, fileName) {
    const box = await locatorsBox([page.locator("#lineage_drawnSources"), page.locator("#MappingModeler_currentDataSourceDiv")], proofMarginPixels);
    await attachClip(testInfo, page, fileName, box);
}

// the columns of the case and their classes, on the columns graph
async function attachColumnsShot(testInfo, page, fileName, columnNames) {
    const nodeIds = [];
    for (const columnName of columnNames) {
        nodeIds.push(columnNodeId(columnName), columnsByName[columnName].classUri);
    }
    await page.evaluate((nodeIds) => MappingColumnsGraph.visjsGraph.network.fit({ nodes: nodeIds, animation: false }), nodeIds);
    const box = await nodeScreenBox(page, nodeIds);
    await attachClip(testInfo, page, fileName, { left: box.left - graphMarginPixels, top: box.top - graphMarginPixels, right: box.right + graphMarginPixels, bottom: box.bottom + graphMarginPixels });
}

// the Restrictions tree is in a 400 px box: it is widened so that a whole line reads on the screenshot
async function attachRelationsTreeShot(testInfo, page, fileName, extraLocators) {
    await page.evaluate((treeSelector) => {
        var tree = document.querySelector(treeSelector);
        tree.parentElement.style.width = "max-content";
        tree.parentElement.style.overflow = "visible";
        tree.style.width = "max-content";
    }, relationsTreeSelector);
    const box = await locatorsBox([page.locator(relationsTreeSelector), ...extraLocators], proofMarginPixels);
    await attachClip(testInfo, page, fileName, box);
}

// the listed property with the lines around it, its group header included when near
async function attachListedPropertyShot(testInfo, page, fileName, propertyUri) {
    const anchor = page.locator(`[id="${propertyUri}_anchor"]`);
    await anchor.scrollIntoViewIfNeeded();
    const anchorBox = await anchor.boundingBox();
    const treeBox = await page.locator(propertiesTreeSelector).boundingBox();
    const shotTop = Math.max(anchorBox.y - propertyShotLinesAround * anchorBox.height, treeBox.y);
    const shotBottom = anchorBox.y + (propertyShotLinesAround + 1) * anchorBox.height;
    await attachClip(testInfo, page, fileName, { left: treeBox.x, top: shotTop, right: treeBox.x + treeBox.width, bottom: shotBottom });
}

async function attachElementShot(testInfo, page, fileName, locator) {
    const box = await locatorsBox([locator], proofMarginPixels);
    await attachClip(testInfo, page, fileName, box);
}

// a schema drawn from data the test captured, attached with that raw data
async function attachSchema(testInfo, attachmentName, mermaidLines, rawData) {
    const schemaPath = testInfo.outputPath(attachmentName + ".mmd");
    const rawDataPath = testInfo.outputPath(attachmentName + ".json");
    fs.writeFileSync(schemaPath, mermaidLines.join("\n"));
    fs.writeFileSync(rawDataPath, JSON.stringify(rawData, null, 2));
    await testInfo.attach(attachmentName + ".mmd", { path: schemaPath, contentType: "text/plain" });
    await testInfo.attach(attachmentName + ".json", { path: rawDataPath, contentType: "application/json" });
}

// the lines of one mermaid box, each escaped, joined by mermaid line breaks
function mermaidText(textLines) {
    const escapedLines = textLines.map((textLine) => String(textLine).replace(mermaidUnsafeCharRegex, (unsafeChar) => mermaidEntityByChar[unsafeChar]));
    return escapedLines.join("<br/>");
}

function restrictionText(restriction) {
    const cardinalityText = restriction.cardinalityType ? ` ${localName(restriction.cardinalityType)} ${restriction.cardinalityValue}` : "";
    return `${localName(restriction.constraintType)}${cardinalityText}`;
}

// the classes of the case, their subclass links and the restrictions of the property they bear
function modelFactsSchema(modelFacts, propertyUri) {
    const classLabels = labelsByClass(modelFacts);
    const mermaidLines = ["flowchart BT"];
    const classIds = {};
    const classIdOf = (classUri) => {
        if (!classIds[classUri]) {
            classIds[classUri] = "modelClass" + Object.keys(classIds).length;
            const classLabel = classLabels[classUri] || localName(classUri);
            const boxLines = classLabel === localName(classUri) ? [classLabel] : [classLabel, localName(classUri)];
            mermaidLines.push(`  ${classIds[classUri]}["${mermaidText(boxLines)}"]`);
        }
        return classIds[classUri];
    };
    for (const subClassLink of modelSubClassLinks(modelFacts)) {
        mermaidLines.push(`  ${classIdOf(subClassLink.subClass)} -. "${mermaidText(["subClassOf"])}" .-> ${classIdOf(subClassLink.superClass)}`);
    }
    for (const restriction of modelRestrictions(modelFacts)) {
        mermaidLines.push(`  ${classIdOf(restriction.bearer)} == "${mermaidText([`restriction ${localName(propertyUri)}`, restrictionText(restriction)])}" ==> ${classIdOf(restriction.target)}`);
    }
    return mermaidLines;
}

function relationLineText(relationLine) {
    const cardinalityText = relationLine.cardinality ? ` ${JSON.stringify(relationLine.cardinality)}` : "";
    return `${relationLine.propertyLabel} ${localName(relationLine.restrictionType)}${cardinalityText}`;
}

// the lines of the Relations tab for one pair of columns and one property, each with its state
function relationLinesSchema(title, matchingLines) {
    const mermaidLines = ["flowchart LR", `  title["${mermaidText([title, `lignes trouvées : ${matchingLines.length}`])}"]`];
    for (const [lineIndex, relationLine] of matchingLines.entries()) {
        const stateText = relationLine.isDisabled ? "grisée" : "active";
        mermaidLines.push(`  from${lineIndex}["${mermaidText([`colonne ${relationLine.fromColumnLabel}`])}"] -- "${mermaidText([relationLineText(relationLine)])}" --> to${lineIndex}["${mermaidText([`colonne ${relationLine.toColumnLabel}`])}"]`);
        mermaidLines.push(`  state${lineIndex}(["${mermaidText([`ligne ${stateText}`, `isAlreadyExisting : ${relationLine.isAlreadyExisting}`])}"])`);
        mermaidLines.push(`  title ~~~ from${lineIndex}`);
        mermaidLines.push(`  to${lineIndex} ~~~ state${lineIndex}`);
    }
    return mermaidLines;
}

// the relation edge of the mapping the application saved, with what was on screen when it was saved
function storedEdgeSchema(savedMapping, storedEdges, shownDialogs) {
    const columnLabels = {};
    for (const node of savedMapping.mapping.nodes) {
        columnLabels[node.id] = node.label;
    }
    const mermaidLines = ["flowchart LR", `  file["${mermaidText([`${savedMapping.fileName} enregistré`, `arêtes de relation entre les deux colonnes : ${storedEdges.length}`])}"]`];
    for (const [edgeIndex, storedEdge] of storedEdges.entries()) {
        const edgeText = mermaidText([`id : ${localName(storedEdge.data.id)}`, `restrictionType : ${localName(storedEdge.data.restrictionType)}`, `cardinality : ${JSON.stringify(storedEdge.data.cardinality)}`]);
        mermaidLines.push(`  from${edgeIndex}["${mermaidText([`colonne ${columnLabels[storedEdge.from]}`])}"] -- "${edgeText}" --> to${edgeIndex}["${mermaidText([`colonne ${columnLabels[storedEdge.to]}`])}"]`);
        mermaidLines.push(`  file ~~~ from${edgeIndex}`);
    }
    if (shownDialogs) {
        mermaidLines.push(`  file ~~~ dialogs(["${mermaidText([`dialogues ouverts à la sélection : ${shownDialogs.length ? shownDialogs.join(" / ") : "aucun"}`])}"])`);
    }
    return mermaidLines;
}

// a listed property of the Ctrl+click and the group it is listed under
function listedPropertySchema(title, listedProperty) {
    const mermaidLines = ["flowchart LR", `  title["${mermaidText([title])}"]`];
    if (!listedProperty) {
        mermaidLines.push(`  title --> missing["${mermaidText(["absente de la liste"])}"]`);
        return mermaidLines;
    }
    mermaidLines.push(`  title --> group["${mermaidText([`groupe ${listedProperty.group}`])}"] --> property["${mermaidText([listedProperty.label, localName(listedProperty.id), `surlignée : ${listedProperty.isHighlighted ? "oui" : "non"}`])}"]`);
    return mermaidLines;
}

// what the page received while the Relations tab computed its lines
function receivedRowsSchema(rowCounts, restrictionChecks) {
    const countLines = rowCounts.map((rowCount) => `${rowCount.rowCount} lignes reçues, LIMIT ${rowCount.rowLimit === null ? "aucun" : rowCount.rowLimit} : ${rowCount.wherePart.slice(0, 60)}`);
    const checkLines = restrictionChecks.map((restrictionCheck) => `${restrictionCheck.label} reçue : ${restrictionCheck.isReceived ? "oui" : "non"}`);
    return ["flowchart LR", `  queries["${mermaidText(["Réponses SPARQL reçues pendant le calcul", ...countLines])}"] --> checks["${mermaidText(checkLines)}"]`];
}

// ---------- assertions and steps shared by the stories ----------

async function proveModelSituation(testInfo, page, classUriList) {
    const modelFacts = await readModelFacts(page, classUriList, memberPartOfAtAllTimes);
    await attachSchema(testInfo, "1_situation_modele", modelFactsSchema(modelFacts, memberPartOfAtAllTimes), modelFacts);
    return modelFacts;
}

function expectSubClassLink(modelFacts, subClassUri, superClassUri) {
    expect(modelSubClassLinks(modelFacts)).toContainEqual({ subClass: subClassUri, superClass: superClassUri });
}

function expectModelRestriction(modelFacts, bearerUri, targetUri) {
    const matchingRestrictions = modelRestrictions(modelFacts).filter((restriction) => restriction.bearer === bearerUri && restriction.target === targetUri);
    expect(matchingRestrictions.length).toBeGreaterThan(0);
    return matchingRestrictions[0];
}

async function attachReceivedRestrictions(testInfo, traffic, restrictionChecks) {
    const checkedRestrictions = restrictionChecks.map((restrictionCheck) => ({ ...restrictionCheck, isReceived: isRestrictionReceived(traffic, restrictionCheck.bearer, restrictionCheck.target) }));
    const rowCounts = sparqlRowCounts(traffic);
    await attachSchema(testInfo, "3_resultat_reponses", receivedRowsSchema(rowCounts, checkedRestrictions), { rowCounts, checkedRestrictions });
}

// situation, action and result of a case where the Relations tab must offer a line: the line is ticked
// on screen, its data drawn as a schema, next to what the page received when restrictionChecks are given
async function proveOfferedLine(testInfo, page, session, fromColumnName, toColumnName, restrictionChecks) {
    await attachElementShot(testInfo, page, "2_action_onglet_relations.png", page.locator(relationsTabSelector));
    session.traffic.exchanges.length = 0;
    const relationLines = await openRelationsTab(page, session.traffic);
    const matchingLines = linesBetween(relationLines, fromColumnName, toColumnName, memberPartOfAtAllTimes);
    await attachSchema(testInfo, "3_resultat_lignes", relationLinesSchema(`Onglet Relations, colonne ${fromColumnName} vers colonne ${toColumnName}, ${localName(memberPartOfAtAllTimes)}`, matchingLines), {
        matchingLines,
        allLines: relationLines,
    });
    if (restrictionChecks) {
        await attachReceivedRestrictions(testInfo, session.traffic, restrictionChecks);
    }
    expect(matchingLines.length).toBeGreaterThan(0);
    expect(await checkRelationLine(page, matchingLines[0].id)).toBe(true);
    await attachRelationsTreeShot(testInfo, page, "3_resultat_ligne_cochee.png", []);
    return { relationLines, matchingLines };
}

// situation, action and result of a case where the Relations tab must not offer the restriction: the
// lines of the pair are drawn from the tree data, next to what the page received while computing them
async function proveNotOfferedLine(testInfo, page, session, fromColumnName, toColumnName, restrictionChecks) {
    await attachElementShot(testInfo, page, "2_action_onglet_relations.png", page.locator(relationsTabSelector));
    session.traffic.exchanges.length = 0;
    const relationLines = await openRelationsTab(page, session.traffic);
    const matchingLines = linesBetween(relationLines, fromColumnName, toColumnName, memberPartOfAtAllTimes);
    await attachRelationsTreeShot(testInfo, page, "3_resultat_arbre.png", []);
    await attachSchema(testInfo, "3_resultat_lignes", relationLinesSchema(`Onglet Relations, colonne ${fromColumnName} vers colonne ${toColumnName}, ${localName(memberPartOfAtAllTimes)}`, matchingLines), {
        matchingLines,
        allLines: relationLines,
    });
    await attachReceivedRestrictions(testInfo, session.traffic, restrictionChecks);
    expect(matchingLines).toEqual([]);
}

async function applyCheckedLine(testInfo, page, session, matchingLine, fromColumnName, toColumnName) {
    await attachRelationsTreeShot(testInfo, page, "2_action_appliquer.png", [page.locator(applyRelationsButtonSelector)]);
    const savedMapping = await lastSaveAfter(page, session.savedMappings, session.traffic, () => page.click(applyRelationsButtonSelector));
    const storedEdges = storedRelationEdges(savedMapping, fromColumnName, toColumnName);
    const storedEdgesOfProperty = storedEdges.filter((storedEdge) => storedEdge.data.id === matchingLine.propertyId);
    await attachSchema(testInfo, "3_resultat_arete_enregistree", storedEdgeSchema(savedMapping, storedEdgesOfProperty, null), { fileName: savedMapping.fileName, storedEdges: storedEdgesOfProperty });
    return storedEdgesOfProperty;
}

// Ctrl+click from one column to the other: the property must be listed highlighted, and choosing it must
// draw the relation with the restriction type of the model, without the restriction type dialog
async function proveHighlightedProperty(testInfo, page, session, fromColumnName, toColumnName, expectedRestrictionType) {
    await ctrlClickColumns(page, session.traffic, fromColumnName, toColumnName);
    await attachElementShot(testInfo, page, "2_action_ctrlclic.png", page.locator("#mappingModeler_relationInfosDiv"));
    const listedProperties = await readListedProperties(page);
    const listedProperty = listedProperties.find((candidateProperty) => candidateProperty.id === memberPartOfAtAllTimes);
    await attachSchema(testInfo, "3_resultat_surlignage", listedPropertySchema(`Liste du Ctrl+clic ${fromColumnName} vers ${toColumnName}`, listedProperty), { listedProperty, listedProperties });
    expect(listedProperty).toBeDefined();
    await attachListedPropertyShot(testInfo, page, "3_resultat_propriete_surlignee.png", memberPartOfAtAllTimes);
    expect(listedProperty.isHighlighted).toBe(true);

    // choosing the property either draws and saves the relation, or opens the restriction type dialog
    const saveCountBefore = session.savedMappings.length;
    await page.click(`[id="${memberPartOfAtAllTimes}_anchor"]`);
    await expect
        .poll(
            async () => {
                const dialogTexts = await visibleDialogTexts(page);
                const isTypeAsked = dialogTexts.some((dialogText) => dialogText.includes(restrictionTypeDialogText));
                return session.savedMappings.length > saveCountBefore || isTypeAsked;
            },
            { timeout: 60000 },
        )
        .toBe(true);
    await waitForQuietNetwork(page, session.traffic);
    const shownDialogs = await visibleDialogTexts(page);
    const savedMapping = session.savedMappings.length > saveCountBefore ? session.savedMappings[session.savedMappings.length - 1] : { fileName: "aucun", mapping: { nodes: [], edges: [] } };
    const storedEdges = storedRelationEdges(savedMapping, fromColumnName, toColumnName);
    await attachColumnsShot(testInfo, page, "3_resultat_relation_tracee.png", [fromColumnName, toColumnName]);
    await attachSchema(testInfo, "3_resultat_arete_enregistree", storedEdgeSchema(savedMapping, storedEdges, shownDialogs), { fileName: savedMapping.fileName, storedEdges, shownDialogs });
    const typeDialogs = shownDialogs.filter((dialogText) => dialogText.includes(restrictionTypeDialogText));
    expect(typeDialogs).toEqual([]);
    expect(storedEdges).toHaveLength(1);
    expect(storedEdges[0].data.id).toBe(memberPartOfAtAllTimes);
    expect(storedEdges[0].data.restrictionType).toBe(expectedRestrictionType);
}

// ---------- R4 · Relations tab ----------

test.describe("R4 · Le menu Relations propose les restrictions du modèle entre deux colonnes de classes de la table courante", () => {
    test("R4a Menu Relations : restriction posée exactement entre les deux classes des colonnes, proposée", async ({ page }, testInfo) => {
        const columnNames = ["Module", "Sub-Product"];
        const session = await openTestTable(page, columnNames);
        await attachSourceShot(testInfo, page, "0_contexte_R4_source.png");
        await attachColumnsShot(testInfo, page, "1_situation_colonnes.png", columnNames);
        const modelFacts = await proveModelSituation(testInfo, page, [classUris.module, classUris.subProduct]);
        expectModelRestriction(modelFacts, classUris.module, classUris.subProduct);

        const { matchingLines } = await proveOfferedLine(testInfo, page, session, "Module", "Sub-Product");

        expect(matchingLines[0].restrictionType).toBe(someValuesFrom);
        expect(session.dialogMessages).toEqual([]);
    });

    test("R4b Menu Relations : restriction héritée par la classe de départ, proposée", async ({ page }, testInfo) => {
        const columnNames = ["Accommodation", "Sub-Product"];
        const session = await openTestTable(page, columnNames);
        await attachSourceShot(testInfo, page, "0_contexte_R4_source.png");
        await attachColumnsShot(testInfo, page, "1_situation_colonnes.png", columnNames);
        const modelFacts = await proveModelSituation(testInfo, page, [classUris.accommodation, classUris.module, classUris.subProduct]);
        expectSubClassLink(modelFacts, classUris.accommodation, classUris.module);
        expectModelRestriction(modelFacts, classUris.module, classUris.subProduct);

        const { matchingLines } = await proveOfferedLine(testInfo, page, session, "Accommodation", "Sub-Product");

        expect(matchingLines[0].restrictionType).toBe(someValuesFrom);
        expect(session.dialogMessages).toEqual([]);
    });

    test("R4c Menu Relations : restriction dont la cible est une super-classe de la classe d'arrivée, proposée", async ({ page }, testInfo) => {
        const columnNames = ["Module", "Topsides"];
        const session = await openTestTable(page, columnNames);
        await attachSourceShot(testInfo, page, "0_contexte_R4_source.png");
        await attachColumnsShot(testInfo, page, "1_situation_colonnes.png", columnNames);
        const modelFacts = await proveModelSituation(testInfo, page, [classUris.module, classUris.subProduct, classUris.topsides]);
        expectSubClassLink(modelFacts, classUris.topsides, classUris.subProduct);
        expectModelRestriction(modelFacts, classUris.module, classUris.subProduct);

        const { matchingLines } = await proveOfferedLine(testInfo, page, session, "Module", "Topsides");

        expect(matchingLines[0].restrictionType).toBe(someValuesFrom);
        expect(session.dialogMessages).toEqual([]);
    });

    test("R4d Menu Relations : restriction héritée des deux côtés, proposée (cas du ticket)", async ({ page }, testInfo) => {
        const columnNames = ["Accommodation", "Topsides"];
        const session = await openTestTable(page, columnNames);
        await attachSourceShot(testInfo, page, "0_contexte_R4_source.png");
        await attachColumnsShot(testInfo, page, "1_situation_colonnes.png", columnNames);
        const modelFacts = await proveModelSituation(testInfo, page, [classUris.accommodation, classUris.module, classUris.subProduct, classUris.topsides]);
        expectSubClassLink(modelFacts, classUris.accommodation, classUris.module);
        expectSubClassLink(modelFacts, classUris.topsides, classUris.subProduct);
        expectModelRestriction(modelFacts, classUris.module, classUris.subProduct);

        const { matchingLines } = await proveOfferedLine(testInfo, page, session, "Accommodation", "Topsides");
        expect(matchingLines[0].restrictionType).toBe(someValuesFrom);
        const storedEdges = await applyCheckedLine(testInfo, page, session, matchingLines[0], "Accommodation", "Topsides");

        expect(storedEdges).toHaveLength(1);
        expect(storedEdges[0].data.restrictionType).toBe(someValuesFrom);
        expect(session.dialogMessages).toEqual([]);
    });

    test("R4e Menu Relations : une super-classe n'hérite pas de la restriction de sa sous-classe", async ({ page }, testInfo) => {
        const columnNames = ["MaterialProduct", "Product"];
        const session = await openTestTable(page, columnNames);
        await attachSourceShot(testInfo, page, "0_contexte_R4_source.png");
        await attachColumnsShot(testInfo, page, "1_situation_colonnes.png", columnNames);
        const modelFacts = await proveModelSituation(testInfo, page, [classUris.materialProduct, classUris.subProduct, classUris.product]);
        expectSubClassLink(modelFacts, classUris.subProduct, classUris.materialProduct);
        expectModelRestriction(modelFacts, classUris.subProduct, classUris.product);

        await proveNotOfferedLine(testInfo, page, session, "MaterialProduct", "Product", [{ label: "Restriction Sub-Product vers Product", bearer: classUris.subProduct, target: classUris.product }]);

        expect(session.dialogMessages).toEqual([]);
    });

    test("R4f Menu Relations : colonne d'arrivée sur une super-classe de la cible, pas proposée", async ({ page }, testInfo) => {
        const columnNames = ["Module", "MaterialProduct"];
        const session = await openTestTable(page, columnNames);
        await attachSourceShot(testInfo, page, "0_contexte_R4_source.png");
        await attachColumnsShot(testInfo, page, "1_situation_colonnes.png", columnNames);
        const modelFacts = await proveModelSituation(testInfo, page, [classUris.module, classUris.subProduct, classUris.materialProduct]);
        expectSubClassLink(modelFacts, classUris.subProduct, classUris.materialProduct);
        expectModelRestriction(modelFacts, classUris.module, classUris.subProduct);

        await proveNotOfferedLine(testInfo, page, session, "Module", "MaterialProduct", [{ label: "Restriction Module vers Sub-Product", bearer: classUris.module, target: classUris.subProduct }]);

        expect(session.dialogMessages).toEqual([]);
    });

    test("R4g Menu Relations : relation héritée déjà posée entre les deux colonnes, proposée grisée", async ({ page }, testInfo) => {
        const columnNames = ["Accommodation", "Topsides"];
        const session = await openTestTable(page, columnNames);
        await attachSourceShot(testInfo, page, "0_contexte_R4_source.png");
        await attachColumnsShot(testInfo, page, "1_situation_colonnes.png", columnNames);
        const modelFacts = await proveModelSituation(testInfo, page, [classUris.accommodation, classUris.module, classUris.subProduct, classUris.topsides]);
        expectModelRestriction(modelFacts, classUris.module, classUris.subProduct);
        // the relation is set once, as R4d sets it
        const firstLines = linesBetween(await openRelationsTab(page, session.traffic), "Accommodation", "Topsides", memberPartOfAtAllTimes);
        expect(firstLines.length).toBeGreaterThan(0);
        expect(await checkRelationLine(page, firstLines[0].id)).toBe(true);
        const savedMapping = await lastSaveAfter(page, session.savedMappings, session.traffic, () => page.click(applyRelationsButtonSelector));
        const storedEdges = storedRelationEdges(savedMapping, "Accommodation", "Topsides");
        await attachColumnsShot(testInfo, page, "1_situation_relation_posee.png", columnNames);
        await attachSchema(testInfo, "1_situation_arete_enregistree", storedEdgeSchema(savedMapping, storedEdges, null), { fileName: savedMapping.fileName, storedEdges });
        expect(storedEdges.length).toBeGreaterThan(0);

        await page.click(columnsTabSelector);
        await attachElementShot(testInfo, page, "2_action_onglet_relations.png", page.locator(relationsTabSelector));
        const relationLines = await openRelationsTab(page, session.traffic);
        const matchingLines = linesBetween(relationLines, "Accommodation", "Topsides", memberPartOfAtAllTimes);
        expect(matchingLines.length).toBeGreaterThan(0);
        const isCheckable = await checkRelationLine(page, matchingLines[0].id);
        await attachRelationsTreeShot(testInfo, page, "3_resultat_ligne_grisee.png", []);
        await attachSchema(testInfo, "3_resultat_lignes", relationLinesSchema("Onglet Relations rouvert, colonne Accommodation vers colonne Topsides", matchingLines), { matchingLines, isCheckable, allLines: relationLines });

        expect(matchingLines[0].isDisabled).toBe(true);
        expect(isCheckable).toBe(false);
        expect(session.dialogMessages).toEqual([]);
    });

    test("R4h Menu Relations : même propriété restreinte sur la classe et sur un ancêtre, une seule ligne, celle de la classe la plus proche", async ({ page }, testInfo) => {
        const columnNames = ["Mooring", "FPSO"];
        const session = await openTestTable(page, columnNames);
        await attachSourceShot(testInfo, page, "0_contexte_R4_source.png");
        await attachColumnsShot(testInfo, page, "1_situation_colonnes.png", columnNames);
        const modelFacts = await proveModelSituation(testInfo, page, [classUris.mooring, classUris.subProduct, classUris.fpso, classUris.product]);
        expectSubClassLink(modelFacts, classUris.mooring, classUris.subProduct);
        expectSubClassLink(modelFacts, classUris.fpso, classUris.product);
        const closestRestriction = expectModelRestriction(modelFacts, classUris.mooring, classUris.fpso);
        const ancestorRestriction = expectModelRestriction(modelFacts, classUris.subProduct, classUris.product);
        expect(closestRestriction.cardinalityType).not.toBeNull();

        const { matchingLines } = await proveOfferedLine(testInfo, page, session, "Mooring", "FPSO", [
            { label: "Restriction Mooring vers FPSO", bearer: classUris.mooring, target: classUris.fpso },
            { label: "Restriction Sub-Product vers Product", bearer: classUris.subProduct, target: classUris.product },
        ]);

        expect(matchingLines).toHaveLength(1);
        const lineRestrictionText = JSON.stringify({ restrictionType: matchingLines[0].restrictionType, cardinality: matchingLines[0].cardinality });
        expect(lineRestrictionText).toContain(localName(closestRestriction.cardinalityType));
        expect(lineRestrictionText).toMatch(new RegExp(`(^|[^0-9])${closestRestriction.cardinalityValue}([^0-9]|$)`));
        expect(matchingLines[0].restrictionType).not.toBe(ancestorRestriction.constraintType);
        expect(session.dialogMessages).toEqual([]);
    });
});

// ---------- R5 · Ctrl+click ----------

test.describe("R5 · Le Ctrl+clic surligne les propriétés que le modèle restreint entre les deux classes", () => {
    test("R5a Ctrl+clic : propriété d'une restriction exacte surlignée en jaune, son type repris sans dialogue", async ({ page }, testInfo) => {
        const columnNames = ["Module", "Sub-Product"];
        const session = await openTestTable(page, columnNames);
        await attachSourceShot(testInfo, page, "0_contexte_R5_source.png");
        await attachColumnsShot(testInfo, page, "1_situation_colonnes.png", columnNames);
        const modelFacts = await proveModelSituation(testInfo, page, [classUris.module, classUris.subProduct]);
        const restriction = expectModelRestriction(modelFacts, classUris.module, classUris.subProduct);

        await proveHighlightedProperty(testInfo, page, session, "Module", "Sub-Product", restriction.constraintType);

        expect(session.dialogMessages).toEqual([]);
    });

    test("R5b Ctrl+clic : propriété d'une restriction héritée surlignée en jaune, son type repris sans dialogue", async ({ page }, testInfo) => {
        const columnNames = ["Accommodation", "Topsides"];
        const session = await openTestTable(page, columnNames);
        await attachSourceShot(testInfo, page, "0_contexte_R5_source.png");
        await attachColumnsShot(testInfo, page, "1_situation_colonnes.png", columnNames);
        const modelFacts = await proveModelSituation(testInfo, page, [classUris.accommodation, classUris.module, classUris.subProduct, classUris.topsides]);
        expectSubClassLink(modelFacts, classUris.accommodation, classUris.module);
        expectSubClassLink(modelFacts, classUris.topsides, classUris.subProduct);
        const inheritedRestriction = expectModelRestriction(modelFacts, classUris.module, classUris.subProduct);

        await proveHighlightedProperty(testInfo, page, session, "Accommodation", "Topsides", inheritedRestriction.constraintType);

        expect(session.dialogMessages).toEqual([]);
    });

    // Not testable on the dev data. The case needs a property set by a PBS restriction and absent from the
    // Ctrl+click list of its two classes, for want of a usable domain or range. Every property of the PBS
    // restrictions has a constraint entry in the PBS, IOF-CORE-2026 or BFO model, matching the classes of
    // its restrictions (componentPartOfAtSomeTime gets BFO_0000002 from its super property): on the old
    // code it is listed, not highlighted, for Anchor (PC3-AAB) to Anchoring (PC2-AA), and so are manages,
    // hasInput, describedBy, designatedBy, BFO_0000176 and BFO_0000177 for the classes of their restrictions.
    test.fixme("R5c Ctrl+clic : propriété d'une restriction sans domaine ni portée utilisables ajoutée à la liste, surlignée, type repris", async () => {});
});
