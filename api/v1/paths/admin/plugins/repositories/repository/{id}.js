const { toolModel } = require("../../../../../../../model/tools");
const { responseSchema } = require("../../../../utils");

module.exports = function () {
    const operations = { DELETE, PUT };

    // DELETE /api/v1/admin/plugins/repositories/repository/{id}
    async function DELETE(req, res, _next) {
        try {
            const identifier = req.params.id;

            if (!identifier) {
                res.status(400).json({
                    message: "The repository identifier is missing from this request",
                    status: 400,
                });
            } else {
                await toolModel.deleteRepository(identifier);
                res.status(200).json({
                    message: "The repository have been removed",
                    status: 200,
                });
            }
        } catch (error) {
            res.status(500).json({ message: error.message, status: error.cause });
        }
    }

    DELETE.apiDoc = {
        operationId: "plugins.repositories.repository.delete",
        responses: {
            200: {
                description: "successfully deleted",
            },
            400: {
                description: "missing identifier from the request",
            },
            500: {
                description: "an error occurs",
            },
        },
        security: [{ restrictAdmin: [] }],
        summary: "Delete a Git Repository",
    };

    // PUT /api/v1/admin/plugins/repositories/repository/{id}
    async function PUT(req, res, _next) {
        try {
            const repository = req.params.id;

            if (!repository) {
                res.status(400).json({
                    message: "The repository identifier is missing from this request",
                    status: 400,
                });
            } else {
                if (req.body.toFetch) {
                    await toolModel.fetchRepository(repository, req.body.data);
                }

                const repositories = toolModel.readRepositories();
                repositories[repository] = req.body.data;
                await toolModel.writeRepositories(repositories);

                res.status(200).json({
                    message: "The repository have been updated",
                    status: 200,
                });
            }
        } catch (error) {
            res.status(500).json({ message: error.message, status: error.cause });
        }
    }

    PUT.apiDoc = {
        operationId: "plugins.repositories.repository.put",
        responses: {
            200: {
                description: "successfully deleted",
            },
            400: {
                description: "missing identifier from the request",
            },
            500: {
                description: "an error occurs",
            },
        },
        security: [{ restrictAdmin: [] }],
        summary: "Update a Git Repository",
    };

    return operations;
};
