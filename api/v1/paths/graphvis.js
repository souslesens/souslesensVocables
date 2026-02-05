// const { graphviz } = require("node-graphviz");
import { processResponse } from "./utils.js";

export default function () {
    let operations = {
        GET,
    };

    function GET(req, res, _next) {
        const dotStr = req.query.dotStr;
        const format = req.query.format;

        try {
            graphviz.circo(dotStr, format).then((svg) => {
                return processResponse(res, null, { result: svg }); // Write the SVG to file
            });
        } catch (e) {
            console.log(e);
        }
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "transform dot graph",
        description: "transform dot graph",
        operationId: "transform dot graph",
        parameters: [
            {
                name: "dotStr",
                description: "dot string",
                type: "string",
                in: "query",
                required: true,
            },
            {
                name: "format",
                description: "svg...",
                type: "string",
                in: "query",
                required: true,
            },
            {
                name: "output",
                description: "",
                type: "string",
                in: "query",
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
        tags: ["Graph"],
    };

    return operations;
}
