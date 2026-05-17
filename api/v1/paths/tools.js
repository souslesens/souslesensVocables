import { successfullyFetched } from "./utils.js";
import { profileModel } from "../../../model/profiles.js";
import userManager from "../../../bin/user.js";

export default function () {
    let operations = {
        GET,
    };

    async function GET(req, res, next) {
        try {
            const userInfo = await userManager.getUser(req.user);
            const userTools = await profileModel.getUserTools(userInfo.user);
            res.status(200).json(successfullyFetched(userTools));
        } catch (err) {
            console.log(err);
            next(err);
        }
    }
    GET.apiDoc = {
        summary: "List the tools enabled for the current user's profiles",
        description:
            "Returns the intersection of tools enabled at the platform level (`mainConfig.tools_available`) and " +
            "tools allowed by the caller's profiles (`profileModel.getUserTools`). Drives the home-page tool launcher.",
        security: [{ restrictLoggedUser: [] }],
        operationId: "getUserTools",
        responses: {
            200: {
                description: "Allowed tools.",
                schema: {
                    properties: {
                        message: { type: "string" },
                        resources: {
                            type: "array",
                            description: "Mixed list of tool entries and plugin entries.",
                            items: {
                                type: "object",
                                properties: {
                                    type: { type: "string", description: "`tool` or `plugin`." },
                                    name: { type: "string" },
                                    label: { type: "string", description: "Display label (tools only)." },
                                    controller: { type: "string", description: "Frontend controller module (tools only)." },
                                    useSource: { type: "boolean" },
                                    multiSources: { type: "boolean" },
                                    toTools: { type: "object" },
                                    displayImports: { type: "boolean" },
                                    publicTool: { type: "boolean" },
                                    resetURLParamsDiv: { type: "string" },
                                    config: { type: "object", description: "Plugin-specific config (plugins only)." },
                                },
                            },
                        },
                    },
                },
                examples: {
                    "application/json": {
                        message: "resource successfully fetched",
                        resources: [
                            {
                                type: "tool",
                                label: "lineage",
                                name: "lineage",
                                controller: "Lineage_whiteboard",
                                useSource: true,
                                multiSources: false,
                                toTools: {},
                                displayImports: true,
                                publicTool: false,
                            },
                            {
                                type: "tool",
                                label: "SPARQL endpoint",
                                name: "SPARQL",
                                controller: "SPARQL_endpoint",
                                useSource: false,
                                multiSources: false,
                                toTools: {},
                                resetURLParamsDiv: "mainDialogDiv",
                                publicTool: false,
                            },
                            {
                                type: "plugin",
                                name: "myPlugin",
                                config: { useSource: true },
                            },
                        ],
                    },
                },
            },
        },
        tags: ["Tools"],
    };
    return operations;
}
