// Lists the lines changed since a base commit that no test of the run executed, in the browser
// (Chromium coverage the spec writes) and on the server side (NODE_V8_COVERAGE of the sandbox server
// and of the migration runs):
//   node tests/e2e/tools/sources/groupNamedLikeSourceCoverage.js test-results/<ticket> <base commit> <node coverage folder>
// Writes couverture-diff.json in the ticket folder, read by groupNamedLikeSourceReport.js.

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

// where the sandbox server serves each browser source folder of the repo
const servedRoots = [{ urlPrefix: "http://localhost:3020/vocables/", folder: "public/vocables/" }];
// folders whose code runs in Node, in the server or in the migration
const nodeFolders = ["model/", "scripts/migrations/"];
// compiled by vite before the browser sees it: its lines cannot be matched without the source maps
const compiledFolders = ["mainapp/src/"];

const coverageFileName = "couverture.json";
const outputFileName = "couverture-diff.json";
const hunkHeaderRegex = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/;
const newFileHeaderRegex = /^\+\+\+ b\/(.+)$/;
const lineBreakRegex = /\r?\n/;
// lines without executable code: blank, comment, lone brackets and punctuation
const nonExecutableLineRegex = /^\s*(\/\/.*|\/\*.*|\*.*|[{}()[\];,]*)\s*$/;
const leadingSpacesRegex = /^\s*/;
const scriptFileRegex = /\.m?js$/;
const windowsSeparatorRegex = /\\/g;
const gitDiffMaxBufferBytes = 256 * 1024 * 1024;

function findBrowserCoverageFiles(folder, foundFiles) {
    for (const directoryEntry of fs.readdirSync(folder, { withFileTypes: true })) {
        const entryPath = path.join(folder, directoryEntry.name);
        if (directoryEntry.isDirectory()) {
            findBrowserCoverageFiles(entryPath, foundFiles);
        } else if (directoryEntry.name === coverageFileName) {
            foundFiles.push(entryPath);
        }
    }
    return foundFiles;
}

function repoPathOfBrowserUrl(url) {
    const servedRoot = servedRoots.find((candidateRoot) => url.startsWith(candidateRoot.urlPrefix));
    if (!servedRoot) {
        return null;
    }
    const urlWithoutQuery = url.split("?")[0];
    return servedRoot.folder + urlWithoutQuery.slice(servedRoot.urlPrefix.length);
}

function repoPathOfNodeUrl(url) {
    if (!url.startsWith("file://")) {
        return null;
    }
    const relativePath = path.relative(process.cwd(), fileURLToPath(url));
    return relativePath.replace(windowsSeparatorRegex, "/");
}

// changed line numbers per repo file, from the diff against the base plus untracked files
function changedLinesByFile(baseCommit) {
    const diffFolders = [...servedRoots.map((servedRoot) => servedRoot.folder), ...nodeFolders, ...compiledFolders];
    const quotedFolders = diffFolders.map((folder) => `"${folder}"`);
    const diffText = execSync(`git diff -U0 ${baseCommit} -- ${quotedFolders.join(" ")}`, { maxBuffer: gitDiffMaxBufferBytes }).toString();
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
    const untrackedText = execSync(`git ls-files --others --exclude-standard -- ${quotedFolders.join(" ")}`)
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

function addCoverageEntry(coverageEntriesByFile, repoPath, coverageEntry) {
    coverageEntriesByFile[repoPath] = coverageEntriesByFile[repoPath] || [];
    coverageEntriesByFile[repoPath].push(coverageEntry);
}

const ticketFolder = process.argv[2];
const baseCommit = process.argv[3];
const nodeCoverageFolder = process.argv[4];
if (!ticketFolder || !baseCommit || !nodeCoverageFolder) {
    console.error("usage: node groupNamedLikeSourceCoverage.js <ticket folder> <base commit> <node coverage folder>");
    process.exit(1);
}

const coverageEntriesByFile = {};
for (const coverageFile of findBrowserCoverageFiles(ticketFolder, [])) {
    for (const coverageEntry of JSON.parse(fs.readFileSync(coverageFile, "utf8"))) {
        const repoPath = repoPathOfBrowserUrl(coverageEntry.url);
        if (repoPath) {
            addCoverageEntry(coverageEntriesByFile, repoPath, coverageEntry);
        }
    }
}
// Node coverage carries no source: the file on disk is the one that ran
for (const nodeCoverageFile of fs.readdirSync(nodeCoverageFolder)) {
    const nodeCoverage = JSON.parse(fs.readFileSync(path.join(nodeCoverageFolder, nodeCoverageFile), "utf8"));
    for (const scriptCoverage of nodeCoverage.result) {
        const repoPath = repoPathOfNodeUrl(scriptCoverage.url);
        if (repoPath && fs.existsSync(repoPath)) {
            addCoverageEntry(coverageEntriesByFile, repoPath, { ...scriptCoverage, source: fs.readFileSync(repoPath, "utf8") });
        }
    }
}

const uncoveredLines = [];
const unmeasuredFiles = [];
let checkedLineCount = 0;
for (const [repoPath, changedLines] of Object.entries(changedLinesByFile(baseCommit))) {
    if (compiledFolders.some((folder) => repoPath.startsWith(folder))) {
        unmeasuredFiles.push(repoPath);
        continue;
    }
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
