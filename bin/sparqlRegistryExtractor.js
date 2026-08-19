/**
 * Generates bin/sparqlRegistry.json by static analysis (regex) of the SPARQL proxy modules.
 *
 * For each public function found (self.X = function(...)), it extracts:
 *   - name, params (from the function signature — always in sync)
 *   - description, typed params, responseSchema, expose, example (from JSDoc if present)
 *   - access, mcpTool, mcpFixed — the MCP projection, see below
 *
 * The MCP server builds its whole tool catalog from this registry, so everything an agent needs to
 * know about a SPARQL function is declared in that function's JSDoc and nowhere else:
 *
 *   @expose read | write     mandatory argument: what the function does to the triple store.
 *                            The MCP is read-only, so `write` never becomes an agent tool.
 *   @mcpTool <name>          promotes the function to a first-class MCP tool under that name.
 *                            Without it, the function stays reachable through the generic runner.
 *   @mcpFixed <target>=<v>   forces a parameter or an `options` key, whatever the agent sends.
 *                            Target is a signature parameter name or `options.<key>`.
 *
 * A promoted function's JSDoc is what the agent reads, verbatim and untruncated: if the summary is
 * wrong for an agent, the JSDoc is wrong for a human too. Its first paragraph is the summary and
 * everything after the first blank line is human-only detail, which is how a function can document
 * its pagination strategy at length without spending an agent's context on it every turn.
 *
 * Run: node bin/sparqlRegistryExtractor.js
 * Output: bin/sparqlRegistry.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const DEFAULT_RESPONSE_SCHEMA = "#/definitions/SparqlQueryResponse";

const MODULES_TO_EXTRACT = [
    { moduleName: "Sparql_OWL", filePath: "public/vocables/modules/sparqlProxies/sparql_OWL.js" },
    { moduleName: "Sparql_SKOS", filePath: "public/vocables/modules/sparqlProxies/sparql_SKOS.js" },
    { moduleName: "Sparql_generic", filePath: "public/vocables/modules/sparqlProxies/sparql_generic.js" },
];

// Group 1: raw JSDoc content (everything between /** and */)
// Group 2: function name
// Group 3: raw parameter list
// The capture forbids crossing a `*/`, so the matched JSDoc is the block directly
// above `self.NAME` — never an earlier comment (e.g. the file's MIT header) bleeding in.
// Between `*/` and `self.NAME`, blank lines and `//` notes are tolerated: several functions carry
// a pending-cleanup note there, and requiring pure whitespace silently dropped them from the
// registry even though they were tagged `@expose`.
const functionWithJsdocRegex = /\/\*\*((?:(?!\*\/)[\s\S])*?)\*\/(?:\s|\/\/[^\n]*)*self\.(\w+)\s*=\s*function\s*\(([^)]*)\)/g;
const functionNoJsdocRegex = /(?<!\/\*\*[\s\S]{0,2000}\*\/\s*)self\.(\w+)\s*=\s*function\s*\(([^)]*)\)/g;

// Used to report `@expose` blocks that no function declaration follows, which would otherwise
// vanish from the registry without a trace.
const jsdocBlockRegex = /\/\*\*(?:(?!\*\/)[\s\S])*?\*\//g;
const exposeTagRegex = /@expose\b/;

const jsdocLinePrefixRegex = /^\s*\*\s?/;
const paramTagRegex = /^@param\s+\{([^}]+)\}\s+(\[?[\w.]+\]?)\s*[-–]?\s*(.*)/;
const responseSchemaTagRegex = /^@responseSchema\s+/;
const exampleTagRegex = /^@example\s*/;
const optionalBracketsRegex = /^\[|\]$/g;
const returnsTagRegex = /^@returns?\s+\{([^}]+)\}\s*(.*)/;
const exposeAccessRegex = /^@expose\s+(\w+)\s*$/;
const mcpToolTagRegex = /^@mcpTool\s+([a-zA-Z0-9_-]+)\s*$/;
const mcpFixedTagRegex = /^@mcpFixed\s+([\w.]+)\s*=\s*(.+)$/;

const accessValues = ["read", "write"];

// A promoted tool's summary is sent to the agent on every single turn, so it is budgeted here,
// where the author can see the rule, rather than truncated later by the MCP server.
const maxPromotedSummaryChars = 500;

