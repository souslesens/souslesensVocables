// PreToolUse on Read, Grep and Bash: no file or variable that holds credentials reaches the model
import { readFileSync } from "node:fs";

// the config folder at the repository root, not public/vocables/config nor the fixtures of tests/data/config
const configFolderPrefix = String.raw`(?<!vocables\/)(?<!data\/)(?<![\w.-])config\/`;
const sensitivePathRegexes = [
    new RegExp(configFolderPrefix + String.raw`(mainConfig|sources|databases|plugins|wordpress)[\w.-]*`, "i"),
    new RegExp(configFolderPrefix + String.raw`users\/`, "i"),
    /(?<![\w.-])\.env(\.[\w.-]+)?(?![\w.-])/i,
    /[\w.-]+\.env(?![\w.-])/i,
    /[\w.-]+\.(pem|key|p12|pfx)(?![\w.-])/i,
    /(?<![\w.-])(id_rsa|id_ed25519|\.netrc|\.npmrc|credentials\.json|\.aws\/credentials)(?![\w.-])/i,
];
// what a Bash command may not do, whatever file it names
const sensitiveCommandRegexes = [
    /SLS_SECRET_KEY/,
    /(^|[;&|]\s*)(printenv|env|set|export\s+-p)\s*($|[;&|>])/,
    /\/proc\/[\w/]*environ/,
    /(^|[\s;&|])env:/i,
];
// the masked view of a config file
const showConfigCommandRegex = /^\s*node\s+\S*show-config\.mjs\s+[^;&|><`$]+$/;
const listingOnlyCommandRegex = /^\s*(ls|dir|stat|wc\s+-[cl]|du|test|git\s+check-ignore|git\s+status)\b/;
const shellChainingRegex = /[;&|><`]|\$\(/;
const toolsReadingPaths = { Read: "file_path", Grep: "path" };

function normalize(text) {
    const backslash = String.fromCharCode(92);
    const withForwardSlashes = text.replaceAll(backslash, "/");
    return withForwardSlashes;
}

function findMatch(regexes, text) {
    const matchingRegex = regexes.find((candidateRegex) => candidateRegex.test(text));
    const match = matchingRegex ? text.match(matchingRegex)[0].trim() : null;
    return match;
}

function block(match) {
    console.error(
        "Blocked: " + match + " can hold credentials. For a config file, run: node .claude/hooks/show-config.mjs <file> (credentials masked). Structure also in config_templates/*.default and model/config.js. The code reads the real values at runtime.",
    );
    process.exit(2);
}

try {
    const hookInput = JSON.parse(readFileSync(0, "utf8") || "{}");
    const toolName = hookInput.tool_name;
    const toolInput = hookInput.tool_input || {};
    if (toolName === "Bash") {
        const command = normalize(toolInput.command || "");
        const isMaskedView = showConfigCommandRegex.test(command);
        const isListingOnly = listingOnlyCommandRegex.test(command) && !shellChainingRegex.test(command);
        const sensitiveCommand = findMatch(sensitiveCommandRegexes, command);
        const sensitivePath = findMatch(sensitivePathRegexes, command);
        if (sensitiveCommand && !isMaskedView) {
            block(sensitiveCommand);
        }
        if (sensitivePath && !isMaskedView && !isListingOnly) {
            block(sensitivePath);
        }
    } else if (toolsReadingPaths[toolName]) {
        const pathValue = normalize(toolInput[toolsReadingPaths[toolName]] || "");
        const globValue = normalize(toolInput.glob || "");
        const sensitivePath = findMatch(sensitivePathRegexes, pathValue) || findMatch(sensitivePathRegexes, globValue);
        if (sensitivePath) {
            block(sensitivePath);
        }
    }
} catch (error) {
    console.error("block-sensitive-reads: " + error.message);
}
