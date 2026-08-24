import { applySizeGuard } from "../../bin/MCP/mcpServer.js";

// The two cuts an answer can suffer, and the sentence that used to conflate them: `truncation`
// counts the rows the tool handed the server, `rowCeiling` says whether the query behind them
// returned everything. A payload count read as a result total is how 10000 notifications were once
// reported as the whole set, against 100741.
describe("the size guard counts the payload, not the result set", () => {
    function wideRows(rowCount) {
        const rows = [];
        for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
            rows.push({ id: `http://example.org/notif-${rowIndex}`, label: `Notification number ${rowIndex}`, description: "x".repeat(200) });
        }
        return rows;
    }

    test("totalRows is the row count of what the tool returned, cut or not", () => {
        const guarded = applySizeGuard(wideRows(5000), 20000, "sls_run_query_function", false);

        expect(guarded.truncation.truncated).toBe(true);
        expect(guarded.truncation.totalRows).toBe(5000);
        expect(guarded.truncation.returnedRows).toBeLessThan(5000);
    });

    test("an answer inside the budget is not truncated and claims no total at all", () => {
        const guarded = applySizeGuard(wideRows(3), 20000, "sls_run_query_function", false);

        expect(guarded.truncation.truncated).toBe(false);
        expect(guarded.truncation.totalRows).toBeUndefined();
    });
});
