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
    // This list must be synced with /public/vocables/config/tools.js
    "lineage",
    "KGcreator",
    "KGquery",
    "Standardizer",
    "TSF_Dictionary",
    "SPARQL",
    "admin",
    "ConfigEditor",
    "GraphManagement",
    "UserManagement",
    "OntoCreator",
].map((tool) => ({ type: "tool", name: tool }));

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
