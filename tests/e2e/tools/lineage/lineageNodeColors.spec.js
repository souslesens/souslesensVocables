// Which color a node takes on the Lineage whiteboard when the legend of the top level ontology (BFO) is
// active: the color of its first ancestor listed in the legend, searched in the perimeter of the main
// source, or in the perimeter of its own source when the main source does not import it (a source added
// with the + button). Each test tells its case as a story, situation, action, result, with the
// screenshots and the data it captured attached in that order.
//
// Data: the dev triple store, read only. PAZFLOR_ABOX imports IOF-CORE-202401, BFO and LIFEX_FPSO;
// LIFEX_FPSO imports IOF-CORE-202401 and BFO; IAO imports BFO and is imported by none of them.
// The expected color of a node is computed by the test from data it reads itself: the legend of
// Config.topLevelOntologyFixedlegendMap, also shown in the Query Legend panel, and the rdfs:subClassOf
// links of the perimeter, queried through the SPARQL proxy of the application.
//
//   SLS_TEST_TICKET=lineage-couleurs-hors-source-active \
//     PLAYWRIGHT_JSON_OUTPUT_NAME=rdd/lineage-couleurs-hors-source-active/results.json \
//     npx playwright test tests/e2e/tools/lineage/lineageNodeColors.spec.js --output rdd/lineage-couleurs-hors-source-active/playwright --workers=1 --reporter=line,json
// The same against the old code: SLS_TEST_ANCIEN_CODE=<base commit> serves the client files changed since
// that commit as they were in it, outputs in a sibling folder:
//   SLS_TEST_TICKET=lineage-couleurs-hors-source-active-ancien-code SLS_TEST_ANCIEN_CODE=<base commit> \
//     PLAYWRIGHT_JSON_OUTPUT_NAME=rdd/lineage-couleurs-hors-source-active-ancien-code/results.json \
//     npx playwright test tests/e2e/tools/lineage/lineageNodeColors.spec.js --output rdd/lineage-couleurs-hors-source-active-ancien-code/playwright --workers=1 --reporter=line,json
// --output keeps Playwright out of the ticket folder itself, which it empties at each run and which holds regles.html
// R1f and R1i record the color of every node; run on the new code after the old one, they also compare
// those colors node by node with the old code run.

/* global window, document, $, Lineage_sources, Lineage_whiteboard, Config, Sparql_proxy */
import { test, expect } from "@playwright/test";
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

const localhostUrlRegex = /^http:\/\/localhost(:\d+)?$/;
const baseUrl = process.env.SLS_URL || process.env.TEST_BASE_URL || "http://localhost:3010";

// a timing-out query takes a shared Virtuoso down
if (!localhostUrlRegex.test(baseUrl)) {
    throw new Error("lineageNodeColors.spec.js only runs against a local server, not " + baseUrl);
}

const appSourcesUrlPrefix = baseUrl + "/vocables/";
// the Playwright of the repo expects a headless shell that is not installed on this machine
const localChromiumPath = process.env.SLS_CHROMIUM_PATH || path.join(process.env.LOCALAPPDATA || "", "ms-playwright/chromium-1234/chrome-win64/chrome.exe");
const launchOptions = fs.existsSync(localChromiumPath) ? { executablePath: localChromiumPath } : {};

// screenshots at twice the screen resolution, so that a cropped graph label stays readable
test.use({ baseURL: baseUrl, viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2, launchOptions });
test.describe.configure({ timeout: 600000 });

// ---------- old code ----------

const oldCodeCommit = process.env.SLS_TEST_ANCIEN_CODE || process.env.TEST_ANCIEN_CODE || null;
const clientFolder = "public";
const lineSeparatorRegex = /\r?\n/;

// the client files modified since the base commit, keyed by the URL path the server serves them under
function oldClientFilesByUrlPath(baseCommit) {
    const diffOutput = execFileSync("git", ["diff", "--name-only", "--diff-filter=M", baseCommit, "--", clientFolder + "/vocables"]).toString();
    const changedFiles = diffOutput.split(lineSeparatorRegex);
    const filesByUrlPath = {};
    for (const changedFile of changedFiles) {
        if (changedFile.trim()) {
            filesByUrlPath["/" + path.posix.relative(clientFolder, changedFile.trim())] = changedFile.trim();
        }
    }
    return filesByUrlPath;
}

const oldFilesByUrlPath = oldCodeCommit ? oldClientFilesByUrlPath(oldCodeCommit) : {};

async function serveOldClientCode(page) {
    await page.route(
        (url) => Boolean(oldFilesByUrlPath[url.pathname]),
        async (route) => {
            const changedFile = oldFilesByUrlPath[new URL(route.request().url()).pathname];
            const baseContent = execFileSync("git", ["show", `${oldCodeCommit}:${changedFile}`], { maxBuffer: 64 * 1024 * 1024 });
            const response = await route.fetch();
            await route.fulfill({ response, body: baseContent });
        },
    );
}

// ---------- data of the rules page ----------

const mainSource = "PAZFLOR_ABOX";
const bfoSource = "BFO";
const iofCoreSource = "IOF-CORE-202401";
const lifexSource = "LIFEX_FPSO";
const addedSource = "IAO";
const bfoNamespace = "http://purl.obolibrary.org/obo/";
const iofCoreNamespace = "https://spec.industrialontologies.org/ontology/core/Core/";
const nodeUris = {
    entity: bfoNamespace + "BFO_0000001",
    continuant: bfoNamespace + "BFO_0000002",
    occurrent: bfoNamespace + "BFO_0000003",
    genericallyDependentContinuant: bfoNamespace + "BFO_0000031",
    specificallyDependentContinuant: bfoNamespace + "BFO_0000020",
    event: iofCoreNamespace + "Event",
    iofInformationContentEntity: iofCoreNamespace + "InformationContentEntity",
    designSpecification: iofCoreNamespace + "DesignSpecification",
    cost: "http://totalenergies/resources/tsf/ontology/lifex_fpso/Cost",
    tagClass: "http://totalenergies/resources/tsf/ontology/lifex_fpso/Tag",
    tagIndividual: "http://totalenergies/resources/tsf/ontology/pazflor-abox/tag-TO-PT-720509E",
    iaoInformationContentEntity: bfoNamespace + "IAO_0000030",
};
// color of a node without ancestor in the legend, as the rules page gives it (R1g)
const grayColor = "#ddd";
// R1f must tell colors apart: at least this many legend colors on its nodes, besides the gray
const minDistinctLegendColors = 3;
const namedIndividualType = "NamedIndividual";
// the alert Lineage shows when a children answer exceeds Lineage_whiteboard.showLimit, expected in R1c only
const tooManyNodesRegex = /^Too may nodes/;

// ---------- selectors ----------

const childrenButtonSelector = "button[title='Children']";
const mainClassesButtonSelector = "button[title='Main classes']";
const parentsButtonSelector = "button[title='Parents']";
const allSourcesButtonSelector = "#AllSourceButton";
const addSourceButtonSelector = "#AddSourceButton";
const sourceLabelSelector = ".Lineage_sourceLabelDiv";
const allSelectedSourceClass = "Lineage_allSelectedSourceDiv";
const moreSourcesIconSelector = "#lineage_compactSourceIndicator .moreOptions-icon";
const compactSourceIndicatorSelector = "#lineage_compactSourceIndicator";
const sourcesPopupSelector = "#lineage_sourcesPopup";
const legendPanelSelector = "#lineage_legendWrapperSection";
const legendTreeSelector = "#legendJstreeDivId";
const popupMenuItemSelector = "#popupMenuWidgetDiv .popupMenuItem:visible";
const sourceSearchInputSelector = "#sourceSelector_searchInput";

// ---------- browser state ----------

const quietPeriodMs = 3000;
const pollIntervalMs = 250;
const settleTimeoutMs = 300000;
// the source tree of the + dialog loads every source of the server before it can be searched
const sourceTreeTimeoutMs = 60000;
const sourceSearchRetryMs = 5000;
// the BFO branch of PAZFLOR_ABOX climbs from its classes to entity in six levels
const maxParentsClicks = 10;

// the SPARQL requests in flight, to wait for the page to settle, and every alert, which a silent dismiss
// would otherwise hide
function trackSession(page) {
    const session = { pendingSparqlCount: 0, lastSparqlActivity: Date.now(), dialogMessages: [] };
    page.on("request", (request) => {
        if (request.url().includes("sparqlProxy")) {
            session.pendingSparqlCount++;
            session.lastSparqlActivity = Date.now();
        }
    });
    const onRequestDone = (request) => {
        if (request.url().includes("sparqlProxy")) {
            session.pendingSparqlCount--;
            session.lastSparqlActivity = Date.now();
        }
    };
    page.on("requestfinished", onRequestDone);
    page.on("requestfailed", onRequestDone);
    page.on("dialog", (dialog) => {
        session.dialogMessages.push(dialog.message());
        dialog.dismiss();
    });
    return session;
}

