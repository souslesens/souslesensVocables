const HttpProxy = require("../../../../bin/httpProxy.");
const fs = require("fs").promises;
const { processResponse } = require("../utils");
const path = require("path");
const N3 = require('n3');
const ConfigManager = require("../../../../bin/configManager.");
const CsvTripleBuilder = require("../../../../bin/KG/CsvTripleBuilder.");
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
                let triples = [];
                parser.parse(result, function (error, quad, prefixes) {
                    if (quad) {
                        let objectId;
                        if (quad.object.termType === 'Literal') {
                            // Use double quotes for literal value and add datatype enclosed in <> if it starts with "http"
                            objectId = `"${quad.object.value}"` + 
                                (quad.object.datatype.value.startsWith('http') ? `^^<${quad.object.datatype.value}>` : '');
                        } else if (quad.object.termType === 'NamedNode' && quad.object.value.startsWith('http')) {
                            // If it's a NamedNode (a URI) and it starts with "http", enclose it in <>
                            objectId = `<${quad.object.id}>`;
                        } else {
                            // Otherwise, leave it as it is
                            objectId = quad.object.id;
                        }
                        triples.push({
                            s: `<${quad.subject.id}>`,
                            p: `<${quad.predicate.id}>`,
                            o: objectId,
                        });
                    } else {
                        var sparqlServerUrl;
                        // No more quads, so result is parsed completely
                        console.log("Parsed triples: ", triples);
                        if (req.body.options.sampleSize) {
                            // If sampleSize is defined, just return the sample of triples
                            const sampleTriples = triples.slice(0, req.body.options.sampleSize);
                            return processResponse(res, error, sampleTriples);
                        }
                        if (req.body.options.sparqlServerUrl) {
                            sparqlServerUrl = req.body.options.sparqlServerUrl;
                        }
                        ConfigManager.getGeneralConfig(function (err, result) {
                            if (err) return console.log("error");
                            sparqlServerUrl = result.default_sparql_url;
                        });
                        if (req.body.options.deleteOldGraph){
                            CsvTripleBuilder.clearGraph(req.body.options.graphUri, sparqlServerUrl, function (err, _result) {
                                console.log("graph deleted");
                            });
                        }
                        console.log(req.body.options.graphUri);
                        console.log(sparqlServerUrl)
                    
                        CsvTripleBuilder.writeUniqueTriples(triples, req.body.options.graphUri, sparqlServerUrl, function(err, length) {
                            if (err) {
                                console.error("An error occurred:", err);
                            } else {
                                console.log("Successfully wrote", length, "triples");
                            }
                        });



                        // Send only the first 'sampleSize' triples
                        const sampleTriples = req.body.options && req.body.options.sampleSize ? triples.slice(0, req.body.options.sampleSize) : triples;

                        processResponse(res, error, sampleTriples);
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
                        },
                        options: {
                            type: 'object',
                            properties: {
                                sampleSize: {
                                    type: 'integer',
                                    description: 'Number of triples to return'
                                }
                            },
                            description: 'Options for the request'
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
