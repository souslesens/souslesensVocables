// Custom ESM loader to remap paths for remoteCodeRunner
// This rewrites imports to point to the correct location in the project

import { fileURLToPath } from "node:url";
import path from "node:path";

// Get project root (parent of bin/)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

// Browser-only modules that should be stubbed in Node.js
const BROWSER_ONLY_MODULES = ["kg_upload_app.js", "mappingModeler_upload_app.js"];

// Stub module returned for browser-only imports
const STUB_MODULE = { url: "data:text/javascript,export default {};", shortCircuit: true };

/**
 * Build a file:// URL from an absolute path
 * @param {string} absolutePath - The absolute file path
 * @returns {object} Resolver result with url and shortCircuit
 */
function buildFileUrl(absolutePath) {
    const fileUrl = "file:///" + absolutePath.replace(/\\/g, "/");
    return { url: fileUrl, shortCircuit: true };
}

/**
 * Resolve a path segment to a project directory
 * @param {string} specifier - The import specifier
 * @param {string} pathSegment - The path segment to find (e.g., "/vocables/")
 * @param {string[]} targetDirs - The target directories in project (e.g., ["public"])
 * @param {string[]} excludePatterns - Patterns that indicate path is already resolved
 * @returns {object|null} Resolver result or null if not matched
 */
function resolvePathSegment(specifier, pathSegment, targetDirs, excludePatterns) {
    const hasSegment = specifier.includes(pathSegment) || specifier.startsWith(pathSegment);
    const isExcluded = excludePatterns.some((pattern) => specifier.includes(pattern));

    if (hasSegment && !isExcluded) {
        const segmentIndex = specifier.indexOf(pathSegment);
        const relativePath = specifier.substring(segmentIndex);
        const absolutePath = path.join(projectRoot, ...targetDirs, relativePath);
        return buildFileUrl(absolutePath);
    }
    return null;
}

export async function resolve(specifier, context, nextResolve) {
    // Skip browser-only React apps - return a stub module
    if (BROWSER_ONLY_MODULES.some((mod) => specifier.includes(mod))) {
        return STUB_MODULE;
    }

    // Handle /vocables/ paths -> public/vocables/
    const vocablesResult = resolvePathSegment(specifier, "/vocables/", ["public"], ["public/vocables"]);
    if (vocablesResult) return vocablesResult;

    // Handle /assets/ paths -> mainapp/static/assets/
    const assetsResult = resolvePathSegment(specifier, "/assets/", ["mainapp", "static"], ["static/assets"]);
    if (assetsResult) return assetsResult;

    return nextResolve(specifier, context);
}
