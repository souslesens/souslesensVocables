import { findSourceRun, getRunGraphUri, getTboxSourceName, isTboxSourceOf } from "../../../../../bin/AI/ontologyRuns.js";
import { firstOntologyVersion } from "../../../../../bin/AI/ontologyAnswer.js";
import { setRunnerSource } from "../../../../../bin/remoteCodeRunner.js";
import { sourceModel } from "../../../../../model/sources.js";
import { rdfDataModel } from "../../../../../model/rdfData.js";

export default function () {
    let operations = {
        POST,
    };

    async function POST(req, res, _next) {
        try {
            const source = req.body.source;
            const found = await findSourceRun(req, source, req.body.runName);
            if (found.error) {
                return res.status(found.status).json({ error: found.error });
            }
            const graphUri = getRunGraphUri(found.sourceConfig.graphUri, found.run.runTimestamp);
            if (!(await rdfDataModel.ask(graphUri, [null, null, null]))) {
                return res.status(409).json({ error: "the graph of " + req.body.runName + " holds no triple: open the version once to load it" });
            }
            const ontologyVersion = found.run.savedRun?.ontologyVersion ?? firstOntologyVersion;
            const tboxSourceName = getTboxSourceName(source, ontologyVersion);
            // sources.json as stored, without the fields getUserSources adds for the user
            const storedSources = await sourceModel.getAllSources();
            if (storedSources[tboxSourceName]) {
                return res.status(409).json({ error: "version " + ontologyVersion + " is already validated as " + tboxSourceName });
            }
            const storedSource = storedSources[source];

            // the validated version is read only: a change is a new version, validated in turn
            const tboxSource = { ...structuredClone(storedSource), name: tboxSourceName, graphUri: graphUri, imports: found.run.savedRun?.upperOntologies ?? [], editable: false };
            delete tboxSource.id;
            await sourceModel.addSource(tboxSource);
            const previousTboxSources = (storedSource.imports || []).filter((importedSource) => isTboxSourceOf(source, importedSource));
            const otherImports = (storedSource.imports || []).filter((importedSource) => !isTboxSourceOf(source, importedSource));
            const updatedSource = { ...storedSource, imports: [tboxSourceName, ...otherImports] };
            // a TBOX source the source does not import would block every later validation of this version
            let isSourceUpdated = false;
            try {
                isSourceUpdated = await sourceModel.updateSource(updatedSource);
            } finally {
                if (!isSourceUpdated) {
                    await sourceModel.deleteSource(tboxSourceName);
                }
            }
            if (!isSourceUpdated) {
                return res.status(404).json({ error: source + " is no longer declared" });
            }
            setRunnerSource(tboxSourceName, tboxSource);
            setRunnerSource(source, updatedSource);

            res.status(200).json({
                tboxSource: tboxSourceName,
                tboxSourceConfig: tboxSource,
                graphUri: graphUri,
                imports: updatedSource.imports,
                replacedImports: previousTboxSources,
            });
        } catch (error) {
            console.error(error);
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    POST.apiDoc = {
        security: [{ restrictAdmin: [] }],
        summary: "Validate an ontology version of a source",
        description:
            "Declares the version as the source `<source>_TBOX_<version>` (dots of the version as `_`), read only, whose graph is the graph of the version " +
            "and whose imports are the upper ontologies the version was built on. The source then imports it in place of the TBOX source of a version validated before, " +
            "which stays declared. A new generation leaves the TBOX imports out of its upper ontologies.",
        operationId: "validateOntologyFromDbRun",
        parameters: [
            {
                name: "body",
                in: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["source", "runName"],
                    properties: {
                        source: { type: "string", description: "Source the version was built for." },
                        runName: { type: "string", description: "Run name, as GET /ai/ontologyFromDb/runs lists it." },
                    },
                },
            },
        ],
        responses: {
            200: { description: "{ tboxSource, tboxSourceConfig, graphUri, imports, replacedImports }: imports is the new import list of the source." },
            404: { description: "The source or the run is unknown to the user." },
            409: { description: "The graph of the version is empty, or the version is already validated." },
        },
        tags: ["AI"],
    };

    return operations;
}
