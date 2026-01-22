/**
 * Script pour détecter les variables non déclarées (globales implicites)
 * et identifier celles qui pourraient poser problème si on les rend locales.
 *
 * Usage: node scripts/find-undeclared-vars.js [--fix] [--dry-run]
 *   --dry-run : Affiche les modifications sans les appliquer (défaut)
 *   --fix     : Applique les corrections automatiquement
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

// Répertoires à scanner
const dirsToScan = ["bin", "api","model","scripts"];

// Extensions à analyser
const extensions = [".js"];

// Variables globales connues de Node.js et du navigateur
const knownGlobals = new Set([
    // Node.js
    "process", "console", "Buffer", "setTimeout", "setInterval", "clearTimeout",
    "clearInterval", "setImmediate", "clearImmediate", "global", "__dirname",
    "__filename", "module", "exports", "require",
    // Browser
    "window", "document", "navigator", "location", "history", "localStorage",
    "sessionStorage", "fetch", "XMLHttpRequest", "FormData", "URL", "URLSearchParams",
    "alert", "confirm", "prompt", "self", "top", "parent", "frames",
    // Common libraries (souvent globales)
    "$", "jQuery", "d3", "vis", "Plotly", "L", "moment", "_",
    // ES built-ins
    "Object", "Array", "String", "Number", "Boolean", "Symbol", "BigInt",
    "Function", "Date", "RegExp", "Error", "TypeError", "ReferenceError",
    "SyntaxError", "RangeError", "EvalError", "URIError", "AggregateError",
    "Map", "Set", "WeakMap", "WeakSet", "Promise", "Proxy", "Reflect",
    "JSON", "Math", "Intl", "ArrayBuffer", "SharedArrayBuffer", "DataView",
    "Float32Array", "Float64Array", "Int8Array", "Int16Array", "Int32Array",
    "Uint8Array", "Uint8ClampedArray", "Uint16Array", "Uint32Array",
    "BigInt64Array", "BigUint64Array", "encodeURI", "encodeURIComponent",
    "decodeURI", "decodeURIComponent", "eval", "isFinite", "isNaN",
    "parseFloat", "parseInt", "undefined", "NaN", "Infinity",
    // Spécifiques au projet (à compléter si nécessaire)
    "Config", "Sparql_common", "Sparql_proxy", "MainController",
]);

// Résultats
const results = {
    safe: [],      // Variables qui peuvent être fixées sans risque
    risky: [],     // Variables potentiellement utilisées ailleurs (globales intentionnelles)
    errors: [],    // Erreurs de parsing
};

/**
 * Parse un fichier et trouve les assignations sans déclaration
 */
