const path = require("path");
const fs = require("fs")
const profilesJSON = path.resolve('config/users/users.json');
exports.profilesJSON = profilesJSON;
const _ = require("lodash")
const { rest } = require("lodash");
const { readRessource, writeRessource, ressourceCreated, ressourceUpdated, ressourceFetched } = require("./utils");

module.exports = function () {
    let operations = {
        GET,
        POST,
        PUT
    };
    function GET(req, res, next) {
        fs.readFile(profilesJSON, 'utf8', (err, data) => {
            if (err) {
                res.status(500).json({ message: "I couldn't read users.json" })
            } else {
                const profiles = JSON.parse(data);
                ressourceFetched(res, profiles )
            }
        });
    }

    async function PUT(req, res, next) {
        const updatedProfile = req.body
        try {
            const objectToUpdateKey = Object.keys(req.body)[0]
            const oldProfiles = await readRessource(profilesJSON, res)//.catch(e => res.status((500).json({ message: 'I couldn\'t read the ressource' })));
            const updatedProfiles = { ...oldProfiles, [objectToUpdateKey]: updatedProfile }
            const savedProfiles = await writeRessource(profilesJSON, updatedProfiles, res)//.catch(e => res.status((500).json({ message: "I couldn't write the ressource" })));
            if (oldProfiles.hasOwnProperty(objectToUpdateKey)) {
                ressourceUpdated(res, savedProfiles);
            } else { res.status(400).json({ message: "Ressource does not exist. If you want to create another ressource, use POST instead." }) }

        } catch (e) { res.status(500) }
    }

    async function POST(req, res, next) {
        const profileToAdd = req.body
        //        const successfullyCreated = newProfiles[req.params.id]
        try {
            const oldProfiles = await readRessource(profilesJSON, res)
            const profileDoesntExist = !oldProfiles.hasOwnProperty(Object.keys(profileToAdd)[0])
            const newProfiles = { ...oldProfiles, ...profileToAdd }
            const saved = await writeRessource(profilesJSON, newProfiles, res)
            if (profileDoesntExist) {
                ressourceCreated(res, save)
            } else { res.status(400).json({ message: "Ressource already exists. If you want to update an existing ressource, use PUT instead." }) }
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



