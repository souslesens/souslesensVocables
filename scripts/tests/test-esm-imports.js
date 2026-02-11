#!/usr/bin/env node
/**
 * Script de test pour valider la conversion CommonJS -> ES Modules
 * Vérifie que tous les modules dans bin/, api/ et model/ peuvent être importés correctement
 *
 * Usage: node scripts/test-esm-imports.js [--verbose] [--continue-on-error]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Parse command line arguments
const args = process.argv.slice(2);
const verbose = args.includes("--verbose") || args.includes("-v");
const continueOnError = args.includes("--continue-on-error") || args.includes("-c");

// Couleurs pour la console
const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m",
};

function log(color, message) {
    console.log(`${color}${message}${colors.reset}`);
}

/**
 * Récupère récursivement tous les fichiers .js d'un répertoire
 */
function getJsFiles(dir, fileList = []) {
    if (!fs.existsSync(dir)) {
        return fileList;
    }

    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            // Skip node_modules and __mocks__
            if (file !== "node_modules" && file !== "__mocks__") {
                getJsFiles(filePath, fileList);
            }
        } else if (file.endsWith(".js")) {
            fileList.push(filePath);
        }
    }

    return fileList;
}

/**
 * Teste l'import d'un module
 */
async function testImport(filePath) {
    const relativePath = path.relative(rootDir, filePath);

    try {
        // Convertir le chemin en URL pour l'import dynamique
        const fileUrl = pathToFileURL(filePath).href;
        await import(fileUrl);
        return { success: true, file: relativePath };
    } catch (error) {
        return {
            success: false,
            file: relativePath,
            error: error.message,
            stack: error.stack
        };
    }
}

/**
 * Teste tous les fichiers d'un répertoire
 */
async function testDirectory(dirName, dirPath) {
    log(colors.cyan, `\n${"=".repeat(60)}`);
    log(colors.cyan, `Testing ${dirName.toUpperCase()} modules`);
    log(colors.cyan, `${"=".repeat(60)}`);

    const files = getJsFiles(dirPath);

    if (files.length === 0) {
        log(colors.yellow, `No .js files found in ${dirName}`);
        return { total: 0, passed: 0, failed: 0, errors: [] };
    }

    log(colors.blue, `Found ${files.length} files to test\n`);

    let passed = 0;
    let failed = 0;
    const errors = [];

    for (const file of files) {
        const result = await testImport(file);

        if (result.success) {
            passed++;
            if (verbose) {
                log(colors.green, `  ✓ ${result.file}`);
            }
        } else {
            failed++;
            errors.push(result);
            log(colors.red, `  ✗ ${result.file}`);
            log(colors.yellow, `    Error: ${result.error}`);

            if (verbose && result.stack) {
                console.log(`    Stack: ${result.stack.split("\n").slice(1, 4).join("\n    ")}`);
            }

            if (!continueOnError) {
                log(colors.red, `\nStopping due to error. Use --continue-on-error to test all files.`);
                break;
            }
        }
    }

    return { total: files.length, passed, failed, errors };
}

/**
 * Affiche le résumé des tests
 */
function printSummary(results) {
    log(colors.cyan, `\n${"=".repeat(60)}`);
    log(colors.cyan, "TEST SUMMARY");
    log(colors.cyan, `${"=".repeat(60)}\n`);

    let totalFiles = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    const allErrors = [];

    for (const [dirName, result] of Object.entries(results)) {
        const status = result.failed === 0 ? colors.green : colors.red;
        log(status, `${dirName.padEnd(10)} : ${result.passed}/${result.total} passed`);

        totalFiles += result.total;
        totalPassed += result.passed;
        totalFailed += result.failed;
        allErrors.push(...result.errors);
    }

    log(colors.cyan, `${"─".repeat(30)}`);

    const overallStatus = totalFailed === 0 ? colors.green : colors.red;
    log(overallStatus, `TOTAL      : ${totalPassed}/${totalFiles} passed`);

    if (totalFailed > 0) {
        log(colors.red, `\n${totalFailed} module(s) failed to import:`);
        for (const err of allErrors) {
            log(colors.red, `  - ${err.file}`);
            log(colors.yellow, `    ${err.error}`);
        }
    }

    return totalFailed === 0;
}

/**
 * Main
 */
async function main() {
    log(colors.cyan, "\n╔══════════════════════════════════════════════════════════╗");
    log(colors.cyan, "║     ES Module Import Test - CommonJS to ESM Validation   ║");
    log(colors.cyan, "╚══════════════════════════════════════════════════════════╝");

    if (verbose) {
        log(colors.blue, "\nVerbose mode enabled");
    }
    if (continueOnError) {
        log(colors.blue, "Continue on error mode enabled");
    }

    const directories = {
        bin: path.join(rootDir, "bin"),
        api: path.join(rootDir, "api"),
        model: path.join(rootDir, "model"),
    };

    const results = {};

    for (const [dirName, dirPath] of Object.entries(directories)) {
        results[dirName] = await testDirectory(dirName, dirPath);

        // Si on ne continue pas sur erreur et qu'il y a eu des erreurs, arrêter
        if (!continueOnError && results[dirName].failed > 0) {
            break;
        }
    }

    const success = printSummary(results);

    if (success) {
        log(colors.green, "\n✓ All ES module imports validated successfully!\n");
        process.exit(0);
    } else {
        log(colors.red, "\n✗ Some modules failed to import. Please fix the errors above.\n");
        process.exit(1);
    }
}

main().catch((error) => {
    log(colors.red, `\nFatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
});
