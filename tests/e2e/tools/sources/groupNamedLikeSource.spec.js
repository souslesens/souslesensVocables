// A source group segment must never carry the name of a source: the source selector tree gives both the
// bare name as jstree id, so a shared name drops a source from the selector or hangs sources under another
// source. Each test tells its case as a story, situation, action, result, with the screenshots and the
// data it captured attached in that order.
//
// Runs only against the sandbox server of groupNamedLikeSourceSandbox.js, whose sources.json and
// profiles each test rewrites, with a single worker since the tests share those files:
//   SLS_URL=http://localhost:3020 SLS_SANDBOX_CONFIG=<sandbox config folder> SLS_SERVER_ROOT=<repo the server runs from> \
//     npx playwright test tests/e2e/tools/sources/groupNamedLikeSource.spec.js --workers=1
// SLS_SERVER_ROOT is where the migration is taken from, so the old code run takes the old one.
// SLS_NODE_COVERAGE, when set, is the NODE_V8_COVERAGE folder of the migration runs.

/* global $, document, CreateSLSVsource_bot */
import { test, expect } from "@playwright/test";
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import knex from "knex";

const baseUrl = process.env.SLS_URL || "http://localhost:3020";
const sandboxConfigFolder = process.env.SLS_SANDBOX_CONFIG;
const serverRoot = process.env.SLS_SERVER_ROOT || process.cwd();
const migrationScript = "scripts/migrations/migration_3.16.0_sources_group_named_like_source.js";
const sourceTemplatePath = "tests/data/config/sources.json";
const sourceSelectorTreeSelector = "#sourceSelector_jstreeDiv";
const createSourceDialogSelector = ".MuiDialog-root";
const sourcesApiPath = "/sources";
const sandboxProfileName = "sandbox_readers";
// nothing listens there, the connection is refused at once
const unreachableDatabasePort = 1;
const proofMarginPixels = 6;
const mermaidUnsafeCharRegex = /["<>]/g;
// mermaid entity codes, a raw quote or angle bracket breaks the box label
const mermaidEntityByChar = { '"': "#quot;", "<": "#lt;", ">": "#gt;" };
const lineBreakRegex = /\r?\n/;

if (!sandboxConfigFolder) {
    throw new Error("SLS_SANDBOX_CONFIG must name the config folder of the sandbox server");
}

test.use({ baseURL: baseUrl, viewport: { width: 1400, height: 1000 } });
test.describe.configure({ timeout: 120000 });

// ---------- sandbox data ----------

const sourceTemplate = JSON.parse(fs.readFileSync(sourceTemplatePath, "utf8")).SOURCE_1;

function sourceDescriptor(name, schemaType, group) {
    const controller = schemaType === "OWL" ? "Sparql_OWL" : "Sparql_SKOS";
    return { ...sourceTemplate, name, id: name, schemaType, group, controller, graphUri: `http://sandbox.org/${name}/` };
}

// each entry is [name, schemaType, group]
function writeSandboxSources(sourceRows) {
    const sources = {};
    for (const [name, schemaType, group] of sourceRows) {
        sources[name] = sourceDescriptor(name, schemaType, group);
    }
    fs.writeFileSync(path.join(sandboxConfigFolder, "sources.json"), JSON.stringify(sources, null, 2));
}

function readSources(configFolder = sandboxConfigFolder) {
    return JSON.parse(fs.readFileSync(path.join(configFolder, "sources.json"), "utf8"));
}

const equipmentSources = [
    ["PUMPS", "OWL", "ENGINEERING/EQUIPMENT"],
    ["VALVES", "OWL", "ENGINEERING/EQUIPMENT"],
    ["GEMET", "SKOS", "THESAURI"],
    ["GLOSSARY", "SKOS", ""],
];
const sourceInItsOwnGroupSources = [
    ["ISO", "OWL", "ISO"],
    ["ISO_PART2", "OWL", "ISO/PARTS"],
    ["PUMPS", "OWL", "ENGINEERING"],
];
const groupNamedLikeOtherSourceSources = [
    ["ALPHA", "OWL", "BETA"],
    ["BETA", "OWL", "STANDARDS"],
];
const suffixAlreadyTakenSources = [
    ["GAMMA", "OWL", "DELTA"],
    ["DELTA", "OWL", "STANDARDS"],
    ["DELTA-Group", "OWL", "STANDARDS"],
];
const profileAccessControl = {
    OWL: "read",
    "OWL/ISO": "readwrite",
    "OWL/ISO/PARTS": "read",
    "OWL/BETA/ALPHA": "readwrite",
    "OWL/STANDARDS": "read",
};

async function withSandboxDatabase(action) {
    const mainConfig = JSON.parse(fs.readFileSync(path.join(sandboxConfigFolder, "mainConfig.json"), "utf8"));
    const connection = knex({ client: "pg", connection: mainConfig.database });
    try {
        return await action(connection);
    } finally {
        await connection.destroy();
    }
}

async function writeSandboxProfile(accessControl) {
    await withSandboxDatabase(async (connection) => {
        await connection("profiles").where("label", sandboxProfileName).delete();
        await connection("profiles").insert({ label: sandboxProfileName, access_control: JSON.stringify(accessControl), schema_types: ["OWL"] });
    });
}

async function readSandboxProfileAccessControl() {
    return withSandboxDatabase(async (connection) => {
        const profileRow = await connection("profiles").where("label", sandboxProfileName).first();
        return profileRow.access_control;
    });
}

// the migration as npm run migrate launches it, with -w unless isDryRun
function runMigration({ configFolder = sandboxConfigFolder, isDryRun = false } = {}) {
    const migrationEnvironment = { ...process.env };
    if (process.env.SLS_NODE_COVERAGE) {
        migrationEnvironment.NODE_V8_COVERAGE = process.env.SLS_NODE_COVERAGE;
    }
    const migrationArguments = [migrationScript, "-c", configFolder];
    if (!isDryRun) {
        migrationArguments.push("-w");
    }
    const migrationProcess = spawnSync(process.execPath, migrationArguments, { cwd: serverRoot, env: migrationEnvironment, encoding: "utf8" });
    const shownCommand = `node ${path.basename(migrationScript)} -c config${isDryRun ? "" : " -w"}`;
    // the sandbox folder is a long temporary path, shown as the config folder it stands for
    const consoleLines = migrationProcess.stdout.split(lineBreakRegex);
    const shownConsoleLines = consoleLines.map((consoleLine) => consoleLine.replaceAll(path.resolve(configFolder), "config"));
    return { command: shownCommand, exitCode: migrationProcess.status, consoleLines: shownConsoleLines, errorOutput: migrationProcess.stderr };
}

function expectMigrationSucceeded(migrationRun) {
    expect(migrationRun.errorOutput).toBe("");
    expect(migrationRun.exitCode).toBe(0);
}

// a copy of the sandbox config whose database refuses every connection
function copySandboxConfigWithUnreachableDatabase() {
    const brokenConfigFolder = sandboxConfigFolder + "-unreachable-database";
    fs.rmSync(brokenConfigFolder, { recursive: true, force: true });
    fs.mkdirSync(brokenConfigFolder);
    fs.copyFileSync(path.join(sandboxConfigFolder, "sources.json"), path.join(brokenConfigFolder, "sources.json"));
    const mainConfig = JSON.parse(fs.readFileSync(path.join(sandboxConfigFolder, "mainConfig.json"), "utf8"));
    mainConfig.database = { ...mainConfig.database, port: unreachableDatabasePort };
    fs.writeFileSync(path.join(brokenConfigFolder, "mainConfig.json"), JSON.stringify(mainConfig));
    return brokenConfigFolder;
}

// ---------- proofs ----------

test.beforeEach(async ({ page }) => {
    await page.coverage.startJSCoverage({ resetOnNavigation: false });
});

test.afterEach(async ({ page }, testInfo) => {
    const coverageEntries = await page.coverage.stopJSCoverage();
    fs.writeFileSync(testInfo.outputPath("couverture.json"), JSON.stringify(coverageEntries));
});

async function attachShot(testInfo, page, fileName, locator) {
    const filePath = testInfo.outputPath(fileName);
    await locator.screenshot({ path: filePath });
    await testInfo.attach(fileName, { path: filePath, contentType: "image/png" });
}

// one screenshot framing several elements, so a search shows its term next to its result
async function attachFramedShot(testInfo, page, fileName, locators) {
    const boxes = [];
    for (const locator of locators) {
        boxes.push(await locator.boundingBox());
    }
    const left = Math.min(...boxes.map((box) => box.x)) - proofMarginPixels;
    const top = Math.min(...boxes.map((box) => box.y)) - proofMarginPixels;
    const right = Math.max(...boxes.map((box) => box.x + box.width)) + proofMarginPixels;
    const bottom = Math.max(...boxes.map((box) => box.y + box.height)) + proofMarginPixels;
    const filePath = testInfo.outputPath(fileName);
    await page.screenshot({ path: filePath, clip: { x: left, y: top, width: right - left, height: bottom - top } });
    await testInfo.attach(fileName, { path: filePath, contentType: "image/png" });
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

function exchangeSchema(exchange) {
    return [
        "flowchart LR",
        `  request["${mermaidText([`${exchange.method} ${exchange.url}`, `name: ${exchange.name}`, `group: ${exchange.group}`])}"]`,
        `  response["${mermaidText([`HTTP ${exchange.status}`, exchange.message || ""])}"]`,
        "  request --> response",
    ];
}

function sourceWritesSchema(trigger, sourceWrites) {
    const writeLines = sourceWrites.map((sourceWrite) => `${sourceWrite.method} ${sourceWrite.path} : HTTP ${sourceWrite.status}`);
    return ["flowchart LR", `  trigger["${mermaidText([trigger])}"] --> writes["${mermaidText(["Écritures de source envoyées :", ...(writeLines.length ? writeLines : ["aucune"])])}"]`];
}

function groupsSchema(sourcesBySnapshot) {
    const mermaidLines = ["flowchart LR"];
    for (const [snapshotIndex, [snapshotTitle, sources]] of Object.entries(sourcesBySnapshot).entries()) {
        mermaidLines.push(`  subgraph snapshot${snapshotIndex}["${mermaidText([snapshotTitle])}"]`);
        for (const [sourceIndex, source] of Object.values(sources).entries()) {
            mermaidLines.push(`    snapshot${snapshotIndex}_${sourceIndex}["${mermaidText([source.name, `group: ${source.group}`])}"]`);
        }
        mermaidLines.push("  end");
    }
    return mermaidLines;
}

function accessControlSchema(accessControlBefore, accessControlAfter, titles) {
    const mermaidLines = ["flowchart LR", `  titleBefore["${mermaidText([titles[0]])}"] ~~~ titleAfter["${mermaidText([titles[1]])}"]`];
    const pathsBefore = Object.keys(accessControlBefore);
    const pathsAfter = Object.keys(accessControlAfter);
    for (const [pathIndex, treePathBefore] of pathsBefore.entries()) {
        const treePathAfter = pathsAfter[pathIndex];
        const arrow = treePathBefore === treePathAfter ? "-- inchangée -->" : "-- renommée -->";
        mermaidLines.push(
            `  before${pathIndex}["${mermaidText([`${treePathBefore}: ${accessControlBefore[treePathBefore]}`])}"] ${arrow} after${pathIndex}["${mermaidText([`${treePathAfter}: ${accessControlAfter[treePathAfter]}`])}"]`,
        );
    }
    return mermaidLines;
}

function migrationRunSchema(migrationRun) {
    const errorLines = migrationRun.errorOutput.split(lineBreakRegex);
    const connectionErrorLines = errorLines.filter((errorLine) => errorLine.includes("ECONNREFUSED"));
    const consoleLines = migrationRun.consoleLines.filter((consoleLine) => consoleLine.trim() !== "");
    return [
        "flowchart LR",
        `  command["${mermaidText([migrationRun.command])}"] --> outcome["${mermaidText([`code de sortie ${migrationRun.exitCode}`, ...consoleLines, ...connectionErrorLines.slice(0, 1)])}"]`,
    ];
}

function selectorNodesSchema(sharedName, namedNodes) {
    const nodeLines = namedNodes.map((namedNode) => `${namedNode.isSource ? "source" : "dossier"} ${sharedName}, chemin ${namedNode.path.join(" / ")}`);
    return ["flowchart LR", `  tree["${mermaidText([`Nœuds nommés ${sharedName} dans l'arbre du sélecteur`])}"] --> nodes["${mermaidText(nodeLines.length ? nodeLines : ["aucun"])}"]`];
}

// the source writes the page sends while it runs an action, read on the network
function recordSourceWrites(page) {
    const sourceWrites = [];
    page.on("response", (response) => {
        const request = response.request();
        const requestPath = new URL(request.url()).pathname;
        if (request.method() !== "GET" && requestPath.includes(sourcesApiPath)) {
            sourceWrites.push({ method: request.method(), path: requestPath, status: response.status() });
        }
    });
    return sourceWrites;
}

// ---------- application actions ----------

// the source selector Lineage opens on, every folder unfolded
async function openSourceSelector(page) {
    await page.goto("/vocables/?tool=lineage", { waitUntil: "networkidle" });
    await page.waitForSelector(sourceSelectorTreeSelector, { timeout: 60000 });
    await page.waitForTimeout(3000);
    await page.evaluate((treeSelector) => {
        var tree = $(treeSelector).jstree(true);
        if (tree && tree.open_all) {
            tree.open_all();
        }
    }, sourceSelectorTreeSelector);
    await page.waitForTimeout(1000);
    return page.locator(sourceSelectorTreeSelector);
}

// the folders above a selectable source in the selector, outermost first, null when the source is not in it;
// a folder sharing the name of the source is not the source
async function sourceSelectorPath(page, sourceName) {
    const namedNodes = await selectorNodesNamed(page, sourceName);
    const sourceNode = namedNodes.find((namedNode) => namedNode.isSource);
    return sourceNode ? sourceNode.path.slice(0, -1) : null;
}

// the entries the selector displays under a name, with the folders shown above them; a folder and a source
// sharing a name get one jstree id, so the selector keeps one of the two, not always the same
async function selectorNodesNamed(page, sharedName) {
    return page.evaluate(
        ([treeSelector, sharedName]) => {
            var tree = $(treeSelector).jstree(true);
            var anchors = Array.from(document.querySelectorAll(treeSelector + " .jstree-anchor"));
            var namedAnchors = anchors.filter((anchor) => anchor.innerText.trim() === sharedName);
            return namedAnchors.map((namedAnchor) => {
                var treeItem = namedAnchor.closest("li");
                var displayedPath = [sharedName];
                var parentItem = treeItem.parentElement.closest("li");
                while (parentItem) {
                    displayedPath.unshift(parentItem.querySelector(":scope > .jstree-anchor").innerText.trim());
                    parentItem = parentItem.parentElement.closest("li");
                }
                var modelNode = tree.get_node(treeItem.id);
                return { isSource: Boolean(modelNode.data && modelNode.data.type === "source"), path: displayedPath };
            });
        },
        [sourceSelectorTreeSelector, sharedName],
    );
}

function isFolderAndSourceShown(namedNodes) {
    return namedNodes.some((namedNode) => namedNode.isSource) && namedNodes.some((namedNode) => !namedNode.isSource);
}

async function openConfigEditorSources(page) {
    await page.goto("/vocables/?tool=ConfigEditor", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Create source" }).waitFor({ timeout: 60000 });
}

function sourcesTable(page) {
    return page.locator("table").filter({ hasText: "Graph URI" }).first();
}

// the sources table filtered on a name, shot with the search field so the searched term shows
async function attachSourcesSearch(testInfo, page, fileName, sourceName) {
    await openConfigEditorSources(page);
    await page.locator("#search-sources").fill(sourceName);
    await page.waitForTimeout(1000);
    const searchField = page.locator("#search-sources").locator("xpath=ancestor::div[contains(@class,'MuiFormControl-root')][1]");
    await attachFramedShot(testInfo, page, fileName, [searchField, sourcesTable(page)]);
}

async function fillCreateSourceDialog(page, sourceName, group) {
    await page.getByRole("button", { name: "Create source" }).click();
    const dialog = page.locator(createSourceDialogSelector);
    await dialog.locator("#name").fill(sourceName);
    await dialog.locator("#graphUri").fill(`http://sandbox.org/${sourceName}/`);
    await dialog.locator("#prefix").fill(sourceName.toLowerCase());
    await dialog.locator("#baseUri").fill(`http://sandbox.org/${sourceName}/`);
    await dialog.locator("#group").fill(group);
    await dialog.locator("#group").press("Enter");
    return dialog;
}

function dialogField(dialog, fieldId) {
    return dialog.locator(`#${fieldId}`).locator("xpath=ancestor::div[contains(@class,'MuiFormControl-root')][1]");
}

async function submitCreateSourceDialog(page, dialog) {
    const sourceWrites = recordSourceWrites(page);
    await dialog.getByRole("button", { name: "Submit", exact: true }).click();
    await page.waitForTimeout(3000);
    return sourceWrites;
}

async function openOntoCreator(page) {
    await page.goto("/vocables/?tool=OntoCreator", { waitUntil: "networkidle" });
    await page.waitForSelector("#botPromptInput", { timeout: 60000 });
    await page.waitForTimeout(1500);
    return page.locator("#botContainerDiv");
}

// the OntoCreator path to Create source, stopped at the label when the bot asks it again. Only the
// source writes reach the sandbox server, every other write (the graph metadata of the dev triplestore)
// is aborted and listed
async function createSourceWithOntoCreator(page, testInfo, bot, sourceLabel) {
    const pathway = { label: sourceLabel, alertsAfterLabel: [], isLabelAskedAgain: false, alertsAfterCreateSource: [], sourceWrites: [], blockedWrites: [] };
    let currentAlerts = pathway.alertsAfterLabel;
    page.on("dialog", (dialog) => {
        currentAlerts.push(dialog.message());
        dialog.dismiss();
    });
    await page.route("**/api/v1/**", async (route) => {
        const request = route.request();
        const requestPath = new URL(request.url()).pathname;
        if (request.method() === "GET") {
            return route.continue();
        }
        if (!requestPath.includes(sourcesApiPath)) {
            pathway.blockedWrites.push(`${request.method()} ${requestPath}`);
            return route.abort();
        }
        const response = await route.fetch();
        pathway.sourceWrites.push({ method: request.method(), path: requestPath, status: response.status() });
        return route.fulfill({ response });
    });
    await page.fill("#botPromptInput", sourceLabel);
    await attachShot(testInfo, page, "2_bot_label_saisi.png", bot);
    await page.press("#botPromptInput", "Enter");
    await page.waitForTimeout(2000);
    const nextChoice = page.locator("#bot_resourcesProposalSelect option", { hasText: "Define new source" });
    if ((await nextChoice.count()) === 0) {
        pathway.isLabelAskedAgain = await page.locator("#botPromptInput").isVisible();
        await attachShot(testInfo, page, "3_bot_apres_label.png", bot);
        await page.unrouteAll({ behavior: "ignoreErrors" });
        return pathway;
    }
    await chooseBotOption(page, "Define new source");
    await page.fill("#botPromptInput", `http://sandbox.org/${sourceLabel}/`);
    await page.press("#botPromptInput", "Enter");
    await page.waitForTimeout(2500);
    await attachShot(testInfo, page, "2_bot_create_source.png", bot);
    currentAlerts = pathway.alertsAfterCreateSource;
    await chooseBotOption(page, "Create source");
    await page.waitForTimeout(3000);
    await page.unrouteAll({ behavior: "ignoreErrors" });
    return pathway;
}

async function chooseBotOption(page, optionLabel) {
    await page.locator("#bot_resourcesProposalSelect option", { hasText: optionLabel }).click();
    await page.waitForTimeout(2500);
}

function ontoCreatorSchema(pathway) {
    const writeLines = pathway.sourceWrites.map((sourceWrite) => `${sourceWrite.method} ${sourceWrite.path} : HTTP ${sourceWrite.status}`);
    const orNone = (textLines) => (textLines.length ? textLines : ["aucune"]);
    const secondStep = pathway.isLabelAskedAgain ? ["2. Le bot redemande le label"] : ["2. Clic sur Create source", "Alerte :", ...orNone(pathway.alertsAfterCreateSource)];
    return [
        "flowchart LR",
        `  label["${mermaidText([`1. Label saisi : ${pathway.label}`, "Alerte :", ...orNone(pathway.alertsAfterLabel)])}"]`,
        `  next["${mermaidText(secondStep)}"]`,
        `  writes["${mermaidText(["Écritures de source envoyées :", ...orNone(writeLines), "Écritures bloquées par le test :", ...orNone(pathway.blockedWrites)])}"]`,
        "  label --> next --> writes",
    ];
}

async function sendSource(page, method, sourceName, group) {
    const descriptor = sourceDescriptor(sourceName, "OWL", group);
    const url = method === "POST" ? "/api/v1/admin/sources" : `/api/v1/admin/sources/${sourceName}`;
    const payload = method === "POST" ? { [sourceName]: descriptor } : descriptor;
    const response = await page.request.fetch(url, { method, data: payload });
    const responseBody = await response.json();
    return { method, url, name: sourceName, group, status: response.status(), message: responseBody.message };
}

// ---------- G1 server ----------

test.describe("G1 le serveur refuse d'enregistrer un segment de groupe qui porte le nom d'une source", () => {
    test.beforeEach(async () => {
        writeSandboxSources(equipmentSources);
    });

    test("G1a création refusée quand un segment du groupe est le nom d'une source", async ({ page }, testInfo) => {
        await openConfigEditorSources(page);
        await attachShot(testInfo, page, "0_sources_existantes.png", sourcesTable(page));

        const exchange = await sendSource(page, "POST", "COMPRESSORS", "ENGINEERING/PUMPS");

        await attachSchema(testInfo, "3_requete", exchangeSchema(exchange), exchange);
        expect(exchange.status).toBe(400);
        await attachSourcesSearch(testInfo, page, "3_recherche_source.png", "COMPRESSORS");
        expect(readSources().COMPRESSORS).toBeUndefined();
    });

    test("G1b création refusée quand le nom de la source est un segment de groupe existant", async ({ page }, testInfo) => {
        await openConfigEditorSources(page);
        await attachShot(testInfo, page, "0_sources_existantes.png", sourcesTable(page));

        const exchange = await sendSource(page, "POST", "THESAURI", "STANDARDS");

        await attachSchema(testInfo, "3_requete", exchangeSchema(exchange), exchange);
        expect(exchange.status).toBe(400);
        await attachSourcesSearch(testInfo, page, "3_recherche_source.png", "THESAURI");
        expect(readSources().THESAURI).toBeUndefined();
    });

    test("G1c modification refusée quand le nouveau groupe porte le nom d'une source", async ({ page }, testInfo) => {
        await openConfigEditorSources(page);
        await attachShot(testInfo, page, "0_sources_existantes.png", sourcesTable(page));

        const exchange = await sendSource(page, "PUT", "GEMET", "PUMPS");

        await attachSchema(testInfo, "3_requete", exchangeSchema(exchange), exchange);
        expect(exchange.status).toBe(400);
        await attachSourcesSearch(testInfo, page, "3_recherche_source.png", "GEMET");
        expect(readSources().GEMET.group).toBe("THESAURI");
    });

    test("G1d création acceptée quand aucun segment du groupe n'est un nom de source", async ({ page }, testInfo) => {
        await openConfigEditorSources(page);
        await attachShot(testInfo, page, "0_sources_existantes.png", sourcesTable(page));

        const exchange = await sendSource(page, "POST", "COMPRESSORS", "ENGINEERING/ROTATING");

        await attachSchema(testInfo, "3_requete", exchangeSchema(exchange), exchange);
        expect(exchange.status).toBe(200);
        await attachSourcesSearch(testInfo, page, "3_recherche_source.png", "COMPRESSORS");
        expect(readSources().COMPRESSORS.group).toBe("ENGINEERING/ROTATING");
    });
});

// ---------- G2 ConfigEditor ----------

test.describe("G2 le formulaire de source du ConfigEditor refuse un groupe ou un nom qui crée la collision", () => {
    test.beforeEach(async () => {
        writeSandboxSources(equipmentSources);
    });

    test("G2a le champ Group signale un segment qui est le nom d'une source", async ({ page }, testInfo) => {
        await openConfigEditorSources(page);
        await attachShot(testInfo, page, "0_sources_existantes.png", sourcesTable(page));
        const dialog = await fillCreateSourceDialog(page, "COMPRESSORS", "ENGINEERING/PUMPS");
        await attachShot(testInfo, page, "1_formulaire_rempli.png", dialog.locator(".MuiDialogContent-root").first());

        const sourceWrites = await submitCreateSourceDialog(page, dialog);

        await expect(dialogField(dialog, "group")).toContainText("PUMPS is already a source name");
        await attachShot(testInfo, page, "3_champ_group.png", dialogField(dialog, "group"));
        await attachSchema(testInfo, "3_ecritures", sourceWritesSchema("Clic sur Submit", sourceWrites), sourceWrites);
        expect(sourceWrites).toEqual([]);
        expect(readSources().COMPRESSORS).toBeUndefined();
    });

    test("G2b le champ Name signale un nom qui est déjà un segment de groupe", async ({ page }, testInfo) => {
        await openConfigEditorSources(page);
        await attachShot(testInfo, page, "0_sources_existantes.png", sourcesTable(page));
        const dialog = await fillCreateSourceDialog(page, "THESAURI", "STANDARDS");
        await attachShot(testInfo, page, "1_formulaire_rempli.png", dialog.locator(".MuiDialogContent-root").first());

        const sourceWrites = await submitCreateSourceDialog(page, dialog);

        await expect(dialogField(dialog, "name")).toContainText("This name is already a group");
        await attachShot(testInfo, page, "3_champ_name.png", dialogField(dialog, "name"));
        await attachSchema(testInfo, "3_ecritures", sourceWritesSchema("Clic sur Submit", sourceWrites), sourceWrites);
        expect(sourceWrites).toEqual([]);
        expect(readSources().THESAURI).toBeUndefined();
    });

    test("G2c un groupe et un nom libres créent la source", async ({ page }, testInfo) => {
        await openConfigEditorSources(page);
        await attachShot(testInfo, page, "0_sources_existantes.png", sourcesTable(page));
        const dialog = await fillCreateSourceDialog(page, "COMPRESSORS", "ENGINEERING/ROTATING");
        await attachShot(testInfo, page, "1_formulaire_rempli.png", dialog.locator(".MuiDialogContent-root").first());

        const sourceWrites = await submitCreateSourceDialog(page, dialog);

        await attachSchema(testInfo, "3_ecritures", sourceWritesSchema("Clic sur Submit", sourceWrites), sourceWrites);
        expect(sourceWrites).toMatchObject([{ method: "POST", status: 200 }]);
        await attachSourcesSearch(testInfo, page, "3_recherche_source.png", "COMPRESSORS");
        expect(readSources().COMPRESSORS.group).toBe("ENGINEERING/ROTATING");
    });
});

// ---------- G3 OntoCreator ----------

test.describe("G3 OntoCreator refuse un nom de source qui est déjà un segment de groupe", () => {
    test.beforeEach(async () => {
        writeSandboxSources(equipmentSources);
    });

    test("G3a le nom EQUIPMENT, segment du groupe ENGINEERING/EQUIPMENT, est refusé dès la saisie du label", async ({ page }, testInfo) => {
        await openConfigEditorSources(page);
        await attachShot(testInfo, page, "0_sources_existantes.png", sourcesTable(page));
        const bot = await openOntoCreator(page);
        await attachShot(testInfo, page, "1_bot_label.png", bot);

        const pathway = await createSourceWithOntoCreator(page, testInfo, bot, "EQUIPMENT");

        await attachSchema(testInfo, "3_parcours", ontoCreatorSchema(pathway), pathway);
        expect(pathway.alertsAfterLabel).toContain("This name is already a group name");
        expect(pathway.isLabelAskedAgain).toBe(true);
        expect(await page.evaluate(() => CreateSLSVsource_bot.params.sourceLabel)).toBe("");
        expect(pathway.sourceWrites).toEqual([]);
        await attachSourcesSearch(testInfo, page, "3_recherche_source.png", "EQUIPMENT");
        expect(readSources().EQUIPMENT).toBeUndefined();
    });

    test("G3b un nom libre crée la source", async ({ page }, testInfo) => {
        await openConfigEditorSources(page);
        await attachShot(testInfo, page, "0_sources_existantes.png", sourcesTable(page));
        const bot = await openOntoCreator(page);
        await attachShot(testInfo, page, "1_bot_label.png", bot);

        const pathway = await createSourceWithOntoCreator(page, testInfo, bot, "COMPRESSORS");

        await attachSchema(testInfo, "3_parcours", ontoCreatorSchema(pathway), pathway);
        expect(pathway.alertsAfterLabel).toEqual([]);
        expect(pathway.sourceWrites).toMatchObject([{ method: "POST", status: 200 }]);
        await attachSourcesSearch(testInfo, page, "3_recherche_source.png", "COMPRESSORS");
        expect(readSources().COMPRESSORS.group).toBe("PRIVATE/admin");
    });
});

// ---------- G4 migration ----------

test.describe("G4 la migration renomme en <nom>-Group chaque segment de groupe qui porte le nom d'une source", () => {
    test("G4a une source rangée dans un groupe à son nom réapparaît dans le sélecteur", async ({ page }, testInfo) => {
        writeSandboxSources(sourceInItsOwnGroupSources);
        const selectorBefore = await openSourceSelector(page);
        expect(await sourceSelectorPath(page, "ISO")).toBeNull();
        expect(await sourceSelectorPath(page, "ISO_PART2")).toEqual(["OWL", "ISO", "PARTS"]);
        await attachShot(testInfo, page, "1_selecteur_avant.png", selectorBefore);
        const sourcesBefore = readSources();

        const migrationRun = runMigration();

        await attachSchema(testInfo, "2_migration", migrationRunSchema(migrationRun), migrationRun);
        expectMigrationSucceeded(migrationRun);
        const sourcesAfter = readSources();
        await attachSchema(testInfo, "3_groupes", groupsSchema({ "sources.json avant": sourcesBefore, "sources.json après": sourcesAfter }), { sourcesBefore, sourcesAfter });
        const selectorAfter = await openSourceSelector(page);
        expect(await sourceSelectorPath(page, "ISO")).toEqual(["OWL", "ISO-Group"]);
        expect(await sourceSelectorPath(page, "ISO_PART2")).toEqual(["OWL", "ISO-Group", "PARTS"]);
        await attachShot(testInfo, page, "3_selecteur_apres.png", selectorAfter);
    });

    test("G4b un groupe qui porte le nom d'une autre source: le dossier et la source s'affichent tous les deux", async ({ page }, testInfo) => {
        writeSandboxSources(groupNamedLikeOtherSourceSources);
        const selectorBefore = await openSourceSelector(page);
        const betaNodesBefore = await selectorNodesNamed(page, "BETA");
        await attachShot(testInfo, page, "1_selecteur_avant.png", selectorBefore);
        await attachSchema(testInfo, "1_noeuds_avant", selectorNodesSchema("BETA", betaNodesBefore), betaNodesBefore);
        expect(isFolderAndSourceShown(betaNodesBefore)).toBe(false);
        const sourcesBefore = readSources();

        const migrationRun = runMigration();

        await attachSchema(testInfo, "2_migration", migrationRunSchema(migrationRun), migrationRun);
        expectMigrationSucceeded(migrationRun);
        const sourcesAfter = readSources();
        await attachSchema(testInfo, "3_groupes", groupsSchema({ "sources.json avant": sourcesBefore, "sources.json après": sourcesAfter }), { sourcesBefore, sourcesAfter });
        const selectorAfter = await openSourceSelector(page);
        expect(await sourceSelectorPath(page, "ALPHA")).toEqual(["OWL", "BETA-Group"]);
        expect(await sourceSelectorPath(page, "BETA")).toEqual(["OWL", "STANDARDS"]);
        await attachShot(testInfo, page, "3_selecteur_apres.png", selectorAfter);
    });

    test("G4c quand <nom>-Group est aussi une source, le suffixe est répété jusqu'à un nom libre", async ({ page }, testInfo) => {
        writeSandboxSources(suffixAlreadyTakenSources);
        const selectorBefore = await openSourceSelector(page);
        const deltaNodesBefore = await selectorNodesNamed(page, "DELTA");
        await attachShot(testInfo, page, "1_selecteur_avant.png", selectorBefore);
        await attachSchema(testInfo, "1_noeuds_avant", selectorNodesSchema("DELTA", deltaNodesBefore), deltaNodesBefore);
        expect(isFolderAndSourceShown(deltaNodesBefore)).toBe(false);
        const sourcesBefore = readSources();

        const migrationRun = runMigration();

        await attachSchema(testInfo, "2_migration", migrationRunSchema(migrationRun), migrationRun);
        expectMigrationSucceeded(migrationRun);
        const sourcesAfter = readSources();
        await attachSchema(testInfo, "3_groupes", groupsSchema({ "sources.json avant": sourcesBefore, "sources.json après": sourcesAfter }), { sourcesBefore, sourcesAfter });
        const selectorAfter = await openSourceSelector(page);
        expect(await sourceSelectorPath(page, "GAMMA")).toEqual(["OWL", "DELTA-Group-Group"]);
        expect(await sourceSelectorPath(page, "DELTA")).toEqual(["OWL", "STANDARDS"]);
        await attachShot(testInfo, page, "3_selecteur_apres.png", selectorAfter);
    });

    // no fixture needed, Playwright still requires a destructured first argument
    // eslint-disable-next-line no-empty-pattern
    test("G4d les droits des profils suivent les groupes renommés", async ({}, testInfo) => {
        writeSandboxSources([...sourceInItsOwnGroupSources, ...groupNamedLikeOtherSourceSources]);
        await writeSandboxProfile(profileAccessControl);
        const accessControlBefore = await readSandboxProfileAccessControl();

        const migrationRun = runMigration();

        await attachSchema(testInfo, "2_migration", migrationRunSchema(migrationRun), migrationRun);
        expectMigrationSucceeded(migrationRun);
        const accessControlAfter = await readSandboxProfileAccessControl();
        await attachSchema(testInfo, "3_droits_profil", accessControlSchema(accessControlBefore, accessControlAfter, ["en base avant", "en base après"]), {
            profile: sandboxProfileName,
            accessControlBefore,
            accessControlAfter,
        });
        expect(accessControlAfter).toEqual({
            OWL: "read",
            "OWL/ISO-Group": "readwrite",
            "OWL/ISO-Group/PARTS": "read",
            "OWL/BETA-Group/ALPHA": "readwrite",
            "OWL/STANDARDS": "read",
        });
    });

    test("G4e une seconde exécution ne change plus rien", async ({ page }, testInfo) => {
        writeSandboxSources(sourceInItsOwnGroupSources);
        await writeSandboxProfile(profileAccessControl);
        expectMigrationSucceeded(runMigration());
        const sourcesAfterFirstRun = readSources();
        const accessControlAfterFirstRun = await readSandboxProfileAccessControl();

        const migrationRun = runMigration();

        await attachSchema(testInfo, "2_migration", migrationRunSchema(migrationRun), migrationRun);
        expectMigrationSucceeded(migrationRun);
        const sourcesAfterSecondRun = readSources();
        const accessControlAfterSecondRun = await readSandboxProfileAccessControl();
        await attachSchema(testInfo, "3_groupes", groupsSchema({ "après la 1re exécution": sourcesAfterFirstRun, "après la 2e exécution": sourcesAfterSecondRun }), {
            sourcesAfterFirstRun,
            sourcesAfterSecondRun,
        });
        await attachSchema(testInfo, "3_droits_profil", accessControlSchema(accessControlAfterFirstRun, accessControlAfterSecondRun, ["après la 1re exécution", "après la 2e exécution"]), {
            profile: sandboxProfileName,
            accessControlAfterFirstRun,
            accessControlAfterSecondRun,
        });
        expect(sourcesAfterSecondRun).toEqual(sourcesAfterFirstRun);
        expect(accessControlAfterSecondRun).toEqual(accessControlAfterFirstRun);
        const selectorAfter = await openSourceSelector(page);
        expect(await sourceSelectorPath(page, "ISO")).toEqual(["OWL", "ISO-Group"]);
        await attachShot(testInfo, page, "3_selecteur_apres.png", selectorAfter);
    });

    test("G4f sans -w, la migration n'écrit rien", async ({ page }, testInfo) => {
        writeSandboxSources(sourceInItsOwnGroupSources);
        await writeSandboxProfile(profileAccessControl);
        const sourcesBefore = readSources();
        const accessControlBefore = await readSandboxProfileAccessControl();

        const migrationRun = runMigration({ isDryRun: true });

        await attachSchema(testInfo, "2_migration", migrationRunSchema(migrationRun), migrationRun);
        expectMigrationSucceeded(migrationRun);
        expect(migrationRun.consoleLines).toContain("  - ISO: ISO-Group");
        const sourcesAfter = readSources();
        const accessControlAfter = await readSandboxProfileAccessControl();
        await attachSchema(testInfo, "3_groupes", groupsSchema({ "sources.json avant": sourcesBefore, "sources.json après": sourcesAfter }), { sourcesBefore, sourcesAfter });
        await attachSchema(testInfo, "3_droits_profil", accessControlSchema(accessControlBefore, accessControlAfter, ["en base avant", "en base après"]), {
            profile: sandboxProfileName,
            accessControlBefore,
            accessControlAfter,
        });
        expect(sourcesAfter).toEqual(sourcesBefore);
        expect(accessControlAfter).toEqual(accessControlBefore);
        const selectorAfter = await openSourceSelector(page);
        expect(await sourceSelectorPath(page, "ISO")).toBeNull();
        await attachShot(testInfo, page, "3_selecteur_apres.png", selectorAfter);
    });

    // no fixture needed, Playwright still requires a destructured first argument
    // eslint-disable-next-line no-empty-pattern
    test("G4g base injoignable: la migration s'arrête en erreur sans toucher sources.json", async ({}, testInfo) => {
        writeSandboxSources(sourceInItsOwnGroupSources);
        const brokenConfigFolder = copySandboxConfigWithUnreachableDatabase();
        const sourcesBefore = readSources(brokenConfigFolder);

        const migrationRun = runMigration({ configFolder: brokenConfigFolder });

        await attachSchema(testInfo, "2_migration", migrationRunSchema(migrationRun), { databasePort: unreachableDatabasePort, ...migrationRun });
        const sourcesAfter = readSources(brokenConfigFolder);
        await attachSchema(testInfo, "3_groupes", groupsSchema({ "sources.json avant": sourcesBefore, "sources.json après": sourcesAfter }), { sourcesBefore, sourcesAfter });
        expect(migrationRun.exitCode).toBe(1);
        expect(migrationRun.errorOutput).toContain("ECONNREFUSED");
        expect(sourcesAfter).toEqual(sourcesBefore);
    });
});
