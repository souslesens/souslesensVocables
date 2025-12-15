const z = require("zod");

const { readMainConfig } = require("./config");
const { toolModel } = require("./tools");
const { cleanupConnection, getKnexConnection } = require("./utils");
const { userDataModel } = require("./userData");
const { userModel } = require("./users");

/**
 * @typedef {import("./UserTypes").UserAccount} UserAccount
 * @typedef {import("./ProfileTypes").Profile} Profile
 */

const ProfileObject = z
    .object({
        id: z.string(),
        name: z.string(),
        theme: z.string().default(""),
        allowedSourceSchemas: z.enum(["OWL", "SKOS"]).array().optional(),
        sourcesAccessControl: z.record(z.string(), z.string()).optional(),
        allowedTools: z.string().array().optional(),
        allowedDatabases: z.string().array().optional(),
        isShared: z.boolean().default(true),
        _type: z.string().default("profile"),
    })
    .strict();

class ProfileModel {
    /**
     * @param {import("./tools").ToolModel} toolModel
     * @param {string} configProfilesPath - path of the profiles.json file
     */
    constructor(toolModel) {
        this._toolModel = toolModel;
        this._mainConfig = readMainConfig();
    }

    /**
     * Run zod to validate the received profile
     *
     * @param {Profile} profile - the profile to validate
     * @returns {Profile} - the response from the zod parser if success
     */
    _checkProfile = (profile) => {
        const check = ProfileObject.safeParse(profile);
        if (!check.success) {
            throw Error(`The profile do not follow the standard: ${JSON.stringify(check.error.issues)}`);
        }
        return check.data;
    };

    /**
     * Convert the profile to follow the database schema
     *
     * @param {Profile} profile - the profile to convert
     * @returns {ProfileDatabase} - the converted object with the correct fields
     */
    _convertToDatabase = (profile) => ({
        label: profile.name,
        theme: profile.theme || "",
        allowed_tools: profile.allowedTools || [],
        allowed_databases: profile.allowedDatabases || [],
        is_shared: profile.isShared !== undefined ? profile.isShared : true,
        access_control: JSON.stringify(profile.sourcesAccessControl || {}),
        schema_types: profile.allowedSourceSchemas || [],
    });

    /**
     * Convert the profile to restore the legacy JSON schema
     *
     * Note: Use `typeof` to retrieve the correct value when the test are
     * running with the sqlite backend.
     *
     * @param {Profile} profile - the profile to convert
     * @returns {Profile} - the converted object with the correct fields
     */
    _convertToLegacy = (profile) => [
        profile.label,
        {
            id: profile.label,
            name: profile.label,
            theme: profile.theme || "",
            allowedSourceSchemas: typeof profile.schema_types === "string" ? JSON.parse(profile.schema_types) : profile.schema_types,
            allowedTools: typeof profile.allowed_tools === "string" ? JSON.parse(profile.allowed_tools) : profile.allowed_tools,
            allowedDatabases: typeof profile.allowed_databases === "string" ? JSON.parse(profile.allowed_databases) : profile.allowed_databases === null ? [] : profile.allowed_databases,
            isShared: typeof profile.is_shared === "number" ? profile.is_shared === 1 : profile.is_shared,
            sourcesAccessControl: typeof profile.access_control === "string" ? JSON.parse(profile.access_control) : profile.access_control,
        },
    ];

    /**
     * @returns {Promise<Record<string, Profile>>} a collection of profiles
     */
    getAllProfiles = async () => {
        const conn = getKnexConnection(this._mainConfig.database);
        const results = await conn.select("*").from("profiles_list");
        cleanupConnection(conn);

        const profiles = Object.fromEntries(results.map((profile) => this._convertToLegacy(profile)));

        if (profiles["admin"] === undefined) {
            profiles["admin"] = {
                id: "admin",
                name: "admin",
                theme: this._mainConfig.theme.defaultTheme,
                allowedSourceSchemas: ["OWL", "SKOS"],
                allowedTools: this._mainConfig.tools_available,
                allowedDatabases: [],
                isShared: true,
                sourcesAccessControl: {},
                defaultSourceAccessControl: "readwrite",
            };
        }

        return profiles;
    };

    /**
     * @param {UserAccount} user -  a user account
     * @returns {Promise<Record<string, Profile>>} a collection of profiles
     */
    getUserProfiles = async (user) => {
        const allProfiles = await this.getAllProfiles();
        return Object.fromEntries(Object.entries(allProfiles).filter(([profileName, _profile]) => user.groups.includes(profileName)));
    };

