const { blenderSources } = require("../../../model/blenderSources");
const { responseSchema, successfullyFetched, failure } = require("./utils");
module.exports = function () {
    let operations = {
        GET,
    };
    async function GET(req, res, next) {
        try {
            const blenderSourcesData = await blenderSources.get();
            res.status(200).json(successfullyFetched(blenderSourcesData));
        } catch (error) {
            failure(res, 500, "");
            next(error);
        }
    }
    GET.apiDoc = {
        summary: "Returns blender sources",
        security: [{ restrictAdmin: [] }],
        operationId: "getAllBlenderSources",
        parameters: [],
        responses: responseSchema("BlenderSources", "GET"),
    };
    return operations;
};
