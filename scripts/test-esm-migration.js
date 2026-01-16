/**
 * Comprehensive ESM Migration Test Script
 *
 * This script validates the complete ESM migration by testing:
 * - All imports resolve correctly
 * - All exports are properly defined
 * - Module syntax is valid
 * - No CommonJS remnants (require/module.exports)
 *
 * Tested directories: bin/, model/, api/, scripts/, app.js
 *
 * Usage:
 *   node scripts/test-esm-migration.js [--syntax-only] [--no-import]
 *
 * Options:
 *   --syntax-only   Only check for CommonJS patterns, don't try to import
 *   --no-import     Same as --syntax-only
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
const SYNTAX_ONLY = args.includes('--syntax-only') || args.includes('--no-import');

// Configuration
const DIRECTORIES_TO_TEST = [
    { path: 'bin', description: 'Utility modules' },
    { path: 'model', description: 'Data models' },
    { path: 'api/v1/paths', description: 'API routes' },
    { path: 'scripts', description: 'Scripts' },
];

const INDIVIDUAL_FILES = [
    { path: 'app.js', description: 'Main application entry' },
    { path: 'api/v1/api-doc.js', description: 'API documentation' },
];

// Files to skip (known issues or intentionally CommonJS)
const SKIP_FILES = [
    'scripts/test-esm-migration.js', // This file itself
];

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    dim: '\x1b[2m',
};

function colorize(text, color) {
    return `${colors[color]}${text}${colors.reset}`;
}

/**
 * Recursively get all .js files in a directory
 */
async function getAllJsFiles(dir) {
    const files = [];
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                files.push(...await getAllJsFiles(fullPath));
            } else if (entry.name.endsWith('.js')) {
                files.push(fullPath);
            }
        }
    } catch (error) {
        // Directory doesn't exist, skip
    }
    return files;
}

/**
 * Check file content for CommonJS patterns
 */
async function checkForCommonJSPatterns(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const issues = [];
    const lines = content.split('\n');

    let inBlockComment = false;

    lines.forEach((line, index) => {
        const lineNum = index + 1;
        const trimmedLine = line.trim();

        // Track block comments /* ... */
        if (trimmedLine.startsWith('/*') && !trimmedLine.includes('*/')) {
            inBlockComment = true;
            return;
        }
        if (inBlockComment) {
            if (trimmedLine.includes('*/')) {
                inBlockComment = false;
            }
            return;
        }

        // Skip single-line comments
        if (trimmedLine.startsWith('//') || trimmedLine.startsWith('*')) {
            return;
        }

        // Skip lines that are entirely a block comment on one line
        if (trimmedLine.startsWith('/*') && trimmedLine.endsWith('*/')) {
            return;
        }

        // Check for require() - but not in comments or strings for dynamic imports
        if (/\brequire\s*\(/.test(line) && !line.includes('// ') && !line.includes('dynamic')) {
            // Allow createRequire for __dirname polyfill
            if (!line.includes('createRequire')) {
                issues.push({
                    line: lineNum,
                    type: 'require()',
                    content: trimmedLine.substring(0, 80)
                });
            }
        }

        // Check for module.exports
        if (/\bmodule\.exports\b/.test(line)) {
            issues.push({
                line: lineNum,
                type: 'module.exports',
                content: trimmedLine.substring(0, 80)
            });
        }

        // Check for exports.something = (but not export const/default)
        if (/^exports\.\w+\s*=/.test(trimmedLine)) {
            issues.push({
                line: lineNum,
                type: 'exports.x =',
                content: trimmedLine.substring(0, 80)
            });
        }
    });

    return issues;
}

/**
 * Check if file has proper ESM export
 */
async function checkExports(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const exportInfo = {
        hasDefaultExport: false,
        hasNamedExports: false,
        exportNames: []
    };

    // Check for default export
    if (/export\s+default\b/.test(content)) {
        exportInfo.hasDefaultExport = true;
    }

    // Check for named exports
    const namedExportMatches = content.matchAll(/export\s+(?:const|let|var|function|class|async\s+function)\s+(\w+)/g);
    for (const match of namedExportMatches) {
        exportInfo.hasNamedExports = true;
        exportInfo.exportNames.push(match[1]);
    }

    // Check for export { } syntax
    const exportBraceMatches = content.matchAll(/export\s*\{([^}]+)\}/g);
    for (const match of exportBraceMatches) {
        exportInfo.hasNamedExports = true;
        const names = match[1].split(',').map(n => n.trim().split(' ')[0]);
        exportInfo.exportNames.push(...names);
    }

    return exportInfo;
}

/**
 * Test dynamic import of a module
 */
