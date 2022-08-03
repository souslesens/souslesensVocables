module.exports = function () {
    let operations = {
        POST,
    };

    async function POST(req, res, next) {
        try {
            const files = Array.isArray(Object.assign([], req.files).files) ? Object.assign([], req.files).files : Array(Object.assign([], req.files).files);

            files.forEach((file) => {
                file.mv("data/CSV/" + req.body.path + "/" + file.name);
            });
        } catch (err) {
            next(err);
            return res.status(500).json({ done: false });
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
