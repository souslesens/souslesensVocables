const HttpProxy = require("../../../../bin/httpProxy.");
const fs = require("fs").promises;
const { processResponse } = require("../utils");
const path = require("path");
const N3 = require('n3');
const { DataFactory } = N3;
const parser = new N3.Parser();



module.exports = function() {
    let operations = {
        POST
    };

    async function POST(req, res, next) {
        if (!req.body.rml || !req.body.sources) {
            return res.status(400).send({error: 'Invalid request data'});
        }

        for(let source of req.body.sources) {
            if (source.contentEncoded64) {
                try {
                    let ContentFile = await fs.readFile(path.resolve(source.contentEncoded64));
                    let base64Data = Buffer.from(ContentFile).toString('base64');
                    source.contentEncoded64 = base64Data;
                } catch (err) {
                    console.log(`Error reading file ${source.filePath}: `, err);
                    return res.status(500).send({error: `Error reading file ${source.data}: ${err.message}`});
                }
            }
        }

        const url = "http://localhost:9170/rml/createTriples";

        let options = {
            method: "POST",
            url: url,
            headers: {
                "Content-Type": "application/json",
                Accept: "text/turtle"
            },
            body: {
                rml: req.body.rml,
                sources: req.body.sources
            }
        };
        
        console.log("headers and body");
        console.log(options.headers);
        console.log(options.body);
        HttpProxy.post(options.url, options.headers, options.body, function (error, result, response) {
            console.log("Received result data: ", result);
            if (error || res.status >= 400) {
                let errorMessage = "Error during the RML mapping process.";
                if (result) {
                    errorMessage += " " + result;
                } else if (error) {
                    errorMessage += " " + error.message;
                }
                return res.status(500).send({ error: errorMessage });
            } else {
                // parse result to triples
                let triples = [];
                parser.parse(result, function(error, quad, prefixes) {
                    if (quad) {
                        triples.push({
                            s: quad.subject.id,
                            p: quad.predicate.id,
                            o: quad.object.id,
                        });
                    } else {
                        // No more quads, so result is parsed completely
                        console.log("Parsed triples: ", triples);
                        processResponse(res, error, triples); // pass triples instead of result
                    }
                });
            }
        });
        
        
        
        
    }       
    POST.apiDoc = {
        security: [{ loginScheme: [] }],
        summary: "Perform RML Mapping",
        description: "Perform RML Mapping",
        operationId: "performRmlMappingMultiSource",
        parameters: [
            {
                in: 'body',
                name: 'body',
                required: true,
                schema: {
                    type: 'object',
                    properties: {
                        rml: {
                            type: 'string',
                            description: 'RML Mapping'
                        },
                        sources: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    contentEncoded64: {
                                        type: 'string',
                                        description: 'Content of the file encoded64'
                                    },
                                    format: {
                                        type: 'string',
                                        description: 'Format of the file'
                                    },
                                    fileName: {
                                        type: 'string',
                                        description: 'Name of the file'
                                    }
                                }
                            },
                            description: 'Source Data'
                        }
                    }
                }
            }
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
