import { jest } from "@jest/globals";

jest.unstable_mockModule("../bin/configManager.js", () => ({
    default: {
        config: { sparql_server: { url: "_default" } },
        getUserSources: jest.fn(),
        getUser: jest.fn(),
    },
}));

jest.unstable_mockModule("../bin/user.js", () => ({
    default: { getUser: jest.fn() },
}));

jest.unstable_mockModule("../model/userData.js", () => ({
    userDataModel: { find: jest.fn() },
}));

jest.unstable_mockModule("../model/rdfData.js", () => ({
    RdfDataModel: jest.fn(),
}));

jest.unstable_mockModule("../model/config.js", () => ({
    readMainConfig: jest.fn().mockReturnValue({
        sparql_server: { url: "_default", user: "", password: "" },
    }),
}));

jest.unstable_mockModule("../model/profiles.js", () => ({
    profileModel: { getUserTools: jest.fn().mockResolvedValue([]) },
}));

jest.unstable_mockModule("../model/sources.js", () => ({
    sourceModel: {},
}));

jest.unstable_mockModule("../bin/remoteCodeRunner.js", () => ({
    default: { runUserDataFunction: jest.fn() },
}));

const ConfigManager = (await import("../bin/configManager.js")).default;
const userManager = (await import("../bin/user.js")).default;
const { userDataModel } = await import("../model/userData.js");
const { RdfDataModel } = await import("../model/rdfData.js");
const execRouteFactory = (await import("../api/v1/paths/users/data/{id}/exec.js")).default;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER_SOURCES = {
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

const REGULAR_USER = { user: { login: "testuser", groups: ["users"] } };
const ADMIN_USER = { user: { login: "admin", groups: ["admin"] } };
const SPARQL_EMPTY_RESULT = { results: { bindings: [] } };

const PFX = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX owl: <http://www.w3.org/2002/07/owl#>
`;

function makeUserData(query) {
    return { id: 1, data_type: "sparqlQuery", data_content: { sparqlQuery: query } };
}

function makeReq(params = {}, query = {}) {
    return { params, query, user: {} };
}

function makeRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.set = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /users/data/{id}/exec — validation du userData", () => {
    let handler;

    beforeEach(() => {
        jest.clearAllMocks();
        userManager.getUser.mockResolvedValue(REGULAR_USER);
        RdfDataModel.mockImplementation(() => ({
            execQuery: jest.fn().mockResolvedValue(SPARQL_EMPTY_RESULT),
        }));
        handler = execRouteFactory().GET;
    });

    test("userData de type non sparqlQuery retourne 400", async () => {
        userDataModel.find.mockResolvedValue({ data_type: "text", data_content: {} });
        ConfigManager.getUserSources.mockResolvedValue(USER_SOURCES);
        ConfigManager.getUser.mockResolvedValue(REGULAR_USER);

        const res = makeRes();
        await handler(makeReq({ id: "1" }), res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: "This userData is not a sparqlQuery" })
        );
    });

    test("userData sans data_content.sparqlQuery retourne 400", async () => {
        userDataModel.find.mockResolvedValue({ data_type: "sparqlQuery", data_content: {} });
        ConfigManager.getUserSources.mockResolvedValue(USER_SOURCES);
        ConfigManager.getUser.mockResolvedValue(REGULAR_USER);

        const res = makeRes();
        await handler(makeReq({ id: "1" }), res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: "Nothing on sparqlQuery" })
        );
    });

    test("paramètre format=json produit une réponse JSON (200)", async () => {
        userDataModel.find.mockResolvedValue(
            makeUserData(`SELECT ?s FROM <http://fghghf/> WHERE { ?s ?p ?o }`)
        );
        ConfigManager.getUserSources.mockResolvedValue(USER_SOURCES);
        ConfigManager.getUser.mockResolvedValue(REGULAR_USER);

        const res = makeRes();
        await handler(makeReq({ id: "1" }, { format: "json" }), res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalled();
    });
});

