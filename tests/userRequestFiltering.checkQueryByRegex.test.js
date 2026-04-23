import { jest } from "@jest/globals";

jest.unstable_mockModule("../bin/configManager.js", () => ({
    default: { config: { sparql_server: { url: "_default" } } },
}));

const { default: UserRequestFiltering } = await import("../bin/userRequestFiltering.js");

const userSourcesMap = {
    testClasses: {
        graphUri: "http://testClasses/",
        accessControl: "read",
        sparql_server: { url: "_default" },
    },
    fghghf: {
        graphUri: "http://fghghf/",
        accessControl: "readwrite",
        sparql_server: { url: "_default" },
    },
};

// Graph URI variables — modifier ici pour changer les graphs de test dans tout le fichier
const rwGraph = userSourcesMap.fghghf.graphUri; // graph autorisé en lecture/écriture
const roGraph = userSourcesMap.testClasses.graphUri; // graph autorisé en lecture seule
const unknownGraph = "http://unknown/"; // graph absent du userSourcesMap

// Helper pour les messages d'erreur "cannot execute OP on graph URI"
function errWrite(operation, graphUri) {
    return new RegExp(`cannot execute ${operation} on graph ${graphUri}`);
}

const regularUser = { user: { groups: ["users"] } };
const adminUser = { user: { groups: ["admin"] } };

function filter(query, userInfo = regularUser) {
    return new Promise((resolve) => {
        UserRequestFiltering.filterSparqlRequest(query, userSourcesMap, userInfo, (err, result) => {
            resolve({ err, result });
        });
    });
}

// ─── ADMIN BYPASS ─────────────────────────────────────────────────────────────

test("Admin – bypass total du filtrage", async () => {
    const { err } = await filter(`INSERT DATA { <${unknownGraph}s1> a <http://owl/Class> . }`, adminUser);
    expect(err).toBeNull();
});

// ─── SELECT → checkSelectQuery ─────────────────────────────────────────────────

test("SELECT avec FROM graph autorisé passe", async () => {
    const { err } = await filter(`SELECT ?s FROM <${rwGraph}> WHERE { ?s ?p ?o }`);
    expect(err).toBeFalsy();
});

test("SELECT sans FROM graph est bloqué", async () => {
    const { err } = await filter(`SELECT ?s WHERE { ?s ?p ?o }`);
    expect(err).toMatch(/missing from/i);
});

test("SELECT avec FROM graph non autorisé est bloqué", async () => {
    const { err } = await filter(`SELECT ?s FROM <${unknownGraph}> WHERE { ?s ?p ?o }`);
    expect(err).toMatch(/not allowed/i);
});

// ─── INSERT/DELETE → checkQueryByRegex ────────────────────────────────────────

test("T01 – INSERT DATA sur graph autorisé en écriture", async () => {
    const { err } = await filter(`INSERT DATA {
  GRAPH <${rwGraph}> {
    <${rwGraph}s1> a <http://www.w3.org/2002/07/owl#Class> .
  }
}`);
    expect(err).toBeNull();
});

test("T02 – DELETE DATA sur graph autorisé en écriture", async () => {
    const { err } = await filter(`DELETE DATA {
  GRAPH <${rwGraph}> {
    <${rwGraph}s1> a <http://www.w3.org/2002/07/owl#Class> .
  }
}`);
    expect(err).toBeNull();
});

test("T03 – DELETE/INSERT avec WITH sur graph autorisé", async () => {
    const { err } = await filter(`WITH <${rwGraph}>
DELETE { ?s ?p ?o }
INSERT { ?s ?p "newValue" }
WHERE  { ?s ?p ?o . FILTER(?s = <${rwGraph}s1>) }`);
    expect(err).toBeNull();
});

test("T04 – CLEAR sur graph autorisé en écriture", async () => {
    const { err } = await filter(`CLEAR GRAPH <${rwGraph}>`);
    expect(err).toBeNull();
});

test("T05 – COPY entre deux graphs autorisés", async () => {
    const { err } = await filter(`COPY <${rwGraph}> TO <${rwGraph}>`);
    expect(err).toBeNull();
});

test("T06 – INSERT DATA sur plusieurs graphs tous autorisés", async () => {
    const { err } = await filter(`INSERT DATA {
  GRAPH <${rwGraph}> { <${rwGraph}s1> a <http://owl/Class> . }
  GRAPH <${rwGraph}> { <${rwGraph}s2> a <http://owl/Class> . }
}`);
    expect(err).toBeNull();
});

test("T07 – Requête sans opération reconnue", async () => {
    const { err } = await filter(`DESCRIBE <${rwGraph}s1>`);
    expect(err).toMatch(/no operation/i);
});

test("T08 – INSERT sans déclaration de graph explicite", async () => {
    const { err } = await filter(`INSERT DATA { <${rwGraph}s1> a <http://owl/Class> . }`);
    expect(err).toMatch(/needs explicit graph declaration/i);
});

test("T09 – INSERT sur graph absent du userSourcesMap", async () => {
    const { err } = await filter(`INSERT DATA {
  GRAPH <${unknownGraph}> { <${unknownGraph}s1> a <http://owl/Class> . }
}`);
    expect(err).toMatch(/not allowed/i);
});

test("T10 – INSERT sur graph en lecture seule", async () => {
    const { err } = await filter(`INSERT DATA {
  GRAPH <${roGraph}> { <${roGraph}s1> a <http://owl/Class> . }
}`);
    expect(err).toMatch(errWrite("INSERT", roGraph));
});

test("T11 – INSERT sur plusieurs graphs dont un en lecture seule", async () => {
    const { err } = await filter(`INSERT DATA {
  GRAPH <${rwGraph}>      { <${rwGraph}s1> a <http://owl/Class> . }
  GRAPH <${roGraph}> { <${roGraph}s1> a <http://owl/Class> . }
}`);
    expect(err).toContain(roGraph);
    expect(err).not.toContain(rwGraph);
});

test("T12 – COPY depuis un graph lecture seule vers un graph autorisé", async () => {
    const { err } = await filter(`COPY <${roGraph}> TO <${rwGraph}>`);
    expect(err).toMatch(errWrite("COPY", roGraph));
});

test("T13 – DROP DEFAULT sans graph explicite", async () => {
    const { err } = await filter(`DROP DEFAULT`);
    expect(err).toMatch(/needs explicit graph declaration/i);
});

test("T14 – Casse mixte (flag /i)", async () => {
    const { err } = await filter(`insert data {
  graph <${rwGraph}> { <${rwGraph}s1> a <http://owl/Class> . }
}`);
    expect(err).toBeNull();
});

test("T15 – URI dans un littéral string (bug connu : faux positif)", async () => {
    const { err } = await filter(`INSERT DATA {
  GRAPH <${rwGraph}> {
    <${rwGraph}s1> <http://label> "DELETE FROM graph <${unknownGraph}>" .
  }
}`);
    // Bug connu : la regex capture l'URI dans le littéral et lève une fausse erreur
    expect(err).toMatch(/not allowed/i);
});

test("INSERT avec sub-SELECT dans WHERE et GRAPH de lecture en WHERE passe", async () => {
    const { err } = await filter(`PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
INSERT {
  GRAPH <${rwGraph}> { ?s1 skos:definition ?def }
}
WHERE {
  {
    SELECT ?s1 (LCASE(STR(?label)) AS ?key)
    WHERE {
      GRAPH <${rwGraph}> { ?s1 rdfs:label ?label . }
    }
    LIMIT 600
  }
  { GRAPH <${roGraph}> { ?s2 rdfs:label ?label2 . ?s2 skos:definition ?def } }
  FILTER (?label2 = ?key)
}`);
    expect(err).toBeNull();
});

// ─── CAS COMMENTAIRES ─────────────────────────────────────────────────────────

test("T16 – Commentaire contenant SELECT ne doit pas fausser le routing", async () => {
    const { err } = await filter(`# SELECT ?s FROM <${rwGraph}>
DELETE DATA {
  GRAPH <${rwGraph}> { <${rwGraph}s1> a <http://owl/Class> . }
}`);
    expect(err).toBeNull();
});

test("T17 – Commentaire contenant un graph non autorisé ne doit pas bloquer", async () => {
    const { err } = await filter(`# INSERT DATA { GRAPH <${unknownGraph}> { <s> <p> <o> . } }
INSERT DATA {
  GRAPH <${rwGraph}> { <${rwGraph}s1> a <http://owl/Class> . }
}`);
    expect(err).toBeNull();
});

test("T18 – Commentaire contenant INSERT ne doit pas masquer un DELETE autorisé", async () => {
    const { err } = await filter(`# INSERT DATA { GRAPH <${roGraph}> { <s> <p> <o> . } }
DELETE DATA {
  GRAPH <${rwGraph}> { <${rwGraph}s1> a <http://owl/Class> . }
}`);
    expect(err).toBeNull();
});

// ─── CAS MULTIPLE OPERATIONS ──────────────────────────────────────────────────

test("T19 – Deux opérations autorisées séparées par ;", async () => {
    const { err } = await filter(`INSERT DATA { GRAPH <${rwGraph}> { <${rwGraph}s1> a <http://owl/Class> . } } ;\nDELETE DATA { GRAPH <${rwGraph}> { <${rwGraph}s2> a <http://owl/Class> . } }`);
    expect(err).toBeNull();
});