// the decoration recolors the nodes after they are drawn: the board is settled when no SPARQL request is
// in flight and neither the nodes, the edges nor the colors have moved for a quiet period
async function waitForSettledBoard(page, session) {
    const start = Date.now();
    let lastSignature = null;
    let stableSince = Date.now();
    while (Date.now() - start < settleTimeoutMs) {
        const signature = await page.evaluate(() => {
            var graphData = window.Lineage_whiteboard && Lineage_whiteboard.lineageVisjsGraph && Lineage_whiteboard.lineageVisjsGraph.data;
            if (!graphData) {
                return "empty";
            }
            var nodeColors = graphData.nodes.get().map((boardNode) => JSON.stringify(boardNode.color));
            return graphData.nodes.length + "/" + graphData.edges.length + "/" + nodeColors.join(",");
        });
        const isNetworkQuiet = session.pendingSparqlCount <= 0 && Date.now() - session.lastSparqlActivity > quietPeriodMs;
        if (signature !== lastSignature) {
            lastSignature = signature;
            stableSince = Date.now();
        } else if (isNetworkQuiet && Date.now() - stableSince > quietPeriodMs) {
            return;
        }
        await page.waitForTimeout(pollIntervalMs);
    }
    throw new Error("the whiteboard never settled");
}

async function readBoardNodes(page) {
    return page.evaluate(() => {
        var boardNodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get();
        return boardNodes.map((boardNode) => {
            var nodeData = boardNode.data || {};
            var nodeColor = boardNode.color && typeof boardNode.color === "object" ? boardNode.color.background : boardNode.color;
            return { id: boardNode.id, label: boardNode.label, color: nodeColor || null, source: nodeData.source || null, rdfType: nodeData.rdfType || null };
        });
    });
}

async function readBoardNode(page, nodeId) {
    const boardNodes = await readBoardNodes(page);
    return boardNodes.find((boardNode) => boardNode.id === nodeId) || null;
}

async function readChildIds(page, parentId) {
    return page.evaluate((parentId) => {
        var boardEdges = Lineage_whiteboard.lineageVisjsGraph.data.edges.get();
        var edgesToParent = boardEdges.filter((boardEdge) => boardEdge.to === parentId);
        return edgesToParent.map((boardEdge) => boardEdge.from);
    }, parentId);
}

// the source a label of the source bar stands for, whether shown in the bar or in its hover popup
async function readSourceLabels(page) {
    return page.evaluate((sourceLabelSelector) => {
        var labelElements = Array.from(document.querySelectorAll(sourceLabelSelector));
        return labelElements.map((labelElement) => ({ source: labelElement.innerText.trim(), classes: labelElement.className.split(" ") }));
    }, sourceLabelSelector);
}

// sources, imports and graphs as Config declares them; the main source is the one the test opened by the URL, as the
// rules page defines it, since MainController.currentSource follows the last source added with the + button
async function readSourceConfig(page, sourceNames) {
    const sourceConfig = await page.evaluate((sourceNames) => {
        var sourceConfigs = {};
        sourceNames.forEach((sourceName) => {
            sourceConfigs[sourceName] = { graphUri: Config.sources[sourceName].graphUri, imports: Config.sources[sourceName].imports || [] };
        });
        return { activeSource: Lineage_sources.activeSource, sources: sourceConfigs };
    }, sourceNames);
    return { mainSource, ...sourceConfig };
}

function perimeterOf(sourceConfig, sourceName) {
    return [sourceName].concat(sourceConfig.sources[sourceName].imports);
}

// ---------- legend and ancestors, read from the application ----------

// the fixed legend of the current top level ontology, and the entries the Query Legend panel shows
async function readLegend(page) {
    return page.evaluate((legendTreeSelector) => {
        var legendName = Config.currentTopLevelOntology;
        var fixedColors = Config.topLevelOntologyFixedlegendMap[legendName] || {};
        var legendTree = $(legendTreeSelector).jstree(true);
        var shownEntries = [];
        if (legendTree) {
            var treeNodes = legendTree.get_json("#", { flat: true });
            var entryNodes = treeNodes.filter((treeNode) => treeNode.parent !== "#");
            shownEntries = entryNodes.map((entryNode) => {
                var anchor = document.getElementById(entryNode.id + "_anchor");
                var swatch = anchor ? anchor.querySelector("span") : null;
                return { classUri: entryNode.id, label: anchor ? anchor.innerText.trim() : entryNode.text, swatchColor: swatch ? swatch.style.backgroundColor : null };
            });
        }
        return { legendName: legendName, colorByClass: fixedColors, shownEntries: shownEntries };
    }, legendTreeSelector);
}

async function runSparql(page, source, query) {
    return page.evaluate(
        ([source, query]) =>
            new Promise((resolve, reject) => {
                var url = Config.sources[source].sparql_server.url + "?format=json&query=";
                Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (error, result) {
                    if (error) {
                        return reject(String(error));
                    }
                    resolve(result.results.bindings);
                });
            }),
        [source, query],
    );
}

function fromClauses(sourceConfig, perimeterSources) {
    const graphClauses = perimeterSources.map((perimeterSource) => `FROM <${sourceConfig.sources[perimeterSource].graphUri}>`);
    return graphClauses.join(" ");
}

function valuesList(uris) {
    const uriTerms = uris.map((uri) => `<${uri}>`);
    return uriTerms.join(" ");
}

function bindingValue(binding, variableName) {
    return binding[variableName] ? binding[variableName].value : null;
}

// every rdfs:subClassOf link above the start classes, in the graphs of the perimeter only
async function readAncestorLinks(page, sourceConfig, perimeterSources, startClassUris) {
    const query =
        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> SELECT DISTINCT ?subClass ?superClass ?superClassLabel " +
        fromClauses(sourceConfig, perimeterSources) +
        ` WHERE { VALUES ?startClass { ${valuesList(startClassUris)} } ?startClass rdfs:subClassOf* ?subClass . ?subClass rdfs:subClassOf ?superClass . FILTER(isIRI(?superClass)) OPTIONAL { ?superClass rdfs:label ?superClassLabel } }`;
    const bindings = await runSparql(page, perimeterSources[0], query);
    const links = [];
    const labelByClass = {};
    for (const binding of bindings) {
        const subClass = bindingValue(binding, "subClass");
        const superClass = bindingValue(binding, "superClass");
        if (!links.some((link) => link.subClass === subClass && link.superClass === superClass)) {
            links.push({ subClass, superClass });
        }
        if (!labelByClass[superClass] && bindingValue(binding, "superClassLabel")) {
            labelByClass[superClass] = bindingValue(binding, "superClassLabel");
        }
    }
    return { perimeterSources, query, links, labelByClass };
}

// the classes of individuals, read in the perimeter their color is computed in
async function readIndividualClasses(page, sourceConfig, perimeterSources, individualUris) {
    const query =
        "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> PREFIX owl: <http://www.w3.org/2002/07/owl#> SELECT DISTINCT ?individual ?class " +
        fromClauses(sourceConfig, perimeterSources) +
        ` WHERE { VALUES ?individual { ${valuesList(individualUris)} } ?individual rdf:type ?class . FILTER(?class != owl:NamedIndividual) }`;
    const bindings = await runSparql(page, perimeterSources[0], query);
    const classesByIndividual = {};
    for (const binding of bindings) {
        const individual = bindingValue(binding, "individual");
        classesByIndividual[individual] = classesByIndividual[individual] || [];
        classesByIndividual[individual].push(bindingValue(binding, "class"));
    }
    return { query, classesByIndividual };
}

// ancestors climbed level by level from the start classes, up to the first level holding a class of the legend
function firstLegendAncestors(startClassUris, ancestorLinks, colorByClass) {
    const levels = [];
    const visitedClasses = new Set(startClassUris);
    let currentLevel = [...visitedClasses];
    while (currentLevel.length) {
        levels.push(currentLevel);
        const legendClasses = currentLevel.filter((classUri) => colorByClass[classUri]);
        if (legendClasses.length) {
            const legendHits = legendClasses.map((classUri) => ({ classUri, color: colorByClass[classUri] }));
            return { levels, legendHits };
        }
        const nextLevel = [];
        for (const classUri of currentLevel) {
            for (const link of ancestorLinks) {
                if (link.subClass === classUri && !visitedClasses.has(link.superClass)) {
                    visitedClasses.add(link.superClass);
                    nextLevel.push(link.superClass);
                }
            }
        }
        currentLevel = nextLevel;
    }
    return { levels, legendHits: [] };
}

function sameColor(firstColor, secondColor) {
    return String(firstColor).toLowerCase() === String(secondColor).toLowerCase();
}

function classLabel(classUri, ancestors, boardNode) {
    if (ancestors.labelByClass[classUri]) {
        return ancestors.labelByClass[classUri];
    }
    return classUri === boardNode.id ? boardNode.label : localName(classUri);
}

// the color the rules give one node, from its start classes and the ancestors read in one perimeter
function colorVerdict(boardNode, startClasses, ancestors, colorByClass) {
    const legendSearch = firstLegendAncestors(startClasses, ancestors.links, colorByClass);
    const legendColors = new Set(legendSearch.legendHits.map((legendHit) => legendHit.color));
    const firstHit = legendSearch.legendHits[0] || null;
    return {
        id: boardNode.id,
        label: boardNode.label,
        source: boardNode.source,
        rdfType: boardNode.rdfType,
        boardColor: boardNode.color,
        perimeterSources: ancestors.perimeterSources,
        startClasses,
        levels: legendSearch.levels,
        levelLabels: legendSearch.levels.map((level) => level.map((classUri) => classLabel(classUri, ancestors, boardNode))),
        legendHits: legendSearch.legendHits,
        legendHitLabel: firstHit ? classLabel(firstHit.classUri, ancestors, boardNode) : null,
        expectedColor: firstHit ? firstHit.color : null,
        isAmbiguous: legendColors.size > 1,
    };
}

