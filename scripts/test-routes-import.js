/**
 * Test script to verify all API routes can be imported without errors
 * This validates that ESM migration is complete and all imports resolve correctly
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiPathsDir = path.join(__dirname, '../api/v1/paths');

async function getAllJsFiles(dir) {
    const files = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...await getAllJsFiles(fullPath));
        } else if (entry.name.endsWith('.js')) {
            files.push(fullPath);
        }
    }
    return files;
}

async function testRouteImports() {
    console.log('Testing API route imports...\n');

    const files = await getAllJsFiles(apiPathsDir);
    const results = {
        success: [],
        failed: []
    };

    for (const file of files) {
        const relativePath = path.relative(apiPathsDir, file);
        try {
            // Convert to file URL for Windows compatibility
            const fileUrl = pathToFileURL(file).href;
            const module = await import(fileUrl);

            // Check if the module exports a function (most routes do)
            if (typeof module.default === 'function') {
                // Try to call the function to get the operations object
                try {
                    const operations = module.default();
                    const methods = Object.keys(operations || {});
                    results.success.push({
                        file: relativePath,
                        methods: methods.length > 0 ? methods : ['(factory function)']
                    });
                } catch (callError) {
                    // Function exists but requires dependencies - still counts as successful import
                    results.success.push({
                        file: relativePath,
                        methods: ['(requires runtime dependencies)']
                    });
                }
            } else {
                results.success.push({
                    file: relativePath,
                    methods: ['(utility module)']
                });
            }
        } catch (error) {
            results.failed.push({
                file: relativePath,
                error: error.message
            });
        }
    }

    // Print results
    console.log('='.repeat(60));
    console.log(`RESULTS: ${results.success.length} passed, ${results.failed.length} failed`);
    console.log('='.repeat(60));

    if (results.failed.length > 0) {
        console.log('\n❌ FAILED IMPORTS:\n');
        for (const fail of results.failed) {
            console.log(`  ${fail.file}`);
            console.log(`    Error: ${fail.error}\n`);
        }
    }

    if (results.success.length > 0) {
        console.log('\n✓ SUCCESSFUL IMPORTS:\n');
        for (const success of results.success) {
            console.log(`  ✓ ${success.file} [${success.methods.join(', ')}]`);
        }
    }

    console.log('\n' + '='.repeat(60));

    if (results.failed.length > 0) {
        console.log(`\n⚠️  ${results.failed.length} route(s) failed to import. Fix these before deploying.`);
        process.exit(1);
    } else {
        console.log('\n✅ All routes imported successfully!');
        process.exit(0);
    }
}

testRouteImports().catch(err => {
    console.error('Test script failed:', err);
    process.exit(1);
});