test("T20 – Deux opérations dont une non autorisée séparées par ;", async () => {
    const { err } = await filter(`INSERT DATA { GRAPH <${rwGraph}> { <${rwGraph}s1> a <http://owl/Class> . } } ;\nDELETE DATA { GRAPH <${roGraph}> { <${roGraph}s1> a <http://owl/Class> . } }`);
    expect(err).toContain(roGraph);
});

test("T21 – Deux opérations dont une sans graph explicite séparées par ;", async () => {
    const { err } = await filter(`INSERT DATA { GRAPH <${rwGraph}> { <${rwGraph}s1> a <http://owl/Class> . } } ;\nDELETE DATA { <${rwGraph}s2> a <http://owl/Class> . }`);
    expect(err).toMatch(/needs explicit graph declaration/i);
});

// ─── SELECT avec WHERE détaillé ───────────────────────────────────────────────

test("SELECT avec filtres et sous-requête passe", async () => {
    const { err } = await filter(`SELECT ?s ?label
FROM <${rwGraph}>
WHERE {
  ?s a <http://www.w3.org/2002/07/owl#Class> .
  OPTIONAL { ?s <http://www.w3.org/2000/01/rdf-schema#label> ?label . FILTER(LANG(?label) = "fr") }
  FILTER NOT EXISTS { ?s <http://www.w3.org/2002/07/owl#deprecated> true }
}`);
    expect(err).toBeFalsy();
});

test("SELECT avec FROM NAMED autorisé passe", async () => {
    const { err } = await filter(`SELECT ?s
FROM NAMED <${rwGraph}>
WHERE { GRAPH <${rwGraph}> { ?s ?p ?o } }`);
    expect(err).toBeFalsy();
});

test("SELECT avec FROM autorisé et FROM NAMED non autorisé est bloqué", async () => {
    const { err } = await filter(`SELECT ?s
FROM <${rwGraph}>
FROM NAMED <${unknownGraph}>
WHERE { ?s ?p ?o }`);
    expect(err).toMatch(/not allowed/i);
});

// ─── INSERT avec WHERE détaillé ───────────────────────────────────────────────

test("INSERT avec WHERE et FILTER passe sur graph autorisé", async () => {
    const { err } = await filter(`WITH <${rwGraph}>
INSERT {
  ?s <http://www.w3.org/2000/01/rdf-schema#label> "updated label" .
}
WHERE {
  ?s a <http://www.w3.org/2002/07/owl#Class> .
  FILTER NOT EXISTS { ?s <http://www.w3.org/2000/01/rdf-schema#label> ?label }
}`);
    expect(err).toBeNull();
});

test("INSERT avec WHERE sur graph lecture seule est bloqué", async () => {
    const { err } = await filter(`WITH <${roGraph}>
INSERT { ?s <http://rdfs/label> "x" . }
WHERE  { ?s a <http://owl/Class> . }`);
    expect(err).toMatch(errWrite("INSERT", roGraph));
});

test("INSERT ciblant graph autorisé avec source lecture seule en WHERE passe", async () => {
    const { err } = await filter(`INSERT {
  GRAPH <${rwGraph}> { ?s <http://rdfs/label> ?label . }
}
WHERE {
  GRAPH <${roGraph}> { ?s <http://rdfs/label> ?label . }
}`);
    // roGraph est uniquement source de lecture dans le WHERE — seul rwGraph (écriture) est ciblé
    expect(err).toBeNull();
});

// ─── DELETE avec WHERE détaillé ───────────────────────────────────────────────

test("DELETE avec WHERE et OPTIONAL passe sur graph autorisé", async () => {
    const { err } = await filter(`WITH <${rwGraph}>
DELETE {
  ?s <http://www.w3.org/2000/01/rdf-schema#label> ?oldLabel .
}
WHERE {
  ?s a <http://www.w3.org/2002/07/owl#Class> .
  OPTIONAL { ?s <http://www.w3.org/2000/01/rdf-schema#label> ?oldLabel }
  FILTER(STR(?oldLabel) = "old value")
}`);
    expect(err).toBeNull();
});

test("DELETE WHERE (forme courte) sur graph autorisé passe", async () => {
    const { err } = await filter(`DELETE WHERE {
  GRAPH <${rwGraph}> {
    <${rwGraph}s1> ?p ?o .
  }
}`);
    expect(err).toBeNull();
});

test("DELETE WHERE sur graph lecture seule est bloqué", async () => {
    const { err } = await filter(`WITH <${roGraph}>
DELETE { ?s ?p ?o }
WHERE  { ?s a <http://owl/Class> . }`);
    expect(err).toMatch(errWrite("DELETE", roGraph));
});

// ─── COPY / MOVE / ADD ────────────────────────────────────────────────────────

test("COPY de graph autorisé vers graph autorisé passe", async () => {
    const { err } = await filter(`COPY <${rwGraph}> TO <${rwGraph}>`);
    expect(err).toBeNull();
});

test("MOVE de graph autorisé vers graph autorisé passe", async () => {
    const { err } = await filter(`MOVE <${rwGraph}> TO <${rwGraph}>`);
    expect(err).toBeNull();
});

test("ADD de graph autorisé vers graph autorisé passe", async () => {
    const { err } = await filter(`ADD <${rwGraph}> TO <${rwGraph}>`);
    expect(err).toBeNull();
});

test("COPY depuis graph lecture seule est bloqué", async () => {
    const { err } = await filter(`COPY <${roGraph}> TO <${rwGraph}>`);
    expect(err).toMatch(errWrite("COPY", roGraph));
});

test("MOVE depuis graph lecture seule est bloqué", async () => {
    const { err } = await filter(`MOVE <${roGraph}> TO <${rwGraph}>`);
    expect(err).toMatch(errWrite("MOVE", roGraph));
});

test("ADD depuis graph lecture seule est bloqué", async () => {
    const { err } = await filter(`ADD <${roGraph}> TO <${rwGraph}>`);
    expect(err).toMatch(errWrite("ADD", roGraph));
});

test("COPY vers graph non autorisé est bloqué", async () => {
    const { err } = await filter(`COPY <${rwGraph}> TO <${unknownGraph}>`);
    expect(err).toMatch(/not allowed/i);
});

test("COPY sans URI (pas de <>) ne matche pas la regex transfert — bloqué", async () => {
    const { err } = await filter(`COPY DEFAULT TO NAMED <${rwGraph}>`);
    expect(err).toBeTruthy();
});

// ─── SELECT avec plusieurs FROM ───────────────────────────────────────────────

test("SELECT avec deux FROM autorisés passe", async () => {
    const { err } = await filter(`SELECT ?s ?p ?o
FROM <${rwGraph}>
FROM <${roGraph}>
WHERE { ?s ?p ?o }`);
    expect(err).toBeFalsy();
});

test("SELECT avec FROM autorisé et FROM non autorisé est bloqué", async () => {
    const { err } = await filter(`SELECT ?s
FROM <${rwGraph}>
FROM <${unknownGraph}>
WHERE { ?s ?p ?o }`);
    expect(err).toMatch(/not allowed/i);
});

test("SELECT avec deux FROM NAMED autorisés passe", async () => {
    const { err } = await filter(`SELECT ?s
FROM NAMED <${rwGraph}>
FROM NAMED <${roGraph}>
WHERE { GRAPH ?g { ?s ?p ?o } }`);
    expect(err).toBeFalsy();
});

test("SELECT avec FROM + FROM NAMED tous autorisés passe", async () => {
    const { err } = await filter(`SELECT ?s
FROM <${rwGraph}>
FROM NAMED <${roGraph}>
WHERE { ?s ?p ?o }`);
    expect(err).toBeFalsy();
});

test("SELECT avec FROM + FROM NAMED dont un non autorisé est bloqué", async () => {
    const { err } = await filter(`SELECT ?s
FROM <${rwGraph}>
FROM NAMED <${unknownGraph}>
WHERE { ?s ?p ?o }`);
    expect(err).toMatch(/not allowed/i);
});

// ─── INSERT avec plusieurs GRAPH ──────────────────────────────────────────────

test("INSERT DATA dans deux graphs autorisés passe", async () => {
    const { err } = await filter(`INSERT DATA {
  GRAPH <${rwGraph}> { <${rwGraph}s1> a <http://owl/Class> . }
  GRAPH <${rwGraph}> { <${rwGraph}s2> <http://rdfs/label> "test" . }
}`);
    expect(err).toBeNull();
});

test("INSERT DATA dans graph autorisé et graph lecture seule est bloqué", async () => {
    const { err } = await filter(`INSERT DATA {
  GRAPH <${rwGraph}>      { <${rwGraph}s1> a <http://owl/Class> . }
  GRAPH <${roGraph}> { <${roGraph}s1> a <http://owl/Class> . }
}`);
    expect(err).toContain(roGraph);
    expect(err).not.toContain(rwGraph);
});

test("INSERT DATA dans graph autorisé et graph inconnu est bloqué sur les deux", async () => {
    const { err } = await filter(`INSERT DATA {
  GRAPH <${roGraph}> { <${roGraph}s1> a <http://owl/Class> . }
  GRAPH <${unknownGraph}>     { <${unknownGraph}s1> a <http://owl/Class> . }
}`);
    expect(err).toContain(roGraph);
    expect(err).toContain(unknownGraph);
});

