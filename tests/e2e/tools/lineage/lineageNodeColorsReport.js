// Story report of lineageNodeColors.spec.js: one standalone page per run, opened straight in a browser.
//   SLS_TEST_TICKET=lineage-couleurs-hors-source-active \
//     PLAYWRIGHT_JSON_OUTPUT_NAME=rdd/lineage-couleurs-hors-source-active/results.json \
//     npx playwright test tests/e2e/tools/lineage/lineageNodeColors.spec.js --output rdd/lineage-couleurs-hors-source-active/playwright --workers=1 --reporter=line,json
//   the same against the old code, the client files changed since the base commit served as they were in it:
//   SLS_TEST_TICKET=lineage-couleurs-hors-source-active-ancien-code SLS_TEST_ANCIEN_CODE=<base commit> \
//     PLAYWRIGHT_JSON_OUTPUT_NAME=rdd/lineage-couleurs-hors-source-active-ancien-code/results.json \
//     npx playwright test tests/e2e/tools/lineage/lineageNodeColors.spec.js --output rdd/lineage-couleurs-hors-source-active-ancien-code/playwright --workers=1 --reporter=line,json
//   node tests/e2e/tools/lineage/lineageNodeColorsReport.js rdd/lineage-couleurs-hors-source-active
// Optional input read from the ticket folder when present: couverture-diff.json, written by
// lineageNodeColorsCoverage.js. The page links the files the tests attached, so it stays in the ticket folder with them.

import fs from "fs";
import path from "path";

// ---- configuration of the ticket -------------------------------------------------------------

const specFile = "tests/e2e/tools/lineage/lineageNodeColors.spec.js";
const reportTitle = "Lineage : couleur des nœuds hors de la source active";
const rulesDocument = "regles.html";

