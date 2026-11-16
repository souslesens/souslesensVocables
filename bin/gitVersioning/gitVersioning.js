import fs from "fs";
import path from "path";
import { sourceModel } from "../../model/sources.js";
import { mainConfigModel } from "../../model/mainConfig.js";
import ConfigManager from "../configManager.js";
import { endpointUrlForSource } from "../endpointLimits.js";
import { rdfDataModel } from "../../model/rdfData.js";
import { readRemoteRefs, checkWriteAccess, prepareWorkTree, removeWorkTree, isValidRefName, pushRejectedRegex, tokenRefusedRegex } from "./gitRemote.js";
import { readSourceNTriples, parseQuads, withVersionInfo, prefixesOfSource, canonicalTriples, writeTurtle, diffTriples, owlVersionInfoIri } from "./sourceTurtle.js";

// no "@" in the host, so no credentials ride in a URL stored in sources.json
const httpsUrlRegex = /^https:\/\/[^\s/@]+\/\S+$/;
const urlCredentialsRegex = /(?<=:\/\/)[^/@]+@/;
const defaultMainBranch = "main";
const previewLineCount = 20;
const versionCollator = new Intl.Collator("en", { numeric: true });

function requestError(message, status) {
    const error = new Error(message);
    error.status = status;
    return error;
}

// mapped on the first git calls of an action only: once ls-remote accepted the token, a later refusal is not about it
function forbiddenIfTokenRefused(error) {
    if (!tokenRefusedRegex.test(error.message)) {
        return error;
    }
    // not 401: the SLS pages read a 401 as an expired session and reload on the login page
    const forbiddenError = requestError("The git server refused the token, or the user name given with it", 403);
    return forbiddenError;
}

/**
 * The versions and branches of a source are folders of the repository refs: tag <source>/<version>, branch <source>/<branch>.
 * @param {string} sourceName - the source name
 * @param {string} name - a version or a branch name
 * @returns {string} the ref name, without refs/tags/ or refs/heads/
 */
function sourceRefName(sourceName, name) {
    const refName = sourceName + "/" + name;
    return refName;
}

/**
 * The source, the git identity of the user and the credentials, once the readwrite right is checked.
 * @param {object} user - the logged user
 * @param {string} sourceName - the source name
 * @param {{userName: string, token: string}} credentials - the access token of the user on the git server and its user name, never stored
 * @returns {Promise<object>} the context of every git action
 */
async function openSourceContext(user, sourceName, credentials) {
    if (!credentials.token) {
        throw requestError("A git access token is required", 400);
    }
    const userSources = await sourceModel.getUserSources(user);
    if (!userSources[sourceName]) {
        throw requestError(sourceName + " not found", 404);
    }
    if (userSources[sourceName].accessControl !== "readwrite") {
        throw requestError("Not authorized to version " + sourceName, 403);
    }
    const source = userSources[sourceName];
    const isInPlatformTripleStore = Boolean(source.graphUri) && endpointUrlForSource(source) === ConfigManager.config.sparql_server.url;
    if (!isInPlatformTripleStore) {
        throw requestError(sourceName + " is not stored in the platform's own triple store", 400);
    }
    const config = await mainConfigModel.getConfig();
    const author = { name: user.login, email: user.login + "@" + new URL(config.souslesensUrl).hostname };
    const context = { user: user, sourceName: sourceName, credentials: credentials, source: source, config: config, author: author };
    return context;
}

function namesUnderSourceFolder(refNames, sourceName) {
    const sourceRefPrefix = sourceRefName(sourceName, "");
    const sourceRefNames = refNames.filter((refName) => refName.startsWith(sourceRefPrefix));
    const namesWithoutPrefix = sourceRefNames.map((refName) => refName.slice(sourceRefPrefix.length));
    namesWithoutPrefix.sort(versionCollator.compare);
    return namesWithoutPrefix;
}

/**
 * @param {object} context - the context of the action
 * @param {string} [newRepositoryUrl] - a repository not linked yet, else the one linked to the source
 * @returns {Promise<object>} the repository URL, its main branch, the versions and branches of the source
 */