test("INSERT avec WHERE dans plusieurs graphs autorisés passe", async () => {
    const { err } = await filter(`INSERT {
  GRAPH <${rwGraph}> { ?s <http://rdfs/label> ?label . }
}
WHERE {
  GRAPH <${rwGraph}> { ?s a <http://owl/Class> . OPTIONAL { ?s <http://rdfs/label> ?label } }
  FILTER(!BOUND(?label))
}`);
    expect(err).toBeNull();
});

// ─── DELETE avec plusieurs GRAPH ──────────────────────────────────────────────

test("DELETE DATA dans deux graphs autorisés passe", async () => {
    const { err } = await filter(`DELETE DATA {
  GRAPH <${rwGraph}> { <${rwGraph}s1> a <http://owl/Class> . }
  GRAPH <${rwGraph}> { <${rwGraph}s2> <http://rdfs/label> "test" . }
}`);
    expect(err).toBeNull();
});

test("DELETE DATA dans graph autorisé et graph lecture seule est bloqué", async () => {
    const { err } = await filter(`DELETE DATA {
  GRAPH <${rwGraph}>      { <${rwGraph}s1> a <http://owl/Class> . }
  GRAPH <${roGraph}> { <${roGraph}s1> a <http://owl/Class> . }
}`);
    expect(err).toContain(roGraph);
    expect(err).not.toContain(rwGraph);
});

test("DELETE WHERE dans plusieurs graphs autorisés passe", async () => {
    const { err } = await filter(`DELETE {
  GRAPH <${rwGraph}> { ?s <http://rdfs/label> ?oldLabel . }
}
WHERE {
  GRAPH <${rwGraph}> { ?s a <http://owl/Class> ; <http://rdfs/label> ?oldLabel . }
  FILTER(STR(?oldLabel) = "obsolete")
}`);
    expect(err).toBeNull();
});

// ─── COPY / MOVE / ADD multiples via ; ────────────────────────────────────────

test("Deux COPY autorisés séparés par ; passent", async () => {
    const { err } = await filter(`COPY <${rwGraph}> TO <${rwGraph}> ;\nCOPY <${rwGraph}> TO <${rwGraph}>`);
    expect(err).toBeNull();
});

test("COPY autorisé puis MOVE non autorisé séparés par ; est bloqué", async () => {
    const { err } = await filter(`COPY <${rwGraph}> TO <${rwGraph}> ;\nMOVE <${roGraph}> TO <${rwGraph}>`);
    expect(err).toMatch(errWrite("MOVE", roGraph));
});

test("ADD autorisé puis COPY vers graph inconnu séparés par ; est bloqué", async () => {
    const { err } = await filter(`ADD <${rwGraph}> TO <${rwGraph}> ;\nCOPY <${rwGraph}> TO <${unknownGraph}>`);
    expect(err).toMatch(/not allowed/i);
});

// ─── VARIANTES AVEC PREFIX ────────────────────────────────────────────────────
// Chaque cas existant répété avec des déclarations PREFIX en tête de requête.
// Vérifie que les PREFIX ne court-circuitent ni le routage SELECT/UPDATE
// ni les regex ACL (graphRegex, transferRegex, operationMatch).

const PFX = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX owl: <http://www.w3.org/2002/07/owl#>
`;

// ─── ADMIN BYPASS ─────────────────────────────────────────────────────────────

test("PREFIX – Admin – bypass total du filtrage", async () => {
    const { err } = await filter(PFX + `INSERT DATA { <${unknownGraph}s1> a owl:Class . }`, adminUser);
    expect(err).toBeNull();
});

// ─── SELECT avec PREFIX ───────────────────────────────────────────────────────

test("PREFIX – SELECT avec FROM graph autorisé passe", async () => {
    const { err } = await filter(PFX + `SELECT ?s FROM <${rwGraph}> WHERE { ?s a owl:Class }`);
    expect(err).toBeFalsy();
});

test("PREFIX – SELECT sans FROM graph est bloqué", async () => {
    const { err } = await filter(PFX + `SELECT ?s WHERE { ?s ?p ?o }`);
    expect(err).toMatch(/missing from/i);
});

test("PREFIX – SELECT avec FROM graph non autorisé est bloqué", async () => {
    const { err } = await filter(PFX + `SELECT ?s FROM <${unknownGraph}> WHERE { ?s ?p ?o }`);
    expect(err).toMatch(/not allowed/i);
});

// ─── INSERT/DELETE avec PREFIX ────────────────────────────────────────────────

test("PREFIX – T01 INSERT DATA sur graph autorisé en écriture", async () => {
    const { err } = await filter(
        PFX +
            `INSERT DATA {
  GRAPH <${rwGraph}> {
    <${rwGraph}s1> a owl:Class .
  }
}`,
    );
    expect(err).toBeNull();
});

test("PREFIX – T02 DELETE DATA sur graph autorisé en écriture", async () => {
    const { err } = await filter(
        PFX +
            `DELETE DATA {
  GRAPH <${rwGraph}> {
    <${rwGraph}s1> a owl:Class .
  }
}`,
    );
    expect(err).toBeNull();
});

test("PREFIX – T03 DELETE/INSERT avec WITH sur graph autorisé", async () => {
    const { err } = await filter(
        PFX +
            `WITH <${rwGraph}>
DELETE { ?s ?p ?o }
INSERT { ?s ?p "newValue" }
WHERE  { ?s ?p ?o . FILTER(?s = <${rwGraph}s1>) }`,
    );
    expect(err).toBeNull();
});

test("PREFIX – T04 CLEAR sur graph autorisé en écriture", async () => {
    const { err } = await filter(PFX + `CLEAR GRAPH <${rwGraph}>`);
    expect(err).toBeNull();
});

test("PREFIX – T05 COPY entre deux graphs autorisés", async () => {
    const { err } = await filter(PFX + `COPY <${rwGraph}> TO <${rwGraph}>`);
    expect(err).toBeNull();
});

test("PREFIX – T06 INSERT DATA sur plusieurs graphs tous autorisés", async () => {
    const { err } = await filter(
        PFX +
            `INSERT DATA {
  GRAPH <${rwGraph}> { <${rwGraph}s1> a owl:Class . }
  GRAPH <${rwGraph}> { <${rwGraph}s2> a owl:Class . }
}`,
    );
    expect(err).toBeNull();
});

test("PREFIX – T07 Requête sans opération reconnue", async () => {
    const { err } = await filter(PFX + `DESCRIBE <${rwGraph}s1>`);
    expect(err).toMatch(/no operation/i);
});

test("PREFIX – T08 INSERT sans déclaration de graph explicite", async () => {
    const { err } = await filter(PFX + `INSERT DATA { <${rwGraph}s1> a owl:Class . }`);
    expect(err).toMatch(/needs explicit graph declaration/i);
});

test("PREFIX – T09 INSERT sur graph absent du userSourcesMap", async () => {
    const { err } = await filter(
        PFX +
            `INSERT DATA {
  GRAPH <${unknownGraph}> { <${unknownGraph}s1> a owl:Class . }
}`,
    );
    expect(err).toMatch(/not allowed/i);
});

test("PREFIX – T10 INSERT sur graph en lecture seule", async () => {
    const { err } = await filter(
        PFX +
            `INSERT DATA {
  GRAPH <${roGraph}> { <${roGraph}s1> a owl:Class . }
}`,
    );
    expect(err).toMatch(errWrite("INSERT", roGraph));
});

test("PREFIX – T11 INSERT sur plusieurs graphs dont un en lecture seule", async () => {
    const { err } = await filter(
        PFX +
            `INSERT DATA {
  GRAPH <${rwGraph}>      { <${rwGraph}s1> a owl:Class . }
  GRAPH <${roGraph}> { <${roGraph}s1> a owl:Class . }
}`,
    );
    expect(err).toContain(roGraph);
    expect(err).not.toContain(rwGraph);
});

test("PREFIX – T12 COPY depuis un graph lecture seule vers un graph autorisé", async () => {
    const { err } = await filter(PFX + `COPY <${roGraph}> TO <${rwGraph}>`);
    expect(err).toMatch(errWrite("COPY", roGraph));
});

test("PREFIX – T13 DROP DEFAULT sans graph explicite", async () => {
    const { err } = await filter(PFX + `DROP DEFAULT`);
    expect(err).toMatch(/needs explicit graph declaration/i);
});

test("PREFIX – T14 Casse mixte (flag /i)", async () => {
    const { err } = await filter(
        PFX +
            `insert data {
  graph <${rwGraph}> { <${rwGraph}s1> a owl:Class . }
}`,
    );
    expect(err).toBeNull();
});

test("PREFIX – T15 URI dans un littéral string (bug connu : faux positif)", async () => {
    const { err } = await filter(
        PFX +
            `INSERT DATA {
  GRAPH <${rwGraph}> {
    <${rwGraph}s1> <http://label> "DELETE FROM graph <${unknownGraph}>" .
  }
}`,
    );
    expect(err).toMatch(/not allowed/i);
});

// ─── CAS COMMENTAIRES AVEC PREFIX ─────────────────────────────────────────────

test("PREFIX – T16 Commentaire contenant SELECT ne doit pas fausser le routing", async () => {
    const { err } = await filter(
        PFX +
            `# SELECT ?s FROM <${rwGraph}>
DELETE DATA {
  GRAPH <${rwGraph}> { <${rwGraph}s1> a owl:Class . }
}`,
    );
    expect(err).toBeNull();
});

test("PREFIX – T17 Commentaire contenant un graph non autorisé ne doit pas bloquer", async () => {
    const { err } = await filter(
        PFX +
            `# INSERT DATA { GRAPH <${unknownGraph}> { <s> <p> <o> . } }
