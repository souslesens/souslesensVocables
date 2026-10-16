import ConfigManager from "../../../bin/configManager.js";
import httpProxy from "../../../bin/httpProxy.js";
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
const ruleTimeoutMs = 60000;
const emptySelectResult = { head: { vars: [] }, results: { bindings: [] } };

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
            const failedChecks = [];
            const runQuery = async function (query) {
                const allowedQuery = await UserRequestFiltering.filterSparqlRequestAsync(query, userSources, user);
                const params = { query: allowedQuery, format: "json" };
                if (endpointAuth) {
                    params.auth = { ...endpointAuth };
                }
                return new Promise(function (resolve, reject) {
                    // the endpoint keeps running an abandoned query, this only frees the report
                    const timeout = setTimeout(function () {
                        reject(new Error(`no answer after ${ruleTimeoutMs / 1000} s`));
                    }, ruleTimeoutMs);
                    httpProxy.post(endpointUrl, sparqlResultsHeaders, params, function (endpointError, result) {
                        clearTimeout(timeout);
                        if (endpointError) {
                            return reject(new Error(typeof endpointError == "string" ? endpointError : JSON.stringify(endpointError)));
                        }
                        resolve(result);
                    });
                });
            };
            // the reasoner rejects the whole run on the first failing rule: a failed or unselected rule answers empty and the failure is reported
            const request = async function (query, { ruleId }) {
                if (ruleIds && !ruleIds.includes(ruleId)) {
                    return emptySelectResult;
                }
                try {
                    return await runQuery(query);
                } catch (error) {
                    failedChecks.push({ id: ruleId, error: error.message });
                    return emptySelectResult;
                }
            };

            const reasoner = await import(reasonerFile);
            const report = await reasoner.run({ request: request, graphs: graphs });
            if (ruleIds) {
                report.checks = report.checks.filter((check) => ruleIds.includes(check.id));
            }
            report.failedChecks = failedChecks;
            if (failedChecks.length > 0) {
                report.status = "incomplete, " + report.status;
            }
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
            "`inferenceRules` lists the inference rules, `ruleIds` restricts `inference` to some of them. " +
            "A rule that fails or gets no answer within 60 s is listed in `failedChecks`, and its check then says nothing about the source.",
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
