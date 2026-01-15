import prefixes from '../../../model/prefixes.json';

export default function () {
    async function GET(req, res, next) {
        return res.status(200).json(prefixes);
    }

    GET.apiDoc = {
        operationId: "getPrefixes",
        parameters: [],
        responses: {
            200: {
                description: "The list of prefixes as JSON",
                schema: {
                    type: "object",
                    properties: {
                        uri: { type: "string" },
                        prefix: { type: "string" },
                    },
                },
            },
        },
        security: [{ restrictLoggedUser: [] }],
        summary: "Retrieve the list of prefixes made by prefix.cc",
        tags: ["Misc"],
    };

    return { GET };
};
