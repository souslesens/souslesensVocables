const fs = require("fs");
const path = require("path");
const { configPlugins } = require("./config");

/**
 * @typedef {import("./ToolTypes").Tool} Tool
 */

/**
 * @type {Tool[]}
 */

const NATIVE_TOOLS = [
    { name: "lineage", controller: "Lineage_r", useSource: true, multiSources: false },
    { name: "KGcreator", controller: "KGcreator_r", useSource: false, multiSources: false },
    { name: "KGquery", controller: "KGquery_r", useSource: true, multiSources: false, toTools: { Graph: "queryResultToVisjsGraph" } },
    { name: "Standardizer", controller: "Standardizer", useSource: true, multiSources: false },
    { name: "TSF_Dictionary", controller: "Lineage_dictionary", useSource: false, multiSources: false },
    { name: "SPARQL", label: "SPARQL endpoint", controller: "SPARQL_endpoint", useSource: true, multiSources: false },
    { name: "admin", label: "Admin", controller: "Admin", useSource: true, multiSources: false },
    { name: "ConfigEditor", controller: "ConfigEditor", useSource: false, multiSources: false },
    { name: "GraphManagement", controller: "GraphManagement", useSource: false, multiSources: false },
    { name: "UserManagement", controller: "UserManagement", useSource: false, multiSources: false },
    { name: "OntoCreator", controller: "Lineage_createSLSVsource", useSource: false, multiSources: false },
].map((tool) => ({ type: "tool", label: tool.label ?? tool.name, ...tool }));

class ToolModel {
    /**
     * @param {string} pluginsDirectory - path of the profiles.json file
     */
    constructor(pluginsDirectory) {
        this._pluginsDirectory = pluginsDirectory;
        this._nativeTools = NATIVE_TOOLS;
    }

    /**
     * @param {string} pluginsDirectory
     * @returns {Tool[]}
     */
    _loadPlugins(pluginsDirectory) {
        /**
         * @type {Record<string, unknown>}
         */
        const pluginsConfig = JSON.parse(fs.readFileSync(configPlugins).toString());
        try {
            const pluginsNames = fs.readdirSync(pluginsDirectory);
            return pluginsNames.map((pluginName) => ({ type: "plugin", name: pluginName, config: pluginsConfig[pluginName] }));
        } catch {
            console.warn("No plugins directory");
            return [];
        }
    }

    get nativeTools() {
        return this._nativeTools;
    }

    get plugins() {
        return this._loadPlugins(this._pluginsDirectory);
    }

    get allTools() {
        return [...this.nativeTools, ...this.plugins];
    }
}

const toolModel = new ToolModel(path.join(process.cwd(), "/plugins"));

module.exports = { ToolModel, toolModel };
