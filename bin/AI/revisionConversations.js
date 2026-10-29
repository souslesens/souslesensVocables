import { mkdir, readdir, readFile, rename, writeFile } from "fs/promises";
import { join } from "path";
import { llmAnswersDirectory, nonNameCharacterRegex } from "./ontologyRuns.js";

// a conversation with a revision agent, kept with the names of every version it discussed or saved: it reopens from any of them
const conversationsDirectory = join(llmAnswersDirectory, "conversations");
// chosen by the page that started it, the only part of a request that reaches a file name
const conversationIdRegex = /^[a-z0-9-]{8,64}$/;
const conversationKinds = ["ontology", "mapping"];

function getSourceConversationsDirectory(source) {
    return join(conversationsDirectory, source.replace(nonNameCharacterRegex, "_"));
}

// the conversations of a kind that touched a version, last updated first
async function listVersionConversations(source, kind, versionName) {
    const sourceConversationsDirectory = getSourceConversationsDirectory(source);
    let fileNames = [];
    try {
        fileNames = await readdir(sourceConversationsDirectory);
    } catch (readError) {
        // no conversation saved yet for this source
        if (readError.code == "ENOENT") {
            return [];
        }
        throw readError;
    }
    const versionConversations = [];
    for (const fileName of fileNames) {
        if (!fileName.endsWith(".json")) {
            continue;
        }
        let conversation = null;
        try {
            conversation = JSON.parse(await readFile(join(sourceConversationsDirectory, fileName), "utf8"));
        } catch (readError) {
            // a file cut by a stopped server hides one conversation, not the list
            if (readError instanceof SyntaxError) {
                continue;
            }
            throw readError;
        }
        if (conversation.kind == kind && conversation.versionNames.includes(versionName)) {
            versionConversations.push(conversation);
        }
    }
    versionConversations.sort((conversation1, conversation2) => conversation2.updatedAt.localeCompare(conversation1.updatedAt));
    return versionConversations;
}

async function saveConversation(source, conversation) {
    const sourceConversationsDirectory = getSourceConversationsDirectory(source);
    await mkdir(sourceConversationsDirectory, { recursive: true });
    // written aside then renamed: a listing never reads it half written
    const conversationPath = join(sourceConversationsDirectory, conversation.conversationId + ".json");
    await writeFile(conversationPath + ".tmp", JSON.stringify(conversation));
    await rename(conversationPath + ".tmp", conversationPath);
}

export { conversationIdRegex, conversationKinds, listVersionConversations, saveConversation };
