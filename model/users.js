const fs = require("fs");

/**
 * @typedef {import("../mainapp/lib/User").UserAccount} UserAccount
 */

class UserModel {
    /**
     * @param {string} configPath - path of the config directory
     */
    constructor(configPath) {
        this.configPath = configPath;
        this.userPath = this.configPath + "/users/users.json";
    }

    /**
     * @returns {Promise<UserAccount>} a collection of UserAccount
     */
    getUserAccounts = async () => {
        const data = await fs.promises.readFile(this.userPath);
        /**
         * @type {UserAccount}
         */
        const users = {};
        Object.entries(JSON.parse(data.toString())).map(([key, value]) => {
            users[key] = {
                id: value.id,
                login: value.login,
                groups: value.groups,
                password: value.password,
                source: value.source,
                _type: value._type,
            };
        });
        return users;
    };
}

const userModel = new UserModel("config");

module.exports = { userModel, UserModel };
