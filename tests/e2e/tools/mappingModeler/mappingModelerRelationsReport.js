// Story report of mappingModelerRelations.spec.js: one standalone page per run, opened straight in a browser.
//   SLS_TEST_TICKET=2220-relation-heritee-sous-classes \
//     PLAYWRIGHT_JSON_OUTPUT_NAME=test-results/2220-relation-heritee-sous-classes/results.json \
//     npx playwright test tests/e2e/tools/mappingModeler/mappingModelerRelations.spec.js --workers=1 --reporter=line,json
//   the same against the old code, served on another port, in a sibling folder:
//   SLS_TEST_TICKET=2220-relation-heritee-sous-classes-ancien-code SLS_URL=http://localhost:<port> \
//     PLAYWRIGHT_JSON_OUTPUT_NAME=test-results/2220-relation-heritee-sous-classes-ancien-code/results.json \
//     npx playwright test tests/e2e/tools/mappingModeler/mappingModelerRelations.spec.js --workers=1 --reporter=line,json
//   node tests/e2e/tools/mappingModeler/mappingModelerRelationsReport.js test-results/2220-relation-heritee-sous-classes
// Optional input read from the ticket folder when present: couverture-diff.json, written by the coverage
// script of rdd-preuves. The page links the files the tests attached, so it stays in the ticket folder with them.

import fs from "fs";
import path from "path";

// ---- configuration of the ticket -------------------------------------------------------------

const specFile = "tests/e2e/tools/mappingModeler/mappingModelerRelations.spec.js";
const reportTitle = "Relation héritée entre sous-classes";
const rulesDocument = "regles.html";

