const path = require("path");

const elasticRestProxy = require(path.resolve("bin/elasticRestProxy..js"));
const ConfigManager = require("../../../../bin/configManager.");
const UserRequestFiltering = require("../../../../bin/userRequestFiltering.");

module.exports = function () {
    let operations = {
        GET,
    };

    function GET(req, res, _next) {
        if (ConfigManager.config) {
            ConfigManager.getUserSources(req, res, function (err, userSources) {
                if (err) {
                    console.log("userSourcesError");
                    return res.status(400).json({ error: err });
                }
                console.log("userSourcesOK");
                elasticRestProxy.listIndexes(ConfigManager.config.ElasticSearch.url, function (err, result) {
                    if (err) {
                        console.log("listIndexesError");
                        return res.status(400).json({ error: err });
                    }
                    console.log("listIndexesOK");
                    //filter indices for user
                    var userIndices = {};
                    for (var source in userSources) {
                        userIndices[source.toLowerCase()] = 1;
                    }
                    var userIndicesArray = [];
                    result.forEach(function (indexName) {
                        if (userIndices[indexName.toLowerCase()]) userIndicesArray.push(indexName);
                    });

                    return res.status(200).json(userIndicesArray);
                });
            });
        } else {
            console.log("noConfigError");
            return res.status(400).json({ error: "config missing" });
            /*  elasticRestProxy.listIndexes(function(err, result) {
                if (err) {
                    return res.status(400).json({ error: err });
                }
                return res.status(200).json(result);
            });*/
        }
    }

    GET.apiDoc = {
        security: [{ loginScheme: [] }],
        summary: "Get ElasticSearch indices",
        description: "Get ElasticSearch indices",
        operationId: "Get ElasticSearch indices",
        parameters: [],

        responses: {
            200: {
                description: "Results",
                schema: {
                    type: "array",
                    items: {
                        type: "string",
                    },
                },
            },
        },
    };

    return operations;
};
