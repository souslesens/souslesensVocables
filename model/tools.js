const fs = require("fs");
const path = require("path");
const { Lock } = require("async-await-mutex-lock");

const { convertType } = require("./utils");
const { configPlugins } = require("./config");

/**
 * @typedef {import("./ToolTypes").Tool} Tool
 */

/**
 * @type {Tool[]}
 */

const NATIVE_TOOLS = [
    { name: "lineage", controller: "Lineage_r", useSource: true, multiSources: false, toTools: {} },
    { name: "AxiomEditor", controller: "Axiom_editor", useSource: false, multiSources: false, toTools: {} },
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
     * Convert the plugin configuration options with the correct variable type
     *
     * @param {Tool[]} plugins – The plugins structure from pluginsConfig.json
     * @returns {Tool[]} – The converted structure
     */
    convertPluginsConfig = async (plugins) => {
        return Object.fromEntries(Object.entries(plugins).map(
            ([key, config]) => {
                const converted = Object.fromEntries(
                    Object.entries(config).map(
                        ([label, option]) => [label, convertType(option)]
                    )
                );
                return [key, converted];
            }
        ));
    };

    /**
     * Write the plugins structure in the pluginsConfig.json file
     *
     * @param {Tool[]} plugins – The plugins structure from pluginsConfig.json
     */
    writeConfig = async (plugins) => {
        await lock.acquire("PluginsThread");

        try {
            const convertedPlugins = await this.convertPluginsConfig(plugins);
            await fs.promises.writeFile(configPlugins, JSON.stringify(convertedPlugins, null, 2));
        } catch (error) {
            console.error(error);
        } finally {
            lock.release("PluginsThread");
        }
    };
}

const toolModel = new ToolModel(path.join(process.cwd(), "/plugins"));

module.exports = { ToolModel, toolModel };
