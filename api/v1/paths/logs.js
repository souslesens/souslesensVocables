const path = require("path");
const config = require(path.resolve("config/mainConfig.json"));
const logger = require(path.resolve("bin/logger..js"));
const fs = require("fs");

module.exports = function () {
    let operations = {
        POST,
        GET,
    };

    function POST(req, res, _next) {
        const ip = req.header("x-forwarded-for") || req.connection.remoteAddress;
        req.body.infos += "," + ip;
        logger.info(req.body.infos);
        return res.status(200).json({ done: true });
    }

    function GET(req, res, _next) {
        const logsArray = fs
            .readFileSync(path.resolve(config.logDir + "/vocables.log"))
            .toString()
            .split("\n")
            .filter((line) => line != "")
            .map((line) => {
                const jsonLine = JSON.parse(line);
                const message = jsonLine.message.split(",");
                return {
                    user: message[0],
                    tool: message[1],
                    source: message[2],
                    timestamp: jsonLine.timestamp,
                };
            });
        return res.status(200).json(logsArray);
    }

    GET.apiDoc = {
        security: [{ restrictAdmin: [] }],
        summary: "Get users logs",
        description: "Get users logs",
        operationId: "Get users logs",
        responses: {
            200: {
                description: "Logs",
                schema: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            user: {
                                type: "string",
                            },
                            tool: {
                                type: "string",
                            },
                            timestamp: {
                                type: "string",
                            },
                        },
                    },
                },
            },
        },
    };

    POST.apiDoc = {
        security: [{ loginScheme: [] }],
        summary: "Write user logs",
        description: "Write user logs",
        operationId: "Write user logs",
        parameters: [
            {
                name: "body",
                description: "body",
                in: "body",
                schema: {
                    type: "object",
                    properties: {
                        infos: {
                            type: "string",
                        },
                    },
                },
            },
        ],
        responses: {
            200: {
                description: "Results",
                schema: {
                    type: "object",
                    properties: {
                        done: {
                            type: "boolean",
                        },
                    },
                },
            },
        },
    };

    return operations;
};
