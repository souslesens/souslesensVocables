import fs from "node:fs";
import { readMainConfig } from "../../../../../../model/config.js";
import { userDataModel } from "../../../../../../model/userData.js";
import { RdfDataModel } from "../../../../../../model/rdfData.js";
import userManager from "../../../../../../bin/user.js";
import UserRequestFiltering from "../../../../../../bin/userRequestFiltering.js";
import ConfigManager from "../../../../../../bin/configManager.js";
import { Template } from "@huggingface/jinja";
import { RDF_FORMATS_MIMETYPES } from "../../../../../../model/utils.js";
//const RemoteCodeRunner = require("../../../../../bin/remoteCodeRunner.js.js");

export default () => {
    const GET = async (req, res, _next) => {
        try {
            const userInfo = await userManager.getUser(req.user);
            const userData = await userDataModel.find(req.params.id, userInfo.user);

            if (userData.data_type == "jsFunction") {
                res.status(400).json({ message: err });
                return;

                //to be done
                /*  RemoteCodeRunner.runUserDataFunction(userData,function(err, result){
                    if( err){
                        res.status(400).json({ message: err });
                        return;
                    }
                    res.status(200).json(result);
                    return;
                })*/
            }

            if (userData.data_type !== "sparqlQuery") {
                res.status(400).json({ message: "This userData is not a sparqlQuery" });
                return;
            }
            if (!userData.data_content.sparqlQuery) {
                res.status(400).json({ message: "Nothing on sparqlQuery" });
                return;
            }

            const query = userData.data_content.sparqlQuery;

            // get format and remove it from query
            let format = "json";
            if ("format" in req.query) {
                format = req.query.format;
                delete req.query["format"];
            }
            // query limit and offset gestion if they are in the query
            if (query.indexOf("{{limit}}") > 0) {
                if ("limit" in req.query) {
                    if (!req.query.limit.toLowerCase().includes("limit")) {
                        req.query.limit = "LIMIT " + req.query.limit;
                    }
                } else {
                    req.query.limit = "LIMIT 10000";
                }
            }

            if (query.indexOf("{{offset}}") > 0) {
                if ("offset" in req.query) {
                    if (!req.query.offset.toLowerCase().includes("offset")) {
                        req.query.offset = "OFFSET " + req.query.offset;
                    }
                } else {
                    req.query.offset = "OFFSET 0";
                }
            }

            // replace query params
            const template = new Template(query);
            const renderedQuery = template.render(req.query);

            // check that query is confom before execute
            const userSources = await ConfigManager.getUserSources(req, res);
            const user = await ConfigManager.getUser(req, res);
            const filteredQuery = await UserRequestFiltering.filterSparqlRequestAsync(query, userSources, user);
            if (filteredQuery.parsingError) {
                return processResponse(res, filteredQuery.parsingError, null);
            }

            // exec query
            const config = readMainConfig();
            const rdfDataModel = new RdfDataModel(config.sparql_server.url, config.sparql_server.user, config.sparql_server.password);
            const result = await rdfDataModel.execQuery(renderedQuery, format);
            if (format === "json") {
                res.status(200).json(result);
            } else {
                res.status(200).set("content-Type", RDF_FORMATS_MIMETYPES[format]).send(result);
            }
            return;
        } catch (error) {
            if (error.cause !== undefined) {
                res.status(error.cause).json({ message: error.message });
            } else {
                console.error(error);
                res.status(500).json({ message: "An error occurs on the server" });
            }
        }
    };

    GET.apiDoc = {
        summary: "Execute sparql query",
        description: "Execute the query contained in the userData and return the result",
        parameters: [
            {
                type: "number",
                in: "path",
                name: "id",
                required: true,
            },
            {
                type: "string",
                in: "query",
                name: "format",
                required: false,
            },
        ],
        responses: {
            200: {
                description: "sparql execution result",
                schema: {
                    type: "object",
                    properties: {
                        result: { type: "string" },
                    },
                },
            },
            400: {
                description: "Wrong format for the identifier",
                schema: {
                    type: "object",
                    properties: {
                        message: {
                            type: "string",
                            default: "Wrong format for the identifier",
                        },
                    },
                },
            },
            404: {
                description: "The specified identifier do not exists",
                schema: {
                    type: "object",
                    properties: {
                        message: {
                            type: "string",
                            default: "The specified identifier do not exists",
                        },
                    },
                },
            },
            500: {
                description: "An error occurs on the server",
                schema: {
                    type: "object",
                    properties: {
                        message: {
                            type: "string",
                            default: "An error occurs on the server",
                        },
                    },
                },
            },
        },
        security: [{ restrictLoggedUser: [] }],
        tags: ["UserData"],
    };

    return { GET };
};
