const { readFile, writeFile } = require("fs/promises");

const { Lock } = require("async-await-mutex-lock");

const { mainConfigPath } = require("./config");

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
}

const mainConfigModel = new MainConfigModel(mainConfigPath);

module.exports = { mainConfigModel };
