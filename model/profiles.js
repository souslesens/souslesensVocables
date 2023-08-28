const fs = require("fs");
const path = require("path");
const { Lock } = require("async-await-mutex-lock");
const { configProfilesPath, config } = require("./config");

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
     * @returns {Promise<Array<{name: string, type: string}>>} a list of tools' name
     */
    getUserTools = async (user) => {
        try {
            const userProfiles = await this.getUserProfiles(user);
            const allTools = new Set(config.tools_available);
            const allowedToolsOrAll = new Set(Object.entries(userProfiles).reduce((acc, [k, v]) => acc.concat(v.allowedTools), []));
            const forbiddenTools = new Set(Object.entries(userProfiles).reduce((acc, [k, v]) => acc.concat(v.forbiddenTools), []));
            const allowedTools = allowedToolsOrAll.has("ALL") ? allTools : allowedToolsOrAll;
            const userTools = new Set([...allowedTools].filter((x) => !forbiddenTools.has(x)));
            let plugins = new Array();
            try {
                plugins = fs.readdirSync(path.join(process.cwd(), "/plugins"));
            } catch {
                console.warn("No plugins directory");
            }
            const toolsFromNames = (tools) => [...tools].map((tool) => ({ name: tool, type: plugins.includes(tool) ? "plugin" : "tool" }));

            if (user.login === "admin" || user?.groups.includes("admin")) {
                return toolsFromNames(allTools);
            }
            return toolsFromNames(userTools);
        } catch (error) {
            console.log(error);
        }
    };

    /**
     * @param {UserAccount} user -  a user account
     * @param {string} profileName -  a profile nameou
     * @returns {Promise<Profile>} a collection of profiles
     */
    getOneUSerProfile = async (user, profileName) => {
        const userProfiles = await this.getUserProfiles(user);
        return userProfiles[profileName];
    };

    /**
     * @param {string} profileName -  a profile name
     */
    _deleteProfileByName = async (profileName) => {
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
     * @param {string} profileNameId -  a profile name or Id
     */
    deleteProfile = async (profileNameId) => {
        const profiles = await this._read();
        let { [profileNameId]: profileToDelete, ..._remainingProfiles } = profiles;
        if (profileToDelete) {
            return this._deleteProfileByName(profileNameId);
        } else {
            // no profile found. Try with id
            const profilesList = Object.entries(profiles);
            const profileToDeleteWithId = profilesList.find(([_name, profile]) => {
                return profile.id === profileNameId;
            });
            if (profileToDeleteWithId) {
                return this._deleteProfileByName(profileToDeleteWithId[0]);
            }
        }
        return false;
    };

    /**
     * @param {Profile} profile - a profile
     * @returns {Promise<boolean>} true if profile exists
     */
    updateProfile = async (profile) => {
        await lock.acquire("ProfilesThread");
        try {
            const profiles = await this._read();
            const updatedProfiles = { ...profiles };
            if (profile.id in profiles) {
                updatedProfiles[profile.id] = profile;
            } else if (profile.name in profiles) {
                updatedProfiles[profile.name] = profile;
            } else {
                return false;
            }
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