async function readRepositoryState(context, newRepositoryUrl) {
    let repositoryUrl = newRepositoryUrl;
    if (!repositoryUrl) {
        if (!context.source.gitRepository || !context.source.gitRepository.url) {
            throw requestError(context.sourceName + " is not linked to a git repository", 400);
        }
        repositoryUrl = context.source.gitRepository.url;
    }
    // checked again on a linked URL: an owner can write any URL in the source through PUT /sources/{id}
    if (!httpsUrlRegex.test(repositoryUrl)) {
        throw requestError("The repository URL must be an HTTPS URL without credentials", 400);
    }
    let remoteRefs;
    try {
        remoteRefs = await readRemoteRefs(repositoryUrl, context.credentials, context.author);
    } catch (error) {
        throw forbiddenIfTokenRefused(error);
    }
    const mainBranch = remoteRefs.mainBranch || defaultMainBranch;
    const repositoryState = {
        repositoryUrl: repositoryUrl,
        mainBranch: mainBranch,
        isMainBranchCreated: remoteRefs.branchNames.includes(mainBranch),
        versions: namesUnderSourceFolder(remoteRefs.tagNames, context.sourceName),
        branches: namesUnderSourceFolder(remoteRefs.branchNames, context.sourceName),
    };
    return repositoryState;
}

async function readCurrentTriples(context, versionInfo) {
    const graphUri = context.source.graphUri;
    const nTriples = await readSourceNTriples(context.sourceName, context.source, context.user, context.config);
    const sourceQuads = parseQuads(nTriples);
    const versionedQuads = versionInfo === null ? sourceQuads : withVersionInfo(sourceQuads, graphUri, versionInfo);
    const triples = canonicalTriples(versionedQuads, prefixesOfSource(graphUri));
    return triples;
}

function buildSourceFiles(context, triples) {
    // the descriptor GET /sources sends, without the right of the user nor the credentials of the SPARQL server
    const { accessControl: _accessControl, ...archivedSource } = context.source;
    if (archivedSource.sparql_server) {
        const { headers: _headers, ...sparqlServerWithoutHeaders } = archivedSource.sparql_server;
        if (sparqlServerWithoutHeaders.url) {
            sparqlServerWithoutHeaders.url = sparqlServerWithoutHeaders.url.replace(urlCredentialsRegex, "");
        }
        archivedSource.sparql_server = sparqlServerWithoutHeaders;
    }
    const sourceFiles = {
        [context.sourceName + ".ttl"]: writeTurtle(triples, prefixesOfSource(context.source.graphUri)),
        [context.sourceName + ".source.json"]: JSON.stringify(archivedSource, null, 2) + "\n",
    };
    return sourceFiles;
}

/**
 * @param {object} context - the context of the action
 * @param {object} commitToPush - repositoryUrl, baseBranch (null on an empty repository), pushBranch, commitMessage, tag ({name, notes} or null), isBranchUpdate, sourceFiles
 * @returns {Promise<string|null>} the pushed commit, null when a branch update finds nothing to commit
 */
async function commitAndPushOnce(context, commitToPush) {
    const workTree = await prepareWorkTree(commitToPush.repositoryUrl, context.credentials, context.author, commitToPush.baseBranch, context.sourceName);
    try {
        const sourceFolderPath = path.join(workTree.directory, context.sourceName);
        await fs.promises.mkdir(sourceFolderPath, { recursive: true });
        for (const [fileName, fileContent] of Object.entries(commitToPush.sourceFiles)) {
            await fs.promises.writeFile(path.join(sourceFolderPath, fileName), fileContent);
        }
        await workTree.git.add(context.sourceName);
        const status = await workTree.git.status();
        const hasChanges = !status.isClean();
        if (!hasChanges && commitToPush.isBranchUpdate) {
            return null;
        }
        // a version of an unchanged source still gets its tag, on the last commit
        if (hasChanges) {
            await workTree.git.commit(commitToPush.commitMessage);
        }
        const refSpecs = ["HEAD:refs/heads/" + commitToPush.pushBranch];
        if (commitToPush.tag) {
            await workTree.git.addAnnotatedTag(commitToPush.tag.name, commitToPush.tag.notes);
            refSpecs.push("refs/tags/" + commitToPush.tag.name);
        }
        // a branch refused alone would leave the tag pushed on a commit the branch does not hold
        await workTree.git.raw(["push", "--atomic", "origin", ...refSpecs]);
        const revParseOutput = await workTree.git.revparse(["HEAD"]);
        const commitId = revParseOutput.trim();
        return commitId;
    } finally {
        await removeWorkTree(workTree.directory);
    }
}

