const fs = require("fs");
const path = require("path");
const { Lock } = require("async-await-mutex-lock");
const { configProfilesPath, config, configPlugins } = require("./config");

/**
 * @typedef {import("./UserTypes").UserAccount} UserAccount
 * @typedef {import("./ProfileTypes").Profile} Profile
 */

const lock = new Lock();

class ProfileModel {
    /**
     * @param {string} configProfilesPath - path of the profiles.json file
     */
    constructor(configProfilesPath) {
        this.configProfilesPath = configProfilesPath;
        this.plugins = new Array();
        try {
            this.plugins = fs.readdirSync(path.join(process.cwd(), "/plugins"));
        } catch {
            console.warn("No plugins directory");
        }
        this.pluginsConfig = JSON.parse(fs.readFileSync(configPlugins).toString());
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
            theme: config.theme.defaultTheme,
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
     * @param {string} toolName - the name of a tool or a plugin
     */
    _toolToJSON = (toolName) => {
        if (this.plugins.includes(toolName)) {
            return {
                name: toolName,
                type: "plugin",
                config: this.pluginsConfig[toolName],
            };
        } else {
            return {
                name: toolName,
                type: "tool",
            };
        }
    };

    /**
     * @param {UserAccount} user -  a user account
     * @returns {Promise<Array<{name: string, type: string}> | undefined>} a list of tools' name
     */
    getUserTools = async (user) => {
        try {
            const userProfiles = await this.getUserProfiles(user);
            const allTools = new Set(config.tools_available);
            const allowedToolsOrAll = new Set(Object.values(userProfiles).flatMap((v) => v.allowedTools));
            const forbiddenTools = new Set(Object.values(userProfiles).flatMap((v) => v.forbiddenTools));
            const allowedTools = allowedToolsOrAll.has("ALL") ? allTools : allowedToolsOrAll;
            const userTools = new Set([...allowedTools].filter((x) => !forbiddenTools.has(x)));

            if (user.login === "admin" || user?.groups.includes("admin")) {
                return [...allTools].map(this._toolToJSON);
            }
            return [...userTools].map(this._toolToJSON);
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

    /**
     * @param {string} profileName - the profile name
     * @returns {string} the theme currently defined for this profile
     */
    getThemeFromProfile = async (profileName) => {
        try {
            const profiles = await this._read();

            const firstProfile = Object.values(profiles).find((profile) => {
                if (profile.name === profileName) {
                    return profile.theme;
                }
            });

            const findTheme = firstProfile.theme;
            return findTheme !== undefined ? findTheme : config.theme.defaultTheme;
        } catch {
            return config.theme.defaultTheme;
        }
    };
}

const profileModel = new ProfileModel(configProfilesPath);

module.exports = { ProfileModel, profileModel };
