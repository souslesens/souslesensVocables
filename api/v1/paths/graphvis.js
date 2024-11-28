const fs = require('fs');
//const { graphviz } = require('node-graphviz');
const {processResponse} = require("./utils");
module.exports = function () {
    let operations = {
        GET,
    };

    function GET(req, res, next) {

        const dotStr = req.query.dotStr
        const format = req.query.format
        const output = req.query.output

try {
    graphviz.circo(dotStr, format).then((svg) => {
        return processResponse(res, null, {result: svg});// Write the SVG to file

    });

}
catch(e){
            console.log(e)
}






    }


    GET.apiDoc = {
        security: [{restrictLoggedUser: []}],
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
    };

    return operations;
};