const fs = require("fs");
const path = require("path");

const { mainConfigModel } = require("../../../../model/mainConfig");

module.exports = () => {
    const operations = { GET };

    async function GET(req, res, _next) {
        // XXX: Check format
        const date = req.params.period;
        const config = await mainConfigModel.getConfig();
        const logPath = path.join(config.logDir, date === "current" ? "vocables.log" : `vocables.log.${date}`);

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
        },
        tags: ["Logs"],
    };

    return operations;
};
