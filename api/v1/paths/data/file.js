import dataController from "../../../../bin/dataController.js";
import userManager from "../../../../bin/user.js";
import { profileModel } from "../../../../model/profiles.js";
import { userModel } from "../../../../model/users.js";

export default function () {
    let operations = {
        GET,
        POST,
        DELETE,
    };

    function GET(req, res, next) {
        dataController.readFile(req.query.dir, req.query.fileName, function (err, result) {
            if (err) {
                if (err == "file does not exist") {
                    return res.status(500).json(err);
                }
                res.status(err.status || 500).json(err);
                next(err);
            } else {
                return res.status(200).json(result);
            }
        });
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Read the content of a file in the data folder",
        description: "Returns the parsed content (JSON when applicable, else raw text) of `dataDir/<dir>/<fileName>` " + "via `dataController.readFile`.",
        operationId: "dataReadFile",
        // This route is a generic reader over the whole data folder and `dataController` joins the
        // path without a traversal guard, so it is never exposed to agents as such: each MCP tool
        // below freezes `dir` and derives `fileName`, and the MCP refuses any argument outside the
        // `params` it declares. Adding a tool that lets an agent supply `dir` or `fileName` would
        // hand it arbitrary read access to `dataDir`.
        "x-mcp": {
            tools: [
                {
                    name: "sls_kgquery_model",
                    access: "read",
                    description:
                        "KGquery model of a source: the class and relation graph built in the KGquery tool and saved as JSON. " +
                        "Nodes carry their datatype properties, edges their object properties and cardinalities. " +
                        "The most compact description of how a source is actually queried.",
                    params: { source: { type: "string", required: true, description: "SLS source name." } },
                    query: { dir: "graphs/", fileName: "{source}_KGmodelGraph.json" },
                    parseJsonPayload: true,
                    statusHints: { 500: "No KGquery model saved for this source. Build the model in the KGquery tool first, or explore the source with sls_source_taxonomy." },
                },
                {
                    name: "sls_mapping_get",
                    access: "read",
                    description: "Mapping document of one data source towards a SLS source: per-table column mappings, URI patterns, joins and generated predicates.",
                    params: {
                        source: { type: "string", required: true, description: "SLS source name the mapping targets." },
                        dataSource: { type: "string", required: true, description: "Data source name without the .json extension. List them with sls_mappings_list." },
                    },
                    query: { dir: "mappings/{source}", fileName: "{dataSource}.json" },
                    parseJsonPayload: true,
                    statusHints: { 500: "No mapping file with that name for this source. List the available ones with sls_mappings_list." },
                },
            ],
        },
        parameters: [
            { name: "dir", in: "query", type: "string", required: true, description: "Sub-directory under `dataDir`." },
            { name: "fileName", in: "query", type: "string", required: true, description: "File name including extension." },
        ],
        responses: {
            200: {
                description: "File content.",
                schema: {
                    type: "string",
                    description: "Raw file content as UTF-8 text (typically JSON-stringified for `*.json` files).",
                    example: '{"id":"assets_mapping","label":"Assets","columns":[]}',
                },
            },
            500: { description: "File not found or read error." },
        },
        tags: ["Data"],
    };

    function POST(req, res, next) {
        dataController.saveDataToFile(req.body.dir, req.body.fileName, req.body.data, function (err, result) {
            if (err) {
                next(err);
            } else {
                return res.status(200).json(result);
            }
        });
    }

    POST.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Write content into a file in the data folder",
        description:
            "Persists `data` (string, typically JSON-stringified) into `dataDir/<dir>/<fileName>` via " + "`dataController.saveDataToFile`. Creates the file if missing, overwrites otherwise.",
        operationId: "dataSaveFile",
        parameters: [
            {
                name: "body",
                in: "body",
                required: false,
                schema: {
                    type: "object",
                    properties: {
                        dir: { type: "string", description: "Sub-directory under `dataDir`.", example: "mappings/IOF_core" },
                        fileName: { type: "string", description: "File name including extension.", example: "assets_mapping.json" },
                        data: {
                            type: "string",
                            description: "Raw payload (typically JSON-stringified).",
                            example: '{"id":"assets_mapping","label":"Assets","columns":[]}',
                        },
                    },
                    example: {
                        dir: "mappings/IOF_core",
                        fileName: "assets_mapping.json",
                        data: '{"id":"assets_mapping","label":"Assets","columns":[]}',
                    },
                },
            },
        ],
        responses: {
            200: { description: "File saved." },
            500: { description: "Write error or directory traversal attempt." },
        },
        tags: ["Data"],
    };

    async function DELETE(req, res, next) {
        try {
            var source = req.query.source;
            if (source) {
                var userInfo = await userManager.getUser(req.user);
                var userLogin = userInfo.user.login;
                var isAdmin = await userModel.isAdmin(userLogin);
                if (!isAdmin) {
                    var userProfiles = await profileModel.getUserProfiles(userInfo.user);
                    var hasWriteAccess = false;
                    for (var profileName in userProfiles) {
                        var profile = userProfiles[profileName];
                        var accessControl = profile.sourcesAccessControl || {};
                        if (accessControl[source] === "readwrite") {
                            hasWriteAccess = true;
                            break;
                        }
                        if (!accessControl.hasOwnProperty(source) && profile.defaultSourceAccessControl === "readwrite") {
                            hasWriteAccess = true;
                            break;
                        }
                    }
                    if (!hasWriteAccess) {
                        return res.status(403).json({ error: "You don't have right to delete" });
                    }
                }
            }
            dataController.deleteFile(req.query.dir, req.query.fileName, function (err, result) {
                if (err) {
                    res.status(err === "file does not exist" ? 404 : 500).json({ error: err });
                    return next(err);
                }
                return res.status(200).json({ done: true, message: result });
            });
        } catch (err) {
            res.status(err.status || 500).json({ error: err.message || err });
            next(err);
        }
    }

    DELETE.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Delete a file from the data folder",
        description:
            "Removes `dataDir/<dir>/<fileName>`. When `source` is provided, the caller must hold `readwrite` access on " +
            "that source (either explicitly via `sourcesAccessControl` or via the profile's `defaultSourceAccessControl`). " +
            "Admin users bypass the check.",
        operationId: "dataDeleteFile",
        parameters: [
            { name: "dir", in: "query", type: "string", required: true, description: "Sub-directory under `dataDir`." },
            { name: "fileName", in: "query", type: "string", required: true, description: "File name to delete." },
            { name: "source", in: "query", type: "string", required: false, description: "Source whose access control governs this deletion." },
        ],
        responses: {
            200: { description: "File deleted." },
            403: { description: "User lacks `readwrite` access on the source." },
            404: { description: "File does not exist." },
            500: { description: "Filesystem error." },
        },
        tags: ["Data"],
    };

    return operations;
}
