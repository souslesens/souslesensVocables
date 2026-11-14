import fs from "fs";
import os from "os";
import path from "path";
import { simpleGit } from "simple-git";

// GitHub, GitLab, Azure DevOps and Gitea read the token as the password whatever the user name, Bitbucket needs its own
const defaultTokenUserName = "oauth2";
// a git command printing nothing for this long is killed
const gitSilenceTimeoutMs = 120000;
const workTreePrefix = "sls-git-";
const lineBreakRegex = /\r?\n/;
const symbolicHeadRegex = /^ref: refs\/heads\/(\S+)\tHEAD$/;
// "^" never appears in a ref name, so the peeled lines "refs/tags/x^{}" are left out
const remoteRefRegex = /^[0-9a-f]+\trefs\/(heads|tags)\/([^\s^]+)$/;
// the branch moved on the server; a tag refused as "(already exists)" is no reason to retry
const pushRejectedRegex = /\((fetch first|non-fast-forward)\)/;
// the server answered 401 to the header, git then asks for a user name it is not allowed to prompt for
const tokenRefusedRegex = /could not read Username/;

/**
 * @param {{userName: string, token: string}} credentials - the access token of the user on the git server, with the user name it goes with
 * @param {string} directory - the folder git runs in
 * @param {{name: string, email: string}} author - the author of the commits
 * @returns {import("simple-git").SimpleGit} a git client
 */
function createGit(credentials, directory, author) {
    const tokenUserName = credentials.userName || defaultTokenUserName;
    const credentialsBuffer = Buffer.from(tokenUserName + ":" + credentials.token);
    const basicCredentials = credentialsBuffer.toString("base64");
    const environment = {
        ...process.env,
        // the push rejection is recognised on the English message
        LC_ALL: "C",
        GIT_TERMINAL_PROMPT: "0",
        GCM_INTERACTIVE: "never",
        // the token travels in a header given through the environment, never in a URL, an argument or .git/config
        GIT_CONFIG_COUNT: "2",
        GIT_CONFIG_KEY_0: "http.extraHeader",
        GIT_CONFIG_VALUE_0: "Authorization: Basic " + basicCredentials,
        GIT_CONFIG_KEY_1: "credential.helper",
        GIT_CONFIG_VALUE_1: "",
        GIT_AUTHOR_NAME: author.name,
        GIT_AUTHOR_EMAIL: author.email,
        GIT_COMMITTER_NAME: author.name,
        GIT_COMMITTER_EMAIL: author.email,
    };
    const git = simpleGit({ baseDir: directory, timeout: { block: gitSilenceTimeoutMs } }).env(environment);
    return git;
}

/**
 * Main branch, branches and tags of the remote repository, without cloning it.
 * @param {string} repositoryUrl - HTTPS URL of the repository
 * @param {{userName: string, token: string}} credentials - the access token and its user name
 * @param {{name: string, email: string}} author - the author of the commits
 * @returns {Promise<{mainBranch: string|null, branchNames: string[], tagNames: string[]}>} the remote refs, mainBranch null on a repository HEAD does not name
 */
async function readRemoteRefs(repositoryUrl, credentials, author) {
    const git = createGit(credentials, os.tmpdir(), author);
    const listing = await git.listRemote(["--symref", repositoryUrl]);
    const listingLines = listing.split(lineBreakRegex);
    let mainBranch = null;
    const branchNames = [];
    const tagNames = [];
    for (const line of listingLines) {
        const headMatch = line.match(symbolicHeadRegex);
        if (headMatch) {
            const [, headBranch] = headMatch;
            mainBranch = headBranch;
            continue;
        }
        const refMatch = line.match(remoteRefRegex);
        if (!refMatch) {
            continue;
        }
        const [, refKind, refName] = refMatch;
        if (refKind === "tags") {
            tagNames.push(refName);
        } else {
            branchNames.push(refName);
        }
    }
    return { mainBranch: mainBranch, branchNames: branchNames, tagNames: tagNames };
}

/**
 * A dry-run push of an empty commit: the git server answers as for a real push, nothing is written.
 * @param {string} repositoryUrl - HTTPS URL of the repository
 * @param {{userName: string, token: string}} credentials - the access token and its user name
 * @param {{name: string, email: string}} author - the author of the commits
 * @returns {Promise<void>} rejects with the git server message when the token cannot push
 */
async function checkWriteAccess(repositoryUrl, credentials, author) {
    const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), workTreePrefix));
    try {
        const git = createGit(credentials, directory, author);
        await git.init();
        await git.raw(["commit", "--allow-empty", "-m", "SLS write access check"]);
        await git.raw(["push", "--dry-run", repositoryUrl, "HEAD:refs/heads/sls-write-access-check"]);
    } finally {
        await removeWorkTree(directory);
    }
}

/**
 * A temporary work tree holding only the folder of the source: a shallow sparse clone of the base
 * branch, or an empty repository when the remote has no commit yet.
 * @param {string} repositoryUrl - HTTPS URL of the repository
 * @param {{userName: string, token: string}} credentials - the access token and its user name
 * @param {{name: string, email: string}} author - the author of the commits
 * @param {string|null} baseBranch - the branch to start from, null on an empty repository
 * @param {string} sourceFolder - the folder of the source in the repository
 * @returns {Promise<{git: import("simple-git").SimpleGit, directory: string}>} the work tree, removed by removeWorkTree
 */
async function prepareWorkTree(repositoryUrl, credentials, author, baseBranch, sourceFolder) {
    const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), workTreePrefix));
    const git = createGit(credentials, directory, author);
    try {
        if (baseBranch === null) {
            await git.init();
            await git.addRemote("origin", repositoryUrl);
        } else {
            await git.clone(repositoryUrl, directory, ["--depth", "1", "--filter=blob:none", "--sparse", "--single-branch", "--branch", baseBranch]);
            await git.raw(["sparse-checkout", "set", sourceFolder]);
        }
    } catch (error) {
        await removeWorkTree(directory);
        throw error;
    }
    return { git: git, directory: directory };
}

async function removeWorkTree(directory) {
    await fs.promises.rm(directory, { recursive: true, force: true, maxRetries: 3 });
}

/**
 * @param {string} refName - a full ref name, refs/heads/... or refs/tags/...
 * @returns {Promise<boolean>} true when git accepts the name
 */
async function isValidRefName(refName) {
    // an invalid name exits with no output, which simple-git does not report as an error
    const normalizedRefName = await simpleGit().raw(["check-ref-format", "--normalize", refName]);
    const isValid = normalizedRefName.trim() === refName;
    return isValid;
}

export { workTreePrefix, readRemoteRefs, checkWriteAccess, prepareWorkTree, removeWorkTree, isValidRefName, pushRejectedRegex, tokenRefusedRegex };
