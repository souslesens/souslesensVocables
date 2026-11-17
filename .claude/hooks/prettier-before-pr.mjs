// PreToolUse on Bash: before gh pr create or git push, run prettier on the files the branch changed and commit what it reformatted
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const commandRegex = /\b(gh\s+pr\s+create|git\s+push)\b/;
const pullRequestCreationRegex = /\bgh\s+pr\s+create\b/;
const baseBranches = ["origin/master", "origin/main"];
const commitMessage = "style: prettier";

function runGit(workingDirectory, gitArguments) {
    return execFileSync("git", gitArguments, { cwd: workingDirectory, encoding: "utf8" }).trim();
}

function succeeds(workingDirectory, gitArguments) {
    try {
        runGit(workingDirectory, gitArguments);
        return true;
    } catch (error) {
        return false;
    }
}

try {
    const hookInput = JSON.parse(readFileSync(0, "utf8") || "{}");
    const command = hookInput.tool_input && hookInput.tool_input.command ? hookInput.tool_input.command : "";
    if (!commandRegex.test(command)) {
        process.exit(0);
    }
    const repositoryRoot = runGit(hookInput.cwd || process.cwd(), ["rev-parse", "--show-toplevel"]);
    const packageFile = join(repositoryRoot, "package.json");
    if (!existsSync(packageFile) || !readFileSync(packageFile, "utf8").includes('"prettier:write"')) {
        process.exit(0);
    }
    const baseBranch = baseBranches.find((branch) => succeeds(repositoryRoot, ["rev-parse", "--verify", branch]));
    if (!baseBranch) {
        process.exit(0);
    }
    const changedFilesText = runGit(repositoryRoot, ["diff", "--name-only", "--diff-filter=ACMR", baseBranch + "...HEAD"]);
    const changedFiles = changedFilesText.split("\n").filter((file) => file.length > 0 && existsSync(join(repositoryRoot, file)));
    if (changedFiles.length === 0) {
        process.exit(0);
    }
    // prettier would be committed with the unrelated changes of the same file
    const uncommittedText = runGit(repositoryRoot, ["diff", "HEAD", "--ignore-space-at-eol", "--name-only", "--", ...changedFiles]);
    if (uncommittedText.length > 0) {
        console.error("Commit these files first, then retry:\n" + uncommittedText);
        process.exit(2);
    }
    const prettierArguments = ["prettier", "--write", "--ignore-unknown", "--log-level", "silent", ...changedFiles];
    execFileSync("npx", prettierArguments, { cwd: repositoryRoot, shell: true });
    const reformattedText = runGit(repositoryRoot, ["diff", "--name-only", "--", ...changedFiles]);
    if (reformattedText.length > 0) {
        const reformattedFiles = reformattedText.split("\n");
        runGit(repositoryRoot, ["commit", "-m", commitMessage, "--", ...reformattedFiles]);
        console.error("Prettier reformatted and committed:\n" + reformattedText);
        // a pull request opened after the push would miss the new commit
        const hasUpstream = succeeds(repositoryRoot, ["rev-parse", "--abbrev-ref", "@{u}"]);
        if (pullRequestCreationRegex.test(command) && hasUpstream) {
            runGit(repositoryRoot, ["push"]);
        }
    }
} catch (error) {
    console.error("prettier-before-pr: " + error.message);
}
