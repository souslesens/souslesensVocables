const dataController = require("../../../../bin/dataController.");

module.exports = function () {
    let operations = {
        GET,
    };  

    function GET(req, res, next) {
        let options = null;
        if (req.query.options) {
            options = JSON.parse(req.query.options);
        }
        dataController.readCsv(req.query.dir, req.query.name, options, function (err, result) {
            if (res.headersSent) {
                console.log('Headers already sent, not sending a second response');
                return;
            }
            if (err) {
                next(err);
                return; 
            } else {
                res.status(200).json(result);
                return;
            }
        });      
    }

    GET.apiDoc = {
        security: [{ loginScheme: [] }],
        summary: "Read content of a file",
        description: "Read content of a file",
        operationId: "Read content of a file",
        parameters: [
            {
                name: "dir",
                description: "subDirectory in /dataDir",
                type: "string",
                in: "query",
                required: true,
            },
            {
                name: "name",
                description: "name",
                in: "query",
                type: "string",
                required: true,
            },
            {
                name: "options",
                description: 'JSON of the form {"lines": <number>"}',
                in: "query",
                type: "string",
                required: false,
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
