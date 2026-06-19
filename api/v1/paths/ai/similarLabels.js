import { processResponse } from "../utils.js";

import semantAIser from "../../../../bin/AI/semantAIzer.js";

export default function () {
    let operations = {
        POST,
    };

    async function POST(req, res, next) {
        //to be implemented :work in progress

        await semantAIser.getSimilarLabels(req.body.listA, req.body.listB, function (err, result) {
            processResponse(res, err, result);
        });
    }

    POST.apiDoc = {
        operationId: "similarLabels",
        security: [{ restrictLoggedUser: [], restrictQuota: [] }],
        parameters: [
            {
                name: "body",
                in: "body",
                required: true,
                schema: {
                    type: "object",
                    properties: {
                        listA: {
                            type: "array",
                            items: { type: "object" },
                        },
                        listB: {
                            type: "array",
                            items: { type: "object" },
                        },
                    },
                    required: ["listA", "listB"],
                },
            },
        ],
        responses: {
            200: {
                description: "Success",
            },
        },
    };

    return operations;
}
