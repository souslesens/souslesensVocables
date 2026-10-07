// Story report of groupNamedLikeSource.spec.js: one standalone page per run, opened straight in a browser.
// The spec runs on the sandbox servers of groupNamedLikeSourceSandbox.js, new code on 3020, old code on 3021:
//   SLS_TEST_TICKET=group-named-like-source SLS_URL=http://localhost:3020 SLS_SANDBOX_CONFIG=<new sandbox config> \
//     SLS_NODE_COVERAGE=test-results/group-named-like-source-node-coverage \
//     PLAYWRIGHT_JSON_OUTPUT_NAME=test-results/group-named-like-source/results.json \
//     npx playwright test tests/e2e/tools/sources/groupNamedLikeSource.spec.js --workers=1 --reporter=line,json
//   SLS_TEST_TICKET=group-named-like-source-ancien-code SLS_URL=http://localhost:3021 SLS_SANDBOX_CONFIG=<old sandbox config> \
//     SLS_SERVER_ROOT=<old code worktree> PLAYWRIGHT_JSON_OUTPUT_NAME=test-results/group-named-like-source-ancien-code/results.json \
//     npx playwright test tests/e2e/tools/sources/groupNamedLikeSource.spec.js --workers=1 --reporter=line,json
//   node tests/e2e/tools/sources/groupNamedLikeSourceCoverage.js test-results/group-named-like-source <base commit> test-results/group-named-like-source-node-coverage
//   node tests/e2e/tools/sources/groupNamedLikeSourceReport.js test-results/group-named-like-source
// The page links the files the tests attached, so it stays in the ticket folder with them.

import fs from "fs";
import path from "path";

// ---- configuration of the ticket -------------------------------------------------------------

const specFile = "tests/e2e/tools/sources/groupNamedLikeSource.spec.js";
const reportTitle = "Groupe nommé comme une source";
// no separate rules document for this ticket: the cases below are the validated map
const rulesDocument = "tests/e2e/tools/sources/groupNamedLikeSourceReport.js";

