const { readFile, writeFile } = require("fs/promises");

const { Lock } = require("async-await-mutex-lock");

const { mainConfigPath } = require("./config");
const { toolModel } = require("./tools");

const lock = new Lock();

class MainConfigModel {
    /**
     * @param {string} path - path of the mainConfig.json file
     */
    constructor(path) {
        this.path = path;
    }

    async getConfig() {
        const data = await readFile(this.path, "utf-8");
        return JSON.parse(data);
    }

    /**
     *
     * @param {object} config  - mainConfig to write
     */
    async writeConfig(config) {
        await lock.acquire("MainConfigLock");
        try {
            await writeFile(this.path, JSON.stringify(config, null, 4));
        } finally {
            lock.release("MainConfigLock");
        }
    }

    async cleanToolsAvailable() {
        const config = await this.getConfig();
        const toolsAvailable = config.tools_available;

        const tools = toolModel.allTools;

        const newToolsAvailable = toolsAvailable.filter((t) => tools.includes(t));
        await this.writeConfig({ ...config, tools_available: newToolsAvailable });
    }
}

const mainConfigModel = new MainConfigModel(mainConfigPath);

module.exports = { mainConfigModel };
