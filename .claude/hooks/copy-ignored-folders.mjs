// SessionStart: a new worktree gets the git-ignored folders of the main checkout, copied once
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const sentinelFile = "config/mainConfig.json";
const ignoredFolders = ["config", "data", "plugins", "mainapp/static"];

function runGit(workingDirectory, gitArguments) {
    return execFileSync("git", gitArguments, { cwd: workingDirectory, encoding: "utf8" }).trim();
}

try {
    const hookInput = JSON.parse(readFileSync(0, "utf8") || "{}");
    const startDirectory = hookInput.cwd || process.cwd();
    const worktreeRoot = runGit(startDirectory, ["rev-parse", "--show-toplevel"]);
    const worktreeList = runGit(worktreeRoot, ["worktree", "list", "--porcelain"]);
    const mainCheckout = worktreeList.split("\n")[0].replace("worktree ", "");
    const isMainCheckout = join(mainCheckout) === join(worktreeRoot);
    const hasIgnoredFolders = existsSync(join(mainCheckout, sentinelFile));
    const isAlreadySetUp = existsSync(join(worktreeRoot, sentinelFile));
    if (!isMainCheckout && hasIgnoredFolders) {
        for (const folder of ignoredFolders) {
            const sourceFolder = join(mainCheckout, folder);
            if (!existsSync(sourceFolder)) {
                continue;
            }
            try {
                // plugins holds symlinks, which Windows refuses to create without developer mode
                cpSync(sourceFolder, join(worktreeRoot, folder), { recursive: true, force: false, dereference: true });
            } catch (error) {
                console.error("sls-worktree-setup: " + folder + ": " + error.message);
            }
        }
    }
    if (!isMainCheckout && hasIgnoredFolders && !isAlreadySetUp) {
        console.log("Worktree: " + ignoredFolders.join(", ") + " copied from the main checkout.");
    }
} catch (error) {
    console.error("sls-worktree-setup: " + error.message);
}
