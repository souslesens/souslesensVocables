const path = require("path");
const fs = require("fs")
const profilesJSON = path.resolve('config/profiles.json');
const _ = require("lodash")
const util = require('util');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);


module.exports = function () {
    let operations = {
        GET

    };
    function GET(req, res, next) {
        fs.readFile(profilesJSON, 'utf8', (err, data) => {
            if (err) {
                res.status(500).json({ message: "I couldn't read profiles.json" })
            } else {
                const profiles = JSON.parse(data);
                res.status(200).json(profiles)
            }
        });
    }
    // NOTE: We could also use a YAML string here.
    GET.apiDoc = {
        summary: 'Returns hello world message.',
        operationId: 'sayHello',
        parameters: [
            {
                in: 'query',
                name: 'name',
                required: false,
                type: 'string'
            }
        ],
        responses: {
            200: {
                description: 'Welcome message',
                schema: {
                    type: 'object',
                    items: {
                        $ref: '#/definitions/GetProfiles'
                    }
                }
            },
            default: {
                description: 'An error occurred',
                schema: {
                    additionalProperties: true
                }
            }
        }
    };


    return operations;
}
