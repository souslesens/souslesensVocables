// Visual proof of the OntoCreator "Create source from upload" branch, run by a non admin user
// whose profile allows one source only. Each card on screen puts what the UI and the API show
// next to what is really stored: sources.json, the quota share rows of user_data, and the
// triple count of each graph in the triplestore.
//
// Needs a server running the current code with auth "local" on SLS_PROOF_URL. Writes a
// throwaway profile and user in the database of config/mainConfig.json, two sources in
// config/sources.json and two graphs in the triplestore, all deleted at the end.
//   PORT=3012 node ./bin/www
//   npx playwright test tests/e2e/bots/ontoCreatorUpload.spec.js --headed --reporter=html
//
// The upload route makes the triplestore LOAD the file back from souslesensUrlForVirtuoso. A
// remote triplestore cannot reach a server running on a workstation, so by default the POST of
// the upload modal is answered here, doing what the route does with an INSERT DATA in place of
// the LOAD. SLS_PROOF_REAL_UPLOAD=true lets the real route run, where the triplestore can reach it.

import { test, expect } from "@playwright/test";
import { randomBytes } from "crypto";
import fs from "fs";
import { userModel } from "../../../model/users.js";
import { profileModel } from "../../../model/profiles.js";
import { sourceModel } from "../../../model/sources.js";
import { rdfDataModel } from "../../../model/rdfData.js";
import { tripleQuotaModel, SHARE_DATA_TYPE, UPLOAD_KIND } from "../../../model/tripleQuota.js";
import { readMainConfig } from "../../../model/config.js";
import { getKnexConnection, cleanupConnection } from "../../../model/utils.js";

const baseUrl = process.env.SLS_PROOF_URL || "http://localhost:3012";
const isUploadLoadedByTriplestore = process.env.SLS_PROOF_REAL_UPLOAD === "true";
const millisecondsToReadACard = 2500;
// same prefix as CreateSLSVsource_bot.saveUploadSource
const temporaryGraphUriPrefix = "http://temporary.graphUri.";
const uploadSourceNameMarker = "_upload_";
const uploadRoutePath = "/api/v1/rdf/graph";
const uploadModalTitlePrefix = "Uploading ";
const uploadModalSelector = ".MuiDialog-root";
const turtlePrefixLineRegex = /^@prefix\s+(\S+)\s+(<[^>]+>)\s*\.\s*$/;

const proofRunId = randomBytes(3).toString("hex");
const proofProfile = {
    id: "sls_proof_creator",
    name: "sls_proof_creator",
    theme: "",
    allowedSourceSchemas: ["OWL", "SKOS"],
    sourcesAccessControl: {},
    allowedTools: ["lineage", "OntoCreator", "UserSettings"],
    allowedDatabases: [],
    isShared: true,
    allowSourceCreation: true,
    maxNumberCreatedSource: 1,
    maxUploadTriplesPerUser: 1000,
};
const proofAccount = { login: "sls_proof_creator_user", password: randomBytes(12).toString("hex"), groups: [proofProfile.name] };
const finalSourceLabel = `sls_proof_onto_${proofRunId}`;
const ontologyUri = `http://sls.proof/ontocreator/${proofRunId}`;
// fillParamsFromUpload appends the trailing slash to the owl:Ontology URI
const finalGraphUri = `${ontologyUri}/`;
const uploadedTurtleLines = [
    "@prefix owl: <http://www.w3.org/2002/07/owl#> .",
    "@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .",
    `<${ontologyUri}> a owl:Ontology .`,
    `<${ontologyUri}> rdfs:label "SLS proof OntoCreator upload" .`,
    `<${ontologyUri}/Pump> a owl:Class .`,
    `<${ontologyUri}/Pump> rdfs:label "Pump" .`,
    `<${ontologyUri}/Valve> a owl:Class .`,
];
const uploadedTripleCount = 5;

const proofPanel = { banner: "", cards: [] };
const proofState = { temporarySourceName: "", temporaryGraphUri: "", interceptedUploadSourceNames: [] };

const readOwnedSources = async () => {
    return await sourceModel.getOwnedSources({ login: proofAccount.login });
};

const describeOwnedSources = (ownedSources) => {
    const ownedSourcesList = Object.values(ownedSources);
    if (ownedSourcesList.length === 0) {
        return ["aucune source possédée"];
    }
    return ownedSourcesList.map((source) => `${source.name} sur ${source.graphUri}, owner ${source.owner}`);
};