/**
 * Parse a raw JSDoc block into structured fields.
 * @param {string} rawJsDoc - Content between /** and * / (not including delimiters)
 * @returns {{ description: string, params: object[], responseSchema: string|null, expose: boolean, access: string|null, mcpTool: string|null, mcpFixed: object|null, example: string|null }}
 */
function parseJsDoc(rawJsDoc) {
    const rawLines = rawJsDoc.split("\n");
    const strippedLines = rawLines.map((line) => line.replace(jsdocLinePrefixRegex, "").trim());

    let description = "";
    let summary = "";
    let reachedSecondParagraph = false;
    const params = {};
    let responseSchema = null;
    let expose = false;
    let access = null;
    let mcpTool = null;
    let mcpFixed = null;
    let example = null;
    let returns = null;

    // The JSDoc description is the free-text block at the top of the comment, before any
    // `@tag`. Once a tag appears, subsequent non-@ lines belong to that tag's prose, not the
    // description — so we accumulate only the leading non-@ lines, joined with spaces.
    let seenAnyTag = false;
    for (const line of strippedLines) {
        // A blank line closes the first paragraph. Standard JSDoc convention, and the only thing
        // that lets an author write a long human description whose head still reads as a summary.
        if (line.length === 0) {
            if (!seenAnyTag && description) {
                reachedSecondParagraph = true;
            }
            continue;
        }
        const isTag = line.startsWith("@");
        if (isTag) {
            seenAnyTag = true;
        }
        if (line.startsWith("@param")) {
            const paramMatch = line.match(paramTagRegex);
            if (paramMatch) {
                const [, type, rawName, paramDescription] = paramMatch;
                const isOptional = rawName.startsWith("[");
                const cleanName = rawName.replace(optionalBracketsRegex, "");

                // Dotted names (e.g. `options.filter`) are sub-fields of an object param:
                // attach them as `properties` of the parent so the catalog can show users
                // which keys an `options` object accepts instead of an opaque "Query options".
                if (cleanName.includes(".")) {
                    const firstDotIndex = cleanName.indexOf(".");
                    const parentName = cleanName.slice(0, firstDotIndex);
                    const propertyName = cleanName.slice(firstDotIndex + 1);
                    if (!params[parentName]) {
                        params[parentName] = { type: "Object", required: false, description: "", properties: {} };
                    }
                    if (!params[parentName].properties) {
                        params[parentName].properties = {};
                    }
                    params[parentName].properties[propertyName] = { type: type.trim(), required: !isOptional, description: paramDescription.trim() };
                } else {
                    const existingProperties = params[cleanName] ? params[cleanName].properties : undefined;
                    params[cleanName] = { type: type.trim(), required: !isOptional, description: paramDescription.trim() };
                    if (existingProperties) {
                        params[cleanName].properties = existingProperties;
                    }
                }
            }
        } else if (line.startsWith("@responseSchema")) {
            responseSchema = line.replace(responseSchemaTagRegex, "").trim();
        } else if (line.startsWith("@expose")) {
            expose = true;
            const accessMatch = line.match(exposeAccessRegex);
            access = accessMatch ? accessMatch[1] : null;
        } else if (line.startsWith("@mcpTool")) {
            const mcpToolMatch = line.match(mcpToolTagRegex);
            mcpTool = mcpToolMatch ? mcpToolMatch[1] : "";
        } else if (line.startsWith("@mcpFixed")) {
            const mcpFixedMatch = line.match(mcpFixedTagRegex);
            if (mcpFixedMatch) {
                const [, fixedTarget, rawFixedValue] = mcpFixedMatch;
                if (!mcpFixed) {
                    mcpFixed = {};
                }
                mcpFixed[fixedTarget] = parseTagValue(rawFixedValue.trim());
            }
        } else if (line.startsWith("@example")) {
            example = line.replace(exampleTagRegex, "").trim();
        } else if (line.startsWith("@returns") || line.startsWith("@return")) {
            const returnsMatch = line.match(returnsTagRegex);
            if (returnsMatch) {
                const [, type, returnsDescription] = returnsMatch;
                returns = {
                    type: type.trim(),
                    description: returnsDescription.trim(),
                };
            }
        } else if (!isTag && !seenAnyTag) {
            description = description ? description + " " + line : line;
            if (!reachedSecondParagraph) {
                summary = description;
            }
        }
    }
    return { description, summary, params, responseSchema, expose, access, mcpTool, mcpFixed, example, returns };
}

