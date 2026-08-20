/**
 * Rows an answer could not carry, kept so the agent can come back for them.
 *
 * Until now an oversized result was halved until it fit and the remainder was dropped, with a hint
 * saying there was no way to fetch it. That is true of the response, not of the data: the rows were
 * in this process, they were simply thrown away between reading them and answering. This holds them
 * instead, and `sls_result_page` reads them back.
 *
 * In memory on purpose, never on disk. A file would buy persistence and cost a lifecycle: cleaning,
 * quota, orphans surviving a crash, a place to configure. Losing every stored result on restart is
 * the accepted price. What a restart must never do is leave the agent holding an identifier that
 * silently resolves to something else, so identifiers carry the process start time and a stale one
 * is refused by name rather than missed.
 *
 * Three ceilings keep a long-lived server from turning this into a leak: an age, a number of
 * results, and a total number of rows across all of them. Whichever bites first evicts the oldest.
 */

import { mcpConfig } from "./config.js";

// Identifiers are unique to this process, so an agent replaying one from a previous run is told the
// result expired rather than handed whatever now occupies that slot.
const processStartStamp = Date.now().toString(36);

const storedResults = new Map();
let nextResultNumber = 1;

function totalStoredRows() {
    let total = 0;
    for (const stored of storedResults.values()) {
        total += stored.rows.length;
    }
    return total;
}

/**
 * Drop what has aged out, then the oldest entries until both remaining ceilings hold.
 *
 * Insertion order is age order here: a Map iterates in insertion order and nothing is ever
 * re-inserted, so the first key is always the oldest.
 */
function evictUntilWithinCeilings(nowMs) {
    for (const [resultId, stored] of storedResults) {
        if (nowMs - stored.createdAtMs > mcpConfig.resultStoreTtlMs) {
            storedResults.delete(resultId);
        }
    }
    while (storedResults.size > mcpConfig.resultStoreMaxResults || totalStoredRows() > mcpConfig.resultStoreMaxRows) {
        const oldestResultId = storedResults.keys().next().value;
        if (oldestResultId === undefined) {
            return;
        }
        storedResults.delete(oldestResultId);
    }
}

/**
 * Keep a full row set and return the identifier that reads it back.
 *
 * @param {string} toolName - Tool the rows came from, quoted back to the agent so it knows what it holds.
 * @param {Array<object>} rows
 * @returns {string|null} Identifier, or null when the set alone is larger than the whole store allows.
 */
export function storeRows(toolName, rows) {
    const nowMs = Date.now();
    // A single set larger than the total ceiling would evict everything else and still not fit, so
    // it is refused outright: the caller then keeps the plain truncation it would have had anyway.
    if (rows.length > mcpConfig.resultStoreMaxRows) {
        return null;
    }

    const resultId = `res_${processStartStamp}_${nextResultNumber}`;
    nextResultNumber += 1;
    storedResults.set(resultId, { toolName: toolName, rows: rows, createdAtMs: nowMs });
    evictUntilWithinCeilings(nowMs);

    // Eviction can have dropped what was just added, when the store is smaller than this one set.
    return storedResults.has(resultId) ? resultId : null;
}

/**
 * True when any cell of the row contains the term, case-insensitive.
 *
 * The whole row is searched rather than a named column, because the point is to find a row without
 * knowing which field carries the word: a URI, a label and a definition all end up in the same
 * haystack. Nested values are matched on their serialised form, which is enough to locate a row and
 * lets the caller read it in full afterwards.
 */
function rowContains(row, lowerCaseTerm) {
    for (const cellValue of Object.values(row)) {
        if (cellValue === null || cellValue === undefined) {
            continue;
        }
        const cellText = typeof cellValue === "object" ? JSON.stringify(cellValue) : String(cellValue);
        if (cellText.toLowerCase().includes(lowerCaseTerm)) {
            return true;
        }
    }
    return false;
}

/**
 * Read a window of a stored result, optionally only the rows matching a term.
 *
 * Filtering happens before paging, so `offset` walks the matches and not the original rows. Both
 * counts come back: an agent that greps 18 000 rows down to 12 needs to see the 12, and an agent
 * whose term matched nothing needs to know the rows are there and the term was wrong.
 *
 * @param {string} resultId
 * @param {number} offset
 * @param {number} limit
 * @param {string} [grep] - Plain text, not a regular expression.
 * @returns {{rows: Array<object>, offset: number, returnedRows: number, matchedRows: number, totalRows: number, grep: string|null, hasMore: boolean, nextOffset: number|null, toolName: string}|null}
 */
export function readPage(resultId, offset, limit, grep) {
    evictUntilWithinCeilings(Date.now());
    const stored = storedResults.get(resultId);
    if (!stored) {
        return null;
    }

    let candidateRows = stored.rows;
    const searchTerm = typeof grep === "string" ? grep.trim() : "";
    if (searchTerm !== "") {
        const lowerCaseTerm = searchTerm.toLowerCase();
        const matchingRows = [];
        for (const row of stored.rows) {
            if (rowContains(row, lowerCaseTerm)) {
                matchingRows.push(row);
            }
        }
        candidateRows = matchingRows;
    }

    const startIndex = Math.max(0, offset);
    const endIndex = Math.min(candidateRows.length, startIndex + limit);
    const pageRows = candidateRows.slice(startIndex, endIndex);
    const hasMore = endIndex < candidateRows.length;

    return {
        rows: pageRows,
        offset: startIndex,
        returnedRows: pageRows.length,
        matchedRows: candidateRows.length,
        totalRows: stored.rows.length,
        grep: searchTerm === "" ? null : searchTerm,
        hasMore: hasMore,
        nextOffset: hasMore ? endIndex : null,
        toolName: stored.toolName,
    };
}

/** Test seam: the store is process-wide state and a suite that fills it must be able to empty it. */
export function forgetEverything() {
    storedResults.clear();
}