const readQuotaShares = async (graphUris) => {
    const connection = getKnexConnection(readMainConfig().database);
    const shareRows = await connection.select("data_label", "data_group", "data_content").from("user_data").where("data_type", SHARE_DATA_TYPE).whereIn("data_group", graphUris);
    cleanupConnection(connection);
    return shareRows.map((shareRow) => {
        const shareContent = typeof shareRow.data_content === "string" ? JSON.parse(shareRow.data_content) : shareRow.data_content || {};
        return { login: shareRow.data_label, graphUri: shareRow.data_group, kind: shareContent.kind, share: shareContent.share };
    });
};

const describeQuotaShares = (quotaShares) => {
    if (quotaShares.length === 0) {
        return ["aucune part de quota"];
    }
    return quotaShares.map((quotaShare) => `part ${quotaShare.kind} de ${quotaShare.login} : ${quotaShare.share} triplets sur ${quotaShare.graphUri}`);
};

const countGraphTriples = async (graphUri) => {
    if (!graphUri) {
        return 0;
    }
    return await rdfDataModel.getTripleCount(graphUri);
};

const readStoredRow = async (tableName, columnName, value) => {
    const connection = getKnexConnection(readMainConfig().database);
    const storedRow = await connection.select(columnName).from(tableName).where(columnName, value).first();
    cleanupConnection(connection);
    return storedRow;
};

const writeUploadedTurtleFile = () => {
    const turtleFilePath = test.info().outputPath(`${finalSourceLabel}.ttl`);
    fs.writeFileSync(turtleFilePath, uploadedTurtleLines.join("\n") + "\n");
    return turtleFilePath;
};

// what api/v1/rdf/graph.js POST does on the last chunk, with an INSERT DATA in place of the LOAD
const insertUploadedTriplesLikeTheUploadRoute = async (graphUri) => {
    const prefixLines = uploadedTurtleLines.filter((turtleLine) => turtlePrefixLineRegex.test(turtleLine));
    const sparqlPrefixLines = prefixLines.map((turtleLine) => turtleLine.replace(turtlePrefixLineRegex, "PREFIX $1 $2"));
    const tripleLines = uploadedTurtleLines.filter((turtleLine) => !turtlePrefixLineRegex.test(turtleLine));
    const insertQuery = `${sparqlPrefixLines.join("\n")}\nINSERT DATA { GRAPH <${graphUri}> {\n${tripleLines.join("\n")}\n} }`;
    const uploadBucket = { kind: UPLOAD_KIND, graphUri: graphUri };
    const sizeBefore = await tripleQuotaModel.snapshot([uploadBucket]);
    await rdfDataModel.execQuery(insertQuery);
    await tripleQuotaModel.recordSince(proofAccount.login, [uploadBucket], sizeBefore);
};

const answerUploadInPlaceOfTheTriplestore = async (page) => {
    await page.route(
        (requestedUrl) => requestedUrl.pathname === uploadRoutePath,
        async (route) => {
            if (route.request().method() !== "POST") {
                return route.continue();
            }
            const multipartBody = route.request().postDataBuffer().toString();
            const sourceOwningTheUpload = Object.values(await readOwnedSources()).find((source) => multipartBody.includes(`\r\n\r\n${source.name}\r\n`));
            if (!sourceOwningTheUpload) {
                return route.fulfill({ status: 404, json: { error: "the upload names no source of the proof user" } });
            }
            proofState.interceptedUploadSourceNames.push(sourceOwningTheUpload.name);
            await insertUploadedTriplesLikeTheUploadRoute(sourceOwningTheUpload.graphUri);
            await route.fulfill({ status: 200, json: { identifier: `sls-proof-${proofRunId}` } });
        },
    );
};