    /**
     * @param {UserAccount} user -  a user account
     * @returns {Promise<Array<{name: string, type: string}> | undefined>} a list of tools' name
     */
    getUserTools = async (user) => {
        try {
            const availableToolsNames = new Set(readMainConfig().tools_available);
            if (user.login === "admin" || user?.groups.includes("admin")) {
                return this._toolModel.allTools.filter((tool) => availableToolsNames.has(tool.name));
            }
            const userProfiles = await this.getUserProfiles(user);
            const allowedToolsOrAll = new Set(Object.values(userProfiles).flatMap((v) => v.allowedTools));
            const allowedTools = allowedToolsOrAll.has("ALL") ? availableToolsNames : allowedToolsOrAll;

            // add publicTool if missing
            const publicTools = this._toolModel.allTools.filter((tool) => tool.publicTool && availableToolsNames.has(tool.name)).map((tool) => tool.name);
            const allowedToolsWithPublicTools = new Set([...allowedTools, ...publicTools]);

            return this._toolModel.allTools.filter((tool) => allowedToolsWithPublicTools.has(tool.name));
        } catch (error) {
            console.log(error);
        }
    };
    /**
     * @param {string} profileName -  a profile name
     * @returns {Promise<Profile>} a Profile
     */
    getOneProfile = async (profileName) => {
        const allProfiles = await this.getAllProfiles();
        return allProfiles[profileName];
    };

    /**
     * @param {UserAccount} user -  a user account
     * @param {string} profileName -  a profile name
     * @returns {Promise<Profile>} a collection of profiles
     */
    getOneUserProfile = async (user, profileName) => {
        let userProfiles;
        if (user.login === "admin" || user.profiles?.includes("admin")) {
            const allProfiles = await this.getAllProfiles();
            userProfiles = Object.fromEntries(Object.entries(allProfiles));
        } else {
            userProfiles = await this.getUserProfiles(user);
        }
        return userProfiles[profileName];
    };

    /**
     * @param {string} profileNameId -  a profile name or Id
     */
    deleteProfile = async (profileNameId) => {
        const conn = getKnexConnection(this._mainConfig.database);
        const results = await conn.select("label").from("profiles").where("label", profileNameId).first();
        if (results === undefined) {
            cleanupConnection(conn);
            return false;
        }
        // delete profile in shared_profiles
        const allUserData = await conn.select("*").from("user_data_list");
        Object.values(allUserData).map((userData) => {
            if (userData.shared_profiles.includes(profileNameId)) {
                userData.shared_profiles = userData.shared_profiles.filter((p) => p !== profileNameId);
                delete userData.created_at;
                userDataModel.update(userData);
            }
        });
        // delete profile
        // using select here allows mocking in tests
        await conn.select("*").from("profiles").where("label", profileNameId).del();
        cleanupConnection(conn);
        return true;
    };

    /**
     * @param {Profile} profile - a profile
     * @returns {Promise<boolean>} true if profile exists
     */
    updateProfile = async (profile) => {
        const data = this._checkProfile(profile);

        const conn = getKnexConnection(this._mainConfig.database);
        const results = await conn.select("label").from("profiles").where("label", data.name).first();
        if (results === undefined) {
            cleanupConnection(conn);
            return false;
        }

        await conn.update(this._convertToDatabase(data)).into("profiles").where("label", data.name);
        cleanupConnection(conn);
        return true;
    };

    /**
     * @param {Profile} profile - a profile
     */
    addProfile = async (profile) => {
        const data = this._checkProfile(profile);

        const conn = getKnexConnection(this._mainConfig.database);
        const results = await conn.select("label").from("profiles").where("label", data.name).first();
        if (results !== undefined) {
            cleanupConnection(conn);
            throw Error("The profile already exists, try updating it");
        }

        const idx = await conn.insert(this._convertToDatabase(data)).into("profiles");
        cleanupConnection(conn);

        return idx[0];
    };

    /**
     * @param {string} profileName - the profile name
     * @returns {string} the theme currently defined for this profile
     */
    getThemeFromProfile = async (profileName) => {
        const conn = getKnexConnection(this._mainConfig.database);
        const results = await conn.select("theme").from("profiles").where("label", profileName).first();
        cleanupConnection(conn);
        if (!results || !results.theme) {
            return this._mainConfig.theme.defaultTheme;
        }

        return results.theme;
    };
}

const profileModel = new ProfileModel(toolModel);

module.exports = { ProfileModel, profileModel };
