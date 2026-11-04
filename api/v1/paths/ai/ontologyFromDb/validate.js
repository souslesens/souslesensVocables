import { readFile, writeFile } from "fs/promises";
import rdflib from "rdflib";
import { findSourceRun, getDraftGraphUri, getValidatedTriplesPath, getRunProblems, runningGenerations, updateGraphTriples } from "../../../../../bin/AI/ontologyFromDb/ontology/ontologyRuns.js";
import { readDraftTriples, getGraphHash, updateGraphCheck } from "../../../../../bin/AI/ontologyFromDb/ontology/draftGraph.js";
import { getEnrichedOntologyModel } from "../../../../../bin/enrichedOntologyModel.js";
import { ontologyModelsCache, enrichedOntologyModelsCache } from "../../ontologyModels.js";

export default function () {
    let operations = {
        POST,
    };

    async function readValidatedTriples(source) {
        try {
            const validatedText = await readFile(getValidatedTriplesPath(source), "utf8");
            return validatedText.split("\n");
        } catch (readError) {
            if (readError.code == "ENOENT") {
                return [];
            }
            throw readError;
        }
    }

    async function POST(req, res, _next) {
        try {
            const source = req.body.source;
            const found = await findSourceRun(req, source);
            if (found.error) {
                return res.status(found.status).json({ error: found.error });
            }
            if (runningGenerations[source]) {
                return res.status(409).json({ error: "a generation is running for " + source });
            }
            const draftGraphUri = getDraftGraphUri(found.sourceConfig.graphUri);
            const draftTriples = await readDraftTriples(draftGraphUri);
            if (!draftTriples) {
                return res.status(409).json({ error: "the draft of " + source + " holds no triple: open it once to load it" });
            }
            // the graph validated is the graph checked: an edit made in the whiteboard since the last opening is checked here
            await updateGraphCheck(found, source, draftTriples);
            const savedRun = found.run.savedRun;
            const runProblems = getRunProblems(savedRun);
            if (runProblems.length > 0) {
                // a check that failed is retried when the draft is opened again: the chatbot would not help
                const runProblemsError = source + " cannot be validated: " + runProblems.length + " problems, listed under the ontology";
                return res.status(409).json({ error: runProblemsError, problems: runProblems });
            }
            const draftStore = rdflib.graph();
            rdflib.parse(draftTriples, draftStore, draftGraphUri, "text/turtle");
            const draftTripleLines = draftStore.statements.map((statement) => statement.toNT());
            const draftTripleSet = new Set(draftTripleLines);
            const validatedTriples = await readValidatedTriples(source);
            const removedTriples = validatedTriples.filter((validatedTriple) => !draftTripleSet.has(validatedTriple));

            // the graph of the source also holds what the mappings build: only what the last validation wrote is taken back.
            // Every triple is written again: a failure in the middle is repaired by validating again, and so is a graph emptied since
            await updateGraphTriples(found.sourceConfig.graphUri, removedTriples, draftTripleLines);
            await writeFile(getValidatedTriplesPath(source), draftTripleLines.join("\n"));
            savedRun.validatedAt = new Date().toISOString();
            savedRun.validatedGraphHash = getGraphHash(draftTriples);
            await writeFile(found.run.jsonPath, JSON.stringify(savedRun, null, 2));

            // the mapping tab reads the model of the source
            delete ontologyModelsCache[source];
            delete enrichedOntologyModelsCache[source];
            await getEnrichedOntologyModel(source, { user: found.userInfo, userSources: found.userSources });

            res.status(200).json({ validatedAt: savedRun.validatedAt, writtenTripleCount: draftTripleLines.length, removedTripleCount: removedTriples.length });
        } catch (error) {
            console.error(error);
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    POST.apiDoc = {
        security: [{ restrictAdmin: [] }],
        summary: "Validate the ontology of a source",
        description:
            "Checks the draft `<source graphUri>/semanticvirtualdb/` and writes its triples in the graph of the source. " +
            "The triples the last validation wrote and the draft no longer holds are deleted there, from the list kept in `data/semanticVirtualDB/<source>_validatedTriples.nt`: the other triples of that graph, what the mappings build among them, stay.",
        operationId: "validateOntologyFromDbRun",
        parameters: [
            {
                name: "body",
                in: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["source"],
                    properties: {
                        source: { type: "string", description: "Source whose draft is validated." },
                    },
                },
            },
        ],
        responses: {
            200: { description: "{ validatedAt, writtenTripleCount, removedTripleCount }" },
            404: { description: "The source is unknown to the user, or it has no ontology." },
            409: { description: "The draft has problems, its graph checked again if it changed, listed in problems; or it is empty, or a generation is running." },
        },
        tags: ["AI"],
    };

    return operations;
}