INSERT DATA {
  GRAPH <${rwGraph}> { <${rwGraph}s1> a owl:Class . }
}`,
    );
    expect(err).toBeNull();
});

test("PREFIX – T18 Commentaire contenant INSERT ne doit pas masquer un DELETE autorisé", async () => {
    const { err } = await filter(
        PFX +
            `# INSERT DATA { GRAPH <${roGraph}> { <s> <p> <o> . } }
DELETE DATA {
  GRAPH <${rwGraph}> { <${rwGraph}s1> a owl:Class . }
}`,
    );
    expect(err).toBeNull();
});

// ─── CAS MULTIPLE OPERATIONS AVEC PREFIX ──────────────────────────────────────

test("PREFIX – T19 Deux opérations autorisées séparées par ;", async () => {
    const { err } = await filter(PFX + `INSERT DATA { GRAPH <${rwGraph}> { <${rwGraph}s1> a owl:Class . } } ;\nDELETE DATA { GRAPH <${rwGraph}> { <${rwGraph}s2> a owl:Class . } }`);
    expect(err).toBeNull();
});

test("PREFIX – T20 Deux opérations dont une non autorisée séparées par ;", async () => {
    const { err } = await filter(PFX + `INSERT DATA { GRAPH <${rwGraph}> { <${rwGraph}s1> a owl:Class . } } ;\nDELETE DATA { GRAPH <${roGraph}> { <${roGraph}s1> a owl:Class . } }`);
    expect(err).toContain(roGraph);
});

test("PREFIX – T21 Deux opérations dont une sans graph explicite séparées par ;", async () => {
    const { err } = await filter(PFX + `INSERT DATA { GRAPH <${rwGraph}> { <${rwGraph}s1> a owl:Class . } } ;\nDELETE DATA { <${rwGraph}s2> a owl:Class . }`);
    expect(err).toMatch(/needs explicit graph declaration/i);
});

// ─── SELECT avec WHERE détaillé + PREFIX ─────────────────────────────────────

test("PREFIX – SELECT avec filtres et sous-requête passe", async () => {
    const { err } = await filter(
        PFX +
            `SELECT ?s ?label
FROM <${rwGraph}>
WHERE {
  ?s a owl:Class .
  OPTIONAL { ?s rdfs:label ?label . FILTER(LANG(?label) = "fr") }
  FILTER NOT EXISTS { ?s owl:deprecated true }
}`,
    );
    expect(err).toBeFalsy();
});

test("PREFIX – SELECT avec FROM NAMED autorisé passe", async () => {
    const { err } = await filter(
        PFX +
            `SELECT ?s
FROM NAMED <${rwGraph}>
WHERE { GRAPH <${rwGraph}> { ?s ?p ?o } }`,
    );
    expect(err).toBeFalsy();
});

test("PREFIX – SELECT avec FROM autorisé et FROM NAMED non autorisé est bloqué", async () => {
    const { err } = await filter(
        PFX +
            `SELECT ?s
FROM <${rwGraph}>
FROM NAMED <${unknownGraph}>
WHERE { ?s ?p ?o }`,
    );
    expect(err).toMatch(/not allowed/i);
});

// ─── INSERT avec WHERE détaillé + PREFIX ─────────────────────────────────────

test("PREFIX – INSERT avec WHERE et FILTER passe sur graph autorisé", async () => {
    const { err } = await filter(
        PFX +
            `WITH <${rwGraph}>
INSERT {
  ?s rdfs:label "updated label" .
}
WHERE {
  ?s a owl:Class .
  FILTER NOT EXISTS { ?s rdfs:label ?label }
}`,
    );
    expect(err).toBeNull();
});

test("PREFIX – INSERT avec WHERE sur graph lecture seule est bloqué", async () => {
    const { err } = await filter(
        PFX +
            `WITH <${roGraph}>
INSERT { ?s rdfs:label "x" . }
WHERE  { ?s a owl:Class . }`,
    );
    expect(err).toMatch(errWrite("INSERT", roGraph));
});

test("PREFIX – INSERT ciblant graph autorisé avec source lecture seule en WHERE passe", async () => {
    const { err } = await filter(
        PFX +
            `INSERT {
  GRAPH <${rwGraph}> { ?s rdfs:label ?label . }
}
WHERE {
  GRAPH <${roGraph}> { ?s rdfs:label ?label . }
}`,
    );
    // roGraph est uniquement source de lecture dans le WHERE — seul rwGraph (écriture) est ciblé
    expect(err).toBeNull();
});

// ─── DELETE avec WHERE détaillé + PREFIX ─────────────────────────────────────

test("PREFIX – DELETE avec WHERE et OPTIONAL passe sur graph autorisé", async () => {
    const { err } = await filter(
        PFX +
            `WITH <${rwGraph}>
DELETE {
  ?s rdfs:label ?oldLabel .
}
WHERE {
  ?s a owl:Class .
  OPTIONAL { ?s rdfs:label ?oldLabel }
  FILTER(STR(?oldLabel) = "old value")
}`,
    );
    expect(err).toBeNull();
});

test("PREFIX – DELETE WHERE (forme courte) sur graph autorisé passe", async () => {
    const { err } = await filter(
        PFX +
            `DELETE WHERE {
  GRAPH <${rwGraph}> {
    <${rwGraph}s1> ?p ?o .
  }
}`,
    );
    expect(err).toBeNull();
});

test("PREFIX – DELETE WHERE sur graph lecture seule est bloqué", async () => {
    const { err } = await filter(
        PFX +
            `WITH <${roGraph}>
DELETE { ?s ?p ?o }
WHERE  { ?s a owl:Class . }`,
    );
    expect(err).toMatch(errWrite("DELETE", roGraph));
});

// ─── COPY / MOVE / ADD avec PREFIX ────────────────────────────────────────────

test("PREFIX – COPY de graph autorisé vers graph autorisé passe", async () => {
    const { err } = await filter(PFX + `COPY <${rwGraph}> TO <${rwGraph}>`);
    expect(err).toBeNull();
});

test("PREFIX – MOVE de graph autorisé vers graph autorisé passe", async () => {
    const { err } = await filter(PFX + `MOVE <${rwGraph}> TO <${rwGraph}>`);
    expect(err).toBeNull();
});

test("PREFIX – ADD de graph autorisé vers graph autorisé passe", async () => {
    const { err } = await filter(PFX + `ADD <${rwGraph}> TO <${rwGraph}>`);
    expect(err).toBeNull();
});

test("PREFIX – COPY depuis graph lecture seule est bloqué", async () => {
    const { err } = await filter(PFX + `COPY <${roGraph}> TO <${rwGraph}>`);
    expect(err).toMatch(errWrite("COPY", roGraph));
});

test("PREFIX – MOVE depuis graph lecture seule est bloqué", async () => {
    const { err } = await filter(PFX + `MOVE <${roGraph}> TO <${rwGraph}>`);
    expect(err).toMatch(errWrite("MOVE", roGraph));
});

test("PREFIX – ADD depuis graph lecture seule est bloqué", async () => {
    const { err } = await filter(PFX + `ADD <${roGraph}> TO <${rwGraph}>`);
    expect(err).toMatch(errWrite("ADD", roGraph));
});

test("PREFIX – COPY vers graph non autorisé est bloqué", async () => {
    const { err } = await filter(PFX + `COPY <${rwGraph}> TO <${unknownGraph}>`);
    expect(err).toMatch(/not allowed/i);
});

test("PREFIX – COPY sans URI (pas de <>) ne matche pas la regex transfert — bloqué", async () => {
    const { err } = await filter(PFX + `COPY DEFAULT TO NAMED <${rwGraph}>`);
    expect(err).toBeTruthy();
});

// ─── SELECT avec plusieurs FROM + PREFIX ─────────────────────────────────────

test("PREFIX – SELECT avec deux FROM autorisés passe", async () => {
    const { err } = await filter(
        PFX +
            `SELECT ?s ?p ?o
FROM <${rwGraph}>
FROM <${roGraph}>
WHERE { ?s ?p ?o }`,
    );
    expect(err).toBeFalsy();
});

test("PREFIX – SELECT avec FROM autorisé et FROM non autorisé est bloqué", async () => {
    const { err } = await filter(
        PFX +
            `SELECT ?s
FROM <${rwGraph}>
FROM <${unknownGraph}>
WHERE { ?s ?p ?o }`,
    );
    expect(err).toMatch(/not allowed/i);
});

test("PREFIX – SELECT avec deux FROM NAMED autorisés passe", async () => {
    const { err } = await filter(
        PFX +
            `SELECT ?s
FROM NAMED <${rwGraph}>
FROM NAMED <${roGraph}>
WHERE { GRAPH ?g { ?s ?p ?o } }`,
    );
    expect(err).toBeFalsy();
});

test("PREFIX – SELECT avec FROM + FROM NAMED tous autorisés passe", async () => {
    const { err } = await filter(
        PFX +
            `SELECT ?s
FROM <${rwGraph}>
FROM NAMED <${roGraph}>
WHERE { ?s ?p ?o }`,
    );
    expect(err).toBeFalsy();
});

test("PREFIX – SELECT avec FROM + FROM NAMED dont un non autorisé est bloqué", async () => {
    const { err } = await filter(
        PFX +
            `SELECT ?s