/**
 * Read a tag value as JSON when it is one, as a plain string otherwise, so `@mcpFixed` can carry
 * `true`, `12` or `graphs/` without the author quoting anything.
 * @param {string} rawValue
 * @returns {*}
 */
function parseTagValue(rawValue) {
    try {
        return JSON.parse(rawValue);
    } catch {
        return rawValue;
    }
}

/**
 * Extract all public functions from a file's source text.
 * @param {string} source - File content
 * @param {string} moduleName
 * @returns {object[]} Registry entries
 */
function extractFunctions(source, moduleName) {
    const entries = [];
    const seenNames = new Set();
    const attachedJsDocOffsets = new Set();

    let match;
    functionWithJsdocRegex.lastIndex = 0;

    while ((match = functionWithJsdocRegex.exec(source)) !== null) {
        const [, rawJsDoc, functionName, rawParams] = match;
        attachedJsDocOffsets.add(match.index);

        if (seenNames.has(functionName)) continue;
        seenNames.add(functionName);

        const rawParamTokens = rawParams.split(",");
        const trimmedParams = rawParamTokens.map((paramToken) => paramToken.trim());
        const signatureParams = trimmedParams.filter(Boolean);

        // Strip callback — always the last arg, handled by the system
        const isCallbackParam = (paramName) => paramName === "callback" || paramName.startsWith("callback");
        const exposedSignatureParams = signatureParams.filter((paramName) => !isCallbackParam(paramName));

        const jsDoc = parseJsDoc(rawJsDoc);

        // Merge signature params with JSDoc types (signature is authoritative for names/order)
        const mergedParams = exposedSignatureParams.map((paramName) => {
            const jsDocParam = jsDoc.params[paramName];
            const mergedParam = {
                name: paramName,
                type: jsDocParam ? jsDocParam.type : "any",
                required: jsDocParam ? jsDocParam.required : paramName !== "options",
                description: jsDocParam ? jsDocParam.description : "",
            };
            if (jsDocParam && jsDocParam.properties) {
                const propertyEntries = Object.entries(jsDocParam.properties);
                const propertyList = propertyEntries.map(([propertyName, property]) => ({
                    name: propertyName,
                    type: property.type,
                    required: property.required,
                    description: property.description,
                }));
                mergedParam.properties = propertyList;
            }
            return mergedParam;
        });

        const entry = {
            name: functionName,
            module: moduleName,
            description: jsDoc.description || "",
            params: mergedParams,
            returns: jsDoc.returns || null,
            responseSchema: jsDoc.responseSchema || DEFAULT_RESPONSE_SCHEMA,
            expose: jsDoc.expose,
            example: jsDoc.example || null,
        };
        // Only when the author actually wrote a second paragraph: otherwise the summary would
        // duplicate the description in every one of the 78 entries.
        if (jsDoc.summary && jsDoc.summary !== jsDoc.description) {
            entry.summary = jsDoc.summary;
        }
        if (jsDoc.expose) {
            entry.access = jsDoc.access;
        }
        if (jsDoc.mcpTool !== null) {
            entry.mcpTool = jsDoc.mcpTool;
        }
        if (jsDoc.mcpFixed) {
            entry.mcpFixed = jsDoc.mcpFixed;
        }
        assertMcpTagsAreUsable(entry, moduleName);
        entries.push(entry);
    }

    warnOnOrphanExposeBlocks(source, moduleName, attachedJsDocOffsets);

    return entries;
}

/**
 * Fail the extraction on an MCP tag that cannot be honoured, naming the function.
 *
 * These throw rather than warn because each one silently changes what an agent can reach: a bare
 * `@expose` would let a new write operation become an agent tool without anyone deciding it, and a
 * `@mcpFixed` aimed at a parameter that no longer exists would be forwarded to SPARQL as garbage.
 * @param {object} entry - Registry entry, already assembled
 * @param {string} moduleName
 */