async function testModuleImport(filePath) {
    const fileUrl = pathToFileURL(filePath).href;
    try {
        const module = await import(fileUrl);
        return {
            success: true,
            exports: Object.keys(module),
            hasDefault: 'default' in module,
            defaultType: module.default ? typeof module.default : null
        };
    } catch (error) {
        // Distinguish between ESM syntax errors, missing packages, and runtime errors
        const isMissingPackage = error.code === 'ERR_MODULE_NOT_FOUND' &&
                                 error.message.includes('Cannot find package');

        const isEsmError = !isMissingPackage && (
                          error.code === 'ERR_MODULE_NOT_FOUND' ||
                          error.code === 'ERR_EXPORT_NOT_FOUND' ||
                          error.code === 'ERR_IMPORT_ATTRIBUTE_MISSING' ||
                          error.message.includes('Cannot use import statement') ||
                          error.message.includes('Unexpected token') ||
                          error.message.includes('is not defined') ||
                          error.message.includes('Cannot find module') ||
                          error.message.includes('does not provide an export'));

        return {
            success: false,
            error: error.message,
            errorCode: error.code,
            isEsmError: isEsmError,
            isMissingPackage: isMissingPackage,
            isRuntimeError: !isEsmError && !isMissingPackage
        };
    }
}

/**
 * Main test runner
 */
