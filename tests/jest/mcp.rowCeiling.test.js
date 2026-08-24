import { jest } from "@jest/globals";
import { rowCeilingNotice } from "../../bin/MCP/execute.js";

const escalation = "Escalate like this.";

function bindings(rowCount) {
    const rows = [];
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
        rows.push({ subject: `http://example.org/${rowIndex}` });
    }
    return { results: { bindings: rows } };
}

describe("rowCeilingNotice, with the execution facts the route reports", () => {
    test("a last block filling the endpoint's own cap is a cut, and the hint names that cap", () => {
        const notice = rowCeilingNotice(bindings(10000), {
            sparqlExecution: { queryCount: 1, lastLimit: 50000, lastRows: 10000, totalRows: 10000, endpointCeiling: 10000 },
            escalation: escalation,
        });

        expect(notice.complete).toBe(false);
        expect(notice.atKnownCeiling).toBe(true);
        expect(notice.knownCeiling).toBe(10000);
        expect(notice.hint).toContain("endpoint's own cap");
        expect(notice.hint).toContain(escalation);
    });

    test("a last block filling the LIMIT the query carried is a cut, and the hint names the LIMIT", () => {
        const notice = rowCeilingNotice(bindings(10000), {
            sparqlExecution: { queryCount: 1, lastLimit: 10000, lastRows: 10000, totalRows: 10000, endpointCeiling: 20000 },
            escalation: escalation,
        });

        expect(notice.complete).toBe(false);
        expect(notice.knownCeiling).toBe(10000);
        expect(notice.hint).toContain("LIMIT of 10000");
    });

    test("a short last block under a known endpoint cap is complete", () => {
        const notice = rowCeilingNotice(bindings(342), {
            sparqlExecution: { queryCount: 1, lastLimit: 1000, lastRows: 342, totalRows: 342, endpointCeiling: 20000 },
            escalation: escalation,
        });

        expect(notice.complete).toBe(true);
        expect(notice.atKnownCeiling).toBe(false);
        expect(notice.hint).toBeUndefined();
    });

    test("an unknown endpoint cap never yields a yes, and says so once the count is large enough to matter", () => {
        const quiet = rowCeilingNotice(bindings(12), {
            sparqlExecution: { queryCount: 1, lastLimit: 1000, lastRows: 12, totalRows: 12, endpointCeiling: null },
            escalation: escalation,
        });
        const loud = rowCeilingNotice(bindings(4000), {
            sparqlExecution: { queryCount: 1, lastLimit: 10000, lastRows: 4000, totalRows: 4000, endpointCeiling: null },
            escalation: escalation,
        });

        expect(quiet.complete).toBe("unknown");
        expect(quiet.hint).toBeUndefined();
        expect(loud.complete).toBe("unknown");
        expect(loud.hint).toContain("Possibly cut");
    });

    test("a function that pages internally is judged on its last block, not on its total", () => {
        const finished = rowCeilingNotice(bindings(4500), {
            sparqlExecution: { queryCount: 3, lastLimit: 2001, lastRows: 498, totalRows: 4500, endpointCeiling: 20000 },
            escalation: escalation,
        });
        const stoppedOnCeiling = rowCeilingNotice(bindings(10000), {
            sparqlExecution: { queryCount: 5, lastLimit: 2001, lastRows: 2001, totalRows: 10000, endpointCeiling: 20000 },
            escalation: escalation,
        });

        expect(finished.complete).toBe(true);
        expect(finished.sparqlQueries).toBe(3);
        expect(stoppedOnCeiling.complete).toBe(false);
    });

    test("rows read and rows handed back are both reported when a function reshapes its bindings", () => {
        const notice = rowCeilingNotice(bindings(50), {
            sparqlExecution: { queryCount: 1, lastLimit: 10000, lastRows: 8000, totalRows: 8000, endpointCeiling: 20000 },
            escalation: escalation,
        });

        expect(notice.returnedRows).toBe(50);
        expect(notice.sparqlRows).toBe(8000);
    });
});

describe("rowCeilingNotice, without execution facts", () => {
    test("a search engine's own total decides, cut or complete", () => {
        const cut = rowCeilingNotice({ totalMatches: 431, hits: [{ id: "a" }, { id: "b" }] }, { appliedRowLimit: 2, escalation: escalation });
        const whole = rowCeilingNotice({ totalMatches: 2, hits: [{ id: "a" }, { id: "b" }] }, { appliedRowLimit: 10, escalation: escalation });

        expect(cut.complete).toBe(false);
        expect(cut.hint).toContain("2 of 431 matches");
        expect(whole.complete).toBe(true);
    });

    test("a total that is only a floor cannot settle completeness", () => {
        const notice = rowCeilingNotice({ totalMatches: 10000, totalMatchesIsLowerBound: true, hits: [{ id: "a" }] }, { appliedRowLimit: 10, escalation: escalation });

        expect(notice.complete).toBe("unknown");
    });

    test("landing exactly on the limit this server asked for is a cut", () => {
        const notice = rowCeilingNotice(bindings(1000), { appliedRowLimit: 1000, escalation: escalation });

        expect(notice.complete).toBe(false);
        expect(notice.atKnownCeiling).toBe(true);
    });

    test("an answer carrying no rows at all gets no notice", () => {
        expect(rowCeilingNotice({ someDocument: { key: "value" } }, { appliedRowLimit: 1000, escalation: escalation })).toBeNull();
    });
});

afterAll(() => {
    jest.resetModules();
});