describe("GET /users/data/{id}/exec — filtrage ACL via route", () => {
    let handler;

    beforeEach(() => {
        jest.clearAllMocks();
        userManager.getUser.mockResolvedValue(REGULAR_USER);
        RdfDataModel.mockImplementation(() => ({
            execQuery: jest.fn().mockResolvedValue(SPARQL_EMPTY_RESULT),
        }));
        handler = execRouteFactory().GET;
    });

    async function execQuery(query, userInfo = REGULAR_USER, sources = USER_SOURCES) {
        userDataModel.find.mockResolvedValue(makeUserData(query));
        ConfigManager.getUserSources.mockResolvedValue(sources);
        ConfigManager.getUser.mockResolvedValue(userInfo);
        userManager.getUser.mockResolvedValue(userInfo);
        const res = makeRes();
        await handler(makeReq({ id: "1" }), res, jest.fn());
        return res;
    }

    // ─── ADMIN BYPASS ─────────────────────────────────────────────────────────

    test("Admin – bypass total du filtrage", async () => {
        const res = await execQuery(`INSERT DATA { <http://unknown/s1> a <http://owl/Class> . }`, ADMIN_USER);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    // ─── SELECT → checkSelectQuery ────────────────────────────────────────────

    test("SELECT avec FROM graph autorisé passe (200)", async () => {
        const res = await execQuery(`SELECT ?s FROM <http://fghghf/> WHERE { ?s ?p ?o }`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("SELECT sans FROM graph est bloqué", async () => {
        const res = await execQuery(`SELECT ?s WHERE { ?s ?p ?o }`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("SELECT avec FROM graph non autorisé est bloqué", async () => {
        const res = await execQuery(`SELECT ?s FROM <http://unknown/> WHERE { ?s ?p ?o }`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    // ─── INSERT/DELETE → checkQueryByRegex ───────────────────────────────────

    test("T01 – INSERT DATA sur graph autorisé en écriture (200)", async () => {
        const res = await execQuery(`INSERT DATA {
  GRAPH <http://fghghf/> {
    <http://fghghf/s1> a <http://www.w3.org/2002/07/owl#Class> .
  }
}`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("T02 – DELETE DATA sur graph autorisé en écriture (200)", async () => {
        const res = await execQuery(`DELETE DATA {
  GRAPH <http://fghghf/> {
    <http://fghghf/s1> a <http://www.w3.org/2002/07/owl#Class> .
  }
}`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("T03 – DELETE/INSERT avec WITH sur graph autorisé (200)", async () => {
        const res = await execQuery(`WITH <http://fghghf/>
DELETE { ?s ?p ?o }
INSERT { ?s ?p "newValue" }
WHERE  { ?s ?p ?o . FILTER(?s = <http://fghghf/s1>) }`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("T04 – CLEAR sur graph autorisé en écriture (200)", async () => {
        const res = await execQuery(`CLEAR GRAPH <http://fghghf/>`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("T05 – COPY entre deux graphs autorisés (200)", async () => {
        const res = await execQuery(`COPY <http://fghghf/> TO <http://fghghf/>`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("T06 – INSERT DATA sur plusieurs graphs tous autorisés (200)", async () => {
        const res = await execQuery(`INSERT DATA {
  GRAPH <http://fghghf/> { <http://fghghf/s1> a <http://owl/Class> . }
  GRAPH <http://fghghf/> { <http://fghghf/s2> a <http://owl/Class> . }
}`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("T07 – Requête sans opération reconnue est bloquée", async () => {
        const res = await execQuery(`DESCRIBE <http://fghghf/s1>`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("T08 – INSERT sans déclaration de graph explicite est bloqué", async () => {
        const res = await execQuery(`INSERT DATA { <http://fghghf/s1> a <http://owl/Class> . }`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("T09 – INSERT sur graph absent du userSourcesMap est bloqué", async () => {
        const res = await execQuery(`INSERT DATA {
  GRAPH <http://unknown/> { <http://unknown/s1> a <http://owl/Class> . }
}`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("T10 – INSERT sur graph en lecture seule est bloqué", async () => {
        const res = await execQuery(`INSERT DATA {
  GRAPH <http://testClasses/> { <http://testClasses/s1> a <http://owl/Class> . }
}`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("T11 – INSERT sur plusieurs graphs dont un en lecture seule est bloqué", async () => {
        const res = await execQuery(`INSERT DATA {
  GRAPH <http://fghghf/>      { <http://fghghf/s1> a <http://owl/Class> . }
  GRAPH <http://testClasses/> { <http://testClasses/s1> a <http://owl/Class> . }
}`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("T12 – COPY depuis un graph lecture seule vers un graph autorisé est bloqué", async () => {
        const res = await execQuery(`COPY <http://testClasses/> TO <http://fghghf/>`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("T13 – DROP DEFAULT sans graph explicite est bloqué", async () => {
        const res = await execQuery(`DROP DEFAULT`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("T14 – Casse mixte (flag /i) (200)", async () => {
        const res = await execQuery(`insert data {
  graph <http://fghghf/> { <http://fghghf/s1> a <http://owl/Class> . }
}`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("T15 – URI dans un littéral string (bug connu : faux positif) est bloqué", async () => {
        const res = await execQuery(`INSERT DATA {
  GRAPH <http://fghghf/> {
    <http://fghghf/s1> <http://label> "DELETE FROM graph <http://unknown/>" .
  }
}`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    // ─── CAS COMMENTAIRES ─────────────────────────────────────────────────────

    test("T16 – Commentaire contenant SELECT ne fausse pas le routing (200)", async () => {
        const res = await execQuery(`# SELECT ?s FROM <http://fghghf/>
DELETE DATA {
  GRAPH <http://fghghf/> { <http://fghghf/s1> a <http://owl/Class> . }
}`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("T17 – Commentaire contenant un graph non autorisé ne bloque pas (200)", async () => {
        const res = await execQuery(`# INSERT DATA { GRAPH <http://unknown/> { <s> <p> <o> . } }
INSERT DATA {
  GRAPH <http://fghghf/> { <http://fghghf/s1> a <http://owl/Class> . }
}`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("T18 – Commentaire contenant INSERT ne masque pas un DELETE autorisé (200)", async () => {
        const res = await execQuery(`# INSERT DATA { GRAPH <http://testClasses/> { <s> <p> <o> . } }
DELETE DATA {
  GRAPH <http://fghghf/> { <http://fghghf/s1> a <http://owl/Class> . }
}`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    // ─── CAS MULTIPLE OPERATIONS ──────────────────────────────────────────────

    test("T19 – Deux opérations autorisées séparées par ; (200)", async () => {
        const res = await execQuery(
            `INSERT DATA { GRAPH <http://fghghf/> { <http://fghghf/s1> a <http://owl/Class> . } } ;\nDELETE DATA { GRAPH <http://fghghf/> { <http://fghghf/s2> a <http://owl/Class> . } }`
        );
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("T20 – Deux opérations dont une non autorisée séparées par ; est bloqué", async () => {
        const res = await execQuery(
            `INSERT DATA { GRAPH <http://fghghf/> { <http://fghghf/s1> a <http://owl/Class> . } } ;\nDELETE DATA { GRAPH <http://testClasses/> { <http://testClasses/s1> a <http://owl/Class> . } }`
        );
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("T21 – Deux opérations dont une sans graph explicite séparées par ; est bloqué", async () => {
        const res = await execQuery(
            `INSERT DATA { GRAPH <http://fghghf/> { <http://fghghf/s1> a <http://owl/Class> . } } ;\nDELETE DATA { <http://fghghf/s2> a <http://owl/Class> . }`
        );
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    // ─── SELECT avec WHERE détaillé ───────────────────────────────────────────

    test("SELECT avec filtres et sous-requête passe (200)", async () => {
        const res = await execQuery(`SELECT ?s ?label
FROM <http://fghghf/>
WHERE {
  ?s a <http://www.w3.org/2002/07/owl#Class> .
  OPTIONAL { ?s <http://www.w3.org/2000/01/rdf-schema#label> ?label . FILTER(LANG(?label) = "fr") }
  FILTER NOT EXISTS { ?s <http://www.w3.org/2002/07/owl#deprecated> true }
}`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("SELECT avec FROM NAMED autorisé passe (200)", async () => {
        const res = await execQuery(`SELECT ?s
FROM NAMED <http://fghghf/>
WHERE { GRAPH <http://fghghf/> { ?s ?p ?o } }`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("SELECT avec FROM autorisé et FROM NAMED non autorisé est bloqué", async () => {
        const res = await execQuery(`SELECT ?s
FROM <http://fghghf/>
FROM NAMED <http://unknown/>
WHERE { ?s ?p ?o }`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    // ─── INSERT avec WHERE détaillé ───────────────────────────────────────────

    test("INSERT avec WHERE et FILTER passe sur graph autorisé (200)", async () => {
        const res = await execQuery(`WITH <http://fghghf/>
INSERT {
  ?s <http://www.w3.org/2000/01/rdf-schema#label> "updated label" .
}
WHERE {
  ?s a <http://www.w3.org/2002/07/owl#Class> .
  FILTER NOT EXISTS { ?s <http://www.w3.org/2000/01/rdf-schema#label> ?label }
}`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("INSERT avec WHERE sur graph lecture seule est bloqué", async () => {
        const res = await execQuery(`WITH <http://testClasses/>
INSERT { ?s <http://rdfs/label> "x" . }
WHERE  { ?s a <http://owl/Class> . }`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("INSERT ciblant deux graphs dont source en lecture seule est bloqué", async () => {
        const res = await execQuery(`INSERT {
  GRAPH <http://fghghf/> { ?s <http://rdfs/label> ?label . }
}
WHERE {
  GRAPH <http://testClasses/> { ?s <http://rdfs/label> ?label . }
}`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    // ─── DELETE avec WHERE détaillé ───────────────────────────────────────────

    test("DELETE avec WHERE et OPTIONAL passe sur graph autorisé (200)", async () => {
        const res = await execQuery(`WITH <http://fghghf/>
DELETE {
  ?s <http://www.w3.org/2000/01/rdf-schema#label> ?oldLabel .
}
WHERE {
  ?s a <http://www.w3.org/2002/07/owl#Class> .
  OPTIONAL { ?s <http://www.w3.org/2000/01/rdf-schema#label> ?oldLabel }
  FILTER(STR(?oldLabel) = "old value")
}`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("DELETE WHERE (forme courte) sur graph autorisé passe (200)", async () => {
        const res = await execQuery(`DELETE WHERE {
  GRAPH <http://fghghf/> {
    <http://fghghf/s1> ?p ?o .
  }
}`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("DELETE WHERE sur graph lecture seule est bloqué", async () => {
        const res = await execQuery(`WITH <http://testClasses/>
DELETE { ?s ?p ?o }
WHERE  { ?s a <http://owl/Class> . }`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    // ─── COPY / MOVE / ADD ────────────────────────────────────────────────────

    test("COPY de graph autorisé vers graph autorisé passe (200)", async () => {
        const res = await execQuery(`COPY <http://fghghf/> TO <http://fghghf/>`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("MOVE de graph autorisé vers graph autorisé passe (200)", async () => {
        const res = await execQuery(`MOVE <http://fghghf/> TO <http://fghghf/>`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("ADD de graph autorisé vers graph autorisé passe (200)", async () => {
        const res = await execQuery(`ADD <http://fghghf/> TO <http://fghghf/>`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("COPY depuis graph lecture seule est bloqué", async () => {
        const res = await execQuery(`COPY <http://testClasses/> TO <http://fghghf/>`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("MOVE depuis graph lecture seule est bloqué", async () => {
        const res = await execQuery(`MOVE <http://testClasses/> TO <http://fghghf/>`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("ADD depuis graph lecture seule est bloqué", async () => {
        const res = await execQuery(`ADD <http://testClasses/> TO <http://fghghf/>`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("COPY vers graph non autorisé est bloqué", async () => {
        const res = await execQuery(`COPY <http://fghghf/> TO <http://unknown/>`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("COPY sans URI (pas de <>) est bloqué", async () => {
        const res = await execQuery(`COPY DEFAULT TO NAMED <http://fghghf/>`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    // ─── SELECT avec plusieurs FROM ───────────────────────────────────────────

    test("SELECT avec deux FROM autorisés passe (200)", async () => {
        const res = await execQuery(`SELECT ?s ?p ?o
FROM <http://fghghf/>
FROM <http://testClasses/>
WHERE { ?s ?p ?o }`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("SELECT avec FROM autorisé et FROM non autorisé est bloqué", async () => {
        const res = await execQuery(`SELECT ?s
FROM <http://fghghf/>
FROM <http://unknown/>
WHERE { ?s ?p ?o }`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("SELECT avec deux FROM NAMED autorisés passe (200)", async () => {
        const res = await execQuery(`SELECT ?s
FROM NAMED <http://fghghf/>
FROM NAMED <http://testClasses/>
WHERE { GRAPH ?g { ?s ?p ?o } }`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("SELECT avec FROM + FROM NAMED tous autorisés passe (200)", async () => {
        const res = await execQuery(`SELECT ?s
FROM <http://fghghf/>
FROM NAMED <http://testClasses/>
WHERE { ?s ?p ?o }`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("SELECT avec FROM + FROM NAMED dont un non autorisé est bloqué", async () => {
        const res = await execQuery(`SELECT ?s
FROM <http://fghghf/>
FROM NAMED <http://unknown/>
WHERE { ?s ?p ?o }`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    // ─── INSERT avec plusieurs GRAPH ──────────────────────────────────────────

    test("INSERT DATA dans deux graphs autorisés passe (200)", async () => {
        const res = await execQuery(`INSERT DATA {
  GRAPH <http://fghghf/> { <http://fghghf/s1> a <http://owl/Class> . }
  GRAPH <http://fghghf/> { <http://fghghf/s2> <http://rdfs/label> "test" . }
}`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("INSERT DATA dans graph autorisé et graph lecture seule est bloqué", async () => {
        const res = await execQuery(`INSERT DATA {
  GRAPH <http://fghghf/>      { <http://fghghf/s1> a <http://owl/Class> . }
  GRAPH <http://testClasses/> { <http://testClasses/s1> a <http://owl/Class> . }
}`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("INSERT DATA dans graph autorisé et graph inconnu est bloqué", async () => {
        const res = await execQuery(`INSERT DATA {
  GRAPH <http://testClasses/> { <http://testClasses/s1> a <http://owl/Class> . }
  GRAPH <http://unknown/>     { <http://unknown/s1> a <http://owl/Class> . }
}`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("INSERT avec WHERE dans plusieurs graphs autorisés passe (200)", async () => {
        const res = await execQuery(`INSERT {
  GRAPH <http://fghghf/> { ?s <http://rdfs/label> ?label . }
}
WHERE {
  GRAPH <http://fghghf/> { ?s a <http://owl/Class> . OPTIONAL { ?s <http://rdfs/label> ?label } }
  FILTER(!BOUND(?label))
}`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    // ─── DELETE avec plusieurs GRAPH ──────────────────────────────────────────

    test("DELETE DATA dans deux graphs autorisés passe (200)", async () => {
        const res = await execQuery(`DELETE DATA {
  GRAPH <http://fghghf/> { <http://fghghf/s1> a <http://owl/Class> . }
  GRAPH <http://fghghf/> { <http://fghghf/s2> <http://rdfs/label> "test" . }
}`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("DELETE DATA dans graph autorisé et graph lecture seule est bloqué", async () => {
        const res = await execQuery(`DELETE DATA {
  GRAPH <http://fghghf/>      { <http://fghghf/s1> a <http://owl/Class> . }
  GRAPH <http://testClasses/> { <http://testClasses/s1> a <http://owl/Class> . }
}`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("DELETE WHERE dans plusieurs graphs autorisés passe (200)", async () => {
        const res = await execQuery(`DELETE {
  GRAPH <http://fghghf/> { ?s <http://rdfs/label> ?oldLabel . }
}
WHERE {
  GRAPH <http://fghghf/> { ?s a <http://owl/Class> ; <http://rdfs/label> ?oldLabel . }
  FILTER(STR(?oldLabel) = "obsolete")
}`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    // ─── COPY / MOVE / ADD multiples via ; ────────────────────────────────────

    test("Deux COPY autorisés séparés par ; passent (200)", async () => {
        const res = await execQuery(
            `COPY <http://fghghf/> TO <http://fghghf/> ;\nCOPY <http://fghghf/> TO <http://fghghf/>`
        );
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("COPY autorisé puis MOVE non autorisé séparés par ; est bloqué", async () => {
        const res = await execQuery(
            `COPY <http://fghghf/> TO <http://fghghf/> ;\nMOVE <http://testClasses/> TO <http://fghghf/>`
        );
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("ADD autorisé puis COPY vers graph inconnu séparés par ; est bloqué", async () => {
        const res = await execQuery(
            `ADD <http://fghghf/> TO <http://fghghf/> ;\nCOPY <http://fghghf/> TO <http://unknown/>`
        );
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    // ─── VARIANTES AVEC PREFIX ────────────────────────────────────────────────

    test("PREFIX – Admin – bypass total du filtrage", async () => {
        const res = await execQuery(PFX + `INSERT DATA { <http://unknown/s1> a owl:Class . }`, ADMIN_USER);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("PREFIX – SELECT avec FROM graph autorisé passe (200)", async () => {
        const res = await execQuery(PFX + `SELECT ?s FROM <http://fghghf/> WHERE { ?s a owl:Class }`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("PREFIX – SELECT sans FROM graph est bloqué", async () => {
        const res = await execQuery(PFX + `SELECT ?s WHERE { ?s ?p ?o }`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("PREFIX – SELECT avec FROM graph non autorisé est bloqué", async () => {
        const res = await execQuery(PFX + `SELECT ?s FROM <http://unknown/> WHERE { ?s ?p ?o }`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("PREFIX – T01 INSERT DATA sur graph autorisé en écriture (200)", async () => {
        const res = await execQuery(PFX + `INSERT DATA {
  GRAPH <http://fghghf/> {
    <http://fghghf/s1> a owl:Class .
  }
}`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("PREFIX – T02 DELETE DATA sur graph autorisé en écriture (200)", async () => {
        const res = await execQuery(PFX + `DELETE DATA {
  GRAPH <http://fghghf/> {
    <http://fghghf/s1> a owl:Class .
  }
}`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("PREFIX – T03 DELETE/INSERT avec WITH sur graph autorisé (200)", async () => {
        const res = await execQuery(PFX + `WITH <http://fghghf/>
DELETE { ?s ?p ?o }
INSERT { ?s ?p "newValue" }
WHERE  { ?s ?p ?o . FILTER(?s = <http://fghghf/s1>) }`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("PREFIX – T04 CLEAR sur graph autorisé en écriture (200)", async () => {
        const res = await execQuery(PFX + `CLEAR GRAPH <http://fghghf/>`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("PREFIX – T05 COPY entre deux graphs autorisés (200)", async () => {
        const res = await execQuery(PFX + `COPY <http://fghghf/> TO <http://fghghf/>`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("PREFIX – T06 INSERT DATA sur plusieurs graphs tous autorisés (200)", async () => {
        const res = await execQuery(PFX + `INSERT DATA {
  GRAPH <http://fghghf/> { <http://fghghf/s1> a owl:Class . }
  GRAPH <http://fghghf/> { <http://fghghf/s2> a owl:Class . }
}`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("PREFIX – T07 Requête sans opération reconnue est bloquée", async () => {
        const res = await execQuery(PFX + `DESCRIBE <http://fghghf/s1>`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("PREFIX – T08 INSERT sans déclaration de graph explicite est bloqué", async () => {
        const res = await execQuery(PFX + `INSERT DATA { <http://fghghf/s1> a owl:Class . }`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("PREFIX – T09 INSERT sur graph absent du userSourcesMap est bloqué", async () => {
        const res = await execQuery(PFX + `INSERT DATA {
  GRAPH <http://unknown/> { <http://unknown/s1> a owl:Class . }
}`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("PREFIX – T10 INSERT sur graph en lecture seule est bloqué", async () => {
        const res = await execQuery(PFX + `INSERT DATA {
  GRAPH <http://testClasses/> { <http://testClasses/s1> a owl:Class . }
}`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("PREFIX – T11 INSERT sur plusieurs graphs dont un en lecture seule est bloqué", async () => {
        const res = await execQuery(PFX + `INSERT DATA {
  GRAPH <http://fghghf/>      { <http://fghghf/s1> a owl:Class . }
  GRAPH <http://testClasses/> { <http://testClasses/s1> a owl:Class . }
}`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("PREFIX – T12 COPY depuis un graph lecture seule vers un graph autorisé est bloqué", async () => {
        const res = await execQuery(PFX + `COPY <http://testClasses/> TO <http://fghghf/>`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("PREFIX – T13 DROP DEFAULT sans graph explicite est bloqué", async () => {
        const res = await execQuery(PFX + `DROP DEFAULT`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("PREFIX – T14 Casse mixte (flag /i) (200)", async () => {
        const res = await execQuery(PFX + `insert data {
  graph <http://fghghf/> { <http://fghghf/s1> a owl:Class . }
}`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("PREFIX – T15 URI dans un littéral string (bug connu : faux positif) est bloqué", async () => {
        const res = await execQuery(PFX + `INSERT DATA {
  GRAPH <http://fghghf/> {
    <http://fghghf/s1> <http://label> "DELETE FROM graph <http://unknown/>" .
  }
}`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("PREFIX – T16 Commentaire contenant SELECT ne fausse pas le routing (200)", async () => {
        const res = await execQuery(PFX + `# SELECT ?s FROM <http://fghghf/>
DELETE DATA {
  GRAPH <http://fghghf/> { <http://fghghf/s1> a owl:Class . }
}`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("PREFIX – T17 Commentaire contenant un graph non autorisé ne bloque pas (200)", async () => {
        const res = await execQuery(PFX + `# INSERT DATA { GRAPH <http://unknown/> { <s> <p> <o> . } }
INSERT DATA {
  GRAPH <http://fghghf/> { <http://fghghf/s1> a owl:Class . }
}`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("PREFIX – T18 Commentaire contenant INSERT ne masque pas un DELETE autorisé (200)", async () => {
        const res = await execQuery(PFX + `# INSERT DATA { GRAPH <http://testClasses/> { <s> <p> <o> . } }
DELETE DATA {
  GRAPH <http://fghghf/> { <http://fghghf/s1> a owl:Class . }
}`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("PREFIX – T19 Deux opérations autorisées séparées par ; (200)", async () => {
        const res = await execQuery(
            PFX + `INSERT DATA { GRAPH <http://fghghf/> { <http://fghghf/s1> a owl:Class . } } ;\nDELETE DATA { GRAPH <http://fghghf/> { <http://fghghf/s2> a owl:Class . } }`
        );
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("PREFIX – T20 Deux opérations dont une non autorisée séparées par ; est bloqué", async () => {
        const res = await execQuery(
            PFX + `INSERT DATA { GRAPH <http://fghghf/> { <http://fghghf/s1> a owl:Class . } } ;\nDELETE DATA { GRAPH <http://testClasses/> { <http://testClasses/s1> a owl:Class . } }`
        );
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("PREFIX – T21 Deux opérations dont une sans graph explicite séparées par ; est bloqué", async () => {
        const res = await execQuery(
            PFX + `INSERT DATA { GRAPH <http://fghghf/> { <http://fghghf/s1> a owl:Class . } } ;\nDELETE DATA { <http://fghghf/s2> a owl:Class . }`
        );
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("PREFIX – SELECT avec filtres et sous-requête passe (200)", async () => {
        const res = await execQuery(PFX + `SELECT ?s ?label
FROM <http://fghghf/>
WHERE {
  ?s a owl:Class .
  OPTIONAL { ?s rdfs:label ?label . FILTER(LANG(?label) = "fr") }
  FILTER NOT EXISTS { ?s owl:deprecated true }
}`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("PREFIX – SELECT avec FROM NAMED autorisé passe (200)", async () => {
        const res = await execQuery(PFX + `SELECT ?s
FROM NAMED <http://fghghf/>
WHERE { GRAPH <http://fghghf/> { ?s ?p ?o } }`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("PREFIX – SELECT avec FROM autorisé et FROM NAMED non autorisé est bloqué", async () => {
        const res = await execQuery(PFX + `SELECT ?s
FROM <http://fghghf/>
FROM NAMED <http://unknown/>
WHERE { ?s ?p ?o }`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("PREFIX – INSERT avec WHERE et FILTER passe sur graph autorisé (200)", async () => {
        const res = await execQuery(PFX + `WITH <http://fghghf/>
INSERT {
  ?s rdfs:label "updated label" .
}
WHERE {
  ?s a owl:Class .
  FILTER NOT EXISTS { ?s rdfs:label ?label }
}`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("PREFIX – INSERT avec WHERE sur graph lecture seule est bloqué", async () => {
        const res = await execQuery(PFX + `WITH <http://testClasses/>
INSERT { ?s rdfs:label "x" . }
WHERE  { ?s a owl:Class . }`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("PREFIX – INSERT ciblant deux graphs dont source en lecture seule est bloqué", async () => {
        const res = await execQuery(PFX + `INSERT {
  GRAPH <http://fghghf/> { ?s rdfs:label ?label . }
}
WHERE {
  GRAPH <http://testClasses/> { ?s rdfs:label ?label . }
}`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("PREFIX – DELETE avec WHERE et OPTIONAL passe sur graph autorisé (200)", async () => {
        const res = await execQuery(PFX + `WITH <http://fghghf/>
DELETE {
  ?s rdfs:label ?oldLabel .
}
WHERE {
  ?s a owl:Class .
  OPTIONAL { ?s rdfs:label ?oldLabel }
  FILTER(STR(?oldLabel) = "old value")
}`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("PREFIX – DELETE WHERE (forme courte) sur graph autorisé passe (200)", async () => {
        const res = await execQuery(PFX + `DELETE WHERE {
  GRAPH <http://fghghf/> {
    <http://fghghf/s1> ?p ?o .
  }
}`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("PREFIX – DELETE WHERE sur graph lecture seule est bloqué", async () => {
        const res = await execQuery(PFX + `WITH <http://testClasses/>
DELETE { ?s ?p ?o }
WHERE  { ?s a owl:Class . }`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("PREFIX – COPY de graph autorisé vers graph autorisé passe (200)", async () => {
        const res = await execQuery(PFX + `COPY <http://fghghf/> TO <http://fghghf/>`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("PREFIX – MOVE de graph autorisé vers graph autorisé passe (200)", async () => {
        const res = await execQuery(PFX + `MOVE <http://fghghf/> TO <http://fghghf/>`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("PREFIX – ADD de graph autorisé vers graph autorisé passe (200)", async () => {
        const res = await execQuery(PFX + `ADD <http://fghghf/> TO <http://fghghf/>`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("PREFIX – COPY depuis graph lecture seule est bloqué", async () => {
        const res = await execQuery(PFX + `COPY <http://testClasses/> TO <http://fghghf/>`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("PREFIX – MOVE depuis graph lecture seule est bloqué", async () => {
        const res = await execQuery(PFX + `MOVE <http://testClasses/> TO <http://fghghf/>`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("PREFIX – ADD depuis graph lecture seule est bloqué", async () => {
        const res = await execQuery(PFX + `ADD <http://testClasses/> TO <http://fghghf/>`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("PREFIX – COPY vers graph non autorisé est bloqué", async () => {
        const res = await execQuery(PFX + `COPY <http://fghghf/> TO <http://unknown/>`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("PREFIX – COPY sans URI (pas de <>) est bloqué", async () => {
        const res = await execQuery(PFX + `COPY DEFAULT TO NAMED <http://fghghf/>`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("PREFIX – SELECT avec deux FROM autorisés passe (200)", async () => {
        const res = await execQuery(PFX + `SELECT ?s ?p ?o
FROM <http://fghghf/>
FROM <http://testClasses/>
WHERE { ?s ?p ?o }`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("PREFIX – SELECT avec FROM autorisé et FROM non autorisé est bloqué", async () => {
        const res = await execQuery(PFX + `SELECT ?s
FROM <http://fghghf/>
FROM <http://unknown/>
WHERE { ?s ?p ?o }`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("PREFIX – SELECT avec deux FROM NAMED autorisés passe (200)", async () => {
        const res = await execQuery(PFX + `SELECT ?s
FROM NAMED <http://fghghf/>
FROM NAMED <http://testClasses/>
WHERE { GRAPH ?g { ?s ?p ?o } }`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("PREFIX – SELECT avec FROM + FROM NAMED tous autorisés passe (200)", async () => {
        const res = await execQuery(PFX + `SELECT ?s
FROM <http://fghghf/>
FROM NAMED <http://testClasses/>
WHERE { ?s ?p ?o }`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("PREFIX – SELECT avec FROM + FROM NAMED dont un non autorisé est bloqué", async () => {
        const res = await execQuery(PFX + `SELECT ?s
FROM <http://fghghf/>
FROM NAMED <http://unknown/>
WHERE { ?s ?p ?o }`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("PREFIX – INSERT DATA dans deux graphs autorisés passe (200)", async () => {
        const res = await execQuery(PFX + `INSERT DATA {
  GRAPH <http://fghghf/> { <http://fghghf/s1> a owl:Class . }
  GRAPH <http://fghghf/> { <http://fghghf/s2> rdfs:label "test" . }
}`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("PREFIX – INSERT DATA dans graph autorisé et graph lecture seule est bloqué", async () => {
        const res = await execQuery(PFX + `INSERT DATA {
  GRAPH <http://fghghf/>      { <http://fghghf/s1> a owl:Class . }
  GRAPH <http://testClasses/> { <http://testClasses/s1> a owl:Class . }
}`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("PREFIX – INSERT DATA dans graph autorisé et graph inconnu est bloqué", async () => {
        const res = await execQuery(PFX + `INSERT DATA {
  GRAPH <http://testClasses/> { <http://testClasses/s1> a owl:Class . }
  GRAPH <http://unknown/>     { <http://unknown/s1> a owl:Class . }
}`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("PREFIX – INSERT avec WHERE dans plusieurs graphs autorisés passe (200)", async () => {
        const res = await execQuery(PFX + `INSERT {
  GRAPH <http://fghghf/> { ?s rdfs:label ?label . }
}
WHERE {
  GRAPH <http://fghghf/> { ?s a owl:Class . OPTIONAL { ?s rdfs:label ?label } }
  FILTER(!BOUND(?label))
}`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("PREFIX – DELETE DATA dans deux graphs autorisés passe (200)", async () => {
        const res = await execQuery(PFX + `DELETE DATA {
  GRAPH <http://fghghf/> { <http://fghghf/s1> a owl:Class . }
  GRAPH <http://fghghf/> { <http://fghghf/s2> rdfs:label "test" . }
}`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("PREFIX – DELETE DATA dans graph autorisé et graph lecture seule est bloqué", async () => {
        const res = await execQuery(PFX + `DELETE DATA {
  GRAPH <http://fghghf/>      { <http://fghghf/s1> a owl:Class . }
  GRAPH <http://testClasses/> { <http://testClasses/s1> a owl:Class . }
}`);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("PREFIX – DELETE WHERE dans plusieurs graphs autorisés passe (200)", async () => {
        const res = await execQuery(PFX + `DELETE {
  GRAPH <http://fghghf/> { ?s rdfs:label ?oldLabel . }
}
WHERE {
  GRAPH <http://fghghf/> { ?s a owl:Class ; rdfs:label ?oldLabel . }
  FILTER(STR(?oldLabel) = "obsolete")
}`);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("PREFIX – Deux COPY autorisés séparés par ; passent (200)", async () => {
        const res = await execQuery(
            PFX + `COPY <http://fghghf/> TO <http://fghghf/> ;\nCOPY <http://fghghf/> TO <http://fghghf/>`
        );
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("PREFIX – COPY autorisé puis MOVE non autorisé séparés par ; est bloqué", async () => {
        const res = await execQuery(
            PFX + `COPY <http://fghghf/> TO <http://fghghf/> ;\nMOVE <http://testClasses/> TO <http://fghghf/>`
        );
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test("PREFIX – ADD autorisé puis COPY vers graph inconnu séparés par ; est bloqué", async () => {
        const res = await execQuery(
            PFX + `ADD <http://fghghf/> TO <http://fghghf/> ;\nCOPY <http://fghghf/> TO <http://unknown/>`
        );
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    // ─── STRESS ───────────────────────────────────────────────────────────────

    test("STRESS – PREFIX dont l'URI contient GRAPH ne fausse pas la détection (200)", async () => {
        const res = await execQuery(
            `PREFIX myGraph: <http://ns/GRAPH/vocab#>\nINSERT DATA {\n  GRAPH <http://fghghf/> { <http://fghghf/s1> a <http://owl/Class> . }\n}`
        );
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("STRESS – PREFIX dont l'URI contient SELECT court-circuite le routing (limitation connue) — bloqué", async () => {
        const res = await execQuery(
            `PREFIX sel: <http://www.example.org/SELECT/vocab#>\nINSERT DATA {\n  GRAPH <http://fghghf/> { <http://fghghf/s1> a <http://owl/Class> . }\n}`
        );
        expect(res.status).not.toHaveBeenCalledWith(200);
    });
});

describe("GET /users/data/{id}/exec — template rendering {{limit}} / {{offset}}", () => {
    let handler;

    beforeEach(() => {
        jest.clearAllMocks();
        userManager.getUser.mockResolvedValue(REGULAR_USER);
        handler = execRouteFactory().GET;
    });

    test("userData avec {{limit}} utilise LIMIT 10000 par défaut", async () => {
        const queryWithLimit =
            "SELECT ?s FROM <http://fghghf/> WHERE { ?s ?p ?o } {{limit}}";
        userDataModel.find.mockResolvedValue(makeUserData(queryWithLimit));
        ConfigManager.getUserSources.mockResolvedValue(USER_SOURCES);
        ConfigManager.getUser.mockResolvedValue(REGULAR_USER);

        let capturedQuery = null;
        RdfDataModel.mockImplementation(() => ({
            execQuery: jest.fn().mockImplementation((query) => {
                capturedQuery = query;
                return Promise.resolve(SPARQL_EMPTY_RESULT);
            }),
        }));

        const res = makeRes();
        await handler(makeReq({ id: "1" }), res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(200);
        expect(capturedQuery).toMatch(/LIMIT 10000/);
    });

    test("userData avec {{limit}} respecte le paramètre limit de la requête HTTP", async () => {
        const queryWithLimit =
            "SELECT ?s FROM <http://fghghf/> WHERE { ?s ?p ?o } {{limit}}";
        userDataModel.find.mockResolvedValue(makeUserData(queryWithLimit));
        ConfigManager.getUserSources.mockResolvedValue(USER_SOURCES);
        ConfigManager.getUser.mockResolvedValue(REGULAR_USER);

        let capturedQuery = null;
        RdfDataModel.mockImplementation(() => ({
            execQuery: jest.fn().mockImplementation((query) => {
                capturedQuery = query;
                return Promise.resolve(SPARQL_EMPTY_RESULT);
            }),
        }));

        const res = makeRes();
        await handler(makeReq({ id: "1" }, { limit: "50" }), res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(200);
        expect(capturedQuery).toMatch(/LIMIT 50/);
    });
});