const equipmentContext = "Sources existantes : PUMPS et VALVES dans ENGINEERING/EQUIPMENT, GEMET dans THESAURI, GLOSSARY sans groupe.";
const ontoCreatorContext = equipmentContext + " Le test laisse passer les écritures de source et bloque les autres, celles du triplestore.";
// change is "inchangé", "modifié" or "nouveau"
const cases = [
    {
        id: "G1a",
        group: "G1",
        change: "nouveau",
        statement: "Le serveur refuse de créer une source dont un segment du groupe est le nom d'une source",
        context: equipmentContext,
        expected: "Refus 400, rien créé",
        isPositive: false,
        situation: "La source PUMPS existe.",
        action: "POST /api/v1/admin/sources de COMPRESSORS dans le groupe ENGINEERING/PUMPS.",
        result: "Réponse 400 qui nomme PUMPS. La recherche de COMPRESSORS dans la table des sources ne trouve rien.",
    },
    {
        id: "G1b",
        group: "G1",
        change: "nouveau",
        statement: "Le serveur refuse de créer une source dont le nom est un segment de groupe existant",
        context: equipmentContext,
        expected: "Refus 400, rien créé",
        isPositive: false,
        situation: "GEMET est rangée dans le groupe THESAURI.",
        action: "POST /api/v1/admin/sources d'une source nommée THESAURI.",
        result: "Réponse 400 qui nomme le groupe de GEMET. La recherche de THESAURI dans la table ne trouve rien.",
    },
    {
        id: "G1c",
        group: "G1",
        change: "nouveau",
        statement: "Le serveur refuse de déplacer une source dans un groupe qui porte le nom d'une source",
        context: equipmentContext,
        expected: "Refus 400, groupe inchangé",
        isPositive: false,
        situation: "GEMET est dans THESAURI, PUMPS est une source.",
        action: "PUT /api/v1/admin/sources/GEMET avec le groupe PUMPS.",
        result: "Réponse 400. La table montre GEMET toujours dans THESAURI.",
    },
    {
        id: "G1d",
        group: "G1",
        change: "inchangé",
        statement: "Le serveur crée une source dont aucun segment de groupe n'est un nom de source",
        context: equipmentContext,
        expected: "Créée",
        isPositive: true,
        situation: "Aucune source ne s'appelle ENGINEERING ni ROTATING.",
        action: "POST /api/v1/admin/sources de COMPRESSORS dans ENGINEERING/ROTATING.",
        result: "Réponse 200. La table montre COMPRESSORS dans ENGINEERING/ROTATING.",
    },
    {
        id: "G2a",
        group: "G2",
        change: "nouveau",
        statement: "Le formulaire New Source signale sous Group un segment qui est le nom d'une source",
        context: equipmentContext,
        expected: "Erreur sous Group",
        isPositive: false,
        situation: "Formulaire rempli : COMPRESSORS, groupe ENGINEERING/PUMPS.",
        action: "Clic sur Submit.",
        result: "Le champ Group affiche « PUMPS is already a source name ». Submit n'a envoyé aucune écriture de source.",
    },
    {
        id: "G2b",
        group: "G2",
        change: "nouveau",
        statement: "Le formulaire New Source signale sous Name un nom qui est déjà un segment de groupe",
        context: equipmentContext,
        expected: "Erreur sous Name",
        isPositive: false,
        situation: "Formulaire rempli : THESAURI, groupe STANDARDS.",
        action: "Clic sur Submit.",
        result: "Le champ Name dit que ce nom est déjà un groupe, celui de GEMET. Submit n'a envoyé aucune écriture de source.",
    },
    {
        id: "G2c",
        group: "G2",
        change: "inchangé",
        statement: "Le formulaire New Source crée une source dont le nom et le groupe sont libres",
        context: equipmentContext,
        expected: "Créée",
        isPositive: true,
        situation: "Formulaire rempli : COMPRESSORS, groupe ENGINEERING/ROTATING.",
        action: "Clic sur Submit.",
        result: "Submit envoie un POST qui répond 200, la table montre COMPRESSORS dans ENGINEERING/ROTATING.",
    },
    {
        id: "G3a",
        group: "G3",
        change: "nouveau",
        statement: "OntoCreator refuse dès la saisie du label un nom de source qui est déjà un segment de groupe",
        context: ontoCreatorContext,
        expected: "Label redemandé, rien créé",
        isPositive: false,
        situation: "Le bot demande le label de la source.",
        action: "Saisie du label EQUIPMENT, puis Entrée.",
        result: "Alerte « This name is already a group name », puis le bot repose la question du label sans proposer la suite. Aucune écriture de source n'est envoyée, la recherche de EQUIPMENT ne trouve rien.",
    },
    {
        id: "G3b",
        group: "G3",
        change: "inchangé",
        statement: "OntoCreator crée une source dont le nom est libre",
        context: ontoCreatorContext,
        expected: "Créée",
        isPositive: true,
        situation: "Le bot demande le label de la source.",
        action: "Label COMPRESSORS, Define new source, graph URI, puis Create source.",
        result: "POST /api/v1/sources répond 200, la table montre COMPRESSORS dans PRIVATE/admin. L'alerte « 500 » suit l'écriture de métadonnées que le test bloque.",
    },
    {
        id: "G4a",
        group: "G4",
        change: "nouveau",
        statement: "Une source rangée dans un groupe à son nom réapparaît dans le sélecteur après migration",
        context: "Sources : ISO dans ISO, ISO_PART2 dans ISO/PARTS, PUMPS dans ENGINEERING.",
        expected: "ISO sous ISO-Group",
        isPositive: true,
        situation: "Le sélecteur montre le dossier ISO mais pas la source ISO.",
        action: "La migration tourne avec -w, comme npm run migrate.",
        result: "Le groupe ISO devient ISO-Group dans sources.json. Le sélecteur montre la source ISO sous ISO-Group, et ISO_PART2 sous ISO-Group/PARTS.",
    },
    {
        id: "G4b",
        group: "G4",
        change: "nouveau",
        statement: "Un groupe nommé comme une autre source : le dossier et la source s'affichent tous les deux après migration",
        context: "Sources : ALPHA dans le groupe BETA, BETA dans STANDARDS.",
        expected: "ALPHA sous BETA-Group",
        isPositive: true,
        situation: "L'arbre n'affiche jamais à la fois le dossier BETA et la source BETA : ici seule la source reste, et ALPHA est rangée dessous.",
        action: "La migration tourne avec -w.",
        result: "ALPHA passe dans BETA-Group, la source BETA reste dans STANDARDS, le sélecteur montre les deux.",
    },
    {
        id: "G4c",
        group: "G4",
        change: "nouveau",
        statement: "Quand <nom>-Group est aussi une source, le suffixe est répété jusqu'à un nom libre",
        context: "Sources : GAMMA dans le groupe DELTA, DELTA et DELTA-Group dans STANDARDS.",
        expected: "GAMMA sous DELTA-Group-Group",
        isPositive: true,
        situation: "L'arbre n'affiche jamais à la fois le dossier DELTA et la source DELTA : un seul des deux reste.",
        action: "La migration tourne avec -w.",
        result: "GAMMA passe dans DELTA-Group-Group. DELTA et DELTA-Group restent dans STANDARDS.",
    },
    {
        id: "G4d",
        group: "G4",
        change: "nouveau",
        statement: "Les droits des profils suivent les groupes renommés",
        context: "Sources de G4a et G4b. Le profil sandbox_readers donne des droits sur OWL/ISO, OWL/ISO/PARTS, OWL/BETA/ALPHA et OWL/STANDARDS.",
        expected: "Clés renommées",
        isPositive: true,
        situation: "Les droits du profil visent les anciens chemins.",
        action: "La migration tourne avec -w.",
        result: "Les clés deviennent OWL/ISO-Group, OWL/ISO-Group/PARTS et OWL/BETA-Group/ALPHA, avec les mêmes droits. OWL et OWL/STANDARDS ne changent pas.",
    },
    {
        id: "G4e",
        group: "G4",
        change: "nouveau",
        statement: "Une seconde exécution de la migration ne change plus rien",
        context: "Sources de G4a et profil de G4d, déjà migrés une fois.",
        expected: "Aucun changement",
        isPositive: true,
        situation: "ISO est dans ISO-Group après la première exécution.",
        action: "Seconde exécution avec -w.",
        result: "La seconde exécution répond qu'il n'y a plus rien à renommer. sources.json et les droits du profil sont identiques, ISO reste sous ISO-Group. OWL/BETA/ALPHA ne bouge pas : ALPHA ne fait pas partie de ces sources.",
    },
    {
        id: "G4f",
        group: "G4",
        change: "nouveau",
        statement: "Sans -w, la migration n'écrit ni sources.json ni les profils",
        context: "Sources et profil de G4a et G4d.",
        expected: "Rien écrit",
        isPositive: false,
        situation: "ISO est dans le groupe ISO.",
        action: "La migration tourne sans -w.",
        result: "La sortie annonce le renommage ISO en ISO-Group et le mode simulation. sources.json et les droits du profil sont identiques, la source ISO manque toujours au sélecteur.",
    },
    {
        id: "G4g",
        group: "G4",
        change: "nouveau",
        statement: "Si la base est injoignable, la migration s'arrête en erreur sans toucher sources.json",
        context: "Sources de G4a, base configurée sur un port où personne n'écoute.",
        expected: "Code 1, fichier intact",
        isPositive: false,
        situation: "sources.json contient la collision ISO.",
        action: "La migration tourne avec -w.",
        result: "Code de sortie 1 sur ECONNREFUSED, sources.json identique avant et après.",
    },
];
const groups = [
    { key: "G1", title: "G1 · Le serveur refuse un segment de groupe qui porte le nom d'une source" },
    { key: "G2", title: "G2 · Le formulaire New Source du ConfigEditor refuse la collision" },
    { key: "G3", title: "G3 · OntoCreator refuse un nom de source qui est déjà un segment de groupe" },
    { key: "G4", title: "G4 · npm run migrate renomme en <nom>-Group chaque segment qui porte le nom d'une source" },
];
// caption of each attachment name, without its step prefix nor extension
const captions = {
    sources_existantes: "Table des sources du ConfigEditor avant l'action",
    requete: "Requête envoyée et réponse du serveur",
    recherche_source: "Table des sources du ConfigEditor, recherche sur le nom de la source",
    formulaire_rempli: "Le formulaire New Source rempli",
    champ_group: "Le champ Group après Submit",
    champ_name: "Le champ Name après Submit",
    ecritures: "Écritures de source envoyées au clic sur Submit, lues sur le réseau",
    bot_label: "OntoCreator demande le label",
    bot_label_saisi: "Le label saisi, juste avant Entrée",
    bot_apres_label: "Le bot après le label",
    bot_create_source: "Le bot après le label et la graph URI, juste avant le clic sur Create source",
    parcours: "Alertes et écritures du parcours, étape par étape. Une alerte native n'apparaît dans aucune capture : le test lit son texte",
    selecteur_avant: "L'arbre du sélecteur de sources de Lineage, dossiers dépliés, avant la migration",
    noeuds_avant: "Nœuds de cet arbre qui portent le nom en collision, lus dans jstree",
    migration: "Commande lancée, code de sortie et sortie console de la migration",
    selecteur_apres: "L'arbre du sélecteur de sources de Lineage, dossiers dépliés, après la migration",
    groupes: "Groupes lus dans sources.json par le test",
    droits_profil: "Droits du profil sandbox_readers lus en base",
};
// behaviors met while testing that no rule covers
const findingsOutsideRules = [
    "Avant la migration, une source rangée dans un groupe à son nom n'entraîne pas de boucle : JstreeWidget.loadJsTree jette tout nœud dont le parent est lui-même, la source disparaît donc du sélecteur sans message.",
    "Quand un dossier et une source portent le même nom, jstree garde l'un des deux, et pas toujours le même d'une exécution à l'autre.",
    "Avant le ticket, OntoCreator gardait un label refusé et proposait quand même la suite : previousStep ne peut pas revenir avant la première étape du bot. Le label refusé est maintenant redemandé, ce qui vaut aussi pour les règles de nom existantes (nom en double, admin).",
    "Deux groupes qui partagent un segment dans des chemins différents (X/common et Y/common) fusionnent encore en un seul dossier. Même cause, hors du ticket.",
    "Le TSX du ConfigEditor est compilé par vite : sa couverture n'est pas mesurée, mais G2a, G2b et G2c l'exercent dans le navigateur.",
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
