// node .claude/hooks/show-config.mjs <file>: the structure of a config file, credentials masked
import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";

const maskedValue = "***";
const credentialKeyRegex = /pass(word|wd)?|secret|token|api_?key|private_?key|credential|dsn|salt|^user(name)?$|^login$|client_?id/i;
// files where every value is a credential or a personal detail: only the keys are shown
const maskEveryValueRegex = /^(databases|users|plugins|wordpress)|\.env$/i;
const envFileRegex = /\.env$/i;
const envLineRegex = /^(\s*(?:export\s+)?[\w.-]+\s*=).*$/;
const urlCredentialsRegex = /(:\/\/)[^/@\s]+@/g;
const usersFolderRegex = /(^|[/\\])users[/\\]/;

function maskNode(node, shouldMaskEveryValue) {
    if (Array.isArray(node)) {
        const maskedItems = node.map((item) => maskNode(item, shouldMaskEveryValue));
        return maskedItems;
    }
    if (node !== null && typeof node === "object") {
        const maskedEntries = {};
        for (const [key, value] of Object.entries(node)) {
            maskedEntries[key] = maskNode(value, shouldMaskEveryValue || credentialKeyRegex.test(key));
        }
        return maskedEntries;
    }
    if (shouldMaskEveryValue) {
        return maskedValue;
    }
    const leafWithoutUrlCredentials = typeof node === "string" ? node.replace(urlCredentialsRegex, "$1" + maskedValue + "@") : node;
    return leafWithoutUrlCredentials;
}

const filePath = process.argv[2];
if (!filePath || !existsSync(filePath)) {
    console.error("Usage: node .claude/hooks/show-config.mjs <existing file>");
    process.exit(1);
}
const fileName = basename(filePath);
const shouldMaskEveryValue = maskEveryValueRegex.test(fileName) || usersFolderRegex.test(filePath);
const fileText = readFileSync(filePath, "utf8");
if (envFileRegex.test(fileName)) {
    const fileLines = fileText.split("\n");
    const maskedLines = fileLines.map((line) => line.replace(envLineRegex, "$1" + maskedValue));
    console.log(maskedLines.join("\n"));
} else {
    const parsedFile = JSON.parse(fileText);
    const maskedFile = maskNode(parsedFile, shouldMaskEveryValue);
    console.log(JSON.stringify(maskedFile, null, 2));
}