const renderProofPanel = async (page) => {
    await page.evaluate((panelState) => {
        let panelElement = document.getElementById("ontocreator-proof-panel");
        if (!panelElement) {
            panelElement = document.createElement("div");
            panelElement.id = "ontocreator-proof-panel";
            panelElement.style.cssText =
                "position:fixed;top:0;right:0;width:560px;height:100vh;overflow-y:auto;z-index:2147483647;pointer-events:none;" +
                "background:#0f172a;color:#e2e8f0;font:13px/1.4 system-ui,sans-serif;padding:12px;box-sizing:border-box;word-break:break-all;";
            document.body.appendChild(panelElement);
        }
        const cardsHtml = panelState.cards.map((card) => {
            const verdictColor = card.isPass === null ? "#64748b" : card.isPass ? "#16a34a" : "#dc2626";
            const verdictLabel = card.isPass === null ? "OBSERVATION" : card.isPass ? "OK" : "ECHEC";
            const frontLines = card.front.map((line) => `<div>${line}</div>`).join("");
            const backLines = card.back.map((line) => `<div>${line}</div>`).join("");
            return (
                `<div style="border:3px solid ${verdictColor};border-radius:8px;margin:10px 0;padding:8px;background:#1e293b">` +
                `<div style="display:flex;justify-content:space-between;font-weight:700"><span>${card.title}</span>` +
                `<span style="background:${verdictColor};color:white;padding:0 8px;border-radius:4px">${verdictLabel}</span></div>` +
                `<div style="color:#fde68a;margin:4px 0">Attendu : ${card.expected}</div>` +
                `<div style="display:flex;gap:8px">` +
                `<div style="flex:1;background:#0f172a;padding:6px;border-radius:4px"><b style="color:#93c5fd">FRONT (UI et API)</b>${frontLines}</div>` +
                `<div style="flex:1;background:#0f172a;padding:6px;border-radius:4px"><b style="color:#fca5a5">BACK (sources.json, user_data, triplestore)</b>${backLines}</div>` +
                `</div></div>`
            );
        });
        const bannerHtml = `<div style="position:sticky;top:0;z-index:1;background:#facc15;color:#0f172a;font-weight:700;font-size:16px;padding:10px;border-radius:6px">${panelState.banner}</div>`;
        panelElement.innerHTML = bannerHtml + cardsHtml.join("");
        panelElement.scrollTop = panelElement.scrollHeight;
    }, proofPanel);
};

const announce = async (page, banner) => {
    proofPanel.banner = banner;
    await renderProofPanel(page);
};

const showCard = async (page, card) => {
    proofPanel.cards.push(card);
    await renderProofPanel(page);
    await page.waitForTimeout(millisecondsToReadACard);
    await test.info().attach(card.title, { body: await page.screenshot(), contentType: "image/png" });
    if (card.isPass !== null) {
        expect.soft(card.isPass, card.title).toBe(true);
    }
};

const proofGraphUris = () => {
    const graphUris = [finalGraphUri];
    if (proofState.temporaryGraphUri) {
        graphUris.push(proofState.temporaryGraphUri);
    }
    return graphUris;
};

const removeProofObjects = async () => {
    const ownedSources = await readOwnedSources();
    const graphUris = proofGraphUris();
    for (const [sourceName, source] of Object.entries(ownedSources)) {
        if (!graphUris.includes(source.graphUri)) {
            graphUris.push(source.graphUri);
        }
        await sourceModel.deleteSource(sourceName);
    }
    for (const graphUri of graphUris) {
        await rdfDataModel.deleteGraph(graphUri);
    }
    const connection = getKnexConnection(readMainConfig().database);
    await connection("user_data").where("data_type", SHARE_DATA_TYPE).whereIn("data_group", graphUris).del();
    cleanupConnection(connection);
    await userModel.deleteUserAccount(proofAccount.login);
    await profileModel.deleteProfile(proofProfile.name);
};

test.use({
    viewport: { width: 1920, height: 1000 },
    video: { mode: "on", size: { width: 1920, height: 1000 } },
    trace: "on",
    launchOptions: { slowMo: 250 },
});

test.afterAll(async () => {
    await removeProofObjects();
});