// for each node, the color the rules give it next to the color it has on the whiteboard: an individual
// through its class, in the perimeter of the main source when its source is in it, else in the perimeter
// of its own source
async function computeColorVerdicts(page, sourceConfig, legend, boardNodes) {
    const mainPerimeter = perimeterOf(sourceConfig, sourceConfig.mainSource);
    const nodesByPerimeterSource = {};
    for (const boardNode of boardNodes) {
        const perimeterSource = mainPerimeter.includes(boardNode.source) ? sourceConfig.mainSource : boardNode.source;
        nodesByPerimeterSource[perimeterSource] = nodesByPerimeterSource[perimeterSource] || [];
        nodesByPerimeterSource[perimeterSource].push(boardNode);
    }
    const verdicts = [];
    const queries = [];
    for (const [perimeterSource, perimeterNodes] of Object.entries(nodesByPerimeterSource)) {
        const perimeterSources = perimeterOf(sourceConfig, perimeterSource);
        const individualNodes = perimeterNodes.filter((boardNode) => boardNode.rdfType === namedIndividualType);
        const individualIds = individualNodes.map((individualNode) => individualNode.id);
        const individualClasses = individualIds.length ? await readIndividualClasses(page, sourceConfig, perimeterSources, individualIds) : { query: null, classesByIndividual: {} };
        const startClassesByNode = {};
        const allStartClasses = new Set();
        for (const boardNode of perimeterNodes) {
            const startClasses = individualClasses.classesByIndividual[boardNode.id] || [boardNode.id];
            startClassesByNode[boardNode.id] = startClasses;
            startClasses.forEach((startClass) => allStartClasses.add(startClass));
        }
        const ancestors = await readAncestorLinks(page, sourceConfig, perimeterSources, [...allStartClasses]);
        queries.push({
            perimeterSources,
            individualClassesQuery: individualClasses.query,
            classesByIndividual: individualClasses.classesByIndividual,
            ancestorQuery: ancestors.query,
            ancestorLinks: ancestors.links,
        });
        for (const boardNode of perimeterNodes) {
            verdicts.push(colorVerdict(boardNode, startClassesByNode[boardNode.id], ancestors, legend.colorByClass));
        }
    }
    return { mainPerimeter, verdicts, queries };
}

// an expected color the data supports alone, the board color equal to it, gray when no ancestor is listed
function expectColorVerdict(verdict) {
    expect(verdict.isAmbiguous, `${verdict.label}: several legend ancestors of different colors at the same distance`).toBe(false);
    const expectedColor = verdict.expectedColor || grayColor;
    expect(sameColor(verdict.boardColor, expectedColor), `${verdict.label} (${verdict.source}) is ${verdict.boardColor}, its legend color is ${expectedColor}`).toBe(true);
}

// ---------- Lineage actions ----------

async function openLineage(page) {
    const session = trackSession(page);
    await page.goto(`/vocables/?tool=lineage&source=${mainSource}`);
    await page.waitForFunction(() => window.Lineage_sources && Lineage_sources.activeSource && window.Lineage_whiteboard, null, { timeout: 180000 });
    await waitForSettledBoard(page, session);
    return session;
}

// the source labels that do not fit in the bar, with the + and All buttons, sit in a popup the bar opens
// on hover, or behind the more options icon
async function revealSourcePopup(page) {
    if (await page.locator(sourcesPopupSelector).isVisible()) {
        return;
    }
    if (await page.locator(moreSourcesIconSelector).isVisible()) {
        await page.click(moreSourcesIconSelector);
    } else {
        await page.hover(compactSourceIndicatorSelector);
    }
    await expect(page.locator(sourcesPopupSelector)).toBeVisible();
}

async function closeSourcePopup(page) {
    await page.mouse.move(900, 700);
    await page.keyboard.press("Escape");
}

async function visibleSourceLabel(page, source) {
    const visibleLabels = page.locator(sourceLabelSelector + ":visible");
    const labelCount = await visibleLabels.count();
    for (let labelIndex = 0; labelIndex < labelCount; labelIndex++) {
        if ((await visibleLabels.nth(labelIndex).innerText()).trim() === source) {
            return visibleLabels.nth(labelIndex);
        }
    }
    return null;
}

async function selectSource(page, session, source) {
    let sourceLabel = await visibleSourceLabel(page, source);
    if (!sourceLabel) {
        await revealSourcePopup(page);
        sourceLabel = await visibleSourceLabel(page, source);
    }
    const labelBox = await sourceLabel.boundingBox();
    // on the label text, left of the menu arrow the label also holds
    await page.mouse.click(labelBox.x + 15, labelBox.y + labelBox.height / 2);
    await expect.poll(() => page.evaluate(() => Lineage_sources.activeSource)).toBe(source);
    await closeSourcePopup(page);
    await waitForSettledBoard(page, session);
}

// the All button frames every label of the bar when it is on
async function setAllSources(page, isOn) {
    if (!(await page.locator(allSourcesButtonSelector).isVisible())) {
        await revealSourcePopup(page);
    }
    await page.click(allSourcesButtonSelector);
    await expect
        .poll(async () => {
            const sourceLabels = await readSourceLabels(page);
            return sourceLabels.every((sourceLabel) => sourceLabel.classes.includes(allSelectedSourceClass) === isOn);
        })
        .toBe(true);
    await closeSourcePopup(page);
}

async function addSourceWithPlusButton(page, session, source) {
    if (!(await page.locator(addSourceButtonSelector).isVisible())) {
        await revealSourcePopup(page);
    }
    await page.click(addSourceButtonSelector);
    await expect(page.locator(".jstree-anchor:visible").first()).toBeVisible({ timeout: sourceTreeTimeoutMs });
    await page.fill(sourceSearchInputSelector, source);
    const sourceAnchor = page.locator(".jstree-anchor:visible").filter({ hasText: source });
    // an Enter pressed while the tree is still building is ignored: pressed again until the search shows the source
    await expect(async () => {
        await page.focus(sourceSearchInputSelector);
        await page.keyboard.press("Enter");
        await expect(sourceAnchor.first()).toBeVisible({ timeout: sourceSearchRetryMs });
    }).toPass({ timeout: sourceTreeTimeoutMs });
    const anchorCount = await sourceAnchor.count();
    for (let anchorIndex = 0; anchorIndex < anchorCount; anchorIndex++) {
        if ((await sourceAnchor.nth(anchorIndex).innerText()).trim() === source) {
            await sourceAnchor.nth(anchorIndex).click();
            break;
        }
    }
    await expect.poll(async () => (await readSourceLabels(page)).some((sourceLabel) => sourceLabel.source === source), { timeout: 120000 }).toBe(true);
    await waitForSettledBoard(page, session);
}

async function drawMainClasses(page, session) {
    await page.click(mainClassesButtonSelector);
    await waitForSettledBoard(page, session);
}

// Parents climbs one level above every node of the whiteboard at each click
async function clickParentsUntilDrawn(page, session, nodeId) {
    for (let clickIndex = 0; clickIndex < maxParentsClicks; clickIndex++) {
        if (await readBoardNode(page, nodeId)) {
            return clickIndex;
        }
        await page.click(parentsButtonSelector);
        await waitForSettledBoard(page, session);
    }
    expect(await readBoardNode(page, nodeId), `${localName(nodeId)} drawn by Parents`).not.toBeNull();
    return maxParentsClicks;
}

async function clickChildren(page, session, times) {
    for (let clickIndex = 0; clickIndex < times; clickIndex++) {
        await page.click(childrenButtonSelector);
        await waitForSettledBoard(page, session);
    }
}

// the right-click menu of the Children button: its All entry adds rdf:type to the predicates
async function clickChildrenMenuAll(page, session, times) {
    for (let clickIndex = 0; clickIndex < times; clickIndex++) {
        await page.click(childrenButtonSelector, { button: "right" });
        await clickPopupMenuItem(page, "All");
        await waitForSettledBoard(page, session);
    }
}

async function clickPopupMenuItem(page, itemText) {
    const menuItems = page.locator(popupMenuItemSelector);
    await expect(menuItems.first()).toBeVisible();
    const itemCount = await menuItems.count();
    for (let itemIndex = 0; itemIndex < itemCount; itemIndex++) {
        if ((await menuItems.nth(itemIndex).innerText()).trim() === itemText) {
            await menuItems.nth(itemIndex).click();
            return;
        }
    }
    throw new Error(`no ${itemText} entry in the popup menu`);
}

// the search box of the whiteboard turns the matching node into a star
async function searchOnBoard(page, label) {
    await page.fill("#visjsGraph_searchInput", label);
    await page.click("button.search-icon[onclick*='searchNode']");
    await expect
        .poll(() =>
            page.evaluate((label) => {
                var boardNodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get();
                return boardNodes.some((boardNode) => boardNode.label === label && boardNode.shape === "star");
            }, label),
        )
        .toBe(true);
}

async function nodeScreenPosition(page, nodeId) {
    return page.evaluate((nodeId) => {
        var network = Lineage_whiteboard.lineageVisjsGraph.network;
        var domPosition = network.canvasToDOM(network.getPositions([nodeId])[nodeId]);
        var containerBox = network.body.container.getBoundingClientRect();
        return { x: domPosition.x + containerBox.left, y: domPosition.y + containerBox.top };
    }, nodeId);
}