const tableContext = "Source active PBS, table de test relations_test.csv servie par le test, une colonne de classes par classe du cas.";
// change is "inchangé", "modifié" or "nouveau", as in the rules document
const cases = [
    {
        id: "R4a",
        group: "R4",
        change: "inchangé",
        statement: "Menu Relations : restriction posée exactement entre les deux classes des colonnes, proposée",
        context: tableContext + " Colonnes Module et Sub-Product.",
        expected: "Ligne proposée",
        isPositive: true,
        situation: "Module porte une restriction BFO_0000173 someValuesFrom Sub-Product.",
        action: "Clic sur l'onglet Relations.",
        result: "La ligne Module vers Sub-Product de BFO_0000173, en someValuesFrom, est proposée et se coche.",
    },
    {
        id: "R4b",
        group: "R4",
        change: "nouveau",
        statement: "Menu Relations : restriction héritée par la classe de départ, proposée",
        context: tableContext + " Colonnes Accommodation et Sub-Product.",
        expected: "Ligne proposée",
        isPositive: true,
        situation: "Accommodation est une sous-classe de Module, qui porte la restriction BFO_0000173 someValuesFrom Sub-Product.",
        action: "Clic sur l'onglet Relations.",
        result: "La ligne Accommodation vers Sub-Product de BFO_0000173, en someValuesFrom, est proposée et se coche.",
    },
    {
        id: "R4c",
        group: "R4",
        change: "nouveau",
        statement: "Menu Relations : restriction dont la cible est une super-classe de la classe d'arrivée, proposée",
        context: tableContext + " Colonnes Module et Topsides.",
        expected: "Ligne proposée",
        isPositive: true,
        situation: "La restriction de Module vise Sub-Product, super-classe de Topsides.",
        action: "Clic sur l'onglet Relations.",
        result: "La ligne Module vers Topsides de BFO_0000173, en someValuesFrom, est proposée et se coche.",
    },
    {
        id: "R4d",
        group: "R4",
        change: "nouveau",
        statement: "Menu Relations : restriction héritée des deux côtés, proposée (cas du ticket)",
        context: tableContext + " Colonnes Accommodation et Topsides.",
        expected: "Ligne proposée, arête écrite",
        isPositive: true,
        situation: "Accommodation descend de Module, Topsides de Sub-Product, la restriction est entre Module et Sub-Product.",
        action: "Clic sur l'onglet Relations, puis la ligne cochée et apply selected relations.",
        result: "La ligne Accommodation vers Topsides est proposée ; appliquée, elle écrit une arête BFO_0000173 someValuesFrom dans le mapping.",
    },
    {
        id: "R4e",
        group: "R4",
        change: "inchangé",
        statement: "Menu Relations : une super-classe n'hérite pas de la restriction de sa sous-classe",
        context: tableContext + " Colonnes MaterialProduct (IOF) et Product.",
        expected: "Pas proposée",
        isPositive: false,
        situation: "La restriction vers Product est portée par Sub-Product, sous-classe de MaterialProduct.",
        action: "Clic sur l'onglet Relations.",
        result: "Aucune ligne BFO_0000173 de MaterialProduct vers Product, alors que la restriction de Sub-Product figure dans les réponses reçues.",
    },
    {
        id: "R4f",
        group: "R4",
        change: "inchangé",
        statement: "Menu Relations : colonne d'arrivée sur une super-classe de la cible, pas proposée",
        context: tableContext + " Colonnes Module et MaterialProduct (IOF).",
        expected: "Pas proposée",
        isPositive: false,
        situation: "La restriction de Module vise Sub-Product, sous-classe de MaterialProduct.",
        action: "Clic sur l'onglet Relations.",
        result: "Aucune ligne BFO_0000173 de Module vers MaterialProduct, alors que la restriction de Module figure dans les réponses reçues.",
    },
    {
        id: "R4g",
        group: "R4",
        change: "nouveau",
        statement: "Menu Relations : relation héritée déjà posée entre les deux colonnes, proposée grisée",
        context: tableContext + " Colonnes Accommodation et Topsides.",
        expected: "Ligne grisée",
        isPositive: true,
        situation: "La relation héritée Accommodation vers Topsides a été appliquée une fois : l'arête est dans le mapping.",
        action: "Retour sur l'onglet Relations.",
        result: "La ligne Accommodation vers Topsides est grisée et sa case ne se coche pas.",
    },
    {
        id: "R4h",
        group: "R4",
        change: "nouveau",
        statement: "Menu Relations : même propriété restreinte sur la classe et sur un ancêtre, une seule ligne, celle de la classe la plus proche",
        context: tableContext + " Colonnes Mooring et FPSO.",
        expected: "Une ligne, qualifiedCardinality 1",
        isPositive: true,
        situation: "Mooring porte BFO_0000173 onClass FPSO qualifiedCardinality 1 ; Sub-Product, son ancêtre, porte BFO_0000173 someValuesFrom Product, ancêtre de FPSO.",
        action: "Clic sur l'onglet Relations.",
        result: "Une seule ligne BFO_0000173 de Mooring vers FPSO, avec la cardinalité de la restriction de Mooring.",
    },
    {
        id: "R5a",
        group: "R5",
        change: "inchangé",
        statement: "Ctrl+clic : propriété d'une restriction exacte surlignée en jaune, son type repris sans dialogue",
        context: tableContext + " Colonnes Module et Sub-Product.",
        expected: "Surlignée, type repris",
        isPositive: true,
        situation: "Module porte une restriction BFO_0000173 someValuesFrom Sub-Product.",
        action: "Ctrl+clic sur la colonne Module puis sur la colonne Sub-Product, puis clic sur member part of at all times.",
        result: "La propriété est surlignée en jaune ; choisie, elle trace la relation en someValuesFrom sans ouvrir le dialogue du type.",
    },
    {
        id: "R5b",
        group: "R5",
        change: "modifié",
        statement: "Ctrl+clic : propriété d'une restriction héritée surlignée en jaune, son type repris sans dialogue",
        context: tableContext + " Colonnes Accommodation et Topsides.",
        expected: "Surlignée, type repris",
        isPositive: true,
        situation: "La restriction est héritée de Module vers Sub-Product, des deux côtés.",
        action: "Ctrl+clic sur la colonne Accommodation puis sur la colonne Topsides, puis clic sur member part of at all times.",
        result: "La propriété est surlignée en jaune ; choisie, elle trace la relation en someValuesFrom sans ouvrir le dialogue du type.",
    },
    {
        id: "R5c",
        group: "R5",
        change: "nouveau",
        statement: "Ctrl+clic : propriété d'une restriction sans domaine ni portée utilisables ajoutée à la liste, surlignée, type repris",
        context: "Non testable sur les données du dev : aucune propriété des restrictions PBS n'est absente de la liste faute de domaine ou de portée.",
        expected: "Ajoutée, surlignée",
        isPositive: true,
        situation: "componentPartOfAtSomeTime, prévue par la carte, est déjà listée pour Anchor vers Anchoring sur l'ancien code.",
        action: "Aucune.",
        result: "Test marqué fixme, avec le blocage dans la spec.",
    },
];
const groups = [
    { key: "R4", title: "R4 · Le menu Relations propose les restrictions du modèle entre deux colonnes de classes de la table courante" },
    { key: "R5", title: "R5 · Le Ctrl+clic surligne les propriétés que le modèle restreint entre les deux classes" },
];
// caption of each attachment name, without its step prefix nor extension;
// an attachment without caption is not shown
const captions = {
    contexte_R4_source: "Source active PBS, table de test relations_test.csv sélectionnée",
    contexte_R5_source: "Source active PBS, table de test relations_test.csv sélectionnée",
    situation_colonnes: "Les deux colonnes de classes du cas et leur classe, sur le graphe des colonnes",
    situation_modele: "Sous-classes et restrictions BFO_0000173 entre les classes du cas, lues par le test dans PBS et ses imports",
    situation_relation_posee: "La relation appliquée une première fois, tracée entre les deux colonnes",
    situation_arete_enregistree: "L'arête que cette première application a enregistrée dans le mapping",
    action_onglet_relations: "L'onglet Relations cliqué",
    action_appliquer: "La ligne cochée et le bouton apply selected relations",
    action_ctrlclic: "Ctrl+clic sur la colonne de départ puis sur la colonne d'arrivée",
    resultat_lignes: "Les lignes de l'onglet Relations pour la paire de colonnes et la propriété, lues dans l'arbre",
    resultat_ligne_cochee: "La ligne proposée, cochée dans l'arbre Restrictions",
    resultat_arbre: "L'arbre Restrictions de la paire de colonnes",
    resultat_reponses: "Les réponses SPARQL reçues pendant le calcul, leur plafond, et si la restriction en jeu y figure",
    resultat_arete_enregistree: "L'arête enregistrée dans mappings_PBS_ALL.json (sauvegarde interceptée par le test), et les dialogues ouverts",
    resultat_ligne_grisee: "La ligne de la relation déjà posée, grisée",
    resultat_surlignage: "La propriété dans la liste du Ctrl+clic : son groupe et son surlignage",
    resultat_propriete_surlignee: "La propriété surlignée en jaune dans la liste du Ctrl+clic",
    resultat_relation_tracee: "La relation tracée entre les deux colonnes après le choix de la propriété",
};
// behaviors met while testing that no rule covers
const findingsOutsideRules = [
    "La requête des restrictions du menu Relations s'arrête à LIMIT 10000 alors que PBS et ses imports en donnent 234078 lignes : sur l'ancien code, aucune ligne onClass n'est lue, ni Mooring vers FPSO, ni Accommodation vers Vessel, ni Anchor vers Anchoring.",
    "R4h : sur l'ancien code, Mooring vers FPSO ne donne aucune ligne, pas la ligne qualifiedCardinality 1 que la carte décrit comme actuelle.",
    "R5b : sur l'ancien code, BFO_0000173 est absente de la liste du Ctrl+clic pour Accommodation vers Topsides, contrairement à la carte qui la dit déjà listée ; le nouveau code doit donc aussi l'ajouter.",
    "BFO_0000173 s'affiche « member part of at all times » dans l'application, la carte la nomme « continuant part of ».",
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
    const lineItems = coverageSummary.uncoveredLines.map((uncoveredLine) => `<li><code>${escapeHtml(uncoveredLine.file)}:${uncoveredLine.line}</code> <code>${escapeHtml(uncoveredLine.text)}</code></li>`);
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
