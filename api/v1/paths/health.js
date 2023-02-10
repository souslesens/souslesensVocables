const path = require("path");
const { config } = require(path.resolve("model/config"));
const sql = require("mssql");

module.exports = function () {
    let operations = {
        GET,
    };

    ///// GET api/v1/health
    async function GET(req, res, next) {
        const sparqlUrl = `${config.default_sparql_url}/?default-graph-uri=&query=SELECT+*%0D%0AWHERE+%7B%3Fs+%3Fp+%3Fo%7D%0D%0ALIMIT+10&format=application%2Fsparql-results%2Bjson`;
        const elasticSearchUrl = `${config.ElasticSearch.url}/_cat/health`;
        const spacyServerUrl = `http://${config.annotator.spacyServerUrl}/health_check`.replace("/pos", "");
        const sqlServerConnStr = `Server=${config.SQLserver.server},1433;Database=${config.SQLserver.database};User Id=${config.SQLserver.user};Password=${config.SQLserver.password};Encrypt=false`;
        try {
            const fetchVirtuoso = fetch(sparqlUrl)
                .then((r) => ({ name: "virtuoso", health: true }))
                .catch((e) => ({ name: "virtuoso", health: false }));
            const fetchElasticSearch = fetch(elasticSearchUrl)
                .then((r) => ({ name: "elasticsearch", health: true }))
                .catch((e) => ({ name: "elasticsearch", health: false }));
            const fetchSpacyServer = fetch(spacyServerUrl)
                .then((r) => ({ name: "spacyserver", health: true }))
                .catch((e) => ({ name: "spacyserver", health: false }));
            const connectSqlServer = sql
                .connect(sqlServerConnStr)
                .then((r) => ({ name: "sqlserver", health: true }))
                .catch((e) => ({ name: "sqlserver", health: false }));
            const results = await Promise.all([fetchVirtuoso, fetchElasticSearch, fetchSpacyServer, connectSqlServer].map((p) => p.catch((e) => e)));
            const health = Object.fromEntries(
                results.map((res) => {
                    return [res.name, res.health];
                })
            );
            const globalHealth = results.map((res) => res.health).reduce((acc, curr) => acc && curr);
            res.status(globalHealth ? 200 : 500).json({ health: health });
        } catch (error) {
            res.status(500).json({ health: "error" });
        }
    }
    GET.apiDoc = {
        summary: "Return health of souslesens",
        security: [{ restrictAdmin: [] }],
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
    };

    return operations;
};