async function pushSourceFiles(context, commitToPush) {
    try {
        const commitId = await commitAndPushOnce(context, commitToPush);
        return commitId;
    } catch (error) {
        if (!pushRejectedRegex.test(error.message)) {
            throw error;
        }
        // the branch moved since the clone: one fresh clone, then the git server message if it moves again
        const retriedCommitId = await commitAndPushOnce(context, commitToPush);
        return retriedCommitId;
    }
}

/**
 * Checks the token can read and write the repository, links the source to it when a new URL is
 * given, and describes what the repository holds of the source.
 * @param {object} user - the logged user
 * @param {string} sourceName - the source name
 * @param {{userName: string, token: string}} credentials - the access token, with the user name some git servers require
 * @param {string} [newRepositoryUrl] - the repository to link the source to
 * @returns {Promise<object>} main branch, versions and branches of the source
 */
async function openRepository(user, sourceName, credentials, newRepositoryUrl) {
    const context = await openSourceContext(user, sourceName, credentials);
    const repositoryState = await readRepositoryState(context, newRepositoryUrl);
    try {
        await checkWriteAccess(repositoryState.repositoryUrl, context.credentials, context.author);
    } catch (error) {
        throw forbiddenIfTokenRefused(error);
    }
    if (newRepositoryUrl) {
        // read again after the git calls, so an edit of the source made meanwhile is kept
        const storedSources = await sourceModel.getAllSources();
        await sourceModel.updateSource({ ...storedSources[sourceName], gitRepository: { url: newRepositoryUrl } });
    }
    return repositoryState;
}

/**
 * The triples SLS holds that a branch does not, and the reverse.
 * @param {object} user - the logged user
 * @param {string} sourceName - the source name
 * @param {{userName: string, token: string}} credentials - the access token, with the user name some git servers require
 * @param {string} [branchName] - a branch of the source, the main branch when absent
 * @returns {Promise<object>} the counts and the first changed triples
 */
async function previewChanges(user, sourceName, credentials, branchName) {
    const context = await openSourceContext(user, sourceName, credentials);
    const repositoryState = await readRepositoryState(context);
    let comparedBranch = repositoryState.isMainBranchCreated ? repositoryState.mainBranch : null;
    if (branchName) {
        if (!repositoryState.branches.includes(branchName)) {
            throw requestError("Branch " + sourceRefName(sourceName, branchName) + " no longer exists in the repository", 404);
        }
        comparedBranch = sourceRefName(sourceName, branchName);
    }
    const currentTriples = await readCurrentTriples(context, null);
    let branchTriples = [];
    if (comparedBranch !== null) {
        const workTree = await prepareWorkTree(repositoryState.repositoryUrl, context.credentials, context.author, comparedBranch, sourceName);
        try {
            const turtlePath = path.join(workTree.directory, sourceName, sourceName + ".ttl");
            if (fs.existsSync(turtlePath)) {
                const turtleText = await fs.promises.readFile(turtlePath, "utf8");
                const branchQuads = parseQuads(turtleText);
                branchTriples = canonicalTriples(branchQuads, prefixesOfSource(context.source.graphUri));
            }
        } finally {
            await removeWorkTree(workTree.directory);
        }
    }
    const tripleDiff = diffTriples(branchTriples, currentTriples);
    const removedChanges = tripleDiff.removedLines.map((line) => ({ sign: "-", line: line }));
    const addedChanges = tripleDiff.addedLines.map((line) => ({ sign: "+", line: line }));
    const changes = removedChanges.concat(addedChanges);
    // ordered on the triple, so a changed value shows its removed and added lines together
    changes.sort((firstChange, secondChange) => (firstChange.line < secondChange.line ? -1 : 1));
    const shownChanges = changes.slice(0, previewLineCount);
    const preview = {
        comparedBranch: comparedBranch,
        branchTripleCount: branchTriples.length,
        sourceTripleCount: currentTriples.length,
        addedCount: tripleDiff.addedLines.length,
        removedCount: tripleDiff.removedLines.length,
        previewLines: shownChanges.map((change) => change.sign + " " + change.line),
    };
    return preview;
}

/**
 * Commits the source on the main branch and tags it <source>/<version>, then writes the version
 * as owl:versionInfo in the graph.
 * @param {object} user - the logged user
 * @param {string} sourceName - the source name
 * @param {{userName: string, token: string}} credentials - the access token, with the user name some git servers require
 * @param {string} versionName - the version typed by the user, any name git accepts in a tag
 * @param {string} releaseNotes - the message of the annotated tag
 * @returns {Promise<object>} the tag, the branch and the commit
 */
