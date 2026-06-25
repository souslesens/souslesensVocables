/**
 * Generates bin/sparqlRegistry.json by static analysis (regex) of the SPARQL proxy modules.
 *
 * For each public function found (self.X = function(...)), it extracts:
 *   - name, params (from the function signature — always in sync)
 *   - description, typed params, responseSchema, expose, example (from JSDoc if present)
 *
 * Run: node bin/sparqlRegistryExtractor.js
 * Output: bin/sparqlRegistry.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
const functionWithJsdocRegex = /\/\*\*((?:(?!\*\/)[\s\S])*?)\*\/\s*self\.(\w+)\s*=\s*function\s*\(([^)]*)\)/g;
const functionNoJsdocRegex = /(?<!\/\*\*[\s\S]{0,2000}\*\/\s*)self\.(\w+)\s*=\s*function\s*\(([^)]*)\)/g;

const jsdocLinePrefixRegex = /^\s*\*\s?/;
const paramTagRegex = /^@param\s+\{([^}]+)\}\s+(\[?[\w.]+\]?)\s*[-–]?\s*(.*)/;
const responseSchemaTagRegex = /^@responseSchema\s+/;
const exampleTagRegex = /^@example\s*/;
const optionalBracketsRegex = /^\[|\]$/g;

/**
 * Parse a raw JSDoc block into structured fields.
 * @param {string} rawJsDoc - Content between /** and * / (not including delimiters)
 * @returns {{ description: string, params: object[], responseSchema: string|null, expose: boolean, example: string|null }}
 */
function parseJsDoc(rawJsDoc) {
    const rawLines = rawJsDoc.split("\n");
    const strippedLines = rawLines.map((line) => line.replace(jsdocLinePrefixRegex, "").trim());
    const nonEmptyLines = strippedLines.filter((line) => line.length > 0);

    let description = "";
    const params = {};
    let responseSchema = null;
    let expose = false;
    let example = null;

    for (const line of nonEmptyLines) {
        if (line.startsWith("@param")) {
            const paramMatch = line.match(paramTagRegex);
            if (paramMatch) {
                const [, type, rawName, description] = paramMatch;
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
                    params[parentName].properties[propertyName] = { type: type.trim(), required: !isOptional, description: description.trim() };
                } else {
                    const existingProperties = params[cleanName] ? params[cleanName].properties : undefined;
                    params[cleanName] = { type: type.trim(), required: !isOptional, description: description.trim() };
                    if (existingProperties) {
                        params[cleanName].properties = existingProperties;
                    }
                }
            }
        } else if (line.startsWith("@responseSchema")) {
            responseSchema = line.replace(responseSchemaTagRegex, "").trim();
        } else if (line.startsWith("@expose")) {
            expose = true;
        } else if (line.startsWith("@example")) {
            example = line.replace(exampleTagRegex, "").trim();
        } else if (!line.startsWith("@") && !line.startsWith("*")) {
            if (!description) {
                description = line;
            }
        }
    }

    return { description, params, responseSchema, expose, example };
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

    let match;
    functionWithJsdocRegex.lastIndex = 0;

    while ((match = functionWithJsdocRegex.exec(source)) !== null) {
        const [, rawJsDoc, functionName, rawParams] = match;

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

        entries.push({
            name: functionName,
            module: moduleName,
            description: jsDoc.description || "",
            params: mergedParams,
            responseSchema: jsDoc.responseSchema || DEFAULT_RESPONSE_SCHEMA,
            expose: jsDoc.expose,
            example: jsDoc.example || null,
        });
    }

    return entries;
}

function main() {
    const registry = [];

    for (const { moduleName, filePath } of MODULES_TO_EXTRACT) {
        const absolutePath = path.join(projectRoot, filePath);
        if (!fs.existsSync(absolutePath)) {
            console.warn(`[skip] ${filePath} not found`);
            continue;
        }
        const source = fs.readFileSync(absolutePath, "utf8");
        const entries = extractFunctions(source, moduleName);
        console.log(`[${moduleName}] extracted ${entries.length} functions`);
        registry.push(...entries);
    }

    const outputPath = path.join(projectRoot, "bin", "sparqlRegistry.json");
    fs.writeFileSync(outputPath, JSON.stringify(registry, null, 2));
    console.log(`\nRegistry written to ${outputPath} (${registry.length} total entries)`);
    console.log(`Exposed (expose: true): ${registry.filter((e) => e.expose).length}`);
    console.log(`Without JSDoc description: ${registry.filter((e) => !e.description).length} — add @expose + description to include in API`);
}

main();