FROM <${rwGraph}>
FROM NAMED <${unknownGraph}>
WHERE { ?s ?p ?o }`,
    );
    expect(err).toMatch(/not allowed/i);
});

// ─── INSERT avec plusieurs GRAPH + PREFIX ─────────────────────────────────────

test("PREFIX – INSERT DATA dans deux graphs autorisés passe", async () => {
    const { err } = await filter(
        PFX +
            `INSERT DATA {
  GRAPH <${rwGraph}> { <${rwGraph}s1> a owl:Class . }
  GRAPH <${rwGraph}> { <${rwGraph}s2> rdfs:label "test" . }
}`,
    );
    expect(err).toBeNull();
});

test("PREFIX – INSERT DATA dans graph autorisé et graph lecture seule est bloqué", async () => {
    const { err } = await filter(
        PFX +
            `INSERT DATA {
  GRAPH <${rwGraph}>      { <${rwGraph}s1> a owl:Class . }
  GRAPH <${roGraph}> { <${roGraph}s1> a owl:Class . }
}`,
    );
    expect(err).toContain(roGraph);
    expect(err).not.toContain(rwGraph);
});

test("PREFIX – INSERT DATA dans graph autorisé et graph inconnu est bloqué sur les deux", async () => {
    const { err } = await filter(
        PFX +
            `INSERT DATA {
  GRAPH <${roGraph}> { <${roGraph}s1> a owl:Class . }
  GRAPH <${unknownGraph}>     { <${unknownGraph}s1> a owl:Class . }
}`,
    );
    expect(err).toContain(roGraph);
    expect(err).toContain(unknownGraph);
});

test("PREFIX – INSERT avec WHERE dans plusieurs graphs autorisés passe", async () => {
    const { err } = await filter(
        PFX +
            `INSERT {
  GRAPH <${rwGraph}> { ?s rdfs:label ?label . }
}
WHERE {
  GRAPH <${rwGraph}> { ?s a owl:Class . OPTIONAL { ?s rdfs:label ?label } }
  FILTER(!BOUND(?label))
}`,
    );
    expect(err).toBeNull();
});

// ─── DELETE avec plusieurs GRAPH + PREFIX ─────────────────────────────────────

test("PREFIX – DELETE DATA dans deux graphs autorisés passe", async () => {
    const { err } = await filter(
        PFX +
            `DELETE DATA {
  GRAPH <${rwGraph}> { <${rwGraph}s1> a owl:Class . }
  GRAPH <${rwGraph}> { <${rwGraph}s2> rdfs:label "test" . }
}`,
    );
    expect(err).toBeNull();
});

test("PREFIX – DELETE DATA dans graph autorisé et graph lecture seule est bloqué", async () => {
    const { err } = await filter(
        PFX +
            `DELETE DATA {
  GRAPH <${rwGraph}>      { <${rwGraph}s1> a owl:Class . }
  GRAPH <${roGraph}> { <${roGraph}s1> a owl:Class . }
}`,
    );
    expect(err).toContain(roGraph);
    expect(err).not.toContain(rwGraph);
});

test("PREFIX – DELETE WHERE dans plusieurs graphs autorisés passe", async () => {
    const { err } = await filter(
        PFX +
            `DELETE {
  GRAPH <${rwGraph}> { ?s rdfs:label ?oldLabel . }
}
WHERE {
  GRAPH <${rwGraph}> { ?s a owl:Class ; rdfs:label ?oldLabel . }
  FILTER(STR(?oldLabel) = "obsolete")
}`,
    );
    expect(err).toBeNull();
});

// ─── COPY / MOVE / ADD multiples via ; + PREFIX ───────────────────────────────

test("PREFIX – Deux COPY autorisés séparés par ; passent", async () => {
    const { err } = await filter(PFX + `COPY <${rwGraph}> TO <${rwGraph}> ;\nCOPY <${rwGraph}> TO <${rwGraph}>`);
    expect(err).toBeNull();
});

test("PREFIX – COPY autorisé puis MOVE non autorisé séparés par ; est bloqué", async () => {
    const { err } = await filter(PFX + `COPY <${rwGraph}> TO <${rwGraph}> ;\nMOVE <${roGraph}> TO <${rwGraph}>`);
    expect(err).toMatch(errWrite("MOVE", roGraph));
});

test("PREFIX – ADD autorisé puis COPY vers graph inconnu séparés par ; est bloqué", async () => {
    const { err } = await filter(PFX + `ADD <${rwGraph}> TO <${rwGraph}> ;\nCOPY <${rwGraph}> TO <${unknownGraph}>`);
    expect(err).toMatch(/not allowed/i);
});

// ─── CAS STRESS : URI de PREFIX contenant un mot-clé SPARQL ──────────────────

test("STRESS – PREFIX dont l'URI contient GRAPH ne fausse pas la détection de graph", async () => {
    const { err } = await filter(`PREFIX myGraph: <http://ns/GRAPH/vocab#>\nINSERT DATA {\n  GRAPH <${rwGraph}> { <${rwGraph}s1> a <http://owl/Class> . }\n}`);
    expect(err).toBeNull();
});

test("STRESS – PREFIX dont l'URI contient SELECT ne fausse pas le routing", async () => {
    const { err } = await filter(`PREFIX sel: <http://www.example.org/SELECT/vocab#>\nINSERT DATA {\n  GRAPH <${rwGraph}> { <${rwGraph}s1> a <http://owl/Class> . }\n}`);
    expect(err).toBeNull();
});

// ─── PATTERNS RÉELS DE sparqlProxies ─────────────────────────────────────────
// Archetypes extraits de sparql_SKOS.js et sparql_generic.js

// Pattern 1 : WITH <g> DELETE {?s ?p ?o} — sans WHERE (deleteGraph, deleteTriplesWithFilter)
test("PROXY – WITH <g> DELETE sans WHERE sur graph autorisé passe", async () => {
    const { err } = await filter(`WITH <${rwGraph}> DELETE {?s ?p ?o}`);
    expect(err).toBeNull();
});

test("PROXY – WITH <g> DELETE sans WHERE sur graph lecture seule est bloqué", async () => {
    const { err } = await filter(`WITH <${roGraph}> DELETE {?s ?p ?o}`);
    expect(err).toMatch(errWrite("DELETE", roGraph));
});

// Pattern 2 : WITH GRAPH <g> INSERT DATA {...} — syntaxe non standard de sparql_SKOS.insertTriples
// La regex capture <g> via le mot-clé GRAPH (pas via WITH, car WITH\s+< ne matche pas "WITH GRAPH <g>").
test("PROXY – WITH GRAPH <g> INSERT DATA sur graph autorisé passe", async () => {
    const { err } = await filter(`WITH GRAPH  <${rwGraph}>  INSERT DATA  { <${rwGraph}s1> <http://rdfs/label> "test" . }`);
    expect(err).toBeNull();
});

test("PROXY – WITH GRAPH <g> INSERT DATA sur graph lecture seule est bloqué", async () => {
    const { err } = await filter(`WITH GRAPH  <${roGraph}>  INSERT DATA  { <${roGraph}s1> <http://rdfs/label> "test" . }`);
    expect(err).toMatch(errWrite("INSERT", roGraph));
});

// Pattern 3 : WITH GRAPH <g> INSERT {...} — sans DATA (sparql_generic.insertTriples)
test("PROXY – WITH GRAPH <g> INSERT (sans DATA) sur graph autorisé passe", async () => {
    const { err } = await filter(`WITH GRAPH  <${rwGraph}>  INSERT  { <${rwGraph}s1> <http://rdfs/label> "test" . }`);
    expect(err).toBeNull();
});

test("PROXY – WITH GRAPH <g> INSERT (sans DATA) sur graph lecture seule est bloqué", async () => {
    const { err } = await filter(`WITH GRAPH  <${roGraph}>  INSERT  { <${roGraph}s1> <http://rdfs/label> "test" . }`);
    expect(err).toMatch(errWrite("INSERT", roGraph));
});

// Pattern 4 : with <srcG> insert {graph <dstG> {...}} where {...} — copyGraph avec offset
test("PROXY – copyGraph avec offset (srcG = dstG, rw) passe", async () => {
    const { err } = await filter(`with <${rwGraph}>\ninsert {graph <${rwGraph}> {?s ?p ?o}}\nwhere {?s ?p ?o}`);
    expect(err).toBeNull();
});

// Limitation connue : WITH <srcG> est capturé comme cible d'écriture même quand c'est une source de lecture.
test("PROXY – copyGraph avec offset (srcG=ronly, dstG=rw) est bloqué (limitation connue)", async () => {
    const { err } = await filter(`WITH <${roGraph}>\nINSERT {GRAPH <${rwGraph}> {?s ?p ?o}}\nWHERE {?s ?p ?o}`);
    // WITH <roGraph> est pris pour une cible écriture même si c'est une source de lecture.
    expect(err).toMatch(errWrite("INSERT", roGraph));
});

// ─── SOUS-REQUÊTES (subqueries) dans INSERT / DELETE ─────────────────────────

test("SUB – INSERT WHERE avec sub-SELECT lisant un graph lecture seule passe", async () => {
    const { err } = await filter(`${PFX}INSERT {
  GRAPH <${rwGraph}> { ?s1 <http://www.w3.org/2004/02/skos/core#definition> ?def }
}
WHERE {
  {
    SELECT ?s1 (LCASE(STR(?label)) AS ?key)
    WHERE { GRAPH <${rwGraph}> { ?s1 rdfs:label ?label } }
    LIMIT 100
  }
  GRAPH <${roGraph}> { ?s2 rdfs:label ?label2 . ?s2 <http://www.w3.org/2004/02/skos/core#definition> ?def }
  FILTER(?label2 = ?key)
}`);
    expect(err).toBeNull();
});

