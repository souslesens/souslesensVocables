const path = require("path");
const { mainConfigModel } = require("../../../model/mainConfig");
const logger = require(path.resolve("bin/logger..js"));
const fs = require("fs");

module.exports = function () {
    let operations = {
        POST,
        GET,
    };

    ///// GET api/v1/logs
    async function GET(req, res, _next) {
        const config = await mainConfigModel.getConfig();
        const vocablesLog = path.join(config.logDir, "vocables.log");
        if (!fs.existsSync(vocablesLog)) {
            return res.status(500).json({ message: "The log files are not available", status: 500 });
        }

        const vocablesLogStats = fs.lstatSync(vocablesLog);
        if (!vocablesLogStats.isSymbolicLink()) {
            return res.status(500).json({ message: "The log files are not available", status: 500 });
        }

        const symlink = fs.readlinkSync(vocablesLog);
        const files = fs
            .readdirSync(config.logDir)
            .filter((file) => file.startsWith("vocables.log."))
            .map((file) => {
                const date = path.extname(file).substring(1);
                return { date: date, current: file == symlink };
            });

        return res.status(200).json({ message: files, status: 200 });
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
        tags: ["Logs"],
    };

    ///// POST api/v1/logs
    function POST(req, res, _next) {
        const ip = req.header("x-forwarded-for") || req.connection.remoteAddress;
        req.body.infos += "," + ip;
        logger.info(req.body.infos);
        return res.status(200).json({ done: true });
    }
    POST.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
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
        tags: ["Logs"],
    };

    return operations;
};
