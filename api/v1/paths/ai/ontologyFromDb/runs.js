import { readFile, rm } from "fs/promises";
import { runningGenerations, getRunGraphUri, findSourceRuns, findSourceRun, loadTurtleIntoGraph, getRunProblems } from "../../../../../bin/AI/ontologyRuns.js";
import { readGraphTriples, updateGraphCheck } from "../../../../../bin/AI/versionGraph.js";
import { rdfDataModel } from "../../../../../model/rdfData.js";

export default function () {
    let operations = {
        GET,
        POST,
        DELETE,
    };

    async function GET(req, res, _next) {
        try {
            const found = await findSourceRuns(req, req.query.source);
            if (found.error) {
                return res.status(found.status).json({ error: found.error });
            }
            // a validated version is the graph of a TBOX source
            const sourceNamesByGraphUri = {};
            for (const [sourceName, sourceConfig] of Object.entries(found.userSources)) {
                sourceNamesByGraphUri[sourceConfig.graphUri] = sourceName;
            }
            const runDescriptions = [];
            for (const run of found.runs) {
                const graphUri = getRunGraphUri(found.sourceConfig.graphUri, run.runTimestamp);
                runDescriptions.push({
                    validatedAs: sourceNamesByGraphUri[graphUri] ?? null,
                    runName: run.runName,
                    runTimestamp: run.runTimestamp,
                    database: run.database,
                    graphUri: graphUri,
                    model: run.savedRun?.model ?? null,
                    ontologyVersion: run.savedRun?.ontologyVersion ?? null,
                    // a revision names the run it was made from
                    parentRunName: run.savedRun?.revision?.parentRunName ?? null,
                    revisionSummary: run.savedRun?.revision?.summary ?? null,
                    // the first runs were saved before the run file carried a total time
                    totalSeconds: run.savedRun?.totalSeconds ?? null,
                    usage: run.savedRun?.usage ?? null,
                    problems: getRunProblems(run.savedRun),
                });
            }
            res.status(200).json({ runs: runDescriptions, generating: runningGenerations[req.query.source] ?? null });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }

    async function POST(req, res, _next) {
        try {
            const found = await findSourceRun(req, req.body.source, req.body.runName);
            if (found.error) {
                return res.status(found.status).json({ error: found.error });
            }
            const graphUri = getRunGraphUri(found.sourceConfig.graphUri, found.run.runTimestamp);
            // the graph holds the version with the edits made in the whiteboard: the file loads it only when it is empty
            let graphTriples = await readGraphTriples(graphUri);
            if (!graphTriples) {
                const turtle = await readFile(found.run.turtlePath, "utf8");
                await loadTurtleIntoGraph(turtle, graphUri);
                graphTriples = await readGraphTriples(graphUri);
            }
            // checked again when the graph changed since its last check, never fixed: no LLM call
            await updateGraphCheck(found, req.body.source, graphTriples);
            const runProblems = getRunProblems(found.run.savedRun);
            res.status(200).json({ graphUri: graphUri, problems: runProblems });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }

    async function DELETE(req, res, _next) {
        try {
            const found = await findSourceRun(req, req.query.source, req.query.runName);
            if (found.error) {
                return res.status(found.status).json({ error: found.error });
            }
            const graphUri = getRunGraphUri(found.sourceConfig.graphUri, found.run.runTimestamp);
            const validatingSource = Object.values(found.userSources).find((sourceConfig) => sourceConfig.graphUri == graphUri);
            if (validatingSource) {
                return res.status(409).json({ error: found.run.runName + " is validated as the source " + validatingSource.name + ", which reads its graph" });
            }
            await rdfDataModel.deleteGraph(graphUri);
            await rm(found.run.turtlePath, { force: true });
            await rm(found.run.jsonPath, { force: true });
            res.status(200).json({ deleted: found.run.runName });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }

    const sourceParameter = { name: "source", in: "query", type: "string", required: true, description: "Source whose ontology runs are read." };
    const runNameParameter = { name: "runName", in: "query", type: "string", required: true, description: "Run name, as GET lists it: <source>_<run timestamp>." };

    GET.apiDoc = {
        security: [{ restrictAdmin: [] }],
        summary: "List the ontology generation runs of a source",
        description:
            "Lists the runs of POST /ai/ontologyFromDb saved for a source under `data/semanticVirtualDB/<database>/`, newest first, " +
            "with the model, the total time and the token usage of the run file, its graph `<source graphUri>/virtual-db-creator/<run timestamp>/` and the problems its last check found. " +
            "`generating` describes the generation running for the source in this server process, if any.",
        operationId: "getOntologyFromDbRuns",
        parameters: [sourceParameter],
        responses: {
            200: {
                description:
                    "{ runs: [{ validatedAs, runName, runTimestamp, database, graphUri, model, ontologyVersion, parentRunName, revisionSummary, totalSeconds, usage, problems }] }, parentRunName and revisionSummary set on a run made by POST /ai/ontologyFromDb/revise, " +
                    "problems the texts of what keeps the version from being validated, as its last check found them: once its graph is checked, a class without parent, a reference to a local term the graph does not declare, " +
                    "before, the problems met writing its Turtle; then the restrictions outside the domain or range of their property, or restrictions not checked. generating: { startedAt, database, step } or null",
            },
            404: { description: "The source is unknown to the user." },
        },
        tags: ["AI"],
    };

    POST.apiDoc = {
        security: [{ restrictAdmin: [] }],
        summary: "Open a run: load its graph if empty, check it if it changed",
        description:
            "Loads the triples of the `.ttl` file of the run into its graph `<source graphUri>/virtual-db-creator/<run timestamp>/` when that graph is empty: " +
            "a graph already loaded holds the version with the edits made in the whiteboard and is kept. " +
            "When the graph changed since its last check, or was never checked, it is checked again, without any LLM call: " +
            "the problems are written in the run file and the graph in its `.ttl`.",
        operationId: "postOntologyFromDbRun",
        parameters: [
            {
                name: "body",
                in: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["source", "runName"],
                    properties: { source: { type: "string" }, runName: { type: "string" } },
                },
            },
        ],
        responses: {
            200: { description: "{ graphUri, problems }: problems as GET lists them, once the graph is checked." },
            404: { description: "The source or the run is unknown." },
        },
        tags: ["AI"],
    };

    DELETE.apiDoc = {
        security: [{ restrictAdmin: [] }],
        summary: "Delete a run: its graph and its files",
        description: "Drops the run graph and deletes the `.ttl` and `.json` files of the run.",
        operationId: "deleteOntologyFromDbRun",
        parameters: [sourceParameter, runNameParameter],
        responses: {
            200: { description: "{ deleted: runName }" },
            404: { description: "The source or the run is unknown." },
        },
        tags: ["AI"],
    };

    return operations;
}
