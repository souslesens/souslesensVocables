import fs from "fs";

const release = process.argv[2];
const line = parseInt(process.argv[3]);

if (release === undefined || line === undefined || line === NaN) {
    console.error("Usage: changelog.js <release> <lineNumber>");
    return;
}

const message = `
> [!IMPORTANT]
> Updating to ${release} require a data migration. Execute the following script after upgrade.

\`\`\`bash
npm run migrate
\`\`\``;

const changelogContent = fs.readFileSync("CHANGELOG.md").toString().split("\n");

changelogContent.splice(line, 0, message);

const newChangelogContent = changelogContent.join("\n");

fs.writeFileSync("CHANGELOG.md", newChangelogContent);