test("SUB – DELETE WHERE avec sub-SELECT passe", async () => {
    const { err } = await filter(`${PFX}DELETE {
  GRAPH <${rwGraph}> { ?s rdfs:label ?oldLabel }
}
WHERE {
  { SELECT ?s WHERE { GRAPH <${rwGraph}> { ?s a owl:Class } } LIMIT 50 }
  GRAPH <${rwGraph}> { ?s rdfs:label ?oldLabel }
}`);
    expect(err).toBeNull();
});

test("SUB – WITH + DELETE/INSERT + WHERE avec sub-SELECT passe", async () => {
    const { err } = await filter(`${PFX}WITH <${rwGraph}>
DELETE { ?s rdfs:label ?oldLabel }
INSERT { ?s rdfs:label ?newLabel }
WHERE {
  { SELECT ?s ?oldLabel (UCASE(?oldLabel) AS ?newLabel)
    WHERE { GRAPH <${rwGraph}> { ?s rdfs:label ?oldLabel } }
  }
}`);
    expect(err).toBeNull();
});

test("SUB – INSERT WHERE avec deux sub-SELECTs sur graphs différents autorisés passe", async () => {
    const { err } = await filter(`${PFX}INSERT {
  GRAPH <${rwGraph}> { ?s owl:sameAs ?s2 }
}
WHERE {
  { SELECT ?s WHERE { GRAPH <${rwGraph}> { ?s a owl:Class } } }
  { SELECT ?s2 WHERE { GRAPH <${roGraph}> { ?s2 a owl:Class } } }
  FILTER(?s != ?s2)
}`);
    expect(err).toBeNull();
});

test("SUB – INSERT WHERE avec sub-SELECT imbriqué (SELECT dans SELECT) passe", async () => {
    const { err } = await filter(`${PFX}INSERT {
  GRAPH <${rwGraph}> { ?s rdfs:label ?label }
}
WHERE {
  { SELECT ?s ?label WHERE {
      { SELECT ?s WHERE { GRAPH <${rwGraph}> { ?s a owl:Class } } LIMIT 10 }
      GRAPH <${roGraph}> { ?s rdfs:label ?label }
  } }
}`);
    expect(err).toBeNull();
});

test("SUB – INSERT WHERE avec sub-SELECT et GROUP BY / HAVING passe", async () => {
    const { err } = await filter(`${PFX}INSERT {
  GRAPH <${rwGraph}> { ?type owl:deprecated true }
}
WHERE {
  { SELECT ?type (COUNT(?s) AS ?count)
    WHERE { GRAPH <${roGraph}> { ?s a ?type } }
    GROUP BY ?type
    HAVING (COUNT(?s) > 10)
  }
}`);
    expect(err).toBeNull();
});

test("SUB – DELETE WHERE avec sub-SELECT lisant un graph lecture seule passe", async () => {
    const { err } = await filter(`${PFX}DELETE {
  GRAPH <${rwGraph}> { ?s rdfs:label ?label }
}
WHERE {
  { SELECT ?s ?label WHERE { GRAPH <${roGraph}> { ?s rdfs:label ?label } } }
  GRAPH <${rwGraph}> { ?s a owl:Class }
}`);
    expect(err).toBeNull();
});

test("SUB – INSERT WHERE avec GRAPH inconnu en source directe est bloqué", async () => {
    const { err } = await filter(`${PFX}INSERT {
  GRAPH <${rwGraph}> { ?s rdfs:label ?label }
}
WHERE {
  GRAPH <${unknownGraph}> { ?s rdfs:label ?label }
}`);
    expect(err).toMatch(/not allowed/i);
});

test("SUB – INSERT WHERE avec sub-SELECT sur graph inconnu est bloqué", async () => {
    const { err } = await filter(`${PFX}INSERT {
  GRAPH <${rwGraph}> { ?s rdfs:label ?label }
}
WHERE {
  { SELECT ?s ?label WHERE { GRAPH <${unknownGraph}> { ?s rdfs:label ?label } } LIMIT 100 }
}`);
    expect(err).toMatch(/not allowed/i);
});

test("SUB – INSERT WHERE avec sub-SELECT et VALUES (pas de GRAPH dans WHERE) passe", async () => {
    const { err } = await filter(`${PFX}INSERT {
  GRAPH <${rwGraph}> { ?s rdfs:label ?label }
}
WHERE {
  { SELECT ?s ?label WHERE { GRAPH <${rwGraph}> { ?s a owl:Class . ?s rdfs:label ?label } } }
  VALUES ?s { <${rwGraph}s1> <${rwGraph}s2> }
}`);
    expect(err).toBeNull();
});

test("SUB – DELETE/INSERT (UPDATE) WHERE avec sub-SELECT sur plusieurs graphs passe", async () => {
    const { err } = await filter(`${PFX}DELETE {
  GRAPH <${rwGraph}> { ?s rdfs:label ?oldLabel }
}
INSERT {
  GRAPH <${rwGraph}> { ?s rdfs:label ?newLabel }
}
WHERE {
  { SELECT ?s ?oldLabel ?newLabel WHERE {
      GRAPH <${rwGraph}> { ?s rdfs:label ?oldLabel }
      GRAPH <${roGraph}> { ?s <http://www.w3.org/2004/02/skos/core#prefLabel> ?newLabel }
  } }
}`);
    expect(err).toBeNull();
});

test("SUB – INSERT WHERE avec sub-SELECT ciblant un graph écriture non autorisé est bloqué", async () => {
    const { err } = await filter(`${PFX}INSERT {
  GRAPH <${roGraph}> { ?s rdfs:label ?label }
}
WHERE {
  { SELECT ?s ?label WHERE { GRAPH <${rwGraph}> { ?s rdfs:label ?label } } }
}`);
    expect(err).toMatch(errWrite("INSERT", roGraph));
});

// ─── SELECT avec sous-SELECT ayant des clauses FROM ───────────────────────────
// La requête principale doit toujours avoir un FROM au niveau extérieur.
// Les FROM dans les sous-SELECT sont vérifiés par regex (extension moteur, rejetée par le parser SPARQL 1.1).

test("SUBSEL – SELECT outer FROM rwGraph, sous-SELECT FROM roGraph passe", async () => {
    const { err } = await filter(`SELECT ?s ?label
FROM <${rwGraph}>
WHERE {
  ?s a ?type .
  {
    SELECT ?type ?label
    FROM <${roGraph}>
    WHERE {
      ?type ?p ?label .
    }
  }
}`);
    expect(err).toBeFalsy();
});

test("SUBSEL – SELECT outer FROM rwGraph, sous-SELECT FROM unknownGraph est bloqué", async () => {
    const { err } = await filter(`SELECT ?s ?label
FROM <${rwGraph}>
WHERE {
  {
    SELECT ?type ?label
    FROM <${unknownGraph}>
    WHERE {
      ?type ?p ?label .
    }
  }
}`);
    expect(err).toMatch(/not allowed/i);
});

test("SUBSEL – SELECT sans outer FROM, sous-SELECT FROM rwGraph est bloqué (missing outer FROM)", async () => {
    const { err } = await filter(`SELECT ?s ?label
WHERE {
  {
    SELECT ?type ?label
    FROM <${rwGraph}>
    WHERE {
      ?type ?p ?label .
    }
  }
}`);
    expect(err).toMatch(/missing from/i);
});

test("SUBSEL – SELECT outer FROM rwGraph, sous-SELECT FROM NAMED rwGraph passe", async () => {
    const { err } = await filter(`SELECT ?s ?label
FROM <${rwGraph}>
WHERE {
  {
    SELECT ?type ?label
    FROM NAMED <${rwGraph}>
    WHERE { GRAPH <${rwGraph}> { ?type ?p ?label . } }
  }
}`);
    expect(err).toBeFalsy();
});

test("SUBSEL – SELECT outer FROM rwGraph, sous-SELECT FROM NAMED unknownGraph est bloqué", async () => {
    const { err } = await filter(`SELECT ?s ?label
FROM <${rwGraph}>
WHERE {
  {
    SELECT ?type ?label
    FROM NAMED <${unknownGraph}>
    WHERE { GRAPH <${unknownGraph}> { ?type ?p ?label . } }
  }
}`);
    expect(err).toMatch(/not allowed/i);
});

test("SUBSEL – SELECT outer FROM rwGraph, deux sous-SELECT FROM roGraph passent", async () => {
    const { err } = await filter(`SELECT ?s ?label
FROM <${rwGraph}>
WHERE {
  {
    SELECT ?type ?label
    FROM <${roGraph}>
    WHERE { ?type ?p ?label . }
  }
  {
    SELECT ?s
    FROM <${roGraph}>
    WHERE { ?s a ?type . }
  }
}`);
    expect(err).toBeFalsy();
});

test("SUBSEL – SELECT outer FROM rwGraph, deux sous-SELECT dont un FROM unknownGraph est bloqué", async () => {
    const { err } = await filter(`SELECT ?s ?label
FROM <${rwGraph}>
WHERE {
  {
    SELECT ?type ?label
    FROM <${roGraph}>
    WHERE { ?type ?p ?label . }
  }
  {
    SELECT ?s
    FROM <${unknownGraph}>
    WHERE { ?s a ?type . }
  }
}`);
    expect(err).toMatch(/not allowed/i);
});

