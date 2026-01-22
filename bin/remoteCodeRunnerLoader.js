// Custom ESM loader to remap paths for remoteCodeRunner
// This rewrites imports to point to the correct location in the project

import { fileURLToPath } from "node:url";
import path from "node:path";

// Get project root (parent of bin/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

export async function resolve(specifier, context, nextResolve) {
    // Handle absolute paths like "/vocables/modules/..."
    // These are browser paths that need to map to public/vocables/...
    if (specifier.startsWith("/vocables/")) {
        const absolutePath = path.join(projectRoot, "public", specifier);
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

    return nextResolve(specifier, context);
}