function analyzeFile(filePath) {
    let content;
    try {
        content = fs.readFileSync(filePath, "utf-8");
    } catch (e) {
        results.errors.push({ file: filePath, error: e.message });
        return [];
    }

    const lines = content.split("\n");
    const findings = [];

    // Pattern pour détecter les assignations sans déclaration
    // Cherche: début de ligne ou après ; ou { ou }, espaces, puis identifiant = valeur
    // Exclut: var/let/const/function, propriétés d'objet (xxx.yyy =), commentaires

    /**
     * Trouve la portée (scope) englobante d'une position dans le fichier.
     * Retourne les indices de début et fin de la fonction/bloc englobant.
     */
    function findEnclosingScope(content, position) {
        let depth = 0;
        let scopeStart = 0;

        // Trouver le début de la portée en remontant
        for (let i = position; i >= 0; i--) {
            const char = content[i];
            if (char === "}") depth++;
            else if (char === "{") {
                if (depth === 0) {
                    scopeStart = i;
                    break;
                }
                depth--;
            }
        }

        // Trouver la fin de la portée en descendant
        depth = 0;
        let scopeEnd = content.length;
        for (let i = scopeStart; i < content.length; i++) {
            const char = content[i];
            if (char === "{") depth++;
            else if (char === "}") {
                depth--;
                if (depth === 0) {
                    scopeEnd = i;
                    break;
                }
            }
        }

        return { start: scopeStart, end: scopeEnd };
    }

    /**
     * Collecte les variables déclarées dans une portion de code (scope).
     */
    function collectDeclaredVarsInScope(scopeContent) {
        const declaredVars = new Set();

        // Déclarations var/let/const (simples et groupées)
        const declPattern = /\b(?:var|let|const)\s+([^;]+)/g;
        let m;
        while ((m = declPattern.exec(scopeContent)) !== null) {
            if (m[1]) {
                // Parser les déclarations chaînées avec virgule
                let depth = 0;
                let current = "";
                const parts = [];

                for (const char of m[1]) {
                    if (char === "(" || char === "[" || char === "{") {
                        depth++;
                        current += char;
                    } else if (char === ")" || char === "]" || char === "}") {
                        depth--;
                        current += char;
                    } else if (char === "," && depth === 0) {
                        parts.push(current.trim());
                        current = "";
                    } else {
                        current += char;
                    }
                }
                if (current.trim()) {
                    parts.push(current.trim());
                }

                for (const part of parts) {
                    const varName = part.split(/\s*=/)[0].trim();
                    if (varName && /^\w+$/.test(varName)) {
                        declaredVars.add(varName);
                    }
                }
            }
        }

        // Paramètres de fonctions dans ce scope
        const funcParamPattern = /function\s*\w*\s*\(([^)]*)\)/g;
        while ((m = funcParamPattern.exec(scopeContent)) !== null) {
            if (m[1]) {
                m[1].split(",").forEach(p => {
                    const param = p.trim().split("=")[0].trim();
                    if (param && /^\w+$/.test(param)) declaredVars.add(param);
                });
            }
        }

        // Arrow functions
        const arrowParamPattern = /\(([^)]*)\)\s*=>/g;
        while ((m = arrowParamPattern.exec(scopeContent)) !== null) {
            if (m[1]) {
                m[1].split(",").forEach(p => {
                    const param = p.trim().split("=")[0].trim();
                    if (param && /^\w+$/.test(param)) declaredVars.add(param);
                });
            }
        }

        // Variables de boucles for..in/of
        const forInPattern = /for\s*\(\s*(?:var|let|const)?\s*(\w+)\s+(?:in|of)/g;
        while ((m = forInPattern.exec(scopeContent)) !== null) {
            if (m[1]) declaredVars.add(m[1]);
        }

        return declaredVars;
    }

    /**
     * Vérifie si une variable est déclarée dans la portée englobante
     * (en remontant jusqu'à la racine du fichier).
     */
    function isVarDeclaredInScope(content, varName, position) {
        // D'abord, vérifier le scope du module (tout le contenu avant la position)
        // C'est important car les variables déclarées au niveau module sont accessibles partout
        const moduleContent = content.substring(0, position);
        const moduleVars = collectDeclaredVarsInScope(moduleContent);
        if (moduleVars.has(varName)) {
            return true;
        }

        // Ensuite, vérifier les scopes imbriqués (pour les variables locales)
        // Trouver toutes les accolades ouvrantes avant cette position
        const bracePositions = [];
        for (let i = 0; i < position; i++) {
            if (content[i] === "{") {
                bracePositions.push(i);
            } else if (content[i] === "}") {
                bracePositions.pop();
            }
        }

        // Vérifier chaque scope imbriqué
        for (let i = bracePositions.length - 1; i >= 0; i--) {
            const scopeStart = bracePositions[i];
            const scope = findEnclosingScope(content, scopeStart + 1);
            const scopeContent = content.substring(scope.start, Math.min(scope.end, position));

            const declaredInScope = collectDeclaredVarsInScope(scopeContent);
            if (declaredInScope.has(varName)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Vérifie si une position est à l'intérieur d'une classe (pour ignorer les class fields)
     */
    function isInsideClass(content, position) {
        // Chercher le mot-clé "class" avant cette position
        // et vérifier si on est dans le corps de la classe (entre { et })
        const beforePos = content.substring(0, position);

        // Trouver toutes les déclarations de classe (incluant extends)
        // Pattern amélioré pour capturer: class Name, class Name extends Parent, etc.
        const classPattern = /\bclass\s+\w+(?:\s+extends\s+[^\{]+)?\s*\{/g;
        let match;

        while ((match = classPattern.exec(beforePos)) !== null) {
            // Position de l'accolade ouvrante de la classe
            const bracePos = match.index + match[0].length - 1;

            // Vérifier si on est toujours dans cette classe
            // Compter les accolades depuis le début de la classe jusqu'à la position
            let depth = 1;
            for (let i = bracePos + 1; i < position && i < content.length; i++) {
                if (content[i] === "{") depth++;
                else if (content[i] === "}") depth--;

                if (depth === 0) {
                    // On est sorti de la classe
                    break;
                }
            }

            if (depth > 0) {
                // On est toujours dans une classe
                // Mais on doit vérifier qu'on n'est pas dans une méthode de la classe
                // Les class fields sont au niveau 1, les méthodes sont au niveau > 1

                // Recompter depuis le début de la classe
                depth = 1;
                for (let i = bracePos + 1; i < position && i < content.length; i++) {
                    if (content[i] === "{") depth++;
                    else if (content[i] === "}") depth--;
                }

                // Si depth === 1, on est au niveau du corps de la classe (class fields)
                if (depth === 1) {
                    return true;
                }
            }
        }

        return false;
    }

    // Calculer les positions de chaque ligne dans le fichier (pour la recherche de scope)
    const linePositions = [0];
    for (let i = 0; i < lines.length; i++) {
        linePositions.push(linePositions[i] + lines[i].length + 1); // +1 pour le \n
    }

    // Deuxième passe: trouver les assignations sans déclaration
    const assignmentPattern = /^(\s*)(\w+)\s*=\s*[^=]/;
    const insideObjectPattern = /^\s*\w+\s*:\s*/;

    let inMultilineComment = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const lineNum = i + 1;

        // Gérer les commentaires multi-lignes
        if (inMultilineComment) {
            if (line.includes("*/")) {
                inMultilineComment = false;
                line = line.substring(line.indexOf("*/") + 2);
            } else {
                continue;
            }
        }
        if (line.includes("/*")) {
            inMultilineComment = !line.includes("*/");
            line = line.substring(0, line.indexOf("/*"));
        }

        // Ignorer les commentaires single-line
        const commentIndex = line.indexOf("//");
        if (commentIndex !== -1) {
            line = line.substring(0, commentIndex);
        }

        // Ignorer les lignes vides
        if (!line.trim()) continue;

        // Ignorer les déclarations
        if (/^\s*(?:var|let|const|function|class|import|export)\b/.test(line)) continue;

        // Ignorer les propriétés d'objet (clé: valeur)
        if (insideObjectPattern.test(line)) continue;

        // Chercher les assignations
        const assignMatch = line.match(assignmentPattern);
        if (assignMatch) {
            const indent = assignMatch[1];
            const varName = assignMatch[2];

            // Ignorer les patterns de paramètres par défaut:
            // if (param === undefined) { param = defaultValue; }
            // C'est un pattern courant pour les valeurs par défaut de paramètres
            const prevLine = i > 0 ? lines[i - 1] : "";
            if (prevLine.includes(`${varName} === undefined`) ||
                prevLine.includes(`${varName} === null`) ||
                prevLine.includes(`!${varName}`)) {
                continue;
            }

            // Ignorer si fait partie d'une déclaration chaînée multi-lignes:
            // var a = 1,
            //     b = 2,  <- cette ligne ne doit pas être détectée
            //     c = 3;
            // On vérifie si la ligne précédente se termine par une virgule
            const prevLineTrimmed = prevLine.replace(/\/\/.*$/, "").trim();
            if (prevLineTrimmed.endsWith(",")) {
                continue;
            }

            // Ignorer si on est à l'intérieur d'une classe (class fields)
            // Les class fields comme "get = async () => {}" ne doivent pas avoir "var"
            const posInFile = linePositions[i] + indent.length;
            if (isInsideClass(content, posInFile)) {
                continue;
            }

            // Ignorer si c'est une propriété (this.x = ou obj.x =)
            const beforeVar = line.substring(0, line.indexOf(varName));
            if (beforeVar.includes(".") || beforeVar.includes("this")) continue;

            // Ignorer si c'est après un { sur la même ligne (propriété d'objet inline)
            if (/\{\s*$/.test(beforeVar) || /,\s*$/.test(beforeVar)) continue;

            // Ignorer les variables connues comme globales
            if (knownGlobals.has(varName)) continue;

            // Calculer la position dans le fichier et vérifier si déclarée dans le scope
            const positionInFile = linePositions[i] + indent.length;
            if (isVarDeclaredInScope(content, varName, positionInFile)) continue;

            // Ignorer les mots-clés
            if (["if", "else", "for", "while", "switch", "case", "return", "throw", "try", "catch", "finally", "new", "delete", "typeof", "void", "in", "of"].includes(varName)) continue;

            findings.push({
                file: filePath,
                line: lineNum,
                column: indent.length + 1,
                varName,
                lineContent: lines[i],
                indent,
            });
        }
    }

    return findings;
}

/**
 * Vérifie si une variable est utilisée dans d'autres fichiers (potentiellement globale intentionnelle)
 */
function checkGlobalUsage(varName, sourceFile, allFiles) {
    const usages = [];

    for (const file of allFiles) {
        if (file === sourceFile) continue;

        try {
            const content = fs.readFileSync(file, "utf-8");
            // Chercher des utilisations de cette variable
            const pattern = new RegExp(`\\b${varName}\\b`, "g");
            if (pattern.test(content)) {
                usages.push(file);
            }
        } catch (e) {
            // Ignorer les erreurs de lecture
        }
    }

    return usages;
}

/**
 * Vérifie si la variable est réutilisée dans la même fonction après l'assignation
 */
function checkLocalReuse(finding, fileContent) {
    const lines = fileContent.split("\n");
    const startLine = finding.line - 1;
    const varName = finding.varName;

    // Compter les accolades pour déterminer la portée
    let braceCount = 0;

    // Remonter pour trouver le début de la fonction/bloc
    for (let i = startLine; i >= 0; i--) {
        const line = lines[i];
        braceCount += (line.match(/\}/g) || []).length;
        braceCount -= (line.match(/\{/g) || []).length;
        if (braceCount < 0) {
            break;
        }
    }

    // Chercher d'autres utilisations avant cette ligne dans le même bloc
    // Pattern qui exclut les propriétés d'objet (.varName) et les clés d'objet (varName:)
    const usagePattern = new RegExp(`(?<![.])\\b${varName}\\b(?!\\s*:)`, "g");
    braceCount = 0;

    for (let i = startLine - 1; i >= 0 && braceCount >= 0; i--) {
        const line = lines[i];
        braceCount -= (line.match(/\}/g) || []).length;
        braceCount += (line.match(/\{/g) || []).length;

        if (braceCount < 0) break;

        // Ignorer les déclarations
        if (/\b(?:var|let|const)\s+/.test(line)) continue;

        // Ignorer les lignes de commentaires (// ou * ou /**)
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith("//") || trimmedLine.startsWith("*") || trimmedLine.startsWith("/*")) {
            continue;
        }

        // Ignorer les commentaires inline
        const lineWithoutComments = line.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "");

        if (usagePattern.test(lineWithoutComments)) {
            return { reusedBefore: true, line: i + 1 };
        }
    }

    return { reusedBefore: false };
}

/**
 * Collecte tous les fichiers JS
 */
function collectFiles(dir, files = []) {
    if (!fs.existsSync(dir)) return files;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            // Ignorer node_modules et autres
            if (!["node_modules", ".git", "dist", "build", "coverage"].includes(entry.name)) {
                collectFiles(fullPath, files);
            }
        } else if (entry.isFile() && extensions.includes(path.extname(entry.name))) {
            files.push(fullPath);
        }
    }

    return files;
}

