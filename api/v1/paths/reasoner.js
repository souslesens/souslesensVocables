import ConfigManager from "../../../bin/configManager.js";
import httpProxy, { isVirtuosoUrl } from "../../../bin/httpProxy.js";
import UserRequestFiltering from "../../../bin/userRequestFiltering.js";
import { endpointAuthForUrl, endpointUrlForSource, sparqlResultsHeaders } from "../../../bin/endpointLimits.js";
import { graphUrisForSource } from "./sparql/select.js";
import { processResponse } from "./utils.js";

// imported on demand: their command line entry uses a top-level await, which the route loader cannot require
const reasonerFileByOperation = {
    consistency: "../../../bin/reasoner/owl-consistency.mjs",
    unsatisfiable: "../../../bin/reasoner/owl-unsatisfiable.mjs",
    inference: "../../../bin/reasoner/owl-inference.mjs",
};
// Virtuoso pragma: join the patterns in the order they are written
const virtuosoWrittenJoinOrder = 'DEFINE sql:select-option "order" ';

export default function () {
    let operations = {
        GET,
    };

    async function GET(req, res, _next) {
        try {
            const operation = req.query.operation;
            if (operation == "inferenceRules") {
                const owlInference = await import(reasonerFileByOperation.inference);
                const inferenceRules = owlInference.RULES.map((rule) => ({ id: rule.id, description: rule.description }));
                return processResponse(res, null, inferenceRules);
            }
            const reasonerFile = reasonerFileByOperation[operation];
            if (!reasonerFile) {
                return res.status(400).json({ message: `Unknown operation "${operation}".` });
            }
            let ruleIds;
            if (operation == "inference") {
                ruleIds = JSON.parse(req.query.ruleIds || "[]");
                if (!Array.isArray(ruleIds) || ruleIds.length == 0) {
                    return res.status(400).json({ message: "Inference needs `ruleIds`, a non empty JSON array of rule ids." });
                }
            }

            const userSources = await ConfigManager.getUserSources(req, res);
            const source = userSources[req.query.source];
            if (!source) {
                return res.status(404).json({ message: `Unknown source "${req.query.source}", or it is not readable by this account.` });
            }
            // without FROM the rules would read every graph of the endpoint
            const graphs = graphUrisForSource(source, userSources, true);
            if (graphs.length == 0) {
                return res.status(400).json({ message: `Source "${req.query.source}" declares no graph.` });
            }

            const endpointUrl = endpointUrlForSource(source);
            const endpointAuth = endpointAuthForUrl(endpointUrl);
            const user = await ConfigManager.getUser(req, res);
            const request = async function (query) {
                const allowedQuery = await UserRequestFiltering.filterSparqlRequestAsync(query, userSources, user);
                // the rules are written axiom first; left to its optimizer Virtuoso starts from the assertions and runs past 60 s
                const queryToRun = isVirtuosoUrl(endpointUrl) ? virtuosoWrittenJoinOrder + allowedQuery : allowedQuery;
                const params = { query: queryToRun, format: "json" };
                if (endpointAuth) {
                    params.auth = { ...endpointAuth };
                }
                return new Promise(function (resolve, reject) {
                    httpProxy.post(endpointUrl, sparqlResultsHeaders, params, function (endpointError, result) {
                        if (endpointError) {
                            return reject(new Error(typeof endpointError == "string" ? endpointError : JSON.stringify(endpointError)));
                        }
                        resolve(result);
                    });
                });
            };

            const reasoner = await import(reasonerFile);
            const report = await reasoner.run({ request: request, graphs: graphs, ruleIds: ruleIds });
            return processResponse(res, null, report);
        } catch (error) {
            // the reasoner names the failing rule, the cause carries the endpoint answer
            const causeMessage = error.cause ? " " + error.cause.message : "";
            return processResponse(res, error.message + causeMessage, null);
        }
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Run the SPARQL reasoner rules on a source",
        description:
            "Runs the read-only SPARQL rules of bin/reasoner on the graphs of `source` and its imports. " +
            "`consistency` and `unsatisfiable` return the violations found by each rule, `inference` the triples the rules infer and the store does not hold yet. " +
            "`inferenceRules` lists the inference rules, `ruleIds` restricts `inference` to some of them.",
        operationId: "reasonerRun",
        parameters: [
            {
                name: "operation",
                in: "query",
                type: "string",
                required: true,
                enum: ["consistency", "unsatisfiable", "inference", "inferenceRules"],
                description: "Reasoner operation.",
            },
            { name: "source", in: "query", type: "string", required: false, description: "SLS source name. Example: `BFO`." },
            { name: "ruleIds", in: "query", type: "string", required: false, description: "JSON-encoded array of inference rule ids." },
        ],
        responses: {
            200: {
                description: "Reasoner report, or the list of inference rules.",
                schema: {
                    type: "object",
                    additionalProperties: true,
                },
            },
            400: { description: "Unknown operation, or source without graph." },
            404: { description: "Unknown or unreadable source." },
        },
        tags: ["Reasoner"],
    };

    return operations;
}
