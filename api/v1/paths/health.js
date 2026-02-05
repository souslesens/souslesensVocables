import { mainConfigModel } from "../../../model/mainConfig.js";

export default function () {
    let operations = {
        GET,
    };

    ///// GET api/v1/health
    async function GET(req, res, _next) {
        const config = await mainConfigModel.getConfig();
        const enabledServices = config.health_enabled_services ? config.health_enabled_services : ["virtuoso", "elasticsearch", "spacyserver"];
        const sparqlUrl = `${config.sparql_server.url}/?default-graph-uri=&query=SELECT+*%0D%0AWHERE+%7B%3Fs+%3Fp+%3Fo%7D%0D%0ALIMIT+10&format=application%2Fsparql-results%2Bjson`;
        const elasticSearchUrl = `${config.ElasticSearch.url}/_cat/health`;
        const spacyServerUrl = `${config.annotator.spacyServerUrl}/health_check`.replace("/pos", "");
        try {
            const fetchVirtuoso = fetch(sparqlUrl)
                .then(() => ({ name: "virtuoso", health: true }))
                .catch(() => ({ name: "virtuoso", health: false }));
            const fetchElasticSearch = fetch(elasticSearchUrl)
                .then(() => ({ name: "elasticsearch", health: true }))
                .catch(() => ({ name: "elasticsearch", health: false }));
            const fetchSpacyServer = fetch(spacyServerUrl)
                .then(() => ({ name: "spacyserver", health: true }))
                .catch(() => ({ name: "spacyserver", health: false }));
            const results = await Promise.all([fetchVirtuoso, fetchElasticSearch, fetchSpacyServer].map((p) => p.catch((e) => e)));
            const health = Object.fromEntries(
                results
                    .map((res) => {
                        return [res.name, res.health];
                    })
                    .filter(([svc, _health]) => {
                        return enabledServices.includes(svc) ? true : false;
                    }),
            );
            const globalHealth = Object.values(health)
                .map((health) => health)
                .reduce((acc, curr) => acc && curr);
            res.status(globalHealth ? 200 : 500).json({ health: health });
        } catch (error) {
            res.status(500).json({ health: "error" });
        }
    }
    GET.apiDoc = {
        summary: "Return health of souslesens",
        security: [],
        operationId: "getHealth",
        parameters: [],
        responses: {
            200: {
                description: "OK",
                schema: {
                    properties: {
                        health: {
                            type: "string",
                        },
                    },
                },
            },
            500: {
                description: "ERROR",
                schema: {
                    properties: {
                        health: {
                            type: "string",
                        },
                    },
                },
            },
        },
        tags: ["Misc"],
    };

    return operations;
}
