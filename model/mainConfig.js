import { readFile, writeFile } from 'fs/promises';
import { Lock } from 'async-await-mutex-lock';
import { mainConfigPath } from './config';
import { toolModel } from './tools';

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

        const allTools = toolModel.allTools.map((t) => t.name);

        const newToolsAvailable = toolsAvailable.filter((t) => allTools.includes(t));
        await this.writeConfig({ ...config, tools_available: newToolsAvailable });
    }
}

const mainConfigModel = new MainConfigModel(mainConfigPath);

module.exports = { mainConfigModel };
