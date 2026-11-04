import { readFile, rm } from "fs/promises";
import { runningGenerations, getDraftGraphUri, findSourceOntology, findSourceRun, loadTurtleIntoGraph, getRunProblems } from "../../../../../bin/AI/ontologyFromDb/ontology/ontologyRuns.js";
import { readDraftTriples, getGraphHash, updateGraphCheck } from "../../../../../bin/AI/ontologyFromDb/ontology/draftGraph.js";
import { deleteVersionConversations } from "../../../../../bin/AI/ontologyFromDb/revision/revisionConversations.js";

export default function () {
    let operations = {
        GET,
        POST,
    };

    function getOntologyDescription(found, draftTriples) {
        const savedRun = found.run.savedRun;
        const chatbotChanges = savedRun.chatbotChanges ?? [];
        return {
            runName: found.run.runName,
            database: found.run.database,
            graphUri: getDraftGraphUri(found.sourceConfig.graphUri),
            model: savedRun.model ?? null,
            totalSeconds: savedRun.totalSeconds ?? null,
            usage: savedRun.usage ?? null,
            isLoadPending: found.run.hasPendingTurtle,
            isValidated: Boolean(savedRun.validatedAt),
            validatedAt: savedRun.validatedAt ?? null,
            hasUnvalidatedChanges: Boolean(draftTriples) && getGraphHash(draftTriples) != savedRun.validatedGraphHash,
            lastChatbotChange: chatbotChanges.length > 0 ? chatbotChanges[chatbotChanges.length - 1].summary : null,
            problems: getRunProblems(savedRun),
        };
    }

    async function GET(req, res, _next) {
        try {
            const found = await findSourceOntology(req, req.query.source);
            if (found.error) {
                return res.status(found.status).json({ error: found.error });
            }
            const generating = runningGenerations[req.query.source] ?? null;
            if (!found.run) {
                return res.status(200).json({ ontology: null, generating: generating });
            }
            const draftTriples = await readDraftTriples(getDraftGraphUri(found.sourceConfig.graphUri));
            res.status(200).json({ ontology: getOntologyDescription(found, draftTriples), generating: generating });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }

    async function POST(req, res, _next) {
        try {
            const source = req.body.source;
            const found = await findSourceRun(req, source);
            if (found.error) {
                return res.status(found.status).json({ error: found.error });
            }
            const graphUri = getDraftGraphUri(found.sourceConfig.graphUri);
            // a generation stopped before its graph was loaded: its answer is not paid twice
            if (found.run.hasPendingTurtle && !runningGenerations[source]) {
                const turtle = await readFile(found.run.turtlePath, "utf8");
                found.run.savedRun.graphTripleCount = await loadTurtleIntoGraph(turtle, graphUri);
                found.run.savedRun.graphError = null;
                delete found.run.savedRun.answer;
                await rm(found.run.turtlePath, { force: true });
                found.run.hasPendingTurtle = false;
                await deleteVersionConversations(source, "ontology", found.run.runName);
            }
            const draftTriples = await readDraftTriples(graphUri);
            if (!draftTriples) {
                return res.status(409).json({ error: "the draft of " + source + " holds no triple: restart the AI process" });
            }
            // checked again when the graph changed since its last check, never fixed: no LLM call
            await updateGraphCheck(found, source, draftTriples);
            res.status(200).json(getOntologyDescription(found, draftTriples));
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }

    const ontologyFields =
        "{ runName, database, graphUri, model, totalSeconds, usage, isLoadPending, isValidated, validatedAt, hasUnvalidatedChanges, lastChatbotChange, problems }, " +
        "isLoadPending when a Turtle waits to be loaded in the draft, hasUnvalidatedChanges when the draft differs from what the last validation wrote, " +
        "lastChatbotChange the summary of the change POST /ai/ontologyFromDb/undo would take back, " +
        "problems the texts of what keeps the draft from being validated, as its last check found them: once its graph is checked, a class without parent, a reference to a local term the graph does not declare, " +
        "before, the problems met writing its Turtle; then the restrictions outside the domain or range of their property, or restrictions not checked.";

    GET.apiDoc = {
        security: [{ restrictAdmin: [] }],
        summary: "Read the ontology of a source",
        description:
            "A source has one ontology, its run file saved under `data/semanticVirtualDB/<database>/<source>_ontology.json`, its triples in the draft `<source graphUri>/semanticvirtualdb/`. " +
            "`generating` describes the generation running for the source in this server process, if any.",
        operationId: "getOntologyFromDbRuns",
        parameters: [{ name: "source", in: "query", type: "string", required: true, description: "Source whose ontology is read." }],
        responses: {
            200: { description: "{ ontology, generating }: ontology " + ontologyFields + " Null before the first generation. generating: { startedAt, database, step } or null" },
            404: { description: "The source is unknown to the user." },
        },
        tags: ["AI"],
    };

    POST.apiDoc = {
        security: [{ restrictAdmin: [] }],
        summary: "Open the ontology of a source: load a Turtle still waiting, check the draft if it changed",
        description:
            "A generation keeps its Turtle until its graph is loaded: one left by a failure or a stopped server is loaded here, then removed. " +
            "When the draft changed since its last check, or was never checked, it is checked again, without any LLM call, and the problems are written in the run file.",
        operationId: "postOntologyFromDbRun",
        parameters: [
            {
                name: "body",
                in: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["source"],
                    properties: { source: { type: "string" } },
                },
            },
        ],
        responses: {
            200: { description: ontologyFields },
            404: { description: "The source is unknown, or it has no ontology." },
            409: { description: "The draft is empty and no Turtle waits to be loaded." },
        },
        tags: ["AI"],
    };

    return operations;
}
