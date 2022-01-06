const path = require("path");
const fs = require("fs")
const sourcesJSON = path.resolve('config/sources.json');
const _ = require("lodash")
const util = require('util');
const { rest } = require("lodash");
const { readRessource, writeRessource } = require("./utils");

module.exports = function () {
    let operations = {
        GET,
        POST,
        PUT
    };
    function GET(req, res, next) {
        fs.readFile(sourcesJSON, 'utf8', (err, data) => {
            if (err) {
                res.status(500).json({ message: "I couldn't read sources.json" })
            } else {
                const sources = JSON.parse(data);
                res.status(200).json(sources)
            }
        });
    }

    function PUT(req, res, next) {
        //  const oldSources = await readRessource(sourcesJSON, res)
        //  const updatedSource = req.body
        //  const objectToUpdateKey = Object.keys(req.body)[0]
        //  const updatedSources = { ...oldSources, [objectToUpdateKey]: updatedSource }
        //  const savedSources = await writeRessource(sourcesJSON, updatedSources, res);
        //
        //  res.status(200).json({
        //      message: 'ressource successfully created',
        //      sources: JSON.parse(savedSources)
        //  })
        res.status(200)
    }

    async function POST(req, res, next) {
        const oldSources = await readRessource(sourcesJSON, res)
        const sourceToAdd = req.body
        //        const notAlreadyCreated = !oldSources[req.params.id]
        const newSources = { ...oldSources, ...sourceToAdd }
        //        const successfullyCreated = newSources[req.params.id]

        const updated = await writeSources(sourcesJSON, newSources, res)

        res.status(200).json({
            message: `Ressource successfully created`,
            sources: JSON.parse(updated)
        })


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
                        $ref: '#/definitions/GetSources'
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



