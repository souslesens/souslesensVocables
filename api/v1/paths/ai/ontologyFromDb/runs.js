import { readFile, rm } from "fs/promises";
import userManager from "../../../../../bin/user.js";
import { getRunGraphUri, listSourceRuns, loadTurtleIntoGraph } from "../../../../../bin/AI/ontologyRuns.js";
import { sourceModel } from "../../../../../model/sources.js";
import { rdfDataModel } from "../../../../../model/rdfData.js";

export default function () {
    let operations = {
        GET,
        POST,
        DELETE,
    };

    // the source config of the user and its runs, or the HTTP error to answer
    async function findSourceRuns(req, sourceName) {
        const userInfo = await userManager.getUser(req.user);
        const userSources = await sourceModel.getUserSources(userInfo.user);
        if (!userSources[sourceName]) {
            return { status: 404, error: sourceName + " not found" };
        }
        return { sourceConfig: userSources[sourceName], runs: await listSourceRuns(sourceName) };
    }

    // the run named in the request is looked up among the runs of the source: a name never reaches a file path
    async function findSourceRun(req, sourceName, runName) {
        const found = await findSourceRuns(req, sourceName);
        if (found.error) {
            return found;
        }
        found.run = found.runs.find((sourceRun) => sourceRun.runName == runName);
        if (!found.run) {
            return { status: 404, error: "no run " + runName + " for " + sourceName };
        }
        return found;
    }

    async function GET(req, res, _next) {
        try {
            const found = await findSourceRuns(req, req.query.source);
            if (found.error) {
                return res.status(found.status).json({ error: found.error });
            }
            const runDescriptions = [];
            for (const run of found.runs) {
                const graphUri = getRunGraphUri(found.sourceConfig.graphUri, run.runTimestamp);
                runDescriptions.push({
                    runName: run.runName,
                    runTimestamp: run.runTimestamp,
                    database: run.database,
                    graphUri: graphUri,
                    model: run.savedRun?.model ?? null,
                    // the first runs were saved before the run file carried a total time
                    totalSeconds: run.savedRun?.totalSeconds ?? null,
                    usage: run.savedRun?.usage ?? null,
                    isGraphLoaded: await rdfDataModel.ask(graphUri, [null, null, null]),
                });
            }
            res.status(200).json({ runs: runDescriptions });
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
            const turtle = await readFile(found.run.turtlePath, "utf8");
            const tripleCount = await loadTurtleIntoGraph(turtle, graphUri);
            res.status(200).json({ graphUri: graphUri, tripleCount: tripleCount });
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
            await rdfDataModel.deleteGraph(getRunGraphUri(found.sourceConfig.graphUri, found.run.runTimestamp));
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
            "with the model, the total time and the token usage of the run file, its graph `<source graphUri>/virtual-db-creator/<run timestamp>/` and whether that graph holds triples.",
        operationId: "getOntologyFromDbRuns",
        parameters: [sourceParameter],
        responses: {
            200: { description: "{ runs: [{ runName, runTimestamp, database, graphUri, model, totalSeconds, usage, isGraphLoaded }] }" },
            404: { description: "The source is unknown to the user." },
        },
        tags: ["AI"],
    };

    POST.apiDoc = {
        security: [{ restrictAdmin: [] }],
        summary: "Load the Turtle of a run into its graph",
        description: "Replaces the content of the run graph `<source graphUri>/virtual-db-creator/<run timestamp>/` by the triples of the `.ttl` file of the run.",
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
            200: { description: "{ graphUri, tripleCount }" },
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
