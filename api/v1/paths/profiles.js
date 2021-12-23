const path = require("path");
const fs = require("fs")
const profilesJSON = path.resolve('config/profiles.json');
exports.profilesJSON = profilesJSON;
const _ = require("lodash")
const { rest } = require("lodash");
const { readRessource, writeRessource } = require("./utils");

module.exports = function () {
    let operations = {
        GET,
        POST,
        PUT
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

    async function PUT(req, res, next) {
        const oldProfiles = await readRessource(profilesJSON, res)
        const updatedProfile = req.body
        const objectToUpdateKey = Object.keys(req.body)[0]
        const updatedProfiles = { ...oldProfiles, [objectToUpdateKey]: updatedProfile }
        const savedProfiles = await writeRessource(profilesJSON, updatedProfiles, res);


        res.status(200).json({
            message: 'ressource successfully updated',
            profiles: savedProfiles
        })
    }

    async function POST(req, res, next) {
        const profileToAdd = req.body
        //        const notAlreadyCreated = !oldProfiles[req.params.id]
        //        const successfullyCreated = newProfiles[req.params.id]
        try {
            const oldProfiles = await readRessource(profilesJSON, res)
            console.log("OLDPROFILES", oldProfiles)
            const newProfiles = { ...oldProfiles, ...profileToAdd }
            const saved = await writeRessource(profilesJSON, newProfiles, res)
            res.status(200).json(saved)
        } catch (e) { res.status(500) }


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



