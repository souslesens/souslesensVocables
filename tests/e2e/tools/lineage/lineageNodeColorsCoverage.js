// Lists the lines changed since a base commit that no test of the run executed.
// Copied from the rdd-preuves model, servedRoots and ticketFiles filled, then after the spec run:
//   node <this script> rdd/<ticket> <base commit>
// Reads every couverture.json the tests wrote under the ticket folder (Chromium JS coverage,
// see rdd-tests) and writes couverture-diff.json there, read by the report script.

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// ---- configuration of the project ------------------------------------------------------------

// the application address, from the same variables as lineageNodeColors.spec.js
const baseUrl = process.env.SLS_URL || process.env.TEST_BASE_URL || "http://localhost:3010";
// where the application serves each source folder of the repo
const servedRoots = [{ urlPrefix: baseUrl + "/vocables/", folder: "public/vocables/" }];
// the files this ticket changes, other tickets also touch public/vocables/
const ticketFiles = [
    "public/vocables/modules/tools/lineage/lineage_decoration.js",
    "public/vocables/modules/tools/lineage/lineage_sources.js",
    "public/vocables/modules/tools/lineage/lineage_whiteboard.js",
];

// ---- computation -----------------------------------------------------------------------------

const coverageFileName = "couverture.json";
const outputFileName = "couverture-diff.json";
const hunkHeaderRegex = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/;
const newFileHeaderRegex = /^\+\+\+ b\/(.+)$/;
const lineBreakRegex = /\r?\n/;
// lines without executable code: blank, comment, lone brackets and punctuation
const nonExecutableLineRegex = /^\s*(\/\/.*|\/\*.*|\*.*|[{}()[\];,]*)\s*$/;
const leadingSpacesRegex = /^\s*/;
// only script files carry V8 coverage, a changed template or stylesheet is not measured
const scriptFileRegex = /\.m?js$/;
const gitDiffMaxBufferBytes = 256 * 1024 * 1024;

function findCoverageFiles(folder, foundFiles) {
    for (const directoryEntry of fs.readdirSync(folder, { withFileTypes: true })) {
        const entryPath = path.join(folder, directoryEntry.name);
        if (directoryEntry.isDirectory()) {
            findCoverageFiles(entryPath, foundFiles);
        } else if (directoryEntry.name === coverageFileName) {
            foundFiles.push(entryPath);
        }
    }
    return foundFiles;
}

function repoPathOfUrl(url) {
    const servedRoot = servedRoots.find((candidateRoot) => url.startsWith(candidateRoot.urlPrefix));
    if (!servedRoot) {
        return null;
    }
    const urlWithoutQuery = url.split("?")[0];
    return servedRoot.folder + urlWithoutQuery.slice(servedRoot.urlPrefix.length);
}

// changed line numbers per repo file, from the diff against the base plus untracked files
function changedLinesByFile(baseCommit) {
    const quotedTicketFiles = ticketFiles.map((ticketFile) => `"${ticketFile}"`);
    const diffText = execSync(`git diff -U0 ${baseCommit} -- ${quotedTicketFiles.join(" ")}`, { maxBuffer: gitDiffMaxBufferBytes }).toString();
    const linesByFile = {};
    let currentFile = null;
    for (const diffLine of diffText.split(lineBreakRegex)) {
        const fileMatch = diffLine.match(newFileHeaderRegex);
        if (fileMatch) {
            currentFile = fileMatch[1];
            linesByFile[currentFile] = [];
            continue;
        }
        const hunkMatch = diffLine.match(hunkHeaderRegex);
        if (!hunkMatch || !currentFile) {
            continue;
        }
        const [, firstLineText, lineCountText] = hunkMatch;
        const firstLine = Number(firstLineText);
        const lineCount = lineCountText === undefined ? 1 : Number(lineCountText);
        for (let lineNumber = firstLine; lineNumber < firstLine + lineCount; lineNumber++) {
            linesByFile[currentFile].push(lineNumber);
        }
    }
    const untrackedText = execSync(`git ls-files --others --exclude-standard -- ${quotedTicketFiles.join(" ")}`)
        .toString()
        .trim();
    const untrackedFiles = untrackedText ? untrackedText.split(lineBreakRegex) : [];
    for (const untrackedFile of untrackedFiles) {
        const lineTotal = fs.readFileSync(untrackedFile, "utf8").split(lineBreakRegex).length;
        linesByFile[untrackedFile] = Array.from({ length: lineTotal }, (unused, lineIndex) => lineIndex + 1);
    }
    return linesByFile;
}

