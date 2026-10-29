import { findUserSource } from "../../../../../bin/AI/ontologyRuns.js";
import { conversationIdRegex, conversationKinds, listVersionConversations, saveConversation } from "../../../../../bin/AI/revisionConversations.js";

export default function () {
    let operations = {
        GET,
        POST,
    };

    async function GET(req, res, _next) {
        try {
            const found = await findUserSource(req, req.query.source);
            if (found.error) {
                return res.status(found.status).json({ error: found.error });
            }
            const conversations = await listVersionConversations(req.query.source, req.query.kind, req.query.versionName);
            res.status(200).json({ conversations: conversations });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }

    async function POST(req, res, _next) {
        try {
            const found = await findUserSource(req, req.body.source);
            if (found.error) {
                return res.status(found.status).json({ error: found.error });
            }
            const conversation = req.body.conversation;
            if (!conversationIdRegex.test(conversation.conversationId)) {
                return res.status(400).json({ error: "conversationId must be 8 to 64 lowercase letters, digits or dashes" });
            }
            await saveConversation(req.body.source, {
                conversationId: conversation.conversationId,
                kind: conversation.kind,
                versionNames: conversation.versionNames,
                messages: conversation.messages,
                updatedAt: new Date().toISOString(),
            });
            res.status(200).json({ saved: conversation.conversationId });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }

    GET.apiDoc = {
        security: [{ restrictAdmin: [] }],
        summary: "List the revision conversations about a version",
        description:
            "Lists the conversations with the revision agent saved for a source under `data/semanticVirtualDB/conversations/<source>/`, of one kind, " +
            "that discussed or saved the given version, last updated first.",
        operationId: "getOntologyFromDbConversations",
        parameters: [
            { name: "source", in: "query", type: "string", required: true, description: "Source whose conversations are read." },
            { name: "kind", in: "query", type: "string", required: true, enum: conversationKinds, description: "What the conversations revise." },
            {
                name: "versionName",
                in: "query",
                type: "string",
                required: true,
                description: "Run name or mapping name, as GET /ai/ontologyFromDb/runs or GET /ai/ontologyFromDb/mappings lists it.",
            },
        ],
        responses: {
            200: { description: "{ conversations: [{ conversationId, kind, versionNames, messages, updatedAt }] }, versionNames in the order the conversation met them" },
            404: { description: "The source is unknown to the user." },
        },
        tags: ["AI"],
    };

    POST.apiDoc = {
        security: [{ restrictAdmin: [] }],
        summary: "Save a revision conversation",
        description: "Creates or replaces the conversation of that id, with the versions it discussed or saved.",
        operationId: "postOntologyFromDbConversation",
        parameters: [
            {
                name: "body",
                in: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["source", "conversation"],
                    properties: {
                        source: { type: "string" },
                        conversation: {
                            type: "object",
                            required: ["conversationId", "kind", "versionNames", "messages"],
                            properties: {
                                conversationId: { type: "string", description: "Chosen by the page at the first message: 8 to 64 lowercase letters, digits or dashes." },
                                kind: { type: "string", enum: conversationKinds },
                                versionNames: { type: "array", minItems: 1, items: { type: "string" } },
                                messages: { type: "array", items: { type: "object" }, description: "The conversation as the revise route takes it." },
                            },
                        },
                    },
                },
            },
        ],
        responses: {
            200: { description: "{ saved: conversationId }" },
            400: { description: "A malformed conversation." },
            404: { description: "The source is unknown to the user." },
        },
        tags: ["AI"],
    };

    return operations;
}
