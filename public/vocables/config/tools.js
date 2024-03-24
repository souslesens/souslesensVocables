const allTools = {
    lineage: { label: "lineage", noSource: 0, controller: Lineage_r, toolDescriptionImg: null },
    KGcreator: { label: "KGcreator", noSource: 1, controller: KGcreator_r, toolDescriptionImg: null },
    KGquery: { label: "KGquery", noSource: 0, controller: KGquery_r, toolDescriptionImg: null },
    Standardizer: { label: "Standardizer", multiSources: 0, controller: Standardizer, toolDescriptionImg: null },
    TSF_Dictionary: { label: "TSF_Dictionary", noSource: 1, controller: Lineage_dictionary, toolDescriptionImg: null },
    SPARQL: { label: "SPARQL endpoint", multiSources: 0, controller: SPARQL_endpoint, toolDescriptionImg: null },
    admin: { label: "Admin", multiSources: 0, controller: Admin, toolDescriptionImg: null },
    ConfigEditor: { label: "ConfigEditor", noSource: 1, controller: ConfigEditor, toolDescriptionImg: null },
    GraphManagement: { label: "GraphManagement", noSource: 1, controller: GraphManagement, toolDescriptionImg: null },
    UserManagement: { label: "UserManagement", noSource: 1, controller: UserManagement, toolDescriptionImg: null },
    OntoCreator: { label: "OntoCreator", noSource: 1, controller: Lineage_createSLSVsource, toolDescriptionImg: null },
};

async function loadToolsAndPlugins(callback) {
    const request = await fetch("../../api/v1/tools");
    const allowedTools = await request.json();
    const plugins = allowedTools.resources.filter((element) => element.type === "plugin");

    // We import plugins and register them in the window
    for (const element of plugins) {
        const plugin = await import(`../../plugins/${element.name}/js/main.js`);
        window[element.name] = plugin.default;
    }

    const userTools = {};
    allowedTools.resources.forEach(function (item) {
        userTools[item.name] = allTools[item.name];
    });

    // We mutate Config.userTools with an object merging plugins and tools
    Config.userTools = mergeToolsAndPlugins(userTools, plugins);
    return callback();
}

function mergeToolsAndPlugins(tools, plugins) {
    let pluginsToMerge = {};
    plugins.forEach((element) => {
        // We first check that the plugin is already registered in the window
        if (window[element.name]) {
            pluginsToMerge[element.name] = { label: element.name, noSource: 1, controller: window[element.name], toolDescriptionImg: null };
        } else {
            console.error(`Window object ${element.name} not found`);
        }
    });
    return { ...tools, ...pluginsToMerge };
}
export { allTools, loadToolsAndPlugins };
