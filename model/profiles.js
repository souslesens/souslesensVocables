const fs = require("fs");
const { Lock } = require("async-await-mutex-lock");
const { configProfilesPath } = require("./config");

/**
 * @typedef {import("./UserTypes").UserAccount} UserAccount
 * @typedef {import("./ProfileTypes").Profile} Profile
 */

const lock = new Lock();

class ProfileModel {
    /**
     * @param {string} path - path of the profiles.json file
     */
    constructor(path) {
        this.configProfilesPath = path;
    }

    /**
     * @returns {Promise<Record<string, Profile>>} a collection of profiles
     */
    _read = async () => {
        return fs.promises.readFile(this.configProfilesPath).then((data) => JSON.parse(data.toString()));
    };

    /**
     * @param {Record<string, Profile>} profiles - a collection of profiles
     */
    _write = async (profiles) => {
        await fs.promises.writeFile(this.configProfilesPath, JSON.stringify(profiles, null, 2));
    };

    /**
     * @returns {Promise<Record<string, Profile>>} a collection of profiles
     */
    getAllProfiles = async () => {
        return await this._read();
    };

    /**
     * @param {Record<string, Profile>} profiles - a collection of profiles
     * @returns {Promise<Record<string, Profile>>} a collection of profiles
     */
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

        return { ...profiles, admin: adminProfile };
    };

    /**
     * @param {Record<string, Profile>} profiles - a collection of profiles
     * @param {UserAccount} user -  a user account
     * @returns {Promise<Record<string, Profile>>} a collection of profiles
     */
    _getAllowedProfiles = async (profiles, user) => {
        const userProfiles = Object.fromEntries(
            Object.entries(profiles).filter(([profileName, _profile]) => {
                return user.groups.includes(profileName);
            })
        );
        return userProfiles;
    };

    /**
     * @param {UserAccount} user -  a user account
     * @returns {Promise<Record<string, Profile>>} a collection of profiles
     */
    getUserProfiles = async (user) => {
        const allProfiles = await this._read();
        if (user.login === "admin" || user.groups.includes("admin")) {
            return await this._getAdminProfiles(allProfiles);
        }
        return await this._getAllowedProfiles(allProfiles, user);
    };

    /**
     * @param {UserAccount} user -  a user account
     * @param {string} profileName -  a profile name
     * @returns {Promise<Profile>} a collection of profiles
     */
    getOneUSerProfile = async (user, profileName) => {
        const userProfiles = await this.getUserProfiles(user);
        return userProfiles[profileName];
    };

    /**
     * @param {string} profileName -  a profile name
     */
    deleteProfile = async (profileName) => {
        await lock.acquire("ProfilesThread");
        try {
            const profiles = await this._read();
            const { [profileName]: profileToDelete, ...remainingProfiles } = profiles;
            if (!profileToDelete) {
                return false;
            }
            await this._write(remainingProfiles);
            return true;
        } finally {
            lock.release("ProfilesThread");
        }
    };

    /**
     * @param {Profile} profile - a profile
     * @returns {Promise<boolean>} true if profile exists
     */
    updateProfile = async (profile) => {
        await lock.acquire("ProfilesThread");
        try {
            const profiles = await this._read();
            if (!(profile.id in profiles)) {
                return false;
            }
            const updatedProfiles = { ...profiles };
            updatedProfiles[profile.id] = profile;
            await this._write(updatedProfiles);
            return true;
        } finally {
            lock.release("ProfilesThread");
        }
    };

    /**
     * @param {Profile} newProfile - a profile
     */
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
