const fs = require('fs');
const path = require('path');

// Directories to process
const directories = ['./bin', './api', './model', './scripts'];
const singleFiles = ['./app.js'];

// Pattern to match incomplete imports like: import x from './path.' or require('./path.')
// This matches imports ending with just a dot before the quote
const importPattern = /(import\s+.+from\s+['"].*)\.(["'])/g;
const requirePattern = /(require\s*\(\s*(?:path\.resolve\s*\()?\s*["'].*)\.(["']\s*\)?\s*\))/g;

function processFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        // Fix import statements
        const newContent1 = content.replace(importPattern, (match, prefix, quote) => {
            modified = true;
            return `${prefix}.js${quote}`;
        });

        // Fix require statements
        const newContent2 = newContent1.replace(requirePattern, (match, prefix, suffix) => {
            modified = true;
            return `${prefix}.js${suffix}`;
        });

        if (modified) {
            fs.writeFileSync(filePath, newContent2, 'utf8');
            console.log(`Fixed: ${filePath}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`Error processing ${filePath}: ${error.message}`);
        return false;
    }
}

function processDirectory(dirPath) {
    let fixedCount = 0;

    function walk(dir) {
        if (!fs.existsSync(dir)) {
            console.log(`Directory not found: ${dir}`);
            return;
        }

        const files = fs.readdirSync(dir);

        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                // Skip node_modules and other non-relevant directories
                if (!['node_modules', 'mainapp', 'public', '.git'].includes(file)) {
                    walk(fullPath);
                }
            } else if (file.endsWith('.js')) {
                if (processFile(fullPath)) {
                    fixedCount++;
                }
            }
        }
    }

    walk(dirPath);
    return fixedCount;
}

// Main execution
let totalFixed = 0;

// Process single files
for (const file of singleFiles) {
    if (fs.existsSync(file)) {
        if (processFile(file)) {
            totalFixed++;
        }
    }
}

// Process directories
for (const dir of directories) {
    totalFixed += processDirectory(dir);
}

console.log(`\nTotal files fixed: ${totalFixed}`);
