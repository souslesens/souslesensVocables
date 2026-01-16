import fs from "fs";
import path from "path";
import { mainConfigModel } from "../../../../model/mainConfig.js";

export default () => {
    const operations = { GET };

    async function GET(req, res, _next) {
        const config = await mainConfigModel.getConfig();
        if (!config.logs.useFileLogger) {
            return res.status(403).json({ message: "The file logger was disabled on this server", status: 403 });
        }

        // XXX: Check format
        let date = req.params.period;
        if (date === "current") {
            const todayDate = new Date();
            const currentYear = todayDate.getFullYear();
            const currentMonth = todayDate.getMonth() + 1;
            date = `${currentYear}-${currentMonth < 10 ? "0" : ""}${currentMonth}`;
        }

        const logPath = path.join(config.logs.directory, `vocables.log.${date}`);
        if (!fs.existsSync(logPath)) {
            return res.status(500);
        }

        const logsArray = fs
            .readFileSync(logPath)
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
                    action: message[3],
                    timestamp: jsonLine.timestamp,
                };
            });

        return res.status(200).json(logsArray);
    }

    GET.apiDoc = {
        security: [{ restrictAdmin: [] }],
        summary: "Retrieve a log from the specified date",
        description: "Get users logs",
        operationId: "Get users logs",
        parameters: [
            {
                type: "string",
                in: "path",
                name: "period",
                required: true,
            },
        ],
        responses: {
            200: {
                description: "Log",
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
                            source: {
                                type: "string",
                            },
                            action: {
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
        },
        tags: ["Logs"],
    };

    return operations;
};