test("SUBSEL – SELECT outer FROM rwGraph, sous-SELECT FROM + FROM NAMED tous autorisés passe", async () => {
    const { err } = await filter(`SELECT ?s ?label
FROM <${rwGraph}>
WHERE {
  {
    SELECT ?type ?label
    FROM <${roGraph}>
    FROM NAMED <${rwGraph}>
    WHERE { GRAPH <${rwGraph}> { ?type ?p ?label . } }
  }
}`);
    expect(err).toBeFalsy();
});

test("SUBSEL – SELECT outer FROM rwGraph, sous-SELECT FROM roGraph + FROM NAMED unknownGraph est bloqué", async () => {
    const { err } = await filter(`SELECT ?s ?label
FROM <${rwGraph}>
WHERE {
  {
    SELECT ?type ?label
    FROM <${roGraph}>
    FROM NAMED <${unknownGraph}>
    WHERE { GRAPH <${unknownGraph}> { ?type ?p ?label . } }
  }
}`);
    expect(err).toMatch(/not allowed/i);
});

test("SUBSEL – SELECT outer FROM rwGraph, sous-SELECT avec GRAPH (sans FROM) passe", async () => {
    const { err } = await filter(`SELECT ?s ?label
FROM <${rwGraph}>
WHERE {
  {
    SELECT ?type ?label
    WHERE { GRAPH <${roGraph}> { ?type ?p ?label . } }
  }
}`);
    expect(err).toBeFalsy();
});

test("SUBSEL – SELECT outer FROM + FROM NAMED autorisés, sous-SELECT FROM roGraph passe", async () => {
    const { err } = await filter(`SELECT ?s ?label
FROM <${rwGraph}>
FROM NAMED <${roGraph}>
WHERE {
  {
    SELECT ?type ?label
    FROM <${roGraph}>
    WHERE { ?type ?p ?label . }
  }
}`);
    expect(err).toBeFalsy();
});

test("SUBSEL – sous-SELECT imbriqué (SELECT dans SELECT) avec FROM autorisé passe", async () => {
    const { err } = await filter(`SELECT ?s ?label
FROM <${rwGraph}>
WHERE {
  {
    SELECT ?type ?label
    FROM <${roGraph}>
    WHERE {
      {
        SELECT ?type
        FROM <${roGraph}>
        WHERE { ?type a ?class . }
      }
      ?type ?p ?label .
    }
  }
}`);
    expect(err).toBeFalsy();
});

test("SUBSEL – sous-SELECT imbriqué avec FROM unknownGraph est bloqué", async () => {
    const { err } = await filter(`SELECT ?s ?label
FROM <${rwGraph}>
WHERE {
  {
    SELECT ?type ?label
    FROM <${roGraph}>
    WHERE {
      {
        SELECT ?type
        FROM <${unknownGraph}>
        WHERE { ?type a ?class . }
      }
      ?type ?p ?label .
    }
  }
}`);
    expect(err).toMatch(/not allowed/i);
});

// ─── SELECT avec sous-SELECT + PREFIX ────────────────────────────────────────

test("PREFIX – SUBSEL SELECT outer FROM rwGraph, sous-SELECT FROM roGraph passe", async () => {
    const { err } = await filter(
        PFX +
            `SELECT ?s ?label
FROM <${rwGraph}>
WHERE {
  ?s rdf:type ?type .
  {
    SELECT ?type ?label
    FROM <${roGraph}>
    WHERE { ?type rdfs:label ?label . }
  }
}`,
    );
    expect(err).toBeFalsy();
});

test("PREFIX – SUBSEL SELECT outer FROM rwGraph, sous-SELECT FROM unknownGraph est bloqué", async () => {
    const { err } = await filter(
        PFX +
            `SELECT ?s ?label
FROM <${rwGraph}>
WHERE {
  {
    SELECT ?type ?label
    FROM <${unknownGraph}>
    WHERE { ?type rdfs:label ?label . }
  }
}`,
    );
    expect(err).toMatch(/not allowed/i);
});

test("PREFIX – SUBSEL SELECT sans outer FROM, sous-SELECT FROM rwGraph est bloqué", async () => {
    const { err } = await filter(
        PFX +
            `SELECT ?s ?label
WHERE {
  {
    SELECT ?type ?label
    FROM <${rwGraph}>
    WHERE { ?type rdfs:label ?label . }
  }
}`,
    );
    expect(err).toMatch(/missing from/i);
});

test("PREFIX – SUBSEL SELECT outer FROM rwGraph, sous-SELECT FROM NAMED unknownGraph est bloqué", async () => {
    const { err } = await filter(
        PFX +
            `SELECT ?s ?label
FROM <${rwGraph}>
WHERE {
  {
    SELECT ?type ?label
    FROM NAMED <${unknownGraph}>
    WHERE { GRAPH <${unknownGraph}> { ?type rdfs:label ?label . } }
  }
}`,
    );
    expect(err).toMatch(/not allowed/i);
});

test("PREFIX – SUBSEL SELECT outer FROM rwGraph, deux sous-SELECT FROM autorisés passent", async () => {
    const { err } = await filter(
        PFX +
            `SELECT ?s ?label
FROM <${rwGraph}>
WHERE {
  {
    SELECT ?type ?label
    FROM <${roGraph}>
    WHERE { ?type rdfs:label ?label . }
  }
  {
    SELECT ?s
    FROM <${rwGraph}>
    WHERE { ?s a ?type . }
  }
}`,
    );
    expect(err).toBeFalsy();
});

test("PREFIX – SUBSEL SELECT outer FROM rwGraph, sous-SELECT avec GRAPH sans FROM passe", async () => {
    const { err } = await filter(
        PFX +
            `SELECT ?s ?label
FROM <${rwGraph}>
WHERE {
  {
    SELECT ?type ?label
    WHERE { GRAPH <${roGraph}> { ?type rdfs:label ?label . } }
  }
}`,
    );
    expect(err).toBeFalsy();
});

test("PREFIX – SUBSEL SELECT outer FROM rwGraph, sous-SELECT FROM roGraph + FROM NAMED rwGraph passe", async () => {
    const { err } = await filter(
        PFX +
            `SELECT ?s ?label
FROM <${rwGraph}>
WHERE {
  {
    SELECT ?type ?label
    FROM <${roGraph}>
    FROM NAMED <${rwGraph}>
    WHERE { GRAPH <${rwGraph}> { ?type rdfs:label ?label . } }
  }
}`,
    );
    expect(err).toBeFalsy();
});

// ─── SELECT avec GRAPH dans WHERE (sans FROM) ─────────────────────────────────
// Pattern courant où le dataset est déclaré via GRAPH dans WHERE plutôt que FROM.
// La requête de l'utilisateur utilise ce pattern.

test("GRAPH-WHERE – SELECT avec GRAPH rwGraph dans WHERE (sans FROM) passe", async () => {
    const { err } = await filter(`SELECT ?s ?p ?o
WHERE {
  GRAPH <${rwGraph}> { ?s ?p ?o . }
}`);
    expect(err).toBeFalsy();
});

test("GRAPH-WHERE – SELECT avec GRAPH rwGraph + GRAPH roGraph dans WHERE (sans FROM) passe", async () => {
    const { err } = await filter(`SELECT ?s ?label
WHERE {
  GRAPH <${rwGraph}> { ?s a ?type . }
  GRAPH <${roGraph}> { ?type ?p ?label . }
}`);
    expect(err).toBeFalsy();
});

test("GRAPH-WHERE – SELECT avec GRAPH unknownGraph dans WHERE est bloqué", async () => {
    const { err } = await filter(`SELECT ?s ?p ?o
WHERE {
  GRAPH <${unknownGraph}> { ?s ?p ?o . }
}`);
    expect(err).toMatch(/not allowed/i);
});

test("GRAPH-WHERE – SELECT avec GRAPH roGraph + GRAPH unknownGraph dans WHERE est bloqué", async () => {
    const { err } = await filter(`SELECT ?s ?label
WHERE {
  GRAPH <${roGraph}> { ?s a ?type . }
  GRAPH <${unknownGraph}> { ?type ?p ?label . }
}`);
    expect(err).toMatch(/not allowed/i);
});

test("GRAPH-WHERE – SELECT sans FROM et sans GRAPH est bloqué (missing from)", async () => {
    const { err } = await filter(`SELECT ?s ?p ?o WHERE { ?s ?p ?o . }`);
    expect(err).toMatch(/missing from/i);
});

test("GRAPH-WHERE – SELECT avec FROM rwGraph + GRAPH roGraph dans WHERE passe", async () => {
    const { err } = await filter(`SELECT ?s ?label
FROM <${rwGraph}>
WHERE {
  GRAPH <${roGraph}> { ?s ?p ?label . }
}`);
    expect(err).toBeFalsy();
});

test("GRAPH-WHERE – SELECT avec FROM rwGraph + GRAPH unknownGraph dans WHERE est bloqué", async () => {
    const { err } = await filter(`SELECT ?s ?p ?o
FROM <${rwGraph}>
WHERE {
  GRAPH <${unknownGraph}> { ?s ?p ?o . }
}`);
    expect(err).toMatch(/not allowed/i);
});