async function focusNode(page, nodeId) {
    await page.evaluate((nodeId) => Lineage_whiteboard.lineageVisjsGraph.network.focus(nodeId, { scale: 1.5, animation: false }), nodeId);
    await waitForRedraw(page);
}

async function waitForRedraw(page) {
    await page.evaluate(() => new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve))));
}

async function openNodeMenu(page, nodeId) {
    await focusNode(page, nodeId);
    const position = await nodeScreenPosition(page, nodeId);
    await page.mouse.click(position.x, position.y, { button: "right" });
    await expect(page.locator(popupMenuItemSelector).first()).toBeVisible();
}

// ---------- proofs ----------

const proofMarginPixels = 8;
const boardShotMinWidth = 640;
const boardShotMinHeight = 360;
const singleNodeScale = 1.5;
const closeUpScale = 3;
const schemaMaxListedNodes = 12;
const mermaidUnsafeCharRegex = /["<>]/g;
// mermaid entity codes, a raw quote or angle bracket breaks the box label
const mermaidEntityByChar = { '"': "#quot;", "<": "#lt;", ">": "#gt;" };
const playwrightSubfolder = "playwright";
const uriLocalNameRegex = /[^/#]+$/;
const hexColorRegex = /^#[0-9a-f]{3,8}$/i;

// line coverage of the client code, read by the coverage script of rdd-preuves
test.beforeEach(async ({ page }) => {
    await page.coverage.startJSCoverage({ resetOnNavigation: false });
    if (oldCodeCommit) {
        await serveOldClientCode(page);
    }
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

async function boxOfElements(page, selectors) {
    return page.evaluate(
        ([selectors, marginPixels]) => {
            var elements = [];
            selectors.forEach((selector) => elements.push(...document.querySelectorAll(selector)));
            var shownElements = elements.filter((element) => element.offsetParent);
            var boxes = shownElements.map((element) => element.getBoundingClientRect());
            var lefts = boxes.map((box) => box.left);
            var tops = boxes.map((box) => box.top);
            var rights = boxes.map((box) => box.right);
            var bottoms = boxes.map((box) => box.bottom);
            return {
                left: Math.max(Math.min(...lefts) - marginPixels, 0),
                top: Math.max(Math.min(...tops) - marginPixels, 0),
                right: Math.max(...rights) + marginPixels,
                bottom: Math.max(...bottoms) + marginPixels,
            };
        },
        [selectors, proofMarginPixels],
    );
}

// the source bar with its popup opened: every source, the framed active one, and the frame of All when on
async function attachSourceBarShot(testInfo, page, fileName) {
    await revealSourcePopup(page);
    const barBox = await boxOfElements(page, ["#ChangeSourceButton", sourceLabelSelector, allSourcesButtonSelector, addSourceButtonSelector]);
    await attachClip(testInfo, page, fileName, barBox);
    await closeSourcePopup(page);
}

// the legend tree sits in a box narrower than its labels: the box is widened so that every label reads whole
async function attachLegendShot(testInfo, page, fileName) {
    await page.evaluate(
        ([legendPanelSelector, legendTreeSelector]) => {
            var legendTree = document.querySelector(legendTreeSelector);
            var widenedElements = [document.querySelector(legendPanelSelector), legendTree.parentElement, legendTree];
            widenedElements.forEach((widenedElement) => {
                widenedElement.style.width = "max-content";
                widenedElement.style.overflow = "visible";
            });
        },
        [legendPanelSelector, legendTreeSelector],
    );
    const legendBox = await boxOfElements(page, [legendPanelSelector]);
    await attachClip(testInfo, page, fileName, legendBox);
}

async function attachElementShot(testInfo, page, fileName, selector) {
    const elementBox = await boxOfElements(page, [selector]);
    await attachClip(testInfo, page, fileName, elementBox);
}

// the menu container has no size of its own, its entries do
async function attachPopupMenuShot(testInfo, page, fileName) {
    await expect(page.locator(popupMenuItemSelector).first()).toBeVisible();
    await attachElementShot(testInfo, page, fileName, "#popupMenuWidgetDiv .popupMenuItem");
}

// the node an action targets, then its popup menu framed with it; the menu opens where the click lands, over
// the label under the node, hence the node shot taken first
async function attachNodeMenuShots(testInfo, page, fileNamePrefix, nodeId) {
    await attachBoardShot(testInfo, page, fileNamePrefix + "_noeud.png", [nodeId]);
    await openNodeMenu(page, nodeId);
    const menuBox = await boxOfElements(page, ["#popupMenuWidgetDiv .popupMenuItem"]);
    const nodeBox = await page.evaluate(
        ([nodeId, marginPixels]) => {
            var network = Lineage_whiteboard.lineageVisjsGraph.network;
            var containerBox = network.body.container.getBoundingClientRect();
            var canvasBox = network.getBoundingBox(nodeId);
            var topLeft = network.canvasToDOM({ x: canvasBox.left, y: canvasBox.top });
            var bottomRight = network.canvasToDOM({ x: canvasBox.right, y: canvasBox.bottom });
            return {
                left: containerBox.left + topLeft.x - marginPixels,
                top: containerBox.top + topLeft.y - marginPixels,
                right: containerBox.left + bottomRight.x + marginPixels,
                bottom: containerBox.top + bottomRight.y + marginPixels,
            };
        },
        [nodeId, proofMarginPixels * 4],
    );
    const shotBox = {
        left: Math.max(Math.min(menuBox.left, nodeBox.left), 0),
        top: Math.max(Math.min(menuBox.top, nodeBox.top), 0),
        right: Math.max(menuBox.right, nodeBox.right),
        bottom: Math.max(menuBox.bottom, nodeBox.bottom),
    };
    await attachClip(testInfo, page, fileNamePrefix + ".png", shotBox);
}

// the whiteboard around the given nodes, with their labels and colors readable
async function attachBoardShot(testInfo, page, fileName, nodeIds, focusScale = singleNodeScale) {
    await page.evaluate(
        ([nodeIds, focusScale]) => {
            var network = Lineage_whiteboard.lineageVisjsGraph.network;
            if (nodeIds.length === 1) {
                network.focus(nodeIds[0], { scale: focusScale, animation: false });
                return;
            }
            network.fit({ nodes: nodeIds, animation: false });
        },
        [nodeIds, focusScale],
    );
    await waitForRedraw(page);
    const shotBox = await page.evaluate(
        ([nodeIds, minWidth, minHeight, marginPixels]) => {
            var network = Lineage_whiteboard.lineageVisjsGraph.network;
            var containerBox = network.body.container.getBoundingClientRect();
            var corners = [];
            nodeIds.forEach((nodeId) => {
                var canvasBox = network.getBoundingBox(nodeId);
                corners.push(network.canvasToDOM({ x: canvasBox.left, y: canvasBox.top }));
                corners.push(network.canvasToDOM({ x: canvasBox.right, y: canvasBox.bottom }));
            });
            var horizontals = corners.map((corner) => corner.x);
            var verticals = corners.map((corner) => corner.y);
            var centerX = containerBox.left + (Math.min(...horizontals) + Math.max(...horizontals)) / 2;
            var centerY = containerBox.top + (Math.min(...verticals) + Math.max(...verticals)) / 2;
            var halfWidth = Math.max(Math.max(...horizontals) - Math.min(...horizontals) + 2 * marginPixels, minWidth) / 2;
            var halfHeight = Math.max(Math.max(...verticals) - Math.min(...verticals) + 2 * marginPixels, minHeight) / 2;
            return {
                left: Math.max(centerX - halfWidth, containerBox.left),
                top: Math.max(centerY - halfHeight, containerBox.top),
                right: Math.min(centerX + halfWidth, containerBox.right),
                bottom: Math.min(centerY + halfHeight, containerBox.bottom),
            };
        },
        [nodeIds, boardShotMinWidth, boardShotMinHeight, proofMarginPixels * 6],
    );
    await attachClip(testInfo, page, fileName, shotBox);
}

// the Node infos card of a node, opened from its popup menu: its GRAPH line names the graph it comes from
async function attachNodeInfosShot(testInfo, page, fileName, nodeId) {
    await openNodeMenu(page, nodeId);
    await clickPopupMenuItem(page, "Node infos");
    const infosDialog = page.locator(".ui-dialog:visible").filter({ hasText: "GRAPH" }).last();
    await expect(infosDialog).toBeVisible({ timeout: 60000 });
    const infosText = await infosDialog.innerText();
    const dialogBox = await infosDialog.boundingBox();
    await attachClip(testInfo, page, fileName, { left: dialogBox.x, top: dialogBox.y, right: dialogBox.x + dialogBox.width, bottom: dialogBox.y + Math.min(dialogBox.height, 420) });
    await page.evaluate(() => {
        var closeButtons = Array.from(document.querySelectorAll(".ui-dialog-titlebar-close"));
        closeButtons.forEach((closeButton) => closeButton.offsetParent && closeButton.click());
    });
    return infosText;
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

// a box filled with a color read from the data, when it is a plain hex color
function fillStyle(boxId, color) {
    return hexColorRegex.test(String(color)) ? [`  style ${boxId} fill:${color}`] : [];
}

// the main source and the active source, each with the sources its perimeter holds, and the sources of the
// nodes of the case placed against them
function perimetersSchema(sourceConfig, caseSources) {
    const mainPerimeter = perimeterOf(sourceConfig, sourceConfig.mainSource);
    const activePerimeter = perimeterOf(sourceConfig, sourceConfig.activeSource);
    const mermaidLines = [
        "flowchart LR",
        `  main["${mermaidText([`source principale : ${sourceConfig.mainSource}`, `périmètre : ${mainPerimeter.join(", ")}`])}"]`,
        `  active["${mermaidText([`source active : ${sourceConfig.activeSource}`, `périmètre : ${activePerimeter.join(", ")}`])}"]`,
    ];
    for (const [sourceIndex, caseSource] of caseSources.entries()) {
        const caseSourceImports = sourceConfig.sources[caseSource].imports;
        mermaidLines.push(`  case${sourceIndex}(["${mermaidText([`source du nœud : ${caseSource}`, `importe : ${caseSourceImports.length ? caseSourceImports.join(", ") : "rien"}`])}"])`);
        mermaidLines.push(`  case${sourceIndex} -- "${mermaidText([mainPerimeter.includes(caseSource) ? "dans le périmètre" : "hors du périmètre"])}" --> main`);
        mermaidLines.push(`  case${sourceIndex} -- "${mermaidText([activePerimeter.includes(caseSource) ? "dans le périmètre" : "hors du périmètre"])}" --> active`);
    }
    return mermaidLines;
}

// one node, its ancestors climbed level by level in the perimeter, the first one listed in the legend
// with its legend color, and the color the node has on the whiteboard when the verdict carries it
function colorChainSchema(verdict) {
    const boardColorLines = verdict.boardColor ? [`couleur sur le whiteboard : ${verdict.boardColor}`] : [];
    const mermaidLines = [
        "flowchart LR",
        `  node["${mermaidText([verdict.label, `source ${verdict.source}`, ...boardColorLines])}"]`,
        ...fillStyle("node", verdict.boardColor),
        `  perimeter(["${mermaidText(["ancêtres cherchés dans", verdict.perimeterSources.join(", ")])}"])`,
        "  node --> perimeter",
    ];
    let previousBox = "perimeter";
    for (const [levelIndex, levelLabels] of verdict.levelLabels.entries()) {
        const shownLabels = levelLabels.slice(0, schemaMaxListedNodes);
        const hiddenCount = levelLabels.length - shownLabels.length;
        const levelTitle = levelIndex === 0 ? (verdict.rdfType === namedIndividualType ? "classe de l'individu" : "la classe elle-même") : `ancêtres, niveau ${levelIndex}`;
        mermaidLines.push(`  level${levelIndex}["${mermaidText([levelTitle, ...shownLabels, ...(hiddenCount > 0 ? [`et ${hiddenCount} autres`] : [])])}"]`);
        mermaidLines.push(`  ${previousBox} --> level${levelIndex}`);
        previousBox = `level${levelIndex}`;
    }
    if (verdict.legendHits.length) {
        mermaidLines.push(`  hit(["${mermaidText([`premier ancêtre de la légende : ${verdict.legendHitLabel}`, `couleur de la légende : ${verdict.expectedColor}`])}"])`);
        mermaidLines.push(...fillStyle("hit", verdict.expectedColor));
    } else {
        mermaidLines.push(`  hit(["${mermaidText(["aucun ancêtre dans la légende"])}"])`);
    }
    mermaidLines.push(`  ${previousBox} --> hit`);
    return mermaidLines;
}

// the nodes of the case grouped by perimeter, legend ancestor and colors, the mismatches listed by name
function colorTallySchema(title, verdicts) {
    const groupsByKey = {};
    for (const verdict of verdicts) {
        const groupKey = [verdict.source, verdict.perimeterSources[0], verdict.legendHitLabel, verdict.expectedColor, verdict.boardColor].join("|");
        groupsByKey[groupKey] = groupsByKey[groupKey] || { firstVerdict: verdict, labels: [] };
        groupsByKey[groupKey].labels.push(verdict.label);
    }
    const mermaidLines = ["flowchart LR", `  title["${mermaidText([title, `${verdicts.length} nœuds`])}"]`];
    for (const [groupIndex, nodeGroup] of Object.values(groupsByKey).entries()) {
        const groupVerdict = nodeGroup.firstVerdict;
        const legendLine = groupVerdict.legendHitLabel ? `premier ancêtre de la légende : ${groupVerdict.legendHitLabel}, ${groupVerdict.expectedColor}` : "aucun ancêtre dans la légende";
        const shownLabels = nodeGroup.labels.slice(0, schemaMaxListedNodes);
        const hiddenCount = nodeGroup.labels.length - shownLabels.length;
        mermaidLines.push(
            `  group${groupIndex}["${mermaidText([
                `${nodeGroup.labels.length} nœuds de ${groupVerdict.source}, périmètre de ${groupVerdict.perimeterSources[0]}`,
                legendLine,
                `couleur sur le whiteboard : ${groupVerdict.boardColor}`,
                shownLabels.join(", ") + (hiddenCount > 0 ? `, et ${hiddenCount} autres` : ""),
            ])}"]`,
        );
        mermaidLines.push(...fillStyle(`group${groupIndex}`, groupVerdict.boardColor));
        mermaidLines.push(`  title --> group${groupIndex}`);
    }
    return mermaidLines;
}

// the alerts recorded during the action, with the display limit and what was drawn despite them
function truncationSchema(truncationDialogs, showLimit, drawnIndividualCount) {
    const dialogLines = truncationDialogs.length ? truncationDialogs.map((dialogMessage) => `alerte : ${dialogMessage}`) : ["aucune alerte"];
    return [
        "flowchart LR",
        `  action(["${mermaidText(["6e Children, menu clic droit All", `Lineage_whiteboard.showLimit : ${showLimit}`])}"])`,
        `  alert["${mermaidText(dialogLines)}"]`,
        `  drawn["${mermaidText([`individus de ${mainSource} dessinés : ${drawnIndividualCount}`])}"]`,
        "  action --> alert --> drawn",
    ];
}

// the legend as Config holds it, each class with its label read in the triple store
function legendSchema(legend, labelByClass) {
    const mermaidLines = ["flowchart LR", `  legend["${mermaidText([`légende ${legend.legendName}`, `${Object.keys(legend.colorByClass).length} classes`])}"]`];
    for (const [entryIndex, [classUri, color]] of Object.entries(legend.colorByClass).entries()) {
        const entryLines = labelByClass[classUri] ? [labelByClass[classUri], localName(classUri), color] : [localName(classUri), color];
        mermaidLines.push(`  entry${entryIndex}["${mermaidText(entryLines)}"]`);
        mermaidLines.push(...fillStyle(`entry${entryIndex}`, color));
        mermaidLines.push(`  legend --> entry${entryIndex}`);
    }
    return mermaidLines;
}

async function readClassLabels(page, sourceConfig, perimeterSources, classUris) {
    const query =
        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> SELECT DISTINCT ?class ?classLabel " +
        fromClauses(sourceConfig, perimeterSources) +
        ` WHERE { VALUES ?class { ${valuesList(classUris)} } ?class rdfs:label ?classLabel }`;
    const bindings = await runSparql(page, perimeterSources[0], query);
    const labelByClass = {};
    for (const binding of bindings) {
        const classUri = bindingValue(binding, "class");
        labelByClass[classUri] = labelByClass[classUri] || bindingValue(binding, "classLabel");
    }
    return { query, labelByClass };
}

// same path below the sibling ticket folder, the outputs of a ticket sitting in its playwright subfolder
function oldCodeColorsPath(testInfo) {
    const runFolder = path.dirname(testInfo.outputDir);
    const ticketFolder = path.basename(runFolder) === playwrightSubfolder ? path.dirname(runFolder) : runFolder;
    if (ticketFolder.endsWith("-ancien-code")) {
        return null;
    }
    return path.join(ticketFolder + "-ancien-code", path.relative(ticketFolder, testInfo.outputDir), "3_resultat_couleurs.json");
}

// the old and new color of every node: per color, the node counts of both runs and their gaps, then one
// sample node per source and pair of colors, shown side by side
function comparisonSchema(oldColors, newColors) {
    const allNodeIds = new Set([...Object.keys(oldColors.colorByNode), ...Object.keys(newColors.colorByNode)]);
    const sameColorIds = [];
    const changedColorIds = [];
    const missingIds = [];
    const sampleIdByColorPair = {};
    for (const nodeId of [...allNodeIds].sort()) {
        const oldColor = oldColors.colorByNode[nodeId];
        const newColor = newColors.colorByNode[nodeId];
        if (oldColor === undefined || newColor === undefined) {
            missingIds.push(nodeId);
            continue;
        }
        if (sameColor(oldColor, newColor)) {
            sameColorIds.push(nodeId);
        } else {
            changedColorIds.push(nodeId);
        }
        const colorPair = `${newColors.sourceByNode[nodeId]}|${oldColor}|${newColor}`;
        sampleIdByColorPair[colorPair] = sampleIdByColorPair[colorPair] || nodeId;
    }
    const mermaidLines = [
        "flowchart LR",
        `  verdict(["${mermaidText([
            `ancien code : ${Object.keys(oldColors.colorByNode).length} nœuds, nouveau code : ${Object.keys(newColors.colorByNode).length} nœuds`,
            `même couleur : ${sameColorIds.length}`,
            `couleur différente : ${changedColorIds.length}`,
            `absents d'un des deux relevés : ${missingIds.length}`,
        ])}"])`,
    ];
    mermaidLines.push(...colorCountLines(oldColors.colorByNode, newColors.colorByNode));
    const sampleIds = Object.values(sampleIdByColorPair);
    for (const [sampleIndex, sampleId] of sampleIds.slice(0, schemaMaxListedNodes).entries()) {
        const sampleTitle = `${newColors.labelByNode[sampleId]} (${newColors.sourceByNode[sampleId]})`;
        mermaidLines.push(`  old${sampleIndex}["${mermaidText([sampleTitle, `ancien code : ${oldColors.colorByNode[sampleId]}`])}"]`);
        mermaidLines.push(...fillStyle(`old${sampleIndex}`, oldColors.colorByNode[sampleId]));
        mermaidLines.push(`  new${sampleIndex}["${mermaidText([sampleTitle, `nouveau code : ${newColors.colorByNode[sampleId]}`])}"]`);
        mermaidLines.push(...fillStyle(`new${sampleIndex}`, newColors.colorByNode[sampleId]));
        mermaidLines.push(`  verdict ~~~ old${sampleIndex} --- new${sampleIndex}`);
    }
    return { mermaidLines, sampleIds, sameColorIds, changedColorIds, missingIds };
}

// one box per color met in either run, filled with it: its node count in each run and the nodes whose
// color differs between the runs or which only one run drew
function colorCountLines(oldColorByNode, newColorByNode) {
    const allColors = new Set([...Object.values(oldColorByNode), ...Object.values(newColorByNode)]);
    const sortedColors = [...allColors].sort();
    const allNodeIds = new Set([...Object.keys(oldColorByNode), ...Object.keys(newColorByNode)]);
    const countLines = ["  verdict ~~~ colorCounts", `  colorCounts["${mermaidText(["par couleur : ancien code, nouveau code, écarts"])}"]`];
    for (const [colorIndex, color] of sortedColors.entries()) {
        const oldCount = Object.values(oldColorByNode).filter((oldColor) => oldColor === color).length;
        const newCount = Object.values(newColorByNode).filter((newColor) => newColor === color).length;
        let gapCount = 0;
        for (const nodeId of allNodeIds) {
            const isColorInvolved = oldColorByNode[nodeId] === color || newColorByNode[nodeId] === color;
            if (isColorInvolved && oldColorByNode[nodeId] !== newColorByNode[nodeId]) {
                gapCount++;
            }
        }
        countLines.push(`  colorCount${colorIndex}["${mermaidText([color, `ancien code : ${oldCount} nœuds`, `nouveau code : ${newCount} nœuds`, `écarts : ${gapCount}`])}"]`);
        countLines.push(...fillStyle(`colorCount${colorIndex}`, color));
        countLines.push(`  colorCounts --- colorCount${colorIndex}`);
    }
    return countLines;
}

// every node with its color, label and source, for the node by node comparison with the old code
async function attachNodeColors(testInfo, title, colorVerdicts) {
    const nodeColors = { colorByNode: {}, labelByNode: {}, sourceByNode: {} };
    for (const verdict of colorVerdicts.verdicts) {
        nodeColors.colorByNode[verdict.id] = verdict.boardColor;
        nodeColors.labelByNode[verdict.id] = verdict.label;
        nodeColors.sourceByNode[verdict.id] = verdict.source;
    }
    await attachSchema(testInfo, "3_resultat_couleurs", colorTallySchema(title, colorVerdicts.verdicts), { ...nodeColors, verdicts: colorVerdicts.verdicts, queries: colorVerdicts.queries });
    return nodeColors;
}

// every node of the board, against the same test run on the old code when that run left its colors
async function compareWithOldCode(testInfo, nodeColors) {
    const oldColorsPath = oldCodeColorsPath(testInfo);
    if (!oldColorsPath || !fs.existsSync(oldColorsPath)) {
        return;
    }
    const oldColors = JSON.parse(fs.readFileSync(oldColorsPath, "utf8"));
    const comparison = comparisonSchema(oldColors, nodeColors);
    await attachSchema(testInfo, "3_resultat_ancien_code", comparison.mermaidLines, {
        oldColorsPath,
        oldColorByNode: oldColors.colorByNode,
        newColorByNode: nodeColors.colorByNode,
        sampleIds: comparison.sampleIds,
        changedColorIds: comparison.changedColorIds,
        missingIds: comparison.missingIds,
    });
    expect(comparison.changedColorIds, "nodes whose color differs from the old code").toEqual([]);
    expect(comparison.missingIds, "nodes drawn by only one of the two runs").toEqual([]);
}

// ---------- situations shared by the stories ----------

// PAZFLOR_ABOX open, BFO active, its main class drawn, then the All button on
async function setUpBfoActiveWithAllSources(testInfo, page, session, isBarShot) {
    await selectSource(page, session, bfoSource);
    await drawMainClasses(page, session);
    await setAllSourcesWithBarShots(testInfo, page, isBarShot);
}

// the source bar shot before All, where the active source alone is framed, and after, where All frames them all
async function setAllSourcesWithBarShots(testInfo, page, isBarShot) {
    if (isBarShot) {
        await attachSourceBarShot(testInfo, page, "1_situation_sources_active.png");
    }
    await setAllSources(page, true);
    if (isBarShot) {
        await attachSourceBarShot(testInfo, page, "1_situation_sources_all.png");
    }
}

async function proveSituation(testInfo, page, caseSources) {
    const sourceConfig = await readSourceConfig(page, [mainSource, bfoSource, iofCoreSource, lifexSource, ...caseSources]);
    await attachSchema(testInfo, "1_situation_perimetres", perimetersSchema(sourceConfig, caseSources), sourceConfig);
    return sourceConfig;
}

// the key node of a case: its color on the board next to its parent, its Node infos card, its color chain
async function proveKeyNode(testInfo, page, sourceConfig, nodeId, neighbourIds, shotName) {
    const boardNode = await readBoardNode(page, nodeId);
    expect(boardNode, `${localName(nodeId)} drawn on the whiteboard`).not.toBeNull();
    await attachBoardShot(testInfo, page, `3_resultat_${shotName}.png`, [nodeId, ...neighbourIds]);
    const legend = await readLegend(page);
    await attachLegendShot(testInfo, page, "3_resultat_legende.png");
    const colorVerdicts = await computeColorVerdicts(page, sourceConfig, legend, [boardNode]);
    const verdict = colorVerdicts.verdicts[0];
    await attachSchema(testInfo, "3_resultat_couleur", colorChainSchema(verdict), { legend, verdict, queries: colorVerdicts.queries });
    const infosText = await attachNodeInfosShot(testInfo, page, "3_resultat_fiche.png", nodeId);
    expect(infosText, `Node infos of ${boardNode.label} names the graph of ${boardNode.source}`).toContain(sourceConfig.sources[boardNode.source].graphUri);
    return { boardNode, legend, verdict };
}

function expectNoDialog(session) {
    expect(session.dialogMessages, "alerts shown while the case ran").toEqual([]);
}

// ---------- R1 ----------

test.describe("R1 La couleur d'un nœud est celle de son premier ancêtre dans la légende", () => {
    test("R1a Un enfant de classe déclaré dans une source importée par la source principale mais hors du périmètre de la source active prend la couleur de son ancêtre de la légende", async ({
        page,
    }, testInfo) => {
        const session = await openLineage(page);
        await setUpBfoActiveWithAllSources(testInfo, page, session, true);
        await clickChildren(page, session, 1);
        const sourceConfig = await proveSituation(testInfo, page, [iofCoreSource]);
        await attachBoardShot(testInfo, page, "1_situation_parent.png", [nodeUris.occurrent]);
        expect(await readBoardNode(page, nodeUris.event)).toBeNull();
        await attachElementShot(testInfo, page, "2_action_children.png", childrenButtonSelector);

        await clickChildren(page, session, 1);

        const keyNode = await proveKeyNode(testInfo, page, sourceConfig, nodeUris.event, [nodeUris.occurrent], "event");
        expect(keyNode.boardNode.source).toBe(iofCoreSource);
        expect(perimeterOf(sourceConfig, mainSource)).toContain(iofCoreSource);
        expect(perimeterOf(sourceConfig, bfoSource)).not.toContain(iofCoreSource);
        expect(keyNode.verdict.legendHits.map((legendHit) => legendHit.classUri)).toEqual([nodeUris.occurrent]);
        expectColorVerdict(keyNode.verdict);
        expectNoDialog(session);
    });

    test("R1b Même règle pour un enfant d'une source qui importe à son tour (LIFEX_FPSO importe IOF-CORE-202401 et BFO)", async ({ page }, testInfo) => {
        const session = await openLineage(page);
        await setUpBfoActiveWithAllSources(testInfo, page, session, true);
        await clickChildren(page, session, 3);
        const sourceConfig = await proveSituation(testInfo, page, [lifexSource]);
        expect(sourceConfig.sources[lifexSource].imports).toEqual(expect.arrayContaining([iofCoreSource, bfoSource]));
        await attachBoardShot(testInfo, page, "1_situation_parent.png", [nodeUris.genericallyDependentContinuant]);
        expect(await readBoardNode(page, nodeUris.cost)).toBeNull();
        await attachElementShot(testInfo, page, "2_action_children.png", childrenButtonSelector);

        await clickChildren(page, session, 1);

        const keyNode = await proveKeyNode(testInfo, page, sourceConfig, nodeUris.cost, [], "cost");
        expect(keyNode.boardNode.source).toBe(lifexSource);
        expect(perimeterOf(sourceConfig, mainSource)).toContain(lifexSource);
        expect(perimeterOf(sourceConfig, bfoSource)).not.toContain(lifexSource);
        expect(keyNode.verdict.legendHits.map((legendHit) => legendHit.classUri)).toEqual([nodeUris.genericallyDependentContinuant]);
        expectColorVerdict(keyNode.verdict);
        expectNoDialog(session);
    });

    test("R1c Un individu d'une source hors du périmètre de la source active prend la couleur de l'ancêtre de la légende de sa classe", async ({ page }, testInfo) => {
        const session = await openLineage(page);
        await setUpBfoActiveWithAllSources(testInfo, page, session, true);
        await clickChildrenMenuAll(page, session, 5);
        const sourceConfig = await proveSituation(testInfo, page, [mainSource]);
        const nodesBefore = await readBoardNodes(page);
        expect(nodesBefore.filter((boardNode) => boardNode.rdfType === namedIndividualType)).toEqual([]);
        expect(await readBoardNode(page, nodeUris.tagClass), "class Tag drawn before the 6th Children").not.toBeNull();
        await attachBoardShot(testInfo, page, "1_situation_classe.png", [nodeUris.tagClass]);
        await page.click(childrenButtonSelector, { button: "right" });
        await attachPopupMenuShot(testInfo, page, "2_action_menu_children.png");
        await page.keyboard.press("Escape");

        await clickChildrenMenuAll(page, session, 1);

        // the 6th answer holds more rows than Lineage_whiteboard.showLimit draws, as the rules page notes
        const unexpectedDialogs = session.dialogMessages.filter((dialogMessage) => !tooManyNodesRegex.test(dialogMessage));
        expect(unexpectedDialogs, "alerts other than the display limit").toEqual([]);
        const truncationDialogs = session.dialogMessages.filter((dialogMessage) => tooManyNodesRegex.test(dialogMessage));
        const boardNodes = await readBoardNodes(page);
        const mainIndividuals = boardNodes.filter((boardNode) => boardNode.rdfType === namedIndividualType && boardNode.source === mainSource);
        const showLimit = await page.evaluate(() => Lineage_whiteboard.showLimit);
        await attachSchema(testInfo, "3_resultat_alerte", truncationSchema(truncationDialogs, showLimit, mainIndividuals.length), {
            dialogMessages: session.dialogMessages,
            showLimit,
            drawnIndividualCount: mainIndividuals.length,
        });
        expect(truncationDialogs.length, "display limit alert of the 6th Children").toBeGreaterThan(0);
        expect(mainIndividuals.length, "individuals of PAZFLOR_ABOX drawn").toBeGreaterThan(0);
        expect(perimeterOf(sourceConfig, bfoSource)).not.toContain(mainSource);
        // the example of the rules page when the truncated answer holds it, the first individual by id otherwise
        const individualIds = mainIndividuals.map((individualNode) => individualNode.id);
        individualIds.sort();
        const keyIndividualId = individualIds.includes(nodeUris.tagIndividual) ? nodeUris.tagIndividual : individualIds[0];
        const keyNode = await proveKeyNode(testInfo, page, sourceConfig, keyIndividualId, [], "individu");
        // the search of the whiteboard draws the found node as a star, next to its class
        await searchOnBoard(page, keyNode.boardNode.label);
        await attachBoardShot(testInfo, page, "3_resultat_individu_recherche.png", [keyIndividualId], closeUpScale);
        await attachBoardShot(testInfo, page, "3_resultat_individu_classe.png", [keyIndividualId, nodeUris.tagClass]);
        const colorVerdicts = await computeColorVerdicts(page, sourceConfig, keyNode.legend, mainIndividuals);
        await attachSchema(testInfo, "3_resultat_couleurs", colorTallySchema(`Individus de ${mainSource} dessinés au 6e Children`, colorVerdicts.verdicts), {
            dialogMessages: session.dialogMessages,
            verdicts: colorVerdicts.verdicts,
            queries: colorVerdicts.queries,
        });
        expect(keyNode.verdict.legendHits.length, `${keyNode.boardNode.label}: a legend ancestor through its class`).toBeGreaterThan(0);
        for (const verdict of colorVerdicts.verdicts) {
            expectColorVerdict(verdict);
        }
    });

    test("R1d Expand sur un nœud d'une source hors du périmètre de la source active : ses enfants prennent la couleur de leur ancêtre de la légende", async ({ page }, testInfo) => {
        const session = await openLineage(page);
        await setUpBfoActiveWithAllSources(testInfo, page, session, false);
        await clickChildren(page, session, 3);
        await setAllSources(page, false);
        await attachSourceBarShot(testInfo, page, "1_situation_sources.png");
        const sourceConfig = await proveSituation(testInfo, page, [iofCoreSource]);
        const parentNode = await readBoardNode(page, nodeUris.iofInformationContentEntity);
        expect(parentNode).toMatchObject({ source: iofCoreSource });
        expect(perimeterOf(sourceConfig, bfoSource)).not.toContain(iofCoreSource);
        await attachBoardShot(testInfo, page, "1_situation_parent.png", [nodeUris.iofInformationContentEntity]);
        const childIdsBefore = await readChildIds(page, nodeUris.iofInformationContentEntity);
        await attachNodeMenuShots(testInfo, page, "2_action_expand", nodeUris.iofInformationContentEntity);

        await clickPopupMenuItem(page, "Expand");
        await waitForSettledBoard(page, session);

        const childIds = await readChildIds(page, nodeUris.iofInformationContentEntity);
        const addedChildIds = childIds.filter((childId) => !childIdsBefore.includes(childId));
        expect(addedChildIds.length, "children drawn by Expand").toBeGreaterThan(0);
        expect(addedChildIds).toContain(nodeUris.designSpecification);
        await attachBoardShot(testInfo, page, "3_resultat_enfants.png", [nodeUris.iofInformationContentEntity, ...addedChildIds]);
        const boardNodes = await readBoardNodes(page);
        const addedChildren = boardNodes.filter((boardNode) => addedChildIds.includes(boardNode.id));
        const legend = await readLegend(page);
        await attachLegendShot(testInfo, page, "3_resultat_legende.png");
        const colorVerdicts = await computeColorVerdicts(page, sourceConfig, legend, addedChildren);
        await attachSchema(testInfo, "3_resultat_couleurs", colorTallySchema(`Enfants d'information content entity dessinés par Expand`, colorVerdicts.verdicts), {
            legend,
            verdicts: colorVerdicts.verdicts,
            queries: colorVerdicts.queries,
        });
        const designVerdict = colorVerdicts.verdicts.find((verdict) => verdict.id === nodeUris.designSpecification);
        await attachSchema(testInfo, "3_resultat_couleur", colorChainSchema(designVerdict), { legend, verdict: designVerdict });
        expect(designVerdict.legendHits.map((legendHit) => legendHit.classUri)).toEqual([nodeUris.genericallyDependentContinuant]);
        for (const verdict of colorVerdicts.verdicts) {
            expectColorVerdict(verdict);
        }
        expectNoDialog(session);
    });

    test("R1e Un enfant déclaré dans la source active garde la couleur de son ancêtre de la légende", async ({ page }, testInfo) => {
        const session = await openLineage(page);
        await setUpBfoActiveWithAllSources(testInfo, page, session, true);
        const sourceConfig = await proveSituation(testInfo, page, [bfoSource]);
        await attachBoardShot(testInfo, page, "1_situation_parent.png", [nodeUris.entity]);
        await attachElementShot(testInfo, page, "2_action_children.png", childrenButtonSelector);

        await clickChildren(page, session, 1);

        const childNodes = [];
        for (const childId of [nodeUris.occurrent, nodeUris.continuant]) {
            const childNode = await readBoardNode(page, childId);
            expect(childNode, `${localName(childId)} drawn`).toMatchObject({ source: bfoSource });
            childNodes.push(childNode);
        }
        await attachBoardShot(testInfo, page, "3_resultat_enfants.png", [nodeUris.entity, nodeUris.occurrent, nodeUris.continuant]);
        const legend = await readLegend(page);
        await attachLegendShot(testInfo, page, "3_resultat_legende.png");
        const colorVerdicts = await computeColorVerdicts(page, sourceConfig, legend, childNodes);
        await attachSchema(testInfo, "3_resultat_couleurs", colorTallySchema(`Enfants d'entity déclarés dans ${bfoSource}, source active`, colorVerdicts.verdicts), {
            legend,
            verdicts: colorVerdicts.verdicts,
            queries: colorVerdicts.queries,
        });
        for (const verdict of colorVerdicts.verdicts) {
            // occurrent and continuant are listed in the legend themselves
            expect(verdict.legendHits.map((legendHit) => legendHit.classUri)).toEqual([verdict.id]);
            expectColorVerdict(verdict);
        }
        expectNoDialog(session);
    });

    test("R1f Avec la source principale active, chaque nœud garde la couleur qu'il a aujourd'hui", async ({ page }, testInfo) => {
        const session = await openLineage(page);
        await drawMainClasses(page, session);
        await setAllSourcesWithBarShots(testInfo, page, true);
        const sourceConfig = await proveSituation(testInfo, page, [mainSource, lifexSource]);
        expect(sourceConfig.activeSource).toBe(mainSource);
        await attachElementShot(testInfo, page, "2_action_children.png", childrenButtonSelector);
        await clickChildren(page, session, 1);
        // the classes of PAZFLOR_ABOX all descend from generically dependent continuant: Parents climbs to entity,
        // Expand opens the other BFO branches, so that the nodes cover several legend colors and the gray
        await attachElementShot(testInfo, page, "2_action_parents.png", parentsButtonSelector);
        await clickParentsUntilDrawn(page, session, nodeUris.entity);
        const expandedNodes = { entity: nodeUris.entity, continuant: nodeUris.continuant, occurrent: nodeUris.occurrent, sdc: nodeUris.specificallyDependentContinuant };
        for (const [shotName, expandedId] of Object.entries(expandedNodes)) {
            await attachNodeMenuShots(testInfo, page, `2_action_expand_${shotName}`, expandedId);
            await clickPopupMenuItem(page, "Expand");
            await waitForSettledBoard(page, session);
        }

        const boardNodes = await readBoardNodes(page);
        const legend = await readLegend(page);
        await attachLegendShot(testInfo, page, "3_resultat_legende.png");
        expect(legend.shownEntries.length, "every class of the legend shown in the Query Legend panel").toBe(Object.keys(legend.colorByClass).length);
        await attachBoardShot(testInfo, page, "3_resultat_echantillon.png", [
            nodeUris.entity,
            nodeUris.continuant,
            nodeUris.occurrent,
            nodeUris.specificallyDependentContinuant,
            nodeUris.genericallyDependentContinuant,
        ]);
        const colorVerdicts = await computeColorVerdicts(page, sourceConfig, legend, boardNodes);
        const nodeColors = await attachNodeColors(testInfo, `${mainSource} active : Main classes, Children, Parents jusqu'à entity, Expand`, colorVerdicts);
        for (const verdict of colorVerdicts.verdicts) {
            expectColorVerdict(verdict);
        }
        // colors reached through an ancestor, the classes of the legend left aside
        const inheritedColorVerdicts = colorVerdicts.verdicts.filter((verdict) => !legend.colorByClass[verdict.id]);
        const inheritedLegendColors = new Set(inheritedColorVerdicts.map((verdict) => verdict.expectedColor));
        inheritedLegendColors.delete(null);
        expect(inheritedLegendColors.size, "distinct legend colors reached through an ancestor").toBeGreaterThanOrEqual(minDistinctLegendColors);
        expect(
            inheritedColorVerdicts.some((verdict) => sameColor(verdict.boardColor, grayColor)),
            "a gray node",
        ).toBe(true);
        await compareWithOldCode(testInfo, nodeColors);
        expectNoDialog(session);
    });

    test("R1g Une classe sans ancêtre dans la légende reste grise", async ({ page }, testInfo) => {
        const session = await openLineage(page);
        await selectSource(page, session, bfoSource);
        await attachSourceBarShot(testInfo, page, "1_situation_sources.png");
        const sourceConfig = await proveSituation(testInfo, page, [bfoSource]);
        await attachElementShot(testInfo, page, "2_action_main_classes.png", mainClassesButtonSelector);

        await drawMainClasses(page, session);

        const entityNode = await readBoardNode(page, nodeUris.entity);
        expect(entityNode, "entity drawn by Main classes").not.toBeNull();
        await attachBoardShot(testInfo, page, "3_resultat_entity.png", [nodeUris.entity]);
        const legend = await readLegend(page);
        const colorVerdicts = await computeColorVerdicts(page, sourceConfig, legend, [entityNode]);
        const verdict = colorVerdicts.verdicts[0];
        const legendClassLabels = await readClassLabels(page, sourceConfig, [bfoSource], Object.keys(legend.colorByClass));
        await attachSchema(testInfo, "3_resultat_legende_config", legendSchema(legend, legendClassLabels.labelByClass), { legend, legendClassLabels });
        await attachSchema(testInfo, "3_resultat_couleur", colorChainSchema(verdict), { legend, verdict, queries: colorVerdicts.queries });
        expect(Object.keys(legend.colorByClass)).not.toContain(nodeUris.entity);
        expect(verdict.legendHits).toEqual([]);
        expectColorVerdict(verdict);
        expectNoDialog(session);
    });

    test("R1h Un nœud d'une source ajoutée par « + » et non importée par la source principale prend la couleur de son ancêtre de la légende, calculée chez sa propre source, même quand une autre source est active", async ({
        page,
    }, testInfo) => {
        const session = await openLineage(page);
        await addSourceWithPlusButton(page, session, addedSource);
        await setUpBfoActiveWithAllSources(testInfo, page, session, true);
        await clickChildren(page, session, 3);
        const sourceConfig = await proveSituation(testInfo, page, [addedSource]);
        expect(perimeterOf(sourceConfig, mainSource)).not.toContain(addedSource);
        expect(sourceConfig.sources[addedSource].imports).toContain(bfoSource);
        await attachElementShot(testInfo, page, "2_action_children.png", childrenButtonSelector);

        await clickChildren(page, session, 1);

        const keyNode = await proveKeyNode(testInfo, page, sourceConfig, nodeUris.iaoInformationContentEntity, [], "ice_iao");
        expect(keyNode.boardNode.source).toBe(addedSource);
        expect(keyNode.verdict.perimeterSources).toEqual(perimeterOf(sourceConfig, addedSource));
        expect(keyNode.verdict.legendHits.map((legendHit) => legendHit.classUri)).toEqual([nodeUris.genericallyDependentContinuant]);
        // in the perimeter of the main source alone the class has no legend ancestor, as the rules page notes
        const mainPerimeterAncestors = await readAncestorLinks(page, sourceConfig, perimeterOf(sourceConfig, mainSource), [nodeUris.iaoInformationContentEntity]);
        // a computation the rules do not make: no whiteboard color to show next to it
        const mainPerimeterVerdict = { ...colorVerdict(keyNode.boardNode, [nodeUris.iaoInformationContentEntity], mainPerimeterAncestors, keyNode.legend.colorByClass), boardColor: null };
        await attachSchema(testInfo, "3_resultat_perimetre_principal", colorChainSchema(mainPerimeterVerdict), {
            ancestorQuery: mainPerimeterAncestors.query,
            ancestorLinks: mainPerimeterAncestors.links,
            verdict: mainPerimeterVerdict,
        });
        expect(mainPerimeterVerdict.legendHits).toEqual([]);
        expectColorVerdict(keyNode.verdict);
        const boardNodes = await readBoardNodes(page);
        const addedSourceNodes = boardNodes.filter((boardNode) => boardNode.source === addedSource);
        const colorVerdicts = await computeColorVerdicts(page, sourceConfig, keyNode.legend, addedSourceNodes);
        await attachSchema(testInfo, "3_resultat_couleurs", colorTallySchema(`Nœuds de ${addedSource} au 4e Children, ${bfoSource} active`, colorVerdicts.verdicts), {
            verdicts: colorVerdicts.verdicts,
            queries: colorVerdicts.queries,
        });
        for (const verdict of colorVerdicts.verdicts) {
            expectColorVerdict(verdict);
        }
        expectNoDialog(session);
    });

    test("R1i Quand la source ajoutée par « + » est active, ses nœuds gardent la couleur qu'ils ont aujourd'hui", async ({ page }, testInfo) => {
        const session = await openLineage(page);
        await addSourceWithPlusButton(page, session, addedSource);
        await selectSource(page, session, addedSource);
        await drawMainClasses(page, session);
        await attachSourceBarShot(testInfo, page, "1_situation_sources.png");
        const sourceConfig = await proveSituation(testInfo, page, [addedSource]);
        expect(sourceConfig.activeSource).toBe(addedSource);
        expect(perimeterOf(sourceConfig, mainSource)).not.toContain(addedSource);
        await clickChildren(page, session, 3);
        await attachElementShot(testInfo, page, "2_action_children.png", childrenButtonSelector);

        await clickChildren(page, session, 1);

        const boardNodes = await readBoardNodes(page);
        const legend = await readLegend(page);
        await attachLegendShot(testInfo, page, "3_resultat_legende.png");
        const colorVerdicts = await computeColorVerdicts(page, sourceConfig, legend, boardNodes);
        const nodeColors = await attachNodeColors(testInfo, `${addedSource} ajoutée par + et active, Main classes puis Children quatre fois`, colorVerdicts);
        const addedSourceVerdicts = colorVerdicts.verdicts.filter((verdict) => verdict.source === addedSource);
        // gray nodes alone would not tell the perimeter of IAO from the perimeter of the main source, where IAO has no ancestor
        const coloredAddedSourceVerdicts = addedSourceVerdicts.filter((verdict) => !sameColor(verdict.boardColor, grayColor));
        expect(coloredAddedSourceVerdicts.length, `nodes of ${addedSource} drawn in a legend color`).toBeGreaterThan(0);
        const coloredSampleIds = coloredAddedSourceVerdicts.map((verdict) => verdict.id);
        coloredSampleIds.sort();
        await attachBoardShot(testInfo, page, "3_resultat_echantillon.png", [coloredSampleIds[0]]);
        for (const verdict of addedSourceVerdicts) {
            expect(verdict.perimeterSources).toEqual(perimeterOf(sourceConfig, addedSource));
            expectColorVerdict(verdict);
        }
        await compareWithOldCode(testInfo, nodeColors);
        expectNoDialog(session);
    });
});
