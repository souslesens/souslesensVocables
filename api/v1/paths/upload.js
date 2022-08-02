
module.exports = function () {
    let operations = {
        POST,
    };

    async function POST(req, res, next) {
        try {
            const files = Object.assign([] ,req.files)
            files.forEach(file => {
                file.mv("data/CSV/" + file.name)
            })
        } catch (err) {
            next(err);
        }
        return res.status(200).json({ done: true });
    }
    POST.apiDoc = {
        summary: "Upload files",
        security: [{ loginScheme: [] }],
        operationId: "upload",
        parameters: [],
        responses: {
            200: {
                description: "Response",
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

    return operations;
};
