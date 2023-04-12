const fs = require("fs");
const { configProfilesPath } = require("./config");

class ProfileModel {
    constructor(path) {
        this.configProfilesPath = path;
    }
    _read = async () => {
        return fs.promises.readFile(this.configProfilesPath).then((data) => JSON.parse(data.toString()));
    };

    _write = async (profiles) => {
        await fs.promises.writeFile(this.configProfilesPath, JSON.stringify(profiles, null, 2));
    };
}

const profileModel = new ProfileModel(configProfilesPath);

module.exports = { ProfileModel, profileModel };
