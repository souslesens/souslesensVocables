const fs = require("fs");
const path = require("path");
const { Lock } = require("async-await-mutex-lock");

const { configPlugins } = require("./config");

/**
 * @typedef {import("./ToolTypes").Tool} Tool
 */

/**
 * @type {Tool[]}
 */

const NATIVE_TOOLS = [
    { name: "lineage", controller: "Lineage_r", useSource: true, multiSources: false, toTools: {} },
    { name: "KGcreator", controller: "KGcreator_r", useSource: false, multiSources: false, toTools: {} },
    { name: "KGquery", controller: "KGquery_r", useSource: true, multiSources: false, toTools: {} },
    { name: "Standardizer", controller: "Standardizer", useSource: true, multiSources: false, toTools: {} },
    { name: "TSF_Dictionary", controller: "Lineage_dictionary", useSource: false, multiSources: false, toTools: {} },
    { name: "SPARQL", label: "SPARQL endpoint", controller: "SPARQL_endpoint", useSource: true, multiSources: false, toTools: {} },
    { name: "admin", label: "Admin", controller: "Admin", useSource: true, multiSources: false, toTools: {} },
    { name: "ConfigEditor", controller: "ConfigEditor", useSource: false, multiSources: false, toTools: {} },
    { name: "GraphManagement", controller: "GraphManagement", useSource: false, multiSources: false, toTools: {} },
    { name: "UserManagement", controller: "UserManagement", useSource: false, multiSources: false, toTools: {} },
    { name: "OntoCreator", controller: "Lineage_createSLSVsource", useSource: false, multiSources: false, toTools: {} },
].map((tool) => ({ type: "tool", label: tool.label ?? tool.name, ...tool }));

const lock = new Lock();

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
            return pluginsNames.map((pluginName) => ({ type: "plugin", name: pluginName, config: pluginsConfig[pluginName] || {} }));
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

    /**
     * @param {Tool[]} plugins
     */
    writeConfig = async (plugins) => {
        await lock.acquire("PluginsThread");

        try {
            await fs.promises.writeFile(configPlugins, JSON.stringify(plugins, null, 2));
        } catch (error) {
            console.error(error);
        } finally {
            lock.release("PluginsThread");
        }
    };
}

const toolModel = new ToolModel(path.join(process.cwd(), "/plugins"));

module.exports = { ToolModel, toolModel };
