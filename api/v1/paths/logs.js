import path from 'path';
import { mainConfigModel } from '../../../model/mainConfig.js';
const logger = require(path.resolve("bin/logger..js"));
import fs from 'fs';

module.exports = function () {
    let operations = {
        POST,
        GET,
    };

    ///// GET api/v1/logs
    async function GET(req, res, _next) {
        const config = await mainConfigModel.getConfig();
        if (!config.logs.useFileLogger) {
            return res.status(403).json({ message: "The file logger was disabled on this server", status: 403 });
        }

        const todayDate = new Date();
        const currentYear = todayDate.getFullYear();
        const currentMonth = todayDate.getMonth() + 1;

        const vocablesLog = `vocables.log.${currentYear}-${currentMonth < 10 ? "0" : ""}${currentMonth}`;
        if (!fs.existsSync(path.join(config.logs.directory, vocablesLog))) {
            return res.status(404).json({ message: "There is no log file available on this server", status: 404 });
        }

        const files = fs
            .readdirSync(config.logs.directory)
            .filter((file) => file.startsWith("vocables.log."))
            .map((file) => {
                const date = path.extname(file).substring(1);
                return { date: date, current: file == vocablesLog };
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
            403: {
                description: "The file logger was disabled on this server",
                schema: {
                    type: "object",
                    properties: {
                        message: {
                            type: "string",
                            default: "The file logger was disabled on this server",
                        },
                        status: {
                            type: "number",
                            default: 403,
                        },
                    },
                },
            },
            404: {
                description: "There is no log file available on this server",
                schema: {
                    type: "object",
                    properties: {
                        message: {
                            type: "string",
                            default: "There is no log file available on this server",
                        },
                        status: {
                            type: "number",
                            default: 404,
                        },
                    },
                },
            },
        },
        tags: ["Logs"],
    };

    ///// POST api/v1/logs
    async function POST(req, res, _next) {
        const config = await mainConfigModel.getConfig();
        if (!config.logs.useFileLogger) {
            return res.status(403).json({ message: "The file logger was disabled on this server", status: 403 });
        }

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
            403: {
                description: "The file logger was disabled on this server",
                schema: {
                    type: "object",
                    properties: {
                        message: {
                            type: "string",
                            default: "The file logger was disabled on this server",
                        },
                        status: {
                            type: "number",
                            default: 403,
                        },
                    },
                },
            },
        },
        tags: ["Logs"],
    };

    return operations;
};
