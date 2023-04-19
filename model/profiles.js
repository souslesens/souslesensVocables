const fs = require("fs");
const { Lock } = require("async-await-mutex-lock");
const { configProfilesPath } = require("./config");

const lock = new Lock();

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

    addProfile = async (newProfile) => {
        await lock.acquire("ProfilesThread");
        try {
            const profiles = await this._read();
            newProfile.id = newProfile.name;
            if (Object.keys(profiles).includes(newProfile.id)) {
                throw Error("Profile already exists, try updating it.");
            }
            profiles[newProfile.id] = newProfile;
            await this._write(profiles);
        } finally {
            lock.release("ProfilesThread");
        }
    };
}

const profileModel = new ProfileModel(configProfilesPath);

module.exports = { ProfileModel, profileModel };
