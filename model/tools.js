import fg from 'fast-glob';
import fs from 'fs';
import path from 'path';
import { Lock } from 'async-await-mutex-lock';
import { simpleGit, GitError } from 'simple-git';
import { convertType } from './utils.js';

import {
    configPluginsConfig,
    configPluginsRepository,
    directoryPlugins,
    directoryPluginsRepositories,
} from './config.js';

/**
 * @typedef {import("./ToolTypes").Tool} Tool
 */

/**
 * @type {Tool[]}
 */

const NATIVE_TOOLS = [
    { name: "lineage", controller: "Lineage_whiteboard", useSource: true, multiSources: false, toTools: {}, displayImports: true, publicTool: false },
    // { name: "AxiomEditor", controller: "Axiom_editor", useSource: false, multiSources: false, toTools: {} , publicTool: false},
    //{ name: "KGcreator", controller: "KGcreator", useSource: true, multiSources: false, toTools: {} , publicTool: false},
    { name: "KGquery", controller: "KGquery", useSource: true, multiSources: false, toTools: {}, publicTool: false },
    { name: "MappingModeler", controller: "MappingModeler", useSource: true, multiSources: false, toTools: {}, publicTool: false },
    //{ name: "KGconstraintsModeler", controller: "KGconstraintsModeler", useSource: true, multiSources: false, toTools: {}, publicTool: false },
    //{ name: "KGconstraints_editor", controller: "KGconstraints_editor", useSource: true, multiSources: false, toTools: {}, publicTool: false },
    { name: "SPARQL", label: "SPARQL endpoint", controller: "SPARQL_endpoint", useSource: false, multiSources: false, toTools: {}, resetURLParamsDiv: "mainDialogDiv", publicTool: false },
    { name: "OntoCreator", controller: "Lineage_createSLSVsource", useSource: false, multiSources: false, toTools: {}, resetURLParamsDiv: "botPanel", publicTool: false },
    { name: "admin", label: "Admin", controller: "Admin", useSource: false, multiSources: false, toTools: {}, publicTool: false },
    { name: "ConfigEditor", controller: "ConfigEditor", useSource: false, multiSources: false, toTools: {}, resetURLParamsDiv: "mainDialogDiv", publicTool: false },
    { name: "GraphManagement", controller: "GraphManagement", useSource: false, multiSources: false, toTools: {}, resetURLParamsDiv: "mainDialogDiv", publicTool: false },
    // { name: "Standardizer", controller: "Standardizer", useSource: true, multiSources: false, toTools: {}, publicTool: false },
    //{ name: "TSF_Dictionary", controller: "Lineage_dictionary", useSource: false, multiSources: false, toTools: {}, publicTool: false },
    { name: "UserSettings", controller: "UserSettings", useSource: false, multiSources: false, toTools: {}, publicTool: true },
    { name: "Browse", controller: "Browse", useSource: false, multiSources: false, toTools: {}, publicTool: false },

    { name: "Weaver", controller: "Weaver", useSource: true, multiSources: false, toTools: {}, displayImports: true, publicTool: false },
    // { name: "Lifex_cost", controller: "Lifex_cost", useSource: false, multiSources: false, toTools: {}, publicTool: false },
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
     * Get the tokenize version of the Git repository URL
     *
     * @param {string} url – the URL of the Git repository
     * @param {string} token – the token used to authenticate on this repository
     *
     * @returns {string}
     */
    _getTokenizeURL(url, token) {
        return `https://token:${token}@${url.replace(/^https?:\/\//, "")}`;
    }

    /**
     * @param {string} pluginsDirectory
     * @returns {Tool[]}
     */
    _loadPlugins(pluginsDirectory) {
        /**
         * @type {Record<string, unknown>}
         */
        const pluginsConfig = this.readConfig();
        try {
            const pluginsNames = fs.readdirSync(pluginsDirectory);
            return pluginsNames
                .map((pluginName) => ({ type: "plugin", name: pluginName, config: pluginsConfig[pluginName] || {} }))
                .filter((plugin) => {
                    const pluginPublicPath = path.join(pluginsDirectory, plugin.name, "public");
                    if (!plugin.name.startsWith(".") && fs.existsSync(pluginPublicPath)) {
                        const statsPath = fs.statSync(pluginPublicPath);
                        if (statsPath.isDirectory()) {
                            return plugin;
                        }
                    }
                });
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
        return Object.fromEntries(
            Object.entries(plugins).map(([key, config]) => {
                const converted = Object.fromEntries(Object.entries(config).map(([label, option]) => [label, convertType(option)]));
                return [key, converted];
            }),
        );
    };

    /**
     * Remove a repository from the configuration file
     *
     * @param {string} repositoryId – The identifier of the repository to delete
     */
    deleteRepository = async (repositoryId) => {
        const repositories = await this.readRepositories();

        // Remove linked plugins related to the deleted repository
        repositories[repositoryId]["plugins"].forEach((pluginName) => {
            const pluginPath = path.join(directoryPlugins, pluginName);

            if (fs.existsSync(pluginPath) && fs.lstatSync(pluginPath).isSymbolicLink()) {
                const target = fs.readlinkSync(pluginPath);

                // Only remove target relative to the current repository. It
                // will avoid to remove a plugin with the same name from another
                // repository.
                if (path.basename(path.dirname(target)) === repositoryId) {
                    fs.unlinkSync(pluginPath);
                }
            }
        });

        const filteredRepositories = Object.fromEntries(Object.entries(repositories).filter(([identifier, _data]) => identifier !== repositoryId));

        await this.writeRepositories(filteredRepositories);

        fs.rmSync(path.join(directoryPlugins, repositoryId), { force: true });
        fs.rmSync(path.join(directoryPluginsRepositories, repositoryId), { force: true, recursive: true });
    };

    /**
     * Retrieve the Git repository related to the specified identifier
     *
     * @param {string} repositoryId – The identifier of the repository to fetch
     * @param {{}} repositoryInfo – The information of the repository
     *
     * @returns {{}} – The status of the fetch process
     */
    fetchRepository = async (repositoryId, repositoryInfo) => {
        try {
            if (!fs.existsSync(directoryPluginsRepositories)) {
                fs.mkdirSync(directoryPluginsRepositories);
            }

            let url = repositoryInfo.url;
            if (Object.hasOwn(repositoryInfo, "token")) {
                url = this._getTokenizeURL(url, repositoryInfo.token);
            }

            const repositoryPath = path.join(directoryPluginsRepositories, repositoryId);

            if (!fs.existsSync(repositoryPath)) {
                await simpleGit().clone(url, repositoryPath);
            } else {
                await simpleGit(repositoryPath).env("LC_ALL", "C").remote(["set-url", "origin", url]).fetch();
            }

            if (Object.hasOwn(repositoryInfo, "version")) {
                await simpleGit(repositoryPath).checkout(repositoryInfo.version || ".");
            }
        } catch (error) {
            console.error(error);
            if (error instanceof GitError) {
                return { status: "failure", message: error.message };
            }
            return { status: "failure", message: "Unknown error occurs on the server" };
        }

        return { status: "success" };
    };

    /**
     * Retrieve the list of available plugins in the Git repository
     *
     * When the Git repository is a plugin, the only entry returns by this
     * method is the identifier of the repository.
     *
     * @param {string} repositoryId – The identifier of the Git repository
     * @returns {[string]} – The list of plugins’ name
     */
    getRepositoryPlugins = async (repositoryId) => {
        try {
            const repositoryPath = path.join(directoryPluginsRepositories, repositoryId);

            if (!fs.existsSync(repositoryPath)) {
                return {
                    message: "Cannot found the identifier in the plugins directory",
                    status: "failure",
                };
            }

            const mainJSFile = "/public/js/main.js";
            const directories = await fg([`${repositoryPath}/**${mainJSFile}`]);

            return {
                message: directories.map((directory) => path.basename(directory.replace(mainJSFile, ""))),
                status: "success",
            };
        } catch (error) {
            console.error(error);
            return {
                message: "An error occurs on the server",
                status: "failure",
            };
        }
    };

    /**
     * Retrieve the tag from the specified Git repository
     *
     * @param {string} repositoryId – The identifier of the Git repository
     * @param {number} limit – The number of tag to retrieve (default: 5)
     * @returns {[string]} – The list of Git tags
     */
    getRepositoryTags = async (repositoryId, limit = 5) => {
        try {
            const repositoryPath = path.join(directoryPluginsRepositories, repositoryId);

            if (!fs.existsSync(repositoryPath)) {
                return {
                    message: "Cannot found the identifier in the plugins directory",
                    status: "failure",
                };
            }

            const tags = await simpleGit(repositoryPath).tags(["--sort=-refname"]);
            return {
                message: tags.all.slice(0, limit),
                status: "success",
            };
        } catch (error) {
            console.error(error);
            return {
                message: "An error occurs on the server",
                status: "failure",
            };
        }
    };

    /**
     * Read the plugins configuration from pluginsConfig.json file
     *
     * @returns {{}} plugins configuration
     */
    readConfig = () => {
        try {
            const fileContent = fs.readFileSync(configPluginsConfig).toString();
            return JSON.parse(fileContent);
        } catch (error) {
            console.error(error);
        }
    };

    /**
     * Read the plugins repositories from plugins.json file
     *
     * @returns {Tool[]} plugins
     */
    readRepositories = () => {
        try {
            const fileContent = fs.readFileSync(configPluginsRepository).toString();
            return JSON.parse(fileContent);
        } catch (error) {
            console.error(error);
        }
    };

    /**
     * Write the plugins structure in the pluginsConfig.json file
     *
     * @param {{}} plugins – The plugins structure from pluginsConfig.json
     */
    writeConfig = async (plugins) => {
        await lock.acquire("PluginsThread");

        try {
            const convertedPlugins = await this.convertPluginsConfig(plugins);
            await fs.promises.writeFile(configPluginsConfig, JSON.stringify(convertedPlugins, null, 2));
        } catch (error) {
            console.error(error);
        } finally {
            lock.release("PluginsThread");
        }
    };

    /**
     * Write the repositories structure in the plugins.json file
     *
     * @param {{}} repositories – The repositories structure from plugins.json
     */
    writeRepositories = async (repositories) => {
        await lock.acquire("PluginsThread");

        try {
            await fs.promises.writeFile(configPluginsRepository, JSON.stringify(repositories, null, 2));

            const currentPlugins = this.plugins.map((plugin) => plugin.name);

            const nextPlugins = Object.entries(repositories)
                .map(([_identifier, data]) => {
                    if (data.plugins === undefined) {
                        return path.parse(data.url).name;
                    }
                    return data.plugins;
                })
                .flat();

            // Remove useless symlinks
            currentPlugins.forEach((plugin) => {
                if (!nextPlugins.includes(plugin)) {
                    const pluginPath = path.join(directoryPlugins, plugin);

                    const stats = fs.lstatSync(pluginPath, { throwIfNoEntry: false });
                    if (stats !== undefined && stats.isSymbolicLink()) {
                        fs.rmSync(pluginPath);
                    }
                }
            });

            // Add the new plugin symlinks if necessary
            Object.entries(repositories).map(([identifier, data]) => {
                try {
                    if (data.plugins === undefined) {
                        const pluginPath = path.join(directoryPlugins, path.parse(data.url).name);
                        if (!fs.existsSync(pluginPath)) {
                            fs.symlinkSync(path.resolve(path.join(directoryPluginsRepositories, identifier)), pluginPath);
                        }
                    } else {
                        data.plugins.forEach((plugin) => {
                            try {
                                const pluginPath = path.join(directoryPlugins, plugin);
                                if (!fs.existsSync(pluginPath)) {
                                    fs.symlinkSync(path.resolve(path.join(directoryPluginsRepositories, identifier, plugin)), pluginPath);
                                }
                            } catch (error) {
                                console.error(identifier, error);
                            }
                        });
                    }
                } catch (error) {
                    console.error(identifier, error);
                }
            });
        } catch (error) {
            console.error(error);
        } finally {
            lock.release("PluginsThread");
        }
    };
}

const toolModel = new ToolModel(path.join(process.cwd(), "/plugins"));

module.exports = { ToolModel, toolModel };