test("OntoCreator, source depuis un upload : la source temporaire ne bloque pas le quota et le graphe la quitte avec ses parts", async ({ page }) => {
    test.setTimeout(300000);
    page.setDefaultTimeout(30000);

    const browserAlerts = [];
    page.on("dialog", async (dialog) => {
        browserAlerts.push(dialog.message());
        await dialog.accept();
    });
    const sourceApiCalls = [];
    page.on("response", (receivedResponse) => {
        const requestedPath = new URL(receivedResponse.url()).pathname;
        if (requestedPath.startsWith("/api/v1/sources") || requestedPath === "/api/v1/rdf/graphMove") {
            sourceApiCalls.push(`${receivedResponse.request().method()} ${requestedPath} : HTTP ${receivedResponse.status()}`);
        }
    });
    if (!isUploadLoadedByTriplestore) {
        await answerUploadInPlaceOfTheTriplestore(page);
    }
    const proposalSelect = page.locator("#bot_resourcesProposalSelect");

    await test.step("Préparation : profil et utilisateur jetables", async () => {
        await removeProofObjects();
        await profileModel.addProfile(proofProfile);
        await userModel.addUserAccount({ login: proofAccount.login, password: proofAccount.password, groups: proofAccount.groups, source: "database" });

        await page.goto(`${baseUrl}/login`);
        await announce(page, `Préparation : profil ${proofProfile.name} (1 source maximum) et utilisateur non admin ${proofAccount.login}`);
        const storedProfile = await profileModel.getOneProfile(proofProfile.name);
        const ownedSources = await readOwnedSources();
        const isAdmin = await userModel.isAdmin(proofAccount.login);
        await showCard(page, {
            title: "0. État de départ",
            expected: "profil qui autorise la création avec maxNumberCreatedSource 1, utilisateur non admin qui ne possède aucune source",
            front: ["page de login affichée"],
            back: [
                `profil : allowSourceCreation ${storedProfile.allowSourceCreation}, maxNumberCreatedSource ${storedProfile.maxNumberCreatedSource}`,
                `profil : maxUploadTriplesPerUser ${storedProfile.maxUploadTriplesPerUser}, outils ${storedProfile.allowedTools.join(", ")}`,
                `${proofAccount.login} : admin ${isAdmin}, profils ${proofAccount.groups.join(", ")}`,
                ...describeOwnedSources(ownedSources),
            ],
            isPass: storedProfile.allowSourceCreation === true && storedProfile.maxNumberCreatedSource === 1 && !isAdmin && Object.keys(ownedSources).length === 0,
        });
    });

    await test.step("Étape 1 : le bot crée la source temporaire", async () => {
        await page.fill("#username", proofAccount.login);
        await page.fill("#password", proofAccount.password);
        await page.click("button[type=submit]");
        await page.waitForURL("**/vocables**");
        await page.goto(`${baseUrl}/vocables/?tool=OntoCreator`);
        await page.locator("#botPromptInput").waitFor({ state: "visible" });
        await announce(page, `Étape 1 : ${proofAccount.login} ouvre OntoCreator, saisit le label ${finalSourceLabel} et choisit "Create source from upload"`);
        await page.locator("#botPromptInput").fill(finalSourceLabel);
        await page.locator("#botPromptInput").press("Enter");
        await proposalSelect.locator("option", { hasText: "Create source from upload" }).click();

        const uploadModalTitle = page.locator(uploadModalSelector).getByRole("heading");
        await uploadModalTitle.waitFor({ state: "visible" });
        await renderProofPanel(page);
        const uploadModalTitleText = await uploadModalTitle.innerText();
        const ownedSources = await readOwnedSources();
        const ownedSourcesList = Object.values(ownedSources);
        const temporarySource = ownedSourcesList.find((source) => source.name.startsWith(`${finalSourceLabel}${uploadSourceNameMarker}`));
        proofState.temporarySourceName = temporarySource ? temporarySource.name : "";
        proofState.temporaryGraphUri = temporarySource ? temporarySource.graphUri : "";
        const sourcesAgainstQuota = sourceModel.countSourcesAgainstQuota(ownedSources);

        await showCard(page, {
            title: "1. Source temporaire créée, hors quota",
            expected: `une source ${finalSourceLabel}_upload_<id> sur un graphe ${temporaryGraphUriPrefix}..., possédée par l'utilisateur, comptée 0 dans le quota, le modal d'upload ouvert sur elle`,
            front: [...sourceApiCalls, `modal : "${uploadModalTitleText}"`, `alertes : ${browserAlerts.length === 0 ? "aucune" : browserAlerts.join(" | ")}`],
            back: [...describeOwnedSources(ownedSources), `countSourcesAgainstQuota : ${sourcesAgainstQuota}`],
            isPass:
                Boolean(temporarySource) &&
                ownedSourcesList.length === 1 &&
                proofState.temporaryGraphUri.startsWith(temporaryGraphUriPrefix) &&
                temporarySource.owner === proofAccount.login &&
                sourcesAgainstQuota === 0 &&
                uploadModalTitleText === `${uploadModalTitlePrefix}${proofState.temporarySourceName}` &&
                browserAlerts.length === 0,
        });
    });

    await test.step("Étape 2 : upload d'un fichier Turtle dans le modal", async () => {
        const uploadMode = isUploadLoadedByTriplestore
            ? "route d'upload réelle"
            : "POST du modal répondu par le test : INSERT DATA à la place du LOAD, le triplestore distant ne joint pas ce poste";
        await announce(page, `Étape 2 : upload de ${uploadedTripleCount} triplets dans le modal (${uploadMode})`);
        await page.locator("#formUploadGraph").setInputFiles(writeUploadedTurtleFile());
        const uploadModal = page.locator(uploadModalSelector);
        await uploadModal.getByRole("button", { name: "Submit" }).click();
        const completedLabel = uploadModal.getByText("Completed", { exact: true });
        const errorAlert = uploadModal.locator(".MuiAlert-filledError");
        await completedLabel.or(errorAlert).first().waitFor({ state: "visible" });
        await renderProofPanel(page);
        const isUploadCompleted = await completedLabel.isVisible();
        const uploadErrorText = (await errorAlert.count()) > 0 ? await errorAlert.innerText() : "aucune";
        const temporaryGraphTriples = await countGraphTriples(proofState.temporaryGraphUri);
        const temporaryGraphShares = await readQuotaShares([proofState.temporaryGraphUri]);
        const userTemporaryGraphShares = temporaryGraphShares.filter((quotaShare) => quotaShare.login === proofAccount.login && quotaShare.kind === UPLOAD_KIND);
        const interceptedUploadLine = isUploadLoadedByTriplestore ? "route réelle" : `POST intercepté pour la source : ${proofState.interceptedUploadSourceNames.join(", ") || "aucune"}`;

        await showCard(page, {
            title: "2. Upload dans le graphe temporaire",
            expected: "le modal affiche Completed sans erreur, le graphe temporaire contient les triplets, une part de quota upload de l'utilisateur sur ce graphe",
            front: [`modal : ${isUploadCompleted ? "Completed" : "pas terminé"}`, `erreur du modal : ${uploadErrorText}`, interceptedUploadLine],
            back: [`triplets dans ${proofState.temporaryGraphUri} : ${temporaryGraphTriples}`, ...describeQuotaShares(temporaryGraphShares)],
            isPass:
                isUploadCompleted &&
                temporaryGraphTriples === uploadedTripleCount &&
                userTemporaryGraphShares.length === 1 &&
                userTemporaryGraphShares[0].share === uploadedTripleCount &&
                (isUploadLoadedByTriplestore || proofState.interceptedUploadSourceNames.includes(proofState.temporarySourceName)),
        });
    });

    await test.step("Étape 3 : source finale, déplacement du graphe, suppression de la source temporaire", async () => {
        await announce(page, `Étape 3 : fermeture du modal, le bot lit l'owl:Ontology, crée ${finalSourceLabel} et déplace le graphe`);
        const sourceApiCallsBeforeMove = sourceApiCalls.length;
        await page.locator(uploadModalSelector).getByRole("button", { name: "Close" }).click();
        await proposalSelect.locator("option", { hasText: "Launch Lineage" }).or(page.locator("#botPromptInput:visible")).first().waitFor({ state: "visible", timeout: 60000 });
        await renderProofPanel(page);
        const isLoadingChoiceShown = await proposalSelect.locator("option", { hasText: "Launch Lineage" }).isVisible();
        const moveApiCalls = sourceApiCalls.slice(sourceApiCallsBeforeMove);

        const allSources = await sourceModel.getAllSources();
        const finalSource = allSources[finalSourceLabel];
        const isTemporarySourceStored = proofState.temporarySourceName in allSources;
        const ownedSources = await readOwnedSources();
        const temporaryGraphTriples = await countGraphTriples(proofState.temporaryGraphUri);
        const finalGraphTriples = await countGraphTriples(finalGraphUri);
        const temporaryGraphShares = await readQuotaShares([proofState.temporaryGraphUri]);
        const finalGraphShares = await readQuotaShares([finalGraphUri]);
        const userFinalGraphShares = finalGraphShares.filter((quotaShare) => quotaShare.login === proofAccount.login && quotaShare.kind === UPLOAD_KIND);
        const storedProfile = await profileModel.getOneProfile(proofProfile.name);

        await showCard(page, {
            title: "3. Source finale sur le graphe de l'ontologie",
            expected: `aucune alerte, le bot propose Launch Lineage, ${finalSourceLabel} sur ${finalGraphUri}, source temporaire supprimée, triplets et part de quota déplacés, 1 source possédée pour un maximum de 1`,
            front: [
                ...moveApiCalls,
                `alertes : ${browserAlerts.length === 0 ? "aucune" : browserAlerts.join(" | ")}`,
                `bot : ${isLoadingChoiceShown ? "choix Launch Lineage proposé" : "pas à l'étape suivante"}`,
            ],
            back: [
                `${finalSourceLabel} : ${finalSource ? `sur ${finalSource.graphUri}, owner ${finalSource.owner}` : "absente"}`,
                `${proofState.temporarySourceName} : ${isTemporarySourceStored ? "encore dans sources.json" : "supprimée"}`,
                `triplets graphe temporaire : ${temporaryGraphTriples}`,
                `triplets graphe final : ${finalGraphTriples}`,
                ...describeQuotaShares(temporaryGraphShares.concat(finalGraphShares)),
                `sources possédées : ${Object.keys(ownedSources).length}, maxNumberCreatedSource ${storedProfile.maxNumberCreatedSource}`,
            ],
            isPass:
                browserAlerts.length === 0 &&
                isLoadingChoiceShown &&
                Boolean(finalSource) &&
                finalSource.graphUri === finalGraphUri &&
                finalSource.owner === proofAccount.login &&
                !isTemporarySourceStored &&
                temporaryGraphTriples === 0 &&
                finalGraphTriples === uploadedTripleCount &&
                temporaryGraphShares.length === 0 &&
                userFinalGraphShares.length === 1 &&
                userFinalGraphShares[0].share === uploadedTripleCount &&
                Object.keys(ownedSources).length === 1 &&
                storedProfile.maxNumberCreatedSource === 1,
        });
    });

    await test.step("Nettoyage : sources, graphes, parts de quota, utilisateur et profil", async () => {
        await announce(page, "Nettoyage : suppression des sources, des deux graphes, des parts de quota, de l'utilisateur et du profil");
        await removeProofObjects();
        const ownedSources = await readOwnedSources();
        const allSources = await sourceModel.getAllSources();
        const leftoverSourceNames = Object.keys(allSources).filter((sourceName) => sourceName.startsWith(finalSourceLabel));
        const graphUris = proofGraphUris();
        const graphTripleLines = [];
        let remainingTripleCount = 0;
        for (const graphUri of graphUris) {
            const graphTriples = await countGraphTriples(graphUri);
            remainingTripleCount += graphTriples;
            graphTripleLines.push(`triplets dans ${graphUri} : ${graphTriples}`);
        }
        const remainingShares = await readQuotaShares(graphUris);
        const storedUser = await readStoredRow("users", "login", proofAccount.login);
        const storedProfile = await readStoredRow("profiles", "label", proofProfile.name);

        await showCard(page, {
            title: "4. Tout est supprimé",
            expected: "plus de source, de triplet, de part de quota, d'utilisateur ni de profil sls_proof_*",
            front: ["aucun appel"],
            back: [
                ...describeOwnedSources(ownedSources),
                `sources ${finalSourceLabel}* dans sources.json : ${leftoverSourceNames.length}`,
                ...graphTripleLines,
                ...describeQuotaShares(remainingShares),
                `${proofAccount.login} : ${storedUser ? "encore en base" : "supprimé"}`,
                `${proofProfile.name} : ${storedProfile ? "encore en base" : "supprimé"}`,
            ],
            isPass: Object.keys(ownedSources).length === 0 && leftoverSourceNames.length === 0 && remainingTripleCount === 0 && remainingShares.length === 0 && !storedUser && !storedProfile,
        });
    });

    const assertedCards = proofPanel.cards.filter((card) => card.isPass !== null);
    const passedCards = assertedCards.filter((card) => card.isPass);
    await announce(page, `Bilan : ${passedCards.length} / ${assertedCards.length} contrôles OK`);
    await page.waitForTimeout(millisecondsToReadACard * 2);
});