const bfoActiveContext = "Source principale PAZFLOR_ABOX ouverte par l'URL, source active BFO, Main classes, puis bouton All de la barre des sources.";
// change is "inchangé", "modifié" or "nouveau", as in the rules document
const cases = [
    {
        id: "R1a",
        group: "children",
        change: "modifié",
        statement: "Un enfant de classe déclaré dans une source importée par la source principale mais hors du périmètre de la source active prend la couleur de son ancêtre de la légende",
        context: bfoActiveContext + " Children une fois avant l'action.",
        expected: "event violet, via occurrent",
        isPositive: true,
        situation: "occurrent est sur le whiteboard ; event, déclaré dans IOF-CORE-202401, n'y est pas encore. IOF-CORE-202401 est dans le périmètre de PAZFLOR_ABOX, pas dans celui de BFO.",
        action: "2e clic sur Children.",
        result: "event est dessiné sous occurrent, avec la couleur d'occurrent dans la légende ; sa fiche nomme le graphe d'IOF-CORE-202401.",
    },
    {
        id: "R1b",
        group: "children",
        change: "modifié",
        statement: "Même règle pour un enfant d'une source qui importe à son tour (LIFEX_FPSO importe IOF-CORE-202401 et BFO)",
        context: bfoActiveContext + " Children trois fois avant l'action.",
        expected: "Cost vert, via generically dependent continuant",
        isPositive: true,
        situation:
            "generically dependent continuant est sur le whiteboard, Cost n'y est pas encore. LIFEX_FPSO importe IOF-CORE-202401 et BFO, il est dans le périmètre de PAZFLOR_ABOX, pas dans celui de BFO.",
        action: "4e clic sur Children.",
        result: "Cost, de LIFEX_FPSO, prend la couleur de generically dependent continuant dans la légende ; sa fiche nomme le graphe de LIFEX_FPSO.",
    },
    {
        id: "R1c",
        group: "children",
        change: "modifié",
        statement: "Un individu d'une source hors du périmètre de la source active prend la couleur de l'ancêtre de la légende de sa classe",
        context: bfoActiveContext + " Children par le menu clic droit « All » (rdf:type compris) cinq fois avant l'action.",
        expected: "Individus verts, via la classe Tag",
        isPositive: true,
        situation: "La classe Tag est sur le whiteboard, aucun individu n'y est encore. PAZFLOR_ABOX est hors du périmètre de BFO.",
        action: "6e Children par le menu clic droit « All ». La réponse dépasse la limite d'affichage de 1000 lignes : Lineage le signale par une alerte et en dessine une partie.",
        result: "TO-PT-720509E, individu de PAZFLOR_ABOX de classe Tag, désigné par la recherche du whiteboard, prend la couleur de generically dependent continuant ; tous les individus de PAZFLOR_ABOX dessinés ont la couleur de l'ancêtre de la légende de leur classe. L'alerte de troncature est enregistrée.",
    },
    {
        id: "R1d",
        group: "expand",
        change: "modifié",
        statement: "Expand sur un nœud d'une source hors du périmètre de la source active : ses enfants prennent la couleur de leur ancêtre de la légende",
        context: bfoActiveContext + " Children trois fois, puis bouton All désactivé.",
        expected: "Enfants verts",
        isPositive: true,
        situation: "information content entity, d'IOF-CORE-202401, est sur le whiteboard ; le bouton All est désactivé, BFO reste la source active.",
        action: "Clic droit sur information content entity, puis Expand.",
        result: "Les enfants dessinés par Expand, design specification compris, prennent la couleur de generically dependent continuant dans la légende.",
    },
    {
        id: "R1e",
        group: "inchange",
        change: "inchangé",
        statement: "Un enfant déclaré dans la source active garde la couleur de son ancêtre de la légende",
        context: bfoActiveContext,
        expected: "occurrent violet, continuant bleu",
        isPositive: true,
        situation: "entity est le seul nœud du whiteboard.",
        action: "1er clic sur Children.",
        result: "occurrent et continuant, déclarés dans BFO, prennent chacun leur propre couleur de la légende.",
    },
    {
        id: "R1f",
        group: "inchange",
        change: "inchangé",
        statement: "Avec la source principale active, chaque nœud garde la couleur qu'il a aujourd'hui",
        context: "Source principale et source active PAZFLOR_ABOX, Main classes, puis bouton All.",
        expected: "Mêmes couleurs que l'ancien code",
        isPositive: true,
        situation: "PAZFLOR_ABOX est la source active, le bouton All est actif.",
        action: "Children, puis Parents jusqu'à ce qu'entity soit dessinée, puis Expand sur entity, continuant, occurrent et specifically dependent continuant : les classes de PAZFLOR_ABOX descendent toutes de generically dependent continuant, ces clics ajoutent les autres branches de BFO.",
        result: "Les nœuds couvrent les quatre couleurs de la légende et le gris d'entity ; chacun a la couleur de son ancêtre de la légende dans le périmètre de PAZFLOR_ABOX, et la même couleur que dans l'exécution sur l'ancien code, nœud par nœud.",
    },
    {
        id: "R1g",
        group: "inchange",
        change: "inchangé",
        statement: "Une classe sans ancêtre dans la légende reste grise",
        context: "Source principale PAZFLOR_ABOX, source active BFO.",
        expected: "entity grise",
        isPositive: false,
        situation: "BFO est la source active, le whiteboard est vide.",
        action: "Clic sur Main classes.",
        result: "entity n'est pas dans la légende et n'a aucun ancêtre : elle est grise.",
    },
    {
        id: "R1h",
        group: "plus",
        change: "modifié",
        statement:
            "Un nœud d'une source ajoutée par « + » et non importée par la source principale prend la couleur de son ancêtre de la légende, calculée chez sa propre source, même quand une autre source est active",
        context: "Source principale PAZFLOR_ABOX, IAO ajoutée par le bouton « + », source active BFO, Main classes, bouton All, Children trois fois.",
        expected: "information content entity verte",
        isPositive: true,
        situation: "IAO est dans la barre des sources ; PAZFLOR_ABOX ne l'importe pas, IAO importe BFO.",
        action: "4e clic sur Children.",
        result: "information content entity (IAO_0000030), d'IAO, prend la couleur de generically dependent continuant, ancêtre trouvé chez IAO, alors que chez PAZFLOR_ABOX elle n'en a aucun ; tous les nœuds d'IAO dessinés suivent la même règle.",
    },
    {
        id: "R1i",
        group: "plus",
        change: "inchangé",
        statement: "Quand la source ajoutée par « + » est active, ses nœuds gardent la couleur qu'ils ont aujourd'hui",
        context: "Source principale PAZFLOR_ABOX, IAO ajoutée par le bouton « + » et active, Main classes, Children trois fois.",
        expected: "Mêmes couleurs que l'ancien code",
        isPositive: true,
        situation: "IAO est la source active ; PAZFLOR_ABOX ne l'importe pas.",
        action: "4e clic sur Children.",
        result: "Des nœuds d'IAO sont colorés, chacun avec la couleur de son ancêtre de la légende dans le périmètre d'IAO ; tous les nœuds du whiteboard, BFO compris, ont la même couleur que dans l'exécution sur l'ancien code.",
    },
];
const groups = [
    { key: "children", title: "R1 · Children, bouton All actif : enfant d'une source hors du périmètre de la source active" },
    { key: "expand", title: "R1 · Expand sur un nœud" },
    { key: "plus", title: "R1 · Source ajoutée par « + »" },
    { key: "inchange", title: "R1 · Ce qui ne bouge pas" },
];
// caption of each attachment name, without its step prefix nor extension;
// an attachment without caption is not shown
const captions = {
    situation_sources: "Barre des sources au moment de l'action, la source active encadrée",
    situation_sources_active: "Barre des sources avant le clic sur All : la source active seule encadrée",
    situation_sources_all: "Barre des sources après le clic sur All : toutes les sources encadrées",
    situation_perimetres: "Source principale et source active avec leur périmètre, lus dans Config, et la source des nœuds du cas placée face à chacun",
    situation_parent: "Le nœud parent sur le whiteboard avant l'action, avec sa couleur",
    situation_classe: "La classe Tag sur le whiteboard avant l'action",
    action_children: "Le bouton Children",
    action_menu_children: "Le menu clic droit du bouton Children, dont l'entrée All",
    action_expand_noeud: "Le nœud visé par Expand",
    action_expand: "Le menu ouvert sur ce nœud, dont l'entrée Expand ; il s'ouvre sur l'étiquette du nœud",
    action_expand_entity_noeud: "Expand sur entity : le nœud visé",
    action_expand_entity: "Expand sur entity : le menu ouvert sur ce nœud",
    action_expand_continuant_noeud: "Expand sur continuant : le nœud visé",
    action_expand_continuant: "Expand sur continuant : le menu ouvert sur ce nœud",
    action_expand_occurrent_noeud: "Expand sur occurrent : le nœud visé",
    action_expand_occurrent: "Expand sur occurrent : le menu ouvert sur ce nœud",
    action_expand_sdc_noeud: "Expand sur specifically dependent continuant : le nœud visé",
    action_expand_sdc: "Expand sur specifically dependent continuant : le menu ouvert sur ce nœud",
    action_main_classes: "Le bouton Main classes",
    action_parents: "Le bouton Parents",
    resultat_event: "event sous occurrent, avec sa couleur",
    resultat_cost: "Cost sur le whiteboard, avec sa couleur",
    resultat_individu: "L'individu du cas au milieu des individus dessinés, avec sa couleur",
    resultat_individu_recherche: "Gros plan sur l'individu trouvé par la recherche du whiteboard, dessiné en étoile, avec sa couleur",
    resultat_individu_classe: "L'individu en étoile et sa classe Tag sur le même cadrage",
    resultat_alerte: "Alertes enregistrées pendant le 6e Children : la réponse dépasse Lineage_whiteboard.showLimit",
    resultat_ice_iao: "information content entity d'IAO sur le whiteboard, avec sa couleur",
    resultat_entity: "entity sur le whiteboard, grise",
    resultat_enfants: "Le parent et ses enfants dessinés par l'action, avec leurs couleurs",
    resultat_echantillon: "Un nœud du cas et son voisinage sur le whiteboard, avec leurs couleurs",
    resultat_legende: "Le panneau Query Legend : les classes de la légende et leur couleur",
    resultat_fiche: "La fiche Node infos du nœud : sa ligne GRAPH nomme le graphe d'où il vient",
    resultat_couleur:
        "Chaîne d'ancêtres du nœud dans le périmètre de calcul, lue dans le triple store, jusqu'au premier ancêtre de la légende ; chaque boîte est remplie avec la couleur lue (whiteboard pour le nœud, légende pour l'ancêtre)",
    resultat_couleurs: "Nœuds du cas regroupés par source, ancêtre de la légende et couleur sur le whiteboard, chaque groupe rempli avec cette couleur",
    resultat_perimetre_principal: "La même classe si les ancêtres étaient cherchés chez PAZFLOR_ABOX seule (calcul hors règle, sans couleur) : aucun ancêtre de la légende",
    resultat_legende_config: "La légende BFO telle que Config la déclare : entity n'y figure pas",
    resultat_ancien_code:
        "Comparaison nœud par nœud de tous les nœuds du whiteboard avec l'exécution du même test sur l'ancien code : par couleur, le nombre de nœuds de chaque exécution et les écarts, puis un couple ancien et nouveau par source et par couleur",
};
// behaviors met while testing that no rule covers
const findingsOutsideRules = [
    "Après l'ajout d'IAO par « + », MainController.currentSource vaut IAO et la barre des sources place IAO en première étiquette : la source principale de la base de règles (PAZFLOR_ABOX, ouverte par l'URL) n'est plus visible comme telle.",
    "R1i : dans le contexte validé (IAO active, Main classes, Children une fois), les 25 nœuds d'IAO dessinés sont tous gris et IAO_0000030 n'est pas dessinée ; le test va jusqu'au 4e Children pour dessiner des nœuds d'IAO colorés.",
    "R1f : Main classes puis Children, PAZFLOR_ABOX active, ne dessinent que des nœuds verts (138 nœuds, un 2e Children n'en ajoute aucun) ; le test ajoute Parents et Expand pour couvrir les autres couleurs de la légende et le gris.",
];