async function publishVersion(user, sourceName, credentials, versionName, releaseNotes) {
    const context = await openSourceContext(user, sourceName, credentials);
    const tagName = sourceRefName(sourceName, versionName);
    if (!(await isValidRefName("refs/tags/" + tagName))) {
        throw requestError(tagName + " is not a valid git tag name", 400);
    }
    const repositoryState = await readRepositoryState(context);
    if (repositoryState.versions.includes(versionName)) {
        throw requestError("Version " + versionName + " of " + sourceName + " already exists", 409);
    }
    const versionedTriples = await readCurrentTriples(context, versionName);
    const commitMessage = sourceName + " " + versionName;
    const commitId = await pushSourceFiles(context, {
        repositoryUrl: repositoryState.repositoryUrl,
        baseBranch: repositoryState.isMainBranchCreated ? repositoryState.mainBranch : null,
        pushBranch: repositoryState.mainBranch,
        commitMessage: commitMessage,
        tag: { name: tagName, notes: releaseNotes || commitMessage },
        isBranchUpdate: false,
        sourceFiles: buildSourceFiles(context, versionedTriples),
    });
    const publishedVersion = { tagName: tagName, branch: repositoryState.mainBranch, commitId: commitId };
    // after the push, so the graph never names a version the repository does not hold
    try {
        const graphUri = context.source.graphUri;
        const graphMetadata = await rdfDataModel.getRdfMetadata(graphUri);
        const previousVersionInfos = graphMetadata.filter((metadataEntry) => metadataEntry.metadata === owlVersionInfoIri);
        await rdfDataModel.removeMetadata(graphUri, previousVersionInfos);
        await rdfDataModel.addMetadata(graphUri, [{ metadata: owlVersionInfoIri, type: "literal", value: versionName }]);
    } catch (error) {
        // the version is in the repository already, an error here would make the user publish it twice
        publishedVersion.warning = "The version is published, but owl:versionInfo could not be written in the graph: " + error.message;
    }
    return publishedVersion;
}

/**
 * Commits the source as SLS holds it on <source>/<branch>: a new branch starts from the main branch,
 * an existing one is cloned again right before.
 * @param {object} user - the logged user
 * @param {string} sourceName - the source name
 * @param {{userName: string, token: string}} credentials - the access token, with the user name some git servers require
 * @param {string} branchName - the branch name typed by the user, without the source folder
 * @param {string} commitMessage - the commit message
 * @param {boolean} isBranchUpdate - true to update an existing branch, false to create it
 * @returns {Promise<object>} the branch and the commit, commitId null when an update finds nothing to commit
 */
async function pushBranch(user, sourceName, credentials, branchName, commitMessage, isBranchUpdate) {
    const context = await openSourceContext(user, sourceName, credentials);
    const fullBranchName = sourceRefName(sourceName, branchName);
    if (!(await isValidRefName("refs/heads/" + fullBranchName))) {
        throw requestError(fullBranchName + " is not a valid git branch name", 400);
    }
    const repositoryState = await readRepositoryState(context);
    const isBranchExisting = repositoryState.branches.includes(branchName);
    if (isBranchUpdate && !isBranchExisting) {
        throw requestError("Branch " + fullBranchName + " no longer exists in the repository", 404);
    }
    if (!isBranchUpdate && isBranchExisting) {
        throw requestError("Branch " + fullBranchName + " already exists, update it instead", 409);
    }
    let baseBranch = fullBranchName;
    if (!isBranchUpdate) {
        baseBranch = repositoryState.isMainBranchCreated ? repositoryState.mainBranch : null;
    }
    const currentTriples = await readCurrentTriples(context, null);
    const commitId = await pushSourceFiles(context, {
        repositoryUrl: repositoryState.repositoryUrl,
        baseBranch: baseBranch,
        pushBranch: fullBranchName,
        commitMessage: commitMessage,
        tag: null,
        isBranchUpdate: isBranchUpdate,
        sourceFiles: buildSourceFiles(context, currentTriples),
    });
    const pushedBranch = { branch: fullBranchName, commitId: commitId };
    return pushedBranch;
}

export { openRepository, previewChanges, publishVersion, pushBranch };
