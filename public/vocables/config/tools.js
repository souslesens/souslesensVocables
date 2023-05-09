const allTools = {
    lineage: { label: "Lineage", noSource: 0, controller: Lineage_classes, toolDescriptionImg: null },
    KGcreator: { label: "KGcreator", noSource: 1, controller: KGcreator, toolDescriptionImg: null },
    Standardizer: { label: "Standardizer", multiSources: 0, controller: Standardizer, toolDescriptionImg: null },
    TSF_Dictionary: { label: "TSF_Dictionary", noSource: 1, controller: Lineage_dictionary, toolDescriptionImg: null },
    KGpropertyFilter: { label: "KGpropertyFilter", noSource: 1, controller: KGpropertyFilter, toolDescriptionImg: null },
    Composer: { label: "Composer", noSource: 1, controller: Composer, toolDescriptionImg: null },
    TE_14224_browser: { label: "TE_14224_browser", multiSources: 0, noSource: true, controller: TE_14224_browser, toolDescriptionImg: null },
    TE_AssetConfigurator: { label: "TE_AssetConfigurator", multiSources: 0, noSource: true, controller: TE_AssetConfigurator, toolDescriptionImg: null },
    SQLquery: { label: "SQLquery", multiSources: 0, controller: SQLquery, toolDescriptionImg: null },
    SPARQL: { label: "SPARQL endpoint", multiSources: 0, controller: SPARQL_endpoint, toolDescriptionImg: null },
    admin: { label: "Admin", multiSources: 0, controller: Admin, toolDescriptionImg: null },
    ConfigEditor: { label: "ConfigEditor", noSource: 1, controller: ConfigEditor, toolDescriptionImg: null },
};

async function loadToolsAndPlugins() {
    const request = await fetch("../../api/v1/tools");
    const allowedTools = await request.json();

    const plugins = allowedTools.resources.filter((element) => element.type === "plugin");

    // We import plugins and register them in the window
    for (const element of plugins) {
        const plugin = await import(`../../plugins/${element.name}/${element.name}.js`);
        window[element.name] = plugin.default;
    }
    // We mutate Config.tools with an object merging plugins and tools
    Config.tools = mergeToolsAndPlugins(allTools, plugins);
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
