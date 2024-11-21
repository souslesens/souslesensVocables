// tools are defined server side. See model/tools.js
const allTools = {};

async function loadToolsAndPlugins(callback) {
    const request = await fetch("../../api/v1/tools");
    const allowedTools = await request.json();
    const availableToolName = allowedTools.resources.map((tool) => tool.name);
    const plugins = allowedTools.resources.filter((element) => element.type === "plugin");

    allowedTools.resources
        .filter((element) => element.type == "tool")
        .forEach((tool) => {
            allTools[tool.name] = {
                label: tool.label,
                noSource: !+tool.useSource,
                multiSources: +tool.multiSources,
                controller: window[tool.controller],
                toolDescriptionImg: null,
                toTools: tool.toTools,
            };
            if(tool.resetURLParamsDiv){
                allTools[tool.name].resetURLParamsDiv = tool.resetURLParamsDiv
            }else{
                allTools[tool.name].resetURLParamsDiv = false;
            }
        });

    // We import plugins and register them in the window
    for (const element of plugins) {
        const pluginName = element.name;
        const { default: plugin } = await import(`../../plugins/${pluginName}/js/main.js`);
        if (typeof plugin.setConfig === "function") {
            plugin.setConfig(element.config);
        }
        if (typeof plugin.getToolRelations === "function") {
            const toolRelation = plugin.getToolRelations();
            Object.entries(toolRelation).forEach(([tool, func]) => {
                if (availableToolName.includes(tool)) {
                    if (allTools[tool].toTools === undefined) {
                        allTools[tool].toTools = {};
                    }
                    allTools[tool].toTools[pluginName] = func;
                }
            });
        }
        window[element.name] = plugin;
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