// ---- page building ---------------------------------------------------------------------------

const reportFileName = "rapport.html";
const coverageSummaryFileName = "couverture-diff.json";
const windowsSeparatorRegex = /\\/g;
// 0 context shared by a group, 1 situation, 2 action, 3 result
const stepPrefixRegex = /^([0123])_(.+?)(\.[a-z]+)?$/;
const imageExtensionRegex = /\.(png|jpe?g|webp)$/i;
const htmlSpecialCharRegex = /[&<>"]/g;
const htmlEntities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const stepOfPrefix = { 0: "context", 1: "situation", 2: "action", 3: "result" };

function escapeHtml(text) {
    return String(text).replace(htmlSpecialCharRegex, (specialChar) => htmlEntities[specialChar]);
}

function collectTests(suite, collectedTests) {
    for (const spec of suite.specs || []) {
        for (const specTest of spec.tests) {
            const lastResult = specTest.results[specTest.results.length - 1];
            collectedTests.push({ title: spec.title, status: lastResult ? lastResult.status : "skipped", attachments: lastResult ? lastResult.attachments : [] });
        }
    }
    for (const childSuite of suite.suites || []) {
        collectTests(childSuite, collectedTests);
    }
    return collectedTests;
}

function readTests(resultsPath) {
    if (!fs.existsSync(resultsPath)) {
        return null;
    }
    const jsonReport = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
    return { tests: collectTests({ suites: jsonReport.suites }, []), startTime: jsonReport.stats.startTime };
}

function testOfCase(tests, ruleCase) {
    return tests.find((candidateTest) => candidateTest.title.startsWith(ruleCase.id + " "));
}

function relativeLink(reportFolder, filePath) {
    return path.relative(reportFolder, filePath).replace(windowsSeparatorRegex, "/");
}

// an image is shown as is, a .mmd schema built by the test from its captured data is drawn,
// with a link to that raw data (the .json of the same name); raw data alone is never shown
function proofsByStep(attachments, reportFolder) {
    const rawDataPathByKey = {};
    for (const attachment of attachments) {
        const nameMatch = attachment.name.match(stepPrefixRegex);
        if (nameMatch && nameMatch[3] === ".json" && attachment.path) {
            rawDataPathByKey[nameMatch[2]] = attachment.path;
        }
    }
    const proofs = { context: [], situation: [], action: [], result: [] };
    for (const attachment of attachments) {
        const nameMatch = attachment.name.match(stepPrefixRegex);
        if (!nameMatch || !attachment.path || !captions[nameMatch[2]]) {
            continue;
        }
        const [, stepDigit, captionKey, extension] = nameMatch;
        const caption = escapeHtml(captions[captionKey]);
        const link = relativeLink(reportFolder, attachment.path);
        let proofHtml = null;
        if (imageExtensionRegex.test(attachment.path)) {
            proofHtml = `<figure><figcaption>${caption}</figcaption><a href="${link}"><img src="${link}" alt="${caption}"></a></figure>`;
        } else if (extension === ".mmd") {
            const schemaText = fs.readFileSync(attachment.path, "utf8");
            const rawDataLink = rawDataPathByKey[captionKey] ? ` <a href="${relativeLink(reportFolder, rawDataPathByKey[captionKey])}">données brutes</a>` : "";
            proofHtml = `<figure class="schema-proof"><figcaption>${caption}${rawDataLink}</figcaption><pre class="mermaid">${escapeHtml(schemaText)}</pre></figure>`;
        }
        if (proofHtml) {
            proofs[stepOfPrefix[stepDigit]].push({ key: captionKey, html: proofHtml });
        }
    }
    return proofs;
}

function statusPill(isPassed, okLabel, koLabel) {
    return `<span class="pill ${isPassed ? "pill-ok" : "pill-ko"}">${isPassed ? okLabel : koLabel}</span>`;
}

// an unchanged case must already pass on the old code, a modified or new one must fail there
function oldCodeVerdict(ruleCase, oldTest) {
    if (!oldTest) {
        return { label: "non lancé", isExpected: false };
    }
    const hasPassed = oldTest.status === "passed";
    const shouldPass = ruleCase.change === "inchangé";
    if (hasPassed === shouldPass) {
        return { label: hasPassed ? "OK, attendu" : "KO, attendu", isExpected: true };
    }
    return { label: hasPassed ? "OK : test creux ou carte fausse" : "KO : carte fausse ou test mal monté", isExpected: false };
}

function caseHtml(ruleCase, caseTest, oldVerdict, reportFolder) {
    const proofs = proofsByStep(caseTest ? caseTest.attachments : [], reportFolder);
    const proofHtmlOf = (step) => proofs[step].map((proof) => proof.html).join("");
    const isPassed = caseTest && caseTest.status === "passed";
    const statusLabel = !caseTest ? "aucun test" : isPassed ? "réussi" : caseTest.status;
    const outcomeClass = ruleCase.isPositive ? "outcome-positive" : "outcome-negative";
    return `    <article class="case${isPassed && oldVerdict.isExpected ? "" : " failed"}" id="case-${ruleCase.id}">
      <header><span class="case-id">${ruleCase.id}</span><h3>${escapeHtml(ruleCase.statement)}</h3><span class="badge">${ruleCase.change}</span>${statusPill(isPassed, "OK", "KO")}</header>
      <p class="test-name">Test <code>${specFile}</code> › <code>${escapeHtml(caseTest ? caseTest.title : ruleCase.id)}</code> : <b>${statusLabel}</b>. Sur l'ancien code : <b>${oldVerdict.label}</b></p>
      <p class="context">${escapeHtml(ruleCase.context)}</p>
      <p>Attendu : <span class="box ${outcomeClass}">${escapeHtml(ruleCase.expected)}</span></p>
      <ol class="story">
        <li><span class="step">Situation</span><p>${escapeHtml(ruleCase.situation)}</p><div class="proofs">${proofHtmlOf("situation")}</div></li>
        <li><span class="step">Action</span><p>${escapeHtml(ruleCase.action)}</p><div class="proofs">${proofHtmlOf("action")}</div></li>
        <li><span class="step">Résultat</span><p>${escapeHtml(ruleCase.result)}</p><div class="proofs">${proofHtmlOf("result")}</div></li>
      </ol>
    </article>`;
}

// the context capture shared by a group is taken by each of its tests, shown once
function groupContextHtml(groupCases, testByCaseId, reportFolder) {
    const shownKeys = [];
    const contextProofs = [];
    for (const ruleCase of groupCases) {
        const caseTest = testByCaseId[ruleCase.id];
        for (const proof of proofsByStep(caseTest ? caseTest.attachments : [], reportFolder).context) {
            if (!shownKeys.includes(proof.key)) {
                shownKeys.push(proof.key);
                contextProofs.push(proof.html);
            }
        }
    }
    return contextProofs.length ? `    <div class="proofs group-context">${contextProofs.join("")}</div>` : "";
}

function coverageHtml(reportFolder) {
    const summaryPath = path.join(reportFolder, coverageSummaryFileName);
    if (!fs.existsSync(summaryPath)) {
        return `<p class="muted">Couverture des lignes modifiées : non mesurée.</p>`;
    }
    const coverageSummary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
    const unmeasuredNote = coverageSummary.unmeasuredFiles.length ? ` Non mesurables : ${coverageSummary.unmeasuredFiles.map(escapeHtml).join(", ")}.` : "";
    if (!coverageSummary.uncoveredLines.length) {
        return `<p>${statusPill(true, "Couverture", "")} Les ${coverageSummary.checkedLineCount} lignes modifiées depuis <code>${escapeHtml(coverageSummary.baseCommit)}</code> sont toutes exécutées par un test.${unmeasuredNote}</p>`;
    }
    const lineItems = coverageSummary.uncoveredLines.map(
        (uncoveredLine) => `<li><code>${escapeHtml(uncoveredLine.file)}:${uncoveredLine.line}</code> <code>${escapeHtml(uncoveredLine.text)}</code></li>`,
    );
    return `<p>${statusPill(false, "", "Couverture")} ${coverageSummary.uncoveredLines.length} lignes modifiées sur ${coverageSummary.checkedLineCount} ne sont exécutées par aucun test : un cas manque peut-être dans la carte.${unmeasuredNote}</p>\n    <ul>${lineItems.join("")}</ul>`;
}

const reportFolder = process.argv[2];
if (!reportFolder) {
    console.error("usage: node <this script> <ticket folder holding results.json>");
    process.exit(1);
}
const newRun = readTests(path.join(reportFolder, "results.json"));
if (!newRun) {
    console.error(`no results.json in ${reportFolder}: run the spec with PLAYWRIGHT_JSON_OUTPUT_NAME first`);
    process.exit(1);
}
const oldRun = readTests(path.join(path.resolve(reportFolder) + "-ancien-code", "results.json"));
const testByCaseId = {};
const oldVerdictByCaseId = {};
for (const ruleCase of cases) {
    testByCaseId[ruleCase.id] = testOfCase(newRun.tests, ruleCase);
    oldVerdictByCaseId[ruleCase.id] = oldCodeVerdict(ruleCase, oldRun ? testOfCase(oldRun.tests, ruleCase) : null);
}
// a test the rules document does not know is a coverage hole as much as a case without test
const testsWithoutCase = newRun.tests.filter((candidateTest) => !cases.some((ruleCase) => testByCaseId[ruleCase.id] === candidateTest));
const provenCases = cases.filter((ruleCase) => testByCaseId[ruleCase.id] && testByCaseId[ruleCase.id].status === "passed" && oldVerdictByCaseId[ruleCase.id].isExpected);

const summaryRows = cases.map((ruleCase) => {
    const caseTest = testByCaseId[ruleCase.id];
    const oldVerdict = oldVerdictByCaseId[ruleCase.id];
    return `<tr><td><a href="#case-${ruleCase.id}">${ruleCase.id}</a></td><td>${escapeHtml(ruleCase.statement)}</td><td>${ruleCase.change}</td><td>${escapeHtml(ruleCase.expected)}</td><td>${statusPill(oldVerdict.isExpected, oldVerdict.label, oldVerdict.label)}</td><td>${statusPill(caseTest && caseTest.status === "passed", "OK", "KO")}</td></tr>`;
});
const groupSections = groups.map((group) => {
    const groupCases = cases.filter((ruleCase) => ruleCase.group === group.key);
    const caseCards = groupCases.map((ruleCase) => caseHtml(ruleCase, testByCaseId[ruleCase.id], oldVerdictByCaseId[ruleCase.id], reportFolder));
    return `  <section>\n    <h2>${escapeHtml(group.title)}</h2>\n${groupContextHtml(groupCases, testByCaseId, reportFolder)}\n${caseCards.join("\n")}\n  </section>`;
});
const orphanTestItems = testsWithoutCase.map((orphanTest) => `<li><code>${escapeHtml(orphanTest.title)}</code> (${orphanTest.status})</li>`);
const findingItems = findingsOutsideRules.map((finding) => `<li>${escapeHtml(finding)}</li>`);
const runDate = new Date(newRun.startTime).toLocaleString("fr-FR");
const oldRunNote = oldRun ? `ancien code testé le ${new Date(oldRun.startTime).toLocaleString("fr-FR")}` : "ancien code non testé";

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(reportTitle)}</title>
<style>
  :root { --ground: #f5f6f8; --surface: #ffffff; --ink: #1c2330; --muted: #5b6577; --line: #d8dde6; --accent: #2f5d8a; --ok-bg: #d9efe2; --ok-ink: #1f6142; --ko-bg: #f3dede; --ko-ink: #8a2f2f; }
  @media (prefers-color-scheme: dark) {
    :root { color-scheme: dark; --ground: #14181f; --surface: #1c222b; --ink: #e4e8ef; --muted: #9aa4b5; --line: #313a47; --accent: #7fa8d4; --ok-bg: #1d3a2b; --ok-ink: #8fd4ad; --ko-bg: #4a2323; --ko-ink: #f0a9a9; }
  }
  body { margin: 0; background: var(--ground); color: var(--ink); font-family: "Segoe UI", system-ui, sans-serif; font-size: 15px; line-height: 1.5; padding-inline: 16px; }
  main { max-width: 980px; margin: 0 auto; padding-block: 36px 64px; display: flex; flex-direction: column; gap: 32px; }
  h1 { font-size: 1.6rem; font-weight: 600; margin: 0; }
  h2 { font-size: 1.2rem; font-weight: 600; margin: 0; }
  h3 { font-size: 1rem; font-weight: 600; margin: 0; flex: 1 1 300px; }
  p { margin: 0; max-width: 72ch; }
  a { color: var(--accent); }
  code { font-family: Consolas, ui-monospace, monospace; font-size: 0.85em; overflow-wrap: anywhere; }
  .muted { color: var(--muted); }
  .table-wrap { overflow-x: auto; background: var(--surface); border: 1px solid var(--line); border-radius: 6px; }
  table { border-collapse: collapse; width: 100%; font-size: 0.9rem; }
  th, td { text-align: left; padding: 7px 12px; border-bottom: 1px solid var(--line); }
  th { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); font-weight: 600; }
  tr:last-child td { border-bottom: none; }
  section { display: flex; flex-direction: column; gap: 14px; }
  .case { background: var(--surface); border: 1px solid var(--line); border-radius: 6px; padding: 18px; display: flex; flex-direction: column; gap: 12px; }
  .case.failed { border-color: var(--ko-ink); }
  .case header { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
  .case-id { font-family: Consolas, ui-monospace, monospace; font-weight: 600; color: var(--accent); font-size: 1.05rem; }
  .badge { font-size: 0.8rem; color: var(--muted); border: 1px solid var(--line); padding: 0 8px; border-radius: 999px; }
  .pill { font-size: 0.8rem; font-weight: 600; padding: 1px 10px; border-radius: 999px; white-space: nowrap; }
  .pill-ok { background: var(--ok-bg); color: var(--ok-ink); }
  .pill-ko { background: var(--ko-bg); color: var(--ko-ink); }
  .test-name { font-size: 0.85rem; color: var(--muted); }
  .context { font-weight: 600; }
  .box { display: inline-block; padding: 2px 10px; border-radius: 4px; font-weight: 600; }
  .box.outcome-positive { background: var(--ok-bg); color: var(--ok-ink); }
  .box.outcome-negative { background: var(--ko-bg); color: var(--ko-ink); }
  .story { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 16px; counter-reset: step; }
  .story li { display: flex; flex-direction: column; gap: 8px; border-left: 3px solid var(--line); padding-left: 14px; counter-increment: step; }
  .step { font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--accent); }
  .step::before { content: counter(step) ". "; }
  .proofs { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start; }
  figure { margin: 0; display: flex; flex-direction: column; gap: 4px; max-width: 100%; }
  figcaption { font-size: 0.8rem; color: var(--muted); }
  .proofs img { display: block; max-width: 100%; height: auto; border: 1px solid var(--line); border-radius: 3px; }
  .schema-proof { flex: 1 1 100%; }
  .schema-proof pre { margin: 0; padding: 12px; overflow-x: auto; background: var(--ground); border: 1px solid var(--line); border-radius: 3px; display: flex; justify-content: center; }
  ul { margin: 0; padding-left: 1.2em; display: flex; flex-direction: column; gap: 4px; max-width: 72ch; }
</style>
</head>
<body>
<main>
  <header style="display:flex;flex-direction:column;gap:8px">
    <h1>${escapeHtml(reportTitle)}</h1>
    <p class="muted">${cases.length} cas de <code>${rulesDocument}</code>, ${provenCases.length} prouvés par <code>${specFile}</code>. Nouveau code testé le ${runDate}, ${oldRunNote}.</p>
    ${coverageHtml(reportFolder)}
  </header>

  <div class="table-wrap"><table>
    <thead><tr><th>Cas</th><th>Énoncé</th><th>Changement</th><th>Attendu</th><th>Ancien code</th><th>Nouveau code</th></tr></thead>
    <tbody>
      ${summaryRows.join("\n      ")}
    </tbody>
  </table></div>

${groupSections.join("\n\n")}
${orphanTestItems.length ? `\n  <section>\n    <h2>Tests sans cas dans la base de règles</h2>\n    <ul>${orphanTestItems.join("")}</ul>\n  </section>` : ""}
${findingItems.length ? `\n  <section>\n    <h2>Constats hors règles</h2>\n    <ul>${findingItems.join("")}</ul>\n  </section>` : ""}
</main>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js"></script>
<script>
  if (window.mermaid) {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    window.mermaid.initialize({ startOnLoad: false, theme: isDark ? "dark" : "default", flowchart: { useMaxWidth: false } });
    window.mermaid.run({ querySelector: "pre.mermaid" });
  }
</script>
</body>
</html>
`;
const reportPath = path.join(reportFolder, reportFileName);
fs.writeFileSync(reportPath, html);
console.log(`${reportPath}: ${provenCases.length} / ${cases.length} proven`);
