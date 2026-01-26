// Custom ESM loader to remap paths for remoteCodeRunner
// This rewrites imports to point to the correct location in the project

import { fileURLToPath } from "node:url";
import path from "node:path";

// Get project root (parent of bin/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// List of browser-only modules that should be stubbed in Node.js
const browserOnlyModules = [
    "kg_upload_app.js",
    "mappingModeler_upload_app.js",
];

export async function resolve(specifier, context, nextResolve) {
    // Skip browser-only React apps - return a stub module
    if (browserOnlyModules.some(mod => specifier.includes(mod))) {
        // Return a data URL with an empty module
        return {
            url: "data:text/javascript,export default {};",
            shortCircuit: true
        };
    }

    // Handle absolute paths like "/vocables/modules/..."
    // These are browser paths that need to map to public/vocables/...
    if (specifier.startsWith("/vocables/")) {
        const absolutePath = path.join(projectRoot, "public", specifier);
        const fileUrl = "file:///" + absolutePath.replace(/\\/g, "/");
        return { url: fileUrl, shortCircuit: true };
    }

    // Handle absolute paths like "/assets/..."
    // These are browser paths that need to map to mainapp/static/assets/...
    // (React apps built by Vite are served from mainapp/static/)
    if (specifier.startsWith("/assets/")) {
        const absolutePath = path.join(projectRoot, "mainapp", "static", specifier);
        const fileUrl = "file:///" + absolutePath.replace(/\\/g, "/");
        return { url: fileUrl, shortCircuit: true };
    }

    // Handle relative paths like "../../../vocables/..." from plugins
    // These should map to public/vocables/...
    if (specifier.includes("/vocables/") && !specifier.includes("public/vocables")) {
        // Extract the vocables path part
        const vocablesIndex = specifier.indexOf("/vocables/");
        const vocablesPath = specifier.substring(vocablesIndex);
        const absolutePath = path.join(projectRoot, "public", vocablesPath);
        const fileUrl = "file:///" + absolutePath.replace(/\\/g, "/");
        return { url: fileUrl, shortCircuit: true };
    }

    // Handle relative paths like "../../../assets/..." from plugins
    // These should map to mainapp/static/assets/...
    if (specifier.includes("/assets/") && !specifier.includes("static/assets")) {
        const assetsIndex = specifier.indexOf("/assets/");
        const assetsPath = specifier.substring(assetsIndex);
        const absolutePath = path.join(projectRoot, "mainapp", "static", assetsPath);
        const fileUrl = "file:///" + absolutePath.replace(/\\/g, "/");
        return { url: fileUrl, shortCircuit: true };
    }

    return nextResolve(specifier, context);
}