// V8 block coverage nests ranges: the innermost range holding an offset carries its count
function isOffsetExecuted(coverageEntry, offset) {
    let innermostRange = null;
    for (const coveredFunction of coverageEntry.functions) {
        for (const range of coveredFunction.ranges) {
            const holdsOffset = range.startOffset <= offset && offset < range.endOffset;
            const isNarrower = !innermostRange || range.endOffset - range.startOffset < innermostRange.endOffset - innermostRange.startOffset;
            if (holdsOffset && isNarrower) {
                innermostRange = range;
            }
        }
    }
    return innermostRange !== null && innermostRange.count > 0;
}

const ticketFolder = process.argv[2];
const baseCommit = process.argv[3];
if (!ticketFolder || !baseCommit) {
    console.error("usage: node <this script> <ticket folder> <base commit>");
    process.exit(1);
}

const coverageEntriesByFile = {};
for (const coverageFile of findCoverageFiles(ticketFolder, [])) {
    for (const coverageEntry of JSON.parse(fs.readFileSync(coverageFile, "utf8"))) {
        const repoPath = repoPathOfUrl(coverageEntry.url);
        if (!repoPath) {
            continue;
        }
        coverageEntriesByFile[repoPath] = coverageEntriesByFile[repoPath] || [];
        coverageEntriesByFile[repoPath].push(coverageEntry);
    }
}

const uncoveredLines = [];
// a file served transformed (bundle, minified) cannot be matched line by line without source maps
const unmeasuredFiles = [];
let checkedLineCount = 0;
for (const [repoPath, changedLines] of Object.entries(changedLinesByFile(baseCommit))) {
    if (!scriptFileRegex.test(repoPath)) {
        continue;
    }
    const diskSource = fs.readFileSync(repoPath, "utf8");
    const diskLines = diskSource.split(lineBreakRegex);
    const fileEntries = coverageEntriesByFile[repoPath] || [];
    const servedEntries = fileEntries.filter((coverageEntry) => coverageEntry.source === diskSource);
    if (fileEntries.length && !servedEntries.length) {
        unmeasuredFiles.push(repoPath);
        continue;
    }
    // offsets counted on the raw text, so a CRLF file stays aligned with the served source
    const lineStartOffsets = [0];
    for (let charIndex = diskSource.indexOf("\n"); charIndex !== -1; charIndex = diskSource.indexOf("\n", charIndex + 1)) {
        lineStartOffsets.push(charIndex + 1);
    }
    for (const lineNumber of changedLines) {
        const lineText = diskLines[lineNumber - 1];
        if (lineText === undefined || nonExecutableLineRegex.test(lineText)) {
            continue;
        }
        checkedLineCount++;
        const codeOffset = lineStartOffsets[lineNumber - 1] + lineText.match(leadingSpacesRegex)[0].length;
        const isExecuted = servedEntries.some((coverageEntry) => isOffsetExecuted(coverageEntry, codeOffset));
        if (!isExecuted) {
            uncoveredLines.push({ file: repoPath, line: lineNumber, text: lineText.trim() });
        }
    }
}

const coverageSummary = { baseCommit, checkedLineCount, uncoveredLines, unmeasuredFiles };
fs.writeFileSync(path.join(ticketFolder, outputFileName), JSON.stringify(coverageSummary, null, 2));
console.log(`${checkedLineCount} changed lines checked, ${uncoveredLines.length} never executed, ${unmeasuredFiles.length} files not measurable`);