async function runTests() {
    console.log('\n' + '='.repeat(70));
    console.log(colorize('  ESM MIGRATION COMPREHENSIVE TEST', 'cyan'));
    if (SYNTAX_ONLY) {
        console.log(colorize('  (Syntax-only mode - imports not tested)', 'yellow'));
    }
    console.log('='.repeat(70) + '\n');

    const results = {
        totalFiles: 0,
        importSuccess: 0,
        importFailed: 0,
        missingPackages: 0,
        runtimeErrors: 0,
        commonJSIssues: 0,
        noExports: 0,
        details: {
            importErrors: [],
            missingPackages: [],
            runtimeErrors: [],
            commonJSPatterns: [],
            noExportFiles: []
        }
    };

    // Collect all files to test
    let allFiles = [];

    // Add files from directories
    for (const dir of DIRECTORIES_TO_TEST) {
        const dirPath = path.join(rootDir, dir.path);
        const files = await getAllJsFiles(dirPath);
        allFiles.push(...files.map(f => ({
            path: f,
            relativePath: path.relative(rootDir, f),
            category: dir.description
        })));
    }

    // Add individual files
    for (const file of INDIVIDUAL_FILES) {
        const filePath = path.join(rootDir, file.path);
        try {
            await fs.access(filePath);
            allFiles.push({
                path: filePath,
                relativePath: file.path,
                category: file.description
            });
        } catch {
            console.log(colorize(`  [SKIP] ${file.path} - File not found`, 'yellow'));
        }
    }

    // Filter out skipped files
    allFiles = allFiles.filter(f => !SKIP_FILES.includes(f.relativePath.replace(/\\/g, '/')));

    results.totalFiles = allFiles.length;

    console.log(colorize(`Testing ${allFiles.length} JavaScript files...\n`, 'blue'));

    // Group files by category for organized output
    const filesByCategory = {};
    for (const file of allFiles) {
        if (!filesByCategory[file.category]) {
            filesByCategory[file.category] = [];
        }
        filesByCategory[file.category].push(file);
    }

    // Test each category
    for (const [category, files] of Object.entries(filesByCategory)) {
        console.log(colorize(`\n▶ ${category} (${files.length} files)`, 'cyan'));
        console.log('-'.repeat(50));

        for (const file of files) {
            process.stdout.write(`  Testing ${file.relativePath}... `);

            // Test 1: Check for CommonJS patterns
            const commonJSIssues = await checkForCommonJSPatterns(file.path);

            // Test 2: Check exports
            const exportInfo = await checkExports(file.path);

            // Test 3: Try to import the module (unless syntax-only mode)
            let importResult = { success: true, skipped: true };
            if (!SYNTAX_ONLY) {
                importResult = await testModuleImport(file.path);
            }

            // Collect results
            const fileIssues = [];

            if (commonJSIssues.length > 0) {
                results.commonJSIssues++;
                results.details.commonJSPatterns.push({
                    file: file.relativePath,
                    issues: commonJSIssues
                });
                fileIssues.push(`CommonJS patterns (${commonJSIssues.length})`);
            }

            if (!exportInfo.hasDefaultExport && !exportInfo.hasNamedExports) {
                // Some files might be side-effect only (like authentication.js)
                // Don't count as error but note it
                results.details.noExportFiles.push(file.relativePath);
            }

            if (importResult.skipped) {
                // Syntax-only mode, count as success
                results.importSuccess++;
            } else if (!importResult.success) {
                if (importResult.isMissingPackage) {
                    // Missing npm package - not an ESM issue
                    results.missingPackages++;
                    results.details.missingPackages.push({
                        file: file.relativePath,
                        error: importResult.error
                    });
                    fileIssues.push('Missing package (not ESM issue)');
                } else if (importResult.isRuntimeError) {
                    // Runtime error (module executes code on import) - not an ESM issue
                    results.runtimeErrors++;
                    results.details.runtimeErrors.push({
                        file: file.relativePath,
                        error: importResult.error,
                        code: importResult.errorCode
                    });
                    fileIssues.push('Runtime error (not ESM issue)');
                } else {
                    // Actual ESM/import error
                    results.importFailed++;
                    results.details.importErrors.push({
                        file: file.relativePath,
                        error: importResult.error,
                        code: importResult.errorCode
                    });
                    fileIssues.push('ESM Import failed');
                }
            } else {
                results.importSuccess++;
            }

            // Print result
            if (fileIssues.length > 0) {
                console.log(colorize('ISSUES', 'red'));
                for (const issue of fileIssues) {
                    console.log(colorize(`    ⚠ ${issue}`, 'yellow'));
                }
            } else {
                const exportStr = importResult.exports?.length > 0
                    ? `[${importResult.exports.join(', ')}]`
                    : '[side-effect only]';
                console.log(colorize('OK', 'green') + colorize(` ${exportStr}`, 'dim'));
            }
        }
    }

    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log(colorize('  SUMMARY', 'cyan'));
    console.log('='.repeat(70));

    console.log(`\n  Total files tested: ${results.totalFiles}`);
    console.log(`  ${colorize('✓', 'green')} Imports successful: ${results.importSuccess}`);
    console.log(`  ${colorize('✗', 'red')} ESM imports failed: ${results.importFailed}`);
    console.log(`  ${colorize('⚠', 'yellow')} Missing packages (not ESM issues): ${results.missingPackages}`);
    console.log(`  ${colorize('⚠', 'yellow')} Runtime errors (not ESM issues): ${results.runtimeErrors}`);
    console.log(`  ${colorize('⚠', 'yellow')} Files with CommonJS patterns: ${results.commonJSIssues}`);
    console.log(`  ${colorize('○', 'dim')} Files without exports (side-effect only): ${results.details.noExportFiles.length}`);

    // Print detailed errors if any
    if (results.details.importErrors.length > 0) {
        console.log(colorize('\n\n─── IMPORT ERRORS ───', 'red'));
        for (const err of results.details.importErrors) {
            console.log(colorize(`\n  ${err.file}`, 'yellow'));
            console.log(`    Error: ${err.error}`);
            if (err.code) console.log(`    Code: ${err.code}`);
        }
    }

    if (results.details.missingPackages.length > 0) {
        console.log(colorize('\n\n─── MISSING PACKAGES (optional dependencies) ───', 'yellow'));
        for (const err of results.details.missingPackages) {
            console.log(colorize(`\n  ${err.file}`, 'yellow'));
            console.log(`    ${err.error.substring(0, 100)}`);
        }
    }

    if (results.details.runtimeErrors.length > 0) {
        console.log(colorize('\n\n─── RUNTIME ERRORS (modules execute code on import) ───', 'yellow'));
        for (const err of results.details.runtimeErrors) {
            console.log(colorize(`\n  ${err.file}`, 'yellow'));
            console.log(`    Error: ${err.error.substring(0, 100)}`);
        }
    }

    if (results.details.commonJSPatterns.length > 0) {
        console.log(colorize('\n\n─── COMMONJS PATTERNS FOUND ───', 'yellow'));
        for (const file of results.details.commonJSPatterns) {
            console.log(colorize(`\n  ${file.file}`, 'yellow'));
            for (const issue of file.issues) {
                console.log(`    Line ${issue.line}: ${issue.type}`);
                console.log(colorize(`      ${issue.content}`, 'dim'));
            }
        }
    }

    console.log('\n' + '='.repeat(70));

    // Exit with appropriate code - only fail on ESM issues and CommonJS patterns
    // Runtime errors are not ESM migration issues
    if (results.importFailed > 0 || results.commonJSIssues > 0) {
        console.log(colorize('\n⚠️  ESM Migration incomplete - fix the issues above\n', 'red'));
        process.exit(1);
    } else {
        const nonEsmIssues = results.runtimeErrors + results.missingPackages;
        if (nonEsmIssues > 0) {
            console.log(colorize('\n✅ ESM migration validation passed!', 'green'));
            console.log(colorize(`   (${nonEsmIssues} files have issues unrelated to ESM)\n`, 'dim'));
        } else {
            console.log(colorize('\n✅ ESM migration validation passed!\n', 'green'));
        }
        process.exit(0);
    }
}

// Run tests
runTests().catch(err => {
    console.error('Test script failed:', err);
    process.exit(1);
});
