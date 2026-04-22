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
    const { err } = await filter(`INSERT DATA { <http://unknown/s1> a <http://owl/Class> . }`, adminUser);
    expect(err).toBeNull();
});

// ─── SELECT → checkSelectQuery ─────────────────────────────────────────────────

test("SELECT avec FROM graph autorisé passe", async () => {
    const { err } = await filter(
        `SELECT ?s FROM <http://fghghf/> WHERE { ?s ?p ?o }`
    );
    expect(err).toBeFalsy();
});

test("SELECT sans FROM graph est bloqué", async () => {
    const { err } = await filter(`SELECT ?s WHERE { ?s ?p ?o }`);
    expect(err).toMatch(/missing from/i);
});

test("SELECT avec FROM graph non autorisé est bloqué", async () => {
    const { err } = await filter(`SELECT ?s FROM <http://unknown/> WHERE { ?s ?p ?o }`);
    expect(err).toMatch(/not allowed/i);
});

// ─── INSERT/DELETE → checkQueryByRegex ────────────────────────────────────────

test("T01 – INSERT DATA sur graph autorisé en écriture", async () => {
    const { err } = await filter(`INSERT DATA {
  GRAPH <http://fghghf/> {
    <http://fghghf/s1> a <http://www.w3.org/2002/07/owl#Class> .
  }
}`);
    expect(err).toBeNull();
});

test("T02 – DELETE DATA sur graph autorisé en écriture", async () => {
    const { err } = await filter(`DELETE DATA {
  GRAPH <http://fghghf/> {
    <http://fghghf/s1> a <http://www.w3.org/2002/07/owl#Class> .
  }
}`);
    expect(err).toBeNull();
});

test("T03 – DELETE/INSERT avec WITH sur graph autorisé", async () => {
    const { err } = await filter(`WITH <http://fghghf/>
DELETE { ?s ?p ?o }
INSERT { ?s ?p "newValue" }
WHERE  { ?s ?p ?o . FILTER(?s = <http://fghghf/s1>) }`);
    expect(err).toBeNull();
});

test("T04 – CLEAR sur graph autorisé en écriture", async () => {
    const { err } = await filter(`CLEAR GRAPH <http://fghghf/>`);
    expect(err).toBeNull();
});

test("T05 – COPY entre deux graphs autorisés", async () => {
    const { err } = await filter(`COPY <http://fghghf/> TO <http://fghghf/>`);
    expect(err).toBeNull();
});

test("T06 – INSERT DATA sur plusieurs graphs tous autorisés", async () => {
    const { err } = await filter(`INSERT DATA {
  GRAPH <http://fghghf/> { <http://fghghf/s1> a <http://owl/Class> . }
  GRAPH <http://fghghf/> { <http://fghghf/s2> a <http://owl/Class> . }
}`);
    expect(err).toBeNull();
});

test("T07 – Requête sans opération reconnue", async () => {
    const { err } = await filter(`DESCRIBE <http://fghghf/s1>`);
    expect(err).toMatch(/no operation/i);
});

test("T08 – INSERT sans déclaration de graph explicite", async () => {
    const { err } = await filter(`INSERT DATA { <http://fghghf/s1> a <http://owl/Class> . }`);
    expect(err).toMatch(/needs explicit graph declaration/i);
});

test("T09 – INSERT sur graph absent du userSourcesMap", async () => {
    const { err } = await filter(`INSERT DATA {
  GRAPH <http://unknown/> { <http://unknown/s1> a <http://owl/Class> . }
}`);
    expect(err).toMatch(/not allowed/i);
});