function assertMcpTagsAreUsable(entry, moduleName) {
    const functionKey = `${moduleName}.${entry.name}`;

    if (entry.expose && !accessValues.includes(entry.access)) {
        throw new Error(`[${functionKey}] @expose needs an access argument: write "@expose read" or "@expose write" depending on what the function does to the triple store.`);
    }
    if (entry.mcpTool === "") {
        throw new Error(`[${functionKey}] @mcpTool needs a tool name matching [a-zA-Z0-9_-], for instance "@mcpTool sls_top_concepts".`);
    }
    if (entry.mcpTool && entry.access !== "read") {
        throw new Error(`[${functionKey}] @mcpTool requires "@expose read": the MCP server is read-only, so a write operation cannot become an agent tool.`);
    }
    if (entry.mcpTool) {
        const promotedSummary = entry.summary || entry.description;
        if (promotedSummary.length > maxPromotedSummaryChars) {
            throw new Error(
                `[${functionKey}] the summary an agent reads is ${promotedSummary.length} characters, over the ${maxPromotedSummaryChars} budget. ` +
                    `Insert a blank JSDoc line after the first paragraph: everything below it stays in the human description only.`,
            );
        }
    }
    if (!entry.mcpFixed) {
        return;
    }

    const optionsParam = entry.params.find((param) => param.name === "options");
    for (const fixedTarget of Object.keys(entry.mcpFixed)) {
        const dotIndex = fixedTarget.indexOf(".");
        if (dotIndex < 0) {
            if (!entry.params.some((param) => param.name === fixedTarget)) {
                throw new Error(`[${functionKey}] @mcpFixed targets "${fixedTarget}", which is not a parameter of this function.`);
            }
            continue;
        }
        const containerName = fixedTarget.slice(0, dotIndex);
        if (containerName !== "options" || !optionsParam) {
            throw new Error(`[${functionKey}] @mcpFixed targets "${fixedTarget}": only a parameter name or "options.<key>" is supported, and the function must accept an options parameter.`);
        }
    }
}

/**
 * Report every `@expose` JSDoc block that no `self.NAME = function (...)` declaration follows.
 * Such a block produces no registry entry, so the function stays invisible to the API even though
 * its author asked for it to be exposed.
 * @param {string} source - File content
 * @param {string} moduleName
 * @param {Set<number>} attachedJsDocOffsets - Start offsets of the blocks that did yield an entry
 */
function warnOnOrphanExposeBlocks(source, moduleName, attachedJsDocOffsets) {
    jsdocBlockRegex.lastIndex = 0;
    let block;
    while ((block = jsdocBlockRegex.exec(source)) !== null) {
        if (!exposeTagRegex.test(block[0])) continue;
        if (attachedJsDocOffsets.has(block.index)) continue;

        const textBeforeBlock = source.slice(0, block.index);
        const lineNumber = textBeforeBlock.split("\n").length;
        console.warn(`[${moduleName}] orphan @expose block at line ${lineNumber}: no "self.NAME = function (...)" follows it — the function will be missing from the registry`);
    }
}

/**
 * Build the registry in memory, without writing anything to disk.
 * The MCP server calls this at startup so its catalog can never drift from bin/sparqlRegistry.json.
 * @param {boolean} [quiet] - Suppress the per-module extraction logs
 * @returns {object[]} Registry entries, in the same order as the generated JSON file
 */
function buildRegistry(quiet) {
    const registry = [];

    for (const { moduleName, filePath } of MODULES_TO_EXTRACT) {
        const absolutePath = path.join(projectRoot, filePath);
        if (!fs.existsSync(absolutePath)) {
            console.warn(`[skip] ${filePath} not found`);
            continue;
        }
        const source = fs.readFileSync(absolutePath, "utf8");
        const entries = extractFunctions(source, moduleName);
        if (!quiet) {
            console.log(`[${moduleName}] extracted ${entries.length} functions`);
        }
        registry.push(...entries);
    }

    return registry;
}

function main() {
    const registry = buildRegistry();

    const outputPath = path.join(projectRoot, "bin", "sparqlRegistry.json");
    // 4-space indent + trailing newline so the generated file is already Prettier-compliant
    // (tabWidth 4 in .prettierrc.yaml) and `npm run prettier:check` stays green without a
    // reformatting pass after every extraction.
    fs.writeFileSync(outputPath, JSON.stringify(registry, null, 4) + "\n");
    console.log(`\nRegistry written to ${outputPath} (${registry.length} total entries)`);
    console.log(`Exposed (expose: true): ${registry.filter((entry) => entry.expose).length}`);
    console.log(`Without JSDoc description: ${registry.filter((entry) => !entry.description).length} — add @expose + description to include in API`);
}

// ESM has no require.main: only write the file when the script is the process entry point,
// so that importing buildRegistry() never touches the disk.
const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
    main();
}

export { parseJsDoc, extractFunctions, buildRegistry, MODULES_TO_EXTRACT };