/**
 * Applique la correction à un fichier
 */
function applyFix(finding) {
    const content = fs.readFileSync(finding.file, "utf-8");
    const lines = content.split("\n");
    const lineIndex = finding.line - 1;

    // Remplacer l'assignation par une déclaration
    const oldLine = lines[lineIndex];
    const newLine = oldLine.replace(
        new RegExp(`^(\\s*)${finding.varName}(\\s*=)`),
        `$1var ${finding.varName}$2`
    );

    if (oldLine === newLine) {
        console.log(`  ⚠️  Impossible de corriger automatiquement: ${finding.file}:${finding.line}`);
        return false;
    }

    lines[lineIndex] = newLine;
    fs.writeFileSync(finding.file, lines.join("\n"), "utf-8");
    return true;
}

// Main
async function main() {
    const args = process.argv.slice(2);
    const shouldFix = args.includes("--fix");
    const dryRun = !shouldFix;

    console.log("🔍 Analyse des variables non déclarées...\n");
    console.log(`Mode: ${dryRun ? "DRY-RUN (aucune modification)" : "FIX (corrections appliquées)"}\n`);

    // Collecter tous les fichiers
    const allFiles = [];
    for (const dir of dirsToScan) {
        collectFiles(path.join(rootDir, dir), allFiles);
    }

    console.log(`📁 ${allFiles.length} fichiers à analyser\n`);

    // Analyser chaque fichier
    const allFindings = [];
    for (const file of allFiles) {
        const findings = analyzeFile(file);
        allFindings.push(...findings);
    }

    console.log(`🎯 ${allFindings.length} variables non déclarées trouvées\n`);

    if (allFindings.length === 0) {
        console.log("✅ Aucune variable non déclarée trouvée!");
        return;
    }

    // Classifier les findings
    for (const finding of allFindings) {
        const relativePath = path.relative(rootDir, finding.file);
        finding.relativePath = relativePath;

        // Vérifier si utilisée ailleurs (potentiellement globale intentionnelle)
        const globalUsages = checkGlobalUsage(finding.varName, finding.file, allFiles);

        // Vérifier si réutilisée avant dans le même bloc
        const fileContent = fs.readFileSync(finding.file, "utf-8");
        const localReuse = checkLocalReuse(finding, fileContent);

        // Note: Les "usages globaux" sont souvent des faux positifs car ce sont
        // des variables avec le même nom mais dans des contextes différents.
        // En ESM, les modules sont isolés, donc pas de vraies globales partagées.
        // On considère donc ces cas comme SÛRS sauf s'il y a réutilisation locale.
        if (localReuse.reusedBefore) {
            finding.risk = "LOCAL_REUSE";
            finding.reason = `Utilisée avant à la ligne ${localReuse.line} (même variable?)`;
            results.risky.push(finding);
        } else {
            finding.risk = "SAFE";
            results.safe.push(finding);
        }
    }

    // Afficher les résultats
    console.log("=" .repeat(80));
    console.log("✅ CORRECTIONS SÛRES (peuvent être fixées automatiquement)");
    console.log("=" .repeat(80));

    if (results.safe.length === 0) {
        console.log("  Aucune\n");
    } else {
        for (const f of results.safe) {
            console.log(`\n  📄 ${f.relativePath}:${f.line}`);
            console.log(`     Variable: ${f.varName}`);
            console.log(`     Code:     ${f.lineContent.trim()}`);
            console.log(`     Fix:      var ${f.varName} = ...`);

            if (shouldFix) {
                if (applyFix(f)) {
                    console.log(`     ✅ Corrigé!`);
                }
            }
        }
    }

    console.log("\n" + "=" .repeat(80));
    console.log("⚠️  CORRECTIONS RISQUÉES (vérification manuelle recommandée)");
    console.log("=" .repeat(80));

    if (results.risky.length === 0) {
        console.log("  Aucune\n");
    } else {
        for (const f of results.risky) {
            console.log(`\n  📄 ${f.relativePath}:${f.line}`);
            console.log(`     Variable: ${f.varName}`);
            console.log(`     Code:     ${f.lineContent.trim()}`);
            console.log(`     Risque:   ${f.risk}`);
            console.log(`     Raison:   ${f.reason}`);
            if (f.usages) {
                console.log(`     Fichiers: ${f.usages.slice(0, 3).join(", ")}${f.usages.length > 3 ? "..." : ""}`);
            }
        }
    }

    // Résumé
    console.log("\n" + "=" .repeat(80));
    console.log("📊 RÉSUMÉ");
    console.log("=" .repeat(80));
    console.log(`  Total trouvées:     ${allFindings.length}`);
    console.log(`  Corrections sûres:  ${results.safe.length}`);
    console.log(`  Corrections risquées: ${results.risky.length}`);

    if (dryRun && results.safe.length > 0) {
        console.log(`\n💡 Pour appliquer les corrections sûres, lancez:`);
        console.log(`   node scripts/find-undeclared-vars.js --fix`);
    }

    // Générer un rapport JSON
    const reportPath = path.join(rootDir, "undeclared-vars-report.json");
    fs.writeFileSync(reportPath, JSON.stringify({
        date: new Date().toISOString(),
        summary: {
            total: allFindings.length,
            safe: results.safe.length,
            risky: results.risky.length,
        },
        safe: results.safe.map(f => ({
            file: f.relativePath,
            line: f.line,
            variable: f.varName,
            code: f.lineContent.trim(),
        })),
        risky: results.risky.map(f => ({
            file: f.relativePath,
            line: f.line,
            variable: f.varName,
            code: f.lineContent.trim(),
            risk: f.risk,
            reason: f.reason,
            usages: f.usages,
        })),
    }, null, 2));

    console.log(`\n📝 Rapport détaillé: ${path.relative(rootDir, reportPath)}`);
}

main().catch(console.error);