test("T10 – INSERT sur graph en lecture seule", async () => {
    const { err } = await filter(`INSERT DATA {
  GRAPH <http://testClasses/> { <http://testClasses/s1> a <http://owl/Class> . }
}`);
    expect(err).toMatch(/cannot execute INSERT on graph http:\/\/testClasses\//);
});

test("T11 – INSERT sur plusieurs graphs dont un en lecture seule", async () => {
    const { err } = await filter(`INSERT DATA {
  GRAPH <http://fghghf/>      { <http://fghghf/s1> a <http://owl/Class> . }
  GRAPH <http://testClasses/> { <http://testClasses/s1> a <http://owl/Class> . }
}`);
    expect(err).toMatch(/http:\/\/testClasses\//);
    expect(err).not.toMatch(/http:\/\/fghghf\//);
});

test("T12 – COPY depuis un graph lecture seule vers un graph autorisé", async () => {
    const { err } = await filter(`COPY <http://testClasses/> TO <http://fghghf/>`);
    expect(err).toMatch(/cannot execute COPY on graph http:\/\/testClasses\//);
});

test("T13 – DROP DEFAULT sans graph explicite", async () => {
    const { err } = await filter(`DROP DEFAULT`);
    expect(err).toMatch(/needs explicit graph declaration/i);
});

test("T14 – Casse mixte (flag /i)", async () => {
    const { err } = await filter(`insert data {
  graph <http://fghghf/> { <http://fghghf/s1> a <http://owl/Class> . }
}`);
    expect(err).toBeNull();
});

test("T15 – URI dans un littéral string (bug connu : faux positif)", async () => {
    const { err } = await filter(`INSERT DATA {
  GRAPH <http://fghghf/> {
    <http://fghghf/s1> <http://label> "DELETE FROM graph <http://unknown/>" .
  }
}`);
    // Bug connu : la regex capture http://unknown/ dans le littéral et lève une fausse erreur
    expect(err).toMatch(/not allowed/i);
});

// ─── CAS COMMENTAIRES ─────────────────────────────────────────────────────────

test("T16 – Commentaire contenant SELECT ne doit pas fausser le routing", async () => {
    const { err } = await filter(`# SELECT ?s FROM <http://fghghf/>
DELETE DATA {
  GRAPH <http://fghghf/> { <http://fghghf/s1> a <http://owl/Class> . }
}`);
    expect(err).toBeNull();
});

test("T17 – Commentaire contenant un graph non autorisé ne doit pas bloquer", async () => {
    const { err } = await filter(`# INSERT DATA { GRAPH <http://unknown/> { <s> <p> <o> . } }
INSERT DATA {
  GRAPH <http://fghghf/> { <http://fghghf/s1> a <http://owl/Class> . }
}`);
    expect(err).toBeNull();
});

test("T18 – Commentaire contenant INSERT ne doit pas masquer un DELETE autorisé", async () => {
    const { err } = await filter(`# INSERT DATA { GRAPH <http://testClasses/> { <s> <p> <o> . } }
DELETE DATA {
  GRAPH <http://fghghf/> { <http://fghghf/s1> a <http://owl/Class> . }
}`);
    expect(err).toBeNull();
});

// ─── CAS MULTIPLE OPERATIONS ──────────────────────────────────────────────────

test("T19 – Deux opérations autorisées séparées par ;", async () => {
    const { err } = await filter(
        `INSERT DATA { GRAPH <http://fghghf/> { <http://fghghf/s1> a <http://owl/Class> . } } ;\nDELETE DATA { GRAPH <http://fghghf/> { <http://fghghf/s2> a <http://owl/Class> . } }`
    );
    expect(err).toBeNull();
});

test("T20 – Deux opérations dont une non autorisée séparées par ;", async () => {
    const { err } = await filter(
        `INSERT DATA { GRAPH <http://fghghf/> { <http://fghghf/s1> a <http://owl/Class> . } } ;\nDELETE DATA { GRAPH <http://testClasses/> { <http://testClasses/s1> a <http://owl/Class> . } }`
    );
    expect(err).toMatch(/http:\/\/testClasses\//);
});

test("T21 – Deux opérations dont une sans graph explicite séparées par ;", async () => {
    const { err } = await filter(
        `INSERT DATA { GRAPH <http://fghghf/> { <http://fghghf/s1> a <http://owl/Class> . } } ;\nDELETE DATA { <http://fghghf/s2> a <http://owl/Class> . }`
    );
    expect(err).toMatch(/needs explicit graph declaration/i);
});

// ─── SELECT avec WHERE détaillé ───────────────────────────────────────────────

test("SELECT avec filtres et sous-requête passe", async () => {
    const { err } = await filter(`SELECT ?s ?label
FROM <http://fghghf/>
WHERE {
  ?s a <http://www.w3.org/2002/07/owl#Class> .
  OPTIONAL { ?s <http://www.w3.org/2000/01/rdf-schema#label> ?label . FILTER(LANG(?label) = "fr") }
  FILTER NOT EXISTS { ?s <http://www.w3.org/2002/07/owl#deprecated> true }
}`);
    expect(err).toBeFalsy();
});

test("SELECT avec FROM NAMED autorisé passe", async () => {
    const { err } = await filter(`SELECT ?s
FROM NAMED <http://fghghf/>
WHERE { GRAPH <http://fghghf/> { ?s ?p ?o } }`);
    expect(err).toBeFalsy();
});

test("SELECT avec FROM autorisé et FROM NAMED non autorisé est bloqué", async () => {
    const { err } = await filter(`SELECT ?s
FROM <http://fghghf/>
FROM NAMED <http://unknown/>
WHERE { ?s ?p ?o }`);
    expect(err).toMatch(/not allowed/i);
});

// ─── INSERT avec WHERE détaillé ───────────────────────────────────────────────

test("INSERT avec WHERE et FILTER passe sur graph autorisé", async () => {
    const { err } = await filter(`WITH <http://fghghf/>
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
    const { err } = await filter(`WITH <http://testClasses/>
INSERT { ?s <http://rdfs/label> "x" . }
WHERE  { ?s a <http://owl/Class> . }`);
    expect(err).toMatch(/cannot execute INSERT on graph http:\/\/testClasses\//);
});

test("INSERT ciblant deux graphs dont source en lecture seule est bloqué", async () => {
    const { err } = await filter(`INSERT {
  GRAPH <http://fghghf/> { ?s <http://rdfs/label> ?label . }
}
WHERE {
  GRAPH <http://testClasses/> { ?s <http://rdfs/label> ?label . }
}`);
    // testClasses apparaît dans WHERE GRAPH mais aussi capturé par la regex — faux positif connu
    expect(err).toMatch(/http:\/\/testClasses\//);
});

// ─── DELETE avec WHERE détaillé ───────────────────────────────────────────────

test("DELETE avec WHERE et OPTIONAL passe sur graph autorisé", async () => {
    const { err } = await filter(`WITH <http://fghghf/>
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
  GRAPH <http://fghghf/> {
    <http://fghghf/s1> ?p ?o .
  }
}`);
    expect(err).toBeNull();
});

test("DELETE WHERE sur graph lecture seule est bloqué", async () => {
    const { err } = await filter(`WITH <http://testClasses/>
DELETE { ?s ?p ?o }
WHERE  { ?s a <http://owl/Class> . }`);
    expect(err).toMatch(/cannot execute DELETE on graph http:\/\/testClasses\//);
});

// ─── COPY / MOVE / ADD ────────────────────────────────────────────────────────

test("COPY de graph autorisé vers graph autorisé passe", async () => {
    const { err } = await filter(`COPY <http://fghghf/> TO <http://fghghf/>`);
    expect(err).toBeNull();
});

test("MOVE de graph autorisé vers graph autorisé passe", async () => {
    const { err } = await filter(`MOVE <http://fghghf/> TO <http://fghghf/>`);
    expect(err).toBeNull();
});

test("ADD de graph autorisé vers graph autorisé passe", async () => {
    const { err } = await filter(`ADD <http://fghghf/> TO <http://fghghf/>`);
    expect(err).toBeNull();
});

test("COPY depuis graph lecture seule est bloqué", async () => {
    const { err } = await filter(`COPY <http://testClasses/> TO <http://fghghf/>`);
    expect(err).toMatch(/cannot execute COPY on graph http:\/\/testClasses\//);
});

test("MOVE depuis graph lecture seule est bloqué", async () => {
    const { err } = await filter(`MOVE <http://testClasses/> TO <http://fghghf/>`);
    expect(err).toMatch(/cannot execute MOVE on graph http:\/\/testClasses\//);
});

test("ADD depuis graph lecture seule est bloqué", async () => {
    const { err } = await filter(`ADD <http://testClasses/> TO <http://fghghf/>`);
    expect(err).toMatch(/cannot execute ADD on graph http:\/\/testClasses\//);
});

test("COPY vers graph non autorisé est bloqué", async () => {
    const { err } = await filter(`COPY <http://fghghf/> TO <http://unknown/>`);
    expect(err).toMatch(/not allowed/i);
});

test("COPY sans URI (pas de <>) ne matche pas la regex transfert — bloqué", async () => {
    const { err } = await filter(`COPY DEFAULT TO NAMED <http://fghghf/>`);
    // transferRegex ne matche pas (pas de <src>), graphRegex capture http://fghghf/ via NAMED... ou non
    // dans tous les cas cette syntaxe non standard est bloquée
    expect(err).toBeTruthy();
});

// ─── SELECT avec plusieurs FROM ───────────────────────────────────────────────

test("SELECT avec deux FROM autorisés passe", async () => {
    const { err } = await filter(`SELECT ?s ?p ?o
FROM <http://fghghf/>
FROM <http://testClasses/>
WHERE { ?s ?p ?o }`);
    expect(err).toBeFalsy();
});

test("SELECT avec FROM autorisé et FROM non autorisé est bloqué", async () => {
    const { err } = await filter(`SELECT ?s
FROM <http://fghghf/>
FROM <http://unknown/>
WHERE { ?s ?p ?o }`);
    expect(err).toMatch(/not allowed/i);
});

test("SELECT avec deux FROM NAMED autorisés passe", async () => {
    const { err } = await filter(`SELECT ?s
FROM NAMED <http://fghghf/>
FROM NAMED <http://testClasses/>
WHERE { GRAPH ?g { ?s ?p ?o } }`);
    expect(err).toBeFalsy();
});

test("SELECT avec FROM + FROM NAMED tous autorisés passe", async () => {
    const { err } = await filter(`SELECT ?s
FROM <http://fghghf/>
FROM NAMED <http://testClasses/>
WHERE { ?s ?p ?o }`);
    expect(err).toBeFalsy();
});

test("SELECT avec FROM + FROM NAMED dont un non autorisé est bloqué", async () => {
    const { err } = await filter(`SELECT ?s
FROM <http://fghghf/>
FROM NAMED <http://unknown/>
WHERE { ?s ?p ?o }`);
    expect(err).toMatch(/not allowed/i);
});

// ─── INSERT avec plusieurs GRAPH ──────────────────────────────────────────────

test("INSERT DATA dans deux graphs autorisés passe", async () => {
    const { err } = await filter(`INSERT DATA {
  GRAPH <http://fghghf/> { <http://fghghf/s1> a <http://owl/Class> . }
  GRAPH <http://fghghf/> { <http://fghghf/s2> <http://rdfs/label> "test" . }
}`);
    expect(err).toBeNull();
});

test("INSERT DATA dans graph autorisé et graph lecture seule est bloqué", async () => {
    const { err } = await filter(`INSERT DATA {
  GRAPH <http://fghghf/>      { <http://fghghf/s1> a <http://owl/Class> . }
  GRAPH <http://testClasses/> { <http://testClasses/s1> a <http://owl/Class> . }
}`);
    expect(err).toMatch(/http:\/\/testClasses\//);
    expect(err).not.toMatch(/http:\/\/fghghf\//);
});

test("INSERT DATA dans graph autorisé et graph inconnu est bloqué sur les deux", async () => {
    const { err } = await filter(`INSERT DATA {
  GRAPH <http://testClasses/> { <http://testClasses/s1> a <http://owl/Class> . }
  GRAPH <http://unknown/>     { <http://unknown/s1> a <http://owl/Class> . }
}`);
    expect(err).toMatch(/http:\/\/testClasses\//);
    expect(err).toMatch(/http:\/\/unknown\//);
});

test("INSERT avec WHERE dans plusieurs graphs autorisés passe", async () => {
    const { err } = await filter(`INSERT {
  GRAPH <http://fghghf/> { ?s <http://rdfs/label> ?label . }
}
WHERE {
  GRAPH <http://fghghf/> { ?s a <http://owl/Class> . OPTIONAL { ?s <http://rdfs/label> ?label } }
  FILTER(!BOUND(?label))
}`);
    expect(err).toBeNull();
});

// ─── DELETE avec plusieurs GRAPH ──────────────────────────────────────────────

test("DELETE DATA dans deux graphs autorisés passe", async () => {
    const { err } = await filter(`DELETE DATA {
  GRAPH <http://fghghf/> { <http://fghghf/s1> a <http://owl/Class> . }
  GRAPH <http://fghghf/> { <http://fghghf/s2> <http://rdfs/label> "test" . }
}`);
    expect(err).toBeNull();
});

test("DELETE DATA dans graph autorisé et graph lecture seule est bloqué", async () => {
    const { err } = await filter(`DELETE DATA {
  GRAPH <http://fghghf/>      { <http://fghghf/s1> a <http://owl/Class> . }
  GRAPH <http://testClasses/> { <http://testClasses/s1> a <http://owl/Class> . }
}`);
    expect(err).toMatch(/http:\/\/testClasses\//);
    expect(err).not.toMatch(/http:\/\/fghghf\//);
});

test("DELETE WHERE dans plusieurs graphs autorisés passe", async () => {
    const { err } = await filter(`DELETE {
  GRAPH <http://fghghf/> { ?s <http://rdfs/label> ?oldLabel . }
}
WHERE {
  GRAPH <http://fghghf/> { ?s a <http://owl/Class> ; <http://rdfs/label> ?oldLabel . }
  FILTER(STR(?oldLabel) = "obsolete")
}`);
    expect(err).toBeNull();
});

// ─── COPY / MOVE / ADD multiples via ; ────────────────────────────────────────

test("Deux COPY autorisés séparés par ; passent", async () => {
    const { err } = await filter(
        `COPY <http://fghghf/> TO <http://fghghf/> ;\nCOPY <http://fghghf/> TO <http://fghghf/>`
    );
    expect(err).toBeNull();
});

test("COPY autorisé puis MOVE non autorisé séparés par ; est bloqué", async () => {
    const { err } = await filter(
        `COPY <http://fghghf/> TO <http://fghghf/> ;\nMOVE <http://testClasses/> TO <http://fghghf/>`
    );
    expect(err).toMatch(/cannot execute MOVE on graph http:\/\/testClasses\//);
});

test("ADD autorisé puis COPY vers graph inconnu séparés par ; est bloqué", async () => {
    const { err } = await filter(
        `ADD <http://fghghf/> TO <http://fghghf/> ;\nCOPY <http://fghghf/> TO <http://unknown/>`
    );
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
    const { err } = await filter(PFX + `INSERT DATA { <http://unknown/s1> a owl:Class . }`, adminUser);
    expect(err).toBeNull();
});

// ─── SELECT avec PREFIX ───────────────────────────────────────────────────────

test("PREFIX – SELECT avec FROM graph autorisé passe", async () => {
    const { err } = await filter(PFX + `SELECT ?s FROM <http://fghghf/> WHERE { ?s a owl:Class }`);
    expect(err).toBeFalsy();
});

test("PREFIX – SELECT sans FROM graph est bloqué", async () => {
    const { err } = await filter(PFX + `SELECT ?s WHERE { ?s ?p ?o }`);
    expect(err).toMatch(/missing from/i);
});

test("PREFIX – SELECT avec FROM graph non autorisé est bloqué", async () => {
    const { err } = await filter(PFX + `SELECT ?s FROM <http://unknown/> WHERE { ?s ?p ?o }`);
    expect(err).toMatch(/not allowed/i);
});

// ─── INSERT/DELETE avec PREFIX ────────────────────────────────────────────────

test("PREFIX – T01 INSERT DATA sur graph autorisé en écriture", async () => {
    const { err } = await filter(PFX + `INSERT DATA {
  GRAPH <http://fghghf/> {
    <http://fghghf/s1> a owl:Class .
  }
}`);
    expect(err).toBeNull();
});

test("PREFIX – T02 DELETE DATA sur graph autorisé en écriture", async () => {
    const { err } = await filter(PFX + `DELETE DATA {
  GRAPH <http://fghghf/> {
    <http://fghghf/s1> a owl:Class .
  }
}`);
    expect(err).toBeNull();
});

test("PREFIX – T03 DELETE/INSERT avec WITH sur graph autorisé", async () => {
    const { err } = await filter(PFX + `WITH <http://fghghf/>
DELETE { ?s ?p ?o }
INSERT { ?s ?p "newValue" }
WHERE  { ?s ?p ?o . FILTER(?s = <http://fghghf/s1>) }`);
    expect(err).toBeNull();
});

test("PREFIX – T04 CLEAR sur graph autorisé en écriture", async () => {
    const { err } = await filter(PFX + `CLEAR GRAPH <http://fghghf/>`);
    expect(err).toBeNull();
});

test("PREFIX – T05 COPY entre deux graphs autorisés", async () => {
    const { err } = await filter(PFX + `COPY <http://fghghf/> TO <http://fghghf/>`);
    expect(err).toBeNull();
});

test("PREFIX – T06 INSERT DATA sur plusieurs graphs tous autorisés", async () => {
    const { err } = await filter(PFX + `INSERT DATA {
  GRAPH <http://fghghf/> { <http://fghghf/s1> a owl:Class . }
  GRAPH <http://fghghf/> { <http://fghghf/s2> a owl:Class . }
}`);
    expect(err).toBeNull();
});

test("PREFIX – T07 Requête sans opération reconnue", async () => {
    const { err } = await filter(PFX + `DESCRIBE <http://fghghf/s1>`);
    expect(err).toMatch(/no operation/i);
});

test("PREFIX – T08 INSERT sans déclaration de graph explicite", async () => {
    const { err } = await filter(PFX + `INSERT DATA { <http://fghghf/s1> a owl:Class . }`);
    expect(err).toMatch(/needs explicit graph declaration/i);
});

test("PREFIX – T09 INSERT sur graph absent du userSourcesMap", async () => {
    const { err } = await filter(PFX + `INSERT DATA {
  GRAPH <http://unknown/> { <http://unknown/s1> a owl:Class . }
}`);
    expect(err).toMatch(/not allowed/i);
});

test("PREFIX – T10 INSERT sur graph en lecture seule", async () => {
    const { err } = await filter(PFX + `INSERT DATA {
  GRAPH <http://testClasses/> { <http://testClasses/s1> a owl:Class . }
}`);
    expect(err).toMatch(/cannot execute INSERT on graph http:\/\/testClasses\//);
});

test("PREFIX – T11 INSERT sur plusieurs graphs dont un en lecture seule", async () => {
    const { err } = await filter(PFX + `INSERT DATA {
  GRAPH <http://fghghf/>      { <http://fghghf/s1> a owl:Class . }
  GRAPH <http://testClasses/> { <http://testClasses/s1> a owl:Class . }
}`);
    expect(err).toMatch(/http:\/\/testClasses\//);
    expect(err).not.toMatch(/http:\/\/fghghf\//);
});

test("PREFIX – T12 COPY depuis un graph lecture seule vers un graph autorisé", async () => {
    const { err } = await filter(PFX + `COPY <http://testClasses/> TO <http://fghghf/>`);
    expect(err).toMatch(/cannot execute COPY on graph http:\/\/testClasses\//);
});

test("PREFIX – T13 DROP DEFAULT sans graph explicite", async () => {
    const { err } = await filter(PFX + `DROP DEFAULT`);
    expect(err).toMatch(/needs explicit graph declaration/i);
});

test("PREFIX – T14 Casse mixte (flag /i)", async () => {
    const { err } = await filter(PFX + `insert data {
  graph <http://fghghf/> { <http://fghghf/s1> a owl:Class . }
}`);
    expect(err).toBeNull();
});

test("PREFIX – T15 URI dans un littéral string (bug connu : faux positif)", async () => {
    const { err } = await filter(PFX + `INSERT DATA {
  GRAPH <http://fghghf/> {
    <http://fghghf/s1> <http://label> "DELETE FROM graph <http://unknown/>" .
  }
}`);
    expect(err).toMatch(/not allowed/i);
});

// ─── CAS COMMENTAIRES AVEC PREFIX ─────────────────────────────────────────────

test("PREFIX – T16 Commentaire contenant SELECT ne doit pas fausser le routing", async () => {
    const { err } = await filter(PFX + `# SELECT ?s FROM <http://fghghf/>
DELETE DATA {
  GRAPH <http://fghghf/> { <http://fghghf/s1> a owl:Class . }
}`);
    expect(err).toBeNull();
});

test("PREFIX – T17 Commentaire contenant un graph non autorisé ne doit pas bloquer", async () => {
    const { err } = await filter(PFX + `# INSERT DATA { GRAPH <http://unknown/> { <s> <p> <o> . } }
INSERT DATA {
  GRAPH <http://fghghf/> { <http://fghghf/s1> a owl:Class . }
}`);
    expect(err).toBeNull();
});

test("PREFIX – T18 Commentaire contenant INSERT ne doit pas masquer un DELETE autorisé", async () => {
    const { err } = await filter(PFX + `# INSERT DATA { GRAPH <http://testClasses/> { <s> <p> <o> . } }
DELETE DATA {
  GRAPH <http://fghghf/> { <http://fghghf/s1> a owl:Class . }
}`);
    expect(err).toBeNull();
});

// ─── CAS MULTIPLE OPERATIONS AVEC PREFIX ──────────────────────────────────────

test("PREFIX – T19 Deux opérations autorisées séparées par ;", async () => {
    const { err } = await filter(
        PFX + `INSERT DATA { GRAPH <http://fghghf/> { <http://fghghf/s1> a owl:Class . } } ;\nDELETE DATA { GRAPH <http://fghghf/> { <http://fghghf/s2> a owl:Class . } }`
    );
    expect(err).toBeNull();
});

test("PREFIX – T20 Deux opérations dont une non autorisée séparées par ;", async () => {
    const { err } = await filter(
        PFX + `INSERT DATA { GRAPH <http://fghghf/> { <http://fghghf/s1> a owl:Class . } } ;\nDELETE DATA { GRAPH <http://testClasses/> { <http://testClasses/s1> a owl:Class . } }`
    );
    expect(err).toMatch(/http:\/\/testClasses\//);
});

test("PREFIX – T21 Deux opérations dont une sans graph explicite séparées par ;", async () => {
    const { err } = await filter(
        PFX + `INSERT DATA { GRAPH <http://fghghf/> { <http://fghghf/s1> a owl:Class . } } ;\nDELETE DATA { <http://fghghf/s2> a owl:Class . }`
    );
    expect(err).toMatch(/needs explicit graph declaration/i);
});

// ─── SELECT avec WHERE détaillé + PREFIX ─────────────────────────────────────

test("PREFIX – SELECT avec filtres et sous-requête passe", async () => {
    const { err } = await filter(PFX + `SELECT ?s ?label
FROM <http://fghghf/>
WHERE {
  ?s a owl:Class .
  OPTIONAL { ?s rdfs:label ?label . FILTER(LANG(?label) = "fr") }
  FILTER NOT EXISTS { ?s owl:deprecated true }
}`);
    expect(err).toBeFalsy();
});

test("PREFIX – SELECT avec FROM NAMED autorisé passe", async () => {
    const { err } = await filter(PFX + `SELECT ?s
FROM NAMED <http://fghghf/>
WHERE { GRAPH <http://fghghf/> { ?s ?p ?o } }`);
    expect(err).toBeFalsy();
});

test("PREFIX – SELECT avec FROM autorisé et FROM NAMED non autorisé est bloqué", async () => {
    const { err } = await filter(PFX + `SELECT ?s
FROM <http://fghghf/>
FROM NAMED <http://unknown/>
WHERE { ?s ?p ?o }`);
    expect(err).toMatch(/not allowed/i);
});

// ─── INSERT avec WHERE détaillé + PREFIX ─────────────────────────────────────

test("PREFIX – INSERT avec WHERE et FILTER passe sur graph autorisé", async () => {
    const { err } = await filter(PFX + `WITH <http://fghghf/>
INSERT {
  ?s rdfs:label "updated label" .
}
WHERE {
  ?s a owl:Class .
  FILTER NOT EXISTS { ?s rdfs:label ?label }
}`);
    expect(err).toBeNull();
});

test("PREFIX – INSERT avec WHERE sur graph lecture seule est bloqué", async () => {
    const { err } = await filter(PFX + `WITH <http://testClasses/>
INSERT { ?s rdfs:label "x" . }
WHERE  { ?s a owl:Class . }`);
    expect(err).toMatch(/cannot execute INSERT on graph http:\/\/testClasses\//);
});

test("PREFIX – INSERT ciblant deux graphs dont source en lecture seule est bloqué", async () => {
    const { err } = await filter(PFX + `INSERT {
  GRAPH <http://fghghf/> { ?s rdfs:label ?label . }
}
WHERE {
  GRAPH <http://testClasses/> { ?s rdfs:label ?label . }
}`);
    expect(err).toMatch(/http:\/\/testClasses\//);
});

// ─── DELETE avec WHERE détaillé + PREFIX ─────────────────────────────────────

test("PREFIX – DELETE avec WHERE et OPTIONAL passe sur graph autorisé", async () => {
    const { err } = await filter(PFX + `WITH <http://fghghf/>
DELETE {
  ?s rdfs:label ?oldLabel .
}
WHERE {
  ?s a owl:Class .
  OPTIONAL { ?s rdfs:label ?oldLabel }
  FILTER(STR(?oldLabel) = "old value")
}`);
    expect(err).toBeNull();
});

test("PREFIX – DELETE WHERE (forme courte) sur graph autorisé passe", async () => {
    const { err } = await filter(PFX + `DELETE WHERE {
  GRAPH <http://fghghf/> {
    <http://fghghf/s1> ?p ?o .
  }
}`);
    expect(err).toBeNull();
});

test("PREFIX – DELETE WHERE sur graph lecture seule est bloqué", async () => {
    const { err } = await filter(PFX + `WITH <http://testClasses/>
DELETE { ?s ?p ?o }
WHERE  { ?s a owl:Class . }`);
    expect(err).toMatch(/cannot execute DELETE on graph http:\/\/testClasses\//);
});

// ─── COPY / MOVE / ADD avec PREFIX ────────────────────────────────────────────

test("PREFIX – COPY de graph autorisé vers graph autorisé passe", async () => {
    const { err } = await filter(PFX + `COPY <http://fghghf/> TO <http://fghghf/>`);
    expect(err).toBeNull();
});

test("PREFIX – MOVE de graph autorisé vers graph autorisé passe", async () => {
    const { err } = await filter(PFX + `MOVE <http://fghghf/> TO <http://fghghf/>`);
    expect(err).toBeNull();
});

test("PREFIX – ADD de graph autorisé vers graph autorisé passe", async () => {
    const { err } = await filter(PFX + `ADD <http://fghghf/> TO <http://fghghf/>`);
    expect(err).toBeNull();
});

test("PREFIX – COPY depuis graph lecture seule est bloqué", async () => {
    const { err } = await filter(PFX + `COPY <http://testClasses/> TO <http://fghghf/>`);
    expect(err).toMatch(/cannot execute COPY on graph http:\/\/testClasses\//);
});

test("PREFIX – MOVE depuis graph lecture seule est bloqué", async () => {
    const { err } = await filter(PFX + `MOVE <http://testClasses/> TO <http://fghghf/>`);
    expect(err).toMatch(/cannot execute MOVE on graph http:\/\/testClasses\//);
});

test("PREFIX – ADD depuis graph lecture seule est bloqué", async () => {
    const { err } = await filter(PFX + `ADD <http://testClasses/> TO <http://fghghf/>`);
    expect(err).toMatch(/cannot execute ADD on graph http:\/\/testClasses\//);
});

test("PREFIX – COPY vers graph non autorisé est bloqué", async () => {
    const { err } = await filter(PFX + `COPY <http://fghghf/> TO <http://unknown/>`);
    expect(err).toMatch(/not allowed/i);
});

test("PREFIX – COPY sans URI (pas de <>) ne matche pas la regex transfert — bloqué", async () => {
    const { err } = await filter(PFX + `COPY DEFAULT TO NAMED <http://fghghf/>`);
    expect(err).toBeTruthy();
});

// ─── SELECT avec plusieurs FROM + PREFIX ─────────────────────────────────────

test("PREFIX – SELECT avec deux FROM autorisés passe", async () => {
    const { err } = await filter(PFX + `SELECT ?s ?p ?o
FROM <http://fghghf/>
FROM <http://testClasses/>
WHERE { ?s ?p ?o }`);
    expect(err).toBeFalsy();
});

test("PREFIX – SELECT avec FROM autorisé et FROM non autorisé est bloqué", async () => {
    const { err } = await filter(PFX + `SELECT ?s
FROM <http://fghghf/>
FROM <http://unknown/>
WHERE { ?s ?p ?o }`);
    expect(err).toMatch(/not allowed/i);
});

test("PREFIX – SELECT avec deux FROM NAMED autorisés passe", async () => {
    const { err } = await filter(PFX + `SELECT ?s
FROM NAMED <http://fghghf/>
FROM NAMED <http://testClasses/>
WHERE { GRAPH ?g { ?s ?p ?o } }`);
    expect(err).toBeFalsy();
});

test("PREFIX – SELECT avec FROM + FROM NAMED tous autorisés passe", async () => {
    const { err } = await filter(PFX + `SELECT ?s
FROM <http://fghghf/>
FROM NAMED <http://testClasses/>
WHERE { ?s ?p ?o }`);
    expect(err).toBeFalsy();
});

test("PREFIX – SELECT avec FROM + FROM NAMED dont un non autorisé est bloqué", async () => {
    const { err } = await filter(PFX + `SELECT ?s
FROM <http://fghghf/>
FROM NAMED <http://unknown/>
WHERE { ?s ?p ?o }`);
    expect(err).toMatch(/not allowed/i);
});

// ─── INSERT avec plusieurs GRAPH + PREFIX ─────────────────────────────────────

test("PREFIX – INSERT DATA dans deux graphs autorisés passe", async () => {
    const { err } = await filter(PFX + `INSERT DATA {
  GRAPH <http://fghghf/> { <http://fghghf/s1> a owl:Class . }
  GRAPH <http://fghghf/> { <http://fghghf/s2> rdfs:label "test" . }
}`);
    expect(err).toBeNull();
});

test("PREFIX – INSERT DATA dans graph autorisé et graph lecture seule est bloqué", async () => {
    const { err } = await filter(PFX + `INSERT DATA {
  GRAPH <http://fghghf/>      { <http://fghghf/s1> a owl:Class . }
  GRAPH <http://testClasses/> { <http://testClasses/s1> a owl:Class . }
}`);
    expect(err).toMatch(/http:\/\/testClasses\//);
    expect(err).not.toMatch(/http:\/\/fghghf\//);
});

test("PREFIX – INSERT DATA dans graph autorisé et graph inconnu est bloqué sur les deux", async () => {
    const { err } = await filter(PFX + `INSERT DATA {
  GRAPH <http://testClasses/> { <http://testClasses/s1> a owl:Class . }
  GRAPH <http://unknown/>     { <http://unknown/s1> a owl:Class . }
}`);
    expect(err).toMatch(/http:\/\/testClasses\//);
    expect(err).toMatch(/http:\/\/unknown\//);
});

test("PREFIX – INSERT avec WHERE dans plusieurs graphs autorisés passe", async () => {
    const { err } = await filter(PFX + `INSERT {
  GRAPH <http://fghghf/> { ?s rdfs:label ?label . }
}
WHERE {
  GRAPH <http://fghghf/> { ?s a owl:Class . OPTIONAL { ?s rdfs:label ?label } }
  FILTER(!BOUND(?label))
}`);
    expect(err).toBeNull();
});

// ─── DELETE avec plusieurs GRAPH + PREFIX ─────────────────────────────────────

test("PREFIX – DELETE DATA dans deux graphs autorisés passe", async () => {
    const { err } = await filter(PFX + `DELETE DATA {
  GRAPH <http://fghghf/> { <http://fghghf/s1> a owl:Class . }
  GRAPH <http://fghghf/> { <http://fghghf/s2> rdfs:label "test" . }
}`);
    expect(err).toBeNull();
});

test("PREFIX – DELETE DATA dans graph autorisé et graph lecture seule est bloqué", async () => {
    const { err } = await filter(PFX + `DELETE DATA {
  GRAPH <http://fghghf/>      { <http://fghghf/s1> a owl:Class . }
  GRAPH <http://testClasses/> { <http://testClasses/s1> a owl:Class . }
}`);
    expect(err).toMatch(/http:\/\/testClasses\//);
    expect(err).not.toMatch(/http:\/\/fghghf\//);
});

test("PREFIX – DELETE WHERE dans plusieurs graphs autorisés passe", async () => {
    const { err } = await filter(PFX + `DELETE {
  GRAPH <http://fghghf/> { ?s rdfs:label ?oldLabel . }
}
WHERE {
  GRAPH <http://fghghf/> { ?s a owl:Class ; rdfs:label ?oldLabel . }
  FILTER(STR(?oldLabel) = "obsolete")
}`);
    expect(err).toBeNull();
});

// ─── COPY / MOVE / ADD multiples via ; + PREFIX ───────────────────────────────

test("PREFIX – Deux COPY autorisés séparés par ; passent", async () => {
    const { err } = await filter(
        PFX + `COPY <http://fghghf/> TO <http://fghghf/> ;\nCOPY <http://fghghf/> TO <http://fghghf/>`
    );
    expect(err).toBeNull();
});

test("PREFIX – COPY autorisé puis MOVE non autorisé séparés par ; est bloqué", async () => {
    const { err } = await filter(
        PFX + `COPY <http://fghghf/> TO <http://fghghf/> ;\nMOVE <http://testClasses/> TO <http://fghghf/>`
    );
    expect(err).toMatch(/cannot execute MOVE on graph http:\/\/testClasses\//);
});

test("PREFIX – ADD autorisé puis COPY vers graph inconnu séparés par ; est bloqué", async () => {
    const { err } = await filter(
        PFX + `ADD <http://fghghf/> TO <http://fghghf/> ;\nCOPY <http://fghghf/> TO <http://unknown/>`
    );
    expect(err).toMatch(/not allowed/i);
});

// ─── CAS STRESS : URI de PREFIX contenant un mot-clé SPARQL ──────────────────
// Vérifie que les mots-clés SPARQL dans les URIs de PREFIX n'interfèrent pas
// avec les regex de détection (graphRegex, operationMatch, transferRegex).

test("STRESS – PREFIX dont l'URI contient GRAPH ne fausse pas la détection de graph", async () => {
    // graphRegex = /(INTO|GRAPH|WITH)\s+<([^>]+)/ — nécessite GRAPH suivi d'un espace puis <
    // PREFIX myGraph: <http://ns/GRAPH/vocab#> ne matche pas car il n'y a pas \s+< après GRAPH
    const { err } = await filter(
        `PREFIX myGraph: <http://ns/GRAPH/vocab#>\nINSERT DATA {\n  GRAPH <http://fghghf/> { <http://fghghf/s1> a <http://owl/Class> . }\n}`
    );
    expect(err).toBeNull();
});

test("STRESS – PREFIX dont l'URI contient SELECT court-circuite le routing (limitation connue)", async () => {
    // selectRegex = /(SELECT)/gim — matche SELECT n'importe où dans la requête, y compris dans les URI de PREFIX
    // Un PREFIX <http://ns/SELECT/> suffit à router une requête UPDATE vers checkSelectQuery
    // → parser SPARQL reçoit un UPDATE, lève une erreur de parsing → bloqué avec message trompeur
    const { err } = await filter(
        `PREFIX sel: <http://www.example.org/SELECT/vocab#>\nINSERT DATA {\n  GRAPH <http://fghghf/> { <http://fghghf/s1> a <http://owl/Class> . }\n}`
    );
    // Bug connu : routé vers checkSelectQuery au lieu de checkQueryByRegex → erreur de parsing ou "missing from"
    expect(err).toBeTruthy();
});
