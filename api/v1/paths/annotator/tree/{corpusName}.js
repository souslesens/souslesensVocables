import path from 'path';import dirContentAnnotator from "../../../../../bin/annotator/dirContentAnnotator.js";

export default function () {
    let operations = {
        GET,
    };

    function GET(req, res, _next) {
        dirContentAnnotator.getConceptsSubjectsTree(req.params.corpusName, function (err, result) {
            if (err) {
                return res.status(400).json({ error: err });
            }
            return res.status(200).json(result);
        });
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Annotator subjects tree",
        description: "Annotator subjects tree",
        operationId: "Annotator subjects tree",
        parameters: [
            {
                name: "corpusName",
                description: "corpusName",
                in: "path",
                type: "string",
                required: true,
            },
        ],

        responses: {
            200: {
                description: "Results",
                schema: {
                    type: "object",
                },
            },
        },
        tags: ["Annotate"],
    };

    return operations;
};
