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

    _sortProfiles = async (profiles) => {
        return Object.fromEntries(
            Object.entries(profiles).sort((a, b) => {
                return a[0].localeCompare(b[0]);
            })
        );
    };

    getAllProfiles = async () => {
        return await this._sortProfiles(await this._read());
    };

    _getAdminProfiles = async (profiles) => {
        const adminProfile = {
            name: "admin",
            _type: "profile",
            id: "admin",
            allowedSourceSchemas: ["OWL", "SKOS"],
            defaultSourceAccessControl: "readwrite",
            sourcesAccessControl: {},
            allowedTools: "ALL",
            forbiddenTools: [],
            blender: {
                contextMenuActionStartLevel: 0,
            },
        };

        return await this._sortProfiles({ ...profiles, admin: adminProfile });
    };

    _getAllowedProfiles = async (profiles, user) => {
        const userProfiles = Object.fromEntries(
            Object.entries(profiles).filter(([profileName, _profile]) => {
                return user.groups.includes(profileName);
            })
        );
        return await this._sortProfiles(userProfiles);
    };

    getUserProfiles = async (user) => {
        const allProfiles = await this._read();
        if (user.login === "admin" || user.groups.includes("admin")) {
            return await this._getAdminProfiles(allProfiles);
        }
        return await this._getAllowedProfiles(allProfiles, user);
    };
}

const profileModel = new ProfileModel(configProfilesPath);

module.exports = { ProfileModel, profileModel };