test("GRAPH-WHERE – requête utilisateur : SELECT sans FROM avec deux GRAPH (rwGraph + roGraph) passe", async () => {
    const { err } = await filter(`${PFX}SELECT ?s ?label
WHERE {
  GRAPH <${rwGraph}> {
    ?s rdf:type ?type .
  }
  {
    SELECT ?type ?label
    WHERE {
      GRAPH <${roGraph}> {
        ?type rdfs:label ?label .
      }
    }
  }
}`);
    expect(err).toBeFalsy();
});

test("GRAPH-WHERE – SELECT sans FROM avec sous-SELECT GRAPH unknownGraph est bloqué", async () => {
    const { err } = await filter(`${PFX}SELECT ?s ?label
WHERE {
  GRAPH <${rwGraph}> { ?s a ?type . }
  {
    SELECT ?type ?label
    WHERE {
      GRAPH <${unknownGraph}> { ?type rdfs:label ?label . }
    }
  }
}`);
    expect(err).toMatch(/not allowed/i);
});

// ─── SELECT avec GRAPH dans WHERE + PREFIX ────────────────────────────────────

test("PREFIX – GRAPH-WHERE SELECT avec GRAPH rwGraph dans WHERE (sans FROM) passe", async () => {
    const { err } = await filter(
        PFX +
            `SELECT ?s ?p ?o
WHERE {
  GRAPH <${rwGraph}> { ?s ?p ?o . }
}`,
    );
    expect(err).toBeFalsy();
});

test("PREFIX – GRAPH-WHERE SELECT avec GRAPH unknownGraph dans WHERE est bloqué", async () => {
    const { err } = await filter(
        PFX +
            `SELECT ?s ?p ?o
WHERE {
  GRAPH <${unknownGraph}> { ?s ?p ?o . }
}`,
    );
    expect(err).toMatch(/not allowed/i);
});

test("PREFIX – GRAPH-WHERE SELECT avec GRAPH rwGraph + GRAPH roGraph dans WHERE passe", async () => {
    const { err } = await filter(
        PFX +
            `SELECT ?s ?label
WHERE {
  GRAPH <${rwGraph}> { ?s a owl:Class . }
  GRAPH <${roGraph}> { ?s rdfs:label ?label . }
}`,
    );
    expect(err).toBeFalsy();
});

test("PREFIX – GRAPH-WHERE SELECT sans FROM et sans GRAPH est bloqué", async () => {
    const { err } = await filter(PFX + `SELECT ?s ?p ?o WHERE { ?s ?p ?o . }`);
    expect(err).toMatch(/missing from/i);
});

test("PREFIX – GRAPH-WHERE SELECT avec FROM rwGraph + GRAPH unknownGraph est bloqué", async () => {
    const { err } = await filter(
        PFX +
            `SELECT ?s ?p ?o
FROM <${rwGraph}>
WHERE {
  GRAPH <${unknownGraph}> { ?s ?p ?o . }
}`,
    );
    expect(err).toMatch(/not allowed/i);
});

test("PREFIX – GRAPH-WHERE SELECT avec FROM NAMED rwGraph + GRAPH roGraph dans WHERE passe", async () => {
    const { err } = await filter(
        PFX +
            `SELECT ?s ?label
FROM NAMED <${rwGraph}>
WHERE {
  GRAPH <${rwGraph}> { ?s a owl:Class . }
  GRAPH <${roGraph}> { ?s rdfs:label ?label . }
}`,
    );
    expect(err).toBeFalsy();
});

// ─── AST vs regex : pas de faux positif sur les littéraux string ──────────────
// Contrairement à l'approche regex, la traversée AST ne capture pas les URIs
// présentes dans des littéraux string comme de vrais GRAPH patterns (cf. T15 INSERT).

test("AST – URI dans un littéral string ne déclenche pas d'erreur (pas de faux positif)", async () => {
    const { err } = await filter(`SELECT ?s ?p ?o
FROM <${rwGraph}>
WHERE {
  ?s ?p "GRAPH <${unknownGraph}>" .
}`);
    // AST : le parser identifie correctement un littéral → unknownGraph non capturé → passe
    expect(err).toBeFalsy();
});

test("AST – GRAPH dans un littéral string avec graph non autorisé ne bloque pas", async () => {
    const { err } = await filter(`SELECT ?s ?p ?o
FROM <${rwGraph}>
WHERE {
  GRAPH <${rwGraph}> {
    ?s ?p "voir GRAPH <${unknownGraph}> pour détails" .
  }
}`);
    // Seul <rwGraph> est un vrai GRAPH pattern → unknownGraph dans le littéral ignoré
    expect(err).toBeFalsy();
});

// ─── PREFIX non déclaré : message d'erreur explicite ─────────────────────────

test("PREFIX-ERR – SELECT avec prefix rdf non déclaré renvoie un message explicite", async () => {
    const { err } = await filter(`SELECT ?s ?label
FROM <${rwGraph}>
WHERE {
  ?s rdf:type ?type .
}`);
    expect(err).toMatch(/prefix.*rdf.*not declared/i);
});

test("PREFIX-ERR – SELECT avec prefix rdfs non déclaré renvoie un message explicite", async () => {
    const { err } = await filter(`SELECT ?s ?label
FROM <${rwGraph}>
WHERE {
  GRAPH <${roGraph}> { ?s rdfs:label ?label . }
}`);
    expect(err).toMatch(/prefix.*rdfs.*not declared/i);
});

test("PREFIX-ERR – SELECT avec prefix déclaré ne renvoie pas d'erreur de prefix", async () => {
    const { err } = await filter(`PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
SELECT ?s ?label
FROM <${rwGraph}>
WHERE {
  GRAPH <${rwGraph}> { ?s rdf:type ?type . }
}`);
    expect(err).toBeFalsy();
});

// ─── BYPASS via triples nus (bare BGP) sans FROM ──────────────────────────────
// Sans FROM, les triples non encadrés par GRAPH interrogent le default graph
// (union de tous les named graphs sur Virtuoso) → bypass ACL potentiel.
// Le filtre doit bloquer ces requêtes même si un GRAPH autorisé est présent.

test("BARE – SELECT sans FROM : GRAPH autorisé + triple nu dans WHERE est bloqué", async () => {
    const { err } = await filter(`SELECT ?s ?p ?o
WHERE {
  GRAPH <${rwGraph}> { ?s a ?type . }
  ?s ?p ?o .
}`);
    expect(err).toMatch(/bare triple/i);
});

test("BARE – SELECT sans FROM : GRAPH autorisé + triple nu dans sous-SELECT est bloqué (requête utilisateur)", async () => {
    const { err } = await filter(`${PFX}SELECT ?s ?label
WHERE {
  GRAPH <${rwGraph}> {
    ?s rdf:type ?type .
  }
  {
    SELECT ?type ?label
    WHERE {
      ?type rdfs:label ?label .
    }
  }
}`);
    expect(err).toMatch(/bare triple/i);
});

test("BARE – SELECT sans FROM : GRAPH autorisé + OPTIONAL avec triple nu est bloqué", async () => {
    const { err } = await filter(`SELECT ?s ?label
WHERE {
  GRAPH <${rwGraph}> { ?s a ?type . }
  OPTIONAL { ?s ?p ?label . }
}`);
    expect(err).toMatch(/bare triple/i);
});

test("BARE – SELECT sans FROM : tous les triples dans GRAPH (y compris sous-SELECT) passe", async () => {
    const { err } = await filter(`${PFX}SELECT ?s ?label
WHERE {
  GRAPH <${rwGraph}> { ?s rdf:type ?type . }
  {
    SELECT ?type ?label
    WHERE {
      GRAPH <${roGraph}> { ?type rdfs:label ?label . }
    }
  }
}`);
    expect(err).toBeFalsy();
});

test("BARE – SELECT avec FROM : les triples nus sont acceptés (scoppés par FROM)", async () => {
    const { err } = await filter(`SELECT ?s ?p ?o
FROM <${rwGraph}>
WHERE {
  GRAPH <${roGraph}> { ?s a ?type . }
  ?s ?p ?o .
}`);
    expect(err).toBeFalsy();
});

test("BARE – SELECT avec FROM : sous-SELECT avec triples nus est accepté", async () => {
    const { err } = await filter(`${PFX}SELECT ?s ?label
FROM <${rwGraph}>
WHERE {
  GRAPH <${roGraph}> { ?s rdf:type ?type . }
  {
    SELECT ?type ?label
    WHERE {
      ?type rdfs:label ?label .
    }
  }
}`);
    expect(err).toBeFalsy();
});

// PREFIX variants

test("PREFIX – BARE SELECT sans FROM : GRAPH autorisé + triple nu dans sous-SELECT est bloqué", async () => {
    const { err } = await filter(
        PFX +
            `SELECT ?s ?label
WHERE {
  GRAPH <${rwGraph}> { ?s a owl:Class . }
  {
    SELECT ?type ?label
    WHERE {
      ?type rdfs:label ?label .
    }
  }
}`,
    );
    expect(err).toMatch(/bare triple/i);
});

test("PREFIX – BARE SELECT sans FROM : tous triples dans GRAPH passe", async () => {
    const { err } = await filter(
        PFX +
            `SELECT ?s ?label
WHERE {
  GRAPH <${rwGraph}> { ?s a owl:Class . }
  {
    SELECT ?type ?label
    WHERE {
      GRAPH <${roGraph}> { ?type rdfs:label ?label . }
    }
  }
}`,
    );
    expect(err).toBeFalsy();
});
