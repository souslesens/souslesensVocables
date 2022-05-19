const { processResponse } = require("./utils");
const httpProxy = require("../../../bin/httpProxy.");

module.exports = function () {
    let operations = {
        POST,
    };

    async function POST(req, res, next) {
        try {
            httpProxy.setProxyForServerDomain(req.headers.host);

            if (req.body.POST) {
                var body = JSON.parse(req.body.body);
                httpProxy.post(req.body.url, body.headers, body.params, function (err, result) {
                    processResponse(res, err, result);
                });
            } else {
                var options = {};
                if (req.body.options) {
                    if (typeof req.body.options == "string") options = JSON.parse(req.body.options);
                    else options = req.body.options;
                }
                options.host = req.headers.host;
                httpProxy.get(req.body.url, options, function (err, result) {
                    processResponse(res, err, result);
                });
            }
        } catch (err) {
            next(err);
        }
    }
    POST.apiDoc = {
        summary: "Send a request to a different domain",
        security: [{ loginScheme: [] }],
        operationId: "httpProxy",
        parameters: [],
        responses: {
            default: {
                description: "Response provided by the proxied server",
            },
        },
    };

    return operations;
};
