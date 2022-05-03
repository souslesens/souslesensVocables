const fs = require("fs");

/**
 * @typedef {Object} BlenderSource
 * @prop {boolean} editable
 * @prop {string} controller
 * @prop {SparqlServer} sparql_server
 * @prop {string} graphUri
 * @prop {Predicates} predicates
 * @prop {boolean} protected
 * @prop {string} color
 * @prop {boolean} isBlenderTemplate
 */

/**
 * @typedef {Object} Predicates
 * @prop {string} lang
 */

/**
 * @typedef {Object} SparqlServer
 * @prop {string} url
 */
/**
 * @typedef {Record<string, BlenderSource>} BlenderSourcesMap
 */
class BlenderSources {
    /**
     * @param {string} configPath - path of the config directory
     */

    constructor(configPath) {
        this.configPath = configPath;
        this.blenderSourcePath = this.configPath + "/blenderSources.json";
    }

    /**
     * @returns {Promise<BlenderSourcesMap>} a collection of blenderSources
     */

    get = async () => {
        const data = await fs.promises.readFile(this.blenderSourcePath);
        const blenderSources = JSON.parse(data.toString());
        return blenderSources;
    };
}

const blenderSources = new BlenderSources("config");

module.exports = { blenderSources, BlenderSources };
